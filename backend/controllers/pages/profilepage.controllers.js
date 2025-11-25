import * as profileService from "../../services/pages/profilepage.services.js";

const profileController = (socket, io) => {
  // Helper to validate company access (pattern from admin.controller.js)
  const validateCompanyAccess = (socket) => {
    if (!socket.companyId) {
      console.error("[Profile] Company ID not found in user metadata", { user: socket.user?.sub });
      throw new Error("Company ID not found in user metadata");
    }

    const companyIdRegex = /^[a-zA-Z0-9_-]{3,50}$/;
    if (!companyIdRegex.test(socket.companyId)) {
      console.error(`[Profile] Invalid company ID format: ${socket.companyId}`);
      throw new Error("Invalid company ID format");
    }

    if (socket.userMetadata?.companyId !== socket.companyId) {
      console.error(`[Profile] Company ID mismatch: user metadata has ${socket.userMetadata?.companyId}, socket has ${socket.companyId}`);
      throw new Error("Unauthorized: Company ID mismatch");
    }

    return socket.companyId;
  };

  // Allow admin and HR roles for management operations
  const isAuthorized = socket.userMetadata?.role === "admin" || socket.userMetadata?.role === "hr";
  const isAdmin = socket.userMetadata?.role === "admin";

  // CREATE profile - admin and HR
  socket.on("profile:create", async (data) => {
    try {
      console.log("[Profile] profile:create event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, data });
      
      if (!isAuthorized) throw new Error("Unauthorized: Admin or HR role required");

      const companyId = validateCompanyAccess(socket);

      // Validate required fields
      if (!data.firstName || !data.lastName || !data.email) {
        throw new Error("First name, last name, and email are required");
      }

      // Always include companyId in the profile data
      const result = await profileService.createProfile(companyId, { ...data, companyId });

      if (!result.done) {
        console.error("[Profile] Failed to create profile, error:", result.error);
      }

      socket.emit("profile:create-response", result);

      // Broadcast to admin and HR rooms to update profile lists
      io.to(`admin_room_${companyId}`).emit("profile:profile-created", result);
      io.to(`hr_room_${companyId}`).emit("profile:profile-created", result);

    } catch (error) {
      console.error("[Profile] Error in profile:create", { error: error.message });
      socket.emit("profile:create-response", { done: false, error: error.message });
    }
  });

  // GET all profiles - admin and HR
  socket.on("profile:getAll", async (filters = {}) => {
    try {
      console.log("[Profile] profile:getAll event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, filters });
      
      if (!isAuthorized) throw new Error("Unauthorized: Admin or HR role required");

      const companyId = validateCompanyAccess(socket);
      const result = await profileService.getProfiles(companyId, filters);

      if (!result.done) {
        console.error("[Profile] Failed to get profiles, error:", result.error);
      }

      socket.emit("profile:getAll-response", result);

    } catch (error) {
      console.error("[Profile] Error in profile:getAll", { error: error.message });
      socket.emit("profile:getAll-response", { done: false, error: error.message });
    }
  });

  // GET single profile by ID - admin and HR
  socket.on("profile:getById", async (profileId) => {
    try {
      console.log("[Profile] profile:getById event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, profileId });
      
      if (!isAuthorized) throw new Error("Unauthorized: Admin or HR role required");

      const companyId = validateCompanyAccess(socket);
      const result = await profileService.getProfileById(companyId, profileId);

      if (!result.done) {
        console.error("[Profile] Failed to get profile, error:", result.error);
      }

      socket.emit("profile:getById-response", result);

    } catch (error) {
      console.error("[Profile] Error in profile:getById", { error: error.message });
      socket.emit("profile:getById-response", { done: false, error: error.message });
    }
  });

  // GET current user profile - accessible by all authenticated users
  socket.on("profile:getCurrentUser", async () => {
    try {
      console.log("[Profile] profile:getCurrentUser event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId });

      const companyId = validateCompanyAccess(socket);
      const userId = socket.user?.sub;

      if (!userId) {
        throw new Error("User ID not found");
      }

      const result = await profileService.getCurrentUserProfile(companyId, userId);

      if (!result.done) {
        console.error("[Profile] Failed to get current user profile, error:", result.error);
      }

      socket.emit("profile:getCurrentUser-response", result);

    } catch (error) {
      console.error("[Profile] Error in profile:getCurrentUser", { error: error.message });
      socket.emit("profile:getCurrentUser-response", { done: false, error: error.message });
    }
  });

  // UPDATE profile - admin and HR
  socket.on("profile:update", async (data) => {
    try {
      console.log("[Profile] profile:update event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, data });
      
      if (!isAuthorized) throw new Error("Unauthorized: Admin or HR role required");

      const companyId = validateCompanyAccess(socket);

      if (!data._id) {
        throw new Error("Profile ID is required for update");
      }

      const result = await profileService.updateProfile(companyId, data._id, data);

      if (!result.done) {
        console.error("[Profile] Failed to update profile, error:", result.error);
      }

      socket.emit("profile:update-response", result);

      // Broadcast to admin and HR rooms to update profile lists
      io.to(`admin_room_${companyId}`).emit("profile:profile-updated", result);
      io.to(`hr_room_${companyId}`).emit("profile:profile-updated", result);

    } catch (error) {
      console.error("[Profile] Error in profile:update", { error: error.message });
      socket.emit("profile:update-response", { done: false, error: error.message });
    }
  });

  // UPDATE current user profile - accessible by all authenticated users
  socket.on("profile:updateCurrentUser", async (data) => {
    try {
      console.log("[Profile] profile:updateCurrentUser event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, data });

      const companyId = validateCompanyAccess(socket);
      const userId = socket.user?.sub;

      if (!userId) {
        throw new Error("User ID not found");
      }

      const result = await profileService.updateCurrentUserProfile(companyId, userId, data);

      if (!result.done) {
        console.error("[Profile] Failed to update current user profile, error:", result.error);
      }

      socket.emit("profile:updateCurrentUser-response", result);

      // Broadcast to admin and HR rooms that a profile was updated
      io.to(`admin_room_${companyId}`).emit("profile:profile-updated", result);
      io.to(`hr_room_${companyId}`).emit("profile:profile-updated", result);

    } catch (error) {
      console.error("[Profile] Error in profile:updateCurrentUser", { error: error.message });
      socket.emit("profile:updateCurrentUser-response", { done: false, error: error.message });
    }
  });

  // DELETE profile - admin only
  socket.on("profile:delete", async (profileId) => {
    try {
      console.log("[Profile] profile:delete event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, profileId });
      
      if (!isAdmin) throw new Error("Unauthorized: Only admin can delete profiles");

      const companyId = validateCompanyAccess(socket);
      const result = await profileService.deleteProfile(companyId, profileId);

      if (!result.done) {
        console.error("[Profile] Failed to delete profile, error:", result.error);
      }

      socket.emit("profile:delete-response", result);

      // Broadcast to admin and HR rooms to update profile lists
      io.to(`admin_room_${companyId}`).emit("profile:profile-deleted", result);
      io.to(`hr_room_${companyId}`).emit("profile:profile-deleted", result);

    } catch (error) {
      console.error("[Profile] Error in profile:delete", { error: error.message });
      socket.emit("profile:delete-response", { done: false, error: error.message });
    }
  });

  // Get all profile data at once (for dashboard) - admin and HR
  socket.on("profile:getAllData", async (filters = {}) => {
    try {
      console.log("[Profile] profile:getAllData event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, filters });
      
      if (!isAuthorized) throw new Error("Unauthorized: Admin or HR role required");

      const companyId = validateCompanyAccess(socket);

      const [profiles, stats] = await Promise.all([
        profileService.getProfiles(companyId, filters),
        profileService.getProfileStats(companyId)
      ]);

      const response = {
        done: true,
        data: {
          profiles: profiles.data || [],
          stats: stats.data || {}
        }
      };

      socket.emit("profile:getAllData-response", response);

    } catch (error) {
      console.error("[Profile] Error in profile:getAllData", { error: error.message });
      socket.emit("profile:getAllData-response", { done: false, error: error.message });
    }
  });

  // Get profile statistics - admin and HR
  socket.on("profile:getStats", async () => {
    try {
      console.log("[Profile] profile:getStats event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId });
      
      if (!isAuthorized) throw new Error("Unauthorized: Admin or HR role required");

      const companyId = validateCompanyAccess(socket);
      const result = await profileService.getProfileStats(companyId);

      if (!result.done) {
        throw new Error(result.error);
      }

      socket.emit("profile:getStats-response", result);

    } catch (error) {
      console.error("[Profile] Error in profile:getStats", { error: error.message });
      socket.emit("profile:getStats-response", { done: false, error: error.message });
    }
  });

  // Change password - accessible by all authenticated users
  socket.on("profile:changePassword", async (passwordData) => {
    try {
      console.log("[Profile] profile:changePassword event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId });

      const companyId = validateCompanyAccess(socket);
      const userId = socket.user?.sub;

      if (!userId) {
        throw new Error("User ID not found");
      }

      if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
        throw new Error("All password fields are required");
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error("New password and confirm password do not match");
      }

      const result = await profileService.changePassword(companyId, userId, passwordData);

      if (!result.done) {
        console.error("[Profile] Failed to change password, error:", result.error);
      }

      socket.emit("profile:changePassword-response", result);

    } catch (error) {
      console.error("[Profile] Error in profile:changePassword", { error: error.message });
      socket.emit("profile:changePassword-response", { done: false, error: error.message });
    }
  });

  // Export profiles as PDF - admin and HR
  socket.on("profile:export-pdf", async () => {
    try {
      console.log("[Profile] profile:export-pdf event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId });
      
      if (!isAuthorized) throw new Error("Unauthorized: Admin or HR role required");

      const companyId = validateCompanyAccess(socket);
      const result = await profileService.exportProfilesPDF(companyId);

      socket.emit("profile:export-pdf-response", result);

    } catch (error) {
      console.error("[Profile] Error in profile:export-pdf", { error: error.message });
      socket.emit("profile:export-pdf-response", { done: false, error: error.message });
    }
  });

  // Export profiles as Excel - admin and HR
  socket.on("profile:export-excel", async () => {
    try {
      console.log("[Profile] profile:export-excel event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId });
      
      if (!isAuthorized) throw new Error("Unauthorized: Admin or HR role required");

      const companyId = validateCompanyAccess(socket);
      const result = await profileService.exportProfilesExcel(companyId);

      socket.emit("profile:export-excel-response", result);

    } catch (error) {
      console.error("[Profile] Error in profile:export-excel", { error: error.message });
      socket.emit("profile:export-excel-response", { done: false, error: error.message });
    }
  });
};

export default profileController;