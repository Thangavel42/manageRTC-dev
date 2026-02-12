import { useUser } from "@clerk/clerk-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import { Socket } from "socket.io-client";
import CollapseHeader from "../../../core/common/collapse-header/collapse-header";
import Table from "../../../core/common/dataTable/index";
import PredefinedDateRanges from "../../../core/common/datePicker";
import EmployeeNameCell from "../../../core/common/EmployeeNameCell";
import Footer from "../../../core/common/footer";
import { employee_list_details } from "../../../core/data/json/employees_list_details";
import { useSocket } from "../../../SocketContext";
import { all_routes } from "../../router/all_routes";
// REST API Hooks for HRM operations
import { useDepartmentsREST } from "../../../hooks/useDepartmentsREST";
import { useDesignationsREST } from "../../../hooks/useDesignationsREST";
import { useEmployeesREST } from "../../../hooks/useEmployeesREST";
// Common Modals
import AddEmployeeModal from "../../../core/modals/AddEmployeeModal";
import EditEmployeeModal from "../../../core/modals/EditEmployeeModal";

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
  label: string;
  value: string;
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

type PermissionModule =
  | "holidays"
  | "leaves"
  | "clients"
  | "projects"
  | "tasks"
  | "chats"
  | "assets"
  | "timingSheets";

interface PermissionSet {
  read: boolean;
  write: boolean;
  create: boolean;
  delete: boolean;
  import: boolean;
  export: boolean;
}

interface Employee {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  profileImage?: string;
  account?: {
    role: string;
    userName?: string;
  };
  email: string;
  phone: string;
  gender?: string;
  dateOfBirth?: string;
  address?: Address;
  passport?: PassportInfo;
  companyName: string;
  departmentId: string;
  designationId: string;
  reportingTo?: string;
  reportingManagerName?: string;
  shiftId?: string;
  shiftName?: string;
  batchId?: string;
  batchName?: string;
  batchShiftName?: string;
  employmentType?: "Full-time" | "Part-time" | "Contract" | "Intern";
  status:
    | "Active"
    | "Inactive"
    | "On Notice"
    | "Resigned"
    | "Terminated"
    | "On Leave";
  dateOfJoining: string | null;
  about: string;
  role: string;
  enabledModules?: Record<PermissionModule, boolean>;
  permissions?: Record<PermissionModule, PermissionSet>;
  totalProjects?: number;
  completedProjects?: number;
  productivity?: number;
}

interface EmployeeStats {
  totalEmployees: number;
  activeCount: number;
  inactiveCount: number;
  newJoinersCount: number;
}

// Helper Functions
const generateId = (prefix: string): string => {
  const randomNum = Math.floor(1 + Math.random() * 9999);
  const paddedNum = randomNum.toString().padStart(4, "0");
  return `${prefix}-${paddedNum}`;
};

// Normalize status to ensure correct case for all possible statuses
const normalizeStatus = (
  status: string | undefined,
):
  | "Active"
  | "Inactive"
  | "On Notice"
  | "Resigned"
  | "Terminated"
  | "On Leave" => {
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

const EmployeeList = () => {
  const ClerkID = useUser();
  console.log("User id", ClerkID.user.id);

  // const {  isLoaded } = useUser();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [department, setDepartment] = useState<Option[]>([]);
  const [designation, setDesignation] = useState<Option[]>([]);
  const [allDesignations, setAllDesignations] = useState<Option[]>([]);
  const [filteredDesignations, setFilteredDesignations] = useState<Option[]>(
    [],
  );
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [selectedDesignation, setSelectedDesignation] = useState<string>("");
  const [sortOrder, setSortOrder] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(
    null,
  );
  const [deleteError, setDeleteError] = useState('');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    status: "",
    departmentId: "",
  });
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<EmployeeStats>({
    totalEmployees: 0,
    activeCount: 0,
    inactiveCount: 0,
    newJoinersCount: 0,
  });

  // Lifecycle status tracking for status dropdown control
  const [lifecycleStatus, setLifecycleStatus] = useState<{
    hasLifecycleRecord: boolean;
    canChangeStatus: boolean;
    type?: string;
    status?: string;
    message?: string;
  } | null>(null);

  // View state - 'list' or 'grid'
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // REST API Hooks for HRM operations
  const {
    employees: restEmployees,
    stats: restStats,
    loading: restLoading,
    error: restError,
    fetchEmployeesWithStats,
    deleteEmployee: deleteEmployeeREST,
    checkLifecycleStatus: checkLifecycleStatusREST
  } = useEmployeesREST();

  const { departments, fetchDepartments } = useDepartmentsREST();
  const { designations, fetchDesignations } = useDesignationsREST();

  const socket = useSocket() as Socket | null;

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
      setDepartment([{ value: "", label: "Select" }, ...mappedDepartments]);
    }
  }, [departments]);

  // Sync designations from REST hook to local state
  useEffect(() => {
    if (designations && designations.length > 0) {
      const mappedDesignations = designations.map((d: Designation) => ({
        value: d._id,
        label: d.designation,
      }));
      setDesignation([{ value: "", label: "Select Designation" }, ...mappedDesignations]);
      setAllDesignations([{ value: "", label: "Select Designation" }, ...mappedDesignations]);
    } else {
      // If no designations, reset to empty with placeholder
      setDesignation([{ value: "", label: "Select Designation" }]);
    }
  }, [designations]);

  // Sync REST hook data with local state
  useEffect(() => {
    if (restEmployees.length > 0) {
      // Normalize status for all employees
      const normalizedEmployees = restEmployees.map((emp: any) => ({
        ...emp,
        status: normalizeStatus(emp.status)
      }));
      setAllEmployees(normalizedEmployees);
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
      console.log('[EmployeeList] Employee created via broadcast:', data);
      // REST hook will handle the refresh, but we can also manually refresh
      fetchEmployeesWithStats();
    };

    const handleEmployeeUpdated = (data: Employee) => {
      console.log('[EmployeeList] Employee updated via broadcast:', data);
      // Update the employee in the list
      setEmployees(prev =>
        prev.map(emp => (emp._id === data._id ? { ...emp, ...data, status: normalizeStatus(data.status) } : emp))
      );
    };

    const handleEmployeeDeleted = (data: { _id: string; employeeId: string }) => {
      console.log('[EmployeeList] Employee deleted via broadcast:', data);
      // Remove from list
      setEmployees(prev => prev.filter(emp => emp._id !== data._id));
    };

    const handleDepartmentCreated = (data: Department) => {
      console.log('[EmployeeList] Department created via broadcast:', data);
      setDepartment(prev => [...prev, { value: data._id, label: data.department }]);
    };

    const handleDepartmentUpdated = (data: Department) => {
      console.log('[EmployeeList] Department updated via broadcast:', data);
      setDepartment(prev =>
        prev.map(dept => (dept.value === data._id ? { value: data._id, label: data.department } : dept))
      );
    };

    const handleDepartmentDeleted = (data: { _id: string }) => {
      console.log('[EmployeeList] Department deleted via broadcast:', data);
      setDepartment(prev => prev.filter(dept => dept.value !== data._id));
    };

    const handleDesignationCreated = (data: Designation) => {
      console.log('[EmployeeList] Designation created via broadcast:', data);
      // Add to filtered designations if it matches current department filter
      setFilteredDesignations(prev => [...prev, { value: data._id, label: data.designation }]);
    };

    const handleDesignationUpdated = (data: Designation) => {
      console.log('[EmployeeList] Designation updated via broadcast:', data);
      setFilteredDesignations(prev =>
        prev.map(desg => (desg.value === data._id ? { value: data._id, label: data.designation } : desg))
      );
    };

    const handleDesignationDeleted = (data: { _id: string }) => {
      console.log('[EmployeeList] Designation deleted via broadcast:', data);
      setFilteredDesignations(prev => prev.filter(desg => desg.value !== data._id));
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

  useEffect(() => {
    if (editingEmployee) {
      // Fetch designations for the employee's department
      console.log("Fetching designations for departmentID", editingEmployee.departmentId);

      // Check lifecycle status when employee is selected for editing
      const checkLifecycle = async () => {
        const status = await checkLifecycleStatusREST(editingEmployee.employeeId);
        if (status) {
          setLifecycleStatus(status);

          // Show warning if employee has lifecycle records
          if (status.hasLifecycleRecord && status.message) {
            toast.info(status.message, {
              position: "top-right",
              autoClose: 5000,
            });
          }
        }
      };

      checkLifecycle();

      // Fetch designations for the employee's department
      if (editingEmployee.departmentId) {
        setSelectedDepartment(editingEmployee.departmentId);
        fetchDesignations({ departmentId: editingEmployee.departmentId }).then((desigData: any[]) => {
          if (desigData && desigData.length > 0) {
            const mappedDesignations = desigData.map((d: Designation) => ({
              value: d._id,
              label: d.designation,
            }));
            setDesignation([{ value: "", label: "Select Designation" }, ...mappedDesignations]);
          }
        });
      }
    }
  }, [editingEmployee, checkLifecycleStatusREST, fetchDesignations]);

  // Dynamically compute available status filters based on actual employee data
  const availableStatusFilters = useMemo(() => {
    // Get unique statuses from employees
    const uniqueStatuses = new Set<string>();
    employees.forEach((emp) => {
      if (emp.status) {
        uniqueStatuses.add(normalizeStatus(emp.status));
      }
    });

    // Convert to filter format and sort
    const statusOrder = [
      "Active",
      "Inactive",
      "On Notice",
      "On Leave",
      "Resigned",
      "Terminated",
    ];
    return Array.from(uniqueStatuses)
      .sort((a, b) => statusOrder.indexOf(a) - statusOrder.indexOf(b))
      .map((status) => ({ text: status, value: status }));
  }, [allEmployees]);

  const parseDateValue = (value: string | null | undefined): Date | null => {
    if (!value) return null;
    if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
      const [day, month, year] = value.split("-").map(Number);
      return new Date(year, month - 1, day);
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  useEffect(() => {
    const filtered = allEmployees.filter((emp) => {
      if (filters.departmentId && emp.departmentId !== filters.departmentId) {
        return false;
      }

      if (filters.status && filters.status !== "all") {
        if (normalizeStatus(emp.status) !== normalizeStatus(filters.status)) {
          return false;
        }
      }

      if (filters.startDate && filters.endDate) {
        const rangeStart = parseDateValue(filters.startDate);
        const rangeEnd = parseDateValue(filters.endDate);
        const employeeDate = parseDateValue(emp.dateOfJoining) || parseDateValue((emp as any).createdAt);

        if (!rangeStart || !rangeEnd || !employeeDate) {
          return false;
        }

        if (employeeDate < rangeStart || employeeDate > rangeEnd) {
          return false;
        }
      }

      return true;
    });

    if (sortOrder) {
      filtered.sort((a, b) => {
        const nameA = `${a.firstName || ""} ${a.lastName || ""}`.trim().toLowerCase();
        const nameB = `${b.firstName || ""} ${b.lastName || ""}`.trim().toLowerCase();
        if (sortOrder === "ascending") {
          return nameA.localeCompare(nameB);
        }
        if (sortOrder === "descending") {
          return nameB.localeCompare(nameA);
        }
        return 0;
      });
    }

    setEmployees(filtered);
  }, [allEmployees, filters, sortOrder]);

  // Clean up modal backdrops whenever modals might have closed
  useEffect(() => {
    const handleModalHidden = () => {
      // Remove all modal backdrops
      const backdrops = document.querySelectorAll(".modal-backdrop");
      backdrops.forEach((backdrop) => backdrop.remove());

      // Remove modal-open class from body
      document.body.classList.remove("modal-open");

      // Reset body style
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };

    // Listen for Bootstrap modal hidden events
    const modals = document.querySelectorAll(".modal");
    modals.forEach((modal) => {
      modal.addEventListener("hidden.bs.modal", handleModalHidden);
    });

    return () => {
      modals.forEach((modal) => {
        modal.removeEventListener("hidden.bs.modal", handleModalHidden);
      });
    };
  }, []);

  const data = employee_list_details;
  const columns = [
    {
      title: "Emp ID",
      dataIndex: "employeeId",
      render: (text: String, record: any) => (
        <Link to={`/employees/${record._id}`}>{text}</Link>
      ),
      sorter: (a: any, b: any) =>
        (a.employeeId || "").length - (b.employeeId || "").length,
    },
    {
      title: "Name",
      dataIndex: "name",
      render: (text: string, record: any) => {
        return (
          <EmployeeNameCell
            name={`${record.firstName} ${record.lastName}`}
            image={record.avatarUrl}
            employeeId={record._id}
            secondaryText={record.role}
            avatarTheme="primary"
          />
        );
      },
      sorter: (a: any, b: any) =>
        (a.firstName || "").localeCompare(b.firstName || ""),
    },
    {
      title: "Email",
      dataIndex: "email",
      render: (text: string, record: any) => (
        <span>{record.email || "-"}</span>
      ),
      sorter: (a: any, b: any) =>
        (a.email || "").localeCompare(b.email || ""),
    },
    {
      title: "Phone",
      dataIndex: "phone",
      render: (text: string, record: any) => (
        <span>{record.phone || "-"}</span>
      ),
      sorter: (a: any, b: any) =>
        (a.phone || "").localeCompare(b.phone || ""),
    },
    {
      title: "Department",
      dataIndex: "departmentId",
      render: (text: string, record: any) =>
        department.find((dep) => dep.value === record.departmentId)?.label,
      sorter: (a: any, b: any) =>
        (a.departmentId || "").localeCompare(b.departmentId || ""),
    },
    {
      title: "Role",
      dataIndex: ["account", "role"],
      render: (text: string, record: any) => {
        const role = record.account?.role || record.role || "N/A";
        return <span className="text-capitalize">{role}</span>;
      },
      sorter: (a: any, b: any) =>
        (a.account?.role || a.role || "").localeCompare(
          b.account?.role || b.role || ""
        ),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (text: string, record: any) => {
        // Normalize status for comparison (handle case-insensitive)
        const status = (text || "").toLowerCase();

        // Determine badge color based on status
        let badgeClass = "badge-secondary"; // Default gray

        if (status === "active") {
          badgeClass = "badge-success"; // Green
        } else if (status === "on notice") {
          badgeClass = "badge-warning"; // Yellow/Orange
        } else if (status === "resigned") {
          badgeClass = "badge-info"; // Blue
        } else if (status === "terminated") {
          badgeClass = "badge-danger"; // Red
        } else if (status === "inactive") {
          badgeClass = "badge-secondary"; // Gray
        } else if (status === "on leave") {
          badgeClass = "badge-soft-warning"; // Soft yellow
        }

        return (
          <span
            className={`badge ${badgeClass} d-inline-flex align-items-center badge-xs`}
          >
            <i className="ti ti-point-filled me-1" />
            {text}
          </span>
        );
      },
      sorter: (a: any, b: any) =>
        (a.status || "").localeCompare(b.status || ""),
      filters: availableStatusFilters,
      onFilter: (value: any, record: any) => normalizeStatus(record.status) === value,
    },
    {
      title: "",
      dataIndex: "actions",
      key: "actions",
      render: (_test: any, employee: Employee) => (
        <div
          className="action-icon d-inline-flex"
          key={`actions-${employee._id}`}
        >
          <Link
            to="#"
            className="me-2"
            onClick={(e) => {
              e.preventDefault();
              const preparedEmployee = prepareEmployeeForEdit(employee);
              setEditingEmployee(preparedEmployee);
              // Load department and designation
              if (employee.departmentId) {
                setSelectedDepartment(employee.departmentId);
                fetchDesignations({ departmentId: employee.departmentId });
              }
              if (employee.designationId) {
                setSelectedDesignation(employee.designationId);
              }
              // Modal will open automatically via EditEmployeeModal's useEffect
            }}
          >
            <i className="ti ti-edit" />
          </Link>
          <button
            type="button"
            data-bs-toggle="modal"
            data-bs-target="#delete_modal"
            className="btn btn-icon btn-sm rounded-11 border-0"
            onClick={() => {
              setEmployeeToDelete(employee);
              setDeleteError('');
            }}
          >
            <i className="ti ti-trash" />
          </button>
        </div>
      ),
    },
  ];

  const onSelectStatus = (status: string) => {
    if (!status) return;
    const nextStatus = status === "all" ? "" : status;
    setSelectedStatus(nextStatus);
    setFilters((prevFilters) => ({
      ...prevFilters,
      status: nextStatus,
    }));
  };

  const onSelectDepartment = (id: string) => {
    setSelectedDepartment(id);
    setFilters((prevFilters) => ({
      ...prevFilters,
      departmentId: id,
    }));
  };

  // Clear all filters
  const clearAllFilters = async () => {
    try {
      const clearedFilters = {
        startDate: "",
        endDate: "",
        status: "",
        departmentId: "",
      };
      setFilters(clearedFilters);
      setSelectedDepartment("");
      setSelectedStatus("");
      setSortOrder("");

      toast.success("All filters cleared", {
        position: "top-right",
        autoClose: 2000,
      });
    } catch (error) {
      console.error("Error clearing filters:", error);
    }
  };

  const handleDateRangeFilter = (
    ranges: { start?: string; end?: string } = { start: "", end: "" },
  ) => {
    try {
      if (ranges.start && ranges.end) {
        setFilters((prevFilters) => ({
          ...prevFilters,
          startDate: ranges.start || "",
          endDate: ranges.end || "",
        }));
      } else {
        setFilters((prevFilters) => ({
          ...prevFilters,
          startDate: "",
          endDate: "",
        }));
      }
    } catch (error) {
      console.error("Error handling time range selection:", error);
    }
  };

  const handleSort = (order: string) => {
    setSortOrder(order);
  };

  const deleteEmployee = async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      if (!id) {
        setDeleteError("Employee ID is required");
        return false;
      }

      const result = await deleteEmployeeREST(id, { showMessage: false });
      if (!result.success) {
        setDeleteError(result.error?.message || "Failed to delete employee");
        return false;
      }

      toast.success("Employee deleted successfully!", {
        position: "top-right",
        autoClose: 3000,
      });
      return true;
    } catch (error) {
      console.error("Delete error:", error);
      setDeleteError("Failed to delete employee");
      setLoading(false);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!employeeToDelete) return;

    setDeleteError('');
    const success = await deleteEmployee(employeeToDelete._id);

    if (success) {
      const closeButton = document.querySelector('#delete_modal [data-bs-dismiss="modal"]') as HTMLButtonElement | null;
      if (closeButton) closeButton.click();
      setEmployeeToDelete(null);
    }
  };

  // Helper function to safely prepare employee for editing
  const prepareEmployeeForEdit = (emp: Employee): Employee => {
    return {
      ...emp,
      account: emp.account || { role: "" },
      email: emp.email || "",
      phone: emp.phone || "",
      gender: emp.gender || "",
      dateOfBirth: emp.dateOfBirth || null,
      address: emp.address || {
        street: "",
        city: "",
        state: "",
        postalCode: "",
        country: "",
      },
      passport: emp.passport || {
        number: "",
        expiryDate: "",
        country: "",
      },
      firstName: emp.firstName || "",
      lastName: emp.lastName || "",
      companyName: emp.companyName || "",
      departmentId: emp.departmentId || "",
      designationId: emp.designationId || "",
      reportingTo: emp.reportingTo || "",
      reportingManagerName: emp.reportingManagerName || "",
      shiftId: emp.shiftId || "",
      batchId: emp.batchId || "",
      shiftName: emp.shiftName || "",
      batchName: emp.batchName || "",
      about: emp.about || "",
      avatarUrl: emp.avatarUrl || "",
      status: normalizeStatus(emp.status),
      dateOfJoining: emp.dateOfJoining || null,
    };
  };

  // Modal container helper (for DatePicker positioning)
  const getModalContainer = (): HTMLElement => {
    const modalElement = document.getElementById("modal-datepicker");
    return modalElement ? modalElement : document.body;
  };

  // Utility function to properly close modal and remove backdrop
  const closeModal = () => {
    // Remove all modal backdrops
    const backdrops = document.querySelectorAll(".modal-backdrop");
    backdrops.forEach((backdrop) => backdrop.remove());

    // Remove modal-open class from body
    document.body.classList.remove("modal-open");

    // Reset body style
    document.body.style.overflow = "";
    document.body.style.paddingRight = "";
  };

  // incase of error (done:false)
  if (loading) {
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

  if (error && error !== "null") {
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
      <style>{`
        .nav-link.disabled {
          opacity: 0.5;
          cursor: not-allowed !important;
          pointer-events: all !important;
        }
        .nav-link.disabled:hover {
          background-color: transparent !important;
        }
      `}</style>
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
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
              <div className="me-2 mb-2">
                <div className="d-flex align-items-center border bg-white rounded p-1 me-2 icon-list">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`btn btn-icon btn-sm ${
                      viewMode === "list" ? "active bg-primary text-white" : ""
                    } me-1`}
                  >
                    <i className="ti ti-list-tree" />
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`btn btn-icon btn-sm ${
                      viewMode === "grid" ? "active bg-primary text-white" : ""
                    }`}
                  >
                    <i className="ti ti-layout-grid" />
                  </button>
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
                      <Link to="#" className="dropdown-item rounded-1">
                        <i className="ti ti-file-type-pdf me-1" />
                        Export as PDF
                      </Link>
                    </li>
                    <li>
                      <Link to="#" className="dropdown-item rounded-1">
                        <i className="ti ti-file-type-xls me-1" />
                        Export as Excel{" "}
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="mb-2">
                <button
                  type="button"
                  data-bs-toggle="modal"
                  data-bs-target="#add_employee"
                  className="btn btn-primary d-flex align-items-center"
                  onClick={() => generateId("EMP")}
                >
                  <i className="ti ti-circle-plus me-2" />
                  Add Employee
                </button>
              </div>
              <div className="head-icons ms-2">
                <CollapseHeader />
              </div>
            </div>
          </div>
          {/* /Breadcrumb */}
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
                      <p className="fs-12 fw-medium mb-1 text-truncate">
                        Active
                      </p>
                      <h4>{stats?.activeCount}</h4>
                    </div>
                  </div>
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
                      <p className="fs-12 fw-medium mb-1 text-truncate">
                        Inactive
                      </p>
                      <h4>{stats?.inactiveCount}</h4>
                    </div>
                  </div>
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
                </div>
              </div>
            </div>
            {/* /No of Plans */}
          </div>

          {/* Unified Filter Bar for Both Views */}
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
              <h5>Employee</h5>
              <div className="d-flex my-xl-auto right-content align-items-center flex-wrap row-gap-3">
                <div className="me-3">
                  <div className="input-icon-end position-relative">
                    <PredefinedDateRanges
                      onChange={handleDateRangeFilter}
                      displayFormat="DD-MM-YYYY"
                      outputFormat="DD-MM-YYYY"
                    />
                    <span className="input-icon-addon">
                      <i className="ti ti-chevron-down" />
                    </span>
                  </div>
                </div>
                <div className="dropdown me-3">
                  <a
                    href="#"
                    className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                    role="button"
                    aria-expanded="false"
                  >
                    Department
                    {selectedDepartment
                      ? `: ${
                          department.find(
                            (dep) => dep.value === selectedDepartment,
                          )?.label || "None"
                        }`
                      : ": None"}
                  </a>
                  <ul className="dropdown-menu dropdown-menu-end p-3">
                    <li>
                      <Link
                        to="#"
                        className={`dropdown-item rounded-1${
                          selectedDepartment === "" ? " bg-primary text-white" : ""
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          onSelectDepartment("");
                        }}
                      >
                        None
                      </Link>
                    </li>
                    {department
                      .filter((dep) => dep.value)
                      .map((dep) => (
                        <li key={dep.value}>
                          <Link
                            to="#"
                            className={`dropdown-item rounded-1${
                              selectedDepartment === dep.value
                                ? " bg-primary text-white"
                                : ""
                            }`}
                            onClick={(e) => {
                              e.preventDefault();
                              onSelectDepartment(dep.value);
                            }}
                          >
                            {dep.label}
                          </Link>
                        </li>
                      ))}
                  </ul>
                </div>
                <div className="dropdown me-3">
                  <a
                    href="#"
                    className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                    onClick={(e) => e.preventDefault()}
                  >
                    Select status{" "}
                    {selectedStatus
                      ? `: ${normalizeStatus(selectedStatus)}`
                      : ": None"}
                  </a>
                  <ul className="dropdown-menu  dropdown-menu-end p-3">
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={() => onSelectStatus("all")}
                      >
                        All
                      </Link>
                    </li>
                    {availableStatusFilters.map((statusOption) => (
                      <li key={statusOption.value}>
                        <Link
                          to="#"
                          className="dropdown-item rounded-1"
                          onClick={() => onSelectStatus(statusOption.value)}
                        >
                          {statusOption.text}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="dropdown me-3">
                  <a
                    href="#"
                    className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                    onClick={(e) => e.preventDefault()}
                  >
                    Sort By
                    {sortOrder
                      ? `: ${
                          sortOrder.charAt(0).toUpperCase() + sortOrder.slice(1)
                        }`
                      : ": None"}
                  </a>
                  <ul className="dropdown-menu dropdown-menu-end p-3">
                    <li>
                      <button
                        type="button"
                        className="dropdown-item rounded-1"
                        onClick={() => handleSort("ascending")}
                      >
                        Ascending
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className="dropdown-item rounded-1"
                        onClick={() => handleSort("descending")}
                      >
                        Descending
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className="dropdown-item rounded-1"
                        onClick={() => handleSort("")}
                      >
                        None
                      </button>
                    </li>
                  </ul>
                </div>
                <button
                  type="button"
                  className="btn btn-light d-inline-flex align-items-center"
                  onClick={clearAllFilters}
                  title="Clear all filters"
                >
                  <i className="ti ti-filter-off me-1" />
                  Clear Filters
                </button>
              </div>
            </div>

            {/* Conditional Rendering Based on View Mode */}
            {viewMode === "list" ? (
              // LIST VIEW
              <div className="card-body p-0">
                <Table
                  dataSource={employees}
                  columns={columns}
                  Selection={true}
                />
              </div>
            ) : (
              // GRID VIEW
              <div className="card-body p-0">
                {/* Clients Grid */}
                <div className="row mt-4">
                  {employees.length === 0 ? (
                    <p className="text-center">No employees found</p>
                  ) : (
                    employees.map((emp) => {
                      const {
                        _id,
                        firstName,
                        lastName,
                        role,
                        employeeId,
                        email,
                        phone,
                        departmentId,
                        status,
                        avatarUrl,
                      } = emp;

                      const fullName =
                        `${firstName || ""} ${lastName || ""}`.trim() ||
                        "Unknown Name";

                      return (
                        <div
                          key={_id}
                          className="col-xl-3 col-lg-4 col-md-6 mb-4"
                        >
                          <div className="card">
                            <div className="card-body">
                              <div className="d-flex justify-content-between align-items-start mb-2">
                                <div className="form-check form-check-md">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                  />
                                </div>
                                <div>
                                  <Link
                                    to={`${all_routes.employeedetails}/${_id}`}
                                    className={`avatar avatar-xl avatar-rounded border p-1 border-primary rounded-circle ${
                                      emp.status === "Active"
                                        ? "online"
                                        : "offline" // or "inactive"
                                    }`}
                                  >
                                    <img
                                      src={
                                        avatarUrl ||
                                        "assets/img/profiles/profile.png"
                                      }
                                      className="img-fluid"
                                      alt={fullName}
                                    />
                                  </Link>
                                </div>
                                <div className="dropdown">
                                  <button
                                    className="btn btn-icon btn-sm rounded-circle bg-primary text-white"
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
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          const preparedEmployee =
                                            prepareEmployeeForEdit(emp);
                                          console.log(
                                            "Prepared Employee List",
                                            preparedEmployee,
                                          );
                                          setEditingEmployee(preparedEmployee);
                                          // Load department and designation
                                          if (emp.departmentId) {
                                            setSelectedDepartment(
                                              emp.departmentId,
                                            );
                                            fetchDesignations({ departmentId: emp.departmentId });
                                          }
                                          if (emp.designationId) {
                                            setSelectedDesignation(
                                              emp.designationId,
                                            );
                                          }
                                          // Modal will open automatically via EditEmployeeModal's useEffect
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
                                        onClick={() => setEmployeeToDelete(emp)}
                                      >
                                        <i className="ti ti-trash me-1" />{" "}
                                        Delete
                                      </Link>
                                    </li>
                                  </ul>
                                </div>
                              </div>
                              <div className="text-center mb-3">
                                <h6 className="mb-1">
                                  <Link to={`/employees/${emp._id}`}>
                                    {fullName}
                                  </Link>
                                </h6>
                                <span className="badge bg-pink-transparent fs-10 fw-medium">
                                  {role || "employee"}
                                </span>
                              </div>
                              {/* Employee Details */}
                              <div className="mb-3">
                                <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                                  <span className="text-muted fs-12">
                                    Emp ID
                                  </span>
                                  <span className="fw-medium fs-13">
                                    {employeeId || "-"}
                                  </span>
                                </div>
                                <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                                  <span className="text-muted fs-12">
                                    Email
                                  </span>
                                  <span
                                    className="fw-medium fs-13 text-truncate"
                                    style={{ maxWidth: "150px" }}
                                    title={email || "-"}
                                  >
                                    {email || "-"}
                                  </span>
                                </div>
                                <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                                  <span className="text-muted fs-12">
                                    Phone
                                  </span>
                                  <span className="fw-medium fs-13">
                                    {phone || "-"}
                                  </span>
                                </div>
                                <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                                  <span className="text-muted fs-12">
                                    Department
                                  </span>
                                  <span className="fw-medium fs-13">
                                    {department.find(
                                      (dep) => dep.value === departmentId,
                                    )?.label || "-"}
                                  </span>
                                </div>
                                <div className="d-flex justify-content-between align-items-center">
                                  <span className="text-muted fs-12">
                                    Status
                                  </span>
                                  <span
                                    className={`badge ${
                                      status === "Active"
                                        ? "badge-success"
                                        : "badge-danger"
                                    } d-inline-flex align-items-center badge-xs`}
                                  >
                                    <i className="ti ti-point-filled me-1" />
                                    {status}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                {/* /Employee Grid */}
              </div>
            )}
          </div>
        </div>
        <Footer />
      </div>
      <ToastContainer />
      {/* /Page Wrapper */}
      {/* Add Employee Modal */}
      <AddEmployeeModal
        onSuccess={() => {
          fetchEmployeesWithStats();
        }}
        getModalContainer={getModalContainer}
      />
      {/* Edit Employee Modal */}
      <EditEmployeeModal
        employee={editingEmployee}
        modalId="edit_employee_list"
        onUpdate={(updatedEmployee) => {
          setEditingEmployee(updatedEmployee as Employee);
          fetchEmployeesWithStats();
        }}
        getModalContainer={getModalContainer}
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
                This action permanently deletes data and cannot be undone.
              </p>
              <p className="mb-3">
                {employeeToDelete
                  ? `Are you sure you want to delete employee "${employeeToDelete?.firstName}"? This cannot be undone.`
                  : "You want to delete all the marked items, this can't be undone once you delete."}
              </p>
              {deleteError && (
                <div className="text-danger mb-3">{deleteError}</div>
              )}
              <div className="d-flex justify-content-center">
                <button
                  className="btn btn-light me-3"
                  data-bs-dismiss="modal"
                  onClick={() => {
                    setEmployeeToDelete(null);
                    setDeleteError('');
                  }}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  onClick={handleConfirmDelete}
                  disabled={loading}
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
  );
};

export default EmployeeList;
