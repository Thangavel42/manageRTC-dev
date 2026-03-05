import { DatePicker, message } from "antd";
import dayjs from "dayjs";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import CollapseHeader from "../../../core/common/collapse-header/collapse-header";
import Table from "../../../core/common/dataTable/index";
import Footer from "../../../core/common/footer";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import { useAuth } from "../../../hooks/useAuth";
import { Employee, useEmployeesREST } from "../../../hooks/useEmployeesREST";
import { useProjectsREST } from "../../../hooks/useProjectsREST";
import { Task, useTasksREST } from "../../../hooks/useTasksREST";
import { TimeEntry, useTimeTrackingREST } from "../../../hooks/useTimeTrackingREST";
import { useUserProfileREST } from "../../../hooks/useUserProfileREST";

interface FormData {
  projectId: string;
  taskId?: string;
  description: string;
  duration: string;
  date: string;
  billable: boolean;
  billRate?: string;
}

const TimeSheet = () => {
  // Auth & Role detection
  const { role, employeeId, userId: clerkUserId } = useAuth();

  // API Hooks
  const {
    timeEntries,
    loading,
    error,
    fetchTimeEntries,
    fetchManagedTimeEntries,
    getTimeEntriesByUser,
    createTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    submitTimesheet,
    approveTimesheet,
    rejectTimesheet,
    stats,
    fetchStats
  } = useTimeTrackingREST();

  const { projects, fetchProjects, getMyProjects } = useProjectsREST();
  const { profile, isAdmin, isHR } = useUserProfileREST();
  const { employees, fetchEmployees, fetchActiveEmployeesList } = useEmployeesREST({ autoFetch: false });
  const { tasks, fetchTasks } = useTasksREST();

  // PM/TL detection from getMyProjects() which adds userRole field
  const [myManagedProjects, setMyManagedProjects] = useState<any[]>([]);
  const isProjectManager = myManagedProjects.some(p => p.userRole === 'projectManager');
  const isTeamLeader = myManagedProjects.some(p => p.userRole === 'teamLeader');
  const isProjectLevelManager = isProjectManager || isTeamLeader;

  // State
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [dateRange, setDateRange] = useState<{ startDate?: string; endDate?: string }>({});
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [viewingEntry, setViewingEntry] = useState<TimeEntry | null>(null);
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
  const [taskOptions, setTaskOptions] = useState<{ value: string; label: string }[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    projectId: "",
    taskId: "",
    description: "",
    duration: "",
    date: new Date().toISOString().split('T')[0],
    billable: false,
    billRate: ""
  });

  // Workflow state
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const [rejectEntryId, setRejectEntryId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Search state for filter dropdowns
  const [projectSearchQuery, setProjectSearchQuery] = useState<string>('');
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState<string>('');

  // Date filter mode: 'preset' | 'specific' | 'range'
  const [dateFilterMode, setDateFilterMode] = useState<'preset' | 'specific' | 'range'>('preset');
  const [specificDate, setSpecificDate] = useState<string>('');
  const [rangeStartDate, setRangeStartDate] = useState<string>('');
  const [rangeEndDate, setRangeEndDate] = useState<string>('');

  // Track if initial data load is complete
  const initialLoadDone = useRef(false);

  // Load projects based on user role
  // Admin/HR: fetchProjects() to get ALL projects
  // Others: getMyProjects() to get only assigned projects (with userRole field)
  useEffect(() => {
    // Wait for profile to load to determine admin/HR status
    if (!profile) return;

    const loadProjects = async () => {
      try {
        if (isAdmin || isHR) {
          // Admin/HR should see ALL projects in the filter dropdown
          await fetchProjects({ limit: 100 });
        } else {
          // Non-admin users: load only their assigned projects
          await getMyProjects();
        }
      } catch (error) {
        console.error('Failed to load projects:', error);
      }
    };
    loadProjects();
  }, [profile, isAdmin, isHR, fetchProjects, getMyProjects]);

  // Populate myManagedProjects from projects state after getMyProjects() returns
  useEffect(() => {
    if (projects.length > 0) {
      const managed = projects.filter(
        (p: any) => p.userRole === 'projectManager' || p.userRole === 'teamLeader'
      );
      setMyManagedProjects(managed);

      // If we discovered PM/TL status, reset initialLoadDone to allow proper data fetch
      if (managed.length > 0 && !initialLoadDone.current) {
        // PM/TL status detected, will trigger re-fetch in next effect
      }
    }
  }, [projects]);

  // Initial data load after role detection is complete
  useEffect(() => {
    // Wait for profile to be loaded (which gives us isAdmin, isHR)
    if (!profile) return;

    // For non-admin/HR, wait for projects to load first to detect PM/TL status
    if (!isAdmin && !isHR && projects.length === 0) return;

    // Check if we already loaded the correct data
    const currentRole = isAdmin || isHR ? 'admin' : isProjectLevelManager ? 'manager' : 'employee';
    const hasLoadedKey = `loaded_${currentRole}`;

    if (initialLoadDone.current && (window as any)[hasLoadedKey]) {
      return; // Already loaded for this role
    }

    // Now we can safely load data based on role
    const loadInitialData = async () => {
      const filters: any = { page: 1, limit: 50 };

      if (isAdmin || isHR) {
        // Admin/HR: Fetch all timesheet entries and all employees
        await fetchTimeEntries(filters);
        await fetchStats();
        await fetchEmployees({ status: 'Active' } as any);
        (window as any).loaded_admin = true;
      } else if (isProjectLevelManager) {
        // Project Manager/Team Leader: Fetch managed project entries and active employees list
        await fetchManagedTimeEntries(filters);
        await fetchStats();
        await fetchActiveEmployeesList();
        (window as any).loaded_manager = true;
      } else {
        // Regular employee (team member): Fetch only their own entries
        // No employee list is fetched, so employee filter won't be shown
        // Time entries are stored with userId = clerkUserId, not employeeId
        const userId = clerkUserId || (profile as any)?._id || employeeId;
        if (userId) {
          await getTimeEntriesByUser(userId, filters);
          await fetchStats();
          (window as any).loaded_employee = true;
        }
      }

      initialLoadDone.current = true;
    };

    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, projects, isAdmin, isHR, isProjectLevelManager]);

  // Load tasks when project changes in form
  useEffect(() => {
    if (!formData.projectId) {
      setTaskOptions([]);
      return;
    }
    setLoadingTasks(true);
    const loadTasks = async () => {
      const filters: any = { project: formData.projectId, limit: 100 };

      // Check if user is PM/TL for this selected project
      const isManagerForThisProject = myManagedProjects.some(
        p => p._id === formData.projectId || p._id?.toString() === formData.projectId
      );

      if (!isManagerForThisProject && !isAdmin && !isHR) {
        // Regular team member: filter tasks by their assignments only
        if (employeeId) {
          filters.assignee = employeeId;
        }
      }

      try {
        await fetchTasks(filters);
      } catch (error) {
        console.error('Error loading tasks:', error);
      } finally {
        setLoadingTasks(false);
      }
    };
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.projectId, myManagedProjects, isAdmin, isHR, employeeId]);

  // Convert tasks to options when tasks change
  useEffect(() => {
    if (tasks && tasks.length > 0) {
      const options = tasks.map((task: Task) => ({
        value: task._id,
        label: `${task.title} (${task.status || 'No Status'})`
      }));
      setTaskOptions(options);
    } else {
      setTaskOptions([]);
    }
  }, [tasks]);

  // Check if current user is a regular team member (not lead/manager)
  const isRegularTeamMember = useMemo(() => {
    // Admins and HR can see all entries
    if (isAdmin || isHR) return false;

    // If no profile or projects data, assume restricted access
    if (!profile || !projects || projects.length === 0) return true;

    const currentUserId = (profile as any)._id || (profile as any).userId;
    if (!currentUserId) return true;

    // Check if user is a team lead or project manager in any project
    const isLeadOrManager = projects.some(project => {
      const isTeamLeader = project.teamLeader?.some(leadId =>
        leadId === currentUserId || leadId === (profile as any).employeeId
      );
      const isProjectManager = project.projectManager?.some(managerId =>
        managerId === currentUserId || managerId === (profile as any).employeeId
      );
      return isTeamLeader || isProjectManager;
    });

    // If not a lead or manager, they are a regular team member
    return !isLeadOrManager;
  }, [profile, projects, isAdmin, isHR]);

  // Filter timesheet entries based on user role
  // IMPORTANT: Draft entries are PRIVATE - only visible to their creator
  const filteredTimeEntries = useMemo(() => {
    // Use clerkUserId (not employeeId) since entries store userId as clerkUserId
    const currentUserId = clerkUserId || (profile as any)?._id || (profile as any)?.userId || (profile as any)?.employeeId;

    // Helper: Check if entry is user's own entry
    const isOwnEntry = (entry: TimeEntry) =>
      entry.userId === currentUserId || entry.createdBy === currentUserId;

    // Helper: Filter out other users' draft entries (drafts are private)
    const filterDrafts = (entries: TimeEntry[]) =>
      entries.filter(entry => entry.status !== 'Draft' || isOwnEntry(entry));

    // Admin and HR can see all entries (except other users' drafts)
    if (isAdmin || isHR) {
      return filterDrafts(timeEntries);
    }

    // PM/TL: use myManagedProjects (already computed from getMyProjects userRole field)
    if (myManagedProjects.length > 0) {
      const managedProjectIds = myManagedProjects.map(p => p._id);
      const managedEntries = timeEntries.filter(entry => {
        // Show entries that belong to managed projects
        if (managedProjectIds.includes(entry.projectId)) {
          return true;
        }
        // Also show own entries from other projects
        if (isOwnEntry(entry)) {
          return true;
        }
        return false;
      });
      // Filter out other users' drafts
      return filterDrafts(managedEntries);
    }

    // Regular team member (employee with no PM/TL role):
    // - Only see their own timesheet entries
    // - No access to other employees' data
    // - Employee filter won't be shown (employees list not fetched)
    return timeEntries.filter(entry => isOwnEntry(entry));
  }, [timeEntries, profile, myManagedProjects, isAdmin, isHR, clerkUserId]);

  // Helper: Re-fetch entries with current filters (used after submit/approve/reject)
  const refetchEntries = useCallback(async () => {
    const filters: any = { page: 1, limit: 50, ...dateRange };
    if (selectedProject) filters.projectId = selectedProject;
    if (selectedEmployee) filters.employeeId = selectedEmployee;

    if (isAdmin || isHR) {
      await fetchTimeEntries(filters);
    } else if (isProjectLevelManager) {
      await fetchManagedTimeEntries(filters);
    } else {
      // Regular employee - use clerkUserId (not employeeId which is "EMP-XXXX" format)
      // Time entries are stored with userId = clerkUserId, not employeeId
      const userId = clerkUserId || (profile as any)?._id || employeeId;
      if (userId) {
        await getTimeEntriesByUser(userId, filters);
      }
    }
    await fetchStats();
  }, [dateRange, selectedProject, selectedEmployee, isAdmin, isHR, isProjectLevelManager,
    fetchTimeEntries, fetchManagedTimeEntries, getTimeEntriesByUser, fetchStats]);

  // Apply status filter and additional client-side filters to entries
  const displayedEntries = useMemo(() => {
    let entries = filteredTimeEntries;

    // Apply status filter
    if (statusFilter !== 'all') {
      entries = entries.filter(e => e.status === statusFilter);
    }

    // Apply employee filter (client-side to ensure consistency)
    // Match by userDetails.employeeId (like "EMP-5785")
    if (selectedEmployee) {
      entries = entries.filter(e => {
        const entryEmployeeId = e.userDetails?.employeeId;
        return entryEmployeeId === selectedEmployee;
      });
    }

    // Apply project filter (client-side to ensure consistency)
    if (selectedProject) {
      entries = entries.filter(e => e.projectId === selectedProject);
    }

    return entries;
  }, [filteredTimeEntries, statusFilter, selectedEmployee, selectedProject]);

  // Fetch data when filters change (after initial load is complete)
  useEffect(() => {
    // Only refetch if initial load is done
    if (!initialLoadDone.current) return;

    // Refetch when any filter changes
    refetchEntries();
  }, [dateRange, selectedProject, selectedEmployee, refetchEntries]);

  /**
   * Approval Hierarchy Decision Logic:
   *
   * TIER 1: Project Manager (Top Tier)
   * - Can approve ANYONE including themselves (self-approval enabled)
   * - Full approval authority over their managed project entries
   *
   * TIER 2: Team Lead (Middle Tier)
   * - Can approve team members but NOT themselves
   * - Their own entries require Project Manager approval
   *
   * TIER 3: Team Member (Bottom Tier)
   * - Cannot approve anyone
   * - Requires Team Lead or Project Manager approval
   *
   * EXCLUDED: Admin/HR
   * - Cannot approve timesheet entries (view-only access)
   * - Approval is project-management responsibility only
   */
  const canApproveEntry = useCallback((entry: TimeEntry): boolean => {
    // Only PM/TL can approve (NOT Admin/HR per user requirement)
    if (!isProjectLevelManager) return false;

    // Entry must be in "Submitted" status
    if (entry.status !== 'Submitted') return false;

    // Check if this entry belongs to one of my managed projects
    const entryProjectId = entry.projectId?.toString();
    const isManagedProject = myManagedProjects.some(
      p => p._id?.toString() === entryProjectId
    );
    if (!isManagedProject) return false;

    // Get current user's ID for ownership check (use clerkUserId, not employeeId)
    const currentUserId = clerkUserId || (profile as any)?._id || employeeId;
    const entryOwnerId = entry.userId || entry.createdBy;
    const isOwnEntry = currentUserId && currentUserId === entryOwnerId;

    // Get the specific project to check user's role in it
    const projectForThisEntry = myManagedProjects.find(
      p => p._id?.toString() === entryProjectId
    );

    // TIER 1: Project Manager - Can approve all including self
    if (projectForThisEntry?.userRole === 'projectManager') {
      return true; // PM self-approval enabled
    }

    // TIER 2: Team Lead - Can approve others but not self
    else if (projectForThisEntry?.userRole === 'teamLeader') {
      return !isOwnEntry; // TL requires PM approval for their own entries
    }

    // TIER 3: Team Member - Cannot approve anyone (returns false)
    return false;
  }, [isProjectLevelManager, myManagedProjects, employeeId, clerkUserId, profile]);

  // Build table columns
  const columns = useMemo(() => {
    const allColumns = [
      // Employee column - only show for admins, HR, team leads, and project managers
      ...(!isRegularTeamMember ? [{
        title: "Employee",
        dataIndex: "employeeName",
        render: (text: string, record: TimeEntry) => (
          <div className="d-flex align-items-center file-name-icon">
            <span className="avatar avatar-md border avatar-rounded">
              {record.userDetails?.avatar ? (
                <ImageWithBasePath
                  src={record.userDetails.avatar}
                  className="img-fluid"
                  alt="img"
                />
              ) : (
                <span
                  className="avatar-title bg-primary-transparent text-primary"
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}
                >
                  {record.userDetails?.firstName?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              )}
            </span>
            <div className="ms-2">
              <h6 className="fw-medium">
                <Link to="#">{record.userDetails?.firstName && record.userDetails?.lastName
                  ? `${record.userDetails.firstName} ${record.userDetails.lastName}`
                  : 'Unknown Employee'}
                </Link>
              </h6>
              <span className="fs-12 fw-normal">{record.userDetails?.employeeId || 'N/A'}</span>
            </div>
          </div>
        ),
        sorter: (a: TimeEntry, b: TimeEntry) => (a.userDetails?.firstName || '').localeCompare(b.userDetails?.firstName || ''),
      }] : []),
      {
        title: "Date",
        dataIndex: "date",
        render: (date: string) => new Date(date).toLocaleDateString('en-GB'),
        sorter: (a: TimeEntry, b: TimeEntry) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      },
      {
        title: "Project",
        dataIndex: "projectDetails",
        render: (project: any, record: TimeEntry) => (
          <p className="fs-14 fw-medium text-gray-9 d-flex align-items-center">
            {project?.name || 'Unknown Project'}
          </p>
        ),
        sorter: (a: TimeEntry, b: TimeEntry) => (a.projectDetails?.name || '').localeCompare(b.projectDetails?.name || ''),
      },
      {
        title: "Description",
        dataIndex: "description",
        render: (text: string) => (
          <p className="fs-14 fw-medium text-gray-9" style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {text || '-'}
          </p>
        ),
      },
      {
        title: "Hours",
        dataIndex: "duration",
        render: (duration: number) => `${duration}h`,
        sorter: (a: TimeEntry, b: TimeEntry) => (a.duration || 0) - (b.duration || 0),
      },
      {
        title: "Status",
        dataIndex: "status",
        render: (status: string) => {
          const statusConfig = {
            'Draft': { color: 'bg-secondary', text: 'Draft' },
            'Submitted': { color: 'bg-info', text: 'Submitted' },
            'Approved': { color: 'bg-success', text: 'Approved' },
            'Rejected': { color: 'bg-danger', text: 'Rejected' }
          };
          const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['Draft'];
          return (
            <span className={`badge ${config.color} rounded-1`}>
              {config.text}
            </span>
          );
        },
        sorter: (a: TimeEntry, b: TimeEntry) => a.status.localeCompare(b.status),
      },
      {
        title: "Actions",
        dataIndex: "actions",
        render: (_: any, record: TimeEntry) => {
          // Use clerkUserId (not employeeId) since entries store userId as clerkUserId
          const currentUserId = clerkUserId || (profile as any)?._id || employeeId;
          const entryOwnerId = record.userId || record.createdBy;
          const isOwnEntry = currentUserId && currentUserId === entryOwnerId;
          const isDraft = record.status === 'Draft';
          const isSubmitted = record.status === 'Submitted';
          const canApprove = canApproveEntry(record);
          const isNotAdmin = role !== 'admin';

          return (
            <div className="action-icon d-inline-flex align-items-center">
              {/* Submit button for own draft entries (not for admin) */}
              {isDraft && isOwnEntry && isNotAdmin && (
                <button
                  onClick={() => handleSubmitSingle(record._id)}
                  disabled={submitting}
                  className="btn btn-sm btn-outline-primary me-2 d-inline-flex align-items-center"
                  title="Submit for approval"
                >
                  <i className="ti ti-send fs-16" />
                </button>
              )}

              {/* View button - always available */}
              <Link
                to="#"
                className="me-2"
                onClick={() => setViewingEntry(record)}
                data-bs-toggle="modal"
                data-inert={true}
                data-bs-target="#view_timesheet"
                title="View details"
              >
                <i className="ti ti-eye" />
              </Link>

              {/* Approve/Reject buttons for PM/TL on submitted entries - placed next to view icon */}
              {isSubmitted && canApprove && (
                <>
                  <button
                    onClick={() => handleApprove(record.userId || record.createdBy, record._id)}
                    disabled={approving === record._id}
                    className="btn btn-sm btn-success me-2 d-inline-flex align-items-center"
                    title="Approve timesheet"
                  >
                    {approving === record._id ? (
                      <span className="spinner-border spinner-border-sm" />
                    ) : (
                      <i className="ti ti-check fs-16" />
                    )}
                  </button>
                  <button
                    onClick={() => setRejectEntryId(record._id)}
                    data-bs-toggle="modal"
                    data-inert={true}
                    data-bs-target="#reject_modal"
                    className="btn btn-sm btn-danger me-2 d-inline-flex align-items-center"
                    title="Reject timesheet"
                  >
                    <i className="ti ti-x fs-16" />
                  </button>
                </>
              )}

              {/* Edit button - only for own draft entries (not for admin) */}
              {isDraft && isOwnEntry && isNotAdmin && (
                <Link
                  to="#"
                  className="me-2"
                  onClick={() => handleEdit(record)}
                  data-bs-toggle="modal"
                  data-inert={true}
                  data-bs-target="#edit_timesheet"
                  title="Edit entry"
                >
                  <i className="ti ti-edit" />
                </Link>
              )}

              {/* Delete button - only for own draft entries (not for admin) */}
              {isDraft && isOwnEntry && isNotAdmin && (
                <Link
                  to="#"
                  onClick={() => setDeleteEntryId(record._id)}
                  data-bs-toggle="modal"
                  data-inert={true}
                  data-bs-target="#delete_modal"
                  title="Delete entry"
                >
                  <i className="ti ti-trash" />
                </Link>
              )}
            </div>
          );
        },
      }];

    return allColumns;
  }, [isRegularTeamMember, canApproveEntry, approving, submitting, employeeId, clerkUserId, profile, role]);

  // Build project options for dropdowns (sorted A-Z)
  const projectOptions = useMemo(() => {
    if (!projects) return [];
    return projects
      .map(p => ({ value: p._id, label: p.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [projects]);

  // Handle form input change
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle date range change
  const handleDateRangeChange = (dates: any) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange({
        startDate: dates[0].format('YYYY-MM-DD'),
        endDate: dates[1].format('YYYY-MM-DD')
      });
    }
  };

  // Handle project filter change - just set state, useEffect will handle refetch
  const handleProjectFilter = (value: string) => {
    setSelectedProject(value);
    setProjectSearchQuery('');

    // If selecting a specific project, check if current employee is in it
    if (value && selectedEmployee) {
      const project = projects.find(p => p._id === value);
      if (project && !isEmployeeInProject(selectedEmployee, project)) {
        // Clear employee filter if they're not in the new project
        setSelectedEmployee('');
      }
    }
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedProject('');
    setSelectedEmployee('');
    setDateRange({});
    setProjectSearchQuery('');
    setEmployeeSearchQuery('');
    setDateFilterMode('preset');
    setSpecificDate('');
    setRangeStartDate('');
    setRangeEndDate('');
    message.success('All filters cleared');
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      projectId: selectedProject || "",
      taskId: "",
      description: "",
      duration: "",
      date: new Date().toISOString().split('T')[0],
      billable: false,
      billRate: ""
    });
    setEditingEntry(null);
  };

  // Handle edit click
  const handleEdit = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setFormData({
      projectId: entry.projectId,
      taskId: entry.taskId || "",
      description: entry.description,
      duration: entry.duration.toString(),
      date: new Date(entry.date).toISOString().split('T')[0],
      billable: entry.billable,
      billRate: entry.billRate?.toString() || ""
    });
  };

  // Handle form submission (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (role === 'admin') {
      message.error('Admin users cannot create or edit timesheet entries');
      return;
    }
    if (!formData.projectId) {
      message.error('Please select a project');
      return;
    }
    if (!formData.taskId) {
      message.error('Please select a task');
      return;
    }
    if (!formData.description || formData.description.trim().length < 5) {
      message.error('Description must be at least 5 characters');
      return;
    }
    if (formData.description.trim().length > 500) {
      message.error('Description must not exceed 500 characters');
      return;
    }
    if (!formData.duration || parseFloat(formData.duration) < 0.25) {
      message.error('Duration must be at least 0.25 hours');
      return;
    }
    if (!formData.date) {
      message.error('Please select a date');
      return;
    }

    const entryData = {
      projectId: formData.projectId,
      taskId: formData.taskId || undefined,
      description: formData.description.trim(),
      duration: parseFloat(formData.duration),
      date: new Date(formData.date).toISOString(),
      billable: formData.billable,
      billRate: formData.billRate ? parseFloat(formData.billRate) : undefined
    };

    let success = false;
    if (editingEntry) {
      success = await updateTimeEntry(editingEntry._id, entryData);
    } else {
      success = await createTimeEntry(entryData);
    }

    if (success) {
      // Close modals and reset
      const modalElement = document.getElementById('edit_timesheet');
      const bootstrapModal = (window as any).bootstrap;
      if (bootstrapModal && modalElement) {
        const modal = bootstrapModal.Modal.getInstance(modalElement);
        if (modal) modal.hide();
      }
      const addModalElement = document.getElementById('add_timesheet');
      if (bootstrapModal && addModalElement) {
        const addModal = bootstrapModal.Modal.getInstance(addModalElement);
        if (addModal) addModal.hide();
      }
      resetForm();
    }
  };

  // Handle delete confirmation
  const handleDelete = async () => {
    if (deleteEntryId) {
      const success = await deleteTimeEntry(deleteEntryId);
      if (success) {
        setDeleteEntryId(null);
        // Close modal
        const modalElement = document.getElementById('delete_modal');
        const bootstrapModal = (window as any).bootstrap;
        if (bootstrapModal && modalElement) {
          const modal = bootstrapModal.Modal.getInstance(modalElement);
          if (modal) modal.hide();
        }
      }
    }
  };

  // Handle Submit All Drafts
  const handleSubmitAll = async () => {
    const draftEntries = displayedEntries.filter(e => e.status === 'Draft');
    if (draftEntries.length === 0) {
      message.info('No draft entries to submit');
      return;
    }
    const draftIds = draftEntries.map(e => e._id);
    setSubmitting(true);
    try {
      const success = await submitTimesheet(draftIds);
      if (success) {
        await refetchEntries();
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Submit Single Entry
  const handleSubmitSingle = async (entryId: string) => {
    setSubmitting(true);
    try {
      const success = await submitTimesheet([entryId]);
      if (success) {
        await refetchEntries();
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Approve Entry
  const handleApprove = async (userId: string, entryId: string) => {
    setApproving(entryId);
    try {
      const success = await approveTimesheet(userId, [entryId]);
      if (success) {
        await refetchEntries();
      }
    } finally {
      setApproving(null);
    }
  };

  // Handle Reject Entry (after modal confirmation)
  const handleRejectConfirm = async () => {
    if (!rejectEntryId || !rejectReason.trim()) {
      message.error('Please provide a rejection reason');
      return;
    }
    try {
      const entry = displayedEntries.find(e => e._id === rejectEntryId);
      if (!entry) return;

      const success = await rejectTimesheet(entry.userId || entry.createdBy, [rejectEntryId], rejectReason);
      if (success) {
        setRejectEntryId(null);
        setRejectReason('');
        // Close modal
        const modalElement = document.getElementById('reject_modal');
        const bootstrapModal = (window as any).bootstrap;
        if (bootstrapModal && modalElement) {
          const modal = bootstrapModal.Modal.getInstance(modalElement);
          if (modal) modal.hide();
        }
        await refetchEntries();
      }
    } catch (error) {
      console.error('Reject failed:', error);
    }
  };

  // Handle employee filter change
  const handleEmployeeFilter = (employeeId: string) => {
    setSelectedEmployee(employeeId);
    setEmployeeSearchQuery('');

    // If selecting a specific employee, check if current project includes them
    if (employeeId && selectedProject) {
      const project = projects.find(p => p._id === selectedProject);
      if (project && !isEmployeeInProject(employeeId, project)) {
        // Clear project filter if the employee isn't in that project
        setSelectedProject('');
      }
    }
  };

  // Base filtered entries (with employee/project filters but without status filter)
  // Used for calculating counts that reflect the current employee/project selection
  const baseFilteredEntries = useMemo(() => {
    let entries = filteredTimeEntries;

    // Apply employee filter
    if (selectedEmployee) {
      entries = entries.filter(e => e.userDetails?.employeeId === selectedEmployee);
    }

    // Apply project filter
    if (selectedProject) {
      entries = entries.filter(e => e.projectId === selectedProject);
    }

    return entries;
  }, [filteredTimeEntries, selectedEmployee, selectedProject]);

  // Calculate total hours for display (use base filtered entries)
  const totalHours = baseFilteredEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
  const billableHours = baseFilteredEntries.filter(e => e.billable).reduce((sum, entry) => sum + (entry.duration || 0), 0);

  // Status counts - reflect current employee/project filters
  const totalEntriesCount = baseFilteredEntries.length;
  const draftCount = baseFilteredEntries.filter(e => e.status === 'Draft').length;
  const submittedCount = baseFilteredEntries.filter(e => e.status === 'Submitted').length;
  const approvedCount = baseFilteredEntries.filter(e => e.status === 'Approved').length;
  const rejectedCount = baseFilteredEntries.filter(e => e.status === 'Rejected').length;

  // Build status tabs configuration
  const statusTabs = [
    { key: 'all', label: 'All', count: totalEntriesCount },
    { key: 'Draft', label: 'Draft', count: draftCount },
    { key: 'Submitted', label: 'Submitted', count: submittedCount },
    { key: 'Approved', label: 'Approved', count: approvedCount },
    { key: 'Rejected', label: 'Rejected', count: rejectedCount },
  ];

  // Employee options for filter dropdown (sorted A-Z)
  // Use employeeId (like "EMP-5785") as value since it matches userDetails.employeeId in time entries
  const employeeOptions = useMemo(() => {
    if (!employees || employees.length === 0) return [];
    return employees
      .map((emp: Employee) => ({
        value: emp.employeeId || emp._id,
        label: `${emp.firstName} ${emp.lastName} (${emp.employeeId || 'N/A'})`
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [employees]);

  // Helper: Get all employee IDs assigned to a project (PM, TL, Members)
  const getProjectAssignees = useCallback((project: any): string[] => {
    const assignees: string[] = [];

    // Helper to extract _id from either string or object
    const extractIds = (arr: any[] | undefined): string[] => {
      if (!arr || !Array.isArray(arr)) return [];
      return arr.map(item => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && item._id) return item._id;
        return null;
      }).filter(Boolean) as string[];
    };

    // projectManager - may be strings or objects
    assignees.push(...extractIds(project.projectManager));
    // teamLeader - usually populated objects from backend
    assignees.push(...extractIds(project.teamLeader));
    // teamMembers - may be strings or objects
    assignees.push(...extractIds(project.teamMembers));

    return assignees;
  }, []);

  // Helper: Check if an employee is assigned to a project
  const isEmployeeInProject = useCallback((employeeId: string, project: any): boolean => {
    // employeeId here is the EMP-XXXX format or _id
    // Project stores _id references, so we need to match via employees array
    const assigneeIds = getProjectAssignees(project);

    // Find the employee document that matches this employeeId
    const employee = employees?.find(emp =>
      emp.employeeId === employeeId || emp._id === employeeId
    );

    if (!employee) return false;

    // Check if employee._id is in the project's assignees
    return assigneeIds.includes(employee._id);
  }, [employees, getProjectAssignees]);

  // Filtered project options based on selected employee and search query
  const filteredProjectOptions = useMemo(() => {
    let filtered = projectOptions;

    // If an employee is selected, show only projects they're assigned to
    if (selectedEmployee && projects.length > 0) {
      const employeeProjects = projects.filter(project =>
        isEmployeeInProject(selectedEmployee, project)
      );
      const projectIds = employeeProjects.map(p => p._id);
      filtered = projectOptions.filter(opt => projectIds.includes(opt.value));
    }

    // Apply search filter
    if (projectSearchQuery.trim()) {
      const query = projectSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(opt =>
        opt.label.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [projectOptions, selectedEmployee, projects, projectSearchQuery, isEmployeeInProject]);

  // Filtered employee options based on selected project and search query
  const filteredEmployeeOptions = useMemo(() => {
    let filtered = employeeOptions;

    // If a project is selected, show only employees assigned to that project
    if (selectedProject && projects.length > 0) {
      const project = projects.find(p => p._id === selectedProject);
      if (project) {
        const assigneeIds = getProjectAssignees(project);

        // Filter employees whose _id is in the assignees list
        filtered = employeeOptions.filter(opt => {
          const employee = employees?.find(emp =>
            emp.employeeId === opt.value || emp._id === opt.value
          );
          return employee && assigneeIds.includes(employee._id);
        });
      }
    }

    // Apply search filter
    if (employeeSearchQuery.trim()) {
      const query = employeeSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(opt =>
        opt.label.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [employeeOptions, selectedProject, projects, employees, employeeSearchQuery, getProjectAssignees]);

  const getModalContainer = () => {
    const modalElement = document.getElementById("modal-datepicker");
    return modalElement ? modalElement : document.body;
  };

  return (
    <>
      {/* Page Wrapper */}
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Timesheets</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to="index.html">
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">Employee</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Timesheets
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
              <div className="me-2 mb-2">
                <div className="dropdown">
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    <i className="ti ti-file-export me-1" />
                    Export
                  </Link>
                  <ul className="dropdown-menu dropdown-menu-end p-3">
                    <li>
                      <Link to="#" className="dropdown-item rounded-1">
                        <i className="ti ti-file-type-pdf me-1" />
                        Export as PDF
                      </Link>
                    </li>
                    <li>
                      <Link to="#" className="dropdown-item rounded-1">
                        <i className="ti ti-file-type-xls me-1" />
                        Export as Excel
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
              {draftCount > 0 && role !== 'admin' && (
                <div className="me-2 mb-2">
                  <button
                    onClick={handleSubmitAll}
                    disabled={submitting}
                    className="btn btn-outline-primary d-flex align-items-center"
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <i className="ti ti-send me-2" />
                        Submit All Drafts
                        <span className="badge bg-primary ms-2">{draftCount}</span>
                      </>
                    )}
                  </button>
                </div>
              )}
              {role !== 'admin' && (
                <div className="mb-2">
                  <Link
                    to="#"
                    data-bs-toggle="modal"
                    data-inert={true}
                    data-bs-target="#add_timesheet"
                    className="btn btn-primary d-flex align-items-center"
                    onClick={() => resetForm()}
                  >
                    <i className="ti ti-circle-plus me-2" />
                    Add Today's Work
                  </Link>
                </div>
              )}
              <div className="head-icons ms-2">
                <CollapseHeader />
              </div>
            </div>
          </div>
          {/* /Breadcrumb */}

          {/* Stats Cards */}
          <div className="row g-3 mb-3">
            <div className="col-md-3">
              <div className="card">
                <div className="card-body">
                  <h6 className="mb-1">Total Hours</h6>
                  <h4 className="mb-0">{totalHours.toFixed(1)}h</h4>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card">
                <div className="card-body">
                  <h6 className="mb-1">Billable Hours</h6>
                  <h4 className="mb-0">{billableHours.toFixed(1)}h</h4>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card">
                <div className="card-body">
                  <h6 className="mb-1">Entries</h6>
                  <h4 className="mb-0">{filteredTimeEntries.length}</h4>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card">
                <div className="card-body">
                  <h6 className="mb-1">Date Range</h6>
                  <p className="mb-0 text-truncate" style={{ fontSize: '13px' }}>
                    {dateRange.startDate && dateRange.endDate
                      ? `${new Date(dateRange.startDate).toLocaleDateString('en-GB')} - ${new Date(dateRange.endDate).toLocaleDateString('en-GB')}`
                      : 'All Time'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Indicator list */}
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
              <h5>Timesheet Entries</h5>
              <div className="d-flex my-xl-auto right-content align-items-center flex-wrap row-gap-3">
                {/* Project Filter Dropdown with Search */}
                <div className="dropdown me-3">
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                    onClick={() => setProjectSearchQuery('')}
                  >
                    {selectedProject
                      ? projectOptions.find(p => p.value === selectedProject)?.label || 'Select Project'
                      : 'All Projects'
                    }
                  </Link>
                  <ul className="dropdown-menu dropdown-menu-end p-3" style={{ minWidth: '280px', maxHeight: '350px' }}>
                    {/* Search Input */}
                    <li className="mb-2">
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Search projects..."
                        value={projectSearchQuery}
                        onChange={(e) => setProjectSearchQuery(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </li>
                    <li><hr className="dropdown-divider my-2" /></li>
                    {/* All Projects Option */}
                    <li>
                      <Link
                        to="#"
                        className={`dropdown-item rounded-1 ${!selectedProject ? 'active' : ''}`}
                        onClick={() => {
                          handleProjectFilter('');
                          setProjectSearchQuery('');
                        }}
                      >
                        All Projects
                        {selectedEmployee && ` (${filteredProjectOptions.length} available)`}
                      </Link>
                    </li>
                    {/* Filtered Project List */}
                    <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                      {filteredProjectOptions.length > 0 ? (
                        filteredProjectOptions.map(project => (
                          <li key={project.value}>
                            <Link
                              to="#"
                              className={`dropdown-item rounded-1 ${selectedProject === project.value ? 'active' : ''}`}
                              onClick={() => {
                                handleProjectFilter(project.value);
                                setProjectSearchQuery('');
                              }}
                            >
                              {project.label}
                            </Link>
                          </li>
                        ))
                      ) : (
                        <li className="text-muted text-center py-2 px-3">
                          <small>No projects found</small>
                        </li>
                      )}
                    </div>
                  </ul>
                </div>
                {/*
                  Employee Filter Dropdown with Search
                  Visible only for users who can view multiple employees' timesheet entries:
                  - Admin/HR: Can view all employees in the company
                  - Project Managers (PM): Can view all team members in their projects
                  - Team Leaders (TL): Can view team members in their projects

                  Regular employees (team members only) do NOT see this filter as they only see their own entries.
                */}
                {(isAdmin || isHR || isProjectLevelManager) && employeeOptions.length > 0 && (
                  <div className="dropdown me-3">
                    <Link
                      to="#"
                      className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                      data-bs-toggle="dropdown"
                      onClick={() => setEmployeeSearchQuery('')}
                    >
                      {selectedEmployee
                        ? employeeOptions.find(e => e.value === selectedEmployee)?.label || 'Select Employee'
                        : 'All Employees'
                      }
                    </Link>
                    <ul className="dropdown-menu dropdown-menu-end p-3" style={{ minWidth: '300px', maxHeight: '350px' }}>
                      {/* Search Input */}
                      <li className="mb-2">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Search employees..."
                          value={employeeSearchQuery}
                          onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </li>
                      <li><hr className="dropdown-divider my-2" /></li>
                      {/* All Employees Option */}
                      <li>
                        <Link
                          to="#"
                          className={`dropdown-item rounded-1 ${!selectedEmployee ? 'active' : ''}`}
                          onClick={() => {
                            handleEmployeeFilter('');
                            setEmployeeSearchQuery('');
                          }}
                        >
                          All Employees
                          {selectedProject && ` (${filteredEmployeeOptions.length} in project)`}
                        </Link>
                      </li>
                      {/* Filtered Employee List */}
                      <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                        {filteredEmployeeOptions.length > 0 ? (
                          filteredEmployeeOptions.map(employee => (
                            <li key={employee.value}>
                              <Link
                                to="#"
                                className={`dropdown-item rounded-1 ${selectedEmployee === employee.value ? 'active' : ''}`}
                                onClick={() => {
                                  handleEmployeeFilter(employee.value);
                                  setEmployeeSearchQuery('');
                                }}
                              >
                                {employee.label}
                              </Link>
                            </li>
                          ))
                        ) : (
                          <li className="text-muted text-center py-2 px-3">
                            <small>No employees found</small>
                          </li>
                        )}
                      </div>
                    </ul>
                  </div>
                )}
                <div className="dropdown">
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    <i className="ti ti-filter me-1" />
                    {dateRange.startDate
                      ? dateRange.startDate === dateRange.endDate
                        ? dayjs(dateRange.startDate).format('MMM D, YYYY')
                        : `${dayjs(dateRange.startDate).format('MMM D')} - ${dayjs(dateRange.endDate).format('MMM D, YYYY')}`
                      : 'Filter by Date'
                    }
                  </Link>
                  <ul className="dropdown-menu dropdown-menu-end p-3" style={{ minWidth: '280px' }}>
                    {/* Preset Options */}
                    <li className="dropdown-header text-muted small">Quick Filters</li>
                    <li>
                      <Link to="#" className={`dropdown-item rounded-1 ${!dateRange.startDate ? 'active' : ''}`} onClick={() => {
                        setDateRange({});
                        setDateFilterMode('preset');
                        setSpecificDate('');
                        setRangeStartDate('');
                        setRangeEndDate('');
                      }}>
                        All Time
                      </Link>
                    </li>
                    <li>
                      <Link to="#" className="dropdown-item rounded-1" onClick={() => {
                        setDateRange({
                          startDate: new Date().toISOString().split('T')[0],
                          endDate: new Date().toISOString().split('T')[0]
                        });
                        setDateFilterMode('preset');
                      }}>
                        Today
                      </Link>
                    </li>
                    <li>
                      <Link to="#" className="dropdown-item rounded-1" onClick={() => {
                        setDateRange({
                          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                          endDate: new Date().toISOString().split('T')[0]
                        });
                        setDateFilterMode('preset');
                      }}>
                        Last 7 Days
                      </Link>
                    </li>
                    <li>
                      <Link to="#" className="dropdown-item rounded-1" onClick={() => {
                        const now = new Date();
                        const startOfWeek = new Date(now);
                        startOfWeek.setDate(now.getDate() - now.getDay());
                        const endOfWeek = new Date(startOfWeek);
                        endOfWeek.setDate(startOfWeek.getDate() + 6);
                        setDateRange({
                          startDate: startOfWeek.toISOString().split('T')[0],
                          endDate: endOfWeek.toISOString().split('T')[0]
                        });
                        setDateFilterMode('preset');
                      }}>
                        This Week
                      </Link>
                    </li>
                    <li>
                      <Link to="#" className="dropdown-item rounded-1" onClick={() => {
                        const now = new Date();
                        setDateRange({
                          startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
                          endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString().split('T')[0]
                        });
                        setDateFilterMode('preset');
                      }}>
                        This Month
                      </Link>
                    </li>
                    <li>
                      <Link to="#" className="dropdown-item rounded-1" onClick={() => {
                        const now = new Date();
                        setDateRange({
                          startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0],
                          endDate: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString().split('T')[0]
                        });
                        setDateFilterMode('preset');
                      }}>
                        Last Month
                      </Link>
                    </li>

                    <li><hr className="dropdown-divider my-2" /></li>

                    {/* Specific Date Option */}
                    <li className="dropdown-header text-muted small">Specific Date</li>
                    <li className="px-2 py-1" onClick={(e) => e.stopPropagation()}>
                      <DatePicker
                        className="w-100"
                        placeholder="Select date"
                        value={specificDate ? dayjs(specificDate) : null}
                        onChange={(date) => {
                          if (date) {
                            const dateStr = date.format('YYYY-MM-DD');
                            setSpecificDate(dateStr);
                            setDateRange({ startDate: dateStr, endDate: dateStr });
                            setDateFilterMode('specific');
                            setRangeStartDate('');
                            setRangeEndDate('');
                          } else {
                            // Handle clear
                            setSpecificDate('');
                            setDateRange({});
                            setDateFilterMode('preset');
                          }
                        }}
                        format="MMM D, YYYY"
                        allowClear
                      />
                    </li>

                    <li><hr className="dropdown-divider my-2" /></li>

                    {/* Date Range Option */}
                    <li className="dropdown-header text-muted small">Date Range</li>
                    <li className="px-2 py-1" onClick={(e) => e.stopPropagation()}>
                      <div className="d-flex flex-column gap-2">
                        <DatePicker
                          className="w-100"
                          placeholder="Start date"
                          value={rangeStartDate ? dayjs(rangeStartDate) : null}
                          onChange={(date) => {
                            if (date) {
                              const dateStr = date.format('YYYY-MM-DD');
                              setRangeStartDate(dateStr);
                              setSpecificDate('');
                              setDateFilterMode('range');
                              if (rangeEndDate && dateStr <= rangeEndDate) {
                                setDateRange({ startDate: dateStr, endDate: rangeEndDate });
                              } else if (rangeEndDate && dateStr > rangeEndDate) {
                                // If start > end, reset end date
                                setRangeEndDate('');
                                setDateRange({});
                              }
                            } else {
                              // Handle clear
                              setRangeStartDate('');
                              setDateRange({});
                            }
                          }}
                          format="MMM D, YYYY"
                          allowClear
                        />
                        <DatePicker
                          className="w-100"
                          placeholder="End date"
                          value={rangeEndDate ? dayjs(rangeEndDate) : null}
                          onChange={(date) => {
                            if (date) {
                              const dateStr = date.format('YYYY-MM-DD');
                              setRangeEndDate(dateStr);
                              setSpecificDate('');
                              setDateFilterMode('range');
                              if (rangeStartDate && dateStr >= rangeStartDate) {
                                setDateRange({ startDate: rangeStartDate, endDate: dateStr });
                              } else if (!rangeStartDate) {
                                // If no start date, set both to end date
                                setRangeStartDate(dateStr);
                                setDateRange({ startDate: dateStr, endDate: dateStr });
                              }
                            } else {
                              // Handle clear
                              setRangeEndDate('');
                              if (rangeStartDate) {
                                setDateRange({});
                              }
                            }
                          }}
                          format="MMM D, YYYY"
                          allowClear
                          disabledDate={(current) => {
                            if (!rangeStartDate) return false;
                            return current && current < dayjs(rangeStartDate).startOf('day');
                          }}
                        />
                      </div>
                    </li>
                  </ul>
                </div>
                {/* Clear All Filters Button */}
                {(selectedProject || selectedEmployee || dateRange.startDate) && (
                  <button
                    type="button"
                    className="btn btn-outline-danger d-inline-flex align-items-center"
                    onClick={clearAllFilters}
                    title="Clear all filters"
                  >
                    <i className="ti ti-filter-x me-1" />
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
            <div className="card-body p-0">
              {/* Actionable alert for PM/TL with pending approvals */}
              {isProjectLevelManager && submittedCount > 0 && statusFilter !== 'Submitted' && (
                <div
                  className="alert alert-warning border-0 rounded-0 m-0 mb-3"
                  role="alert"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setStatusFilter('Submitted')}
                >
                  <div className="d-flex align-items-center">
                    <i className="ti ti-alert-circle fs-20 me-2"></i>
                    <span>
                      <strong>{submittedCount} timesheet entr{submittedCount > 1 ? 'ies' : 'y'} pending your approval.</strong>
                      <span className="ms-2 text-muted">Click here or select the "Submitted" tab to review.</span>
                    </span>
                  </div>
                </div>
              )}

              {/* Status Tabs */}
              <div className="nav-tabs-container mb-3 px-3 pt-3">
                <ul className="nav nav-tabs" role="tablist">
                  {statusTabs.map(tab => (
                    <li className="nav-item" role="presentation" key={tab.key}>
                      <button
                        className={`nav-link ${statusFilter === tab.key ? 'active' : ''}`}
                        onClick={() => setStatusFilter(tab.key)}
                        type="button"
                      >
                        {tab.label}
                        <span className={`badge ms-2 ${statusFilter === tab.key ? 'bg-primary' : 'bg-secondary'}`}>
                          {tab.count}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status"></div>
                  <p className="mt-2">Loading timesheets...</p>
                </div>
              ) : error ? (
                <div className="text-center py-5">
                  <p className="text-danger">{error}</p>
                </div>
              ) : displayedEntries.length === 0 ? (
                <div className="text-center py-5">
                  <p className="text-muted">No time entries found for "{statusTabs.find(t => t.key === statusFilter)?.label}" status.</p>
                  {statusFilter !== 'all' && (
                    <button
                      className="btn btn-sm btn-outline-primary mt-2"
                      onClick={() => setStatusFilter('all')}
                    >
                      View All Entries
                    </button>
                  )}
                </div>
              ) : (
                <Table dataSource={displayedEntries} columns={columns} Selection={false} />
              )}
            </div>
          </div>
          {/* /Performance Indicator list */}
        </div>
        <Footer />
      </div>
      {/* /Page Wrapper */}

      {/* Add Timesheet */}
      <div className="modal fade" id="add_timesheet">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Add Today's Work</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body pb-0">
                <div className="row">
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Project <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-control"
                        value={formData.projectId}
                        onChange={(e) => handleInputChange('projectId', e.target.value)}
                        required
                      >
                        <option value="">Select Project</option>
                        {projectOptions.map(project => (
                          <option key={project.value} value={project.value}>{project.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Task <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-control"
                        value={formData.taskId || ''}
                        onChange={(e) => handleInputChange('taskId', e.target.value)}
                        disabled={!formData.projectId || loadingTasks}
                        required
                      >
                        <option value="">Select Task</option>
                        {!formData.projectId && <option disabled>Select a project first</option>}
                        {loadingTasks && <option disabled>Loading tasks...</option>}
                        {taskOptions.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      {formData.projectId && taskOptions.length === 0 && !loadingTasks && (
                        <small className="text-warning">No tasks assigned to you in this project.</small>
                      )}
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Description <span className="text-danger">*</span>
                      </label>
                      <textarea
                        className="form-control"
                        rows={3}
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        placeholder="Describe what you worked on..."
                        maxLength={500}
                        required
                      />
                      <small className="text-muted">
                        {formData.description.length}/500 characters
                      </small>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Date <span className="text-danger">*</span>
                      </label>
                      <DatePicker
                        className="form-control datetimepicker"
                        format="DD-MM-YYYY"
                        getPopupContainer={getModalContainer}
                        placeholder="DD-MM-YYYY"
                        value={formData.date ? dayjs(formData.date) : null}
                        onChange={(date) => handleInputChange('date', date ? date.toISOString() : '')}
                        required
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Hours <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder="0.00"
                        step="0.25"
                        min="0.25"
                        max="24"
                        value={formData.duration}
                        onChange={(e) => handleInputChange('duration', e.target.value)}
                        required
                      />
                      <small className="text-muted">Minimum 0.25 hours (15 minutes)</small>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Billable</label>
                      <select
                        className="form-control"
                        value={formData.billable ? 'true' : 'false'}
                        onChange={(e) => handleInputChange('billable', e.target.value === 'true')}
                      >
                        <option value="false">No</option>
                        <option value="true">Yes</option>
                      </select>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Bill Rate ($)</label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        value={formData.billRate}
                        onChange={(e) => handleInputChange('billRate', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-light me-2"
                  data-bs-dismiss="modal"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Adding...' : 'Add Time Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Add Timesheet */}

      {/* Edit Timesheet */}
      <div className="modal fade" id="edit_timesheet">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Edit Time Entry</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body pb-0">
                <div className="row">
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Project <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-control"
                        value={formData.projectId}
                        onChange={(e) => handleInputChange('projectId', e.target.value)}
                        required
                      >
                        <option value="">Select Project</option>
                        {projectOptions.map(project => (
                          <option key={project.value} value={project.value}>{project.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Task <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-control"
                        value={formData.taskId || ''}
                        onChange={(e) => handleInputChange('taskId', e.target.value)}
                        disabled={!formData.projectId || loadingTasks}
                        required
                      >
                        <option value="">Select Task</option>
                        {!formData.projectId && <option disabled>Select a project first</option>}
                        {loadingTasks && <option disabled>Loading tasks...</option>}
                        {taskOptions.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      {formData.projectId && taskOptions.length === 0 && !loadingTasks && (
                        <small className="text-warning">No tasks assigned to you in this project.</small>
                      )}
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Description <span className="text-danger">*</span>
                      </label>
                      <textarea
                        className="form-control"
                        rows={3}
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        placeholder="Describe what you worked on..."
                        maxLength={500}
                        required
                      />
                      <small className="text-muted">
                        {formData.description.length}/500 characters
                      </small>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Date <span className="text-danger">*</span>
                      </label>
                      <DatePicker
                        className="form-control datetimepicker"
                        format="DD-MM-YYYY"
                        getPopupContainer={getModalContainer}
                        placeholder="DD-MM-YYYY"
                        value={formData.date ? dayjs(formData.date) : null}
                        onChange={(date) => handleInputChange('date', date ? date.toISOString() : '')}
                        required
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Hours <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder="0.00"
                        step="0.25"
                        min="0.25"
                        max="24"
                        value={formData.duration}
                        onChange={(e) => handleInputChange('duration', e.target.value)}
                        required
                      />
                      <small className="text-muted">Minimum 0.25 hours (15 minutes)</small>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Billable</label>
                      <select
                        className="form-control"
                        value={formData.billable ? 'true' : 'false'}
                        onChange={(e) => handleInputChange('billable', e.target.value === 'true')}
                      >
                        <option value="false">No</option>
                        <option value="true">Yes</option>
                      </select>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Bill Rate ($)</label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        value={formData.billRate}
                        onChange={(e) => handleInputChange('billRate', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-light me-2"
                  data-bs-dismiss="modal"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Edit Timesheet */}

      {/* Delete Confirmation Modal */}
      <div className="modal fade" id="delete_modal">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Delete Time Entry</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this time entry? This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-light"
                data-bs-dismiss="modal"
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDelete}
                data-bs-dismiss="modal"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Timesheet Modal */}
      <div className="modal fade" id="reject_modal">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Reject Timesheet Entry</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={() => {
                  setRejectEntryId(null);
                  setRejectReason('');
                }}
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="modal-body">
              <p className="mb-3">Please provide a reason for rejecting this timesheet entry:</p>
              <textarea
                className="form-control"
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter rejection reason (required)"
                maxLength={500}
              />
              <small className="text-muted mt-1 d-block">
                {rejectReason.length}/500 characters
              </small>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-light"
                data-bs-dismiss="modal"
                onClick={() => {
                  setRejectEntryId(null);
                  setRejectReason('');
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleRejectConfirm}
                disabled={!rejectReason.trim()}
              >
                Reject Timesheet
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* View Timesheet Details Modal */}
      <div className="modal fade" id="view_timesheet">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Timesheet Entry Details</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="modal-body">
              {viewingEntry && (
                <div className="row g-3">
                  {/* Employee Information */}
                  <div className="col-12">
                    <div className="card mb-0">
                      <div className="card-body">
                        <h6 className="fw-semibold mb-3 border-bottom pb-2">
                          <i className="ti ti-user me-2 text-primary"></i>
                          Employee Information
                        </h6>
                        <div className="row">
                          <div className="col-md-6 mb-3">
                            <div className="d-flex align-items-center">
                              <span className="avatar avatar-md border avatar-rounded me-2">
                                {viewingEntry.userDetails?.avatar ? (
                                  <ImageWithBasePath
                                    src={viewingEntry.userDetails.avatar}
                                    className="img-fluid"
                                    alt="img"
                                  />
                                ) : (
                                  <span
                                    className="avatar-title bg-primary-transparent text-primary"
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      borderRadius: '50%',
                                      fontSize: '16px',
                                      fontWeight: '600'
                                    }}
                                  >
                                    {viewingEntry.userDetails?.firstName?.charAt(0)?.toUpperCase() || 'U'}
                                  </span>
                                )}
                              </span>
                              <div>
                                <p className="mb-0 fw-medium">
                                  {viewingEntry.userDetails?.firstName && viewingEntry.userDetails?.lastName
                                    ? `${viewingEntry.userDetails.firstName} ${viewingEntry.userDetails.lastName}`
                                    : 'Unknown Employee'}
                                </p>
                                <small className="text-muted">
                                  {viewingEntry.userDetails?.employeeId || 'N/A'}
                                </small>
                              </div>
                            </div>
                          </div>
                          <div className="col-md-6 mb-3">
                            <label className="form-label text-muted fs-12 mb-1">Entry ID</label>
                            <p className="mb-0 fw-medium">{viewingEntry.timeEntryId || viewingEntry._id}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Project & Task Information */}
                  <div className="col-12">
                    <div className="card mb-0">
                      <div className="card-body">
                        <h6 className="fw-semibold mb-3 border-bottom pb-2">
                          <i className="ti ti-briefcase me-2 text-success"></i>
                          Project & Task Details
                        </h6>
                        <div className="row">
                          <div className="col-md-6 mb-3">
                            <label className="form-label text-muted fs-12 mb-1">Project</label>
                            <p className="mb-0 fw-medium">
                              {viewingEntry.projectDetails?.name || 'Unknown Project'}
                            </p>
                          </div>
                          <div className="col-md-6 mb-3">
                            <label className="form-label text-muted fs-12 mb-1">Task</label>
                            <p className="mb-0 fw-medium">
                              {viewingEntry.taskDetails?.title || 'No task assigned'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Time Details */}
                  <div className="col-12">
                    <div className="card mb-0">
                      <div className="card-body">
                        <h6 className="fw-semibold mb-3 border-bottom pb-2">
                          <i className="ti ti-clock me-2 text-info"></i>
                          Time Details
                        </h6>
                        <div className="row">
                          <div className="col-md-4 mb-3">
                            <label className="form-label text-muted fs-12 mb-1">Date</label>
                            <p className="mb-0 fw-medium">
                              {new Date(viewingEntry.date).toLocaleDateString('en-GB')}
                            </p>
                          </div>
                          <div className="col-md-4 mb-3">
                            <label className="form-label text-muted fs-12 mb-1">Duration</label>
                            <p className="mb-0 fw-medium">
                              <span className="badge bg-primary-transparent text-primary fs-14">
                                {viewingEntry.duration}h
                              </span>
                            </p>
                          </div>
                          <div className="col-md-4 mb-3">
                            <label className="form-label text-muted fs-12 mb-1">Status</label>
                            <p className="mb-0">
                              {(() => {
                                const statusConfig = {
                                  'Draft': { color: 'bg-secondary', text: 'Draft' },
                                  'Submitted': { color: 'bg-info', text: 'Submitted' },
                                  'Approved': { color: 'bg-success', text: 'Approved' },
                                  'Rejected': { color: 'bg-danger', text: 'Rejected' }
                                };
                                const config = statusConfig[viewingEntry.status as keyof typeof statusConfig] || statusConfig['Draft'];
                                return (
                                  <span className={`badge ${config.color} rounded-1`}>
                                    {config.text}
                                  </span>
                                );
                              })()}
                            </p>
                          </div>
                        </div>
                        {viewingEntry.startTime && (
                          <div className="row">
                            <div className="col-md-6 mb-3">
                              <label className="form-label text-muted fs-12 mb-1">Start Time</label>
                              <p className="mb-0 fw-medium">{viewingEntry.startTime}</p>
                            </div>
                            <div className="col-md-6 mb-3">
                              <label className="form-label text-muted fs-12 mb-1">End Time</label>
                              <p className="mb-0 fw-medium">{viewingEntry.endTime || 'N/A'}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Billing Information */}
                  <div className="col-12">
                    <div className="card mb-0">
                      <div className="card-body">
                        <h6 className="fw-semibold mb-3 border-bottom pb-2">
                          <i className="ti ti-currency-dollar me-2 text-warning"></i>
                          Billing Information
                        </h6>
                        <div className="row">
                          <div className="col-md-4 mb-3">
                            <label className="form-label text-muted fs-12 mb-1">Billable</label>
                            <p className="mb-0">
                              <span className={`badge ${viewingEntry.billable ? 'bg-success-transparent text-success' : 'bg-secondary-transparent text-secondary'}`}>
                                {viewingEntry.billable ? 'Yes' : 'No'}
                              </span>
                            </p>
                          </div>
                          {viewingEntry.billable && (
                            <>
                              <div className="col-md-4 mb-3">
                                <label className="form-label text-muted fs-12 mb-1">Bill Rate</label>
                                <p className="mb-0 fw-medium">
                                  ${viewingEntry.billRate?.toFixed(2) || '0.00'}/hr
                                </p>
                              </div>
                              <div className="col-md-4 mb-3">
                                <label className="form-label text-muted fs-12 mb-1">Billed Amount</label>
                                <p className="mb-0 fw-medium text-success">
                                  ${((viewingEntry.billRate || 0) * viewingEntry.duration).toFixed(2)}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="col-12">
                    <div className="card mb-0">
                      <div className="card-body">
                        <h6 className="fw-semibold mb-3 border-bottom pb-2">
                          <i className="ti ti-file-description me-2 text-purple"></i>
                          Description
                        </h6>
                        <p className="mb-0 text-gray-9" style={{ whiteSpace: 'pre-wrap' }}>
                          {viewingEntry.description || 'No description provided'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Approval Information */}
                  {(viewingEntry.status === 'Approved' || viewingEntry.status === 'Rejected') && (
                    <div className="col-12">
                      <div className="card mb-0">
                        <div className="card-body">
                          <h6 className="fw-semibold mb-3 border-bottom pb-2">
                            <i className="ti ti-checks me-2 text-indigo"></i>
                            Approval Details
                          </h6>
                          <div className="row">
                            {viewingEntry.approvedBy && (
                              <div className="col-md-6 mb-3">
                                <label className="form-label text-muted fs-12 mb-1">
                                  {viewingEntry.status === 'Approved' ? 'Approved By' : 'Rejected By'}
                                </label>
                                <p className="mb-0 fw-medium">{viewingEntry.approvedBy}</p>
                              </div>
                            )}
                            {viewingEntry.approvedDate && (
                              <div className="col-md-6 mb-3">
                                <label className="form-label text-muted fs-12 mb-1">
                                  {viewingEntry.status === 'Approved' ? 'Approved Date' : 'Rejected Date'}
                                </label>
                                <p className="mb-0 fw-medium">
                                  {new Date(viewingEntry.approvedDate).toLocaleDateString('en-GB')}
                                </p>
                              </div>
                            )}
                            {viewingEntry.rejectionReason && (
                              <div className="col-12">
                                <label className="form-label text-muted fs-12 mb-1">Rejection Reason</label>
                                <p className="mb-0 text-danger">{viewingEntry.rejectionReason}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Record Information */}
                  <div className="col-12">
                    <div className="card mb-0 bg-light">
                      <div className="card-body">
                        <div className="row">
                          <div className="col-md-6 mb-2">
                            <label className="form-label text-muted fs-11 mb-1">Created At</label>
                            <p className="mb-0 fs-13">
                              {new Date(viewingEntry.createdAt).toLocaleString('en-GB')}
                            </p>
                          </div>
                          <div className="col-md-6 mb-2">
                            <label className="form-label text-muted fs-11 mb-1">Last Updated</label>
                            <p className="mb-0 fs-13">
                              {new Date(viewingEntry.updatedAt).toLocaleString('en-GB')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-light"
                data-bs-dismiss="modal"
              >
                Close
              </button>
              {viewingEntry && viewingEntry.status === 'Draft' && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    // Close view modal
                    const viewModal = document.getElementById('view_timesheet');
                    const bootstrapModal = (window as any).bootstrap;
                    if (bootstrapModal && viewModal) {
                      const modal = bootstrapModal.Modal.getInstance(viewModal);
                      if (modal) modal.hide();
                    }
                    // Open edit modal
                    handleEdit(viewingEntry);
                    setTimeout(() => {
                      const editModal = new (window as any).bootstrap.Modal(document.getElementById('edit_timesheet'));
                      editModal.show();
                    }, 300);
                  }}
                >
                  <i className="ti ti-edit me-1"></i>
                  Edit Entry
                </button>
              )}
              {viewingEntry && viewingEntry.status === 'Submitted' && canApproveEntry(viewingEntry) && (
                <>
                  <button
                    type="button"
                    className="btn btn-success me-2"
                    onClick={async () => {
                      const entryOwnerId = viewingEntry.userId || viewingEntry.createdBy;
                      await handleApprove(entryOwnerId, viewingEntry._id);
                      // Close modal after approval
                      const viewModal = document.getElementById('view_timesheet');
                      const bootstrapModal = (window as any).bootstrap;
                      if (bootstrapModal && viewModal) {
                        const modal = bootstrapModal.Modal.getInstance(viewModal);
                        if (modal) modal.hide();
                      }
                    }}
                    disabled={approving === viewingEntry._id}
                  >
                    {approving === viewingEntry._id ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" />
                        Approving...
                      </>
                    ) : (
                      <>
                        <i className="ti ti-check me-1"></i>
                        Approve
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => {
                      setRejectEntryId(viewingEntry._id);
                      // Close view modal and open reject modal
                      const viewModal = document.getElementById('view_timesheet');
                      const bootstrapModal = (window as any).bootstrap;
                      if (bootstrapModal && viewModal) {
                        const modal = bootstrapModal.Modal.getInstance(viewModal);
                        if (modal) modal.hide();
                      }
                      setTimeout(() => {
                        const rejectModal = new (window as any).bootstrap.Modal(document.getElementById('reject_modal'));
                        rejectModal.show();
                      }, 300);
                    }}
                  >
                    <i className="ti ti-x me-1"></i>
                    Reject
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TimeSheet;
