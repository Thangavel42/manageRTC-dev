import { useAuth } from '@clerk/clerk-react';
import { DatePicker, message } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Select from 'react-select';
import CollapseHeader from '../../../core/common/collapse-header/collapse-header';
import CommonSelect from '../../../core/common/commonSelect';
import Footer from '../../../core/common/footer';
import ImageWithBasePath from '../../../core/common/imageWithBasePath';
import CommonTagsInput from '../../../core/common/Taginput';
import { useProjectsREST } from '../../../hooks/useProjectsREST';
import { useTasksREST } from '../../../hooks/useTasksREST';
import { all_routes } from '../../router/all_routes';

const Task = () => {
  const getModalContainer = () => {
    const modalElement = document.getElementById('modal-datepicker');
    return modalElement ? modalElement : document.body;
  };

  const { userId } = useAuth();
  const {
    tasks,
    loading: tasksLoading,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    getTasksByProject,
  } = useTasksREST();
  const {
    projects,
    loading: projectsLoading,
    fetchProjects,
    getProjectTeamMembers,
  } = useProjectsREST();
  const [employees, setEmployees] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    priority: 'all',
    status: 'all',
    project: 'all',
    search: '',
  });
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [projectTeamMembers, setProjectTeamMembers] = useState<any[]>([]);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);
  const [addForm, setAddForm] = useState({
    title: '',
    projectId: '',
    assignees: [] as string[],
    dueDate: null as Dayjs | null,
    status: 'To do',
    priority: 'Medium',
    description: '',
    tags: [] as string[],
  });
  const [editForm, setEditForm] = useState({
    title: '',
    projectId: '',
    assignees: [] as string[],
    dueDate: null as Dayjs | null,
    status: 'To do',
    priority: 'Medium',
    description: '',
    tags: [] as string[],
  });
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [creatingTask, setCreatingTask] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string>>({});
  const [savingEditTask, setSavingEditTask] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [deletingTask, setDeletingTask] = useState(false);

  // Derived counts: total and completed tasks per project (from project data or tasks)
  const projectTaskCounts = React.useMemo(() => {
    const counts: Record<string, { total: number; completed: number }> = {};

    // First, use task counts from project data if available
    projects.forEach((project: any) => {
      if (project._id) {
        counts[project._id] = {
          total: project.taskCount || 0,
          completed: project.completedTaskCount || 0,
        };
      }
    });

    return counts;
  }, [projects]);

  const getProjectCounts = React.useCallback(
    (projectId: string) => {
      const total = projectTaskCounts[projectId]?.total || 0;
      const completed = projectTaskCounts[projectId]?.completed || 0;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { total, completed, percent };
    },
    [projectTaskCounts]
  );

  // Dynamic project options from loaded projects
  const projectChoose = React.useMemo(
    () => [
      { value: 'Select', label: 'Select' },
      ...projects
        .filter((project) => project.status !== 'Completed')
        .map((project) => ({
          value: project._id,
          label: project.name || 'Untitled Project',
        })),
    ],
    [projects]
  );

  // Dynamic employee options for team members (from selected project)
  const employeeOptions = React.useMemo(
    () =>
      (Array.isArray(projectTeamMembers) ? projectTeamMembers : []).map((emp) => {
        const name = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
        return {
          value: emp._id,
          label: name ? `${emp.employeeId || ''} - ${name}` : emp.employeeId || 'Unknown',
        };
      }),
    [projectTeamMembers]
  );

  const statusChoose = [
    { value: 'To do', label: 'To do' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Inprogress', label: 'Inprogress' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Onhold', label: 'Onhold' },
    { value: 'Review', label: 'Review' },
    { value: 'Cancelled', label: 'Cancelled' },
  ];
  const priorityChoose = [
    { value: 'Medium', label: 'Medium' },
    { value: 'High', label: 'High' },
    { value: 'Low', label: 'Low' },
  ];

  const loadTasks = useCallback(() => {
    // Only load tasks if a project is selected
    if (!filters.project || filters.project === 'all') {
      console.log('[Task] No project selected, skipping task load');
      return;
    }

    setError(null);
    // Convert filters to REST format
    const restFilters: any = {};
    if (filters.priority && filters.priority !== 'all') {
      restFilters.priority = filters.priority;
    }
    if (filters.status && filters.status !== 'all') {
      restFilters.status = filters.status;
    }
    if (filters.project && filters.project !== 'all') {
      restFilters.project = filters.project;
    }
    if (filters.search) {
      restFilters.search = filters.search;
    }

    console.log('[Task] Loading tasks for project:', filters.project);
    fetchTasks(restFilters);
  }, [filters, fetchTasks]);

  const loadProjects = useCallback(async () => {
    try {
      setError(null);
      await fetchProjects();
      console.log('[Task] Projects loaded with task counts');
    } catch (err) {
      console.error('[Task] Failed to load projects:', err);
      setError('Failed to load projects');
      message.error('Failed to load projects');
    }
  }, [fetchProjects]);

  const validateField = useCallback(
    (field: string, value: any): string => {
      switch (field) {
        case 'title':
          if (!value || !value.trim()) return 'Task title is required';
          if (value.trim().length < 3) return 'Task title must be at least 3 characters';
          return '';
        case 'projectId':
          if (!value || value === 'Select') return 'Please select a project';
          return '';
        case 'assignees':
          if (!Array.isArray(value) || value.length === 0)
            return 'Please select at least one assignee';
          return '';
        case 'dueDate':
          if (!value) return 'Due date is required';
          const selectedProjectData = projects.find((p) => p._id === addForm.projectId);
          if (
            selectedProjectData?.dueDate &&
            dayjs(value).isAfter(dayjs(selectedProjectData.dueDate))
          ) {
            return `Due date cannot exceed project end date (${dayjs(selectedProjectData.dueDate).format('DD-MM-YYYY')})`;
          }
          return '';
        case 'priority':
          if (!value || value === 'Select') return 'Please select a priority';
          return '';
        case 'description':
          if (!value || !value.trim()) return 'Description is required';
          if (value.trim().length < 10) return 'Description must be at least 10 characters';
          return '';
        default:
          return '';
      }
    },
    [projects, addForm.projectId]
  );

  const validateEditField = useCallback(
    (field: string, value: any): string => {
      switch (field) {
        case 'title':
          if (!value || !value.trim()) return 'Task title is required';
          if (value.trim().length < 3) return 'Task title must be at least 3 characters';
          return '';
        case 'dueDate':
          if (!value) return 'Due date is required';
          const selectedProjectData = projects.find((p) => p._id === editForm.projectId);
          if (
            selectedProjectData?.dueDate &&
            dayjs(value).isAfter(dayjs(selectedProjectData.dueDate))
          ) {
            return `Due date cannot exceed project end date (${dayjs(selectedProjectData.dueDate).format('DD-MM-YYYY')})`;
          }
          return '';
        case 'priority':
          if (!value || value === 'Select') return 'Please select a priority';
          return '';
        case 'status':
          if (!value || value === 'Select') return 'Please select a status';
          return '';
        case 'description':
          if (!value || !value.trim()) return 'Description is required';
          if (value.trim().length < 10) return 'Description must be at least 10 characters';
          return '';
        case 'assignees':
          if (!Array.isArray(value) || value.length === 0)
            return 'Please select at least one assignee';
          return '';
        default:
          return '';
      }
    },
    [projects, editForm.projectId]
  );

  const validateEditForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    const titleError = validateEditField('title', editForm.title);
    if (titleError) errors.title = titleError;

    const dueDateError = validateEditField('dueDate', editForm.dueDate);
    if (dueDateError) errors.dueDate = dueDateError;

    const priorityError = validateEditField('priority', editForm.priority);
    if (priorityError) errors.priority = priorityError;

    const statusError = validateEditField('status', editForm.status);
    if (statusError) errors.status = statusError;

    const descriptionError = validateEditField('description', editForm.description);
    if (descriptionError) errors.description = descriptionError;

    const assigneesError = validateEditField('assignees', editForm.assignees);
    if (assigneesError) errors.assignees = assigneesError;

    setEditFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [editForm, validateEditField]);

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors((prev) => ({ ...prev, [field]: '' }));
  }, []);

  const clearEditFieldError = useCallback((field: string) => {
    setEditFieldErrors((prev) => ({ ...prev, [field]: '' }));
  }, []);

  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    const titleError = validateField('title', addForm.title);
    if (titleError) errors.title = titleError;

    const projectError = validateField('projectId', addForm.projectId);
    if (projectError) errors.projectId = projectError;

    const assigneesError = validateField('assignees', addForm.assignees);
    if (assigneesError) errors.assignees = assigneesError;

    const dueDateError = validateField('dueDate', addForm.dueDate);
    if (dueDateError) errors.dueDate = dueDateError;

    const priorityError = validateField('priority', addForm.priority);
    if (priorityError) errors.priority = priorityError;

    const descriptionError = validateField('description', addForm.description);
    if (descriptionError) errors.description = descriptionError;

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [addForm, validateField]);

  const handleProjectSelection = useCallback(
    async (projectId: string) => {
      console.log('Selected project ID:', projectId);
      if (!projectId || projectId === 'Select') {
        setSelectedProject(null);
        setProjectTeamMembers([]);
        setAddForm((prev) => ({ ...prev, projectId: '', assignees: [] }));
        return;
      }

      setSelectedProject(projectId);
      setAddForm((prev) => ({ ...prev, projectId, assignees: [] }));
      clearFieldError('projectId');
      setLoadingTeamMembers(true);
      setProjectTeamMembers([]);

      const teamMembers = await getProjectTeamMembers(projectId);
      setProjectTeamMembers(teamMembers);
      setLoadingTeamMembers(false);
    },
    [getProjectTeamMembers, clearFieldError]
  );

  const handlePriorityFilter = useCallback((priority: string) => {
    setFilters((prev) => ({ ...prev, priority }));
  }, []);

  const handleProjectTasksClick = useCallback(
    (projectId) => {
      console.log('Filtering tasks for project:', projectId);
      if (!projectId) return;
      getTasksByProject(projectId);
    },
    [getTasksByProject]
  );

  const resetAddForm = useCallback(() => {
    setAddForm({
      title: '',
      projectId: '',
      assignees: [],
      dueDate: null,
      status: 'To do',
      priority: 'Medium',
      description: '',
      tags: [],
    });
    setSelectedProject(null);
    setProjectTeamMembers([]);
    setLoadingTeamMembers(false);
    setFormError(null);
    setFieldErrors({});
  }, []);

  const closeAddModal = useCallback(() => {
    const modalElement = document.getElementById('add_task');
    const bootstrapAny = (window as any)?.bootstrap;
    try {
      const modalInstance =
        bootstrapAny?.Modal?.getInstance?.(modalElement) ||
        bootstrapAny?.Modal?.getOrCreateInstance?.(modalElement);
      if (modalInstance) {
        modalInstance.hide();
        return;
      }
      const closeBtn = modalElement?.querySelector(
        '[data-bs-dismiss="modal"]'
      ) as HTMLElement | null;
      closeBtn?.click?.();
    } catch {
      const closeBtn = modalElement?.querySelector(
        '[data-bs-dismiss="modal"]'
      ) as HTMLElement | null;
      closeBtn?.click?.();
    }
  }, []);

  const handleTaskCreateResponse = useCallback(
    (success: boolean, errorMsg?: string) => {
      setCreatingTask(false);
      if (success) {
        // Close modal first, then reset form state
        closeAddModal();
        resetAddForm();
        // Reload tasks and projects to refresh all counts and lists
        loadTasks();
        loadProjects();
        return;
      }

      setFormError(errorMsg || 'Failed to create task');
      if (errorMsg) message.error(errorMsg);
    },
    [closeAddModal, loadTasks, loadProjects, resetAddForm]
  );

  const closeEditModal = useCallback(() => {
    const modalElement = document.getElementById('edit_task');
    const bootstrapAny = (window as any)?.bootstrap;
    try {
      const modalInstance =
        bootstrapAny?.Modal?.getInstance?.(modalElement) ||
        bootstrapAny?.Modal?.getOrCreateInstance?.(modalElement);
      if (modalInstance) {
        modalInstance.hide();
        return;
      }
      const closeBtn = modalElement?.querySelector(
        '[data-bs-dismiss="modal"]'
      ) as HTMLElement | null;
      closeBtn?.click?.();
    } catch {
      const closeBtn = modalElement?.querySelector(
        '[data-bs-dismiss="modal"]'
      ) as HTMLElement | null;
      closeBtn?.click?.();
    }
  }, []);

  const handleTaskUpdateResponse = useCallback(
    (success: boolean, errorMsg?: string) => {
      setSavingEditTask(false);
      if (success) {
        message.success('Task updated successfully');
        closeEditModal();
        setEditFieldErrors({});
        setEditFormError(null);
        loadTasks();
        loadProjects();
        return;
      }

      setEditFormError(errorMsg || 'Failed to update task');
      if (errorMsg) message.error(errorMsg);
    },
    [closeEditModal, loadTasks, loadProjects]
  );

  const handleDeleteTask = useCallback(async () => {
    if (!deleteTaskId) {
      message.error('Task ID not found');
      return;
    }

    setDeletingTask(true);
    const success = await deleteTask(deleteTaskId);
    if (success) {
      message.success('Task deleted successfully');
      setDeleteTaskId(null);
      loadTasks();
      loadProjects();
    }
    setDeletingTask(false);
  }, [deleteTaskId, deleteTask, loadTasks, loadProjects]);

  const handleSaveEditTask = useCallback(async () => {
    if (!editTaskId) {
      message.error('Task ID not found');
      return;
    }

    if (!validateEditForm()) {
      return;
    }

    const { title, assignees, dueDate, status, priority, description, tags } = editForm;

    const updateData: any = {
      title: title.trim(),
      assignee: assignees,
      status,
      priority,
      description,
      tags,
    };

    if (dueDate) {
      updateData.dueDate = dueDate.toDate();
    }

    setSavingEditTask(true);
    setEditFormError(null);
    setEditFieldErrors({});

    const success = await updateTask(editTaskId, updateData);
    if (success) {
      message.success('Task updated successfully');
      closeEditModal();
      setEditFieldErrors({});
      setEditFormError(null);
      loadTasks();
      loadProjects();
    } else {
      setSavingEditTask(false);
    }
  }, [editForm, editTaskId, validateEditForm, updateTask, closeEditModal, loadTasks, loadProjects]);

  const handleAddTaskSubmit = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    const { title, projectId, assignees, dueDate, status, priority, description, tags } = addForm;

    const taskData: any = {
      title: title.trim(),
      projectId,
      assignee: assignees,
      status,
      priority,
      description,
      tags,
      createdBy: userId || 'unknown',
    };

    if (dueDate) {
      taskData.dueDate = dueDate.toDate();
    }

    setCreatingTask(true);
    setFormError(null);
    setFieldErrors({});

    const success = await createTask(taskData);
    if (success) {
      // Close modal first, then reset form state
      closeAddModal();
      resetAddForm();
      // Reload tasks and projects to refresh all counts and lists
      loadTasks();
      loadProjects();
    } else {
      setCreatingTask(false);
    }
  }, [
    addForm,
    userId,
    validateForm,
    createTask,
    closeAddModal,
    resetAddForm,
    loadTasks,
    loadProjects,
  ]);

  const getEmployeeById = useCallback(
    (employeeId: string) => {
      if (!employeeId || !employees.length) return null;
      const employee = employees.find((emp) => emp._id === employeeId);
      if (employee) {
        return {
          name: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
          employeeId: employee.employeeId || '',
        };
      }
      return null;
    },
    [employees]
  );

  // Initial load - only load projects on mount (tasks loaded by filter changes)
  useEffect(() => {
    loadProjects();
  }, []); // Only run once on mount

  useEffect(() => {
    loadTasks();
  }, [filters, loadTasks]);

  // Reset modal state when modals open
  useEffect(() => {
    const addTaskModal = document.getElementById('add_task');
    const editTaskModal = document.getElementById('edit_task');

    const resetModalState = () => {
      resetAddForm();
      setEditForm({
        title: '',
        projectId: '',
        assignees: [],
        dueDate: null,
        status: 'To do',
        priority: 'Medium',
        description: '',
        tags: [],
      });
    };

    if (addTaskModal) {
      addTaskModal.addEventListener('show.bs.modal', resetModalState);
    }
    if (editTaskModal) {
      editTaskModal.addEventListener('show.bs.modal', resetModalState);
    }

    return () => {
      if (addTaskModal) {
        addTaskModal.removeEventListener('show.bs.modal', resetModalState);
      }
      if (editTaskModal) {
        editTaskModal.removeEventListener('show.bs.modal', resetModalState);
      }
    };
  }, [resetAddForm]);

  return (
    <>
      <div className="page-wrapper">
        <div className="content">
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Tasks</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={all_routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">Employee</li>
                  <li className="breadcrumb-item active">Tasks</li>
                </ol>
              </nav>
            </div>
            <div className="my-xl-auto right-content d-flex">
              <div className="mb-2">
                <Link
                  to="#"
                  data-bs-toggle="modal"
                  data-bs-target="#add_task"
                  className="btn btn-primary d-flex align-items-center"
                >
                  <i className="ti ti-circle-plus me-2" />
                  Add Task
                </Link>
              </div>
              <div className="head-icons ms-2 mb-0">
                <CollapseHeader />
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-xl-4">
              <div style={{ maxHeight: '550px', overflowY: 'auto' }}>
                {error ? (
                  <div className="text-center py-5">
                    <i className="ti ti-alert-circle fs-1 text-danger mb-3"></i>
                    <h6 className="text-danger">Error loading projects</h6>
                    <p className="text-muted small">{error}</p>
                  </div>
                ) : projects.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="ti ti-folder-x fs-1 text-muted mb-3"></i>
                    <h6 className="text-muted">No projects found</h6>
                    <p className="text-muted small">Create your first project to see tasks</p>
                  </div>
                ) : (
                  projects.slice(0, 5).map((project: any, index: number) => (
                    <div key={project._id} className="card">
                      <div className="card-body">
                        <div className="d-flex align-items-center pb-3 mb-3 border-bottom">
                          <Link
                            to={`${all_routes.projectdetails}/${project._id}`}
                            className="flex-shrink-0 me-2"
                          >
                            <ImageWithBasePath
                              src={`assets/img/social/project-0${(index % 5) + 1}.svg`}
                              alt="Img"
                            />
                          </Link>
                          <div>
                            <h6 className="mb-1">
                              <span
                                className={`text-dark text-truncate d-inline-block ${hoveredProjectId === project._id ? 'text-primary' : ''}`}
                                style={{ cursor: 'pointer' }}
                                onMouseEnter={() => setHoveredProjectId(project._id)}
                                onMouseLeave={() => setHoveredProjectId(null)}
                                onClick={() => handleProjectTasksClick(project._id)}
                              >
                                {project.name || 'Untitled Project'}
                              </span>
                            </h6>
                            <div className="d-flex align-items-center">
                              <span className="mx-1" title="Show tasks for this project">
                                {project.taskCount} tasks
                              </span>
                              <span className="mx-1">
                                <i className="ti ti-point-filled text-primary" />
                              </span>
                              <span>{project.completedtaskCount} Completed</span>
                            </div>
                          </div>
                        </div>
                        <div className="row">
                          <div className="col-sm-4">
                            <div className="mb-3">
                              <span className="mb-1 d-block">Deadline</span>
                              <p className="text-dark">
                                {project.dueDate
                                  ? new Date(project.dueDate).toLocaleDateString('en-GB', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                    })
                                  : 'No deadline'}
                              </p>
                            </div>
                          </div>
                          <div className="col-sm-4">
                            <div className="mb-3">
                              <span className="mb-1 d-block">Value</span>
                              <p className="text-dark">${project.projectValue || '0'}</p>
                            </div>
                          </div>
                          <div className="col-sm-4">
                            <div className="mb-3">
                              <span className="mb-1 d-block">Project Lead</span>
                              <h6 className="fw-normal d-flex align-items-center">
                                {(() => {
                                  const teamLead =
                                    Array.isArray(project.teamleadName) &&
                                    project.teamleadName.length > 0
                                      ? project.teamleadName[0]
                                      : null;

                                  if (teamLead && teamLead.name) {
                                    return (
                                      <>
                                        <span
                                          className="text-truncate"
                                          title={`${teamLead.name} (${teamLead.employeeId || 'N/A'})`}
                                        >
                                          {teamLead.name}
                                          <small className="text-muted ms-1">
                                            ({teamLead.employeeId || 'N/A'})
                                          </small>
                                        </span>
                                      </>
                                    );
                                  }

                                  return (
                                    <>
                                      <ImageWithBasePath
                                        className="avatar avatar-xs rounded-circle me-1"
                                        src={`assets/img/profiles/avatar-0${(index % 10) + 1}.jpg`}
                                        alt="Unassigned"
                                      />
                                      <span className="text-muted">Unassigned</span>
                                    </>
                                  );
                                })()}
                              </h6>
                            </div>
                          </div>
                        </div>
                        <div className="bg-light p-2">
                          <div className="row align-items-center">
                            <div className="col-6">
                              <span className="fw-medium d-flex align-items-center">
                                <i className="ti ti-checkbox text-info me-2" />
                                {getProjectCounts(project._id).completed} /{' '}
                                {getProjectCounts(project._id).total} Tasks
                              </span>
                            </div>
                            <div className="col-6">
                              <div>
                                <div className="d-flex align-items-center justify-content-between mb-1">
                                  <small className="text-dark">
                                    {getProjectCounts(project._id).percent}% Completed
                                  </small>
                                </div>
                                <div className="progress progress-xs">
                                  <div
                                    className="progress-bar"
                                    role="progressbar"
                                    style={{
                                      width: `${getProjectCounts(project._id).percent}%`,
                                      backgroundColor: (() => {
                                        const pc = getProjectCounts(project._id).percent;
                                        return pc > 80
                                          ? '#28a745'
                                          : pc > 50
                                            ? '#17a2b8'
                                            : '#dc3545';
                                      })(),
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="col-xl-8">
              <div className="row">
                <div className="col-lg-5">
                  <div className="d-flex align-items-center flex-wrap row-gap-3 mb-3">
                    <h6 className="me-2">Priority</h6>
                    <ul
                      className="nav nav-pills border d-inline-flex p-1 rounded bg-light todo-tabs"
                      id="pills-tab"
                      role="tablist"
                    >
                      <li className="nav-item" role="presentation">
                        <button
                          className={`nav-link btn btn-sm btn-icon py-3 d-flex align-items-center justify-content-center w-auto ${filters.priority === 'all' ? 'active' : ''}`}
                          onClick={() => handlePriorityFilter('all')}
                          type="button"
                          role="tab"
                        >
                          All
                        </button>
                      </li>
                      <li className="nav-item" role="presentation">
                        <button
                          className={`nav-link btn btn-sm btn-icon py-3 d-flex align-items-center justify-content-center w-auto ${filters.priority === 'High' ? 'active' : ''}`}
                          onClick={() => handlePriorityFilter('High')}
                          type="button"
                          role="tab"
                        >
                          High
                        </button>
                      </li>
                      <li className="nav-item" role="presentation">
                        <button
                          className={`nav-link btn btn-sm btn-icon py-3 d-flex align-items-center justify-content-center w-auto ${filters.priority === 'Medium' ? 'active' : ''}`}
                          onClick={() => handlePriorityFilter('Medium')}
                          type="button"
                          role="tab"
                        >
                          Medium
                        </button>
                      </li>
                      <li className="nav-item" role="presentation">
                        <button
                          className={`nav-link btn btn-sm btn-icon py-3 d-flex align-items-center justify-content-center w-auto ${filters.priority === 'Low' ? 'active' : ''}`}
                          onClick={() => handlePriorityFilter('Low')}
                          type="button"
                          role="tab"
                        >
                          Low
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="col-lg-7">
                  <div className="d-flex align-items-center justify-content-lg-end flex-wrap row-gap-3 mb-3">
                    <div className="input-icon w-120 position-relative me-2">
                      <span className="input-icon-addon">
                        <i className="ti ti-calendar" />
                      </span>
                      <DatePicker
                        className="form-control datetimepicker"
                        format={{
                          format: 'DD-MM-YYYY',
                          type: 'mask',
                        }}
                        getPopupContainer={getModalContainer}
                        placeholder="Due Date"
                      />
                    </div>
                    <div className="dropdown me-2">
                      <Link
                        to="#"
                        className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                        data-bs-toggle="dropdown"
                      >
                        All Tags
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
                    <div className="d-flex align-items-center">
                      <span className="d-inline-flex me-2">Sort By : </span>
                      <div className="dropdown">
                        <Link
                          to="#"
                          className="dropdown-toggle btn btn-white d-inline-flex align-items-center border-0 bg-transparent p-0 text-dark"
                          data-bs-toggle="dropdown"
                        >
                          Created Date
                        </Link>
                        <ul className="dropdown-menu  dropdown-menu-end p-3">
                          <li>
                            <Link to="#" className="dropdown-item rounded-1">
                              Created Date
                            </Link>
                          </li>
                          <li>
                            <Link to="#" className="dropdown-item rounded-1">
                              Priority
                            </Link>
                          </li>
                          <li>
                            <Link to="#" className="dropdown-item rounded-1">
                              Due Date
                            </Link>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Dynamic Task List */}
              <div
                className="list-group list-group-flush mb-4"
                style={{ minHeight: '550px', maxHeight: '800px', overflowY: 'auto' }}
              >
                {tasks.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="ti ti-clipboard-x fs-1 text-muted mb-3"></i>
                    <h6 className="text-muted">No tasks found</h6>
                    <p className="text-muted small">Tasks will appear here once created</p>
                  </div>
                ) : (
                  tasks.map((task: any) => (
                    <div
                      key={task._id}
                      className="list-group-item list-item-hover shadow-sm rounded mb-2 p-3"
                    >
                      <div className="row align-items-center row-gap-3">
                        <div className="col-lg-6 col-md-7">
                          <div className="todo-inbox-check d-flex align-items-center flex-wrap row-gap-3">
                            <span className="me-2 d-flex align-items-center">
                              <i className="ti ti-grid-dots text-dark" />
                            </span>
                            <div className="form-check form-check-md me-2">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                checked={task.status === 'Completed'}
                                readOnly
                              />
                            </div>
                            <span className="me-2 d-flex align-items-center rating-select">
                              <i
                                className={`ti ti-star${task.priority === 'High' ? '-filled filled' : ''}`}
                              />
                            </span>
                            <div className="strike-info">
                              <h4 className="fs-14 text-truncate">
                                <Link
                                  to={`${all_routes.tasksdetails.replace(':taskId', task._id)}`}
                                >
                                  {task.title}
                                </Link>
                              </h4>
                            </div>
                            {task.dueDate && (
                              <span className="badge bg-transparent-dark text-dark rounded-pill ms-2">
                                <i className="ti ti-calendar me-1" />
                                {new Date(task.dueDate).toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="col-lg-6 col-md-5">
                          <div className="d-flex align-items-center justify-content-md-end flex-wrap row-gap-3">
                            {task.tags && task.tags.length > 0 && (
                              <span className="badge badge-skyblue me-3">
                                {typeof task.tags[0] === 'string'
                                  ? task.tags[0]
                                  : task.tags[0]?.name || 'Tag'}
                              </span>
                            )}
                            <span
                              className={`badge d-inline-flex align-items-center me-3 ${
                                task.status === 'Completed'
                                  ? 'badge-soft-success'
                                  : task.status === 'Inprogress'
                                    ? 'badge-soft-purple'
                                    : task.status === 'Pending'
                                      ? 'badge-soft-warning'
                                      : task.status === 'Onhold'
                                        ? 'badge-soft-pink'
                                        : 'badge-soft-secondary'
                              }`}
                            >
                              <i className="fas fa-circle fs-6 me-1" />
                              {task.status || 'Pending'}
                            </span>
                            <div className="d-flex align-items-center">
                              <div className="avatar-list-stacked avatar-group-sm">
                                {task.assignee &&
                                  Array.isArray(task.assignee) &&
                                  task.assignee.slice(0, 3).map((assignee: any, idx: number) => {
                                    const assigneeId =
                                      typeof assignee === 'string'
                                        ? assignee
                                        : assignee?._id || assignee?.id;
                                    return (
                                      <span
                                        key={assigneeId || idx}
                                        className="avatar avatar-rounded"
                                      >
                                        <ImageWithBasePath
                                          className="border border-white"
                                          src={`assets/img/profiles/avatar-${(idx % 10) + 1}.jpg`}
                                          alt="img"
                                        />
                                      </span>
                                    );
                                  })}
                              </div>
                              <div className="dropdown ms-2">
                                <Link
                                  to="#"
                                  className="d-inline-flex align-items-center"
                                  data-bs-toggle="dropdown"
                                >
                                  <i className="ti ti-dots-vertical" />
                                </Link>
                                <ul className="dropdown-menu dropdown-menu-end p-3">
                                  <li>
                                    <Link
                                      to={`${all_routes.tasksdetails.replace(':taskId', task._id)}`}
                                      className="dropdown-item rounded-1"
                                    >
                                      <i className="ti ti-eye me-2" />
                                      View
                                    </Link>
                                  </li>
                                  <li>
                                    <Link
                                      to="#"
                                      className="dropdown-item rounded-1"
                                      data-bs-toggle="modal"
                                      data-bs-target="#edit_task"
                                      onClick={async () => {
                                        setEditTaskId(task._id);
                                        setEditForm({
                                          title: task.title || '',
                                          projectId: task.projectId || '',
                                          assignees: task.assignee || [],
                                          dueDate: task.dueDate ? dayjs(task.dueDate) : null,
                                          status: task.status || 'To do',
                                          priority: task.priority || 'Medium',
                                          description: task.description || '',
                                          tags: task.tags || [],
                                        });
                                        setEditFieldErrors({});
                                        setEditFormError(null);
                                        // Load team members for the project
                                        if (task.projectId) {
                                          setLoadingTeamMembers(true);
                                          const teamMembers = await getProjectTeamMembers(
                                            task.projectId
                                          );
                                          setProjectTeamMembers(teamMembers);
                                          setLoadingTeamMembers(false);
                                        }
                                      }}
                                    >
                                      <i className="ti ti-edit me-2" />
                                      Edit
                                    </Link>
                                  </li>
                                  <li>
                                    <Link
                                      to="#"
                                      className="dropdown-item rounded-1"
                                      data-bs-toggle="modal"
                                      data-bs-target="#delete_modal"
                                      onClick={() => setDeleteTaskId(task._id)}
                                    >
                                      <i className="ti ti-trash me-2" />
                                      Delete
                                    </Link>
                                  </li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
      {/* /Page Wrapper */}
      {/* Add Task */}
      <div className="modal fade" id="add_task">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Add New Task</h4>
              <button type="button" className="btn-close custom-btn-close" data-bs-dismiss="modal">
                <i className="ti ti-x" />
              </button>
            </div>
            <form>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert-danger" role="alert">
                    {formError}
                  </div>
                )}
                <div className="row">
                  <div className="col-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Project <span className="text-danger">*</span>
                      </label>
                      <CommonSelect
                        className={`select ${fieldErrors.projectId ? 'is-invalid' : ''}`}
                        options={projectChoose}
                        value={projectChoose.find((opt) => opt.value === addForm.projectId) || null}
                        onChange={(option: any) => handleProjectSelection(option?.value)}
                      />
                      {fieldErrors.projectId && (
                        <div className="invalid-feedback d-block">{fieldErrors.projectId}</div>
                      )}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Title <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${fieldErrors.title ? 'is-invalid' : ''}`}
                        value={addForm.title}
                        onChange={(e) => {
                          setAddForm((prev) => ({ ...prev, title: e.target.value }));
                          clearFieldError('title');
                        }}
                        placeholder="Task title"
                      />
                      {fieldErrors.title && (
                        <div className="invalid-feedback">{fieldErrors.title}</div>
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
                          value={addForm.dueDate}
                          onChange={(value) => {
                            setAddForm((prev) => ({ ...prev, dueDate: value }));
                            clearFieldError('dueDate');
                          }}
                        />
                        <span className="input-icon-addon">
                          <i className="ti ti-calendar text-gray-7" />
                        </span>
                      </div>
                      {fieldErrors.dueDate && (
                        <div className="invalid-feedback d-block">{fieldErrors.dueDate}</div>
                      )}
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label me-2">
                        Team Members <span className="text-danger">*</span>
                        {loadingTeamMembers && (
                          <span className="spinner-border spinner-border-sm ms-2" role="status">
                            <span className="visually-hidden">Loading...</span>
                          </span>
                        )}
                      </label>
                      <div className={fieldErrors.assignees ? 'is-invalid' : ''}>
                        <Select
                          isMulti
                          className="basic-multi-select"
                          classNamePrefix="select"
                          options={employeeOptions}
                          value={employeeOptions.filter((opt) =>
                            addForm.assignees.includes(opt.value)
                          )}
                          onChange={(opts) => {
                            const values = (opts || []).map((opt) => opt.value);
                            setAddForm((prev) => ({ ...prev, assignees: values }));
                            clearFieldError('assignees');
                          }}
                          placeholder={
                            employeeOptions.length === 0
                              ? 'No team members available'
                              : 'Select team members'
                          }
                          isDisabled={
                            !selectedProject || loadingTeamMembers || employeeOptions.length === 0
                          }
                        />
                      </div>
                      {!selectedProject && (
                        <small className="text-muted mt-1 d-block">
                          Please select a project first
                        </small>
                      )}
                      {loadingTeamMembers && (
                        <small className="text-info mt-1 d-block">Loading team members...</small>
                      )}
                      {fieldErrors.assignees && (
                        <div className="invalid-feedback d-block">{fieldErrors.assignees}</div>
                      )}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Tag</label>
                      <CommonTagsInput
                        value={addForm.tags}
                        onChange={(value) => setAddForm((prev) => ({ ...prev, tags: value }))}
                        placeholder="Add new"
                        className="custom-input-class" // Optional custom class
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Status</label>
                      <input type="text" className="form-control" value="To do" readOnly />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Priority <span className="text-danger">*</span>
                      </label>
                      <CommonSelect
                        className={`select ${fieldErrors.priority ? 'is-invalid' : ''}`}
                        options={priorityChoose}
                        value={priorityChoose.find((opt) => opt.value === addForm.priority) || null}
                        onChange={(option: any) => {
                          setAddForm((prev) => ({ ...prev, priority: option?.value || 'Medium' }));
                          clearFieldError('priority');
                        }}
                      />
                      {fieldErrors.priority && (
                        <div className="invalid-feedback d-block">{fieldErrors.priority}</div>
                      )}
                    </div>
                  </div>
                  <div className="col-lg-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Description <span className="text-danger">*</span>
                      </label>
                      <textarea
                        className={`form-control ${fieldErrors.description ? 'is-invalid' : ''}`}
                        rows={4}
                        value={addForm.description}
                        onChange={(e) => {
                          setAddForm((prev) => ({ ...prev, description: e.target.value }));
                          clearFieldError('description');
                        }}
                        placeholder="Enter task description (minimum 10 characters)"
                      />
                      {fieldErrors.description && (
                        <div className="invalid-feedback">{fieldErrors.description}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-light me-2" data-bs-dismiss="modal">
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAddTaskSubmit}
                  disabled={creatingTask}
                >
                  {creatingTask ? 'Saving...' : 'Add New Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Add Task */}
      {/* Edit Task */}
      <div className="modal fade" id="edit_task">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Edit Task</h4>
              <button type="button" className="btn-close custom-btn-close" data-bs-dismiss="modal">
                <i className="ti ti-x" />
              </button>
            </div>
            <form>
              <div className="modal-body">
                {editFormError && (
                  <div className="alert alert-danger" role="alert">
                    {editFormError}
                  </div>
                )}
                <div className="row">
                  <div className="col-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Title <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${editFieldErrors.title ? 'is-invalid' : ''}`}
                        value={editForm.title}
                        onChange={(e) => {
                          setEditForm((prev) => ({ ...prev, title: e.target.value }));
                          clearEditFieldError('title');
                        }}
                        placeholder="Task title"
                      />
                      {editFieldErrors.title && (
                        <div className="invalid-feedback">{editFieldErrors.title}</div>
                      )}
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="mb-3">
                      <label className="form-label">Tag</label>
                      <CommonTagsInput
                        value={editForm.tags}
                        onChange={(tags: string[]) => setEditForm((prev) => ({ ...prev, tags }))}
                        className="form-control"
                      />
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Priority <span className="text-danger">*</span>
                      </label>
                      <CommonSelect
                        className={`select ${editFieldErrors.priority ? 'is-invalid' : ''}`}
                        options={priorityChoose}
                        value={priorityChoose.find((opt) => opt.value === editForm.priority)}
                        onChange={(option: any) => {
                          setEditForm((prev) => ({ ...prev, priority: option?.value || 'Medium' }));
                          clearEditFieldError('priority');
                        }}
                      />
                      {editFieldErrors.priority && (
                        <div className="invalid-feedback d-block">{editFieldErrors.priority}</div>
                      )}
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Status <span className="text-danger">*</span>
                      </label>
                      <CommonSelect
                        className={`select ${editFieldErrors.status ? 'is-invalid' : ''}`}
                        options={statusChoose}
                        value={statusChoose.find((opt) => opt.value === editForm.status)}
                        onChange={(option: any) => {
                          setEditForm((prev) => ({ ...prev, status: option?.value || 'To do' }));
                          clearEditFieldError('status');
                        }}
                      />
                      {editFieldErrors.status && (
                        <div className="invalid-feedback d-block">{editFieldErrors.status}</div>
                      )}
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
                        value={editForm.description}
                        onChange={(e) => {
                          setEditForm((prev) => ({ ...prev, description: e.target.value }));
                          clearEditFieldError('description');
                        }}
                        placeholder="Enter task description (minimum 10 characters)"
                      />
                      {editFieldErrors.description && (
                        <div className="invalid-feedback">{editFieldErrors.description}</div>
                      )}
                    </div>
                  </div>
                  <div className="col-12">
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
                          value={editForm.dueDate}
                          onChange={(value) => {
                            setEditForm((prev) => ({ ...prev, dueDate: value }));
                            clearEditFieldError('dueDate');
                          }}
                        />
                        <span className="input-icon-addon">
                          <i className="ti ti-calendar text-gray-7" />
                        </span>
                      </div>
                      {editFieldErrors.dueDate && (
                        <div className="invalid-feedback d-block">{editFieldErrors.dueDate}</div>
                      )}
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="mb-0">
                      <label className="form-label">
                        Team Members <span className="text-danger">*</span>
                      </label>
                      <Select
                        isMulti
                        className={`basic-multi-select ${editFieldErrors.assignees ? 'is-invalid' : ''}`}
                        classNamePrefix="select"
                        options={employeeOptions}
                        value={employeeOptions.filter((opt) =>
                          editForm.assignees.includes(opt.value)
                        )}
                        onChange={(opts) => {
                          const values = (opts || []).map((opt) => opt.value);
                          setEditForm((prev) => ({ ...prev, assignees: values }));
                          clearEditFieldError('assignees');
                        }}
                        placeholder={
                          employeeOptions.length === 0
                            ? 'No team members available'
                            : 'Select team members'
                        }
                        isDisabled={
                          !editForm.projectId || loadingTeamMembers || employeeOptions.length === 0
                        }
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
                  className="btn btn-light me-2"
                  data-bs-dismiss="modal"
                  disabled={savingEditTask}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveEditTask}
                  disabled={savingEditTask}
                >
                  {savingEditTask ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Edit Task */}
      {/* Delete Task Modal */}
      <div className="modal fade" id="delete_modal">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Delete Task</h4>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                disabled={deletingTask}
              />
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this task?</p>
              {deleteTaskId && tasks.find((t) => t._id === deleteTaskId) && (
                <p className="text-muted">
                  Task: <strong>{tasks.find((t) => t._id === deleteTaskId)?.title}</strong>
                </p>
              )}
              <p className="text-danger small">This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                data-bs-dismiss="modal"
                disabled={deletingTask}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteTask}
                disabled={deletingTask}
              >
                {deletingTask ? 'Deleting...' : 'Delete Task'}
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* /Delete Task Modal */}
      {/* Todo Details */}
      <div className="modal fade" id="view_todo">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header bg-dark">
              <h4 className="modal-title text-white">Respond to any pending messages</h4>
              <span className="badge badge-danger d-inline-flex align-items-center">
                <i className="ti ti-square me-1" />
                Urgent
              </span>
              <span>
                <i className="ti ti-star-filled text-warning" />
              </span>
              <Link to="#">
                <i className="ti ti-trash text-white" />
              </Link>
              <button
                type="button"
                className="btn-close custom-btn-close bg-transparent fs-16 text-white position-static"
                data-bs-dismiss="modal"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="modal-body">
              <h5 className="mb-2">Task Details</h5>
              <div className="border rounded mb-3 p-2">
                <div className="row row-gap-3">
                  <div className="col-md-4">
                    <div className="text-center">
                      <span className="d-block mb-1">Created On</span>
                      <p className="text-dark">22 July 2025</p>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="text-center">
                      <span className="d-block mb-1">Due Date</span>
                      <p className="text-dark">22 July 2025</p>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="text-center">
                      <span className="d-block mb-1">Status</span>
                      <span className="badge badge-soft-success d-inline-flex align-items-center">
                        <i className="fas fa-circle fs-6 me-1" />
                        Completed
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mb-3">
                <h5 className="mb-2">Description</h5>
                <p>
                  Hiking is a long, vigorous walk, usually on trails or footpaths in the
                  countryside. Walking for pleasure developed in Europe during the eighteenth
                  century. Religious pilgrimages have existed much longer but they involve walking
                  long distances for a spiritual purpose associated with specific religions and also
                  we achieve inner peace while we hike at a local park.
                </p>
              </div>
              <div className="mb-3">
                <h5 className="mb-2">Tags</h5>
                <div className="d-flex align-items-center">
                  <span className="badge badge-danger me-2">Internal</span>
                  <span className="badge badge-success me-2">Projects</span>
                  <span className="badge badge-secondary">Reminder</span>
                </div>
              </div>
              <div>
                <h5 className="mb-2">Assignee</h5>
                <div className="avatar-list-stacked avatar-group-sm">
                  <span className="avatar avatar-rounded">
                    <ImageWithBasePath
                      className="border border-white"
                      src="assets/img/profiles/avatar-23.jpg"
                      alt="img"
                    />
                  </span>
                  <span className="avatar avatar-rounded">
                    <ImageWithBasePath
                      className="border border-white"
                      src="assets/img/profiles/avatar-24.jpg"
                      alt="img"
                    />
                  </span>
                  <span className="avatar avatar-rounded">
                    <ImageWithBasePath
                      className="border border-white"
                      src="assets/img/profiles/avatar-25.jpg"
                      alt="img"
                    />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* /Todo Details */}
    </>
  );
};

export default Task;
