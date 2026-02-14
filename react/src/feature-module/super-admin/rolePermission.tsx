import React, { useState, useEffect } from "react";
import { status } from "../../core/common/selectoption/selectoption";
import CommonSelect from "../../core/common/commonSelect";
import { all_routes } from "../router/all_routes";
import { Link } from "react-router-dom";
import Table from "../../core/common/dataTable/index";
import CollapseHeader from "../../core/common/collapse-header/collapse-header";
import Footer from "../../core/common/footer";

// API Base URL
const API_BASE = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

// Role level configuration for UI
const ROLE_LEVELS = [
  { level: 1, name: 'Super Admin', type: 'system', description: 'Full system access' },
  { level: 10, name: 'Admin', type: 'system', description: 'Administrative access' },
  { level: 20, name: 'Manager', type: 'custom', description: 'Department management' },
  { level: 50, name: 'HR', type: 'custom', description: 'HR functions' },
  { level: 60, name: 'Team Lead', type: 'custom', description: 'Team leadership' },
  { level: 100, name: 'Employee', type: 'custom', description: 'Basic employee access' },
];

const RolesPermission = () => {
  // State
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [newRole, setNewRole] = useState({ name: '', displayName: '', description: '', isActive: true, level: 100 });
  const [submitting, setSubmitting] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<any>(null);

  // Fetch roles and current user role on mount
  useEffect(() => {
    fetchRoles();
    // Get current user's role for level-based permissions
    const userRole = (window as any).user?.role || (window as any).user?.roleId;
    if (userRole) {
      setCurrentUserRole(userRole);
    }
  }, []);

  // Helper: Get max level user can create
  const getMaxCreatableLevel = () => {
    if (!currentUserRole) return 100;
    return currentUserRole.level;
  };

  // Helper: Check if user can create role with given level
  const canCreateRoleWithLevel = (targetLevel: number) => {
    if (!currentUserRole) return true;
    // Super Admin (level 1) can create any
    if (currentUserRole.level === 1) return true;
    // Can only create roles with equal or higher level number (lower privilege)
    return targetLevel >= currentUserRole.level;
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/rbac/roles/with-summary`);
      const data = await response.json();
      if (data.success) {
        setRoles(data.data);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/api/rbac/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRole),
      });

      const data = await response.json();
      if (data.success) {
        setShowAddModal(false);
        setNewRole({ name: '', displayName: '', description: '', isActive: true, level: 100 });
        await fetchRoles();
      } else {
        alert(data.error?.message || 'Failed to create role');
      }
    } catch (error) {
      console.error('Error creating role:', error);
      alert('Failed to create role');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;

    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/api/rbac/roles/${editingRole._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingRole),
      });

      const data = await response.json();
      if (data.success) {
        setShowEditModal(false);
        setEditingRole(null);
        await fetchRoles();
      } else {
        alert(data.error?.message || 'Failed to update role');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Failed to update role');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!window.confirm('Are you sure you want to delete this role?')) return;

    try {
      const response = await fetch(`${API_BASE}/api/rbac/roles/${roleId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        await fetchRoles();
      } else {
        alert(data.error?.message || 'Failed to delete role');
      }
    } catch (error) {
      console.error('Error deleting role:', error);
      alert('Failed to delete role');
    }
  };

  const openEditModal = (role: any) => {
    setEditingRole(role);
    setShowEditModal(true);
  };

  const columns = [
    {
      title: "Role Name",
      dataIndex: "displayName",
      sorter: (a: any, b: any) => a.displayName.localeCompare(b.displayName),
      render: (text: string, record: any) => {
        const canEditThisRole = currentUserRole ?
          (currentUserRole.level === 1 || record.level >= currentUserRole.level) : true;

        return (
          <div>
            <span className="fw-medium">{text}</span>
            {record.type === 'system' && (
              <span className="badge bg-info ms-2">System</span>
            )}
            {record.isDefault && (
              <span className="badge bg-secondary ms-2">Default</span>
            )}
            {currentUserRole && (
              <span className={`badge ms-2 ${canEditThisRole ? 'bg-success' : 'bg-warning'}`}>
                {canEditThisRole ? 'Can Edit' : 'View Only'}
              </span>
            )}
          </div>
        );
      },
    },
    {
      title: "Name",
      dataIndex: "name",
      sorter: (a: any, b: any) => a.name.localeCompare(b.name),
      render: (text: string) => <code className="text-muted">{text}</code>,
    },
    {
      title: "Description",
      dataIndex: "description",
      render: (text: string) => text || <span className="text-muted">-</span>,
    },
    {
      title: "Permissions",
      dataIndex: "permissionCount",
      render: (count: number) => (
        <span className="badge bg-light text-dark">{count || 0} modules</span>
      ),
    },
    {
      title: "Status",
      dataIndex: "isActive",
      render: (isActive: boolean) => (
        <span
          className={`badge d-inline-flex align-items-center badge-xs ${
            isActive ? "badge-success" : "badge-danger"
          }`}
        >
          <i className="ti ti-point-filled me-1"></i>
          {isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      title: "Actions",
      render: (_: any, record: any) => {
        const canEdit = currentUserRole ?
          (currentUserRole.level === 1 || record.level >= currentUserRole.level) : true;
        const isSystemRole = record.type === 'system';

        let editTitle = "Edit Role";
        let deleteTitle = "Delete Role";

        if (isSystemRole) {
          editTitle = "System roles cannot be edited";
          deleteTitle = "System roles cannot be deleted";
        } else if (!canEdit) {
          editTitle = `Your level (${currentUserRole?.level}) is too high to edit this role`;
          deleteTitle = `Your level (${currentUserRole?.level}) is too high to delete this role`;
        }

        return (
          <div className="action-icon d-inline-flex">
            <Link to={all_routes.permissionpage} className="me-2" title="Manage Permissions">
              <i className="ti ti-shield" />
            </Link>
            <button
              className="btn btn-link p-0 me-2"
              onClick={() => openEditModal(record)}
              title={editTitle}
              disabled={isSystemRole || !canEdit}
            >
              <i className={`ti ti-edit ${(isSystemRole || !canEdit) ? 'text-muted' : ''}`} />
            </button>
            <button
              className="btn btn-link p-0"
              onClick={() => handleDeleteRole(record._id)}
              title={deleteTitle}
              disabled={isSystemRole || !canEdit}
            >
              <i className={`ti ti-trash ${(isSystemRole || !canEdit) ? 'text-muted' : ''}`} />
            </button>
          </div>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="text-center p-5">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Roles</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={all_routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">Administration</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Roles
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
              <div className="mb-2">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="btn btn-primary d-flex align-items-center"
                >
                  <i className="ti ti-circle-plus me-2" />
                  Add New Role
                </button>
              </div>
              <div className="head-icons ms-2">
                <CollapseHeader />
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="row">
            {/* Total Roles */}
            <div className="col-lg-3 col-md-6 d-flex">
              <div className="card flex-fill">
                <div className="card-body d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center overflow-hidden">
                    <div>
                      <span className="avatar avatar-lg bg-dark rounded-circle">
                        <i className="ti ti-user-shield" />
                      </span>
                    </div>
                    <div className="ms-2 overflow-hidden">
                      <p className="fs-12 fw-medium mb-1 text-truncate">
                        Total Roles
                      </p>
                      <h4>{roles.length}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* /Total Roles */}
            {/* Active Roles */}
            <div className="col-lg-3 col-md-6 d-flex">
              <div className="card flex-fill">
                <div className="card-body d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center overflow-hidden">
                    <div>
                      <span className="avatar avatar-lg bg-success rounded-circle">
                        <i className="ti ti-check" />
                      </span>
                    </div>
                    <div className="ms-2 overflow-hidden">
                      <p className="fs-12 fw-medium mb-1 text-truncate">
                        Active Roles
                      </p>
                      <h4>{roles.filter(r => r.isActive).length}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* /Active Roles */}
            {/* System Roles */}
            <div className="col-lg-3 col-md-6 d-flex">
              <div className="card flex-fill">
                <div className="card-body d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center overflow-hidden">
                    <div>
                      <span className="avatar avatar-lg bg-info rounded-circle">
                        <i className="ti ti-lock" />
                      </span>
                    </div>
                    <div className="ms-2 overflow-hidden">
                      <p className="fs-12 fw-medium mb-1 text-truncate">
                        System Roles
                      </p>
                      <h4>{roles.filter(r => r.type === 'system').length}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* /System Roles */}
            {/* Custom Roles */}
            <div className="col-lg-3 col-md-6 d-flex">
              <div className="card flex-fill">
                <div className="card-body d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center overflow-hidden">
                    <div>
                      <span className="avatar avatar-lg bg-warning rounded-circle">
                        <i className="ti ti-user-edit" />
                      </span>
                    </div>
                    <div className="ms-2 overflow-hidden">
                      <p className="fs-12 fw-medium mb-1 text-truncate">
                        Custom Roles
                      </p>
                      <h4>{roles.filter(r => r.type !== 'system').length}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* /Custom Roles */}
          </div>
          {/* /Stats Cards */}

          {/* Role Hierarchy Visualization */}
          <div className="card mb-3">
            <div className="card-header">
              <h5 className="mb-0">Role Hierarchy & Creation Rules</h5>
            </div>
            <div className="card-body">
              <div className="alert alert-info mb-3">
                <i className="ti ti-info me-2"></i>
                <strong>How it works:</strong> You can only create roles with equal or higher level numbers (lower privilege).
                <br />
                <small>Example: Level 50 (HR) can create Level 100 (Employee) but NOT Level 1 (Super Admin)</small>
              </div>
              <div className="table-responsive">
                <table className="table table-bordered table-striped">
                  <thead className="table-light">
                    <tr>
                      <th>Can Create ↓ / Role →</th>
                      {ROLE_LEVELS.map((level) => (
                        <th key={level.level} className="text-center">
                          <div>
                            <div className="fw-bold">{level.name}</div>
                            <small className="text-muted">Level {level.level}</small>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ROLE_LEVELS.map((creatorLevel) => {
                      const canCreateAll = creatorLevel.level === 1; // Super Admin can create all
                      return (
                        <tr key={creatorLevel.level}>
                          <td>
                            <div className="fw-medium">{creatorLevel.name}</div>
                            <small className="text-muted">Level {creatorLevel.level}</small>
                          </td>
                          {ROLE_LEVELS.map((targetLevel) => {
                            const canCreate = canCreateAll || targetLevel.level >= creatorLevel.level;
                            const isSelf = creatorLevel.level === targetLevel.level;
                            return (
                              <td key={targetLevel.level} className="text-center">
                                {canCreate ? (
                                  <span className="badge bg-light-success text-success">
                                    {isSelf ? 'Self' : '✓'}
                                  </span>
                                ) : (
                                  <span className="badge bg-light-danger text-danger">
                                    <i className="ti ti-lock me-1"></i>Blocked
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-3">
                <small className="text-muted">
                  <i className="ti ti-shield-check me-1"></i>
                  <strong>Your Current Level:</strong> {currentUserRole?.level || 'Unknown'} ({currentUserRole?.displayName || 'Guest'})
                  <span className="ms-3">
                    <i className="ti ti-circle-plus me-1"></i>
                    <strong>Can Create Up To Level:</strong> {getMaxCreatableLevel()} or higher
                  </span>
                </small>
              </div>
            </div>
          </div>

          {/* Roles Table */}
          <div className="card">
            <div className="card-header">
              <h5>Roles List</h5>
            </div>
            <div className="card-body p-0">
              <Table dataSource={roles} columns={columns} Selection={false} />
            </div>
          </div>
        </div>
        <Footer />
      </div>

      {/* Add Role Modal */}
      {showAddModal && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">Add New Role</h4>
                <button
                  type="button"
                  className="btn-close custom-btn-close"
                  onClick={() => setShowAddModal(false)}
                >
                  <i className="ti ti-x" />
                </button>
              </div>
              <form onSubmit={handleCreateRole}>
                <div className="modal-body pb-0">
                  <div className="row">
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">Role Name *</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g., sales-manager"
                          value={newRole.name}
                          onChange={(e) => setNewRole({ ...newRole, name: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                          required
                        />
                        <small className="text-muted">Unique identifier (lowercase, hyphens only)</small>
                      </div>
                    </div>
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">Display Name *</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g., Sales Manager"
                          value={newRole.displayName}
                          onChange={(e) => setNewRole({ ...newRole, displayName: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">Description</label>
                        <textarea
                          className="form-control"
                          rows={3}
                          placeholder="Role description..."
                          value={newRole.description}
                          onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">Status</label>
                        <CommonSelect
                          className="select"
                          options={status}
                          defaultValue={status[0]}
                          onChange={(selected: any) => setNewRole({ ...newRole, isActive: selected.value === 'Active' })}
                        />
                      </div>
                    </div>
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">Privilege Level *</label>
                        <select
                          className="form-select"
                          value={newRole.level}
                          onChange={(e) => setNewRole({ ...newRole, level: parseInt(e.target.value) })}
                          required
                        >
                          {ROLE_LEVELS.map((roleLevel) => {
                            const canCreate = canCreateRoleWithLevel(roleLevel.level);
                            return (
                              <option
                                key={roleLevel.level}
                                value={roleLevel.level}
                                disabled={!canCreate}
                                className={!canCreate ? 'text-muted' : ''}
                              >
                                {roleLevel.name} (Level: {roleLevel.level})
                                {!canCreate && ' - 🔒 Not Available'}
                              </option>
                            );
                          })}
                        </select>
                        <small className="text-muted">
                          Higher privilege = Lower number (1 = Super Admin, 100 = Basic)
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-light me-2"
                    onClick={() => setShowAddModal(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? 'Creating...' : 'Create Role'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {showEditModal && editingRole && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">Edit Role</h4>
                <button
                  type="button"
                  className="btn-close custom-btn-close"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingRole(null);
                  }}
                >
                  <i className="ti ti-x" />
                </button>
              </div>
              <form onSubmit={handleUpdateRole}>
                <div className="modal-body pb-0">
                  {currentUserRole && (
                    <div className="alert alert-info mb-3">
                      <i className="ti ti-info me-2"></i>
                      <strong>Your Role:</strong> {currentUserRole.displayName} (Level: {currentUserRole.level})
                      <span className="ms-3">•</span> Can create roles with level <strong className="text-success">≥ {getMaxCreatableLevel()}</strong> or higher
                    </div>
                  )}
                  <div className="row">
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">Role Name</label>
                        <input
                          type="text"
                          className="form-control"
                          value={editingRole.name}
                          disabled={editingRole.type === 'system'}
                          onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                        />
                        {editingRole.type === 'system' && (
                          <small className="text-muted">System roles cannot be renamed</small>
                        )}
                      </div>
                    </div>
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">Display Name *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={editingRole.displayName}
                          onChange={(e) => setEditingRole({ ...editingRole, displayName: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">Description</label>
                        <textarea
                          className="form-control"
                          rows={3}
                          value={editingRole.description || ''}
                          onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">Privilege Level *</label>
                        <select
                          className="form-select"
                          value={editingRole.level}
                          disabled={editingRole.type === 'system'}
                          onChange={(e) => setEditingRole({ ...editingRole, level: parseInt(e.target.value) })}
                        >
                          {ROLE_LEVELS.map((roleLevel) => {
                            const canEdit = currentUserRole ? (currentUserRole.level === 1 || editingRole.level >= currentUserRole.level) : true;
                            return (
                              <option
                                key={roleLevel.level}
                                value={roleLevel.level}
                                disabled={!canEdit}
                                className={!canEdit ? 'text-muted' : ''}
                              >
                                {roleLevel.name} (Level: {roleLevel.level})
                              </option>
                            );
                          })}
                        </select>
                        <small className="text-muted">
                          Higher privilege = Lower number (1 = Super Admin, 100 = Basic)
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-light me-2"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingRole(null);
                    }}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RolesPermission;
