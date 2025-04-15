import Topic from '../models/Topic.js';
import { validationResult } from 'express-validator';
import sendEmail from '../utils/emailService.js';
import Department from '../models/Department.js';
import mongoose from 'mongoose'; // Import mongoose for transactions

export const getAllTopics = async (req, res, next) => {
  console.log('TOPIC CONTROLLER: getAllTopics - START');
  try {
    const { limit = 10, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const topics = await Topic.find().populate('department', 'name').skip(parseInt(skip)).limit(parseInt(limit)); //  'department' instead of 'departmentId'
    const total = await Topic.countDocuments();

    console.log(`TOPIC CONTROLLER: getAllTopics - Found ${topics.length} topics`);
    res.json({
      topics,
      total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('TOPIC CONTROLLER: getAllTopics - ERROR:', error);
    next(error);
  } finally {
    console.log('TOPIC CONTROLLER: getAllTopics - END');
  }
};

export const getTopicById = async (req, res, next) => {
  console.log(`TOPIC CONTROLLER: getTopicById - START - ID: ${req.params.id}`);
  try {
    const topic = await Topic.findById(req.params.id).populate('department', 'name'); //  'department' instead of 'departmentId'
    if (!topic) {
      console.log(`TOPIC CONTROLLER: getTopicById - Topic not found with ID: ${req.params.id}`);
      return res.status(404).json({ error: 'Topic not found' });
    }
    console.log('TOPIC CONTROLLER: getTopicById - Topic found:', topic);
    res.json(topic);
  } catch (error) {
    console.error('TOPIC CONTROLLER: getTopicById - ERROR:', error);
    next(error);
  } finally {
    console.log('TOPIC CONTROLLER: getTopicById - END');
  }
};

export const createTopic = async (req, res, next) => {
  console.log('TOPIC CONTROLLER: createTopic - START');
  console.log('TOPIC CONTROLLER: createTopic - Request Headers:', req.headers);
  console.log('TOPIC CONTROLLER: createTopic - Request Body:', req.body);
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('TOPIC CONTROLLER: createTopic - Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { category, name, subcategory, description, department: departmentId, version } = req.body; //  'department' instead of 'departmentId'
    console.log('TOPIC CONTROLLER: createTopic - Destructured body:', {
      category,
      name,
      subcategory,
      description,
      department: departmentId,
      version
    });

    const topic = new Topic({
      category,
      name,
      subcategory,
      description,
      department: departmentId,
      version
    });

    await topic.save();

    // Add topic to department's topics array
    try {
      const department = await Department.findById(departmentId);
      if (department) {
        if (!department.topics.includes(topic._id)) { // Check if topic is already in array
          department.topics.push(topic._id);
          await department.save();
          console.log(`TOPIC CONTROLLER: createTopic - Topic added to department ${departmentId}`);
        }
      } else {
        console.warn(`TOPIC CONTROLLER: createTopic - Department with ID ${departmentId} not found, topic not added.`);
      }
    } catch (departmentError) {
      console.error(`TOPIC CONTROLLER: createTopic - Error updating department:`, departmentError);
    }

    // Example: Send email to department manager when a new topic is created.
    try {
      const department = await Department.findById(departmentId).populate('manager', 'email'); //  'manager' instead of 'managerId'
      if (department && department.manager && department.manager.email) { //  'manager' instead of 'managerId'
        await sendEmail(department.manager.email, `New Topic Created: ${category} - ${subcategory}`, `
          <h1>A new topic has been created in your department:</h1>
          <p>Category: ${category}</p>
          <p>Subcategory: ${subcategory}</p>
          <p>Description: ${description}</p>
        `);
        console.log(`TOPIC CONTROLLER: createTopic - Email sent to department manager: ${department.manager.email}`); //  'manager' instead of 'managerId'
      } else {
        console.warn(`TOPIC CONTROLLER: createTopic - Department or manager not found, email not sent.`);
      }
    } catch (emailError) {
      console.error('TOPIC CONTROLLER: createTopic - Error sending email:', emailError);
      // Handle email sending error (log, queue, etc.) - decide if you want to throw or continue
    }

    console.log('TOPIC CONTROLLER: createTopic - Topic created:', topic);
    res.status(201).json(topic);
  } catch (error) {
    if (error.name === 'MongoServerError' && error.code === 11000) {
      // Duplicate key error (e.g., duplicate name)
      return res.status(400).json({ error: 'Topic name already exists', details: error.message });
    }
    console.error('TOPIC CONTROLLER: createTopic - ERROR:', error);
    next(error);
  } finally {
    console.log('TOPIC CONTROLLER: createTopic - END');
  }
};

export const updateTopic = async (req, res, next) => {
  console.log(`TOPIC CONTROLLER: updateTopic - START - ID: ${req.params.id}`);
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('TOPIC CONTROLLER: updateTopic - Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { category, subcategory, description, department: departmentId, version } = req.body; //  'department' instead of 'departmentId'
    console.log('TOPIC CONTROLLER: updateTopic - Request body:', req.body);

    const topicFields = {};
    if (category) topicFields.category = category;
    if (subcategory) topicFields.subcategory = subcategory;
    if (description) topicFields.description = description;
    if (version) topicFields.version = version;
    topicFields.updatedAt = Date.now();

    // Start a Mongoose session for transaction-like behavior
    const session = await mongoose.startSession();
    session.startTransaction();

    let topic, originalTopic, newDepartment, oldDepartment;

    try {
      // Fetch the original topic *within* the transaction
      originalTopic = await Topic.findById(req.params.id).populate('department').session(session).exec();

      if (!originalTopic) {
        await session.abortTransaction();
        console.log(`TOPIC CONTROLLER: updateTopic - Topic not found with ID: ${req.params.id}`);
        return res.status(404).json({ error: 'Topic not found' });
      }

      // Only update the department if a new departmentId is provided AND it's different
      if (departmentId && departmentId.toString() !== originalTopic.department?._id.toString()) {
        try {
          newDepartment = await Department.findById(departmentId).session(session).exec();
          oldDepartment = await Department.findById(originalTopic.department._id).session(session).exec();
        } catch (departmentFetchError) {
          await session.abortTransaction();
          console.error(`TOPIC CONTROLLER: updateTopic - Error fetching departments:`, departmentFetchError);
          return next(departmentFetchError); // Propagate the error
        }

        if (!newDepartment) {
          await session.abortTransaction();
          console.warn(`TOPIC CONTROLLER: updateTopic - Department with ID ${departmentId} not found, topic's department not updated.`);
          return res.status(400).json({ error: 'Department not found', details: `Department with ID ${departmentId} not found` });
        }
        if (!oldDepartment) {
          await session.abortTransaction();
          console.warn(`TOPIC CONTROLLER: updateTopic - Old department with ID ${originalTopic.department?._id} not found, topic not removed from old department.`);
          return res.status(400).json({ error: 'Department not found', details: `Old department with ID ${originalTopic.department?._id} not found` });
        }

        // Remove topic from the *old* department's topics
        if (oldDepartment.topics.includes(topic._id)) {
          oldDepartment.topics.pull(topic._id);
          await oldDepartment.save({ session: session });
          console.log(`TOPIC CONTROLLER: updateTopic - Topic removed from department ${oldDepartment.name}`);
        }

        // Add topic to the *new* department's topics if it's not already there
        if (!newDepartment.topics.includes(topic._id)) {
          newDepartment.topics.push(topic._id);
          await newDepartment.save({ session: session });
          console.log(`TOPIC CONTROLLER: updateTopic - Topic added to department ${newDepartment.name}`);
        }

        topicFields.department = departmentId;
      } else if (departmentId) {
        topicFields.department = departmentId; // Assign departmentId even if it's the same (for consistency)
      } else {
        topicFields.department = originalTopic.department._id; // Restore original department
      }

      // Update the topic *within* the transaction
      topic = await Topic.findByIdAndUpdate(
        req.params.id,
        { $set: topicFields },
        { new: true, runValidators: true, session: session }
      ).populate('department', 'name').exec();

      if (!topic) {
        await session.abortTransaction();
        console.log(`TOPIC CONTROLLER: updateTopic - Topic update failed for ID: ${req.params.id}`);
        return res.status(500).json({ error: 'Topic update failed' });
      }

      await session.commitTransaction();
      console.log('TOPIC CONTROLLER: updateTopic - Transaction committed successfully.');
      res.json(topic);

    } catch (error) {
      await session.abortTransaction();
      console.error('TOPIC CONTROLLER: updateTopic - Transaction aborted. ERROR:', error);
      return next(error); // Propagate the error
    } finally {
      session.endSession();
    }

  } catch (error) {
    console.error('TOPIC CONTROLLER: updateTopic - ERROR:', error);
    next(error);
  } finally {
    console.log('TOPIC CONTROLLER: updateTopic - END');
  }
};

export const deleteTopic = async (req, res, next) => {
  console.log(`TOPIC CONTROLLER: deleteTopic - START - ID: ${req.params.id}`);
  try {
    const topic = await Topic.findById(req.params.id).populate('department').exec(); // Populate department

    if (!topic) {
      console.log(`TOPIC CONTROLLER: deleteTopic - Topic not found with ID: ${req.params.id}`);
      return res.status(404).json({ error: 'Topic not found' });
    }

    // Remove topic from department's topics array
    try {
      if (topic.department) {
        const department = await Department.findById(topic.department._id).exec(); // Access _id of populated department
        if (department) {
          department.topics.pull(topic._id);
          await department.save();
          console.log(`TOPIC CONTROLLER: deleteTopic - Topic removed from department ${topic.department._id}`); // Access _id of populated department
        } else {
          console.warn(`TOPIC CONTROLLER: deleteTopic - Department with ID ${topic.department._id} not found, topic not removed.`); // Access _id of populated department
        }
      }
    } catch (departmentError) {
      console.error(`TOPIC CONTROLLER: deleteTopic - Error updating department topics:`, departmentError);
      // Don't propagate this error, as the main topic deletion was successful
    }

    await Topic.findByIdAndRemove(req.params.id);

    console.log(`TOPIC CONTROLLER: deleteTopic - Topic removed with ID: ${req.params.id}`);
    res.json({ message: 'Topic removed' });
  } catch (error) {
    console.error('TOPIC CONTROLLER: deleteTopic - ERROR:', error);
    next(error);
  } finally {
    console.log('TOPIC CONTROLLER: deleteTopic - END');
  }
};