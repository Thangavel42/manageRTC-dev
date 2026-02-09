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
import { useTaskStatusREST } from '../../../hooks/useTaskStatusREST';
import { useUserProfileREST } from '../../../hooks/useUserProfileREST';
import { get } from '../../../services/api';
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
    getEmployeeProjectTasks,
    getMyTasks,
  } = useTasksREST();
  const {
    projects,
    loading: projectsLoading,
    fetchProjects,
    getProjectTeamMembers,
  } = useProjectsREST();
  const { statuses: taskStatuses, fetchTaskStatuses } = useTaskStatusREST();
  const { profile, isAdmin, isHR, isEmployee } = useUserProfileREST();
  const [employees, setEmployees] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);
  const [allEmployeeTasks, setAllEmployeeTasks] = useState<any[]>([]); // Store all employee tasks for count calculations
  const [filters, setFilters] = useState({
    priority: 'all',
    status: 'all',
    project: 'all',
    search: '',
  });
  const [sortBy, setSortBy] = useState<'createdAt' | 'dueDate'>('createdAt');
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
  const [confirmTaskName, setConfirmTaskName] = useState('');

  // Pagination state
  const [projectPage, setProjectPage] = useState(1);
  const [taskPage, setTaskPage] = useState(1);
  const projectsPerPage = 5;
  const tasksPerPage = 10;

  // Computed value for task name match validation
  const taskToDelete = tasks.find((t) => t._id === deleteTaskId);
  const taskNameMatches = taskToDelete
    ? confirmTaskName.trim().toLowerCase() === taskToDelete.title.trim().toLowerCase()
    : false;

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

  // Employee task counts: total and completed tasks assigned to the employee
  const employeeTaskCounts = React.useMemo(() => {
    if (!isEmployee || !profile || !('_id' in profile) || !profile._id) {
      return { total: 0, completed: 0, inProgress: 0, pending: 0 };
    }

    const employeeId = profile._id;
    const employeeTasks = tasks.filter(
      (task: any) =>
        task.assignee && Array.isArray(task.assignee) && task.assignee.includes(employeeId)
    );

    const total = employeeTasks.length;
    const completed = employeeTasks.filter((task: any) => task.status === 'Completed').length;
    const inProgress = employeeTasks.filter((task: any) => task.status === 'Inprogress').length;
    const pending = employeeTasks.filter(
      (task: any) => task.status === 'Pending' || task.status === 'To do'
    ).length;

    return { total, completed, inProgress, pending };
  }, [tasks, isEmployee, profile]);

  const getProjectCounts = React.useCallback(
    (projectId: string) => {
      const total = projectTaskCounts[projectId]?.total || 0;
      const completed = projectTaskCounts[projectId]?.completed || 0;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { total, completed, percent };
    },
    [projectTaskCounts]
  );

  // Get employee task counts for a specific project
  const getEmployeeProjectTaskCounts = React.useCallback(
    (projectId: string) => {
      if (!isEmployee || !profile || !('_id' in profile) || !profile._id) {
        return { total: 0, completed: 0, percent: 0 };
      }

      const employeeId = profile._id;
      // Use allEmployeeTasks instead of tasks for accurate counts across all projects
      const projectTasks = allEmployeeTasks.filter((task: any) => {
        // Handle both ObjectId and string comparison
        const taskProjectId = task.projectId?._id || task.projectId;
        const matchesProject =
          taskProjectId === projectId || String(taskProjectId) === String(projectId);

        // Check if employee is in assignee array
        const isAssigned =
          task.assignee &&
          Array.isArray(task.assignee) &&
          task.assignee.some((a: any) => {
            const assigneeId = typeof a === 'object' ? a._id : a;
            return String(assigneeId) === String(employeeId);
          });

        return matchesProject && isAssigned;
      });

      const total = projectTasks.length;
      const completed = projectTasks.filter((task: any) => task.status === 'Completed').length;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

      if (total > 0) {
        console.log(`[Task] Employee task counts for project ${projectId}:`, {
          total,
          completed,
          percent,
        });
      }

      return { total, completed, percent };
    },
    [allEmployeeTasks, isEmployee, profile]
  );

  // Projects are already filtered by backend for employees
  // Admin and HR get all projects, employees get only their assigned projects
  const filteredProjects = React.useMemo(() => {
    return projects;
  }, [projects]);

  // Client-side filtering and sorting for tasks
  const filteredTasks = React.useMemo(() => {
    let filtered = tasks.filter((task: any) => {
      // Filter by priority
      if (filters.priority !== 'all' && task.priority !== filters.priority) {
        return false;
      }
      // Filter by status
      if (filters.status !== 'all' && task.status !== filters.status) {
        return false;
      }
      // Filter by search
      if (
        filters.search &&
        task.title &&
        !task.title.toLowerCase().includes(filters.search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });

    // Sort tasks
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'createdAt') {
        // Sort by created date (oldest first)
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateA - dateB;
      } else if (sortBy === 'dueDate') {
        // Sort by due date (tasks ending soonest first)
        const dateA = new Date(a.dueDate || '9999-12-31').getTime();
        const dateB = new Date(b.dueDate || '9999-12-31').getTime();
        return dateA - dateB;
      }
      return 0;
    });

    return sorted;
  }, [tasks, filters.priority, filters.status, filters.search, sortBy]);

  // Pagination calculations
  const totalProjects = filteredProjects.length;
  const totalProjectPages = Math.ceil(totalProjects / projectsPerPage);
  const startProjectIndex = (projectPage - 1) * projectsPerPage;
  const endProjectIndex = startProjectIndex + projectsPerPage;
  const paginatedProjects = filteredProjects.slice(startProjectIndex, endProjectIndex);

  const totalTasks = filteredTasks.length;
  const totalTaskPages = Math.ceil(totalTasks / tasksPerPage);
  const startTaskIndex = (taskPage - 1) * tasksPerPage;
  const endTaskIndex = startTaskIndex + tasksPerPage;
  const paginatedTasks = filteredTasks.slice(startTaskIndex, endTaskIndex);

  // Dynamic project options from filtered projects with project IDs
  const projectChoose = React.useMemo(
    () => [
      { value: 'Select', label: 'Select' },
      ...filteredProjects
        .filter((project) => project.status !== 'Completed')
        .map((project) => ({
          value: project._id,
          label: `${project.projectId || project._id} - ${project.name || 'Untitled Project'}`,
        })),
    ],
    [filteredProjects]
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

  // Dynamic status options from task statuses collection
  const statusChoose = React.useMemo(() => {
    if (!taskStatuses || taskStatuses.length === 0) {
      return [
        { value: 'To do', label: 'To do' },
        { value: 'Pending', label: 'Pending' },
        { value: 'Inprogress', label: 'Inprogress' },
        { value: 'Completed', label: 'Completed' },
        { value: 'Onhold', label: 'Onhold' },
        { value: 'Review', label: 'Review' },
        { value: 'Cancelled', label: 'Cancelled' },
      ];
    }
    return taskStatuses.map((status) => ({
      value: status.key,
      label: status.name || status.key,
    }));
  }, [taskStatuses]);
  const priorityChoose = [
    { value: 'Medium', label: 'Medium' },
    { value: 'High', label: 'High' },
    { value: 'Low', label: 'Low' },
  ];

  const loadTasks = useCallback(() => {
    // Only load tasks if a specific project is selected
    if (!filters.project || filters.project === 'all') {
      return;
    }

    setError(null);

    // If employee role, use dedicated employee project tasks API
    if (isEmployee && profile && '_id' in profile && profile._id) {
      console.log('[Task] Loading tasks for employee from dedicated API:', {
        _id: profile._id,
        employeeId: profile.employeeId,
        name: `${profile.firstName} ${profile.lastName}`,
        projectId: filters.project,
      });
      getEmployeeProjectTasks(filters.project);
    } else {
      // Admin/HR: load all project tasks
      getTasksByProject(filters.project);
    }
  }, [filters.project, getTasksByProject, getEmployeeProjectTasks, isEmployee, profile]);

  const loadProjects = useCallback(async () => {
    try {
      setError(null);

      // Log employee filtering info if user is an employee
      if (profile && (profile.role === 'employee' || profile.role === 'hr') && '_id' in profile) {
        console.log('[Task] Fetching projects for employee:', {
          _id: profile._id,
          employeeId: profile.employeeId,
          role: profile.role,
          name: `${profile.firstName} ${profile.lastName}`,
        });
        console.log(
          '[Task] Backend will filter projects where employee is in teamMembers, teamLeader, or projectManager'
        );
      }

      await fetchProjects();
    } catch (err) {
      console.error('[Task] Failed to load projects:', err);
      setError('Failed to load projects');
      message.error('Failed to load projects');
    }
  }, [fetchProjects, profile]);

  const loadTaskStatuses = useCallback(async () => {
    try {
      await fetchTaskStatuses();
    } catch (err) {
      console.error('[Task] Failed to load task statuses:', err);
    }
  }, [fetchTaskStatuses]);

  const loadAllEmployeeTasks = useCallback(async () => {
    if (!isEmployee || !profile || !('_id' in profile)) {
      return;
    }

    try {
      console.log('[Task] Loading all employee tasks for count calculations');

      const response = await get('/tasks/my');

      if (response.success && response.data) {
        console.log('[Task] Loaded', response.data.length, 'employee tasks for count calculations');
        setAllEmployeeTasks(response.data);
      }
    } catch (err) {
      console.error('[Task] Failed to load employee tasks:', err);
    }
  }, [isEmployee, profile]);

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
        case 'status':
          if (!value || value === 'Select') return 'Please select a status';
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

    const statusError = validateField('status', addForm.status);
    if (statusError) errors.status = statusError;

    const descriptionError = validateField('description', addForm.description);
    if (descriptionError) errors.description = descriptionError;

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [addForm, validateField]);

  const handleProjectSelection = useCallback(
    async (projectId: string) => {
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

  const handleStatusFilter = useCallback((status: string) => {
    setFilters((prev) => ({ ...prev, status }));
  }, []);

  const handleSortChange = useCallback((sort: 'createdAt' | 'dueDate') => {
    setSortBy(sort);
  }, []);

  const handleProjectTasksClick = useCallback((projectId) => {
    if (!projectId) return;

    // Update filters to reflect selected project
    setFilters((prev) => ({
      ...prev,
      project: projectId,
    }));

    // Note: loadTasks will be called automatically by useEffect when filters.project changes
    // Reset to first page when changing project
    setTaskPage(1);
  }, []);

  const resetAddForm = useCallback(() => {
    // Use first status from loaded statuses or default to 'To do'
    const defaultStatus = taskStatuses && taskStatuses.length > 0 ? taskStatuses[0].key : 'To do';

    setAddForm({
      title: '',
      projectId: '',
      assignees: [],
      dueDate: null,
      status: defaultStatus,
      priority: 'Medium',
      description: '',
      tags: [],
    });
    setSelectedProject(null);
    setProjectTeamMembers([]);
    setLoadingTeamMembers(false);
    setFormError(null);
    setFieldErrors({});
  }, [taskStatuses]);

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
        if (isEmployee) {
          loadAllEmployeeTasks();
        }
        return;
      }

      setFormError(errorMsg || 'Failed to create task');
      if (errorMsg) message.error(errorMsg);
    },
    [closeAddModal, loadTasks, loadProjects, resetAddForm, isEmployee, loadAllEmployeeTasks]
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
        if (isEmployee) {
          loadAllEmployeeTasks();
        }
        return;
      }

      setEditFormError(errorMsg || 'Failed to update task');
      if (errorMsg) message.error(errorMsg);
    },
    [closeEditModal, loadTasks, loadProjects, isEmployee, loadAllEmployeeTasks]
  );

  const handleDeleteTask = useCallback(async () => {
    if (!deleteTaskId) {
      message.error('Task ID not found');
      return;
    }

    setDeletingTask(true);
    const success = await deleteTask(deleteTaskId);
    if (success) {
      // Close the modal
      const modalElement = document.getElementById('delete_modal');
      if (modalElement) {
        const bootstrapModal = (window as any).bootstrap?.Modal?.getInstance(modalElement);
        if (bootstrapModal) {
          bootstrapModal.hide();
        }
      }

      // Reset state after a short delay to allow modal to close
      setTimeout(() => {
        setDeleteTaskId(null);
        setConfirmTaskName('');
      }, 300);

      loadTasks();
      loadProjects();
      if (isEmployee) {
        loadAllEmployeeTasks();
      }
    }
    setDeletingTask(false);
  }, [deleteTaskId, deleteTask, loadTasks, loadProjects, isEmployee, loadAllEmployeeTasks]);

  const handleCancelDelete = useCallback(() => {
    setConfirmTaskName('');
    setDeleteTaskId(null);
  }, []);

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
      if (isEmployee) {
        loadAllEmployeeTasks();
      }
    } else {
      setSavingEditTask(false);
    }
  }, [
    editForm,
    editTaskId,
    validateEditForm,
    updateTask,
    closeEditModal,
    loadTasks,
    loadProjects,
    isEmployee,
    loadAllEmployeeTasks,
  ]);

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
      if (isEmployee) {
        loadAllEmployeeTasks();
      }
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
    isEmployee,
    loadAllEmployeeTasks,
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

  // Initial load - load projects and task statuses on mount (tasks loaded by filter changes)
  useEffect(() => {
    loadProjects();
    loadTaskStatuses();
    // Load all employee tasks for count calculations (only for employees)
    if (isEmployee) {
      loadAllEmployeeTasks();
    }
  }, [loadProjects, loadTaskStatuses, loadAllEmployeeTasks, isEmployee]);

  // Debug: Log when allEmployeeTasks changes
  useEffect(() => {
    if (isEmployee && allEmployeeTasks.length > 0) {
      console.log('[Task] allEmployeeTasks state updated:', {
        count: allEmployeeTasks.length,
        tasksByProject: allEmployeeTasks.reduce(
          (acc, task) => {
            const projectId = task.projectId?._id || task.projectId;
            acc[projectId] = (acc[projectId] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
      });
    }
  }, [allEmployeeTasks, isEmployee]);

  // Console log employee _id from profile
  useEffect(() => {
    if (profile && (profile.role === 'employee' || profile.role === 'hr') && '_id' in profile) {
      console.log('============================================');
      console.log('[Task Page] Employee MongoDB _id:', profile._id);
      console.log('[Task Page] Employee ID:', profile.employeeId);
      console.log('[Task Page] Employee Name:', profile.firstName, profile.lastName);
      console.log('[Task Page] Employee Role:', profile.role);
      console.log('[Task Page] Full Profile:', profile);
      console.log('============================================');
    }
  }, [profile]);

  useEffect(() => {
    loadTasks();
    setTaskPage(1); // Reset to first page when project filter changes
  }, [loadTasks]);

  // Reset to first page when priority or status filters change
  useEffect(() => {
    setTaskPage(1);
  }, [filters.priority, filters.status, filters.search]);

  // Reset task page when tasks data changes
  useEffect(() => {
    if (taskPage > totalTaskPages && totalTaskPages > 0) {
      setTaskPage(totalTaskPages);
    }
  }, [filteredTasks.length, taskPage, totalTaskPages]);

  // Reset project page when projects data changes
  useEffect(() => {
    if (projectPage > totalProjectPages && totalProjectPages > 0) {
      setProjectPage(totalProjectPages);
    }
  }, [filteredProjects.length, projectPage, totalProjectPages]);

  // Reset modal state when modals open
  useEffect(() => {
    const addTaskModal = document.getElementById('add_task');
    const editTaskModal = document.getElementById('edit_task');

    const resetModalState = () => {
      resetAddForm();
      const defaultStatus = taskStatuses && taskStatuses.length > 0 ? taskStatuses[0].key : 'To do';
      setEditForm({
        title: '',
        projectId: '',
        assignees: [],
        dueDate: null,
        status: defaultStatus,
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
  }, [resetAddForm, taskStatuses]);

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
              {!isEmployee && (
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
              )}
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
                  paginatedProjects.map((project: any, index: number) => (
                    <div
                      key={project._id}
                      className={`card ${filters.project === project._id ? 'border-primary' : ''}`}
                      style={{
                        borderWidth: filters.project === project._id ? '2px' : '1px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onClick={() => handleProjectTasksClick(project._id)}
                      onMouseEnter={() => setHoveredProjectId(project._id)}
                      onMouseLeave={() => setHoveredProjectId(null)}
                    >
                      <div className="card-body">
                        <div className="d-flex align-items-center pb-3 mb-3 border-bottom">
                          <Link
                            to={`${all_routes.projectdetails}/${project._id}`}
                            className="flex-shrink-0 me-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ImageWithBasePath
                              src={`assets/img/social/project-0${(index % 5) + 1}.svg`}
                              alt="Img"
                            />
                          </Link>
                          <div>
                            <h6 className="mb-1">
                              <span
                                className={`text-truncate d-inline-block ${
                                  filters.project === project._id
                                    ? 'text-primary fw-bold'
                                    : hoveredProjectId === project._id
                                      ? 'text-primary'
                                      : 'text-dark'
                                }`}
                              >
                                {project.name || 'Untitled Project'}
                                {filters.project === project._id && (
                                  <i className="ti ti-check-circle ms-2" />
                                )}
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
                                    Array.isArray(project.teamLeader) &&
                                    project.teamLeader.length > 0
                                      ? project.teamLeader[0]
                                      : project.teamLeader && typeof project.teamLeader === 'object'
                                        ? project.teamLeader
                                        : null;

                                  if (teamLead) {
                                    const name =
                                      `${teamLead.firstName || ''} ${teamLead.lastName || ''}`.trim();
                                    const employeeId = teamLead.employeeId || 'N/A';

                                    if (name) {
                                      return (
                                        <>
                                          <span
                                            className="text-truncate"
                                            title={`${name} (${employeeId})`}
                                          >
                                            {name}
                                            <small className="text-muted ms-1">
                                              ({employeeId})
                                            </small>
                                          </span>
                                        </>
                                      );
                                    }
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
                          {/* Employee Task Count - Only visible for employee role */}
                          {isEmployee && getEmployeeProjectTaskCounts(project._id).total > 0 && (
                            <div className="row align-items-center mt-2 pt-2 border-top">
                              <div className="col-6">
                                <span className="fw-medium d-flex align-items-center">
                                  <i className="ti ti-user-check text-success me-2" />
                                  {getEmployeeProjectTaskCounts(project._id).completed} /{' '}
                                  {getEmployeeProjectTaskCounts(project._id).total} My Tasks
                                </span>
                              </div>
                              <div className="col-6">
                                <div>
                                  <div className="d-flex align-items-center justify-content-between mb-1">
                                    <small className="text-success">
                                      {getEmployeeProjectTaskCounts(project._id).percent}% Completed
                                    </small>
                                  </div>
                                  <div className="progress progress-xs">
                                    <div
                                      className="progress-bar bg-success"
                                      role="progressbar"
                                      style={{
                                        width: `${getEmployeeProjectTaskCounts(project._id).percent}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {/* Project Pagination */}
                {totalProjects > projectsPerPage && (
                  <div className="card mt-3">
                    <div className="card-body p-2">
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="text-muted small">
                          Showing {startProjectIndex + 1} to{' '}
                          {Math.min(endProjectIndex, totalProjects)} of {totalProjects} projects
                        </span>
                        <div className="btn-group">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => setProjectPage(Math.max(1, projectPage - 1))}
                            disabled={projectPage === 1}
                          >
                            <i className="ti ti-chevron-left" />
                          </button>
                          {Array.from({ length: totalProjectPages }, (_, i) => i + 1)
                            .filter(
                              (page) =>
                                page === 1 ||
                                page === totalProjectPages ||
                                (page >= projectPage - 1 && page <= projectPage + 1)
                            )
                            .map((page, idx, arr) => (
                              <React.Fragment key={page}>
                                {idx > 0 && arr[idx - 1] !== page - 1 && (
                                  <button className="btn btn-sm btn-outline-primary" disabled>
                                    ...
                                  </button>
                                )}
                                <button
                                  className={`btn btn-sm ${page === projectPage ? 'btn-primary' : 'btn-outline-primary'}`}
                                  onClick={() => setProjectPage(page)}
                                >
                                  {page}
                                </button>
                              </React.Fragment>
                            ))}
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() =>
                              setProjectPage(Math.min(totalProjectPages, projectPage + 1))
                            }
                            disabled={projectPage === totalProjectPages}
                          >
                            <i className="ti ti-chevron-right" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
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
                    <div className="d-flex align-items-center me-3">
                      <span className="d-inline-flex me-2">Status : </span>
                      <div className="dropdown">
                        <Link
                          to="#"
                          className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                          data-bs-toggle="dropdown"
                        >
                          {filters.status === 'all'
                            ? 'All Status'
                            : taskStatuses?.find((s) => s.key === filters.status)?.name ||
                              filters.status}
                        </Link>
                        <ul className="dropdown-menu dropdown-menu-end p-3">
                          <li>
                            <Link
                              to="#"
                              className={`dropdown-item rounded-1 ${filters.status === 'all' ? 'active' : ''}`}
                              onClick={(e) => {
                                e.preventDefault();
                                handleStatusFilter('all');
                              }}
                            >
                              All Status
                            </Link>
                          </li>
                          {taskStatuses && taskStatuses.length > 0 ? (
                            taskStatuses.map((status) => (
                              <li key={status.key}>
                                <Link
                                  to="#"
                                  className={`dropdown-item rounded-1 ${filters.status === status.key ? 'active' : ''}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleStatusFilter(status.key);
                                  }}
                                >
                                  {status.name || status.key}
                                </Link>
                              </li>
                            ))
                          ) : (
                            <>
                              <li>
                                <Link
                                  to="#"
                                  className={`dropdown-item rounded-1 ${filters.status === 'Pending' ? 'active' : ''}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleStatusFilter('Pending');
                                  }}
                                >
                                  Pending
                                </Link>
                              </li>
                              <li>
                                <Link
                                  to="#"
                                  className={`dropdown-item rounded-1 ${filters.status === 'Inprogress' ? 'active' : ''}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleStatusFilter('Inprogress');
                                  }}
                                >
                                  Inprogress
                                </Link>
                              </li>
                              <li>
                                <Link
                                  to="#"
                                  className={`dropdown-item rounded-1 ${filters.status === 'Completed' ? 'active' : ''}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleStatusFilter('Completed');
                                  }}
                                >
                                  Completed
                                </Link>
                              </li>
                            </>
                          )}
                        </ul>
                      </div>
                    </div>
                    <div className="d-flex align-items-center">
                      <span className="d-inline-flex me-2">Sort By : </span>
                      <div className="dropdown">
                        <Link
                          to="#"
                          className="dropdown-toggle btn btn-white d-inline-flex align-items-center border-0 bg-transparent p-0 text-dark"
                          data-bs-toggle="dropdown"
                        >
                          {sortBy === 'createdAt' ? 'Created Date' : 'Due Date'}
                        </Link>
                        <ul className="dropdown-menu dropdown-menu-end p-3">
                          <li>
                            <Link
                              to="#"
                              className={`dropdown-item rounded-1 ${sortBy === 'createdAt' ? 'active' : ''}`}
                              onClick={(e) => {
                                e.preventDefault();
                                handleSortChange('createdAt');
                              }}
                            >
                              Created Date
                            </Link>
                          </li>
                          <li>
                            <Link
                              to="#"
                              className={`dropdown-item rounded-1 ${sortBy === 'dueDate' ? 'active' : ''}`}
                              onClick={(e) => {
                                e.preventDefault();
                                handleSortChange('dueDate');
                              }}
                            >
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
                    <h6 className="text-muted">
                      {filters.project === 'all' || !filters.project
                        ? 'Select a project to view tasks'
                        : 'No tasks found'}
                    </h6>
                    <p className="text-muted small">
                      {filters.project === 'all' || !filters.project
                        ? 'Click on a project card on the left to load its tasks'
                        : 'This project has no tasks yet'}
                    </p>
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="ti ti-filter-x fs-1 text-muted mb-3"></i>
                    <h6 className="text-muted">No tasks match the current filters</h6>
                    <p className="text-muted small">
                      Try adjusting your priority or status filters
                    </p>
                  </div>
                ) : (
                  paginatedTasks.map((task: any) => (
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
                                {task.assignee && task.assignee.length > 0 ? (
                                  (() => {
                                    // Find the project for this task
                                    const taskProjectId =
                                      typeof task.projectId === 'object'
                                        ? task.projectId._id
                                        : task.projectId;
                                    const taskProject = projects.find(
                                      (p) => p._id === taskProjectId
                                    );

                                    // Get all team members from the project
                                    const allMembers = taskProject
                                      ? [
                                          ...(taskProject.teamMembers || []),
                                          ...(taskProject.teamLeader || []),
                                        ]
                                      : [];

                                    return (
                                      <>
                                        {task.assignee
                                          .slice(0, 3)
                                          .map((assignee: any, idx: number) => {
                                            // Handle both populated objects and ID strings
                                            let member = null;

                                            if (typeof assignee === 'object' && assignee !== null) {
                                              member = assignee;
                                            } else {
                                              const assigneeId = assignee.toString();
                                              member = allMembers.find(
                                                (m: any) =>
                                                  m._id?.toString() === assigneeId ||
                                                  m.employeeId === assigneeId
                                              );
                                            }

                                            return member ? (
                                              <span
                                                key={idx}
                                                className="avatar avatar-sm avatar-rounded"
                                                title={`${member.firstName} ${member.lastName}${member.employeeId ? ` (${member.employeeId})` : ''}`}
                                              >
                                                {member.profileImage ? (
                                                  <ImageWithBasePath
                                                    className="border border-white"
                                                    src={member.profileImage}
                                                    alt={`${member.firstName} ${member.lastName}`}
                                                  />
                                                ) : (
                                                  <span
                                                    className="avatar-title bg-purple border border-white fs-10"
                                                    style={{
                                                      width: '100%',
                                                      height: '100%',
                                                      display: 'flex',
                                                      alignItems: 'center',
                                                      justifyContent: 'center',
                                                      borderRadius: '50%',
                                                    }}
                                                  >
                                                    {(
                                                      member.firstName?.charAt(0) ||
                                                      member.lastName?.charAt(0) ||
                                                      '?'
                                                    ).toUpperCase()}
                                                  </span>
                                                )}
                                              </span>
                                            ) : null;
                                          })}
                                        {task.assignee.length > 3 && (
                                          <span
                                            className="avatar avatar-sm avatar-rounded"
                                            title={`+${task.assignee.length - 3} more assignees`}
                                          >
                                            <span
                                              className="avatar-title bg-primary fs-10"
                                              style={{
                                                width: '100%',
                                                height: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                borderRadius: '50%',
                                              }}
                                            >
                                              +{task.assignee.length - 3}
                                            </span>
                                          </span>
                                        )}
                                      </>
                                    );
                                  })()
                                ) : (
                                  <span className="text-muted small">No assignees</span>
                                )}
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
                                  {!isEmployee && (
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
                                  )}
                                  {!isEmployee && (
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
                                  )}
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
              {/* Task Pagination */}
              {totalTasks > tasksPerPage && (
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <span className="text-muted">
                    Showing {startTaskIndex + 1} to {Math.min(endTaskIndex, totalTasks)} of{' '}
                    {totalTasks} tasks
                  </span>
                  <div className="btn-group">
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => setTaskPage(Math.max(1, taskPage - 1))}
                      disabled={taskPage === 1}
                    >
                      <i className="ti ti-chevron-left" />
                    </button>
                    {Array.from({ length: totalTaskPages }, (_, i) => i + 1)
                      .filter(
                        (page) =>
                          page === 1 ||
                          page === totalTaskPages ||
                          (page >= taskPage - 1 && page <= taskPage + 1)
                      )
                      .map((page, idx, arr) => (
                        <React.Fragment key={page}>
                          {idx > 0 && arr[idx - 1] !== page - 1 && (
                            <button className="btn btn-sm btn-outline-primary" disabled>
                              ...
                            </button>
                          )}
                          <button
                            className={`btn btn-sm ${page === taskPage ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setTaskPage(page)}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      ))}
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => setTaskPage(Math.min(totalTaskPages, taskPage + 1))}
                      disabled={taskPage === totalTaskPages}
                    >
                      <i className="ti ti-chevron-right" />
                    </button>
                  </div>
                </div>
              )}
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
                      <label className="form-label">
                        Status <span className="text-danger">*</span>
                      </label>
                      <CommonSelect
                        className={`select ${fieldErrors.status ? 'is-invalid' : ''}`}
                        options={statusChoose}
                        value={
                          statusChoose.find((opt) => opt.value === addForm.status) ||
                          statusChoose[0]
                        }
                        onChange={(option: any) => {
                          setAddForm((prev) => ({ ...prev, status: option?.value || 'To do' }));
                          clearFieldError('status');
                        }}
                      />
                      {fieldErrors.status && (
                        <div className="invalid-feedback d-block">{fieldErrors.status}</div>
                      )}
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
        <div className="modal-dialog modal-dialog-centered modal-sm">
          <div className="modal-content">
            <div className="modal-body">
              <div className="text-center p-3">
                <span className="avatar avatar-lg avatar-rounded bg-danger mb-3">
                  <i className="ti ti-trash fs-24" />
                </span>
                <h5 className="mb-2">Delete Task</h5>
                {taskToDelete && (
                  <>
                    <div className="bg-light p-3 rounded mb-3">
                      <h6 className="mb-1">{taskToDelete.title}</h6>
                      <p className="mb-1 text-muted">
                        Status: <span className="badge badge-soft-info">{taskToDelete.status}</span>
                      </p>
                      <p className="mb-0 text-muted">
                        Priority:{' '}
                        <span className="badge badge-soft-warning">{taskToDelete.priority}</span>
                      </p>
                    </div>
                    <div className="text-start mb-3">
                      <p className="text-danger fw-medium mb-2" style={{ fontSize: '13px' }}>
                        This action is permanent. All data associated with this task will be
                        removed.
                      </p>
                      <label className="form-label text-muted" style={{ fontSize: '13px' }}>
                        Type <strong>{taskToDelete.title}</strong> to confirm deletion:
                      </label>
                      <input
                        type="text"
                        className={`form-control form-control-sm ${
                          confirmTaskName && !taskNameMatches ? 'is-invalid' : ''
                        } ${taskNameMatches ? 'is-valid' : ''}`}
                        placeholder={`Type "${taskToDelete.title}" to confirm`}
                        value={confirmTaskName}
                        onChange={(e) => setConfirmTaskName(e.target.value)}
                        autoComplete="off"
                      />
                      {confirmTaskName && !taskNameMatches && (
                        <div className="invalid-feedback">Name does not match</div>
                      )}
                    </div>
                  </>
                )}
                <div className="d-flex gap-2 justify-content-center">
                  <button
                    type="button"
                    className="btn btn-light"
                    data-bs-dismiss="modal"
                    onClick={handleCancelDelete}
                    disabled={deletingTask}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleDeleteTask}
                    disabled={deletingTask || !taskNameMatches}
                  >
                    {deletingTask ? 'Deleting...' : 'Delete Task'}
                  </button>
                </div>
              </div>
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
