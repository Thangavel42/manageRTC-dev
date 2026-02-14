import React, { useState, useEffect } from "react";
import { all_routes } from "../router/all_routes";
import { Link } from "react-router-dom";
import CollapseHeader from "../../core/common/collapse-header/collapse-header";
import Footer from "../../core/common/footer";

// API Base URL
const API_BASE = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

// Permission actions that will be shown in detail modal
const PERMISSION_ACTIONS = ['read', 'create', 'write', 'delete', 'import', 'export'];

const ACTION_LABELS: Record<string, string> = {
  read: 'View',
  create: 'Add',
  write: 'Edit',
  delete: 'Remove',
  import: 'Import',
  export: 'Export',
  all: 'All',
};

const PermissionMatrix = () => {
  // State
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]); // All available pages
  const [permissionMatrix, setPermissionMatrix] = useState<Map<string, Map<string, any>>>(new Map());
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ roleId: string; pageId: string; pageName: string; roleName: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetch initial data
  useEffect(() => {
    fetchRoles();
    fetchAllPermissions();
  }, []);

  // Fetch all roles
  const fetchRoles = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/rbac/roles`);
      const data = await response.json();
      if (data.success) {
        setRoles(data.data);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  // Fetch all available permissions (pages)
  const fetchAllPermissions = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/rbac/permissions/grouped`);
      const data = await response.json();
      if (data.success && data.data) {
        // Flatten all permissions from all categories
        const allPerms: any[] = [];
        data.data.forEach((category: any) => {
          category.permissions.forEach((perm: any) => {
            allPerms.push(perm);
          });
        });
        setPermissions(allPerms);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch permission matrix data (all roles × all permissions)
  const fetchPermissionMatrix = async () => {
    setLoading(true);
    const matrix = new Map<string, Map<string, any>>();

    try {
      // Fetch permissions for each role
      for (const role of roles) {
        const response = await fetch(`${API_BASE}/api/rbac/roles/${role._id}/permissions`);
        const data = await response.json();

        if (data.success && data.data.flat) {
          const rolePermissions = new Map<string, any>();
          data.data.flat.forEach((perm: any) => {
            rolePermissions.set(perm.pageId || perm.permissionId, perm);
          });
          matrix.set(role._id, rolePermissions);
        }
      }

      setPermissionMatrix(matrix);
    } catch (error) {
      console.error('Error fetching permission matrix:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch matrix when roles and permissions are loaded
  useEffect(() => {
    if (roles.length > 0 && permissions.length > 0) {
      fetchPermissionMatrix();
    }
  }, [roles, permissions]);

  // Check if a role has any access to a page
  const hasPageAccess = (roleId: string, pageId: string): boolean => {
    const rolePerms = permissionMatrix.get(roleId);
    if (!rolePerms) return false;
    const perm = rolePerms.get(pageId);
    if (!perm) return false;
    return perm.actions?.all || perm.actions?.read || perm.actions?.create || perm.actions?.write || perm.actions?.delete;
  };

  // Get access level badge for a cell
  const getAccessBadge = (roleId: string, pageId: string) => {
    const rolePerms = permissionMatrix.get(roleId);
    if (!rolePerms) return <span className="text-muted">-</span>;

    const perm = rolePerms.get(pageId);
    if (!perm) return <span className="text-muted">-</span>;

    if (perm.actions?.all) {
      return <span className="badge bg-success">All</span>;
    }

    const hasActions = Object.values(perm.actions || {}).filter((v: boolean) => v).length;
    if (hasActions === 0) return <span className="text-muted">-</span>;

    return <span className="badge bg-info">{hasActions}</span>;
  };

  // Open detail modal for a specific cell
  const openDetailModal = (roleId: string, pageId: string, pageName: string, roleName: string) => {
    setSelectedCell({ roleId, pageId, pageName, roleName });
    setShowDetailModal(true);
  };

  // Handle permission action toggle in detail modal
  const handleActionToggle = async (action: string, currentValue: boolean) => {
    if (!selectedCell) return;

    const rolePerms = permissionMatrix.get(selectedCell.roleId);
    const perm = rolePerms?.get(selectedCell.pageId);

    if (!perm) {
      // Need to create new permission entry
      await createPermissionEntry(selectedCell.roleId, selectedCell.pageId, action);
      return;
    }

    // Update existing permission
    const newActions = { ...perm.actions, [action]: !currentValue };

    // If "all" is checked, check all other actions
    if (action === 'all' && !currentValue) {
      newActions.read = true;
      newActions.create = true;
      newActions.write = true;
      newActions.delete = true;
      newActions.import = true;
      newActions.export = true;
    }

    // If "all" is unchecked, uncheck all other actions
    if (action === 'all' && currentValue) {
      newActions.read = false;
      newActions.create = false;
      newActions.write = false;
      newActions.delete = false;
      newActions.import = false;
      newActions.export = false;
    }

    await updatePermissionEntry(selectedCell.roleId, selectedCell.pageId, newActions);
  };

  // Create new permission entry
  const createPermissionEntry = async (roleId: string, pageId: string, action: string) => {
    setSaving(true);
    try {
      const actions: any = { all: false, read: false, create: false, write: false, delete: false, import: false, export: false };
      actions[action] = true;

      // First, get the page details to build full permission entry
      const pageDetails = permissions.find(p => (p.pageId === pageId || p.permissionId === pageId));

      // Save to backend
      const response = await fetch(`${API_BASE}/api/rbac/roles/${roleId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permissions: [{
            pageId: pageId,
            permissionId: pageDetails?.permissionId || pageId,
            module: pageDetails?.module || 'unknown',
            displayName: pageDetails?.displayName || 'Unknown',
            category: pageDetails?.category || 'other',
            route: pageDetails?.route || null,
            actions: actions,
          }]
        }),
      });

      if (response.ok) {
        // Refresh matrix
        await fetchPermissionMatrix();
        setShowDetailModal(false);
      } else {
        alert('Failed to update permissions');
      }
    } catch (error) {
      console.error('Error creating permission entry:', error);
      alert('Failed to update permissions');
    } finally {
      setSaving(false);
    }
  };

  // Update existing permission entry
  const updatePermissionEntry = async (roleId: string, pageId: string, actions: any) => {
    setSaving(true);
    try {
      // First get all current permissions for this role
      const rolePerms = permissionMatrix.get(roleId);
      if (!rolePerms) return;

      // Build the full permissions array
      const permissionsArray = Array.from(rolePerms.values()).map((perm: any) => ({
        pageId: perm.pageId,
        permissionId: perm.permissionId,
        module: perm.module,
        displayName: perm.displayName,
        category: perm.category,
        route: perm.route,
        actions: perm.pageId === pageId ? actions : perm.actions,
      }));

      // Save to backend
      const response = await fetch(`${API_BASE}/api/rbac/roles/${roleId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: permissionsArray }),
      });

      if (response.ok) {
        // Update local state
        const perm = rolePerms.get(pageId);
        if (perm) {
          perm.actions = actions;
          setPermissionMatrix(new Map(permissionMatrix));
        }
      } else {
        alert('Failed to update permissions');
      }
    } catch (error) {
      console.error('Error updating permission entry:', error);
      alert('Failed to update permissions');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="text-center p-5">Loading Permission Matrix...</div>
        </div>
      </div>
    );
  }

  // Get visible columns (first 6 for better UX, with view more option)
  const visibleColumns = permissions.slice(0, 6);
  const hasMoreColumns = permissions.length > 6;

  return (
    <>
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Permission Matrix</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={all_routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">Administration</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Permission Matrix
                  </li>
                </ol>
              </nav>
            </div>
            <div className="head-icons">
              <CollapseHeader />
            </div>
          </div>

          {/* Info Alert */}
          <div className="alert alert-info mb-3">
            <i className="ti ti-info me-2"></i>
            <strong>Quick Overview:</strong> Click any cell to view/edit detailed permissions for that role and page.
            Green = All Access | Blue = Partial Access | Gray = No Access
          </div>

          {/* Permission Matrix Table */}
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h5 className="mb-0">Roles × Pages Matrix</h5>
              <div>
                <button className="btn btn-sm btn-light me-2" onClick={fetchPermissionMatrix}>
                  <i className="ti ti-refresh me-1"></i> Refresh
                </button>
                <Link to={all_routes.permissionpage} className="btn btn-sm btn-primary">
                  <i className="ti ti-settings me-1"></i> Manage Permissions
                </Link>
              </div>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-bordered table-striped mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ minWidth: '150px' }}>Role</th>
                      {visibleColumns.map((perm) => (
                        <th key={perm.pageId || perm.permissionId} className="text-center">
                          <div className="text-truncate" style={{ maxWidth: '120px' }} title={perm.displayName}>
                            {perm.displayName}
                          </div>
                        </th>
                      ))}
                      {hasMoreColumns && (
                        <th className="text-center">
                          +{permissions.length - 6} more
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map((role) => (
                      <tr key={role._id}>
                        <td>
                          <div>
                            <div className="fw-medium">{role.displayName}</div>
                            <small className="text-muted">Level: {role.level}</small>
                          </div>
                        </td>
                        {visibleColumns.map((perm) => {
                          const pageId = perm.pageId || perm.permissionId;
                          const hasAccess = hasPageAccess(role._id, pageId);

                          return (
                            <td
                              key={pageId}
                              className="text-center"
                              style={{ cursor: 'pointer' }}
                              onClick={() => openDetailModal(
                                role._id,
                                pageId,
                                perm.displayName,
                                role.displayName
                              )}
                            >
                              {getAccessBadge(role._id, pageId)}
                            </td>
                          );
                        })}
                        {hasMoreColumns && (
                          <td className="text-center text-muted">
                            <Link to={all_routes.permissionpage} className="btn btn-sm btn-link">
                              View All
                            </Link>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedCell && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">
                  {selectedCell.roleName} → {selectedCell.pageName}
                </h4>
                <button
                  type="button"
                  className="btn-close custom-btn-close"
                  onClick={() => setShowDetailModal(false)}
                >
                  <i className="ti ti-x" />
                </button>
              </div>
              <div className="modal-body">
                <p className="text-muted mb-3">
                  Select the actions this role can perform on this page:
                </p>
                <div className="row g-3">
                  {PERMISSION_ACTIONS.map((action) => {
                    const rolePerms = permissionMatrix.get(selectedCell.roleId);
                    const perm = rolePerms?.get(selectedCell.pageId);
                    const currentValue = perm?.actions?.[action] || false;
                    const allValue = perm?.actions?.all || false;

                    return (
                      <div key={action} className="col-4">
                        <div className="form-check form-check-card">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={`action-${action}`}
                            checked={allValue || currentValue}
                            disabled={allValue && action !== 'all'}
                            onChange={() => handleActionToggle(action, currentValue)}
                          />
                          <label className="form-check-label" htmlFor={`action-${action}`}>
                            {ACTION_LABELS[action] || action}
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={() => setShowDetailModal(false)}
                  disabled={saving}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PermissionMatrix;
