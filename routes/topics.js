import express from 'express';
const router = express.Router();
import { check } from 'express-validator';
import * as topicController from '../controllers/topicController.js';
import auth from '../middleware/auth.js';

// @route   GET /api/topics
// @desc    Get all topics
// @access  Private
router.get('/', auth, topicController.getAllTopics);

// @route   GET /api/topics/:id
// @desc    Get topic by ID
// @access  Private
router.get('/:id', auth, topicController.getTopicById);

// @route   POST /api/topics
// @desc    Create a new topic
// @access  Private
router.post(
  '/',
  [
    auth,
    check('category', 'Category is required').notEmpty(),
    check('subcategory', 'Subcategory is required').notEmpty()
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
    check('category', 'Category is required').optional().notEmpty(),
    check('subcategory', 'Subcategory is required').optional().notEmpty()
  ],
  topicController.updateTopic
);

// @route   DELETE /api/topics/:id
// @desc    Delete a topic
// @access  Private
router.delete('/:id', auth, topicController.deleteTopic);

export default router;