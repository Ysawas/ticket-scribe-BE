
const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const ticketController = require('../controllers/ticketController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

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
    check('description', 'Description is required').notEmpty(),
    check('createdById', 'Creator ID is required').notEmpty(),
    check('priority', 'Priority must be low, medium, or high').optional().isIn(['low', 'medium', 'high'])
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
    upload.array('attachments', 5),
    check('title', 'Title is required').notEmpty(),
    check('description', 'Description is required').notEmpty(),
    check('createdById', 'Creator ID is required').notEmpty(),
    check('priority', 'Priority must be low, medium, or high').optional().isIn(['low', 'medium', 'high'])
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
    check('description', 'Description is required').optional().notEmpty(),
    check('status', 'Status must be open, pending, or closed').optional().isIn(['open', 'pending', 'closed']),
    check('priority', 'Priority must be low, medium, or high').optional().isIn(['low', 'medium', 'high'])
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

// @route   PATCH /api/tickets/:id/status
// @desc    Update a ticket status
// @access  Private
router.patch(
  '/:id/status',
  [
    auth,
    check('status', 'Status must be open, pending, or closed').isIn(['open', 'pending', 'closed'])
  ],
  ticketController.updateStatus
);

// @route   PATCH /api/tickets/:id/priority
// @desc    Update a ticket priority
// @access  Private
router.patch(
  '/:id/priority',
  [
    auth,
    check('priority', 'Priority must be low, medium, or high').isIn(['low', 'medium', 'high'])
  ],
  ticketController.updatePriority
);

// @route   PATCH /api/tickets/:id/assign
// @desc    Assign a ticket to a user
// @access  Private
router.patch(
  '/:id/assign',
  [
    auth,
    check('assignedToId', 'User ID is required').exists()
  ],
  ticketController.assignTicket
);

module.exports = router;
