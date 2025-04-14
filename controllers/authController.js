import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import sendEmail from '../utils/emailService.js'; //  Import the email service

export const login = async (req, res, next) => {
  console.log('AUTH CONTROLLER: login - START');
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('AUTH CONTROLLER: login - Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;
    console.log(`AUTH CONTROLLER: login - Attempting login for username: ${username}`);

    const user = await User.findOne({ username }).populate('departmentId', 'name');
    if (!user || user.status !== 'active') {
      console.log('AUTH CONTROLLER: login - Invalid username or user not active');
      return res.status(401).json({ error: 'Invalid username or user is not active' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('AUTH CONTROLLER: login - Invalid password');
      return res.status(401).json({ error: 'Invalid password' });
    }

    const payload = {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        department: user.departmentId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email // Include email in the payload
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
      (err, token) => {
        if (err) {
          console.error('AUTH CONTROLLER: login - JWT signing error:', err);
          return next(err);
        }
        console.log('AUTH CONTROLLER: login - Login successful, token:', token);
        res.json({ token });
      }
    );
  } catch (error) {
    console.error('AUTH CONTROLLER: login - ERROR:', error);
    next(error);
  } finally {
    console.log('AUTH CONTROLLER: login - END');
  }
};

export const getCurrentUser = async (req, res, next) => {
  console.log('AUTH CONTROLLER: getCurrentUser - START');
  try {
    const user = await User.findById(req.user.id).select('-password').populate('departmentId', 'name');
    if (!user) {
      console.log('AUTH CONTROLLER: getCurrentUser - User not found');
      return res.status(404).json({ error: 'User not found' });
    }
    console.log('AUTH CONTROLLER: getCurrentUser - User found:', user);
    res.json(user);
  } catch (error) {
    console.error('AUTH CONTROLLER: getCurrentUser - ERROR:', error);
    next(error);
  } finally {
    console.log('AUTH CONTROLLER: getCurrentUser - END');
  }
};