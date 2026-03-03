/**
 * Employee Dashboard REST Routes
 * GET  /api/employee/dashboard               — all data in one shot
 * GET  /api/employee/dashboard/attendance-stats
 * GET  /api/employee/dashboard/leave-stats
 * GET  /api/employee/dashboard/working-hours
 * GET  /api/employee/dashboard/projects
 * GET  /api/employee/dashboard/tasks
 * PATCH /api/employee/dashboard/tasks/:taskId
 * GET  /api/employee/dashboard/performance
 * GET  /api/employee/dashboard/skills
 * GET  /api/employee/dashboard/meetings
 * POST /api/employee/dashboard/punch-in
 * POST /api/employee/dashboard/punch-out
 * POST /api/employee/dashboard/start-break
 * POST /api/employee/dashboard/end-break
 */

import express from 'express';
import { authenticate } from '../../middleware/auth.js';
import * as ctrl from '../../controllers/rest/employeeDashboard.controller.js';

const router = express.Router();

// All routes require a valid Clerk JWT — role can be employee, hr, admin, manager
router.use(authenticate);

router.get('/',                  ctrl.getDashboardData);
router.get('/attendance-stats',  ctrl.getAttendanceStats);
router.get('/leave-stats',       ctrl.getLeaveStats);
router.get('/working-hours',     ctrl.getWorkingHoursStats);
router.get('/projects',          ctrl.getProjects);
router.get('/tasks',             ctrl.getTasks);
router.patch('/tasks/:taskId',   ctrl.updateTask);
router.get('/performance',       ctrl.getPerformance);
router.get('/skills',            ctrl.getSkills);
router.get('/meetings',          ctrl.getMeetings);
router.post('/punch-in',         ctrl.punchIn);
router.post('/punch-out',        ctrl.punchOut);
router.post('/start-break',      ctrl.startBreak);
router.post('/end-break',        ctrl.endBreak);

export default router;
