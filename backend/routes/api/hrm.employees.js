/**
 * Example Route Integration with Page Access Middleware
 *
 * This file shows how to integrate the pageAccess middleware into your routes.
 * Copy this pattern to other route files for consistent access control.
 */

import express from 'express';
import { requirePageAccess, applyDataScope } from '../../middleware/pageAccess.js';

const router = express.Router();

// ============================================
// EMPLOYEES ROUTES WITH PAGE ACCESS CONTROL
// ============================================

/**
 * @route   GET /api/employees
 * @desc    Get all employees
 * @access  Requires 'hrm.employees' page with 'read' action
 */
router.get('/',
  requirePageAccess('hrm.employees', 'read'),
  async (req, res) => {
    try {
      // req.dataFilter contains the data scope filter
      // Example: { companyId: 'xxx' } if filterByCompany is true
      const filter = req.dataFilter || {};

      // Your controller logic here
      // const employees = await Employee.find(filter);

      res.json({
        success: true,
        data: [], // employees
        filter // Shows what filter was applied
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @route   GET /api/employees/:id
 * @desc    Get single employee
 * @access  Requires 'hrm.employees' page with 'read' action
 */
router.get('/:id',
  requirePageAccess('hrm.employees', 'read'),
  async (req, res) => {
    try {
      const { id } = req.params;
      // const employee = await Employee.findOne({ _id: id, ...req.dataFilter });

      res.json({
        success: true,
        data: null // employee
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @route   POST /api/employees
 * @desc    Create new employee
 * @access  Requires 'hrm.employees' page with 'create' action
 */
router.post('/',
  requirePageAccess('hrm.employees', 'create'),
  async (req, res) => {
    try {
      // Add company context if required
      const employeeData = {
        ...req.body,
        ...(req.dataFilter?.companyId && { companyId: req.dataFilter.companyId })
      };

      // const employee = await Employee.create(employeeData);

      res.status(201).json({
        success: true,
        data: employeeData, // employee
        message: 'Employee created successfully'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @route   PUT /api/employees/:id
 * @desc    Update employee
 * @access  Requires 'hrm.employees' page with 'write' action
 */
router.put('/:id',
  requirePageAccess('hrm.employees', 'write'),
  async (req, res) => {
    try {
      const { id } = req.params;
      // const employee = await Employee.findOneAndUpdate(
      //   { _id: id, ...req.dataFilter },
      //   req.body,
      //   { new: true }
      // );

      res.json({
        success: true,
        data: null, // employee
        message: 'Employee updated successfully'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @route   DELETE /api/employees/:id
 * @desc    Delete employee
 * @access  Requires 'hrm.employees' page with 'delete' action
 */
router.delete('/:id',
  requirePageAccess('hrm.employees', 'delete'),
  async (req, res) => {
    try {
      const { id } = req.params;
      // await Employee.findOneAndDelete({ _id: id, ...req.dataFilter });

      res.json({
        success: true,
        message: 'Employee deleted successfully'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

export default router;

// ============================================
// INTEGRATION IN server.js
// ============================================
/*
import employeeRoutes from './routes/api/employees.js';
app.use('/api/employees', employeeRoutes);
*/
