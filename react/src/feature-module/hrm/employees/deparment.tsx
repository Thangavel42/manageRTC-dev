// react/src/employees/departments.jsx

import React, { useState, useEffect } from 'react'
import { all_routes } from '../../router/all_routes'
import { Link } from 'react-router-dom'
import Table from "../../../core/common/dataTable/index";
import CommonSelect from '../../../core/common/commonSelect';
import { department_details } from '../../../core/data/json/department_details';
import CollapseHeader from '../../../core/common/collapse-header/collapse-header';
import { departmentName } from '../../../core/common/selectoption/selectoption';
import { useSocket } from "../../../SocketContext";
import { Socket } from "socket.io-client";
import Footer from "../../../core/common/footer";
import { showModal, hideModal, cleanupModalBackdrops } from '../../../utils/modalUtils';

type PasswordField = "password" | "confirmPassword";


interface Departments {
  _id: string;
  department: string;
  employeeCount: number;
  designationCount?: number;  // Count of designations in this department
  policyCount?: number;       // Count of policies assigned to this department
  status: string;
}

interface Designation {
  _id: string;
  designation: string;
  departmentId: string;
  status: string;
}

const statusChoose = [
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
];

const Department = () => {
  const [departments, setDepartments] = useState<Departments[]>([]);
  const [sortedDepartments, setSortedDepartments] = useState<Departments[]>([]);
  const [departmentName, setDepartmentName] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("Active");
  const [loading, setLoading] = useState(false);
  const [responseData, setResponseData] = useState(null);
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState("");
  const [filters, setFilters] = useState({ status: "" });
  const [editingDept, setEditingDept] = useState<Departments | null>(null);
  const [departmentToDelete, setDepartmentToDelete] = useState<Departments | null>(null);
  const [departmentNameError, setDepartmentNameError] = useState<string | null>(null);
  const [editDepartmentNameError, setEditDepartmentNameError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [targetDepartmentId, setTargetDepartmentId] = useState<string>("");
  const [isReassigning, setIsReassigning] = useState(false);
  const socket = useSocket() as Socket | null;

  useEffect(() => {
    if (!socket) return;
    let isMounted = true;

    const timeoutId = setTimeout(() => {
      if (loading && isMounted) {
        console.warn("Policies loading timeout - showing fallback");
        setError("Policies loading timed out. Please refresh the page.");
        setLoading(false);
      }
    }, 30000);

    socket.emit("hr/departmentsStats/get");

    const handleAddDepartmentResponse = (response: any) => {
      if (!isMounted) return;
      setIsSubmitting(false);
      if (response.done) {
        setResponseData(response.data);
        setError(null);
        // Reset form fields after successful submission
        resetAddDepartmentForm();
        // Close modal programmatically after successful response
        hideModal('add_department');
        // Extra safety cleanup after animation
        setTimeout(() => cleanupModalBackdrops(), 500);
        if (socket) {
          socket.emit("hr/departmentsStats/get");
        }
      } else {
        // Show backend error inline under the department name field
        // Keep modal open - do NOT set general error state
        setDepartmentNameError(response.error || "Failed to add department");
      }
    };

    const handleDepartmentStatsResponse = (response: any) => {
      clearTimeout(timeoutId);
      if (!isMounted) return;

      if (response.done) {
        setDepartments(response.data);
        setError(null);
        setLoading(false);
      } else {
        setError(response.error || "Failed to fetch department");
        setLoading(false);
      }
    }

    const handleUpdateDepartmentResponse = (response: any) => {
      clearTimeout(timeoutId);
      if (!isMounted) return;
      setIsUpdating(false);

      if (response.done) {
        setResponseData(response.data);
        setError(null);
        resetEditDepartmentForm();
        // Close modal only on success
        hideModal('edit_department');
        setTimeout(() => cleanupModalBackdrops(), 500);
        if (socket) {
          socket.emit("hr/departmentsStats/get");
        }
      } else {
        // Show backend error inline - keep modal open
        setEditDepartmentNameError(response.error || "Failed to update department");
      }
    }

    const handleDeleteDepartmentResponse = (response: any) => {
       if (!isMounted) return;

      if (response.done) {
        setResponseData(response.data);
        setError(null);
        setLoading(false);
        if (socket) {
          socket.emit("hr/departmentsStats/get");
        }
      } else {
        setError(response.error || "Failed to delete department");
        setLoading(false);
      }
    }

    const handleReassignAndDeleteResponse = (response: any) => {
      if (!isMounted) return;
      setIsReassigning(false);

      if (response.done) {
        setResponseData(response.data);
        setError(null);
        // Close reassign modal using hideModal utility
        hideModal('reassign_delete_modal');
        setTimeout(() => {
          cleanupModalBackdrops();
          setShowReassignModal(false);
          setTargetDepartmentId("");
          setDepartmentToDelete(null);
        }, 500);
        // Refresh departments list
        if (socket) {
          socket.emit("hr/departmentsStats/get");
        }
      } else {
        setError(response.error || "Failed to reassign and delete department");
      }
    }

    socket.on("hr/departments/add-response", handleAddDepartmentResponse);
    socket.on("hr/departmentsStats/get-response", handleDepartmentStatsResponse);
    socket.on("hrm/departments/update-response", handleUpdateDepartmentResponse);
    socket.on("hrm/departments/delete-response", handleDeleteDepartmentResponse);
    socket.on("hrm/departments/reassign-delete-response", handleReassignAndDeleteResponse);
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      socket.off("hr/departments/add-response", handleAddDepartmentResponse);
      socket.off("hr/departmentsStats/get-response", handleDepartmentStatsResponse);
      socket.off("hrm/departments/update-response", handleUpdateDepartmentResponse);
      socket.off("hrm/departments/delete-response", handleDeleteDepartmentResponse);
      socket.off("hrm/departments/reassign-delete-response", handleReassignAndDeleteResponse);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  //  constants

  // Helper function to normalize status display (capitalize first letter)
  const normalizeStatus = (status: string): string => {
    if (!status) return '';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  const columns = [
    {
      title: "Department",
      dataIndex: "department",
      render: (text: String, record: any) => (
        <h6 className="fw-medium">
          <Link to={`${all_routes.employeeList}?department=${encodeURIComponent(record._id)}`}>{text}</Link>
        </h6>
      ),
      sorter: (a: any, b: any) => a.department.localeCompare(b.department),
    },
    {
      title: "No of Designations",
      dataIndex: "designationCount",
      render: (count: number, record: any) => (
        <span className="fw-medium">
          {count > 0 ? (
            <Link to={`${all_routes.designations}?department=${encodeURIComponent(record._id)}`}>
              {count}
            </Link>
          ) : (
            <span className="text-muted">0</span>
          )}
        </span>
      ),
      sorter: (a: any, b: any) => (a.designationCount || 0) - (b.designationCount || 0),
    },
    {
      title: "No of Employees",
      dataIndex: "employeeCount",
      render: (count: number, record: any) => (
        <span className="fw-medium">
          {count > 0 ? (
            <Link to={`${all_routes.employeeList}?department=${encodeURIComponent(record._id)}`}>
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
      render: (_test: any, department: Departments) => {
        const hasEmployees = (department.employeeCount || 0) > 0;
        const hasDesignations = (department.designationCount || 0) > 0;
        const hasPolicies = (department.policyCount || 0) > 0;
        const needsReassignment = hasEmployees || hasDesignations || hasPolicies;

        return (
          <div className="action-icon d-inline-flex">
            <Link
              to="#"
              className="me-2"
              data-bs-toggle="modal"
              data-inert={true}
              data-bs-target="#edit_department"
              onClick={() => { setEditingDept(department) }}
            >
              <i className="ti ti-edit" />
            </Link>
            <Link
              to="#"
              className="me-2"
              {...(needsReassignment ? {} : {
                'data-bs-toggle': 'modal',
                'data-bs-target': '#delete_modal',
                'data-inert': true
              })}
              onClick={(e) => {
                if (needsReassignment) {
                  e.preventDefault();
                }
                handleDeleteClick(department);
              }}
            >
              <i className="ti ti-trash" />
            </Link>
          </div>
        );
      },
    },
  ]

  const departmentsWithKey = departments.map((dept, index) => ({
    ...dept,
    key: dept._id || index.toString(),
  }));

  // helper functions
  
  // Reset Add Department form fields to default values
  const resetAddDepartmentForm = () => {
    setDepartmentName("");
    setSelectedStatus("Active");
    setError(null);
    setDepartmentNameError(null);
  };

  // Reset Edit Department validation errors
  const resetEditDepartmentForm = () => {
    setError(null);
    setEditDepartmentNameError(null);
  };

  const handleSubmit = () => {
    try {
      setDepartmentNameError(null);

      if (!departmentName.trim()) {
        setDepartmentNameError("Department Name is required");
        return;
      }

      if (!selectedStatus) {
        setDepartmentNameError("Status is required");
        return;
      }

      setIsSubmitting(true);
      const payload = {
        departmentName: departmentName,
        status: selectedStatus,
      };

      if (!socket) {
        setDepartmentNameError("Socket connection is not available.");
        setIsSubmitting(false);
        return;
      }

      socket.emit("hr/departments/add", payload);
    } catch (error) {
      if (error instanceof Error) {
        setDepartmentNameError(error.message);
      } else {
        setDepartmentNameError("An unexpected error occurred");
      }
      setIsSubmitting(false);
    }
  };

  const handleSort = (order: string) => {
    setSortOrder(order);
    if (!order) {
      setSortedDepartments(departments);
      return;
    }
    const sortedData = [...departments].sort((a, b) => {
      const nameA = a.department.toLowerCase();
      const nameB = b.department.toLowerCase();

      if (order === "ascending") {
        return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
      }
      if (order === "descending") {
        return nameA > nameB ? -1 : nameA < nameB ? 1 : 0;
      }
      return 0;
    });
    setSortedDepartments(sortedData); // may not need this later
    setDepartments(sortedData);
  };

  const applyFilters = (updatedFields: {
    status?: string;
  }) => {
    try {
      setFilters(prevFilters => {
        const newFilters = { ...prevFilters, ...updatedFields };
        if (socket) {
          socket.emit("hr/departmentsStats/get", { ...newFilters });
        }
        return newFilters;
      });
    } catch (error) {
      console.error("Error applying filters:", error);
    }
  };

  const onSelectStatus = (st: string) => {
    applyFilters({ status: st });
  };

  const handleUpdateSubmit = (editingDept: Departments) => {
    try {
      setEditDepartmentNameError(null);
      
      const { _id, department, status } = editingDept;

      if (!_id) {
        setEditDepartmentNameError("Id not found");
        return;
      }

      if (!department || !department.trim()) {
        setEditDepartmentNameError("Department Name is required");
        return;
      }

      if (!status) {
        setEditDepartmentNameError("Status is required");
        return;
      }

      setIsUpdating(true);

      // Ensure status is stored with proper capitalization
      const normalizedStatus = normalizeStatus(status);

      const payload = {
        _id,
        status: normalizedStatus,
        department,
      };

      if (socket) {
        socket.emit("hrm/departments/update", payload);
        // Modal will be closed by handleUpdateDepartmentResponse on success
      } else {
        setEditDepartmentNameError("Socket connection is not available.");
        setIsUpdating(false);
      }
    } catch (error) {
      if (error instanceof Error) {
        setEditDepartmentNameError(error.message);
      } else {
        setEditDepartmentNameError("An unexpected error occurred");
      }
      setIsUpdating(false);
    }
  };

  const deleteDepartment = (departmentId: string) => {
    try {
      setLoading(true);
      setError(null);

      if (!socket) {
        setError("Socket connection is not available");
        setLoading(false);
        return;
      }

      if (!departmentId) {
        setError("Policy ID is required");
        setLoading(false);
        return;
      }
      const data = {
        _id : departmentId,
      }   

      socket.emit("hrm/departments/delete", data);
    } catch (error) {
      setError("Failed to initiate policy deletion");
      setLoading(false);
    }
  };

  const handleReassignAndDelete = () => {
    if (!departmentToDelete || !targetDepartmentId) {
      setError("Please select a target department");
      return;
    }

    try {
      setIsReassigning(true);
      setError(null);

      const payload = {
        sourceDepartmentId: departmentToDelete._id,
        targetDepartmentId: targetDepartmentId,
      };

      if (socket) {
        socket.emit("hrm/departments/reassign-delete", payload);
      } else {
        setError("Socket connection is not available");
        setIsReassigning(false);
      }
    } catch (error) {
      setError("Failed to initiate reassignment");
      setIsReassigning(false);
    }
  };

  const handleDeleteClick = (department: Departments) => {
    const hasEmployees = (department.employeeCount || 0) > 0;
    const hasDesignations = (department.designationCount || 0) > 0;
    const hasPolicies = (department.policyCount || 0) > 0;

    setDepartmentToDelete(department);

    if (hasEmployees || hasDesignations || hasPolicies) {
      // Show reassignment modal programmatically
      setShowReassignModal(true);
      setTargetDepartmentId("");
      // Use utility function to show modal safely
      setTimeout(() => {
        showModal('reassign_delete_modal');
      }, 100);
    }
    // If no employees/designations/policies, the Bootstrap data-bs-target will handle showing delete_modal
  };

  // Get available departments for reassignment (exclude the one being deleted)
  const availableDepartments = departments.filter(
    dept => dept._id !== departmentToDelete?._id
  ).map(dept => ({
    value: dept._id,
    label: dept.department
  }));

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
              <h2 className="mb-1">Departments</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={all_routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">Employee</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Departments
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
                  data-bs-target="#add_department"
                  className="btn btn-primary d-flex align-items-center"
                  onClick={resetAddDepartmentForm}
                >
                  <i className="ti ti-circle-plus me-2" />
                  Add Department
                </Link>
              </div>
              <div className="head-icons ms-2">
                <CollapseHeader />
              </div>
            </div>
          </div>
          {/* /Breadcrumb */}
          {/* Performance Indicator list */}
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
              <h5>Department List</h5>
              <div className="d-flex my-xl-auto right-content align-items-center flex-wrap row-gap-3">
                <div className="dropdown me-3">
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    Status{filters.status ? `: ${normalizeStatus(filters.status)}` : ": None"}
                  </Link>
                  <ul className="dropdown-menu dropdown-menu-end p-3">
                    {statusChoose.map((st) => (
                      <li key={st.value}>
                        <button
                          type="button"
                          className="dropdown-item rounded-1"
                          onClick={() => onSelectStatus(st.value)}
                        >
                          {st.label}
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
              <Table dataSource={departmentsWithKey} columns={columns} Selection={true} />
            </div>
          </div>
          {/* /Performance Indicator list */}
        </div>
        <Footer />
      </div>
      {/* /Page Wrapper */}
      {/* Add Department */}
      <div className="modal fade" id="add_department">
        <div className="modal-dialog modal-dialog-centered modal-md">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Add Department</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={resetAddDepartmentForm}
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
                        Department Name <span className="text-danger">*</span>
                      </label>
                      <input 
                        type="text" 
                        className={`form-control ${departmentNameError ? 'is-invalid' : ''}`}
                        value={departmentName} 
                        onChange={(e) => {
                          setDepartmentName(e.target.value);
                          // Clear error when user starts typing
                          if (departmentNameError) {
                            setDepartmentNameError(null);
                          }
                        }} 
                      />
                      {departmentNameError && (
                        <div className="invalid-feedback d-block">
                          {departmentNameError}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Status <span className="text-danger">*</span>
                      </label>
                      <CommonSelect
                        options={statusChoose}
                        defaultValue={statusChoose.find(opt => opt.value === selectedStatus)}
                        onChange={(selectedOption) =>
                          setSelectedStatus(selectedOption ? selectedOption.value : "Active")
                        }
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
                  onClick={resetAddDepartmentForm}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  disabled={isSubmitting} 
                  onClick={handleSubmit}
                >
                  {isSubmitting ? 'Adding...' : 'Add Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Add Department */}
      {/* Edit Department */}
      <div className="modal fade" id="edit_department">
        <div className="modal-dialog modal-dialog-centered modal-md">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Edit Department</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={resetEditDepartmentForm}
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form>
              <div className="modal-body pb-0">
                <div className="row">
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Department Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className={`form-control ${editDepartmentNameError ? 'is-invalid' : ''}`}
                        value={editingDept?.department || ""}
                        onChange={(e) => {
                          setEditingDept(prev =>
                            prev ? { ...prev, department: e.target.value } : prev);
                          // Clear error when user starts typing
                          if (editDepartmentNameError) {
                            setEditDepartmentNameError(null);
                          }
                        }}
                      />
                      {editDepartmentNameError && (
                        <div className="invalid-feedback d-block">
                          {editDepartmentNameError}
                        </div>
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
                        defaultValue={statusChoose.find(d => d.value.toLowerCase() === editingDept?.status.toLowerCase()) || statusChoose[0]}
                        onChange={(selectedOption) =>
                          setEditingDept(prev =>
                            prev ? { ...prev, status: selectedOption?.value || "Active" } : prev
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
                  className="btn btn-light me-2"
                  data-bs-dismiss="modal"
                  onClick={resetEditDepartmentForm}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    if (editingDept) {
                      handleUpdateSubmit(editingDept);
                    }
                  }}
                  disabled={!editingDept || isUpdating}
                >
                  {isUpdating ? 'Updating...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Edit Department */}
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
                {departmentToDelete
                  ? `Are you sure you want to delete policy "${departmentToDelete.department}"? This cannot be undone.`
                  : "You want to delete all the marked items, this can't be undone once you delete."}
              </p>
              <div className="d-flex justify-content-center">
                <button
                  className="btn btn-light me-3"
                  data-bs-dismiss="modal"
                  onClick={() => setDepartmentToDelete(null)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  data-bs-dismiss="modal"
                  onClick={() => {
                    if (departmentToDelete) {
                      deleteDepartment(departmentToDelete._id);
                    }
                    setDepartmentToDelete(null);
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
      {/* Reassign and Delete Department */}
      <div className="modal fade" id="reassign_delete_modal">
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
                  setTargetDepartmentId("");
                  setDepartmentToDelete(null);
                }}
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="modal-body">
              <div className="alert alert-warning d-flex align-items-start mb-3">
                <i className="ti ti-alert-triangle me-2 mt-1" style={{ fontSize: "20px" }}></i>
                <div>
                  <strong>Department "{departmentToDelete?.department}" cannot be deleted directly</strong>
                  <p className="mb-0 mt-1">
                    This department has{" "}
                    {departmentToDelete && (
                      <>
                        {departmentToDelete.employeeCount > 0 && (
                          <strong>{departmentToDelete.employeeCount} employee{departmentToDelete.employeeCount > 1 ? 's' : ''}</strong>
                        )}
                        {departmentToDelete.employeeCount > 0 && (departmentToDelete.designationCount > 0 || departmentToDelete.policyCount > 0) && ", "}
                        {departmentToDelete.designationCount > 0 && (
                          <strong>{departmentToDelete.designationCount} designation{departmentToDelete.designationCount > 1 ? 's' : ''}</strong>
                        )}
                        {departmentToDelete.designationCount > 0 && departmentToDelete.policyCount > 0 && ", and "}
                        {departmentToDelete.employeeCount === 0 && departmentToDelete.designationCount === 0 && departmentToDelete.policyCount > 0 && ""}
                        {departmentToDelete.employeeCount > 0 && departmentToDelete.designationCount === 0 && departmentToDelete.policyCount > 0 && " and "}
                        {departmentToDelete.policyCount > 0 && (
                          <strong>{departmentToDelete.policyCount} polic{departmentToDelete.policyCount > 1 ? 'ies' : 'y'}</strong>
                        )}
                      </>
                    )}
                    . Please reassign them to another department before deletion.
                  </p>
                </div>
              </div>
              <div className="row">
                <div className="col-md-12">
                  <div className="mb-3">
                    <label className="form-label">
                      Reassign to Department <span className="text-danger">*</span>
                    </label>
                    <CommonSelect
                      className="select"
                      options={availableDepartments}
                      onChange={(selectedOption) =>
                        setTargetDepartmentId(selectedOption ? selectedOption.value : "")
                      }
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
                onClick={() => {
                  setShowReassignModal(false);
                  setTargetDepartmentId("");
                  setDepartmentToDelete(null);
                }}
                disabled={isReassigning}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleReassignAndDelete}
                disabled={isReassigning || !targetDepartmentId}
              >
                {isReassigning ? 'Reassigning...' : 'Reassign & Delete'}
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* /Reassign and Delete Department */}
    </>


  )
}
export default Department