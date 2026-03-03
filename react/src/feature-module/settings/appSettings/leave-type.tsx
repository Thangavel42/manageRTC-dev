import { Spin } from "antd";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CollapseHeader from "../../../core/common/collapse-header/collapse-header";
import Footer from "../../../core/common/footer";
import { useLeaveTypesREST, type LeaveType } from "../../../hooks/useLeaveTypesREST";
import { all_routes } from "../../router/all_routes";

// Loading spinner component
const LoadingSpinner = () => (
  <div style={{ textAlign: 'center', padding: '50px' }}>
    <Spin size="large" />
  </div>
);

const LeaveTypeSettings = () => {
  const routes = all_routes;

  // API hook for leave types
  const {
    leaveTypes,
    loading,
    fetchLeaveTypes,
    createLeaveType,
    updateLeaveType,
    deleteLeaveType,
    toggleLeaveTypeStatus: _toggleLeaveTypeStatus,
  } = useLeaveTypesREST();

  // Local state for form handling
  const [editingLeaveType, setEditingLeaveType] = useState<LeaveType | null>(null);
  const [deletingLeaveTypeId, setDeletingLeaveTypeId] = useState<string | null>(null);
  const [newLeaveType, setNewLeaveType] = useState({ name: '', annualQuota: 12 });

  // Fetch leave types on mount
  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  // Handle add leave type
  const handleAddLeaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeaveType.name.trim()) {
      alert('Please enter a leave type name');
      return;
    }

    const code = newLeaveType.name.toUpperCase().replace(/\s+/g, '_').substring(0, 20);
    const success = await createLeaveType({
      name: newLeaveType.name.trim(),
      code,
      annualQuota: newLeaveType.annualQuota,
      isPaid: true,
      requiresApproval: true,
    });

    if (success) {
      setNewLeaveType({ name: '', annualQuota: 12 });
      // Close modal manually (bootstrap modal)
      const modal = document.querySelector('#add_leaves');
      if (modal instanceof HTMLElement) {
        const bootstrapModal = (window as any).bootstrap?.Modal?.getInstance(modal);
        bootstrapModal?.hide();
      }
    }
  };

  // Handle update leave type
  const handleUpdateLeaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLeaveType) return;

    const success = await updateLeaveType(editingLeaveType.leaveTypeId, {
      name: editingLeaveType.name,
      annualQuota: editingLeaveType.annualQuota,
    });

    if (success) {
      setEditingLeaveType(null);
      // Close modal manually
      const modal = document.querySelector('#edit_leaves');
      if (modal instanceof HTMLElement) {
        const bootstrapModal = (window as any).bootstrap?.Modal?.getInstance(modal);
        bootstrapModal?.hide();
      }
    }
  };

  // Handle delete leave type
  const handleDeleteLeaveType = async () => {
    if (!deletingLeaveTypeId) return;

    const success = await deleteLeaveType(deletingLeaveTypeId);
    if (success) {
      setDeletingLeaveTypeId(null);
      // Close modal manually
      const modal = document.querySelector('#delete_modal');
      if (modal instanceof HTMLElement) {
        const bootstrapModal = (window as any).bootstrap?.Modal?.getInstance(modal);
        bootstrapModal?.hide();
      }
    }
  };

  // Open edit modal with leave type data
  const openEditModal = (leaveType: LeaveType) => {
    setEditingLeaveType(leaveType);
  };

  // Open delete modal
  const openDeleteModal = (leaveTypeId: string) => {
    setDeletingLeaveTypeId(leaveTypeId);
  };

  return (
    <div>
      <>
        {/* Page Wrapper */}
        <div className="page-wrapper">
          <div className="content">
            {/* Breadcrumb */}
            <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
              <div className="my-auto mb-2">
                <h2 className="mb-1">Settings</h2>
                <nav>
                  <ol className="breadcrumb mb-0">
                    <li className="breadcrumb-item">
                      <Link to={routes.adminDashboard}>
                        <i className="ti ti-smart-home" />
                      </Link>
                    </li>
                    <li className="breadcrumb-item">Administration</li>
                    <li className="breadcrumb-item active" aria-current="page">
                      Settings
                    </li>
                  </ol>
                </nav>
              </div>
              <div className="head-icons ms-2">
                <CollapseHeader />
              </div>
            </div>
            {/* /Breadcrumb */}
            <ul className="nav nav-tabs nav-tabs-solid bg-transparent border-bottom mb-3">
              <li className="nav-item">
                <Link className="nav-link " to={routes.profilesettings}>
                  <i className="ti ti-settings me-2" />
                  General Settings
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to={routes.bussinessSettings}>
                  <i className="ti ti-world-cog me-2" />
                  Website Settings
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link active" to={routes.salarySettings}>
                  <i className="ti ti-device-ipad-horizontal-cog me-2" />
                  App Settings
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to={routes.emailSettings}>
                  <i className="ti ti-server-cog me-2" />
                  System Settings
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to={routes.paymentGateways}>
                  <i className="ti ti-settings-dollar me-2" />
                  Financial Settings
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to={routes.customCss}>
                  <i className="ti ti-settings-2 me-2" />
                  Other Settings
                </Link>
              </li>
            </ul>
            <div className="row">
              <div className="col-xl-3 theiaStickySidebar">
                <div className="card">
                  <div className="card-body">
                    <div className="d-flex flex-column list-group settings-list">
                      <Link
                        to={routes.salarySettings}
                        className="d-inline-flex align-items-center rounded  py-2 px-3"
                      >
                        Salary Settings
                      </Link>
                      <Link
                        to={routes.approvalSettings}
                        className="d-inline-flex align-items-center rounded py-2 px-3"
                      >
                        Approval Settings
                      </Link>
                      <Link
                        to={routes.approvalSettings}
                        className="d-inline-flex align-items-center rounded py-2 px-3"
                      >
                        Invoice Settings
                      </Link>
                      <Link
                        to={routes.leaveType}
                        className="d-inline-flex align-items-center rounded active py-2 px-3"
                      >
                        <i className="ti ti-arrow-badge-right me-2" />
                        Leave Type
                      </Link>
                      <Link
                        to={routes.customFields}
                        className="d-inline-flex align-items-center rounded py-2 px-3"
                      >
                        Custom Fields
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-xl-9">
                <div className="card">
                  <div className="card-body">
                    <div className="border-bottom d-flex align-items-center justify-content-between pb-3 mb-3">
                      <h4>Leave Type</h4>
                      <div>
                        <Link
                          to="#"
                          data-bs-toggle="modal"
                          data-bs-target="#add_leaves"
                          className="btn btn-primary d-flex align-items-center"
                        >
                          <i className="ti ti-circle-plus me-2" />
                          Add Leave Type
                        </Link>
                      </div>
                    </div>
                    <div className="card-body p-0">
                      <div className="card mb-0">
                        <div className="card-header d-flex align-items-center justify-content-between">
                          <h6>Leave Type List</h6>
                        </div>
                        <div className="table-responsive">
                          {loading ? (
                            <LoadingSpinner />
                          ) : (
                            <table className="table">
                              <thead className="thead-light">
                                <tr>
                                  <th className="no-sort">
                                    <div className="form-check form-check-md">
                                      <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id="select-all"
                                      />
                                    </div>
                                  </th>
                                  <th>Leave Type</th>
                                  <th>Code</th>
                                  <th>Leave Days</th>
                                  <th>Status</th>
                                  <th />
                                </tr>
                              </thead>
                              <tbody>
                                {leaveTypes.length === 0 ? (
                                  <tr>
                                    <td colSpan={6} className="text-center py-4">
                                      No leave types found. Click "Add Leave Type" to create one.
                                    </td>
                                  </tr>
                                ) : (
                                  leaveTypes.map((leaveType) => (
                                    <tr key={leaveType.leaveTypeId}>
                                      <td>
                                        <div className="form-check form-check-md">
                                          <input
                                            className="form-check-input"
                                            type="checkbox"
                                          />
                                        </div>
                                      </td>
                                      <td className="text-dark">{leaveType.name}</td>
                                      <td><span className="badge bg-light text-dark">{leaveType.code}</span></td>
                                      <td>{leaveType.annualQuota}</td>
                                      <td>
                                        <span className={`badge ${leaveType.isActive ? 'badge-success' : 'badge-secondary'}`}>
                                          <i className="ti ti-point-filled" />
                                          {leaveType.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                      </td>
                                      <td>
                                        <div className="action-icon d-inline-flex">
                                          <Link
                                            to="#"
                                            className="me-2"
                                            data-bs-toggle="modal"
                                            data-bs-target="#edit_leaves"
                                            onClick={() => openEditModal(leaveType)}
                                          >
                                            <i className="ti ti-edit" />
                                          </Link>
                                          <Link
                                            to="#"
                                            data-bs-toggle="modal"
                                            data-bs-target="#delete_modal"
                                            onClick={() => openDeleteModal(leaveType.leaveTypeId)}
                                          >
                                            <i className="ti ti-trash" />
                                          </Link>
                                        </div>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Footer />
        </div>
        {/* /Page Wrapper */}
      </>

      <>
        {/* Add Leaves */}
        <div className="modal fade" id="add_leaves">
          <div className="modal-dialog modal-dialog-centered modal-md">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">Add Leave Type</h4>
                <button
                  type="button"
                  className="btn-close custom-btn-close"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                >
                  <i className="ti ti-x" />
                </button>
              </div>
              <form onSubmit={handleAddLeaveType}>
                <div className="modal-body pb-0">
                  <div className="row">
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">
                          Leave Type <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={newLeaveType.name}
                          onChange={(e) => setNewLeaveType({ ...newLeaveType, name: e.target.value })}
                          placeholder="e.g., Annual Leave"
                        />
                      </div>
                    </div>
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">
                          Number of days per year <span className="text-danger">*</span>
                        </label>
                        <input
                          type="number"
                          className="form-control"
                          value={newLeaveType.annualQuota}
                          onChange={(e) => setNewLeaveType({ ...newLeaveType, annualQuota: parseInt(e.target.value) || 0 })}
                          min="0"
                          max="365"
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
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                  >
                    Add Leave Type
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        {/* /Add Leaves */}
        {/* Edit Leaves */}
        <div className="modal fade" id="edit_leaves">
          <div className="modal-dialog modal-dialog-centered modal-md">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">Edit Leave Type</h4>
                <button
                  type="button"
                  className="btn-close custom-btn-close"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                >
                  <i className="ti ti-x" />
                </button>
              </div>
              <form onSubmit={handleUpdateLeaveType}>
                <div className="modal-body pb-0">
                  <div className="row">
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">
                          Leave Type <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={editingLeaveType?.name || ''}
                          onChange={(e) => setEditingLeaveType(prev => prev ? { ...prev, name: e.target.value } : null)}
                        />
                      </div>
                    </div>
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">
                          Number of days per year <span className="text-danger">*</span>
                        </label>
                        <input
                          type="number"
                          className="form-control"
                          value={editingLeaveType?.annualQuota || 0}
                          onChange={(e) => setEditingLeaveType(prev => prev ? { ...prev, annualQuota: parseInt(e.target.value) || 0 } : null)}
                          min="0"
                          max="365"
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
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        {/* /Edit Leaves */}
        {/* Delete Modal */}
        <div className="modal fade" id="delete_modal">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-body text-center">
                <span className="avatar avatar-xl bg-transparent-danger text-danger mb-3">
                  <i className="ti ti-trash-x fs-36" />
                </span>
                <h4 className="mb-1">Confirm Delete</h4>
                <p className="mb-3">
                  Are you sure you want to delete this leave type? This action cannot be undone.
                </p>
                <div className="d-flex justify-content-center">
                  <Link
                    to="#"
                    className="btn btn-light me-3"
                    data-bs-dismiss="modal"
                  >
                    Cancel
                  </Link>
                  <Link
                    to="#"
                    className="btn btn-danger"
                    data-bs-dismiss="modal"
                    onClick={handleDeleteLeaveType}
                  >
                    Yes, Delete
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* /Delete Modal */}
      </>
    </div>
  );
};

export default LeaveTypeSettings;
