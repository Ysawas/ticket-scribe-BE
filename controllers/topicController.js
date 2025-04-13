import Topic from '../models/Topic.js';
import { validationResult } from 'express-validator';

export const getAllTopics = async (req, res, next) => {
  console.log('TOPIC CONTROLLER: getAllTopics - START');
  try {
    const { limit = 10, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const topics = await Topic.find().populate('departmentId', 'name').skip(parseInt(skip)).limit(parseInt(limit));
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
    const topic = await Topic.findById(req.params.id).populate('departmentId', 'name');
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
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('TOPIC CONTROLLER: createTopic - Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { category, subcategory, description, departmentId } = req.body;
    console.log('TOPIC CONTROLLER: createTopic - Request body:', req.body);

    const topic = new Topic({
      category,
      subcategory,
      description,
      departmentId
    });

    await topic.save();

    console.log('TOPIC CONTROLLER: createTopic - Topic created:', topic);
    res.status(201).json(topic);
  } catch (error) {
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

    const { category, subcategory, description, departmentId } = req.body;
    console.log('TOPIC CONTROLLER: updateTopic - Request body:', req.body);

    const topicFields = {};
    if (category) topicFields.category = category;
    if (subcategory) topicFields.subcategory = subcategory;
    if (description) topicFields.description = description;
    if (departmentId) topicFields.departmentId = departmentId;
    topicFields.updatedAt = Date.now();

    const topic = await Topic.findByIdAndUpdate(
      req.params.id,
      { $set: topicFields },
      { new: true }
    ).populate('departmentId', 'name');

    if (!topic) {
      console.log(`TOPIC CONTROLLER: updateTopic - Topic not found with ID: ${req.params.id}`);
      return res.status(404).json({ error: 'Topic not found' });
    }

    console.log('TOPIC CONTROLLER: updateTopic - Topic updated:', topic);
    res.json(topic);
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