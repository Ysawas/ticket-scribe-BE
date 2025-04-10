
const Department = require('../models/Department');
const { validationResult } = require('express-validator');

// Get all departments
exports.getAllDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find()
      .populate('supervisor', 'name email')
      .populate('manager', 'name email')
      .populate('members', 'name email')
      .populate('parentDepartment', 'name');
    
    res.json(departments);
  } catch (error) {
    next(error);
  }
};

// Get department by ID
exports.getDepartmentById = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate('supervisor', 'name email')
      .populate('manager', 'name email')
      .populate('members', 'name email')
      .populate('parentDepartment', 'name');
    
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    res.json(department);
  } catch (error) {
    next(error);
  }
};

// Create a new department
exports.createDepartment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, supervisor, manager, members, parentDepartment } = req.body;

    // Check if department exists
    let department = await Department.findOne({ name });
    if (department) {
      return res.status(400).json({ error: 'Department already exists' });
    }

    // Create department
    department = new Department({
      name,
      description,
      supervisor,
      manager,
      members,
      parentDepartment
    });

    await department.save();
    
    res.status(201).json(department);
  } catch (error) {
    next(error);
  }
};

// Update a department
exports.updateDepartment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, supervisor, manager, members, parentDepartment } = req.body;

    // Build department object
    const departmentFields = {};
    if (name) departmentFields.name = name;
    if (description) departmentFields.description = description;
    if (supervisor) departmentFields.supervisor = supervisor;
    if (manager) departmentFields.manager = manager;
    if (members) departmentFields.members = members;
    if (parentDepartment) departmentFields.parentDepartment = parentDepartment;
    departmentFields.updatedAt = Date.now();

    // Update department
    const department = await Department.findByIdAndUpdate(
      req.params.id,
      { $set: departmentFields },
      { new: true }
    );

    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    res.json(department);
  } catch (error) {
    next(error);
  }
};

// Delete a department
exports.deleteDepartment = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);
    
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    await Department.findByIdAndRemove(req.params.id);
    
    res.json({ message: 'Department removed' });
  } catch (error) {
    next(error);
  }
};
