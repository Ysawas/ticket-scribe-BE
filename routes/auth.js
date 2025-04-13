import express from 'express';
const router = express.Router();
import { check } from 'express-validator';
import * as authController from '../controllers/authController.js';
import auth from '../middleware/auth.js';  //  <--  ESM import

// @route   POST /api/auth/login
// @desc    Login user and get token
// @access  Public
router.post(
  '/login',
  [
    check('username', 'Username is required').notEmpty(),
    check('password', 'Password is required').exists()
  ],
  authController.login
);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, authController.getCurrentUser);

export default router;