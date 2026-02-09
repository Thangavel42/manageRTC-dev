import { useUser } from "@clerk/clerk-react";
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from "react-toastify";
import { Socket } from "socket.io-client";
import CollapseHeader from '../../../core/common/collapse-header/collapse-header';
import CommonSelect from '../../../core/common/commonSelect';
import Footer from "../../../core/common/footer";
import ImageWithBasePath from '../../../core/common/imageWithBasePath';
import { useSocket } from "../../../SocketContext";
import { all_routes } from '../../router/all_routes';
// REST API Hooks for HRM operations
import { useDepartmentsREST } from "../../../hooks/useDepartmentsREST";
import { useDesignationsREST } from "../../../hooks/useDesignationsREST";
import { useEmployeesREST } from "../../../hooks/useEmployeesREST";
// Common Modals
import AddEmployeeModal from '../../../core/modals/AddEmployeeModal';
import EditEmployeeModal from '../../../core/modals/EditEmployeeModal';

type PermissionAction = "read" | "write" | "create" | "delete" | "import" | "export";
type PermissionModule = "holidays" | "leaves" | "clients" | "projects" | "tasks" | "chats" | "assets" | "timingSheets";

interface EmployeeStats {
  totalEmployees: number;
  activeCount: number;
  inactiveCount: number;
  newJoinersCount: number;
}

interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface PassportInfo {
  number?: string;
  expiryDate?: string;
  country?: string;
}

interface Employee {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  account?: {
    role: string;
    userName?: string;
  };
  email: string;
  phone: string;
  gender?: string;
  dateOfBirth?: string | null;
  address?: Address;
  passport?: PassportInfo;
  companyName: string;
  departmentId: string;
  designationId: string;
  status: 'Active' | 'Inactive' | 'On Notice' | 'Resigned' | 'Terminated' | 'On Leave';
  dateOfJoining: string | null;
  about: string;
  role: string;
  enabledModules?: Record<PermissionModule, boolean>;
  permissions?: Record<PermissionModule, PermissionSet>;
  totalProjects?: number;
  completedProjects?: number;
  productivity?: number;
}

interface Department {
  _id: string;
  department: string;
}

interface Designation {
  _id: string;
  departmentId: string;
  designation: string;
}

interface Option {
  label: string,
  value: string,
}

interface PermissionSet {
  read: boolean;
  write: boolean;
  create: boolean;
  delete: boolean;
  import: boolean;
  export: boolean;
}

const EMPTY_OPTION = { value: '', label: 'Select Designation' };

const department = [
  { value: "Select", label: "Select" },
  { value: "All Department", label: "All Department" },
  { value: "Finance", label: "Finance" },
  { value: "Developer", label: "Developer" },
  { value: "Executive", label: "Executive" },
];
const designation = [
  { value: "Select", label: "Select" },
  { value: "Finance", label: "Finance" },
  { value: "Developer", label: "Developer" },
  { value: "Executive", label: "Executive" },
];

// Normalize status to ensure correct case for all possible statuses
const normalizeStatus = (status: string | undefined): "Active" | "Inactive" | "On Notice" | "Resigned" | "Terminated" | "On Leave" => {
  if (!status) return "Active";
  const normalized = status.toLowerCase();

  // Map all possible status values with case-insensitive matching
  if (normalized === "active") return "Active";
  if (normalized === "inactive") return "Inactive";
  if (normalized === "on notice") return "On Notice";
  if (normalized === "resigned") return "Resigned";
  if (normalized === "terminated") return "Terminated";
  if (normalized === "on leave") return "On Leave";

  // Default to Active for unknown statuses
  return "Active";
};

const EmployeesGrid = () => {
   const {  isLoaded } = useUser();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [designation, setDesignation] = useState<Option[]>([]);
  const [department, setDepartment] = useState<Option[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedDesignation, setSelectedDesignation] = useState<string>('');
  const [stats, setStats] = useState<EmployeeStats>({
    totalEmployees: 0,
    activeCount: 0,
    inactiveCount: 0,
    newJoinersCount: 0
  });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [reassignEmployeeId, setReassignEmployeeId] = useState('');
  const [reassignError, setReassignError] = useState('');
  const socket = useSocket() as Socket | null;

  // REST API Hooks for HRM operations
  const {
    employees: restEmployees,
    stats: restStats,
    loading: restLoading,
    error: restError,
    fetchEmployeesWithStats,
    reassignAndDeleteEmployee,
  } = useEmployeesREST();

  const { departments, fetchDepartments } = useDepartmentsREST();
  const { designations, fetchDesignations } = useDesignationsREST();

  // Initial data fetching with REST API
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch employees with stats
        await fetchEmployeesWithStats();

        // Fetch departments
        await fetchDepartments();
        // Departments will be synced via useEffect below

        // Designations will be loaded when a department is selected
      } catch (err: any) {
        console.error("Error loading initial data:", err);
        setError(err.message || "Failed to load initial data");
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchEmployeesWithStats, fetchDepartments]);

  // Sync departments from REST hook to local state
  useEffect(() => {
    if (departments && departments.length > 0) {
      const mappedDepartments = departments.map((d: Department) => ({
        value: d._id,
        label: d.department,
      }));
      setDepartment([{ value: '', label: 'Select' }, ...mappedDepartments]);
    }
  }, [departments]);

  // Sync REST hook data with local state
  useEffect(() => {
    if (restEmployees.length > 0) {
      // Normalize status for all employees
      const normalizedEmployees = restEmployees.map((emp: any) => ({
        ...emp,
        status: normalizeStatus(emp.status)
      }));
      setEmployees(normalizedEmployees);
    }
  }, [restEmployees]);

  useEffect(() => {
    if (restStats) {
      setStats(restStats);
    }
  }, [restStats]);

  useEffect(() => {
    if (restError) {
      setError(restError);
    }
  }, [restError]);

  // Socket.IO listeners for real-time broadcast notifications only
  useEffect(() => {
    if (!socket) return;

    const handleEmployeeCreated = (data: Employee) => {
      console.log('[EmployeesGrid] Employee created via broadcast:', data);
      // REST hook will handle the refresh, but we can also manually refresh
      fetchEmployeesWithStats();
    };

    const handleEmployeeUpdated = (data: Employee) => {
      console.log('[EmployeesGrid] Employee updated via broadcast:', data);
      // Update the employee in the list
      setEmployees(prev =>
        prev.map(emp => (emp._id === data._id ? { ...emp, ...data, status: normalizeStatus(data.status) } : emp))
      );
    };

    const handleEmployeeDeleted = (data: { _id: string; employeeId: string }) => {
      console.log('[EmployeesGrid] Employee deleted via broadcast:', data);
      // Remove from list
      setEmployees(prev => prev.filter(emp => emp._id !== data._id));
    };

    const handleDepartmentCreated = (data: Department) => {
      console.log('[EmployeesGrid] Department created via broadcast:', data);
      setDepartment(prev => [...prev, { value: data._id, label: data.department }]);
    };

    const handleDepartmentUpdated = (data: Department) => {
      console.log('[EmployeesGrid] Department updated via broadcast:', data);
      setDepartment(prev =>
        prev.map(dept => (dept.value === data._id ? { value: data._id, label: data.department } : dept))
      );
    };

    const handleDepartmentDeleted = (data: { _id: string }) => {
      console.log('[EmployeesGrid] Department deleted via broadcast:', data);
      setDepartment(prev => prev.filter(dept => dept.value !== data._id));
    };

    const handleDesignationCreated = (data: Designation) => {
      console.log('[EmployeesGrid] Designation created via broadcast:', data);
      setDesignation(prev => [...prev, { value: data._id, label: data.designation }]);
    };

    const handleDesignationUpdated = (data: Designation) => {
      console.log('[EmployeesGrid] Designation updated via broadcast:', data);
      setDesignation(prev =>
        prev.map(desg => (desg.value === data._id ? { value: data._id, label: data.designation } : desg))
      );
    };

    const handleDesignationDeleted = (data: { _id: string }) => {
      console.log('[EmployeesGrid] Designation deleted via broadcast:', data);
      setDesignation(prev => prev.filter(desg => desg.value !== data._id));
    };

    // Listen for Socket.IO broadcast events
    socket.on('employee:created', handleEmployeeCreated);
    socket.on('employee:updated', handleEmployeeUpdated);
    socket.on('employee:deleted', handleEmployeeDeleted);
    socket.on('department:created', handleDepartmentCreated);
    socket.on('department:updated', handleDepartmentUpdated);
    socket.on('department:deleted', handleDepartmentDeleted);
    socket.on('designation:created', handleDesignationCreated);
    socket.on('designation:updated', handleDesignationUpdated);
    socket.on('designation:deleted', handleDesignationDeleted);

    return () => {
      socket.off('employee:created', handleEmployeeCreated);
      socket.off('employee:updated', handleEmployeeUpdated);
      socket.off('employee:deleted', handleEmployeeDeleted);
      socket.off('department:created', handleDepartmentCreated);
      socket.off('department:updated', handleDepartmentUpdated);
      socket.off('department:deleted', handleDepartmentDeleted);
      socket.off('designation:created', handleDesignationCreated);
      socket.off('designation:updated', handleDesignationUpdated);
      socket.off('designation:deleted', handleDesignationDeleted);
    };
  }, [socket, fetchEmployeesWithStats]);

  const deleteEmployee = async (id: string, reassignedTo: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      if (!id || !reassignedTo) {
        setError("Employee ID and reassignment employee are required");
        setLoading(false);
        return false;
      }

      // Use REST API to reassign and delete employee
      const success = await reassignAndDeleteEmployee(id, reassignedTo);
      if (!success) {
        setError("Failed to delete employee");
        return false;
      }
      return true;
    } catch (error) {
      console.error("Delete error:", error);
      setError("Failed to delete employee");
      setLoading(false);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getEligibleEmployees = () => {
    if (!employeeToDelete) return [];

    return employees.filter(emp =>
      emp.status === 'Active' &&
      emp._id !== employeeToDelete._id &&
      emp.departmentId === employeeToDelete.departmentId &&
      emp.designationId === employeeToDelete.designationId
    );
  };

  const handleConfirmDelete = async () => {
    if (!employeeToDelete) return;

    const eligibleEmployees = getEligibleEmployees();

    if (eligibleEmployees.length === 0) {
      setReassignError('No employee available with the same designation in this department for reassignment.');
      return;
    }

    if (!reassignEmployeeId) {
      setReassignError('Please select an employee to reassign data to.');
      return;
    }

    if (reassignEmployeeId === employeeToDelete._id) {
      setReassignError('You cannot reassign data to the same employee being deleted.');
      return;
    }

    setReassignError('');
    const success = await deleteEmployee(employeeToDelete._id, reassignEmployeeId);

    if (success) {
      const closeButton = document.querySelector('#delete_modal [data-bs-dismiss="modal"]') as HTMLButtonElement | null;
      if (closeButton) closeButton.click();
      setEmployeeToDelete(null);
      setReassignEmployeeId('');
    }
  };

  if (loading || !isLoaded) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div
            className="d-flex justify-content-center align-items-center"
            style={{ height: "400px" }}
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
            <h4 className="alert-heading">Error!</h4>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <>
      {/* Page Wrapper */}
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Employee</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={all_routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">Employee</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Employee Grid
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
              <div className="me-2 mb-2">
                <div className="d-flex align-items-center border bg-white rounded p-1 me-2 icon-list">
                  <Link to={all_routes.employeeList} className="btn btn-icon btn-sm me-1">
                    <i className="ti ti-list-tree" />
                  </Link>
                  <Link
                    to={all_routes.employeeGrid}
                    className="btn btn-icon btn-sm active bg-primary text-white"
                  >
                    <i className="ti ti-layout-grid" />
                  </Link>
                </div>
              </div>
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
                  <ul className="dropdown-menu  dropdown-menu-end p-3">
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                      >
                        <i className="ti ti-file-type-pdf me-1" />
                        Export as PDF
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                      >
                        <i className="ti ti-file-type-xls me-1" />
                        Export as Excel{" "}
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="mb-2">
                <Link
                  to="#"
                  data-bs-toggle="modal" data-inert={true}
                  data-bs-target="#add_employee"
                  className="btn btn-primary d-flex align-items-center"
                >
                  <i className="ti ti-circle-plus me-2" />
                  Add Employee
                </Link>
              </div>
              <div className="head-icons ms-2">
                <CollapseHeader />
              </div>
            </div>
          </div>
          {/* /Breadcrumb */}
          {/* Total Plans */}
          <div className="row">
            {/* Total Plans */}
            <div className="col-lg-3 col-md-6 d-flex">
              <div className="card flex-fill">
                <div className="card-body d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center overflow-hidden">
                    <div>
                      <span className="avatar avatar-lg bg-dark rounded-circle">
                        <i className="ti ti-users" />
                      </span>
                    </div>
                    <div className="ms-2 overflow-hidden">
                      <p className="fs-12 fw-medium mb-1 text-truncate">
                        Total Employee
                      </p>
                      <h4>{stats?.totalEmployees || 0}</h4>
                    </div>
                  </div>
                  {/* <div>
                    <span className="badge badge-soft-purple badge-sm fw-normal">
                      <i className="ti ti-arrow-wave-right-down" />
                      +19.01%
                    </span>
                  </div> */}
                </div>
              </div>
            </div>
            {/* /Total Plans */}
            {/* Total Plans */}
            <div className="col-lg-3 col-md-6 d-flex">
              <div className="card flex-fill">
                <div className="card-body d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center overflow-hidden">
                    <div>
                      <span className="avatar avatar-lg bg-success rounded-circle">
                        <i className="ti ti-user-share" />
                      </span>
                    </div>
                    <div className="ms-2 overflow-hidden">
                      <p className="fs-12 fw-medium mb-1 text-truncate">Active</p>
                      <h4>{stats?.activeCount}</h4>
                    </div>
                  </div>
                  {/* <div>
                    <span className="badge badge-soft-primary badge-sm fw-normal">
                      <i className="ti ti-arrow-wave-right-down" />
                      +19.01%
                    </span>
                  </div> */}
                </div>
              </div>
            </div>
            {/* /Total Plans */}
            {/* Inactive Plans */}
            <div className="col-lg-3 col-md-6 d-flex">
              <div className="card flex-fill">
                <div className="card-body d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center overflow-hidden">
                    <div>
                      <span className="avatar avatar-lg bg-danger rounded-circle">
                        <i className="ti ti-user-pause" />
                      </span>
                    </div>
                    <div className="ms-2 overflow-hidden">
                      <p className="fs-12 fw-medium mb-1 text-truncate">InActive</p>
                      <h4>{stats?.inactiveCount}</h4>
                    </div>
                  </div>
                  {/* <div>
                    <span className="badge badge-soft-dark badge-sm fw-normal">
                      <i className="ti ti-arrow-wave-right-down" />
                      +19.01%
                    </span>
                  </div> */}
                </div>
              </div>
            </div>
            {/* /Inactive Companies */}
            {/* No of Plans  */}
            <div className="col-lg-3 col-md-6 d-flex">
              <div className="card flex-fill">
                <div className="card-body d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center overflow-hidden">
                    <div>
                      <span className="avatar avatar-lg bg-info rounded-circle">
                        <i className="ti ti-user-plus" />
                      </span>
                    </div>
                    <div className="ms-2 overflow-hidden">
                      <p className="fs-12 fw-medium mb-1 text-truncate">
                        New Joiners
                      </p>
                      <h4>{stats?.newJoinersCount}</h4>
                    </div>
                  </div>
                  {/* <div>
                    <span className="badge badge-soft-secondary badge-sm fw-normal">
                      <i className="ti ti-arrow-wave-right-down" />
                      +19.01%
                    </span>
                  </div> */}
                </div>
              </div>
            </div>
            {/* /No of Plans */}
          </div>
          <div className="card">
            <div className="card-body p-3">
              <div className="d-flex align-items-center justify-content-between flex-wrap row-gap-3">
                <h5>Employees Grid</h5>
                {/* filters */}
                <div className="d-flex align-items-center flex-wrap row-gap-3">
                  <div className="dropdown me-3">
                    <Link
                      to="#"
                      className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                      data-bs-toggle="dropdown"
                    >
                      Designation
                    </Link>
                    <ul className="dropdown-menu  dropdown-menu-end p-3">
                      <li>
                        <Link
                          to="#"
                          className="dropdown-item rounded-1"
                        >
                          Finance
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="#"
                          className="dropdown-item rounded-1"
                        >
                          Developer
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="#"
                          className="dropdown-item rounded-1"
                        >
                          Executive
                        </Link>
                      </li>
                    </ul>
                  </div>
                  <div className="dropdown">
                    <Link
                      to="#"
                      className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                      data-bs-toggle="dropdown"
                    >
                      Sort By : Last 7 Days
                    </Link>
                    <ul className="dropdown-menu  dropdown-menu-end p-3">
                      <li>
                        <Link
                          to="#"
                          className="dropdown-item rounded-1"
                        >
                          Last 7 Days
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="#"
                          className="dropdown-item rounded-1"
                        >
                          Ascending
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Clients Grid */}
          <div className="row">
            {employees.length === 0 ? (
              <p className='text-center'>No employees found</p>
            ) : (employees.map(emp => {
              const {
                _id,
                firstName,
                lastName,
                role,
                totalProjects = 0,
                completedProjects = 0,
                productivity = 0,
                status,
                avatarUrl,
              } = emp;

              const fullName = `${firstName || ""} ${lastName || ""}`.trim() || "Unknown Name";
              const progressPercent = Math.round(productivity);
              const progressBarColor =
                progressPercent >= 65 ? "bg-purple"
                  : progressPercent >= 40 ? "bg-warning"
                    : "bg-danger";

              return (
                <div key={_id} className="col-xl-3 col-lg-4 col-md-6 mb-4">
                  <div className="card">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div className="form-check form-check-md">
                          <input className="form-check-input" type="checkbox" />
                        </div>
                        <div>
                          <Link
                            to={`${all_routes.employeedetails}/${_id}`}
                            className={`avatar avatar-xl avatar-rounded border p-1 border-primary rounded-circle ${emp.status === "Active" ? "online" : "offline"
                              }`}
                          >
                            <img
                              src={avatarUrl || "assets/img/profiles/profile.png"}
                              className="img-fluid"
                              alt={fullName}
                            />
                          </Link>
                        </div>
                        <div className="dropdown">
                          <button
                            className="btn btn-icon btn-sm rounded-circle"
                            type="button"
                            data-bs-toggle="dropdown"
                            aria-expanded="false"
                          >
                            <i className="ti ti-dots-vertical" />
                          </button>
                          <ul className="dropdown-menu dropdown-menu-end p-3">
                            <li>
                              <Link
                                className="dropdown-item rounded-1"
                                to="#"
                                data-bs-toggle="modal"
                                data-inert={true}
                                data-bs-target="#edit_employee"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setEditingEmployee(emp);
                                  // Small delay to ensure Bootstrap is ready
                                  setTimeout(() => {
                                    const modalElement = document.querySelector('#edit_employee') as HTMLElement;
                                    if (modalElement) {
                                      const modal = (window as any).Bootstrap?.Modal?.getOrCreateInstance(modalElement);
                                      if (modal) {
                                        modal.show();
                                      }
                                    }
                                  }, 50);
                                }}
                              >
                                <i className="ti ti-edit me-1" /> Edit
                              </Link>
                            </li>
                            <li>
                              <Link
                                className="dropdown-item rounded-1"
                                to="#"
                                data-bs-toggle="modal"
                                data-inert={true}
                                data-bs-target="#delete_modal"
                                onClick={() => {
                                  setEmployeeToDelete(emp);
                                  setReassignEmployeeId('');
                                  setReassignError('');
                                }}
                              >
                                <i className="ti ti-trash me-1" /> Delete
                              </Link>
                            </li>
                          </ul>
                        </div>
                      </div>
                      <div className="text-center mb-3">
                        <h6 className="mb-1">
                          <Link to={`/employees/${emp._id}`}>{fullName}</Link>
                        </h6>
                        <span className="badge bg-pink-transparent fs-10 fw-medium">
                          {role || "employee"}
                        </span>
                      </div>
                      <div className="row text-center">
                        <div className="col-4">
                          <div className="mb-3">
                            <span className="fs-12">Projects</span>
                            <h6 className="fw-medium">{totalProjects}</h6>
                          </div>
                        </div>
                        <div className="col-4">
                          <div className="mb-3">
                            <span className="fs-12">Done</span>
                            <h6 className="fw-medium">{completedProjects}</h6>
                          </div>
                        </div>
                        <div className="col-4">
                          <div className="mb-3">
                            <span className="fs-12">Progress</span>
                            <h6 className="fw-medium">{totalProjects - completedProjects}</h6>
                          </div>
                        </div>
                      </div>
                      <p className="mb-2 text-center">
                        Productivity : <span className={`text-${progressBarColor === "bg-purple" ? "purple" : progressBarColor === "bg-warning" ? "warning" : "danger"}`}>
                          {progressPercent}%
                        </span>
                      </p>
                      <div className="progress progress-xs mb-2">
                        <div
                          className={`progress-bar ${progressBarColor}`}
                          role="progressbar"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            }))}
          </div>
          {/* /Clients Grid */}
        </div>
        <Footer/>
      </div>
      {/* /Page Wrapper */}
      {/* Add Employee Modal */}
      <AddEmployeeModal
        onSuccess={() => {
          fetchEmployeesWithStats();
        }}
      />
      {/* Edit Employee Modal */}
      <EditEmployeeModal
        employee={editingEmployee}
        onUpdate={(updatedEmployee) => {
          setEditingEmployee(updatedEmployee as Employee);
          fetchEmployeesWithStats();
        }}
      />
      {/* Delete Employee Modal */}
      <div className="modal fade" id="delete_modal">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-body text-center">
              <span className="avatar avatar-xl bg-transparent-danger text-danger mb-3">
                <i className="ti ti-trash-x fs-36" />
              </span>
              <h4 className="mb-1">Confirm Deletion</h4>
              <p className="mb-1 text-warning fw-medium">
                This employee has associated records. Please reassign them before deletion.
              </p>
              <p className="mb-3">
                {employeeToDelete
                  ? `Are you sure you want to delete employee "${employeeToDelete?.firstName}"? This cannot be undone.`
                  : "You want to delete all the marked items, this can't be undone once you delete."}
              </p>
              <div className="text-start mb-3">
                <label className="form-label">Reassign employee data to</label>
                {(() => {
                  const eligibleEmployees = getEligibleEmployees();

                  if (eligibleEmployees.length === 0) {
                    return (
                      <div className="alert alert-warning py-2 mb-2">
                        <i className="ti ti-alert-circle me-1"></i>
                        No employee available with the same designation in this department for reassignment.
                      </div>
                    );
                  }

                  return (
                    <select
                      className="form-select"
                      value={reassignEmployeeId}
                      onChange={(e) => {
                        setReassignEmployeeId(e.target.value);
                        setReassignError('');
                      }}
                    >
                      <option value="">Select an employee</option>
                      {eligibleEmployees.map(emp => (
                        <option key={emp._id} value={emp._id}>
                          {emp.firstName} {emp.lastName}
                        </option>
                      ))}
                    </select>
                  );
                })()}
                {reassignError && (
                  <div className="text-danger mt-1">{reassignError}</div>
                )}
              </div>
              <div className="d-flex justify-content-center">
                <button
                  className="btn btn-light me-3"
                  data-bs-dismiss="modal"
                  onClick={() => {
                    setEmployeeToDelete(null);
                    setReassignEmployeeId('');
                    setReassignError('');
                  }}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  onClick={handleConfirmDelete}
                  disabled={loading || getEligibleEmployees().length === 0}
                >
                  {loading ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/*delete policy*/}
    </>

  )

}

export default EmployeesGrid
