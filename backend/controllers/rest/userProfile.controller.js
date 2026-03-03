/**
 * User Profile REST Controller
 * Handles current user profile data via REST API
 * Returns full profile data for the profile page
 * - All roles: Full profile with address, emergency contact, social links, skills, bio
 */

import { clerkClient } from '@clerk/clerk-sdk-node';
import bcrypt from 'bcrypt';
import { ObjectId } from 'mongodb';
import { getsuperadminCollections, getTenantCollections } from '../../config/db.js';
import {
    asyncHandler,
    buildForbiddenError,
    buildNotFoundError,
    buildValidationError,
} from '../../middleware/errorHandler.js';
import otpService from '../../services/otp/otp.service.js';
import {
    extractUser,
    sendSuccess
} from '../../utils/apiResponse.js';
import { getSystemDefaultAvatarUrl, isValidAvatar } from '../../utils/avatarUtils.js';
import { sendPasswordChangedEmail } from '../../utils/emailer.js';
import { devError, devLog } from '../../utils/logger.js';

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
          // Handle both departmentId (string) and department (ObjectId) field names
          departmentObjId: {
            $switch: {
              branches: [
                // Case 1: departmentId is a non-empty string - convert to ObjectId
                {
                  case: { $and: [
                    { $ne: ['$departmentId', null] },
                    { $ne: ['$departmentId', ''] },
                    { $eq: [{ $type: '$departmentId' }, 'string'] }
                  ]},
                  then: { $toObjectId: '$departmentId' }
                },
                // Case 2: department is already an ObjectId - use it directly
                {
                  case: { $eq: [{ $type: '$department' }, 'objectId'] },
                  then: '$department'
                }
              ],
              default: null
            }
          },
          // Handle both designationId (string) and designation (ObjectId) field names
          designationObjId: {
            $switch: {
              branches: [
                // Case 1: designationId is a non-empty string - convert to ObjectId
                {
                  case: { $and: [
                    { $ne: ['$designationId', null] },
                    { $ne: ['$designationId', ''] },
                    { $eq: [{ $type: '$designationId' }, 'string'] }
                  ]},
                  then: { $toObjectId: '$designationId' }
                },
                // Case 2: designation is already an ObjectId - use it directly
                {
                  case: { $eq: [{ $type: '$designation' }, 'objectId'] },
                  then: '$designation'
                }
              ],
              default: null
            }
          },
          // Handle reportingTo as both string and ObjectId
          reportingToObjId: {
            $switch: {
              branches: [
                // Case 1: reportingTo is a non-empty string - convert to ObjectId
                {
                  case: { $and: [
                    { $ne: ['$reportingTo', null] },
                    { $ne: ['$reportingTo', ''] },
                    { $eq: [{ $type: '$reportingTo' }, 'string'] }
                  ]},
                  then: { $toObjectId: '$reportingTo' }
                },
                // Case 2: reportingTo is already an ObjectId - use it directly
                {
                  case: { $eq: [{ $type: '$reportingTo' }, 'objectId'] },
                  then: '$reportingTo'
                }
              ],
              default: null
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
          departmentName: {
            $ifNull: [
              { $arrayElemAt: ['$departmentInfo.department', 0] },
              { $arrayElemAt: ['$departmentInfo.name', 0] }
            ]
          },
          // Try title first, then name, then designation field for backwards compatibility
          designationTitle: {
            $ifNull: [
              { $arrayElemAt: ['$designationInfo.title', 0] },
              { $arrayElemAt: ['$designationInfo.name', 0] },
              { $arrayElemAt: ['$designationInfo.designation', 0] }
            ]
          },
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

    // Debug log to check fetched employee data
    devLog('[User Profile Controller] Employee data fetched:', {
      employeeId: employee.employeeId,
      designationId: employee.designationId,
      designation: employee.designation,
      designationObjId: employee.designationObjId,
      designationTitle: employee.designationTitle,
      departmentId: employee.departmentId,
      department: employee.department,
      departmentName: employee.departmentName,
      reportingTo: employee.reportingTo
    });

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
      // Phone country code
      phoneCode: employee.phoneCode || employee.contact?.phoneCode || null,
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
      // Canonical: bio. Fallback to legacy notes/about for existing data.
      about: employee.bio || employee.notes || employee.about || '',
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
        phone2: employee.emergencyContact?.phone2 || (Array.isArray(employee.emergencyContacts) && employee.emergencyContacts[0]?.phone?.[1]) || '',
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
      // Education (stored as 'education', falls back to 'qualifications' for legacy data)
      education: employee.education || employee.qualifications || [],
      // Normalize experience: employeedetails saves as 'previousCompany', profile page uses 'company'
      experience: (employee.experience || []).map(e => ({
        ...e,
        company: e.company || e.previousCompany || '',
        designation: e.designation || e.position || '',
        current: e.current || e.currentlyWorking || false,
      })),
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
        accountHolderName: employee.bankDetails.accountHolderName || '',
        bankName: employee.bankDetails.bankName || '',
        accountNumber: employee.bankDetails.accountNumber || '',
        ifscCode: employee.bankDetails.ifscCode || '',
        branch: employee.bankDetails.branch || '',
        accountType: employee.bankDetails.accountType || 'Savings Account'
      } : {
        accountHolderName: '',
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        branch: '',
        accountType: 'Savings Account'
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
    // Canonical field: bio. Do NOT duplicate into 'notes' or 'about'.
    if (updateData.bio !== undefined) sanitizedUpdate.bio = updateData.bio;
    else if (updateData.about !== undefined) sanitizedUpdate.bio = updateData.about;
    if (updateData.skills !== undefined) sanitizedUpdate.skills = updateData.skills;

    // Handle education - accept both 'education' and 'qualifications' keys, store in 'education'
    if (updateData.education !== undefined) {
      sanitizedUpdate.education = updateData.education;
    }
    if (updateData.qualifications !== undefined) {
      // Also store under 'education' for consistency with employeedetails page
      sanitizedUpdate.education = updateData.qualifications;
    }

    // Handle experience - normalize field names to canonical 'company'
    if (updateData.experience !== undefined) {
      sanitizedUpdate.experience = Array.isArray(updateData.experience)
        ? updateData.experience.map(e => ({
            ...e,
            company: e.company || e.previousCompany || '',
            designation: e.designation || e.position || '',
            current: e.current || e.currentlyWorking || false,
          }))
        : updateData.experience;
    }

    // Handle family - normalize to match employeedetails format { Name, relationship, phone }
    if (updateData.family !== undefined) {
      sanitizedUpdate.family = Array.isArray(updateData.family)
        ? updateData.family.map(member => ({
            Name: member.Name || member.familyMemberName || member.name || '',
            relationship: member.relationship || '',
            phone: member.phone || ''
          }))
        : [];
    }

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
        phone2: updateData.emergencyContact.phone2 || '',
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

      if (updateData.bankDetails.accountHolderName !== undefined) {
        bankDetailsUpdate['bankDetails.accountHolderName'] = updateData.bankDetails.accountHolderName;
      }
      if (updateData.bankDetails.bankName !== undefined) {
        bankDetailsUpdate['bankDetails.bankName'] = updateData.bankDetails.bankName;
      }
      if (updateData.bankDetails.accountNumber !== undefined) {
        bankDetailsUpdate['bankDetails.accountNumber'] = updateData.bankDetails.accountNumber;
      }
      if (updateData.bankDetails.ifscCode !== undefined) {
        // Convert IFSC code to uppercase before saving
        bankDetailsUpdate['bankDetails.ifscCode'] = updateData.bankDetails.ifscCode.toUpperCase();
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
      about: updatedEmployee.bio || updatedEmployee.notes || updatedEmployee.about || '',
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
        phone2: updatedEmployee.emergencyContact?.phone2 || (Array.isArray(updatedEmployee.emergencyContacts) && updatedEmployee.emergencyContacts[0]?.phone?.[1]) || '',
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
      experience: (updatedEmployee.experience || []).map(e => ({
        ...e,
        company: e.company || e.previousCompany || '',
        designation: e.designation || e.position || '',
        current: e.current || e.currentlyWorking || false,
      })),
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
        accountType: updatedEmployee.bankDetails.accountType || 'Savings Account'
      } : {
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        branch: '',
        accountType: 'Savings Account'
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

  const userRole = user.role?.toLowerCase();
  if (user.companyId && (userRole === 'hr' || userRole === 'employee' || userRole === 'admin')) {
    const collections = getTenantCollections(user.companyId);

    const employee = await collections.employees.findOne({
      isDeleted: { $ne: true },
      $or: [
        { clerkUserId: user.userId },
        { 'account.userId': user.userId }
      ]
    });

    if (employee) {
      // Verify current password against DB (bcrypt hash or plaintext fallback)
      if (employee.account?.password) {
        let isPasswordValid = false;
        try {
          isPasswordValid = await bcrypt.compare(currentPassword, employee.account.password);
        } catch {
          // Stored as plaintext
          isPasswordValid = currentPassword === employee.account.password;
        }
        if (!isPasswordValid) {
          throw buildValidationError('currentPassword', 'Current password is incorrect');
        }
      }

      // Hash new password for DB storage
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update Clerk password (primary auth source)
      try {
        await clerkClient.users.updateUser(user.userId, { password: newPassword });
        devLog('[changePassword] Clerk password updated for userId:', user.userId);
      } catch (clerkErr) {
        devError('[changePassword] Clerk password update failed:', clerkErr.message);
        throw buildValidationError('password', 'Failed to update password. Please try again.');
      }

      // Update DB
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

      // Send notification email (non-fatal)
      sendPasswordChangedEmail({
        to: employee.email || user.email,
        firstName: employee.firstName,
        lastName: employee.lastName,
        companyName: 'ManageRTC',
      }).catch(() => {});

      return sendSuccess(res, { message: 'Password changed successfully' }, 'Password changed successfully');
    }
  }

  // Superadmin or no employee record — update Clerk only
  try {
    await clerkClient.users.updateUser(user.userId, { password: newPassword });
  } catch (clerkErr) {
    devError('[changePassword] Clerk password update failed:', clerkErr.message);
    throw buildValidationError('password', 'Failed to update password. Please try again.');
  }
  return sendSuccess(res, { message: 'Password changed successfully' }, 'Password changed successfully');
});

/**
 * @desc    Send OTP to registered email for password reset (Forgot Password)
 * @route   POST /api/user-profile/forgot-password/send-otp
 * @access  Private (All authenticated users)
 */
export const sendForgotPasswordOTP = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  if (!user.companyId) {
    throw buildValidationError('companyId', 'Company context required');
  }
  if (!user.email) {
    throw buildValidationError('email', 'No registered email found for this account');
  }

  devLog('[sendForgotPasswordOTP] Sending OTP to:', user.email);

  const result = await otpService.sendOTP(user.companyId, user.email, 'forgot_password');

  if (!result.success) {
    throw buildValidationError('otp', result.error || 'Failed to send OTP. Please try again.');
  }

  return sendSuccess(res, { email: user.email }, 'OTP sent to your registered email. Valid for 10 minutes.');
});

/**
 * @desc    Reset password using OTP (no current password required)
 * @route   POST /api/user-profile/forgot-password/reset
 * @access  Private (All authenticated users)
 */
export const resetForgotPassword = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const { otp, newPassword, confirmPassword } = req.body;

  if (!otp || !newPassword || !confirmPassword) {
    throw buildValidationError('fields', 'OTP, new password, and confirm password are required');
  }

  if (newPassword !== confirmPassword) {
    throw buildValidationError('confirmPassword', 'New password and confirm password do not match');
  }

  if (newPassword.length < 6) {
    throw buildValidationError('newPassword', 'Password must be at least 6 characters long');
  }

  if (!user.companyId) {
    throw buildValidationError('companyId', 'Company context required');
  }

  // Verify OTP
  const otpResult = await otpService.verifyOTP(user.companyId, user.email, otp, 'forgot_password');
  if (!otpResult.valid) {
    throw buildValidationError('otp', 'Invalid or expired OTP. Please request a new one.');
  }

  // Update Clerk password
  try {
    await clerkClient.users.updateUser(user.userId, { password: newPassword });
    devLog('[resetForgotPassword] Clerk password updated for userId:', user.userId);
  } catch (clerkErr) {
    devError('[resetForgotPassword] Clerk password update failed:', clerkErr.message);
    throw buildValidationError('password', 'Failed to reset password. Please try again.');
  }

  // Update DB if employee record exists
  if (user.companyId) {
    const collections = getTenantCollections(user.companyId);
    const employee = await collections.employees.findOne({
      isDeleted: { $ne: true },
      $or: [{ clerkUserId: user.userId }, { 'account.userId': user.userId }]
    });

    if (employee) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
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

      sendPasswordChangedEmail({
        to: employee.email || user.email,
        firstName: employee.firstName,
        lastName: employee.lastName,
        companyName: 'ManageRTC',
      }).catch(() => {});
    }
  }

  return sendSuccess(res, { message: 'Password reset successfully' }, 'Password reset successfully. You can now log in with your new password.');
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

  // Get employee count for admin dashboard
  let employeeCount = 0;
  try {
    const { getTenantCollections } = await import('../../config/db.js');
    const tenantCollections = getTenantCollections(user.companyId);
    employeeCount = await tenantCollections.employees.countDocuments({ isDeleted: { $ne: true } });
  } catch (empErr) {
    devError('[User Profile Controller] Error counting employees:', empErr.message);
  }

  const profileData = {
    // Company Information
    companyId: company._id.toString(),
    companyName: company.name || 'Company',
    companyLogo: validCompanyLogo,
    domain: company.domain || null,
    email: company.email || adminInfo.adminEmail,
    phone: company.phone || null,
    phone2: company.phone2 || null,
    fax: company.fax || null,
    website: company.website || null,
    description: company.description || '',
    address: company.address || null,
    structuredAddress: company.structuredAddress || null,
    status: company.status || 'Active',
    createdAt: company.createdAt,

    // Registration & Legal (Read-Only for admin)
    registrationNumber: company.registrationNumber || null,
    taxId: company.taxId || null,
    taxIdType: company.taxIdType || null,
    legalName: company.legalName || null,
    legalEntityType: company.legalEntityType || null,
    incorporationCountry: company.incorporationCountry || null,

    // Industry & Classification (Read-Only for admin)
    industry: company.industry || null,
    subIndustry: company.subIndustry || null,
    companySize: company.companySize || null,
    companyType: company.companyType || null,

    // Contact & Founder (Read-Only for admin)
    contactPerson: company.contactPerson || null,
    founderName: company.founderName || null,

    // Social Links (Direct Edit for admin)
    social: company.social || null,

    // Billing (Request to Edit for admin)
    billingEmail: company.billingEmail || null,
    billingAddress: company.billingAddress || null,

    // Subscription Information
    subscription: subscriptionInfo,

    // Admin User Information
    admin: adminInfo,

    // Stats
    employeeCount,
    userCount: company.userCount || 0,

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

  // Tier 1: Fields that admin is allowed to directly update
  const allowedFields = ['phone', 'phone2', 'fax', 'website', 'description'];
  const sanitizedUpdate = {};

  // Build update object with only allowed fields
  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      sanitizedUpdate[field] = updateData[field];
    }
  }

  // Handle social links (Tier 1 - Direct Edit)
  if (updateData.social !== undefined && typeof updateData.social === 'object') {
    const allowedSocialFields = ['linkedin', 'twitter', 'facebook', 'instagram'];
    const sanitizedSocial = {};
    for (const sf of allowedSocialFields) {
      if (updateData.social[sf] !== undefined) {
        sanitizedSocial[sf] = updateData.social[sf];
      }
    }
    if (Object.keys(sanitizedSocial).length > 0) {
      // Merge with existing social data
      const company = await companiesCollection.findOne({ _id: new ObjectId(user.companyId) });
      sanitizedUpdate.social = { ...(company?.social || {}), ...sanitizedSocial };
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

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2: Extended Profile Endpoints for Read-Only Sections
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Get work info for current employee (shift, batch, timezone)
 * @route   GET /api/user-profile/work-info
 * @access  Private (All authenticated users)
 */
export const getWorkInfo = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  if (!user.companyId) {
    throw buildValidationError('companyId', 'Company ID is required');
  }

  const collections = getTenantCollections(user.companyId);

  // Find employee - get both field naming conventions
  const employee = await collections.employees.findOne(
    { clerkUserId: user.userId, isDeleted: { $ne: true } },
    { projection: { _id: 1, employeeId: 1, shiftId: 1, shift: 1, batchId: 1, batch: 1, employmentType: 1, timezone: 1 } }
  );

  if (!employee) {
    throw buildNotFoundError('Employee', user.userId);
  }

  // Handle both field naming conventions (shiftId/shift, batchId/batch)
  const employeeShiftId = employee.shiftId || employee.shift;
  const employeeBatchId = employee.batchId || employee.batch;

  // Fetch shift details if assigned
  let shiftDetails = null;
  if (employeeShiftId) {
    // Convert shiftId to ObjectId if it's a string
    const shiftObjId = typeof employeeShiftId === 'string' && ObjectId.isValid(employeeShiftId)
      ? new ObjectId(employeeShiftId)
      : employeeShiftId;
    const shift = await collections.shifts.findOne({ _id: shiftObjId });
    if (shift) {
      shiftDetails = {
        _id: shift._id.toString(),
        name: shift.name,
        code: shift.code,
        startTime: shift.startTime,
        endTime: shift.endTime,
        duration: shift.duration,
        color: shift.color,
        type: shift.type,
        isNightShift: shift.isNightShift,
      };
    }
  }

  // Fetch batch details if assigned
  let batchDetails = null;
  if (employeeBatchId) {
    // Convert batchId to ObjectId if it's a string
    const batchObjId = typeof employeeBatchId === 'string' && ObjectId.isValid(employeeBatchId)
      ? new ObjectId(employeeBatchId)
      : employeeBatchId;
    const batch = await collections.batches.findOne({ _id: batchObjId });
    if (batch) {
      // Fetch batch's shift for timing
      let batchShift = null;
      if (batch.shiftId) {
        // Convert batch's shiftId to ObjectId if it's a string
        const batchShiftObjId = typeof batch.shiftId === 'string' && ObjectId.isValid(batch.shiftId)
          ? new ObjectId(batch.shiftId)
          : batch.shiftId;
        const shift = await collections.shifts.findOne({ _id: batchShiftObjId });
        if (shift) {
          batchShift = {
            _id: shift._id.toString(),
            name: shift.name,
            code: shift.code,
            startTime: shift.startTime,
            endTime: shift.endTime,
            color: shift.color,
          };
        }
      }
      batchDetails = {
        _id: batch._id.toString(),
        name: batch.name,
        code: batch.code,
        shift: batchShift,
      };
    }
  }

  const workInfo = {
    employmentType: employee.employmentType || null,
    timezone: employee.timezone || 'UTC',
    shift: shiftDetails,
    batch: batchDetails,
  };

  return sendSuccess(res, workInfo, 'Work info retrieved successfully');
});

/**
 * @desc    Get salary info for current employee
 * @route   GET /api/user-profile/salary
 * @access  Private (All authenticated users)
 */
export const getSalaryInfo = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  if (!user.companyId) {
    throw buildValidationError('companyId', 'Company ID is required');
  }

  const collections = getTenantCollections(user.companyId);

  // Find employee with salary fields
  const employee = await collections.employees.findOne(
    { clerkUserId: user.userId, isDeleted: { $ne: true } },
    { projection: { _id: 1, employeeId: 1, salary: 1 } }
  );

  if (!employee) {
    throw buildNotFoundError('Employee', user.userId);
  }

  if (!employee.salary) {
    return sendSuccess(res, {
      basic: 0,
      hra: 0,
      allowances: 0,
      totalCTC: 0,
      currency: 'USD',
    }, 'Salary info retrieved successfully');
  }

  const salaryInfo = {
    basic: employee.salary.basic || 0,
    hra: employee.salary.hra || 0,
    allowances: employee.salary.allowances || 0,
    totalCTC: (employee.salary.basic || 0) + (employee.salary.hra || 0) + (employee.salary.allowances || 0),
    currency: employee.salary.currency || 'USD',
  };

  return sendSuccess(res, salaryInfo, 'Salary info retrieved successfully');
});

/**
 * @desc    Get statutory info for current employee (PF, ESI from latest payslip)
 * @route   GET /api/user-profile/statutory
 * @access  Private (All authenticated users)
 */
export const getStatutoryInfo = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  if (!user.companyId) {
    throw buildValidationError('companyId', 'Company ID is required');
  }

  const collections = getTenantCollections(user.companyId);

  // Find employee
  const employee = await collections.employees.findOne(
    { clerkUserId: user.userId, isDeleted: { $ne: true } },
    { projection: { _id: 1, employeeId: 1 } }
  );

  if (!employee) {
    throw buildNotFoundError('Employee', user.userId);
  }

  // Fetch latest payroll record for this employee
  const latestPayroll = await collections.payrolls.findOne(
    { employeeId: employee._id },
    { sort: { payPeriodStart: -1 } }
  );

  const statutoryInfo = {
    pfContribution: latestPayroll?.deductions?.providentFund || 0,
    esiContribution: latestPayroll?.deductions?.esi || 0,
    lastPayPeriod: latestPayroll ? {
      start: latestPayroll.payPeriodStart,
      end: latestPayroll.payPeriodEnd,
    } : null,
  };

  return sendSuccess(res, statutoryInfo, 'Statutory info retrieved successfully');
});

/**
 * @desc    Get assigned assets for current employee
 * @route   GET /api/user-profile/assets
 * @access  Private (All authenticated users)
 */
export const getMyAssets = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  if (!user.companyId) {
    throw buildValidationError('companyId', 'Company ID is required');
  }

  const { status } = req.query;

  const collections = getTenantCollections(user.companyId);

  // Find employee
  const employee = await collections.employees.findOne(
    { clerkUserId: user.userId, isDeleted: { $ne: true } },
    { projection: { _id: 1, employeeId: 1 } }
  );

  if (!employee) {
    throw buildNotFoundError('Employee', user.userId);
  }

  // Build filter for assetUsers
  const filter = {
    employeeId: employee._id.toString(),
    isDeleted: { $ne: true },
  };

  if (status) {
    filter.status = status;
  } else {
    // Default to assigned assets only
    filter.status = 'assigned';
  }

  // Fetch assetUser records
  const assetUsers = await collections.assetusers.find(filter).sort({ assignedDate: -1 }).toArray();

  // Fetch asset details for each
  const assetIds = assetUsers.map(au => new ObjectId(au.assetId));
  const assets = assetIds.length > 0
    ? await collections.assets.find({ _id: { $in: assetIds } }).toArray()
    : [];

  const assetMap = new Map(assets.map(a => [a._id.toString(), a]));

  // Build response with asset details
  const result = assetUsers.map(au => {
    const asset = assetMap.get(au.assetId);
    return {
      _id: au._id?.toString(),
      assetId: au.assetId,
      assetName: asset?.name || 'Unknown',
      category: asset?.category || null,
      serialNumber: asset?.serialNumber || null,
      status: au.status,
      assignedDate: au.assignedDate,
      returnDate: au.returnDate || null,
      notes: au.notes || null,
      image: asset?.image || null,
    };
  });

  return sendSuccess(res, result, 'Assets retrieved successfully');
});

/**
 * @desc    Get career history for current employee (promotions, policies, resignation, termination)
 * @route   GET /api/user-profile/career
 * @access  Private (All authenticated users)
 */
export const getCareerHistory = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  if (!user.companyId) {
    throw buildValidationError('companyId', 'Company ID is required');
  }

  const collections = getTenantCollections(user.companyId);

  // Find employee - get both field naming conventions
  const employee = await collections.employees.findOne(
    { clerkUserId: user.userId, isDeleted: { $ne: true } },
    { projection: { _id: 1, employeeId: 1, departmentId: 1, designationId: 1, department: 1, designation: 1 } }
  );

  if (!employee) {
    throw buildNotFoundError('Employee', user.userId);
  }

  // Handle both field naming conventions for department and designation
  const employeeDepartmentId = employee.departmentId || (employee.department ? employee.department.toString() : null);
  const employeeDesignationId = employee.designationId || (employee.designation ? employee.designation.toString() : null);

  // Fetch promotions
  const promotions = await collections.promotions
    .find({ employeeId: employee._id.toString(), isDeleted: { $ne: true } })
    .sort({ effectiveDate: -1 })
    .toArray();

  // Fetch resignation record
  const resignation = await collections.resignation.findOne({
    employeeId: employee._id.toString(),
    isDeleted: { $ne: true },
  });

  // Fetch termination record
  const termination = await collections.termination.findOne({
    employeeId: employee._id.toString(),
    isDeleted: { $ne: true },
  });

  // Fetch applicable policies
  // Policy applies if: applyToAll=true OR (assignTo.departmentId matches AND assignTo.designationIds includes employee's designation)
  const policyFilter = {
    isDeleted: { $ne: true },
    $or: [
      { applyToAll: true },
      {
        $and: [
          { 'assignTo.departmentId': employeeDepartmentId },
          { 'assignTo.designationIds': employeeDesignationId },
        ],
      },
    ],
  };

  const policies = await collections.policies.find(policyFilter).sort({ effectiveDate: -1 }).toArray();

  const careerHistory = {
    promotions: promotions.map(p => ({
      _id: p._id.toString(),
      effectiveDate: p.effectiveDate,
      promotionType: p.promotionType,
      previousDesignation: p.promotionFrom?.designation || null,
      newDesignation: p.promotionTo?.designation || null,
      previousDepartment: p.promotionFrom?.department || null,
      newDepartment: p.promotionTo?.department || null,
      salaryChange: p.salaryChange ? {
        previousSalary: p.salaryChange.previousSalary,
        newSalary: p.salaryChange.newSalary,
        increment: p.salaryChange.increment,
      } : null,
      status: p.status,
      notes: p.notes || null,
    })),
    resignation: resignation ? {
      _id: resignation._id.toString(),
      noticeDate: resignation.noticeDate,
      resignationDate: resignation.resignationDate,
      lastWorkingDay: resignation.lastWorkingDay,
      reason: resignation.reason || null,
      status: resignation.status,
    } : null,
    termination: termination ? {
      _id: termination._id.toString(),
      terminationDate: termination.terminationDate,
      reason: termination.reason || null,
      type: termination.type || null,
      noticePeriodServed: termination.noticePeriodServed || false,
    } : null,
    policies: policies.map(p => ({
      _id: p._id.toString(),
      name: p.name,
      description: p.description || null,
      effectiveDate: p.effectiveDate,
      category: p.category || null,
      status: p.status,
    })),
  };

  return sendSuccess(res, careerHistory, 'Career history retrieved successfully');
});

export default {
  getCurrentUserProfile,
  updateCurrentUserProfile,
  changePassword,
  getAdminProfile,
  updateAdminProfile,
  // Phase 2: Extended Profile Endpoints
  getWorkInfo,
  getSalaryInfo,
  getStatutoryInfo,
  getMyAssets,
  getCareerHistory,
};
