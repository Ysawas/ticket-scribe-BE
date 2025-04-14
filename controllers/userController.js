import User from '../models/User.js';
import { validationResult } from 'express-validator';
import sendEmail from '../utils/emailService.js'; //  Import the email service

export const getAllUsers = async (req, res, next) => {
  console.log('USER CONTROLLER: getAllUsers - START');
  try {
    const { limit = 10, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const users = await User.find().select('-password').populate('departmentId', 'name').skip(parseInt(skip)).limit(parseInt(limit));
    const total = await User.countDocuments();

    console.log(`USER CONTROLLER: getAllUsers - Found ${users.length} users`);
    res.json({
      users,
      total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('USER CONTROLLER: getAllUsers - ERROR:', error);
    next(error);
  } finally {
    console.log('USER CONTROLLER: getAllUsers - END');
  }
};

export const getUserById = async (req, res, next) => {
  console.log(`USER CONTROLLER: getUserById - START - ID: ${req.params.id}`);
  try {
    const user = await User.findById(req.params.id).select('-password').populate('departmentId', 'name');

    if (!user) {
      console.log(`USER CONTROLLER: getUserById - User not found with ID: ${req.params.id}`);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('USER CONTROLLER: getUserById - User found:', user);
    res.json(user);
  } catch (error) {
    console.error('USER CONTROLLER: getUserById - ERROR:', error);
    next(error);
  } finally {
    console.log('USER CONTROLLER: getUserById - END');
  }
};

export const createUser = async (req, res, next) => {
  console.log('USER CONTROLLER: createUser - START');
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('USER CONTROLLER: createUser - Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, username, birthday, password, role, status, departmentId, email } = req.body;
    console.log('USER CONTROLLER: createUser - Request body:', req.body);

    // Check if user exists
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      console.log('USER CONTROLLER: createUser - User with this email or username already exists');
      return res.status(400).json({ error: 'User with this email or username already exists' });
    }

    // Create user
    user = new User({
      firstName,
      lastName,
      username,
      birthday,
      password,
      role,
      status,
      departmentId,
      email //  Include email in the user object
    });

    await user.save();

    // Send welcome email
    try {
      await sendEmail(email, 'Welcome to Ticket Scribe!', `
        <h1>Welcome, ${firstName} ${lastName}!</h1>
        <p>Thank you for registering with Ticket Scribe. Your username is: ${username}</p>
      `);
      console.log('USER CONTROLLER: createUser - Welcome email sent to:', email);
    } catch (emailError) {
      console.error('USER CONTROLLER: createUser - Error sending welcome email:', emailError);
      //  IMPORTANT: Decide how to handle email sending errors.
      //  You might choose to log the error but still send the user a success response.
    }

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    console.log('USER CONTROLLER: createUser - User created:', userResponse);
    res.status(201).json(userResponse);
  } catch (error) {
    console.error('USER CONTROLLER: createUser - ERROR:', error);
    next(error);
  } finally {
    console.log('USER CONTROLLER: createUser - END');
  }
};

export const updateUser = async (req, res, next) => {
  console.log(`USER CONTROLLER: updateUser - START - ID: ${req.params.id}`);
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('USER CONTROLLER: updateUser - Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, username, birthday, role, status, departmentId, email } = req.body;
    console.log('USER CONTROLLER: updateUser - Request body:', req.body);

    // Build user object
    const userFields = {};
    if (firstName) userFields.firstName = firstName;
    if (lastName) userFields.lastName = lastName;
    if (username) userFields.username = username;
    if (birthday) userFields.birthday = birthday;
    if (role) userFields.role = role;
    if (status) userFields.status = status;
    if (departmentId) userFields.departmentId = departmentId;
    if (email) userFields.email = email;
    userFields.updatedAt = Date.now();

    // Update user
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: userFields },
      { new: true }
    ).select('-password').populate('departmentId', 'name');

    if (!user) {
      console.log(`USER CONTROLLER: updateUser - User not found with ID: ${req.params.id}`);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('USER CONTROLLER: updateUser - User updated:', user);
    res.json(user);
  } catch (error) {
    console.error('USER CONTROLLER: updateUser - ERROR:', error);
    next(error);
  } finally {
    console.log('USER CONTROLLER: updateUser - END');
  }
};

export const deleteUser = async (req, res, next) => {
  console.log(`USER CONTROLLER: deleteUser - START - ID: ${req.params.id}`);
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      console.log(`USER CONTROLLER: deleteUser - User not found with ID: ${req.params.id}`);
      return res.status(404).json({ error: 'User not found' });
    }

    await User.findByIdAndRemove(req.params.id);

    console.log(`USER CONTROLLER: deleteUser - User removed with ID: ${req.params.id}`);
    res.json({ message: 'User removed' });
  } catch (error) {
    console.error('USER CONTROLLER: deleteUser - ERROR:', error);
    next(error);
  } finally {
    console.log('USER CONTROLLER: deleteUser - END');
  }
};