
const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const departmentController = require('../controllers/departmentController');
const auth = require('../middleware/auth');

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
    check('name', 'Name is required').notEmpty()
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
    check('name', 'Name is required').optional().notEmpty()
  ],
  departmentController.updateDepartment
);

// @route   DELETE /api/departments/:id
// @desc    Delete a department
// @access  Private (admin only)
router.delete('/:id', auth, departmentController.deleteDepartment);

module.exports = router;
