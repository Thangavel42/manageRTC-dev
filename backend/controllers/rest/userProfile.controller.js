/**
 * User Profile REST Controller
 * Handles current user profile data via REST API
 * Returns role-based data:
 * - Admin: Company information (name, logo, domain, email)
 * - HR/Employee: Employee information (firstName, lastName, employeeId, email)
 */

import { ObjectId } from 'mongodb';
import { getsuperadminCollections, getTenantCollections } from '../../config/db.js';
import {
  asyncHandler,
  buildNotFoundError,
  buildValidationError,
} from '../../middleware/errorHandler.js';
import { extractUser, sendSuccess } from '../../utils/apiResponse.js';

/**
 * @desc    Get current user profile (role-based)
 * @route   GET /api/user-profile/current
 * @access  Private (All authenticated users)
 *
 * Returns different data based on user role:
 * - Admin: Company data from superadmin companies collection
 * - HR/Employee: Employee data from tenant employees collection
 * - Superadmin: User data from Clerk
 */
export const getCurrentUserProfile = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  console.log(
    '[User Profile Controller] getCurrentUserProfile - userId:',
    user.userId,
    'role:',
    user.role,
    'companyId:',
    user.companyId
  );

  // Admin role - return company information
  if (user.role === 'admin') {
    if (!user.companyId) {
      throw buildValidationError('companyId', 'Company ID is required for admin users');
    }

    const { companiesCollection } = getsuperadminCollections();

    // Find company by ID in superadmin collection
    const company = await companiesCollection.findOne({
      _id: new ObjectId(user.companyId),
    });

    if (!company) {
      throw buildNotFoundError('Company', user.companyId);
    }

    // Return company-specific data for admin
    const profileData = {
      role: 'admin',
      companyId: company._id.toString(),
      companyName: company.name,
      companyLogo: company.logo || null,
      companyDomain: company.domain || null,
      email: company.email || user.email,
      status: company.status || null,
      // Additional company info
      website: company.website || null,
      phone: company.phone || null,
    };

    return sendSuccess(res, profileData, 'Admin profile retrieved successfully');
  }

  // HR and Employee roles - return employee information
  if (user.role === 'hr' || user.role === 'employee') {
    if (!user.companyId) {
      throw buildValidationError('companyId', 'Company ID is required');
    }

    const collections = getTenantCollections(user.companyId);

    // Find employee by Clerk user ID (stored in clerkUserId field)
    const employee = await collections.employees.findOne({
      isDeleted: { $ne: true },
      $or: [{ clerkUserId: user.userId }, { 'account.userId': user.userId }],
    });

    if (!employee) {
      throw buildNotFoundError('Employee profile');
    }

    // Return employee-specific data for HR/Employee
    const profileData = {
      role: user.role,
      _id: employee._id.toString(),
      employeeId: employee.employeeId || null,
      firstName: employee.firstName || '',
      lastName: employee.lastName || '',
      fullName:
        employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
      email: employee.contact?.email || user.email,
      phone: employee.contact?.phone || null,
      designation: employee.designation || null,
      department: employee.department || null,
      profileImage: employee.profileImage || null,
      // Employment details
      employmentType: employee.employmentType || null,
      employmentStatus: employee.employmentStatus || null,
      joiningDate: employee.joiningDate || null,
      companyId: user.companyId,
    };

    return sendSuccess(
      res,
      profileData,
      `${user.role.toUpperCase()} profile retrieved successfully`
    );
  }

  // Superadmin role - return basic user info from Clerk metadata
  if (user.role === 'superadmin') {
    const profileData = {
      role: 'superadmin',
      email: user.email || null,
      userId: user.userId || null,
    };

    return sendSuccess(res, profileData, 'Superadmin profile retrieved successfully');
  }

  // Default fallback for other roles
  const profileData = {
    role: user.role || 'unknown',
    email: user.email || null,
    userId: user.userId || null,
    companyId: user.companyId || null,
  };

  return sendSuccess(res, profileData, 'User profile retrieved successfully');
});

/**
 * @desc    Update current user profile
 * @route   PUT /api/user-profile/current
 * @access  Private (All authenticated users)
 */
export const updateCurrentUserProfile = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const updateData = req.body;

  console.log(
    '[User Profile Controller] updateCurrentUserProfile - userId:',
    user.userId,
    'role:',
    user.role
  );

  // Only HR and Employee can update their profiles
  if (user.role !== 'hr' && user.role !== 'employee') {
    throw buildValidationError(
      'role',
      'Profile update is only available for HR and Employee roles'
    );
  }

  if (!user.companyId) {
    throw buildValidationError('companyId', 'Company ID is required');
  }

  const collections = getTenantCollections(user.companyId);

  // Find employee by Clerk user ID
  const employee = await collections.employees.findOne({
    'account.userId': user.userId,
  });

  if (!employee) {
    throw buildNotFoundError('Employee profile');
  }

  // Restrict what fields can be updated by users themselves
  const allowedFields = [
    'phone',
    'dateOfBirth',
    'gender',
    'address',
    'emergencyContact',
    'socialProfiles',
    'profileImage',
  ];

  const sanitizedUpdate = {};
  allowedFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      sanitizedUpdate[field] = updateData[field];
    }
  });

  // Update audit fields
  sanitizedUpdate.updatedAt = new Date();
  sanitizedUpdate.updatedBy = user.userId;

  // Update employee
  const result = await collections.employees.updateOne(
    { _id: employee._id },
    { $set: sanitizedUpdate }
  );

  if (result.matchedCount === 0) {
    throw buildNotFoundError('Employee profile');
  }

  // Get updated employee
  const updatedEmployee = await collections.employees.findOne({ _id: employee._id });

  const profileData = {
    role: user.role,
    employeeId: updatedEmployee.employeeId || null,
    firstName: updatedEmployee.firstName || '',
    lastName: updatedEmployee.lastName || '',
    fullName:
      updatedEmployee.fullName ||
      `${updatedEmployee.firstName || ''} ${updatedEmployee.lastName || ''}`.trim(),
    email: updatedEmployee.contact?.email || user.primaryEmail,
    phone: updatedEmployee.contact?.phone || null,
    designation: updatedEmployee.designation || null,
    department: updatedEmployee.department || null,
    profileImage: updatedEmployee.profileImage || null,
  };

  return sendSuccess(res, profileData, 'Profile updated successfully');
});

export default {
  getCurrentUserProfile,
  updateCurrentUserProfile,
};
