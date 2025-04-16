import User from '../models/User.js';
import { validationResult } from 'express-validator';
import sendEmail from '../utils/emailService.js';
import Department from '../models/Department.js';

function isValidBirthday(birthday) {
  const regex = /^(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])\.(19|20)\d{2}$/;
  return regex.test(birthday);
}

function parseBirthdayString(birthdayStr) {
  const [day, month, year] = birthdayStr.split('.');
  return new Date(`${year}-${month}-${day}`);
}

function isBirthdayAcceptable(birthdayDate) {
  const now = new Date();
  if (birthdayDate > now) return { valid: false, msg: 'Birthday cannot be in the future.' };

  const age = now.getFullYear() - birthdayDate.getFullYear();
  const monthDiff = now.getMonth() - birthdayDate.getMonth();
  const dayDiff = now.getDate() - birthdayDate.getDate();
  const fullAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;

  if (fullAge < 13) {
    return {
      valid: false,
      msg: fullAge < 5
        ? 'Too young to register. No babies allowed!'
        : 'User must be at least 13 years old.'
    };
  }

  return { valid: true };
}

export const createUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let {
      firstName,
      lastName,
      username,
      birthday,
      email,
      password,
      role,
      department: departmentId,
      defaultDepartment: defaultDepartmentId,
      status
    } = req.body;

    if (birthday && !isValidBirthday(birthday)) {
      return res.status(400).json({ error: 'Invalid birthday format. Use dd.mm.yyyy' });
    }

    let parsedBirthday = null;
    if (birthday) {
      parsedBirthday = parseBirthdayString(birthday);
      const ageCheck = isBirthdayAcceptable(parsedBirthday);
      if (!ageCheck.valid) {
        return res.status(400).json({ error: ageCheck.msg });
      }
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with provided email or username' });
    }

    let assignedDefaultDepartment = null;
    if (role === 'admin') {
      const itDepartment = await Department.findOne({ name: 'IT' });
      if (itDepartment) assignedDefaultDepartment = itDepartment._id;
    } else if (role === 'manager') {
      const managersDepartment = await Department.findOne({ name: 'Managers' });
      if (managersDepartment) assignedDefaultDepartment = managersDepartment._id;
    }

    const userData = {
      firstName,
      lastName,
      username,
      birthday: parsedBirthday,
      email,
      password,
      role,
      status,
      defaultDepartment: defaultDepartmentId || assignedDefaultDepartment
    };

    if (role !== 'admin' && !departmentId) {
      return res.status(400).json({ error: 'Department is required for this role' });
    } else if (departmentId) {
      const department = await Department.findById(departmentId);
      if (!department) {
        return res.status(400).json({ error: 'Invalid Department', details: `Department with ID ${departmentId} not found` });
      }
      userData.department = departmentId;
    }

    const user = new User(userData);
    await user.save();

    if (user.department) {
      const department = await Department.findById(user.department);
      if (department && !department.members.includes(user._id)) {
        department.members.push(user._id);
        await department.save();
      }
    }

    try {
      await sendEmail(email, 'Welcome to Ticket Scribe!', `
        <h1>Welcome, ${firstName} ${lastName}!</h1>
        <p>Thank you for registering with Ticket Scribe. Your username is: ${username}</p>
      `);
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
    }

    const userResponse = user.toObject();
    delete userResponse.password;
    res.status(201).json(userResponse);
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updateFields = { ...req.body };

    if (updateFields.birthday) {
      if (!isValidBirthday(updateFields.birthday)) {
        return res.status(400).json({ error: 'Invalid birthday format. Use dd.mm.yyyy' });
      }
      const parsedBirthday = parseBirthdayString(updateFields.birthday);
      const ageCheck = isBirthdayAcceptable(parsedBirthday);
      if (!ageCheck.valid) {
        return res.status(400).json({ error: ageCheck.msg });
      }
      updateFields.birthday = parsedBirthday;
    }

    updateFields.updatedAt = Date.now();

    const updatedUser = await User.findByIdAndUpdate(req.params.id, updateFields, {
      new: true,
      runValidators: true
    }).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const getUserByUsername = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const getUserByDepartment = async (req, res, next) => {
  try {
    const { departmentId } = req.params;

    const users = await User.find({ department: departmentId }).select('-password');

    if (!users || users.length === 0) {
      return res.status(404).json({ error: 'No users found for this department' });
    }

    res.json(users);
  } catch (error) {
    console.error('USER CONTROLLER: getUserByDepartment - ERROR:', error);
    next(error);
  }
};

export const getUserByEmail = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.params.email }).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};  


