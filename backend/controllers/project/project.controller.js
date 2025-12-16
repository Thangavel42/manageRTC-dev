import * as projectService from "../../services/project/project.services.js";

const projectController = (socket, io) => {
  
  const validateCompanyAccess = (socket) => {
    if (!socket.companyId) {
      console.error("[Project] Company ID not found in user metadata", { user: socket.user?.sub });
      throw new Error("Company ID not found in user metadata");
    }
    const companyIdRegex = /^[a-zA-Z0-9_-]{3,50}$/;
    if (!companyIdRegex.test(socket.companyId)) {
      console.error(`[Project] Invalid company ID format: ${socket.companyId}`);
      throw new Error("Invalid company ID format");
    }
    if (socket.userMetadata?.companyId !== socket.companyId) {
      console.error(`[Project] Company ID mismatch: user metadata has ${socket.userMetadata?.companyId}, socket has ${socket.companyId}`);
      throw new Error("Unauthorized: Company ID mismatch");
    }
    return socket.companyId;
  };

  
  const isAuthorized = socket.userMetadata?.role === "admin" || socket.userMetadata?.role === "hr";
  console.log("[Project] Authorization check", { role: socket.userMetadata?.role, isAuthorized });

  
  socket.on("project:create", async (data) => {
    try {
      console.log("[Project] project:create event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, data });
      if (!isAuthorized) throw new Error("Unauthorized: Admin or HR only");
      const companyId = validateCompanyAccess(socket);

      
      if (!data.name || !data.client) {
        throw new Error("Name and client are required");
      }

      
      const result = await projectService.createProject(companyId, { ...data, companyId });
      if (!result.done) {
        console.error("[Project] Failed to create project", { error: result.error });
      }
      socket.emit("project:create-response", result);

      
      io.to(`company_${companyId}`).emit("project:project-created", result);
    } catch (error) {
      console.error("[Project] Error in project:create", { error: error.message });
      socket.emit("project:create-response", { done: false, error: error.message });
    }
  });

  
  socket.on("project:getAll", async (filters = {}) => {
    try {
      console.log("[Project] project:getAll event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, filters });
      const companyId = validateCompanyAccess(socket);
      const result = await projectService.getProjects(companyId, filters);
      if (!result.done) {
        console.error("[Project] Failed to get projects", { error: result.error });
      }
      socket.emit("project:getAll-response", result);
    } catch (error) {
      console.error("[Project] Error in project:getAll", { error: error.message });
      socket.emit("project:getAll-response", { done: false, error: error.message });
    }
  });

  
  socket.on("project:getById", async (projectId) => {
    try {
      console.log("[Project] project:getById event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, projectId });
      const companyId = validateCompanyAccess(socket);
      const result = await projectService.getProjectById(companyId, projectId);
      if (!result.done) {
        console.error("[Project] Failed to get project", { error: result.error });
      }
      socket.emit("project:getById-response", result);
    } catch (error) {
      console.error("[Project] Error in project:getById", { error: error.message });
      socket.emit("project:getById-response", { done: false, error: error.message });
    }
  });

  
  socket.on("project:update", async ({ projectId, update }) => {
    try {
      console.log("[Project] project:update event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, projectId, update });
      if (!isAuthorized) throw new Error("Unauthorized: Admin or HR only");
      const companyId = validateCompanyAccess(socket);
      const result = await projectService.updateProject(companyId, projectId, update);
      if (!result.done) {
        console.error("[Project] Failed to update project", { error: result.error });
      }
      socket.emit("project:update-response", result);

      
      io.to(`company_${companyId}`).emit("project:project-updated", result);
    } catch (error) {
      console.error("[Project] Error in project:update", { error: error.message });
      socket.emit("project:update-response", { done: false, error: error.message });
    }
  });

  
  socket.on("project:delete", async ({ projectId }) => {
    try {
      console.log("[Project] project:delete event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, projectId });
      if (!isAuthorized) throw new Error("Unauthorized: Admin or HR only");
      const companyId = validateCompanyAccess(socket);
      const result = await projectService.deleteProject(companyId, projectId);
      if (!result.done) {
        console.error("[Project] Failed to delete project", { error: result.error });
      }
      socket.emit("project:delete-response", result);

      
      io.to(`company_${companyId}`).emit("project:project-deleted", result);
    } catch (error) {
      console.error("[Project] Error in project:delete", { error: error.message });
      socket.emit("project:delete-response", { done: false, error: error.message });
    }
  });

  
  socket.on("project:getStats", async () => {
    try {
      console.log("[Project] project:getStats event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId });
      const companyId = validateCompanyAccess(socket);
      const result = await projectService.getProjectStats(companyId);
      if (!result.done) {
        console.error("[Project] Failed to get project stats", { error: result.error });
      }
      socket.emit("project:getStats-response", result);
    } catch (error) {
      console.error("[Project] Error in project:getStats", { error: error.message });
      socket.emit("project:getStats-response", { done: false, error: error.message });
    }
  });

  
  socket.on("project:getClients", async () => {
    try {
      console.log("[Project] project:getClients event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId });
      const companyId = validateCompanyAccess(socket);
      const result = await projectService.getProjectClients(companyId);
      if (!result.done) {
        console.error("[Project] Failed to get project clients", { error: result.error });
      }
      socket.emit("project:getClients-response", result);
    } catch (error) {
      console.error("[Project] Error in project:getClients", { error: error.message });
      socket.emit("project:getClients-response", { done: false, error: error.message });
    }
  });

  
  socket.on("project/export-pdf", async () => {
    try {
      console.log("Received project export-pdf request");

      if (!socket.companyId) {
        throw new Error("Company ID not found in user metadata");
      }

      console.log("Generating PDF...");
      const result = await projectService.exportProjectsPDF(socket.companyId);
      console.log("PDF generation result:", result);

      if (result.done) {
        console.log("Sending PDF URL to client:", result.data.pdfUrl);
        socket.emit("project/export-pdf-response", {
          done: true,
          data: {
            pdfUrl: result.data.pdfUrl
          }
        });

        
        setTimeout(() => {
          console.log("Cleaning up PDF file:", result.data.pdfPath);
          
        }, 60 * 60 * 1000);
      } else {
        console.error("PDF generation failed:", result.error);
        socket.emit("project/export-pdf-response", {
          done: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error("Error in project export-pdf handler:", error);
      socket.emit("project/export-pdf-response", {
        done: false,
        error: error.message
      });
    }
  });

  
  socket.on("project/export-excel", async () => {
    try {
      console.log("Received project export-excel request");

      if (!socket.companyId) {
        throw new Error("Company ID not found in user metadata");
      }

      console.log("Generating Excel...");
      const result = await projectService.exportProjectsExcel(socket.companyId);
      console.log("Excel generation result:", result);

      if (result.done) {
        console.log("Sending Excel URL to client:", result.data.excelUrl);
        socket.emit("project/export-excel-response", {
          done: true,
          data: {
            excelUrl: result.data.excelUrl
          }
        });

        
        setTimeout(() => {
          console.log("Cleaning up Excel file:", result.data.excelPath);
          
        }, 60 * 60 * 1000);
      } else {
        console.error("Excel generation failed:", result.error);
        socket.emit("project/export-excel-response", {
          done: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error("Error in project export-excel handler:", error);
      socket.emit("project/export-excel-response", {
        done: false,
        error: error.message
      });
    }
  });

  
  socket.on("project:getAllData", async (filters = {}) => {
    try {
      const companyId = validateCompanyAccess(socket);

      const [projects, stats, clients] = await Promise.all([
        projectService.getProjects(companyId, filters),
        projectService.getProjectStats(companyId),
        projectService.getProjectClients(companyId)
      ]);

      socket.emit("project:getAllData-response", {
        done: true,
        data: {
          projects: projects.data || [],
          stats: stats.data || {},
          clients: clients.data || []
        }
      });
    } catch (error) {
      console.error("[Project] Error in project:getAllData", { error: error.message });
      socket.emit("project:getAllData-response", { done: false, error: error.message });
    }
  });
};

export default projectController;
