import React from "react";
import { useState, useEffect, useRef, useMemo } from "react";
import { all_routes } from "../../router/all_routes";
import { Link, useNavigate } from "react-router-dom";
import Table from "../../../core/common/dataTable/index";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import EmployeeNameCell from "../../../core/common/EmployeeNameCell";
import PredefinedDateRanges from "../../../core/common/datePicker";
import { employee_list_details } from "../../../core/data/json/employees_list_details";
import { DatePicker } from "antd";
import CommonSelect from "../../../core/common/commonSelect";
import CollapseHeader from "../../../core/common/collapse-header/collapse-header";
import { useSocket } from "../../../SocketContext";
import { Socket } from "socket.io-client";
import { toast, ToastContainer } from "react-toastify";
import dayjs from "dayjs";
import Footer from "../../../core/common/footer";
import { useUser } from "@clerk/clerk-react";

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

interface PersonalInfo {
  gender: string;
  birthday: string | null;
  address: Address;
}

interface Employee {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  account?: {
    role: string;
  };
  contact?: {
    email: string;
    phone: string;
  };
  personal?: PersonalInfo;
  companyName: string;
  departmentId: string;
  designationId: string;
  status: "Active" | "Inactive" | "On Notice" | "Resigned" | "Terminated" | "On Leave";
  dateOfJoining: string | null;
  about: string;
  role: string;
  enabledModules: Record<PermissionModule, boolean>;
  permissions: Record<PermissionModule, PermissionSet>;
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

// Type definitions
type PermissionAction =
  | "read"
  | "write"
  | "create"
  | "delete"
  | "import"
  | "export";
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

interface PermissionsState {
  enabledModules: Record<PermissionModule, boolean>;
  permissions: Record<PermissionModule, PermissionSet>;
  selectAll: Record<PermissionModule, boolean>;
}

const MODULES: PermissionModule[] = [
  "holidays",
  "leaves",
  "clients",
  "projects",
  "tasks",
  "chats",
  "assets",
  "timingSheets",
];

const EMPTY_OPTION = { value: "", label: "Select Designation" };

const initialState = {
  enabledModules: {
    holidays: false,
    leaves: false,
    clients: false,
    projects: false,
    tasks: false,
    chats: false,
    assets: false,
    timingSheets: false,
  },
  permissions: {
    holidays: {
      read: false,
      write: false,
      create: false,
      delete: false,
      import: false,
      export: false,
    },
    leaves: {
      read: false,
      write: false,
      create: false,
      delete: false,
      import: false,
      export: false,
    },
    clients: {
      read: false,
      write: false,
      create: false,
      delete: false,
      import: false,
      export: false,
    },
    projects: {
      read: false,
      write: false,
      create: false,
      delete: false,
      import: false,
      export: false,
    },
    tasks: {
      read: false,
      write: false,
      create: false,
      delete: false,
      import: false,
      export: false,
    },
    chats: {
      read: false,
      write: false,
      create: false,
      delete: false,
      import: false,
      export: false,
    },
    assets: {
      read: false,
      write: false,
      create: false,
      delete: false,
      import: false,
      export: false,
    },
    timingSheets: {
      read: false,
      write: false,
      create: false,
      delete: false,
      import: false,
      export: false,
    },
  },
  selectAll: {
    holidays: false,
    leaves: false,
    clients: false,
    projects: false,
    tasks: false,
    chats: false,
    assets: false,
    timingSheets: false,
  },
};

const EmployeeList = () => {
  const ClerkID = useUser();
  console.log("User id", ClerkID.user.id);

  // Dropdown options
  const roleOptions = [
    { value: "", label: "Select Role" },
    { value: "HR", label: "HR" },
    { value: "Employee", label: "Employee" }
  ];

  const genderOptions = [
    { value: "", label: "Select Gender" },
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
    { value: "other", label: "Other" }
  ];

  // const {  isLoaded } = useUser();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [activeTab, setActiveTab] = useState("basic-info");
  const [responseData, setResponseData] = useState(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUpload, setImageUpload] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isBasicInfoValidated, setIsBasicInfoValidated] = useState(false);
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
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [newlyAddedEmployee, setNewlyAddedEmployee] = useState<Employee | null>(
    null,
  );
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    status: "",
    departmentId: "",
  });
  const addEmployeeModalRef = useRef<HTMLButtonElement>(null);
  const editEmployeeModalRef = useRef<HTMLButtonElement>(null);
  const successModalRef = useRef<HTMLButtonElement>(null);
  const [sortedEmployee, setSortedEmployee] = useState<Employee[]>([]);
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

  const [formData, setFormData] = useState({
    employeeId: generateId("EMP"),
    avatarUrl: "",
    firstName: "",
    lastName: "",
    dateOfJoining: "",
    contact: {
      email: "",
      phone: "",
    },
    account: {
      role: "",
    },
    personal: {
      gender: "",
      birthday: "",
      address: {
        street: "",
        city: "",
        state: "",
        postalCode: "",
        country: "",
      },
    },
    companyName: "",
    designationId: "",
    departmentId: "",
    about: "",
    status: "Active" as "Active" | "Inactive" | "On Notice" | "Resigned" | "Terminated" | "On Leave",
  });
  const [permissions, setPermissions] = useState(initialState);

  const socket = useSocket() as Socket | null;

  useEffect(() => {
    if (!socket) return;

    let isMounted = true;

    setLoading(true);

    const timeoutId = setTimeout(() => {
      if (loading && isMounted) {
        console.warn("Employees loading timeout - showing fallback");
        setError("Employees loading timed out. Please refresh the page.");
        setLoading(false);
      }
    }, 30000);

    // Fetch employee data (works for both list and grid views)
    socket.emit("hrm/employees/get-employee-stats");
    socket.emit("hr/departments/get");
    // Designations will be loaded when a department is selected

    const handleAddEmployeeResponse = (response: any) => {
      if (!isMounted) return;

      if (response.done) {
        setResponseData(response.data);
        setError(null);
        setFieldErrors({});
        setLoading(false);

        // Close the add employee modal
        if (addEmployeeModalRef.current) {
          addEmployeeModalRef.current.click();
          // Clean up backdrop
          setTimeout(() => closeModal(), 100);
        }

        // Store the newly added employee data
        if (response.data && response.data.employee) {
          setNewlyAddedEmployee(response.data.employee);
        } else if (response.data) {
          // If the response structure is different, try to use the whole data
          setNewlyAddedEmployee(response.data);
        }

        // Show success modal with navigation options
        setTimeout(() => {
          if (successModalRef.current) {
            successModalRef.current.click();
            // Ensure previous modal backdrop is removed
            closeModal();
          }
        }, 300);

        // Refresh employee list
        if (socket) {
          socket.emit("hrm/employees/get-employee-stats");
        }
      } else {
        setLoading(false);

        // Parse error and set inline field error
        const errorInfo = parseBackendError(
          response.error || "Failed to add employee",
        );
        if (errorInfo) {
          setFieldErrors({ [errorInfo.field]: errorInfo.message });

          // If error is for a basic field, switch to basic info tab, reset validation, and scroll
          const basicFields = [
            "firstName",
            "lastName",
            "email",
            "role",
            "phone",
            "departmentId",
            "designationId",
            "dateOfJoining",
          ];
          if (
            basicFields.includes(errorInfo.field) ||
            errorInfo.field === "general"
          ) {
            setActiveTab("basic-info");
            setIsBasicInfoValidated(false); // Reset validation flag
            setTimeout(() => {
              const errorElement =
                document.querySelector(`[name="${errorInfo.field}"]`) ||
                document.querySelector(`#${errorInfo.field}`) ||
                document.querySelector(".is-invalid");
              if (errorElement) {
                errorElement.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
                (errorElement as HTMLElement).focus?.();
              }
            }, 100);
          }
        } else {
          setFieldErrors({
            general: response.error || "Failed to add employee",
          });
        }

        setError(response.error || "Failed to add employee");
        // No toast - error shown inline only
      }
    };

    const handleDesignationResponse = (response: any) => {
      console.log("DESIGNatio");
      if (!isMounted) return;

      if (response.done && Array.isArray(response.data)) {
        console.log("Designations response:", response);

        // Map all designations from the response
        const mappedDesignations = response.data.map((d: Designation) => ({
          value: d._id,
          label: d.designation,
        }));

        setDesignation([{ value: "", label: "Select" }, ...mappedDesignations]);

        // If we're editing and the designation exists in the new list, keep it selected
        if (editingEmployee?.designationId) {
          const designationExists = response.data.some(
            (d: Designation) => d._id === editingEmployee.designationId,
          );
          if (!designationExists) {
            setSelectedDesignation("");
            setEditingEmployee((prev) =>
              prev ? { ...prev, designationId: "" } : prev,
            );
          }
        }

        setError(null);
        setLoading(false);
      } else {
        setError(response.error || "Failed to get designations");
        setLoading(false);
      }
    };

    const handleDepartmentResponse = (response: any) => {
      if (!isMounted) return;

      if (response.done && Array.isArray(response.data)) {
        const mappedDepartments = response.data.map((d: Department) => ({
          value: d._id,
          label: d.department,
        }));
        setDepartment([{ value: "", label: "Select" }, ...mappedDepartments]);
        setError(null);
        setLoading(false);
      } else {
        setError(response.error || "Failed to get departments");
        setLoading(false);
      }
    };

    const handleEmployeeResponse = (response: any) => {
      if (!isMounted) return;
      console.log("response hrm-employee", response);
      if (response.done) {
        console.log("response hrm-employee", response);
        if (response.data.stats) {
          setStats(response.data.stats);
        }
        if (Array.isArray(response.data.employees)) {
          // Normalize status for all employees to ensure correct case
          const normalizedEmployees = response.data.employees.map((emp: Employee) => {
            console.log(`Employee ${emp.employeeId} - Raw status: "${emp.status}", Normalized: "${normalizeStatus(emp.status)}"`);
            return {
              ...emp,
              status: normalizeStatus(emp.status)
            };
          });
          setEmployees(normalizedEmployees);
        }
        setError(null);
        setLoading(false);
      } else {
        setError(response.error || "Failed to fetch employees");
        setLoading(false);
      }
    };

    const handleEmployeeDelete = (response: any) => {
      if (!isMounted) return;

      if (response.done) {
        setResponseData(response.data);
        setError(null);
        setLoading(false);

        toast.success("Employee deleted successfully!", {
          position: "top-right",
          autoClose: 3000,
        });

        if (socket) {
          socket.emit("hrm/employees/get-employee-stats");
        }
      } else {
        setError(response.error || "Failed to delete employee");
        setLoading(false);

        toast.error(response.error || "Failed to delete employee", {
          position: "top-right",
          autoClose: 3000,
        });
      }
    };

    const handleUpdateEmployeeResponse = (response: any) => {
      if (response.done) {
        // Close the modal
        if (editEmployeeModalRef.current) {
          editEmployeeModalRef.current.click();
          // Clean up backdrop
          setTimeout(() => closeModal(), 100);
        }

        toast.success("Employee updated successfully!", {
          position: "top-right",
          autoClose: 3000,
        });

        // Refresh employee list
        if (socket) {
          socket.emit("hrm/employees/get-employee-stats");
        }
        setEditingEmployee(null); // Close modal or reset editing state
        setError(null);
        setLoading(false);
      } else {
        toast.error(response.error || "Failed to update employee.", {
          position: "top-right",
          autoClose: 3000,
        });
        setError(response.error || "Failed to update employee.");
        setLoading(false);
      }
    };

    const handleUpdatePermissionResponse = (response: any) => {
      if (response.done) {
        toast.success("Employee permissions updated successfully!", {
          position: "top-right",
          autoClose: 3000,
        });

        // Refresh employee list or permissions
        if (socket) {
          socket.emit("hrm/employees/get-employee-stats");
        }
        setError(null);
        setLoading(false);
      } else {
        toast.error(response.error || "Failed to update permissions.", {
          position: "top-right",
          autoClose: 3000,
        });
        setError(response.error || "Failed to update permissions.");
        setLoading(false);
      }
    };

    const handleLifecycleStatusResponse = (response: any) => {
      if (!isMounted) return;
      
      if (response.done && response.data) {
        setLifecycleStatus(response.data);
        
        // Show warning if employee has lifecycle records
        if (response.data.hasLifecycleRecord && response.data.message) {
          toast.info(response.data.message, {
            position: "top-right",
            autoClose: 5000,
          });
        }
      } else {
        // Clear lifecycle status if check fails
        setLifecycleStatus(null);
      }
    };

    socket.on("hrm/employees/add-response", handleAddEmployeeResponse);
    socket.on("hrm/designations/get-response", handleDesignationResponse);
    socket.on("hr/departments/get-response", handleDepartmentResponse);
    socket.on(
      "hrm/employees/get-employee-stats-response",
      handleEmployeeResponse,
    );
    socket.on(
      "hrm/employees/get-employee-grid-stats-response",
      handleEmployeeResponse,
    );
    socket.on("hrm/employees/delete-response", handleEmployeeDelete);
    socket.on("hrm/employees/update-response", handleUpdateEmployeeResponse);
    socket.on(
      "hrm/employees/update-permissions-response",
      handleUpdatePermissionResponse,
    );
    socket.on(
      "hrm/employees/check-lifecycle-status-response",
      handleLifecycleStatusResponse
    );

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      socket.off("hrm/employees/add-response", handleAddEmployeeResponse);
      socket.off("hrm/designations/get-response", handleDesignationResponse);
      socket.off("hr/departments/get-response", handleDepartmentResponse);
      socket.off(
        "hrm/employees/get-employee-stats-response",
        handleEmployeeResponse,
      );
      socket.off(
        "hrm/employees/get-employee-grid-stats-response",
        handleEmployeeResponse,
      );
      socket.off("hrm/employees/delete-response", handleEmployeeDelete);
      socket.off("hrm/employees/update-response", handleUpdateEmployeeResponse);
      socket.off(
        "hrm/employees/update-permissions-response",
        handleUpdatePermissionResponse,
      );
      socket.off(
        "hrm/employees/check-lifecycle-status-response",
        handleLifecycleStatusResponse
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  useEffect(() => {
    if (editingEmployee && socket) {
      // Fetch designations for the employee's department
      console.log("Emitting for departmentID", editingEmployee.departmentId);

      // Check lifecycle status when employee is selected for editing
      socket.emit("hrm/employees/check-lifecycle-status", {
        employeeId: editingEmployee.employeeId
      });

      if (editingEmployee.departmentId) {
        socket.emit("hrm/designations/get", {
          departmentId: editingEmployee.departmentId,
        });
      }
    }
  }, [editingEmployee, socket]);

  useEffect(() => {
    if (editingEmployee && editingEmployee.permissions) {
      setPermissions({
        enabledModules: {
          ...initialState.enabledModules,
          ...editingEmployee.enabledModules,
        },
        permissions: {
          ...initialState.permissions,
          ...editingEmployee.permissions,
        },
        selectAll: { ...initialState.selectAll }, // reset or compute based on editingEmployee.permissions if needed
      });
    } else {
      setPermissions(initialState);
    }
  }, [editingEmployee]);

  // Dynamically compute available status filters based on actual employee data
  const availableStatusFilters = useMemo(() => {
    // Get unique statuses from employees
    const uniqueStatuses = new Set<string>();
    employees.forEach(emp => {
      if (emp.status) {
        uniqueStatuses.add(normalizeStatus(emp.status));
      }
    });
    
    // Convert to filter format and sort
    const statusOrder = ["Active", "Inactive", "On Notice", "On Leave", "Resigned", "Terminated"];
    return Array.from(uniqueStatuses)
      .sort((a, b) => statusOrder.indexOf(a) - statusOrder.indexOf(b))
      .map(status => ({ text: status, value: status }));
  }, [employees]);

  // Clean up modal backdrops on component unmount or when activeTab changes
  useEffect(() => {
    return () => {
      // Cleanup on unmount
      closeModal();
    };
  }, []);

  // Also clean up backdrops whenever modals might have closed
  useEffect(() => {
    const handleModalHidden = () => {
      setTimeout(() => closeModal(), 100);
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
      dataIndex: ["contact", "email"],
      sorter: (a: any, b: any) =>
        (a.contact?.email || "").localeCompare(b.contact?.email || ""),
    },
    {
      title: "Phone",
      dataIndex: ["contact", "phone"],
      sorter: (a: any, b: any) =>
        (a.contact?.phone || "").localeCompare(b.contact?.phone || ""),
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
      title: "Joining Date",
      dataIndex: "dateOfJoining",
      sorter: (a: any, b: any) =>
        new Date(a.dateOfJoining).getTime() -
        new Date(b.dateOfJoining).getTime(),
      render: (date: string | Date) => {
        if (!date) return "-";
        const d = new Date(date);
        return d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      },
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
      sorter: (a: any, b: any) => (a.status || "").localeCompare(b.status || ""),
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
            data-bs-toggle="modal"
            data-inert={true}
            data-bs-target="#edit_employee"
            onClick={() => {
              const preparedEmployee = prepareEmployeeForEdit(employee);
              setEditingEmployee(preparedEmployee);
              // Load permissions for editing
              if (employee.permissions && employee.enabledModules) {
                setPermissions({
                  permissions: employee.permissions,
                  enabledModules: employee.enabledModules,
                  selectAll: Object.keys(employee.enabledModules).reduce(
                    (acc, key) => {
                      acc[key as PermissionModule] = false;
                      return acc;
                    },
                    {} as Record<PermissionModule, boolean>,
                  ),
                });
              }
              // Load department and designation
              if (employee.departmentId) {
                setSelectedDepartment(employee.departmentId);
                if (socket) {
                  socket.emit("hrm/designations/get", {
                    departmentId: employee.departmentId,
                  });
                }
              }
              if (employee.designationId) {
                setSelectedDesignation(employee.designationId);
              }
            }}
          >
            <i className="ti ti-edit" />
          </Link>
          <Link
            to="#"
            data-bs-toggle="modal"
            data-inert={true}
            data-bs-target="#delete_modal"
            onClick={() => {
              setEmployeeToDelete(employee);
            }}
          >
            <i className="ti ti-trash" />
          </Link>
        </div>
      ),
    },
  ];
  console.log("Editing employee", editingEmployee);

  // Helper functions
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    if (name === "email" || name === "phone") {
      setFormData((prev) => ({
        ...prev,
        contact: {
          ...prev.contact,
          [name]: value,
        },
      }));
    } else if (name === "role") {
      setFormData((prev) => ({
        ...prev,
        account: {
          ...prev.account,
          [name]: value,
        },
      }));
    } else if (name === "gender") {
      setFormData((prev) => ({
        ...prev,
        personal: {
          ...prev.personal,
          gender: value,
        },
      }));
    } else if (
      name === "street" ||
      name === "city" ||
      name === "state" ||
      name === "postalCode" ||
      name === "country"
    ) {
      setFormData((prev) => ({
        ...prev,
        personal: {
          ...prev.personal,
          address: {
            ...prev.personal?.address,
            [name]: value,
          },
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const onSelectStatus = (status: string) => {
    if (!status) return;
    setSelectedStatus(status);
    applyFilters({ status });
  };

  const onSelectDepartment = (id: string) => {
    console.log(id);
    applyFilters({ departmentId: id });
  };

  const applyFilters = (updatedFields: {
    departmentId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    try {
      setFilters((prevFilters) => {
        const newFilters = { ...prevFilters, ...updatedFields };
        if (socket) {
          socket.emit("hrm/employees/get-employee-stats", { ...newFilters });
        }
        return newFilters;
      });
    } catch (error) {
      console.error("Error applying filters:", error);
    }
  };

  // Clear all filters
  const clearAllFilters = () => {
    try {
      setFilters({
        startDate: "",
        endDate: "",
        status: "",
        departmentId: "",
      });
      setSelectedDepartment("");
      setSelectedStatus("");
      setSortOrder("");

      if (socket) {
        socket.emit("hrm/employees/get-employee-stats", {
          startDate: "",
          endDate: "",
          status: "",
          departmentId: "",
        });
      }
      toast.success("All filters cleared", {
        position: "top-right",
        autoClose: 2000,
      });
    } catch (error) {
      console.error("Error clearing filters:", error);
    }
  };

  // Handle file upload
  const uploadImage = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "amasqis");

    const res = await fetch(
      "https://api.cloudinary.com/v1_1/dwc3b5zfe/image/upload",
      {
        method: "POST",
        body: formData,
      },
    );

    const data = await res.json();
    console.log(data);
    return data.secure_url;
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    // setLoading(true);
    const file = event.target.files?.[0];
    if (!file) return;

    const maxSize = 4 * 1024 * 1024; // 4MB
    if (file.size > maxSize) {
      toast.error("File size must be less than 4MB.", {
        position: "top-right",
        autoClose: 3000,
      });
      event.target.value = "";
      return;
    }

    if (
      ["image/jpeg", "image/png", "image/jpg", "image/ico"].includes(file.type)
    ) {
      setImageUpload(true);
      try {
        const uploadedUrl = await uploadImage(file);
        setFormData((prev) => ({ ...prev, avatarUrl: uploadedUrl }));
        setImageUpload(false);
      } catch (error) {
        setImageUpload(false);
        toast.error("Failed to upload image. Please try again.", {
          position: "top-right",
          autoClose: 3000,
        });
        event.target.value = "";
      } finally {
        // setLoading(false);
        console.log("hi");
      }
    } else {
      toast.error("Please upload image file only.", {
        position: "top-right",
        autoClose: 3000,
      });
      event.target.value = "";
    }
  };

  const removeLogo = () => {
    setFormData((prev) => ({ ...prev, avatarUrl: "" }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDateRangeFilter = (
    ranges: { start?: string; end?: string } = { start: "", end: "" },
  ) => {
    try {
      if (ranges.start && ranges.end) {
        applyFilters({ startDate: ranges.start, endDate: ranges.end });
      } else {
        applyFilters({ startDate: "", endDate: "" });
      }
    } catch (error) {
      console.error("Error handling time range selection:", error);
    }
  };

  // Handle date change
  const handleDateChange = (date: string) => {
    setFormData((prev) => ({ ...prev, dateOfJoining: date }));
  };

  // Handle select dropdown changes
  const handleSelectChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Toggle password visibility

  const handleSort = (order: string) => {
    setSortOrder(order);
    if (!order) {
      setSortedEmployee(employees);
      return;
    }
    const sortedData = [...employees].sort((a, b) => {
      console.log("from sorted data", employees);

      const nameA = a.firstName.toLowerCase() || "a";
      const nameB = b.firstName.toLowerCase() || "b";

      if (order === "ascending") {
        return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
      }
      if (order === "descending") {
        return nameA > nameB ? -1 : nameA < nameB ? 1 : 0;
      }
      return 0;
    });
    setSortedEmployee(sortedData); // may not need this later
    setEmployees(sortedData);
  };

  const deleteEmployee = (id: string) => {
    try {
      setLoading(true);
      setError(null);

      if (!socket) {
        setError("Socket connection is not available");
        setLoading(false);
        return;
      }

      if (!id) {
        setError("Employee ID is required");
        setLoading(false);
        return;
      }

      socket.emit("hrm/employees/delete", { _id: id });
    } catch (error) {
      console.error("Delete error:", error);
      setError("Failed to initiate policy deletion");
      setLoading(false);
    }
  };

  // ======================
  // PERMISSIONS HANDLERS
  // ======================

  // Constant array matching PermissionModule union type exactly
  const MODULES: PermissionModule[] = [
    "holidays",
    "leaves",
    "clients",
    "projects",
    "tasks",
    "chats",
    "assets",
    "timingSheets", // Correct spelling, make sure this matches everywhere
  ];

  // Constant array for actions, matching PermissionSet keys exactly
  const ACTIONS: PermissionAction[] = [
    "read",
    "write",
    "create",
    "delete",
    "import",
    "export",
  ];

  // Toggle individual permission (single action in a module)
  const handlePermissionChange = (
    module: PermissionModule,
    action: PermissionAction,
    checked: boolean,
  ) => {
    setPermissions((prev) => {
      const updatedModulePermissions = {
        ...prev.permissions[module],
        [action]: checked,
      };

      // Check if all actions selected for this module
      const allSelected = ACTIONS.every((act) => updatedModulePermissions[act]);

      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [module]: updatedModulePermissions,
        },
        selectAll: {
          ...prev.selectAll,
          [module]: allSelected,
        },
      };
    });
  };

  // Toggle enable/disable a module
  const toggleModule = (module: PermissionModule) => {
    setPermissions((prev) => ({
      ...prev,
      enabledModules: {
        ...prev.enabledModules,
        [module]: !prev.enabledModules[module],
      },
    }));
  };

  // Toggle "Select All" for a specific module (all permissions checked or unchecked)
  const toggleSelectAllForModule = (module: PermissionModule) => {
    setPermissions((prev) => {
      const newSelectAllState = !prev.selectAll[module];

      // Build a new permission set with all actions set to newSelectAllState
      const newPermissionsForModule: PermissionSet = ACTIONS.reduce(
        (acc, action) => {
          acc[action] = newSelectAllState;
          return acc;
        },
        {} as PermissionSet,
      );

      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [module]: newPermissionsForModule,
        },
        selectAll: {
          ...prev.selectAll,
          [module]: newSelectAllState,
        },
      };
    });
  };

  // Toggle "Enable All Modules" master switch
  const toggleAllModules = (enable: boolean) => {
    setPermissions((prev) => {
      const newEnabledModules: Record<PermissionModule, boolean> =
        MODULES.reduce(
          (acc, module) => {
            acc[module] = enable;
            return acc;
          },
          {} as Record<PermissionModule, boolean>,
        );

      return {
        ...prev,
        enabledModules: newEnabledModules,
      };
    });
  };

  // Toggle "Select All" permissions globally (all modules & all actions)
  const toggleGlobalSelectAll = (checked: boolean) => {
    setPermissions((prev) => {
      // Build new permissions for every module & action
      const newPermissions: Record<PermissionModule, PermissionSet> =
        MODULES.reduce(
          (accModules, module) => {
            const newModulePermissions: PermissionSet = ACTIONS.reduce(
              (accActions, action) => {
                accActions[action] = checked;
                return accActions;
              },
              {} as PermissionSet,
            );
            accModules[module] = newModulePermissions;
            return accModules;
          },
          {} as Record<PermissionModule, PermissionSet>,
        );

      // Build new selectAll flags for every module
      const newSelectAll: Record<PermissionModule, boolean> = MODULES.reduce(
        (acc, module) => {
          acc[module] = checked;
          return acc;
        },
        {} as Record<PermissionModule, boolean>,
      );

      return {
        ...prev,
        permissions: newPermissions,
        selectAll: newSelectAll,
      };
    });
  };

  // ======================
  // FORM SUBMISSION
  // ======================

  // Parse backend error message and map to field name
  const parseBackendError = (
    errorMessage: string,
  ): { field: string; message: string } | null => {
    const errorMap: Record<string, { field: string; message: string }> = {
      "Field 'about' must be a non-empty string": {
        field: "about",
        message: "About is required",
      },
      "Field 'about' must be a string if provided": {
        field: "about",
        message: "About must be text",
      },
      "Field 'departmentId' must be a non-empty string": {
        field: "departmentId",
        message: "Please select a department",
      },
      "Field 'designationId' must be a non-empty string": {
        field: "designationId",
        message: "Please select a designation",
      },
      "Field 'employeeId' must be a non-empty string": {
        field: "employeeId",
        message: "Employee ID is required",
      },
      "Field 'firstName' must be a non-empty string": {
        field: "firstName",
        message: "First name is required",
      },
      "Field 'lastName' must be a non-empty string": {
        field: "lastName",
        message: "Last name is required",
      },
      "Missing required field: account": {
        field: "general",
        message: "Account information is required",
      },
      "Field 'account.role' must be a non-empty string": {
        field: "role",
        message: "Role is required",
      },
      "Missing required field: contact": {
        field: "general",
        message: "Contact information is required",
      },
      "Field 'contact.email' must be a non-empty string": {
        field: "email",
        message: "Email is required",
      },
      "Field 'contact.phone' must be a non-empty string": {
        field: "phone",
        message: "Phone is required",
      },
      "Missing required field: dateOfJoining": {
        field: "dateOfJoining",
        message: "Joining date is required",
      },
      "dateOfJoining must be a string, Date object, or valid date wrapper": {
        field: "dateOfJoining",
        message: "Invalid joining date",
      },
      "Email already registered": {
        field: "email",
        message: "This email is already registered",
      },
      "Phone number already registered": {
        field: "phone",
        message: "This phone number is already registered",
      },
      "Employee email or phone number already exists.": {
        field: "email",
        message: "Email or phone already exists",
      },
      "Employee with same details already exists": {
        field: "general",
        message: "Employee with same details already exists",
      },
      "Failed to add employee": {
        field: "general",
        message: "Failed to add employee. Please try again.",
      },
    };

    // Direct match
    if (errorMap[errorMessage]) {
      return errorMap[errorMessage];
    }

    // Pattern matching for field errors
    const fieldMatch = errorMessage.match(/Field '(.+?)' must be/);
    if (fieldMatch) {
      const fieldPath = fieldMatch[1];
      // Extract last part of nested field (e.g., 'account.userName' -> 'userName')
      const fieldName = fieldPath.includes(".")
        ? fieldPath.split(".").pop()!
        : fieldPath;
      return { field: fieldName, message: errorMessage };
    }

    // Pattern matching for missing fields
    const missingMatch = errorMessage.match(/Missing required field: (.+)/);
    if (missingMatch) {
      const fieldPath = missingMatch[1];
      const fieldName = fieldPath.includes(".")
        ? fieldPath.split(".").pop()!
        : fieldPath;
      return { field: fieldName, message: `${fieldName} is required` };
    }

    return { field: "general", message: errorMessage };
  };

  // Validate a single field and return error message
  const validateField = (fieldName: string, value: any): string => {
    switch (fieldName) {
      case "firstName":
        if (!value || !value.trim()) return "First name is required";
        break;
      case "lastName":
        if (!value || !value.trim()) return "Last name is required";
        break;
      case "email":
        if (!value || !value.trim()) return "Email is required";
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return "Enter a valid email";
        break;
      case "role":
        if (!value || !value.trim()) return "role is required";
        break;

      case "phone":
        if (!value || !value.trim()) return "Phone number is required";
        if (!/^\d{10,15}$/.test(value.replace(/[\s\-\(\)]/g, "")))
          return "Enter a valid phone number";
        break;
      case "gender":
        if (!value) return "Gender is required";
        break;
      case "birthday":
        if (!value) return "Birthday is required";
        break;
      case "dateOfJoining":
        if (!value) return "Joining date is required";
        break;
    }
    return "";
  };

  // Validate a field on blur
  const handleFieldBlur = (fieldName: string, value: any) => {
    const error = validateField(fieldName, value);
    setFieldErrors((prev) => ({
      ...prev,
      [fieldName]: error,
    }));
  };

  // Clear field error when user starts typing
  const clearFieldError = (fieldName: string) => {
    setFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  // Validate form before submission - matches backend validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Required fields (must match backend requiredStringFields)
    if (!formData.firstName || !formData.firstName.trim()) {
      errors.firstName = "First name is required";
    }

    if (!formData.lastName || !formData.lastName.trim()) {
      errors.lastName = "Last name is required";
    }

    if (!formData.departmentId || !formData.departmentId.trim()) {
      errors.departmentId = "Department is required";
    }

    if (!formData.designationId || !formData.designationId.trim()) {
      errors.designationId = "Designation is required";
    }

    // Contact fields (required by backend)
    if (!formData.contact.email || !formData.contact.email.trim()) {
      errors.email = "Email is required";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.contact.email)) {
        errors.email = "Enter a valid email";
      }
    }

    if (!formData.contact.phone || !formData.contact.phone.trim()) {
      errors.phone = "Phone number is required";
    } else if (
      !/^\d{10,15}$/.test(formData.contact.phone.replace(/[\s\-\(\)]/g, ""))
    ) {
      errors.phone = "Enter a valid phone number";
    }

    // Date of joining (required by backend)
    if (!formData.dateOfJoining) {
      errors.dateOfJoining = "Joining date is required";
    }

    // Optional frontend validations (nice to have but not backend required)
    // Gender and Birthday are optional in backend but good UX to require

    // Set errors in state
    setFieldErrors(errors);

    // If there are errors, scroll to first error field
    if (Object.keys(errors).length > 0) {
      setActiveTab("basic-info");

      // Scroll to first error field after a short delay to allow tab switch
      setTimeout(() => {
        const firstErrorField = Object.keys(errors)[0];
        const errorElement =
          document.querySelector(`[name="${firstErrorField}"]`) ||
          document.querySelector(`#${firstErrorField}`) ||
          document.querySelector(`.field-${firstErrorField}`);
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: "smooth", block: "center" });
          (errorElement as HTMLElement).focus?.();
        }
      }, 100);

      return false;
    }

    return true;
  };

  // Handle form submission (final save - validation already done in handleNext)
  const handleSubmit = async (e: React.FormEvent) => {
    console.log("Submitting form and permissions");
    e.preventDefault();

    try {
      setError(null);
      setLoading(true);

      // Extract basic info fields
      const {
        employeeId,
        avatarUrl,
        firstName,
        lastName,
        dateOfJoining,
        contact: { email, phone },
        account: { role },
        personal,
        companyName,
        departmentId,
        designationId,
        about,
        status,
      } = formData;

      const basicInfo = {
        employeeId,
        avatarUrl,
        firstName,
        lastName,
        dateOfJoining,
        account: { role },
        contact: { email, phone },
        personal: {
          gender: personal?.gender || "",
          birthday: personal?.birthday || null,
          address: {
            street: personal?.address?.street || "",
            city: personal?.address?.city || "",
            state: personal?.address?.state || "",
            postalCode: personal?.address?.postalCode || "",
            country: personal?.address?.country || "",
          },
        },
        companyName,
        departmentId,
        designationId,
        about,
        status: normalizeStatus(status),
      };

      // Prepare full submission data
      const submissionData = {
        employeeData: basicInfo,
        clerkId: ClerkID,
        permissionsData: {
          permissions: permissions.permissions,
          enabledModules: permissions.enabledModules,
        },
      };

      console.log("Full Submission Data:", submissionData);

      if (!socket) {
        console.log("Socket connection is not available");
        setError("Socket connection is not available.");
        setLoading(false);
        return;
      }

      // Directly save - validation already done in handleNext
      socket.emit("hrm/employees/add", submissionData);
    } catch (error) {
      console.error("Error submitting form and permissions:", error);
      setError("An error occurred while submitting data.");
      setLoading(false);
    }
  };

  // 1. Update basic info
  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) {
      toast.error("No employee selected for editing.");
      return;
    }
    
    // Lifecycle statuses that should only be set through HR workflows
    const lifecycleStatuses = ["Terminated", "Resigned", "On Notice"];
    const currentStatus = normalizeStatus(editingEmployee.status);
    
    const payload: any = {
      employeeId: editingEmployee.employeeId || "",
      firstName: editingEmployee.firstName || "",
      lastName: editingEmployee.lastName || "",
      account: {
        role: editingEmployee.account?.role || "",
      },
      contact: {
        email: editingEmployee.contact?.email || "",
        phone: editingEmployee.contact?.phone || "",
      },
      personal: {
        gender: editingEmployee.personal?.gender || "",
        birthday: editingEmployee.personal?.birthday || null,
        address: editingEmployee.personal?.address || {
          street: "",
          city: "",
          state: "",
          postalCode: "",
          country: "",
        },
      },
      companyName: editingEmployee.companyName || "",
      departmentId: editingEmployee.departmentId || "",
      designationId: editingEmployee.designationId || "",
      dateOfJoining: editingEmployee.dateOfJoining || null,
      about: editingEmployee.about || "",
      avatarUrl: editingEmployee.avatarUrl || "",
    };
    
    // Only include status if it's NOT a lifecycle status
    // Lifecycle statuses should only be set through termination/resignation workflows
    if (!lifecycleStatuses.includes(currentStatus)) {
      payload.status = currentStatus;
    }
    
    console.log("update payload", payload);

    if (socket) {
      socket.emit("hrm/employees/update", payload);
      // Success toast will be shown in handleUpdateEmployeeResponse when backend confirms update
    } else {
      toast.error("Socket connection is not available.", {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  // 2. Update permissions
  const handlePermissionUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingEmployee) {
      console.log("****he**-**");
      toast.error("No employee selected for editing.");
      return;
    }
    const payload = {
      employeeId: editingEmployee._id,
      permissions: permissions.permissions,
      enabledModules: permissions.enabledModules,
    };
    console.log("edit perm payload", payload);

    if (socket) {
      socket.emit("hrm/employees/update-permissions", payload);
      // toast.success("Employee permissions update request sent.");
      setPermissions(initialState);
    } else {
      console.log(error);
      return;
      // toast.error("Socket connection is not available.");
    }
  };
  console.log("editing employee", editingEmployee);
  const handleResetFormData = () => {
    setFormData({
      employeeId: generateId("EMP"),
      avatarUrl: "",
      firstName: "",
      lastName: "",
      dateOfJoining: "",
      contact: {
        email: "",
        phone: "",
      },
      account: {
        role: "",
      },
      personal: {
        gender: "",
        birthday: "",
        address: {
          street: "",
          city: "",
          state: "",
          postalCode: "",
          country: "",
        },
      },
      companyName: "",
      departmentId: "",
      designationId: "",
      about: "",
      status: "Active" as "Active" | "Inactive" | "On Notice" | "Resigned" | "Terminated" | "On Leave",
    });

    setPermissions(initialState);
    setError("");
    setFieldErrors({});

    setIsBasicInfoValidated(false);
  };

  // Helper function to safely prepare employee for editing
  const prepareEmployeeForEdit = (emp: Employee): Employee => {
    return {
      ...emp,
      account: emp.account || { role: "" },
      contact: emp.contact || { email: "", phone: "" },
      personal: emp.personal || {
        gender: "",
        birthday: null,
        address: {
          street: "",
          city: "",
          state: "",
          postalCode: "",
          country: "",
        },
      },
      firstName: emp.firstName || "",
      lastName: emp.lastName || "",
      companyName: emp.companyName || "",
      departmentId: emp.departmentId || "",
      designationId: emp.designationId || "",
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

  // Handle "Save and Next" - validate with backend before going to permissions tab
  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setFieldErrors({});
    setError(null);

    // First run frontend validation (fast, synchronous)
    if (!validateForm()) {
      return;
    }

    // Check if socket is available
    if (!socket) {
      setFieldErrors({
        general: "Connection unavailable. Please refresh the page.",
      });
      return;
    }

    // Show validating state
    setIsValidating(true);

    // Check for duplicate email, phone, and username with backend
    try {
      // Create a promise to wait for backend response
      const checkDuplicates = new Promise<{
        done: boolean;
        error?: string;
        field?: string;
      }>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error("timeout"));
        }, 15000); // 15 second timeout

        // Listen for duplicate check response
        const responseHandler = (response: any) => {
          console.log(
            "=== FRONTEND: Received response from backend ===",
            response,
          );
          clearTimeout(timeoutId);
          resolve(response);
        };

        socket.once("hrm/employees/check-duplicates-response", responseHandler);

        // Emit duplicate check request
        const requestData = {
          email: formData.contact.email,
          phone: formData.contact.phone,
        };

        console.log("=== FRONTEND: Emitting check-duplicates ===", requestData);

        socket.emit("hrm/employees/check-duplicates", requestData);
      });

      const result = await checkDuplicates;
      setIsValidating(false);

      console.log("Check duplicates result:", result);

      if (!result.done) {
        // Duplicate found - backend returns field and error
        const fieldName = result.field || "general";
        const errorMessage = result.error || "Validation failed";

        console.log("Setting field error:", fieldName, errorMessage);

        // Use parseBackendError to get user-friendly message
        const errorInfo = parseBackendError(errorMessage);

        if (errorInfo && errorInfo.field !== "general") {
          // Set error for specific field
          setFieldErrors((prev) => ({
            ...prev,
            [errorInfo.field]: errorInfo.message,
          }));

          // Also show toast as backup
          toast.error(errorInfo.message, {
            position: "top-right",
            autoClose: 5000,
          });

          // Scroll to error field
          setTimeout(() => {
            const errorElement =
              document.querySelector(`[name="${errorInfo.field}"]`) ||
              document.querySelector(`#${errorInfo.field}`) ||
              document.querySelector(".is-invalid");
            if (errorElement) {
              errorElement.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
              (errorElement as HTMLElement).focus?.();
            }
          }, 100);
        } else {
          // General error
          setFieldErrors({ general: errorMessage });
          toast.error(errorMessage, {
            position: "top-right",
            autoClose: 5000,
          });
        }

        return; // Don't proceed to next tab
      }

      // All validation passed - mark as validated and proceed to permissions tab
      setIsBasicInfoValidated(true);
      setActiveTab("address");
    } catch (error: any) {
      console.error("Validation error:", error);
      setIsValidating(false);
      if (error.message === "timeout") {
        const errorMsg =
          "Validation is taking longer than expected. Please check your connection and try again.";
        setFieldErrors({ general: errorMsg });
        toast.error(errorMsg, {
          position: "top-right",
          autoClose: 5000,
        });
      } else {
        const errorMsg = "Unable to validate. Please try again.";
        setFieldErrors({ general: errorMsg });
        toast.error(errorMsg, {
          position: "top-right",
          autoClose: 5000,
        });
      }
    }
  };

  const allPermissionsSelected = () => {
    return MODULES.every((module) =>
      ACTIONS.every((action) => permissions.permissions[module][action]),
    );
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
                <Link
                  to="#"
                  data-bs-toggle="modal"
                  data-inert={true}
                  data-bs-target="#add_employee"
                  className="btn btn-primary d-flex align-items-center"
                  onClick={() => generateId("EMP")}
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
                      <p className="fs-12 fw-medium mb-1 text-truncate">
                        Active
                      </p>
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
                      <p className="fs-12 fw-medium mb-1 text-truncate">
                        Inactive
                      </p>
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

          {/* Unified Filter Bar for Both Views */}
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
              <h5>Employee</h5>
              <div className="d-flex my-xl-auto right-content align-items-center flex-wrap row-gap-3">
                <div className="me-3">
                  <div className="input-icon-end position-relative">
                    <PredefinedDateRanges onChange={handleDateRangeFilter} />
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
                              setSelectedDepartment(dep.value);
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
                        contact,
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
                                        "assets/img/users/user-32.jpg"
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
                                        data-bs-toggle="modal"
                                        data-inert={true}
                                        data-bs-target="#edit_employee"
                                        onClick={() => {
                                          const preparedEmployee =
                                            prepareEmployeeForEdit(emp);
                                          setEditingEmployee(preparedEmployee);
                                          // Load permissions for editing
                                          if (
                                            emp.permissions &&
                                            emp.enabledModules
                                          ) {
                                            setPermissions({
                                              permissions: emp.permissions,
                                              enabledModules:
                                                emp.enabledModules,
                                              selectAll: Object.keys(
                                                emp.enabledModules,
                                              ).reduce(
                                                (acc, key) => {
                                                  acc[key as PermissionModule] =
                                                    false;
                                                  return acc;
                                                },
                                                {} as Record<
                                                  PermissionModule,
                                                  boolean
                                                >,
                                              ),
                                            });
                                          }
                                          // Load department and designation
                                          if (emp.departmentId) {
                                            setSelectedDepartment(
                                              emp.departmentId,
                                            );
                                            if (socket) {
                                              socket.emit(
                                                "hrm/designations/get",
                                                {
                                                  departmentId:
                                                    emp.departmentId,
                                                },
                                              );
                                            }
                                          }
                                          if (emp.designationId) {
                                            setSelectedDesignation(
                                              emp.designationId,
                                            );
                                          }
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
                                    title={contact?.email || "-"}
                                  >
                                    {contact?.email || "-"}
                                  </span>
                                </div>
                                <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                                  <span className="text-muted fs-12">
                                    Phone
                                  </span>
                                  <span className="fw-medium fs-13">
                                    {contact?.phone || "-"}
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
      {/* Add Employee */}
      <div className="modal fade" id="add_employee">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <div className="d-flex align-items-center">
                <h4 className="modal-title me-2">Add New Employee</h4>
                <span>Employee ID : {formData.employeeId}</span>
              </div>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={() => {
                  handleResetFormData();
                  setActiveTab("basic-info");
                  setTimeout(() => closeModal(), 100);
                }}
              >
                <i className="ti ti-x" />
              </button>
            </div>
            {/* Hidden button for programmatic modal close */}
            <button
              type="button"
              ref={addEmployeeModalRef}
              data-bs-dismiss="modal"
              style={{ display: "none" }}
            />
            <form action={all_routes.employeeList} onSubmit={handleSubmit}>
              <div className="contact-grids-tab">
                <ul className="nav nav-underline" id="myTab" role="tablist">
                  <li className="nav-item" role="presentation">
                    <button
                      id="info-tab"
                      data-bs-toggle="tab"
                      data-bs-target="#basic-info"
                      className={`nav-link ${
                        activeTab === "basic-info" ? "active" : ""
                      }`}
                      type="button"
                      role="tab"
                      aria-selected="true"
                      onClick={() => setActiveTab("basic-info")}
                    >
                      Basic Information
                    </button>
                  </li>
                  <li className="nav-item" role="presentation">
                    <button
                      className={`nav-link ${
                        activeTab === "address" ? "active" : ""
                      } ${!isBasicInfoValidated ? "disabled" : ""}`}
                      onClick={(e) => {
                        // Prevent access to permissions tab until basic info is validated
                        if (!isBasicInfoValidated) {
                          e.preventDefault();
                          toast.info(
                            "Please complete and validate basic information first",
                            {
                              position: "top-right",
                              autoClose: 3000,
                            },
                          );
                          return;
                        }

                        // Check if basic info tab has any errors
                        const basicInfoFields = [
                          "firstName",
                          "lastName",
                          "email",
                          "role", // Changed from userName to role
                          "phone",
                          "departmentId",
                          "designationId",
                          "dateOfJoining",
                        ];
                        const hasBasicInfoErrors = basicInfoFields.some(
                          (field) => fieldErrors[field],
                        );

                        if (hasBasicInfoErrors) {
                          e.preventDefault();
                          // Scroll to first error field instead of toast
                          setTimeout(() => {
                            const firstErrorField = basicInfoFields.find(
                              (field) => fieldErrors[field],
                            );
                            if (firstErrorField) {
                              const errorElement =
                                document.querySelector(
                                  `[name="${firstErrorField}"]`,
                                ) ||
                                document.querySelector(`#${firstErrorField}`) ||
                                document.querySelector(".is-invalid");
                              if (errorElement) {
                                errorElement.scrollIntoView({
                                  behavior: "smooth",
                                  block: "center",
                                });
                                (errorElement as HTMLElement).focus?.();
                              }
                            }
                          }, 100);
                          return;
                        }
                        setActiveTab("address");
                      }}
                      id="address-tab"
                      data-bs-toggle="tab"
                      data-bs-target="#address"
                      type="button"
                      role="tab"
                      aria-selected="false"
                      disabled={!isBasicInfoValidated}
                    >
                      Permissions
                    </button>
                  </li>
                </ul>
              </div>
              <div className="tab-content" id="myTabContent">
                <div
                  className={`tab-pane fade ${
                    activeTab === "basic-info" ? "show active" : ""
                  }`}
                  id="basic-info"
                  role="tabpanel"
                  aria-labelledby="info-tab"
                  tabIndex={0}
                >
                  <div className="modal-body pb-0 ">
                    {/* General error display */}
                    {fieldErrors.general && (
                      <div className="alert alert-danger mb-3" role="alert">
                        {fieldErrors.general}
                      </div>
                    )}
                    <div className="row">
                      <div className="col-md-12">
                        <div className="d-flex align-items-center flex-wrap row-gap-3 bg-light w-100 rounded p-3 mb-4">
                          {formData.avatarUrl ? (
                            <img
                              src={formData.avatarUrl}
                              alt="Profile"
                              className="avatar avatar-xxl rounded-circle border border-dashed me-2 flex-shrink-0"
                            />
                          ) : (
                            <div className="d-flex align-items-center justify-content-center avatar avatar-xxl rounded-circle border border-dashed me-2 flex-shrink-0 text-dark frames">
                              <i className="ti ti-photo text-gray-2 fs-16" />
                            </div>
                          )}
                          <div className="profile-upload">
                            <div className="mb-2">
                              <h6 className="mb-1">
                                Upload Profile Image (Optional)
                              </h6>
                              <p className="fs-12">
                                Image should be below 4 mb
                              </p>
                            </div>
                            <div className="profile-uploader d-flex align-items-center">
                              <div className="drag-upload-btn btn btn-sm btn-primary me-2">
                                {loading ? "Uploading..." : "Upload"}
                                <input
                                  type="file"
                                  className="form-control image-sign"
                                  accept=".png,.jpeg,.jpg,.ico"
                                  ref={fileInputRef}
                                  onChange={handleImageUpload}
                                  disabled={loading}
                                  style={{
                                    cursor: loading ? "not-allowed" : "pointer",
                                    opacity: 0,
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    width: "100%",
                                    height: "100%",
                                  }}
                                />
                              </div>
                              <button
                                type="button"
                                className="btn btn-light btn-sm"
                                onClick={() =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    avatarUrl: "",
                                  }))
                                }
                                disabled={loading} // Disable cancel during loading for safety
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">
                            First Name <span className="text-danger"> *</span>
                          </label>
                          <input
                            type="text"
                            className={`form-control ${fieldErrors.firstName ? "is-invalid" : ""}`}
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            onFocus={() => clearFieldError("firstName")}
                            onBlur={(e) =>
                              handleFieldBlur("firstName", e.target.value)
                            }
                          />
                          {fieldErrors.firstName && (
                            <div className="invalid-feedback d-block">
                              {fieldErrors.firstName}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">
                            Last Name <span className="text-danger"> *</span>
                          </label>
                          <input
                            type="text"
                            className={`form-control ${fieldErrors.lastName ? "is-invalid" : ""}`}
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                            onFocus={() => clearFieldError("lastName")}
                            onBlur={(e) =>
                              handleFieldBlur("lastName", e.target.value)
                            }
                          />
                          {fieldErrors.lastName && (
                            <div className="invalid-feedback d-block">
                              {fieldErrors.lastName}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">
                            Employee ID <span className="text-danger"> *</span>
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            value={formData.employeeId}
                            readOnly
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">
                            Joining Date <span className="text-danger"> *</span>
                          </label>
                          <div className="input-icon-end position-relative">
                            <DatePicker
                              className={`form-control datetimepicker ${fieldErrors.dateOfJoining ? "is-invalid" : ""}`}
                              format={{
                                format: "DD-MM-YYYY",
                                type: "mask",
                              }}
                              getPopupContainer={getModalContainer}
                              placeholder="DD-MM-YYYY"
                              name="dateOfJoining"
                              value={formData.dateOfJoining}
                              onFocus={() => clearFieldError("dateOfJoining")}
                              onChange={(date) => {
                                handleDateChange(date);
                                handleFieldBlur("dateOfJoining", date);
                              }}
                            />
                            <span className="input-icon-addon">
                              <i className="ti ti-calendar text-gray-7" />
                            </span>
                          </div>
                          {fieldErrors.dateOfJoining && (
                            <div className="invalid-feedback d-block">
                              {fieldErrors.dateOfJoining}
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Role Dropdown - Replaced Username */}
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">
                            Role <span className="text-danger"> *</span>
                          </label>
                          <CommonSelect
                            className={`select ${fieldErrors.role ? "is-invalid" : ""}`}
                            options={roleOptions}
                            defaultValue={roleOptions.find(opt => opt.value === formData.account.role)}
                            onChange={(option: any) => {
                              if (option) {
                                const syntheticEvent = {
                                  target: {
                                    name: "role",
                                    value: option.value
                                  }
                                } as any;
                                handleChange(syntheticEvent);
                                clearFieldError("role");
                              }
                            }}
                          />
                          {fieldErrors.role && (
                            <div className="invalid-feedback d-block">
                              {fieldErrors.role}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">
                            Email <span className="text-danger"> *</span>
                          </label>
                          <input
                            type="email"
                            className={`form-control ${fieldErrors.email ? "is-invalid" : ""}`}
                            name="email"
                            value={formData.contact.email}
                            onChange={handleChange}
                            onFocus={() => clearFieldError("email")}
                            onBlur={(e) =>
                              handleFieldBlur("email", e.target.value)
                            }
                          />
                          {fieldErrors.email && (
                            <div className="invalid-feedback d-block">
                              {fieldErrors.email}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">
                            Gender <span className="text-danger"> *</span>
                          </label>
                          <CommonSelect
                            className={`select ${fieldErrors.gender ? "is-invalid" : ""}`}
                            options={genderOptions}
                            defaultValue={genderOptions.find(opt => opt.value === formData.personal?.gender)}
                            onChange={(option: any) => {
                              if (option) {
                                const value = option.value;
                                setFormData((prev) => ({
                                  ...prev,
                                  personal: {
                                    ...prev.personal,
                                    gender: value,
                                  },
                                }));
                                clearFieldError("gender");
                                handleFieldBlur("gender", value);
                              }
                            }}
                          />
                          {fieldErrors.gender && (
                            <div className="invalid-feedback d-block">
                              {fieldErrors.gender}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">
                            Birthday <span className="text-danger"> *</span>
                          </label>
                          <div className="input-icon-end position-relative">
                            <DatePicker
                              className={`form-control datetimepicker ${fieldErrors.birthday ? "is-invalid" : ""}`}
                              format="DD-MM-YYYY"
                              getPopupContainer={getModalContainer}
                              placeholder="DD-MM-YYYY"
                              name="birthday"
                              value={
                                formData.personal?.birthday
                                  ? dayjs(formData.personal.birthday)
                                  : null
                              }
                              onFocus={() => clearFieldError("birthday")}
                              onChange={(date) => {
                                const isoDate = date
                                  ? date.toDate().toISOString()
                                  : null;
                                setFormData((prev) => ({
                                  ...prev,
                                  personal: {
                                    ...prev.personal,
                                    birthday: isoDate,
                                  },
                                }));
                                handleFieldBlur("birthday", isoDate);
                              }}
                            />
                            <span className="input-icon-addon">
                              <i className="ti ti-calendar text-gray-7" />
                            </span>
                          </div>
                          {fieldErrors.birthday && (
                            <div className="invalid-feedback d-block">
                              {fieldErrors.birthday}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-12">
                        <div className="mb-3">
                          <label className="form-label">Address</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Street"
                            name="street"
                            value={formData.personal?.address?.street || ""}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                personal: {
                                  ...prev.personal,
                                  address: {
                                    ...prev.personal?.address,
                                    street: e.target.value,
                                  },
                                },
                              }))
                            }
                          />
                          <div className="row mt-3">
                            <div className="col-md-6">
                              <input
                                type="text"
                                className="form-control"
                                placeholder="City"
                                name="city"
                                value={formData.personal?.address?.city || ""}
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    personal: {
                                      ...prev.personal,
                                      address: {
                                        ...prev.personal?.address,
                                        city: e.target.value,
                                      },
                                    },
                                  }))
                                }
                              />
                            </div>
                            <div className="col-md-6">
                              <input
                                type="text"
                                className="form-control"
                                placeholder="State"
                                name="state"
                                value={formData.personal?.address?.state || ""}
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    personal: {
                                      ...prev.personal,
                                      address: {
                                        ...prev.personal?.address,
                                        state: e.target.value,
                                      },
                                    },
                                  }))
                                }
                              />
                            </div>
                          </div>
                          <div className="row mt-3">
                            <div className="col-md-6">
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Postal Code"
                                name="postalCode"
                                value={
                                  formData.personal?.address?.postalCode || ""
                                }
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    personal: {
                                      ...prev.personal,
                                      address: {
                                        ...prev.personal?.address,
                                        postalCode: e.target.value,
                                      },
                                    },
                                  }))
                                }
                              />
                            </div>
                            <div className="col-md-6">
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Country"
                                name="country"
                                value={
                                  formData.personal?.address?.country || ""
                                }
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    personal: {
                                      ...prev.personal,
                                      address: {
                                        ...prev.personal?.address,
                                        country: e.target.value,
                                      },
                                    },
                                  }))
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* REMOVED: Password and Confirm Password fields */}
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">
                            Phone Number <span className="text-danger"> *</span>
                          </label>
                          <input
                            type="text"
                            className={`form-control ${fieldErrors.phone ? "is-invalid" : ""}`}
                            name="phone"
                            value={formData.contact.phone}
                            onChange={handleChange}
                            onFocus={() => clearFieldError("phone")}
                            onBlur={(e) =>
                              handleFieldBlur("phone", e.target.value)
                            }
                          />
                          {fieldErrors.phone && (
                            <div className="invalid-feedback d-block">
                              {fieldErrors.phone}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">
                            Department <span className="text-danger">*</span>
                          </label>
                          <CommonSelect
                            className={`select ${fieldErrors.departmentId ? "is-invalid" : ""}`}
                            options={department}
                            defaultValue={EMPTY_OPTION}
                            onChange={(option) => {
                              if (option) {
                                handleSelectChange(
                                  "departmentId",
                                  option.value,
                                );
                                setSelectedDepartment(option.value);

                                // Reset designation when department changes
                                setDesignation([
                                  { value: "", label: "Select" },
                                ]);
                                handleSelectChange("designationId", "");

                                // Clear errors for both department and designation
                                clearFieldError("departmentId");
                                clearFieldError("designationId");

                                // Fetch new designations for selected department
                                if (socket) {
                                  socket.emit("hrm/designations/get", {
                                    departmentId: option.value,
                                  });
                                }
                              }
                            }}
                          />
                          {fieldErrors.departmentId && (
                            <div className="invalid-feedback d-block">
                              {fieldErrors.departmentId}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">
                            Designation <span className="text-danger">*</span>
                          </label>
                          <CommonSelect
                            className={`select ${fieldErrors.designationId ? "is-invalid" : ""}`}
                            options={designation}
                            defaultValue={EMPTY_OPTION}
                            onChange={(option) => {
                              if (option) {
                                handleSelectChange(
                                  "designationId",
                                  option.value,
                                );
                                clearFieldError("designationId");
                              }
                            }}
                          />
                          {fieldErrors.designationId && (
                            <div className="invalid-feedback d-block">
                              {fieldErrors.designationId}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">
                            Status <span className="text-danger"> *</span>
                          </label>
                          <div className="d-flex align-items-center">
                            <div className="form-check form-switch">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                role="switch"
                                id="statusSwitch"
                                checked={formData.status === "Active"}
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    status: e.target.checked
                                      ? "Active"
                                      : "Inactive",
                                  }))
                                }
                              />
                              <label
                                className="form-check-label"
                                htmlFor="statusSwitch"
                              >
                                <span
                                  className={`badge ${
                                    formData.status === "Active"
                                      ? "badge-success"
                                      : "badge-danger"
                                  } d-inline-flex align-items-center`}
                                >
                                  <i className="ti ti-point-filled me-1" />
                                  {formData.status}
                                </span>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-12">
                        <div className="mb-3">
                          <label className="form-label">About</label>
                          <textarea
                            className="form-control"
                            rows={3}
                            name="about"
                            value={formData.about}
                            onChange={handleChange}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Display general/common errors before Save button */}
                  {fieldErrors.general && (
                    <div className="alert alert-danger mx-3 mb-0" role="alert">
                      <i className="ti ti-alert-circle me-2"></i>
                      {fieldErrors.general}
                    </div>
                  )}
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-outline-light border me-2"
                      data-bs-dismiss="modal"
                      onClick={() => setTimeout(() => closeModal(), 100)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleNext}
                      disabled={isValidating || loading}
                    >
                      {isValidating ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-2"
                            role="status"
                            aria-hidden="true"
                          ></span>
                          Validating...
                        </>
                      ) : (
                        "Save and Next"
                      )}
                    </button>
                  </div>
                </div>
                <div
                  className={`tab-pane fade ${
                    activeTab === "address" ? "show active" : ""
                  }`}
                  id="address"
                  role="tabpanel"
                  aria-labelledby="address-tab"
                  tabIndex={0}
                >
                  <div className="modal-body">
                    <div className="card bg-light-500 shadow-none">
                      <div className="card-body d-flex align-items-center justify-content-between flex-wrap row-gap-3">
                        <h6>Enable Options</h6>
                        <div className="d-flex align-items-center justify-content-end">
                          <div className="form-check form-switch me-2">
                            <label className="form-check-label mt-0">
                              <input
                                className="form-check-input me-2"
                                type="checkbox"
                                role="switch"
                                checked={Object.values(
                                  permissions.enabledModules,
                                ).every(Boolean)}
                                onChange={(e) =>
                                  toggleAllModules(e.target.checked)
                                }
                              />
                              Enable all Module
                            </label>
                          </div>
                          <div className="form-check d-flex align-items-center">
                            <label className="form-check-label mt-0">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                checked={Object.values(
                                  permissions.selectAll,
                                ).every(Boolean)}
                                onChange={(e) =>
                                  toggleGlobalSelectAll(e.target.checked)
                                }
                              />
                              Select All
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="table-responsive border rounded">
                      <table className="table">
                        <tbody>
                          {MODULES.map((module) => (
                            <tr key={module}>
                              <td>
                                <div className="form-check form-switch me-2">
                                  <label className="form-check-label mt-0">
                                    <input
                                      className="form-check-input me-2"
                                      type="checkbox"
                                      role="switch"
                                      checked={
                                        permissions.enabledModules[module]
                                      }
                                      onChange={() => toggleModule(module)}
                                    />
                                    {module.charAt(0).toUpperCase() +
                                      module.slice(1)}
                                  </label>
                                </div>
                              </td>

                              {ACTIONS.map((action) => (
                                <td key={action}>
                                  <div className="form-check d-flex align-items-center">
                                    <label className="form-check-label mt-0">
                                      <input
                                        className="form-check-input"
                                        type="checkbox"
                                        checked={
                                          permissions.permissions[module][
                                            action
                                          ]
                                        }
                                        onChange={(e) =>
                                          handlePermissionChange(
                                            module,
                                            action,
                                            e.target.checked,
                                          )
                                        }
                                        disabled={
                                          !permissions.enabledModules[module]
                                        } // disable if module not enabled
                                      />
                                      {action.charAt(0).toUpperCase() +
                                        action.slice(1)}
                                    </label>
                                  </div>
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-outline-light border me-2"
                      data-bs-dismiss="modal"
                      onClick={() => {
                        handleResetFormData();
                        setActiveTab("basic-info");
                        setTimeout(() => closeModal(), 100);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isValidating || loading}
                    >
                      {isValidating ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-2"
                            role="status"
                            aria-hidden="true"
                          ></span>
                          Validating...
                        </>
                      ) : loading ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-2"
                            role="status"
                            aria-hidden="true"
                          ></span>
                          Saving...
                        </>
                      ) : (
                        "Save"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Add Employee */}
      {/* Edit Employee */}
      <div className="modal fade" id="edit_employee">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <div className="d-flex align-items-center">
                <h4 className="modal-title me-2">Edit Employee</h4>
                <span>Employee ID : {editingEmployee?.employeeId}</span>
              </div>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={() => {
                  setEditingEmployee(null);
                  setTimeout(() => closeModal(), 100);
                }}
              >
                <i className="ti ti-x" />
              </button>
            </div>
            {/* Hidden button for programmatic modal close */}
            <button
              type="button"
              ref={editEmployeeModalRef}
              data-bs-dismiss="modal"
              style={{ display: "none" }}
            />
            <form action={all_routes.employeeList}>
              <div className="contact-grids-tab">
                <ul className="nav nav-underline" id="myTab2" role="tablist">
                  <li className="nav-item" role="presentation">
                    <button
                      className="nav-link active"
                      id="info-tab2"
                      data-bs-toggle="tab"
                      data-bs-target="#basic-info2"
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
                      id="address-tab2"
                      data-bs-toggle="tab"
                      data-bs-target="#address2"
                      type="button"
                      role="tab"
                      aria-selected="false"
                    >
                      Permissions
                    </button>
                  </li>
                </ul>
              </div>
              <div className="tab-content" id="myTabContent2">
                <div
                  className="tab-pane fade show active"
                  id="basic-info2"
                  role="tabpanel"
                  aria-labelledby="info-tab2"
                  tabIndex={0}
                >
                  <div className="modal-body pb-0 ">
                    <div className="row">
                      <div className="col-md-12">
                        <div className="d-flex align-items-center flex-wrap row-gap-3 bg-light w-100 rounded p-3 mb-4">
                          <div className="d-flex align-items-center justify-content-center avatar avatar-xxl rounded-circle border border-dashed me-2 flex-shrink-0 text-dark frames">
                            {editingEmployee?.avatarUrl ? (
                              <img
                                src={editingEmployee.avatarUrl}
                                alt="Profile"
                                className="avatar avatar-xxl rounded-circle border border-dashed me-2 flex-shrink-0"
                              />
                            ) : (
                              <ImageWithBasePath
                                src="assets/img/users/user-13.jpg"
                                alt="img"
                                className="rounded-circle"
                              />
                            )}
                          </div>
                          <div className="profile-upload">
                            <div className="mb-2">
                              <h6 className="mb-1">Upload Profile Image</h6>
                              <p className="fs-12">
                                Image should be below 4 mb
                              </p>
                            </div>
                            <div className="profile-uploader d-flex align-items-center">
                              <div className="drag-upload-btn btn btn-sm btn-primary me-2">
                                Upload
                                <input
                                  type="file"
                                  className="form-control image-sign"
                                  accept=".png,.jpeg,.jpg,.ico"
                                  onChange={async (event) => {
                                    const file = event.target.files?.[0];
                                    if (!file) return;
                                    const maxSize = 4 * 1024 * 1024;
                                    if (file.size > maxSize) {
                                      toast.error(
                                        "File size must be less than 4MB.",
                                      );
                                      event.target.value = "";
                                      return;
                                    }
                                    if (
                                      [
                                        "image/jpeg",
                                        "image/png",
                                        "image/jpg",
                                        "image/ico",
                                      ].includes(file.type)
                                    ) {
                                      try {
                                        const formData = new FormData();
                                        formData.append("file", file);
                                        formData.append(
                                          "upload_preset",
                                          "amasqis",
                                        );
                                        const res = await fetch(
                                          "https://api.cloudinary.com/v1_1/dwc3b5zfe/image/upload",
                                          { method: "POST", body: formData },
                                        );
                                        const data = await res.json();
                                        setEditingEmployee((prev) =>
                                          prev
                                            ? {
                                                ...prev,
                                                avatarUrl: data.secure_url,
                                              }
                                            : prev,
                                        );
                                      } catch (error) {
                                        toast.error(
                                          "Failed to upload image. Please try again.",
                                        );
                                        event.target.value = "";
                                      }
                                    } else {
                                      toast.error(
                                        "Please upload image file only.",
                                      );
                                      event.target.value = "";
                                    }
                                  }}
                                  style={{
                                    cursor: "pointer",
                                    opacity: 0,
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    width: "100%",
                                    height: "100%",
                                  }}
                                />
                              </div>
                              <button
                                type="button"
                                className="btn btn-light btn-sm"
                                onClick={() =>
                                  setEditingEmployee((prev) =>
                                    prev ? { ...prev, avatarUrl: "" } : prev,
                                  )
                                }
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">
                            First Name <span className="text-danger"> *</span>
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            value={editingEmployee?.firstName || ""}
                            onChange={(e) =>
                              setEditingEmployee((prev) =>
                                prev
                                  ? { ...prev, firstName: e.target.value }
                                  : prev,
                              )
                            }
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Last Name</label>
                          <input
                            type="text"
                            className="form-control"
                            value={editingEmployee?.lastName || ""}
                            onChange={(e) =>
                              setEditingEmployee((prev) =>
                                prev
                                  ? { ...prev, lastName: e.target.value }
                                  : prev,
                              )
                            }
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">
                            Employee ID <span className="text-danger"> *</span>
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            value={editingEmployee?.employeeId || ""}
                            readOnly
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">
                            Joining Date <span className="text-danger"> *</span>
                          </label>
                          <div className="input-icon-end position-relative">
                            <DatePicker
                              className="form-control datetimepicker"
                              format="DD-MM-YYYY"
                              getPopupContainer={getModalContainer}
                              placeholder="DD-MM-YYYY"
                              name="dateOfJoining"
                              value={
                                editingEmployee?.dateOfJoining
                                  ? dayjs(editingEmployee.dateOfJoining)
                                  : null
                              }
                              onChange={(date: dayjs.Dayjs | null) => {
                                setEditingEmployee((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        dateOfJoining: date
                                          ? date.toDate().toISOString()
                                          : "",
                                      }
                                    : prev,
                                );
                              }}
                            />
                            <span className="input-icon-addon">
                              <i className="ti ti-calendar text-gray-7" />
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">
                            Role <span className="text-danger"> *</span>
                          </label>
                          <CommonSelect
                            className="select"
                            options={roleOptions}
                            defaultValue={roleOptions.find(opt => opt.value === editingEmployee?.account?.role)}
                            onChange={(option: any) => {
                              if (option) {
                                setEditingEmployee((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        account: {
                                          ...prev.account,
                                          role: option.value,
                                        },
                                      }
                                    : prev,
                                );
                              }
                            }}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">
                            Email <span className="text-danger"> *</span>
                          </label>
                          <input
                            type="email"
                            className="form-control"
                            value={editingEmployee?.contact?.email || ""}
                            onChange={(e) =>
                              setEditingEmployee((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      contact: {
                                        ...prev.contact,
                                        email: e.target.value,
                                      },
                                    }
                                  : prev,
                              )
                            }
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">
                            Gender <span className="text-danger"> *</span>
                          </label>
                          <CommonSelect
                            className="select"
                            options={genderOptions}
                            defaultValue={genderOptions.find(opt => opt.value === editingEmployee?.personal?.gender)}
                            onChange={(option: any) => {
                              if (option) {
                                setEditingEmployee((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        personal: {
                                          ...prev.personal,
                                          gender: option.value,
                                        },
                                      }
                                    : prev,
                                );
                              }
                            }}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">
                            Birthday <span className="text-danger"> *</span>
                          </label>
                          <div className="input-icon-end position-relative">
                            <DatePicker
                              className="form-control datetimepicker"
                              format="DD-MM-YYYY"
                              getPopupContainer={getModalContainer}
                              placeholder="DD-MM-YYYY"
                              value={
                                editingEmployee?.personal?.birthday
                                  ? dayjs(editingEmployee.personal.birthday)
                                  : null
                              }
                              onChange={(date) =>
                                setEditingEmployee((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        personal: {
                                          ...prev.personal,
                                          birthday: date
                                            ? date.toDate().toISOString()
                                            : null,
                                        },
                                      }
                                    : prev,
                                )
                              }
                            />
                            <span className="input-icon-addon">
                              <i className="ti ti-calendar text-gray-7" />
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-12">
                        <div className="mb-3">
                          <label className="form-label">Address</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Street"
                            value={
                              editingEmployee?.personal?.address?.street || ""
                            }
                            onChange={(e) =>
                              setEditingEmployee((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      personal: {
                                        ...prev.personal,
                                        address: {
                                          ...prev.personal?.address,
                                          street: e.target.value,
                                        },
                                      },
                                    }
                                  : prev,
                              )
                            }
                          />
                          <div className="row mt-3">
                            <div className="col-md-6">
                              <input
                                type="text"
                                className="form-control"
                                placeholder="City"
                                value={
                                  editingEmployee?.personal?.address?.city || ""
                                }
                                onChange={(e) =>
                                  setEditingEmployee((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          personal: {
                                            ...prev.personal,
                                            address: {
                                              ...prev.personal?.address,
                                              city: e.target.value,
                                            },
                                          },
                                        }
                                      : prev,
                                  )
                                }
                              />
                            </div>
                            <div className="col-md-6">
                              <input
                                type="text"
                                className="form-control"
                                placeholder="State"
                                value={
                                  editingEmployee?.personal?.address?.state ||
                                  ""
                                }
                                onChange={(e) =>
                                  setEditingEmployee((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          personal: {
                                            ...prev.personal,
                                            address: {
                                              ...prev.personal?.address,
                                              state: e.target.value,
                                            },
                                          },
                                        }
                                      : prev,
                                  )
                                }
                              />
                            </div>
                          </div>
                          <div className="row mt-3">
                            <div className="col-md-6">
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Postal Code"
                                value={
                                  editingEmployee?.personal?.address
                                    ?.postalCode || ""
                                }
                                onChange={(e) =>
                                  setEditingEmployee((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          personal: {
                                            ...prev.personal,
                                            address: {
                                              ...prev.personal?.address,
                                              postalCode: e.target.value,
                                            },
                                          },
                                        }
                                      : prev,
                                  )
                                }
                              />
                            </div>
                            <div className="col-md-6">
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Country"
                                value={
                                  editingEmployee?.personal?.address?.country ||
                                  ""
                                }
                                onChange={(e) =>
                                  setEditingEmployee((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          personal: {
                                            ...prev.personal,
                                            address: {
                                              ...prev.personal?.address,
                                              country: e.target.value,
                                            },
                                          },
                                        }
                                      : prev,
                                  )
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">
                            Phone Number <span className="text-danger"> *</span>
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            value={editingEmployee?.contact?.phone || ""}
                            onChange={(e) =>
                              setEditingEmployee((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      contact: {
                                        ...prev.contact,
                                        phone: e.target.value,
                                      },
                                    }
                                  : prev,
                              )
                            }
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">
                            Company<span className="text-danger"> *</span>
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            value={editingEmployee?.companyName || ""}
                            onChange={(e) =>
                              setEditingEmployee((prev) =>
                                prev
                                  ? { ...prev, companyName: e.target.value }
                                  : prev,
                              )
                            }
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Department</label>
                          <CommonSelect
                            key={`dept-${editingEmployee?._id}-${editingEmployee?.departmentId}`}
                            className="select"
                            options={department}
                            defaultValue={
                              department.find(
                                (dep) =>
                                  dep.value === editingEmployee?.departmentId,
                              ) || { value: "", label: "Select" }
                            }
                            onChange={(option) => {
                              if (option) {
                                setSelectedDepartment(option.value);
                                setEditingEmployee((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        departmentId: option.value,
                                        designationId: "",
                                      }
                                    : prev,
                                );
                                setSelectedDesignation("");
                                if (socket && option.value) {
                                  console.log(
                                    "Fetching designations for department:",
                                    option.value,
                                  );
                                  socket.emit("hrm/designations/get", {
                                    departmentId: option.value,
                                  });
                                } else {
                                  setDesignation([
                                    { value: "", label: "Select" },
                                  ]);
                                }
                              }
                            }}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Designation</label>
                          <CommonSelect
                            key={`desig-${editingEmployee?._id}-${editingEmployee?.designationId}`}
                            className="select"
                            options={designation}
                            defaultValue={
                              designation.find(
                                (dep) =>
                                  dep.value === editingEmployee?.designationId,
                              ) || { value: "", label: "Select" }
                            }
                            onChange={(option) => {
                              if (option) {
                                setSelectedDesignation(option.value);
                                setEditingEmployee((prev) =>
                                  prev
                                    ? { ...prev, designationId: option.value }
                                    : prev,
                                );
                              }
                            }}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">
                            Status <span className="text-danger"> *</span>
                          </label>
                          <div>
                            <div className="form-check form-switch">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                role="switch"
                                id="editStatusSwitch"
                                checked={editingEmployee?.status === "Active"}
                                disabled={
                                  editingEmployee?.status?.toLowerCase() !== "active" &&
                                  editingEmployee?.status?.toLowerCase() !== "inactive"
                                }
                                onChange={(e) => {
                                  const currentStatus = editingEmployee?.status?.toLowerCase();
                                  // Only allow editing if status is Active or Inactive
                                  if (currentStatus !== "active" && currentStatus !== "inactive") {
                                    toast.warning(
                                      `Status cannot be changed for ${editingEmployee?.status || 'this'} employees. This status is managed by HR workflow.`,
                                      { position: "top-right", autoClose: 4000 }
                                    );
                                    return;
                                  }
                                  setEditingEmployee((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          status: e.target.checked
                                            ? "Active"
                                            : "Inactive",
                                        }
                                      : prev
                                  );
                                }}
                              />
                              <label 
                                className="form-check-label" 
                                htmlFor="editStatusSwitch"
                                style={{
                                  opacity: (
                                    editingEmployee?.status?.toLowerCase() !== "active" &&
                                    editingEmployee?.status?.toLowerCase() !== "inactive"
                                  ) ? 0.6 : 1
                                }}
                              >
                                <span
                                  className={`badge ${
                                    editingEmployee?.status === "Active"
                                      ? "badge-success"
                                      : "badge-danger"
                                  } d-inline-flex align-items-center`}
                                >
                                  <i className="ti ti-point-filled me-1" />
                                  {editingEmployee?.status || "Active"}
                                </span>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-12">
                        <div className="mb-3">
                          <label className="form-label">
                            About <span className="text-danger"> *</span>
                          </label>
                          <textarea
                            className="form-control"
                            rows={3}
                            value={editingEmployee?.about || ""}
                            onChange={(e) =>
                              setEditingEmployee((prev) =>
                                prev
                                  ? { ...prev, about: e.target.value }
                                  : prev,
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-outline-light border me-2"
                      data-bs-dismiss="modal"
                      onClick={() => setTimeout(() => closeModal(), 100)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      data-bs-dismiss="modal"
                      className="btn btn-primary"
                      onClick={handleUpdateSubmit}
                    >
                      Save
                    </button>
                  </div>
                </div>
                <div
                  className="tab-pane fade"
                  id="address2"
                  role="tabpanel"
                  aria-labelledby="address-tab2"
                  tabIndex={0}
                >
                  <div className="modal-body">
                    <div className="card bg-light-500 shadow-none">
                      <div className="card-body d-flex align-items-center justify-content-between flex-wrap row-gap-3">
                        <h6>Enable Options</h6>
                        <div className="d-flex align-items-center justify-content-end">
                          {/* Enable all Modules toggle */}
                          <div className="form-check form-switch me-2">
                            <input
                              id="enableAllModules"
                              className="form-check-input me-2"
                              type="checkbox"
                              role="switch"
                              checked={Object.values(
                                permissions.enabledModules,
                              ).every(Boolean)} // all enabled
                              onChange={() => toggleAllModules(true)} // implement this to toggle all modules
                            />
                            <label
                              className="form-check-label mt-0"
                              htmlFor="enableAllModules"
                            >
                              Enable all Modules
                            </label>
                          </div>

                          {/* Select All - for all permissions across all modules (optional) */}
                          <div className="form-check d-flex align-items-center">
                            <input
                              id="selectAllPermissions"
                              className="form-check-input"
                              type="checkbox"
                              checked={allPermissionsSelected()} // implement function to check if all permissions are enabled
                              onChange={() => toggleGlobalSelectAll(true)} // toggle all permissions on/off
                            />
                            <label
                              className="form-check-label mt-0"
                              htmlFor="selectAllPermissions"
                            >
                              Select All
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="table-responsive border rounded">
                      <table className="table">
                        <tbody>
                          {MODULES.map((module) => (
                            <tr key={module}>
                              <td>
                                <div className="form-check form-switch me-2">
                                  <input
                                    id={`module-${module}`}
                                    className="form-check-input me-2"
                                    type="checkbox"
                                    role="switch"
                                    checked={permissions.enabledModules[module]}
                                    onChange={() => toggleModule(module)}
                                  />
                                  <label
                                    className="form-check-label mt-0"
                                    htmlFor={`module-${module}`}
                                  >
                                    {module.charAt(0).toUpperCase() +
                                      module.slice(1)}
                                  </label>
                                </div>
                              </td>

                              {ACTIONS.map((action) => (
                                <td key={action} className="align-middle">
                                  <div className="form-check d-flex align-items-center justify-content-center">
                                    <input
                                      id={`perm-${module}-${action}`}
                                      className="form-check-input"
                                      type="checkbox"
                                      checked={
                                        permissions.permissions[module][action]
                                      }
                                      onChange={(e) =>
                                        handlePermissionChange(
                                          module,
                                          action,
                                          e.target.checked,
                                        )
                                      }
                                      disabled={
                                        !permissions.enabledModules[module]
                                      }
                                    />
                                    <label
                                      className="form-check-label mt-0 ms-1"
                                      htmlFor={`perm-${module}-${action}`}
                                    >
                                      {action.charAt(0).toUpperCase() +
                                        action.slice(1)}
                                    </label>
                                  </div>
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-outline-light border me-2"
                      data-bs-dismiss="modal"
                      onClick={() => setTimeout(() => closeModal(), 100)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={(e) => {
                        handlePermissionUpdateSubmit(e);
                        // Close modal after submission
                        if (editEmployeeModalRef.current) {
                          editEmployeeModalRef.current.click();
                          setTimeout(() => closeModal(), 100);
                        }
                      }}
                    >
                      Save{" "}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Edit Employee */}
      {/* Add Employee Success */}
      <div className="modal fade" id="success_modal" role="dialog">
        <div className="modal-dialog modal-dialog-centered modal-sm">
          <div className="modal-content">
            <div className="modal-body">
              <div className="text-center p-3">
                <span className="avatar avatar-lg avatar-rounded bg-success mb-3">
                  <i className="ti ti-check fs-24" />
                </span>
                <h5 className="mb-2">Employee Added Successfully</h5>
                <p className="mb-3">
                  {formData.firstName} has been added with Employee ID :
                  <span className="text-primary">#{formData.employeeId}</span>
                </p>
                <div>
                  <div className="row g-2">
                    <div className="col-6">
                      <Link
                        to={all_routes.employeeList}
                        className="btn btn-dark w-100"
                        data-bs-dismiss="modal"
                        onClick={() => {
                          handleResetFormData();
                          setTimeout(() => closeModal(), 100);
                        }}
                      >
                        Back to List
                      </Link>
                    </div>
                    <div className="col-6">
                      <Link
                        to={all_routes.employeedetails}
                        className="btn btn-primary w-100"
                        onClick={handleResetFormData}
                      >
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
      {/* /Add Client Success */}

      {/* Employee Added Success Modal */}
      <div className="modal fade" id="employee_success_modal">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-body text-center">
              <span className="avatar avatar-xl bg-success text-white mb-3">
                <i className="ti ti-circle-check fs-36" />
              </span>
              <h4 className="mb-1">Employee Added Successfully!</h4>
              <p className="mb-3">
                {newlyAddedEmployee
                  ? `${newlyAddedEmployee.firstName || ""} ${newlyAddedEmployee.lastName || ""} has been added to the system.`
                  : "The employee has been added successfully."}
              </p>
              <div className="d-flex justify-content-center gap-2">
                <button
                  className="btn btn-light"
                  data-bs-dismiss="modal"
                  onClick={() => {
                    setNewlyAddedEmployee(null);
                    setTimeout(() => closeModal(), 100);
                  }}
                >
                  <i className="ti ti-list me-1" />
                  Back to List
                </button>
                <button
                  className="btn btn-primary"
                  data-bs-dismiss="modal"
                  onClick={() => {
                    if (newlyAddedEmployee && newlyAddedEmployee._id) {
                      navigate(
                        `${all_routes.employeedetails}/${newlyAddedEmployee._id}`,
                      );
                    }
                    setNewlyAddedEmployee(null);
                    setTimeout(() => closeModal(), 100);
                  }}
                >
                  <i className="ti ti-eye me-1" />
                  View Details
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Hidden button to trigger success modal */}
      <button
        ref={successModalRef}
        data-bs-toggle="modal"
        data-bs-target="#employee_success_modal"
        style={{ display: "none" }}
      />

      <div className="modal fade" id="delete_modal">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-body text-center">
              <span className="avatar avatar-xl bg-transparent-danger text-danger mb-3">
                <i className="ti ti-trash-x fs-36" />
              </span>
              <h4 className="mb-1">Confirm Deletion</h4>
              <p className="mb-3">
                {employeeToDelete
                  ? `Are you sure you want to delete employee "${employeeToDelete?.firstName}"? This cannot be undone.`
                  : "You want to delete all the marked items, this can't be undone once you delete."}
              </p>
              <div className="d-flex justify-content-center">
                <button
                  className="btn btn-light me-3"
                  data-bs-dismiss="modal"
                  onClick={() => {
                    setEmployeeToDelete(null);
                    setTimeout(() => closeModal(), 100);
                  }}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  data-bs-dismiss="modal"
                  onClick={() => {
                    if (employeeToDelete) {
                      deleteEmployee(employeeToDelete._id);
                    }
                    setEmployeeToDelete(null);
                    setTimeout(() => closeModal(), 100);
                  }}
                  disabled={loading}
                >
                  {loading ? "Deleting..." : "Yes, Delete"}
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
