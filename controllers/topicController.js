
const Topic = require('../models/Topic');
const { validationResult } = require('express-validator');

// Get all topics
exports.getAllTopics = async (req, res, next) => {
  try {
    const topics = await Topic.find()
      .populate('department', 'name');
    
    res.json(topics);
  } catch (error) {
    next(error);
  }
};

// Get topic by ID
exports.getTopicById = async (req, res, next) => {
  try {
    const topic = await Topic.findById(req.params.id)
      .populate('department', 'name');
    
    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }
    
    res.json(topic);
  } catch (error) {
    next(error);
  }
};

// Create a new topic
exports.createTopic = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, type, department, subcategory, version } = req.body;

    // Create topic
    const topic = new Topic({
      name,
      description,
      type,
      department,
      subcategory,
      version
    });

    await topic.save();
    
    res.status(201).json(topic);
  } catch (error) {
    next(error);
  }
};

// Update a topic
exports.updateTopic = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, type, department, subcategory, version } = req.body;

    // Build topic object
    const topicFields = {};
    if (name) topicFields.name = name;
    if (description) topicFields.description = description;
    if (type) topicFields.type = type;
    if (department) topicFields.department = department;
    if (subcategory) topicFields.subcategory = subcategory;
    if (version) topicFields.version = version;
    topicFields.updatedAt = Date.now();

    // Update topic
    const topic = await Topic.findByIdAndUpdate(
      req.params.id,
      { $set: topicFields },
      { new: true }
    );

    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    res.json(topic);
  } catch (error) {
    next(error);
  }
};

// Delete a topic
exports.deleteTopic = async (req, res, next) => {
  try {
    const topic = await Topic.findById(req.params.id);
    
    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    await Topic.findByIdAndRemove(req.params.id);
    
    res.json({ message: 'Topic removed' });
  } catch (error) {
    next(error);
  }
};

// Get topics by type
exports.getTopicsByType = async (req, res, next) => {
  try {
    const { type } = req.params;
    
    const topics = await Topic.find({ type })
      .populate('department', 'name');
    
    res.json(topics);
  } catch (error) {
    next(error);
  }
};
