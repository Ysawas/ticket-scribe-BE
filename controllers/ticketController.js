import Ticket from '../models/Ticket.js';
import User from '../models/User.js';
import Department from '../models/Department.js';
import Topic from '../models/Topic.js';
import { validationResult } from 'express-validator';
import sendEmail from '../utils/emailService.js';

export const getAllTickets = async (req, res, next) => {
  console.log('TICKET CONTROLLER: getAllTickets - START');
  try {
    const { limit = 10, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const tickets = await Ticket.find()
      .populate('authorId', 'firstName lastName email') // Include email!
      .populate('assignedToId', 'firstName lastName email') // Include email!
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
      .populate('authorId', 'firstName lastName email')
      .populate('assignedToId', 'firstName lastName email')
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
  console.log('TICKET CONTROLLER: createTicket - Request Body (raw):', req.body);  //  Log the raw body
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('TICKET CONTROLLER: createTicket - Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, priority, authorId, assignedToId, departmentId, topicId } = req.body;
    /*console.log('TICKET CONTROLLER: createTicket - Request body:', req.body);*/
    console.log('TICKET CONTROLLER: createTicket - Destructured body:', { title, description, priority, authorId, assignedToId, departmentId, topicId });


    // Verify that authorId, departmentId, and topicId are valid (you might want to create middleware for this)
    const author = await User.findById(authorId);
    if (!author) {
      return res.status(400).json({ error: 'Invalid Author', details: `Author with ID ${authorId} not found` });
    }

    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(400).json({ error: 'Invalid Department', details: `Department with ID ${departmentId} not found` });
    }

    const topic = await Topic.findById(topicId);
    if (!topic) {
      return res.status(400).json({ error: 'Invalid Topic', details: `Topic with ID ${topicId} not found` });
    }

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
      .populate('authorId', 'firstName lastName email')
      .populate('assignedToId', 'firstName lastName email')
      .populate('departmentId', 'name')
      .populate('topicId', 'category subcategory');

    // Send email to author
    try {
      await sendEmail(populatedTicket.authorId.email, 'New Ticket Created', `
        <h1>A new ticket has been created</h1>
        <p>Title: ${title}</p>
        <p>Description: ${description}</p>
        <p>You can view it here: <a href="your_app_url/tickets/${populatedTicket._id}">View Ticket</a></p>
      `);
      console.log('TICKET CONTROLLER: createTicket - Email sent to author:', populatedTicket.authorId.email);
    } catch (emailError) {
      console.error('TICKET CONTROLLER: createTicket - Error sending email to author:', emailError);
      // Handle error (log, etc.)
    }

    // Send email to assigned user (if assigned)
    if (populatedTicket.assignedToId) {
      try {
        await sendEmail(populatedTicket.assignedToId.email, 'New Ticket Assigned to You', `
          <h1>A new ticket has been assigned to you</h1>
          <p>Title: ${title}</p>
          <p>Description: ${description}</p>
          <p>You can view it here: <a href="your_app_url/tickets/${populatedTicket._id}">View Ticket</a></p>
        `);
        console.log('TICKET CONTROLLER: createTicket - Email sent to assigned user:', populatedTicket.assignedToId.email);
      } catch (emailError) {
        console.error('TICKET CONTROLLER: createTicket - Error sending email to assigned user:', emailError);
        // Handle error
      }
    }

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
      .populate('authorId', 'firstName lastName email')
      .populate('assignedToId', 'firstName lastName email')
      .populate('departmentId', 'name')
      .populate('topicId', 'category subcategory');

    // Send email to author
    try {
      await sendEmail(populatedTicket.authorId.email, 'New Ticket Created (with Attachments)', `
        <h1>A new ticket has been created (with attachments)</h1>
        <p>Title: ${title}</p>
        <p>Description: ${description}</p>
        <p>You can view it here: <a href="your_app_url/tickets/${populatedTicket._id}">View Ticket</a></p>
      `);
      console.log('TICKET CONTROLLER: createTicketWithAttachments - Email sent to author:', populatedTicket.authorId.email);
    } catch (emailError) {
      console.error('TICKET CONTROLLER: createTicketWithAttachments - Error sending email to author:', emailError);
      // Handle error
    }

    // Send email to assigned user (if assigned)
    if (populatedTicket.assignedToId) {
      try {
        await sendEmail(populatedTicket.assignedToId.email, 'New Ticket Assigned to You (with Attachments)', `
          <h1>A new ticket has been assigned to you (with attachments)</h1>
          <p>Title: ${title}</p>
          <p>Description: ${description}</p>
          <p>You can view it here: <a href="your_app_url/tickets/${populatedTicket._id}">View Ticket</a></p>
        `);
        console.log('TICKET CONTROLLER: createTicketWithAttachments - Email sent to assigned user:', populatedTicket.assignedToId.email);
      } catch (emailError) {
        console.error('TICKET CONTROLLER: createTicketWithAttachments - Error sending email to assigned user:', emailError);
        // Handle error
      }
    }

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

    const ticket = await Ticket.findById(req.params.id)
      .populate('authorId', 'firstName lastName email')
      .populate('assignedToId', 'firstName lastName email');

    if (!ticket) {
      console.log(`TICKET CONTROLLER: updateTicket - Ticket not found with ID: ${req.params.id}`);
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticketFields = {};
    const historyEntries = [];
    let statusChanged = false;
    let assigneeChanged = false;

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
      statusChanged = true;
    }

    if (progress && progress !== ticket.progress) {
      ticketFields.progress = progress;
      historyEntries.push({
        field: 'progress',
        oldValue: ticket.progress,
        newValue: progress,
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
      assigneeChanged = true;
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
      .populate('authorId', 'firstName lastName email')
      .populate('assignedToId', 'firstName lastName email')
      .populate('departmentId', 'name')
      .populate('topicId', 'category subcategory')
      .populate('comments.userId', 'firstName lastName')
      .populate('history.userId', 'firstName lastName');

    if (!updatedTicket) {
      console.log(`TICKET CONTROLLER: updateTicket - Ticket update failed for ID: ${req.params.id}`);
      return res.status(500).json({ error: 'Ticket update failed' });
    }

    //  Send email notifications based on changes
    if (statusChanged) {
      try {
        await sendEmail(ticket.authorId.email, `Ticket Status Updated: ${ticket.title}`, `
          <h1>The status of your ticket has been updated:</h1>
          <p>Title: ${ticket.title}</p>
          <p>New Status: ${status}</p>
          <p>You can view it here: <a href="your_app_url/tickets/${updatedTicket._id}">View Ticket</a></p>
        `);
        console.log(`TICKET CONTROLLER: updateTicket - Status update notification sent to author: ${ticket.authorId.email}`);
      } catch (emailError) {
        console.error('TICKET CONTROLLER: updateTicket - Error sending status update email to author:', emailError);
        // Handle error
      }
    }

    if (assigneeChanged) {
      try {
        if (updatedTicket.assignedToId) {
          await sendEmail(updatedTicket.assignedToId.email, `Ticket Assigned To You: ${updatedTicket.title}`, `
            <h1>A ticket has been assigned to you:</h1>
            <p>Title: ${updatedTicket.title}</p>
            <p>You can view it here: <a href="your_app_url/tickets/${updatedTicket._id}">View Ticket</a></p>
          `);
          console.log(`TICKET CONTROLLER: updateTicket - Assignee update email sent to new assignee: ${updatedTicket.assignedToId.email}`);
        }
      } catch (emailError) {
        console.error('TICKET CONTROLLER: updateTicket - Error sending assignee update email to new assignee:', emailError);
        // Handle error
      }
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

    const ticket = await Ticket.findById(req.params.id)
      .populate('authorId', 'email')
      .populate('assignedToId', 'email');

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
      .populate('authorId', 'firstName lastName email')
      .populate('assignedToId', 'firstName lastName email')
      .populate('departmentId', 'name')
      .populate('topicId', 'category subcategory')
      .populate('comments.userId', 'firstName lastName');

    // Send email notifications
    try {
      if (ticket.authorId && ticket.authorId.email) {
        await sendEmail(ticket.authorId.email, `New Comment on Ticket: ${ticket.title}`, `
          <h1>A new comment has been added to your ticket:</h1>
          <p>Title: ${ticket.title}</p>
          <p>Comment: ${content}</p>
          <p>You can view it here: <a href="your_app_url/tickets/${updatedTicket._id}">View Ticket</a></p>
        `);
        console.log(`TICKET CONTROLLER: addComment - Comment notification sent to author: ${ticket.authorId.email}`);
      }
      if (ticket.assignedToId && ticket.assignedToId.email && ticket.assignedToId.toString() !== req.user.id) {
        await sendEmail(ticket.assignedToId.email, `New Comment on Ticket: ${ticket.title}`, `
          <h1>A new comment has been added to the ticket assigned to you:</h1>
          <p>Title: ${ticket.title}</p>
          <p>Comment: ${content}</p>
          <p>You can view it here: <a href="your_app_url/tickets/${updatedTicket._id}">View Ticket</a></p>
        `);
        console.log(`TICKET CONTROLLER: addComment - Comment notification sent to assignee: ${ticket.assignedToId.email}`);
      }
    } catch (emailError) {
      console.error('TICKET CONTROLLER: addComment - Error sending comment notification:', emailError);
      // Handle error
    }

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

    const ticket = await Ticket.findById(req.params.id)
      .populate('authorId', 'email')
      .populate('assignedToId', 'email');

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
      .populate('authorId', 'firstName lastName email')
      .populate('assignedToId', 'firstName lastName email')
      .populate('departmentId', 'name')
      .populate('topicId', 'name');

    // Send email notifications
    try {
      if (ticket.authorId && ticket.authorId.email) {
        await sendEmail(ticket.authorId.email, `Ticket Status Updated: ${ticket.title}`, `
          <h1>The status of your ticket has been updated:</h1>
          <p>Title: ${ticket.title}</p>
          <p>New Status: ${status}</p>
          <p>You can view it here: <a href="your_app_url/tickets/${updatedTicket._id}">View Ticket</a></p>
        `);
        console.log(`TICKET CONTROLLER: updateStatus - Status update notification sent to author: ${ticket.authorId.email}`);
      }
      if (ticket.assignedToId && ticket.assignedToId.email) {
        await sendEmail(ticket.assignedToId.email, `Ticket Status Updated: ${ticket.title}`, `
          <h1>The status of the ticket assigned to you has been updated:</h1>
          <p>Title: ${ticket.title}</p>
          <p>New Status: ${status}</p>
          <p>You can view it here: <a href="your_app_url/tickets/${updatedTicket._id}">View Ticket</a></p>
        `);
        console.log(`TICKET CONTROLLER: updateStatus - Status update notification sent to assignee: ${ticket.assignedToId.email}`);
      }
    } catch (emailError) {
      console.error('TICKET CONTROLLER: updateStatus - Error sending status update notification:', emailError);
      // Handle error
    }

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

    const ticket = await Ticket.findById(req.params.id)
      .populate('authorId', 'email')
      .populate('assignedToId', 'email');

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
      .populate('authorId', 'firstName lastName email')
      .populate('assignedToId', 'firstName lastName email')
      .populate('departmentId', 'name')
      .populate('topicId', 'name');

    // Send email notifications
    try {
      if (ticket.authorId && ticket.authorId.email) {
        await sendEmail(ticket.authorId.email, `Ticket Priority Updated: ${ticket.title}`, `
          <h1>The priority of your ticket has been updated:</h1>
          <p>Title: ${ticket.title}</p>
          <p>New Priority: ${priority}</p>
          <p>You can view it here: <a href="your_app_url/tickets/${updatedTicket._id}">View Ticket</a></p>
        `);
        console.log(`TICKET CONTROLLER: updatePriority - Priority update notification sent to author: ${ticket.authorId.email}`);
      }
      if (ticket.assignedToId && ticket.assignedToId.email) {
        await sendEmail(ticket.assignedToId.email, `Ticket Priority Updated: ${ticket.title}`, `
          <h1>The priority of the ticket assigned to you has been updated:</h1>
          <p>Title: ${ticket.title}</p>
          <p>New Priority: ${priority}</p>
          <p>You can view it here: <a href="your_app_url/tickets/${updatedTicket._id}">View Ticket</a></p>
        `);
        console.log(`TICKET CONTROLLER: updatePriority - Priority update notification sent to assignee: ${ticket.assignedToId.email}`);
      }
    } catch (emailError) {
      console.error('TICKET CONTROLLER: updatePriority - Error sending priority update notification:', emailError);
      // Handle error
    }

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

    const ticket = await Ticket.findById(req.params.id)
      .populate('authorId', 'email')
      .populate('assignedToId', 'email');

    if (!ticket) {
      console.log(`TICKET CONTROLLER: assignTicket - Ticket not found with ID: ${req.params.id}`);
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const oldAssignedId = ticket.assignedToId ? ticket.assignedToId.toString() : null;
    if (assignedToId !== oldAssignedId) {
      ticket.history.push({
        field: 'assignedToId',
        oldValue: ticket.assignedToId,
        newValue: assignedToId,
        userId
      });
    }

    ticket.assignedToId = assignedToId;
    ticket.updatedAt = Date.now();

    await ticket.save();

    const updatedTicket = await Ticket.findById(req.params.id)
      .populate('authorId', 'firstName lastName email')
      .populate('assignedToId', 'firstName lastName email')
      .populate('departmentId', 'name')
      .populate('topicId', 'name');

    // Send email notifications
    try {
      if (ticket.authorId && ticket.authorId.email) {
        await sendEmail(ticket.authorId.email, `Ticket Assigned: ${ticket.title}`, `
          <h1>Ticket Assigned:</h1>
          <p>Title: ${ticket.title}</p>
          <p>This ticket has been assigned to a new user.</p>
          <p>You can view it here: <a href="your_app_url/tickets/${updatedTicket._id}">View Ticket</a></p>
        `);
        console.log(`TICKET CONTROLLER: assignTicket - Assignment notification sent to author: ${ticket.authorId.email}`);
      }
      if (updatedTicket.assignedToId && updatedTicket.assignedToId.email) {
        await sendEmail(updatedTicket.assignedToId.email, `Ticket Assigned To You: ${updatedTicket.title}`, `
          <h1>A ticket has been assigned to you:</h1>
          <p>Title: ${updatedTicket.title}</p>
          <p>You can view it here: <a href="your_app_url/tickets/${updatedTicket._id}">View Ticket</a></p>
        `);
        console.log(`TICKET CONTROLLER: assignTicket - Assignment notification sent to new assignee: ${updatedTicket.assignedToId.email}`);
      }
    } catch (emailError) {
      console.error('TICKET CONTROLLER: assignTicket - Error sending assignment notification:', emailError);
      // Handle error
    }

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