import { ObjectId } from "mongodb";
import { getTenantCollections } from "../../config/db.js";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { format } from "date-fns";

// Create new profile
export const createProfile = async (companyId, profileData) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[ProfileService] createProfile", { companyId, profileData });

    // Validate required fields
    if (!profileData.firstName || !profileData.lastName || !profileData.email) {
      throw new Error("Missing required fields: firstName, lastName, email");
    }

    const newProfile = {
      ...profileData,
      companyId,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
      // User metadata
      userId: profileData.userId || null,
      role: profileData.role || "employee",
      status: profileData.status || "Active",
      // Profile photo
      profilePhoto: profileData.profilePhoto || null,
      // Personal information
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      email: profileData.email,
      phone: profileData.phone || "",
      dateOfBirth: profileData.dateOfBirth || null,
      gender: profileData.gender || "",
      // Address information
      address: {
        street: profileData.street || "",
        city: profileData.city || "",
        state: profileData.state || "",
        country: profileData.country || "",
        postalCode: profileData.postalCode || ""
      },
      // Professional information
      employeeId: profileData.employeeId || "",
      department: profileData.department || "",
      designation: profileData.designation || "",
      joiningDate: profileData.joiningDate || null,
      salary: profileData.salary || 0,
      // Contact information
      emergencyContact: {
        name: profileData.emergencyContactName || "",
        phone: profileData.emergencyContactPhone || "",
        relationship: profileData.emergencyContactRelationship || ""
      },
      // Social links
      socialLinks: {
        linkedin: profileData.linkedin || "",
        twitter: profileData.twitter || "",
        facebook: profileData.facebook || "",
        instagram: profileData.instagram || ""
      },
      // Skills and bio
      skills: profileData.skills || [],
      bio: profileData.bio || "",
      // Documents
      documents: profileData.documents || []
    };

    const result = await collections.profile.insertOne(newProfile);
    console.log("[ProfileService] insertOne result", { result });

    if (result.insertedId) {
      const inserted = await collections.profile.findOne({
        _id: result.insertedId
      });
      console.log("[ProfileService] inserted profile", { inserted });
      return { done: true, data: inserted };
    } else {
      console.error("[ProfileService] Failed to insert profile");
      return { done: false, error: "Failed to insert profile" };
    }
  } catch (error) {
    console.error("[ProfileService] Error in createProfile", {
      error: error.message
    });
    return { done: false, error: error.message };
  }
};

// Get all profiles with filters
export const getProfiles = async (companyId, filters = {}) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[ProfileService] getProfiles", { companyId, filters });

    const query = { companyId, isDeleted: { $ne: true } };

    // Apply filters
    if (filters.status && filters.status !== "All") {
      query.status = filters.status;
    }

    // Department filter
    if (filters.department) {
      query.department = filters.department;
    }

    // Role filter
    if (filters.role) {
      query.role = filters.role;
    }

    // Search filter
    if (filters.search) {
      query.$or = [
        { firstName: { $regex: filters.search, $options: "i" } },
        { lastName: { $regex: filters.search, $options: "i" } },
        { email: { $regex: filters.search, $options: "i" } },
        { employeeId: { $regex: filters.search, $options: "i" } },
        { department: { $regex: filters.search, $options: "i" } },
        { designation: { $regex: filters.search, $options: "i" } }
      ];
    }

    // Date range filter
    if (filters.startDate && filters.endDate) {
      query.createdAt = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate)
      };
    }

    // Sort options
    let sort = { createdAt: -1 };
    if (filters.sortBy) {
      switch (filters.sortBy) {
        case "name":
          sort = { firstName: filters.sortOrder === "asc" ? 1 : -1 };
          break;
        case "email":
          sort = { email: filters.sortOrder === "asc" ? 1 : -1 };
          break;
        case "department":
          sort = { department: filters.sortOrder === "asc" ? 1 : -1 };
          break;
        case "joiningDate":
          sort = { joiningDate: filters.sortOrder === "asc" ? 1 : -1 };
          break;
        default:
          sort = { createdAt: filters.sortOrder === "asc" ? 1 : -1 };
      }
    }

    console.log("[ProfileService] Final query", { query, sort });

    const profiles = await collections.profile.find(query).sort(sort).toArray();
    console.log("[ProfileService] found profiles", { count: profiles.length });

    // Ensure dates are properly converted to Date objects
    const processedProfiles = profiles.map((profile) => ({
      ...profile,
      createdAt: profile.createdAt ? new Date(profile.createdAt) : null,
      updatedAt: profile.updatedAt ? new Date(profile.updatedAt) : null,
      dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth) : null,
      joiningDate: profile.joiningDate ? new Date(profile.joiningDate) : null
    }));

    return { done: true, data: processedProfiles };
  } catch (error) {
    console.error("[ProfileService] Error in getProfiles", {
      error: error.message
    });
    return { done: false, error: error.message };
  }
};

// Get single profile by ID
export const getProfileById = async (companyId, profileId) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[ProfileService] getProfileById", { companyId, profileId });

    if (!ObjectId.isValid(profileId)) {
      return { done: false, error: "Invalid profile ID format" };
    }

    const profile = await collections.profile.findOne({
      _id: new ObjectId(profileId),
      companyId,
      isDeleted: { $ne: true }
    });

    if (!profile) {
      return { done: false, error: "Profile not found" };
    }

    // Ensure dates are properly converted
    const processedProfile = {
      ...profile,
      createdAt: profile.createdAt ? new Date(profile.createdAt) : null,
      updatedAt: profile.updatedAt ? new Date(profile.updatedAt) : null,
      dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth) : null,
      joiningDate: profile.joiningDate ? new Date(profile.joiningDate) : null
    };

    return { done: true, data: processedProfile };
  } catch (error) {
    console.error("[ProfileService] Error in getProfileById", {
      error: error.message
    });
    return { done: false, error: error.message };
  }
};

// Get current user profile
export const getCurrentUserProfile = async (companyId, userId, clerkUserData = null) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[ProfileService] getCurrentUserProfile", { companyId, userId, clerkUserData });

    let profile = await collections.profile.findOne({
      userId: userId,
      companyId,
      isDeleted: { $ne: true }
    });

    // FALLBACK: If not found in profile collection, check employees collection
    if (!profile) {
      console.log("[ProfileService] Profile not found in profile collection, checking employees collection");
      const employee = await collections.employees.findOne({
        clerkUserId: userId,
        companyId,
        isDeleted: { $ne: true }
      });

      if (employee) {
        console.log("[ProfileService] Found employee record, converting to profile format");
        // Convert employee record to profile format
        profile = {
          _id: employee._id,
          userId: employee.clerkUserId,
          companyId: employee.companyId || companyId,
          firstName: employee.firstName || '',
          lastName: employee.lastName || '',
          email: employee.email || employee.contact?.email || '',
          phone: employee.phone || employee.contact?.phone || '',
          dateOfBirth: employee.dateOfBirth || null,
          gender: employee.gender || '',
          profilePhoto: employee.profileImage || employee.profilePhoto || '',
          employeeId: employee.employeeId || '',
          department: employee.department?.department || employee.departmentId || '',
          designation: employee.designation?.designation || employee.designationId || '',
          joiningDate: employee.joiningDate || employee.employmentDetails?.joiningDate || null,
          salary: employee.salary || 0,
          role: employee.role || employee.account?.role || 'employee',
          status: employee.status || employee.employmentStatus || 'Active',
          address: {
            street: employee.address?.street || employee.personal?.address?.street || '',
            city: employee.address?.city || employee.personal?.address?.city || '',
            state: employee.address?.state || employee.personal?.address?.state || '',
            country: employee.address?.country || employee.personal?.address?.country || '',
            postalCode: employee.address?.postalCode || employee.personal?.address?.postalCode || ''
          },
          emergencyContact: {
            name: employee.emergencyContact?.name || employee.emergencyContacts?.[0]?.name || '',
            phone: employee.emergencyContact?.phone || employee.emergencyContacts?.[0]?.phone || '',
            relationship: employee.emergencyContact?.relationship || employee.emergencyContacts?.[0]?.relationship || ''
          },
          socialLinks: {
            linkedin: employee.socialProfiles?.linkedin || employee.socialLinks?.linkedin || '',
            twitter: employee.socialProfiles?.twitter || employee.socialLinks?.twitter || '',
            facebook: employee.socialProfiles?.facebook || employee.socialLinks?.facebook || '',
            instagram: employee.socialProfiles?.instagram || employee.socialLinks?.instagram || ''
          },
          skills: employee.skills || [],
          bio: employee.bio || '',
          documents: employee.documents || [],
          createdAt: employee.createdAt || new Date(),
          updatedAt: employee.updatedAt || new Date(),
          isDeleted: employee.isDeleted || false
        };
        console.log("[ProfileService] Employee converted to profile format:", profile);
      }
    }

    // If profile doesn't exist and clerk user data is provided, create a default profile
    if (!profile && clerkUserData) {
      console.log("[ProfileService] Profile not found, creating from Clerk user data", { clerkUserData });

      // Helper function to extract name from various sources
      const extractName = () => {
        // Try firstName/lastName first
        if (clerkUserData.firstName && clerkUserData.lastName) {
          return {
            firstName: clerkUserData.firstName,
            lastName: clerkUserData.lastName
          };
        }

        // Try fullName
        if (clerkUserData.fullName) {
          const nameParts = clerkUserData.fullName.split(' ');
          return {
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || ''
          };
        }

        // Try username
        if (clerkUserData.username) {
          const nameParts = clerkUserData.username.split(/[._-]/);
          return {
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || ''
          };
        }

        // Fall back to email username
        const email = clerkUserData.emailAddresses?.[0]?.emailAddress || clerkUserData.email || '';
        if (email) {
          const emailUsername = email.split('@')[0];
          const nameParts = emailUsername.split(/[._-]/);
          return {
            firstName: nameParts[0] ? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1) : '',
            lastName: nameParts.slice(1).join(' ') ? nameParts.slice(1).map((n) => n.charAt(0).toUpperCase() + n.slice(1)).join(' ') : ''
          };
        }

        return { firstName: '', lastName: '' };
      };

      const names = extractName();

      const defaultProfile = {
        userId: userId,
        companyId,
        firstName: names.firstName,
        lastName: names.lastName,
        email: clerkUserData.emailAddresses?.[0]?.emailAddress || clerkUserData.email || '',
        phone: clerkUserData.phoneNumbers?.[0]?.phoneNumber || '',
        profilePhoto: clerkUserData.imageUrl || clerkUserData.profilePhoto || '',
        role: clerkUserData.publicMetadata?.role || 'employee',
        status: 'Active',
        // Initialize empty fields
        dateOfBirth: null,
        gender: '',
        employeeId: '',
        department: clerkUserData.publicMetadata?.department || '',
        designation: clerkUserData.publicMetadata?.designation || '',
        joiningDate: null,
        salary: 0,
        // Address
        address: {
          street: '',
          city: '',
          state: '',
          country: '',
          postalCode: ''
        },
        // Emergency contact
        emergencyContact: {
          name: '',
          phone: '',
          relationship: ''
        },
        // Social links
        socialLinks: {
          linkedin: '',
          twitter: '',
          facebook: '',
          instagram: ''
        },
        // Skills and bio
        skills: [],
        bio: '',
        // Documents
        documents: [],
        // Timestamps
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false
      };

      const result = await collections.profile.insertOne(defaultProfile);
      console.log("[ProfileService] Created default profile", { result });

      if (result.insertedId) {
        profile = await collections.profile.findOne({ _id: result.insertedId });
      }
    }

    if (!profile) {
      return { done: false, error: "Profile not found. Please provide Clerk user data to create a profile." };
    }

    // Ensure dates are properly converted
    const processedProfile = {
      ...profile,
      createdAt: profile.createdAt ? new Date(profile.createdAt) : null,
      updatedAt: profile.updatedAt ? new Date(profile.updatedAt) : null,
      dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth) : null,
      joiningDate: profile.joiningDate ? new Date(profile.joiningDate) : null
    };

    return { done: true, data: processedProfile };
  } catch (error) {
    console.error("[ProfileService] Error in getCurrentUserProfile", {
      error: error.message
    });
    return { done: false, error: error.message };
  }
};

// Update profile
export const updateProfile = async (companyId, profileId, updateData) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[ProfileService] updateProfile", {
      companyId,
      profileId,
      updateData
    });

    if (!ObjectId.isValid(profileId)) {
      return { done: false, error: "Invalid profile ID format" };
    }

    const updateFields = {
      ...updateData,
      updatedAt: new Date()
    };

    // Handle address update
    if (updateData.address) {
      updateFields.address = {
        street: updateData.address.street || updateData.street || "",
        city: updateData.address.city || updateData.city || "",
        state: updateData.address.state || updateData.state || "",
        country: updateData.address.country || updateData.country || "",
        postalCode: updateData.address.postalCode || updateData.postalCode || ""
      };
    }

    // Handle emergency contact update
    if (updateData.emergencyContact || updateData.emergencyContactName) {
      updateFields.emergencyContact = {
        name: updateData.emergencyContact?.name || updateData.emergencyContactName || "",
        phone: updateData.emergencyContact?.phone || updateData.emergencyContactPhone || "",
        relationship: updateData.emergencyContact?.relationship || updateData.emergencyContactRelationship || ""
      };
    }

    // Handle social links update
    if (updateData.socialLinks || updateData.linkedin) {
      updateFields.socialLinks = {
        linkedin: updateData.socialLinks?.linkedin || updateData.linkedin || "",
        twitter: updateData.socialLinks?.twitter || updateData.twitter || "",
        facebook: updateData.socialLinks?.facebook || updateData.facebook || "",
        instagram: updateData.socialLinks?.instagram || updateData.instagram || ""
      };
    }

    // Remove _id from update data to prevent conflicts
    delete updateFields._id;

    const result = await collections.profile.updateOne(
      { _id: new ObjectId(profileId), companyId, isDeleted: { $ne: true } },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return { done: false, error: "Profile not found" };
    }

    if (result.modifiedCount === 0) {
      return { done: false, error: "No changes made to profile" };
    }

    // Return updated profile
    const updatedProfile = await collections.profile.findOne({
      _id: new ObjectId(profileId),
      companyId
    });

    const processedProfile = {
      ...updatedProfile,
      createdAt: updatedProfile.createdAt ? new Date(updatedProfile.createdAt) : null,
      updatedAt: updatedProfile.updatedAt ? new Date(updatedProfile.updatedAt) : null,
      dateOfBirth: updatedProfile.dateOfBirth ? new Date(updatedProfile.dateOfBirth) : null,
      joiningDate: updatedProfile.joiningDate ? new Date(updatedProfile.joiningDate) : null
    };

    return { done: true, data: processedProfile };
  } catch (error) {
    console.error("[ProfileService] Error in updateProfile", {
      error: error.message
    });
    return { done: false, error: error.message };
  }
};

// Update current user profile
export const updateCurrentUserProfile = async (companyId, userId, updateData) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[ProfileService] updateCurrentUserProfile", {
      companyId,
      userId,
      updateData
    });

    const updateFields = {
      ...updateData,
      updatedAt: new Date()
    };

    // Handle address update
    if (updateData.address) {
      updateFields.address = {
        street: updateData.address.street || updateData.street || "",
        city: updateData.address.city || updateData.city || "",
        state: updateData.address.state || updateData.state || "",
        country: updateData.address.country || updateData.country || "",
        postalCode: updateData.address.postalCode || updateData.postalCode || ""
      };
    }

    // Handle emergency contact update
    if (updateData.emergencyContact || updateData.emergencyContactName) {
      updateFields.emergencyContact = {
        name: updateData.emergencyContact?.name || updateData.emergencyContactName || "",
        phone: updateData.emergencyContact?.phone || updateData.emergencyContactPhone || "",
        relationship: updateData.emergencyContact?.relationship || updateData.emergencyContactRelationship || ""
      };
    }

    // Handle social links update
    if (updateData.socialLinks || updateData.linkedin) {
      updateFields.socialLinks = {
        linkedin: updateData.socialLinks?.linkedin || updateData.linkedin || "",
        twitter: updateData.socialLinks?.twitter || updateData.twitter || "",
        facebook: updateData.socialLinks?.facebook || updateData.facebook || "",
        instagram: updateData.socialLinks?.instagram || updateData.instagram || ""
      };
    }

    // Remove _id from update data to prevent conflicts
    delete updateFields._id;
    delete updateFields.userId;
    delete updateFields.companyId;

    // First check if profile exists in profile collection
    const existingProfile = await collections.profile.findOne({
      userId: userId,
      companyId,
      isDeleted: { $ne: true }
    });

    if (existingProfile) {
      // Update existing profile in profile collection
      const result = await collections.profile.updateOne(
        { userId: userId, companyId, isDeleted: { $ne: true } },
        { $set: updateFields }
      );

      // Return updated profile
      const updatedProfile = await collections.profile.findOne({
        userId: userId,
        companyId
      });

      const processedProfile = {
        ...updatedProfile,
        createdAt: updatedProfile.createdAt ? new Date(updatedProfile.createdAt) : null,
        updatedAt: updatedProfile.updatedAt ? new Date(updatedProfile.updatedAt) : null,
        dateOfBirth: updatedProfile.dateOfBirth ? new Date(updatedProfile.dateOfBirth) : null,
        joiningDate: updatedProfile.joiningDate ? new Date(updatedProfile.joiningDate) : null
      };

      return { done: true, data: processedProfile };
    }

    // FALLBACK: Check if employee exists in employees collection
    const existingEmployee = await collections.employees.findOne({
      clerkUserId: userId,
      companyId,
      isDeleted: { $ne: true }
    });

    if (existingEmployee) {
      console.log("[ProfileService] Updating employee record instead of profile");

      // Convert profile update fields to employee update fields
      const employeeUpdateFields = {
        updatedAt: new Date()
      };

      // Map profile fields to employee fields
      if (updateData.firstName !== undefined) employeeUpdateFields.firstName = updateData.firstName;
      if (updateData.lastName !== undefined) employeeUpdateFields.lastName = updateData.lastName;
      if (updateData.email !== undefined) {
        employeeUpdateFields.email = updateData.email;
        employeeUpdateFields['contact.email'] = updateData.email;
      }
      if (updateData.phone !== undefined) {
        employeeUpdateFields.phone = updateData.phone;
        employeeUpdateFields['contact.phone'] = updateData.phone;
      }
      if (updateData.dateOfBirth !== undefined) employeeUpdateFields.dateOfBirth = updateData.dateOfBirth;
      if (updateData.gender !== undefined) employeeUpdateFields.gender = updateData.gender;
      if (updateData.profilePhoto !== undefined) employeeUpdateFields.profileImage = updateData.profilePhoto;
      if (updateData.employeeId !== undefined) employeeUpdateFields.employeeId = updateData.employeeId;
      if (updateData.department !== undefined) employeeUpdateFields.departmentId = updateData.department;
      if (updateData.designation !== undefined) employeeUpdateFields.designationId = updateData.designation;
      if (updateData.joiningDate !== undefined) employeeUpdateFields.joiningDate = updateData.joiningDate;
      if (updateData.bio !== undefined) employeeUpdateFields.bio = updateData.bio;
      if (updateData.skills !== undefined) employeeUpdateFields.skills = updateData.skills;

      // Handle address update for employee
      if (updateData.address) {
        employeeUpdateFields.address = {
          street: updateData.address.street || "",
          city: updateData.address.city || "",
          state: updateData.address.state || "",
          country: updateData.address.country || "",
          postalCode: updateData.address.postalCode || ""
        };
      }

      // Handle emergency contact for employee
      if (updateData.emergencyContact) {
        employeeUpdateFields.emergencyContact = {
          name: updateData.emergencyContact.name || "",
          phone: updateData.emergencyContact.phone || "",
          relationship: updateData.emergencyContact.relationship || ""
        };
      }

      // Handle social profiles for employee
      if (updateData.socialLinks) {
        employeeUpdateFields.socialProfiles = {
          linkedin: updateData.socialLinks.linkedin || "",
          twitter: updateData.socialLinks.twitter || "",
          facebook: updateData.socialLinks.facebook || "",
          instagram: updateData.socialLinks.instagram || ""
        };
      }

      // Update employee record
      await collections.employees.updateOne(
        { clerkUserId: userId, companyId, isDeleted: { $ne: true } },
        { $set: employeeUpdateFields }
      );

      // Get updated employee and convert to profile format
      const updatedEmployee = await collections.employees.findOne({
        clerkUserId: userId,
        companyId
      });

      // Convert employee to profile format for response
      const processedProfile = {
        _id: updatedEmployee._id,
        userId: updatedEmployee.clerkUserId,
        companyId: updatedEmployee.companyId || companyId,
        firstName: updatedEmployee.firstName || '',
        lastName: updatedEmployee.lastName || '',
        email: updatedEmployee.email || updatedEmployee.contact?.email || '',
        phone: updatedEmployee.phone || updatedEmployee.contact?.phone || '',
        dateOfBirth: updatedEmployee.dateOfBirth ? new Date(updatedEmployee.dateOfBirth) : null,
        gender: updatedEmployee.gender || '',
        profilePhoto: updatedEmployee.profileImage || '',
        employeeId: updatedEmployee.employeeId || '',
        department: updatedEmployee.department?.department || updatedEmployee.departmentId || '',
        designation: updatedEmployee.designation?.designation || updatedEmployee.designationId || '',
        joiningDate: updatedEmployee.joiningDate ? new Date(updatedEmployee.joiningDate) : null,
        role: updatedEmployee.role || updatedEmployee.account?.role || 'employee',
        status: updatedEmployee.status || 'Active',
        address: {
          street: updatedEmployee.address?.street || '',
          city: updatedEmployee.address?.city || '',
          state: updatedEmployee.address?.state || '',
          country: updatedEmployee.address?.country || '',
          postalCode: updatedEmployee.address?.postalCode || ''
        },
        emergencyContact: {
          name: updatedEmployee.emergencyContact?.name || '',
          phone: updatedEmployee.emergencyContact?.phone || '',
          relationship: updatedEmployee.emergencyContact?.relationship || ''
        },
        socialLinks: {
          linkedin: updatedEmployee.socialProfiles?.linkedin || '',
          twitter: updatedEmployee.socialProfiles?.twitter || '',
          facebook: updatedEmployee.socialProfiles?.facebook || '',
          instagram: updatedEmployee.socialProfiles?.instagram || ''
        },
        skills: updatedEmployee.skills || [],
        bio: updatedEmployee.bio || '',
        createdAt: updatedEmployee.createdAt ? new Date(updatedEmployee.createdAt) : null,
        updatedAt: updatedEmployee.updatedAt ? new Date(updatedEmployee.updatedAt) : null,
        isDeleted: updatedEmployee.isDeleted || false
      };

      return { done: true, data: processedProfile };
    }

    // If neither exists, create new profile in profile collection
    console.log("[ProfileService] No existing profile or employee found, creating new profile");
    const newProfile = {
      userId: userId,
      companyId: companyId,
      ...updateFields,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false
    };

    const result = await collections.profile.insertOne(newProfile);

    const processedProfile = {
      ...newProfile,
      _id: result.insertedId,
      createdAt: newProfile.createdAt ? new Date(newProfile.createdAt) : null,
      updatedAt: newProfile.updatedAt ? new Date(newProfile.updatedAt) : null,
      dateOfBirth: newProfile.dateOfBirth ? new Date(newProfile.dateOfBirth) : null,
      joiningDate: newProfile.joiningDate ? new Date(newProfile.joiningDate) : null
    };

    return { done: true, data: processedProfile };
  } catch (error) {
    console.error("[ProfileService] Error in updateCurrentUserProfile", {
      error: error.message
    });
    return { done: false, error: error.message };
  }
};

// Delete profile (soft delete)
export const deleteProfile = async (companyId, profileId) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[ProfileService] deleteProfile", { companyId, profileId });

    if (!ObjectId.isValid(profileId)) {
      return { done: false, error: "Invalid profile ID format" };
    }

    const result = await collections.profile.updateOne(
      { _id: new ObjectId(profileId), companyId, isDeleted: { $ne: true } },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return { done: false, error: "Profile not found" };
    }

    return { done: true, data: { _id: profileId, deleted: true } };
  } catch (error) {
    console.error("[ProfileService] Error in deleteProfile", {
      error: error.message
    });
    return { done: false, error: error.message };
  }
};

// Get profile statistics
export const getProfileStats = async (companyId) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[ProfileService] getProfileStats", { companyId });

    const totalProfiles = await collections.profile.countDocuments({
      companyId,
      isDeleted: { $ne: true }
    });

    const activeProfiles = await collections.profile.countDocuments({
      companyId,
      isDeleted: { $ne: true },
      status: "Active"
    });

    const inactiveProfiles = await collections.profile.countDocuments({
      companyId,
      isDeleted: { $ne: true },
      status: "Inactive"
    });

    // New profiles in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newProfiles = await collections.profile.countDocuments({
      companyId,
      isDeleted: { $ne: true },
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Department stats
    const departmentStats = await collections.profile.aggregate([
      {
        $match: {
          companyId,
          isDeleted: { $ne: true }
        }
      },
      {
        $group: {
          _id: "$department",
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]).toArray();

    // Role stats
    const roleStats = await collections.profile.aggregate([
      {
        $match: {
          companyId,
          isDeleted: { $ne: true }
        }
      },
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]).toArray();

    const stats = {
      totalProfiles,
      activeProfiles,
      inactiveProfiles,
      newProfiles,
      byDepartment: departmentStats,
      byRole: roleStats
    };

    console.log("[ProfileService] Profile stats", stats);
    return { done: true, data: stats };
  } catch (error) {
    console.error("[ProfileService] Error in getProfileStats", {
      error: error.message
    });
    return { done: false, error: error.message };
  }
};

// Change password
export const changePassword = async (companyId, userId, passwordData) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[ProfileService] changePassword", { companyId, userId });

    // This would typically hash the password before storing
    // For now, we'll just store it as is (in production, use bcrypt)
    const updateFields = {
      password: passwordData.newPassword, // Should be hashed
      updatedAt: new Date(),
      passwordChangedAt: new Date()
    };

    const result = await collections.profile.updateOne(
      { userId: userId, companyId, isDeleted: { $ne: true } },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return { done: false, error: "Profile not found" };
    }

    return { done: true, data: { message: "Password changed successfully" } };
  } catch (error) {
    console.error("[ProfileService] Error in changePassword", {
      error: error.message
    });
    return { done: false, error: error.message };
  }
};

// Export profiles as PDF
export const exportProfilesPDF = async (companyId) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[ProfileService] exportProfilesPDF", { companyId });

    const profiles = await collections.profile.find({
      companyId,
      isDeleted: { $ne: true }
    }).sort({ createdAt: -1 }).toArray();

    const doc = new PDFDocument();
    const fileName = `profiles_${companyId}_${Date.now()}.pdf`;
    const tempDir = path.join(process.cwd(), "temp");
    const filePath = path.join(tempDir, fileName);

    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    doc.pipe(fs.createWriteStream(filePath));

    // Add company header
    doc.fontSize(16).text("Profiles Report", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Generated on: ${format(new Date(), "PPP")}`, { align: "right" });
    doc.moveDown();
    doc.text(`Total Profiles: ${profiles.length}`, { align: "right" });
    doc.moveDown();
    doc.moveDown();

    // Add profiles
    profiles.forEach((profile, index) => {
      // Start new page if not first profile and close to bottom of page
      if (index > 0 && doc.y > 700) {
        doc.addPage();
      }

      doc.fontSize(14).text(`Profile ${index + 1}: ${profile.firstName} ${profile.lastName}`);
      doc.fontSize(10);
      doc.text(`Employee ID: ${profile.employeeId || "N/A"}`);
      doc.text(`Email: ${profile.email}`);
      doc.text(`Phone: ${profile.phone || "N/A"}`);
      doc.text(`Department: ${profile.department || "N/A"}`);
      doc.text(`Designation: ${profile.designation || "N/A"}`);
      doc.text(`Role: ${profile.role}`);
      doc.text(`Status: ${profile.status}`);
      doc.text(`Joining Date: ${profile.joiningDate ? format(new Date(profile.joiningDate), "PPP") : "N/A"}`);

      if (profile.address && (profile.address.street || profile.address.city)) {
        doc.moveDown();
        doc.text("Address:", { underline: true });
        const addressParts = [
          profile.address.street,
          profile.address.city,
          profile.address.state,
          profile.address.country,
          profile.address.postalCode
        ].filter(Boolean);
        doc.text(addressParts.join(", "));
      }

      if (profile.skills && profile.skills.length > 0) {
        doc.moveDown();
        doc.text("Skills:", { underline: true });
        doc.text(profile.skills.join(", "));
      }

      if (profile.bio) {
        doc.moveDown();
        doc.text("Bio:", { underline: true });
        doc.text(profile.bio);
      }

      doc.moveDown();
      doc.moveDown();
    });

    doc.end();

    console.log("[ProfileService] PDF generation completed", { filePath });

    const frontendUrl = process.env.FRONTEND_URL + `/temp/${fileName}`;

    return {
      done: true,
      data: {
        pdfPath: filePath,
        pdfUrl: frontendUrl
      }
    };
  } catch (error) {
    console.error("[ProfileService] Error in exportProfilesPDF", { error: error.message });
    return { done: false, error: error.message };
  }
};

// Export profiles as Excel
export const exportProfilesExcel = async (companyId) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[ProfileService] exportProfilesExcel", { companyId });

    const profiles = await collections.profile.find({
      companyId,
      isDeleted: { $ne: true }
    }).sort({ createdAt: -1 }).toArray();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Profiles");

    // Define columns
    worksheet.columns = [
      { header: "Employee ID", key: "employeeId", width: 15 },
      { header: "First Name", key: "firstName", width: 20 },
      { header: "Last Name", key: "lastName", width: 20 },
      { header: "Email", key: "email", width: 30 },
      { header: "Phone", key: "phone", width: 15 },
      { header: "Department", key: "department", width: 20 },
      { header: "Designation", key: "designation", width: 20 },
      { header: "Role", key: "role", width: 15 },
      { header: "Status", key: "status", width: 10 },
      { header: "Joining Date", key: "joiningDate", width: 15 },
      { header: "Address", key: "address", width: 40 },
      { header: "Skills", key: "skills", width: 40 },
      { header: "Created Date", key: "createdDate", width: 20 }
    ];

    // Add profile data
    profiles.forEach(profile => {
      const addressParts = profile.address ? [
        profile.address.street,
        profile.address.city,
        profile.address.state,
        profile.address.country,
        profile.address.postalCode
      ].filter(Boolean) : [];

      worksheet.addRow({
        employeeId: profile.employeeId || "",
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        phone: profile.phone || "",
        department: profile.department || "",
        designation: profile.designation || "",
        role: profile.role,
        status: profile.status,
        joiningDate: profile.joiningDate ? format(new Date(profile.joiningDate), "PPP") : "",
        address: addressParts.join(", "),
        skills: profile.skills ? profile.skills.join(", ") : "",
        createdDate: format(new Date(profile.createdAt), "PPP")
      });
    });

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE9ECEF" }
    };

    // Add borders to all cells
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" }
        };
      });
    });

    // Save workbook
    const fileName = `profiles_${companyId}_${Date.now()}.xlsx`;
    const tempDir = path.join(process.cwd(), "temp");
    const filePath = path.join(tempDir, fileName);

    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    await workbook.xlsx.writeFile(filePath);

    console.log("[ProfileService] Excel generation completed", { filePath });

    const frontendUrl = process.env.FRONTEND_URL + `/temp/${fileName}`;

    return {
      done: true,
      data: {
        excelPath: filePath,
        excelUrl: frontendUrl,
        totalProfiles: profiles.length
      }
    };
  } catch (error) {
    console.error("[ProfileService] Error in exportProfilesExcel", { error: error.message });
    return { done: false, error: error.message };
  }
};