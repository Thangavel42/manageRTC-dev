import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CollapseHeader from "../../core/common/collapse-header/collapse-header";
import Footer from "../../core/common/footer";
import { all_routes } from "../router/all_routes";

// API Base URL
const API_BASE = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

// Types for mandatory permissions
interface MandatoryPermission {
  pageId: string;
  actions: string[];
}

// Types
interface PermissionAction {
  all: boolean;
  read: boolean;
  create: boolean;
  write: boolean;
  delete: boolean;
  import: boolean;
  export: boolean;
  approve: boolean;
  assign: boolean;
}

interface PagePermission {
  _id: string;
  name: string;
  displayName: string;
  description?: string;
  route?: string;
  icon: string;
  category?: PageCategory;
  parentPage?: {
    _id: string;
    displayName: string;
    name: string;
  };
  level: number;
  depth: number;
  isMenuGroup: boolean;
  menuGroupLevel?: 1 | 2 | null;
  sortOrder: number;
  isSystem: boolean;
  isActive: boolean;
  availableActions?: string[];
  permission?: {
    _id: string;
    module: string;
    displayName: string;
    category: string;
    pageId: string;
  };
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

interface AssignedPermissionData {
  actions: PermissionAction;
  pageId?: string | null;
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

// Default empty actions
const EMPTY_ACTIONS: PermissionAction = {
  all: false,
  read: false,
  create: false,
  write: false,
  delete: false,
  import: false,
  export: false,
  approve: false,
  assign: false,
};

const PermissionPage = () => {
  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [categoryTree, setCategoryTree] = useState<CategoryTree[]>([]); // Hierarchical permissions
  const [permissionsMap, setPermissionsMap] = useState<Map<string, AssignedPermissionData>>(new Map()); // Assigned permissions
  const [mandatoryPermissions, setMandatoryPermissions] = useState<MandatoryPermission[]>([]); // Loaded from API
  const [_originalPermissions, setOriginalPermissions] = useState<Map<string, AssignedPermissionData>>(new Map()); // Original permissions for dirty check
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false); // Track unsaved changes
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedL1, setExpandedL1] = useState<Set<string>>(new Set());
  const [expandedL2, setExpandedL2] = useState<Set<string>>(new Set());
  const [currentUserRole, setCurrentUserRole] = useState<any>(null);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = ''; // Chrome requires returnValue to be set
        return ''; // Firefox requires return value
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // Fetch roles and all permissions on mount
  useEffect(() => {
    const initializeData = async () => {
      await Promise.all([
        fetchRoles(),
        fetchHierarchicalPermissions()
      ]);
      setLoading(false);
    };
    initializeData();
  }, []);

  // Fetch role's assigned permissions when role changes
  useEffect(() => {
    if (selectedRole && categoryTree.length > 0) {
      fetchRolePermissions();
      // Expand all categories by default
      const categories = categoryTree.map(cat => cat._id);
      setExpandedCategories(new Set(categories));
    }
  }, [selectedRole, categoryTree]);

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
        // Get current user's role from window object (set by Clerk auth)
        const userRole = (window as any).user?.role || (window as any).user?.roleId;
        if (userRole) {
          setCurrentUserRole(userRole);
        }
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  // Fetch hierarchical permissions structure
  const fetchHierarchicalPermissions = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/rbac/permissions/hierarchical`);
      const data = await response.json();
      if (data.success && data.data) {
        setCategoryTree(data.data);
      } else {
        console.error('Failed to fetch hierarchical permissions:', data);
      }
    } catch (error) {
      console.error('Error fetching hierarchical permissions:', error);
    }
  };

  // Fetch role's assigned permissions and merge with all permissions
  const fetchRolePermissions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/rbac/roles/${selectedRole._id}/permissions`);
      const data = await response.json();

      if (data.success) {
        // Load mandatory permissions from API response
        const mandatoryPerms = data.data.mandatoryPermissions || [];
        setMandatoryPermissions(mandatoryPerms);

        // Create a map of assigned permissions for quick lookup
        const assignedPermsMap = new Map<string, AssignedPermissionData>();

        if (data.data.flat && data.data.flat.length > 0) {
          // Role has embedded permissions
          data.data.flat.forEach((perm: any) => {
            // Handle both ObjectId and string permissionId
            const permId = typeof perm.permissionId === 'object' ? perm.permissionId._id || perm.permissionId.toString() : perm.permissionId;
            const pageIdStr = perm.pageId?.toString() || permId;
            assignedPermsMap.set(pageIdStr, {
              actions: perm.actions,
              pageId: perm.pageId,
            });
          });
        }

        // Apply mandatory permissions - always enable them
        mandatoryPerms.forEach(mandatoryPage => {
          const pageId = mandatoryPage.pageId;
          const existingPerm = assignedPermsMap.get(pageId);
          const currentActions = existingPerm?.actions || { ...EMPTY_ACTIONS };

          // Apply mandatory actions
          const newActions = { ...currentActions };

          if (mandatoryPage.actions.includes('all')) {
            // All actions are mandatory - enable all available actions
            ACTIONS.forEach(a => {
              if (a !== 'all') {
                newActions[a] = true;
              }
            });
            newActions.all = true;
          } else {
            // Specific actions are mandatory
            mandatoryPage.actions.forEach(a => {
              if (a !== 'all') {
                newActions[a] = true;
              }
            });
          }

          assignedPermsMap.set(pageId, {
            actions: newActions,
            pageId: pageId,
          });
        });

        setPermissionsMap(assignedPermsMap);
        // Store original permissions for dirty check and reset unsaved flag
        setOriginalPermissions(new Map(assignedPermsMap));
        setHasUnsavedChanges(false);
      } else {
        console.error('Failed to fetch role permissions:', data);
      }
    } catch (error) {
      console.error('Error fetching role permissions:', error);
    } finally {
      setLoading(false);
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

  const handleActionChange = async (pageId: string, action: string, currentValue: boolean) => {
    // Prevent modifying hardcoded permissions - they are always enabled
    if (isActionHardcoded(pageId, action)) {
      return;
    }

    // Get current permission state
    const currentPerm = permissionsMap.get(pageId);
    const currentActions = currentPerm?.actions || { ...EMPTY_ACTIONS };

    // Compute new actions state
    const newActions = { ...currentActions, [action]: !currentValue };

    // Find the page to check availableActions
    const page = findPageById(pageId);
    const availableActions = page?.availableActions || ACTIONS as readonly string[];

    // If "all" is checked, check all other available actions (except hardcoded ones)
    if (action === 'all' && !currentValue) {
      ACTIONS.forEach(a => {
        if (a !== 'all' && availableActions.includes(a) && !isActionHardcoded(pageId, a)) {
          newActions[a] = true;
        }
      });
    }

    // If "all" is unchecked, uncheck all other available actions (except hardcoded ones)
    if (action === 'all' && currentValue) {
      ACTIONS.forEach(a => {
        if (a !== 'all' && availableActions.includes(a) && !isActionHardcoded(pageId, a)) {
          newActions[a] = false;
        }
      });
    }

    // If all available individual actions are checked, check "all" (only considering non-hardcoded actions)
    if (action !== 'all') {
      const nonHardcodedActions = availableActions.filter(a => a !== 'all' && !isActionHardcoded(pageId, a));
      const allChecked = nonHardcodedActions.length > 0 &&
        nonHardcodedActions.every(a => newActions[a] === true);
      newActions.all = allChecked;
    }

    // Ensure mandatory permissions are always set to true
    if (isPageHardcoded(pageId)) {
      const mandatoryPage = mandatoryPermissions.find(p => p.pageId === pageId);

      if (mandatoryPage?.actions.includes('all')) {
        // All actions are mandatory
        ACTIONS.forEach(a => {
          if (a !== 'all' && availableActions.includes(a)) {
            newActions[a] = true;
          }
        });
        newActions.all = true;
      } else {
        // Specific actions are mandatory
        mandatoryPage?.actions.forEach(a => {
          if (a !== 'all' && availableActions.includes(a)) {
            newActions[a] = true;
          }
        });
      }
    }

    // Update local state optimistically
    const newPermissionsMap = new Map(permissionsMap);
    newPermissionsMap.set(pageId, { actions: newActions, pageId });
    setPermissionsMap(newPermissionsMap);

    // Mark as having unsaved changes
    setHasUnsavedChanges(true);

    // Save to API
    await savePermissions();
  };

  const savePermissions = async () => {
    if (!selectedRole) return;

    setSaving(true);
    try {
      // Flatten permissions for API - only send permissions that have at least one action checked
      const flatPermissions: any[] = [];

      categoryTree.forEach(cat => {
        // Process direct children
        cat.directChildren.forEach(page => {
          const permData = permissionsMap.get(page._id);
          if (permData && hasAnyAction(permData.actions)) {
            flatPermissions.push({
              pageId: page._id,
              permissionId: page.permission?._id,
              actions: permData.actions,
            });
          }
        });

        // Process L1 menu groups
        cat.l1MenuGroups.forEach(l1 => {
          // L1 direct children
          l1.directChildren.forEach(page => {
            const permData = permissionsMap.get(page._id);
            if (permData && hasAnyAction(permData.actions)) {
              flatPermissions.push({
                pageId: page._id,
                permissionId: page.permission?._id,
                actions: permData.actions,
              });
            }
          });

          // L2 groups and their children
          l1.l2Groups?.forEach(l2 => {
            l2.children?.forEach(page => {
              const permData = permissionsMap.get(page._id);
              if (permData && hasAnyAction(permData.actions)) {
                flatPermissions.push({
                  pageId: page._id,
                  permissionId: page.permission?._id,
                  actions: permData.actions,
                });
              }
            });
          });
        });
      });

      const response = await fetch(`${API_BASE}/api/rbac/roles/${selectedRole._id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: flatPermissions }),
      });

      const data = await response.json();
      if (data.success) {
        // Save successful - update original permissions and reset unsaved flag
        setOriginalPermissions(new Map(permissionsMap));
        setHasUnsavedChanges(false);
      } else {
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

  const hasAnyAction = (actions: PermissionAction): boolean => {
    return actions.all || actions.read || actions.create || actions.write ||
      actions.delete || actions.import || actions.export ||
      actions.approve || actions.assign;
  };

  const getPermissionActions = (pageId: string): PermissionAction => {
    const perm = permissionsMap.get(pageId);
    return perm?.actions || { ...EMPTY_ACTIONS };
  };

  // Check if an action is available for a page based on availableActions field
  const isActionAvailable = (page: PagePermission, action: string): boolean => {
    // If page has no availableActions defined, show all actions (backward compatibility)
    if (!page.availableActions || page.availableActions.length === 0) {
      return true;
    }
    // Check if the action is in the availableActions array
    return page.availableActions.includes(action);
  };

  // Find a page by ID from the category tree
  const findPageById = (pageId: string): PagePermission | null => {
    for (const cat of categoryTree) {
      // Check direct children
      const directChild = cat.directChildren.find(p => p._id === pageId);
      if (directChild) return directChild;

      // Check L1 groups
      for (const l1 of cat.l1MenuGroups) {
        // Check L1 direct children
        const l1Child = l1.directChildren?.find(p => p._id === pageId);
        if (l1Child) return l1Child;

        // Check L2 groups
        for (const l2 of l1.l2Groups || []) {
          const l2Child = l2.children?.find(p => p._id === pageId);
          if (l2Child) return l2Child;
        }
      }
    }
    return null;
  };

  // Check if an action is mandatory (always enabled) for a page/role
  const isActionHardcoded = (pageId: string, action: string): boolean => {
    if (!mandatoryPermissions || mandatoryPermissions.length === 0) return false;

    const mandatoryPage = mandatoryPermissions.find(p => p.pageId === pageId);
    if (!mandatoryPage) return false;

    // If 'all' is in mandatory actions, all individual actions are mandatory
    if (mandatoryPage.actions.includes('all')) return true;

    // Check if the specific action is mandatory
    return mandatoryPage.actions.includes(action);
  };

  // Check if ANY action is mandatory for a page
  const isPageHardcoded = (pageId: string): boolean => {
    if (!mandatoryPermissions || mandatoryPermissions.length === 0) return false;
    return mandatoryPermissions.some(p => p.pageId === pageId);
  };

  const handleRoleChange = (roleId: string) => {
    if (hasUnsavedChanges) {
      if (!window.confirm('You have unsaved changes. Do you want to discard them and switch roles?')) {
        return;
      }
    }

    const role = roles.find(r => r._id === roleId);
    if (role) {
      setSelectedRole(role);
      // Reset unsaved changes flag when switching roles
      setHasUnsavedChanges(false);
    }
  };

  // Count total pages in category tree (only actual pages, not menu groups)
  const countPagesInCategory = (catTree: CategoryTree): number => {
    let count = catTree.directChildren?.length || 0;  // Direct children (actual pages)
    catTree.l1MenuGroups?.forEach(l1 => {
      count += l1.directChildren?.length || 0;  // L1 direct children (actual pages)
      l1.l2Groups?.forEach(l2 => {
        count += l2.children?.length || 0;  // L2 children (actual pages)
      });
      // Note: L2 menu groups themselves are NOT counted - they are parent containers
    });
    return count;
  };

  // Render L2 group row
  const renderL2Group = (l2: PagePermission, l1Page: PagePermission) => (
    <React.Fragment key={l2._id}>
      {/* L2 Parent Menu Row */}
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
        <td style={{ width: '50px' }}></td>
      </tr>

      {/* L2 Children (expanded) */}
      {expandedL2.has(l2._id) && l2.children?.map((child) => (
        <tr key={child._id} className={!child.isActive ? 'table-light' : ''}>
          <td>
            <div
              className="d-flex align-items-center p-2"
              style={{ paddingLeft: '72px' }}
            >
              <i className={`${child.icon} me-2 text-muted`}></i>
              <span className="me-2">{child.displayName}</span>
              {child.isSystem && <span className="badge bg-info ms-2">System</span>}
              {child.route && <code className="small text-muted ms-2">/{child.route}</code>}
            </div>
          </td>
          {ACTIONS.map(action => (
            <td key={action} className="text-center">
              {isActionAvailable(child, action) ? (
                <div className="form-check form-check-md d-flex justify-content-center">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={getPermissionActions(child._id)[action] || false}
                    onChange={() => handleActionChange(child._id, action, getPermissionActions(child._id)[action])}
                    disabled={saving || isActionHardcoded(child._id, action)}
                    title={isActionHardcoded(child._id, action) ? 'Hardcoded permission - cannot be modified' : ''}
                  />
                  {isActionHardcoded(child._id, action) && (
                    <i className="ti ti-lock position-absolute" style={{ fontSize: '10px', opacity: 0.5 }}></i>
                  )}
                </div>
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
      {/* L1 Parent Menu Row */}
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
        <td style={{ width: '50px' }}></td>
      </tr>

      {/* L1 Direct Children (no L2) */}
      {expandedL1.has(l1._id) && l1.directChildren?.map((child) => {
        const actions = getPermissionActions(child._id);
        return (
          <tr key={child._id} className={!child.isActive ? 'table-light' : ''}>
            <td>
              <div
                className="d-flex align-items-center p-2"
                style={{ paddingLeft: '48px' }}
              >
                <i className={`${child.icon} me-2 text-muted`}></i>
                <span className="me-2">{child.displayName}</span>
                {child.isSystem && <span className="badge bg-info ms-2">System</span>}
                {child.route && <code className="small text-muted ms-2">/{child.route}</code>}
              </div>
            </td>
            {ACTIONS.map((action) => (
              <td key={action} className="text-center">
                {isActionAvailable(child, action) ? (
                  <div className="form-check form-check-md d-flex justify-content-center position-relative">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={actions[action] || false}
                      onChange={() => handleActionChange(child._id, action, actions[action])}
                      disabled={saving || isActionHardcoded(child._id, action)}
                      title={isActionHardcoded(child._id, action) ? 'Hardcoded permission - cannot be modified' : ''}
                    />
                    {isActionHardcoded(child._id, action) && (
                      <i className="ti ti-lock position-absolute" style={{ fontSize: '10px', opacity: 0.5 }}></i>
                    )}
                  </div>
                ) : (
                  <span className="text-muted">-</span>
                )}
              </td>
            ))}
          </tr>
        );
      })}

      {/* L2 Groups under this L1 */}
      {expandedL1.has(l1._id) && l1.l2Groups?.map((l2) =>
        renderL2Group(l2, l1)
      )}
    </React.Fragment>
  );

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

          {/* Stats Cards */}
          <div className="row">
            {/* Current User Role */}
            {currentUserRole && (
              <div className="col-lg-3 col-md-6 d-flex">
                <div className="card flex-fill">
                  <div className="card-body d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center overflow-hidden">
                      <div>
                        <span className="avatar avatar-lg bg-primary rounded-circle">
                          <i className="ti ti-user" />
                        </span>
                      </div>
                      <div className="ms-2 overflow-hidden">
                        <p className="fs-12 fw-medium mb-1 text-truncate">
                          Your Role
                        </p>
                        <h6 className="text-truncate mb-0">{currentUserRole.displayName || 'Guest'}</h6>
                        <small className="text-muted">Level: {currentUserRole.level || 'N/A'}</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Total Permissions */}
            <div className="col-lg-3 col-md-6 d-flex">
              <div className="card flex-fill">
                <div className="card-body d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center overflow-hidden">
                    <div>
                      <span className="avatar avatar-lg bg-dark rounded-circle">
                        <i className="ti ti-shield" />
                      </span>
                    </div>
                    <div className="ms-2 overflow-hidden">
                      <p className="fs-12 fw-medium mb-1 text-truncate">
                        Total Pages
                      </p>
                      <h4>{categoryTree.reduce((acc, cat) => acc + countPagesInCategory(cat), 0)}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Active Permissions */}
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
                        Active Permissions
                      </p>
                      <h4>{permissionsMap.size}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Categories */}
            <div className="col-lg-3 col-md-6 d-flex">
              <div className="card flex-fill">
                <div className="card-body d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center overflow-hidden">
                    <div>
                      <span className="avatar avatar-lg bg-info rounded-circle">
                        <i className="ti ti-folder" />
                      </span>
                    </div>
                    <div className="ms-2 overflow-hidden">
                      <p className="fs-12 fw-medium mb-1 text-truncate">
                        Categories
                      </p>
                      <h4>{categoryTree.length}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Role Selector */}
          <div className="card mb-3">
            <div className="card-header d-flex align-items-center justify-content-between">
              <div>
                <h5 className="mb-0">Role Configuration</h5>
                <small className="text-muted">
                  Editing: <strong className="text-primary">{selectedRole?.displayName || 'None'}</strong>
                  {selectedRole?.type === 'system' && (
                    <span className="badge bg-info ms-2">System Role</span>
                  )}
                </small>
              </div>
              {selectedRole?.level && currentUserRole && selectedRole.level < currentUserRole.level && (
                <span className="badge bg-warning">
                  <i className="ti ti-lock me-1"></i>Higher privilege than yours
                </span>
              )}
            </div>
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-md-4">
                  <label className="form-label">Select Role to Edit</label>
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
                <div className="col-md-8">
                  <p className="mb-0">
                    <strong>Role:</strong> <span className="text-primary">{selectedRole?.displayName}</span>
                    {selectedRole?.type === 'system' && (
                      <span className="badge bg-info ms-2">System Role</span>
                    )}
                    {selectedRole?.level !== undefined && (
                      <span className="badge bg-secondary ms-2">Level: {selectedRole.level}</span>
                    )}
                    {selectedRole?.description && (
                      <span className="text-muted ms-2">- {selectedRole.description}</span>
                    )}
                  </p>
                  {currentUserRole && selectedRole && (
                    <small className="text-muted">
                      <i className="ti ti-info me-1"></i>
                      Your Level: {currentUserRole.level} {selectedRole.level < currentUserRole.level && '(This role has higher privilege than yours)'}
                    </small>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Permissions Matrix - Hierarchical */}
          <div className="card">
            {hasUnsavedChanges && (
              <div className="alert alert-warning d-flex align-items-center mb-0" role="alert">
                <i className="ti ti-alert-triangle me-2 fs-5"></i>
                <div>
                  <strong>Warning:</strong> You have unsaved changes. Don't forget to click <strong>"Save"</strong> before leaving.
                </div>
              </div>
            )}
            <div className="card-header d-flex align-items-center justify-content-between">
              <div>
                <h5 className="mb-0">Page Permissions (Hierarchical)</h5>
              </div>
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
                      const pageCount = countPagesInCategory(catTree);

                      return (
                        <React.Fragment key={catTree._id}>
                          {/* Category Header */}
                          <tr className="table-light">
                            <td>
                              <div
                                className="d-flex align-items-center p-2 cursor-pointer text-dark"
                                onClick={() => toggleCategory(catTree._id)}
                              >
                                <i className={`ti ti-chevron-${isExpanded ? 'down' : 'right'} me-2`}></i>
                                <span className="badge bg-primary text-white me-2">{catTree.identifier}</span>
                                <span className="fw-bold">{catTree.displayName}</span>
                                <span className="badge bg-secondary text-white ms-2">{pageCount} pages</span>
                              </div>
                            </td>
                            <td></td>
                          </tr>

                          {/* Category Content */}
                          {isExpanded && (
                            <>
                              {/* Direct Children of Category */}
                              {catTree.directChildren.map((child) => (
                                <tr key={child._id} className={!child.isActive ? 'table-light' : ''}>
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
                                        <div className="form-check form-check-md d-flex justify-content-center position-relative">
                                          <input
                                            className="form-check-input"
                                            type="checkbox"
                                            checked={getPermissionActions(child._id)[action] || false}
                                            onChange={() => handleActionChange(child._id, action, getPermissionActions(child._id)[action])}
                                            disabled={saving || isActionHardcoded(child._id, action)}
                                            title={isActionHardcoded(child._id, action) ? 'Hardcoded permission - cannot be modified' : ''}
                                          />
                                          {isActionHardcoded(child._id, action) && (
                                            <i className="ti ti-lock position-absolute" style={{ fontSize: '10px', opacity: 0.5 }}></i>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-muted">-</span>
                                      )}
                                    </td>
                                  ))}
                                </tr>
                              ))}

                              {/* L1 Menu Groups */}
                              {catTree.l1MenuGroups.map((l1) =>
                                renderL1Group(l1)
                              )}
                            </>
                          )}
                        </React.Fragment>
                      );
                    })}

                    {/* Empty State */}
                    {categoryTree.length === 0 && (
                      <tr>
                        <td colSpan={2} className="text-center py-5">
                          <i className="ti ti-file-off text-muted" style={{ fontSize: '48px' }}></i>
                          <p className="text-muted mt-2">No permissions found. Please contact administrator.</p>
                        </td>
                      </tr>
                    )}
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
