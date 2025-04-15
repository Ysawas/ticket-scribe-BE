import Department from '../models/Department.js';
import { validationResult } from 'express-validator';
import sendEmail from '../utils/emailService.js';
import User from '../models/User.js'; // Import User model
import Topic from '../models/Topic.js'; // Import Topic model
import Ticket from '../models/Ticket.js'; // Import Ticket model

export const getAllDepartments = async (req, res, next) => {
  console.log('DEPARTMENT CONTROLLER: getAllDepartments - START');
  try {
    const { limit = 10, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const departments = await Department.find()
      .populate('supervisor', 'firstName lastName email')
      .populate('manager', 'firstName lastName email')
      .populate('parentDepartment', 'name')
      .populate('members', 'firstName lastName email')
      .populate('topics', 'name category subcategory')
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
      .populate('supervisor', 'firstName lastName email')
      .populate('manager', 'firstName lastName email')
      .populate('parentDepartment', 'name')
      .populate('members', 'firstName lastName email')
      .populate('topics', 'name category subcategory');

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

    const { name, code, description, supervisor: supervisorId, manager: managerId, parentDepartment: parentDepartmentId } = req.body;
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
      supervisor: supervisorId,
      manager: managerId,
      parentDepartment: parentDepartmentId
    });

    await department.save();

    // Send email notification to supervisor (if provided)
    if (supervisorId) {
      try {
        const supervisor = await User.findById(supervisorId);
        if (supervisor) {
          await sendEmail(supervisor.email, 'New Department Created', `
            <h1>A new department has been created: ${name}</h1>
            <p>You have been assigned as the supervisor.</p>
          `);
          console.log(`DEPARTMENT CONTROLLER: createDepartment - Email sent to supervisor: ${supervisor.email}`);
        } else {
          console.warn(`DEPARTMENT CONTROLLER: createDepartment - Supervisor with ID ${supervisorId} not found, email not sent.`);
        }
      } catch (emailError) {
        console.error('DEPARTMENT CONTROLLER: createDepartment - Error sending email to supervisor:', emailError);
        // Handle email sending error (log, etc.) - decide if you want to throw or continue
      }
    }

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

    const { name, code, description, supervisor: supervisorId, manager: managerId, parentDepartment: parentDepartmentId } = req.body;
    console.log('DEPARTMENT CONTROLLER: updateDepartment - Request body:', req.body);

    const departmentFields = {};
    if (name) departmentFields.name = name;
    if (code) departmentFields.code = code;
    if (description) departmentFields.description = description;
    if (supervisorId) departmentFields.supervisor = supervisorId;
    if (managerId) departmentFields.manager = managerId;
    if (parentDepartmentId) departmentFields.parentDepartment = parentDepartmentId;
    departmentFields.updatedAt = Date.now();

    const department = await Department.findByIdAndUpdate(
      req.params.id,
      { $set: departmentFields },
      { new: true, runValidators: true }
    )
      .populate('supervisor', 'firstName lastName email')
      .populate('manager', 'firstName lastName email')
      .populate('parentDepartment', 'name')
      .populate('members', 'firstName lastName email')
      .populate('topics', 'name category subcategory');

    if (!department) {
      console.log(`DEPARTMENT CONTROLLER: updateDepartment - Department not found with ID: ${req.params.id}`);
      return res.status(404).json({ error: 'Department not found' });
    }

    // Send email notification to supervisor (if changed)
    if (supervisorId && supervisorId !== department.supervisor) {
      try {
        const newSupervisor = await User.findById(supervisorId);
        if (newSupervisor) {
          await sendEmail(newSupervisor.email, `Department ${department.name} - Supervisor Changed`, `
            <h1>You have been assigned as the supervisor of ${department.name}</h1>
          `);
          console.log(`DEPARTMENT CONTROLLER: updateDepartment - Email sent to new supervisor: ${newSupervisor.email}`);
        } else {
          console.warn(`DEPARTMENT CONTROLLER: updateDepartment - New supervisor with ID ${supervisorId} not found, email not sent.`);
        }
      } catch (emailError) {
        console.error('DEPARTMENT CONTROLLER: updateDepartment - Error sending email to new supervisor:', emailError);
        // Handle email sending error
      }
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
    const department = await Department.findById(req.params.id)
      .populate('members', 'firstName lastName email')
      .populate('topics', 'name category subcategory');

    if (!department) {
      console.log(`DEPARTMENT CONTROLLER: deleteDepartment - Department not found with ID: ${req.params.id}`);
      return res.status(404).json({ error: 'Department not found' });
    }

    if (department.members.length > 0 || department.topics.length > 0) {
      let errorMessage = "Cannot delete department. ";
      if (department.members.length > 0) {
        errorMessage += `There are ${department.members.length} users in this department. `;
      }
      if (department.topics.length > 0) {
        errorMessage += `There are ${department.topics.length} topics in this department.`;
      }
      return res.status(400).json({ error: errorMessage });
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