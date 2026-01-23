import React, { useState, useEffect } from 'react'
import { all_routes } from '../../router/all_routes'
import { Link } from 'react-router-dom'
import Table from "../../../core/common/dataTable/index";
import CommonSelect from '../../../core/common/commonSelect';
import PredefinedDateRanges from '../../../core/common/datePicker';
import CollapseHeader from '../../../core/common/collapse-header/collapse-header';
import { useSocket } from "../../../SocketContext";
import { Socket } from "socket.io-client";
import { DateTime } from 'luxon';
import Footer from "../../../core/common/footer";
import { hideModal } from '../../../utils/modalUtils';
import { DatePicker } from "antd";
import dayjs from "dayjs";

// Policy Assignment Structure (ONLY ObjectIds)
interface PolicyAssignment {
  departmentId: string;  // Department ObjectId as string
  designationIds: string[];  // Array of Designation ObjectIds as strings (empty = all designations)
}

// Display structure with names (for frontend display only)
interface PolicyAssignmentWithNames extends PolicyAssignment {
  departmentName: string;  // Populated by backend for display
}

interface Policy {
  _id: string,
  policyName: string;
  policyDescription: string;
  effectiveDate: string;
  applyToAll?: boolean;  // When true, policy applies to all current and future employees
  assignTo?: PolicyAssignmentWithNames[];  // Backend populates with names for display
}

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

const staticOptions = [
  { value: "Select", label: "Select" },
];

const Policy = () => {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [sortedPolicies, setSortedPolicies] = useState<Policy[]>([]);
  const [sortOrder, setSortOrder] = useState("");
  const [policyName, setPolicyName] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [description, setDescription] = useState("");
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [filters, setFilters] = useState({ department: "", startDate: "", endDate: "" });
  const [policyToDelete, setPolicyToDelete] = useState<Policy | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responseData, setResponseData] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(staticOptions[0].value);
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [departmentError, setDepartmentError] = useState<string | null>(null);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [departmentLoading, setDepartmentLoading] = useState(false);
  const [selectedFilterDepartment, setSelectedFilterDepartment] = useState<string>("");
  
  // Policy Assignment State - Hierarchical toggle-based structure
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);  // Array of department IDs where toggle is ON
  const [selectedDesignations, setSelectedDesignations] = useState<{[departmentId: string]: string[]}>({});  // Map: deptId -> designationIds[]
  const [applyToAll, setApplyToAll] = useState<boolean>(false);
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());  // Track which departments are expanded
  
  // State for viewing policy details
  const [viewingPolicy, setViewingPolicy] = useState<Policy | null>(null);

  // Validation error states for Add Policy modal
  const [policyNameError, setPolicyNameError] = useState<string | null>(null);
  const [effectiveDateError, setEffectiveDateError] = useState<string | null>(null);
  const [applyToError, setApplyToError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);

  // Validation error states for Edit Policy modal
  const [editPolicyNameError, setEditPolicyNameError] = useState<string | null>(null);
  const [editEffectiveDateError, setEditEffectiveDateError] = useState<string | null>(null);
  const [editApplyToError, setEditApplyToError] = useState<string | null>(null);
  const [editDescriptionError, setEditDescriptionError] = useState<string | null>(null);

  const socket = useSocket() as Socket | null;

  // Modal container helper (for DatePicker positioning)
  const getModalContainer = (): HTMLElement => {
    const modalElement = document.getElementById("modal-datepicker");
    return modalElement ? modalElement : document.body;
  };

  useEffect(() => {
    if (!socket) return;

    let isMounted = true;

    setLoading(true);

    const timeoutId = setTimeout(() => {
      if (loading && isMounted) {
        console.warn("Policies loading timeout - showing fallback");
        setError("Policies loading timed out. Please refresh the page.");
        setLoading(false);
      }
    }, 30000);

    setPolicyLoading(true);
    socket.emit("hr/policy/get");

    setDepartmentLoading(true);
    socket.emit("hr/departments/get");
    
    // NEW: Fetch designations using the same pattern as designations.tsx
    socket.emit("hrm/designations/get");

    const handleAddPolicyResponse = (response: any) => {
      if (!isMounted) return;

      if (response.done) {
        setResponseData(response.data);
        setError(null);
        setLoading(false);
        if (socket) {
          socket.emit("hr/policy/get");
        }
        // Close modal after successful backend response
        hideModal('add_policy');
        
        // Reset form after successful submission
        resetAddPolicyForm();
      } else {
        parseBackendError(response.error || "Failed to add policy");
        setLoading(false);
      }
    };

    const handleGetPolicyResponse = (response: any) => {
      setPolicyLoading(false);
      if (!isMounted) return;

      if (response.done) {
        setPolicies(response.data);
        setSortedPolicies(response.data);
        setPolicyError(null);
        setLoading(false);
      } else {
        setPolicyError(response.error || "Failed to fetch policies");
        setLoading(false);
      }
    };

    const handleUpdatePolicyResponse = (response: any) => {
      if (!isMounted) return;

      if (response.done) {
        setResponseData(response.data);
        setError(null);
        setLoading(false);
        if (socket) {
          socket.emit("hr/policy/get");
        }
        
        // Close modal after successful backend response
        hideModal('edit_policy');
        
        // Reset validation errors after successful submission
        resetEditPolicyForm();
      } else {
        parseBackendError(response.error || "Failed to update policy", true);
        setLoading(false);
      }
    }

    const handleDeletePolicyResponse = (response: any) => {
      if (!isMounted) return;

      if (response.done) {
        setResponseData(response.data);
        setError(null);
        setLoading(false);
        if (socket) {
          socket.emit("hr/policy/get");
        }
      } else {
        setError(response.error || "Failed to add policy");
        setLoading(false);
      }
    }

    const handleDepartmentsResponse = (response: any) => {
      setDepartmentLoading(false);
      if (!isMounted) return;

      if (response.done) {
        setDepartments(response.data);
        setDepartmentError(null);
        setLoading(false);
      } else {
        setDepartmentError(response.error || "Failed to fetch departments");
        setLoading(false);
      }
    }

    const handleDesignationsResponse = (response: any) => {
      if (!isMounted) return;

      if (response.done) {
        setDesignations(response.data);
        console.log(`Loaded ${response.data.length} designations from database`);
        setLoading(false);
      } else {
        setError(response.error || "Failed to fetch designations");
        setLoading(false);
      }
    }

    socket.on("hr/policy/add-response", handleAddPolicyResponse);
    socket.on("hr/policy/get-response", handleGetPolicyResponse);
    socket.on("hr/policy/update-response", handleUpdatePolicyResponse);
    socket.on("hr/policy/delete-response", handleDeletePolicyResponse);
    socket.on("hr/departments/get-response", handleDepartmentsResponse);
    socket.on("hrm/designations/get-response", handleDesignationsResponse);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      socket.off("hr/policy/add-response", handleAddPolicyResponse);
      socket.off("hr/policy/get-response", handleGetPolicyResponse);
      socket.off("hr/policy/update-response", handleUpdatePolicyResponse);
      socket.off("hr/policy/delete-response", handleDeletePolicyResponse);
      socket.off("hr/departments/get-response", handleDepartmentsResponse);
      socket.off("hrm/designations/get-response", handleDesignationsResponse);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  // constants
  if (error) console.error("Page error:", error);
  if (policyError) console.error("Policy error:", policyError);
  if (departmentError) console.error("Department error:", departmentError);

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
      render: (text: String, record: Policy) => (
        <h6 
          className="fw-medium fs-14 text-dark" 
          style={{ cursor: 'pointer' }}
          onClick={() => setViewingPolicy(record)}
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
      render: (assignTo: PolicyAssignmentWithNames[], record: Policy) => {
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
          const deptName = a.departmentName || "Unknown";
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
      sorter: (a: any, b: any) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime(),
      render: (date: string) => DateTime.fromISO(date).toFormat("dd-MM-yyyy"),
    },
    {
      title: "",
      dataIndex: "actions",
      render: (_test: any, policy: Policy) => (
        <div className="action-icon d-inline-flex">
          <Link
            to="#"
            className="me-2"
            data-bs-toggle="modal"
            data-inert={true}
            data-bs-target="#view_policy"
            onClick={() => setViewingPolicy(policy)}
          >
            <i className="ti ti-eye" />
          </Link>
          <Link
            to="#"
            className="me-2"
            data-bs-toggle="modal"
            data-inert={true}
            data-bs-target="#edit_policy"
            onClick={() => { 
              setEditingPolicy(policy);
              setApplyToAll(policy.applyToAll || false);
              
              // Initialize from policy assignTo with hierarchical logic
              if (!policy.applyToAll && policy.assignTo && policy.assignTo.length > 0) {
                const toggledDepts: string[] = [];
                const desigMap: {[key: string]: string[]} = {};
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
          <Link
            to="#"
            className="me-2"
            data-bs-toggle="modal"
            data-inert={true}
            data-bs-target="#delete_modal"
            onClick={() => { setPolicyToDelete(policy); }}
          >
            <i className="ti ti-trash" />
          </Link>
        </div>
      ),
    }
  ]

  const policiesWithKey = policies.map((policy, index) => ({
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
      setEditPolicyNameError(null);
      setEditEffectiveDateError(null);
      setEditApplyToError(null);
      setEditDescriptionError(null);
    } else {
      setPolicyNameError(null);
      setEffectiveDateError(null);
      setApplyToError(null);
      setDescriptionError(null);
    }

    // Convert error message to lowercase for easier matching
    const error = errorMessage.toLowerCase();

    // Map backend errors to specific fields
    if (error.includes("policy name") || error.includes("policyname")) {
      if (isEditMode) {
        setEditPolicyNameError(errorMessage);
      } else {
        setPolicyNameError(errorMessage);
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
    const selectedDate = new Date(dateString);
    const today = new Date();
    // Set time to 00:00:00 for accurate date comparison
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    return selectedDate >= today;
  };

  // Reset Add Policy form fields and errors
  const resetAddPolicyForm = () => {
    setPolicyName("");
    setEffectiveDate("");
    setDescription("");
    setSelectedDepartment(staticOptions[0].value);
    setSelectedDepartments([]);
    setSelectedDesignations({});
    setApplyToAll(false);
    setExpandedDepartments(new Set());
    setError(null);
    setPolicyNameError(null);
    setEffectiveDateError(null);
    setApplyToError(null);
    setDescriptionError(null);
  };

  // Reset Edit Policy validation errors
  const resetEditPolicyForm = () => {
    setError(null);
    setEditPolicyNameError(null);
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

  const handleSubmit = () => {
    try {
      // Clear all errors at the start
      setPolicyNameError(null);
      setEffectiveDateError(null);
      setApplyToError(null);
      setDescriptionError(null);
      setError(null);

      // Validate all fields
      let hasError = false;

      if (!policyName.trim()) {
        setPolicyNameError("Policy Name is required");
        hasError = true;
      }

      if (!effectiveDate) {
        setEffectiveDateError("Effective Date is required");
        hasError = true;
      } else if (!isFutureDate(effectiveDate)) {
        setEffectiveDateError("Effective Date must be in the future");
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
      
      if (socket) {
        socket.emit("hr/policy/add", payload);
      } else {
        setError("Socket connection is not available.");
        setLoading(false);
      }
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

  const applyFilters = (updatedFields: {
    department?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    try {
      setFilters(prevFilters => {
        const newFilters = { ...prevFilters, ...updatedFields };
        if (socket) {
          socket.emit("hr/policy/get", { ...newFilters });
        }
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
    setSortedPolicies(sortedData); // may not need this later
    setPolicies(sortedData);
  };

  const handleUpdateSubmit = (editingPolicy: Policy) => {
    try {
      // Clear all errors at the start
      setEditPolicyNameError(null);
      setEditEffectiveDateError(null);
      setEditApplyToError(null);
      setEditDescriptionError(null);
      setError(null);

      const { _id, policyName, effectiveDate, policyDescription } = editingPolicy;

      if (!_id) {
        setError("Id not found");
        return;
      }

      // Validate all fields
      let hasError = false;

      if (!policyName || !policyName.trim()) {
        setEditPolicyNameError("Policy Name is required");
        hasError = true;
      }

      if (!effectiveDate) {
        setEditEffectiveDateError("Effective Date is required");
        hasError = true;
      } else if (!isFutureDate(effectiveDate)) {
        setEditEffectiveDateError("Effective Date must be in the future");
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
        _id,
        policyName: policyName.trim(),
        policyDescription: policyDescription.trim(),
        applyToAll,
        assignTo: applyToAll ? [] : assignTo,  // Empty when applyToAll is true
        effectiveDate,
      };

      if (socket) {
        socket.emit("hr/policy/update", payload);
      } else {
        setError("Socket connection is not available.");
        setLoading(false);
      }
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("An unexpected error occurred");
      }
      setLoading(false);
    }
  };

  const deletePolicy = (policyId: string) => {
    try {
      setLoading(true);
      setError(null);

      if (!socket) {
        setError("Socket connection is not available");
        setLoading(false);
        return;
      }

      if (!policyId) {
        setError("Policy ID is required");
        setLoading(false);
        return;
      }

      socket.emit("hr/policy/delete", { _id: policyId });
    } catch (error) {
      console.error("Delete error:", error);
      setError("Failed to initiate policy deletion");
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

  if (policyError || departmentError) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="alert alert-danger" role="alert">
            <h4 className="alert-heading">Error!</h4>
            <p>Failed to fetch policies</p>
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
              <div className="mb-2">
                <Link
                  to="#"
                  data-bs-toggle="modal"
                  data-inert={true}
                  data-bs-target="#add_policy"
                  className="btn btn-primary d-flex align-items-center"
                  onClick={resetAddPolicyForm}
                >
                  <i className="ti ti-circle-plus me-2" />
                  Add Policy
                </Link>
              </div>
              <div className="head-icons ms-2">
                <CollapseHeader />
              </div>
            </div>
          </div>
          {/* /Breadcrumb */}
          {/* Policy list */}
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
              <h5>Policies List</h5>
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
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    Department
                    {selectedFilterDepartment && selectedFilterDepartment !== "Select"
                      ? `: ${
                          options.find(opt => opt.value === selectedFilterDepartment)?.label || "None"
                        }`
                      : ": None"}
                  </Link>
                  <ul className="dropdown-menu dropdown-menu-end p-3">
                    {departmentError ? (
                      <li>
                        <div className="alert alert-danger mb-0 p-2" role="alert">
                          <small>{departmentError}</small>
                        </div>
                      </li>
                    ) : (
                      options.map((dept) => (
                        <li key={dept.value}>
                          <button
                            type="button"
                            className="dropdown-item rounded-1"
                            onClick={() => onSelectDepartment(dept.value)}
                          >
                            {dept.label}
                          </button>
                        </li>
                      ))
                    )}
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
          {/* /Policylist list */}
        </div>
        <Footer />
      </div>
      {/* /Page Wrapper */}
      {/* Add Policy */}
      <div className="modal fade" id="add_policy">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Add Policy</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={resetAddPolicyForm}
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
                        Policy Name <span className="text-danger">*</span>
                      </label>
                      <input 
                        type="text" 
                        className={`form-control ${policyNameError ? 'is-invalid' : ''}`}
                        value={policyName} 
                        onChange={(e) => {
                          setPolicyName(e.target.value);
                          // Clear error when user starts typing
                          if (policyNameError) {
                            setPolicyNameError(null);
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
                          format="DD-MM-YYYY"
                          getPopupContainer={getModalContainer}
                          placeholder="DD-MM-YYYY"
                          value={effectiveDate ? dayjs(effectiveDate) : null}
                          onChange={(date) => {
                            const isoDate = date ? date.toDate().toISOString() : "";
                            setEffectiveDate(isoDate);
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
                        Policy Description <span className="text-danger">*</span>
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
                  onClick={resetAddPolicyForm}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  disabled={loading} 
                  onClick={handleSubmit}
                >
                  Add Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Add Policy */}
      {/* Edit  Policy */}
      <div className="modal fade" id="edit_policy">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Edit Policy</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={resetEditPolicyForm}
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
                        Policy Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${editPolicyNameError ? 'is-invalid' : ''}`}
                        value={editingPolicy?.policyName || ""}
                        onChange={(e) => {
                          setEditingPolicy(prev =>
                            prev ? { ...prev, policyName: e.target.value } : prev);
                          // Clear error when user starts typing
                          if (editPolicyNameError) {
                            setEditPolicyNameError(null);
                          }
                        }}
                      />
                      {editPolicyNameError && (
                        <div className="invalid-feedback d-block">
                          {editPolicyNameError}
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
                          format="DD-MM-YYYY"
                          getPopupContainer={getModalContainer}
                          placeholder="DD-MM-YYYY"
                          value={editingPolicy?.effectiveDate ? dayjs(editingPolicy.effectiveDate) : null}
                          onChange={(date) => {
                            const isoDate = date ? date.toDate().toISOString() : "";
                            setEditingPolicy(prev =>
                              prev ? { ...prev, effectiveDate: isoDate } : prev);
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
                        Policy Description <span className="text-danger">*</span>
                      </label>
                      <div className="policy-description-container">
                        <textarea
                          className={`form-control ${editDescriptionError ? 'is-invalid' : ''}`}
                          rows={4}
                          placeholder="Enter policy details and description here..."
                          value={editingPolicy?.policyDescription || ""}
                          onChange={(e) => {
                            setEditingPolicy(prev =>
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
                  onClick={resetEditPolicyForm}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    if (editingPolicy) {
                      handleUpdateSubmit(editingPolicy);
                    }
                  }}
                  disabled={!editingPolicy || loading}
                >
                  {loading ? 'Saving...' : 'Update Policy'}
                </button>
              </div>
            </form>
          </div>
        </div >
      </div >
      {/* /Edit  Policy */}
      {/* delete policy*/}
      <div className="modal fade" id="delete_modal">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-body text-center">
              <span className="avatar avatar-xl bg-transparent-danger text-danger mb-3">
                <i className="ti ti-trash-x fs-36" />
              </span>
              <h4 className="mb-1">Confirm Deletion</h4>
              <p className="mb-3">
                {policyToDelete
                  ? `Are you sure you want to delete policy "${policyToDelete.policyName}"? This cannot be undone.`
                  : "You want to delete all the marked items, this can't be undone once you delete."}
              </p>
              <div className="d-flex justify-content-center">
                <button
                  className="btn btn-light me-3"
                  data-bs-dismiss="modal"
                  onClick={() => setPolicyToDelete(null)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  data-bs-dismiss="modal"
                  onClick={() => {
                    if (policyToDelete) {
                      deletePolicy(policyToDelete._id);
                    }
                    setPolicyToDelete(null);
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
      {/* View Policy */}
      <div className="modal fade" id="view_policy">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Policy Details</h4>
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
              {viewingPolicy && (
                <div className="policy-details-container">
                  {/* Policy Name */}
                  <div className="mb-4">
                    <div className="d-flex align-items-center mb-2">
                      <i className="ti ti-file-text text-primary me-2 fs-20"></i>
                      <h5 className="mb-0 text-muted">Policy Name</h5>
                    </div>
                    <div className="ps-4">
                      <p className="fs-16 mb-0">{viewingPolicy.policyName}</p>
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
                        {DateTime.fromISO(viewingPolicy.effectiveDate).toFormat("dd MMMM yyyy")}
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
                      {viewingPolicy.applyToAll ? (
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
                      ) : viewingPolicy.assignTo && viewingPolicy.assignTo.length > 0 ? (
                        <div className="departments-list">
                          {viewingPolicy.assignTo.map((mapping, index) => {
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

                  {/* Policy Description */}
                  <div className="mb-3">
                    <div className="d-flex align-items-center mb-2">
                      <i className="ti ti-file-description text-primary me-2 fs-20"></i>
                      <h5 className="mb-0 text-muted">Description</h5>
                    </div>
                    <div className="ps-4">
                      <div className="border rounded p-3 bg-light">
                        <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                          {viewingPolicy.policyDescription || 'No description provided'}
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
      {/* /View Policy */}
    </>

  )
}

export default Policy;