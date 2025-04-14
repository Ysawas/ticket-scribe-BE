import User from '../models/User.js';
import { validationResult } from 'express-validator';
import sendEmail from '../utils/emailService.js';
import Department from '../models/Department.js'; //  Import Department model

export const getAllUsers = async (req, res, next) => {
  console.log('USER CONTROLLER: getAllUsers - START');
  try {
    const { limit = 10, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const users = await User.find().select('-password').populate('department', 'name').skip(parseInt(skip)).limit(parseInt(limit));
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
    const user = await User.findById(req.params.id).select('-password').populate('department', 'name');

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

    const { firstName, lastName, username, birthday, password, role, status, department: departmentId, email } = req.body;
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
      department: departmentId,
      email
    });

    await user.save();

    //  Add user to department's members array
    if (departmentId) {
      console.log(`USER CONTROLLER: createUser - Adding user to department with ID: ${departmentId}`);
      try {
        const department = await Department.findById(departmentId);
        if (department) {
          console.log(`USER CONTROLLER: createUser - Department found:`, department);
          department.members.push(user._id);
          await department.save();
          console.log(`USER CONTROLLER: createUser - Department saved. members:`, department.members);
        } else {
          console.warn(`USER CONTROLLER: createUser - Department with ID ${departmentId} NOT found!`);
        }
      } catch (error) {
        console.error(`USER CONTROLLER: createUser - Error updating department:`, error);
      }
    }

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

    const { firstName, lastName, username, birthday, role, status, department: departmentId, email } = req.body;
    console.log('USER CONTROLLER: updateUser - Request body:', req.body);

    // Build user object
    const userFields = {};
    if (firstName) userFields.firstName = firstName;
    if (lastName) userFields.lastName = lastName;
    if (username) userFields.username = username;
    if (birthday) userFields.birthday = birthday;
    if (role) userFields.role = role;
    if (status) userFields.status = status;
    if (email) userFields.email = email;
    userFields.updatedAt = Date.now();

    //  Handle department change
    if (departmentId) {
      console.log(`USER CONTROLLER: updateUser - Changing user ${req.params.id} to department ${departmentId}`);
      const newDepartment = await Department.findById(departmentId);
      const oldDepartment = await User.findById(req.params.id).populate('department');

      if (newDepartment) {
        console.log(`USER CONTROLLER: updateUser - New department found:`, newDepartment);
        userFields.department = departmentId;
        newDepartment.members.push(req.params.id);
        await newDepartment.save();
        console.log(`USER CONTROLLER: updateUser - User added to new department. Members:`, newDepartment.members);

        if (oldDepartment && oldDepartment.department) {
          console.log(`USER CONTROLLER: updateUser - Old department found:`, oldDepartment.department);
          oldDepartment.department.members.pull(req.params.id);
          await oldDepartment.department.save();
          console.log(`USER CONTROLLER: updateUser - User removed from old department. Members:`, oldDepartment.department.members);
        }
      } else {
        console.warn(`USER CONTROLLER: updateUser - Department with ID ${departmentId} not found, user's department not updated.`);
        //  Decide how to handle this
      }
    }

    // Update user
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: userFields },
      { new: true }
    ).select('-password').populate('department', 'name');

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

    //  Remove user from department's members array
    if (user.department) {
      const department = await Department.findById(user.department);
      if (department) {
        department.members.pull(req.params.id);
        await department.save();
      } else {
        console.warn(`USER CONTROLLER: deleteUser - Department with ID ${user.department} not found, user not removed from department members.`);
        //  Decide how to handle this (maybe don't throw an error)
      }
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