import { DatePicker } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Select from 'react-select';
import CollapseHeader from '../../../core/common/collapse-header/collapse-header';
import CommonSelect from '../../../core/common/commonSelect';
import Footer from '../../../core/common/footer';
import ImageWithBasePath from '../../../core/common/imageWithBasePath';
import CommonTagsInput from '../../../core/common/Taginput';
import { useProjectsREST } from '../../../hooks/useProjectsREST';
import { Task, useTasksREST } from '../../../hooks/useTasksREST';
import { useTaskStatusREST } from '../../../hooks/useTaskStatusREST';
import { useUserProfileREST } from '../../../hooks/useUserProfileREST';
import { useSocket } from '../../../SocketContext';
import { all_routes } from '../../router/all_routes';

const TaskDetails = () => {
  const { taskId } = useParams();
  const socket = useSocket() as any; // Keep for real-time updates from backend broadcasts
  const { getTaskById: getTaskByIdAPI, updateTask: updateTaskAPI } = useTasksREST();
  const { profile, isAdmin, isHR, isEmployee } = useUserProfileREST();
  const { getProjectById: getProjectByIdAPI } = useProjectsREST();
  const { statuses: statusesFromHook, fetchTaskStatuses: fetchTaskStatusesAPI } =
    useTaskStatusREST();

  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [assigneeDetails, setAssigneeDetails] = useState<any[]>([]);
  const [projectDetails, setProjectDetails] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editPriority, setEditPriority] = useState('');
  const [editDueDate, setEditDueDate] = useState<Dayjs | null>(null);
  const [editAssignees, setEditAssignees] = useState<string[]>([]);
  const [editModalError, setEditModalError] = useState<string | null>(null);
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [selectedNewAssignees, setSelectedNewAssignees] = useState<string[]>([]);
  const [isSavingAssignees, setIsSavingAssignees] = useState(false);
  const [assigneeModalError, setAssigneeModalError] = useState<string | null>(null);
  const [tags1, setTags1] = useState<string[]>([]);
  const [taskStatuses, setTaskStatuses] = useState<any[]>([]);

  const loadTask = useCallback(async () => {
    if (!taskId) return;

    setLoading(true);
    setError(null);

    try {
      const taskData = await getTaskByIdAPI(taskId);
      console.log('[TaskDetails] Loaded task data:', taskData);

      if (taskData) {
        setTask(taskData);
        setEditTitle(taskData.title || '');
        setEditDescription(taskData.description || '');
        setEditStatus(taskData.status || '');
        setEditPriority(taskData.priority || '');
        setEditDueDate(taskData.dueDate ? dayjs(taskData.dueDate) : null);

        // Handle assignee - could be string, array of strings, or array of populated objects
        const assigneeArray = Array.isArray(taskData.assignee)
          ? taskData.assignee
              .map((a: any) => {
                // Handle populated employee objects with _id
                if (typeof a === 'object' && a !== null) {
                  return (a._id || a.id || a).toString();
                }
                return a.toString();
              })
              .filter(Boolean)
          : typeof taskData.assignee === 'string'
            ? taskData.assignee.split(',').filter((a) => a.trim())
            : [];
        setEditAssignees(assigneeArray);
        console.log('[TaskDetails] Loaded task data:', taskData);
        console.log('[TaskDetails] Processed assignee IDs:', assigneeArray);

        setTags1(Array.isArray(taskData.tags) ? taskData.tags : []);

        // Load project details - check both project and projectId fields
        const projectIdToLoad = taskData.project || taskData.projectId;
        if (projectIdToLoad) {
          const projectId =
            typeof projectIdToLoad === 'string'
              ? projectIdToLoad
              : (projectIdToLoad as any)?._id || projectIdToLoad;
          console.log('[TaskDetails] Loading project:', projectId);
          const project = await getProjectByIdAPI(projectId);
          console.log('[TaskDetails] Loaded project:', project);
          if (project) {
            setProjectDetails(project);
          }
        } else {
          console.warn('[TaskDetails] No project ID found in task data');
        }
      } else {
        setError('Failed to load task details');
      }
    } catch (error) {
      console.error('[TaskDetails] Error loading task:', error);
      setError('An error occurred while loading task details');
    } finally {
      setLoading(false);
    }
  }, [taskId, getTaskByIdAPI, getProjectByIdAPI]);

  // Load project members from projectDetails (already fetched via REST)
  const loadProjectMembers = useCallback(() => {
    if (!projectDetails) {
      console.log('[TaskDetails] No project details available');
      return;
    }

    console.log('[TaskDetails] Loading project members from:', projectDetails);
    console.log('[TaskDetails] Team Members:', projectDetails.teamMembers);
    console.log('[TaskDetails] Team Leaders:', projectDetails.teamLeader);

    setLoadingMembers(true);
    // Combine team members and team leaders from project details
    const allMembers = [
      ...(projectDetails.teamMembers || []),
      ...(projectDetails.teamLeader || []),
    ];

    console.log('[TaskDetails] Combined members:', allMembers);

    // Remove duplicates based on _id
    const uniqueMembers = allMembers
      .filter(Boolean)
      .filter(
        (member, index, self) =>
          index === self.findIndex((m) => m._id?.toString() === member._id?.toString())
      );

    console.log('[TaskDetails] Unique members after filtering:', uniqueMembers);
    setProjectMembers(uniqueMembers);
    setLoadingMembers(false);
  }, [projectDetails]);

  const loadTaskStatuses = useCallback(async () => {
    try {
      await fetchTaskStatusesAPI();
      // Task statuses will be available via statusesFromHook, sync via useEffect
    } catch (error) {
      console.error('[TaskDetails] Error loading task statuses:', error);
    }
  }, [fetchTaskStatusesAPI]);

  // Sync task statuses from hook
  useEffect(() => {
    if (statusesFromHook && Array.isArray(statusesFromHook)) {
      setTaskStatuses(statusesFromHook);
    }
  }, [statusesFromHook]);

  useEffect(() => {
    loadTask();
    loadTaskStatuses();
  }, [loadTask, loadTaskStatuses]);

  useEffect(() => {
    if (projectDetails) {
      loadProjectMembers();
    }
  }, [projectDetails, loadProjectMembers]);

  // Populate assignee details from task assignees and project members
  useEffect(() => {
    if (!task) {
      setAssigneeDetails([]);
      return;
    }

    // Handle null/undefined assignee
    if (!task.assignee || (Array.isArray(task.assignee) && task.assignee.length === 0)) {
      setAssigneeDetails([]);
      return;
    }

    // Check if assignees are already populated objects with employee data
    const taskAssignees = Array.isArray(task.assignee) ? task.assignee : [];

    // If assignees are populated objects with firstName/lastName, use them directly
    const populatedAssignees = taskAssignees.filter(
      (a: any) => typeof a === 'object' && a !== null && (a.firstName || a.employeeId)
    );

    if (populatedAssignees.length > 0) {
      console.log('[TaskDetails] Using populated assignees from task:', populatedAssignees);
      setAssigneeDetails(populatedAssignees);
      return;
    }

    // Otherwise, try to match with project members
    // Normalize assignee IDs - handle both string arrays and populated object arrays
    const taskAssigneeIds = taskAssignees
      .map((a: any) => {
        // Handle populated employee objects
        if (typeof a === 'object' && a !== null && a._id) {
          return a._id.toString();
        }
        // Handle string IDs
        return a?.toString() || '';
      })
      .filter(Boolean);

    if (taskAssigneeIds.length === 0) {
      setAssigneeDetails([]);
      return;
    }

    console.log('[TaskDetails] Task assignee IDs:', taskAssigneeIds);
    console.log('[TaskDetails] Project members:', projectMembers);

    // If no project members, return empty
    if (!projectMembers || projectMembers.length === 0) {
      console.warn('[TaskDetails] No project members available to match assignees');
      setAssigneeDetails([]);
      return;
    }

    // Match assignee IDs with project members
    const details = projectMembers.filter((member) => {
      const memberId = (member._id || member.id)?.toString();
      if (!memberId) return false;

      return taskAssigneeIds.some((assigneeId) => memberId === assigneeId);
    });

    console.log('[TaskDetails] Matched assignee details:', details);
    setAssigneeDetails(details);
  }, [task, projectMembers]);

  const getModalContainer = () => {
    const modalElement = document.getElementById('modal-datepicker');
    return modalElement ? modalElement : document.body;
  };

  const statusChoose = useMemo(() => {
    const baseOption = [{ value: 'Select', label: 'Select' }];
    if (!taskStatuses || taskStatuses.length === 0) {
      return baseOption;
    }
    return [
      ...baseOption,
      ...taskStatuses.map((status) => ({
        value: status.key,
        label: status.name || status.key,
      })),
    ];
  }, [taskStatuses]);

  const priorityChoose = [
    { value: 'Select', label: 'Select' },
    { value: 'Medium', label: 'Medium' },
    { value: 'High', label: 'High' },
    { value: 'Low', label: 'Low' },
  ];

  const assigneeSelectOptions = useMemo(
    () =>
      (projectMembers || []).map((member) => {
        // Use _id as primary identifier to match backend assignee references
        const rawValue = member?._id || member?.id;
        const value = rawValue ? rawValue.toString() : '';
        return {
          value,
          label: member.employeeId
            ? `${member.employeeId} - ${member.firstName || ''} ${member.lastName || ''}`.trim()
            : `${member.firstName || ''} ${member.lastName || 'Unknown'}`.trim(),
        };
      }),
    [projectMembers]
  );

  const validateEditField = useCallback((field: string, value: any) => {
    switch (field) {
      case 'title':
        return value && value.trim() ? '' : 'Title is required';
      case 'description':
        return value && value.trim() ? '' : 'Description is required';
      case 'status':
        return value ? '' : 'Status is required';
      case 'priority':
        return value ? '' : 'Priority is required';
      case 'assignees':
        return Array.isArray(value) && value.length > 0 ? '' : 'Select at least one assignee';
      default:
        return '';
    }
  }, []);

  const findMatchingStatus = useCallback((taskStatus: string, statuses: any[]) => {
    if (!taskStatus || !statuses || statuses.length === 0) {
      return '';
    }

    const normalizedTaskStatus = taskStatus.toLowerCase().replace(/\s+/g, '');

    const exactMatch = statuses.find((s) => s.key.toLowerCase() === normalizedTaskStatus);
    if (exactMatch) return exactMatch.key;

    const nameMatch = statuses.find(
      (s) => s.name.toLowerCase().replace(/\s+/g, '') === normalizedTaskStatus
    );
    if (nameMatch) return nameMatch.key;

    const partialMatch = statuses.find((s) => {
      const key = s.key.toLowerCase();
      const name = s.name.toLowerCase();
      return (
        key.includes(normalizedTaskStatus) ||
        normalizedTaskStatus.includes(key) ||
        name.includes(normalizedTaskStatus) ||
        normalizedTaskStatus.includes(name)
      );
    });
    if (partialMatch) return partialMatch.key;

    return '';
  }, []);

  const validateEditForm = useCallback(() => {
    const errors: Record<string, string> = {};

    const titleError = validateEditField('title', editTitle);
    if (titleError) errors.title = titleError;

    const descError = validateEditField('description', editDescription);
    if (descError) errors.description = descError;

    const statusError = validateEditField('status', editStatus);
    if (statusError) errors.status = statusError;

    const priorityError = validateEditField('priority', editPriority);
    if (priorityError) errors.priority = priorityError;

    const assigneeError = validateEditField('assignees', editAssignees);
    if (assigneeError) errors.assignees = assigneeError;

    setEditFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [editAssignees, editDescription, editPriority, editStatus, editTitle, validateEditField]);

  const handleOpenEditTaskModal = useCallback(() => {
    if (!task) return;

    setEditTitle(task.title || '');
    setEditDescription(task.description || '');
    const matchedStatus = findMatchingStatus(task.status, taskStatuses);
    setEditStatus(matchedStatus);
    setEditPriority(task.priority || '');
    setEditDueDate(task.dueDate ? dayjs(task.dueDate) : null);

    // Handle assignee - extract IDs from populated objects
    const assigneeIds = Array.isArray(task.assignee)
      ? task.assignee
          .map((a: any) => {
            if (typeof a === 'object' && a !== null) {
              return (a._id || a.id || a).toString();
            }
            return a?.toString();
          })
          .filter(Boolean)
      : [];
    setEditAssignees(assigneeIds);
    console.log('[TaskDetails] Edit modal assignee IDs:', assigneeIds);

    setTags1(Array.isArray(task.tags) ? task.tags : []);
    setEditModalError(null);
    setEditFieldErrors({});
  }, [task, taskStatuses, findMatchingStatus]);

  const handleSaveTask = useCallback(async () => {
    if (!taskId) return;

    if (!validateEditForm()) return;

    setIsSaving(true);
    const validTags = tags1.filter((tag) => tag && tag.trim() !== '');

    try {
      const updateData: Partial<Task> = {
        title: editTitle.trim(),
        description: editDescription,
        status: editStatus as 'Pending' | 'In Progress' | 'Completed' | 'Cancelled',
        priority: editPriority as 'Low' | 'Medium' | 'High' | 'Urgent',
        dueDate: editDueDate ? editDueDate.format('YYYY-MM-DD') : undefined,
        tags: validTags,
        assignee: editAssignees, // Send as array to match backend schema
      };

      const success = await updateTaskAPI(taskId, updateData);
      if (success) {
        // Reload task to get updated data
        await loadTask();
        // Socket.IO broadcast is handled by backend via socketBroadcaster.js
        // No need to emit manually here
      } else {
        setEditModalError('Failed to update task');
      }
    } catch (error) {
      console.error('[TaskDetails] Error updating task:', error);
      setEditModalError('An error occurred while updating the task');
    } finally {
      setIsSaving(false);
    }
  }, [
    taskId,
    editTitle,
    editDescription,
    editStatus,
    editPriority,
    editDueDate,
    tags1,
    editAssignees,
    validateEditForm,
    updateTaskAPI,
    loadTask,
    socket,
  ]);

  const handleSaveAssignees = useCallback(async () => {
    if (!taskId) return;

    setIsSavingAssignees(true);
    setAssigneeModalError(null);

    try {
      // Update assignees only
      const success = await updateTaskAPI(taskId, {
        assignee: selectedNewAssignees, // Send as array to match backend schema
      });

      if (success) {
        // Close modal
        const modalElement = document.getElementById('add_assignee_modal');
        if (modalElement) {
          const modal = (window as any).bootstrap.Modal.getInstance(modalElement);
          if (modal) modal.hide();
        }
        // Reset state
        setSelectedNewAssignees([]);
        setAssigneeModalError(null);
        // Reload task
        await loadTask();
        // Socket.IO broadcast is handled by backend via socketBroadcaster.js
        // No need to emit manually here
      } else {
        setAssigneeModalError('Failed to add assignees');
      }
    } catch (error) {
      console.error('[TaskDetails] Error updating assignees:', error);
      setAssigneeModalError('An error occurred while updating assignees');
    } finally {
      setIsSavingAssignees(false);
    }
  }, [taskId, selectedNewAssignees, updateTaskAPI, loadTask, socket]);

  // Handle Add Assignee Modal Show - Pre-select assigned employees
  // Project members are already loaded from projectDetails via REST
  useEffect(() => {
    const assigneeModal = document.getElementById('add_assignee_modal');
    if (!assigneeModal) return;

    const handleModalShow = () => {
      // Pre-select already assigned employees using editAssignees state
      console.log('[TaskDetails] Add Assignee modal opening');
      console.log('[TaskDetails] Current editAssignees:', editAssignees);
      console.log('[TaskDetails] Available assigneeSelectOptions:', assigneeSelectOptions);
      setSelectedNewAssignees(editAssignees);
    };

    assigneeModal.addEventListener('show.bs.modal', handleModalShow);

    return () => {
      assigneeModal.removeEventListener('show.bs.modal', handleModalShow);
    };
  }, [editAssignees, assigneeSelectOptions]);

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div
            className="d-flex justify-content-center align-items-center"
            style={{ minHeight: '400px' }}
          >
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading task details...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="text-center py-5">
            <i className="ti ti-alert-circle fs-1 text-danger mb-3"></i>
            <h5 className="text-danger">Error Loading Task</h5>
            <p className="text-muted mb-3">{error}</p>
            <button className="btn btn-primary" onClick={loadTask}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="text-center py-5">
            <i className="ti ti-file-x fs-1 text-muted mb-3"></i>
            <h5 className="mb-2">Task Not Found</h5>
            <p className="text-muted mb-3">
              The task you're looking for doesn't exist or has been deleted.
            </p>
            <Link to={all_routes.tasks} className="btn btn-primary">
              Back to Tasks
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-wrapper">
        <div className="content">
          <div className="row align-items-center mb-4">
            <div className="d-md-flex d-sm-block justify-content-between align-items-center flex-wrap">
              <h6 className="fw-medium d-inline-flex align-items-center mb-3 mb-sm-0">
                <Link to={all_routes.tasks}>
                  <i className="ti ti-arrow-left me-2" />
                  Back to List
                </Link>
              </h6>
              <div className="d-flex">
                {!isEmployee && (
                  <div className="text-end">
                    <Link
                      to="#"
                      className="btn btn-primary"
                      data-bs-toggle="modal"
                      data-bs-target="#edit_task"
                      onClick={handleOpenEditTaskModal}
                    >
                      <i className="ti ti-edit me-1" />
                      Edit Task
                    </Link>
                  </div>
                )}
                <div className="head-icons ms-2 text-end">
                  <CollapseHeader />
                </div>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-xl-8">
              <div className="card">
                <div className="card-body pb-1">
                  <div className="d-flex align-items-center justify-content-between flex-wrap row-gap-3 mb-4">
                    <div>
                      <h4 className="mb-1">{task.title || 'Untitled Task'}</h4>
                      <p>
                        Priority :{' '}
                        <span
                          className={`badge ${
                            task.priority === 'High'
                              ? 'badge-danger'
                              : task.priority === 'Medium'
                                ? 'badge-warning'
                                : 'badge-success'
                          }`}
                        >
                          <i className="ti ti-point-filled me-1" />
                          {task.priority || 'Low'}
                        </span>
                      </p>
                    </div>
                    <div className="dropdown">
                      <Link
                        to="#"
                        className="dropdown-toggle btn btn-sm btn-white d-inline-flex align-items-center"
                        data-bs-toggle="dropdown"
                      >
                        <i className="ti ti-file-export me-1" /> Mark All as Completed
                      </Link>
                      <ul className="dropdown-menu  dropdown-menu-end p-3">
                        <li>
                          <Link to="#" className="dropdown-item rounded-1">
                            All Tags
                          </Link>
                        </li>
                        <li>
                          <Link to="#" className="dropdown-item rounded-1">
                            Internal
                          </Link>
                        </li>
                        <li>
                          <Link to="#" className="dropdown-item rounded-1">
                            Projects
                          </Link>
                        </li>
                        <li>
                          <Link to="#" className="dropdown-item rounded-1">
                            Meetings
                          </Link>
                        </li>
                        <li>
                          <Link to="#" className="dropdown-item rounded-1">
                            Reminder
                          </Link>
                        </li>
                        <li>
                          <Link to="#" className="dropdown-item rounded-1">
                            Research
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div className="row align-items-center">
                    <div className="col-sm-12">
                      <div className="mb-3">
                        <h6 className="mb-1">Description</h6>
                        <p>{task.description || 'No description available for this task.'}</p>
                      </div>
                    </div>
                    <div className="col-sm-3">
                      <p className="d-flex align-items-center mb-3">
                        <i className="ti ti-user-shield me-2" />
                        Assignee
                      </p>
                    </div>
                    <div className="col-sm-9">
                      <div className="d-flex align-items-center mb-3 flex-wrap">
                        {assigneeDetails && assigneeDetails.length > 0 ? (
                          assigneeDetails.map((member: any, index: number) => (
                            <div
                              key={member._id || index}
                              className="bg-gray-100 p-1 rounded d-flex align-items-center me-2"
                            >
                              <span className="avatar avatar-sm avatar-rounded border border-white flex-shrink-0 me-2">
                                <ImageWithBasePath
                                  src={`assets/img/users/user-${42 + index}.jpg`}
                                  alt="Img"
                                />
                              </span>
                              <h6 className="fs-12">
                                <Link to="#">
                                  {member.employeeId} - {member.firstName} {member.lastName}{' '}
                                </Link>
                              </h6>
                            </div>
                          ))
                        ) : (
                          <p className="text-muted mb-0">No assignee assigned</p>
                        )}
                        {!isEmployee && (
                          <div>
                            <Link
                              to="#"
                              className="d-flex align-items-center fs-12"
                              data-bs-toggle="modal"
                              data-bs-target="#add_assignee_modal"
                            >
                              <i className="ti ti-circle-plus me-1" />
                              Add New
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="col-sm-3">
                      <p className="d-flex align-items-center mb-3">
                        <i className="ti ti-bookmark me-2" />
                        Tags
                      </p>
                    </div>
                    <div className="col-sm-9">
                      <div className="d-flex align-items-center mb-3">
                        {task.tags && task.tags.length > 0 ? (
                          task.tags.map((tag: any, index: number) => (
                            <Link
                              key={index}
                              to="#"
                              className={`badge task-tag rounded-pill me-2 ${
                                index % 2 === 0 ? 'bg-pink' : 'badge-info'
                              }`}
                            >
                              {typeof tag === 'string' ? tag : tag?.name || 'Tag'}
                            </Link>
                          ))
                        ) : (
                          <p className="text-muted mb-0">No tags assigned</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-4">
              <div className="card">
                <div className="card-body p-0">
                  <div className="d-flex flex-column">
                    <div className="d-flex align-items-center justify-content-between border-bottom p-3">
                      <p className="mb-0">Project</p>
                      <h6 className="fw-normal">
                        {(() => {
                          // Get project ID
                          const projectIdDisplay =
                            projectDetails?.projectId ||
                            (typeof task.projectId === 'object'
                              ? task.projectId?.projectId || task.projectId?._id
                              : task.projectId) ||
                            '';

                          // Get project name
                          const projectName =
                            projectDetails?.name ||
                            projectDetails?.title ||
                            task.projectName ||
                            (typeof task.project === 'object'
                              ? task.project?.name || task.project?.title
                              : task.project) ||
                            (typeof task.projectId === 'object'
                              ? task.projectId?.name || task.projectId?.title
                              : '') ||
                            'No project assigned';

                          return projectIdDisplay
                            ? `${projectIdDisplay} - ${projectName}`
                            : projectName;
                        })()}
                      </h6>
                    </div>
                    <div className="d-flex align-items-center justify-content-between border-bottom p-3">
                      <p className="mb-0">Status</p>
                      <span
                        className={`badge ${
                          task.status === 'Completed'
                            ? 'badge-success'
                            : task.status === 'Inprogress'
                              ? 'badge-warning'
                              : task.status === 'Onhold'
                                ? 'badge-secondary'
                                : 'badge-info'
                        }`}
                      >
                        <i className="ti ti-point-filled me-1" />
                        {task.status || 'Pending'}
                      </span>
                    </div>
                    <div className="d-flex align-items-center justify-content-between border-bottom p-3">
                      <p className="mb-0">Created on</p>
                      <h6 className="fw-normal">
                        {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : 'Not set'}
                      </h6>
                    </div>
                    <div className="d-flex align-items-center justify-content-between p-3">
                      <p className="mb-0">Due Date</p>
                      <h6 className="fw-normal">
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                      </h6>
                    </div>
                  </div>
                </div>
              </div>
              <div className="custom-accordion-items">
                <div className="accordion accordions-items-seperate">
                  <div className="accordion-item flex-fill">
                    <div className="accordion-header" id="headingSix">
                      <div className="accordion-button">
                        <div className="d-flex align-items-center flex-fill">
                          <h5>Activity</h5>
                          <div className="d-flex align-items-center ms-auto">
                            <Link
                              to="#"
                              className="d-flex align-items-center collapse-arrow"
                              data-bs-toggle="collapse"
                              data-bs-target="#primaryBorderSix"
                              aria-expanded="true"
                              aria-controls="primaryBorderSix"
                            >
                              <i className="ti ti-chevron-down fs-18" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      id="primaryBorderSix"
                      className="accordion-collapse collapse show border-top"
                      aria-labelledby="headingSix"
                    >
                      <div className="accordion-body">
                        <div className="notice-widget">
                          {task.activities && task.activities.length > 0 ? (
                            task.activities.map((activity: any, index: number) => (
                              <div
                                key={index}
                                className="d-flex align-items-center justify-content-between mb-4"
                              >
                                <div className="d-flex overflow-hidden">
                                  <span
                                    className={`avatar avatar-md me-3 rounded-circle flex-shrink-0 ${
                                      activity.type === 'task_created'
                                        ? 'bg-info'
                                        : activity.type === 'task_updated'
                                          ? 'bg-warning'
                                          : activity.type === 'task_completed'
                                            ? 'bg-success'
                                            : activity.type === 'file_uploaded'
                                              ? 'bg-secondary'
                                              : 'bg-purple'
                                    }`}
                                  >
                                    <i
                                      className={`fs-16 ${
                                        activity.type === 'task_created'
                                          ? 'ti ti-checkup-list'
                                          : activity.type === 'task_updated'
                                            ? 'ti ti-circle-dot'
                                            : activity.type === 'task_completed'
                                              ? 'ti ti-check'
                                              : activity.type === 'file_uploaded'
                                                ? 'ti ti-photo'
                                                : 'ti ti-activity'
                                      }`}
                                    />
                                  </span>
                                  <div className="overflow-hidden">
                                    <p className="text-truncate mb-1">
                                      <span className="text-gray-9 fw-medium">
                                        {activity.user || 'Unknown User'}
                                      </span>{' '}
                                      {activity.message || activity.description}
                                    </p>
                                    <p className="mb-1">
                                      {activity.timestamp
                                        ? new Date(activity.timestamp).toLocaleString()
                                        : 'Unknown time'}
                                    </p>
                                    {activity.statusChange && (
                                      <div className="d-flex align-items-center">
                                        {activity.oldStatus && (
                                          <span className="badge badge-success me-2">
                                            <i className="ti ti-point-filled me-1" />
                                            {activity.oldStatus}
                                          </span>
                                        )}
                                        {activity.oldStatus && activity.newStatus && (
                                          <span>
                                            <i className="ti ti-arrows-left-right me-2" />
                                          </span>
                                        )}
                                        {activity.newStatus && (
                                          <span className="badge badge-purple">
                                            <i className="ti ti-point-filled me-1" />
                                            {activity.newStatus}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-4">
                              <i className="ti ti-activity fs-1 text-muted mb-3"></i>
                              <p className="text-muted">No activities found for this task</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
      {/* /Page Wrapper */}

      {/* Edit Task */}
      <div className="modal fade" id="edit_task">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Edit Task</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form action={all_routes.tasks}>
              <div className="modal-body">
                {editModalError && (
                  <div className="alert alert-danger alert-dismissible fade show" role="alert">
                    <i className="ti ti-alert-circle me-2"></i>
                    {editModalError}
                  </div>
                )}
                <div className="row">
                  <div className="col-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Task Title <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${editFieldErrors.title ? 'is-invalid' : ''}`}
                        value={editTitle}
                        onChange={(e) => {
                          setEditTitle(e.target.value);
                          setEditFieldErrors((prev) => ({ ...prev, title: '' }));
                        }}
                        placeholder="Enter task title"
                      />
                      {editFieldErrors.title && (
                        <div className="invalid-feedback">{editFieldErrors.title}</div>
                      )}
                    </div>
                  </div>

                  <div className="col-12">
                    <div className="mb-3">
                      <label className="form-label">Tags</label>
                      <CommonTagsInput
                        value={tags1}
                        onChange={setTags1}
                        placeholder="Add new"
                        className="custom-input-class"
                      />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Priority <span className="text-danger">*</span>
                      </label>
                      <CommonSelect
                        className={`select ${editFieldErrors.priority ? 'is-invalid' : ''}`}
                        options={priorityChoose}
                        value={priorityChoose.find((p) => p.value === editPriority)}
                        onChange={(option: any) => {
                          setEditPriority(option?.value || '');
                          setEditFieldErrors((prev) => ({ ...prev, priority: '' }));
                        }}
                      />
                      {editFieldErrors.priority && (
                        <div className="invalid-feedback d-block">{editFieldErrors.priority}</div>
                      )}
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Status <span className="text-danger">*</span>
                      </label>
                      <CommonSelect
                        className={`select ${editFieldErrors.status ? 'is-invalid' : ''}`}
                        options={statusChoose}
                        value={statusChoose.find((s) => s.value === editStatus) || statusChoose[0]}
                        onChange={(option: any) => {
                          setEditStatus(option?.value || '');
                          setEditFieldErrors((prev) => ({ ...prev, status: '' }));
                        }}
                      />
                      {editFieldErrors.status && (
                        <div className="invalid-feedback d-block">{editFieldErrors.status}</div>
                      )}
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Due Date <span className="text-danger">*</span>
                      </label>
                      <div className="input-icon-end position-relative">
                        <DatePicker
                          className="form-control datetimepicker"
                          format={{
                            format: 'DD-MM-YYYY',
                            type: 'mask',
                          }}
                          getPopupContainer={getModalContainer}
                          placeholder="DD-MM-YYYY"
                          value={editDueDate}
                          onChange={(value) => setEditDueDate(value)}
                        />
                        <span className="input-icon-addon">
                          <i className="ti ti-calendar text-gray-7" />
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="col-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Description <span className="text-danger">*</span>
                      </label>
                      <textarea
                        className={`form-control ${editFieldErrors.description ? 'is-invalid' : ''}`}
                        rows={4}
                        value={editDescription}
                        onChange={(e) => {
                          setEditDescription(e.target.value);
                          setEditFieldErrors((prev) => ({ ...prev, description: '' }));
                        }}
                        placeholder="Enter task description"
                      />
                      {editFieldErrors.description && (
                        <div className="invalid-feedback">{editFieldErrors.description}</div>
                      )}
                    </div>
                  </div>

                  <div className="col-12">
                    <div className="mb-0">
                      <label className="form-label">
                        Add Assignee <span className="text-danger">*</span>
                      </label>
                      <Select
                        isMulti
                        className={`basic-multi-select ${editFieldErrors.assignees ? 'is-invalid' : ''}`}
                        classNamePrefix="select"
                        options={assigneeSelectOptions}
                        value={assigneeSelectOptions.filter((opt) =>
                          editAssignees.includes(opt.value)
                        )}
                        onChange={(opts) => {
                          setEditAssignees((opts || []).map((opt: any) => opt.value));
                          setEditFieldErrors((prev) => ({ ...prev, assignees: '' }));
                        }}
                        placeholder={
                          assigneeSelectOptions.length === 0
                            ? 'No team members available'
                            : 'Select assignees'
                        }
                        isDisabled={assigneeSelectOptions.length === 0}
                      />
                      {editFieldErrors.assignees && (
                        <div className="invalid-feedback d-block">{editFieldErrors.assignees}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-light border me-2"
                  data-bs-dismiss="modal"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveTask}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Edit Task */}

      {/* Add Assignee Modal */}
      <div className="modal fade" id="add_assignee_modal" role="dialog">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Add Assignee</h5>
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
              <div className="mb-3">
                <label className="form-label">Select Assignees</label>
                <Select
                  isMulti
                  className="basic-multi-select"
                  classNamePrefix="select"
                  options={assigneeSelectOptions}
                  value={assigneeSelectOptions.filter((opt) =>
                    selectedNewAssignees.includes(opt.value)
                  )}
                  onChange={(opts) =>
                    setSelectedNewAssignees((opts || []).map((opt: any) => opt.value))
                  }
                  placeholder={
                    projectMembers.length === 0 ? 'No team members available' : 'Select assignees'
                  }
                  isDisabled={projectMembers.length === 0}
                />
              </div>
              {assigneeModalError && (
                <div className="alert alert-danger" role="alert">
                  {assigneeModalError}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline-light border me-2"
                data-bs-dismiss="modal"
                disabled={isSavingAssignees}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveAssignees}
                disabled={isSavingAssignees || selectedNewAssignees.length === 0}
              >
                {isSavingAssignees ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* /Add Assignee Modal */}
    </>
  );
};

export default TaskDetails;
