import Department from '../models/Department.js';
import { validationResult } from 'express-validator';

export const getAllDepartments = async (req, res, next) => {
  console.log('DEPARTMENT CONTROLLER: getAllDepartments - START');
  try {
    const { limit = 10, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const departments = await Department.find()
      .populate('supervisorId', 'firstName lastName')
      .populate('managerId', 'firstName lastName')
      .populate('parentDepartmentId', 'name')
      .skip(parseInt(skip))
      .limit(parseInt(limit));
    const total = await Department.countDocuments();

    console.log(`DEPARTMENT CONTROLLER: getAllDepartments - Found ${departments.length} departments`);
    res.json({
      departments,
      total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('DEPARTMENT CONTROLLER: getAllDepartments - ERROR:', error);
    next(error);
  } finally {
    console.log('DEPARTMENT CONTROLLER: getAllDepartments - END');
  }
};

export const getDepartmentById = async (req, res, next) => {
  console.log(`DEPARTMENT CONTROLLER: getDepartmentById - START - ID: ${req.params.id}`);
  try {
    const department = await Department.findById(req.params.id)
      .populate('supervisorId', 'firstName lastName')
      .populate('managerId', 'firstName lastName')
      .populate('parentDepartmentId', 'name');

    if (!department) {
      console.log(`DEPARTMENT CONTROLLER: getDepartmentById - Department not found with ID: ${req.params.id}`);
      return res.status(404).json({ error: 'Department not found' });
    }

    console.log('DEPARTMENT CONTROLLER: getDepartmentById - Department found:', department);
    res.json(department);
  } catch (error) {
    console.error('DEPARTMENT CONTROLLER: getDepartmentById - ERROR:', error);
    next(error);
  } finally {
    console.log('DEPARTMENT CONTROLLER: getDepartmentById - END');
  }
};

export const createDepartment = async (req, res, next) => {
  console.log('DEPARTMENT CONTROLLER: createDepartment - START');
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('DEPARTMENT CONTROLLER: createDepartment - Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, code, description, supervisorId, managerId, parentDepartmentId } = req.body;
    console.log('DEPARTMENT CONTROLLER: createDepartment - Request body:', req.body);

    let department = await Department.findOne({ $or: [{ name }, { code }] });
    if (department) {
      console.log('DEPARTMENT CONTROLLER: createDepartment - Department with this name or code already exists');
      return res.status(400).json({ error: 'Department with this name or code already exists' });
    }

    department = new Department({
      name,
      code,
      description,
      supervisorId,
      managerId,
      parentDepartmentId
    });

    await department.save();

    console.log('DEPARTMENT CONTROLLER: createDepartment - Department created:', department);
    res.status(201).json(department);
  } catch (error) {
    console.error('DEPARTMENT CONTROLLER: createDepartment - ERROR:', error);
    next(error);
  } finally {
    console.log('DEPARTMENT CONTROLLER: createDepartment - END');
  }
};

export const updateDepartment = async (req, res, next) => {
  console.log(`DEPARTMENT CONTROLLER: updateDepartment - START - ID: ${req.params.id}`);
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('DEPARTMENT CONTROLLER: updateDepartment - Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, code, description, supervisorId, managerId, parentDepartmentId } = req.body;
    console.log('DEPARTMENT CONTROLLER: updateDepartment - Request body:', req.body);

    const departmentFields = {};
    if (name) departmentFields.name = name;
    if (code) departmentFields.code = code;
    if (description) departmentFields.description = description;
    if (supervisorId) departmentFields.supervisorId = supervisorId;
    if (managerId) departmentFields.managerId = managerId;
    if (parentDepartmentId) departmentFields.parentDepartmentId = parentDepartmentId;
    departmentFields.updatedAt = Date.now();

    const department = await Department.findByIdAndUpdate(
      req.params.id,
      { $set: departmentFields },
      { new: true }
    ).populate('supervisorId', 'firstName lastName').populate('managerId', 'firstName lastName').populate('parentDepartmentId', 'name');

    if (!department) {
      console.log(`DEPARTMENT CONTROLLER: updateDepartment - Department not found with ID: ${req.params.id}`);
      return res.status(404).json({ error: 'Department not found' });
    }

    console.log('DEPARTMENT CONTROLLER: updateDepartment - Department updated:', department);
    res.json(department);
  } catch (error) {
    console.error('DEPARTMENT CONTROLLER: updateDepartment - ERROR:', error);
    next(error);
  } finally {
    console.log('DEPARTMENT CONTROLLER: updateDepartment - END');
  }
};

export const deleteDepartment = async (req, res, next) => {
  console.log(`DEPARTMENT CONTROLLER: deleteDepartment - START - ID: ${req.params.id}`);
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      console.log(`DEPARTMENT CONTROLLER: deleteDepartment - Department not found with ID: ${req.params.id}`);
      return res.status(404).json({ error: 'Department not found' });
    }

    await Department.findByIdAndRemove(req.params.id);

    console.log(`DEPARTMENT CONTROLLER: deleteDepartment - Department removed with ID: ${req.params.id}`);
    res.json({ message: 'Department removed' });
  } catch (error) {
    console.error('DEPARTMENT CONTROLLER: deleteDepartment - ERROR:', error);
    next(error);
  } finally {
    console.log('DEPARTMENT CONTROLLER: deleteDepartment - END');
  }
};