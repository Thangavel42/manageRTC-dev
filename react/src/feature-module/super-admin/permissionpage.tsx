import React, { useState, useEffect } from "react";
import { all_routes } from "../router/all_routes";
import { Link } from "react-router-dom";
import CollapseHeader from "../../core/common/collapse-header/collapse-header";
import Footer from "../../core/common/footer";

// API Base URL
const API_BASE = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

// Types
interface PermissionAction {
  all: boolean;
  read: boolean;
  create: boolean;
  write: boolean;
  delete: boolean;
  import: boolean;
  export: boolean;
}

interface RolePermission {
  permissionId: string;
  module: string;
  displayName: string;
  category: string;
  actions: PermissionAction;
}

interface GroupedPermissions {
  category: string;
  permissions: RolePermission[];
}

const ACTIONS = ['all', 'read', 'create', 'write', 'delete', 'import', 'export'] as const;

const ACTION_LABELS: Record<string, string> = {
  all: 'Allow All',
  read: 'Read',
  create: 'Create',
  write: 'Write',
  delete: 'Delete',
  import: 'Import',
  export: 'Export',
};

// Default empty actions
const EMPTY_ACTIONS: PermissionAction = {
  all: false,
  read: false,
  create: false,
  write: false,
  delete: false,
  import: false,
  export: false,
};

const PermissionPage = () => {
  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [allPermissions, setAllPermissions] = useState<GroupedPermissions[]>([]); // All available permissions
  const [groupedPermissions, setGroupedPermissions] = useState<GroupedPermissions[]>([]); // Current role's permissions
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Fetch roles and all permissions on mount
  useEffect(() => {
    fetchRoles();
    fetchAllPermissions();
  }, []);

  // Fetch role's assigned permissions when role changes
  useEffect(() => {
    if (selectedRole && allPermissions.length > 0) {
      fetchRolePermissions();
      // Expand all categories by default
      const categories = allPermissions.map(g => g.category);
      setExpandedCategories(new Set(categories));
    }
  }, [selectedRole, allPermissions]);

  const fetchRoles = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/rbac/roles`);
      const data = await response.json();
      if (data.success) {
        setRoles(data.data);
        // Auto-select first role if available
        if (data.data && data.data.length > 0) {
          setSelectedRole(data.data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch ALL available permissions from the system
  const fetchAllPermissions = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/rbac/permissions/grouped`);
      const data = await response.json();
      if (data.success && data.data) {
        setAllPermissions(data.data);
      }
    } catch (error) {
      console.error('Error fetching all permissions:', error);
    }
  };

  // Fetch role's assigned permissions and merge with all permissions
  const fetchRolePermissions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/rbac/roles/${selectedRole._id}/permissions`);
      const data = await response.json();

      if (data.success) {
        // Create a map of assigned permissions for quick lookup
        const assignedPermsMap = new Map<string, PermissionAction>();

        if (data.data.flat && data.data.flat.length > 0) {
          // Role has embedded permissions
          data.data.flat.forEach((perm: any) => {
            // Handle both ObjectId and string permissionId
            const permId = typeof perm.permissionId === 'object' ? perm.permissionId._id || perm.permissionId.toString() : perm.permissionId;
            assignedPermsMap.set(permId, perm.actions);
          });
        }

        // Merge all permissions with assigned permissions
        const mergedPermissions = allPermissions.map(group => ({
          category: group.category,
          permissions: group.permissions.map(perm => {
            // Handle both ObjectId and string permissionId
            const permId = perm.permissionId ? (typeof perm.permissionId === 'object' ? (perm.permissionId as any)._id || String(perm.permissionId) : perm.permissionId) : '';
            const assignedActions = assignedPermsMap.get(permId);
            return {
              ...perm,
              actions: assignedActions || { ...EMPTY_ACTIONS },
            };
          }),
        }));

        setGroupedPermissions(mergedPermissions);
      }
    } catch (error) {
      console.error('Error fetching role permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleActionChange = async (permissionId: string, action: string, currentValue: boolean) => {
    // Compute new permissions state
    const newGroupedPermissions = groupedPermissions.map(group => ({
      ...group,
      permissions: group.permissions.map(perm => {
        // Handle both ObjectId and string permissionId comparison
        const permId = perm.permissionId ? (typeof perm.permissionId === 'object' ? (perm.permissionId as any)._id || String(perm.permissionId) : perm.permissionId) : '';
        const targetId = permissionId ? (typeof permissionId === 'object' ? (permissionId as any)._id || String(permissionId) : permissionId) : '';

        if (permId === targetId) {
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

          // If all individual actions are checked, check "all"
          if (action !== 'all') {
            const allChecked = newActions.read && newActions.create && newActions.write &&
                               newActions.delete && newActions.import && newActions.export;
            newActions.all = allChecked;
          }

          return { ...perm, actions: newActions };
        }
        return perm;
      }),
    }));

    // Update local state optimistically
    setGroupedPermissions(newGroupedPermissions);

    // Save to API with the computed permissions (not stale state)
    await savePermissions(newGroupedPermissions);
  };

  const savePermissions = async (permissions: GroupedPermissions[]) => {
    if (!selectedRole) return;

    setSaving(true);
    try {
      // Flatten permissions for API - only send permissions that have at least one action checked
      const flatPermissions: any[] = [];
      permissions.forEach(group => {
        group.permissions.forEach(perm => {
          const hasAnyAction = perm.actions.all || perm.actions.read || perm.actions.create ||
                              perm.actions.write || perm.actions.delete || perm.actions.import ||
                              perm.actions.export;

          if (hasAnyAction) {
            flatPermissions.push({
              permissionId: perm.permissionId,
              actions: perm.actions,
            });
          }
        });
      });

      const response = await fetch(`${API_BASE}/api/rbac/roles/${selectedRole._id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: flatPermissions }),
      });

      const data = await response.json();
      if (!data.success) {
        console.error('Error saving permissions:', data.error);
        // Re-fetch on error
        await fetchRolePermissions();
      }
    } catch (error) {
      console.error('Error saving permissions:', error);
      await fetchRolePermissions();
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = (roleId: string) => {
    const role = roles.find(r => r._id === roleId);
    if (role) {
      setSelectedRole(role);
    }
  };

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
              <h2 className="mb-1">Permissions</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={all_routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">Administration</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Permissions
                  </li>
                </ol>
              </nav>
            </div>
            <div className="head-icons">
              <CollapseHeader />
            </div>
          </div>

          {/* Role Selector */}
          <div className="card mb-3">
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-md-3">
                  <label className="form-label">Select Role</label>
                  <select
                    className="form-select"
                    value={selectedRole?._id || ''}
                    onChange={(e) => handleRoleChange(e.target.value)}
                  >
                    {roles.map(role => (
                      <option key={role._id} value={role._id}>
                        {role.displayName} {role.type === 'system' && '(System)'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-9">
                  <p className="mb-0">
                    <strong>Role:</strong> <span className="text-primary">{selectedRole?.displayName}</span>
                    {selectedRole?.type === 'system' && (
                      <span className="badge bg-info ms-2">System Role</span>
                    )}
                    {selectedRole?.description && (
                      <span className="text-muted ms-2">- {selectedRole.description}</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Permissions Matrix */}
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h5 className="mb-0">Module Permissions</h5>
              {saving && (
                <span className="badge bg-warning">
                  <i className="ti ti-loader me-1"></i>Saving...
                </span>
              )}
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-bordered mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: '30%' }}>Module</th>
                      {ACTIONS.map(action => (
                        <th key={action} className="text-center" style={{ width: '10%' }}>
                          {ACTION_LABELS[action]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {groupedPermissions.map(group => (
                      <React.Fragment key={group.category}>
                        <tr className="table-light">
                          <td colSpan={8}>
                            <button
                              className="btn btn-link text-decoration-none p-0 fw-bold"
                              onClick={() => toggleCategory(group.category)}
                            >
                              <i className={`ti ti-chevron-${expandedCategories.has(group.category) ? 'down' : 'right'} me-1`}></i>
                              {group.category.replace('-', ' ').toUpperCase()}
                            </button>
                          </td>
                        </tr>
                        {expandedCategories.has(group.category) && group.permissions.map(perm => (
                          <tr key={perm.permissionId}>
                            <td>
                              <span className="text-gray-9">{perm.displayName}</span>
                            </td>
                            {ACTIONS.map(action => (
                              <td key={action} className="text-center">
                                <div className="form-check form-check-md d-flex justify-content-center">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={perm.actions[action] || false}
                                    onChange={() => handleActionChange(
                                      perm.permissionId,
                                      action,
                                      perm.actions[action] || false
                                    )}
                                    disabled={saving}
                                  />
                                </div>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
};

export default PermissionPage;
