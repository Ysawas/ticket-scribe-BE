import express from 'express';
import { check } from 'express-validator';
import auth from '../middleware/auth.js';
import isAdmin from '../middleware/isAdmin.js';
import * as userController from '../controllers/userController.js';

const router = express.Router();

//
// ✅ PUBLIC ROUTES
//

// @route   GET /api/users/verify-email
// @desc    Verify email via token
// @access  Public
router.get('/verify-email', userController.verifyEmail);

//
// ✅ ADMIN ROUTES (protected)
//

// @route   PATCH /api/users/approve/:id
// @desc    Admin approves user after email verification
// @access  Private (admin only)
router.patch('/approve/:id', auth, isAdmin, userController.approveUser);

//
// ✅ AUTHENTICATED ROUTES
//

// @route   GET /api/users
// @desc    Get all users
// @access  Private
router.get('/', auth, userController.getAllUsers);

// @route   GET /api/users/username/:username
// @desc    Get user by username
// @access  Private
router.get('/username/:username', auth, userController.getUserByUsername);

// @route   GET /api/users/email/:email
// @desc    Get user by email
// @access  Private
router.get('/email/:email', auth, userController.getUserByEmail);

// @route   GET /api/users/department/:departmentId
// @desc    Get users by department
// @access  Private
router.get('/department/:departmentId', auth, userController.getUserByDepartment);

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', auth, userController.getUserById);

//
// ✅ USER CREATION & MANAGEMENT
//

// @route   POST /api/users
// @desc    Create a new user
// @access  Private (admin only)
router.post(
  '/',
  [
    auth,
    isAdmin,
    check('firstName', 'First name is required').notEmpty(),
    check('lastName', 'Last name is required').notEmpty(),
    check('username', 'Username is required').notEmpty(),
    check('username', 'Username must be alphanumeric').isAlphanumeric(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password must be 6 or more characters').isLength({ min: 6 }),
    check('role', 'Role must be either admin, manager, supervisor, or agent').isIn([
      'admin',
      'manager',
      'supervisor',
      'agent'
    ])
  ],
  userController.createUser
);

// @route   PUT /api/users/:id
// @desc    Update a user
// @access  Private
router.put(
  '/:id',
  [
    auth,
    check('firstName').optional().notEmpty(),
    check('lastName').optional().notEmpty(),
    check('username').optional().notEmpty().isAlphanumeric(),
    check('email').optional().isEmail(),
    check('role').optional().isIn(['admin', 'manager', 'supervisor', 'agent'])
  ],
  userController.updateUser
);

// @route   DELETE /api/users/:id
// @desc    Delete a user
// @access  Private (admin only)
router.delete('/:id', auth, isAdmin, userController.deleteUser);

export default router;
