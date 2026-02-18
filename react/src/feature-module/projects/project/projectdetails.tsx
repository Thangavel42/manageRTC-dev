import { useUser } from '@clerk/clerk-react';
import { DatePicker, message } from 'antd';
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
import {
  del as apiDel,
  get as apiGet,
  post as apiPost,
  put as apiPut,
} from '../../../services/api';
import { all_routes } from '../../router/all_routes';

const ProjectDetails = () => {
  const { projectId } = useParams();
  const { user: clerkUser } = useUser();

  // Initialize user profile hook
  const { profile, isAdmin, isHR, isEmployee } = useUserProfileREST();

  // Log user metadata for verification
  useEffect(() => {
    if (clerkUser) {
      const metadata = clerkUser.publicMetadata as any;
      const companyId = metadata?.companyId || metadata?.company;
      const employeeId = metadata?.employeeId;

      console.log('[ProjectDetails] ✅ User Metadata Verification:', {
        userId: clerkUser.id,
        role: metadata?.role,
        companyId: companyId || '❌ MISSING',
        employeeId: employeeId || '❌ MISSING - Add this to Clerk publicMetadata',
        rawMetadata: metadata,
      });

      if (!employeeId) {
        console.warn('[ProjectDetails] ⚠️ employeeId not found in Clerk user metadata!');
        console.warn('[ProjectDetails] 💡 Add it via Clerk Dashboard or API:');
        console.warn(`   publicMetadata.employeeId = "<employee_id_from_database>"`);
      }
    }
  }, [clerkUser]);

  const {
    tasks: tasksFromHook,
    loading: tasksLoading,
    createTask: createTaskAPI,
    updateTask: updateTaskAPI,
    deleteTask: deleteTaskAPI,
    getTasksByProject: getTasksByProjectAPI,
    getEmployeeProjectTasks: getEmployeeProjectTasksAPI,
  } = useTasksREST();

  const { getProjectById: getProjectByIdAPI, updateProject: updateProjectAPI } = useProjectsREST();

  const { statuses: statusesFromHook, fetchTaskStatuses: fetchTaskStatusesAPI } =
    useTaskStatusREST();

  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [subContracts, setSubContracts] = useState<any[]>([]);
  const [availableSubContracts, setAvailableSubContracts] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employeeOptions, setEmployeeOptions] = useState<any[]>([]);
  const [clients, setClients] = useState<Array<{ value: string; label: string }>>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isSavingMembers, setIsSavingMembers] = useState(false);
  const [memberModalError, setMemberModalError] = useState<string | null>(null);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [isSavingLeads, setIsSavingLeads] = useState(false);
  const [leadModalError, setLeadModalError] = useState<string | null>(null);
  const [selectedManagers, setSelectedManagers] = useState<string[]>([]);
  const [isSavingManagers, setIsSavingManagers] = useState(false);
  const [managerModalError, setManagerModalError] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteModalError, setNoteModalError] = useState<string | null>(null);
  const [noteFieldErrors, setNoteFieldErrors] = useState<Record<string, string>>({});
  const [editingNote, setEditingNote] = useState<any>(null);
  const [editNoteTitle, setEditNoteTitle] = useState('');
  const [editNoteContent, setEditNoteContent] = useState('');
  const [isSavingEditNote, setIsSavingEditNote] = useState(false);
  const [editNoteModalError, setEditNoteModalError] = useState<string | null>(null);
  const [editNoteFieldErrors, setEditNoteFieldErrors] = useState<Record<string, string>>({});
  const [deletingNote, setDeletingNote] = useState<any>(null);
  const [isDeletingNote, setIsDeletingNote] = useState(false);
  const [confirmNoteTitle, setConfirmNoteTitle] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [taskStatus, setTaskStatus] = useState(''); // Will be set to "To Do" status key
  const [taskDueDate, setTaskDueDate] = useState<Dayjs | null>(null);
  const [taskTags, setTaskTags] = useState<string[]>([]);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [taskModalError, setTaskModalError] = useState<string | null>(null);
  const [taskFieldErrors, setTaskFieldErrors] = useState<Record<string, string>>({});
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
  const [deletingTask, setDeletingTask] = useState<any>(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [confirmTaskTitle, setConfirmTaskTitle] = useState('');
  const [viewingTask, setViewingTask] = useState<any>(null);
  const [taskStatuses, setTaskStatuses] = useState<any[]>([]);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [editModalError, setEditModalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [editName, setEditName] = useState('');
  const [editClient, setEditClient] = useState('');
  const [editStartDate, setEditStartDate] = useState<Dayjs | null>(null);
  const [editEndDate, setEditEndDate] = useState<Dayjs | null>(null);
  const [editPriority, setEditPriority] = useState('Medium');
  const [editValue, setEditValue] = useState('');
  const [editPriceType, setEditPriceType] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState('Active');
  const [editTeamMembers, setEditTeamMembers] = useState<string[]>([]);
  const [editTeamLeaders, setEditTeamLeaders] = useState<string[]>([]);
  const [editProjectManagers, setEditProjectManagers] = useState<string[]>([]);
  const [editTags, setEditTags] = useState<string[]>([]);

  // Sub-Contract state
  const [subContractName, setSubContractName] = useState('');
  const [subContractDate, setSubContractDate] = useState<Dayjs | null>(null);
  const [subContractMembers, setSubContractMembers] = useState('');
  const [subContractAmount, setSubContractAmount] = useState('');
  const [subContractDescription, setSubContractDescription] = useState('');
  const [isSavingSubContract, setIsSavingSubContract] = useState(false);
  const [subContractModalError, setSubContractModalError] = useState<string | null>(null);
  const [subContractFieldErrors, setSubContractFieldErrors] = useState<Record<string, string>>({});
  const [editingSubContract, setEditingSubContract] = useState<any>(null);
  const [editSubContractName, setEditSubContractName] = useState('');
  const [editSubContractDate, setEditSubContractDate] = useState<Dayjs | null>(null);
  const [editSubContractMembers, setEditSubContractMembers] = useState('');
  const [editSubContractAmount, setEditSubContractAmount] = useState('');
  const [editSubContractDescription, setEditSubContractDescription] = useState('');
  const [isSavingEditSubContract, setIsSavingEditSubContract] = useState(false);
  const [editSubContractModalError, setEditSubContractModalError] = useState<string | null>(null);
  const [editSubContractFieldErrors, setEditSubContractFieldErrors] = useState<
    Record<string, string>
  >({});
  const [deletingSubContract, setDeletingSubContract] = useState<any>(null);
  const [isDeletingSubContract, setIsDeletingSubContract] = useState(false);
  const [confirmSubContractName, setConfirmSubContractName] = useState('');

  // Helper function to match status with various formats
  const findMatchingStatus = useCallback((taskStatus: string, statuses: any[]) => {
    if (!taskStatus || !statuses || statuses.length === 0) {
      return ''; // default fallback
    }

    const normalizedTaskStatus = taskStatus.toLowerCase().replace(/\s+/g, '');

    // Try exact key match first (case-insensitive)
    const exactMatch = statuses.find((s) => s.key.toLowerCase() === normalizedTaskStatus);
    if (exactMatch) return exactMatch.key;

    // Try name match (case-insensitive, no spaces)
    const nameMatch = statuses.find(
      (s) => s.name.toLowerCase().replace(/\s+/g, '') === normalizedTaskStatus
    );
    if (nameMatch) return nameMatch.key;

    // Try partial match for common variations
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

    // Default fallback
    return '';
  }, []);

  const memberSelectOptions = useMemo(
    () =>
      (employeeOptions || []).map((emp) => ({
        value: emp.value,
        label: emp.employeeId
          ? `${emp.employeeId} - ${emp.label || emp.name || 'Unknown'}`
          : emp.label || emp.name || 'Unknown',
      })),
    [employeeOptions]
  );

  const loadProject = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      const projectData = await getProjectByIdAPI(projectId);
      console.log('[ProjectDetails] Loaded project data:', projectData);
      console.log('[ProjectDetails] Team Members:', projectData?.teamMembers);
      console.log('[ProjectDetails] Team Leader:', projectData?.teamLeader);
      console.log('[ProjectDetails] Project Manager:', projectData?.projectManager);

      if (projectData) {
        // Map dueDate to endDate for frontend consistency
        const mappedProject = {
          ...projectData,
          endDate: projectData.dueDate || projectData.endDate,
        };
        setProject(mappedProject);
      } else {
        setError('Failed to load project details');
      }
    } catch (error) {
      console.error('[ProjectDetails] Error loading project:', error);
      setError('Failed to load project details');
    } finally {
      setLoading(false);
    }
  }, [projectId, getProjectByIdAPI]);

  const loadProjectTasks = useCallback(async () => {
    console.log('[ProjectDetails] loadProjectTasks called with projectId:', project?._id);
    if (!project?._id) return;
    try {
      // If employee role, use dedicated employee project tasks API
      if (isEmployee && profile && '_id' in profile && profile._id) {
        console.log('[ProjectDetails] Loading tasks for employee from dedicated API:', {
          _id: profile._id,
          employeeId: profile.employeeId,
          name: `${profile.firstName} ${profile.lastName}`,
          projectId: project._id,
        });
        await getEmployeeProjectTasksAPI(project._id);
      } else {
        // Admin/HR: load all project tasks
        await getTasksByProjectAPI(project._id);
      }
      // Tasks will be available via tasksFromHook, sync via useEffect
    } catch (error) {
      console.error('[ProjectDetails] Error loading tasks:', error);
      message.error('Failed to load tasks');
    }
  }, [project?._id, getTasksByProjectAPI, getEmployeeProjectTasksAPI, isEmployee, profile]);

  // Sync tasks from hook to local state
  useEffect(() => {
    if (tasksFromHook && Array.isArray(tasksFromHook)) {
      setTasks(tasksFromHook);
    }
  }, [tasksFromHook]);

  // Sync task statuses from hook
  useEffect(() => {
    if (statusesFromHook && Array.isArray(statusesFromHook)) {
      console.log('[ProjectDetails] Task statuses loaded:', statusesFromHook);
      setTaskStatuses(statusesFromHook);

      // Set default task status to "To Do" for add task modal
      if (!taskStatus && statusesFromHook.length > 0) {
        const todoStatus = statusesFromHook.find(
          (s) => s.key.toLowerCase() === 'todo' || s.name.toLowerCase() === 'to do'
        );
        const defaultStatus = todoStatus || statusesFromHook[0];
        console.log('[ProjectDetails] Setting default task status:', defaultStatus.key);
        setTaskStatus(defaultStatus.key);
      }
    }
  }, [statusesFromHook, taskStatus]);

  const loadProjectNotes = useCallback(async () => {
    if (!project?._id) return;
    try {
      const response = await apiGet(`/project-notes/${project._id}`);
      if (response.success && response.data) {
        setNotes(response.data || []);
      }
    } catch (err) {
      console.error('[ProjectDetails] Failed to load notes via REST:', err);
    }
  }, [project?._id]);

  const loadProjectInvoices = useCallback(async () => {
    if (!project?._id) return;
    try {
      const response = await apiGet('/invoices', { params: { projectId: project._id } });
      if (response.success && response.data) {
        setInvoices(response.data || []);
      }
    } catch (err) {
      console.error('[ProjectDetails] Failed to load invoices via REST:', err);
    }
  }, [project?._id]);

  const loadProjectSubContracts = useCallback(async () => {
    if (!project?._id) return;
    try {
      const response = await apiGet(`/projects/${project._id}/subcontracts`);
      if (response.success && response.data) {
        console.log('[ProjectDetails] Loaded sub-contracts:', response.data);
        setSubContracts(response.data || []);
      }
    } catch (err) {
      console.error('[ProjectDetails] Failed to load sub-contracts via REST:', err);
    }
  }, [project?._id]);

  const loadAvailableSubContracts = useCallback(async () => {
    try {
      const response = await apiGet('/subcontracts');
      if (response.success && response.data) {
        console.log('[ProjectDetails] Loaded available sub-contracts:', response.data);
        setAvailableSubContracts(response.data || []);
      }
    } catch (err) {
      console.error('[ProjectDetails] Failed to load available sub-contracts:', err);
    }
  }, []);

  const loadTaskStatuses = useCallback(async () => {
    try {
      await fetchTaskStatusesAPI();
    } catch (error) {
      console.error('[ProjectDetails] Error loading task statuses:', error);
    }
  }, [fetchTaskStatusesAPI]);

  const parseDateValue = useCallback((value: any): Dayjs | null => {
    if (!value) return null;
    const primary = dayjs(value);
    if (primary.isValid()) return primary;
    const fallbackDash = dayjs(value, 'DD-MM-YYYY', true);
    if (fallbackDash.isValid()) return fallbackDash;
    const fallbackSlash = dayjs(value, 'DD/MM/YYYY', true);
    return fallbackSlash.isValid() ? fallbackSlash : null;
  }, []);

  // Load tasks after project data is set
  useEffect(() => {
    if (project?._id) {
      loadProjectTasks();
    }
  }, [project?._id, loadProjectTasks]);

  // Load notes after project data is set
  useEffect(() => {
    if (project?._id) {
      loadProjectNotes();
    }
  }, [project?._id, loadProjectNotes]);

  // Load invoices after project data is set
  useEffect(() => {
    if (project?._id) {
      loadProjectInvoices();
    }
  }, [project?._id, loadProjectInvoices]);

  // Load available sub-contracts on mount
  useEffect(() => {
    loadAvailableSubContracts();
  }, [loadAvailableSubContracts]);

  // Load sub-contracts after project data is set
  useEffect(() => {
    if (project?._id) {
      loadProjectSubContracts();
    }
  }, [project?._id, loadProjectSubContracts]);

  const loadEmployeesAndClients = useCallback(async () => {
    try {
      // Load employees via REST API (limit max is 100 per API validation)
      console.log('[ProjectDetails] Loading employees...');
      const empResponse = await apiGet('/employees', { params: { limit: 100 } });
      console.log('[ProjectDetails] Employee response:', empResponse);

      if (empResponse.success && empResponse.data) {
        const dataArray = Array.isArray(empResponse.data)
          ? empResponse.data
          : empResponse.data.employees || [];
        const employees = dataArray.map((emp: any) => ({
          value: emp._id,
          label:
            `${(emp.firstName || '').trim()} ${(emp.lastName || '').trim()}`.trim() || 'Unknown',
          name:
            `${(emp.firstName || '').trim()} ${(emp.lastName || '').trim()}`.trim() || 'Unknown',
          employeeId: emp.employeeId || emp.employeeCode || '',
        }));
        console.log('[ProjectDetails] Loaded employees:', employees.length);
        setEmployeeOptions(employees);
      } else {
        console.warn('[ProjectDetails] No employee data in response:', empResponse);
      }
    } catch (err) {
      console.error('[ProjectDetails] Failed to load employees via REST:', err);
    }

    try {
      // Load clients via REST API (limit max is 100 per API validation)
      console.log('[ProjectDetails] Loading clients...');
      const clientResponse = await apiGet('/clients', { params: { limit: 100 } });
      console.log('[ProjectDetails] Client response:', clientResponse);

      if (clientResponse.success && clientResponse.data) {
        const clientList = Array.isArray(clientResponse.data)
          ? clientResponse.data
          : clientResponse.data.clients || [];
        const transformedClients = clientList.map((client: any) => ({
          value:
            typeof client === 'string' ? client : client.name || client.companyName || client._id,
          label:
            typeof client === 'string' ? client : client.name || client.companyName || 'Unknown',
        }));
        console.log('[ProjectDetails] Loaded clients:', transformedClients.length);
        setClients(transformedClients);
      } else {
        console.warn('[ProjectDetails] No client data in response:', clientResponse);
      }
    } catch (err) {
      console.error('[ProjectDetails] Failed to load clients via REST:', err);
    }
  }, []);

  const closeModalById = useCallback((modalId: string) => {
    const modalElement = document.getElementById(modalId);
    if (!modalElement) return;

    const modalInstance =
      (window as any)?.bootstrap?.Modal?.getInstance?.(modalElement) ||
      (window as any)?.bootstrap?.Modal?.getOrCreateInstance?.(modalElement);
    if (modalInstance?.hide) {
      modalInstance.hide();
    }

    if (modalElement.classList.contains('show')) {
      modalElement.classList.remove('show');
      modalElement.setAttribute('aria-hidden', 'true');
      modalElement.style.display = 'none';
    }

    // Use timeout to ensure Bootstrap has finished its animations
    setTimeout(() => {
      document.querySelectorAll('.modal-backdrop').forEach((node) => {
        if (node && node.parentNode) {
          node.parentNode.removeChild(node);
        }
      });
      document.body.classList.remove('modal-open');
      document.body.style.removeProperty('padding-right');
      document.body.style.removeProperty('overflow');
    }, 300);
  }, []);

  // Clear field error when user starts typing
  const clearFieldError = (fieldName: string) => {
    setFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  const clearTaskFieldError = (fieldName: string) => {
    setTaskFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  const clearEditTaskFieldError = (fieldName: string) => {
    setEditTaskFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  const clearNoteFieldError = (fieldName: string) => {
    setNoteFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  const clearEditNoteFieldError = (fieldName: string) => {
    setEditNoteFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  // Validate task field
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
      case 'taskStatus':
        if (!value || value === 'Select') return 'Please select a status';
        break;
      case 'taskAssignees':
        if (!Array.isArray(value) || value.length === 0)
          return 'Please select at least one assignee';
        break;
      case 'taskDueDate':
        if (!value) return 'Due date is required';
        if (project?.endDate && dayjs(value).isAfter(dayjs(project.endDate))) {
          return `Due date cannot exceed project end date (${dayjs(project.endDate).format('DD-MM-YYYY')})`;
        }
        break;
    }
    return '';
  };

  const handleTaskFieldBlur = useCallback((fieldName: string, value: any) => {
    const error = validateTaskField(fieldName, value);
    if (error) {
      setTaskFieldErrors((prev) => ({ ...prev, [fieldName]: error }));
    }
  }, []);

  // Validate task form before submission
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

    // If there are errors, scroll to first error field
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
  }, [taskTitle, taskDescription, taskPriority, taskDueDate, selectedAssignees]);

  // Validate edit task form before submission
  const validateEditTaskForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    const titleError = validateTaskField('taskTitle', editTaskTitle.trim());
    if (titleError) errors.taskTitle = titleError;

    const descriptionError = validateTaskField('taskDescription', editTaskDescription.trim());
    if (descriptionError) errors.taskDescription = descriptionError;

    const priorityError = validateTaskField('taskPriority', editTaskPriority);
    if (priorityError) errors.taskPriority = priorityError;

    const statusError = validateTaskField('taskStatus', editTaskStatus);
    if (statusError) errors.taskStatus = statusError;

    const assigneeError = validateTaskField('taskAssignees', editTaskAssignees);
    if (assigneeError) errors.taskAssignees = assigneeError;

    const dueDateError = validateTaskField('taskDueDate', editTaskDueDate);
    if (dueDateError) errors.taskDueDate = dueDateError;

    setEditTaskFieldErrors(errors);

    // If there are errors, scroll to first error field
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
    editTaskTags,
    editTaskAssignees,
  ]);

  // Validate note form before submission
  const validateNoteField = (fieldName: string, value: any): string => {
    switch (fieldName) {
      case 'noteTitle':
        if (!value || !value.trim()) return 'Note title is required';
        if (value.trim().length < 3) return 'Note title must be at least 3 characters';
        break;
      case 'noteContent':
        if (!value || !value.trim()) return 'Note content is required';
        if (value.trim().length < 10) return 'Note content must be at least 10 characters';
        break;
      case 'editNoteTitle':
        if (!value || !value.trim()) return 'Title is required';
        if (value.trim().length < 3) return 'Title must be at least 3 characters';
        break;
      case 'editNoteContent':
        if (!value || !value.trim()) return 'Content is required';
        if (value.trim().length < 10) return 'Content must be at least 10 characters';
        break;
    }
    return '';
  };

  const handleNoteFieldBlur = useCallback((fieldName: string, value: any) => {
    const error = validateNoteField(fieldName, value);
    if (error) {
      setNoteFieldErrors((prev) => ({ ...prev, [fieldName]: error }));
    }
  }, []);

  const handleEditNoteFieldBlur = useCallback((fieldName: string, value: any) => {
    const error = validateNoteField(fieldName, value);
    if (error) {
      setEditNoteFieldErrors((prev) => ({ ...prev, [fieldName]: error }));
    }
  }, []);

  const validateNoteForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    const titleError = validateNoteField('noteTitle', noteTitle);
    if (titleError) errors.noteTitle = titleError;

    const contentError = validateNoteField('noteContent', noteContent);
    if (contentError) errors.noteContent = contentError;

    setNoteFieldErrors(errors);

    // If there are errors, scroll to first error field
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
  }, [noteTitle, noteContent]);

  // Validate edit note form before submission
  const validateEditNoteForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    const titleError = validateNoteField('editNoteTitle', editNoteTitle);
    if (titleError) errors.editNoteTitle = titleError;

    const contentError = validateNoteField('editNoteContent', editNoteContent);
    if (contentError) errors.editNoteContent = contentError;

    setEditNoteFieldErrors(errors);

    // If there are errors, scroll to first error field
    if (Object.keys(errors).length > 0) {
      setTimeout(() => {
        const firstErrorField = Object.keys(errors)[0];
        const errorElement = document.querySelector(`[name="${firstErrorField}"]`);
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          (errorElement as HTMLElement).focus?.();
        }
      }, 100);

      return false;
    }

    return true;
  }, [editNoteTitle, editNoteContent]);

  const handleProjectUpdateResponse = useCallback(
    (response: any) => {
      const wasProjectUpdate = isSavingProject;
      const wasMemberUpdate = isSavingMembers;
      const wasLeadUpdate = isSavingLeads;
      const wasManagerUpdate = isSavingManagers;

      console.log('[ProjectDetails] Received update response:', {
        done: response.done,
        tagsInResponse: response.data?.tags,
        tagsLength: response.data?.tags?.length,
      });

      setIsSavingMembers(false);
      setIsSavingLeads(false);
      setIsSavingManagers(false);
      setIsSavingProject(false);

      if (response.done && response.data) {
        // Success case
        console.log('[ProjectDetails] Tags after update:', response.data.tags);
        setProject(response.data);
        setError(null);
        setMemberModalError(null);
        setLeadModalError(null);
        setManagerModalError(null);
        setEditModalError(null);
        setFieldErrors({});

        // Close appropriate modals
        if (wasProjectUpdate) {
          setTimeout(() => {
            closeModalById('edit_project');
            // Additional cleanup to ensure no backdrops remain
            setTimeout(() => {
              document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
                backdrop.remove();
              });
              document.body.classList.remove('modal-open');
              document.body.style.removeProperty('overflow');
              document.body.style.removeProperty('padding-right');
            }, 100);
          }, 100);
          // Show success message
          console.log('[ProjectDetails] Project updated successfully');
        }

        // Reload project data to ensure consistency
        setTimeout(() => {
          loadProject();
        }, 200);
      } else {
        // Error case
        const message = response?.error || 'Failed to update project details';
        console.error('[ProjectDetails] Update error:', message);

        if (wasProjectUpdate) {
          setEditModalError(message);
        }
        if (wasMemberUpdate) {
          setMemberModalError(message);
        }
        if (wasLeadUpdate) {
          setLeadModalError(message);
        }
        if (wasManagerUpdate) {
          setManagerModalError(message);
        }
      }
    },
    [loadProject, isSavingProject, isSavingMembers, isSavingLeads, isSavingManagers, closeModalById]
  );

  const handleSaveTeamMembers = useCallback(async () => {
    if (!project?._id) return;

    setIsSavingMembers(true);
    setMemberModalError(null);

    try {
      const success = await updateProjectAPI(project._id, { teamMembers: selectedMembers });
      if (success) {
        await loadProject();
        closeModalById('add_team_members_modal');
        // Extra cleanup to ensure backdrop is removed
        setTimeout(() => {
          document.querySelectorAll('.modal-backdrop').forEach((node) => {
            if (node && node.parentNode) {
              node.parentNode.removeChild(node);
            }
          });
          document.body.classList.remove('modal-open');
          document.body.style.removeProperty('padding-right');
          document.body.style.removeProperty('overflow');
        }, 400);
      } else {
        setMemberModalError('Failed to update team members');
      }
    } catch (error) {
      console.error('[ProjectDetails] Error updating team members:', error);
      setMemberModalError('An error occurred while updating team members');
      // Ensure backdrop is removed even on error
      setTimeout(() => {
        document.querySelectorAll('.modal-backdrop').forEach((node) => {
          if (node && node.parentNode) {
            node.parentNode.removeChild(node);
          }
        });
        document.body.classList.remove('modal-open');
        document.body.style.removeProperty('padding-right');
      }, 100);
    } finally {
      setIsSavingMembers(false);
    }
  }, [project?._id, selectedMembers, updateProjectAPI, loadProject, closeModalById]);

  const handleSaveTeamLeads = useCallback(async () => {
    if (!project?._id) return;

    setIsSavingLeads(true);
    setLeadModalError(null);

    try {
      const success = await updateProjectAPI(project._id, { teamLeader: selectedLeads });
      if (success) {
        await loadProject();
        closeModalById('add_team_leads_modal');
        // Extra cleanup to ensure backdrop is removed
        setTimeout(() => {
          document.querySelectorAll('.modal-backdrop').forEach((node) => {
            if (node && node.parentNode) {
              node.parentNode.removeChild(node);
            }
          });
          document.body.classList.remove('modal-open');
          document.body.style.removeProperty('padding-right');
          document.body.style.removeProperty('overflow');
        }, 400);
      } else {
        setLeadModalError('Failed to update team leads');
      }
    } catch (error) {
      console.error('[ProjectDetails] Error updating team leads:', error);
      setLeadModalError('An error occurred while updating team leads');
      // Ensure backdrop is removed even on error
      setTimeout(() => {
        document.querySelectorAll('.modal-backdrop').forEach((node) => {
          if (node && node.parentNode) {
            node.parentNode.removeChild(node);
          }
        });
        document.body.classList.remove('modal-open');
        document.body.style.removeProperty('padding-right');
      }, 100);
    } finally {
      setIsSavingLeads(false);
    }
  }, [project?._id, selectedLeads, updateProjectAPI, loadProject, closeModalById]);

  const handleSaveProjectManagers = useCallback(async () => {
    if (!project?._id) return;

    setIsSavingManagers(true);
    setManagerModalError(null);

    try {
      const success = await updateProjectAPI(project._id, { projectManager: selectedManagers });
      if (success) {
        await loadProject();
        closeModalById('add_project_managers_modal');
        // Extra cleanup to ensure backdrop is removed
        setTimeout(() => {
          document.querySelectorAll('.modal-backdrop').forEach((node) => {
            if (node && node.parentNode) {
              node.parentNode.removeChild(node);
            }
          });
          document.body.classList.remove('modal-open');
          document.body.style.removeProperty('padding-right');
          document.body.style.removeProperty('overflow');
        }, 400);
      } else {
        setManagerModalError('Failed to update project managers');
      }
    } catch (error) {
      console.error('[ProjectDetails] Error updating project managers:', error);
      setManagerModalError('An error occurred while updating project managers');
      // Ensure backdrop is removed even on error
      setTimeout(() => {
        document.querySelectorAll('.modal-backdrop').forEach((node) => {
          if (node && node.parentNode) {
            node.parentNode.removeChild(node);
          }
        });
        document.body.classList.remove('modal-open');
        document.body.style.removeProperty('padding-right');
      }, 100);
    } finally {
      setIsSavingManagers(false);
    }
  }, [project?._id, selectedManagers, updateProjectAPI, loadProject, closeModalById]);

  // Reset modal handlers - restore current project data when modals are closed
  const resetTeamMembersModal = useCallback(() => {
    if (Array.isArray(project?.teamMembers)) {
      const memberIds = project.teamMembers.map((m: any) =>
        typeof m === 'string' ? m : m._id || m
      );
      setSelectedMembers(memberIds);
    } else {
      setSelectedMembers([]);
    }
    setMemberModalError(null);
  }, [project?.teamMembers]);

  const resetTeamLeadsModal = useCallback(() => {
    if (Array.isArray(project?.teamLeader)) {
      const leadIds = project.teamLeader.map((m: any) => (typeof m === 'string' ? m : m._id || m));
      setSelectedLeads(leadIds);
    } else {
      setSelectedLeads([]);
    }
    setLeadModalError(null);
  }, [project?.teamLeader]);

  const resetProjectManagersModal = useCallback(() => {
    if (Array.isArray(project?.projectManager)) {
      const managerIds = project.projectManager.map((m: any) =>
        typeof m === 'string' ? m : m._id || m
      );
      setSelectedManagers(managerIds);
    } else {
      setSelectedManagers([]);
    }
    setManagerModalError(null);
  }, [project?.projectManager]);

  // Validate a single field and return error message
  const validateField = (fieldName: string, value: any): string => {
    switch (fieldName) {
      case 'name':
        if (!value || !value.trim()) return 'Project name is required';
        break;
      case 'client':
        if (!value || !value.trim()) return 'Client is required';
        break;
      case 'description':
        if (!value || !value.trim()) return 'Description is required';
        break;
      case 'projectValue':
        if (!value || !value.toString().trim()) return 'Project value is required';
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < 0) return 'Project value must be a positive number';
        break;
      case 'startDate':
        if (!value) return 'Start date is required';
        break;
      case 'endDate':
        if (!value) return 'End date is required';
        break;
      case 'priority':
        if (!value || value === 'Select') return 'Please select a priority level';
        break;
    }
    return '';
  };

  // Validate form before submission
  const validateProjectForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    // Validate all required fields
    const nameError = validateField('name', editName.trim());
    if (nameError) errors.name = nameError;

    const clientError = validateField('client', editClient.trim());
    if (clientError) errors.client = clientError;

    const descriptionError = validateField('description', editDescription.trim());
    if (descriptionError) errors.description = descriptionError;

    const valueError = validateField('projectValue', editValue.trim());
    if (valueError) errors.projectValue = valueError;

    const startDateError = validateField('startDate', editStartDate);
    if (startDateError) errors.startDate = startDateError;

    const endDateError = validateField('endDate', editEndDate);
    if (endDateError) errors.endDate = endDateError;

    const priorityError = validateField('priority', editPriority);
    if (priorityError) errors.priority = priorityError;

    // Date comparison validation
    if (editStartDate && editEndDate && editEndDate.isBefore(editStartDate)) {
      errors.endDate = 'End date must be after start date';
    }

    setFieldErrors(errors);

    // If there are errors, scroll to first error field
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
  }, [editName, editClient, editDescription, editValue, editStartDate, editEndDate, editPriority]);

  const closeAddNotekModal = useCallback(() => {
    const modalElement = document.getElementById('add_note_modal');
    if (!modalElement) return;

    const modalInstance =
      (window as any)?.bootstrap?.Modal?.getInstance?.(modalElement) ||
      (window as any)?.bootstrap?.Modal?.getOrCreateInstance?.(modalElement);
    if (modalInstance?.hide) {
      modalInstance.hide();
    }

    // Hard fallback in case bootstrap instance is not present or hide did not remove classes/backdrop
    if (modalElement.classList.contains('show')) {
      modalElement.classList.remove('show');
      modalElement.setAttribute('aria-hidden', 'true');
      modalElement.style.display = 'none';
    }
    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop && backdrop.parentNode) {
      backdrop.parentNode.removeChild(backdrop);
    }
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('padding-right');
  }, []);

  const handleSaveNote = useCallback(async () => {
    if (!project?._id) return;

    // Validate form first
    if (!validateNoteForm()) {
      return;
    }

    setIsSavingNote(true);
    setNoteModalError(null);
    setNoteFieldErrors({});

    try {
      const response = await apiPost(`/project-notes/${project._id}`, {
        title: noteTitle.trim(),
        content: noteContent.trim(),
      });

      if (response.success) {
        setNoteTitle('');
        setNoteContent('');
        setNoteModalError(null);
        setNoteFieldErrors({});
        loadProjectNotes();
        closeAddNotekModal();
      } else {
        setNoteModalError(response.error?.message || 'Failed to create note');
      }
    } catch (error: any) {
      console.error('[ProjectDetails] Error creating note:', error);
      setNoteModalError(
        error.response?.data?.error?.message || 'An error occurred while creating note'
      );
    } finally {
      setIsSavingNote(false);
    }
  }, [
    project?._id,
    noteTitle,
    noteContent,
    validateNoteForm,
    loadProjectNotes,
    closeAddNotekModal,
  ]);

  const handleOpenEditNote = useCallback((note: any) => {
    setEditingNote(note);
    setEditNoteTitle(note.title || '');
    setEditNoteContent(note.content || '');
    setEditNoteModalError(null);
    setEditNoteFieldErrors({});

    // Open modal
    setTimeout(() => {
      const modalElement = document.getElementById('edit_note_modal');
      if (modalElement) {
        const modalInstance = (window as any)?.bootstrap?.Modal?.getOrCreateInstance?.(
          modalElement
        );
        modalInstance?.show();
      }
    }, 100);
  }, []);

  const closeEditNoteModal = useCallback(() => {
    const modalElement = document.getElementById('edit_note_modal');
    if (!modalElement) return;

    const modalInstance = (window as any)?.bootstrap?.Modal?.getInstance?.(modalElement);
    if (modalInstance?.hide) {
      modalInstance.hide();
    }

    setEditingNote(null);
    setEditNoteTitle('');
    setEditNoteContent('');
    setEditNoteModalError(null);
    setEditNoteFieldErrors({});
  }, []);

  const handleSaveEditNote = useCallback(async () => {
    if (!editingNote?._id || !project?._id) return;

    // Validate form first
    if (!validateEditNoteForm()) {
      return;
    }

    setIsSavingEditNote(true);
    setEditNoteModalError(null);
    setEditNoteFieldErrors({});

    try {
      const response = await apiPut(`/project-notes/${project._id}/${editingNote._id}`, {
        title: editNoteTitle.trim(),
        content: editNoteContent.trim(),
      });

      if (response.success) {
        setEditingNote(null);
        setEditNoteTitle('');
        setEditNoteContent('');
        setEditNoteModalError(null);
        setEditNoteFieldErrors({});
        loadProjectNotes();
        closeEditNoteModal();
      } else {
        setEditNoteModalError(response.error?.message || 'Failed to update note');
      }
    } catch (error: any) {
      console.error('[ProjectDetails] Error updating note:', error);
      setEditNoteModalError(
        error.response?.data?.error?.message || 'An error occurred while updating note'
      );
    } finally {
      setIsSavingEditNote(false);
    }
  }, [
    editingNote,
    project?._id,
    editNoteTitle,
    editNoteContent,
    validateEditNoteForm,
    loadProjectNotes,
    closeEditNoteModal,
  ]);

  const handleOpenDeleteNote = useCallback((note: any) => {
    setDeletingNote(note);

    // Open modal
    setTimeout(() => {
      const modalElement = document.getElementById('delete_note_modal');
      if (modalElement) {
        const modalInstance = (window as any)?.bootstrap?.Modal?.getOrCreateInstance?.(
          modalElement
        );
        modalInstance?.show();
      }
    }, 100);
  }, []);

  const handleDeleteNote = useCallback(async () => {
    if (!deletingNote?._id || !project?._id) return;

    setIsDeletingNote(true);

    try {
      const response = await apiDel(`/project-notes/${project._id}/${deletingNote._id}`);

      if (response.success) {
        setDeletingNote(null);
        setConfirmNoteTitle('');
        loadProjectNotes();
        closeModalById('delete_note_modal');
      } else {
        message.error(response.error?.message || 'Failed to delete note');
      }
    } catch (error: any) {
      console.error('[ProjectDetails] Error deleting note:', error);
      message.error(
        error.response?.data?.error?.message || 'An error occurred while deleting note'
      );
    } finally {
      setIsDeletingNote(false);
    }
  }, [deletingNote, project?._id, loadProjectNotes, closeModalById]);

  // Sub-Contract Handlers
  const validateSubContractField = (fieldName: string, value: any): string => {
    switch (fieldName) {
      case 'subContractName':
        if (!value || !value.trim()) return 'Contract name is required';
        if (value.trim().length < 3) return 'Contract name must be at least 3 characters';
        break;
      case 'subContractDate':
        if (!value) return 'Contract date is required';
        break;
      case 'subContractMembers':
        if (!value || !value.toString().trim()) return 'Number of members is required';
        const numMembers = parseInt(value, 10);
        if (isNaN(numMembers) || numMembers < 1) return 'Number of members must be at least 1';
        break;
      case 'subContractAmount':
        if (!value || !value.toString().trim()) return 'Total amount is required';
        const numAmount = parseFloat(value);
        if (isNaN(numAmount) || numAmount < 0) return 'Total amount cannot be negative';
        break;
    }
    return '';
  };

  const clearSubContractFieldError = (fieldName: string) => {
    setSubContractFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  const clearEditSubContractFieldError = (fieldName: string) => {
    setEditSubContractFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  const validateSubContractForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    const nameError = validateSubContractField('subContractName', subContractName);
    if (nameError) errors.subContractName = nameError;

    const dateError = validateSubContractField('subContractDate', subContractDate);
    if (dateError) errors.subContractDate = dateError;

    const membersError = validateSubContractField('subContractMembers', subContractMembers);
    if (membersError) errors.subContractMembers = membersError;

    const amountError = validateSubContractField('subContractAmount', subContractAmount);
    if (amountError) errors.subContractAmount = amountError;

    setSubContractFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [subContractName, subContractDate, subContractMembers, subContractAmount]);

  const validateEditSubContractForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    // Contract name is readonly, no need to validate

    const dateError = validateSubContractField('subContractDate', editSubContractDate);
    if (dateError) errors.subContractDate = dateError;

    const membersError = validateSubContractField('subContractMembers', editSubContractMembers);
    if (membersError) errors.subContractMembers = membersError;

    const amountError = validateSubContractField('subContractAmount', editSubContractAmount);
    if (amountError) errors.subContractAmount = amountError;

    setEditSubContractFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [editSubContractDate, editSubContractMembers, editSubContractAmount]);

  const closeAddSubContractModal = useCallback(() => {
    setSubContractName('');
    setSubContractDate(null);
    setSubContractMembers('');
    setSubContractAmount('');
    setSubContractDescription('');
    setSubContractModalError(null);
    setSubContractFieldErrors({});
    closeModalById('add_subcontract_modal');
  }, [closeModalById]);

  const handleSaveSubContract = useCallback(async () => {
    if (!project?._id) return;

    if (!validateSubContractForm()) {
      return;
    }

    setIsSavingSubContract(true);
    setSubContractModalError(null);
    setSubContractFieldErrors({});

    try {
      const response = await apiPost(`/projects/${project._id}/subcontracts`, {
        contractName: subContractName.trim(),
        contractDate: subContractDate?.format('YYYY-MM-DD'),
        numberOfMembers: parseInt(subContractMembers, 10),
        totalAmount: parseFloat(subContractAmount),
        description: subContractDescription.trim(),
      });

      if (response.success) {
        closeAddSubContractModal();
        loadProjectSubContracts();
        message.success('Sub-contract created successfully');
      } else {
        setSubContractModalError(response.error?.message || 'Failed to create sub-contract');
      }
    } catch (error: any) {
      console.error('[ProjectDetails] Error creating sub-contract:', error);
      setSubContractModalError(
        error.response?.data?.error?.message || 'An error occurred while creating sub-contract'
      );
    } finally {
      setIsSavingSubContract(false);
    }
  }, [
    project?._id,
    subContractName,
    subContractDate,
    subContractMembers,
    subContractAmount,
    subContractDescription,
    validateSubContractForm,
    loadProjectSubContracts,
    closeAddSubContractModal,
  ]);

  const handleOpenEditSubContract = useCallback((subContract: any) => {
    setEditingSubContract(subContract);
    setEditSubContractName(subContract.contractName || '');
    setEditSubContractDate(subContract.contractDate ? dayjs(subContract.contractDate) : null);
    setEditSubContractMembers(subContract.numberOfMembers?.toString() || '');
    setEditSubContractAmount(subContract.totalAmount?.toString() || '');
    setEditSubContractDescription(subContract.description || '');
    setEditSubContractModalError(null);
    setEditSubContractFieldErrors({});

    setTimeout(() => {
      const modalElement = document.getElementById('edit_subcontract_modal');
      if (modalElement) {
        const modalInstance = (window as any)?.bootstrap?.Modal?.getOrCreateInstance?.(
          modalElement
        );
        modalInstance?.show();
      }
    }, 100);
  }, []);

  const closeEditSubContractModal = useCallback(() => {
    setEditingSubContract(null);
    setEditSubContractName('');
    setEditSubContractDate(null);
    setEditSubContractMembers('');
    setEditSubContractAmount('');
    setEditSubContractDescription('');
    setEditSubContractModalError(null);
    setEditSubContractFieldErrors({});
    closeModalById('edit_subcontract_modal');
  }, [closeModalById]);

  const handleSaveEditSubContract = useCallback(async () => {
    if (!editingSubContract?._id || !project?._id) return;

    if (!validateEditSubContractForm()) {
      return;
    }

    setIsSavingEditSubContract(true);
    setEditSubContractModalError(null);
    setEditSubContractFieldErrors({});

    try {
      const response = await apiPut(
        `/projects/${project._id}/subcontracts/${editingSubContract._id}`,
        {
          // contractName is readonly and linked to SubContract record
          contractDate: editSubContractDate?.format('YYYY-MM-DD'),
          numberOfMembers: parseInt(editSubContractMembers, 10),
          totalAmount: parseFloat(editSubContractAmount),
          description: editSubContractDescription.trim(),
        }
      );

      if (response.success) {
        closeEditSubContractModal();
        loadProjectSubContracts();
        message.success('Sub-contract updated successfully');
      } else {
        setEditSubContractModalError(response.error?.message || 'Failed to update sub-contract');
      }
    } catch (error: any) {
      console.error('[ProjectDetails] Error updating sub-contract:', error);
      setEditSubContractModalError(
        error.response?.data?.error?.message || 'An error occurred while updating sub-contract'
      );
    } finally {
      setIsSavingEditSubContract(false);
    }
  }, [
    editingSubContract,
    project?._id,
    editSubContractName,
    editSubContractDate,
    editSubContractMembers,
    editSubContractAmount,
    editSubContractDescription,
    validateEditSubContractForm,
    loadProjectSubContracts,
    closeEditSubContractModal,
  ]);

  const handleOpenDeleteSubContract = useCallback((subContract: any) => {
    setDeletingSubContract(subContract);

    setTimeout(() => {
      const modalElement = document.getElementById('delete_subcontract_modal');
      if (modalElement) {
        const modalInstance = (window as any)?.bootstrap?.Modal?.getOrCreateInstance?.(
          modalElement
        );
        modalInstance?.show();
      }
    }, 100);
  }, []);

  const handleDeleteSubContract = useCallback(async () => {
    if (!deletingSubContract?._id || !project?._id) return;

    setIsDeletingSubContract(true);

    try {
      const response = await apiDel(
        `/projects/${project._id}/subcontracts/${deletingSubContract._id}`
      );

      if (response.success) {
        setDeletingSubContract(null);
        setConfirmSubContractName('');
        loadProjectSubContracts();
        closeModalById('delete_subcontract_modal');
        message.success('Sub-contract deleted successfully');
      } else {
        message.error(response.error?.message || 'Failed to delete sub-contract');
      }
    } catch (error: any) {
      console.error('[ProjectDetails] Error deleting sub-contract:', error);
      message.error(
        error.response?.data?.error?.message || 'An error occurred while deleting sub-contract'
      );
    } finally {
      setIsDeletingSubContract(false);
    }
  }, [deletingSubContract, project?._id, loadProjectSubContracts, closeModalById]);

  const closeAddTaskModal = useCallback(() => {
    setTaskTitle('');
    setTaskDescription('');
    setTaskPriority('Medium');
    // Keep taskStatus - it will be reset to default on next open
    setTaskDueDate(null);
    setTaskTags([]);
    setSelectedAssignees([]);
    setTaskModalError(null);
    setTaskFieldErrors({});
    closeModalById('add_task');
  }, [closeModalById]);

  const handleSaveTask = useCallback(async () => {
    if (!project?.projectId) return;

    // Validate form first
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
        projectId: project._id,
        title: taskTitle,
        description: taskDescription,
        priority: taskPriority as 'Low' | 'Medium' | 'High' | 'Urgent',
        tags: validTags,
        assignee: selectedAssignees, // Send as array to match backend schema
        dueDate: taskDueDate ? taskDueDate.format('YYYY-MM-DD') : undefined,
        status: taskStatus as 'Pending' | 'In Progress' | 'Completed' | 'Cancelled',
      };

      const success = await createTaskAPI(taskData);
      if (success) {
        closeAddTaskModal();
        loadProjectTasks();
      } else {
        setTaskModalError('Failed to create task');
      }
    } catch (error) {
      console.error('[ProjectDetails] Error creating task:', error);
      setTaskModalError('An error occurred while creating the task');
    } finally {
      setIsSavingTask(false);
    }
  }, [
    project?._id,
    project?.projectId,
    taskTitle,
    taskDescription,
    taskPriority,
    taskDueDate,
    taskTags,
    selectedAssignees,
    validateTaskForm,
    createTaskAPI,
    closeAddTaskModal,
    loadProjectTasks,
  ]);

  const handleOpenEditTask = useCallback(
    (task: any) => {
      console.log('[ProjectDetails] Opening edit task modal:', {
        taskStatus: task.status,
        availableStatuses: taskStatuses,
      });

      setEditingTask(task);
      setEditTaskTitle(task.title || '');
      setEditTaskDescription(task.description || '');
      setEditTaskPriority(task.priority || 'Medium');
      setEditTaskDueDate(task.dueDate ? dayjs(task.dueDate) : null);

      // Match status more flexibly
      let matchedStatus = '';
      if (task.status && taskStatuses && taskStatuses.length > 0) {
        matchedStatus = findMatchingStatus(task.status, taskStatuses);

        // If no match found, try to find by partial match or use first status
        if (!matchedStatus) {
          console.warn('[ProjectDetails] No matching status found for:', task.status);
          console.log(
            '[ProjectDetails] Available statuses:',
            taskStatuses.map((s) => ({ key: s.key, name: s.name }))
          );
          // Default to first status if no match
          matchedStatus = taskStatuses[0]?.key || '';
        }
      }

      console.log('[ProjectDetails] Matched status:', matchedStatus);
      setEditTaskStatus(matchedStatus);
      setEditTaskTags(Array.isArray(task.tags) ? task.tags : []);

      // Map assignees - handle both ObjectId strings and employee objects
      const assigneeIds = Array.isArray(task.assignee)
        ? task.assignee
            .map((a: any) => {
              // If it's an object, try to get _id, id, or employeeId
              if (typeof a === 'object' && a !== null) {
                return (a._id || a.id || a.employeeId || '').toString();
              }
              // Otherwise treat as ID string
              return a.toString();
            })
            .filter(Boolean)
        : [];

      console.log('[ProjectDetails] Setting edit task assignees:', {
        taskAssignee: task.assignee,
        mappedIds: assigneeIds,
        availableOptions: assigneeChoose.map((opt) => ({ value: opt.value, label: opt.label })),
      });

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

  const handleOpenDeleteTask = useCallback((task: any) => {
    setDeletingTask(task);
  }, []);

  const handleOpenViewTask = useCallback((task: any) => {
    setViewingTask(task);
  }, []);

  const handleDeleteTask = useCallback(async () => {
    if (!deletingTask?._id) return;

    setIsDeletingTask(true);
    console.log('[ProjectDetails] Deleting task:', deletingTask._id);

    try {
      const success = await deleteTaskAPI(deletingTask._id);
      if (success) {
        console.log('[ProjectDetails] Task deleted successfully');
        setDeletingTask(null);
        setConfirmTaskTitle('');
        loadProjectTasks();
        closeModalById('delete_modal');
      } else {
        console.error('[ProjectDetails] Failed to delete task');
        alert('Failed to delete task');
      }
    } catch (error) {
      console.error('[ProjectDetails] Error deleting task:', error);
      alert('An error occurred while deleting the task');
    } finally {
      setIsDeletingTask(false);
    }
  }, [deletingTask, deleteTaskAPI, loadProjectTasks, closeModalById]);

  const handleSaveEditTask = useCallback(async () => {
    if (!editingTask?._id) return;

    // Validate form first
    if (!validateEditTaskForm()) {
      return;
    }

    // Filter out empty tags
    const validTags = editTaskTags.filter((tag) => tag && tag.trim() !== '');

    setIsSavingEditTask(true);
    setEditTaskModalError(null);
    setEditTaskFieldErrors({});

    console.log('[ProjectDetails] Updating task with:', {
      taskId: editingTask._id,
      title: editTaskTitle,
      assignees: editTaskAssignees,
    });

    try {
      const updateData: Partial<Task> = {
        title: editTaskTitle,
        description: editTaskDescription,
        priority: editTaskPriority as 'Low' | 'Medium' | 'High' | 'Urgent',
        status: editTaskStatus as 'Pending' | 'In Progress' | 'Completed' | 'Cancelled',
        tags: validTags,
        assignee: editTaskAssignees, // Send as array to match backend schema
        dueDate: editTaskDueDate ? editTaskDueDate.format('YYYY-MM-DD') : undefined,
      };

      const success = await updateTaskAPI(editingTask._id, updateData);
      if (success) {
        closeEditTaskModal();
        loadProjectTasks();
      } else {
        setEditTaskModalError('Failed to update task');
      }
    } catch (error) {
      console.error('[ProjectDetails] Error updating task:', error);
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
    editTaskDueDate,
    editTaskTags,
    editTaskAssignees,
    validateEditTaskForm,
    updateTaskAPI,
    closeEditTaskModal,
    loadProjectTasks,
  ]);

  const handleEditProjectSave = useCallback(async () => {
    if (!project?._id) {
      setEditModalError('Unable to save. Please try again.');
      return;
    }

    // Validate form
    if (!validateProjectForm()) {
      return;
    }

    const trimmedName = editName.trim();
    const trimmedClient = editClient.trim();

    const update: any = {
      name: trimmedName,
      client: trimmedClient,
      priority: editPriority,
      description: editDescription || '',
    };

    // Include project value (now required)
    const numValue = parseFloat(editValue);
    if (!isNaN(numValue)) {
      update.projectValue = numValue;
    }

    // Include price type if available
    if (editPriceType && editPriceType.trim() !== '') {
      update.priceType = editPriceType;
    }

    // Handle dates
    if (editStartDate && editStartDate.isValid()) {
      update.startDate = editStartDate.toDate();
    }

    if (editEndDate && editEndDate.isValid()) {
      update.endDate = editEndDate.toDate();
    }

    console.log('[ProjectDetails] Sending update:', update);
    setIsSavingProject(true);
    setEditModalError(null);
    setFieldErrors({});

    try {
      const success = await updateProjectAPI(project._id, update);
      if (success) {
        await loadProject(); // Reload to get updated data
        closeModalById('edit_project');
        // Extra cleanup to ensure backdrop is removed
        setTimeout(() => {
          document.querySelectorAll('.modal-backdrop').forEach((node) => {
            if (node && node.parentNode) {
              node.parentNode.removeChild(node);
            }
          });
          document.body.classList.remove('modal-open');
          document.body.style.removeProperty('padding-right');
          document.body.style.removeProperty('overflow');
        }, 400);
        setIsSavingProject(false);
      } else {
        setEditModalError('Failed to update project');
        setIsSavingProject(false);
      }
    } catch (error) {
      console.error('[ProjectDetails] Error updating project:', error);
      setEditModalError('An error occurred while updating the project');
      setIsSavingProject(false);
      // Ensure backdrop is removed even on error
      setTimeout(() => {
        document.querySelectorAll('.modal-backdrop').forEach((node) => {
          if (node && node.parentNode) {
            node.parentNode.removeChild(node);
          }
        });
        document.body.classList.remove('modal-open');
        document.body.style.removeProperty('padding-right');
        document.body.style.removeProperty('overflow');
      }, 100);
    }
  }, [
    updateProjectAPI,
    project?._id,
    editName,
    editClient,
    editPriority,
    editValue,
    editPriceType,
    editDescription,
    editStartDate,
    editEndDate,
    validateProjectForm,
    loadProject,
    closeModalById,
  ]);

  const handleEditProjectMembersSave = useCallback(async () => {
    if (!project?._id) {
      setEditModalError('Unable to save. Please try again.');
      return;
    }

    // Filter out empty tags
    const validTags = editTags.filter((tag) => tag && tag.trim() !== '');

    const update: any = {
      teamMembers: editTeamMembers,
      teamLeader: editTeamLeaders,
      projectManager: editProjectManagers,
      tags: validTags,
      status: editStatus,
    };

    console.log('[ProjectDetails] Saving members tab:', update);
    setIsSavingProject(true);
    setEditModalError(null);

    try {
      const success = await updateProjectAPI(project._id, update);
      if (success) {
        await loadProject(); // Reload to get updated data
        closeModalById('edit_project');
        // Extra cleanup to ensure backdrop is removed
        setTimeout(() => {
          document.querySelectorAll('.modal-backdrop').forEach((node) => {
            if (node && node.parentNode) {
              node.parentNode.removeChild(node);
            }
          });
          document.body.classList.remove('modal-open');
          document.body.style.removeProperty('padding-right');
          document.body.style.removeProperty('overflow');
        }, 400);
        setIsSavingProject(false);
      } else {
        setEditModalError('Failed to update project');
        setIsSavingProject(false);
      }
    } catch (error) {
      console.error('[ProjectDetails] Error updating project members:', error);
      setEditModalError('An error occurred while updating the project');
      setIsSavingProject(false);
      // Ensure backdrop is removed even on error
      setTimeout(() => {
        document.querySelectorAll('.modal-backdrop').forEach((node) => {
          if (node && node.parentNode) {
            node.parentNode.removeChild(node);
          }
        });
        document.body.classList.remove('modal-open');
        document.body.style.removeProperty('padding-right');
        document.body.style.removeProperty('overflow');
      }, 100);
    }
  }, [
    updateProjectAPI,
    project?._id,
    editTeamMembers,
    editTeamLeaders,
    editProjectManagers,
    editTags,
    editStatus,
    loadProject,
    closeModalById,
  ]);

  const handlePriorityChange = useCallback(
    async (priority: string) => {
      if (!project?._id) return;

      try {
        const success = await updateProjectAPI(project._id, {
          priority: priority as 'Low' | 'Medium' | 'High',
        });
        if (success) {
          await loadProject();
        }
      } catch (error) {
        console.error('[ProjectDetails] Error updating priority:', error);
      }
    },
    [project?._id, updateProjectAPI, loadProject]
  );

  // Setup modal event listeners for reset on close
  useEffect(() => {
    const memberModal = document.getElementById('add_team_members_modal');
    const leadModal = document.getElementById('add_team_leads_modal');
    const managerModal = document.getElementById('add_project_managers_modal');

    const handleMemberModalHidden = () => resetTeamMembersModal();
    const handleLeadModalHidden = () => resetTeamLeadsModal();
    const handleManagerModalHidden = () => resetProjectManagersModal();

    memberModal?.addEventListener('hidden.bs.modal', handleMemberModalHidden);
    leadModal?.addEventListener('hidden.bs.modal', handleLeadModalHidden);
    managerModal?.addEventListener('hidden.bs.modal', handleManagerModalHidden);

    return () => {
      memberModal?.removeEventListener('hidden.bs.modal', handleMemberModalHidden);
      leadModal?.removeEventListener('hidden.bs.modal', handleLeadModalHidden);
      managerModal?.removeEventListener('hidden.bs.modal', handleManagerModalHidden);
    };
  }, [resetTeamMembersModal, resetTeamLeadsModal, resetProjectManagersModal]);

  useEffect(() => {
    if (Array.isArray(project?.teamMembers)) {
      const memberIds = project.teamMembers.map((m: any) =>
        typeof m === 'string' ? m : m._id || m
      );
      setSelectedMembers(memberIds);
      setEditTeamMembers(memberIds);
    }
    if (Array.isArray(project?.teamLeader)) {
      const leadIds = project.teamLeader.map((m: any) => (typeof m === 'string' ? m : m._id || m));
      setSelectedLeads(leadIds);
      setEditTeamLeaders(leadIds);
    }
    if (Array.isArray(project?.projectManager)) {
      const managerIds = project.projectManager.map((m: any) =>
        typeof m === 'string' ? m : m._id || m
      );
      setSelectedManagers(managerIds);
      setEditProjectManagers(managerIds);
    }
    if (project) {
      console.log('[ProjectDetails] Syncing project data:', {
        startDate: project.startDate,
        endDate: project.endDate,
        tags: project.tags,
      });
      setEditName(project.name || '');
      setEditClient(project.client || '');
      setEditPriority(project.priority || 'Medium');
      setEditValue(project.projectValue?.toString() || '');
      setEditPriceType(project.priceType || '');
      setEditDescription(project.description || '');
      setEditStatus(project.status || 'Active');
      setEditTags(Array.isArray(project.tags) ? project.tags : []);
      console.log(
        '[ProjectDetails] Tags set to editTags:',
        Array.isArray(project.tags) ? project.tags : []
      );
      const parsedStart = parseDateValue(project.startDate);
      const parsedEnd = parseDateValue(project.endDate);
      setEditStartDate(parsedStart);
      setEditEndDate(parsedEnd);
      console.log('[ProjectDetails] After sync:', {
        editStartDate: parsedStart,
        editEndDate: parsedEnd,
      });
    }
  }, [project, parseDateValue]);

  // Load data on mount
  useEffect(() => {
    loadProject();
    loadTaskStatuses();
    loadEmployeesAndClients();
  }, [loadProject, loadTaskStatuses, loadEmployeesAndClients]);

  const getModalContainer = () => {
    const modalElement = document.getElementById('modal-datepicker');
    return modalElement ? modalElement : document.body;
  };
  const clientChoose = useMemo(
    () => [
      { value: 'Select', label: 'Select' },
      ...clients.map((client) => ({ value: client.label, label: client.label })),
    ],
    [clients]
  );
  const statusChoose = [
    { value: 'Select', label: 'Select' },
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
  ];
  const priorityChoose = [
    { value: 'Select', label: 'Select' },
    { value: 'High', label: 'High' },
    { value: 'Medium', label: 'Medium' },
    { value: 'Low', label: 'Low' },
  ];
  const tagChoose = [
    { value: 'Select', label: 'Select' },
    { value: 'Internal', label: 'Internal' },
    { value: 'Projects', label: 'Projects' },
    { value: 'Meetings', label: 'Meetings' },
    { value: 'Reminder', label: 'Reminder' },
  ];

  // Dynamic assignee options from project team members (store employee object id like team member updates)
  const assigneeChoose = useMemo(() => {
    const baseOption = [{ value: 'Select', label: 'Select' }];

    // Combine team members and team leaders
    const allMembers = [...(project?.teamMembers || []), ...(project?.teamLeader || [])];

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
  }, [project?.teamMembers, project?.teamLeader]);

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div
            className="d-flex justify-content-center align-items-center"
            style={{ minHeight: '400px' }}
          >
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
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
            <h5 className="mb-2">Error Loading Project</h5>
            <p className="text-muted mb-3">{error}</p>
            <button className="btn btn-primary" onClick={loadProject}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="text-center py-5">
            <i className="ti ti-folder-x fs-1 text-muted mb-3"></i>
            <h5 className="mb-2">Project Not Found</h5>
            <p className="text-muted mb-3">
              The project you're looking for doesn't exist or has been deleted.
            </p>
            <Link to={all_routes.projectlist} className="btn btn-primary">
              Back to Projects
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
                <Link to={all_routes.projectlist}>
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
                      data-inert={true}
                      data-bs-target="#edit_project"
                    >
                      <i className="ti ti-edit me-1" />
                      Edit Project
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
            <div className="col-xxl-3 col-xl-4 theiaStickySidebar">
              <div className="card">
                <div className="card-body">
                  <h5 className="mb-3">Project Details</h5>
                  <div className="list-group details-list-group mb-4">
                    <div className="list-group-item">
                      <span>Client</span>
                      <p className="text-gray-9">{project.client || 'N/A'}</p>
                    </div>
                    <div className="list-group-item">
                      <div className="d-flex align-items-center justify-content-between">
                        <span>Project Total Cost</span>
                        <p className="text-gray-9">${project.projectValue || '0'}</p>
                      </div>
                    </div>
                  </div>
                  <h5 className="mb-3">Sub-Contract Details</h5>
                  <div className="list-group details-list-group mb-4">
                    <div className="list-group-item">
                      <div className="d-flex align-items-center justify-content-between">
                        <span>Total Sub-Contracts</span>
                        <p className="text-gray-9">{subContracts.length}</p>
                      </div>
                    </div>
                    <div className="list-group-item">
                      <div className="d-flex align-items-center justify-content-between">
                        <span>Total Amount</span>
                        <p className="text-gray-9">
                          $
                          {subContracts
                            .reduce((sum, sc) => sum + (sc.totalAmount || 0), 0)
                            .toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="list-group-item">
                      <div className="d-flex align-items-center justify-content-between">
                        <span>Total Members</span>
                        <p className="text-gray-9">
                          {subContracts.reduce((sum, sc) => sum + (sc.numberOfMembers || 0), 0)}
                        </p>
                      </div>
                    </div>
                    <div className="list-group-item">
                      <div className="d-flex align-items-center justify-content-between">
                        <span>Active Contracts</span>
                        <p className="text-gray-9">
                          {subContracts.filter((sc) => sc.status === 'Active').length}
                        </p>
                      </div>
                    </div>
                  </div>
                  <h5 className="mb-3">Work Details</h5>
                  <div className="list-group details-list-group mb-4">
                    <div className="list-group-item">
                      <div className="d-flex align-items-center justify-content-between">
                        <span>Hours of Work</span>
                        <p className="text-gray-9">{project.hoursOfWork || '0'} hrs</p>
                      </div>
                    </div>
                    <div className="list-group-item">
                      <div className="d-flex align-items-center justify-content-between">
                        <span>Created on</span>
                        <p className="text-gray-9">
                          {project.createdAt
                            ? new Date(project.createdAt).toLocaleDateString()
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="list-group-item">
                      <div className="d-flex align-items-center justify-content-between">
                        <span>Started on</span>
                        <p className="text-gray-9">
                          {project.startDate
                            ? new Date(project.startDate).toLocaleDateString()
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="list-group-item">
                      <div className="d-flex align-items-center justify-content-between">
                        <span>Due Date</span>
                        <div className="d-flex align-items-center">
                          <p className="text-gray-9 mb-0">
                            {(() => {
                              const parsed = parseDateValue(project.endDate);
                              return parsed ? parsed.format('DD/MM/YYYY') : 'N/A';
                            })()}
                          </p>
                          {(() => {
                            const parsed = parseDateValue(project.endDate);
                            return parsed && parsed.isBefore(dayjs(), 'day');
                          })() && (
                            <span className="badge badge-danger d-inline-flex align-items-center ms-2">
                              <i className="ti ti-clock-stop" />
                              Overdue
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="list-group-item">
                      <div className="d-flex align-items-center justify-content-between">
                        <span>Created by</span>
                        <div className="d-flex align-items-center">
                          <span className="avatar avatar-sm avatar-rounded me-2">
                            <ImageWithBasePath src="assets/img/profiles/avatar-02.jpg" alt="Img" />
                          </span>
                          <p className="text-gray-9 mb-0">{project.createdBy || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="list-group-item">
                      <div className="d-flex align-items-center justify-content-between">
                        <span>Priority</span>
                        <span
                          className={`badge d-inline-flex align-items-center ${
                            project.priority === 'High'
                              ? 'badge-soft-danger'
                              : project.priority === 'Medium'
                                ? 'badge-soft-warning'
                                : 'badge-soft-success'
                          }`}
                        >
                          <i className="ti ti-point-filled me-1" />
                          {project.priority || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <h5 className="mb-3">Tasks Details</h5>
                  <div className="bg-light p-2 rounded">
                    <span className="d-block mb-1">Tasks Done</span>
                    <h4 className="mb-2">
                      {project.completedTasks || 0} / {project.totalTasks || 0}
                    </h4>
                    <div className="progress progress-xs mb-2">
                      <div
                        className="progress-bar"
                        role="progressbar"
                        style={{
                          width:
                            project.totalTasks > 0
                              ? `${((project.completedTasks || 0) / project.totalTasks) * 100}%`
                              : '0%',
                        }}
                      />
                    </div>
                    <p>
                      {project.totalTasks > 0
                        ? Math.round(((project.completedTasks || 0) / project.totalTasks) * 100)
                        : 0}
                      % Completed
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xxl-9 col-xl-8">
              <div className="card">
                <div className="card-body">
                  <div className="bg-light rounded p-3 mb-3">
                    <div className="d-flex align-items-center">
                      <Link
                        to={all_routes.projectdetails.replace(':projectId', project._id)}
                        className="flex-shrink-0 me-2"
                      >
                        <ImageWithBasePath src="assets/img/social/project-01.svg" alt="Img" />
                      </Link>
                      <div>
                        <h6 className="mb-1">
                          <Link
                            to={all_routes.projectdetails.replace(':projectId', project.projectId)}
                          >
                            {project.name || 'Untitled Project'}
                          </Link>
                        </h6>
                        <p>
                          Project ID :{' '}
                          <span className="text-primary"> {project.projectId || 'N/A'}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="row align-items-center">
                    <div className="col-sm-3">
                      <p className="d-flex align-items-center mb-3">
                        <i className="ti ti-square-rounded me-2" />
                        Status
                      </p>
                    </div>
                    <div className="col-sm-9">
                      <span
                        className={`badge d-inline-flex align-items-center mb-3 ${
                          project.status === 'Active'
                            ? 'badge-soft-success'
                            : project.status === 'Completed'
                              ? 'badge-soft-primary'
                              : project.status === 'On Hold'
                                ? 'badge-soft-warning'
                                : 'badge-soft-secondary'
                        }`}
                      >
                        <i className="ti ti-point-filled me-1" />
                        {project.status || 'N/A'}
                      </span>
                    </div>
                    <div className="col-sm-3">
                      <p className="d-flex align-items-center mb-3">
                        <i className="ti ti-users-group me-2" />
                        Team
                      </p>
                    </div>
                    <div className="col-sm-9">
                      <div className="d-flex align-items-center mb-3">
                        {(() => {
                          console.log('[ProjectDetails] Rendering Team Members:', {
                            exists: !!project.teamMembers,
                            isArray: Array.isArray(project.teamMembers),
                            length: project.teamMembers?.length,
                            data: project.teamMembers,
                          });
                          return null;
                        })()}
                        {project.teamMembers &&
                        Array.isArray(project.teamMembers) &&
                        project.teamMembers.length > 0 ? (
                          project.teamMembers.map((member: any, index: number) => (
                            <div
                              key={member.employeeId || index}
                              className="bg-gray-100 p-1 rounded d-flex align-items-center me-2"
                            >
                              <Link
                                to="#"
                                className="avatar avatar-sm avatar-rounded border border-white flex-shrink-0 me-2"
                              >
                                <ImageWithBasePath
                                  src={`assets/img/users/user-${42 + index}.jpg`}
                                  alt="Img"
                                />
                              </Link>
                              <h6 className="fs-12">
                                <Link to="#">
                                  {member.employeeId} - {member.firstName} {member.lastName}
                                </Link>
                              </h6>
                            </div>
                          ))
                        ) : (
                          <p className="text-muted mb-0">No team members assigned</p>
                        )}
                        {!isEmployee && (
                          <div>
                            <Link
                              to="#"
                              className="d-flex align-items-center fs-12"
                              data-bs-toggle="modal"
                              data-bs-target="#add_team_members_modal"
                              onClick={resetTeamMembersModal}
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
                        <i className="ti ti-user-shield me-2" />
                        Team Lead
                      </p>
                    </div>
                    <div className="col-sm-9">
                      <div className="d-flex align-items-center mb-3">
                        {project.teamLeader &&
                        Array.isArray(project.teamLeader) &&
                        project.teamLeader.length > 0 ? (
                          project.teamLeader.map((lead: any, index: number) => (
                            <div
                              key={lead.employeeId || index}
                              className="bg-gray-100 p-1 rounded d-flex align-items-center me-2"
                            >
                              <Link
                                to="#"
                                className="avatar avatar-sm avatar-rounded border border-white flex-shrink-0 me-2"
                              >
                                <ImageWithBasePath
                                  src={`assets/img/users/user-${42 + index}.jpg`}
                                  alt="Img"
                                />
                              </Link>
                              <h6 className="fs-12">
                                <Link to="#">
                                  {lead.employeeId} - {lead.firstName} {lead.lastName}
                                </Link>
                              </h6>
                            </div>
                          ))
                        ) : (
                          <p className="text-muted mb-0">No team lead assigned</p>
                        )}
                        {!isEmployee && (
                          <div>
                            <Link
                              to="#"
                              className="d-flex align-items-center fs-12"
                              data-bs-toggle="modal"
                              data-bs-target="#add_team_leads_modal"
                              onClick={resetTeamLeadsModal}
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
                        <i className="ti ti-user-star me-2" />
                        Project Manager
                      </p>
                    </div>
                    <div className="col-sm-9">
                      <div className="d-flex align-items-center mb-3">
                        {project.projectManager &&
                        Array.isArray(project.projectManager) &&
                        project.projectManager.length > 0 ? (
                          project.projectManager.map((manager: any, index: number) => (
                            <div
                              key={manager.employeeId || index}
                              className="bg-gray-100 p-1 rounded d-flex align-items-center me-2"
                            >
                              <Link
                                to="#"
                                className="avatar avatar-sm avatar-rounded border border-white flex-shrink-0 me-2"
                              >
                                <ImageWithBasePath
                                  src={`assets/img/users/user-${45 + index}.jpg`}
                                  alt="Img"
                                />
                              </Link>
                              <h6 className="fs-12">
                                <Link to="#">
                                  {manager.employeeId} - {manager.firstName} {manager.lastName}
                                </Link>
                              </h6>
                            </div>
                          ))
                        ) : (
                          <p className="text-muted mb-0">No project manager assigned</p>
                        )}
                        {!isEmployee && (
                          <div>
                            <Link
                              to="#"
                              className="d-flex align-items-center fs-12"
                              data-bs-toggle="modal"
                              data-bs-target="#add_project_managers_modal"
                              onClick={resetProjectManagersModal}
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
                        {project.tags && project.tags.length > 0 ? (
                          project.tags.map((tag: string, index: number) => (
                            <Link
                              key={index}
                              to="#"
                              className={`badge task-tag rounded-pill me-2 ${
                                index % 2 === 0 ? 'bg-pink' : 'badge-info'
                              }`}
                            >
                              {tag}
                            </Link>
                          ))
                        ) : (
                          <p className="text-muted mb-0">No tags assigned</p>
                        )}
                      </div>
                    </div>
                    <div className="col-sm-12">
                      <div className="mb-3">
                        <h6 className="mb-1">Description</h6>
                        <p>{project.description || 'No description available for this project.'}</p>
                      </div>
                    </div>
                    <div className="col-md-12">
                      <div className="bg-soft-secondary p-3 rounded d-flex align-items-center justify-content-between">
                        <p className="text-secondary mb-0">Time Spent on this project</p>
                        <h3 className="text-secondary">
                          {project.timeSpent || '0'}/{project.totalHours || '0'}{' '}
                          <span className="fs-16">Hrs</span>
                        </h3>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="custom-accordion-items">
                <div className="accordion accordions-items-seperate" id="accordionExample">
                  <div className="accordion-item">
                    <div className="accordion-header" id="headingTwo">
                      <div className="accordion-button">
                        <h5>Tasks</h5>
                        <div className=" ms-auto">
                          <Link
                            to="#"
                            className="d-flex align-items-center collapsed collapse-arrow"
                            data-bs-toggle="collapse"
                            data-bs-target="#primaryBorderTwo"
                            aria-expanded="false"
                            aria-controls="primaryBorderTwo"
                          >
                            <i className="ti ti-chevron-down fs-18" />
                          </Link>
                        </div>
                      </div>
                    </div>
                    <div
                      id="primaryBorderTwo"
                      className="accordion-collapse collapse show border-top"
                      aria-labelledby="headingTwo"
                      data-bs-parent="#accordionExample"
                    >
                      <div
                        className="accordion-body"
                        style={{ minHeight: '210px', overflow: 'visible' }}
                      >
                        <div className="list-group list-group-flush">
                          {tasksLoading ? (
                            <div className="text-center py-5">
                              <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading tasks...</span>
                              </div>
                              <p className="text-muted mt-3">Loading tasks...</p>
                            </div>
                          ) : tasks.length === 0 ? (
                            <div className="text-center py-4">
                              <i className="ti ti-clipboard-x fs-1 text-muted mb-3"></i>
                              <h6 className="text-muted">No tasks found</h6>
                              <p className="text-muted small">
                                Tasks for this project will appear here
                              </p>
                            </div>
                          ) : (
                            tasks.slice(0, 5).map((task) => (
                              <>
                                <div
                                  key={task._id}
                                  className="list-group-item border bg-white rounded mb-3 p-3 shadow-sm"
                                >
                                  <div className="row align-items-center row-gap-3">
                                    <div className="col-md-7">
                                      <div className="todo-inbox-check d-flex align-items-center flex-wrap row-gap-3">
                                        <span>
                                          <i className="ti ti-grid-dots me-2" />
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
                                          <h4 className="fs-14">{task.title}</h4>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="col-md-5">
                                      <div className="d-flex align-items-center justify-content-md-end flex-wrap row-gap-3">
                                        <span className="badge bg-soft-pink d-inline-flex align-items-center me-3">
                                          <i className="fas fa-circle fs-6 me-1" />
                                          {task.status}
                                        </span>
                                        <div className="d-flex align-items-center">
                                          <div className="avatar-list-stacked avatar-group-sm">
                                            {task.assignee && task.assignee.length > 0 ? (
                                              task.assignee
                                                .slice(0, 3)
                                                .map((assignee: any, idx: number) => {
                                                  // Handle both populated objects and ID strings
                                                  let member = null;

                                                  if (
                                                    typeof assignee === 'object' &&
                                                    assignee !== null
                                                  ) {
                                                    member = assignee;
                                                  } else {
                                                    const assigneeId = assignee.toString();
                                                    const allMembers = [
                                                      ...(project?.teamMembers || []),
                                                      ...(project?.teamLeader || []),
                                                    ];
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
                                                })
                                            ) : (
                                              <span className="text-muted small">No assignees</span>
                                            )}
                                            {task.assignee && task.assignee.length > 3 && (
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
                                          </div>
                                          <div className="dropdown ms-2">
                                            <Link
                                              to="#"
                                              className="d-inline-flex align-items-center"
                                              data-bs-toggle="dropdown"
                                            >
                                              <i className="ti ti-dots-vertical" />
                                            </Link>
                                            <ul className="dropdown-menu dropdown-menu-end p-2">
                                              {!isEmployee && (
                                                <li>
                                                  <Link
                                                    to="#"
                                                    className="dropdown-item rounded-1"
                                                    data-bs-toggle="modal"
                                                    data-inert={true}
                                                    data-bs-target="#edit_task"
                                                    onClick={(e) => {
                                                      e.preventDefault();
                                                      handleOpenEditTask(task);
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
                                                    data-inert={true}
                                                    data-bs-target="#delete_modal"
                                                    onClick={(e) => {
                                                      e.preventDefault();
                                                      handleOpenDeleteTask(task);
                                                    }}
                                                  >
                                                    <i className="ti ti-trash me-2" />
                                                    Delete
                                                  </Link>
                                                </li>
                                              )}
                                              <li>
                                                <Link
                                                  to="#"
                                                  className="dropdown-item rounded-1"
                                                  data-bs-toggle="modal"
                                                  data-inert={true}
                                                  data-bs-target="#view_todo"
                                                  onClick={(e) => {
                                                    e.preventDefault();
                                                    handleOpenViewTask(task);
                                                  }}
                                                >
                                                  <i className="ti ti-eye me-2" />
                                                  View
                                                </Link>
                                              </li>
                                            </ul>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </>
                            ))
                          )}
                          {!isEmployee && (
                            <button
                              className="btn bg-primary-transparent border-dashed border-primary w-100 text-start"
                              data-bs-toggle="modal"
                              data-inert={true}
                              data-bs-target="#add_task"
                            >
                              <i className="ti ti-plus me-2" />
                              New task
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="accordion-item">
                    <div className="accordion-header" id="headingFive">
                      <div className="accordion-button">
                        <h5>Notes</h5>
                        <div className=" ms-auto d-flex align-items-center">
                          <Link
                            to="#"
                            className="btn btn-primary btn-xs d-inline-flex align-items-center me-3"
                            data-bs-toggle="modal"
                            data-bs-target="#add_note_modal"
                          >
                            <i className="ti ti-square-rounded-plus-filled me-1" />
                            Add New
                          </Link>
                          <Link
                            to="#"
                            className="d-flex align-items-center collapsed collapse-arrow"
                            data-bs-toggle="collapse"
                            data-bs-target="#primaryBorderFive"
                            aria-expanded="false"
                            aria-controls="primaryBorderFive"
                          >
                            <i className="ti ti-chevron-down fs-18" />
                          </Link>
                        </div>
                      </div>
                    </div>
                    <div
                      id="primaryBorderFive"
                      className="accordion-collapse collapse show border-top"
                      aria-labelledby="headingFive"
                      data-bs-parent="#accordionExample"
                    >
                      <div
                        className="accordion-body"
                        style={{ minHeight: '210px', overflow: 'visible' }}
                      >
                        <div className="list-group list-group-flush">
                          {notes.length === 0 ? (
                            <div className="text-center py-4">
                              <i className="ti ti-note-off fs-1 text-muted mb-3"></i>
                              <h6 className="text-muted">No notes found</h6>
                              <p className="text-muted small">
                                Notes for this project will appear here
                              </p>
                            </div>
                          ) : (
                            notes.slice(0, 5).map((note) => (
                              <div
                                key={note._id}
                                className="list-group-item border bg-white rounded mb-3 p-3 shadow-sm"
                              >
                                <div className="row align-items-center row-gap-3">
                                  <div className="col-md-8">
                                    <div className="d-flex align-items-start">
                                      <span className="me-2">
                                        <i className="ti ti-note text-primary" />
                                      </span>
                                      <div className="flex-fill">
                                        <h6 className="d-flex align-items-center mb-1">
                                          {note.title}
                                        </h6>
                                        <p className="text-muted small mb-0 text-truncate">
                                          {note.content}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="col-md-4">
                                    <div className="d-flex align-items-center justify-content-md-end flex-wrap row-gap-2">
                                      <span className="text-muted small me-3">
                                        {note.createdAt
                                          ? new Date(note.createdAt).toLocaleDateString()
                                          : 'N/A'}
                                      </span>
                                      <div className="dropdown">
                                        <Link
                                          to="#"
                                          className="d-inline-flex align-items-center"
                                          data-bs-toggle="dropdown"
                                        >
                                          <i className="ti ti-dots-vertical" />
                                        </Link>
                                        <ul className="dropdown-menu dropdown-menu-end p-2">
                                          <li>
                                            <Link
                                              to="#"
                                              className="dropdown-item rounded-1"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                handleOpenEditNote(note);
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
                                              onClick={(e) => {
                                                e.preventDefault();
                                                handleOpenDeleteNote(note);
                                              }}
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
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="accordion-item">
                    <div className="accordion-header" id="headingSubContracts">
                      <div className="accordion-button">
                        <h5>Sub-Contracts</h5>
                        <div className="ms-auto d-flex align-items-center">
                          {(isAdmin || isHR) && (
                            <Link
                              to="#"
                              className="btn btn-primary btn-xs d-inline-flex align-items-center me-3"
                              data-bs-toggle="modal"
                              data-bs-target="#add_subcontract_modal"
                            >
                              <i className="ti ti-square-rounded-plus-filled me-1" />
                              Add New
                            </Link>
                          )}
                          <Link
                            to="#"
                            className="d-flex align-items-center collapsed collapse-arrow"
                            data-bs-toggle="collapse"
                            data-bs-target="#primaryBorderSubContracts"
                            aria-expanded="false"
                            aria-controls="primaryBorderSubContracts"
                          >
                            <i className="ti ti-chevron-down fs-18" />
                          </Link>
                        </div>
                      </div>
                    </div>
                    <div
                      id="primaryBorderSubContracts"
                      className="accordion-collapse collapse show border-top"
                      aria-labelledby="headingSubContracts"
                      data-bs-parent="#accordionExample"
                    >
                      <div
                        className="accordion-body"
                        style={{ minHeight: '210px', overflow: 'visible' }}
                      >
                        <div className="list-group list-group-flush">
                          {subContracts.length === 0 ? (
                            <div className="text-center py-4">
                              <i className="ti ti-file-off fs-1 text-muted mb-3"></i>
                              <h6 className="text-muted">No sub-contracts found</h6>
                              <p className="text-muted small">
                                Click "Add New" to create your first sub-contract
                              </p>
                            </div>
                          ) : (
                            subContracts.map((subContract: any, index: number) => {
                              // For old sub-contracts without subContractId, try to match with available sub-contracts
                              const matchedSubContract =
                                !subContract.contractName && availableSubContracts[index]
                                  ? availableSubContracts[index]
                                  : null;

                              const displayName =
                                subContract.contractName ||
                                matchedSubContract?.name ||
                                'Unnamed Contract';
                              const displayContractId =
                                subContract.contractId || matchedSubContract?.contractId || '';

                              return (
                                <div
                                  key={subContract._id}
                                  className="list-group-item border-0 px-0"
                                >
                                  <div className="d-flex align-items-start">
                                    <div className="flex-fill">
                                      <div className="d-flex align-items-center mb-1">
                                        <h6 className="mb-0 me-2">{displayName}</h6>
                                        {displayContractId && (
                                          <span className="badge badge-soft-info">
                                            {displayContractId.toUpperCase()}
                                          </span>
                                        )}
                                        {!subContract.contractName && matchedSubContract && (
                                          <span
                                            className="badge badge-soft-warning ms-1"
                                            title="This sub-contract is not linked. Please edit to link it properly."
                                          >
                                            Not Linked
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-muted mb-1">
                                        <i className="ti ti-calendar me-1"></i>
                                        Date: {dayjs(subContract.contractDate).format('DD-MM-YYYY')}
                                      </p>
                                      <p className="text-muted mb-1">
                                        <i className="ti ti-users me-1"></i>
                                        Members: {subContract.numberOfMembers}
                                      </p>
                                      <p className="text-muted mb-1">
                                        <span className="badge badge-success">
                                          {subContract.currency}{' '}
                                          {subContract.totalAmount.toLocaleString()}
                                        </span>
                                      </p>
                                      {subContract.description && (
                                        <p className="text-muted small mb-0">
                                          {subContract.description}
                                        </p>
                                      )}
                                    </div>
                                    {(isAdmin || isHR) && (
                                      <div className="dropdown ms-auto">
                                        <Link
                                          to="#"
                                          className="link-dark"
                                          data-bs-toggle="dropdown"
                                          aria-expanded="false"
                                        >
                                          <i className="ti ti-dots-vertical"></i>
                                        </Link>
                                        <ul className="dropdown-menu dropdown-menu-end p-2">
                                          <li>
                                            <Link
                                              to="#"
                                              className="dropdown-item rounded-1"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                handleOpenEditSubContract(subContract);
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
                                              onClick={(e) => {
                                                e.preventDefault();
                                                handleOpenDeleteSubContract(subContract);
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
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="accordion-item">
                    <div className="accordion-header" id="headingSix">
                      <div className="accordion-button">
                        <h5>Activity</h5>
                        <div className=" ms-auto">
                          <Link
                            to="#"
                            className="d-flex align-items-center collapsed collapse-arrow"
                            data-bs-toggle="collapse"
                            data-bs-target="#primaryBorderSix"
                            aria-expanded="false"
                            aria-controls="primaryBorderSix"
                          >
                            <i className="ti ti-chevron-down fs-18" />
                          </Link>
                        </div>
                      </div>
                    </div>
                    <div
                      id="primaryBorderSix"
                      className="accordion-collapse collapse show border-top"
                      aria-labelledby="headingSix"
                      data-bs-parent="#accordionExample"
                    >
                      <div className="accordion-body">
                        <div className="notice-widget">
                          <div className="d-flex align-items-center justify-content-between mb-4">
                            <p className="text-muted mb-0">Project activity will appear here</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* <div className="accordion-item">
                    <div className="accordion-header" id="headingSeven">
                      <div className="accordion-button">
                        <h5>Invoices</h5>
                        <div className=" ms-auto d-flex align-items-center">
                          <Link
                            to="#"
                            className="d-flex align-items-center collapsed collapse-arrow"
                            data-bs-toggle="collapse"
                            data-bs-target="#primaryBorderSeven"
                            aria-expanded="false"
                            aria-controls="primaryBorderSeven"
                          >
                            <i className="ti ti-chevron-down fs-18" />
                          </Link>
                        </div>
                      </div>
                    </div>
                    <div
                      id="primaryBorderSeven"
                      className="accordion-collapse collapse show border-top"
                      aria-labelledby="headingSeven"
                      data-bs-parent="#accordionExample"
                    >
                      <div className="accordion-body">
                        <div className="list-group list-group-flush">
                          {invoices.length === 0 ? (
                            <div className="text-center py-4">
                              <i className="ti ti-file-invoice-off fs-1 text-muted mb-3"></i>
                              <h6 className="text-muted">No invoices found</h6>
                              <p className="text-muted small">Invoices for this project will appear here</p>
                            </div>
                          ) : (
                            invoices.map((invoice) => (
                              <div key={invoice._id} className="list-group-item border rounded mb-2 p-2">
                                <div className="row align-items-center g-3">
                                  <div className="col-sm-6">
                                    <div className="d-flex align-items-center">
                                      <span className="avatar avatar-lg bg-light flex-shrink-0 me-2">
                                        <i className="ti ti-file-invoice text-dark fs-24" />
                                      </span>
                                      <div>
                                        <h6 className="fw-medium mb-1">
                                          {invoice.title}
                                        </h6>
                                        <p>
                                          <Link to={`${all_routes.invoiceDetails}/${invoice._id}`} className="text-info">
                                            #{invoice.invoiceNumber}{" "}
                                          </Link>{" "}
                                          {invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : 'N/A'}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="col-sm-3">
                                    <div>
                                      <span>Amount</span>
                                      <p className="text-dark">${invoice.amount?.toFixed(2) || '0.00'}</p>
                                    </div>
                                  </div>
                                  <div className="col-sm-3">
                                    <div className="d-flex align-items-center justify-content-sm-end">
                                      <span className={`badge d-inline-flex align-items-center me-4 ${
                                        invoice.status === "Paid" ? "badge-soft-success" :
                                        invoice.status === "Unpaid" ? "badge-soft-danger" :
                                        invoice.status === "Pending" ? "badge-soft-warning" :
                                        invoice.status === "Overdue" ? "badge-soft-danger" :
                                        "badge-soft-secondary"
                                      }`}>
                                        <i className="ti ti-point-filled me-1" />
                                        {invoice.status || 'Draft'}
                                      </span>
                                      <Link to={`${all_routes.invoiceDetails}/${invoice._id}`} className="btn btn-icon btn-sm">
                                        <i className="ti ti-eye" />
                                      </Link>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div> */}
                </div>
                {/* <div className="text-end mb-4">
                  <div className="dropdown">
                    <Link
                      to="#"
                      className="d-inline-flex align-items-center avatar avatar-lg avatar-rounded bg-primary"
                      data-bs-toggle="dropdown"
                    >
                      <i className="ti ti-plus fs-24 text-white" />
                    </Link>
                    <ul className="dropdown-menu dropdown-menu-end bg-gray-900 dropdown-menu-md dropdown-menu-dark p-3">
                      <li>
                        <Link
                          to="#"
                          className="dropdown-item rounded-1 d-flex align-items-center"
                          data-bs-toggle="modal"
                          data-bs-target="#add_task_modal"
                        >
                          <span className="avatar avatar-md bg-gray-800 flex-shrink-0 me-2">
                            <i className="ti ti-basket-code" />
                          </span>
                          <div>
                            <h6 className="fw-medium text-white mb-1">
                              Add a Task
                            </h6>
                            <p className="text-white">
                              Create a new Priority tasks{" "}
                            </p>
                          </div>
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="#"
                          className="dropdown-item rounded-1 d-flex align-items-center"
                        >
                          <span className="avatar avatar-md bg-gray-800 flex-shrink-0 me-2">
                            <i className="ti ti-file-invoice" />
                          </span>
                          <div>
                            <h6 className="fw-medium text-white mb-1">
                              Add Invoice
                            </h6>
                            <p className="text-white">Create a new Billing</p>
                          </div>
                        </Link>
                      </li>
                      <li>
                        <Link
                        to="#"
                          className="dropdown-item rounded-1 d-flex align-items-center"
                          data-bs-toggle="modal"
                          data-bs-target="#add_note_modal"
                        >
                          <span className="avatar avatar-md bg-gray-800 flex-shrink-0 me-2">
                            <i className="ti ti-file-description" />
                          </span>
                          <div>
                            <h6 className="fw-medium text-white mb-1">Notes</h6>
                            <p className="text-white">
                              Create new note for you &amp; team
                            </p>
                          </div>
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="#"
                          className="dropdown-item rounded-1 d-flex align-items-center"
                        >
                          <span className="avatar avatar-md bg-gray-800 flex-shrink-0 me-2">
                            <i className="ti ti-folder-open" />
                          </span>
                          <div>
                            <h6 className="fw-medium text-white mb-1">
                              Add Files
                            </h6>
                            <p className="text-white">
                              Upload New files for this Client
                            </p>
                          </div>
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div> */}
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
      {/* /Page Wrapper */}
      {/* Add Team Members */}
      <div className="modal fade" id="add_team_members_modal" role="dialog">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Add Team Members</h5>
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
                <label className="form-label">Select Members</label>
                <Select
                  isMulti
                  className="basic-multi-select"
                  classNamePrefix="select"
                  options={memberSelectOptions}
                  value={memberSelectOptions.filter((opt) => selectedMembers.includes(opt.value))}
                  onChange={(opts) => setSelectedMembers((opts || []).map((opt) => opt.value))}
                  placeholder={
                    employeeOptions.length === 0 ? 'No employees available' : 'Select members'
                  }
                  isDisabled={employeeOptions.length === 0}
                />
              </div>
              {memberModalError && (
                <div className="alert alert-danger" role="alert">
                  {memberModalError}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline-light border me-2"
                data-bs-dismiss="modal"
                disabled={isSavingMembers}
                onClick={resetTeamMembersModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveTeamMembers}
                disabled={isSavingMembers || selectedMembers.length === 0}
              >
                {isSavingMembers ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* /Add Team Members */}
      {/* Add Team Leads */}
      <div className="modal fade" id="add_team_leads_modal" role="dialog">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Add Team Lead(s)</h5>
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
                <label className="form-label">Select Team Lead(s)</label>
                <Select
                  isMulti
                  className="basic-multi-select"
                  classNamePrefix="select"
                  options={memberSelectOptions}
                  value={memberSelectOptions.filter((opt) => selectedLeads.includes(opt.value))}
                  onChange={(opts) => setSelectedLeads((opts || []).map((opt) => opt.value))}
                  placeholder={
                    employeeOptions.length === 0 ? 'No employees available' : 'Select team lead(s)'
                  }
                  isDisabled={employeeOptions.length === 0}
                />
              </div>
              {leadModalError && (
                <div className="alert alert-danger" role="alert">
                  {leadModalError}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline-light border me-2"
                data-bs-dismiss="modal"
                disabled={isSavingLeads}
                onClick={resetTeamLeadsModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveTeamLeads}
                disabled={isSavingLeads || selectedLeads.length === 0}
              >
                {isSavingLeads ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* /Add Team Leads */}
      {/* Add Project Managers */}
      <div className="modal fade" id="add_project_managers_modal" role="dialog">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Add Project Manager(s)</h5>
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
                <label className="form-label">Select Project Manager(s)</label>
                <Select
                  isMulti
                  className="basic-multi-select"
                  classNamePrefix="select"
                  options={memberSelectOptions}
                  value={memberSelectOptions.filter((opt) => selectedManagers.includes(opt.value))}
                  onChange={(opts) => setSelectedManagers((opts || []).map((opt) => opt.value))}
                  placeholder={
                    employeeOptions.length === 0
                      ? 'No employees available'
                      : 'Select project manager(s)'
                  }
                  isDisabled={employeeOptions.length === 0}
                />
              </div>
              {managerModalError && (
                <div className="alert alert-danger" role="alert">
                  {managerModalError}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline-light border me-2"
                data-bs-dismiss="modal"
                disabled={isSavingManagers}
                onClick={resetProjectManagersModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveProjectManagers}
                disabled={isSavingManagers || selectedManagers.length === 0}
              >
                {isSavingManagers ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* /Add Project Managers */}
      {/* Add Note */}
      <div className="modal fade" id="add_note_modal" role="dialog">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Add Note</h5>
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
              {noteModalError && (
                <div className="alert alert-danger mb-3" role="alert">
                  {noteModalError}
                </div>
              )}
              <div className="mb-3">
                <label className="form-label">
                  Title <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  name="noteTitle"
                  className={`form-control ${noteFieldErrors.noteTitle ? 'is-invalid' : ''}`}
                  value={noteTitle}
                  onChange={(e) => {
                    setNoteTitle(e.target.value);
                    clearNoteFieldError('noteTitle');
                  }}
                  onBlur={(e) => handleNoteFieldBlur('noteTitle', e.target.value)}
                  placeholder="Enter note title (minimum 3 characters)"
                />
                {noteFieldErrors.noteTitle && (
                  <div className="invalid-feedback d-block">{noteFieldErrors.noteTitle}</div>
                )}
              </div>
              <div className="mb-3">
                <label className="form-label">
                  Content <span className="text-danger">*</span>
                </label>
                <textarea
                  name="noteContent"
                  className={`form-control ${noteFieldErrors.noteContent ? 'is-invalid' : ''}`}
                  rows={5}
                  value={noteContent}
                  onChange={(e) => {
                    setNoteContent(e.target.value);
                    clearNoteFieldError('noteContent');
                  }}
                  onBlur={(e) => handleNoteFieldBlur('noteContent', e.target.value)}
                  placeholder="Enter note content (minimum 10 characters)"
                />
                {noteFieldErrors.noteContent && (
                  <div className="invalid-feedback d-block">{noteFieldErrors.noteContent}</div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline-light border me-2"
                data-bs-dismiss="modal"
                disabled={isSavingNote}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveNote}
                disabled={isSavingNote}
              >
                {isSavingNote ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* /Add Note */}
      {/* Edit Note */}
      <div className="modal fade" id="edit_note_modal" role="dialog">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Edit Note</h5>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={closeEditNoteModal}
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="modal-body">
              {editNoteModalError && (
                <div className="alert alert-danger alert-dismissible fade show mb-3" role="alert">
                  <i className="ti ti-alert-circle me-2"></i>
                  {editNoteModalError}
                </div>
              )}
              <div className="mb-3">
                <label className="form-label">
                  Title <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  name="editNoteTitle"
                  className={`form-control ${editNoteFieldErrors.editNoteTitle ? 'is-invalid' : ''}`}
                  value={editNoteTitle}
                  onChange={(e) => {
                    setEditNoteTitle(e.target.value);
                    clearEditNoteFieldError('editNoteTitle');
                  }}
                  onBlur={(e) => handleEditNoteFieldBlur('editNoteTitle', e.target.value)}
                  placeholder="Enter note title (minimum 3 characters)"
                />
                {editNoteFieldErrors.editNoteTitle && (
                  <div className="invalid-feedback d-block">
                    {editNoteFieldErrors.editNoteTitle}
                  </div>
                )}
              </div>
              <div className="mb-3">
                <label className="form-label">
                  Content <span className="text-danger">*</span>
                </label>
                <textarea
                  name="editNoteContent"
                  className={`form-control ${editNoteFieldErrors.editNoteContent ? 'is-invalid' : ''}`}
                  rows={5}
                  value={editNoteContent}
                  onChange={(e) => {
                    setEditNoteContent(e.target.value);
                    clearEditNoteFieldError('editNoteContent');
                  }}
                  onBlur={(e) => handleEditNoteFieldBlur('editNoteContent', e.target.value)}
                  placeholder="Enter note content (minimum 10 characters)"
                />
                {editNoteFieldErrors.editNoteContent && (
                  <div className="invalid-feedback d-block">
                    {editNoteFieldErrors.editNoteContent}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline-light border me-2"
                data-bs-dismiss="modal"
                onClick={closeEditNoteModal}
                disabled={isSavingEditNote}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveEditNote}
                disabled={isSavingEditNote}
              >
                {isSavingEditNote ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* /Edit Note */}
      {/* Delete Note Modal */}
      <div className="modal fade" id="delete_note_modal">
        <div className="modal-dialog modal-dialog-centered modal-sm">
          <div className="modal-content">
            <div className="modal-body">
              <div className="text-center p-3">
                <span className="avatar avatar-lg avatar-rounded bg-danger mb-3">
                  <i className="ti ti-trash fs-24" />
                </span>
                <h5 className="mb-2">Delete Note</h5>
                {deletingNote && (
                  <>
                    <div className="bg-light p-3 rounded mb-3">
                      <h6 className="mb-1">{deletingNote.title}</h6>
                      <p className="mb-0 text-muted small">
                        {deletingNote.content && deletingNote.content.length > 50
                          ? deletingNote.content.substring(0, 50) + '...'
                          : deletingNote.content}
                      </p>
                    </div>
                    <div className="text-start mb-3">
                      <p className="text-danger fw-medium mb-2" style={{ fontSize: '13px' }}>
                        This action is permanent. This note will be removed.
                      </p>
                      <label className="form-label text-muted" style={{ fontSize: '13px' }}>
                        Type <strong>{deletingNote.title}</strong> to confirm deletion:
                      </label>
                      <input
                        type="text"
                        className={`form-control form-control-sm ${
                          confirmNoteTitle &&
                          confirmNoteTitle.trim().toLowerCase() !==
                            deletingNote.title.trim().toLowerCase()
                            ? 'is-invalid'
                            : ''
                        } ${
                          confirmNoteTitle.trim().toLowerCase() ===
                          deletingNote.title.trim().toLowerCase()
                            ? 'is-valid'
                            : ''
                        }`}
                        placeholder={`Type "${deletingNote.title}" to confirm`}
                        value={confirmNoteTitle}
                        onChange={(e) => setConfirmNoteTitle(e.target.value)}
                        autoComplete="off"
                      />
                      {confirmNoteTitle &&
                        confirmNoteTitle.trim().toLowerCase() !==
                          deletingNote.title.trim().toLowerCase() && (
                          <div className="invalid-feedback">Title does not match</div>
                        )}
                    </div>
                  </>
                )}
                <div className="d-flex gap-2 justify-content-center">
                  <button
                    type="button"
                    className="btn btn-light"
                    data-bs-dismiss="modal"
                    disabled={isDeletingNote}
                    onClick={() => {
                      setDeletingNote(null);
                      setConfirmNoteTitle('');
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteNote}
                    className="btn btn-danger"
                    disabled={
                      isDeletingNote ||
                      !deletingNote ||
                      confirmNoteTitle.trim().toLowerCase() !==
                        deletingNote.title.trim().toLowerCase()
                    }
                  >
                    {isDeletingNote ? 'Deleting...' : 'Delete Note'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* /Delete Note Modal */}
      {/* Add Sub-Contract */}
      <div className="modal fade" id="add_subcontract_modal" role="dialog">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header header-border align-items-center">
              <h5 className="modal-title">Add Sub-Contract</h5>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={closeAddSubContractModal}
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="modal-body">
              {subContractModalError && (
                <div className="alert alert-danger alert-dismissible fade show" role="alert">
                  <i className="ti ti-alert-circle me-2"></i>
                  {subContractModalError}
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setSubContractModalError(null)}
                  ></button>
                </div>
              )}
              <div className="row">
                <div className="col-md-12">
                  <div className="mb-3">
                    <label className="form-label">
                      Contract Name <span className="text-danger">*</span>
                    </label>
                    <CommonSelect
                      className={`select ${subContractFieldErrors.subContractName ? 'is-invalid' : ''}`}
                      options={[
                        { value: '', label: 'Select Sub-Contract' },
                        ...availableSubContracts.map((sc) => ({
                          value: sc.name,
                          label: sc.contractId
                            ? `${sc.name} (${sc.contractId.toUpperCase()})`
                            : sc.name,
                        })),
                      ]}
                      value={
                        subContractName
                          ? {
                              value: subContractName,
                              label: availableSubContracts.find((sc) => sc.name === subContractName)
                                ?.contractId
                                ? `${subContractName} (${availableSubContracts.find((sc) => sc.name === subContractName)?.contractId.toUpperCase()})`
                                : subContractName,
                            }
                          : { value: '', label: 'Select Sub-Contract' }
                      }
                      onChange={(option) => {
                        setSubContractName(option?.value || '');
                        clearSubContractFieldError('subContractName');
                      }}
                    />
                    {subContractFieldErrors.subContractName && (
                      <div className="invalid-feedback d-block">
                        {subContractFieldErrors.subContractName}
                      </div>
                    )}
                  </div>
                </div>
                <div className="col-md-12">
                  <div className="mb-3">
                    <label className="form-label">
                      Contract Date <span className="text-danger">*</span>
                    </label>
                    <div className="input-icon position-relative">
                      <DatePicker
                        className={`form-control datetimepicker ${subContractFieldErrors.subContractDate ? 'is-invalid' : ''}`}
                        format="DD-MM-YYYY"
                        value={subContractDate}
                        onChange={(date) => {
                          setSubContractDate(date);
                          clearSubContractFieldError('subContractDate');
                        }}
                        getPopupContainer={() =>
                          document.getElementById('add_subcontract_modal') || document.body
                        }
                      />
                      <span className="input-icon-addon">
                        <i className="ti ti-calendar" />
                      </span>
                    </div>
                    {subContractFieldErrors.subContractDate && (
                      <div className="invalid-feedback d-block">
                        {subContractFieldErrors.subContractDate}
                      </div>
                    )}
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">
                      Number of Members <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      className={`form-control ${subContractFieldErrors.subContractMembers ? 'is-invalid' : ''}`}
                      placeholder="Enter number of members"
                      min="1"
                      value={subContractMembers}
                      onChange={(e) => {
                        setSubContractMembers(e.target.value);
                        clearSubContractFieldError('subContractMembers');
                      }}
                    />
                    {subContractFieldErrors.subContractMembers && (
                      <div className="invalid-feedback">
                        {subContractFieldErrors.subContractMembers}
                      </div>
                    )}
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">
                      Total Amount <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      className={`form-control ${subContractFieldErrors.subContractAmount ? 'is-invalid' : ''}`}
                      placeholder="Enter total amount"
                      min="0"
                      step="0.01"
                      value={subContractAmount}
                      onChange={(e) => {
                        setSubContractAmount(e.target.value);
                        clearSubContractFieldError('subContractAmount');
                      }}
                    />
                    {subContractFieldErrors.subContractAmount && (
                      <div className="invalid-feedback">
                        {subContractFieldErrors.subContractAmount}
                      </div>
                    )}
                  </div>
                </div>
                <div className="col-md-12">
                  <div className="mb-3">
                    <label className="form-label">Description (Optional)</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      placeholder="Enter description"
                      value={subContractDescription}
                      onChange={(e) => setSubContractDescription(e.target.value)}
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
                onClick={closeAddSubContractModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveSubContract}
                disabled={isSavingSubContract}
              >
                {isSavingSubContract ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Saving...
                  </>
                ) : (
                  'Save Sub-Contract'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* /Add Sub-Contract */}
      {/* Edit Sub-Contract */}
      <div className="modal fade" id="edit_subcontract_modal" role="dialog">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header header-border align-items-center">
              <h5 className="modal-title">Edit Sub-Contract</h5>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={closeEditSubContractModal}
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="modal-body">
              {editSubContractModalError && (
                <div className="alert alert-danger alert-dismissible fade show" role="alert">
                  <i className="ti ti-alert-circle me-2"></i>
                  {editSubContractModalError}
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setEditSubContractModalError(null)}
                  ></button>
                </div>
              )}
              <div className="row">
                <div className="col-md-12">
                  <div className="mb-3">
                    <label className="form-label">Sub-Contract</label>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control bg-light"
                        value={editingSubContract?.contractName || 'Not Linked'}
                        readOnly
                      />
                      {editingSubContract?.contractId && (
                        <span className="input-group-text bg-info text-white">
                          {editingSubContract.contractId.toUpperCase()}
                        </span>
                      )}
                    </div>
                    {!editingSubContract?.contractName && (
                      <small className="text-warning d-block mt-1">
                        <i className="ti ti-alert-circle me-1"></i>
                        This sub-contract is not linked to a SubContract record. Please delete and
                        create a new one with proper linking.
                      </small>
                    )}
                  </div>
                </div>
                <div className="col-md-12">
                  <div className="mb-3">
                    <label className="form-label">
                      Contract Date <span className="text-danger">*</span>
                    </label>
                    <div className="input-icon position-relative">
                      <DatePicker
                        className={`form-control datetimepicker ${editSubContractFieldErrors.subContractDate ? 'is-invalid' : ''}`}
                        format="DD-MM-YYYY"
                        value={editSubContractDate}
                        onChange={(date) => {
                          setEditSubContractDate(date);
                          clearEditSubContractFieldError('subContractDate');
                        }}
                        getPopupContainer={() =>
                          document.getElementById('edit_subcontract_modal') || document.body
                        }
                      />
                      <span className="input-icon-addon">
                        <i className="ti ti-calendar" />
                      </span>
                    </div>
                    {editSubContractFieldErrors.subContractDate && (
                      <div className="invalid-feedback d-block">
                        {editSubContractFieldErrors.subContractDate}
                      </div>
                    )}
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">
                      Number of Members <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      className={`form-control ${editSubContractFieldErrors.subContractMembers ? 'is-invalid' : ''}`}
                      placeholder="Enter number of members"
                      min="1"
                      value={editSubContractMembers}
                      onChange={(e) => {
                        setEditSubContractMembers(e.target.value);
                        clearEditSubContractFieldError('subContractMembers');
                      }}
                    />
                    {editSubContractFieldErrors.subContractMembers && (
                      <div className="invalid-feedback">
                        {editSubContractFieldErrors.subContractMembers}
                      </div>
                    )}
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">
                      Total Amount <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      className={`form-control ${editSubContractFieldErrors.subContractAmount ? 'is-invalid' : ''}`}
                      placeholder="Enter total amount"
                      min="0"
                      step="0.01"
                      value={editSubContractAmount}
                      onChange={(e) => {
                        setEditSubContractAmount(e.target.value);
                        clearEditSubContractFieldError('subContractAmount');
                      }}
                    />
                    {editSubContractFieldErrors.subContractAmount && (
                      <div className="invalid-feedback">
                        {editSubContractFieldErrors.subContractAmount}
                      </div>
                    )}
                  </div>
                </div>
                <div className="col-md-12">
                  <div className="mb-3">
                    <label className="form-label">Description (Optional)</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      placeholder="Enter description"
                      value={editSubContractDescription}
                      onChange={(e) => setEditSubContractDescription(e.target.value)}
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
                onClick={closeEditSubContractModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveEditSubContract}
                disabled={isSavingEditSubContract}
              >
                {isSavingEditSubContract ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Updating...
                  </>
                ) : (
                  'Update Sub-Contract'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* /Edit Sub-Contract */}
      {/* Delete Sub-Contract Modal */}
      <div className="modal fade" id="delete_subcontract_modal">
        <div className="modal-dialog modal-dialog-centered modal-sm">
          <div className="modal-content">
            <div className="modal-header border-0 justify-content-center pb-0">
              <div className="avatar avatar-xl bg-danger-light rounded-circle">
                <i className="ti ti-trash-x text-danger fs-20" />
              </div>
            </div>
            <div className="modal-body text-center pt-3 pb-0">
              <h4 className="mb-2">Delete Sub-Contract?</h4>
              <p className="mb-3">
                Are you sure you want to delete <strong>{deletingSubContract?.contractName}</strong>
                ? This action cannot be undone.
              </p>
              <div className="mb-3">
                <label className="form-label">
                  Type contract name to confirm:{' '}
                  <strong>{deletingSubContract?.contractName}</strong>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter contract name"
                  value={confirmSubContractName}
                  onChange={(e) => setConfirmSubContractName(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer border-0 justify-content-center">
              <button
                type="button"
                className="btn btn-light me-2"
                data-bs-dismiss="modal"
                onClick={() => {
                  setDeletingSubContract(null);
                  setConfirmSubContractName('');
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteSubContract}
                disabled={
                  isDeletingSubContract ||
                  confirmSubContractName !== deletingSubContract?.contractName
                }
              >
                {isDeletingSubContract ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* /Delete Sub-Contract Modal */}
      {/* Edit Project */}
      <div className="modal fade" id="edit_project" role="dialog">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header header-border align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                <h5 className="modal-title me-2">Edit Project </h5>
                <p className="text-dark">Project ID : {project.projectId || 'N/A'}</p>
              </div>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="add-info-fieldset ">
              <div className="contact-grids-tab p-3 pb-0">
                <ul className="nav nav-underline" id="myTab1" role="tablist">
                  <li className="nav-item" role="presentation">
                    <button
                      className="nav-link active"
                      id="basic-tab1"
                      data-bs-toggle="tab"
                      data-bs-target="#basic-info1"
                      type="button"
                      role="tab"
                      aria-selected="true"
                    >
                      Basic Information
                    </button>
                  </li>
                  <li className="nav-item" role="presentation">
                    <button
                      className="nav-link"
                      id="member-tab1"
                      data-bs-toggle="tab"
                      data-bs-target="#member1"
                      type="button"
                      role="tab"
                      aria-selected="false"
                    >
                      Members
                    </button>
                  </li>
                </ul>
              </div>
              <div className="tab-content" id="myTabContent1">
                <div
                  className="tab-pane fade show active"
                  id="basic-info1"
                  role="tabpanel"
                  aria-labelledby="basic-tab1"
                  tabIndex={0}
                >
                  <form onSubmit={(e) => e.preventDefault()}>
                    <div className="modal-body">
                      {editModalError && (
                        <div className="alert alert-danger" role="alert">
                          {editModalError}
                        </div>
                      )}
                      <div className="row">
                        <div className="col-md-12">
                          <div className="mb-3">
                            <label className="form-label">
                              Project Name <span className="text-danger">*</span>
                            </label>
                            <input
                              type="text"
                              name="name"
                              className={`form-control ${fieldErrors.name ? 'is-invalid' : ''}`}
                              value={editName}
                              onChange={(e) => {
                                setEditName(e.target.value);
                                clearFieldError('name');
                              }}
                              placeholder="Enter project name"
                            />
                            {fieldErrors.name && (
                              <div className="invalid-feedback d-block">{fieldErrors.name}</div>
                            )}
                          </div>
                        </div>
                        <div className="col-md-12">
                          <div className="mb-3">
                            <label className="form-label">
                              Client <span className="text-danger">*</span>
                            </label>
                            <div id="client" className={fieldErrors.client ? 'is-invalid' : ''}>
                              <CommonSelect
                                className="select"
                                options={clientChoose}
                                value={clientChoose.find((c) => c.value === editClient) || null}
                                onChange={(opt: any) => {
                                  setEditClient(opt?.value || '');
                                  clearFieldError('client');
                                }}
                              />
                            </div>
                            {fieldErrors.client && (
                              <div className="invalid-feedback d-block">{fieldErrors.client}</div>
                            )}
                          </div>
                        </div>
                        <div className="col-md-12">
                          <div className="row">
                            <div className="col-md-6">
                              <div className="mb-3">
                                <label className="form-label">
                                  Start Date <span className="text-danger">*</span>
                                </label>
                                <div className="input-icon-end position-relative" id="startDate">
                                  <DatePicker
                                    className={`form-control datetimepicker ${fieldErrors.startDate ? 'is-invalid' : ''}`}
                                    format={{
                                      format: 'DD-MM-YYYY',
                                      type: 'mask',
                                    }}
                                    getPopupContainer={getModalContainer}
                                    placeholder="DD-MM-YYYY"
                                    value={editStartDate}
                                    onChange={(val) => {
                                      setEditStartDate(val);
                                      clearFieldError('startDate');
                                    }}
                                  />
                                  <span className="input-icon-addon">
                                    <i className="ti ti-calendar text-gray-7" />
                                  </span>
                                </div>
                                {fieldErrors.startDate && (
                                  <div className="invalid-feedback d-block">
                                    {fieldErrors.startDate}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="col-md-6">
                              <div className="mb-3">
                                <label className="form-label">
                                  End Date <span className="text-danger">*</span>
                                </label>
                                <div className="input-icon-end position-relative" id="endDate">
                                  <DatePicker
                                    className={`form-control datetimepicker ${fieldErrors.endDate ? 'is-invalid' : ''}`}
                                    format={{
                                      format: 'DD-MM-YYYY',
                                      type: 'mask',
                                    }}
                                    getPopupContainer={getModalContainer}
                                    placeholder="DD-MM-YYYY"
                                    value={editEndDate}
                                    onChange={(val) => {
                                      setEditEndDate(val);
                                      clearFieldError('endDate');
                                    }}
                                  />
                                  <span className="input-icon-addon">
                                    <i className="ti ti-calendar text-gray-7" />
                                  </span>
                                </div>
                                {fieldErrors.endDate && (
                                  <div className="invalid-feedback d-block">
                                    {fieldErrors.endDate}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="col-md-6">
                              <div className="mb-3">
                                <label className="form-label">
                                  Priority <span className="text-danger">*</span>
                                </label>
                                <div
                                  id="priority"
                                  className={fieldErrors.priority ? 'is-invalid' : ''}
                                >
                                  <CommonSelect
                                    className="select"
                                    options={priorityChoose}
                                    value={
                                      priorityChoose.find((p) => p.value === editPriority) || null
                                    }
                                    onChange={(opt: any) => {
                                      setEditPriority(opt?.value || 'Medium');
                                      clearFieldError('priority');
                                    }}
                                  />
                                </div>
                                {fieldErrors.priority && (
                                  <div className="invalid-feedback d-block">
                                    {fieldErrors.priority}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="col-md-6">
                              <div className="mb-3">
                                <label className="form-label">
                                  Project Value ($) <span className="text-danger">*</span>
                                </label>
                                <input
                                  type="number"
                                  name="projectValue"
                                  className={`form-control ${fieldErrors.projectValue ? 'is-invalid' : ''}`}
                                  value={editValue}
                                  onChange={(e) => {
                                    setEditValue(e.target.value);
                                    clearFieldError('projectValue');
                                  }}
                                  placeholder="Enter project value"
                                  min="0"
                                  step="0.01"
                                />
                                {fieldErrors.projectValue && (
                                  <div className="invalid-feedback d-block">
                                    {fieldErrors.projectValue}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-12">
                          <div className="mb-3">
                            <label className="form-label">
                              Description <span className="text-danger">*</span>
                            </label>
                            <textarea
                              name="description"
                              id="description"
                              className={`form-control ${fieldErrors.description ? 'is-invalid' : ''}`}
                              rows={5}
                              value={editDescription}
                              onChange={(e) => {
                                setEditDescription(e.target.value);
                                clearFieldError('description');
                              }}
                              placeholder="Enter project description"
                            />
                            {fieldErrors.description && (
                              <div className="invalid-feedback d-block">
                                {fieldErrors.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="modal-footer">
                      <div className="d-flex align-items-center justify-content-end">
                        <button
                          type="button"
                          className="btn btn-outline-light border me-2"
                          data-bs-dismiss="modal"
                        >
                          Cancel
                        </button>
                        <button
                          className="btn btn-primary"
                          type="button"
                          onClick={handleEditProjectSave}
                          disabled={isSavingProject}
                        >
                          {isSavingProject ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
                <div
                  className="tab-pane fade"
                  id="member1"
                  role="tabpanel"
                  aria-labelledby="member-tab1"
                  tabIndex={0}
                >
                  <form onSubmit={(e) => e.preventDefault()}>
                    <div className="modal-body">
                      {editModalError && (
                        <div className="alert alert-danger" role="alert">
                          {editModalError}
                        </div>
                      )}
                      <div className="row">
                        <div className="col-md-12">
                          <div className="mb-3">
                            <label className="form-label me-2">Team Members</label>
                            <Select
                              isMulti
                              className="basic-multi-select"
                              classNamePrefix="select"
                              options={memberSelectOptions}
                              value={memberSelectOptions.filter((opt) =>
                                editTeamMembers.includes(opt.value)
                              )}
                              onChange={(opts) =>
                                setEditTeamMembers((opts || []).map((opt) => opt.value))
                              }
                              placeholder={
                                employeeOptions.length === 0
                                  ? 'No employees available'
                                  : 'Select team members'
                              }
                              isDisabled={employeeOptions.length === 0}
                            />
                          </div>
                        </div>
                        <div className="col-md-12">
                          <div className="mb-3">
                            <label className="form-label me-2">Team Leader</label>
                            <Select
                              isMulti
                              className="basic-multi-select"
                              classNamePrefix="select"
                              options={memberSelectOptions}
                              value={memberSelectOptions.filter((opt) =>
                                editTeamLeaders.includes(opt.value)
                              )}
                              onChange={(opts) =>
                                setEditTeamLeaders((opts || []).map((opt) => opt.value))
                              }
                              placeholder={
                                employeeOptions.length === 0
                                  ? 'No employees available'
                                  : 'Select team leaders'
                              }
                              isDisabled={employeeOptions.length === 0}
                            />
                          </div>
                        </div>
                        <div className="col-md-12">
                          <div className="mb-3">
                            <label className="form-label me-2">Project Manager</label>
                            <Select
                              isMulti
                              className="basic-multi-select"
                              classNamePrefix="select"
                              options={memberSelectOptions}
                              value={memberSelectOptions.filter((opt) =>
                                editProjectManagers.includes(opt.value)
                              )}
                              onChange={(opts) =>
                                setEditProjectManagers((opts || []).map((opt) => opt.value))
                              }
                              placeholder={
                                employeeOptions.length === 0
                                  ? 'No employees available'
                                  : 'Select project managers'
                              }
                              isDisabled={employeeOptions.length === 0}
                            />
                          </div>
                        </div>
                        <div className="col-md-12">
                          <div className="mb-3">
                            <label className="form-label">Tags</label>
                            <CommonTagsInput
                              value={editTags}
                              onChange={(tags) => {
                                console.log('[ProjectDetails] Tags changed:', tags);
                                console.log('[ProjectDetails] Number of tags:', tags.length);
                                console.log(
                                  '[ProjectDetails] Tag details:',
                                  tags.map((t, i) => ({
                                    index: i,
                                    value: t,
                                    type: typeof t,
                                    length: t.length,
                                  }))
                                );
                                setEditTags(tags);
                              }}
                              placeholder="Add new tag"
                              className="custom-input-class"
                            />
                          </div>
                        </div>
                        <div className="col-md-12">
                          <div className="mb-3">
                            <label className="form-label">Status</label>
                            <CommonSelect
                              className="select"
                              options={statusChoose}
                              value={
                                statusChoose.find((s) => s.value === editStatus) || statusChoose[0]
                              }
                              onChange={(opt: any) => setEditStatus(opt?.value || 'Active')}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="modal-footer">
                      <div className="d-flex align-items-center justify-content-end">
                        <button
                          type="button"
                          className="btn btn-outline-light border me-2"
                          data-bs-dismiss="modal"
                          disabled={isSavingProject}
                        >
                          Cancel
                        </button>
                        <button
                          className="btn btn-primary"
                          type="button"
                          onClick={handleEditProjectMembersSave}
                          disabled={isSavingProject}
                        >
                          {isSavingProject ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* /Edit Project */}
      {/* Add Project Success */}
      <div className="modal fade" id="success_modal" role="dialog">
        <div className="modal-dialog modal-dialog-centered modal-sm">
          <div className="modal-content">
            <div className="modal-body">
              <div className="text-center p-3">
                <span className="avatar avatar-lg avatar-rounded bg-success mb-3">
                  <i className="ti ti-check fs-24" />
                </span>
                <h5 className="mb-2">Project Added Successfully</h5>
                <p className="mb-3">
                  Stephan Peralt has been added with Client ID :{' '}
                  <span className="text-primary">#pro - 0004</span>
                </p>
                <div>
                  <div className="row g-2">
                    <div className="col-6">
                      <Link to={all_routes.projectlist} className="btn btn-dark w-100">
                        Back to List
                      </Link>
                    </div>
                    <div className="col-6">
                      <Link to={all_routes.projectdetails} className="btn btn-primary w-100">
                        Detail Page
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* /Add Project Success */}
      {/* Edit task */}
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
                          if (value) {
                            handleTaskFieldBlur('taskDueDate', value);
                          }
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
      {/* /Edit task */}
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
                {deletingTask && (
                  <>
                    <div className="bg-light p-3 rounded mb-3">
                      <h6 className="mb-1">{deletingTask.title}</h6>
                      <p className="mb-1 text-muted">
                        Status: <span className="badge badge-soft-info">{deletingTask.status}</span>
                      </p>
                      <p className="mb-0 text-muted">
                        Priority:{' '}
                        <span className="badge badge-soft-warning">{deletingTask.priority}</span>
                      </p>
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
                          confirmTaskTitle &&
                          confirmTaskTitle.trim().toLowerCase() !==
                            deletingTask.title.trim().toLowerCase()
                            ? 'is-invalid'
                            : ''
                        } ${
                          confirmTaskTitle.trim().toLowerCase() ===
                          deletingTask.title.trim().toLowerCase()
                            ? 'is-valid'
                            : ''
                        }`}
                        placeholder={`Type "${deletingTask.title}" to confirm`}
                        value={confirmTaskTitle}
                        onChange={(e) => setConfirmTaskTitle(e.target.value)}
                        autoComplete="off"
                      />
                      {confirmTaskTitle &&
                        confirmTaskTitle.trim().toLowerCase() !==
                          deletingTask.title.trim().toLowerCase() && (
                          <div className="invalid-feedback">Title does not match</div>
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
                      setConfirmTaskTitle('');
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
                      confirmTaskTitle.trim().toLowerCase() !==
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
      {/* task Details */}
      <div className="modal fade" id="view_todo">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header bg-dark">
              <h4 className="modal-title text-white">{viewingTask?.title || 'Task Details'}</h4>
              {viewingTask?.priority && (
                <span
                  className={`badge d-inline-flex align-items-center ms-2 ${
                    viewingTask.priority === 'High'
                      ? 'badge-danger'
                      : viewingTask.priority === 'Medium'
                        ? 'badge-warning'
                        : 'badge-success'
                  }`}
                >
                  <i className="ti ti-point-filled me-1" />
                  {viewingTask.priority}
                </span>
              )}
              <button
                type="button"
                className="btn-close custom-btn-close bg-transparent fs-16 text-white position-static ms-auto"
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={() => setViewingTask(null)}
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="modal-body">
              <div className="border rounded mb-3 p-3">
                <div className="row row-gap-3">
                  <div className="col-md-4">
                    <div className="text-center">
                      <span className="d-block mb-1 text-muted">Created On</span>
                      <p className="text-dark mb-0">
                        {viewingTask?.createdAt
                          ? new Date(viewingTask.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="text-center">
                      <span className="d-block mb-1 text-muted">Last Updated</span>
                      <p className="text-dark mb-0">
                        {viewingTask?.updatedAt
                          ? new Date(viewingTask.updatedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="text-center">
                      <span className="d-block mb-1 text-muted">Status</span>
                      {viewingTask?.status && (
                        <span
                          className={`badge d-inline-flex align-items-center ${
                            viewingTask.status.toLowerCase() === 'completed'
                              ? 'badge-soft-success'
                              : viewingTask.status.toLowerCase() === 'inprogress'
                                ? 'badge-soft-primary'
                                : viewingTask.status.toLowerCase() === 'pending'
                                  ? 'badge-soft-warning'
                                  : viewingTask.status.toLowerCase() === 'onhold'
                                    ? 'badge-soft-danger'
                                    : 'badge-soft-secondary'
                          }`}
                        >
                          <i className="fas fa-circle fs-6 me-1" />
                          {taskStatuses.find((s) => s.key === viewingTask.status.toLowerCase())
                            ?.name || viewingTask.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {viewingTask?.description && (
                <div className="mb-3">
                  <h5 className="mb-2">Description</h5>
                  <p className="text-muted">{viewingTask.description}</p>
                </div>
              )}
              {viewingTask?.tags && viewingTask.tags.length > 0 && (
                <div className="mb-3">
                  <h5 className="mb-2">Tags</h5>
                  <div className="d-flex align-items-center flex-wrap gap-2">
                    {viewingTask.tags.map((tag: string, index: number) => (
                      <span
                        key={index}
                        className={`badge ${
                          index % 4 === 0
                            ? 'badge-danger'
                            : index % 4 === 1
                              ? 'badge-success'
                              : index % 4 === 2
                                ? 'badge-info'
                                : 'badge-warning'
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {viewingTask?.assignee && viewingTask.assignee.length > 0 && (
                <div className="mb-3">
                  <h5 className="mb-2">Assignees</h5>
                  <div className="d-flex flex-column gap-2">
                    {viewingTask.assignee.map((assignee: any, index: number) => {
                      // Handle both populated objects and ID strings
                      let member = null;

                      if (typeof assignee === 'object' && assignee !== null) {
                        // Assignee is already a populated object
                        member = assignee;
                      } else {
                        // Assignee is an ID string, search in team members and leaders
                        const assigneeId = assignee.toString();
                        const allMembers = [
                          ...(project?.teamMembers || []),
                          ...(project?.teamLeader || []),
                        ];
                        member = allMembers.find(
                          (m: any) =>
                            m._id?.toString() === assigneeId || m.employeeId === assigneeId
                        );
                      }

                      return member ? (
                        <div key={index} className="d-flex align-items-center bg-light p-2 rounded">
                          <span
                            className="avatar avatar-sm avatar-rounded me-2"
                            title={`${member.firstName} ${member.lastName}${member.employeeId ? ` (${member.employeeId})` : ''}`}
                          >
                            {member.profileImage ? (
                              <ImageWithBasePath src={member.profileImage} alt="img" />
                            ) : (
                              <span
                                className="avatar-title bg-purple"
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
                          <div>
                            <h6 className="mb-0">
                              {member.firstName || 'Unknown'} {member.lastName || ''}
                            </h6>
                            {member.employeeId && (
                              <small className="text-muted">{member.employeeId}</small>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div key={index} className="d-flex align-items-center bg-light p-2 rounded">
                          <span className="avatar avatar-sm avatar-rounded me-2">
                            <span
                              className="avatar-title bg-secondary"
                              style={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '50%',
                              }}
                            >
                              ?
                            </span>
                          </span>
                          <div>
                            <h6 className="mb-0">Unknown Employee</h6>
                            <small className="text-muted">
                              ID: {typeof assignee === 'string' ? assignee : assignee?._id}
                            </small>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {(!viewingTask?.assignee || viewingTask.assignee.length === 0) && (
                <div className="mb-3">
                  <h5 className="mb-2">Assignees</h5>
                  <p className="text-muted">No assignees</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* /task Details */}
      {/* Add Task */}
      <div className="modal fade" id="add_task">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Add New Task</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
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
                        onChange={(tags) => {
                          console.log('[ProjectDetails] Task tags changed:', tags);
                          console.log('[ProjectDetails] Task tags count:', tags.length);
                          setTaskTags(tags);
                        }}
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
                      />
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
      {/* /Add Todo */}
    </>
  );
};

export default ProjectDetails;
