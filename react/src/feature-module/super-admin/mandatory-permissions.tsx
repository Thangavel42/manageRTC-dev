import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { all_routes } from "../router/all_routes";
import CollapseHeader from "../../core/common/collapse-header/collapse-header";
import Footer from "../../core/common/footer";

// API Base URL
const API_BASE = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

// Types
interface PagePermission {
  _id: string;
  name: string;
  displayName: string;
  description?: string;
  route?: string;
  icon: string;
  category?: PageCategory;
  parentPage?: any;
  level: number;
  depth: number;
  isMenuGroup: boolean;
  menuGroupLevel?: 1 | 2 | null;
  sortOrder: number;
  isSystem: boolean;
  isActive: boolean;
  availableActions?: string[];
  permission?: any;
  directChildren?: PagePermission[];
  l2Groups?: PagePermission[];
  children?: PagePermission[];
}

interface PageCategory {
  _id: string;
  identifier: string;
  displayName: string;
  label: string;
  description: string;
  icon: string;
  sortOrder: number;
  isSystem: boolean;
  isActive: boolean;
}

interface CategoryTree {
  _id: string;
  identifier: string;
  displayName: string;
  label: string;
  description: string;
  icon: string;
  sortOrder: number;
  isSystem: boolean;
  isActive: boolean;
  l1MenuGroups: PagePermission[];
  directChildren: PagePermission[];
}

interface Role {
  _id: string;
  name: string;
  displayName: string;
  description: string;
  type: string;
  level: number;
  isActive: boolean;
  mandatoryPermissions?: MandatoryPermission[];
}

interface MandatoryPermission {
  pageId: string;
  actions: string[];
}

const ACTIONS = ['all', 'read', 'create', 'write', 'delete', 'import', 'export', 'approve', 'assign'] as const;

const ACTION_LABELS: Record<string, string> = {
  all: 'All',
  read: 'Read',
  create: 'Create',
  write: 'Write',
  delete: 'Delete',
  import: 'Import',
  export: 'Export',
  approve: 'Approve',
  assign: 'Assign',
};

const MandatoryPermissionsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [categoryTree, setCategoryTree] = useState<CategoryTree[]>([]);
  const [mandatoryPermissions, setMandatoryPermissions] = useState<Map<string, string[]>>(new Map());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedL1, setExpandedL1] = useState<Set<string>>(new Set());
  const [expandedL2, setExpandedL2] = useState<Set<string>>(new Set());

  // Fetch roles and pages on mount
  useEffect(() => {
    const initializeData = async () => {
      await Promise.all([
        fetchRoles(),
        fetchCategoryTree()
      ]);
      setLoading(false);
    };
    initializeData();
  }, []);

  // Fetch role's mandatory permissions when role changes
  useEffect(() => {
    if (selectedRole) {
      fetchRoleMandatoryPermissions();
    }
  }, [selectedRole]);

  const fetchRoles = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/rbac/roles`);
      const data = await response.json();
      if (data.success) {
        setRoles(data.data);
        // Auto-select first role
        if (data.data.length > 0) {
          setSelectedRole(data.data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const fetchCategoryTree = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/rbac/pages/tree-structure`);
      const data = await response.json();
      if (data.success) {
        console.log('=== CATEGORY TREE FROM API ===');
        console.log('Categories:', data.data.length);

        // Log first category's direct children _id types
        if (data.data[0]?.directChildren?.length > 0) {
          const child = data.data[0].directChildren[0];
          console.log('Sample direct child:');
          console.log('  _id:', child._id, '(type:', typeof child._id + ')');
          console.log('  displayName:', child.displayName);
        }

        // Log first L1 group's children _id types
        if (data.data[0]?.l1MenuGroups?.length > 0) {
          const l1 = data.data[0].l1MenuGroups[0];
          console.log('Sample L1 group:', l1.displayName);
          if (l1.directChildren?.length > 0) {
            const child = l1.directChildren[0];
            console.log('  Sample L1 direct child:');
            console.log('    _id:', child._id, '(type:', typeof child._id + ')');
            console.log('    displayName:', child.displayName);
          }
        }

        setCategoryTree(data.data);
      }
    } catch (error) {
      console.error('Error fetching category tree:', error);
    }
  };

  const fetchRoleMandatoryPermissions = async () => {
    if (!selectedRole) return;

    try {
      const response = await fetch(`${API_BASE}/api/rbac/roles/${selectedRole._id}/permissions`);
      const data = await response.json();

      if (data.success) {
        const mandatoryPerms = data.data.mandatoryPermissions || [];
        console.log('=== MANDATORY PERMISSIONS FROM API ===');
        console.log('Count:', mandatoryPerms.length);
        console.log('Raw data:', mandatoryPerms);

        const map = new Map<string, string[]>();
        mandatoryPerms.forEach((m: MandatoryPermission) => {
          console.log(`Adding to map: pageId="${m.pageId}" (type: ${typeof m.pageId}), actions:`, m.actions);
          map.set(m.pageId, m.actions);
        });

        console.log('Map size:', map.size);
        console.log('Map keys:', Array.from(map.keys()));
        setMandatoryPermissions(map);
      }
    } catch (error) {
      console.error('Error fetching mandatory permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveMandatoryPermissions = async () => {
    if (!selectedRole) return;

    setSaving(true);
    try {
      // Convert map to array
      const mandatoryPerms: MandatoryPermission[] = [];
      mandatoryPermissions.forEach((actions, pageId) => {
        if (actions.length > 0) {
          mandatoryPerms.push({ pageId, actions });
        }
      });

      const response = await fetch(`${API_BASE}/api/rbac/roles/${selectedRole._id}/mandatory-permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mandatoryPermissions: mandatoryPerms }),
      });

      const data = await response.json();
      if (data.success) {
        alert('Mandatory permissions saved successfully!');
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error saving mandatory permissions:', error);
      alert('Error saving mandatory permissions');
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleL1 = (l1Id: string) => {
    const newExpanded = new Set(expandedL1);
    if (newExpanded.has(l1Id)) {
      newExpanded.delete(l1Id);
    } else {
      newExpanded.add(l1Id);
    }
    setExpandedL1(newExpanded);
  };

  const toggleL2 = (l2Id: string) => {
    const newExpanded = new Set(expandedL2);
    if (newExpanded.has(l2Id)) {
      newExpanded.delete(l2Id);
    } else {
      newExpanded.add(l2Id);
    }
    setExpandedL2(newExpanded);
  };

  const handleMandatoryToggle = (pageId: string, action: string) => {
    const currentActions = mandatoryPermissions.get(pageId) || [];
    let newActions: string[] = [];

    if (action === 'all') {
      // Toggle "all" - if currently has 'all', remove it; otherwise add just 'all'
      if (currentActions.includes('all')) {
        // Remove 'all' - clear all mandatory actions for this page
        newActions = [];
      } else {
        // Add just 'all' (represents all actions being mandatory)
        newActions = ['all'];
      }
    } else {
      // Toggle individual action
      if (currentActions.includes('all')) {
        // If currently has 'all', remove 'all' and add all individual actions except the one being toggled
        newActions = ACTIONS.filter(a => a !== 'all' && a !== action);
      } else if (currentActions.includes(action)) {
        // Remove the specific action
        newActions = currentActions.filter(a => a !== action);
      } else {
        // Add the specific action
        newActions = [...currentActions, action];

        // Check if all individual actions are now selected, if so, replace with 'all'
        const individualActions = ACTIONS.filter(a => a !== 'all');
        const allIndividualSelected = individualActions.every(a => newActions.includes(a));
        if (allIndividualSelected) {
          newActions = ['all'];
        }
      }
    }

    const newMap = new Map(mandatoryPermissions);
    if (newActions.length === 0) {
      newMap.delete(pageId);
    } else {
      newMap.set(pageId, newActions);
    }
    setMandatoryPermissions(newMap);
  };

  const isMandatory = (pageId: string | any, action: string): boolean => {
    // Convert pageId to string for consistent comparison
    // child._id from MongoDB might be ObjectId (before JSON parse) or string (after)
    const pageIdStr = typeof pageId === 'object' ? pageId?.toString() : pageId;
    const actions = mandatoryPermissions.get(pageIdStr) || [];

    // Check if action is mandatory
    // If 'all' is in the actions array, then ALL actions are mandatory
    let result = false;
    if (actions.includes('all')) {
      result = true; // 'all' means every action is mandatory
    } else {
      result = actions.includes(action); // Check for specific action
    }

    // Debug for Dashboard page ID (Category I - Main Menu)
    if (pageIdStr === '698af2364ee27e6467d88dd7') {
      console.log('=== isMandatory CHECK (Dashboard) ===');
      console.log('pageIdOriginal:', pageId, '(type:', typeof pageId + ')');
      console.log('pageIdStr:', pageIdStr, '(type:', typeof pageIdStr + ')');
      console.log('action:', action);
      console.log('mapSize:', mandatoryPermissions.size);
      console.log('actions from map:', actions);
      console.log('includes "all"?', actions.includes('all'));
      console.log('includes action?', result);
      console.log('Map keys:', Array.from(mandatoryPermissions.keys()));
    }

    return result;
  };

  const findPageById = (pageId: string): PagePermission | null => {
    for (const cat of categoryTree) {
      const directChild = cat.directChildren.find(p => p._id === pageId);
      if (directChild) return directChild;

      for (const l1 of cat.l1MenuGroups) {
        const l1Child = l1.directChildren?.find(p => p._id === pageId);
        if (l1Child) return l1Child;

        for (const l2 of l1.l2Groups || []) {
          const l2Child = l2.children?.find(p => p._id === pageId);
          if (l2Child) return l2Child;
        }
      }
    }
    return null;
  };

  const isActionAvailable = (page: PagePermission, action: string): boolean => {
    if (!page.availableActions || page.availableActions.length === 0) {
      return true;
    }
    return page.availableActions.includes(action);
  };

  // Render L2 group row
  const renderL2Group = (l2: PagePermission) => (
    <React.Fragment key={l2._id}>
      <tr className="table-light bg-opacity-10">
        <td colSpan={10}>
          <div
            className="d-flex align-items-center p-2 cursor-pointer"
            style={{ paddingLeft: '48px' }}
            onClick={() => toggleL2(l2._id)}
          >
            <i className={`ti ti-chevron-${expandedL2.has(l2._id) ? 'down' : 'right'} me-2 text-muted`}></i>
            <i className={`${l2.icon} me-2 text-info`}></i>
            <span className="fw-semibold text-info">{l2.displayName}</span>
            <span className="badge bg-light text-dark ms-2">L2</span>
            <span className="badge bg-secondary ms-2">{l2.children?.length || 0} pages</span>
          </div>
        </td>
      </tr>

      {expandedL2.has(l2._id) && l2.children?.map((child) => (
        <tr key={child._id}>
          <td>
            <div className="d-flex align-items-center p-2" style={{ paddingLeft: '72px' }}>
              <i className={`${child.icon} me-2 text-muted`}></i>
              <span className="me-2">{child.displayName}</span>
              {child.isSystem && <span className="badge bg-info ms-2">System</span>}
              {child.route && <code className="small text-muted ms-2">/{child.route}</code>}
            </div>
          </td>
          {ACTIONS.map(action => (
            <td key={action} className="text-center">
              {isActionAvailable(child, action) ? (
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={isMandatory(child._id, action)}
                  onChange={() => handleMandatoryToggle(child._id, action)}
                  disabled={saving}
                />
              ) : (
                <span className="text-muted">-</span>
              )}
            </td>
          ))}
        </tr>
      ))}
    </React.Fragment>
  );

  // Render L1 group row
  const renderL1Group = (l1: PagePermission) => (
    <React.Fragment key={l1._id}>
      <tr className="table-light">
        <td colSpan={10}>
          <div
            className="d-flex align-items-center p-2 cursor-pointer"
            style={{ paddingLeft: '24px' }}
            onClick={() => toggleL1(l1._id)}
          >
            <i className={`ti ti-chevron-${expandedL1.has(l1._id) ? 'down' : 'right'} me-2 text-muted`}></i>
            <i className={`${l1.icon} me-2 text-primary`}></i>
            <span className="fw-bold text-primary">{l1.displayName}</span>
            <span className="badge bg-light text-dark ms-2">L1 Menu</span>
            <span className="badge bg-secondary ms-2">
              {(l1.l2Groups?.length || 0) + (l1.directChildren?.length || 0)} items
            </span>
          </div>
        </td>
      </tr>

      {expandedL1.has(l1._id) && l1.directChildren?.map((child) => (
        <tr key={child._id}>
          <td>
            <div className="d-flex align-items-center p-2" style={{ paddingLeft: '48px' }}>
              <i className={`${child.icon} me-2 text-muted`}></i>
              <span className="me-2">{child.displayName}</span>
              {child.isSystem && <span className="badge bg-info ms-2">System</span>}
              {child.route && <code className="small text-muted ms-2">/{child.route}</code>}
            </div>
          </td>
          {ACTIONS.map(action => (
            <td key={action} className="text-center">
              {isActionAvailable(child, action) ? (
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={isMandatory(child._id, action)}
                  onChange={() => handleMandatoryToggle(child._id, action)}
                  disabled={saving}
                />
              ) : (
                <span className="text-muted">-</span>
              )}
            </td>
          ))}
        </tr>
      ))}

      {expandedL1.has(l1._id) && l1.l2Groups?.map((l2) => renderL2Group(l2))}
    </React.Fragment>
  );

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="content">
        {/* Breadcrumb */}
        <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
          <div className="my-auto mb-2">
            <h2 className="mb-1">Mandatory Permissions</h2>
            <nav>
              <ol className="breadcrumb mb-0">
                <li className="breadcrumb-item">
                  <Link to={all_routes.adminDashboard}>
                    <i className="ti ti-smart-home" />
                  </Link>
                </li>
                <li className="breadcrumb-item">Super Admin</li>
                <li className="breadcrumb-item active" aria-current="page">
                  Mandatory Permissions
                </li>
              </ol>
            </nav>
          </div>
          <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
            <div className="mb-2">
              <button
                className="btn btn-primary d-flex align-items-center"
                onClick={saveMandatoryPermissions}
                disabled={saving || !selectedRole}
              >
                {saving ? (
                  <>
                    <i className="ti ti-loader me-2"></i>Saving...
                  </>
                ) : (
                  <>
                    <i className="ti ti-device-floppy me-2"></i>Save Changes
                  </>
                )}
              </button>
            </div>
            <div className="head-icons ms-2">
              <CollapseHeader />
            </div>
          </div>
        </div>
        {/* /Breadcrumb */}

        {/* Main Card */}
        <div className="card">
          <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
            <h5>Mandatory Permissions Configuration</h5>
          </div>
          <div className="card-body">
            <div className="row mb-4">
              <div className="col-md-4">
                <label className="form-label">Select Role</label>
                <select
                  className="form-select"
                  value={selectedRole?._id || ''}
                  onChange={(e) => {
                    const role = roles.find(r => r._id === e.target.value);
                    setSelectedRole(role || null);
                  }}
                >
                  {roles.map(role => (
                    <option key={role._id} value={role._id}>
                      {role.displayName} ({role.type})
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-8">
                <label className="form-label">Info</label>
                <div className="alert alert-info mb-0">
                  <i className="ti ti-info-circle me-2"></i>
                  <strong>Mandatory Permissions</strong> are permissions that cannot be revoked for a role.
                  They are always enforced by the backend API. Check the boxes to make permissions mandatory.
                </div>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-bordered mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '40%' }}>Page Structure</th>
                    {ACTIONS.map(action => (
                      <th key={action} className="text-center" style={{ width: '6%' }}>
                        <small>{ACTION_LABELS[action]}</small>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {categoryTree.map((catTree) => {
                    const isExpanded = expandedCategories.has(catTree._id);
                    return (
                      <React.Fragment key={catTree._id}>
                        <tr className="table-light">
                          <td colSpan={10}>
                            <div
                              className="d-flex align-items-center p-2 cursor-pointer"
                              onClick={() => toggleCategory(catTree._id)}
                            >
                              <i className={`ti ti-chevron-${isExpanded ? 'down' : 'right'} me-2 text-muted`}></i>
                              <span className="fw-bold text-primary me-2">{catTree.identifier}.</span>
                              <span className="fw-bold">{catTree.displayName}</span>
                              <span className="badge bg-secondary ms-2">
                                {catTree.directChildren?.length || 0} direct
                              </span>
                            </div>
                          </td>
                        </tr>

                        {isExpanded && (
                          <>
                            {catTree.directChildren.map((child) => (
                              <tr key={child._id}>
                                <td>
                                  <div className="d-flex align-items-center p-2">
                                    <i className={`${child.icon} me-2 text-muted`}></i>
                                    <span className="me-2">{child.displayName}</span>
                                    {child.isSystem && <span className="badge bg-info ms-2">System</span>}
                                    {child.route && <code className="small text-muted ms-2">/{child.route}</code>}
                                  </div>
                                </td>
                                {ACTIONS.map(action => (
                                  <td key={action} className="text-center">
                                    {isActionAvailable(child, action) ? (
                                      <input
                                        type="checkbox"
                                        className="form-check-input"
                                        checked={isMandatory(child._id, action)}
                                        onChange={() => handleMandatoryToggle(child._id, action)}
                                        disabled={saving}
                                      />
                                    ) : (
                                      <span className="text-muted">-</span>
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))}

                            {catTree.l1MenuGroups.map((l1) => renderL1Group(l1))}
                          </>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default MandatoryPermissionsPage;
