import User from '../models/User.js';
import { validationResult } from 'express-validator';
import sendEmail from '../utils/emailService.js';
import Department from '../models/Department.js';

export const getAllUsers = async (req, res, next) => {
  console.log('USER CONTROLLER: getAllUsers - START');
  try {
    const { limit = 10, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const users = await User.find().select('-password').populate('department', 'name').populate('defaultDepartment', 'name').skip(parseInt(skip)).limit(parseInt(limit));
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
    const user = await User.findById(req.params.id).select('-password').populate('department', 'name').populate('defaultDepartment', 'name');

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

    const { firstName, lastName, username, birthday, password, role, status, department: departmentId, defaultDepartment: defaultDepartmentId, email } = req.body;
    console.log('USER CONTROLLER: createUser - Request body:', req.body);

    // Check if user exists
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      console.log('USER CONTROLLER: createUser - User with this email or username already exists');
      return res.status(400).json({ error: 'User with this email or username already exists' });
    }

    let assignedDefaultDepartment = null;

    // Basic role-based default department assignment
    if (role === 'admin') {
      const itDepartment = await Department.findOne({ name: 'IT' });
      if (itDepartment) {
        assignedDefaultDepartment = itDepartment._id;
      } else {
        console.warn('USER CONTROLLER: createUser - IT Department not found, defaultDepartment not set for admin.');
      }
    } else if (role === 'manager') {
      const managersDepartment = await Department.findOne({ name: 'Managers' });
      if (managersDepartment) {
        assignedDefaultDepartment = managersDepartment._id;
      } else {
        console.warn('USER CONTROLLER: createUser - Managers Department not found, defaultDepartment not set for manager.');
      }
    }

    // Create user object
    const userData = {
      firstName,
      lastName,
      username,
      birthday,
      password,
      role,
      status,
      defaultDepartment: defaultDepartmentId || assignedDefaultDepartment,
      email
    };

    // Conditionally assign department
    if (role !== 'admin' && !departmentId) {
      console.log('USER CONTROLLER: createUser - Department is required, returning error.');
      return res.status(400).json({ error: 'Department is required for this role', details: 'Department is required for roles other than admin' });
    } else if (departmentId) {
      const department = await Department.findById(departmentId);
      if (!department) {
        console.warn(`USER CONTROLLER: createUser - Department with ID ${departmentId} not found, returning error.`);
        return res.status(400).json({ error: 'Invalid Department', details: `Department with ID ${departmentId} not found` });
      }
      userData.department = departmentId;
      console.log('USER CONTROLLER: createUser - Department ID is valid:', departmentId);
    } else {
      console.log('USER CONTROLLER: createUser - Role is admin, department is not required.');
    }

    user = new User(userData);
    console.log('USER CONTROLLER: createUser - User object before save:', JSON.stringify(user, null, 2));

    try {
      await user.save();
      console.log('USER CONTROLLER: createUser - User saved successfully:', user._id);
    } catch (error) {
      if (error.name === 'ValidationError') {
        const errors = [];
        for (const key in error.errors) {
          errors.push({ path: key, message: error.errors[key].message });
        }
        console.log('USER CONTROLLER: createUser - Mongoose Validation Error:', JSON.stringify(errors, null, 2));
        return res.status(400).json({ error: 'Validation Error', details: errors });
      }
      console.error('USER CONTROLLER: createUser - Error during user.save():', error);
      throw error; // Re-throw other errors
    }

    //  Add user to department's members array
    if (user.department) {
      try {
        const department = await Department.findById(user.department);
        if (department) {
          if (!department.members.includes(user._id)) {
            department.members.push(user._id);
            await department.save();
            console.log(`USER CONTROLLER: createUser - User added to department ${user.department}`);
          }
        } else {
          console.warn(`USER CONTROLLER: createUser - Department with ID ${user.department} not found, user not added to department members.`);
        }
      } catch (departmentError) {
        console.error('USER CONTROLLER: createUser - Error updating department:', departmentError);
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
      //  IMPORTANT: Decide how to handle email sending errors.
      //  You might choose to log the error but still send the user a success response.
    }

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    console.log('USER CONTROLLER: createUser - User created:', JSON.stringify(userResponse, null, 2));
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

    const { firstName, lastName, username, birthday, role, status, department: departmentId, defaultDepartment: defaultDepartmentId, email } = req.body;
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
    if (defaultDepartmentId) userFields.defaultDepartment = defaultDepartmentId;
    userFields.updatedAt = Date.now();

    // Fetch the original user
    const originalUser = await User.findById(req.params.id).populate('department').populate('defaultDepartment');

    if (!originalUser) {
      console.log(`USER CONTROLLER: updateUser - User not found with ID: ${req.params.id}`);
      return res.status(404).json({ error: 'User not found' });
    }

    //  Handle department change
    if (departmentId && departmentId !== originalUser.department?.toString()) {
      try {
        const newDepartment = await Department.findById(departmentId);
        const oldDepartment = originalUser.department ? await Department.findById(originalUser.department) : null;

        if (newDepartment) {
          userFields.department = departmentId;

          if (oldDepartment) {
            oldDepartment.members.pull(req.params.id);
            await oldDepartment.save();
            console.log(`USER CONTROLLER: updateUser - User removed from old department: ${oldDepartment.name}`);
          }

          if (!newDepartment.members.includes(req.params.id)) {
            newDepartment.members.push(req.params.id);
            await newDepartment.save();
            console.log(`USER CONTROLLER: updateUser - User added to new department: ${newDepartment.name}`);
          }

        } else {
          console.warn(`USER CONTROLLER: updateUser - Department with ID ${departmentId} not found, user's department not updated.`);
          return res.status(400).json({ error: 'Invalid Department', details: `Department with ID ${departmentId} not found` });
        }
      } catch (departmentError) {
        console.error('USER CONTROLLER: updateUser - Error updating department:', departmentError);
        return next(departmentError);
      }
    } else if (departmentId) {
      userFields.department = departmentId; // Assign departmentId even if it's the same (for consistency)
    } else {
      userFields.department = originalUser.department; // Restore original department
    }

    try {
      // Update user
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { $set: userFields },
        { new: true, runValidators: true }
      ).select('-password').populate('department', 'name').populate('defaultDepartment', 'name');

      if (!user) {
        console.log(`USER CONTROLLER: updateUser - User update failed for ID: ${req.params.id}`);
        return res.status(500).json({ error: 'User update failed' });
      }

      console.log('USER CONTROLLER: updateUser - User updated:', user);
      res.json(user);

    } catch (error) {
      if (error.name === 'ValidationError') {
        // Validation failed
        const errors = [];
        for (const key in error.errors) {
          errors.push({ path: key, message: error.errors[key].message });
        }
        return res.status(400).json({ error: 'Validation Error', details: errors });
      }
      throw error;
    }

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
    const user = await User.findById(req.params.id).populate('department');

    if (!user) {
      console.log(`USER CONTROLLER: deleteUser - User not found with ID: ${req.params.id}`);
      return res.status(404).json({ error: 'User not found' });
    }

    //  Remove user from department's members array
    if (user.department) {
      try {
        const department = await Department.findById(user.department._id);
        if (department) {
          department.members.pull(req.params.id);
          await department.save();
          console.log(`USER CONTROLLER: deleteUser - User removed from department: ${department.name}`);
        } else {
          console.warn(`USER CONTROLLER: deleteUser - Department with ID ${user.department._id} not found, user not removed.`);
        }
      } catch (departmentError) {
        console.error('USER CONTROLLER: deleteUser - Error updating department:', departmentError);
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