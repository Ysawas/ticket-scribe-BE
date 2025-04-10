
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// Get all tickets
exports.getAllTickets = async (req, res, next) => {
  try {
    const tickets = await Ticket.find()
      .populate('createdById', 'name email')
      .populate('assignedToId', 'name email')
      .populate('departmentId', 'name')
      .populate('topicId', 'name')
      .sort({ createdAt: -1 });
    
    res.json(tickets);
  } catch (error) {
    next(error);
  }
};

// Get ticket by ID
exports.getTicketById = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('createdById', 'name email')
      .populate('assignedToId', 'name email')
      .populate('departmentId', 'name')
      .populate('topicId', 'name')
      .populate('comments.userId', 'name email');
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    res.json(ticket);
  } catch (error) {
    next(error);
  }
};

// Create a new ticket
exports.createTicket = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, priority, createdById, assignedToId, departmentId, topicId } = req.body;

    // Create ticket
    const ticket = new Ticket({
      title,
      description,
      status: 'open',
      priority: priority || 'medium',
      createdById,
      assignedToId,
      departmentId,
      topicId
    });

    // Add history entry for ticket creation
    ticket.history.push({
      field: 'status',
      newValue: 'open',
      userId: createdById
    });

    await ticket.save();
    
    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('createdById', 'name email')
      .populate('assignedToId', 'name email')
      .populate('departmentId', 'name')
      .populate('topicId', 'name');
    
    res.status(201).json(populatedTicket);
  } catch (error) {
    next(error);
  }
};

// Create a ticket with attachments
exports.createTicketWithAttachments = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, priority, createdById, assignedToId, departmentId, topicId } = req.body;

    // Create ticket
    const ticket = new Ticket({
      title,
      description,
      status: 'open',
      priority: priority || 'medium',
      createdById,
      assignedToId,
      departmentId,
      topicId
    });

    // Add history entry for ticket creation
    ticket.history.push({
      field: 'status',
      newValue: 'open',
      userId: createdById
    });

    // Add attachments if files were uploaded
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        ticket.attachments.push({
          filename: file.filename,
          originalname: file.originalname,
          path: file.path,
          mimetype: file.mimetype,
          size: file.size,
          uploadedBy: createdById
        });
      });
    }

    await ticket.save();
    
    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('createdById', 'name email')
      .populate('assignedToId', 'name email')
      .populate('departmentId', 'name')
      .populate('topicId', 'name');
    
    res.status(201).json(populatedTicket);
  } catch (error) {
    next(error);
  }
};

// Update a ticket
exports.updateTicket = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, status, priority, assignedToId, departmentId, topicId } = req.body;
    const userId = req.user.id;

    // Get the existing ticket
    const ticket = await Ticket.findById(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Build ticket object and track changes for history
    const ticketFields = {};
    const historyEntries = [];

    if (title && title !== ticket.title) {
      ticketFields.title = title;
      historyEntries.push({
        field: 'title',
        oldValue: ticket.title,
        newValue: title,
        userId
      });
    }

    if (description && description !== ticket.description) {
      ticketFields.description = description;
      historyEntries.push({
        field: 'description',
        oldValue: ticket.description,
        newValue: description,
        userId
      });
    }

    if (status && status !== ticket.status) {
      ticketFields.status = status;
      historyEntries.push({
        field: 'status',
        oldValue: ticket.status,
        newValue: status,
        userId
      });
    }

    if (priority && priority !== ticket.priority) {
      ticketFields.priority = priority;
      historyEntries.push({
        field: 'priority',
        oldValue: ticket.priority,
        newValue: priority,
        userId
      });
    }

    if (assignedToId && assignedToId !== (ticket.assignedToId ? ticket.assignedToId.toString() : null)) {
      ticketFields.assignedToId = assignedToId;
      historyEntries.push({
        field: 'assignedToId',
        oldValue: ticket.assignedToId,
        newValue: assignedToId,
        userId
      });
    }

    if (departmentId && departmentId !== (ticket.departmentId ? ticket.departmentId.toString() : null)) {
      ticketFields.departmentId = departmentId;
      historyEntries.push({
        field: 'departmentId',
        oldValue: ticket.departmentId,
        newValue: departmentId,
        userId
      });
    }

    if (topicId && topicId !== (ticket.topicId ? ticket.topicId.toString() : null)) {
      ticketFields.topicId = topicId;
      historyEntries.push({
        field: 'topicId',
        oldValue: ticket.topicId,
        newValue: topicId,
        userId
      });
    }

    ticketFields.updatedAt = Date.now();

    // Add history entries
    if (historyEntries.length > 0) {
      ticketFields.$push = { history: { $each: historyEntries } };
    }

    // Update ticket
    const updatedTicket = await Ticket.findByIdAndUpdate(
      req.params.id,
      ticketFields,
      { new: true }
    )
      .populate('createdById', 'name email')
      .populate('assignedToId', 'name email')
      .populate('departmentId', 'name')
      .populate('topicId', 'name')
      .populate('comments.userId', 'name email');

    res.json(updatedTicket);
  } catch (error) {
    next(error);
  }
};

// Add a comment to a ticket
exports.addComment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { content } = req.body;
    const userId = req.user.id;

    const ticket = await Ticket.findById(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Add comment
    const comment = {
      content,
      userId,
      createdAt: Date.now()
    };

    ticket.comments.push(comment);
    
    // Record in history
    ticket.history.push({
      field: 'comment',
      newValue: 'Comment added',
      userId
    });

    ticket.updatedAt = Date.now();

    await ticket.save();

    const updatedTicket = await Ticket.findById(req.params.id)
      .populate('createdById', 'name email')
      .populate('assignedToId', 'name email')
      .populate('departmentId', 'name')
      .populate('topicId', 'name')
      .populate('comments.userId', 'name email');

    res.json(updatedTicket);
  } catch (error) {
    next(error);
  }
};

// Update ticket status
exports.updateStatus = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status } = req.body;
    const userId = req.user.id;

    const ticket = await Ticket.findById(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Record change
    if (status !== ticket.status) {
      ticket.history.push({
        field: 'status',
        oldValue: ticket.status,
        newValue: status,
        userId
      });
    }

    ticket.status = status;
    ticket.updatedAt = Date.now();

    await ticket.save();

    const updatedTicket = await Ticket.findById(req.params.id)
      .populate('createdById', 'name email')
      .populate('assignedToId', 'name email')
      .populate('departmentId', 'name')
      .populate('topicId', 'name');

    res.json(updatedTicket);
  } catch (error) {
    next(error);
  }
};

// Update ticket priority
exports.updatePriority = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { priority } = req.body;
    const userId = req.user.id;

    const ticket = await Ticket.findById(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Record change
    if (priority !== ticket.priority) {
      ticket.history.push({
        field: 'priority',
        oldValue: ticket.priority,
        newValue: priority,
        userId
      });
    }

    ticket.priority = priority;
    ticket.updatedAt = Date.now();

    await ticket.save();

    const updatedTicket = await Ticket.findById(req.params.id)
      .populate('createdById', 'name email')
      .populate('assignedToId', 'name email')
      .populate('departmentId', 'name')
      .populate('topicId', 'name');

    res.json(updatedTicket);
  } catch (error) {
    next(error);
  }
};

// Assign ticket to user
exports.assignTicket = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { assignedToId } = req.body;
    const userId = req.user.id;

    // Verify user exists
    if (assignedToId) {
      const user = await User.findById(assignedToId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
    }

    const ticket = await Ticket.findById(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Record change
    const oldAssignedId = ticket.assignedToId ? ticket.assignedToId.toString() : null;
    if (assignedToId !== oldAssignedId) {
      ticket.history.push({
        field: 'assignedToId',
        oldValue: oldAssignedId,
        newValue: assignedToId,
        userId
      });
    }

    ticket.assignedToId = assignedToId;
    ticket.updatedAt = Date.now();

    await ticket.save();

    const updatedTicket = await Ticket.findById(req.params.id)
      .populate('createdById', 'name email')
      .populate('assignedToId', 'name email')
      .populate('departmentId', 'name')
      .populate('topicId', 'name');

    res.json(updatedTicket);
  } catch (error) {
    next(error);
  }
};

// Get tickets by user
exports.getTicketsByUser = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    
    const tickets = await Ticket.find({
      $or: [
        { createdById: userId },
        { assignedToId: userId }
      ]
    })
      .populate('createdById', 'name email')
      .populate('assignedToId', 'name email')
      .populate('departmentId', 'name')
      .populate('topicId', 'name')
      .sort({ createdAt: -1 });
    
    res.json(tickets);
  } catch (error) {
    next(error);
  }
};

// Get tickets by department
exports.getTicketsByDepartment = async (req, res, next) => {
  try {
    const departmentId = req.params.departmentId;
    
    const tickets = await Ticket.find({ departmentId })
      .populate('createdById', 'name email')
      .populate('assignedToId', 'name email')
      .populate('departmentId', 'name')
      .populate('topicId', 'name')
      .sort({ createdAt: -1 });
    
    res.json(tickets);
  } catch (error) {
    next(error);
  }
};
