import express from 'express';
const router = express.Router();
import { check } from 'express-validator';
import * as userController from '../controllers/userController.js';
import auth from '../middleware/auth.js';

// @route   GET /api/users
// @desc    Get all users
// @access  Private
router.get('/', auth, userController.getAllUsers);

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', auth, userController.getUserById);

// @route   POST /api/users
// @desc    Create a new user
// @access  Private (admin only)
router.post(
  '/',
  [
    auth,
    check('firstName', 'First name is required').notEmpty(),
    check('lastName', 'Last name is required').notEmpty(),
    check('username', 'Username is required').notEmpty(),
    check('username', 'Username must be alphanumeric').isAlphanumeric(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
    check('role', 'Role must be either admin, manager, supervisor, or agent').isIn(['admin', 'manager', 'supervisor', 'agent']) // Updated
  ],
  userController.createUser
);

// @route   PUT /api/users/:id
// @desc    Update a user
// @access  Private
router.put(
  '/:id',
  [
    auth,
    check('firstName', 'First name is required').optional().notEmpty(),
    check('lastName', 'Last name is required').optional().notEmpty(),
    check('username', 'Username is required').optional().notEmpty(),
    check('username', 'Username must be alphanumeric').optional().isAlphanumeric(),
    check('email', 'Please include a valid email').optional().isEmail(),
    check('role', 'Role must be either admin, manager, supervisor, or agent').optional().isIn(['admin', 'manager', 'supervisor', 'agent']) // Updated
  ],
  userController.updateUser
);

// @route   DELETE /api/users/:id
// @desc    Delete a user
// @access  Private (admin only)
router.delete('/:id', auth, userController.deleteUser);

export default router;