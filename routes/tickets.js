import express from 'express';
const router = express.Router();
import { check } from 'express-validator';
import * as ticketController from '../controllers/ticketController.js';
import auth from '../middleware/auth.js';
import upload from '../middleware/upload.js';

// @route   GET /api/tickets
// @desc    Get all tickets
// @access  Private
router.get('/', auth, ticketController.getAllTickets);

// @route   GET /api/tickets/:id
// @desc    Get ticket by ID
// @access  Private
router.get('/:id', auth, ticketController.getTicketById);

// @route   GET /api/tickets/user/:userId
// @desc    Get user's tickets
// @access  Private
router.get('/user/:userId', auth, ticketController.getTicketsByUser);

// @route   GET /api/tickets/department/:departmentId
// @desc    Get department tickets
// @access  Private
router.get('/department/:departmentId', auth, ticketController.getTicketsByDepartment);

// @route   POST /api/tickets
// @desc    Create a ticket
// @access  Private
router.post(
  '/',
  [
    auth,
    check('title', 'Title is required').notEmpty(),
    check('description', 'Description is required').notEmpty().isLength({ min: 10, max: 500 }),
    check('authorId', 'Author ID is required').notEmpty(),
    check('departmentId', 'Department ID is required').notEmpty(),
    check('topicId', 'Topic ID is required').notEmpty(),
    check('priority', 'Priority must be low, medium, high, or urgent').optional().isIn(['low', 'medium', 'high', 'urgent'])
  ],
  ticketController.createTicket
);

// @route   POST /api/tickets/with-attachments
// @desc    Create a ticket with file attachments
// @access  Private
router.post(
  '/with-attachments',
  [
    auth,
    upload.array('attachments', 3), // Max 3 attachments
    check('title', 'Title is required').notEmpty(),
    check('description', 'Description is required').notEmpty().isLength({ min: 10, max: 500 }),
    check('authorId', 'Author ID is required').notEmpty(),
    check('departmentId', 'Department ID is required').notEmpty(),
    check('topicId', 'Topic ID is required').notEmpty(),
    check('priority', 'Priority must be low, medium, high, or urgent').optional().isIn(['low', 'medium', 'high', 'urgent'])
  ],
  ticketController.createTicketWithAttachments
);

// @route   PATCH /api/tickets/:id
// @desc    Update a ticket
// @access  Private
router.patch(
  '/:id',
  [
    auth,
    check('title', 'Title is required').optional().notEmpty(),
    check('description', 'Description is required').optional().notEmpty().isLength({ min: 10, max: 500 }),
    check('status', 'Status must be open, in progress, resolved, or closed').optional().isIn(['open', 'in progress', 'resolved', 'closed']),
    check('progress', 'Progress must be between 0 and 100').optional().isInt({ min: 0, max: 100 }),
    check('priority', 'Priority must be low, medium, high, or urgent').optional().isIn(['low', 'medium', 'high', 'urgent']),
    check('assignedToId', 'Assigned To ID is required').optional().notEmpty(),
    check('departmentId', 'Department ID is required').optional().notEmpty(),
    check('topicId', 'Topic ID is required').optional().notEmpty(),
    check('escalatedToDepartmentId', 'Escalated Department ID is required').optional().notEmpty()
  ],
  ticketController.updateTicket
);

// @route   POST /api/tickets/:id/comments
// @desc    Add a comment to a ticket
// @access  Private
router.post(
  '/:id/comments',
  [
    auth,
    check('content', 'Comment content is required').notEmpty()
  ],
  ticketController.addComment
);

export default router;