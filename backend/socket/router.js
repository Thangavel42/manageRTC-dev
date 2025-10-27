import superAdminController from "../controllers/superadmin/superadmin.controller.js";
import adminController from "../controllers/admin/admin.controller.js";
import leadController from "../controllers/lead/lead.controller.js";
import pipelineController from "../controllers/pipeline/pipeline.controllers.js";
import hrDashboardController from "../controllers/hr/hr.controller.js";
import clientController from "../controllers/client/client.controllers.js";
import activityController from "../controllers/activities/activities.controllers.js";
import { ChatController } from "../controllers/chat/chat.controller.js";
import { ChatUsersController } from "../controllers/chat/users.controller.js";
import userSocketController from "../controllers/user/user.socket.controller.js";
import socialFeedSocketController from "../controllers/socialfeed/socialFeed.socket.controller.js";
import employeeController from "../controllers/employee/employee.controller.js";
import notesController from "../controllers/employee/notes.controller.js";
import ticketsSocketController from "../controllers/tickets/tickets.socket.controller.js";

import jobsController from "../controllers/jobs/jobs.controllers.js";
import candidateController from "../controllers/candidates/candidates.controllers.js";
import trainersController from "../controllers/hr/trainers.controller.js";
import goalTypeController from "../controllers/performance/goalType.controller.js";
import goalTrackingController from "../controllers/performance/goalTracking.controller.js";
import jobController from "../controllers/jobs/jobs.controllers.js";
import employeeController from "../controllers/employee/employee.controller.js";
import profileController from "../controllers/pages/profilepage.controllers.js";



import performanceIndicatorController from "../controllers/performance/performanceIndicator.controller.js";
import performanceAppraisalController from "../controllers/performance/performanceAppraisal.controller.js";
import performanceReviewController from "../controllers/performance/performanceReview.controller.js";


const router = (socket, io, role) => {
  console.log(`Setting up socket router for role: ${role}`);
  console.log(`Socket data:`, {
    id: socket.id,
    role: socket.role,
    companyId: socket.companyId,
    userMetadata: socket.userMetadata,
  });

  // Initialize chat controller for all authenticated users
  if (socket.companyId) {
    console.log("Attaching chat controller...");
    new ChatController(socket, io);
    new ChatUsersController(socket, io);
  }

  switch (role) {
    case "superadmin":
      console.log("Attaching superadmin controller...");
      superAdminController(socket, io);
      console.log("Attaching social feed controller for superadmin...");
      socialFeedSocketController(socket, io);
      break;

    case "guest":
      console.log("Attaching social feed controller for guest...");
      socialFeedSocketController(socket, io);
      break;

    case "admin":
      console.log("Attaching HR controller...");
      hrDashboardController(socket, io);
      console.log("Attaching admin controller...");
      adminController(socket, io);
      console.log("Attaching lead controller for admin...");
      leadController(socket, io);
      console.log("Attaching client controller for admin...");
      clientController(socket, io);
      console.log("Attaching activity controller for admin...");
      activityController(socket, io);
      userSocketController(socket, io);
      console.log("Attaching social feed controller for admin...");
      socialFeedSocketController(socket, io);

      
      // Pipelines JS
      pipelineController(socket, io);
      console.log("Attaching pipeline controller for admin...");
      console.log("Attaching candidate controller for admin...");
      candidateController(socket, io);
      console.log("Attaching job controller for admin...");
      jobController(socket, io);

      // Initialize profile controller for all authenticated users
  console.log("Attaching profile controller...");
  profileController(socket, io);
      console.log("Attaching admin notes controller...");
      notesController(socket, io);
      console.log("Attaching tickets controller for admin...");
      ticketsSocketController(socket, io);
      console.log("Attaching candidate controller for admin...");
      candidateController(socket, io);
      console.log("Attaching jobsController for admin...");
      jobsController(socket, io);



      performanceIndicatorController(socket, io);
      performanceAppraisalController(socket, io);
      performanceReviewController(socket, io);
      // Performance Management Controllers
      console.log("Attaching performance controllers for admin...");
      goalTypeController(socket, io);
      goalTrackingController(socket, io);
      break;


    case "hr":
      console.log("Attaching HR controller...");
      hrDashboardController(socket, io);
      console.log("Attaching lead controller for hr...");
      leadController(socket, io);
      console.log("Attaching client controller for hr...");
      clientController(socket, io);
      console.log("Attaching activity controller for hr...");
      activityController(socket, io);
      userSocketController(socket, io);
      console.log("Attaching social feed controller for hr...");
      socialFeedSocketController(socket, io);
      console.log("Attaching pipeline controller for hr...");
      pipelineController(socket, io);
      console.log("Attaching hr notes controller...");
      notesController(socket, io);
      console.log("Attaching tickets controller for hr...");
      ticketsSocketController(socket, io);
      console.log("Attaching jobs controller for hr...");
      jobsController(socket, io);
      console.log("Attaching candidate controller for hr...");
      candidateController(socket, io);



      performanceIndicatorController(socket, io);
      performanceAppraisalController(socket, io);
      performanceReviewController(socket, io);
      // Performance Management Controllers
      console.log("Attaching performance controllers for hr...");
      goalTypeController(socket, io);
      goalTrackingController(socket, io);
      console.log("Attaching job controller for hr...");
      jobController(socket, io);

      // Initialize profile controller for all authenticated users
  console.log("Attaching profile controller...");
  profileController(socket, io);
      break;

    case "leads":
      console.log("Attaching leads controller...");
      leadController(socket, io);
      userSocketController(socket, io);
      console.log("Attaching social feed controller for leads...");
      socialFeedSocketController(socket, io);
      break;

    case "employee":
      console.log("Attaching Employee controller...");
      employeeController(socket, io);
      break;

    default:
      console.log(
        `No controller available for role: ${role}, attaching basic social feed for public access`
      );
      socialFeedSocketController(socket, io);
      break;
  }

  socket.onAny((event, data) => {
    console.log(`[${socket.id}][${role}] Event: ${event}`);
  });
};

export default router;