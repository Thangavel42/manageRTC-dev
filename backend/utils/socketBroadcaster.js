/**
 * Socket.IO Broadcaster Utility
 * Broadcasts real-time events after REST operations complete
 * This maintains the 80% REST + 20% Socket.IO hybrid architecture
 */

/**
 * Broadcast event to company-wide room
 * @param {Object} io - Socket.IO server instance
 * @param {string} companyId - Company ID
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
export const broadcastToCompany = (io, companyId, event, data) => {
  if (!io || !companyId) return;

  io.to(`company_${companyId}`).emit(event, {
    ...data,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Broadcast event to specific user
 * @param {Object} io - Socket.IO server instance
 * @param {string} userId - User ID
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
export const broadcastToUser = (io, userId, event, data) => {
  if (!io || !userId) return;

  io.to(`user_${userId}`).emit(event, {
    ...data,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Broadcast event to specific room (e.g., project room, department room)
 * @param {Object} io - Socket.IO server instance
 * @param {string} room - Room name
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
export const broadcastToRoom = (io, room, event, data) => {
  if (!io || !room) return;

  io.to(room).emit(event, {
    ...data,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Employee event broadcasters
 */
export const broadcastEmployeeEvents = {
  /**
   * Broadcast employee created event
   */
  created: (io, companyId, employee) => {
    broadcastToCompany(io, companyId, 'employee:created', {
      employeeId: employee.employeeId,
      _id: employee._id,
      name: employee.fullName,
      department: employee.department,
      designation: employee.designation,
      createdBy: employee.createdBy,
    });
  },

  /**
   * Broadcast employee updated event
   */
  updated: (io, companyId, employee) => {
    broadcastToCompany(io, companyId, 'employee:updated', {
      employeeId: employee.employeeId,
      _id: employee._id,
      name: employee.fullName,
      department: employee.department,
      updatedBy: employee.updatedBy,
    });
  },

  /**
   * Broadcast employee deleted event
   */
  deleted: (io, companyId, employeeId, deletedBy) => {
    broadcastToCompany(io, companyId, 'employee:deleted', {
      employeeId,
      deletedBy,
      timestamp: new Date().toISOString(),
    });
  },
};

/**
 * Project event broadcasters
 */
export const broadcastProjectEvents = {
  /**
   * Broadcast project created event
   * Now sends complete project object to match REST API response
   */
  created: (io, companyId, project) => {
    // Send complete project object for consistency with REST API
    const projectObj = project.toObject ? project.toObject() : project;
    broadcastToCompany(io, companyId, 'project:created', {
      ...projectObj,
      isOverdue: project.isOverdue || projectObj.isOverdue,
      timestamp: new Date().toISOString(),
    });

    // Notify team members individually
    if (projectObj.teamMembers && projectObj.teamMembers.length > 0) {
      projectObj.teamMembers.forEach((memberId) => {
        broadcastToUser(io, memberId, 'project:you_joined', {
          projectId: projectObj.projectId,
          _id: projectObj._id,
          name: projectObj.name,
          timestamp: new Date().toISOString(),
        });
      });
    }
  },

  /**
   * Broadcast project updated event
   * Now sends complete project object to match REST API response
   */
  updated: (io, companyId, project) => {
    const projectObj = project.toObject ? project.toObject() : project;
    broadcastToCompany(io, companyId, 'project:updated', {
      ...projectObj,
      isOverdue: project.isOverdue || projectObj.isOverdue,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Broadcast project progress updated event
   * Now sends complete project object for consistency
   */
  progressUpdated: (io, companyId, project) => {
    const projectObj = project.toObject ? project.toObject() : project;
    broadcastToRoom(io, `project_${project._id}`, 'project:progress_updated', {
      ...projectObj,
      isOverdue: project.isOverdue || projectObj.isOverdue,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Broadcast project deleted event
   */
  deleted: (io, companyId, projectId, deletedBy) => {
    broadcastToCompany(io, companyId, 'project:deleted', {
      projectId,
      deletedBy,
      timestamp: new Date().toISOString(),
    });
  },
};

/**
 * Task event broadcasters
 */
export const broadcastTaskEvents = {
  /**
   * Broadcast task created event
   */
  created: (io, companyId, task) => {
    broadcastToRoom(io, `project_${task.projectId}`, 'task:created', {
      taskId: task.taskId,
      _id: task._id,
      title: task.title,
      projectId: task.projectId,
      assignee: task.assignee,
      createdBy: task.createdBy,
    });

    // Notify assignee
    if (task.assignee && Array.isArray(task.assignee)) {
      task.assignee.forEach((assigneeId) => {
        broadcastToUser(io, assigneeId, 'task:assigned_to_you', {
          taskId: task.taskId,
          _id: task._id,
          title: task.title,
          projectId: task.projectId,
        });
      });
    }
  },

  /**
   * Broadcast task updated event
   */
  updated: (io, companyId, task) => {
    broadcastToRoom(io, `project_${task.projectId}`, 'task:updated', {
      taskId: task.taskId,
      _id: task._id,
      title: task.title,
      projectId: task.projectId,
    });
  },

  /**
   * Broadcast task status changed event
   */
  statusChanged: (io, companyId, task) => {
    broadcastToRoom(io, `project_${task.projectId}`, 'task:status_changed', {
      taskId: task.taskId,
      _id: task._id,
      title: task.title,
      status: task.status,
      projectId: task.projectId,
    });
  },

  /**
   * Broadcast task deleted event
   */
  deleted: (io, companyId, taskId, projectId) => {
    broadcastToRoom(io, `project_${projectId}`, 'task:deleted', {
      taskId,
      projectId,
    });
  },
};

/**
 * Lead event broadcasters
 */
export const broadcastLeadEvents = {
  /**
   * Broadcast lead created event
   */
  created: (io, companyId, lead) => {
    broadcastToCompany(io, companyId, 'lead:created', {
      leadId: lead.leadId,
      _id: lead._id,
      name: lead.name,
      company: lead.company,
      stage: lead.stage,
      owner: lead.owner,
      createdBy: lead.createdBy,
    });
  },

  /**
   * Broadcast lead updated event
   */
  updated: (io, companyId, lead) => {
    broadcastToCompany(io, companyId, 'lead:updated', {
      leadId: lead.leadId,
      _id: lead._id,
      name: lead.name,
      company: lead.company,
      stage: lead.stage,
      updatedBy: lead.updatedBy,
    });
  },

  /**
   * Broadcast lead stage changed event
   */
  stageChanged: (io, companyId, lead, previousStage) => {
    broadcastToCompany(io, companyId, 'lead:stage_changed', {
      leadId: lead.leadId,
      _id: lead._id,
      name: lead.name,
      company: lead.company,
      previousStage,
      newStage: lead.stage,
    });
  },

  /**
   * Broadcast lead converted to client event
   */
  converted: (io, companyId, lead, client) => {
    broadcastToCompany(io, companyId, 'lead:converted_to_client', {
      leadId: lead.leadId,
      _id: lead._id,
      name: lead.name,
      clientId: client.clientId,
      clientName: client.name,
    });
  },

  /**
   * Broadcast lead deleted event
   */
  deleted: (io, companyId, leadId, deletedBy) => {
    broadcastToCompany(io, companyId, 'lead:deleted', {
      leadId,
      deletedBy,
      timestamp: new Date().toISOString(),
    });
  },
};

/**
 * Client event broadcasters
 */
export const broadcastClientEvents = {
  /**
   * Broadcast client created event
   */
  created: (io, companyId, client) => {
    broadcastToCompany(io, companyId, 'client:created', {
      clientId: client.clientId,
      _id: client._id,
      name: client.name,
      clientType: client.clientType,
      tier: client.tier,
      accountManager: client.accountManager,
      createdBy: client.createdBy,
    });
  },

  /**
   * Broadcast client updated event
   */
  updated: (io, companyId, client) => {
    broadcastToCompany(io, companyId, 'client:updated', {
      clientId: client.clientId,
      _id: client._id,
      name: client.name,
      tier: client.tier,
      updatedBy: client.updatedBy,
    });
  },

  /**
   * Broadcast client deal statistics updated event
   */
  dealStatsUpdated: (io, companyId, client) => {
    broadcastToCompany(io, companyId, 'client:deal_stats_updated', {
      clientId: client.clientId,
      _id: client._id,
      name: client.name,
      totalDeals: client.totalDeals,
      wonDeals: client.wonDeals,
      totalValue: client.totalValue,
      wonValue: client.wonValue,
    });
  },

  /**
   * Broadcast client deleted event
   */
  deleted: (io, companyId, clientId, deletedBy) => {
    broadcastToCompany(io, companyId, 'client:deleted', {
      clientId,
      deletedBy,
      timestamp: new Date().toISOString(),
    });
  },
};

/**
 * Attendance event broadcasters
 */
export const broadcastAttendanceEvents = {
  /**
   * Broadcast attendance created event
   */
  created: (io, companyId, attendance) => {
    broadcastToCompany(io, companyId, 'attendance:created', {
      attendanceId: attendance.attendanceId,
      _id: attendance._id,
      employee: attendance.employee,
      date: attendance.date,
      status: attendance.status,
      clockIn: attendance.clockIn,
      createdBy: attendance.createdBy,
    });
  },

  /**
   * Broadcast attendance updated event
   */
  updated: (io, companyId, attendance) => {
    broadcastToCompany(io, companyId, 'attendance:updated', {
      attendanceId: attendance.attendanceId,
      _id: attendance._id,
      employee: attendance.employee,
      date: attendance.date,
      status: attendance.status,
      hoursWorked: attendance.hoursWorked,
      updatedBy: attendance.updatedBy,
    });
  },

  /**
   * Broadcast clock in event
   */
  clockIn: (io, companyId, attendance) => {
    // Broadcast to company for admins/HR
    broadcastToCompany(io, companyId, 'attendance:clock_in', {
      attendanceId: attendance.attendanceId,
      _id: attendance._id,
      employee: attendance.employee,
      date: attendance.date,
      clockInTime: attendance.clockIn.time,
    });

    // Broadcast to specific employee
    if (attendance.employee) {
      broadcastToUser(io, attendance.employee.toString(), 'attendance:you_clocked_in', {
        attendanceId: attendance.attendanceId,
        _id: attendance._id,
        clockInTime: attendance.clockIn.time,
      });
    }
  },

  /**
   * Broadcast clock out event
   */
  clockOut: (io, companyId, attendance) => {
    // Broadcast to company for admins/HR
    broadcastToCompany(io, companyId, 'attendance:clock_out', {
      attendanceId: attendance.attendanceId,
      _id: attendance._id,
      employee: attendance.employee,
      date: attendance.date,
      clockOutTime: attendance.clockOut.time,
      hoursWorked: attendance.hoursWorked,
    });

    // Broadcast to specific employee
    if (attendance.employee) {
      broadcastToUser(io, attendance.employee.toString(), 'attendance:you_clocked_out', {
        attendanceId: attendance.attendanceId,
        _id: attendance._id,
        clockOutTime: attendance.clockOut.time,
        hoursWorked: attendance.hoursWorked,
      });
    }
  },

  /**
   * Broadcast attendance deleted event
   */
  deleted: (io, companyId, attendanceId, deletedBy) => {
    broadcastToCompany(io, companyId, 'attendance:deleted', {
      attendanceId,
      deletedBy,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Broadcast bulk attendance update event
   */
  bulkUpdated: (io, companyId, data) => {
    broadcastToCompany(io, companyId, 'attendance:bulk_updated', {
      action: data.action,
      updatedCount: data.updatedCount,
      timestamp: new Date().toISOString(),
    });
  },
};

/**
 * Leave event broadcasters
 */
export const broadcastLeaveEvents = {
  /**
   * Broadcast leave created event
   */
  created: (io, companyId, leave) => {
    broadcastToCompany(io, companyId, 'leave:created', {
      leaveId: leave.leaveId,
      _id: leave._id,
      employee: leave.employee,
      leaveType: leave.leaveType,
      startDate: leave.startDate,
      endDate: leave.endDate,
      status: leave.status,
      createdBy: leave.createdBy,
    });
  },

  /**
   * Broadcast leave updated event
   */
  updated: (io, companyId, leave) => {
    broadcastToCompany(io, companyId, 'leave:updated', {
      leaveId: leave.leaveId,
      _id: leave._id,
      employee: leave.employee,
      leaveType: leave.leaveType,
      status: leave.status,
      updatedBy: leave.updatedBy,
    });
  },

  /**
   * Broadcast leave approved event
   */
  approved: (io, companyId, leave, approvedBy) => {
    broadcastToCompany(io, companyId, 'leave:approved', {
      leaveId: leave.leaveId,
      _id: leave._id,
      employee: leave.employee,
      leaveType: leave.leaveType,
      startDate: leave.startDate,
      endDate: leave.endDate,
      approvedBy,
    });

    // Notify the employee
    if (leave.employee) {
      broadcastToUser(io, leave.employee.toString(), 'leave:your_leave_approved', {
        leaveId: leave.leaveId,
        _id: leave._id,
        leaveType: leave.leaveType,
        startDate: leave.startDate,
        endDate: leave.endDate,
      });
    }
  },

  /**
   * Broadcast leave rejected event
   */
  rejected: (io, companyId, leave, rejectedBy, reason) => {
    broadcastToCompany(io, companyId, 'leave:rejected', {
      leaveId: leave.leaveId,
      _id: leave._id,
      employee: leave.employee,
      leaveType: leave.leaveType,
      rejectedBy,
      reason,
    });

    // Notify the employee
    if (leave.employee) {
      broadcastToUser(io, leave.employee.toString(), 'leave:your_leave_rejected', {
        leaveId: leave.leaveId,
        _id: leave._id,
        leaveType: leave.leaveType,
        reason,
      });
    }
  },

  /**
   * Broadcast leave cancelled event
   */
  cancelled: (io, companyId, leave, cancelledBy) => {
    broadcastToCompany(io, companyId, 'leave:cancelled', {
      leaveId: leave.leaveId,
      _id: leave._id,
      employee: leave.employee,
      leaveType: leave.leaveType,
      cancelledBy,
    });
  },

  /**
   * Broadcast leave deleted event
   */
  deleted: (io, companyId, leaveId, deletedBy) => {
    broadcastToCompany(io, companyId, 'leave:deleted', {
      leaveId,
      deletedBy,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Broadcast leave balance updated event
   */
  balanceUpdated: (io, companyId, employeeId, balances) => {
    // Notify the employee
    broadcastToUser(io, employeeId, 'leave:balance_updated', {
      employeeId,
      balances,
      timestamp: new Date().toISOString(),
    });
  },
};

/**
 * Leave Type event broadcasters
 */
export const broadcastLeaveTypeEvents = {
  /**
   * Broadcast leave type created event
   */
  created: (io, companyId, leaveType) => {
    broadcastToCompany(io, companyId, 'leaveType:created', {
      leaveTypeId: leaveType.leaveTypeId,
      name: leaveType.name,
      code: leaveType.code,
      isActive: leaveType.isActive,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Broadcast leave type updated event
   */
  updated: (io, companyId, leaveType) => {
    broadcastToCompany(io, companyId, 'leaveType:updated', {
      leaveTypeId: leaveType.leaveTypeId,
      name: leaveType.name,
      code: leaveType.code,
      isActive: leaveType.isActive,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Broadcast leave type status toggled event
   */
  status_toggled: (io, companyId, leaveType) => {
    broadcastToCompany(io, companyId, 'leaveType:status_toggled', {
      leaveTypeId: leaveType.leaveTypeId,
      name: leaveType.name,
      isActive: leaveType.isActive,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Broadcast leave type deleted event
   */
  deleted: (io, companyId, leaveType) => {
    broadcastToCompany(io, companyId, 'leaveType:deleted', {
      leaveTypeId: leaveType.leaveTypeId,
      name: leaveType.name,
      code: leaveType.code,
      timestamp: new Date().toISOString(),
    });
  },
};

/**
 * Overtime event broadcasters
 */
export const broadcastOvertimeEvents = {
  /**
   * Broadcast overtime request created event
   */
  created: (io, companyId, overtimeRequest) => {
    broadcastToCompany(io, companyId, 'overtime:created', {
      overtimeId: overtimeRequest.overtimeId,
      _id: overtimeRequest._id,
      employee: overtimeRequest.employee,
      employeeName: overtimeRequest.employeeName,
      date: overtimeRequest.date,
      requestedHours: overtimeRequest.requestedHours,
      reason: overtimeRequest.reason,
      status: overtimeRequest.status,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Broadcast overtime request approved event
   */
  approved: (io, companyId, overtimeRequest, approvedBy) => {
    broadcastToCompany(io, companyId, 'overtime:approved', {
      overtimeId: overtimeRequest.overtimeId,
      _id: overtimeRequest._id,
      employee: overtimeRequest.employee,
      employeeName: overtimeRequest.employeeName,
      date: overtimeRequest.date,
      requestedHours: overtimeRequest.requestedHours,
      approvedHours: overtimeRequest.approvedHours,
      status: overtimeRequest.status,
      approvedBy,
    });

    // Notify the employee
    if (overtimeRequest.employee) {
      broadcastToUser(io, overtimeRequest.employee.toString(), 'overtime:your_overtime_approved', {
        overtimeId: overtimeRequest.overtimeId,
        date: overtimeRequest.date,
        approvedHours: overtimeRequest.approvedHours,
      });
    }
  },

  /**
   * Broadcast overtime request rejected event
   */
  rejected: (io, companyId, overtimeRequest, rejectedBy, reason) => {
    broadcastToCompany(io, companyId, 'overtime:rejected', {
      overtimeId: overtimeRequest.overtimeId,
      _id: overtimeRequest._id,
      employee: overtimeRequest.employee,
      employeeName: overtimeRequest.employeeName,
      date: overtimeRequest.date,
      requestedHours: overtimeRequest.requestedHours,
      status: overtimeRequest.status,
      rejectedBy,
      reason,
    });

    // Notify the employee
    if (overtimeRequest.employee) {
      broadcastToUser(io, overtimeRequest.employee.toString(), 'overtime:your_overtime_rejected', {
        overtimeId: overtimeRequest.overtimeId,
        date: overtimeRequest.date,
        reason,
      });
    }
  },

  /**
   * Broadcast overtime request cancelled event
   */
  cancelled: (io, companyId, overtimeRequest, cancelledBy) => {
    broadcastToCompany(io, companyId, 'overtime:cancelled', {
      overtimeId: overtimeRequest.overtimeId,
      _id: overtimeRequest._id,
      employee: overtimeRequest.employee,
      employeeName: overtimeRequest.employeeName,
      date: overtimeRequest.date,
      status: overtimeRequest.status,
      cancelledBy,
    });
  },

  /**
   * Broadcast overtime request deleted event
   */
  deleted: (io, companyId, overtimeId, deletedBy) => {
    broadcastToCompany(io, companyId, 'overtime:deleted', {
      overtimeId,
      deletedBy,
      timestamp: new Date().toISOString(),
    });
  },
};

/**
 * Asset event broadcasters
 */
export const broadcastAssetEvents = {
  /**
   * Broadcast asset created event
   */
  created: (io, companyId, asset) => {
    broadcastToCompany(io, companyId, 'asset:created', {
      assetId: asset.assetId,
      _id: asset._id,
      name: asset.name,
      type: asset.type,
      category: asset.category,
      status: asset.status,
      assignedTo: asset.assignedTo,
      createdBy: asset.createdBy,
    });
  },

  /**
   * Broadcast asset updated event
   */
  updated: (io, companyId, asset) => {
    broadcastToCompany(io, companyId, 'asset:updated', {
      assetId: asset.assetId,
      _id: asset._id,
      name: asset.name,
      type: asset.type,
      category: asset.category,
      status: asset.status,
      assignedTo: asset.assignedTo,
      updatedBy: asset.updatedBy,
    });
  },

  /**
   * Broadcast asset assigned event
   */
  assigned: (io, companyId, asset) => {
    broadcastToCompany(io, companyId, 'asset:assigned', {
      assetId: asset.assetId,
      _id: asset._id,
      name: asset.name,
      type: asset.type,
      assignedTo: asset.assignedTo,
      assignedDate: asset.assignedDate,
      assignmentType: asset.assignmentType,
    });

    // Notify the assigned employee
    if (asset.assignedTo) {
      broadcastToUser(io, asset.assignedTo.toString(), 'asset:assigned_to_you', {
        assetId: asset.assetId,
        _id: asset._id,
        name: asset.name,
        type: asset.type,
        assignedDate: asset.assignedDate,
      });
    }
  },

  /**
   * Broadcast asset maintenance scheduled event
   */
  maintenanceScheduled: (io, companyId, asset) => {
    broadcastToCompany(io, companyId, 'asset:maintenance_scheduled', {
      assetId: asset.assetId,
      _id: asset._id,
      name: asset.name,
      nextMaintenanceDate: asset.maintenanceSchedule.nextMaintenanceDate,
      status: asset.status,
    });
  },

  /**
   * Broadcast asset deleted event
   */
  deleted: (io, companyId, assetId, deletedBy) => {
    broadcastToCompany(io, companyId, 'asset:deleted', {
      assetId,
      deletedBy,
      timestamp: new Date().toISOString(),
    });
  },
};

/**
 * Training event broadcasters
 */
export const broadcastTrainingEvents = {
  /**
   * Broadcast training created event
   */
  created: (io, companyId, training) => {
    broadcastToCompany(io, companyId, 'training:created', {
      trainingId: training.trainingId,
      _id: training._id,
      name: training.name,
      type: training.type,
      category: training.category,
      startDate: training.startDate,
      endDate: training.endDate,
      maxParticipants: training.maxParticipants,
      createdBy: training.createdBy,
    });
  },

  /**
   * Broadcast training updated event
   */
  updated: (io, companyId, training) => {
    broadcastToCompany(io, companyId, 'training:updated', {
      trainingId: training.trainingId,
      _id: training._id,
      name: training.name,
      type: training.type,
      status: training.status,
      startDate: training.startDate,
      endDate: training.endDate,
      updatedBy: training.updatedBy,
    });
  },

  /**
   * Broadcast training enrollment opened event
   */
  enrollmentOpened: (io, companyId, training) => {
    broadcastToCompany(io, companyId, 'training:enrollment_opened', {
      trainingId: training.trainingId,
      _id: training._id,
      name: training.name,
      type: training.type,
      startDate: training.startDate,
      availableSlots: training.availableSlots,
    });
  },

  /**
   * Broadcast training deleted event
   */
  deleted: (io, companyId, trainingId, deletedBy) => {
    broadcastToCompany(io, companyId, 'training:deleted', {
      trainingId,
      deletedBy,
      timestamp: new Date().toISOString(),
    });
  },
};

/**
 * Activity event broadcasters
 */
export const broadcastActivityEvents = {
  /**
   * Broadcast activity created event
   */
  created: (io, companyId, activity) => {
    broadcastToCompany(io, companyId, 'activity:created', {
      activityId: activity.activityId,
      _id: activity._id,
      title: activity.title,
      activityType: activity.activityType,
      dueDate: activity.dueDate,
      status: activity.status,
      priority: activity.priority,
      owner: activity.owner,
      createdBy: activity.createdBy,
    });
  },

  /**
   * Broadcast activity updated event
   */
  updated: (io, companyId, activity) => {
    broadcastToCompany(io, companyId, 'activity:updated', {
      activityId: activity.activityId,
      _id: activity._id,
      title: activity.title,
      activityType: activity.activityType,
      status: activity.status,
      priority: activity.priority,
      dueDate: activity.dueDate,
      updatedBy: activity.updatedBy,
    });
  },

  /**
   * Broadcast activity status changed event
   */
  statusChanged: (io, companyId, userId, activity) => {
    broadcastToUser(io, userId, 'activity:status_changed', {
      activityId: activity.activityId,
      _id: activity._id,
      title: activity.title,
      status: activity.status,
    });
  },

  /**
   * Broadcast activity assigned to owner
   */
  assignedToOwner: (io, userId, activity) => {
    broadcastToUser(io, userId, 'activity:assigned_to_you', {
      activityId: activity.activityId,
      _id: activity._id,
      title: activity.title,
      activityType: activity.activityType,
      dueDate: activity.dueDate,
      priority: activity.priority,
    });
  },

  /**
   * Broadcast activity completed event
   */
  completed: (io, companyId, activity) => {
    broadcastToCompany(io, companyId, 'activity:completed', {
      activityId: activity.activityId,
      _id: activity._id,
      title: activity.title,
      activityType: activity.activityType,
      completedBy: activity.completedBy,
      completedAt: activity.completedAt,
    });
  },

  /**
   * Broadcast activity completed - owner notification
   */
  completedOwner: (io, userId, activity) => {
    broadcastToUser(io, userId, 'activity:your_activity_completed', {
      activityId: activity.activityId,
      _id: activity._id,
      title: activity.title,
      completedAt: activity.completedAt,
    });
  },

  /**
   * Broadcast activity postponed event
   */
  postponed: (io, companyId, activity) => {
    broadcastToCompany(io, companyId, 'activity:postponed', {
      activityId: activity.activityId,
      _id: activity._id,
      title: activity.title,
      newDueDate: activity.dueDate,
    });
  },

  /**
   * Broadcast activity postponed - owner notification
   */
  postponedOwner: (io, userId, activity) => {
    broadcastToUser(io, userId, 'activity:your_activity_postponed', {
      activityId: activity.activityId,
      _id: activity._id,
      title: activity.title,
      newDueDate: activity.dueDate,
    });
  },

  /**
   * Broadcast activity deleted event
   */
  deleted: (io, companyId, activityId, deletedBy) => {
    broadcastToCompany(io, companyId, 'activity:deleted', {
      activityId,
      deletedBy,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Broadcast activity reminder
   */
  reminder: (io, userId, activity) => {
    broadcastToUser(io, userId, 'activity:reminder', {
      activityId: activity.activityId,
      _id: activity._id,
      title: activity.title,
      activityType: activity.activityType,
      dueDate: activity.dueDate,
      reminder: activity.reminder,
    });
  },
};

/**
 * Pipeline event broadcasters
 */
export const broadcastPipelineEvents = {
  /**
   * Broadcast pipeline created event
   */
  created: (io, companyId, pipeline) => {
    broadcastToCompany(io, companyId, 'pipeline:created', {
      pipelineId: pipeline.pipelineId,
      _id: pipeline._id,
      pipelineName: pipeline.pipelineName,
      pipelineType: pipeline.pipelineType,
      stage: pipeline.stage,
      dealValue: pipeline.dealValue,
      owner: pipeline.owner,
      createdBy: pipeline.createdBy,
    });
  },

  /**
   * Broadcast pipeline updated event
   */
  updated: (io, companyId, pipeline) => {
    broadcastToCompany(io, companyId, 'pipeline:updated', {
      pipelineId: pipeline.pipelineId,
      _id: pipeline._id,
      pipelineName: pipeline.pipelineName,
      stage: pipeline.stage,
      dealValue: pipeline.dealValue,
      status: pipeline.status,
      updatedBy: pipeline.updatedBy,
    });
  },

  /**
   * Broadcast pipeline stage changed event
   */
  stageChanged: (io, companyId, pipeline) => {
    broadcastToCompany(io, companyId, 'pipeline:stage_changed', {
      pipelineId: pipeline.pipelineId,
      _id: pipeline._id,
      pipelineName: pipeline.pipelineName,
      stage: pipeline.stage,
      probability: pipeline.probability,
    });
  },

  /**
   * Broadcast pipeline stage changed - owner notification
   */
  stageChangedOwner: (io, userId, pipeline) => {
    broadcastToUser(io, userId, 'pipeline:your_deal_stage_changed', {
      pipelineId: pipeline.pipelineId,
      _id: pipeline._id,
      pipelineName: pipeline.pipelineName,
      stage: pipeline.stage,
    });
  },

  /**
   * Broadcast pipeline assigned to owner
   */
  assignedToOwner: (io, userId, pipeline) => {
    broadcastToUser(io, userId, 'pipeline:assigned_to_you', {
      pipelineId: pipeline.pipelineId,
      _id: pipeline._id,
      pipelineName: pipeline.pipelineName,
      dealValue: pipeline.dealValue,
      expectedCloseDate: pipeline.expectedCloseDate,
    });
  },

  /**
   * Broadcast pipeline status changed event
   */
  statusChanged: (io, companyId, userId, pipeline) => {
    broadcastToUser(io, userId, 'pipeline:status_changed', {
      pipelineId: pipeline.pipelineId,
      _id: pipeline._id,
      pipelineName: pipeline.pipelineName,
      status: pipeline.status,
    });
  },

  /**
   * Broadcast pipeline won event
   */
  won: (io, companyId, pipeline) => {
    broadcastToCompany(io, companyId, 'pipeline:won', {
      pipelineId: pipeline.pipelineId,
      _id: pipeline._id,
      pipelineName: pipeline.pipelineName,
      dealValue: pipeline.dealValue,
      actualCloseDate: pipeline.actualCloseDate,
    });
  },

  /**
   * Broadcast pipeline won - owner notification
   */
  wonOwner: (io, userId, pipeline) => {
    broadcastToUser(io, userId, 'pipeline:your_deal_won', {
      pipelineId: pipeline.pipelineId,
      _id: pipeline._id,
      pipelineName: pipeline.pipelineName,
      dealValue: pipeline.dealValue,
    });
  },

  /**
   * Broadcast pipeline lost event
   */
  lost: (io, companyId, pipeline) => {
    broadcastToCompany(io, companyId, 'pipeline:lost', {
      pipelineId: pipeline.pipelineId,
      _id: pipeline._id,
      pipelineName: pipeline.pipelineName,
      dealValue: pipeline.dealValue,
      outcomeReason: pipeline.outcomeReason,
    });
  },

  /**
   * Broadcast pipeline lost - owner notification
   */
  lostOwner: (io, userId, pipeline) => {
    broadcastToUser(io, userId, 'pipeline:your_deal_lost', {
      pipelineId: pipeline.pipelineId,
      _id: pipeline._id,
      pipelineName: pipeline.pipelineName,
      outcomeReason: pipeline.outcomeReason,
    });
  },

  /**
   * Broadcast pipeline deleted event
   */
  deleted: (io, companyId, pipelineId, deletedBy) => {
    broadcastToCompany(io, companyId, 'pipeline:deleted', {
      pipelineId,
      deletedBy,
      timestamp: new Date().toISOString(),
    });
  },
};

/**
 * Milestone event broadcasters
 */
export const broadcastMilestoneEvents = {
  /**
   * Broadcast milestone created event
   */
  created: (io, companyId, milestone) => {
    broadcastToRoom(io, `project_${milestone.projectId}`, 'milestone:created', {
      milestoneId: milestone.milestoneId,
      _id: milestone._id,
      title: milestone.title,
      projectId: milestone.projectId,
      status: milestone.status,
      dueDate: milestone.dueDate,
      createdBy: milestone.createdBy,
    });
  },

  /**
   * Broadcast milestone updated event
   */
  updated: (io, companyId, milestone) => {
    broadcastToRoom(io, `project_${milestone.projectId}`, 'milestone:updated', {
      milestoneId: milestone.milestoneId,
      _id: milestone._id,
      title: milestone.title,
      projectId: milestone.projectId,
      status: milestone.status,
      progress: milestone.progress,
      updatedBy: milestone.updatedBy,
    });
  },

  /**
   * Broadcast milestone completed event
   */
  completed: (io, companyId, milestone) => {
    broadcastToRoom(io, `project_${milestone.projectId}`, 'milestone:completed', {
      milestoneId: milestone.milestoneId,
      _id: milestone._id,
      title: milestone.title,
      projectId: milestone.projectId,
      completedDate: milestone.completedDate,
      progress: milestone.progress,
    });
  },

  /**
   * Broadcast milestone progress updated event
   */
  progressUpdated: (io, companyId, milestone) => {
    broadcastToRoom(io, `project_${milestone.projectId}`, 'milestone:progress_updated', {
      milestoneId: milestone.milestoneId,
      _id: milestone._id,
      title: milestone.title,
      projectId: milestone.projectId,
      progress: milestone.progress,
      status: milestone.status,
    });
  },

  /**
   * Broadcast milestone deleted event
   */
  deleted: (io, companyId, milestoneId, projectId) => {
    broadcastToRoom(io, `project_${projectId}`, 'milestone:deleted', {
      milestoneId,
      projectId,
    });
  },
};

/**
 * Time Tracking event broadcasters
 */
export const broadcastTimeTrackingEvents = {
  /**
   * Broadcast time entry created event
   */
  created: (io, companyId, timeEntry) => {
    broadcastToUser(io, timeEntry.userId, 'timeentry:created', {
      timeEntryId: timeEntry.timeEntryId,
      _id: timeEntry._id,
      projectId: timeEntry.projectId,
      taskId: timeEntry.taskId,
      date: timeEntry.date,
      duration: timeEntry.duration,
      billable: timeEntry.billable,
      createdBy: timeEntry.createdBy,
    });

    // Notify project room
    if (timeEntry.projectId) {
      broadcastToRoom(io, `project_${timeEntry.projectId}`, 'timeentry:project_created', {
        timeEntryId: timeEntry.timeEntryId,
        userId: timeEntry.userId,
        duration: timeEntry.duration,
      });
    }
  },

  /**
   * Broadcast time entry updated event
   */
  updated: (io, companyId, timeEntry) => {
    broadcastToUser(io, timeEntry.userId, 'timeentry:updated', {
      timeEntryId: timeEntry.timeEntryId,
      _id: timeEntry._id,
      date: timeEntry.date,
      duration: timeEntry.duration,
      status: timeEntry.status,
    });
  },

  /**
   * Broadcast timesheet submitted event
   */
  timesheetSubmitted: (io, companyId, userId, submittedCount) => {
    broadcastToUser(io, userId, 'timesheet:submitted', {
      submittedCount,
      timestamp: new Date().toISOString(),
    });

    // Notify admins
    broadcastToCompany(io, companyId, 'timesheet:pending_approval', {
      userId,
      submittedCount,
    });
  },

  /**
   * Broadcast timesheet approved event
   */
  timesheetApproved: (io, companyId, userId, approvedCount) => {
    broadcastToUser(io, userId, 'timesheet:approved', {
      approvedCount,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Broadcast timesheet rejected event
   */
  timesheetRejected: (io, companyId, userId, rejectedCount, reason) => {
    broadcastToUser(io, userId, 'timesheet:rejected', {
      rejectedCount,
      reason,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Broadcast time entry deleted event
   */
  deleted: (io, companyId, timeEntryId, userId, projectId) => {
    broadcastToUser(io, userId, 'timeentry:deleted', {
      timeEntryId,
    });

    if (projectId) {
      broadcastToRoom(io, `project_${projectId}`, 'timeentry:project_deleted', {
        timeEntryId,
        userId,
      });
    }
  },
};

/**
 * Dashboard event broadcasters
 */
export const broadcastDashboardEvents = {
  /**
   * Broadcast dashboard stats updated event
   */
  statsUpdated: (io, companyId, stats) => {
    broadcastToCompany(io, companyId, 'dashboard:stats_updated', stats);
  },

  /**
   * Broadcast new notification event
   */
  newNotification: (io, companyId, notification) => {
    broadcastToCompany(io, companyId, 'dashboard:new_notification', notification);
  },
};

/**
 * Designation event broadcasters
 */
export const broadcastDesignationEvents = {
  /**
   * Broadcast designation created event
   */
  created: (io, companyId, designation) => {
    broadcastToCompany(io, companyId, 'designation:created', {
      designationId: designation._id,
      title: designation.title,
      department: designation.department,
      level: designation.level,
      createdBy: designation.createdBy,
    });
  },

  /**
   * Broadcast designation updated event
   */
  updated: (io, companyId, designation) => {
    broadcastToCompany(io, companyId, 'designation:updated', {
      designationId: designation._id,
      title: designation.title,
      department: designation.department,
      level: designation.level,
      updatedBy: designation.updatedBy,
    });
  },

  /**
   * Broadcast designation deleted event
   */
  deleted: (io, companyId, designationId, deletedBy) => {
    broadcastToCompany(io, companyId, 'designation:deleted', {
      designationId,
      deletedBy,
      timestamp: new Date().toISOString(),
    });
  },
};

/**
 * Holiday event broadcasters
 */
export const broadcastHolidayEvents = {
  /**
   * Broadcast holiday created event
   */
  created: (io, companyId, holiday) => {
    broadcastToCompany(io, companyId, 'holiday:created', {
      holidayId: holiday.holidayId,
      name: holiday.name,
      date: holiday.date,
      type: holiday.type,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Broadcast holiday updated event
   */
  updated: (io, companyId, holiday) => {
    broadcastToCompany(io, companyId, 'holiday:updated', {
      holidayId: holiday.holidayId,
      name: holiday.name,
      date: holiday.date,
      type: holiday.type,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Broadcast holiday deleted event
   */
  deleted: (io, companyId, holiday) => {
    broadcastToCompany(io, companyId, 'holiday:deleted', {
      holidayId: holiday.holidayId,
      name: holiday.name,
      timestamp: new Date().toISOString(),
    });
  },
};

/**
 * Shift event broadcasters
 */
export const broadcastShiftEvents = {
  /**
   * Broadcast shift created event
   */
  created: (io, companyId, shift) => {
    broadcastToCompany(io, companyId, 'shift:created', {
      shiftId: shift.shiftId,
      _id: shift._id,
      name: shift.name,
      code: shift.code,
      startTime: shift.startTime,
      endTime: shift.endTime,
      duration: shift.duration,
      isDefault: shift.isDefault,
      createdBy: shift.createdBy,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Broadcast shift updated event
   */
  updated: (io, companyId, shift) => {
    broadcastToCompany(io, companyId, 'shift:updated', {
      shiftId: shift.shiftId,
      _id: shift._id,
      name: shift.name,
      code: shift.code,
      startTime: shift.startTime,
      endTime: shift.endTime,
      duration: shift.duration,
      isDefault: shift.isDefault,
      updatedBy: shift.updatedBy,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Broadcast shift deleted event
   */
  deleted: (io, companyId, shiftId, deletedBy) => {
    broadcastToCompany(io, companyId, 'shift:deleted', {
      shiftId,
      deletedBy,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Broadcast default shift changed event
   */
  defaultChanged: (io, companyId, shift) => {
    broadcastToCompany(io, companyId, 'shift:default_changed', {
      shiftId: shift.shiftId,
      _id: shift._id,
      name: shift.name,
      code: shift.code,
      updatedBy: shift.updatedBy,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Broadcast shift assigned to employee event
   */
  assigned: (io, companyId, assignment) => {
    broadcastToCompany(io, companyId, 'shift:assigned', {
      employeeId: assignment.employeeId,
      employeeName: assignment.employeeName,
      shiftId: assignment.shiftId,
      shiftName: assignment.shiftName,
      effectiveDate: assignment.effectiveDate,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Broadcast shift bulk assigned event
   */
  bulkAssigned: (io, companyId, assignment) => {
    broadcastToCompany(io, companyId, 'shift:bulk_assigned', {
      shiftId: assignment.shiftId,
      shiftName: assignment.shiftName,
      employeeCount: assignment.employeeCount,
      effectiveDate: assignment.effectiveDate,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Broadcast shift unassigned from employee event
   */
  unassigned: (io, companyId, assignment) => {
    broadcastToCompany(io, companyId, 'shift:unassigned', {
      employeeId: assignment.employeeId,
      employeeName: assignment.employeeName,
      timestamp: new Date().toISOString(),
    });
  },
};

/**
 * Helper to get Socket.IO instance from request
 * In Express, we can attach io to app and access via req.app.get('io')
 */
export const getSocketIO = (req) => {
  return req.app.get('io');
};

export default {
  broadcastToCompany,
  broadcastToUser,
  broadcastToRoom,
  broadcastEmployeeEvents,
  broadcastProjectEvents,
  broadcastTaskEvents,
  broadcastMilestoneEvents,
  broadcastTimeTrackingEvents,
  broadcastLeadEvents,
  broadcastClientEvents,
  broadcastAttendanceEvents,
  broadcastLeaveEvents,
  broadcastLeaveTypeEvents,
  broadcastOvertimeEvents,
  broadcastHolidayEvents,
  broadcastShiftEvents,
  broadcastAssetEvents,
  broadcastTrainingEvents,
  broadcastActivityEvents,
  broadcastPipelineEvents,
  broadcastDashboardEvents,
  broadcastDesignationEvents,
  getSocketIO,
};
