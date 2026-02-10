import React, { useState, useEffect } from "react";
import { status } from "../../core/common/selectoption/selectoption";
import CommonSelect from "../../core/common/commonSelect";
import { all_routes } from "../router/all_routes";
import { Link } from "react-router-dom";
import Table from "../../core/common/dataTable/index";
import CollapseHeader from "../../core/common/collapse-header/collapse-header";
import Footer from "../../core/common/footer";

// API Base URL
const API_BASE = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

const RolesPermission = () => {
  // State
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [newRole, setNewRole] = useState({ name: '', displayName: '', description: '', isActive: true });
  const [submitting, setSubmitting] = useState(false);

  // Fetch roles
  useEffect(() => {
    fetchRoles();
  }, []);

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
        setNewRole({ name: '', displayName: '', description: '', isActive: true });
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
      render: (text: string, record: any) => (
        <div>
          <span className="fw-medium">{text}</span>
          {record.type === 'system' && (
            <span className="badge bg-info ms-2">System</span>
          )}
          {record.isDefault && (
            <span className="badge bg-secondary ms-2">Default</span>
          )}
        </div>
      ),
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
      render: (_: any, record: any) => (
        <div className="action-icon d-inline-flex">
          <Link to={all_routes.permissionpage} className="me-2" title="Permissions">
            <i className="ti ti-shield" />
          </Link>
          <button
            className="btn btn-link p-0 me-2"
            onClick={() => openEditModal(record)}
            title="Edit Role"
            disabled={record.type === 'system'}
          >
            <i className={`ti ti-edit ${record.type === 'system' ? 'text-muted' : ''}`} />
          </button>
          <button
            className="btn btn-link p-0"
            onClick={() => handleDeleteRole(record._id)}
            title="Delete Role"
            disabled={record.type === 'system'}
          >
            <i className={`ti ti-trash ${record.type === 'system' ? 'text-muted' : ''}`} />
          </button>
        </div>
      ),
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
