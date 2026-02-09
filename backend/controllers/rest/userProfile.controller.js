/**
 * User Profile REST Controller
 * Handles current user profile data via REST API
 * Returns full profile data for the profile page
 * - All roles: Full profile with address, emergency contact, social links, skills, bio
 */

import bcrypt from 'bcrypt';
import { ObjectId } from 'mongodb';
import { getsuperadminCollections, getTenantCollections } from '../../config/db.js';
import {
  asyncHandler,
  buildForbiddenError,
  buildNotFoundError,
  buildValidationError,
} from '../../middleware/errorHandler.js';
import {
  extractUser,
  sendSuccess
} from '../../utils/apiResponse.js';
import { getSystemDefaultAvatarUrl, isValidAvatar } from '../../utils/avatarUtils.js';
import { devLog, devDebug, devWarn, devError } from '../../utils/logger.js';

/**
 * Helper function to get valid avatar URL with proper validation
 * Checks avatarUrl, profileImage, and falls back to system default if invalid
 *
 * @param {object} employee - The employee object
 * @returns {string} Valid avatar URL
 */
function getValidAvatarUrl(employee) {
  // Try avatarUrl first
  const avatarUrl = employee?.avatarUrl;
  if (isValidAvatar(avatarUrl)) {
    return avatarUrl;
  }

  // Try profileImage second
  const profileImage = employee?.profileImage;
  if (isValidAvatar(profileImage)) {
    return profileImage;
  }

  // Fall back to system default
  return getSystemDefaultAvatarUrl();
}

/**
 * @desc    Get current user profile (full profile data)
 * @route   GET /api/user-profile/current
 * @access  Private (All authenticated users)
 *
 * Returns full profile data for the profile page:
 * - All roles: Full profile with address, emergency contact, social links, skills, bio
 */
export const getCurrentUserProfile = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  devLog(
    '[User Profile Controller] getCurrentUserProfile - userId:',
    user.userId,
    'role:',
    user.role,
    'companyId:',
    user.companyId
  );

  // Check for admin and hr roles (they may have company info instead of employee record) - case-insensitive
  const userRole = user.role?.toLowerCase();
  if (userRole === 'admin') {
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

    // Validate company logo - use system default if invalid
    const validCompanyLogo = isValidAvatar(company.logo) ? company.logo : getSystemDefaultAvatarUrl();

    // Return company-specific data for admin - matching useUserProfileREST expected format
    const profileData = {
      // Header/Role format (for useUserProfileREST hook)
      role: 'admin',
      companyId: company._id.toString(),
      companyName: company.name || 'Company',
      companyLogo: validCompanyLogo,
      companyDomain: company.domain || null,
      email: company.email || user.email,
      status: company.status || 'Active',
      website: company.website || null,
      phone: company.phone || null,
      // Full profile format (for profile page)
      _id: company._id.toString(),
      userId: user.userId,
      firstName: company.name || 'Admin',
      lastName: '',
      profilePhoto: validCompanyLogo,
      // Alias for header compatibility
      profileImage: validCompanyLogo,
      designation: 'Administrator',
      joiningDate: company.createdAt || null,
      bio: company.description || ''
    };

    return sendSuccess(res, profileData, 'Admin profile retrieved successfully');
  }

  // All other roles (HR, Employee, etc.) - return full employee information
  if (user.companyId) {
    const collections = getTenantCollections(user.companyId);

    // Use aggregation to populate department, designation, and reporting manager
    const pipeline = [
      {
        $match: {
          isDeleted: { $ne: true },
          $or: [
            { clerkUserId: user.userId },
            { 'account.userId': user.userId }
          ]
        }
      },
      {
        $addFields: {
          departmentObjId: {
            $cond: {
              if: { $and: [{ $ne: ['$departmentId', null] }, { $ne: ['$departmentId', ''] }] },
              then: { $toObjectId: '$departmentId' },
              else: null
            }
          },
          designationObjId: {
            $cond: {
              if: { $and: [{ $ne: ['$designationId', null] }, { $ne: ['$designationId', ''] }] },
              then: { $toObjectId: '$designationId' },
              else: null
            }
          },
          reportingToObjId: {
            $cond: {
              if: { $and: [{ $ne: ['$reportingTo', null] }, { $ne: ['$reportingTo', ''] }] },
              then: { $toObjectId: '$reportingTo' },
              else: null
            }
          }
        }
      },
      {
        $lookup: {
          from: 'departments',
          localField: 'departmentObjId',
          foreignField: '_id',
          as: 'departmentInfo'
        }
      },
      {
        $lookup: {
          from: 'designations',
          localField: 'designationObjId',
          foreignField: '_id',
          as: 'designationInfo'
        }
      },
      {
        $lookup: {
          from: 'employees',
          let: { reportingToObjId: '$reportingToObjId' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$_id', '$$reportingToObjId'] },
                isDeleted: { $ne: true }
              }
            },
            {
              $project: {
                _id: 1,
                firstName: 1,
                lastName: 1,
                fullName: 1,
                employeeId: 1,
                email: 1,
                profileImage: 1
              }
            }
          ],
          as: 'reportingToInfo'
        }
      },
      {
        $addFields: {
          departmentName: { $arrayElemAt: ['$departmentInfo.department', 0] },
          designationTitle: { $arrayElemAt: ['$designationInfo.title', 0] },
          reportingTo: { $arrayElemAt: ['$reportingToInfo', 0] }
        }
      },
      {
        $project: {
          departmentObjId: 0,
          designationObjId: 0,
          reportingToObjId: 0,
          departmentInfo: 0,
          designationInfo: 0,
          reportingToInfo: 0
        }
      }
    ];

    const employees = await collections.employees.aggregate(pipeline).toArray();
    const employee = employees[0];

    if (!employee) {
      throw buildNotFoundError('Employee profile');
    }

    // Get valid avatar URL using helper function
    const validAvatarUrl = getValidAvatarUrl(employee);

    // Return full employee profile data with proper field mapping (using canonical schema)
    const profileData = {
      // Header/Role format (for useUserProfileREST hook)
      role: employee.role || employee.account?.role || 'employee',
      companyId: user.companyId,
      employeeId: (employee.employeeId && typeof employee.employeeId === 'string' && !employee.employeeId.startsWith('6') ? employee.employeeId : '') || employee._id?.toString()?.substring(0, 8) || '',
      firstName: employee.firstName || '',
      lastName: employee.lastName || '',
      fullName: employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
      // Use canonical email field (with fallback to contact for backward compatibility)
      email: employee.email || employee.contact?.email || user.email,
      // Use canonical phone field (with fallback to contact for backward compatibility)
      phone: employee.phone || employee.contact?.phone || null,
      designation: employee.designationTitle || null,
      department: employee.departmentName || null,
      // For header profile image - validated avatar URL
      profileImage: validAvatarUrl,
      employmentType: employee.employmentType || null,
      employmentStatus: employee.employmentStatus || employee.status || 'Active',
      joiningDate: employee.joiningDate || employee.dateOfJoining || null,
      // Full profile format (for profile page)
      _id: employee._id?.toString() || '',
      userId: employee.clerkUserId || user.userId,
      // Use canonical dateOfBirth field (with fallbacks for backward compatibility)
      dateOfBirth: employee.dateOfBirth || employee.personal?.birthday || employee.dateOfJoining || null,
      // Use canonical gender field (with fallback for backward compatibility)
      gender: employee.gender || employee.personal?.gender || '',
      // Alias for profile page - same validated avatar URL
      profilePhoto: validAvatarUrl,
      status: employee.status || employee.employmentStatus || 'Active',
      reportingManager: employee.reportingTo ? {
        _id: employee.reportingTo._id?.toString() || '',
        firstName: employee.reportingTo.firstName || '',
        lastName: employee.reportingTo.lastName || '',
        fullName: employee.reportingTo.fullName || `${employee.reportingTo.firstName || ''} ${employee.reportingTo.lastName || ''}`.trim(),
        employeeId: employee.reportingTo.employeeId || '',
        email: employee.reportingTo.email || ''
      } : null,
      // Check both about and notes, and bio
      about: employee.about || employee.notes || employee.bio || '',
      // Use canonical address field (with fallback to personal.address for backward compatibility)
      address: {
        street: employee.address?.street || employee.personal?.address?.street || '',
        city: employee.address?.city || employee.personal?.address?.city || '',
        state: employee.address?.state || employee.personal?.address?.state || '',
        country: employee.address?.country || employee.personal?.address?.country || '',
        postalCode: employee.address?.postalCode || employee.personal?.address?.postalCode || ''
      },
      // Handle emergencyContact vs emergencyContacts (array)
      emergencyContact: {
        name: employee.emergencyContact?.name || (Array.isArray(employee.emergencyContacts) && employee.emergencyContacts[0]?.name) || '',
        phone: employee.emergencyContact?.phone || (Array.isArray(employee.emergencyContacts) && employee.emergencyContacts[0]?.phone) || (Array.isArray(employee.emergencyContacts) && employee.emergencyContacts[0]?.phone?.[0]) || '',
        relationship: employee.emergencyContact?.relationship || (Array.isArray(employee.emergencyContacts) && employee.emergencyContacts[0]?.relationship) || ''
      },
      // Check socialProfiles vs socialLinks
      socialLinks: {
        linkedin: employee.socialProfiles?.linkedin || employee.socialLinks?.linkedin || '',
        twitter: employee.socialProfiles?.twitter || employee.socialLinks?.twitter || '',
        facebook: employee.socialProfiles?.facebook || employee.socialLinks?.facebook || '',
        instagram: employee.socialProfiles?.instagram || employee.socialLinks?.instagram || ''
      },
      skills: employee.skills || [],
      bio: employee.bio || employee.about || employee.notes || '',
      // Education, Experience, Family, Documents
      education: employee.education || employee.qualifications || [],
      experience: employee.experience || [],
      family: employee.family || [],
      documents: employee.documents || [],
      // Personal Information (Passport, Nationality, etc.)
      personal: employee.personal ? {
        passport: employee.personal.passport || {
          number: '',
          expiryDate: null,
          country: ''
        },
        nationality: employee.personal.nationality || '',
        religion: employee.personal.religion || '',
        maritalStatus: employee.personal.maritalStatus || '',
        employmentOfSpouse: employee.personal.employmentOfSpouse || '',
        noOfChildren: employee.personal.noOfChildren || 0
      } : {
        passport: {
          number: '',
          expiryDate: null,
          country: ''
        },
        nationality: '',
        religion: '',
        maritalStatus: '',
        employmentOfSpouse: '',
        noOfChildren: 0
      },
      // Bank Information
      bankDetails: employee.bankDetails ? {
        bankName: employee.bankDetails.bankName || '',
        accountNumber: employee.bankDetails.accountNumber || '',
        ifscCode: employee.bankDetails.ifscCode || '',
        branch: employee.bankDetails.branch || '',
        accountType: employee.bankDetails.accountType || 'Savings'
      } : {
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        branch: '',
        accountType: 'Savings'
      },
      createdAt: employee.createdAt || new Date(),
      updatedAt: employee.updatedAt || new Date()
    };

    return sendSuccess(res, profileData, 'Profile retrieved successfully');
  }

  // Superadmin role - return basic user info from Clerk metadata (case-insensitive)
  if (userRole === 'superadmin') {
    const profileData = {
      // Header/Role format (for useUserProfileREST hook)
      role: 'superadmin',
      companyId: null,
      email: user.email || null,
      userId: user.userId,
      // Full profile format (for profile page)
      _id: user.userId,
      firstName: 'Super',
      lastName: 'Admin',
      profilePhoto: getSystemDefaultAvatarUrl(),
      profileImage: getSystemDefaultAvatarUrl(),
      designation: 'Super Administrator',
      bio: '',
      status: 'Active'
    };

    return sendSuccess(res, profileData, 'Superadmin profile retrieved successfully');
  }

  // Default fallback for other roles
  const profileData = {
    // Header/Role format (for useUserProfileREST hook)
    role: user.role || 'unknown',
    companyId: user.companyId || null,
    email: user.email || null,
    userId: user.userId,
    // Full profile format (for profile page)
    _id: user.userId,
    firstName: '',
    lastName: '',
    profilePhoto: getSystemDefaultAvatarUrl(),
    profileImage: getSystemDefaultAvatarUrl(),
    designation: user.role || 'unknown',
    status: 'Active'
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
  const userRole = user.role?.toLowerCase(); // Normalize role for case-insensitive comparison

  devLog(
    '[User Profile Controller] updateCurrentUserProfile - userId:',
    user.userId,
    'role:',
    user.role
  );

  // Admin role - update company info (limited fields)
  if (userRole === 'admin') {
    if (!user.companyId) {
      throw buildValidationError('companyId', 'Company ID is required for admin users');
    }

    const { companiesCollection } = getsuperadminCollections();

    // Only allow updating certain company fields
    const allowedFields = ['phone', 'website', 'description'];
    const sanitizedUpdate = {};
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        sanitizedUpdate[field] = updateData[field];
      }
    });
    sanitizedUpdate.updatedAt = new Date();

    const result = await companiesCollection.updateOne(
      { _id: new ObjectId(user.companyId) },
      { $set: sanitizedUpdate }
    );

    if (result.matchedCount === 0) {
      throw buildNotFoundError('Company', user.companyId);
    }

    return sendSuccess(res, { ...updateData }, 'Company profile updated successfully');
  }

  // HR and Employee roles - update employee profile (case-insensitive)
  if (userRole === 'hr' || userRole === 'employee') {
    if (!user.companyId) {
      throw buildValidationError('companyId', 'Company ID is required');
    }

    const collections = getTenantCollections(user.companyId);

    // Find employee by Clerk user ID
    const employee = await collections.employees.findOne({
      isDeleted: { $ne: true },
      $or: [
        { clerkUserId: user.userId },
        { 'account.userId': user.userId }
      ]
    });

    if (!employee) {
      throw buildNotFoundError('Employee profile');
    }

    // Build update object - handle nested objects
    const sanitizedUpdate = {
      updatedAt: new Date()
    };

    // Basic fields
    if (updateData.firstName !== undefined) sanitizedUpdate.firstName = updateData.firstName;
    if (updateData.lastName !== undefined) sanitizedUpdate.lastName = updateData.lastName;
    if (updateData.dateOfBirth !== undefined) sanitizedUpdate.dateOfBirth = updateData.dateOfBirth;
    if (updateData.gender !== undefined) sanitizedUpdate.gender = updateData.gender;
    if (updateData.profilePhoto !== undefined) sanitizedUpdate.profileImage = updateData.profilePhoto;
    if (updateData.about !== undefined) sanitizedUpdate.notes = updateData.about;
    if (updateData.bio !== undefined) sanitizedUpdate.bio = updateData.bio;
    if (updateData.skills !== undefined) sanitizedUpdate.skills = updateData.skills;

    // Handle phone (use canonical phone field at root level)
    if (updateData.phone !== undefined) {
      sanitizedUpdate.phone = updateData.phone;
    }

    // Handle address (use canonical address field at root level)
    if (updateData.address) {
      sanitizedUpdate.address = {
        street: updateData.address.street || '',
        city: updateData.address.city || '',
        state: updateData.address.state || '',
        country: updateData.address.country || '',
        postalCode: updateData.address.postalCode || ''
      };
    }

    // Handle emergency contact
    if (updateData.emergencyContact) {
      sanitizedUpdate.emergencyContact = {
        name: updateData.emergencyContact.name || '',
        phone: updateData.emergencyContact.phone || '',
        relationship: updateData.emergencyContact.relationship || ''
      };
    }

    // Handle social links -> socialProfiles
    if (updateData.socialLinks) {
      sanitizedUpdate.socialProfiles = {
        linkedin: updateData.socialLinks.linkedin || '',
        twitter: updateData.socialLinks.twitter || '',
        facebook: updateData.socialLinks.facebook || '',
        instagram: updateData.socialLinks.instagram || ''
      };
    }

    // Handle personal information (passport, nationality, religion, marital status, etc.)
    if (updateData.personal) {
      const personalUpdate = {};

      // Handle passport nested object
      if (updateData.personal.passport) {
        personalUpdate['personal.passport.number'] = updateData.personal.passport.number || '';
        personalUpdate['personal.passport.expiryDate'] = updateData.personal.passport.expiryDate || null;
        personalUpdate['personal.passport.country'] = updateData.personal.passport.country || '';
      }

      // Handle other personal fields
      if (updateData.personal.nationality !== undefined) {
        personalUpdate['personal.nationality'] = updateData.personal.nationality;
      }
      if (updateData.personal.religion !== undefined) {
        personalUpdate['personal.religion'] = updateData.personal.religion;
      }
      if (updateData.personal.maritalStatus !== undefined) {
        personalUpdate['personal.maritalStatus'] = updateData.personal.maritalStatus;
      }
      if (updateData.personal.employmentOfSpouse !== undefined) {
        personalUpdate['personal.employmentOfSpouse'] = updateData.personal.employmentOfSpouse;
      }
      if (updateData.personal.noOfChildren !== undefined) {
        personalUpdate['personal.noOfChildren'] = updateData.personal.noOfChildren;
      }

      // Only set personal if there are updates
      if (Object.keys(personalUpdate).length > 0) {
        Object.assign(sanitizedUpdate, personalUpdate);
      }
    }

    // Handle bank details (bank name, account number, IFSC code, branch, account type)
    if (updateData.bankDetails) {
      const bankDetailsUpdate = {};

      if (updateData.bankDetails.bankName !== undefined) {
        bankDetailsUpdate['bankDetails.bankName'] = updateData.bankDetails.bankName;
      }
      if (updateData.bankDetails.accountNumber !== undefined) {
        bankDetailsUpdate['bankDetails.accountNumber'] = updateData.bankDetails.accountNumber;
      }
      if (updateData.bankDetails.ifscCode !== undefined) {
        bankDetailsUpdate['bankDetails.ifscCode'] = updateData.bankDetails.ifscCode;
      }
      if (updateData.bankDetails.branch !== undefined) {
        bankDetailsUpdate['bankDetails.branch'] = updateData.bankDetails.branch;
      }
      if (updateData.bankDetails.accountType !== undefined) {
        bankDetailsUpdate['bankDetails.accountType'] = updateData.bankDetails.accountType;
      }

      // Only set bankDetails if there are updates
      if (Object.keys(bankDetailsUpdate).length > 0) {
        Object.assign(sanitizedUpdate, bankDetailsUpdate);
      }
    }

    // Update employee
    const result = await collections.employees.updateOne(
      { _id: employee._id },
      { $set: sanitizedUpdate }
    );

    if (result.matchedCount === 0) {
      throw buildNotFoundError('Employee profile');
    }

    // Get updated employee with aggregation to populate department, designation, and reporting manager
    const pipeline = [
      {
        $match: {
          _id: employee._id,
          isDeleted: { $ne: true }
        }
      },
      {
        $addFields: {
          departmentObjId: {
            $cond: {
              if: { $and: [{ $ne: ['$department', null] }, { $ne: ['$department', ''] }] },
              then: { $toObjectId: '$department' },
              else: null
            }
          },
          designationObjId: {
            $cond: {
              if: { $and: [{ $ne: ['$designation', null] }, { $ne: ['$designation', ''] }] },
              then: { $toObjectId: '$designation' },
              else: null
            }
          },
          reportingToObjId: {
            $cond: {
              if: { $and: [{ $ne: ['$reportingTo', null] }, { $ne: ['$reportingTo', ''] }] },
              then: { $toObjectId: '$reportingTo' },
              else: null
            }
          }
        }
      },
      {
        $lookup: {
          from: 'departments',
          localField: 'departmentObjId',
          foreignField: '_id',
          as: 'departmentInfo'
        }
      },
      {
        $lookup: {
          from: 'designations',
          localField: 'designationObjId',
          foreignField: '_id',
          as: 'designationInfo'
        }
      },
      {
        $lookup: {
          from: 'employees',
          let: { reportingToObjId: '$reportingToObjId' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$_id', '$$reportingToObjId'] },
                isDeleted: { $ne: true }
              }
            },
            {
              $project: {
                _id: 1,
                firstName: 1,
                lastName: 1,
                fullName: 1,
                employeeId: 1,
                email: 1,
                profileImage: 1
              }
            }
          ],
          as: 'reportingToInfo'
        }
      },
      {
        $addFields: {
          departmentName: { $arrayElemAt: ['$departmentInfo.department', 0] },
          designationTitle: { $arrayElemAt: ['$designationInfo.title', 0] },
          reportingTo: { $arrayElemAt: ['$reportingToInfo', 0] }
        }
      },
      {
        $project: {
          departmentObjId: 0,
          designationObjId: 0,
          reportingToObjId: 0,
          departmentInfo: 0,
          designationInfo: 0,
          reportingToInfo: 0
        }
      }
    ];

    const updatedEmployees = await collections.employees.aggregate(pipeline).toArray();
    const updatedEmployee = updatedEmployees[0];

    const profileData = {
      // Header/Role format (for useUserProfileREST hook)
      role: updatedEmployee.role || updatedEmployee.account?.role || 'employee',
      companyId: user.companyId,
      employeeId: (updatedEmployee.employeeId && typeof updatedEmployee.employeeId === 'string' && !updatedEmployee.employeeId.startsWith('6') ? updatedEmployee.employeeId : '') || updatedEmployee._id?.toString()?.substring(0, 8) || '',
      firstName: updatedEmployee.firstName || '',
      lastName: updatedEmployee.lastName || '',
      fullName: updatedEmployee.fullName || `${updatedEmployee.firstName || ''} ${updatedEmployee.lastName || ''}`.trim(),
      email: updatedEmployee.email || updatedEmployee.contact?.email || user.email,
      phone: updatedEmployee.phone || updatedEmployee.contact?.phone || null,
      designation: updatedEmployee.designationTitle || null,
      department: updatedEmployee.departmentName || null,
      // For header profile image - prefer avatarUrl, then profileImage, then default
      profileImage: updatedEmployee.avatarUrl || updatedEmployee.profileImage || getSystemDefaultAvatarUrl(),
      employmentType: updatedEmployee.employmentType || null,
      employmentStatus: updatedEmployee.employmentStatus || updatedEmployee.status || 'Active',
      joiningDate: updatedEmployee.joiningDate || updatedEmployee.dateOfJoining || null,
      // Full profile format (for profile page)
      _id: updatedEmployee._id?.toString() || '',
      userId: updatedEmployee.clerkUserId || user.userId,
      dateOfBirth: updatedEmployee.dateOfBirth || updatedEmployee.personal?.birthday || updatedEmployee.dateOfJoining || null,
      gender: updatedEmployee.gender || updatedEmployee.personal?.gender || '',
      // Alias for profile page - same as profileImage
      profilePhoto: updatedEmployee.avatarUrl || updatedEmployee.profileImage || getSystemDefaultAvatarUrl(),
      status: updatedEmployee.status || updatedEmployee.employmentStatus || 'Active',
      reportingManager: updatedEmployee.reportingTo ? {
        _id: updatedEmployee.reportingTo._id?.toString() || '',
        firstName: updatedEmployee.reportingTo.firstName || '',
        lastName: updatedEmployee.reportingTo.lastName || '',
        fullName: updatedEmployee.reportingTo.fullName || `${updatedEmployee.reportingTo.firstName || ''} ${updatedEmployee.reportingTo.lastName || ''}`.trim(),
        employeeId: updatedEmployee.reportingTo.employeeId || '',
        email: updatedEmployee.reportingTo.email || ''
      } : null,
      about: updatedEmployee.about || updatedEmployee.notes || updatedEmployee.bio || '',
      // Check both root address and personal.address
      address: {
        street: updatedEmployee.address?.street || updatedEmployee.personal?.address?.street || '',
        city: updatedEmployee.address?.city || updatedEmployee.personal?.address?.city || '',
        state: updatedEmployee.address?.state || updatedEmployee.personal?.address?.state || '',
        country: updatedEmployee.address?.country || updatedEmployee.personal?.address?.country || '',
        postalCode: updatedEmployee.address?.postalCode || updatedEmployee.personal?.address?.postalCode || ''
      },
      // Handle emergencyContact vs emergencyContacts (array)
      emergencyContact: {
        name: updatedEmployee.emergencyContact?.name || (Array.isArray(updatedEmployee.emergencyContacts) && updatedEmployee.emergencyContacts[0]?.name) || '',
        phone: updatedEmployee.emergencyContact?.phone || (Array.isArray(updatedEmployee.emergencyContacts) && updatedEmployee.emergencyContacts[0]?.phone) || (Array.isArray(updatedEmployee.emergencyContacts) && updatedEmployee.emergencyContacts[0]?.phone?.[0]) || '',
        relationship: updatedEmployee.emergencyContact?.relationship || (Array.isArray(updatedEmployee.emergencyContacts) && updatedEmployee.emergencyContacts[0]?.relationship) || ''
      },
      // Check socialProfiles vs socialLinks
      socialLinks: {
        linkedin: updatedEmployee.socialProfiles?.linkedin || updatedEmployee.socialLinks?.linkedin || '',
        twitter: updatedEmployee.socialProfiles?.twitter || updatedEmployee.socialLinks?.twitter || '',
        facebook: updatedEmployee.socialProfiles?.facebook || updatedEmployee.socialLinks?.facebook || '',
        instagram: updatedEmployee.socialProfiles?.instagram || updatedEmployee.socialLinks?.instagram || ''
      },
      skills: updatedEmployee.skills || [],
      bio: updatedEmployee.bio || updatedEmployee.about || updatedEmployee.notes || '',
      // Education, Experience, Family, Documents
      education: updatedEmployee.education || updatedEmployee.qualifications || [],
      experience: updatedEmployee.experience || [],
      family: updatedEmployee.family || [],
      documents: updatedEmployee.documents || [],
      // Personal Information (Passport, Nationality, etc.)
      personal: updatedEmployee.personal ? {
        passport: updatedEmployee.personal.passport || {
          number: '',
          expiryDate: null,
          country: ''
        },
        nationality: updatedEmployee.personal.nationality || '',
        religion: updatedEmployee.personal.religion || '',
        maritalStatus: updatedEmployee.personal.maritalStatus || '',
        employmentOfSpouse: updatedEmployee.personal.employmentOfSpouse || '',
        noOfChildren: updatedEmployee.personal.noOfChildren || 0
      } : {
        passport: {
          number: '',
          expiryDate: null,
          country: ''
        },
        nationality: '',
        religion: '',
        maritalStatus: '',
        employmentOfSpouse: '',
        noOfChildren: 0
      },
      // Bank Information
      bankDetails: updatedEmployee.bankDetails ? {
        bankName: updatedEmployee.bankDetails.bankName || '',
        accountNumber: updatedEmployee.bankDetails.accountNumber || '',
        ifscCode: updatedEmployee.bankDetails.ifscCode || '',
        branch: updatedEmployee.bankDetails.branch || '',
        accountType: updatedEmployee.bankDetails.accountType || 'Savings'
      } : {
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        branch: '',
        accountType: 'Savings'
      },
      createdAt: updatedEmployee.createdAt || new Date(),
      updatedAt: updatedEmployee.updatedAt || new Date()
    };

    return sendSuccess(res, profileData, 'Profile updated successfully');
  }

  throw buildValidationError('role', 'Profile update is only available for Admin, HR and Employee roles');
});

/**
 * @desc    Change password for current user
 * @route   POST /api/user-profile/change-password
 * @access  Private (All authenticated users)
 */
export const changePassword = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const { currentPassword, newPassword, confirmPassword } = req.body;

  devLog('[User Profile Controller] changePassword - userId:', user.userId);

  // Validate input
  if (!currentPassword || !newPassword || !confirmPassword) {
    throw buildValidationError('password', 'All password fields are required');
  }

  if (newPassword !== confirmPassword) {
    throw buildValidationError('confirmPassword', 'New password and confirm password do not match');
  }

  if (newPassword.length < 6) {
    throw buildValidationError('newPassword', 'New password must be at least 6 characters long');
  }

  // For employee/admin roles, update the password in the database (case-insensitive)
  const userRole = user.role?.toLowerCase();
  if (user.companyId && (userRole === 'hr' || userRole === 'employee' || userRole === 'admin')) {
    const collections = getTenantCollections(user.companyId);

    // Find employee/user by Clerk user ID
    const employee = await collections.employees.findOne({
      isDeleted: { $ne: true },
      $or: [
        { clerkUserId: user.userId },
        { 'account.userId': user.userId }
      ]
    });

    if (employee) {
      // Verify current password (if stored)
      if (employee.account?.password) {
        const isPasswordValid = await bcrypt.compare(currentPassword, employee.account.password);
        if (!isPasswordValid) {
          throw buildValidationError('currentPassword', 'Current password is incorrect');
        }
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await collections.employees.updateOne(
        { _id: employee._id },
        {
          $set: {
            'account.password': hashedPassword,
            passwordChangedAt: new Date(),
            updatedAt: new Date()
          }
        }
      );

      return sendSuccess(res, { message: 'Password changed successfully' }, 'Password changed successfully');
    }
  }

  // For other roles or if no employee record found
  // Note: In a Clerk-based system, password changes would be handled through Clerk API
  // This is a placeholder for systems that store passwords locally
  return sendSuccess(res, { message: 'Password change request processed' }, 'Password change request processed');
});

/**
 * @desc    Get admin profile (company information)
 * @route   GET /api/user-profile/admin
 * @access  Private (Admin only)
 */
export const getAdminProfile = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  devLog('[User Profile Controller] getAdminProfile - userId:', user.userId, 'companyId:', user.companyId);

  // Validate admin role
  if (user.role !== 'admin') {
    throw buildForbiddenError('Only admin can access this endpoint');
  }

  if (!user.companyId) {
    throw buildValidationError('companyId', 'Company ID is required for admin users');
  }

  const { companiesCollection } = getsuperadminCollections();

  // Find company by ID
  const company = await companiesCollection.findOne({
    _id: new ObjectId(user.companyId)
  });

  if (!company) {
    throw buildNotFoundError('Company', user.companyId);
  }

  // Validate company logo - use system default if invalid
  const validCompanyLogo = isValidAvatar(company.logo) ? company.logo : getSystemDefaultAvatarUrl();

  // Get subscription details
  let subscriptionInfo = null;
  try {
    const subscriptions = client.db('superadmin').collection('subscriptions');
    const subscription = await subscriptions.findOne({
      companyId: company._id,
      status: { $in: ['Active', 'Trial', 'Past Due'] }
    });

    if (subscription) {
      // Get plan details
      const plans = client.db('superadmin').collection('packages');
      const plan = await plans.findOne({
        _id: subscription.planId
      });

      // Get employee count
      const { getTenantCollections } = await import('../../config/db.js');
      const collections = getTenantCollections(user.companyId);
      const employeeCount = await collections.employees.countDocuments({
        isDeleted: { $ne: true }
      });

      subscriptionInfo = {
        planId: subscription.planId?.toString(),
        planName: plan?.name || 'Unknown Plan',
        userLimit: plan?.userLimit || 0,
        currentUsers: employeeCount,
        renewalDate: subscription.renewalDate || null,
        status: subscription.status || 'Unknown'
      };
    }
  } catch (subError) {
    devError('[User Profile Controller] Error fetching subscription:', subError.message);
  }

  // Get admin user info from Clerk metadata
  const adminInfo = {
    adminName: user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.firstName || user.lastName || 'Admin',
    adminEmail: user.email || company.email,
    adminRole: user.role
  };

  const profileData = {
    // Company Information
    companyId: company._id.toString(),
    companyName: company.name || 'Company',
    companyLogo: validCompanyLogo,
    domain: company.domain || null,
    email: company.email || adminInfo.adminEmail,
    phone: company.phone || null,
    website: company.website || null,
    description: company.description || '',
    status: company.status || 'Active',
    createdAt: company.createdAt,

    // Subscription Information
    subscription: subscriptionInfo,

    // Admin User Information
    admin: adminInfo,

    // For compatibility with profile components
    _id: company._id.toString(),
    userId: user.userId,
    role: 'admin',
    firstName: company.name || 'Admin',
    lastName: '',
    fullName: company.name || 'Admin',
    profilePhoto: validCompanyLogo,
    profileImage: validCompanyLogo,
    designation: 'Administrator',
    joiningDate: company.createdAt || null,
    bio: company.description || '',
    about: company.description || ''
  };

  return sendSuccess(res, profileData, 'Admin profile retrieved successfully');
});

/**
 * @desc    Update admin profile (company information)
 * @route   PUT /api/user-profile/admin
 * @access  Private (Admin only)
 */
export const updateAdminProfile = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const updateData = req.body;

  devLog('[User Profile Controller] updateAdminProfile - userId:', user.userId, 'companyId:', user.companyId);

  // Validate admin role
  if (user.role !== 'admin') {
    throw buildForbiddenError('Only admin can update company information');
  }

  if (!user.companyId) {
    throw buildValidationError('companyId', 'Company ID is required for admin users');
  }

  const { companiesCollection } = getsuperadminCollections();

  // Fields that admin is allowed to update
  const allowedFields = ['phone', 'website', 'description'];
  const sanitizedUpdate = {};

  // Build update object with only allowed fields
  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      sanitizedUpdate[field] = updateData[field];
    }
  }

  // Handle bio/about as description
  if (updateData.bio !== undefined) {
    sanitizedUpdate.description = updateData.bio;
  } else if (updateData.about !== undefined) {
    sanitizedUpdate.description = updateData.about;
  }

  // Handle logo upload
  if (updateData.companyLogo !== undefined || updateData.profilePhoto !== undefined) {
    const logoUrl = updateData.companyLogo || updateData.profilePhoto;
    if (logoUrl && isValidAvatar(logoUrl)) {
      sanitizedUpdate.logo = logoUrl;
    }
  }

  sanitizedUpdate.updatedAt = new Date();

  // Update company
  const result = await companiesCollection.updateOne(
    { _id: new ObjectId(user.companyId) },
    { $set: sanitizedUpdate }
  );

  if (result.matchedCount === 0) {
    throw buildNotFoundError('Company', user.companyId);
  }

  // Fetch updated company and return full profile
  const updatedCompany = await companiesCollection.findOne({
    _id: new ObjectId(user.companyId)
  });

  if (!updatedCompany) {
    throw buildNotFoundError('Company', user.companyId);
  }

  // Return success with updated data
  return sendSuccess(
    res,
    {
      message: 'Company profile updated successfully',
      data: {
        phone: updatedCompany.phone || null,
        website: updatedCompany.website || null,
        description: updatedCompany.description || '',
        logo: updatedCompany.logo || null
      }
    },
    'Company profile updated successfully'
  );
});

export default {
  getCurrentUserProfile,
  updateCurrentUserProfile,
  changePassword,
  getAdminProfile,
  updateAdminProfile,
};
