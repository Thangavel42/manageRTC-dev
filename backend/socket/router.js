import activityController from '../controllers/activities/activities.controllers.js';
import adminController from '../controllers/admin/admin.controller.js';
import { ChatController } from '../controllers/chat/chat.controller.js';
import { ChatUsersController } from '../controllers/chat/users.controller.js';
import employeeController from '../controllers/employee/employee.controller.js';
import notesController from '../controllers/employee/notes.controller.js';
import hrDashboardController from '../controllers/hr/hr.controller.js';
import kanbanController from '../controllers/kaban/kaban.controller.js';
import leadController from '../controllers/lead/lead.controller.js';
import pipelineController from '../controllers/pipeline/pipeline.controllers.js';
import projectController from '../controllers/project/project.controller.js';
import projectNotesController from '../controllers/project/project.notes.controller.js';
import socialFeedSocketController from '../controllers/socialfeed/socialFeed.socket.controller.js';
import superAdminController from '../controllers/superadmin/superadmin.controller.js';
import taskController from '../controllers/task/task.controller.js';
import ticketsSocketController from '../controllers/tickets/tickets.socket.controller.js';
import userSocketController from '../controllers/user/user.socket.controller.js';

import candidateController from '../controllers/candidates/candidates.controllers.js';
import trainersController from '../controllers/hr/trainers.controller.js';
import trainingListController from '../controllers/hr/trainingList.controller.js';
import trainingTypesController from '../controllers/hr/trainingTypes.controller.js';
import {
  default as jobController,
  default as jobsController,
} from '../controllers/jobs/jobs.controllers.js';
import profileController from '../controllers/pages/profilepage.controllers.js';
import goalTrackingController from '../controllers/performance/goalTracking.controller.js';
import goalTypeController from '../controllers/performance/goalType.controller.js';

import performanceAppraisalController from '../controllers/performance/performanceAppraisal.controller.js';
import performanceIndicatorController from '../controllers/performance/performanceIndicator.controller.js';
import performanceReviewController from '../controllers/performance/performanceReview.controller.js';
import promotionController from '../controllers/performance/promotion.controller.js';

const router = (socket, io, role) => {
  if (socket.companyId) {
    new ChatController(socket, io);
    new ChatUsersController(socket, io);
  }

  switch (role) {
    case 'superadmin':
      superAdminController(socket, io);
      socialFeedSocketController(socket, io);
      break;

    case 'guest':
      socialFeedSocketController(socket, io);
      break;

    case 'admin':
      hrDashboardController(socket, io);
      adminController(socket, io);
      leadController(socket, io);
      activityController(socket, io);
      projectController(socket, io);
      taskController(socket, io);
      projectNotesController(socket, io);
      userSocketController(socket, io);
      socialFeedSocketController(socket, io);
      kanbanController(socket, io);

      pipelineController(socket, io);
      candidateController(socket, io);
      jobController(socket, io);
      profileController(socket, io);
      notesController(socket, io);
      ticketsSocketController(socket, io);
      candidateController(socket, io);
      jobsController(socket, io);
      trainersController(socket, io);
      trainingTypesController(socket, io);
      trainingListController(socket, io);

      performanceIndicatorController(socket, io);
      performanceAppraisalController(socket, io);
      performanceReviewController(socket, io);
      goalTypeController(socket, io);
      goalTrackingController(socket, io);
      promotionController(socket, io);
      break;

    case 'hr':
      hrDashboardController(socket, io);
      leadController(socket, io);
      activityController(socket, io);
      projectController(socket, io);
      taskController(socket, io);
      projectNotesController(socket, io);
      userSocketController(socket, io);
      socialFeedSocketController(socket, io);
      pipelineController(socket, io);
      notesController(socket, io);
      ticketsSocketController(socket, io);
      jobsController(socket, io);
      candidateController(socket, io);
      kanbanController(socket, io);

      performanceIndicatorController(socket, io);
      performanceAppraisalController(socket, io);
      performanceReviewController(socket, io);
      goalTypeController(socket, io);
      goalTrackingController(socket, io);
      promotionController(socket, io);
      jobController(socket, io);
      trainersController(socket, io);
      trainingTypesController(socket, io);
      trainingListController(socket, io);
      profileController(socket, io);
      break;

    case 'manager':
      hrDashboardController(socket, io);
      leadController(socket, io);
      activityController(socket, io);
      projectController(socket, io);
      taskController(socket, io);
      projectNotesController(socket, io);
      userSocketController(socket, io);
      socialFeedSocketController(socket, io);
      kanbanController(socket, io);
      pipelineController(socket, io);
      notesController(socket, io);
      ticketsSocketController(socket, io);
      profileController(socket, io);

      performanceIndicatorController(socket, io);
      performanceAppraisalController(socket, io);
      performanceReviewController(socket, io);
      goalTypeController(socket, io);
      goalTrackingController(socket, io);
      promotionController(socket, io);
      break;

    case 'leads':
      leadController(socket, io);
      userSocketController(socket, io);
      socialFeedSocketController(socket, io);
      kanbanController(socket, io);
      break;

    case 'employee':
      employeeController(socket, io);
      projectController(socket, io);
      profileController(socket, io);
      break;

    default:
      socialFeedSocketController(socket, io);
      break;
  }
};

export default router;
