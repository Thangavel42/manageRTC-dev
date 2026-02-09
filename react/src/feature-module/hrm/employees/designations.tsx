// designations

import React, { useState, useEffect, useMemo } from 'react'
import { all_routes } from '../../router/all_routes'
import { Link, useNavigate } from 'react-router-dom'
import Table from "../../../core/common/dataTable/index";
import CommonSelect from '../../../core/common/commonSelect';
import { designation_details } from '../../../core/data/json/designation_details';
import CollapseHeader from '../../../core/common/collapse-header/collapse-header';
import { usersDetails } from '../../../core/data/json/usersDetails';
import { useSocket } from "../../../SocketContext";
import { Socket } from "socket.io-client";
import { departmentSelect } from '../../../core/common/selectoption/selectoption';
import Footer from "../../../core/common/footer";
import { showModal, hideModal, cleanupModalBackdrops } from '../../../utils/modalUtils';
import { useDesignationsREST } from "../../../hooks/useDesignationsREST";
import { useDepartmentsREST } from "../../../hooks/useDepartmentsREST";

type PasswordField = "password" | "confirmPassword";

interface Designations {
  _id: string;
  designation: string;
  departmentId: string;
  department?: string;
  employeeCount?: number;
  status: string;
}

interface Departments {
  _id: string;
  department: string;
  status: string
}

interface DesignationStats {
  totalDesignations?: number;
  activeCount?: number;
  inactiveCount?: number;
  emptyDesignations?: number;
}

const statusChoose = [
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
];

const staticOptions = [
  { label: "Select", value: "" }
];

const Designations = () => {
  const navigate = useNavigate();

  // REST hooks for designations and departments
  const {
    designations,
    stats: hookStats,
    loading: designationsLoading,
    error: designationsError,
    fetchDesignations,
    createDesignation,
    updateDesignation,
    deleteDesignation,
    fetchStats
  } = useDesignationsREST();

  const {
    departments,
    loading: departmentsLoading,
    error: departmentsError,
    fetchDepartments
  } = useDepartmentsREST();

  const socket = useSocket() as Socket | null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [designationName, setDesignationName] = useState("");
  const [departmentId, setDepartmentId] = useState(staticOptions[0]?.value || "");
  const [status, setStatus] = useState("Active");
  const [responseData, setResponseData] = useState<Designations[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [sortedDesignations, setSortedDesignations] = useState<Designations[]>([]);
  const [sortOrder, setSortOrder] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [filters, setFilters] = useState({ department: "", status: "" });
  const [editingDesignation, setEditingDesignation] = useState<Designations | null>(null);
  const [designationToDelete, setDesignationToDelete] = useState<Designations | null>(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [designationNameError, setDesignationNameError] = useState<string | null>(null);
  const [departmentIdError, setDepartmentIdError] = useState<string | null>(null);
  const [editDesignationNameError, setEditDesignationNameError] = useState<string | null>(null);
  const [editDepartmentIdError, setEditDepartmentIdError] = useState<string | null>(null);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [targetDesignationId, setTargetDesignationId] = useState("");
  const [isReassigning, setIsReassigning] = useState(false);
  const [deleteDependencyDetails, setDeleteDependencyDetails] = useState<any | null>(null);
  const [stats, setStats] = useState<DesignationStats>({
    totalDesignations: 0,
    activeCount: 0,
    inactiveCount: 0,
    emptyDesignations: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initial data fetch and update local state when hook data changes
  useEffect(() => {
    setLoading(designationsLoading || departmentsLoading);
    setError(designationsError || departmentsError);
  }, [designationsLoading, departmentsLoading, designationsError, departmentsError]);

  // Update local stats when stats from hook change
  useEffect(() => {
    if (hookStats) {
      setStats({
        totalDesignations: hookStats.totalDesignations || 0,
        activeCount: hookStats.activeCount || 0,
        inactiveCount: hookStats.inactiveCount || 0,
        emptyDesignations: designations.filter(d => (d.employeeCount || 0) === 0).length,
      });
    }
  }, [hookStats, designations]);

  // Fetch initial data on mount
  useEffect(() => {
    const initializeData = async () => {
      await Promise.all([
        fetchDesignations(),
        fetchStats(),
        fetchDepartments()
      ]);
    };
    initializeData();
  }, []);

  // Socket.IO real-time listeners for broadcast events only
  useEffect(() => {
    if (!socket) return;

    const handleDesignationCreated = (data: Designations) => {
      console.log('[Designations] Designation created via broadcast:', data);
      fetchDesignations();
      fetchStats();
    };

    const handleDesignationUpdated = (data: Designations) => {
      console.log('[Designations] Designation updated via broadcast:', data);
      fetchDesignations();
      fetchStats();
    };

    const handleDesignationDeleted = (data: { _id: string }) => {
      console.log('[Designations] Designation deleted via broadcast:', data);
      fetchDesignations();
      fetchStats();
    };

    const handleDepartmentCreated = (data: Departments) => {
      console.log('[Designations] Department created via broadcast:', data);
      fetchDepartments();
    };

    const handleDepartmentUpdated = (data: Departments) => {
      console.log('[Designations] Department updated via broadcast:', data);
      fetchDepartments();
    };

    const handleDepartmentDeleted = (data: { _id: string }) => {
      console.log('[Designations] Department deleted via broadcast:', data);
      fetchDepartments();
    };

    socket.on('designation:created', handleDesignationCreated);
    socket.on('designation:updated', handleDesignationUpdated);
    socket.on('designation:deleted', handleDesignationDeleted);
    socket.on('department:created', handleDepartmentCreated);
    socket.on('department:updated', handleDepartmentUpdated);
    socket.on('department:deleted', handleDepartmentDeleted);

    return () => {
      socket.off('designation:created', handleDesignationCreated);
      socket.off('designation:updated', handleDesignationUpdated);
      socket.off('designation:deleted', handleDesignationDeleted);
      socket.off('department:created', handleDepartmentCreated);
      socket.off('department:updated', handleDepartmentUpdated);
      socket.off('department:deleted', handleDepartmentDeleted);
    };
  }, [socket, fetchDesignations, fetchStats, fetchDepartments]);

  // Helper function to normalize status display (capitalize first letter)
  const normalizeStatus = (status: string): string => {
    if (!status) return '';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  const columns = [
    {
      title: "Designation",
      dataIndex: "designation",
      render: (text: String, record: any) => (
        <h6 className="fw-medium fs-14 text-dark">
          <Link to={`${all_routes.employeeList}?designation=${encodeURIComponent(record._id)}`}>
            {text}
          </Link>
        </h6>
      ),
      sorter: (a: any, b: any) => a.designation.localeCompare(b.designation),
    },
    {
      title: "Department",
      dataIndex: "department",
      sorter: (a: any, b: any) => a.department.localeCompare(b.department),
    },
    {
      title: "No of Employees",
      dataIndex: "employeeCount",
      render: (count: number, record: any) => (
        <span className="fw-medium">
          {count > 0 ? (
            <Link to={`${all_routes.employeeList}?designation=${encodeURIComponent(record._id)}`}>
              {count}
            </Link>
          ) : (
            <span className="text-muted">0</span>
          )}
        </span>
      ),
      sorter: (a: any, b: any) => a.employeeCount - b.employeeCount,
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (text: string, record: any) => {
        const normalizedStatus = normalizeStatus(text);
        const isActive = normalizedStatus.toLowerCase() === 'active';
        return (
          <span className={`badge ${isActive ? 'badge-success' : 'badge-danger'} d-inline-flex align-items-center badge-xs`}>
            <i className="ti ti-point-filled me-1" />
            {normalizedStatus}
          </span>
        );
      },
      sorter: (a: any, b: any) => a.status.length - b.status.length,
    },
    {
      title: "",
      dataIndex: "actions",
      render: (_test: any, designation: Designations) => (
        <div className="action-icon d-inline-flex">
          <Link
            to="#"
            className="me-2"
            data-bs-toggle="modal"
            data-inert={true}
            data-bs-target="#edit_designation"
            onClick={() => { setEditingDesignation(designation); }}
          >
            <i className="ti ti-edit" />
          </Link>
          <Link
            to="#"
            className="me-2"
            {...(designation.employeeCount > 0 ? {} : {
              'data-bs-toggle': 'modal',
              'data-bs-target': '#delete_modal'
            })}
            data-inert={true}
            onClick={() => handleDeleteClick(designation)}
          >
            <i className="ti ti-trash" />
          </Link>
        </div>
      ),
    },
  ]

  const departmentOptions = useMemo(() => {
    return departments.map(dept => ({
      value: dept._id,
      label: dept.department.charAt(0).toUpperCase() + dept.department.slice(1).toLowerCase(),
    }));
  }, [departments]);

  const designationData = designations.map((d, index) => ({
    ...d,
    key: d._id || index.toString(),
  }))

  const selectedDepartmentOption = useMemo(() => {
    return departmentOptions.find(opt => opt.value === selectedDepartmentId);
  }, [departmentOptions, selectedDepartmentId]);

  // Reset Add Designation form fields to default values
  const resetAddDesignationForm = () => {
    setDesignationName("");
    setSelectedDepartmentId("");
    setStatus("Active");
    setError(null);
    setDesignationNameError(null);
    setDepartmentIdError(null);
  };

  const handleSubmit = async () => {
    try {
      setError(null);
      setDesignationNameError(null);
      setDepartmentIdError(null);

      if (!designationName.trim()) {
        setDesignationNameError("Designation Name is required");
        return;
      }

      if (!selectedDepartmentId) {
        setDepartmentIdError("Department is required");
        return;
      }

      if (!status) {
        setError("Status is required");
        return;
      }

      setIsSubmitting(true);

      const data = {
        designation: designationName,
        departmentId: selectedDepartmentId,
        status: status as 'Active' | 'Inactive' | 'On Notice' | 'Resigned' | 'Terminated' | 'On Leave',
      };

      const success = await createDesignation(data);

      if (success) {
        // Refresh designations list and stats
        await Promise.all([
          fetchDesignations(filters),
          fetchStats()
        ]);
        // Reset form fields after successful submission
        resetAddDesignationForm();
        // Close modal programmatically after successful response
        hideModal('add_designation');
        // Extra safety cleanup after animation
        setTimeout(() => cleanupModalBackdrops(), 500);
      }
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSort = (order: string) => {
    setSortOrder(order);
    if (!order) {
      setSortedDesignations(designations);
      return;
    }
    const sortedData = [...designations].sort((a, b) => {
      const nameA = a.designation.toLowerCase();
      const nameB = b.designation.toLowerCase();

      if (order === "ascending") {
        return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
      }
      if (order === "descending") {
        return nameA > nameB ? -1 : nameA < nameB ? 1 : 0;
      }
      return 0;
    });
    setSortedDesignations(sortedData);
  };

  const extractDependencyDetails = (details: any) => {
    if (Array.isArray(details) && details.length > 0) {
      return details[0];
    }
    if (details && typeof details === 'object') {
      return details;
    }
    return null;
  };

  const applyFilters = async (updatedFields: {
    department?: string;
    status?: string;
  }) => {
    try {
      setFilters(prevFilters => {
        const newFilters = { ...prevFilters, ...updatedFields };
        fetchDesignations(newFilters);
        return newFilters;
      });
    } catch (error) {
      console.error("Error applying filters:", error);
    }
  };

  const onSelectDepartment = (id: string) => {
    applyFilters({ department: id });
  };

  const onSelectStatus = (status: string) => {
    if (!status) return;
    setSelectedStatus(status);
    applyFilters({ status });
  };

  const handleUpdateSubmit = async () => {
    try {
      if (!editingDesignation) {
        setError("No designation selected for update");
        return;
      }

      setError(null);
      setEditDesignationNameError(null);
      setEditDepartmentIdError(null);
      setUpdateLoading(true);

      const { _id, designation, departmentId, status } = editingDesignation;

      if (!_id) {
        setError("Designation ID is required.");
        setUpdateLoading(false);
        return;
      }

      if (!designation || designation.trim() === "") {
        setEditDesignationNameError("Designation name is required.");
        setUpdateLoading(false);
        return;
      }

      if (!departmentId) {
        setEditDepartmentIdError("Department ID is required.");
        setUpdateLoading(false);
        return;
      }

      if (!status) {
        setError("Status is required.");
        setUpdateLoading(false);
        return;
      }

      // Ensure status is stored with proper capitalization
      const normalizedStatus = normalizeStatus(status) as 'Active' | 'Inactive' | 'On Notice' | 'Resigned' | 'Terminated' | 'On Leave';

      const payload = {
        designation: designation.trim(),
        departmentId: departmentId.trim(),
        status: normalizedStatus,
      };

      const success = await updateDesignation(_id, payload);

      if (success) {
        setError(null);
        resetEditDesignationForm();
        // Close modal only on success
        hideModal('edit_designation');
        setTimeout(() => cleanupModalBackdrops(), 500);
        // Refresh designations list
        await fetchDesignations(filters);
      }
    } catch (error) {
      setUpdateLoading(false);
      if (error instanceof Error) {
        setEditDesignationNameError(error.message);
      } else {
        setEditDesignationNameError("An unexpected error occurred");
      }
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDeleteDesignation = async (designationId: string) => {
    try {
      setLoading(true);
      setError(null);

      if (!designationId) {
        setError("Designation ID is required");
        setLoading(false);
        return;
      }

      const result = await deleteDesignation(designationId);

      if (result.success) {
        setError(null);
        // Refresh designations list and stats
        await Promise.all([
          fetchDesignations(filters),
          fetchStats()
        ]);
        return;
      }
      if (result.error?.code === 'DEPENDENT_RECORDS') {
        setDeleteDependencyDetails(extractDependencyDetails(result.error.details));
        setShowReassignModal(true);
        setTargetDesignationId("");
        hideModal('delete_modal');
        setTimeout(() => showModal('reassign_delete_designation_modal'), 100);
        return;
      }
      setError(result.error?.message || "Failed to delete designation");
    } catch (error) {
      setError("Failed to delete designation");
    } finally {
      setLoading(false);
    }
  };

  const handleReassignAndDelete = async () => {
    if (!designationToDelete || !targetDesignationId) {
      setError("Please select a target designation");
      return;
    }

    try {
      setIsReassigning(true);
      setError(null);

      const result = await deleteDesignation(designationToDelete._id, targetDesignationId);

      if (result.success) {
        setError(null);
        setShowReassignModal(false);
        setTargetDesignationId("");
        setDesignationToDelete(null);
        setDeleteDependencyDetails(null);
        // Close modal and refresh data
        hideModal('reassign_delete_designation_modal');
        // Refresh designations list and stats
        await Promise.all([
          fetchDesignations(filters),
          fetchStats()
        ]);
      } else {
        setError(result.error?.message || "Failed to reassign and delete designation");
      }
    } catch (error) {
      setError("Failed to reassign and delete designation");
    } finally {
      setIsReassigning(false);
    }
  };

  const handleDeleteClick = (designation: Designations) => {
    const hasEmployees = (designation.employeeCount || 0) > 0;

    setDesignationToDelete(designation);
    setDeleteDependencyDetails(null);

    if (hasEmployees) {
      // Show reassignment modal programmatically
      setShowReassignModal(true);
      setTargetDesignationId("");
      // Use the utility function to show modal safely
      setTimeout(() => {
        showModal('reassign_delete_designation_modal');
      }, 100);
    }
    // If no employees, the Bootstrap data-bs-target will handle showing delete_modal
  };

  // Reset Edit Designation validation errors
  const resetEditDesignationForm = () => {
    setError(null);
    setEditDesignationNameError(null);
    setEditDepartmentIdError(null);
  };

  // Get available designations for reassignment (exclude the one being deleted, same department only)
  const availableDesignations = designations.filter(
    desig => desig._id !== designationToDelete?._id && 
             desig.departmentId === designationToDelete?.departmentId
  ).map(desig => ({
    value: desig._id,
    label: desig.designation
  }));

  const dependencySummary = {
    employees: deleteDependencyDetails?.employees ?? designationToDelete?.employeeCount ?? 0,
    policies: deleteDependencyDetails?.policies ?? 0,
    promotions: deleteDependencyDetails?.promotions ?? 0
  };

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
              <h2 className="mb-1">Designations</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={all_routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">Employee</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Designations
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
                  data-bs-target="#add_designation"
                  className="btn btn-primary d-flex align-items-center"
                  onClick={resetAddDesignationForm}
                >
                  <i className="ti ti-circle-plus me-2" />
                  Add Designation
                </Link>
              </div>
              <div className="head-icons ms-2">
                <CollapseHeader />
              </div>
            </div>
          </div>
          {/* /Breadcrumb */}
          
          {/* Stats Cards */}
          <div className="row">
            {/* Total Designations */}
            <div className="col-lg-3 col-md-6 d-flex">
              <div className="card flex-fill">
                <div className="card-body d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center overflow-hidden">
                    <div>
                      <span className="avatar avatar-lg bg-primary rounded-circle">
                        <i className="ti ti-briefcase" />
                      </span>
                    </div>
                    <div className="ms-2 overflow-hidden">
                      <p className="fs-12 fw-medium mb-1 text-truncate">
                        Total Designations
                      </p>
                      <h4>{stats?.totalDesignations || 0}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* /Total Designations */}
            
            {/* Active Designations */}
            <div className="col-lg-3 col-md-6 d-flex">
              <div className="card flex-fill">
                <div className="card-body d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center overflow-hidden">
                    <div>
                      <span className="avatar avatar-lg bg-success rounded-circle">
                        <i className="ti ti-circle-check" />
                      </span>
                    </div>
                    <div className="ms-2 overflow-hidden">
                      <p className="fs-12 fw-medium mb-1 text-truncate">
                        Active Designations
                      </p>
                      <h4>{stats?.activeCount || 0}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* /Active Designations */}
            
            {/* Inactive Designations */}
            <div className="col-lg-3 col-md-6 d-flex">
              <div className="card flex-fill">
                <div className="card-body d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center overflow-hidden">
                    <div>
                      <span className="avatar avatar-lg bg-danger rounded-circle">
                        <i className="ti ti-circle-x" />
                      </span>
                    </div>
                    <div className="ms-2 overflow-hidden">
                      <p className="fs-12 fw-medium mb-1 text-truncate">
                        Inactive Designations
                      </p>
                      <h4>{stats?.inactiveCount || 0}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* /Inactive Designations */}
            
            {/* No Employees Assigned */}
            <div className="col-lg-3 col-md-6 d-flex">
              <div className="card flex-fill">
                <div className="card-body d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center overflow-hidden">
                    <div>
                      <span className="avatar avatar-lg bg-warning rounded-circle">
                        <i className="ti ti-users-off" />
                      </span>
                    </div>
                    <div className="ms-2 overflow-hidden">
                      <p className="fs-12 fw-medium mb-1 text-truncate">
                        No Employees Assigned
                      </p>
                      <h4>{stats?.emptyDesignations || 0}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* /No Employees Assigned */}
          </div>
          {/* /Stats Cards */}
          
          {/* Performance Indicator list */}
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
              <h5>Designation List</h5>
              <div className="d-flex my-xl-auto right-content align-items-center flex-wrap row-gap-3">
                <div className="dropdown me-3">
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    {loading ? ('Loading...') : selectedDepartmentId ? (
                      `Department: ${departments.find(d => d._id === selectedDepartmentId)?.department || 'None'}`
                    ) : (
                      "Department: None"
                    )}
                  </Link>
                  <ul className="dropdown-menu dropdown-menu-end p-3">
                    {loading ? (
                      <li><span className="dropdown-item">Loading...</span></li>
                    ) : error ? (
                      <li>
                        <div className="dropdown-item text-danger">
                          {error} <button onClick={() => fetchDepartments()}>Retry</button>
                        </div>
                      </li>
                    ) : (
                      departments.map(dept => (
                        <li key={dept._id}>
                          <Link
                            to="#"
                            className={`dropdown-item rounded-1 ${selectedDepartmentId === dept._id ? 'active' : ''}`}
                            onClick={(e) => {
                              e.preventDefault();
                              setSelectedDepartmentId(dept._id);
                              onSelectDepartment(dept._id);
                            }}
                          >
                            {dept.department}
                          </Link>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
                <div className="dropdown me-3">
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    Select status {selectedStatus ? `: ${normalizeStatus(selectedStatus)}` : ": None"}
                  </Link>
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
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={() => onSelectStatus("Active")}
                      >
                        Active
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={() => onSelectStatus("Inactive")}
                      >
                        Inactive
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
                    Sort By {sortOrder ? `: ${sortOrder.charAt(0).toUpperCase() + sortOrder.slice(1)}` : ": None"}
                  </Link>
                  <ul className="dropdown-menu  dropdown-menu-end p-3">
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={() => handleSort("ascending")}
                      >
                        Ascending
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={() => handleSort("descending")}
                      >
                        Desending
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={() => handleSort("")}
                      >
                        None
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="card-body p-0">
              <Table dataSource={designationData} columns={columns} Selection={true} />
            </div>
          </div>
          {/* /Performance Indicator list */}
        </div>
        <Footer />
      </div>
      {/* /Page Wrapper */}
      {/* Add Designation */}
      <div 
        className="modal fade" 
        id="add_designation"
        data-bs-backdrop="true"
        data-bs-keyboard="true"
        tabIndex={-1}
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered modal-md">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Add Designation</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={resetAddDesignationForm}
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
                        Designation Name <span className="text-danger">*</span>
                      </label>
                      <input 
                        type="text" 
                        className={`form-control ${designationNameError ? 'is-invalid' : ''}`}
                        value={designationName} 
                        onChange={(e) => {
                          setDesignationName(e.target.value);
                          // Clear error when user starts typing
                          if (designationNameError) {
                            setDesignationNameError(null);
                          }
                        }} 
                      />
                      {designationNameError && (
                        <div className="invalid-feedback d-block">
                          {designationNameError}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Department Name <span className="text-danger">*</span>
                      </label>
                      {loading ? (
                        <div className="form-control">
                          <small>Loading departments...</small>
                        </div>
                      ) : error ? (
                        <div className="alert alert-danger">
                          {error} <button onClick={() => fetchDepartments()}>Retry</button>
                        </div>
                      ) : departmentOptions.length === 0 ? (
                        <div>
                          <button
                            type="button"
                            className="btn btn-primary w-100"
                            onClick={() => navigate("/departments")}
                          >
                            <i className="ti ti-plus me-2" />
                            Create New Department
                          </button>
                          <small className="text-muted d-block mt-2">No departments available. Click to create one.</small>
                        </div>
                      ) : (
                        <>
                          <CommonSelect
                            options={departmentOptions}
                            defaultValue={selectedDepartmentOption}
                            onChange={(selected) => {
                              setSelectedDepartmentId(selected?.value || "");
                              // Clear error when user selects a department
                              if (departmentIdError) {
                                setDepartmentIdError(null);
                              }
                            }}
                            isSearchable={true}
                            disabled={loading || !!error}
                          />
                          {departmentIdError && (
                            <div className="invalid-feedback d-block">
                              {departmentIdError}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Status <span className="text-danger">*</span>
                      </label>
                      <CommonSelect
                        className="select"
                        options={statusChoose}
                        defaultValue={statusChoose.find(opt => opt.value === "Active")}
                        onChange={(selectedValue) => {
                          setStatus(
                            typeof selectedValue === 'string'
                              ? selectedValue
                              : selectedValue?.value || "Active"
                          )
                        }}
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
                  onClick={resetAddDesignationForm}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                  onClick={handleSubmit}
                >
                  {isSubmitting ? 'Adding...' : 'Add Designation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Add Designation */}
      {/* Edit Designation */}
      <div 
        className="modal fade" 
        id="edit_designation"
        data-bs-backdrop="true"
        data-bs-keyboard="true"
        tabIndex={-1}
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered modal-md">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Edit Designation</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={resetEditDesignationForm}
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form>
              <div className="modal-body pb-0">
                <div className="row">
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Designation Name</label>
                      <input
                        type="text"
                        className={`form-control ${editDesignationNameError ? 'is-invalid' : ''}`}
                        value={editingDesignation?.designation || ""}
                        onChange={(e) => {
                          setEditingDesignation(prev =>
                            prev ? { ...prev, designation: e.target.value } : prev);
                          // Clear error when user starts typing
                          if (editDesignationNameError) {
                            setEditDesignationNameError(null);
                          }
                        }}
                      />
                      {editDesignationNameError && (
                        <div className="invalid-feedback d-block">
                          {editDesignationNameError}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Department Name</label>
                      {departmentOptions.length === 0 ? (
                        <div>
                          <button
                            type="button"
                            className="btn btn-primary w-100"
                            onClick={() => navigate("/departments")}
                          >
                            <i className="ti ti-plus me-2" />
                            Create New Department
                          </button>
                          <small className="text-muted d-block mt-2">No departments available. Click to create one.</small>
                        </div>
                      ) : (
                        <>
                          <CommonSelect
                            className="select"
                            options={departmentOptions}
                            defaultValue={departmentOptions.find(opt =>
                              opt.value === editingDesignation?.departmentId
                            )}
                            onChange={(selectedOption) => {
                              setEditingDesignation(prev =>
                                prev ? { ...prev, departmentId: selectedOption?.value || "" } : prev
                              );
                              // Clear error when user selects a department
                              if (editDepartmentIdError) {
                                setEditDepartmentIdError(null);
                              }
                            }}
                          />
                          {editDepartmentIdError && (
                            <div className="invalid-feedback d-block">
                              {editDepartmentIdError}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Status <span className="text-danger">*</span>
                      </label>
                      <CommonSelect
                        className="select"
                        options={statusChoose}
                        defaultValue={statusChoose.find(opt =>
                          opt.value.toLowerCase() === (editingDesignation?.status || 'Active').toLowerCase()
                        )}
                        onChange={(selectedOption) =>
                          setEditingDesignation(prev =>
                            prev ? { ...prev, status: selectedOption?.value || "Active" } : prev
                          )}
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
                  onClick={resetEditDesignationForm}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!editingDesignation || updateLoading}
                  onClick={handleUpdateSubmit}
                >
                  {updateLoading ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Edit Department */}
      {/* Delete Designation */}
      <div 
        className="modal fade" 
        id="delete_modal"
        data-bs-backdrop="true"
        data-bs-keyboard="true"
        tabIndex={-1}
        aria-hidden="true"
      >
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
                {designationToDelete
                  ? `Are you sure you want to delete designation "${designationToDelete.designation}"? This cannot be undone.`
                  : "You want to delete all the marked items, this can't be undone once you delete."}
              </p>
              <div className="d-flex justify-content-center">
                <button
                  className="btn btn-light me-3"
                  data-bs-dismiss="modal"
                  onClick={() => {
                    setDesignationToDelete(null);
                    setDeleteDependencyDetails(null);
                  }}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  data-bs-dismiss="modal"
                  onClick={() => {
                    if (designationToDelete) {
                      handleDeleteDesignation(designationToDelete._id);
                    }
                    setDesignationToDelete(null);
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
      {/* /Delete Designation */}
      {/* Reassign and Delete Designation */}
      <div 
        className="modal fade" 
        id="reassign_delete_designation_modal"
        data-bs-backdrop="true"
        data-bs-keyboard="true"
        tabIndex={-1}
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Reassign Before Deletion</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={() => {
                  setShowReassignModal(false);
                  setTargetDesignationId("");
                  setDesignationToDelete(null);
                  setDeleteDependencyDetails(null);
                }}
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="modal-body">
              <div className="alert alert-warning d-flex align-items-start mb-3">
                <i className="ti ti-alert-triangle me-2 mt-1" style={{ fontSize: "20px" }}></i>
                <div>
                  <strong>Designation "{designationToDelete?.designation}" cannot be deleted directly</strong>
                  <p className="mb-0 mt-1">
                    This designation has{" "}
                    <strong>{dependencySummary.employees} employee{dependencySummary.employees !== 1 ? 's' : ''}</strong>,
                    {" "}
                    <strong>{dependencySummary.policies} polic{dependencySummary.policies !== 1 ? 'ies' : 'y'}</strong>
                    {dependencySummary.promotions > 0 && (
                      <>
                        {", "}
                        <strong>{dependencySummary.promotions} promotion{dependencySummary.promotions !== 1 ? 's' : ''}</strong>
                      </>
                    )}
                    . Please reassign to another designation before deletion.
                  </p>
                </div>
              </div>
              <div className="row">
                <div className="col-md-12">
                  <div className="mb-3">
                    <label className="form-label">
                      Reassign to Designation (in same department) <span className="text-danger">*</span>
                    </label>
                    <CommonSelect
                      className="select"
                      options={availableDesignations}
                      onChange={(selectedOption) =>
                        setTargetDesignationId(selectedOption ? selectedOption.value : "")
                      }
                    />
                    {availableDesignations.length === 0 && (
                      <small className="text-danger d-block mt-2">
                        <i className="ti ti-alert-circle me-1"></i>
                        No other designations available in this department. Please create a new designation first.
                      </small>
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
                onClick={() => {
                  setShowReassignModal(false);
                  setTargetDesignationId("");
                  setDesignationToDelete(null);
                  setDeleteDependencyDetails(null);
                }}
                disabled={isReassigning}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleReassignAndDelete}
                disabled={isReassigning || !targetDesignationId || availableDesignations.length === 0}
              >
                {isReassigning ? 'Reassigning...' : 'Reassign & Delete'}
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* /Reassign and Delete Designation */}
    </>
  )
}
export default Designations
