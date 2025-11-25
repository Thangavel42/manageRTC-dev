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
export const getCurrentUserProfile = async (companyId, userId) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[ProfileService] getCurrentUserProfile", { companyId, userId });

    const profile = await collections.profile.findOne({
      userId: userId,
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

    const result = await collections.profile.updateOne(
      { userId: userId, companyId, isDeleted: { $ne: true } },
      { $set: updateFields },
      { upsert: true } // Create if doesn't exist
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