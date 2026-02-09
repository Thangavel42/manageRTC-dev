import { DatePicker } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import dragula, { Drake } from 'dragula';
import 'dragula/dist/dragula.css';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Select from 'react-select';
import { toast } from 'react-toastify';
import CollapseHeader from '../../../core/common/collapse-header/collapse-header';
import CommonSelect from '../../../core/common/commonSelect';
import Footer from '../../../core/common/footer';
import ImageWithBasePath from '../../../core/common/imageWithBasePath';
import CommonTagsInput from '../../../core/common/Taginput';
import { useProjectsREST } from '../../../hooks/useProjectsREST';
import { Task, useTasksREST } from '../../../hooks/useTasksREST';
import { useTaskStatusREST } from '../../../hooks/useTaskStatusREST';
import { useUserProfileREST } from '../../../hooks/useUserProfileREST';

const TaskBoard = () => {
  // Initialize REST API hooks for tasks
  const {
    tasks: tasksList,
    loading: tasksLoading,
    createTask: createTaskAPI,
    updateTask: updateTaskAPI,
    deleteTask: deleteTaskAPI,
    updateStatus: updateTaskStatusAPI,
    getTasksByProject: fetchTasksByProject,
  } = useTasksREST();

  // Initialize REST API hooks for projects
  const {
    projects: projectsList,
    fetchProjects: fetchProjectsAPI,
    getProjectById: getProjectByIdAPI,
  } = useProjectsREST();

  // Initialize REST API hooks for task statuses
  const {
    statuses: statusesFromHook,
    fetchTaskStatuses: fetchTaskStatusesAPI,
    createTaskStatus: createTaskStatusAPI,
    updateTaskStatus: updateTaskStatusBoardAPI,
  } = useTaskStatusREST();

  // Initialize user profile hook
  const { profile, isAdmin, isHR, isEmployee } = useUserProfileREST();

  const [selectedProject, setSelectedProject] = useState('Select');
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [taskStatuses, setTaskStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardColor, setNewBoardColor] = useState('purple');
  const [savingBoard, setSavingBoard] = useState(false);
  const addBoardModalRef = useRef<any>(null);
  const addBoardCloseButtonRef = useRef<HTMLButtonElement>(null);
  const [editBoardData, setEditBoardData] = useState<any>(null);
  const [editBoardName, setEditBoardName] = useState('');
  const [editBoardColor, setEditBoardColor] = useState('purple');
  const editBoardModalRef = useRef<any>(null);
  const editBoardCloseButtonRef = useRef<HTMLButtonElement>(null);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDescription, setEditTaskDescription] = useState('');
  const [editTaskPriority, setEditTaskPriority] = useState('Medium');
  const [editTaskDueDate, setEditTaskDueDate] = useState<Dayjs | null>(null);
  const [editTaskStatus, setEditTaskStatus] = useState('');
  const [editTaskTags, setEditTaskTags] = useState<string[]>([]);
  const [editTaskAssignees, setEditTaskAssignees] = useState<string[]>([]);
  const [isSavingEditTask, setIsSavingEditTask] = useState(false);
  const [editTaskModalError, setEditTaskModalError] = useState<string | null>(null);
  const [editTaskFieldErrors, setEditTaskFieldErrors] = useState<Record<string, string>>({});
  const editTaskCloseButtonRef = useRef<HTMLButtonElement>(null);
  const [sortBy, setSortBy] = useState<'createdDate' | 'dueDate'>('createdDate');
  const [filterPriority, setFilterPriority] = useState<string>('All');
  const [dueDateFilterFrom, setDueDateFilterFrom] = useState<Dayjs | null>(null);
  const [dueDateFilterTo, setDueDateFilterTo] = useState<Dayjs | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    taskId: string;
    newStatus: string;
    taskTitle: string;
    progress?: number;
  } | null>(null);
  const [deletingBoard, setDeletingBoard] = useState<any>(null);
  const [isDeletingBoard, setIsDeletingBoard] = useState(false);
  const [confirmBoardName, setConfirmBoardName] = useState('');
  const [deletingTask, setDeletingTask] = useState<any>(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [confirmTaskName, setConfirmTaskName] = useState('');
  const [showDeleteError, setShowDeleteError] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState('');
  const [deleteErrorBoardName, setDeleteErrorBoardName] = useState('');
  const [deleteErrorTaskCount, setDeleteErrorTaskCount] = useState(0);

  // Add Task Modal States
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [taskStatus, setTaskStatus] = useState('');
  const [taskDueDate, setTaskDueDate] = useState<Dayjs | null>(null);
  const [taskTags, setTaskTags] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [taskModalError, setTaskModalError] = useState<string | null>(null);
  const [taskFieldErrors, setTaskFieldErrors] = useState<Record<string, string>>({});
  const addTaskCloseButtonRef = useRef<HTMLButtonElement>(null);

  // Fallback statuses in case API fails or returns empty
  const defaultTaskStatuses = useMemo(
    () => [
      { key: 'todo', name: 'To Do', colorName: 'purple', order: 1 },
      { key: 'pending', name: 'Pending', colorName: 'pink', order: 2 },
      { key: 'inprogress', name: 'Inprogress', colorName: 'blue', order: 3 },
      { key: 'onhold', name: 'Onhold', colorName: 'yellow', order: 4 },
      { key: 'review', name: 'Review', colorName: 'orange', order: 5 },
      { key: 'completed', name: 'Completed', colorName: 'green', order: 6 },
      { key: 'cancelled', name: 'Canceled', colorName: 'red', order: 7 },
    ],
    []
  );

  const getModalContainer = () => {
    const modalElement = document.getElementById('modal-datepicker');
    return modalElement ? modalElement : document.body;
  };

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      // Log employee filtering info if user is an employee (case-insensitive)
      const userRole = profile?.role?.toLowerCase();
      if (profile && (userRole === 'employee' || userRole === 'hr') && '_id' in profile) {
        console.log('[TaskBoard] Fetching projects for employee:', {
          _id: profile._id,
          employeeId: profile.employeeId,
          role: profile.role,
          name: `${profile.firstName} ${profile.lastName}`,
        });
        console.log(
          '[TaskBoard] Backend will filter projects where employee is in teamMembers, teamLeader, or projectManager'
        );
      }

      await fetchProjectsAPI();
    } catch (error) {
      console.error('[TaskBoard] Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchProjectsAPI, profile]);

  const loadTaskStatuses = useCallback(async () => {
    try {
      await fetchTaskStatusesAPI();
    } catch (error) {
      console.error('[TaskBoard] Error loading task statuses:', error);
    }
  }, [fetchTaskStatusesAPI]);

  const loadprojecttasks = useCallback(
    async (projectId: string) => {
      if (!projectId || projectId === 'Select') return;
      setTasks([]);
      await fetchTasksByProject(projectId);
    },
    [fetchTasksByProject]
  );

  // Sync tasks from REST API hook to local state
  useEffect(() => {
    if (tasksList) {
      setTasks(tasksList);
    }
  }, [tasksList]);

  // Sync projects from REST API hook to local state
  useEffect(() => {
    if (projectsList) {
      setProjects(projectsList);
    }
  }, [projectsList]);

  const projectChoose = [
    { value: 'Select', label: 'Select' },
    ...projects.map((project) => ({
      value: project._id,
      label: project.projectId ? `${project.name} (${project.projectId})` : project.name,
    })),
  ];

  const priorityChoose = [
    { value: 'Select', label: 'Select' },
    { value: 'Medium', label: 'Medium' },
    { value: 'High', label: 'High' },
    { value: 'Low', label: 'Low' },
  ];

  // Dynamic assignee options from current project's team members and team leaders
  const assigneeChoose = useMemo(() => {
    const baseOption = [{ value: 'Select', label: 'Select' }];
    const currentProject = projects.find(
      (p) => p._id === selectedProject || p.projectId === selectedProject
    );

    // Combine team members and team leaders
    const allMembers = [
      ...(currentProject?.teamMembersdetail || []),
      ...(currentProject?.teamLeaderdetail || []),
    ];

    if (allMembers.length === 0) {
      return baseOption;
    }

    const seen = new Set<string>();
    const teamOptions = allMembers.reduce((acc: any[], member: any) => {
      const value = (member?._id || member?.id || member?.employeeId || '').toString();
      if (!value || seen.has(value)) return acc; // skip empty or duplicate ids
      seen.add(value);
      acc.push({
        value,
        label:
          `${member?.employeeId || ''} - ${(member?.firstName || '').trim()} ${(member?.lastName || '').trim()}`.trim(),
        employeeId: member?.employeeId || '',
        name: `${(member?.firstName || '').trim()} ${(member?.lastName || '').trim()}`.trim(),
      });
      return acc;
    }, []);

    return [...baseOption, ...teamOptions];
  }, [projects, selectedProject]);

  const normalizeStatus = (status?: string) => (status || 'Pending').toLowerCase();

  // Normalize status keys across cases, spaces, hyphens, and underscores
  const normalizeKey = useCallback((value?: string) => {
    return (value || '').toLowerCase().replace(/[\s_-]+/g, '');
  }, []);

  // Color hex map for saving to backend
  const colorHexMap = useMemo(
    () => ({
      purple: '#6f42c1',
      pink: '#d63384',
      blue: '#0d6efd',
      yellow: '#ffc107',
      green: '#198754',
      orange: '#fd7e14',
      red: '#dc3545',
    }),
    []
  );

  // Sort and filter tasks based on selected sort option and priority filter
  const sortedTasks = useMemo(() => {
    let tasksCopy = [...tasks];

    // Filter by priority
    if (filterPriority !== 'All') {
      tasksCopy = tasksCopy.filter((task) => task.priority === filterPriority);
    }

    // Filter by due date range
    if (dueDateFilterFrom || dueDateFilterTo) {
      tasksCopy = tasksCopy.filter((task) => {
        if (!task.dueDate) return false;
        const taskDueDate = dayjs(task.dueDate);

        if (dueDateFilterFrom && taskDueDate.isBefore(dueDateFilterFrom, 'day')) {
          return false;
        }

        if (dueDateFilterTo && taskDueDate.isAfter(dueDateFilterTo, 'day')) {
          return false;
        }

        return true;
      });
    }

    if (sortBy === 'dueDate') {
      // Sort by due date in ascending order (earliest first)
      return tasksCopy.sort((a, b) => {
        const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return dateA - dateB;
      });
    } else {
      // Sort by created date in ascending order (earliest first)
      return tasksCopy.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : Infinity;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : Infinity;
        return dateA - dateB;
      });
    }
  }, [tasks, sortBy, filterPriority, dueDateFilterFrom, dueDateFilterTo]);

  // Dynamic status count helper
  const getStatusCount = useCallback(
    (statusKey: string) => {
      const target = normalizeKey(statusKey);
      return sortedTasks.filter((task) => {
        const taskStatus = normalizeKey(task.status);
        return taskStatus === target;
      }).length;
    },
    [tasks, normalizeKey]
  );

  const totalTasks = tasks.length;
  const totalpendingCount = tasks.filter((task) => {
    const s = normalizeStatus(task.status);
    return (
      s === 'pending' || s === 'to do' || s === 'todo' || s === 'inprogress' || s === 'in progress'
    );
  }).length;
  const totalcompletedCount = tasks.filter((task) => {
    const s = normalizeStatus(task.status);
    return s === 'completed' || s === 'review';
  }).length;

  // Dynamic counts per status from taskStatuses collection
  const todoingCount = getStatusCount('todo');
  const canceledCount = getStatusCount('cancelled');
  const reviewCount = getStatusCount('review');
  const onholdCount = getStatusCount('onhold');
  const pendingCount = getStatusCount('pending');
  const inprogressCount = getStatusCount('inprogress');
  const completedCount = getStatusCount('completed');

  // Helper to get color classes for status badges
  const getColorClass = useCallback((colorName?: string) => {
    const colorMap: Record<string, { bg: string; soft: string }> = {
      purple: { bg: 'bg-purple', soft: 'bg-transparent-purple' },
      pink: { bg: 'bg-pink', soft: 'bg-soft-pink' },
      blue: { bg: 'bg-skyblue', soft: 'bg-soft-skyblue' },
      yellow: { bg: 'bg-warning', soft: 'bg-soft-warning' },
      green: { bg: 'bg-success', soft: 'bg-soft-success' },
      orange: { bg: 'bg-orange', soft: 'bg-soft-orange' },
      red: { bg: 'bg-danger', soft: 'bg-soft-danger' },
    };
    return colorMap[colorName?.toLowerCase() || 'purple'] || colorMap.purple;
  }, []);

  const updateTaskStatus = useCallback(
    async (taskId: string, newStatus: string, progressOverride?: number) => {
      try {
        // Map status to progress percentage
        const progressByStatus: Record<string, number> = {
          'To Do': 0,
          Pending: 20,
          Inprogress: 50,
          Completed: 100,
        };
        const progress =
          typeof progressOverride === 'number'
            ? progressOverride
            : (progressByStatus[newStatus] ?? 0);

        const success = await updateTaskStatusAPI(taskId, newStatus);

        if (success) {
          toast.success('Task status updated successfully');
          // Reload tasks to reflect the change
          if (selectedProject !== 'Select') {
            loadprojecttasks(selectedProject);
          }
        } else {
          toast.error('Failed to update task status');
        }
      } catch (error) {
        console.error('[TaskBoard] Error updating task status:', error);
        toast.error('Failed to update task status');
      }
    },
    [updateTaskStatusAPI, selectedProject, loadprojecttasks]
  );

  const handleConfirmStatusChange = () => {
    if (pendingStatusChange) {
      updateTaskStatus(
        pendingStatusChange.taskId,
        pendingStatusChange.newStatus,
        pendingStatusChange.progress
      );
    }
    setShowStatusModal(false);
    setPendingStatusChange(null);
  };

  const handleCancelStatusChange = () => {
    // Reload tasks to reset the UI
    if (selectedProject !== 'Select') {
      loadprojecttasks(selectedProject);
    }
    setShowStatusModal(false);
    setPendingStatusChange(null);
  };

  const handleAddBoardSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newBoardName.trim()) {
        toast.error('Board name is required');
        return;
      }

      setSavingBoard(true);
      try {
        const success = await createTaskStatusAPI({
          name: newBoardName.trim(),
          colorName: newBoardColor,
          colorHex: colorHexMap[newBoardColor] || '',
        });

        if (success) {
          setNewBoardName('');
          setNewBoardColor('purple');
          await loadTaskStatuses();
          if (addBoardCloseButtonRef.current) {
            addBoardCloseButtonRef.current.click();
          }
        }
      } catch (error) {
        console.error('[TaskBoard] Error adding board:', error);
      } finally {
        setSavingBoard(false);
      }
    },
    [newBoardName, newBoardColor, colorHexMap, createTaskStatusAPI, loadTaskStatuses]
  );

  const handleEditBoardClick = useCallback((status: any) => {
    setEditBoardData(status);
    setEditBoardName(status.name || '');
    setEditBoardColor(status.colorName || 'purple');
  }, []);

  const handleEditBoardSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editBoardName.trim()) {
        toast.error('Board name is required');
        return;
      }
      if (!editBoardData?._id) {
        toast.error('Invalid board data');
        return;
      }

      setSavingBoard(true);
      try {
        const success = await updateTaskStatusBoardAPI(editBoardData._id, {
          name: editBoardName.trim(),
          colorName: editBoardColor,
          colorHex: colorHexMap[editBoardColor] || '',
        });

        if (success) {
          setEditBoardData(null);
          setEditBoardName('');
          setEditBoardColor('purple');
          await loadTaskStatuses();
          if (editBoardCloseButtonRef.current) {
            editBoardCloseButtonRef.current.click();
          }
        }
      } catch (error) {
        console.error('[TaskBoard] Error updating board:', error);
      } finally {
        setSavingBoard(false);
      }
    },
    [
      editBoardName,
      editBoardColor,
      editBoardData,
      colorHexMap,
      updateTaskStatusBoardAPI,
      loadTaskStatuses,
    ]
  );

  // Edit Task Functions
  const closeModalById = useCallback((modalId: string) => {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
      const modalInstance = (window as any)?.bootstrap?.Modal?.getInstance?.(modalElement);
      if (modalInstance) {
        modalInstance.hide();
      }
    }
  }, []);

  const handleOpenDeleteBoard = useCallback(
    (board: any) => {
      console.log('[TaskBoard] Attempting to delete board:', {
        board,
        boardKey: board.key,
        boardName: board.name,
        totalTasks: tasks.length,
      });

      // Check if there are any tasks with this board's status
      const boardStatusKey = normalizeKey(board.key || board.name);
      console.log('[TaskBoard] Normalized board status key:', boardStatusKey);

      const tasksInBoard = tasks.filter((task) => {
        const taskStatus = normalizeKey(task.status);
        const matches = taskStatus === boardStatusKey;
        if (matches) {
          console.log('[TaskBoard] Found task in board:', {
            taskTitle: task.title,
            taskStatus: task.status,
            normalizedTaskStatus: taskStatus,
            boardStatusKey,
          });
        }
        return matches;
      });

      console.log('[TaskBoard] Tasks in board:', tasksInBoard.length);

      if (tasksInBoard.length > 0) {
        console.log('[TaskBoard] Showing error modal...');
        // Show error modal instead of toast
        setDeleteErrorBoardName(board.name);
        setDeleteErrorTaskCount(tasksInBoard.length);
        setDeleteErrorMessage(
          `Cannot delete this board. There ${tasksInBoard.length === 1 ? 'is' : 'are'} ${tasksInBoard.length} task${tasksInBoard.length === 1 ? '' : 's'} currently in this status. Please move ${tasksInBoard.length === 1 ? 'it' : 'them'} to another status before deleting.`
        );
        setShowDeleteError(true);
        return;
      }

      // No tasks in this board, set state and open modal programmatically
      setDeletingBoard(board);
      setConfirmBoardName('');

      // Open modal programmatically after state update
      setTimeout(() => {
        const modalElement = document.getElementById('delete_board_modal');
        if (modalElement && (window as any).bootstrap) {
          const modal = new (window as any).bootstrap.Modal(modalElement);
          modal.show();
        }
      }, 0);
    },
    [tasks, normalizeKey]
  );

  const handleDeleteBoard = useCallback(async () => {
    if (!deletingBoard?._id) return;

    setIsDeletingBoard(true);
    console.log('[TaskBoard] Deleting board:', deletingBoard._id);

    try {
      // Use proper API service with authentication
      const { del } = await import('../../../services/api');
      const response = await del(`/tasks/statuses/${deletingBoard._id}`);

      if (response.success) {
        toast.success('Board deleted successfully');
        setDeletingBoard(null);
        setConfirmBoardName('');
        await loadTaskStatuses();
        closeModalById('delete_board_modal');
      } else {
        console.error('[TaskBoard] Failed to delete board:', response.error?.message);
        toast.error(response.error?.message || 'Failed to delete board');
      }
    } catch (error: any) {
      console.error('[TaskBoard] Error deleting board:', error);
      const errorMessage =
        error.response?.data?.error?.message ||
        error.message ||
        'An error occurred while deleting the board';
      toast.error(errorMessage);
    } finally {
      setIsDeletingBoard(false);
    }
  }, [deletingBoard, loadTaskStatuses, closeModalById]);

  const handleOpenDeleteTask = useCallback((task: any) => {
    setDeletingTask(task);
    setConfirmTaskName('');

    // Open modal programmatically after state update
    setTimeout(() => {
      const modalElement = document.getElementById('delete_task_modal');
      if (modalElement && (window as any).bootstrap) {
        const modal = new (window as any).bootstrap.Modal(modalElement);
        modal.show();
      }
    }, 0);
  }, []);

  const handleDeleteTask = useCallback(async () => {
    if (!deletingTask?._id) return;

    setIsDeletingTask(true);
    console.log('[TaskBoard] Deleting task:', deletingTask._id);

    try {
      const success = await deleteTaskAPI(deletingTask._id);
      if (success) {
        console.log('[TaskBoard] Task deleted successfully');
        setDeletingTask(null);
        setConfirmTaskName('');
        // Reload tasks to reflect the change
        if (selectedProject !== 'Select') {
          loadprojecttasks(selectedProject);
        }
        closeModalById('delete_task_modal');
      } else {
        console.error('[TaskBoard] Failed to delete task');
        toast.error('Failed to delete task');
      }
    } catch (error) {
      console.error('[TaskBoard] Error deleting task:', error);
      toast.error('An error occurred while deleting the task');
    } finally {
      setIsDeletingTask(false);
    }
  }, [deletingTask, deleteTaskAPI, selectedProject, loadprojecttasks, closeModalById]);

  // Add Task Functions
  const clearTaskFieldError = (fieldName: string) => {
    setTaskFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  const validateTaskField = (fieldName: string, value: any): string => {
    switch (fieldName) {
      case 'taskTitle':
        if (!value || !value.trim()) return 'Task title is required';
        if (value.trim().length < 3) return 'Task title must be at least 3 characters';
        break;
      case 'taskDescription':
        if (!value || !value.trim()) return 'Task description is required';
        if (value.trim().length < 10) return 'Task description must be at least 10 characters';
        break;
      case 'taskPriority':
        if (!value || value === 'Select') return 'Please select a priority level';
        break;
      case 'taskAssignees':
        if (!Array.isArray(value) || value.length === 0)
          return 'Please select at least one assignee';
        break;
      case 'taskDueDate':
        if (!value) return 'Due date is required';
        // Get current project
        const currentProject = projects.find(
          (p) => p._id === selectedProject || p.projectId === selectedProject
        );
        if (currentProject?.endDate && dayjs(value).isAfter(dayjs(currentProject.endDate))) {
          return `Due date cannot exceed project end date (${dayjs(currentProject.endDate).format('DD-MM-YYYY')})`;
        }
        break;
    }
    return '';
  };

  const handleTaskFieldBlur = (fieldName: string, value: any) => {
    const error = validateTaskField(fieldName, value);
    if (error) {
      setTaskFieldErrors((prev) => ({ ...prev, [fieldName]: error }));
    }
  };

  const validateTaskForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    const titleError = validateTaskField('taskTitle', taskTitle.trim());
    if (titleError) errors.taskTitle = titleError;

    const descriptionError = validateTaskField('taskDescription', taskDescription.trim());
    if (descriptionError) errors.taskDescription = descriptionError;

    const priorityError = validateTaskField('taskPriority', taskPriority);
    if (priorityError) errors.taskPriority = priorityError;

    const assigneeError = validateTaskField('taskAssignees', selectedAssignees);
    if (assigneeError) errors.taskAssignees = assigneeError;

    const dueDateError = validateTaskField('taskDueDate', taskDueDate);
    if (dueDateError) errors.taskDueDate = dueDateError;

    setTaskFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setTimeout(() => {
        const firstErrorField = Object.keys(errors)[0];
        const errorElement =
          document.querySelector(`[name="${firstErrorField}"]`) ||
          document.querySelector(`#${firstErrorField}`) ||
          document.querySelector(`.field-${firstErrorField}`);
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          (errorElement as HTMLElement).focus?.();
        }
      }, 100);

      return false;
    }

    return true;
  }, [
    taskTitle,
    taskDescription,
    taskPriority,
    taskDueDate,
    selectedAssignees,
    projects,
    selectedProject,
  ]);

  const handleOpenAddTask = useCallback(
    (statusKey: string) => {
      if (selectedProject === 'Select') {
        toast.error('Please select a project first');
        return;
      }

      // Reset form
      setTaskTitle('');
      setTaskDescription('');
      setTaskPriority('Medium');
      setTaskStatus(statusKey);
      setTaskDueDate(null);
      setTaskTags([]);
      setSelectedAssignees([]);
      setTaskModalError(null);
      setTaskFieldErrors({});

      // Open modal
      const modalElement = document.getElementById('add_task');
      if (modalElement) {
        const modal = new (window as any).bootstrap.Modal(modalElement);
        modal.show();
      }
    },
    [selectedProject]
  );

  const closeAddTaskModal = useCallback(() => {
    setTaskTitle('');
    setTaskDescription('');
    setTaskPriority('Medium');
    setTaskStatus('');
    setTaskDueDate(null);
    setTaskTags([]);
    setSelectedAssignees([]);
    setTaskModalError(null);
    setTaskFieldErrors({});
    closeModalById('add_task');
  }, [closeModalById]);

  const handleSaveTask = useCallback(async () => {
    if (!validateTaskForm()) {
      return;
    }

    // Filter out empty tags
    const validTags = taskTags.filter((tag) => tag && tag.trim() !== '');

    setIsSavingTask(true);
    setTaskModalError(null);
    setTaskFieldErrors({});

    try {
      const taskData: Partial<Task> = {
        projectId: selectedProject,
        title: taskTitle,
        description: taskDescription,
        priority: taskPriority as 'Low' | 'Medium' | 'High' | 'Urgent',
        tags: validTags,
        assignee: selectedAssignees,
        dueDate: taskDueDate ? taskDueDate.format('YYYY-MM-DD') : undefined,
        status: taskStatus as 'Pending' | 'In Progress' | 'Completed' | 'Cancelled',
      };

      const success = await createTaskAPI(taskData);
      if (success) {
        if (addTaskCloseButtonRef.current) {
          addTaskCloseButtonRef.current.click();
        }
        closeAddTaskModal();
        // Reload tasks to reflect the change
        if (selectedProject !== 'Select') {
          loadprojecttasks(selectedProject);
        }
      } else {
        setTaskModalError('Failed to create task');
      }
    } catch (error) {
      console.error('[TaskBoard] Error creating task:', error);
      setTaskModalError('An error occurred while creating the task');
    } finally {
      setIsSavingTask(false);
    }
  }, [
    validateTaskForm,
    taskTitle,
    taskDescription,
    taskPriority,
    taskStatus,
    taskDueDate,
    taskTags,
    selectedAssignees,
    selectedProject,
    createTaskAPI,
    closeAddTaskModal,
    loadprojecttasks,
  ]);

  const clearEditTaskFieldError = (fieldName: string) => {
    setEditTaskFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  const validateEditTaskField = (fieldName: string, value: any): string => {
    switch (fieldName) {
      case 'taskTitle':
        if (!value || !value.trim()) return 'Task title is required';
        if (value.trim().length < 3) return 'Task title must be at least 3 characters';
        break;
      case 'taskDescription':
        if (!value || !value.trim()) return 'Task description is required';
        if (value.trim().length < 10) return 'Task description must be at least 10 characters';
        break;
      case 'taskPriority':
        if (!value || value === 'Select') return 'Please select a priority level';
        break;
      case 'taskStatus':
        if (!value || value === 'Select') return 'Please select a status';
        break;
      case 'taskAssignees':
        if (!Array.isArray(value) || value.length === 0)
          return 'Please select at least one assignee';
        break;
      case 'taskDueDate':
        if (!value) return 'Due date is required';
        // Get current project
        const currentProject = projects.find(
          (p) => p._id === selectedProject || p.projectId === selectedProject
        );
        if (currentProject?.endDate && dayjs(value).isAfter(dayjs(currentProject.endDate))) {
          return `Due date cannot exceed project end date (${dayjs(currentProject.endDate).format('DD-MM-YYYY')})`;
        }
        break;
    }
    return '';
  };

  const validateEditTaskForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    const titleError = validateEditTaskField('taskTitle', editTaskTitle.trim());
    if (titleError) errors.taskTitle = titleError;

    const descriptionError = validateEditTaskField('taskDescription', editTaskDescription.trim());
    if (descriptionError) errors.taskDescription = descriptionError;

    const priorityError = validateEditTaskField('taskPriority', editTaskPriority);
    if (priorityError) errors.taskPriority = priorityError;

    const statusError = validateEditTaskField('taskStatus', editTaskStatus);
    if (statusError) errors.taskStatus = statusError;

    const assigneeError = validateEditTaskField('taskAssignees', editTaskAssignees);
    if (assigneeError) errors.taskAssignees = assigneeError;

    const dueDateError = validateEditTaskField('taskDueDate', editTaskDueDate);
    if (dueDateError) errors.taskDueDate = dueDateError;

    setEditTaskFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setTimeout(() => {
        const firstErrorField = Object.keys(errors)[0];
        const errorElement =
          document.querySelector(`[name="${firstErrorField}"]`) ||
          document.querySelector(`#${firstErrorField}`) ||
          document.querySelector(`.field-${firstErrorField}`);
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          (errorElement as HTMLElement).focus?.();
        }
      }, 100);

      return false;
    }

    return true;
  }, [
    editTaskTitle,
    editTaskDescription,
    editTaskPriority,
    editTaskStatus,
    editTaskDueDate,
    editTaskAssignees,
    projects,
    selectedProject,
  ]);

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

  const handleOpenEditTask = useCallback(
    (task: any) => {
      setEditingTask(task);
      setEditTaskTitle(task.title || '');
      setEditTaskDescription(task.description || '');
      setEditTaskPriority(task.priority || 'Medium');
      setEditTaskDueDate(task.dueDate ? dayjs(task.dueDate) : null);
      const matchedStatus = findMatchingStatus(task.status, taskStatuses);
      setEditTaskStatus(matchedStatus);
      setEditTaskTags(Array.isArray(task.tags) ? task.tags : []);

      // Handle assignees - they can be objects (populated) or strings (IDs)
      const assigneeIds = Array.isArray(task.assignee)
        ? task.assignee
            .map((a: any) => {
              // If it's an object (populated), extract _id
              if (typeof a === 'object' && a !== null) {
                return (a._id || a.id || '').toString();
              }
              // If it's already a string ID
              return a.toString();
            })
            .filter(Boolean) // Remove any empty values
        : [];

      setEditTaskAssignees(assigneeIds);
      setEditTaskModalError(null);
      setEditTaskFieldErrors({});
    },
    [findMatchingStatus, taskStatuses]
  );

  const closeEditTaskModal = useCallback(() => {
    setEditingTask(null);
    setEditTaskTitle('');
    setEditTaskDescription('');
    setEditTaskPriority('Medium');
    setEditTaskDueDate(null);
    setEditTaskStatus('');
    setEditTaskTags([]);
    setEditTaskAssignees([]);
    setEditTaskModalError(null);
    setEditTaskFieldErrors({});
    closeModalById('edit_task');
  }, [closeModalById]);

  const handleSaveEditTask = useCallback(async () => {
    if (!editingTask?._id) return;

    if (!validateEditTaskForm()) {
      return;
    }

    const validTags = editTaskTags.filter((tag) => tag && tag.trim() !== '');

    setIsSavingEditTask(true);
    setEditTaskModalError(null);
    setEditTaskFieldErrors({});

    try {
      const updateData: Partial<Task> = {
        title: editTaskTitle,
        description: editTaskDescription,
        priority: editTaskPriority as 'Low' | 'Medium' | 'High' | 'Urgent',
        status: editTaskStatus as 'Pending' | 'In Progress' | 'Completed' | 'Cancelled',
        tags: validTags,
        assignee: editTaskAssignees.join(','),
        dueDate: editTaskDueDate ? editTaskDueDate.format('YYYY-MM-DD') : undefined,
      };

      const success = await updateTaskAPI(editingTask._id, updateData);

      if (success) {
        toast.success('Task updated successfully');
        closeEditTaskModal();
        // Reload tasks to reflect the change
        if (selectedProject !== 'Select') {
          loadprojecttasks(selectedProject);
        }
      } else {
        setEditTaskModalError('Failed to update task');
      }
    } catch (error) {
      console.error('[TaskBoard] Error updating task:', error);
      setEditTaskModalError('An error occurred while updating the task');
    } finally {
      setIsSavingEditTask(false);
    }
  }, [
    editingTask,
    editTaskTitle,
    editTaskDescription,
    editTaskPriority,
    editTaskStatus,
    editTaskTags,
    editTaskAssignees,
    editTaskDueDate,
    updateTaskAPI,
    validateEditTaskForm,
    closeEditTaskModal,
    selectedProject,
    loadprojecttasks,
  ]);

  // Dynamically create container refs based on taskStatuses count
  const containerRefs = useMemo(
    () => Array.from({ length: taskStatuses.length }, () => React.createRef<HTMLDivElement>()),
    [taskStatuses.length]
  );

  useEffect(() => {
    // Skip if no taskStatuses or containerRefs
    if (taskStatuses.length === 0 || containerRefs.length === 0) return;

    // Get all non-null container elements from dynamic refs
    const containers = containerRefs
      .map((ref) => ref.current)
      .filter((container): container is HTMLDivElement => container !== null);

    // Skip if no containers are ready
    if (containers.length === 0) return;

    const drake: Drake = dragula(containers);

    drake.on('drop', (el, target, source) => {
      if (target && source && target !== source) {
        // Get the task ID from the element
        const taskId = el.getAttribute('data-task-id');
        const taskTitle = el.getAttribute('data-task-title');

        if (taskId && target) {
          // Determine new status based on target container - dynamically from taskStatuses
          let newStatus = '';
          let sourceStatus = '';

          // Find target container index
          const targetIndex = containerRefs.findIndex((ref) => ref.current === target);
          if (targetIndex !== -1 && taskStatuses[targetIndex]) {
            newStatus = taskStatuses[targetIndex].name;
          }

          // Find source container index
          const sourceIndex = containerRefs.findIndex((ref) => ref.current === source);
          if (sourceIndex !== -1 && taskStatuses[sourceIndex]) {
            sourceStatus = taskStatuses[sourceIndex].name;
          }

          if (newStatus) {
            // Cancel the drop temporarily
            drake.cancel(true);

            // Compute progress: use fixed mapping when available; otherwise preserve from source status
            const progressByStatus: Record<string, number> = {
              'To Do': 0,
              Pending: 20,
              Inprogress: 50,
              Completed: 100,
            };
            let proposedProgress: number | undefined = progressByStatus[newStatus];
            if (typeof proposedProgress === 'undefined') {
              proposedProgress = progressByStatus[sourceStatus] ?? 0;
            }

            // Show confirmation modal
            setPendingStatusChange({
              taskId,
              newStatus,
              taskTitle: taskTitle || 'this task',
              progress: proposedProgress,
            });
            setShowStatusModal(true);
          }
        }
      }
    });

    return () => {
      drake.destroy();
    };
  }, [taskStatuses]);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Sync statuses from REST API hook
  useEffect(() => {
    if (statusesFromHook && statusesFromHook.length > 0) {
      setTaskStatuses(statusesFromHook);
    } else if (statusesFromHook && statusesFromHook.length === 0) {
      // Use defaults if no statuses from API
      setTaskStatuses(defaultTaskStatuses);
    }
  }, [statusesFromHook, defaultTaskStatuses]);

  // Load task statuses on mount
  useEffect(() => {
    loadTaskStatuses();
  }, [loadTaskStatuses]);

  return (
    <>
      {/* Page Wrapper */}
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Task Board</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to="index.html">
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">Projects</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Task Board
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
              {!isEmployee && (
                <div className="dropdown me-2">
                  <button
                    className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                    type="button"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                    onClick={() => console.log('Export clicked')}
                  >
                    <i className="ti ti-file-export me-2" /> Export
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end p-3">
                    <li>
                      <a
                        href="#"
                        className="dropdown-item rounded-1"
                        onClick={(e) => {
                          e.preventDefault();
                          console.log('Export as PDF clicked');
                        }}
                      >
                        <i className="ti ti-file-type-pdf me-1" />
                        Export as PDF
                      </a>
                    </li>
                    <li>
                      <a
                        href="#"
                        className="dropdown-item rounded-1"
                        onClick={(e) => {
                          e.preventDefault();
                          console.log('Export as Excel clicked');
                        }}
                      >
                        <i className="ti ti-file-type-xls me-1" />
                        Export as Excel{' '}
                      </a>
                    </li>
                  </ul>
                </div>
              )}
              {!isEmployee && (
                <Link
                  to="#"
                  className="btn btn-primary d-inline-flex align-items-center"
                  data-bs-toggle="modal"
                  data-inert={true}
                  data-bs-target="#add_board"
                >
                  <i className="ti ti-circle-plus me-1" />
                  Add Board
                </Link>
              )}
              <div className="head-icons ms-2 mb-0">
                <CollapseHeader />
              </div>
            </div>
          </div>
          {/* Project Selection */}
          <div className="card mb-3">
            <div className="card-body">
              <div className="row align-items-end">
                <div className="col-md-6">
                  <label className="form-label d-block mb-2">Select Project</label>
                  {loading ? (
                    <div className="text-center py-2">
                      <div className="spinner-border spinner-border-sm text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <span className="ms-2">Loading projects...</span>
                    </div>
                  ) : (
                    <CommonSelect
                      className="select"
                      options={projectChoose}
                      defaultValue={projectChoose[0]}
                      onChange={(selected: any) => {
                        const value = selected?.value || 'Select';
                        setSelectedProject(value);
                        console.log('Selected project:', value);
                        if (value !== 'Select') {
                          // Fetch full project details to get team members
                          getProjectByIdAPI(value).then((fullProject) => {
                            if (fullProject) {
                              // Update the project in the list with full details including teamMembersdetail and teamLeaderdetail
                              setProjects((prev) =>
                                prev.map((p) =>
                                  p._id === value || p.projectId === value
                                    ? {
                                        ...p,
                                        ...fullProject,
                                        teamMembersdetail: fullProject.teamMembers,
                                        teamLeaderdetail: fullProject.teamLeader,
                                      }
                                    : p
                                )
                              );
                            }
                          });
                          loadprojecttasks(value);
                        } else {
                          setTasks([]);
                          setLoading(false);
                        }
                      }}
                    />
                  )}
                </div>
                <div className="col-md-6">
                  <div className="alert alert-info mb-0">
                    <strong>Selected Project:</strong>{' '}
                    {selectedProject !== 'Select'
                      ? (() => {
                          const proj = projects.find(
                            (p) => p.projectId === selectedProject || p._id === selectedProject
                          );
                          if (!proj) return selectedProject;
                          const id = proj.projectId || proj._id;
                          return `${proj.name} (${id})`;
                        })()
                      : 'No project selected'}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
              <h4>
                {selectedProject !== 'Select'
                  ? (() => {
                      const proj = projects.find(
                        (p) => p.projectId === selectedProject || p._id === selectedProject
                      );
                      if (!proj) return 'Select a Project to View Tasks';
                      const id = proj.projectId || proj._id;
                      return `${proj.name} (${id})`;
                    })()
                  : 'Select a Project to View Tasks'}
              </h4>
              <div className="d-flex align-items-center flex-wrap row-gap-3">
                {/* <div className="avatar-list-stacked avatar-group-sm me-3">
                                    <span className="avatar avatar-rounded">
                                        <ImageWithBasePath
                                            className="border border-white"
                                            src="assets/img/profiles/avatar-19.jpg"
                                            alt="img"
                                        />
                                    </span>
                                    <span className="avatar avatar-rounded">
                                        <ImageWithBasePath
                                            className="border border-white"
                                            src="assets/img/profiles/avatar-29.jpg"
                                            alt="img"
                                        />
                                    </span>
                                    <span className="avatar avatar-rounded">
                                        <ImageWithBasePath
                                            className="border border-white"
                                            src="assets/img/profiles/avatar-16.jpg"
                                            alt="img"
                                        />
                                    </span>
                                    <span className="avatar avatar-rounded bg-primary fs-12">1+</span>
                                </div> */}
                <div className="d-flex align-items-center me-3">
                  <p className="mb-0 me-3 pe-3 border-end fs-14">
                    Total Task : <span className="text-dark"> {totalTasks} </span>
                  </p>
                  <p className="mb-0 me-3 pe-3 border-end fs-14">
                    Pending : <span className="text-dark"> {totalpendingCount} </span>
                  </p>
                  <p className="mb-0 fs-14">
                    Completed : <span className="text-dark"> {totalcompletedCount} </span>
                  </p>
                </div>
                {/* <div className="input-icon-start position-relative">
                                    <span className="input-icon-addon">
                                        <i className="ti ti-search" />
                                    </span>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Search Project"
                                    />
                                </div> */}
              </div>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-lg-12">
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
                        placeholder="From Date"
                        value={dueDateFilterFrom}
                        onChange={(date) => setDueDateFilterFrom(date)}
                      />
                    </div>
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
                        placeholder="To Date"
                        value={dueDateFilterTo}
                        onChange={(date) => setDueDateFilterTo(date)}
                      />
                    </div>
                    <div className="dropdown me-2">
                      <Link
                        to="#"
                        className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                        data-bs-toggle="dropdown"
                      >
                        Priority: {filterPriority}
                      </Link>
                      <ul className="dropdown-menu dropdown-menu-end p-3">
                        <li>
                          <Link
                            to="#"
                            className="dropdown-item rounded-1"
                            onClick={() => setFilterPriority('All')}
                          >
                            All
                          </Link>
                        </li>
                        <li>
                          <Link
                            to="#"
                            className="dropdown-item rounded-1"
                            onClick={() => setFilterPriority('High')}
                          >
                            High
                          </Link>
                        </li>
                        <li>
                          <Link
                            to="#"
                            className="dropdown-item rounded-1"
                            onClick={() => setFilterPriority('Medium')}
                          >
                            Medium
                          </Link>
                        </li>
                        <li>
                          <Link
                            to="#"
                            className="dropdown-item rounded-1"
                            onClick={() => setFilterPriority('Low')}
                          >
                            Low
                          </Link>
                        </li>
                      </ul>
                    </div>
                    <div className="d-flex align-items-center border rounded p-2">
                      <span className="d-inline-flex me-2">Sort By : </span>
                      <div className="dropdown">
                        <Link
                          to="#"
                          className="dropdown-toggle btn btn-white d-inline-flex align-items-center border-0 bg-transparent p-0 text-dark"
                          data-bs-toggle="dropdown"
                        >
                          {sortBy === 'dueDate' ? 'Due Date' : 'Created Date'}
                        </Link>
                        <ul className="dropdown-menu dropdown-menu-end p-3">
                          <li>
                            <Link
                              to="#"
                              className="dropdown-item rounded-1"
                              onClick={() => setSortBy('createdDate')}
                            >
                              Created Date
                            </Link>
                          </li>
                          <li>
                            <Link
                              to="#"
                              className="dropdown-item rounded-1"
                              onClick={() => setSortBy('dueDate')}
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
              <div className="tab-content" id="pills-tabContent">
                <div className="tab-pane fade show active" id="pills-home" role="tabpanel">
                  <div className="d-flex align-items-start overflow-auto project-status pb-4">
                    {/* Dynamic task status columns */}
                    {taskStatuses.length === 0 ? (
                      <div className="text-center p-4 w-100">
                        <p className="text-muted">Loading task statuses...</p>
                      </div>
                    ) : (
                      taskStatuses.map((status, index) => {
                        const statusKey = status.key?.toLowerCase() || '';
                        const count = getStatusCount(statusKey);
                        const colorClasses = getColorClass(status.colorName);
                        const containerRef = containerRefs[index];

                        return (
                          <div
                            key={status._id || status.key}
                            className="p-3 rounded bg-transparent-secondary w-100 me-3"
                          >
                            <div className="bg-white p-2 rounded mb-2">
                              <div className="d-flex align-items-center justify-content-between">
                                <div className="d-flex align-items-center">
                                  <span
                                    className={`${colorClasses.soft} p-1 d-flex rounded-circle me-2`}
                                  >
                                    <span
                                      className={`${colorClasses.bg} rounded-circle d-block p-1`}
                                    />
                                  </span>
                                  <h5 className="me-2">{status.name}</h5>
                                  <span className="badge bg-light rounded-pill">{count}</span>
                                </div>
                                {!isEmployee && (
                                  <div className="dropdown">
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
                                          to="#"
                                          className="dropdown-item rounded-1"
                                          data-bs-toggle="modal"
                                          data-inert={true}
                                          data-bs-target="#edit_board"
                                          onClick={() => handleEditBoardClick(status)}
                                        >
                                          <i className="ti ti-edit me-2" />
                                          Edit
                                        </Link>
                                      </li>
                                      <li>
                                        <Link
                                          to="#"
                                          className="dropdown-item rounded-1"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            handleOpenDeleteBoard(status);
                                          }}
                                        >
                                          <i className="ti ti-trash me-2" />
                                          Delete
                                        </Link>
                                      </li>
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div
                              className="kanban-drag-wrap"
                              ref={containerRef}
                              style={{ maxHeight: '400px', overflowY: 'auto' }}
                            >
                              {sortedTasks
                                .filter((t) => {
                                  const taskStatus = normalizeKey(t.status);
                                  const targetKey = normalizeKey(statusKey);
                                  return taskStatus === targetKey;
                                })
                                .map((t, idx) => (
                                  <div
                                    key={(t as any)._id || idx}
                                    data-task-id={(t as any)._id}
                                    data-task-title={(t as any).title}
                                  >
                                    <div className="card kanban-card mb-2">
                                      <div className="card-body">
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                          <div className="d-flex align-items-center">
                                            <span
                                              className={`badge ${(t as any).priority === 'High' ? 'bg-danger' : (t as any).priority === 'Low' ? 'bg-success' : 'bg-warning'} badge-xs d-flex align-items-center justify-content-center`}
                                            >
                                              <i className="fas fa-circle fs-6 me-1" />
                                              {(t as any).priority || 'Medium'}
                                            </span>
                                          </div>
                                          {!isEmployee && (
                                            <div className="dropdown">
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
                                                    to="#"
                                                    className="dropdown-item rounded-1"
                                                    data-bs-toggle="modal"
                                                    data-inert={true}
                                                    data-bs-target="#edit_task"
                                                    onClick={() => handleOpenEditTask(t)}
                                                  >
                                                    <i className="ti ti-edit me-2" />
                                                    Edit
                                                  </Link>
                                                </li>
                                                <li>
                                                  <Link
                                                    to="#"
                                                    className="dropdown-item rounded-1"
                                                    onClick={(e) => {
                                                      e.preventDefault();
                                                      handleOpenDeleteTask(t);
                                                    }}
                                                  >
                                                    <i className="ti ti-trash me-2" />
                                                    Delete
                                                  </Link>
                                                </li>
                                              </ul>
                                            </div>
                                          )}
                                        </div>
                                        <div className="mb-2">
                                          <h6 className="d-flex align-items-center">
                                            {(t as any).title || 'Untitled Task'}
                                          </h6>
                                        </div>
                                        <div className="d-flex align-items-center mb-2">
                                          <div
                                            className="progress progress-sm flex-fill"
                                            role="progressbar"
                                            aria-label="Basic example"
                                            aria-valuenow={
                                              status.key === 'completed'
                                                ? 100
                                                : status.key === 'inprogress'
                                                  ? 50
                                                  : status.key === 'pending'
                                                    ? 20
                                                    : 0
                                            }
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                          >
                                            <div
                                              className={`progress-bar ${status.key === 'completed' ? 'bg-success' : status.key === 'inprogress' ? 'bg-warning' : 'bg-danger'}`}
                                              style={{
                                                width: `${status.key === 'completed' ? 100 : status.key === 'inprogress' ? 50 : status.key === 'pending' ? 20 : 0}%`,
                                              }}
                                            />
                                          </div>
                                          <span className="d-block ms-2 text-gray-9 fw-medium">
                                            {status.key === 'completed'
                                              ? '100'
                                              : status.key === 'inprogress'
                                                ? '50'
                                                : status.key === 'pending'
                                                  ? '20'
                                                  : '0'}
                                            %
                                          </span>
                                        </div>
                                        <p className="fw-medium mb-0">
                                          Due on :{' '}
                                          <span className="text-gray-9">
                                            {(t as any).dueDate
                                              ? new Date((t as any).dueDate).toLocaleDateString(
                                                  'en-GB',
                                                  {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric',
                                                  }
                                                )
                                              : '-'}
                                          </span>
                                        </p>
                                        <div className="d-flex align-items-center justify-content-between border-top pt-2 mt-2">
                                          <div className="me-3">
                                            <span className="badge bg-light text-dark">
                                              {Array.isArray((t as any).assignee)
                                                ? (t as any).assignee.length
                                                : 0}{' '}
                                              Assignees
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                            <div className="pt-2">
                              <Link
                                to="#"
                                className="btn btn-white border border-dashed d-flex align-items-center justify-content-center"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleOpenAddTask(status.key);
                                }}
                              >
                                <i className="ti ti-plus me-2" /> New Task
                              </Link>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
      {/* /Page Wrapper */}

      {/* Add Task */}
      <div className="modal fade" id="add_task">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Add New Task</h4>
              <button
                ref={addTaskCloseButtonRef}
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={closeAddTaskModal}
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="modal-body">
                {taskModalError && (
                  <div className="alert alert-danger" role="alert">
                    {taskModalError}
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
                        name="taskTitle"
                        className={`form-control ${taskFieldErrors.taskTitle ? 'is-invalid' : ''}`}
                        value={taskTitle}
                        onChange={(e) => {
                          setTaskTitle(e.target.value);
                          clearTaskFieldError('taskTitle');
                        }}
                        onBlur={(e) => handleTaskFieldBlur('taskTitle', e.target.value)}
                        placeholder="Enter task title"
                      />
                      {taskFieldErrors.taskTitle && (
                        <div className="invalid-feedback d-block">{taskFieldErrors.taskTitle}</div>
                      )}
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="mb-3">
                      <label className="form-label">Tags</label>
                      <CommonTagsInput
                        value={taskTags}
                        onChange={(tags) => setTaskTags(tags)}
                        placeholder="Add task tags"
                      />
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Priority <span className="text-danger">*</span>
                      </label>
                      <div
                        id="taskPriority"
                        className={taskFieldErrors.taskPriority ? 'is-invalid' : ''}
                      >
                        <CommonSelect
                          className={`select ${taskFieldErrors.taskPriority ? 'is-invalid' : ''}`}
                          options={priorityChoose}
                          defaultValue={
                            priorityChoose.find((p) => p.value === taskPriority) ||
                            priorityChoose[2]
                          }
                          onChange={(option: any) => {
                            setTaskPriority(option?.value || 'Medium');
                            clearTaskFieldError('taskPriority');
                            handleTaskFieldBlur('taskPriority', option?.value || 'Medium');
                          }}
                        />
                      </div>
                      {taskFieldErrors.taskPriority && (
                        <div className="invalid-feedback d-block">
                          {taskFieldErrors.taskPriority}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-lg-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Description <span className="text-danger">*</span>
                      </label>
                      <textarea
                        name="taskDescription"
                        className={`form-control ${taskFieldErrors.taskDescription ? 'is-invalid' : ''}`}
                        rows={5}
                        value={taskDescription}
                        onChange={(e) => {
                          setTaskDescription(e.target.value);
                          clearTaskFieldError('taskDescription');
                        }}
                        onBlur={(e) => handleTaskFieldBlur('taskDescription', e.target.value)}
                        placeholder="Enter task description (minimum 10 characters)"
                      />
                      {taskFieldErrors.taskDescription && (
                        <div className="invalid-feedback d-block">
                          {taskFieldErrors.taskDescription}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Add Assignee <span className="text-danger">*</span>
                      </label>
                      <div
                        id="taskAssignees"
                        className={`field-taskAssignees ${taskFieldErrors.taskAssignees ? 'is-invalid' : ''}`}
                      >
                        <Select
                          isMulti
                          className="basic-multi-select"
                          classNamePrefix="select"
                          options={assigneeChoose.filter((opt) => opt.value !== 'Select')}
                          value={assigneeChoose.filter((opt) =>
                            selectedAssignees.includes(opt.value)
                          )}
                          onChange={(opts) => {
                            const values = (opts || []).map((opt) => opt.value);
                            setSelectedAssignees(values);
                            clearTaskFieldError('taskAssignees');
                            handleTaskFieldBlur('taskAssignees', values);
                          }}
                          placeholder={
                            assigneeChoose.length === 1
                              ? 'No team members available'
                              : 'Select assignees'
                          }
                          isDisabled={assigneeChoose.length === 1}
                        />
                      </div>
                      {taskFieldErrors.taskAssignees && (
                        <div className="invalid-feedback d-block">
                          {taskFieldErrors.taskAssignees}
                        </div>
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
                          getPopupContainer={() =>
                            document.getElementById('add_task') || document.body
                          }
                          placeholder="DD-MM-YYYY"
                          value={taskDueDate}
                          onChange={(value) => {
                            setTaskDueDate(value);
                            clearTaskFieldError('taskDueDate');
                            if (value) {
                              handleTaskFieldBlur('taskDueDate', value);
                            }
                          }}
                        />
                        <span className="input-icon-addon">
                          <i className="ti ti-calendar text-gray-7" />
                        </span>
                      </div>
                      {taskFieldErrors.taskDueDate && (
                        <div className="invalid-feedback d-block">
                          {taskFieldErrors.taskDueDate}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="mb-0">
                      <label className="form-label">
                        Status <span className="text-danger">*</span>
                      </label>
                      <CommonSelect
                        className="select"
                        options={taskStatuses.map((status) => ({
                          value: status.key,
                          label: status.name,
                        }))}
                        value={
                          taskStatuses.find((status) => status.key === taskStatus)
                            ? {
                                value: taskStatus,
                                label: taskStatuses.find((status) => status.key === taskStatus)
                                  ?.name,
                              }
                            : taskStatuses.length > 0
                              ? { value: taskStatuses[0].key, label: taskStatuses[0].name }
                              : { value: '', label: 'Select Status' }
                        }
                        onChange={(option: any) => {
                          setTaskStatus(option?.value || '');
                        }}
                        disabled={true}
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
                  onClick={closeAddTaskModal}
                  disabled={isSavingTask}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveTask}
                  disabled={isSavingTask}
                  className="btn btn-primary"
                >
                  {isSavingTask ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      Saving...
                    </>
                  ) : (
                    'Add New Task'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Add Task */}
      {/* Edit Task */}
      <div className="modal fade" id="edit_task">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Edit Task</h4>
              <button
                ref={editTaskCloseButtonRef}
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={closeEditTaskModal}
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="modal-body">
              {editTaskModalError && (
                <div className="alert alert-danger alert-dismissible fade show" role="alert">
                  {editTaskModalError}
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
                      name="taskTitle"
                      className={`form-control ${editTaskFieldErrors.taskTitle ? 'is-invalid' : ''}`}
                      value={editTaskTitle}
                      onChange={(e) => {
                        setEditTaskTitle(e.target.value);
                        clearEditTaskFieldError('taskTitle');
                      }}
                      placeholder="Enter task title"
                    />
                    {editTaskFieldErrors.taskTitle && (
                      <div className="invalid-feedback">{editTaskFieldErrors.taskTitle}</div>
                    )}
                  </div>
                </div>
                <div className="col-12">
                  <div className="mb-3">
                    <label className="form-label">Tag</label>
                    <CommonTagsInput
                      value={editTaskTags}
                      onChange={(tags: string[]) => setEditTaskTags(tags)}
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
                      className={`select ${editTaskFieldErrors.taskPriority ? 'is-invalid' : ''}`}
                      options={priorityChoose}
                      value={priorityChoose.find((opt) => opt.value === editTaskPriority)}
                      onChange={(option: any) => {
                        setEditTaskPriority(option?.value || 'Medium');
                        clearEditTaskFieldError('taskPriority');
                      }}
                    />
                    {editTaskFieldErrors.taskPriority && (
                      <div className="invalid-feedback d-block">
                        {editTaskFieldErrors.taskPriority}
                      </div>
                    )}
                  </div>
                </div>
                <div className="col-6">
                  <div className="mb-3">
                    <label className="form-label">
                      Status <span className="text-danger">*</span>
                    </label>
                    <CommonSelect
                      className={`select ${editTaskFieldErrors.taskStatus ? 'is-invalid' : ''}`}
                      options={taskStatuses.map((status) => ({
                        value: status.key,
                        label: status.name,
                      }))}
                      value={
                        taskStatuses.find((status) => status.key === editTaskStatus)
                          ? {
                              value: editTaskStatus,
                              label: taskStatuses.find((status) => status.key === editTaskStatus)
                                ?.name,
                            }
                          : { value: '', label: '' }
                      }
                      onChange={(option: any) => {
                        setEditTaskStatus(option?.value || '');
                        clearEditTaskFieldError('taskStatus');
                      }}
                    />
                    {editTaskFieldErrors.taskStatus && (
                      <div className="invalid-feedback d-block">
                        {editTaskFieldErrors.taskStatus}
                      </div>
                    )}
                  </div>
                </div>
                <div className="col-12">
                  <div className="mb-3">
                    <label className="form-label">
                      Description <span className="text-danger">*</span>
                    </label>
                    <textarea
                      name="taskDescription"
                      className={`form-control ${editTaskFieldErrors.taskDescription ? 'is-invalid' : ''}`}
                      rows={4}
                      value={editTaskDescription}
                      onChange={(e) => {
                        setEditTaskDescription(e.target.value);
                        clearEditTaskFieldError('taskDescription');
                      }}
                      placeholder="Enter task description"
                    />
                    {editTaskFieldErrors.taskDescription && (
                      <div className="invalid-feedback">{editTaskFieldErrors.taskDescription}</div>
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
                        getPopupContainer={() =>
                          document.getElementById('edit_task') || document.body
                        }
                        placeholder="DD-MM-YYYY"
                        value={editTaskDueDate}
                        onChange={(value) => {
                          setEditTaskDueDate(value);
                          clearEditTaskFieldError('taskDueDate');
                        }}
                      />
                      <span className="input-icon-addon">
                        <i className="ti ti-calendar text-gray-7" />
                      </span>
                    </div>
                    {editTaskFieldErrors.taskDueDate && (
                      <div className="invalid-feedback d-block">
                        {editTaskFieldErrors.taskDueDate}
                      </div>
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
                      className={`basic-multi-select ${editTaskFieldErrors.taskAssignees ? 'is-invalid' : ''}`}
                      classNamePrefix="select"
                      options={assigneeChoose.filter((opt) => opt.value !== 'Select')}
                      value={assigneeChoose.filter((opt) => editTaskAssignees.includes(opt.value))}
                      onChange={(opts) => {
                        setEditTaskAssignees((opts || []).map((opt) => opt.value));
                        clearEditTaskFieldError('taskAssignees');
                      }}
                      placeholder="Select assignees"
                    />
                    {editTaskFieldErrors.taskAssignees && (
                      <div className="invalid-feedback d-block">
                        {editTaskFieldErrors.taskAssignees}
                      </div>
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
                onClick={closeEditTaskModal}
                disabled={isSavingEditTask}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveEditTask}
                disabled={isSavingEditTask}
              >
                {isSavingEditTask ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* /Edit Task */}
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
                aria-label="Close"
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

      {/* Add Board */}
      <div className="modal fade" id="add_board" ref={addBoardModalRef}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Add New Board</h4>
              <button
                ref={addBoardCloseButtonRef}
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form onSubmit={handleAddBoardSubmit}>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Board Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newBoardName}
                    onChange={(e) => setNewBoardName(e.target.value)}
                  />
                </div>
                <label className="form-label">Board Color</label>
                <div className="d-flex align-items-center flex-wrap row-gap-3">
                  <div className="theme-colors mb-4">
                    <ul className="d-flex align-items-center">
                      {[
                        { key: 'purple', className: 'bg-purple' },
                        { key: 'pink', className: 'bg-pink' },
                        { key: 'blue', className: 'bg-info' },
                        { key: 'yellow', className: 'bg-warning' },
                        { key: 'green', className: 'bg-success' },
                        { key: 'orange', className: 'bg-orange' },
                        { key: 'red', className: 'bg-danger' },
                      ].map((c) => {
                        const selected = newBoardColor === c.key;
                        return (
                          <li key={c.key} className="text-center">
                            <button
                              type="button"
                              className="themecolorset border-0 bg-transparent p-0"
                              onClick={() => setNewBoardColor(c.key)}
                              title={c.key}
                              aria-pressed={selected}
                            >
                              <span
                                className={`primecolor ${c.className} d-inline-flex align-items-center justify-content-center`}
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '8px',
                                  border: selected ? '2px solid #111' : '1px solid #e0e0e0',
                                  boxShadow: selected ? '0 0 0 2px rgba(0,0,0,0.08)' : 'none',
                                }}
                              >
                                {selected && <i className="ti ti-check text-white fs-14" />}
                              </span>
                            </button>
                            <small
                              className="d-block mt-1 text-muted text-capitalize"
                              style={{ fontSize: '11px' }}
                            >
                              {c.key}
                            </small>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-light me-2" data-bs-dismiss="modal">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingBoard}>
                  {savingBoard ? 'Saving...' : 'Add New Board'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Add Board */}

      {/* Edit Board */}
      <div className="modal fade" id="edit_board" ref={editBoardModalRef}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Edit Board</h4>
              <button
                ref={editBoardCloseButtonRef}
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form onSubmit={handleEditBoardSubmit}>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Board Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editBoardName}
                    onChange={(e) => setEditBoardName(e.target.value)}
                  />
                </div>
                <label className="form-label">Board Color</label>
                <div className="d-flex align-items-center flex-wrap row-gap-3">
                  <div className="theme-colors mb-4">
                    <ul className="d-flex align-items-center">
                      {[
                        { key: 'purple', className: 'bg-purple' },
                        { key: 'pink', className: 'bg-pink' },
                        { key: 'blue', className: 'bg-info' },
                        { key: 'yellow', className: 'bg-warning' },
                        { key: 'green', className: 'bg-success' },
                        { key: 'orange', className: 'bg-orange' },
                        { key: 'red', className: 'bg-danger' },
                      ].map((c) => {
                        const selected = editBoardColor === c.key;
                        return (
                          <li key={c.key} className="text-center">
                            <button
                              type="button"
                              className="themecolorset border-0 bg-transparent p-0"
                              onClick={() => setEditBoardColor(c.key)}
                              title={c.key}
                              aria-pressed={selected}
                            >
                              <span
                                className={`primecolor ${c.className} d-inline-flex align-items-center justify-content-center`}
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '8px',
                                  border: selected ? '2px solid #111' : '1px solid #e0e0e0',
                                  boxShadow: selected ? '0 0 0 2px rgba(0,0,0,0.08)' : 'none',
                                }}
                              >
                                {selected && <i className="ti ti-check text-white fs-14" />}
                              </span>
                            </button>
                            <small
                              className="d-block mt-1 text-muted text-capitalize"
                              style={{ fontSize: '11px' }}
                            >
                              {c.key}
                            </small>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-light me-2" data-bs-dismiss="modal">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingBoard}>
                  {savingBoard ? 'Saving...' : 'Update Board'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Edit Board */}

      {/* Status Change Confirmation Modal */}
      {showStatusModal && (
        <div
          className="modal fade show"
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">Confirm Status Change</h4>
                <button
                  type="button"
                  className="btn-close custom-btn-close"
                  onClick={handleCancelStatusChange}
                  aria-label="Close"
                >
                  <i className="ti ti-x" />
                </button>
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to change the status of{' '}
                  <strong>{pendingStatusChange?.taskTitle}</strong> to{' '}
                  <strong>{pendingStatusChange?.newStatus}</strong>?
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-light me-2"
                  onClick={handleCancelStatusChange}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleConfirmStatusChange}
                >
                  Confirm Change
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* /Status Change Confirmation Modal */}

      {/* Delete Board Modal */}
      <div className="modal fade" id="delete_board_modal">
        <div className="modal-dialog modal-dialog-centered modal-sm">
          <div className="modal-content">
            <div className="modal-body">
              <div className="text-center p-3">
                <span className="avatar avatar-lg avatar-rounded bg-danger mb-3">
                  <i className="ti ti-trash fs-24" />
                </span>
                <h5 className="mb-2">Delete Board</h5>
                <p className="mb-3">
                  Are you sure you want to delete this board? This action cannot be undone.
                </p>
                {deletingBoard && (
                  <>
                    <div className="bg-light p-3 rounded mb-3">
                      <h6 className="mb-0">{deletingBoard.name}</h6>
                    </div>
                    <div className="text-start mb-3">
                      <p className="text-danger fw-medium mb-2" style={{ fontSize: '13px' }}>
                        This action is permanent. All data associated with this board will be
                        removed.
                      </p>
                      <label className="form-label text-muted" style={{ fontSize: '13px' }}>
                        Type <strong>{deletingBoard.name}</strong> to confirm deletion:
                      </label>
                      <input
                        type="text"
                        className={`form-control form-control-sm ${
                          confirmBoardName &&
                          confirmBoardName.trim().toLowerCase() !==
                            deletingBoard.name.trim().toLowerCase()
                            ? 'is-invalid'
                            : ''
                        } ${
                          confirmBoardName.trim().toLowerCase() ===
                          deletingBoard.name.trim().toLowerCase()
                            ? 'is-valid'
                            : ''
                        }`}
                        placeholder={`Type "${deletingBoard.name}" to confirm`}
                        value={confirmBoardName}
                        onChange={(e) => setConfirmBoardName(e.target.value)}
                        autoComplete="off"
                      />
                      {confirmBoardName &&
                        confirmBoardName.trim().toLowerCase() !==
                          deletingBoard.name.trim().toLowerCase() && (
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
                    disabled={isDeletingBoard}
                    onClick={() => {
                      setDeletingBoard(null);
                      setConfirmBoardName('');
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteBoard}
                    className="btn btn-danger"
                    disabled={
                      isDeletingBoard ||
                      !deletingBoard ||
                      confirmBoardName.trim().toLowerCase() !==
                        deletingBoard.name.trim().toLowerCase()
                    }
                  >
                    {isDeletingBoard ? 'Deleting...' : 'Delete Board'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* /Delete Board Modal */}

      {/* Delete Task Modal */}
      <div className="modal fade" id="delete_task_modal">
        <div className="modal-dialog modal-dialog-centered modal-sm">
          <div className="modal-content">
            <div className="modal-body">
              <div className="text-center p-3">
                <span className="avatar avatar-lg avatar-rounded bg-danger mb-3">
                  <i className="ti ti-trash fs-24" />
                </span>
                <h5 className="mb-2">Delete Task</h5>
                <p className="mb-3">
                  Are you sure you want to delete this task? This action cannot be undone.
                </p>
                {deletingTask && (
                  <>
                    <div className="bg-light p-3 rounded mb-3">
                      <h6 className="mb-0">{deletingTask.title}</h6>
                      {deletingTask.description && (
                        <p className="mb-0 text-muted" style={{ fontSize: '13px' }}>
                          {deletingTask.description.length > 50
                            ? deletingTask.description.substring(0, 50) + '...'
                            : deletingTask.description}
                        </p>
                      )}
                    </div>
                    <div className="text-start mb-3">
                      <p className="text-danger fw-medium mb-2" style={{ fontSize: '13px' }}>
                        This action is permanent. All data associated with this task will be
                        removed.
                      </p>
                      <label className="form-label text-muted" style={{ fontSize: '13px' }}>
                        Type <strong>{deletingTask.title}</strong> to confirm deletion:
                      </label>
                      <input
                        type="text"
                        className={`form-control form-control-sm ${
                          confirmTaskName &&
                          confirmTaskName.trim().toLowerCase() !==
                            deletingTask.title.trim().toLowerCase()
                            ? 'is-invalid'
                            : ''
                        } ${
                          confirmTaskName.trim().toLowerCase() ===
                          deletingTask.title.trim().toLowerCase()
                            ? 'is-valid'
                            : ''
                        }`}
                        placeholder={`Type "${deletingTask.title}" to confirm`}
                        value={confirmTaskName}
                        onChange={(e) => setConfirmTaskName(e.target.value)}
                        autoComplete="off"
                      />
                      {confirmTaskName &&
                        confirmTaskName.trim().toLowerCase() !==
                          deletingTask.title.trim().toLowerCase() && (
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
                    disabled={isDeletingTask}
                    onClick={() => {
                      setDeletingTask(null);
                      setConfirmTaskName('');
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteTask}
                    className="btn btn-danger"
                    disabled={
                      isDeletingTask ||
                      !deletingTask ||
                      confirmTaskName.trim().toLowerCase() !==
                        deletingTask.title.trim().toLowerCase()
                    }
                  >
                    {isDeletingTask ? 'Deleting...' : 'Delete Task'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* /Delete Task Modal */}

      {/* Delete Error Modal */}
      {showDeleteError && (
        <div
          className="modal fade show"
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowDeleteError(false)}
        >
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-body">
                <div className="text-center p-3">
                  <span className="avatar avatar-lg avatar-rounded bg-danger mb-3">
                    <i className="ti ti-alert-circle fs-24" />
                  </span>
                  <h5 className="mb-2">Cannot Delete Board</h5>
                  <div className="bg-light p-3 rounded mb-3">
                    <h6 className="mb-0">{deleteErrorBoardName}</h6>
                  </div>
                  <div className="alert alert-danger text-start mb-3" role="alert">
                    <p className="mb-0">{deleteErrorMessage}</p>
                  </div>
                  <div className="text-muted mb-3" style={{ fontSize: '13px' }}>
                    <strong>{deleteErrorTaskCount}</strong> task
                    {deleteErrorTaskCount === 1 ? '' : 's'}{' '}
                    {deleteErrorTaskCount === 1 ? 'is' : 'are'} currently using this status. Please
                    reassign {deleteErrorTaskCount === 1 ? 'it' : 'them'} before deleting the board.
                  </div>
                  <div className="d-flex gap-2 justify-content-center">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setShowDeleteError(false)}
                    >
                      OK, Got It
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* /Delete Error Modal */}
    </>
  );
};

export default TaskBoard;
