import Ticket from '../models/Ticket.js';
import User from '../models/User.js';
import { validationResult } from 'express-validator';

export const getAllTickets = async (req, res, next) => {
  console.log('TICKET CONTROLLER: getAllTickets - START');
  try {
    const { limit = 10, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const tickets = await Ticket.find()
      .populate('authorId', 'firstName lastName')
      .populate('assignedToId', 'firstName lastName')
      .populate('departmentId', 'name')
      .populate('topicId', 'category subcategory')
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    const total = await Ticket.countDocuments();

    console.log(`TICKET CONTROLLER: getAllTickets - Found ${tickets.length} tickets`);
    res.json({
      tickets,
      total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('TICKET CONTROLLER: getAllTickets - ERROR:', error);
    next(error);
  } finally {
    console.log('TICKET CONTROLLER: getAllTickets - END');
  }
};

export const getTicketById = async (req, res, next) => {
  console.log(`TICKET CONTROLLER: getTicketById - START - ID: ${req.params.id}`);
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('authorId', 'firstName lastName')
      .populate('assignedToId', 'firstName lastName')
      .populate('departmentId', 'name')
      .populate('topicId', 'category subcategory')
      .populate('comments.userId', 'firstName lastName')
      .populate('history.userId', 'firstName lastName');
    if (!ticket) {
      console.log(`TICKET CONTROLLER: getTicketById - Ticket not found with ID: ${req.params.id}`);
      return res.status(404).json({ error: 'Ticket not found' });
    }
    console.log('TICKET CONTROLLER: getTicketById - Ticket found:', ticket);
    res.json(ticket);
  } catch (error) {
    console.error('TICKET CONTROLLER: getTicketById - ERROR:', error);
    next(error);
  } finally {
    console.log('TICKET CONTROLLER: getTicketById - END');
  }
};

export const createTicket = async (req, res, next) => {
  console.log('TICKET CONTROLLER: createTicket - START');
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('TICKET CONTROLLER: createTicket - Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, priority, authorId, assignedToId, departmentId, topicId } = req.body;
    console.log('TICKET CONTROLLER: createTicket - Request body:', req.body);

    const ticket = new Ticket({
      title,
      description,
      priority,
      authorId,
      assignedToId,
      departmentId,
      topicId
    });

    ticket.history.push({
      userId: authorId,
      field: 'status',
      newValue: 'open'
    });

    await ticket.save();

    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('authorId', 'firstName lastName')
      .populate('assignedToId', 'firstName lastName')
      .populate('departmentId', 'name')
      .populate('topicId', 'category subcategory');
    console.log('TICKET CONTROLLER: createTicket - Ticket created:', populatedTicket);
    res.status(201).json(populatedTicket);
  } catch (error) {
    console.error('TICKET CONTROLLER: createTicket - ERROR:', error);
    next(error);
  } finally {
    console.log('TICKET CONTROLLER: createTicket - END');
  }
};

export const createTicketWithAttachments = async (req, res, next) => {
  console.log('TICKET CONTROLLER: createTicketWithAttachments - START');
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('TICKET CONTROLLER: createTicketWithAttachments - Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, priority, authorId, assignedToId, departmentId, topicId } = req.body;
    console.log('TICKET CONTROLLER: createTicketWithAttachments - Request body:', req.body);

    const ticket = new Ticket({
      title,
      description,
      priority,
      authorId,
      assignedToId,
      departmentId,
      topicId
    });

    ticket.history.push({
      userId: authorId,
      field: 'status',
      newValue: 'open'
    });

    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        ticket.attachments.push({
          filename: file.filename,
          originalname: file.originalname,
          path: file.path,
          mimetype: file.mimetype,
          size: file.size,
          uploadedBy: authorId
        });
      });
      console.log(`TICKET CONTROLLER: createTicketWithAttachments - ${req.files.length} attachments added`);
    }

    await ticket.save();

    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('authorId', 'firstName lastName')
      .populate('assignedToId', 'firstName lastName')
      .populate('departmentId', 'name')
      .populate('topicId', 'category subcategory');
    console.log('TICKET CONTROLLER: createTicketWithAttachments - Ticket created with attachments:', populatedTicket);
    res.status(201).json(populatedTicket);
  } catch (error) {
    console.error('TICKET CONTROLLER: createTicketWithAttachments - ERROR:', error);
    next(error);
  } finally {
    console.log('TICKET CONTROLLER: createTicketWithAttachments - END');
  }
};

export const updateTicket = async (req, res, next) => {
  console.log(`TICKET CONTROLLER: updateTicket - START - ID: ${req.params.id}`);
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('TICKET CONTROLLER: updateTicket - Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, status, progress, priority, assignedToId, departmentId, topicId, escalatedToDepartmentId } = req.body;
    const userId = req.user.id;
    console.log('TICKET CONTROLLER: updateTicket - Request body:', req.body);

    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      console.log(`TICKET CONTROLLER: updateTicket - Ticket not found with ID: ${req.params.id}`);
      return res.status(404).json({ error: 'Ticket not found' });
    }

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

    if (escalatedToDepartmentId && escalatedToDepartmentId !== (ticket.escalatedToDepartmentId ? ticket.escalatedToDepartmentId.toString() : null)) {
      ticketFields.escalatedToDepartmentId = escalatedToDepartmentId;
      historyEntries.push({
        field: 'escalatedToDepartmentId',
        oldValue: ticket.escalatedToDepartmentId,
        newValue: escalatedToDepartmentId,
        userId
      });
    }

    ticketFields.updatedAt = Date.now();

    if (historyEntries.length > 0) {
      ticketFields.$push = { history: { $each: historyEntries } };
    }

    const updatedTicket = await Ticket.findByIdAndUpdate(
      req.params.id,
      ticketFields,
      { new: true }
    )
      .populate('authorId', 'firstName lastName')
      .populate('assignedToId', 'firstName lastName')
      .populate('departmentId', 'name')
      .populate('topicId', 'category subcategory')
      .populate('comments.userId', 'firstName lastName')
      .populate('history.userId', 'firstName lastName');

    if (!updatedTicket) {
      console.log(`TICKET CONTROLLER: updateTicket - Ticket update failed for ID: ${req.params.id}`);
      return res.status(500).json({ error: 'Ticket update failed' });
    }

    console.log('TICKET CONTROLLER: updateTicket - Ticket updated:', updatedTicket);
    res.json(updatedTicket);
  } catch (error) {
    console.error('TICKET CONTROLLER: updateTicket - ERROR:', error);
    next(error);
  } finally {
    console.log('TICKET CONTROLLER: updateTicket - END');
  }
};

export const addComment = async (req, res, next) => {
  console.log(`TICKET CONTROLLER: addComment - START - ID: ${req.params.id}`);
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('TICKET CONTROLLER: addComment - Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { content } = req.body;
    const userId = req.user.id;
    console.log('TICKET CONTROLLER: addComment - Request body:', req.body);

    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      console.log(`TICKET CONTROLLER: addComment - Ticket not found with ID: ${req.params.id}`);
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const comment = {
      content,
      userId,
      createdAt: Date.now()
    };

    ticket.comments.push(comment);

    ticket.history.push({
      field: 'comment',
      newValue: 'Comment added',
      userId
    });

    ticket.updatedAt = Date.now();

    await ticket.save();

    const updatedTicket = await Ticket.findById(req.params.id)
      .populate('authorId', 'firstName lastName')
      .populate('assignedToId', 'firstName lastName')
      .populate('departmentId', 'name')
      .populate('topicId', 'category subcategory')
      .populate('comments.userId', 'firstName lastName');

    console.log('TICKET CONTROLLER: addComment - Comment added to ticket:', updatedTicket);
    res.json(updatedTicket);
  } catch (error) {
    console.error('TICKET CONTROLLER: addComment - ERROR:', error);
    next(error);
  } finally {
    console.log('TICKET CONTROLLER: addComment - END');
  }
};

export const updateStatus = async (req, res, next) => {
  console.log(`TICKET CONTROLLER: updateStatus - START - ID: ${req.params.id}`);
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('TICKET CONTROLLER: updateStatus - Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { status } = req.body;
    const userId = req.user.id;
    console.log('TICKET CONTROLLER: updateStatus - Request body:', req.body);

    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      console.log(`TICKET CONTROLLER: updateStatus - Ticket not found with ID: ${req.params.id}`);
      return res.status(404).json({ error: 'Ticket not found' });
    }

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
      .populate('authorId', 'firstName lastName')
      .populate('assignedToId', 'firstName lastName')
      .populate('departmentId', 'name')
      .populate('topicId', 'name');

    console.log('TICKET CONTROLLER: updateStatus - Ticket status updated:', updatedTicket);
    res.json(updatedTicket);
  } catch (error) {
    console.error('TICKET CONTROLLER: updateStatus - ERROR:', error);
    next(error);
  } finally {
    console.log('TICKET CONTROLLER: updateStatus - END');
  }
};

export const updatePriority = async (req, res, next) => {
  console.log(`TICKET CONTROLLER: updatePriority - START - ID: ${req.params.id}`);
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('TICKET CONTROLLER: updatePriority - Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { priority } = req.body;
    const userId = req.user.id;
    console.log('TICKET CONTROLLER: updatePriority - Request body:', req.body);

    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      console.log(`TICKET CONTROLLER: updatePriority - Ticket not found with ID: ${req.params.id}`);
      return res.status(404).json({ error: 'Ticket not found' });
    }

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
      .populate('authorId', 'firstName lastName')
      .populate('assignedToId', 'firstName lastName')
      .populate('departmentId', 'name')
      .populate('topicId', 'name');

    console.log('TICKET CONTROLLER: updatePriority - Ticket priority updated:', updatedTicket);
    res.json(updatedTicket);
  } catch (error) {
    console.error('TICKET CONTROLLER: updatePriority - ERROR:', error);
    next(error);
  } finally {
    console.log('TICKET CONTROLLER: updatePriority - END');
  }
};

export const assignTicket = async (req, res, next) => {
  console.log(`TICKET CONTROLLER: assignTicket - START - ID: ${req.params.id}`);
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('TICKET CONTROLLER: assignTicket - Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { assignedToId } = req.body;
    const userId = req.user.id;
    console.log('TICKET CONTROLLER: assignTicket - Request body:', req.body);

    // Verify user exists
    if (assignedToId) {
      const user = await User.findById(assignedToId);
      if (!user) {
        console.log(`TICKET CONTROLLER: assignTicket - User not found with ID: ${assignedToId}`);
        return res.status(404).json({ error: 'User not found' });
      }
    }

    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      console.log(`TICKET CONTROLLER: assignTicket - Ticket not found with ID: ${req.params.id}`);
      return res.status(404).json({ error: 'Ticket not found' });
    }

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
      .populate('authorId', 'firstName lastName')
      .populate('assignedToId', 'firstName lastName')
      .populate('departmentId', 'name')
      .populate('topicId', 'name');

    console.log('TICKET CONTROLLER: assignTicket - Ticket assigned to user:', updatedTicket);
    res.json(updatedTicket);
  } catch (error) {
    console.error('TICKET CONTROLLER: assignTicket - ERROR:', error);
    next(error);
  } finally {
    console.log('TICKET CONTROLLER: assignTicket - END');
  }
};

export const getTicketsByUser = async (req, res, next) => {
  console.log(`TICKET CONTROLLER: getTicketsByUser - START - User ID: ${req.params.userId}`);
  try {
    const userId = req.params.userId;

    const tickets = await Ticket.find({
      $or: [
        { authorId: userId },
        { assignedToId: userId }
      ]
    })
      .populate('authorId', 'firstName lastName')
      .populate('assignedToId', 'firstName lastName')
      .populate('departmentId', 'name')
      .populate('topicId', 'category subcategory')
      .sort({ createdAt: -1 });

    console.log(`TICKET CONTROLLER: getTicketsByUser - Found ${tickets.length} tickets for user ID: ${userId}`);
    res.json(tickets);
  } catch (error) {
    console.error('TICKET CONTROLLER: getTicketsByUser - ERROR:', error);
    next(error);
  } finally {
    console.log('TICKET CONTROLLER: getTicketsByUser - END');
  }
};

export const getTicketsByDepartment = async (req, res, next) => {
  console.log(`TICKET CONTROLLER: getTicketsByDepartment - START - Department ID: ${req.params.departmentId}`);
  try {
    const departmentId = req.params.departmentId;

    const tickets = await Ticket.find({ departmentId })
      .populate('authorId', 'firstName lastName')
      .populate('assignedToId', 'firstName lastName')
      .populate('departmentId', 'name')
      .populate('topicId', 'category subcategory')
      .sort({ createdAt: -1 });

    console.log(`TICKET CONTROLLER: getTicketsByDepartment - Found ${tickets.length} tickets for department ID: ${departmentId}`);
    res.json(tickets);
  } catch (error) {
    console.error('TICKET CONTROLLER: getTicketsByDepartment - ERROR:', error);
    next(error);
  } finally {
    console.log('TICKET CONTROLLER: getTicketsByDepartment - END');
  }
};