
const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const topicController = require('../controllers/topicController');
const auth = require('../middleware/auth');

// @route   GET /api/topics
// @desc    Get all topics
// @access  Private
router.get('/', auth, topicController.getAllTopics);

// @route   GET /api/topics/:id
// @desc    Get topic by ID
// @access  Private
router.get('/:id', auth, topicController.getTopicById);

// @route   GET /api/topics/type/:type
// @desc    Get topics by type
// @access  Private
router.get('/type/:type', auth, topicController.getTopicsByType);

// @route   POST /api/topics
// @desc    Create a new topic
// @access  Private
router.post(
  '/',
  [
    auth,
    check('name', 'Name is required').notEmpty(),
    check('type', 'Type must be software, hardware, server, category, or other').isIn(['software', 'hardware', 'server', 'category', 'other'])
  ],
  topicController.createTopic
);

// @route   PUT /api/topics/:id
// @desc    Update a topic
// @access  Private
router.put(
  '/:id',
  [
    auth,
    check('name', 'Name is required').optional().notEmpty(),
    check('type', 'Type must be software, hardware, server, category, or other').optional().isIn(['software', 'hardware', 'server', 'category', 'other'])
  ],
  topicController.updateTopic
);

// @route   DELETE /api/topics/:id
// @desc    Delete a topic
// @access  Private
router.delete('/:id', auth, topicController.deleteTopic);

module.exports = router;
