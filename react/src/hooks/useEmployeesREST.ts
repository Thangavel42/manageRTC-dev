/**
 * Employees REST API Hook - Enhanced
 * Replaces Socket.IO-based employee operations with REST API calls
 * Real-time updates still use Socket.IO listeners for broadcasts
 */

import { message } from 'antd';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { ApiResponse, buildParams, del, get, getAuthToken, post, put } from '../services/api';
import { useSocket } from '../SocketContext';

// Permission Module Types
export type PermissionModule =
  | 'holidays'
  | 'leaves'
  | 'clients'
  | 'projects'
  | 'tasks'
  | 'chats'
  | 'assets'
  | 'timingSheets';

export type PermissionAction =
  | 'read'
  | 'write'
  | 'create'
  | 'delete'
  | 'import'
  | 'export';

export interface PermissionSet {
  read: boolean;
  write: boolean;
  create: boolean;
  delete: boolean;
  import: boolean;
  export: boolean;
}

export interface Employee {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  email: string;
  phone?: string;
  departmentId?: string;
  department?: string; // Populated
  designationId?: string;
  designation?: string; // Populated
  jobTitle?: string; // Alias for designation or separate job title
  reportingTo?: string;
  reportingToName?: string; // Populated
  manager?: string;
  status: 'Active' | 'Inactive' | 'On Notice' | 'Resigned' | 'Terminated' | 'On Leave';
  employmentStatus?: 'Active' | 'Probation' | 'Resigned' | 'Terminated' | 'On Leave';
  shiftId?: string; // Assigned shift ID
  gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  dateOfBirth?: string;
  dateOfJoining: string;
  joiningDate?: string; // Alias for dateOfJoining
  salary?: number;
  avatar?: string;
  avatarUrl?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    postalCode?: string;
    country?: string;
  };
  skills?: string[];
  qualifications?: Array<{
    degree: string;
    institution: string;
    year: number;
  }>;
  experience?: Array<{
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    current: boolean;
  }>;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    branch?: string;
  };
  personal?: {
    gender?: string;
    birthday?: string;
    passport?: {
      number?: string;
      expiryDate?: string;
      country?: string;
    };
    religion?: string;
    maritalStatus?: string;
    employmentOfSpouse?: string;
    noOfChildren?: number;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
  };
  family?: {
    Name?: string;
    relationship?: string;
    phone?: string;
  };
  education?: {
    institution?: string;
    degree?: string;
    course?: string;
    startDate?: string;
    endDate?: string;
  };
  about?: string;
  companyName?: string;
  companyId?: string;
  role?: string;
  profileImage?: string;
  enabledModules?: Record<PermissionModule, boolean>;
  permissions?: Record<PermissionModule, PermissionSet>;
  totalProjects?: number;
  completedProjects?: number;
  productivity?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmployeeFilters {
  page?: number;
  limit?: number;
  department?: string;
  departmentId?: string;
  status?: string;
  designation?: string;
  search?: string;
  role?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  startDate?: string;
  endDate?: string;
}

export interface EmployeeStats {
  totalEmployees: number;
  activeCount: number;
  inactiveCount: number;
  newJoinersCount: number;
}

export interface LifecycleStatusResponse {
  hasLifecycleRecord: boolean;
  canChangeStatus: boolean;
  type?: 'resignation' | 'termination';
  status?: string;
  effectiveDate?: string;
  lastWorkingDate?: string;
  message?: string;
}

export interface CreateEmployeeRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  departmentId: string;
  designationId: string;
  dateOfJoining: string;
  employmentType?: 'Full-time' | 'Part-time' | 'Contract' | 'Intern';
  salary?: {
    basic: number;
    hra?: number;
    allowances?: number;
    currency?: string;
  };
  status?: string;
  personal?: any;
  contact?: {
    email: string;
    phone?: string;
  };
  account?: {
    role?: string;
    userName?: string;
  };
}

export interface UpdatePermissionsRequest {
  employeeId: string;
  enabledModules: Record<PermissionModule, boolean>;
  permissions: Record<PermissionModule, PermissionSet>;
}

export interface CheckDuplicatesResponse {
  done: boolean;
  exists?: boolean;
  error?: string;
  field?: string;
}

export interface DeleteErrorDetails {
  code?: string;
  message: string;
  details?: any;
}

export interface DeleteResult {
  success: boolean;
  error?: DeleteErrorDetails;
}

/**
 * Normalize status to ensure correct case
 */
const normalizeStatus = (
  status: string | undefined,
):
  | 'Active'
  | 'Inactive'
  | 'On Notice'
  | 'Resigned'
  | 'Terminated'
  | 'On Leave' => {
  if (!status) return 'Active';
  const normalized = status.toLowerCase();

  if (normalized === 'active') return 'Active';
  if (normalized === 'inactive') return 'Inactive';
  if (normalized === 'on notice') return 'On Notice';
  if (normalized === 'resigned') return 'Resigned';
  if (normalized === 'terminated') return 'Terminated';
  if (normalized === 'on leave') return 'On Leave';

  return 'Active';
};

const buildApiError = (err: any, fallbackMessage: string): DeleteErrorDetails => {
  const apiError = err?.response?.data?.error;
  return {
    code: apiError?.code,
    message: apiError?.message || err?.message || fallbackMessage,
    details: apiError?.details
  };
};

const toArray = <T,>(value: T | T[] | null | undefined): T[] => {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
};

const normalizeFamilyPayload = (familyData: any) =>
  toArray(familyData).map((entry) => ({
    Name: entry?.Name || entry?.name || entry?.familyMemberName || '',
    relationship: entry?.relationship || '',
    phone: entry?.phone || ''
  }));

const normalizeEducationPayload = (educationData: any) =>
  toArray(educationData).map((entry) => ({
    institution: entry?.institution || '',
    degree: entry?.degree || entry?.course || '',
    startDate: entry?.startDate || '',
    endDate: entry?.endDate || '',
    grade: entry?.grade || ''
  }));

const normalizeExperiencePayload = (experienceData: any) =>
  toArray(experienceData).map((entry) => ({
    previousCompany: entry?.previousCompany || entry?.company || entry?.companyName || '',
    designation: entry?.designation || entry?.position || entry?.role || '',
    startDate: entry?.startDate || '',
    endDate: entry?.endDate || '',
    currentlyWorking: entry?.currentlyWorking ?? entry?.current ?? false
  }));

const normalizeEmergencyContactsPayload = (emergencyContacts: any) =>
  toArray(emergencyContacts).map((entry) => ({
    name: entry?.name || '',
    relationship: entry?.relationship || '',
    phone: Array.isArray(entry?.phone) ? entry.phone : entry?.phone ? [entry.phone] : []
  }));

/**
 * Employees REST API Hook
 */
export const useEmployeesREST = () => {
  const socket = useSocket();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<EmployeeStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch employees with stats
   * REST API: GET /api/employees
   * Note: Company ID is extracted server-side from the token's public metadata
   * The API interceptor handles token refresh automatically
   */
  const fetchEmployeesWithStats = useCallback(async (filters: EmployeeFilters = {}) => {
    setLoading(true);
    setError(null);
    try {
      // Fetch employees list
      const params = buildParams(filters);
      const response: ApiResponse<Employee[]> = await get('/employees', { params });

      if (response.success && response.data) {
        // Normalize status and avatarUrl/profileImage for all employees
        const normalizedEmployees = response.data.map((emp: Employee) => {
          const normalized = {
            ...emp,
            status: normalizeStatus(emp.status)
          };
          // Ensure avatarUrl is set from profileImage if not already set
          if (!normalized.avatarUrl && (normalized as any).profileImage) {
            normalized.avatarUrl = (normalized as any).profileImage;
          }
          return normalized;
        });

        setEmployees(normalizedEmployees);

        // Calculate stats from the employee data
        const total = normalizedEmployees.length;
        const activeCount = normalizedEmployees.filter(e => e.status === 'Active').length;
        const inactiveCount = normalizedEmployees.filter(e => e.status === 'Inactive').length;
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const newJoinersCount = normalizedEmployees.filter(e => {
          if (!e.createdAt) return false;
          return new Date(e.createdAt) >= sevenDaysAgo;
        }).length;

        setStats({
          totalEmployees: total,
          activeCount,
          inactiveCount,
          newJoinersCount
        });
      } else {
        throw new Error(response.error?.message || 'Failed to fetch employees');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch employees';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch employee list (without stats)
   * REST API: GET /api/employees
   */
  const fetchEmployees = useCallback(async (filters: EmployeeFilters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = buildParams(filters);
      const response: ApiResponse<Employee[]> = await get('/employees', { params });

      if (response.success && response.data) {
        // Normalize status for all employees
        const normalizedEmployees = response.data.map((emp: Employee) => ({
          ...emp,
          status: normalizeStatus(emp.status)
        }));
        setEmployees(normalizedEmployees);
      } else {
        throw new Error(response.error?.message || 'Failed to fetch employees');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch employees';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch active employee list for dropdowns (no role restriction)
   * REST API: GET /api/employees/active-list
   */
  const fetchActiveEmployeesList = useCallback(async (params: { search?: string } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = buildParams(params);
      const response: ApiResponse<Employee[]> = await get('/employees/active-list', { params: queryParams });

      if (response.success && response.data) {
        const normalizedEmployees = response.data.map((emp: Employee) => ({
          ...emp,
          status: normalizeStatus(emp.status)
        }));
        setEmployees(normalizedEmployees);
      } else {
        throw new Error(response.error?.message || 'Failed to fetch active employees');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch active employees';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch employee statistics separately
   * REST API: GET /api/employees/dashboard
   */
  const fetchStats = useCallback(async () => {
    try {
      const response: ApiResponse<EmployeeStats> = await get('/employees/dashboard');

      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (err: any) {
      console.error('[useEmployeesREST] Failed to fetch stats:', err);
    }
  }, []);

  /**
   * Fetch reporting manager options for dropdown selection
   * REST API: GET /api/employees?reportingManagerList=true&...
   * Returns minimal manager list for resignation/leave workflows
   */
  const fetchReportingManagerOptions = useCallback(async (params: {
    search?: string;
    limit?: number;
    department?: string;
    excludeEmployeeId?: string;
  }): Promise<Array<{ id: string; employeeId: string; name: string; department: string }>> => {
    try {
      const queryParams = {
        reportingManagerList: 'true',
        search: params.search || '',
        limit: params.limit || 10,
        ...(params.department && { department: params.department }),
        ...(params.excludeEmployeeId && { excludeEmployeeId: params.excludeEmployeeId })
      };

      const response: ApiResponse<any[]> = await get('/employees', { params: queryParams });

      if (response.success && Array.isArray(response.data)) {
        return response.data.map((emp: any) => ({
          id: emp.id,
          employeeId: emp.employeeId,
          name: emp.name,
          department: emp.department
        }));
      }
      return [];
    } catch (err: any) {
      console.error('[useEmployeesREST] Failed to fetch reporting manager options:', err);
      return [];
    }
  }, []);

  /**
   * Get single employee by ID
   * REST API: GET /api/employees/:id
   */
  const getEmployeeById = useCallback(async (employeeId: string): Promise<Employee | null> => {
    try {
      const response: ApiResponse<Employee> = await get(`/employees/${employeeId}`);

      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error?.message || 'Failed to fetch employee');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch employee';
      message.error(errorMessage);
      return null;
    }
  }, []);

  /**
   * Get employee details by employeeId string (not ObjectId)
   * REST API: GET /api/employees/:employeeId
   */
  const getEmployeeDetails = useCallback(async (employeeId: string): Promise<Employee | null> => {
    try {
      const response: ApiResponse<Employee> = await get(`/employees/${employeeId}`);

      if (response.success && response.data) {
        const employee = response.data;
        // Ensure avatarUrl is set from profileImage if not already set
        if (!employee.avatarUrl && employee.profileImage) {
          employee.avatarUrl = employee.profileImage;
        }
        return employee;
      }
      throw new Error(response.error?.message || 'Failed to fetch employee details');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch employee details';
      message.error(errorMessage);
      return null;
    }
  }, []);

  /**
   * Check username availability
   * REST API: POST /api/employees/check-duplicates
   */
  /**
   * Check email availability
   * REST API: POST /api/employees/check-duplicates
   */
  const checkEmailAvailability = useCallback(async (email: string): Promise<boolean> => {
    try {
      const response: ApiResponse = await post('/employees/check-duplicates', { email });

      // If response is successful and data.done is true, email is available
      return response.success && response.data?.done === true;
    } catch (err: any) {
      const errorResponse = err.response?.data;

      // 409 Conflict means email is taken
      if (err.response?.status === 409 && errorResponse?.field === 'email') {
        return false;
      }

      // For other errors, log but return true (don't block form submission)
      console.error('[useEmployeesREST] Email check error:', err);
      return true;
    }
  }, []);

  /**
   * Create new employee
   * REST API: POST /api/employees
   */
  const createEmployee = useCallback(async (
    employeeData: CreateEmployeeRequest,
    permissionsData?: UpdatePermissionsRequest
  ): Promise<{ success: boolean; employee?: Employee; error?: any }> => {
    setLoading(true);
    setError(null);
    try {
      const payload = permissionsData
        ? { ...employeeData, permissionsData }
        : employeeData;

      const response: ApiResponse<{ employeeId: string; employee: Employee }> =
        await post('/employees', payload);

      if (response.success && response.data) {
        // Refresh the list to get the updated employee
        await fetchEmployeesWithStats();
        return { success: true, employee: response.data.employee };
      }
      throw new Error(response.error?.message || 'Failed to create employee');
    } catch (err: any) {
      const errorResponse = err.response?.data;

      // Enhanced error handling with field-specific errors
      let errorMessage = errorResponse?.error?.message || err.message || 'Failed to create employee';
      let field = errorResponse?.error?.field;
      let errorCode = errorResponse?.error?.code;

      // Log detailed error for developers
      console.error('[useEmployeesREST] Employee creation error:', {
        errorCode,
        field,
        message: errorMessage,
        details: errorResponse?.error?.details,
        requestId: errorResponse?.error?.requestId,
        clerkTraceId: errorResponse?.error?.clerkTraceId,
        fullError: err
      });

      // User-friendly error messages based on error code
      if (errorCode === 'USERNAME_TAKEN') {
        errorMessage = 'Username is already taken. Please choose another.';
      } else if (errorCode === 'EMAIL_EXISTS_IN_CLERK') {
        errorMessage = 'This email is already registered in the system.';
      } else if (errorCode === 'PASSWORD_TOO_WEAK') {
        errorMessage = 'Password is too weak. The system will generate a secure password.';
      }

      setError(errorMessage);

      // Return detailed error for form field highlighting
      return {
        success: false,
        error: {
          ...errorResponse?.error,
          field,
          code: errorCode,
          message: errorMessage
        }
      };
    } finally {
      setLoading(false);
    }
  }, [fetchEmployeesWithStats]);

  /**
   * Update employee basic info
   * REST API: PUT /api/employees/:id
   */
  const updateEmployee = useCallback(async (
    employeeId: string,
    updateData: Partial<Employee>
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<Employee> = await put(`/employees/${employeeId}`, updateData);

      if (response.success && response.data) {
        // Refresh the list
        await fetchEmployeesWithStats();
        return true;
      }
      throw new Error(response.error?.message || 'Failed to update employee');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to update employee';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchEmployeesWithStats]);

  /**
   * Update employee permissions
   * REST API: PUT /api/employees/:id
   */
  const updatePermissions = useCallback(async (
    permissionsData: UpdatePermissionsRequest
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse = await put(`/employees/${permissionsData.employeeId}`, permissionsData);

      if (response.success) {
        return true;
      }
      throw new Error(response.error?.message || 'Failed to update permissions');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to update permissions';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update employee personal information
   * REST API: PUT /api/employees/:id
   */
  const updatePersonalInfo = useCallback(async (
    employeeId: string,
    personalData: any
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse = await put(`/employees/${employeeId}`, {
        personal: personalData
      });

      if (response.success) {
        return true;
      }
      throw new Error(response.error?.message || 'Failed to update personal info');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to update personal info';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update employee bank details
   * REST API: PUT /api/employees/:id
   */
  const updateBankDetails = useCallback(async (
    employeeId: string,
    bankData: any
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse = await put(`/employees/${employeeId}`, {
        bank: bankData
      });

      if (response.success) {
        return true;
      }
      throw new Error(response.error?.message || 'Failed to update bank details');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to update bank details';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update employee family information
   * REST API: PUT /api/employees/:id
   */
  const updateFamilyInfo = useCallback(async (
    employeeId: string,
    familyData: any
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const normalizedFamily = normalizeFamilyPayload(familyData);
      const response: ApiResponse = await put(`/employees/${employeeId}`, {
        family: normalizedFamily
      });

      if (response.success) {
        return true;
      }
      throw new Error(response.error?.message || 'Failed to update family info');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to update family info';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update employee education information
   * REST API: PUT /api/employees/:id
   */
  const updateEducationInfo = useCallback(async (
    employeeId: string,
    educationData: any
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const normalizedEducation = normalizeEducationPayload(educationData);
      const response: ApiResponse = await put(`/employees/${employeeId}`, {
        education: normalizedEducation
      });

      if (response.success) {
        return true;
      }
      throw new Error(response.error?.message || 'Failed to update education info');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to update education info';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update employee emergency contacts
   * REST API: PUT /api/employees/:id
   */
  const updateEmergencyContacts = useCallback(async (
    employeeId: string,
    emergencyContacts: any
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const normalizedEmergencyContacts = normalizeEmergencyContactsPayload(emergencyContacts);
      const response: ApiResponse = await put(`/employees/${employeeId}`, {
        emergencyContacts: normalizedEmergencyContacts
      });

      if (response.success) {
        return true;
      }
      throw new Error(response.error?.message || 'Failed to update emergency contacts');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to update emergency contacts';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update employee experience
   * REST API: PUT /api/employees/:id
   */
  const updateExperienceInfo = useCallback(async (
    employeeId: string,
    experienceData: any
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const normalizedExperience = normalizeExperiencePayload(experienceData);
      const response: ApiResponse = await put(`/employees/${employeeId}`, {
        experience: normalizedExperience
      });

      if (response.success) {
        return true;
      }
      throw new Error(response.error?.message || 'Failed to update experience');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to update experience';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Reassign employee-owned records and delete employee
   * REST API: POST /api/employees/:id/reassign-delete
   */
  const reassignAndDeleteEmployee = useCallback(async (
    employeeId: string,
    reassignToEmployeeId: string,
    options: { showMessage?: boolean } = {}
  ): Promise<DeleteResult> => {
    setLoading(true);
    setError(null);
    const { showMessage = true } = options;
    try {
      const response: ApiResponse = await post(`/employees/${employeeId}/reassign-delete`, {
        reassignTo: reassignToEmployeeId
      });

      if (response.success) {
        if (showMessage) {
          message.success('Employee reassigned and deleted successfully!');
        }
        await fetchEmployeesWithStats();
        return { success: true };
      }
      throw new Error(response.error?.message || 'Failed to reassign and delete employee');
    } catch (err: any) {
      const apiError = buildApiError(err, 'Failed to reassign and delete employee');
      if (apiError.code !== 'DEPENDENT_RECORDS') {
        setError(apiError.message);
        if (showMessage) {
          message.error(apiError.message);
        }
      }
      return { success: false, error: apiError };
    } finally {
      setLoading(false);
    }
  }, [fetchEmployeesWithStats]);

  /**
   * Update employee about section
   * REST API: PUT /api/employees/:id
   */
  const updateAboutInfo = useCallback(async (
    employeeId: string,
    about: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse = await put(`/employees/${employeeId}`, {
        about
      });

      if (response.success) {
        return true;
      }
      throw new Error(response.error?.message || 'Failed to update about section');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to update about section';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Delete employee
   * REST API: DELETE /api/employees/:id
   */
  const deleteEmployee = useCallback(async (
    employeeId: string,
    options: { showMessage?: boolean } = {}
  ): Promise<DeleteResult> => {
    setLoading(true);
    setError(null);
    const { showMessage = true } = options;
    try {
      const response: ApiResponse = await del(`/employees/${employeeId}`);

      if (response.success) {
        if (showMessage) {
          message.success('Employee deleted successfully!');
        }
        // Refresh the list
        await fetchEmployeesWithStats();
        return { success: true };
      }
      throw new Error(response.error?.message || 'Failed to delete employee');
    } catch (err: any) {
      const apiError = buildApiError(err, 'Failed to delete employee');
      if (apiError.code !== 'DEPENDENT_RECORDS') {
        setError(apiError.message);
        if (showMessage) {
          message.error(apiError.message);
        }
      }
      return { success: false, error: apiError };
    } finally {
      setLoading(false);
    }
  }, [fetchEmployeesWithStats]);

  /**
   * Search employees
   * REST API: GET /api/employees/search
   */
  const searchEmployees = useCallback(async (searchTerm: string) => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<Employee[]> = await get('/employees/search', {
        params: { q: searchTerm }
      });

      if (response.success && response.data) {
        const normalizedEmployees = response.data.map((emp: Employee) => ({
          ...emp,
          status: normalizeStatus(emp.status)
        }));
        setEmployees(normalizedEmployees);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to search employees';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get employee statistics by department
   * REST API: GET /api/employees/stats/by-department
   */
  const getDepartmentStats = useCallback(async () => {
    try {
      const response: ApiResponse<Record<string, number>> = await get('/employees/stats/by-department');

      if (response.success && response.data) {
        return response.data;
      }
      return {};
    } catch (err: any) {
      console.error('[useEmployeesREST] Failed to fetch department stats:', err);
      return {};
    }
  }, []);

  /**
   * Check for duplicate email/phone/username
   * REST API: POST /api/employees/check-duplicates
   */
  const checkDuplicates = useCallback(async (
    email: string,
    phone?: string,
    excludeEmployeeId?: string
  ): Promise<CheckDuplicatesResponse> => {
    try {
      const payload: any = { email };
      if (phone) payload.phone = phone;
      if (excludeEmployeeId) payload.excludeEmployeeId = excludeEmployeeId;

      const response: ApiResponse<CheckDuplicatesResponse> =
        await post('/employees/check-duplicates', payload);

      return response.data || { done: true };
    } catch (err: any) {
      const errorResponse = err.response?.data;

      // Handle 409 Conflict (duplicate found)
      if (err.response?.status === 409) {
        return {
          done: false,
          exists: true,
          error: errorResponse?.error?.message || 'Duplicate found',
          field: errorResponse?.error?.field
        };
      }

      const errorMessage = errorResponse?.error?.message || err.message || 'Failed to check duplicates';
      return {
        done: false,
        error: errorMessage
      };
    }
  }, []);

  /**
   * Check employee lifecycle status
   * REST API: POST /api/employees/check-lifecycle-status
   */
  const checkLifecycleStatus = useCallback(async (
    employeeId: string
  ): Promise<LifecycleStatusResponse> => {
    try {
      const response: ApiResponse<LifecycleStatusResponse> =
        await post('/employees/check-lifecycle-status', { employeeId });

      return response.data || { hasLifecycleRecord: false, canChangeStatus: true };
    } catch (err: any) {
      console.error('[useEmployeesREST] Failed to check lifecycle status:', err);
      return { hasLifecycleRecord: false, canChangeStatus: true };
    }
  }, []);

  /**
   * Upload employee profile image
   * REST API: POST /api/employees/:id/image
   */
  const uploadProfileImage = useCallback(async (
    employeeId: string,
    file: File
  ): Promise<{ success: boolean; profileImage?: string; error?: any }> => {
    setLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('profileImage', file);

      // Get the base URL from the api service
      const API_BASE_URL =
        process.env.REACT_APP_API_URL || process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

      // Make direct axios call with FormData
      const response = await axios.post(
        `${API_BASE_URL}/api/employees/${employeeId}/image`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            // Don't set Content-Type - let axios set it with the correct boundary
          },
          timeout: 60000, // 60 seconds for image upload
        }
      );

      if (response.data && response.data.success) {
        message.success('Profile image uploaded successfully!');

        // Update the employee in the local state
        setEmployees(prev =>
          prev.map(emp =>
            emp._id === employeeId
              ? { ...emp, profileImage: response.data.data.profileImage, avatarUrl: response.data.data.profileImage }
              : emp
          )
        );

        return {
          success: true,
          profileImage: response.data.data.profileImage
        };
      }
      throw new Error(response.data?.error?.message || 'Failed to upload image');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to upload profile image';
      setError(errorMessage);
      message.error(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Delete employee profile image
   * REST API: DELETE /api/employees/:id/image
   */
  const deleteProfileImage = useCallback(async (
    employeeId: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse = await del(`/employees/${employeeId}/image`);

      if (response.success) {
        message.success('Profile image removed successfully!');

        // Update the employee in the local state
        setEmployees(prev =>
          prev.map(emp =>
            emp._id === employeeId
              ? { ...emp, profileImage: null, avatarUrl: null }
              : emp
          )
        );

        return true;
      }
      throw new Error(response.error?.message || 'Failed to delete image');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to delete profile image';
      setError(errorMessage);
      message.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Socket.IO real-time listeners for broadcast notifications
  useEffect(() => {
    if (!socket) return;

    const handleEmployeeCreated = (data: Employee) => {
      console.log('[useEmployeesREST] Employee created via broadcast:', data);
      // Refresh the list to get updated data
      fetchEmployeesWithStats();
    };

    const handleEmployeeUpdated = (data: Employee) => {
      console.log('[useEmployeesREST] Employee updated via broadcast:', data);
      // Update the employee in the list
      setEmployees(prev =>
        prev.map(emp => (emp._id === data._id ? { ...emp, ...data } : emp))
      );
    };

    const handleEmployeeDeleted = (data: { _id: string; employeeId: string }) => {
      console.log('[useEmployeesREST] Employee deleted via broadcast:', data);
      // Remove from list
      setEmployees(prev => prev.filter(emp => emp._id !== data._id));
    };

    // Listen for Socket.IO broadcast events
    socket.on('employee:created', handleEmployeeCreated);
    socket.on('employee:updated', handleEmployeeUpdated);
    socket.on('employee:deleted', handleEmployeeDeleted);

    return () => {
      socket.off('employee:created', handleEmployeeCreated);
      socket.off('employee:updated', handleEmployeeUpdated);
      socket.off('employee:deleted', handleEmployeeDeleted);
    };
  }, [socket, fetchEmployeesWithStats]);

  // Initial data fetch
  // Company ID is extracted server-side from the token's public metadata
  // The API interceptor handles token refresh automatically
  useEffect(() => {
    fetchEmployeesWithStats();
  }, []);

  return {
    employees,
    stats,
    loading,
    error,
    fetchEmployees,
    fetchActiveEmployeesList,
    fetchEmployeesWithStats,
    fetchStats,
    fetchReportingManagerOptions,
    getEmployeeById,
    getEmployeeDetails,
    createEmployee,
    updateEmployee,
    updatePermissions,
    updatePersonalInfo,
    updateBankDetails,
    updateFamilyInfo,
    updateEducationInfo,
    updateEmergencyContacts,
    updateExperienceInfo,
    reassignAndDeleteEmployee,
    updateAboutInfo,
    deleteEmployee,
    searchEmployees,
    getDepartmentStats,
    checkDuplicates,
    checkEmailAvailability,
    checkLifecycleStatus,
    uploadProfileImage,
    deleteProfileImage
  };
};

export default useEmployeesREST;
