import { DatePicker } from 'antd';
import dayjs from 'dayjs';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Select from 'react-select';
import { toast } from 'react-toastify';
import CollapseHeader from '../../../core/common/collapse-header/collapse-header';
import CommonSelect from '../../../core/common/commonSelect';
import Table from '../../../core/common/dataTable/index';
import Footer from '../../../core/common/footer';
import ImageWithBasePath from '../../../core/common/imageWithBasePath';
import CommonTagsInput from '../../../core/common/Taginput';
import { Project, useProjectsREST } from '../../../hooks/useProjectsREST';
import { useUserProfileREST } from '../../../hooks/useUserProfileREST';
import { get as apiGet } from '../../../services/api';
import { all_routes } from '../../router/all_routes';

interface ProjectStats {
  total: number;
  active: number;
  completed: number;
  onHold: number;
  overdue: number;
}

interface FormData {
  name: string;
  client: string;
  description: string;
  startDate: string;
  dueDate: string;
  status: string;
  priority: string;
  projectValue: string;
  teamMembers: Array<{ value: string; label: string }>;
  teamLeader: Array<{ value: string; label: string }>;
  projectManager: Array<{ value: string; label: string }>;
  tags: string[];
}

const initialFormData: FormData = {
  name: '',
  client: '',
  description: '',
  startDate: '',
  dueDate: '',
  status: 'Active',
  priority: 'Medium',
  projectValue: '',
  teamMembers: [],
  teamLeader: [],
  projectManager: [],
  tags: [],
};

const ProjectGrid = () => {
  const {
    projects: hookProjects,
    loading: hookLoading,
    error: hookError,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
  } = useProjectsREST();

  // Initialize user profile hook
  const { profile, isAdmin, isHR, isEmployee } = useUserProfileREST();

  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<ProjectStats>({
    total: 0,
    active: 0,
    completed: 0,
    onHold: 0,
    overdue: 0,
  });
  const [clients, setClients] = useState<Array<{ value: string; label: string }>>([]);
  const [employees, setEmployees] = useState<
    Array<{
      value: string;
      label: string;
      position: string;
      department: string;
      employeeId: string;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [confirmProjectName, setConfirmProjectName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(1);
  const [logo, setLogo] = useState<string | null>(null);
  const [imageUpload, setImageUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    client: 'all',
    search: '',
  });

  // View state - 'list' or 'grid'
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((value: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: value }));
    }, 500);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      status: 'all',
      priority: 'all',
      client: 'all',
      search: '',
    });
  }, []);

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'Active', label: 'Active' },
    { value: 'Completed', label: 'Completed' },
    { value: 'On Hold', label: 'On Hold' },
  ];

  const priorityOptions = [
    { value: 'all', label: 'All Priority' },
    { value: 'High', label: 'High' },
    { value: 'Medium', label: 'Medium' },
    { value: 'Low', label: 'Low' },
  ];

  const clientOptions = [
    { value: 'all', label: 'All Clients' },
    ...clients.map((client) => ({ value: client.label, label: client.label })),
  ];

  const getFilteredProjects = useCallback(() => {
    return projects;
  }, [projects]);

  const loadProjects = useCallback(
    async (filterParams: any = {}) => {
      setLoading(true);
      try {
        const filters: any = {};
        if (filterParams.status && filterParams.status !== 'all') {
          filters.status = filterParams.status;
        }
        if (filterParams.priority && filterParams.priority !== 'all') {
          filters.priority = filterParams.priority;
        }
        if (filterParams.client && filterParams.client !== 'all') {
          filters.client = filterParams.client;
        }
        if (filterParams.search) {
          filters.search = filterParams.search;
        }

        // Log employee filtering info if user is an employee
        if (profile && (profile.role === 'employee' || profile.role === 'hr') && '_id' in profile) {
          console.log('[Project] Fetching projects for employee:', {
            _id: profile._id,
            employeeId: profile.employeeId,
            role: profile.role,
            name: `${profile.firstName} ${profile.lastName}`,
          });
          console.log(
            '[Project] Backend will filter projects where employee is in teamMembers, teamLeader, or projectManager'
          );
        }

        await fetchProjects(filters);
      } catch (err) {
        setError('Failed to load projects');
        toast.error('Failed to load projects');
      } finally {
        setLoading(false);
      }
    },
    [fetchProjects, profile]
  );

  const handleUpdateProject = useCallback(
    async (projectId: string, updateData: any) => {
      try {
        await updateProject(projectId, updateData);
      } catch (err) {
        toast.error('Failed to update project');
      }
    },
    [updateProject]
  );

  const handleDeleteProject = useCallback(
    async (projectId: string) => {
      try {
        await deleteProject(projectId);
      } catch (err) {
        toast.error('Failed to delete project');
      }
    },
    [deleteProject]
  );

  const loadModalData = useCallback(() => {
    // Modal data is loaded by the REST hook
    loadProjects();
  }, [loadProjects]);

  const handleExportPDF = useCallback(() => {
    toast.info('PDF export feature coming soon');
  }, []);

  const handleExportExcel = useCallback(() => {
    toast.info('Excel export feature coming soon');
  }, []);

  // Image upload function
  const uploadImage = async (file: File) => {
    setLogo(null);
    const formDataToSend = new FormData();
    formDataToSend.append('file', file);
    formDataToSend.append('upload_preset', 'amasqis');

    const res = await fetch('https://api.cloudinary.com/v1_1/dwc3b5zfe/image/upload', {
      method: 'POST',
      body: formDataToSend,
    });

    const data = await res.json();
    return data.secure_url;
  };

  // Handle image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const maxSize = 4 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File size must be less than 4MB.');
      event.target.value = '';
      return;
    }

    if (['image/jpeg', 'image/png', 'image/jpg', 'image/ico'].includes(file.type)) {
      setImageUpload(true);
      try {
        const uploadedUrl = await uploadImage(file);
        setLogo(uploadedUrl);
        setImageUpload(false);
      } catch (error) {
        setImageUpload(false);
        toast.error('Failed to upload image. Please try again.');
        event.target.value = '';
      }
    } else {
      toast.error('Please upload image file only.');
      event.target.value = '';
    }
  };

  // Remove logo
  const removeLogo = () => {
    setLogo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Get select options with default
  const getSelectOptions = (
    options: Array<{ value: string; label: string }>,
    defaultLabel: string = 'Select'
  ) => {
    return [{ value: '', label: defaultLabel }, ...options];
  };

  // Modal container for date pickers
  const getModalContainer = () => {
    return document.body;
  };

  const validateProjectField = useCallback((fieldName: string, value: any): string => {
    switch (fieldName) {
      case 'name':
        if (!value || !value.trim()) return 'Project name is required';
        break;
      case 'client':
        if (!value || !value.trim()) return 'Client is required';
        break;
      case 'startDate':
        if (!value) return 'Start date is required';
        break;
      case 'dueDate':
        if (!value) return 'End date is required';
        break;
      case 'priority':
        if (!value || value === '') return 'Priority is required';
        break;
      case 'projectValue': {
        if (value === undefined || value === null || value === '')
          return 'Project value is required';
        const num = Number(value);
        if (Number.isNaN(num) || num < 0) return 'Project value must be a positive number';
        break;
      }
      case 'description':
        if (!value || !value.trim()) return 'Description is required';
        break;
      case 'teamMembers':
        if (!value || (Array.isArray(value) && value.length === 0))
          return 'Team members are required';
        break;
      case 'teamLeader':
        if (!value || (Array.isArray(value) && value.length === 0))
          return 'Team leader is required';
        break;
      case 'projectManager':
        if (!value || (Array.isArray(value) && value.length === 0))
          return 'Project manager is required';
        break;
    }
    return '';
  }, []);

  const handleEditFieldBlur = useCallback(
    (fieldName: string, value: any) => {
      const error = validateProjectField(fieldName, value);
      setFieldErrors((prev) => {
        const next = { ...prev };
        if (error) {
          next[fieldName] = error;
        } else {
          delete next[fieldName];
        }
        return next;
      });
    },
    [validateProjectField]
  );

  const clearFieldError = useCallback((fieldName: string) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  }, []);

  const computeProjectErrors = useCallback(
    (data: FormData): Record<string, string> => {
      const errors: Record<string, string> = {};

      const nameError = validateProjectField('name', data.name);
      if (nameError) errors.name = nameError;

      const clientError = validateProjectField('client', data.client);
      if (clientError) errors.client = clientError;

      const startError = validateProjectField('startDate', data.startDate);
      if (startError) errors.startDate = startError;

      const endError = validateProjectField('dueDate', data.dueDate);
      if (endError) errors.dueDate = endError;

      const priorityError = validateProjectField('priority', data.priority);
      if (priorityError) errors.priority = priorityError;

      const valueError = validateProjectField('projectValue', data.projectValue);
      if (valueError) errors.projectValue = valueError;

      const descriptionError = validateProjectField('description', data.description);
      if (descriptionError) errors.description = descriptionError;

      const teamMembersError = validateProjectField('teamMembers', data.teamMembers);
      if (teamMembersError) errors.teamMembers = teamMembersError;

      const teamLeaderError = validateProjectField('teamLeader', data.teamLeader);
      if (teamLeaderError) errors.teamLeader = teamLeaderError;

      const projectManagerError = validateProjectField('projectManager', data.projectManager);
      if (projectManagerError) errors.projectManager = projectManagerError;

      if (data.startDate && data.dueDate) {
        const start = dayjs(data.startDate, 'DD-MM-YYYY');
        const end = dayjs(data.dueDate, 'DD-MM-YYYY');
        if (start.isValid() && end.isValid() && !end.isAfter(start)) {
          errors.dueDate = 'End date must be after start date';
        }
      }

      return errors;
    },
    [validateProjectField]
  );

  const focusFirstError = useCallback((errors: Record<string, string>) => {
    setTimeout(() => {
      const firstErrorField = Object.keys(errors)[0];
      const errorElement =
        document.querySelector(`[name="${firstErrorField}"]`) ||
        document.querySelector(`[data-field="${firstErrorField}"]`);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (errorElement as HTMLElement).focus?.();
      }
    }, 100);
  }, []);

  const validateEditBasicInfo = useCallback((): boolean => {
    const errors = computeProjectErrors(formData);
    const basicInfoFields = [
      'name',
      'client',
      'startDate',
      'dueDate',
      'priority',
      'projectValue',
      'description',
    ];
    const basicInfoErrors: Record<string, string> = {};
    basicInfoFields.forEach((field) => {
      if (errors[field]) {
        basicInfoErrors[field] = errors[field];
      }
    });

    setFieldErrors(basicInfoErrors);

    if (Object.keys(basicInfoErrors).length > 0) {
      setFormError(null);
      focusFirstError(basicInfoErrors);
      return false;
    }

    setFormError(null);
    return true;
  }, [computeProjectErrors, focusFirstError, formData]);

  const validateEditTeamMembers = useCallback((): boolean => {
    const errors = computeProjectErrors(formData);
    const teamFields = ['teamMembers', 'teamLeader', 'projectManager'];
    const teamErrors: Record<string, string> = {};
    teamFields.forEach((field) => {
      if (errors[field]) {
        teamErrors[field] = errors[field];
      }
    });

    setFieldErrors(teamErrors);

    if (Object.keys(teamErrors).length > 0) {
      setFormError(null);
      focusFirstError(teamErrors);
      return false;
    }

    setFormError(null);
    return true;
  }, [computeProjectErrors, focusFirstError, formData]);

  const validateAddStepOne = useCallback((): boolean => {
    const errors = computeProjectErrors(formData);
    const stepFields = [
      'name',
      'client',
      'startDate',
      'dueDate',
      'priority',
      'projectValue',
      'description',
    ];
    const stepErrors: Record<string, string> = {};
    stepFields.forEach((field) => {
      if (errors[field]) {
        stepErrors[field] = errors[field];
      }
    });

    setFieldErrors((prev) => {
      const next = { ...prev };
      stepFields.forEach((field) => {
        if (stepErrors[field]) {
          next[field] = stepErrors[field];
        } else {
          delete next[field];
        }
      });
      return next;
    });

    if (Object.keys(stepErrors).length > 0) {
      setFormError(null);
      focusFirstError(stepErrors);
      return false;
    }

    setFormError(null);
    return true;
  }, [computeProjectErrors, focusFirstError, formData]);

  const validateAddProjectForm = useCallback((): boolean => {
    const errors = computeProjectErrors(formData);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setFormError(null);
      focusFirstError(errors);
      return false;
    }

    setFormError(null);
    return true;
  }, [computeProjectErrors, focusFirstError, formData]);

  // Handle modal next
  const handleNext = () => {
    if (!validateAddStepOne()) {
      return;
    }
    setFormError(null);
    setCurrentStep(2);
  };

  // Handle modal previous
  const handlePrevious = () => {
    setCurrentStep(1);
    setFormError(null);
  };

  // Handle form submission for add modal
  const handleModalSubmit = async () => {
    if (isSubmitting) return;

    if (!validateAddProjectForm()) {
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const projectData: any = {
      name: formData.name.trim(),
      client: formData.client.trim(),
      status: formData.status,
      priority: formData.priority,
      projectValue: formData.projectValue,
      description: formData.description,
      teamMembers: (formData.teamMembers || []).map((member: any) => member.value),
      teamLeader: (formData.teamLeader || []).map((leader: any) => leader.value),
      projectManager: (formData.projectManager || []).map((manager: any) => manager.value),
      tags: formData.tags,
      logo: logo,
    };

    // Convert date strings (DD-MM-YYYY) to Date objects
    if (formData.startDate) {
      const startDateObj = dayjs(formData.startDate, 'DD-MM-YYYY');
      if (startDateObj.isValid()) {
        projectData.startDate = startDateObj.toDate();
      }
    }

    if (formData.dueDate) {
      const dueDateObj = dayjs(formData.dueDate, 'DD-MM-YYYY');
      if (dueDateObj.isValid()) {
        projectData.dueDate = dueDateObj.toDate();
      }
    }

    createProject(projectData as any)
      .then((success) => {
        setIsSubmitting(false);
        if (success) {
          setFormData(initialFormData);
          setCurrentStep(1);
          setLogo(null);
          removeLogo();
          setShowAddModal(false);
          setFieldErrors({});
          loadProjects(filters);
        }
      })
      .catch(() => {
        setIsSubmitting(false);
        setFormError('Failed to create project');
      });
  };

  const handleEditBasicInfoSave = async () => {
    if (!editingProject) return;

    if (!validateEditBasicInfo()) {
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const updateData: any = {
      name: formData.name.trim(),
      client: formData.client.trim(),
      status: formData.status,
      priority: formData.priority,
      projectValue: formData.projectValue,
      description: formData.description,
    };

    // Convert date strings (DD-MM-YYYY) to Date objects
    if (formData.startDate) {
      const startDateObj = dayjs(formData.startDate, 'DD-MM-YYYY');
      if (startDateObj.isValid()) {
        updateData.startDate = startDateObj.toDate();
      }
    }

    if (formData.dueDate) {
      const dueDateObj = dayjs(formData.dueDate, 'DD-MM-YYYY');
      if (dueDateObj.isValid()) {
        updateData.dueDate = dueDateObj.toDate();
      }
    }

    await handleUpdateProject(editingProject._id, updateData);
    toast.success('Project updated successfully!');
    setIsSubmitting(false);
    setShowEditModal(false);
    setEditingProject(null);
    setFormData(initialFormData);
    setCurrentStep(1);
    setFieldErrors({});
  };

  const handleEditProjectSubmit = async () => {
    if (!editingProject) return;

    if (!validateEditTeamMembers()) {
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const updateData = {
      teamMembers: (formData.teamMembers || []).map((member: any) => member.value),
      teamLeader: (formData.teamLeader || []).map((leader: any) => leader.value),
      projectManager: (formData.projectManager || []).map((manager: any) => manager.value),
    };

    await handleUpdateProject(editingProject._id, updateData);
    toast.success('Team members updated successfully!');
    setIsSubmitting(false);
    setShowEditModal(false);
    setEditingProject(null);
    setFormData(initialFormData);
    setCurrentStep(1);
    setFieldErrors({});
  };

  // [P0 FIX] Load employees from API on mount
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        console.log('[Project] Loading employees from API...');
        const response = await apiGet('/employees', { params: { limit: 100 } });

        console.log('[Project] Raw API response:', response);

        // Handle both response structures: { data: [...] } or direct array
        const employeeData = response.data || response;

        if (employeeData && Array.isArray(employeeData)) {
          const employeeOptions = employeeData.map((emp: any) => ({
            value: emp._id,
            label: `${emp.firstName} ${emp.lastName}`,
            position: emp.position || 'N/A',
            department: emp.department?.name || emp.department || 'N/A',
            employeeId: emp.employeeId || 'N/A',
          }));
          setEmployees(employeeOptions);
          console.log(`[Project] ✅ Loaded ${employeeOptions.length} employees`);
        } else {
          console.warn('[Project] ⚠️ Employee data is not an array:', employeeData);
        }
      } catch (error) {
        console.error('[Project] ❌ Failed to load employees:', error);
        toast.error('Failed to load employees');
      }
    };
    loadEmployees();
  }, []);

  // [P0 FIX] Load clients from API on mount
  useEffect(() => {
    const loadClients = async () => {
      try {
        console.log('[Project] Loading clients from API...');
        const response = await apiGet('/clients', { params: { limit: 100 } });

        if (response.data && Array.isArray(response.data)) {
          const clientOptions = response.data.map((client: any) => ({
            value: client.name,
            label: client.name,
          }));
          setClients(clientOptions);
          console.log(`[Project] ✅ Loaded ${clientOptions.length} clients`);
        }
      } catch (error) {
        console.error('[Project] ❌ Failed to load clients:', error);
        toast.error('Failed to load clients');
      }
    };
    loadClients();
  }, []);

  // Sync hook projects with local state
  useEffect(() => {
    if (hookProjects && hookProjects.length > 0) {
      setProjects(hookProjects as any);
      // Calculate stats from projects
      const total = hookProjects.length;
      const active = hookProjects.filter((p: any) => p.status === 'Active').length;
      const completed = hookProjects.filter((p: any) => p.status === 'Completed').length;
      const onHold = hookProjects.filter((p: any) => p.status === 'On Hold').length;
      const overdue = hookProjects.filter((p: any) => {
        return p.dueDate && new Date(p.dueDate) < new Date() && p.status !== 'Completed';
      }).length;
      setStats({ total, active, completed, onHold, overdue });
    }
    setLoading(false);
  }, [hookProjects]);

  // Handle errors from hook
  useEffect(() => {
    if (hookError) {
      setError(hookError);
      toast.error(hookError);
    }
  }, [hookError]);

  // Initial load
  useEffect(() => {
    loadProjects(filters);
  }, []);

  // Reload when filters change
  useEffect(() => {
    if (filters) {
      loadProjects(filters);
    }
  }, [filters]);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    // Convert team member IDs to objects matching form format
    const teamMembersData = (project.teamMembers || []).map((memberId: string) => {
      const employee = employees.find((emp) => emp.value === memberId);
      return employee || { value: memberId, label: memberId };
    });

    const teamLeaderData = (project.teamLeader || []).map((leaderId: string) => {
      const employee = employees.find((emp) => emp.value === leaderId);
      return employee || { value: leaderId, label: leaderId };
    });

    const projectManagerData = (project.projectManager || []).map((managerId: string) => {
      const employee = employees.find((emp) => emp.value === managerId);
      return employee || { value: managerId, label: managerId };
    });

    setFormData({
      name: project.name,
      client: project.client || '',
      description: project.description || '',
      startDate: project.startDate ? dayjs(project.startDate).format('DD-MM-YYYY') : '',
      dueDate: project.dueDate ? dayjs(project.dueDate).format('DD-MM-YYYY') : '',
      status: project.status,
      priority: project.priority,
      projectValue:
        project.projectValue !== undefined && project.projectValue !== null
          ? String(project.projectValue)
          : '',
      teamMembers: teamMembersData,
      teamLeader: teamLeaderData,
      projectManager: projectManagerData,
      tags: project.tags || [],
    });
    setFormError(null);
    setFieldErrors({});
    setShowEditModal(true);
  };

  const handleDelete = (project: Project) => {
    setDeletingProject(project);
    setShowDeleteModal(true);
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'badge badge-danger-transparent';
      case 'medium':
        return 'badge badge-warning-transparent';
      case 'low':
        return 'badge badge-success-transparent';
      default:
        return 'badge badge-secondary-transparent';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'badge badge-success-transparent';
      case 'completed':
        return 'badge badge-info-transparent';
      case 'on-hold':
        return 'badge badge-warning-transparent';
      default:
        return 'badge badge-secondary-transparent';
    }
  };

  // Table columns for list view
  const columns = [
    {
      title: 'Project Name',
      dataIndex: 'name',
      render: (text: string, record: any) => (
        <div className="d-flex align-items-center file-name-icon">
          <Link
            to={all_routes.projectdetails.replace(':projectId', record._id)}
            className="avatar avatar-md border avatar-rounded"
          >
            <ImageWithBasePath
              src={record.logo || `assets/img/company/company-01.svg`}
              className="img-fluid"
              alt="img"
              isLink={record.logo ? record.logo.startsWith('https://') : false}
            />
          </Link>
          <div className="ms-2">
            <h6 className="fw-medium">
              <Link to={all_routes.projectdetails.replace(':projectId', record._id)}>
                {record.name}
              </Link>
            </h6>
            <span className="fs-12 fw-normal">{record.client || 'No Client'}</span>
          </div>
        </div>
      ),
      sorter: (a: any, b: any) => a.name.localeCompare(b.name),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (text: string, record: any) => (
        <span
          className={`badge d-inline-flex align-items-center badge-xs ${getStatusColor(record.status)}`}
        >
          <i className="ti ti-point-filled me-1" />
          {record.status}
        </span>
      ),
      sorter: (a: any, b: any) => a.status.localeCompare(b.status),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      render: (text: string, record: any) => (
        <span className={`badge ${getPriorityColor(record.priority)}`}>{record.priority}</span>
      ),
      sorter: (a: any, b: any) => a.priority.localeCompare(b.priority),
    },
    {
      title: 'Start Date',
      dataIndex: 'startDate',
      render: (text: string) => formatDate(text as any),
      sorter: (a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      render: (text: string) => formatDate(text as any),
      sorter: (a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    },
    {
      title: 'Progress',
      dataIndex: 'progress',
      render: (text: number) => `${text || 0}%`,
      sorter: (a: any, b: any) => (a.progress || 0) - (b.progress || 0),
    },
    {
      title: 'Team',
      dataIndex: 'teamMembers',
      render: (text: any, record: any) => (
        <span className="badge bg-pink-transparent">
          {(record.teamMembers?.length || 0) +
            (record.teamLeader?.length || 0) +
            (record.projectManager?.length || 0)}
        </span>
      ),
    },
    ...(!isEmployee
      ? [
          {
            title: '',
            dataIndex: 'actions',
            render: (text: any, record: any) => (
              <div className="action-icon d-inline-flex">
                <Link
                  to="#"
                  className="me-2"
                  onClick={(e) => {
                    e.preventDefault();
                    handleEdit(record);
                  }}
                >
                  <i className="ti ti-edit" />
                </Link>
                <Link
                  to="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete(record);
                  }}
                >
                  <i className="ti ti-trash" />
                </Link>
              </div>
            ),
          },
        ]
      : []),
  ];

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div
            className="d-flex justify-content-center align-items-center"
            style={{ height: '400px' }}
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
          <div className="alert alert-danger" role="alert">
            <i className="ti ti-alert-circle me-2"></i>
            {error}
            <button
              type="button"
              className="btn btn-sm btn-outline-danger ms-2"
              onClick={loadProjects}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-wrapper">
        <div className="content">
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Projects</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={all_routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">Employee</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Projects {viewMode === 'grid' ? 'Grid' : 'List'}
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
              <div className="me-2 mb-2">
                <div className="d-flex align-items-center border bg-white rounded p-1 me-2 icon-list">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`btn btn-icon btn-sm ${
                      viewMode === 'list' ? 'active bg-primary text-white' : ''
                    } me-1`}
                  >
                    <i className="ti ti-list-tree" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`btn btn-icon btn-sm ${
                      viewMode === 'grid' ? 'active bg-primary text-white' : ''
                    }`}
                  >
                    <i className="ti ti-layout-grid" />
                  </button>
                </div>
              </div>
              {!isEmployee && (
                <div className="me-2 mb-2">
                  <div className="dropdown">
                    <button
                      className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                      data-bs-toggle="dropdown"
                    >
                      <i className="ti ti-file-export me-1" />
                      Export
                    </button>
                    <ul className="dropdown-menu dropdown-menu-end p-3">
                      <li>
                        <button className="dropdown-item rounded-1" onClick={handleExportPDF}>
                          <i className="ti ti-file-type-pdf me-1" />
                          Export as PDF
                        </button>
                      </li>
                      <li>
                        <button className="dropdown-item rounded-1" onClick={handleExportExcel}>
                          <i className="ti ti-file-type-xls me-1" />
                          Export as Excel
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
              {!isEmployee && (
                <div className="me-2 mb-2">
                  <button
                    onClick={() => {
                      setFormData(initialFormData);
                      setFormError(null);
                      loadModalData();
                      setShowAddModal(true);
                    }}
                    className="btn btn-primary d-flex align-items-center"
                  >
                    <i className="ti ti-circle-plus me-2" />
                    Add Project
                  </button>
                </div>
              )}
              <div className="ms-2 head-icons">
                <CollapseHeader />
              </div>
            </div>
          </div>
          {/* /Breadcrumb */}

          {/* Projects Info */}
          <div className="row">
            <div className="col-xl-3 col-md-6 d-flex">
              <div className="card flex-fill">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                      <div className="flex-shrink-0 me-2">
                        <span className="p-2 br-10 bg-pink-transparent border border-pink d-flex align-items-center justify-content-center">
                          <i className="ti ti-briefcase text-pink fs-18" />
                        </span>
                      </div>
                      <div>
                        <p className="fs-12 fw-medium mb-0 text-gray-5 mb-1">Total Projects</p>
                        <h4>{stats?.total || 0}</h4>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-md-6 d-flex">
              <div className="card flex-fill">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                      <div className="flex-shrink-0 me-2">
                        <span className="p-2 br-10 bg-success-transparent border border-success d-flex align-items-center justify-content-center">
                          <i className="ti ti-checks text-success fs-18" />
                        </span>
                      </div>
                      <div>
                        <p className="fs-12 fw-medium mb-0 text-gray-5 mb-1">Active Projects</p>
                        <h4>{stats?.active || 0}</h4>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-md-6 d-flex">
              <div className="card flex-fill">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                      <div className="flex-shrink-0 me-2">
                        <span className="p-2 br-10 bg-info-transparent border border-info d-flex align-items-center justify-content-center">
                          <i className="ti ti-circle-check text-info fs-18" />
                        </span>
                      </div>
                      <div>
                        <p className="fs-12 fw-medium mb-0 text-gray-5 mb-1">Completed Projects</p>
                        <h4>{stats?.completed || 0}</h4>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-md-6 d-flex">
              <div className="card flex-fill">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                      <div className="flex-shrink-0 me-2">
                        <span className="p-2 br-10 bg-warning-transparent border border-warning d-flex align-items-center justify-content-center">
                          <i className="ti ti-pause text-warning fs-18" />
                        </span>
                      </div>
                      <div>
                        <p className="fs-12 fw-medium mb-0 text-gray-5 mb-1">On Hold</p>
                        <h4>{stats?.onHold || 0}</h4>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* /Projects Info */}

          {/* Projects list */}
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
              <h5>Project List</h5>
              <div className="d-flex my-xl-auto right-content align-items-center flex-wrap row-gap-3">
                {/* Search Input */}
                <div className="me-3">
                  <div className="input-icon-end position-relative">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search projects..."
                      value={filters.search}
                      onChange={(e) => handleSearchChange(e.target.value)}
                    />
                    <span className="input-icon-addon">
                      <i className="ti ti-search text-gray-7" />
                    </span>
                  </div>
                </div>

                {/* Status Filter */}
                <div className="dropdown me-3">
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-sm btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    {filters.status !== 'all' ? `Status: ${filters.status}` : 'Select Status'}
                  </Link>
                  <ul className="dropdown-menu dropdown-menu-end p-3">
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={(e) => {
                          e.preventDefault();
                          setFilters((prev) => ({ ...prev, status: 'all' }));
                        }}
                      >
                        All Status
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={(e) => {
                          e.preventDefault();
                          setFilters((prev) => ({ ...prev, status: 'Active' }));
                        }}
                      >
                        Active
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={(e) => {
                          e.preventDefault();
                          setFilters((prev) => ({ ...prev, status: 'Completed' }));
                        }}
                      >
                        Completed
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={(e) => {
                          e.preventDefault();
                          setFilters((prev) => ({ ...prev, status: 'On Hold' }));
                        }}
                      >
                        On Hold
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* Priority Filter */}
                <div className="dropdown me-3">
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-sm btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    {filters.priority !== 'all'
                      ? `Priority: ${filters.priority}`
                      : 'Select Priority'}
                  </Link>
                  <ul className="dropdown-menu dropdown-menu-end p-3">
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={(e) => {
                          e.preventDefault();
                          setFilters((prev) => ({ ...prev, priority: 'all' }));
                        }}
                      >
                        All Priority
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={(e) => {
                          e.preventDefault();
                          setFilters((prev) => ({ ...prev, priority: 'High' }));
                        }}
                      >
                        High
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={(e) => {
                          e.preventDefault();
                          setFilters((prev) => ({ ...prev, priority: 'Medium' }));
                        }}
                      >
                        Medium
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={(e) => {
                          e.preventDefault();
                          setFilters((prev) => ({ ...prev, priority: 'Low' }));
                        }}
                      >
                        Low
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* Client Filter */}
                {clients.length > 0 && (
                  <div className="dropdown me-3">
                    <Link
                      to="#"
                      className="dropdown-toggle btn btn-sm btn-white d-inline-flex align-items-center"
                      data-bs-toggle="dropdown"
                    >
                      {filters.client !== 'all' ? `Client: ${filters.client}` : 'Select Client'}
                    </Link>
                    <ul
                      className="dropdown-menu dropdown-menu-end p-3"
                      style={{ maxHeight: '200px', overflowY: 'auto' }}
                    >
                      <li>
                        <Link
                          to="#"
                          className="dropdown-item rounded-1"
                          onClick={(e) => {
                            e.preventDefault();
                            setFilters((prev) => ({ ...prev, client: 'all' }));
                          }}
                        >
                          All Clients
                        </Link>
                      </li>
                      {clients.map((client, index) => (
                        <li key={index}>
                          <Link
                            to="#"
                            className="dropdown-item rounded-1"
                            onClick={(e) => {
                              e.preventDefault();
                              setFilters((prev) => ({ ...prev, client: client.value }));
                            }}
                          >
                            {client.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Clear Filters */}
                {(filters.status !== 'all' ||
                  filters.priority !== 'all' ||
                  filters.client !== 'all' ||
                  filters.search) && (
                  <div className="me-3">
                    <Link
                      to="#"
                      className="btn btn-sm btn-outline-danger d-inline-flex align-items-center"
                      onClick={(e) => {
                        e.preventDefault();
                        clearFilters();
                      }}
                    >
                      <i className="ti ti-x me-1" />
                      Clear Filters
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* /Projects list */}

          {/* Conditional Rendering Based on View Mode */}
          {viewMode === 'list' ? (
            // LIST VIEW
            <div className="card">
              <div className="card-body p-0">
                {projects.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="ti ti-folder-x fs-1 text-muted mb-3"></i>
                    <h5 className="text-muted">No projects found</h5>
                    <p className="text-muted">Create your first project to get started</p>
                  </div>
                ) : (
                  <Table columns={columns} dataSource={getFilteredProjects()} Selection={false} />
                )}
              </div>
            </div>
          ) : (
            // GRID VIEW
            <div className="row">
              {projects.length === 0 ? (
                <div className="col-12">
                  <div className="text-center py-5">
                    <i className="ti ti-folder-x fs-1 text-muted mb-3"></i>
                    <h5 className="text-muted">No projects found</h5>
                    <p className="text-muted">Create your first project to get started</p>
                  </div>
                </div>
              ) : (
                getFilteredProjects().map((project) => (
                  <div key={project._id} className="col-xxl-3 col-lg-4 col-md-6">
                    <div className="card">
                      <div className="card-body">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <div className="d-flex align-items-center gap-2">
                            <h6>
                              <Link
                                to={all_routes.projectdetails.replace(':projectId', project._id)}
                              >
                                {project.name}
                              </Link>
                            </h6>
                            <span className={getPriorityColor(project.priority)}>
                              {project.priority}
                            </span>
                            <span className={getStatusColor(project.status)}>{project.status}</span>
                          </div>
                          {!isEmployee && (
                            <div className="dropdown">
                              <button
                                className="btn btn-icon btn-sm"
                                data-bs-toggle="dropdown"
                                aria-expanded="false"
                              >
                                <i className="ti ti-dots-vertical" />
                              </button>
                              <ul className="dropdown-menu dropdown-menu-end p-3">
                                <li>
                                  <button
                                    className="dropdown-item rounded-1"
                                    onClick={() => handleEdit(project)}
                                  >
                                    <i className="ti ti-edit me-2" />
                                    Edit
                                  </button>
                                </li>
                                <li>
                                  <button
                                    className="dropdown-item rounded-1 text-danger"
                                    onClick={() => handleDelete(project)}
                                  >
                                    <i className="ti ti-trash me-1" />
                                    Delete
                                  </button>
                                </li>
                              </ul>
                            </div>
                          )}
                        </div>
                        <div className="mb-3 pb-3 border-bottom">
                          <p className="text-truncate line-clamp-3 mb-0">
                            {project.description || 'No description provided.'}
                          </p>
                        </div>
                        <div className="d-flex align-items-center justify-content-between mb-3 pb-3 border-bottom">
                          <div className="d-flex align-items-center file-name-icon">
                            <div className="avatar avatar-sm avatar-rounded flex-shrink-0 bg-primary text-white">
                              <span className="fs-12 fw-medium">
                                {project.name && project.name.length > 0
                                  ? project.name.charAt(0).toUpperCase()
                                  : '?'}
                              </span>
                            </div>
                            <div className="ms-2">
                              <h6 className="fw-normal fs-12">{project.client || 'No Client'}</h6>
                              <span className="fs-12 fw-normal text-muted">Client</span>
                            </div>
                          </div>
                          <div className="d-flex align-items-center">
                            <div>
                              <span className="fs-12 fw-normal text-muted">Deadline</span>
                              <p className="mb-0 fs-12">{formatDate(project.dueDate)}</p>
                            </div>
                          </div>
                        </div>
                        <div className="d-flex align-items-center justify-content-between">
                          <div className="d-flex align-items-center">
                            <span className="avatar avatar-sm avatar-rounded bg-success-transparent flex-shrink-0 me-2">
                              <i className="ti ti-checklist text-success fs-16" />
                            </span>
                            <p>
                              <small>Progress: </small>
                              <span className="text-dark">{project.progress}%</span>
                            </p>
                          </div>
                          <span className="badge bg-pink-transparent">
                            {(project.teamMembers?.length || 0) +
                              (project.teamLeader?.length || 0) +
                              (project.projectManager?.length || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        <Footer />
      </div>

      {/* Add Project Modal - Using ProjectModal Structure */}
      {showAddModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          role="dialog"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header header-border align-items-center justify-content-between">
                <h5 className="modal-title">Add Project</h5>
                <button
                  type="button"
                  className="btn-close custom-btn-close"
                  onClick={() => {
                    setShowAddModal(false);
                    setCurrentStep(1);
                    setFormData(initialFormData);
                    setFormError(null);
                    setFieldErrors({});
                    setLogo(null);
                    removeLogo();
                  }}
                >
                  <i className="ti ti-x" />
                </button>
              </div>

              <div className="add-info-fieldset">
                <div className="add-details-wizard p-3 pb-0">
                  <ul className="progress-bar-wizard d-flex align-items-center border-bottom">
                    <li className={`p-2 pt-0 ${currentStep === 1 ? 'active' : ''}`}>
                      <h6 className="fw-medium">Basic Information</h6>
                    </li>
                    <li className={`p-2 pt-0 ${currentStep === 2 ? 'active' : ''}`}>
                      <h6 className="fw-medium">Members</h6>
                    </li>
                  </ul>
                </div>

                {currentStep === 1 && (
                  <fieldset id="first-field-file">
                    <div className="modal-body">
                      {formError && (
                        <div className="alert alert-danger mb-3" role="alert">
                          {formError}
                        </div>
                      )}
                      <div className="row">
                        <div className="col-md-12">
                          <div className="d-flex align-items-center flex-wrap row-gap-3 bg-light w-100 rounded p-3 mb-4">
                            <div className="d-flex align-items-center justify-content-center avatar avatar-xxl rounded-circle border border-dashed me-2 flex-shrink-0 text-dark frames">
                              {logo ? (
                                <img
                                  src={logo}
                                  alt="Uploaded Logo"
                                  className="rounded-circle"
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                  }}
                                />
                              ) : imageUpload ? (
                                <div className="spinner-border text-primary" role="status">
                                  <span className="visually-hidden">Uploading...</span>
                                </div>
                              ) : (
                                <i className="ti ti-photo text-gray-2 fs-16" />
                              )}
                            </div>
                            <div className="profile-upload">
                              <div className="mb-2">
                                <h6 className="mb-1">Upload Project Logo</h6>
                                <p className="fs-12">Image should be below 4 mb</p>
                              </div>
                              <div className="profile-uploader d-flex align-items-center">
                                <div className="drag-upload-btn btn btn-sm btn-primary me-2">
                                  {logo ? 'Change' : 'Upload'}
                                  <input
                                    type="file"
                                    className="form-control image-sign"
                                    accept=".png,.jpeg,.jpg,.ico"
                                    ref={fileInputRef}
                                    onChange={handleImageUpload}
                                  />
                                </div>
                                {logo ? (
                                  <Link
                                    to="#"
                                    onClick={removeLogo}
                                    className="btn btn-light btn-sm"
                                  >
                                    Remove
                                  </Link>
                                ) : (
                                  <Link to="#" className="btn btn-light btn-sm">
                                    Cancel
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-12">
                          <div className="mb-3">
                            <label className="form-label">
                              Project Name <span className="text-danger">*</span>
                            </label>
                            <input
                              type="text"
                              name="name"
                              className={`form-control ${fieldErrors.name ? 'is-invalid' : ''}`}
                              value={formData.name}
                              onChange={(e) => {
                                setFormData((prev) => ({ ...prev, name: e.target.value }));
                                clearFieldError('name');
                              }}
                              onBlur={(e) => handleEditFieldBlur('name', e.target.value)}
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
                            <div data-field="client">
                              <CommonSelect
                                className={`select ${fieldErrors.client ? 'is-invalid' : ''}`}
                                options={[{ value: '', label: 'Select Client' }, ...clients]}
                                value={
                                  clients.find((c) => c.label === formData.client) || {
                                    value: '',
                                    label: 'Select Client',
                                  }
                                }
                                onChange={(option) => {
                                  setFormData((prev) => ({ ...prev, client: option?.label || '' }));
                                  clearFieldError('client');
                                  handleEditFieldBlur('client', option?.label || '');
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
                                <div className="input-icon-end position-relative">
                                  <DatePicker
                                    className="form-control datetimepicker"
                                    format="DD-MM-YYYY"
                                    getPopupContainer={getModalContainer}
                                    placeholder="DD-MM-YYYY"
                                    value={
                                      formData.startDate
                                        ? dayjs(formData.startDate, 'DD-MM-YYYY')
                                        : null
                                    }
                                    onChange={(date, dateString) => {
                                      const dateStr = Array.isArray(dateString)
                                        ? dateString[0]
                                        : dateString;
                                      setFormData((prev) => ({ ...prev, startDate: dateStr }));
                                      clearFieldError('startDate');
                                      handleEditFieldBlur('startDate', dateStr);
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
                                <div className="input-icon-end position-relative">
                                  <DatePicker
                                    className="form-control datetimepicker"
                                    format="DD-MM-YYYY"
                                    getPopupContainer={getModalContainer}
                                    placeholder="DD-MM-YYYY"
                                    value={
                                      formData.dueDate
                                        ? dayjs(formData.dueDate, 'DD-MM-YYYY')
                                        : null
                                    }
                                    onChange={(date, dateString: any) => {
                                      const dateStr =
                                        typeof dateString === 'string'
                                          ? dateString
                                          : Array.isArray(dateString)
                                            ? dateString[0]
                                            : '';
                                      setFormData((prev) => ({ ...prev, dueDate: dateStr }));
                                      clearFieldError('dueDate');
                                      handleEditFieldBlur('dueDate', dateStr);
                                    }}
                                    disabledDate={(current) => {
                                      if (!formData.startDate) return false;
                                      const startDate = dayjs(formData.startDate, 'DD-MM-YYYY');
                                      return (
                                        current &&
                                        (current.isSame(startDate, 'day') ||
                                          current.isBefore(startDate, 'day'))
                                      );
                                    }}
                                  />
                                  <span className="input-icon-addon">
                                    <i className="ti ti-calendar text-gray-7" />
                                  </span>
                                </div>
                                {fieldErrors.dueDate && (
                                  <div className="invalid-feedback d-block">
                                    {fieldErrors.dueDate}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="col-md-6">
                              <div className="mb-3">
                                <label className="form-label">
                                  Priority <span className="text-danger">*</span>
                                </label>
                                <div data-field="priority">
                                  <CommonSelect
                                    className={`select ${fieldErrors.priority ? 'is-invalid' : ''}`}
                                    options={[
                                      { value: 'High', label: 'High' },
                                      { value: 'Medium', label: 'Medium' },
                                      { value: 'Low', label: 'Low' },
                                    ]}
                                    value={{ value: formData.priority, label: formData.priority }}
                                    onChange={(option) => {
                                      const nextValue = option?.value || 'Medium';
                                      setFormData((prev) => ({ ...prev, priority: nextValue }));
                                      clearFieldError('priority');
                                      handleEditFieldBlur('priority', nextValue);
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
                                  Project Value <span className="text-danger">*</span>
                                </label>
                                <div className="input-group">
                                  <span className="input-group-text">$</span>
                                  <input
                                    type="number"
                                    name="projectValue"
                                    className={`form-control ${fieldErrors.projectValue ? 'is-invalid' : ''}`}
                                    value={formData.projectValue}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                        setFormData((prev) => ({ ...prev, projectValue: value }));
                                        clearFieldError('projectValue');
                                      }
                                    }}
                                    onBlur={(e) =>
                                      handleEditFieldBlur('projectValue', e.target.value)
                                    }
                                    placeholder="0"
                                    min="0"
                                    step="0.01"
                                  />
                                </div>
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
                          <div className="mb-0">
                            <label className="form-label">
                              Description <span className="text-danger">*</span>
                            </label>
                            <textarea
                              name="description"
                              className={`form-control ${fieldErrors.description ? 'is-invalid' : ''}`}
                              rows={4}
                              value={formData.description}
                              onChange={(e) => {
                                setFormData((prev) => ({ ...prev, description: e.target.value }));
                                clearFieldError('description');
                              }}
                              onBlur={(e) => handleEditFieldBlur('description', e.target.value)}
                              placeholder="Enter project description"
                            ></textarea>
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
                          onClick={() => {
                            setShowAddModal(false);
                            setCurrentStep(1);
                            setFormData(initialFormData);
                            setFormError(null);
                            setLogo(null);
                            removeLogo();
                          }}
                        >
                          Cancel
                        </button>
                        <button type="button" className="btn btn-primary" onClick={handleNext}>
                          Add Team Member
                        </button>
                      </div>
                    </div>
                  </fieldset>
                )}

                {currentStep === 2 && (
                  <fieldset className="d-block">
                    <div className="modal-body">
                      {formError && (
                        <div className="alert alert-danger mb-3" role="alert">
                          {formError}
                        </div>
                      )}
                      <div className="row">
                        <div className="col-md-12">
                          <div className="mb-3">
                            <label className="form-label me-2">
                              Project Manager <span className="text-danger">*</span>
                            </label>
                            <div data-field="projectManager">
                              <Select
                                isMulti
                                options={employees}
                                value={formData.projectManager}
                                onChange={(selectedOptions: any) => {
                                  const updated = selectedOptions || [];
                                  setFormData((prev) => ({ ...prev, projectManager: updated }));
                                  clearFieldError('projectManager');
                                  handleEditFieldBlur('projectManager', updated);
                                }}
                                placeholder="Select project managers"
                                className={`basic-multi-select ${fieldErrors.projectManager ? 'is-invalid' : ''}`}
                                classNamePrefix="select"
                                getOptionLabel={(option: any) =>
                                  `${option.employeeId} - ${option.label}`
                                }
                                getOptionValue={(option: any) => option.value}
                              />
                            </div>
                            <small className="form-text text-muted">
                              Select multiple employees as project managers
                            </small>
                            {fieldErrors.projectManager && (
                              <div className="invalid-feedback d-block">
                                {fieldErrors.projectManager}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="col-md-12">
                          <div className="mb-3">
                            <label className="form-label me-2">
                              Team Leader <span className="text-danger">*</span>
                            </label>
                            <div data-field="teamLeader">
                              <Select
                                isMulti
                                options={employees}
                                value={formData.teamLeader}
                                onChange={(selectedOptions: any) => {
                                  const updated = selectedOptions || [];
                                  setFormData((prev) => ({ ...prev, teamLeader: updated }));
                                  clearFieldError('teamLeader');
                                  handleEditFieldBlur('teamLeader', updated);
                                }}
                                placeholder="Select team leaders"
                                className={`basic-multi-select ${fieldErrors.teamLeader ? 'is-invalid' : ''}`}
                                classNamePrefix="select"
                                getOptionLabel={(option: any) =>
                                  `${option.employeeId} - ${option.label}`
                                }
                                getOptionValue={(option: any) => option.value}
                              />
                            </div>
                            <small className="form-text text-muted">
                              Select multiple employees as team leaders
                            </small>
                            {fieldErrors.teamLeader && (
                              <div className="invalid-feedback d-block">
                                {fieldErrors.teamLeader}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="col-md-12">
                          <div className="mb-3">
                            <label className="form-label me-2">
                              Team Members <span className="text-danger">*</span>
                            </label>
                            <div data-field="teamMembers">
                              <Select
                                isMulti
                                options={employees}
                                value={formData.teamMembers}
                                onChange={(selectedOptions: any) => {
                                  const updated = selectedOptions || [];
                                  setFormData((prev) => ({ ...prev, teamMembers: updated }));
                                  clearFieldError('teamMembers');
                                  handleEditFieldBlur('teamMembers', updated);
                                }}
                                placeholder="Select team members"
                                className={`basic-multi-select ${fieldErrors.teamMembers ? 'is-invalid' : ''}`}
                                classNamePrefix="select"
                                getOptionLabel={(option: any) =>
                                  `${option.employeeId} - ${option.label}`
                                }
                                getOptionValue={(option: any) => option.value}
                              />
                            </div>
                            <small className="form-text text-muted">
                              Select multiple employees for the project team
                            </small>
                            {fieldErrors.teamMembers && (
                              <div className="invalid-feedback d-block">
                                {fieldErrors.teamMembers}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="col-md-12">
                          <div className="mb-3">
                            <label className="form-label">Status</label>
                            <CommonSelect
                              className="select"
                              options={[
                                { value: 'Active', label: 'Active' },
                                { value: 'Completed', label: 'Completed' },
                                { value: 'On Hold', label: 'On Hold' },
                              ]}
                              value={{ value: formData.status, label: formData.status }}
                              onChange={(option) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  status: option?.value || 'Active',
                                }))
                              }
                            />
                          </div>
                        </div>
                        <div className="col-md-12">
                          <div>
                            <label className="form-label">Tags</label>
                            <CommonTagsInput
                              value={formData.tags}
                              onChange={(tags) => setFormData((prev) => ({ ...prev, tags }))}
                              placeholder="Add project tags"
                              className="custom-input-class"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="modal-footer">
                      <div className="d-flex align-items-center justify-content-between w-100">
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={handlePrevious}
                        >
                          Previous
                        </button>
                        <div className="d-flex align-items-center">
                          <button
                            type="button"
                            className="btn btn-outline-light border me-2"
                            onClick={() => {
                              setShowAddModal(false);
                              setCurrentStep(1);
                              setFormData(initialFormData);
                              setFormError(null);
                              setLogo(null);
                              removeLogo();
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleModalSubmit}
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? (
                              <>
                                <span
                                  className="spinner-border spinner-border-sm me-2"
                                  role="status"
                                  aria-hidden="true"
                                ></span>
                                Creating...
                              </>
                            ) : (
                              'Create Project'
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </fieldset>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal - Using Tab Navigation Like Edit Employee */}
      {showEditModal && editingProject && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          role="dialog"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
            <div className="modal-content">
              <div className="modal-header header-border align-items-center justify-content-between">
                <h5 className="modal-title">Edit Project</h5>
                <button
                  type="button"
                  className="btn-close custom-btn-close"
                  onClick={() => {
                    setShowEditModal(false);
                    setCurrentStep(1);
                    setFieldErrors({});
                    setFormError(null);
                  }}
                >
                  <i className="ti ti-x" />
                </button>
              </div>

              <form>
                <div className="contact-grids-tab">
                  <ul className="nav nav-underline" id="editProjectTab" role="tablist">
                    <li className="nav-item" role="presentation">
                      <button
                        className={`nav-link ${currentStep === 1 ? 'active' : ''}`}
                        id="basic-info-tab"
                        data-bs-toggle="tab"
                        data-bs-target="#basic-info-tab-pane"
                        type="button"
                        role="tab"
                        aria-selected={currentStep === 1}
                        onClick={() => setCurrentStep(1)}
                      >
                        Basic Information
                      </button>
                    </li>
                    <li className="nav-item" role="presentation">
                      <button
                        className={`nav-link ${currentStep === 2 ? 'active' : ''}`}
                        id="members-tab"
                        data-bs-toggle="tab"
                        data-bs-target="#members-tab-pane"
                        type="button"
                        role="tab"
                        aria-selected={currentStep === 2}
                        onClick={() => setCurrentStep(2)}
                      >
                        Team Members
                      </button>
                    </li>
                  </ul>
                </div>

                <div className="tab-content" id="editProjectTabContent">
                  {/* Tab 1: Basic Information */}
                  <div
                    className={`tab-pane fade ${currentStep === 1 ? 'show active' : ''}`}
                    id="basic-info-tab-pane"
                    role="tabpanel"
                    aria-labelledby="basic-info-tab"
                    tabIndex={0}
                  >
                    <div className="modal-body pb-0">
                      {formError && (
                        <div className="alert alert-danger mb-3" role="alert">
                          {formError}
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
                              value={formData.name}
                              onChange={(e) => {
                                setFormData((prev) => ({ ...prev, name: e.target.value }));
                                clearFieldError('name');
                              }}
                              onBlur={(e) => handleEditFieldBlur('name', e.target.value)}
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
                            <div data-field="client">
                              <CommonSelect
                                className={`select ${fieldErrors.client ? 'is-invalid' : ''}`}
                                options={[{ value: '', label: 'Select Client' }, ...clients]}
                                value={
                                  clients.find((c) => c.label === formData.client) || {
                                    value: '',
                                    label: 'Select Client',
                                  }
                                }
                                onChange={(option) => {
                                  setFormData((prev) => ({ ...prev, client: option?.label || '' }));
                                  clearFieldError('client');
                                  handleEditFieldBlur('client', option?.label || '');
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
                                <label className="form-label">Status</label>
                                <CommonSelect
                                  className="select"
                                  options={[
                                    { value: 'Active', label: 'Active' },
                                    { value: 'Completed', label: 'Completed' },
                                    { value: 'On Hold', label: 'On Hold' },
                                  ]}
                                  value={{ value: formData.status, label: formData.status }}
                                  onChange={(option) =>
                                    setFormData((prev) => ({
                                      ...prev,
                                      status: option?.value || 'Active',
                                    }))
                                  }
                                />
                              </div>
                            </div>
                            <div className="col-md-6">
                              <div className="mb-3">
                                <label className="form-label">
                                  Priority <span className="text-danger">*</span>
                                </label>
                                <div data-field="priority">
                                  <CommonSelect
                                    className={`select ${fieldErrors.priority ? 'is-invalid' : ''}`}
                                    options={[
                                      { value: 'High', label: 'High' },
                                      { value: 'Medium', label: 'Medium' },
                                      { value: 'Low', label: 'Low' },
                                    ]}
                                    value={{ value: formData.priority, label: formData.priority }}
                                    onChange={(option) => {
                                      setFormData((prev) => ({
                                        ...prev,
                                        priority: option?.value || 'Medium',
                                      }));
                                      clearFieldError('priority');
                                      handleEditFieldBlur('priority', option?.value || 'Medium');
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
                          </div>
                        </div>
                        <div className="col-md-12">
                          <div className="row">
                            <div className="col-md-6">
                              <div className="mb-3">
                                <label className="form-label">
                                  Project Value <span className="text-danger">*</span>
                                </label>
                                <input
                                  type="number"
                                  name="projectValue"
                                  className={`form-control ${fieldErrors.projectValue ? 'is-invalid' : ''}`}
                                  value={formData.projectValue}
                                  onChange={(e) => {
                                    setFormData((prev) => ({
                                      ...prev,
                                      projectValue: e.target.value,
                                    }));
                                    clearFieldError('projectValue');
                                  }}
                                  onBlur={(e) =>
                                    handleEditFieldBlur('projectValue', e.target.value)
                                  }
                                  placeholder="Enter project value"
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
                          <div className="row">
                            <div className="col-md-6">
                              <div className="mb-3">
                                <label className="form-label">
                                  Start Date <span className="text-danger">*</span>
                                </label>
                                <div className="input-icon-end position-relative">
                                  <DatePicker
                                    className="form-control datetimepicker"
                                    format="DD-MM-YYYY"
                                    getPopupContainer={getModalContainer}
                                    placeholder="DD-MM-YYYY"
                                    value={
                                      formData.startDate
                                        ? dayjs(formData.startDate, 'DD-MM-YYYY')
                                        : null
                                    }
                                    onChange={(date, dateString) => {
                                      const dateStr = Array.isArray(dateString)
                                        ? dateString[0]
                                        : dateString;
                                      setFormData((prev) => ({ ...prev, startDate: dateStr }));
                                      clearFieldError('startDate');
                                      handleEditFieldBlur('startDate', dateStr);
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
                                <div className="input-icon-end position-relative">
                                  <DatePicker
                                    className="form-control datetimepicker"
                                    format="DD-MM-YYYY"
                                    getPopupContainer={getModalContainer}
                                    placeholder="DD-MM-YYYY"
                                    value={
                                      formData.dueDate
                                        ? dayjs(formData.dueDate, 'DD-MM-YYYY')
                                        : null
                                    }
                                    onChange={(date, dateString: any) => {
                                      const dateStr =
                                        typeof dateString === 'string'
                                          ? dateString
                                          : Array.isArray(dateString)
                                            ? dateString[0]
                                            : '';
                                      setFormData((prev) => ({ ...prev, dueDate: dateStr }));
                                      clearFieldError('dueDate');
                                      handleEditFieldBlur('dueDate', dateStr);
                                    }}
                                    disabledDate={(current) => {
                                      if (!formData.startDate) return false;
                                      const startDate = dayjs(formData.startDate, 'DD-MM-YYYY');
                                      return (
                                        current &&
                                        (current.isSame(startDate, 'day') ||
                                          current.isBefore(startDate, 'day'))
                                      );
                                    }}
                                  />
                                  <span className="input-icon-addon">
                                    <i className="ti ti-calendar text-gray-7" />
                                  </span>
                                </div>
                                {fieldErrors.dueDate && (
                                  <div className="invalid-feedback d-block">
                                    {fieldErrors.dueDate}
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
                              className={`form-control ${fieldErrors.description ? 'is-invalid' : ''}`}
                              rows={4}
                              value={formData.description}
                              onChange={(e) => {
                                setFormData((prev) => ({ ...prev, description: e.target.value }));
                                clearFieldError('description');
                              }}
                              onBlur={(e) => handleEditFieldBlur('description', e.target.value)}
                              placeholder="Enter project description"
                            ></textarea>
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
                      <button
                        type="button"
                        className="btn btn-outline-light border me-2"
                        onClick={() => {
                          setShowEditModal(false);
                          setCurrentStep(1);
                          setFieldErrors({});
                          setFormError(null);
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleEditBasicInfoSave}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
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

                  {/* Tab 2: Team Members */}
                  <div
                    className={`tab-pane fade ${currentStep === 2 ? 'show active' : ''}`}
                    id="members-tab-pane"
                    role="tabpanel"
                    aria-labelledby="members-tab"
                    tabIndex={0}
                  >
                    <div className="modal-body pb-0">
                      {formError && (
                        <div className="alert alert-danger mb-3" role="alert">
                          {formError}
                        </div>
                      )}
                      <div className="row">
                        <div className="col-md-12">
                          <div className="mb-3">
                            <label className="form-label me-2">
                              Project Manager <span className="text-danger">*</span>
                            </label>
                            <div data-field="projectManager">
                              <Select
                                isMulti
                                options={employees}
                                value={formData.projectManager}
                                onChange={(selectedOptions: any) => {
                                  const updated = selectedOptions || [];
                                  setFormData((prev) => ({ ...prev, projectManager: updated }));
                                  clearFieldError('projectManager');
                                  handleEditFieldBlur('projectManager', updated);
                                }}
                                placeholder="Select project managers"
                                className={`basic-multi-select ${fieldErrors.projectManager ? 'is-invalid' : ''}`}
                                classNamePrefix="select"
                                getOptionLabel={(option: any) =>
                                  `${option.employeeId} - ${option.label}`
                                }
                                getOptionValue={(option: any) => option.value}
                              />
                            </div>
                            <small className="form-text text-muted">
                              Select multiple employees as project managers
                            </small>
                            {fieldErrors.projectManager && (
                              <div className="invalid-feedback d-block">
                                {fieldErrors.projectManager}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="col-md-12">
                          <div className="mb-3">
                            <label className="form-label me-2">
                              Team Leader <span className="text-danger">*</span>
                            </label>
                            <div data-field="teamLeader">
                              <Select
                                isMulti
                                options={employees}
                                value={formData.teamLeader}
                                onChange={(selectedOptions: any) => {
                                  const updated = selectedOptions || [];
                                  setFormData((prev) => ({ ...prev, teamLeader: updated }));
                                  clearFieldError('teamLeader');
                                  handleEditFieldBlur('teamLeader', updated);
                                }}
                                placeholder="Select team leaders"
                                className={`basic-multi-select ${fieldErrors.teamLeader ? 'is-invalid' : ''}`}
                                classNamePrefix="select"
                                getOptionLabel={(option: any) =>
                                  `${option.employeeId} - ${option.label}`
                                }
                                getOptionValue={(option: any) => option.value}
                              />
                            </div>
                            <small className="form-text text-muted">
                              Select multiple employees as team leaders
                            </small>
                            {fieldErrors.teamLeader && (
                              <div className="invalid-feedback d-block">
                                {fieldErrors.teamLeader}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="col-md-12">
                          <div className="mb-3">
                            <label className="form-label me-2">
                              Team Members <span className="text-danger">*</span>
                            </label>
                            <div data-field="teamMembers">
                              <Select
                                isMulti
                                options={employees}
                                value={formData.teamMembers}
                                onChange={(selectedOptions: any) => {
                                  const updated = selectedOptions || [];
                                  setFormData((prev) => ({ ...prev, teamMembers: updated }));
                                  clearFieldError('teamMembers');
                                  handleEditFieldBlur('teamMembers', updated);
                                }}
                                placeholder="Select team members"
                                className={`basic-multi-select ${fieldErrors.teamMembers ? 'is-invalid' : ''}`}
                                classNamePrefix="select"
                                getOptionLabel={(option: any) =>
                                  `${option.employeeId} - ${option.label}`
                                }
                                getOptionValue={(option: any) => option.value}
                              />
                            </div>
                            <small className="form-text text-muted">
                              Select multiple employees for the project team
                            </small>
                            {fieldErrors.teamMembers && (
                              <div className="invalid-feedback d-block">
                                {fieldErrors.teamMembers}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setCurrentStep(1)}
                      >
                        Previous
                      </button>
                      <div className="d-flex align-items-center">
                        <button
                          type="button"
                          className="btn btn-outline-light border me-2"
                          onClick={() => {
                            setShowEditModal(false);
                            setCurrentStep(1);
                            setFieldErrors({});
                            setFormError(null);
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={handleEditProjectSubmit}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <span
                                className="spinner-border spinner-border-sm me-2"
                                role="status"
                                aria-hidden="true"
                              ></span>
                              Saving...
                            </>
                          ) : (
                            'Update Project'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Project Modal */}
      {showDeleteModal && deletingProject && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          role="dialog"
        >
          <div className="modal-dialog modal-dialog-centered modal-sm" role="document">
            <div className="modal-content">
              <div className="modal-body">
                <div className="text-center p-3">
                  <span className="avatar avatar-lg avatar-rounded bg-danger mb-3">
                    <i className="ti ti-trash fs-24" />
                  </span>
                  <h5 className="mb-2">Delete Project</h5>
                  <div className="bg-light p-3 rounded mb-3">
                    <h6 className="mb-1">{deletingProject.name}</h6>
                    <p className="mb-1 text-muted">
                      Client: <strong>{deletingProject.client || 'N/A'}</strong>
                    </p>
                    <p className="mb-0 text-muted">
                      Status:{' '}
                      <span className={getStatusColor(deletingProject.status)}>
                        {deletingProject.status}
                      </span>
                    </p>
                  </div>
                  <div className="text-start mb-3">
                    <p className="text-danger fw-medium mb-2" style={{ fontSize: '13px' }}>
                      This action is permanent. All data associated with this project will be
                      removed.
                    </p>
                    <label className="form-label text-muted" style={{ fontSize: '13px' }}>
                      Type <strong>{deletingProject.name}</strong> to confirm deletion:
                    </label>
                    <input
                      type="text"
                      className={`form-control form-control-sm ${
                        confirmProjectName &&
                        confirmProjectName.trim().toLowerCase() !==
                          deletingProject.name.trim().toLowerCase()
                          ? 'is-invalid'
                          : ''
                      } ${
                        confirmProjectName.trim().toLowerCase() ===
                        deletingProject.name.trim().toLowerCase()
                          ? 'is-valid'
                          : ''
                      }`}
                      placeholder={`Type \"${deletingProject.name}\" to confirm`}
                      value={confirmProjectName}
                      onChange={(e) => setConfirmProjectName(e.target.value)}
                      autoComplete="off"
                    />
                    {confirmProjectName &&
                      confirmProjectName.trim().toLowerCase() !==
                        deletingProject.name.trim().toLowerCase() && (
                        <div className="invalid-feedback">Name does not match</div>
                      )}
                  </div>
                  <div className="d-flex justify-content-center gap-2">
                    <button
                      type="button"
                      className="btn btn-light"
                      onClick={() => {
                        setShowDeleteModal(false);
                        setDeletingProject(null);
                        setConfirmProjectName('');
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={async () => {
                        if (deletingProject) {
                          const success = await deleteProject(deletingProject._id);
                          if (success) {
                            // Close the modal
                            setTimeout(() => {
                              setDeletingProject(null);
                              setShowDeleteModal(false);
                              setConfirmProjectName('');
                            }, 300);

                            // Reload projects list
                            loadProjects(filters);
                          }
                        }
                      }}
                      disabled={
                        !deletingProject ||
                        confirmProjectName.trim().toLowerCase() !==
                          deletingProject.name.trim().toLowerCase()
                      }
                    >
                      Delete Project
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProjectGrid;
