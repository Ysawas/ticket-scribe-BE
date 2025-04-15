import Topic from '../models/Topic.js';
import { validationResult } from 'express-validator';
import sendEmail from '../utils/emailService.js';
import Department from '../models/Department.js';

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
        department.topics.push(topic._id);
        await department.save();
        console.log(`TOPIC CONTROLLER: createTopic - Topic added to department ${departmentId}`);
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
    if (departmentId) topicFields.department = departmentId; //  'department' instead of 'departmentId'
    if (version) topicFields.version = version;
    topicFields.updatedAt = Date.now();

    const topic = await Topic.findByIdAndUpdate(
      req.params.id,
      { $set: topicFields },
      { new: true, runValidators: true } //  Added runValidators
    ).populate('department', 'name'); //  'department' instead of 'departmentId'

    if (!topic) {
      console.log(`TOPIC CONTROLLER: updateTopic - Topic not found with ID: ${req.params.id}`);
      return res.status(404).json({ error: 'Topic not found' });
    }

    // Update department's topics array (if department changed)
    if (departmentId && topic.department && departmentId.toString() !== topic.department.toString()) {
      try {
        const newDepartment = await Department.findById(departmentId);
        const oldDepartment = await Department.findById(topic.department);

        if (newDepartment) {
          newDepartment.topics.push(topic._id);
          await newDepartment.save();
          console.log(`TOPIC CONTROLLER: updateTopic - Topic added to department ${departmentId}`);
        } else {
          console.warn(`TOPIC CONTROLLER: updateTopic - Department with ID ${departmentId} not found, topic not added.`);
        }

        if (oldDepartment) {
          oldDepartment.topics.pull(topic._id);
          await oldDepartment.save();
          console.log(`TOPIC CONTROLLER: updateTopic - Topic removed from department ${topic.department}`);
        } else {
          console.warn(`TOPIC CONTROLLER: updateTopic - Old department with ID ${topic.department} not found, topic not removed.`);
        }
      } catch (departmentError) {
        console.error(`TOPIC CONTROLLER: updateTopic - Error updating department topics:`, departmentError);
      }
    }

    console.log('TOPIC CONTROLLER: updateTopic - Topic updated:', topic);
    res.json(topic);

    // Example: Send email on topic update
    try {
      const department = await Department.findById(topic.department).populate('manager', 'email'); //  'manager' instead of 'managerId', 'department' instead of 'departmentId'
      if (department && department.manager && department.manager.email) { //  'manager' instead of 'managerId'
        await sendEmail(department.manager.email, `Topic Updated: ${topic.category} - ${topic.subcategory}`, `
          <h1>A topic has been updated in your department:</h1>
          <p>Category: ${topic.category}</p>
          <p>Subcategory: ${topic.subcategory}</p>
          <p>Description: ${topic.description}</p>
        `);
        console.log(`TOPIC CONTROLLER: updateTopic - Email sent to department manager: ${department.manager.email}`); //  'manager' instead of 'managerId'
      } else {
        console.warn(`TOPIC CONTROLLER: updateTopic - Department or manager not found, email not sent.`);
      }
    } catch (emailError) {
      console.error('TOPIC CONTROLLER: updateTopic - Error sending email:', emailError);
      // Handle email sending error
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
    const topic = await Topic.findById(req.params.id);
    if (!topic) {
      console.log(`TOPIC CONTROLLER: deleteTopic - Topic not found with ID: ${req.params.id}`);
      return res.status(404).json({ error: 'Topic not found' });
    }

    // Remove topic from department's topics array
    try {
      const department = await Department.findById(topic.department);
      if (department) {
        department.topics.pull(topic._id);
        await department.save();
        console.log(`TOPIC CONTROLLER: deleteTopic - Topic removed from department ${topic.department}`);
      } else {
        console.warn(`TOPIC CONTROLLER: deleteTopic - Department with ID ${topic.department} not found, topic not removed.`);
      }
    } catch (departmentError) {
      console.error(`TOPIC CONTROLLER: deleteTopic - Error updating department topics:`, departmentError);
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