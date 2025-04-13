import express from 'express';
const router = express.Router();
import { check } from 'express-validator';
import * as departmentController from '../controllers/departmentController.js';
import auth from '../middleware/auth.js';

// @route   GET /api/departments
// @desc    Get all departments
// @access  Private
router.get('/', auth, departmentController.getAllDepartments);

// @route   GET /api/departments/:id
// @desc    Get department by ID
// @access  Private
router.get('/:id', auth, departmentController.getDepartmentById);

// @route   POST /api/departments
// @desc    Create a new department
// @access  Private (admin only)
router.post(
  '/',
  [
    auth,
    check('name', 'Name is required').notEmpty(),
    check('code', 'Code is required').notEmpty()
  ],
  departmentController.createDepartment
);

// @route   PUT /api/departments/:id
// @desc    Update a department
// @access  Private (admin only)
router.put(
  '/:id',
  [
    auth,
    check('name', 'Name is required').optional().notEmpty(),
    check('code', 'Code is required').optional().notEmpty()
  ],
  departmentController.updateDepartment
);

// @route   DELETE /api/departments/:id
// @desc    Delete a department
// @access  Private (admin only)
router.delete('/:id', auth, departmentController.deleteDepartment);

export default router;