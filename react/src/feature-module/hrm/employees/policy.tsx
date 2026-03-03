import { DatePicker } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import CollapseHeader from '../../../core/common/collapse-header/collapse-header';
import Table from "../../../core/common/dataTable/index";
import PredefinedDateRanges from '../../../core/common/datePicker';
import Footer from "../../../core/common/footer";
import { useAuth } from '../../../hooks/useAuth';
import { useDepartmentsREST } from "../../../hooks/useDepartmentsREST";
import { useDesignationsREST } from "../../../hooks/useDesignationsREST";
import { Policy as PolicyType, PolicyAssignment, usePoliciesREST } from "../../../hooks/usePoliciesREST";
import { ApiResponse, get } from "../../../services/api";
import { hideModal } from '../../../utils/modalUtils';

interface Department {
  _id: string;
  department: string;
  status: string;
}

interface Designation {
  _id: string;
  designation: string;
  departmentId: string;
  status: string;
}

interface PolicyStats {
  total: number;
  active: number;
  inactive: number;
  applyToAllCount: number;
}

const staticOptions = [
  { value: "Select", label: "Select" },
];

const Policy = () => {
  // Role-based access control
  const { role, employeeId: authEmployeeId } = useAuth();
  const canManagePolicy = ['admin', 'hr', 'superadmin'].includes(role);
  const isEmployeeOrManager = ['employee', 'manager'].includes(role);

  // Local state for UI and form management only
  const [sortedPolicies, setSortedPolicies] = useState<PolicyType[]>([]);
  const [sortOrder, setSortOrder] = useState("");
  const [policyName, setPolicyTypeName] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [description, setDescription] = useState("");
  const [editingPolicyType, setEditingPolicyType] = useState<PolicyType | null>(null);
  const [filters, setFilters] = useState({ department: "", startDate: "", endDate: "" });
  const [policyToDelete, setPolicyTypeToDelete] = useState<PolicyType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState(staticOptions[0].value);
  const [selectedFilterDepartment, setSelectedFilterDepartment] = useState<string>("");

  // PolicyType Assignment State - Hierarchical toggle-based structure
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);  // Array of department IDs where toggle is ON
  const [selectedDesignations, setSelectedDesignations] = useState<{ [departmentId: string]: string[] }>({});  // Map: deptId -> designationIds[]
  const [applyToAll, setApplyToAll] = useState<boolean>(false);
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());  // Track which departments are expanded

  // State for viewing policy details
  const [viewingPolicyType, setViewingPolicyType] = useState<PolicyType | null>(null);

  // Validation error states for Add PolicyType modal
  const [policyNameError, setPolicyTypeNameError] = useState<string | null>(null);
  const [effectiveDateError, setEffectiveDateError] = useState<string | null>(null);
  const [applyToError, setApplyToError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);

  // Validation error states for Edit PolicyType modal
  const [editPolicyTypeNameError, setEditPolicyTypeNameError] = useState<string | null>(null);
  const [editEffectiveDateError, setEditEffectiveDateError] = useState<string | null>(null);
  const [editApplyToError, setEditApplyToError] = useState<string | null>(null);
  const [editDescriptionError, setEditDescriptionError] = useState<string | null>(null);

  const socket = null; // REST API - no longer using socket

  // REST API hooks
  const {
    policies,
    stats,
    loading: policyLoading,
    error: policyError,
    fetchPolicies,
    fetchPolicyStats,
    createPolicy,
    updatePolicy,
    deletePolicy
  } = usePoliciesREST();

  const {
    departments,
    loading: departmentLoading,
    fetchDepartments
  } = useDepartmentsREST();

  const {
    designations,
    loading: designationsLoading,
    fetchDesignations
  } = useDesignationsREST();

  // State for current employee's department/designation (for policy filtering)
  const [currentEmployee, setCurrentEmployee] = useState<{ departmentId?: string; designationId?: string } | null>(null);

  // Fetch current employee details for policy filtering (direct API call to avoid auto-fetch)
  useEffect(() => {
    const loadCurrentEmployee = async () => {
      if (isEmployeeOrManager && authEmployeeId) {
        try {
          const response: ApiResponse<any> = await get(`/employees/${authEmployeeId}`);
          if (response.success && response.data) {
            setCurrentEmployee({
              departmentId: response.data.departmentId,
              designationId: response.data.designationId
            });
          }
        } catch (err) {
          console.error('Failed to fetch current employee:', err);
        }
      }
    };
    loadCurrentEmployee();
  }, [isEmployeeOrManager, authEmployeeId]);

  // Filter policies for employees/managers - only show policies assigned to them
  const filteredPolicies = useMemo(() => {
    if (!isEmployeeOrManager || !currentEmployee) {
      // Admins/HR see all policies
      return policies;
    }

    return policies.filter((policy) => {
      // Include if policy applies to all
      if (policy.applyToAll) return true;

      // Check if policy is assigned to current employee's department/designation
      if (policy.assignTo && policy.assignTo.length > 0) {
        return policy.assignTo.some((assignment) => {
          if (assignment.departmentId !== currentEmployee.departmentId) {
            return false;
          }
          // If no specific designations, policy applies to whole department
          if (!assignment.designationIds || assignment.designationIds.length === 0) {
            return true;
          }
          // Check if employee's designation is in the list
          return currentEmployee.designationId &&
            assignment.designationIds.includes(currentEmployee.designationId);
        });
      }

      return false;
    });
  }, [policies, isEmployeeOrManager, currentEmployee]);

  // Modal container helper (for DatePicker positioning)
  const getModalContainer = (): HTMLElement => {
    const modalElement = document.getElementById("modal-datepicker");
    return modalElement ? modalElement : document.body;
  };

  const DATE_FORMAT = "DD-MM-YYYY";
  const DATE_REGEX = /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-(\d{4})$/;

  const isValidDateString = (value?: string | null) =>
    !!value && DATE_REGEX.test(value);

  const toDayjsDate = (value?: string | null) => {
    if (!value) return null;
    if (isValidDateString(value)) {
      const parsed = dayjs(value, DATE_FORMAT);
      return parsed.isValid() ? parsed : null;
    }
    const fallback = dayjs(value);
    return fallback.isValid() ? fallback : null;
  };

  // Fetch initial data on mount
  useEffect(() => {
    const fetchData = async () => {
      // Fetch policies
      await fetchPolicies(filters);
      // Fetch policy stats
      await fetchPolicyStats();
      // Fetch departments
      await fetchDepartments();
      // Fetch designations
      await fetchDesignations();
    };

    fetchData();
  }, []);

  // constants
  if (error) console.error("Page error:", error);

  const dynamicOptions = Array.isArray(departments)
    ? departments.map(dept => ({
      value: dept._id,
      label: dept.department,
    }))
    : [];

  const options = [...staticOptions, ...dynamicOptions];

  // Add this helper function to get department name by ID
  const getDepartmentName = (departmentId: string): string => {
    const dept = departments.find(d => d._id === departmentId);
    return dept ? dept.department : "Unknown";
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "policyName",
      render: (text: String, record: PolicyType) => (
        <h6
          className="fw-medium fs-14 text-dark"
          style={{ cursor: 'pointer' }}
          onClick={() => setViewingPolicyType(record)}
          data-bs-toggle="modal"
          data-bs-target="#view_policy"
        >
          {text}
        </h6>
      ),
      sorter: (a: any, b: any) => a.Name.length - b.Name.length,
    },
    {
      title: "Assign To",
      dataIndex: "assignTo",
      render: (assignTo: PolicyAssignment[], record: PolicyType) => {
        // Check if policy applies to all employees
        if (record.applyToAll) {
          return (
            <h6 className="fw-normal fs-14 text-success">
              <i className="ti ti-users me-1"></i>
              All Employees
            </h6>
          );
        }
        if (!assignTo || assignTo.length === 0) {
          return <span className="text-muted">Not assigned</span>;
        }

        // Display departments
        const deptDisplay = assignTo.map(a => {
          const deptName = a.departmentName || getDepartmentName(a.departmentId);
          const hasDesignations = a.designationIds && a.designationIds.length > 0;
          return hasDesignations
            ? `${deptName} (${a.designationIds.length} designations)`
            : `${deptName} (All designations)`;
        }).join(", ");

        return (
          <h6 className="fw-normal fs-14 text-dark" title={deptDisplay}>
            {deptDisplay.length > 50 ? `${deptDisplay.substring(0, 50)}...` : deptDisplay}
          </h6>
        );
      },
      sorter: (a: any, b: any) => {
        // Sort "All Employees" first
        if (a.applyToAll && !b.applyToAll) return -1;
        if (!a.applyToAll && b.applyToAll) return 1;
        const aName = a.assignTo?.[0]?.departmentName || "";
        const bName = b.assignTo?.[0]?.departmentName || "";
        return aName.localeCompare(bName);
      },
    },
    {
      title: "Description",
      dataIndex: "policyDescription",
      sorter: (a: any, b: any) => a.Description.length - b.Description.length,
      render: (text: string, record: any) => (
        <h6
          className="fw-normal fs-14 text-muted mb-0"
          style={{
            maxWidth: '300px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            cursor: text && text.length > 50 ? 'help' : 'default'
          }}
          title={text || ''}
        >
          {text || 'No description'}
        </h6>
      ),
    },
    {
      title: "In-effect Date",
      dataIndex: "effectiveDate",
      sorter: (a: any, b: any) => {
        const aDate = toDayjsDate(a.effectiveDate);
        const bDate = toDayjsDate(b.effectiveDate);
        return (aDate?.valueOf() || 0) - (bDate?.valueOf() || 0);
      },
      render: (date: string) => {
        const parsed = toDayjsDate(date);
        return parsed ? parsed.format("DD-MM-YYYY") : "-";
      },
    },
    {
      title: "",
      dataIndex: "actions",
      render: (_test: any, policy: PolicyType) => (
        <div className="action-icon d-inline-flex">
          <Link
            to="#"
            className="me-2"
            data-bs-toggle="modal"
            data-inert={true}
            data-bs-target="#view_policy"
            onClick={() => setViewingPolicyType(policy)}
          >
            <i className="ti ti-eye" />
          </Link>
          {canManagePolicy && (
            <Link
              to="#"
              className="me-2"
              data-bs-toggle="modal"
              data-inert={true}
              data-bs-target="#edit_policy"
              onClick={() => {
                setEditingPolicyType(policy);
                setApplyToAll(policy.applyToAll || false);

                // Initialize from policy assignTo with hierarchical logic
                if (!policy.applyToAll && policy.assignTo && policy.assignTo.length > 0) {
                  const toggledDepts: string[] = [];
                  const desigMap: { [key: string]: string[] } = {};
                  const expandedSet = new Set<string>();

                  policy.assignTo.forEach(a => {
                    // Empty designationIds = department toggle is ON (all designations)
                    if (!a.designationIds || a.designationIds.length === 0) {
                      toggledDepts.push(a.departmentId);
                    }
                    // Non-empty designationIds = specific designations selected
                    else {
                      desigMap[a.departmentId] = a.designationIds;
                      expandedSet.add(a.departmentId);  // Auto-expand if has specific designations
                    }
                  });

                  setSelectedDepartments(toggledDepts);
                  setSelectedDesignations(desigMap);
                  setExpandedDepartments(expandedSet);
                } else {
                  setSelectedDepartments([]);
                  setSelectedDesignations({});
                  setExpandedDepartments(new Set());
                }
              }}
            >
              <i className="ti ti-edit" />
            </Link>
          )}
          {canManagePolicy && (
            <Link
              to="#"
              className="me-2"
              data-bs-toggle="modal"
              data-inert={true}
              data-bs-target="#delete_modal"
              onClick={() => { setPolicyTypeToDelete(policy); }}
            >
              <i className="ti ti-trash" />
            </Link>
          )}
        </div>
      ),
    }
  ]

  const policiesWithKey = filteredPolicies.map((policy, index) => ({
    ...policy,
    key: policy._id || index.toString(),
  }));


  // helper functions

  // Helper function to parse backend errors and map them to field-specific errors
  const parseBackendError = (
    errorMessage: string,
    isEditMode: boolean = false
  ) => {
    // Clear all errors first
    if (isEditMode) {
      setEditPolicyTypeNameError(null);
      setEditEffectiveDateError(null);
      setEditApplyToError(null);
      setEditDescriptionError(null);
    } else {
      setPolicyTypeNameError(null);
      setEffectiveDateError(null);
      setApplyToError(null);
      setDescriptionError(null);
    }

    // Convert error message to lowercase for easier matching
    const error = errorMessage.toLowerCase();

    // Map backend errors to specific fields
    if (error.includes("policy name") || error.includes("policyname")) {
      if (isEditMode) {
        setEditPolicyTypeNameError(errorMessage);
      } else {
        setPolicyTypeNameError(errorMessage);
      }
    } else if (error.includes("effective date") || error.includes("effectivedate") ||
      error.includes("in-effect date") || error.includes("date") ||
      error.includes("future")) {
      if (isEditMode) {
        setEditEffectiveDateError(errorMessage);
      } else {
        setEffectiveDateError(errorMessage);
      }
    } else if (error.includes("department") || error.includes("designation") ||
      error.includes("apply") || error.includes("assign")) {
      if (isEditMode) {
        setEditApplyToError(errorMessage);
      } else {
        setApplyToError(errorMessage);
      }
    } else if (error.includes("description") || error.includes("policydescription")) {
      if (isEditMode) {
        setEditDescriptionError(errorMessage);
      } else {
        setDescriptionError(errorMessage);
      }
    } else {
      // If we can't map to a specific field, show as general error
      setError(errorMessage);
    }
  };

  // Helper function to validate future date
  const isFutureDate = (dateString: string): boolean => {
    if (!dateString) return false;
    if (!isValidDateString(dateString)) return false;
    const selectedDate = toDayjsDate(dateString);
    if (!selectedDate) return false;
    const today = dayjs().startOf("day");
    return selectedDate.startOf("day").isSame(today) || selectedDate.isAfter(today);
  };

  // Reset Add PolicyType form fields and errors
  const resetAddPolicyTypeForm = () => {
    setPolicyTypeName("");
    setEffectiveDate("");
    setDescription("");
    setSelectedDepartment(staticOptions[0].value);
    setSelectedDepartments([]);
    setSelectedDesignations({});
    setApplyToAll(false);
    setExpandedDepartments(new Set());
    setError(null);
    setPolicyTypeNameError(null);
    setEffectiveDateError(null);
    setApplyToError(null);
    setDescriptionError(null);
  };

  // Reset Edit PolicyType validation errors
  const resetEditPolicyTypeForm = () => {
    setError(null);
    setEditPolicyTypeNameError(null);
    setEditEffectiveDateError(null);
    setEditApplyToError(null);
    setEditDescriptionError(null);
  };

  // Helper: Toggle department expand/collapse
  const toggleDepartmentExpand = (deptId: string) => {
    setExpandedDepartments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(deptId)) {
        newSet.delete(deptId);
      } else {
        newSet.add(deptId);
      }
      return newSet;
    });
  };

  // Helper: Handle department toggle change with auto-sync
  const handleDepartmentToggle = (deptId: string, isChecked: boolean) => {
    setSelectedDepartments(prev => {
      let newDepts: string[];
      if (isChecked) {
        newDepts = [...prev, deptId];
      } else {
        newDepts = prev.filter(id => id !== deptId);
      }

      const activeDepts = departments.filter(d => d.status === 'Active');

      // Auto-sync: If all departments are now toggled ON, turn on "Apply to All"
      if (newDepts.length === activeDepts.length && activeDepts.length > 0) {
        setApplyToAll(true);
      }
      // Auto-sync: If any department is turned OFF while "Apply to All" is ON, turn OFF "Apply to All"
      else if (!isChecked && applyToAll) {
        setApplyToAll(false);
      }

      return newDepts;
    });

    // Clear designation selections for this department when toggling ON
    if (isChecked) {
      setSelectedDesignations(prev => {
        const updated = { ...prev };
        delete updated[deptId];
        return updated;
      });
    }

    // Clear apply to error if any
    if (applyToError) setApplyToError(null);
    if (editApplyToError) setEditApplyToError(null);
  };

  // Helper: Handle designation selection with auto-sync
  const handleDesignationToggle = (deptId: string, desigId: string, isChecked: boolean) => {
    setSelectedDesignations(prev => {
      const updated = { ...prev };
      const currentDesigs = updated[deptId] || [];

      if (isChecked) {
        updated[deptId] = [...currentDesigs, desigId];
      } else {
        updated[deptId] = currentDesigs.filter(id => id !== desigId);
        // Clean up empty arrays
        if (updated[deptId].length === 0) {
          delete updated[deptId];
        }
      }

      // Auto-sync: If ALL designations in this department are now selected, toggle department ON
      const allDeptDesignations = designations.filter(
        d => d.departmentId === deptId && d.status?.toLowerCase() === 'active'
      );
      if (updated[deptId] && updated[deptId].length === allDeptDesignations.length && allDeptDesignations.length > 0) {
        setSelectedDepartments(prevDepts => {
          if (!prevDepts.includes(deptId)) {
            const newDepts = [...prevDepts, deptId];

            // Check if all departments are now toggled
            const activeDepts = departments.filter(d => d.status === 'Active');
            if (newDepts.length === activeDepts.length && activeDepts.length > 0) {
              setApplyToAll(true);
            }

            return newDepts;
          }
          return prevDepts;
        });
        // Clear designation selections since department is now fully selected
        const finalUpdated = { ...updated };
        delete finalUpdated[deptId];
        return finalUpdated;
      }

      return updated;
    });

    // Clear apply to error if any
    if (applyToError) setApplyToError(null);
    if (editApplyToError) setEditApplyToError(null);
  };

  // Helper: Handle "Apply to All Employees" toggle
  const handleApplyToAllToggle = (isChecked: boolean) => {
    setApplyToAll(isChecked);

    // Always clear department and designation selections when toggling
    // This ensures clean state whether turning on or off
    setSelectedDepartments([]);
    setSelectedDesignations({});

    // Clear apply to error if any
    if (applyToError) setApplyToError(null);
    if (editApplyToError) setEditApplyToError(null);
  };

  const handleSubmit = async () => {
    try {
      // Clear all errors at the start
      setPolicyTypeNameError(null);
      setEffectiveDateError(null);
      setApplyToError(null);
      setDescriptionError(null);
      setError(null);

      // Validate all fields
      let hasError = false;

      if (!policyName.trim()) {
        setPolicyTypeNameError("PolicyType Name is required");
        hasError = true;
      }

      if (!effectiveDate) {
        setEffectiveDateError("Effective Date is required");
        hasError = true;
      } else if (!isValidDateString(effectiveDate)) {
        setEffectiveDateError("Date must be in DD-MM-YYYY format");
        hasError = true;
      } else if (!isFutureDate(effectiveDate)) {
        setEffectiveDateError("Effective Date must be today or later");
        hasError = true;
      }

      if (!applyToAll) {
        // Check if at least one department toggle is ON OR at least one designation is selected
        const hasDepartmentToggled = selectedDepartments.length > 0;
        const hasDesignationSelected = Object.values(selectedDesignations).some(desigs => desigs.length > 0);

        if (!hasDepartmentToggled && !hasDesignationSelected) {
          setApplyToError("Please select at least one department or designation, or enable 'Apply to All Employees'");
          hasError = true;
        }
      }

      if (!description || !description.trim()) {
        setDescriptionError("Description is required");
        hasError = true;
      }

      // If any validation failed, stop here
      if (hasError) {
        return;
      }

      setLoading(true);

      // Build assignTo array with hierarchical logic
      const assignTo: PolicyAssignment[] = [];

      // Get all active departments
      const activeDepartments = departments.filter(d => d.status === 'Active');

      activeDepartments.forEach(dept => {
        const deptId = dept._id;
        const isDeptToggled = selectedDepartments.includes(deptId);
        const deptDesignations = selectedDesignations[deptId] || [];

        // If department toggle is ON, include with empty designationIds (= all designations)
        if (isDeptToggled) {
          assignTo.push({
            departmentId: deptId,
            designationIds: []  // Empty = all current and future designations
          });
        }
        // If department toggle is OFF but some designations are selected
        else if (deptDesignations.length > 0) {
          assignTo.push({
            departmentId: deptId,
            designationIds: deptDesignations  // Only selected designations
          });
        }
      });

      const payload = {
        policyName,
        applyToAll,
        assignTo: applyToAll ? [] : assignTo,  // Empty when applyToAll is true
        policyDescription: description,
        effectiveDate,
      };

      // REST API call
      const success = await createPolicy(payload);
      if (success) {
        // Refresh policies list
        await fetchPolicies(filters);
        // Close modal after successful response
        hideModal('add_policy');
        // Reset form after successful submission
        resetAddPolicyTypeForm();
      }
      setLoading(false);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("An unexpected error occurred");
      }
      setLoading(false);
    }
  };

  console.log("selected department", selectedDepartment);

  const applyFilters = async (updatedFields: {
    department?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    try {
      setFilters(prevFilters => {
        const newFilters = { ...prevFilters, ...updatedFields };
        // REST API call
        fetchPolicies(newFilters);
        return newFilters;
      });
    } catch (error) {
      console.error("Error applying filters:", error);
    }
  };

  const onSelectDepartment = (dept: string) => {
    if (dept === "Select") {
      // Load default data - clear department filter
      setSelectedFilterDepartment("");
      applyFilters({ department: "" });
    } else {
      // Load data for selected department
      setSelectedFilterDepartment(dept);
      applyFilters({ department: dept });
    }
  };

  const handleDateRangeFilter = (ranges: { start?: string; end?: string } = { start: "", end: "" }) => {
    try {
      if (ranges.start && ranges.end) {
        ;
        applyFilters({ startDate: ranges.start, endDate: ranges.end });
      } else {
        applyFilters({ startDate: "", endDate: "" });
      }
    } catch (error) {
      console.error("Error handling time range selection:", error);
    }
  };

  const handleSort = (order: string) => {
    setSortOrder(order);
    if (!order) {
      setSortedPolicies(policies);
      return;
    }
    const sortedData = [...policies].sort((a, b) => {
      const nameA = a.policyName.toLowerCase();
      const nameB = b.policyName.toLowerCase();

      if (order === "ascending") {
        return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
      }
      if (order === "descending") {
        return nameA > nameB ? -1 : nameA < nameB ? 1 : 0;
      }
      return 0;
    });
    setSortedPolicies(sortedData);
  };

  const handleUpdateSubmit = async (editingPolicyType: PolicyType) => {
    try {
      // Clear all errors at the start
      setEditPolicyTypeNameError(null);
      setEditEffectiveDateError(null);
      setEditApplyToError(null);
      setEditDescriptionError(null);
      setError(null);

      const { _id, policyName, effectiveDate, policyDescription } = editingPolicyType;

      if (!_id) {
        setError("Id not found");
        return;
      }

      // Validate all fields
      let hasError = false;

      if (!policyName || !policyName.trim()) {
        setEditPolicyTypeNameError("PolicyType Name is required");
        hasError = true;
      }

      if (!effectiveDate) {
        setEditEffectiveDateError("Effective Date is required");
        hasError = true;
      } else if (!isValidDateString(effectiveDate)) {
        setEditEffectiveDateError("Date must be in DD-MM-YYYY format");
        hasError = true;
      } else if (!isFutureDate(effectiveDate)) {
        setEditEffectiveDateError("Effective Date must be today or later");
        hasError = true;
      }

      if (!applyToAll) {
        // Check if at least one department toggle is ON OR at least one designation is selected
        const hasDepartmentToggled = selectedDepartments.length > 0;
        const hasDesignationSelected = Object.values(selectedDesignations).some(desigs => desigs.length > 0);

        if (!hasDepartmentToggled && !hasDesignationSelected) {
          setEditApplyToError("Please select at least one department or designation, or enable 'Apply to All Employees'");
          hasError = true;
        }
      }

      if (!policyDescription || !policyDescription.trim()) {
        setEditDescriptionError("Description is required");
        hasError = true;
      }

      // If any validation failed, stop here
      if (hasError) {
        return;
      }

      setLoading(true);

      // Build assignTo array with hierarchical logic
      const assignTo: PolicyAssignment[] = [];

      // Get all active departments
      const activeDepartments = departments.filter(d => d.status === 'Active');

      activeDepartments.forEach(dept => {
        const deptId = dept._id;
        const isDeptToggled = selectedDepartments.includes(deptId);
        const deptDesignations = selectedDesignations[deptId] || [];

        // If department toggle is ON, include with empty designationIds (= all designations)
        if (isDeptToggled) {
          assignTo.push({
            departmentId: deptId,
            designationIds: []  // Empty = all current and future designations
          });
        }
        // If department toggle is OFF but some designations are selected
        else if (deptDesignations.length > 0) {
          assignTo.push({
            departmentId: deptId,
            designationIds: deptDesignations  // Only selected designations
          });
        }
      });

      const payload = {
        policyName: policyName.trim(),
        policyDescription: policyDescription.trim(),
        applyToAll,
        assignTo: applyToAll ? [] : assignTo,  // Empty when applyToAll is true
        effectiveDate,
      };

      // REST API call
      const success = await updatePolicy(_id, payload);
      if (success) {
        // Refresh policies list
        await fetchPolicies(filters);
        // Close modal after successful response
        hideModal('edit_policy');
        // Reset validation errors after successful submission
        resetEditPolicyTypeForm();
      }
      setLoading(false);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("An unexpected error occurred");
      }
      setLoading(false);
    }
  };

  const deletePolicyById = async (policyId: string) => {
    try {
      setLoading(true);
      setError(null);

      if (!policyId) {
        setError("PolicyType ID is required");
        setLoading(false);
        return;
      }

      // REST API call
      const success = await deletePolicy(policyId);
      if (success) {
        // Refresh policies list
        await fetchPolicies(filters);
      }
    } catch (error) {
      console.error("Delete error:", error);
      setError("Failed to delete policy");
    } finally {
      setLoading(false);
    }
  };

  if (policyLoading || departmentLoading) {
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

  if (policyError) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="alert alert-danger" role="alert">
            <h4 className="alert-heading">Error!</h4>
            <p>{policyError}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* CSS for smooth animations */}
      <style>{`
        .designation-collapse {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease-in-out, opacity 0.3s ease-in-out;
          opacity: 0;
        }

        .designation-collapse.show {
          max-height: 1000px;
          opacity: 1;
        }

        .department-list-container {
          transition: opacity 0.3s ease-in-out;
        }

        .chevron-icon {
          transition: transform 0.2s ease-in-out;
        }

        .chevron-icon.expanded {
          transform: rotate(90deg);
        }
      `}</style>

      {/* Page Wrapper */}
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Policies</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to="index.html">
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">HR</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Policies
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
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
              {canManagePolicy && (
                <div className="mb-2">
                  <Link
                    to="#"
                    data-bs-toggle="modal"
                    data-inert={true}
                    data-bs-target="#add_policy"
                    className="btn btn-primary d-flex align-items-center"
                    onClick={resetAddPolicyTypeForm}
                  >
                    <i className="ti ti-circle-plus me-2" />
                    Add PolicyType
                  </Link>
                </div>
              )}
              <div className="head-icons ms-2">
                <CollapseHeader />
              </div>
            </div>
          </div>
          {/* /Breadcrumb */}

          {/* PolicyType Stats Cards - Only visible to admin/hr/superadmin */}
          {canManagePolicy && (
            <div className="row">
              <div className="col-xl-3 col-sm-6 col-12 d-flex">
                <div className="card bg-comman w-100">
                  <div className="card-body">
                    <div className="d-flex align-items-center justify-content-between">
                      <div className="bg-primary-light rounded-circle p-2">
                        <i className="ti ti-file-text text-primary fs-20" />
                      </div>
                      <h5 className="fs-22 fw-semibold text-truncate mb-0">
                        {stats?.total || 0}
                      </h5>
                    </div>
                    <div className="d-flex align-items-center justify-content-between mt-3">
                      <span className="fs-14 fw-medium text-gray">Total Policies</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-xl-3 col-sm-6 col-12 d-flex">
                <div className="card bg-comman w-100">
                  <div className="card-body">
                    <div className="d-flex align-items-center justify-content-between">
                      <div className="bg-success-light rounded-circle p-2">
                        <i className="ti ti-circle-check text-success fs-20" />
                      </div>
                      <h5 className="fs-22 fw-semibold text-truncate mb-0">
                        {stats?.active || 0}
                      </h5>
                    </div>
                    <div className="d-flex align-items-center justify-content-between mt-3">
                      <span className="fs-14 fw-medium text-gray">Active</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-xl-3 col-sm-6 col-12 d-flex">
                <div className="card bg-comman w-100">
                  <div className="card-body">
                    <div className="d-flex align-items-center justify-content-between">
                      <div className="bg-danger-light rounded-circle p-2">
                        <i className="ti ti-circle-x text-danger fs-20" />
                      </div>
                      <h5 className="fs-22 fw-semibold text-truncate mb-0">
                        {stats?.inactive || 0}
                      </h5>
                    </div>
                    <div className="d-flex align-items-center justify-content-between mt-3">
                      <span className="fs-14 fw-medium text-gray">Inactive</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-xl-3 col-sm-6 col-12 d-flex">
                <div className="card bg-comman w-100">
                  <div className="card-body">
                    <div className="d-flex align-items-center justify-content-between">
                      <div className="bg-info-light rounded-circle p-2">
                        <i className="ti ti-users text-info fs-20" />
                      </div>
                      <h5 className="fs-22 fw-semibold text-truncate mb-0">
                        {stats?.applyToAllCount || 0}
                      </h5>
                    </div>
                    <div className="d-flex align-items-center justify-content-between mt-3">
                      <span className="fs-14 fw-medium text-gray">Apply To All</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* /PolicyType Stats Cards */}

          {/* PolicyType list */}
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
              <h5>Policies List</h5>
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
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    Department
                    {selectedFilterDepartment && selectedFilterDepartment !== "Select"
                      ? `: ${options.find(opt => opt.value === selectedFilterDepartment)?.label || "None"
                      }`
                      : ": None"}
                  </Link>
                  <ul className="dropdown-menu dropdown-menu-end p-3">
                    {options.map((dept) => (
                      <li key={dept.value}>
                        <button
                          type="button"
                          className="dropdown-item rounded-1"
                          onClick={() => onSelectDepartment(dept.value)}
                        >
                          {dept.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="dropdown">
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    Sort By{sortOrder ? `: ${sortOrder.charAt(0).toUpperCase() + sortOrder.slice(1)}` : ": None"}
                  </Link>
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
              </div>
            </div>
            <div className="card-body p-0">
              <Table dataSource={policiesWithKey} columns={columns} Selection={true} />
            </div>
          </div>
          {/* /PolicyTypelist list */}
        </div>
        <Footer />
      </div>
      {/* /Page Wrapper */}
      {/* Add PolicyType */}
      <div className="modal fade" id="add_policy">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Add PolicyType</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={resetAddPolicyTypeForm}
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form>
              <div className="modal-body pb-0">
                <div className="row">
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        PolicyType Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${policyNameError ? 'is-invalid' : ''}`}
                        value={policyName}
                        onChange={(e) => {
                          setPolicyTypeName(e.target.value);
                          // Clear error when user starts typing
                          if (policyNameError) {
                            setPolicyTypeNameError(null);
                          }
                        }}
                      />
                      {policyNameError && (
                        <div className="invalid-feedback d-block">
                          {policyNameError}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        In-effect Date <span className="text-danger">*</span>
                      </label>
                      <div className="input-icon-end position-relative">
                        <DatePicker
                          className={`form-control datetimepicker ${effectiveDateError ? 'is-invalid' : ''}`}
                          format={{
                            format: "DD-MM-YYYY",
                            type: "mask",
                          }}
                          getPopupContainer={getModalContainer}
                          placeholder="DD-MM-YYYY"
                          value={effectiveDate ? toDayjsDate(effectiveDate) : null}
                          onChange={(_date, dateString) => {
                            const dateValue = (dateString as string) || "";
                            setEffectiveDate(dateValue);
                            // Clear error when user selects a date
                            if (effectiveDateError) {
                              setEffectiveDateError(null);
                            }
                          }}
                        />
                        <span className="input-icon-addon">
                          <i className="ti ti-calendar text-gray-7" />
                        </span>
                      </div>
                      {effectiveDateError && (
                        <div className="invalid-feedback d-block">
                          {effectiveDateError}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Apply To <span className="text-danger">*</span>
                      </label>

                      {/* Apply to All Employees toggle */}
                      <div className="mb-3">
                        <div className="form-check form-switch">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            role="switch"
                            id="applyToAllAdd"
                            checked={applyToAll}
                            onChange={(e) => handleApplyToAllToggle(e.target.checked)}
                          />
                          <label className="form-check-label" htmlFor="applyToAllAdd">
                            <i className="ti ti-users me-2"></i>
                            Apply to All Employees (current and future)
                          </label>
                        </div>
                      </div>

                      {/* Hierarchical Department & Designation List */}
                      {!applyToAll && (
                        <div className="border rounded bg-white department-list-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                          <div className="p-3 border-bottom bg-light">
                            <small className="text-muted d-block mb-0">
                              <i className="ti ti-info-circle me-1"></i>
                              Toggle departments to include all designations, or expand to select specific ones
                            </small>
                          </div>

                          <div className="p-2">
                            {departments.filter(d => d.status === 'Active').map(dept => {
                              const deptDesignations = designations.filter(
                                d => d.departmentId === dept._id && d.status?.toLowerCase() === 'active'
                              );
                              const isDeptToggled = selectedDepartments.includes(dept._id);
                              const isExpanded = expandedDepartments.has(dept._id);
                              const selectedDesigs = selectedDesignations[dept._id] || [];

                              return (
                                <div key={dept._id} className="mb-2 border rounded">
                                  {/* Department Row */}
                                  <div className="d-flex align-items-center justify-content-between p-2 bg-light">
                                    {/* Department Toggle */}
                                    <div className="form-check form-switch mb-0">
                                      <input
                                        className="form-check-input"
                                        type="checkbox"
                                        role="switch"
                                        id={`dept-${dept._id}`}
                                        checked={isDeptToggled}
                                        onChange={(e) => handleDepartmentToggle(dept._id, e.target.checked)}
                                      />
                                      <label className="form-check-label" htmlFor={`dept-${dept._id}`}>
                                        <i className="ti ti-building me-2"></i>
                                        {dept.department}
                                        {isDeptToggled && (
                                          <span className="badge bg-success ms-2 badge-xs">
                                            All Designations
                                          </span>
                                        )}
                                        {!isDeptToggled && selectedDesigs.length > 0 && (
                                          <span className="badge bg-primary ms-2 badge-xs">
                                            {selectedDesigs.length} Selected
                                          </span>
                                        )}
                                      </label>
                                    </div>

                                    {/* Expand/Collapse Icon - Always Visible on Right */}
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-link p-0 text-dark"
                                      onClick={() => toggleDepartmentExpand(dept._id)}
                                      style={{ minWidth: '24px' }}
                                    >
                                      <i className={`ti ti-chevron-${isExpanded ? 'down' : 'right'}`}></i>
                                    </button>
                                  </div>

                                  {/* Designation List - Expandable with Animation */}
                                  {deptDesignations.length > 0 && (
                                    <div className={`designation-collapse ${isExpanded ? 'show' : ''}`}>
                                      <div className="p-3 bg-white border-top">
                                        <small className="text-muted d-block mb-2">
                                          {isDeptToggled ? (
                                            <span className="text-success">
                                              <i className="ti ti-check me-1"></i>
                                              Department toggle is ON - all designations included
                                            </span>
                                          ) : (
                                            <>
                                              <i className="ti ti-info-circle me-1"></i>
                                              Select specific designations (or toggle department for all)
                                            </>
                                          )}
                                        </small>
                                        <div className="row">
                                          {deptDesignations.map(desig => (
                                            <div key={desig._id} className="col-md-6 mb-2">
                                              <div className="form-check">
                                                <input
                                                  className="form-check-input"
                                                  type="checkbox"
                                                  id={`desig-${desig._id}`}
                                                  checked={isDeptToggled || selectedDesigs.includes(desig._id)}
                                                  onChange={(e) => {
                                                    if (!isDeptToggled) {
                                                      handleDesignationToggle(dept._id, desig._id, e.target.checked);
                                                    }
                                                  }}
                                                  disabled={isDeptToggled}
                                                />
                                                <label
                                                  className={`form-check-label ${isDeptToggled ? 'text-muted' : ''}`}
                                                  htmlFor={`desig-${desig._id}`}
                                                >
                                                  {desig.designation}
                                                </label>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {deptDesignations.length === 0 && (
                                    <div className={`designation-collapse ${isExpanded ? 'show' : ''}`}>
                                      <div className="p-3 bg-white border-top text-muted small">
                                        <i className="ti ti-alert-circle me-1"></i>
                                        No designations found in this department
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {departments.filter(d => d.status === 'Active').length === 0 && (
                              <div className="text-center text-muted py-4">
                                <i className="ti ti-info-circle me-1"></i>
                                No active departments available
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {applyToError && (
                        <div className="invalid-feedback d-block">
                          {applyToError}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        PolicyType Description <span className="text-danger">*</span>
                      </label>
                      <div className="policy-description-container">
                        <textarea
                          className={`form-control ${descriptionError ? 'is-invalid' : ''}`}
                          rows={4}
                          placeholder="Enter policy details and description here..."
                          value={description}
                          onChange={(e) => {
                            setDescription(e.target.value);
                            // Clear error when user starts typing
                            if (descriptionError) {
                              setDescriptionError(null);
                            }
                          }}
                          maxLength={5000}
                        />
                        {descriptionError && (
                          <div className="invalid-feedback d-block">
                            {descriptionError}
                          </div>
                        )}
                        <div className="d-flex justify-content-between mt-2">
                          <small className="text-muted">
                            {description.length}/5000 characters
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-white border me-2"
                  data-bs-dismiss="modal"
                  onClick={resetAddPolicyTypeForm}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={loading}
                  onClick={handleSubmit}
                >
                  Add PolicyType
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Add PolicyType */}
      {/* Edit  PolicyType */}
      <div className="modal fade" id="edit_policy">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Edit PolicyType</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={resetEditPolicyTypeForm}
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form>
              <div className="modal-body pb-0">
                <div className="row">
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        PolicyType Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${editPolicyTypeNameError ? 'is-invalid' : ''}`}
                        value={editingPolicyType?.policyName || ""}
                        onChange={(e) => {
                          setEditingPolicyType(prev =>
                            prev ? { ...prev, policyName: e.target.value } : prev);
                          // Clear error when user starts typing
                          if (editPolicyTypeNameError) {
                            setEditPolicyTypeNameError(null);
                          }
                        }}
                      />
                      {editPolicyTypeNameError && (
                        <div className="invalid-feedback d-block">
                          {editPolicyTypeNameError}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        In-effect Date <span className="text-danger">*</span>
                      </label>
                      <div className="input-icon-end position-relative">
                        <DatePicker
                          className={`form-control datetimepicker ${editEffectiveDateError ? 'is-invalid' : ''}`}
                          format={{
                            format: "DD-MM-YYYY",
                            type: "mask",
                          }}
                          getPopupContainer={getModalContainer}
                          placeholder="DD-MM-YYYY"
                          value={editingPolicyType?.effectiveDate ? toDayjsDate(editingPolicyType.effectiveDate) : null}
                          onChange={(_date, dateString) => {
                            const dateValue = (dateString as string) || "";
                            setEditingPolicyType(prev =>
                              prev ? { ...prev, effectiveDate: dateValue } : prev);
                            // Clear error when user selects a date
                            if (editEffectiveDateError) {
                              setEditEffectiveDateError(null);
                            }
                          }}
                        />
                        <span className="input-icon-addon">
                          <i className="ti ti-calendar text-gray-7" />
                        </span>
                      </div>
                      {editEffectiveDateError && (
                        <div className="invalid-feedback d-block">
                          {editEffectiveDateError}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Apply To <span className="text-danger">*</span>
                      </label>

                      {/* Apply to All Employees toggle */}
                      <div className="mb-3">
                        <div className="form-check form-switch">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            role="switch"
                            id="applyToAllEdit"
                            checked={applyToAll}
                            onChange={(e) => handleApplyToAllToggle(e.target.checked)}
                          />
                          <label className="form-check-label" htmlFor="applyToAllEdit">
                            <i className="ti ti-users me-2"></i>
                            Apply to All Employees (current and future)
                          </label>
                        </div>
                      </div>

                      {/* Hierarchical Department & Designation List */}
                      {!applyToAll && (
                        <div className="border rounded bg-white" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                          <div className="p-3 border-bottom bg-light">
                            <small className="text-muted d-block mb-0">
                              <i className="ti ti-info-circle me-1"></i>
                              Toggle departments to include all designations, or expand to select specific ones
                            </small>
                          </div>

                          <div className="p-2">
                            {departments.filter(d => d.status === 'Active').map(dept => {
                              const deptDesignations = designations.filter(
                                d => d.departmentId === dept._id && d.status?.toLowerCase() === 'active'
                              );
                              const isDeptToggled = selectedDepartments.includes(dept._id);
                              const isExpanded = expandedDepartments.has(dept._id);
                              const selectedDesigs = selectedDesignations[dept._id] || [];

                              return (
                                <div key={dept._id} className="mb-2 border rounded">
                                  {/* Department Row */}
                                  <div className="d-flex align-items-center justify-content-between p-2 bg-light">
                                    {/* Department Toggle */}
                                    <div className="form-check form-switch mb-0">
                                      <input
                                        className="form-check-input"
                                        type="checkbox"
                                        role="switch"
                                        id={`dept-edit-${dept._id}`}
                                        checked={isDeptToggled}
                                        onChange={(e) => handleDepartmentToggle(dept._id, e.target.checked)}
                                      />
                                      <label className="form-check-label" htmlFor={`dept-edit-${dept._id}`}>
                                        <i className="ti ti-building me-2"></i>
                                        {dept.department}
                                        {isDeptToggled && (
                                          <span className="badge bg-success ms-2 badge-xs">
                                            All Designations
                                          </span>
                                        )}
                                        {!isDeptToggled && selectedDesigs.length > 0 && (
                                          <span className="badge bg-primary ms-2 badge-xs">
                                            {selectedDesigs.length} Selected
                                          </span>
                                        )}
                                      </label>
                                    </div>

                                    {/* Expand/Collapse Icon - Always Visible on Right */}
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-link p-0 text-dark"
                                      onClick={() => toggleDepartmentExpand(dept._id)}
                                      style={{ minWidth: '24px' }}
                                    >
                                      <i className={`ti ti-chevron-${isExpanded ? 'down' : 'right'}`}></i>
                                    </button>
                                  </div>

                                  {/* Designation List - Expandable with Animation */}
                                  {deptDesignations.length > 0 && (
                                    <div className={`designation-collapse ${isExpanded ? 'show' : ''}`}>
                                      <div className="p-3 bg-white border-top">
                                        <small className="text-muted d-block mb-2">
                                          {isDeptToggled ? (
                                            <span className="text-success">
                                              <i className="ti ti-check me-1"></i>
                                              Department toggle is ON - all designations included
                                            </span>
                                          ) : (
                                            <>
                                              <i className="ti ti-info-circle me-1"></i>
                                              Select specific designations (or toggle department for all)
                                            </>
                                          )}
                                        </small>
                                        <div className="row">
                                          {deptDesignations.map(desig => (
                                            <div key={desig._id} className="col-md-6 mb-2">
                                              <div className="form-check">
                                                <input
                                                  className="form-check-input"
                                                  type="checkbox"
                                                  id={`desig-edit-${desig._id}`}
                                                  checked={isDeptToggled || selectedDesigs.includes(desig._id)}
                                                  onChange={(e) => {
                                                    if (!isDeptToggled) {
                                                      handleDesignationToggle(dept._id, desig._id, e.target.checked);
                                                    }
                                                  }}
                                                  disabled={isDeptToggled}
                                                />
                                                <label
                                                  className={`form-check-label ${isDeptToggled ? 'text-muted' : ''}`}
                                                  htmlFor={`desig-edit-${desig._id}`}
                                                >
                                                  {desig.designation}
                                                </label>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {deptDesignations.length === 0 && (
                                    <div className={`designation-collapse ${isExpanded ? 'show' : ''}`}>
                                      <div className="p-3 bg-white border-top text-muted small">
                                        <i className="ti ti-alert-circle me-1"></i>
                                        No designations found in this department
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {departments.filter(d => d.status === 'Active').length === 0 && (
                              <div className="text-center text-muted py-4">
                                <i className="ti ti-info-circle me-1"></i>
                                No active departments available
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {editApplyToError && (
                        <div className="invalid-feedback d-block">
                          {editApplyToError}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        PolicyType Description <span className="text-danger">*</span>
                      </label>
                      <div className="policy-description-container">
                        <textarea
                          className={`form-control ${editDescriptionError ? 'is-invalid' : ''}`}
                          rows={4}
                          placeholder="Enter policy details and description here..."
                          value={editingPolicyType?.policyDescription || ""}
                          onChange={(e) => {
                            setEditingPolicyType(prev =>
                              prev ? { ...prev, policyDescription: e.target.value } : prev
                            );
                            // Clear error when user starts typing
                            if (editDescriptionError) {
                              setEditDescriptionError(null);
                            }
                          }}
                          maxLength={5000}
                        />
                        {editDescriptionError && (
                          <div className="invalid-feedback d-block">
                            {editDescriptionError}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-white border me-2"
                  data-bs-dismiss="modal"
                  onClick={resetEditPolicyTypeForm}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    if (editingPolicyType) {
                      handleUpdateSubmit(editingPolicyType);
                    }
                  }}
                  disabled={!editingPolicyType || loading}
                >
                  {loading ? 'Saving...' : 'Update PolicyType'}
                </button>
              </div>
            </form>
          </div>
        </div >
      </div >
      {/* /Edit  PolicyType */}
      {/* delete policy*/}
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
                {policyToDelete
                  ? `Are you sure you want to delete policy "${policyToDelete.policyName}"? This cannot be undone.`
                  : "You want to delete all the marked items, this can't be undone once you delete."}
              </p>
              <div className="d-flex justify-content-center">
                <button
                  className="btn btn-light me-3"
                  data-bs-dismiss="modal"
                  onClick={() => setPolicyTypeToDelete(null)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  data-bs-dismiss="modal"
                  onClick={async () => {
                    if (policyToDelete) {
                      await deletePolicyById(policyToDelete._id);
                    }
                    setPolicyTypeToDelete(null);
                  }}
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
      {/* View PolicyType */}
      <div className="modal fade" id="view_policy">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">PolicyType Details</h4>
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
              {viewingPolicyType && (
                <div className="policy-details-container">
                  {/* PolicyType Name */}
                  <div className="mb-4">
                    <div className="d-flex align-items-center mb-2">
                      <i className="ti ti-file-text text-primary me-2 fs-20"></i>
                      <h5 className="mb-0 text-muted">PolicyType Name</h5>
                    </div>
                    <div className="ps-4">
                      <p className="fs-16 mb-0">{viewingPolicyType.policyName}</p>
                    </div>
                  </div>

                  {/* In-effect Date */}
                  <div className="mb-4">
                    <div className="d-flex align-items-center mb-2">
                      <i className="ti ti-calendar text-primary me-2 fs-20"></i>
                      <h5 className="mb-0 text-muted">In-effect Date</h5>
                    </div>
                    <div className="ps-4">
                      <p className="fs-16 mb-0">
                        {toDayjsDate(viewingPolicyType.effectiveDate)
                          ? toDayjsDate(viewingPolicyType.effectiveDate)!.format("DD MMMM YYYY")
                          : "-"}
                      </p>
                    </div>
                  </div>

                  {/* Apply To - Department & Designations */}
                  <div className="mb-4">
                    <div className="d-flex align-items-center mb-3">
                      <i className="ti ti-users text-primary me-2 fs-20"></i>
                      <h5 className="mb-0 text-muted">Applicable To</h5>
                    </div>
                    <div className="ps-4">
                      {/* Check if policy applies to all employees */}
                      {viewingPolicyType.applyToAll ? (
                        <div className="border rounded p-4 bg-success bg-opacity-10">
                          <div className="d-flex align-items-center">
                            <span className="avatar avatar-lg bg-success me-3">
                              <i className="ti ti-users fs-24"></i>
                            </span>
                            <div>
                              <h5 className="text-success mb-1">All Employees</h5>
                              <p className="text-muted mb-0 small">
                                <i className="ti ti-info-circle me-1"></i>
                                This policy applies to all current and future employees, departments, and designations.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : viewingPolicyType.assignTo && viewingPolicyType.assignTo.length > 0 ? (
                        <div className="departments-list">
                          {viewingPolicyType.assignTo.map((mapping, index) => {
                            const hasSpecificDesignations = mapping.designationIds && mapping.designationIds.length > 0;
                            const deptDesignations = hasSpecificDesignations
                              ? designations.filter(d => mapping.designationIds.includes(d._id))
                              : [];

                            return (
                              <div key={index} className="mb-3 border rounded p-3 bg-light">
                                <div className="d-flex align-items-center mb-2">
                                  <i className="ti ti-building text-success me-2"></i>
                                  <strong className="text-dark">{mapping.departmentName}</strong>
                                  {hasSpecificDesignations ? (
                                    <span className="badge bg-primary ms-2">
                                      {mapping.designationIds.length} designation{mapping.designationIds.length !== 1 ? 's' : ''}
                                    </span>
                                  ) : (
                                    <span className="badge bg-success ms-2">
                                      <i className="ti ti-check me-1"></i>
                                      All Designations
                                    </span>
                                  )}
                                </div>
                                {hasSpecificDesignations && deptDesignations.length > 0 && (
                                  <div className="ms-4 mt-2">
                                    <div className="d-flex flex-wrap gap-2">
                                      {deptDesignations.map(designation => (
                                        <span
                                          key={designation._id}
                                          className="badge bg-secondary"
                                        >
                                          <i className="ti ti-user-check me-1"></i>
                                          {designation.designation}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-muted mb-0">
                          <i className="ti ti-info-circle me-1"></i>
                          Not assigned to any department or designation
                        </p>
                      )}
                    </div>
                  </div>

                  {/* PolicyType Description */}
                  <div className="mb-3">
                    <div className="d-flex align-items-center mb-2">
                      <i className="ti ti-file-description text-primary me-2 fs-20"></i>
                      <h5 className="mb-0 text-muted">Description</h5>
                    </div>
                    <div className="ps-4">
                      <div className="border rounded p-3 bg-light">
                        <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                          {viewingPolicyType.policyDescription || 'No description provided'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-light"
                data-bs-dismiss="modal"
              >
                <i className="ti ti-x me-1"></i>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* /View PolicyType */}
    </>

  )
}

export default Policy;
