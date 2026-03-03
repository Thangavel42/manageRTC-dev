import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CollapseHeader from "../../core/common/collapse-header/collapse-header";
import Footer from "../../core/common/footer";
import { all_routes } from "../router/all_routes";

// API Base URL
const API_BASE = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

// Types
interface ModulePage {
  _id?: string;
  pageId: string;
  name: string;
  displayName: string;
  route: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
}

interface Module {
  _id: string;
  name: string;
  displayName: string;
  description: string;
  icon: string;
  route: string;
  color: string;
  pages: ModulePage[];
  isActive: boolean;
  isSystem: boolean;
  sortOrder: number;
  accessLevel: 'all' | 'premium' | 'enterprise';
  pageCount?: number;
  activePageCount?: number;
}

interface PageCategory {
  _id: string;
  displayName: string;
  label: string;
  sortOrder: number;
}

interface _Page {
  _id: string;
  name: string;
  displayName: string;
  description: string;
  route: string;
  icon: string;
  moduleCategory?: string;      // deprecated — kept for legacy fallback
  category?: PageCategory;      // populated ObjectId → PageCategory
  sortOrder: number;
  isSystem: boolean;
  isActive: boolean;
}

// Tree types (mirrors pages.tsx hierarchy from /api/rbac/pages/tree-structure)
interface TreePage {
  _id: string;
  name: string;
  displayName: string;
  route: string;
  icon: string;
  isActive: boolean;
  isSystem: boolean;
  isMenuGroup: boolean;
  menuGroupLevel?: 1 | 2 | null;
  sortOrder: number;
  featureFlags?: { enabledForAll?: boolean };  // always accessible pages (e.g. auth pages)
  l2Groups?: TreePage[];       // L1 only
  directChildren?: TreePage[]; // L1 only
  children?: TreePage[];       // L2 only
}

interface CategoryTree {
  _id: string;
  identifier: string;
  displayName: string;
  label: string;
  sortOrder: number;
  l1MenuGroups: TreePage[];
  directChildren: TreePage[];
}

interface ModuleStats {
  totalModules: number;
  activeModules: number;
  systemModules: number;
  totalFeatures: number;
  byAccessLevel: { _id: string; count: number }[];
}

const ACCESS_LEVEL_LABELS: Record<string, string> = {
  'all': 'All Plans',
  'premium': 'Premium',
  'enterprise': 'Enterprise',
};

const _MODULE_CATEGORY_LABELS: Record<string, string> = {
  'super-admin': 'Super Admin',
  'users-permissions': 'Users & Permissions',
  'applications': 'Applications',
  'hrm': 'HRM',
  'projects': 'Projects',
  'crm': 'CRM',
  'recruitment': 'Recruitment',
  'finance': 'Finance & Accounts',
  'administration': 'Administration',
  'content': 'Content',
  'pages': 'Pages',
  'auth': 'Authentication',
  'ui': 'UI Interface',
  'extras': 'Extras',
  'dashboards': 'Dashboards',
  'reports': 'Reports',
};

const Modules = () => {
  // State
  const [loading, setLoading] = useState(true);
  const [_loadingTree, setLoadingTree] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modules, setModules] = useState<Module[]>([]);
  const [categoryTree, setCategoryTree] = useState<CategoryTree[]>([]);
  const [stats, setStats] = useState<ModuleStats | null>(null);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showPageModal, setShowPageModal] = useState(false);
  const [moduleMode, setModuleMode] = useState<'create' | 'edit'>('create');

  // Page configuration state
  const [modulePages, setModulePages] = useState<ModulePage[]>([]);
  const [expandedCatIds, setExpandedCatIds] = useState<Set<string>>(new Set());
  const [expandedL1Ids, setExpandedL1Ids] = useState<Set<string>>(new Set());
  const [expandedL2Ids, setExpandedL2Ids] = useState<Set<string>>(new Set());

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Form state for new module
  const [moduleForm, setModuleForm] = useState({
    name: '',
    displayName: '',
    description: '',
    icon: 'ti ti-folder',
    route: '',
    color: '#6366f1',
    accessLevel: 'all' as 'all' | 'premium' | 'enterprise',
  });

  // Fetch modules and stats on mount
  useEffect(() => {
    fetchModules();
    fetchStats();
    fetchTreeStructure();
  }, []);

  const fetchModules = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/rbac/modules`);
      const data = await response.json();
      if (data.success) {
        setModules(data.data);
      }
    } catch (error) {
      console.error('Error fetching modules:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/rbac/modules/stats`);
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Fetch full hierarchical page tree (same endpoint as Pages page)
  const fetchTreeStructure = async () => {
    try {
      setLoadingTree(true);
      const response = await fetch(`${API_BASE}/api/rbac/pages/tree-structure`);
      const data = await response.json();
      if (data.success) setCategoryTree(data.data);
    } catch (error) {
      console.error('Error fetching page tree:', error);
    } finally {
      setLoadingTree(false);
    }
  };

  // Filter modules
  const filteredModules = modules.filter(mod => {
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && mod.isActive) ||
      (filterStatus === 'inactive' && !mod.isActive);
    const matchesSearch = searchTerm === '' ||
      mod.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mod.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Handle toggle module status
  const handleToggleStatus = async (moduleId: string) => {
    try {
      setSaving(true);
      const response = await fetch(`${API_BASE}/api/rbac/modules/${moduleId}/toggle-status`, {
        method: 'PATCH',
      });
      const data = await response.json();
      if (data.success) {
        await fetchModules();
        await fetchStats();
      } else {
        alert(data.error?.message || 'Failed to toggle status');
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Failed to toggle status');
    } finally {
      setSaving(false);
    }
  };

  // Handle open create module modal
  const handleOpenCreateModule = () => {
    setModuleForm({
      name: '',
      displayName: '',
      description: '',
      icon: 'ti ti-folder',
      route: '',
      color: '#6366f1',
      accessLevel: 'all',
    });
    setModuleMode('create');
    setShowModuleModal(true);
  };

  // Handle open edit module modal
  const handleOpenEditModule = (module: Module) => {
    setModuleForm({
      name: module.name,
      displayName: module.displayName,
      description: module.description || '',
      icon: module.icon,
      route: module.route,
      color: module.color,
      accessLevel: module.accessLevel,
    });
    setSelectedModule(module);
    setModuleMode('edit');
    setShowModuleModal(true);
  };

  // Handle save module
  const handleSaveModule = async () => {
    try {
      setSaving(true);
      const url = moduleMode === 'create'
        ? `${API_BASE}/api/rbac/modules`
        : `${API_BASE}/api/rbac/modules/${selectedModule?._id}`;
      const method = moduleMode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(moduleForm),
      });
      const data = await response.json();
      if (data.success) {
        setShowModuleModal(false);
        await fetchModules();
        await fetchStats();
      } else {
        alert(data.error?.message || 'Failed to save module');
      }
    } catch (error) {
      console.error('Error saving module:', error);
      alert('Failed to save module');
    } finally {
      setSaving(false);
    }
  };

  // Handle open page configuration modal
  const handleOpenPageModal = (module: Module) => {
    setSelectedModule(module);
    setModulePages(module.pages || []);
    setShowPageModal(true);
  };

  // ── Leaf-page ID collectors (excludes always-on pages — they can't be toggled) ──
  const getLeafIdsFromL2 = (l2: TreePage): string[] =>
    (l2.children || []).filter(p => !isAlwaysOn(p)).map(p => p._id);

  const getLeafIdsFromL1 = (l1: TreePage): string[] => [
    ...(l1.directChildren || []).filter(p => !isAlwaysOn(p)).map(p => p._id),
    ...(l1.l2Groups || []).flatMap(l2 => getLeafIdsFromL2(l2)),
  ];

  const getLeafIdsFromCategory = (cat: CategoryTree): string[] => [
    ...(cat.directChildren || []).filter(p => !isAlwaysOn(p)).map(p => p._id),
    ...(cat.l1MenuGroups || []).flatMap(l1 => getLeafIdsFromL1(l1)),
  ];

  // True if a page is always accessible (no module assignment needed)
  const isAlwaysOn = (page: TreePage) => page.featureFlags?.enabledForAll === true;

  // True if a category has at least one configurable (non-always-on) page
  const categoryHasConfigurablePages = (cat: CategoryTree): boolean => {
    if ((cat.directChildren || []).some(p => !isAlwaysOn(p))) return true;
    return (cat.l1MenuGroups || []).some(l1 =>
      (l1.directChildren || []).some(p => !isAlwaysOn(p)) ||
      (l1.l2Groups || []).some(l2 => (l2.children || []).some(p => !isAlwaysOn(p)))
    );
  };

  // Flat list of assignable leaf pages (excludes always-on pages — they need no assignment)
  const allLeafPages = React.useMemo<TreePage[]>(() => {
    const pages: TreePage[] = [];
    for (const cat of categoryTree) {
      for (const p of cat.directChildren || []) if (!isAlwaysOn(p)) pages.push(p);
      for (const l1 of cat.l1MenuGroups || []) {
        for (const p of l1.directChildren || []) if (!isAlwaysOn(p)) pages.push(p);
        for (const l2 of l1.l2Groups || []) {
          for (const p of l2.children || []) if (!isAlwaysOn(p)) pages.push(p);
        }
      }
    }
    return pages;
  }, [categoryTree]);

  // ── Assignment helpers ─────────────────────────────────────────────────────
  const resolveModulePageId = (mp: ModulePage): string | null => {
    const raw = mp.pageId as any;
    if (raw === null || raw === undefined) return null;
    const id = typeof raw === 'object' ? String(raw._id) : String(raw);
    // Reject placeholder strings that are not real ObjectIds
    return id && id !== 'null' && id !== 'undefined' ? id : null;
  };

  const isPageAssigned = (pageId: string): boolean =>
    modulePages.some(mp => {
      const id = resolveModulePageId(mp);
      return id !== null && id === String(pageId);
    });

  type AssignState = 'all' | 'some' | 'none';
  const getAssignState = (pageIds: string[]): AssignState => {
    if (!pageIds.length) return 'none';
    const n = pageIds.filter(id => isPageAssigned(id)).length;
    if (n === 0) return 'none';
    if (n === pageIds.length) return 'all';
    return 'some';
  };

  // Bulk assign/unassign via PUT /api/rbac/modules/:id/pages (replaces all)
  const handleGroupToggle = async (pageIds: string[], assign: boolean) => {
    if (!selectedModule) return;
    try {
      setSaving(true);
      const currentIds = modulePages.map(resolveModulePageId).filter((id): id is string => id !== null);
      let nextIds: string[];
      if (assign) {
        nextIds = [...new Set([...currentIds, ...pageIds])];
      } else {
        const removeSet = new Set(pageIds);
        nextIds = currentIds.filter(id => !removeSet.has(id));
      }
      const body = { pages: nextIds.map(pageId => ({ pageId, isActive: true })) };
      const response = await fetch(`${API_BASE}/api/rbac/modules/${selectedModule._id}/pages`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (data.success) setModulePages(data.data.pages || []);
      else alert(data.error?.message || 'Failed to update pages');
    } catch (error) {
      console.error('Error updating pages:', error);
      alert('Failed to update pages');
    } finally {
      setSaving(false);
    }
  };

  // Auto-expand all categories when the page modal opens
  useEffect(() => {
    if (showPageModal && categoryTree.length > 0) {
      setExpandedCatIds(new Set(categoryTree.map(c => c._id)));
    }
  }, [showPageModal, categoryTree]);

  const toggleCat = (id: string) =>
    setExpandedCatIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const toggleL1 = (id: string) =>
    setExpandedL1Ids(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const toggleL2 = (id: string) =>
    setExpandedL2Ids(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  // Toggle individual page assignment (add/remove)
  const handleTogglePageAssignment = async (pageId: string, isCurrentlyAssigned: boolean) => {
    if (isCurrentlyAssigned) {
      await handleRemovePage(pageId);
    } else {
      await handleAddPage(pageId);
    }
  };

  // Handle add page to module
  const handleAddPage = async (pageId: string) => {
    if (!selectedModule) return;

    try {
      setSaving(true);
      const response = await fetch(`${API_BASE}/api/rbac/modules/${selectedModule._id}/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId }),
      });
      const data = await response.json();
      if (data.success) {
        setModulePages(data.data.pages || []);
      } else {
        alert(data.error?.message || 'Failed to add page');
      }
    } catch (error) {
      console.error('Error adding page:', error);
      alert('Failed to add page');
    } finally {
      setSaving(false);
    }
  };

  // Handle remove page from module
  const handleRemovePage = async (pageId: string) => {
    if (!selectedModule) return;

    try {
      setSaving(true);
      const response = await fetch(`${API_BASE}/api/rbac/modules/${selectedModule._id}/pages/${pageId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setModulePages(data.data.pages || []);
      } else {
        alert(data.error?.message || 'Failed to remove page');
      }
    } catch (error) {
      console.error('Error removing page:', error);
      alert('Failed to remove page');
    } finally {
      setSaving(false);
    }
  };

  // Handle toggle page active status
  const _handleTogglePage = async (pageId: string) => {
    if (!selectedModule) return;

    try {
      setSaving(true);
      const response = await fetch(`${API_BASE}/api/rbac/modules/${selectedModule._id}/pages/${pageId}/toggle`, {
        method: 'PATCH',
      });
      const data = await response.json();
      if (data.success) {
        setModulePages(data.data.pages || []);
      } else {
        alert(data.error?.message || 'Failed to toggle page');
      }
    } catch (error) {
      console.error('Error toggling page:', error);
      alert('Failed to toggle page');
    } finally {
      setSaving(false);
    }
  };

  // Handle delete module
  const handleDeleteModule = async (moduleId: string) => {
    if (!window.confirm('Are you sure you want to delete this module? This will also remove all associated pages.')) return;
    try {
      setSaving(true);
      const response = await fetch(`${API_BASE}/api/rbac/modules/${moduleId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        await fetchModules();
        await fetchStats();
      } else {
        alert(data.error?.message || 'Failed to delete module');
      }
    } catch (error) {
      console.error('Error deleting module:', error);
      alert('Failed to delete module');
    } finally {
      setSaving(false);
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
              <h2 className="mb-1">Modules</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={all_routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">Super Admin</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Modules
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
            {/* Total Modules */}
            <div className="col-lg-3 col-md-6 d-flex">
              <div className="card flex-fill">
                <div className="card-body d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center overflow-hidden">
                    <div>
                      <span className="avatar avatar-lg bg-dark rounded-circle">
                        <i className="ti ti-apps" />
                      </span>
                    </div>
                    <div className="ms-2 overflow-hidden">
                      <p className="fs-12 fw-medium mb-1 text-truncate">
                        Total Modules
                      </p>
                      <h4>{stats?.totalModules || 0}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* /Total Modules */}
            {/* Active Modules */}
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
                        Active Modules
                      </p>
                      <h4>{stats?.activeModules || 0}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* /Active Modules */}
            {/* System Modules */}
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
                        System Modules
                      </p>
                      <h4>{stats?.systemModules || 0}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* /System Modules */}
            {/* Total Pages */}
            <div className="col-lg-3 col-md-6 d-flex">
              <div className="card flex-fill">
                <div className="card-body d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center overflow-hidden">
                    <div>
                      <span className="avatar avatar-lg bg-warning rounded-circle">
                        <i className="ti ti-file" />
                      </span>
                    </div>
                    <div className="ms-2 overflow-hidden">
                      <p className="fs-12 fw-medium mb-1 text-truncate">
                        Total Pages
                      </p>
                      <h4>{allLeafPages.length || 0}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* /Total Pages */}
          </div>
          {/* /Stats Cards */}

          {/* Filters and Actions */}
          <div className="card mb-3">
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-md-4">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search modules..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="col-md-4">
                  <select
                    className="form-select"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="col-md-4 text-end">
                  <button
                    className="btn btn-primary"
                    onClick={handleOpenCreateModule}
                  >
                    <i className="ti ti-plus me-1"></i> Create Module
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Modules List */}
          <div className="card mb-3">
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: '25%' }}>Module</th>
                      <th style={{ width: '15%' }}>Route</th>
                      <th style={{ width: '20%' }}>Pages</th>
                      <th style={{ width: '10%' }}>Access</th>
                      <th style={{ width: '10%' }}>Status</th>
                      <th style={{ width: '20%' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredModules.map(module => (
                      <tr key={module._id}>
                        <td>
                          <div className="d-flex align-items-center">
                            <div
                              className="me-2 rounded d-flex align-items-center justify-content-center"
                              style={{
                                width: '36px',
                                height: '36px',
                                backgroundColor: module.color + '20',
                                color: module.color
                              }}
                            >
                              <i className={module.icon}></i>
                            </div>
                            <div>
                              <div className="fw-medium">{module.displayName}</div>
                              <small className="text-muted">{module.description || module.name}</small>
                            </div>
                            {module.isSystem && (
                              <span className="badge bg-info ms-2">System</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <code className="small">{module.route}</code>
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleOpenPageModal(module)}
                          >
                            <i className="ti ti-file me-1"></i>
                            {module.activePageCount || 0}/{module.pages?.length || 0} Pages
                          </button>
                        </td>
                        <td>
                          <span className={`badge ${module.accessLevel === 'all' ? 'bg-success' :
                              module.accessLevel === 'premium' ? 'bg-warning' :
                                'bg-danger'
                            }`}>
                            {ACCESS_LEVEL_LABELS[module.accessLevel] || module.accessLevel}
                          </span>
                        </td>
                        <td>
                          <div className="form-check form-switch">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={module.isActive}
                              onChange={() => handleToggleStatus(module._id)}
                              disabled={saving || (module.isSystem && module.isActive)}
                            />
                          </div>
                        </td>
                        <td>
                          <div className="dropdown">
                            <button
                              className="btn btn-outline-light btn-sm"
                              type="button"
                              data-bs-toggle="dropdown"
                            >
                              <i className="ti ti-dots-vertical"></i>
                            </button>
                            <ul className="dropdown-menu dropdown-menu-end">
                              <li>
                                <button
                                  className="dropdown-item"
                                  onClick={() => handleOpenPageModal(module)}
                                >
                                  <i className="ti ti-file me-2"></i>Configure Pages
                                </button>
                              </li>
                              <li>
                                <button
                                  className="dropdown-item"
                                  onClick={() => handleOpenEditModule(module)}
                                >
                                  <i className="ti ti-edit me-2"></i>Edit Module
                                </button>
                              </li>
                              <li><hr className="dropdown-divider" /></li>
                              <li>
                                <button
                                  className="dropdown-item text-danger"
                                  onClick={() => handleDeleteModule(module._id)}
                                  disabled={module.isSystem}
                                >
                                  <i className="ti ti-trash me-2"></i>Delete
                                </button>
                              </li>
                            </ul>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {filteredModules.length === 0 && (
            <div className="card">
              <div className="card-body text-center py-5">
                <i className="ti ti-folder-off fs-1 text-muted"></i>
                <h5 className="mt-3">No modules found</h5>
                <p className="text-muted">Create a new module to get started.</p>
                <button className="btn btn-primary" onClick={handleOpenCreateModule}>
                  <i className="ti ti-plus me-1"></i> Create Module
                </button>
              </div>
            </div>
          )}
        </div>
        <Footer />
      </div>

      {/* Create/Edit Module Modal */}
      {showModuleModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {moduleMode === 'create' ? 'Create New Module' : 'Edit Module'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModuleModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Display Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={moduleForm.displayName}
                      onChange={(e) => {
                        const displayName = e.target.value;
                        setModuleForm({
                          ...moduleForm,
                          displayName,
                          name: moduleMode === 'create' ? displayName.toLowerCase().replace(/[^a-z0-9-]/g, '-') : moduleForm.name,
                        });
                      }}
                      placeholder="e.g., Human Resources"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Identifier *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={moduleForm.name}
                      onChange={(e) => setModuleForm({ ...moduleForm, name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                      placeholder="e.g., hrm"
                      disabled={moduleMode === 'edit'}
                    />
                    <small className="text-muted">Unique identifier (lowercase, no spaces)</small>
                  </div>
                </div>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Route Path *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={moduleForm.route}
                      onChange={(e) => setModuleForm({ ...moduleForm, route: e.target.value })}
                      placeholder="e.g., /hrm"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Color</label>
                    <div className="input-group">
                      <input
                        type="color"
                        className="form-control form-control-color"
                        value={moduleForm.color}
                        onChange={(e) => setModuleForm({ ...moduleForm, color: e.target.value })}
                        style={{ width: '50px' }}
                      />
                      <input
                        type="text"
                        className="form-control"
                        value={moduleForm.color}
                        onChange={(e) => setModuleForm({ ...moduleForm, color: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Icon</label>
                    <input
                      type="text"
                      className="form-control"
                      value={moduleForm.icon}
                      onChange={(e) => setModuleForm({ ...moduleForm, icon: e.target.value })}
                      placeholder="e.g., ti ti-users"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Access Level</label>
                    <select
                      className="form-select"
                      value={moduleForm.accessLevel}
                      onChange={(e) => setModuleForm({ ...moduleForm, accessLevel: e.target.value as any })}
                    >
                      <option value="all">All Plans</option>
                      <option value="premium">Premium</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    value={moduleForm.description}
                    onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                    placeholder="Brief description of the module"
                    rows={2}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModuleModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveModule}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : (moduleMode === 'create' ? 'Create Module' : 'Save Changes')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Page Configuration Modal */}
      {showPageModal && selectedModule && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title">
                    Configure Pages - {selectedModule.displayName}
                  </h5>
                  <small className="text-muted">
                    Module: <code>{selectedModule.name}</code> | Route: <code>{selectedModule.route}</code>
                  </small>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowPageModal(false)}
                ></button>
              </div>
              <div className="modal-body p-0">
                <div className="card border-0">
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <h6 className="mb-0">
                      <i className="ti ti-file me-2"></i>
                      Module Pages Configuration
                    </h6>
                    <div className="d-flex align-items-center gap-3">
                      <span className="text-muted small">
                        {modulePages.length} of {allLeafPages.length} assigned
                      </span>
                      {saving && (
                        <span className="badge bg-warning">
                          <i className="ti ti-loader me-1"></i>Saving...
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="card-body p-0" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                    {categoryTree.length === 0 ? (
                      <div className="text-center py-5 text-muted">
                        <i className="ti ti-file-off fs-1"></i>
                        <p className="mt-2 mb-0">No pages found in the system.</p>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-bordered mb-0">
                          <thead className="table-light">
                            <tr>
                              <th>Page Structure</th>
                              <th className="text-center" style={{ width: '90px' }}>Assigned</th>
                            </tr>
                          </thead>
                          <tbody>
                            {categoryTree.map(cat => {
                              // Skip categories where all pages are always-on (e.g. Authentication)
                              if (!categoryHasConfigurablePages(cat)) return null;
                              const catLeafIds = getLeafIdsFromCategory(cat);
                              const catState: AssignState = getAssignState(catLeafIds);
                              const catExpanded = expandedCatIds.has(cat._id);
                              const assignedCount = catLeafIds.filter(id => isPageAssigned(id)).length;
                              return (
                                <React.Fragment key={cat._id}>

                                  {/* ── Category row ── */}
                                  <tr style={{ backgroundColor: '#1a1f2e' }}>
                                    <td>
                                      <div
                                        className="d-flex align-items-center p-1 cursor-pointer"
                                        style={{ color: '#fff' }}
                                        onClick={() => toggleCat(cat._id)}
                                      >
                                        <i className={`ti ti-chevron-${catExpanded ? 'down' : 'right'} me-2`} style={{ color: '#fff' }}></i>
                                        <span className="badge bg-primary me-2">{cat.identifier}</span>
                                        <span className="fw-bold" style={{ color: '#000' }}>{cat.displayName}</span>
                                        <span className="badge bg-info ms-2">{assignedCount}/{catLeafIds.length}</span>
                                      </div>
                                    </td>
                                    <td className="text-center align-middle">
                                      <input
                                        ref={el => { if (el) el.indeterminate = catState === 'some'; }}
                                        className="form-check-input"
                                        type="checkbox"
                                        checked={catState === 'all'}
                                        onChange={() => handleGroupToggle(catLeafIds, catState !== 'all')}
                                        disabled={saving || !catLeafIds.length}
                                        title={catState === 'all' ? 'Unassign all' : 'Assign all'}
                                      />
                                    </td>
                                  </tr>

                                  {catExpanded && (
                                    <>
                                      {/* Category direct children (excludes always-on pages) */}
                                      {cat.directChildren?.filter(p => !isAlwaysOn(p)).map(page => {
                                        const assigned = isPageAssigned(page._id);
                                        return (
                                          <tr key={page._id} className={assigned ? '' : 'table-light'}>
                                            <td>
                                              <div className="d-flex align-items-center p-1" style={{ paddingLeft: '32px' }}>
                                                <i className={`${page.icon || 'ti ti-file'} me-2 text-muted`}></i>
                                                <span>{page.displayName}</span>
                                                {page.isSystem && <span className="badge bg-info ms-1">System</span>}
                                                {page.route && <code className="small text-muted ms-2">{page.route}</code>}
                                              </div>
                                            </td>
                                            <td className="text-center align-middle">
                                              <input
                                                className="form-check-input"
                                                type="checkbox"
                                                checked={assigned}
                                                onChange={() => handleTogglePageAssignment(page._id, assigned)}
                                                disabled={saving}
                                              />
                                            </td>
                                          </tr>
                                        );
                                      })}

                                      {/* L1 Menu Groups */}
                                      {cat.l1MenuGroups?.map(l1 => {
                                        const l1LeafIds = getLeafIdsFromL1(l1);
                                        const l1State: AssignState = getAssignState(l1LeafIds);
                                        const l1Expanded = expandedL1Ids.has(l1._id);
                                        const l1Count = l1LeafIds.filter(id => isPageAssigned(id)).length;
                                        return (
                                          <React.Fragment key={l1._id}>

                                            {/* ── L1 row ── */}
                                            <tr className="table-light">
                                              <td>
                                                <div
                                                  className="d-flex align-items-center p-1 cursor-pointer"
                                                  style={{ paddingLeft: '24px' }}
                                                  onClick={() => toggleL1(l1._id)}
                                                >
                                                  <i className={`ti ti-chevron-${l1Expanded ? 'down' : 'right'} me-2 text-muted`}></i>
                                                  <i className={`${l1.icon || 'ti ti-folder'} me-2 text-primary`}></i>
                                                  <span className="fw-semibold text-primary">{l1.displayName}</span>
                                                  <span className="badge bg-light text-dark border ms-2" style={{ fontSize: '10px' }}>L1</span>
                                                  <span className="badge bg-secondary ms-2">{l1Count}/{l1LeafIds.length}</span>
                                                </div>
                                              </td>
                                              <td className="text-center align-middle">
                                                <input
                                                  ref={el => { if (el) el.indeterminate = l1State === 'some'; }}
                                                  className="form-check-input"
                                                  type="checkbox"
                                                  checked={l1State === 'all'}
                                                  onChange={() => handleGroupToggle(l1LeafIds, l1State !== 'all')}
                                                  disabled={saving || !l1LeafIds.length}
                                                  title={l1State === 'all' ? 'Unassign all' : 'Assign all in group'}
                                                />
                                              </td>
                                            </tr>

                                            {l1Expanded && (
                                              <>
                                                {/* L1 direct children (excludes always-on pages) */}
                                                {l1.directChildren?.filter(p => !isAlwaysOn(p)).map(page => {
                                                  const assigned = isPageAssigned(page._id);
                                                  return (
                                                    <tr key={page._id} className={assigned ? '' : 'table-light'}>
                                                      <td>
                                                        <div className="d-flex align-items-center p-1" style={{ paddingLeft: '48px' }}>
                                                          <i className={`${page.icon || 'ti ti-file'} me-2 text-muted`}></i>
                                                          <span>{page.displayName}</span>
                                                          {page.isSystem && <span className="badge bg-info ms-1">System</span>}
                                                          {page.route && <code className="small text-muted ms-2">{page.route}</code>}
                                                        </div>
                                                      </td>
                                                      <td className="text-center align-middle">
                                                        <input
                                                          className="form-check-input"
                                                          type="checkbox"
                                                          checked={assigned}
                                                          onChange={() => handleTogglePageAssignment(page._id, assigned)}
                                                          disabled={saving}
                                                        />
                                                      </td>
                                                    </tr>
                                                  );
                                                })}

                                                {/* L2 Menu Groups */}
                                                {l1.l2Groups?.map(l2 => {
                                                  const l2LeafIds = getLeafIdsFromL2(l2);
                                                  const l2State: AssignState = getAssignState(l2LeafIds);
                                                  const l2Expanded = expandedL2Ids.has(l2._id);
                                                  const l2Count = l2LeafIds.filter(id => isPageAssigned(id)).length;
                                                  return (
                                                    <React.Fragment key={l2._id}>

                                                      {/* ── L2 row ── */}
                                                      <tr style={{ backgroundColor: '#eef2ff' }}>
                                                        <td>
                                                          <div
                                                            className="d-flex align-items-center p-1 cursor-pointer"
                                                            style={{ paddingLeft: '48px' }}
                                                            onClick={() => toggleL2(l2._id)}
                                                          >
                                                            <i className={`ti ti-chevron-${l2Expanded ? 'down' : 'right'} me-2 text-muted`}></i>
                                                            <i className={`${l2.icon || 'ti ti-folder'} me-2 text-info`}></i>
                                                            <span className="fw-semibold text-info">{l2.displayName}</span>
                                                            <span className="badge bg-light text-dark border ms-2" style={{ fontSize: '10px' }}>L2</span>
                                                            <span className="badge bg-secondary ms-2">{l2Count}/{l2LeafIds.length}</span>
                                                          </div>
                                                        </td>
                                                        <td className="text-center align-middle">
                                                          <input
                                                            ref={el => { if (el) el.indeterminate = l2State === 'some'; }}
                                                            className="form-check-input"
                                                            type="checkbox"
                                                            checked={l2State === 'all'}
                                                            onChange={() => handleGroupToggle(l2LeafIds, l2State !== 'all')}
                                                            disabled={saving || !l2LeafIds.length}
                                                            title={l2State === 'all' ? 'Unassign all' : 'Assign all in group'}
                                                          />
                                                        </td>
                                                      </tr>

                                                      {/* L2 children (excludes always-on pages) */}
                                                      {l2Expanded && l2.children?.filter(p => !isAlwaysOn(p)).map(page => {
                                                        const assigned = isPageAssigned(page._id);
                                                        return (
                                                          <tr key={page._id} className={assigned ? '' : 'table-light'}>
                                                            <td>
                                                              <div className="d-flex align-items-center p-1" style={{ paddingLeft: '72px' }}>
                                                                <i className={`${page.icon || 'ti ti-file'} me-2 text-muted`}></i>
                                                                <span>{page.displayName}</span>
                                                                {page.isSystem && <span className="badge bg-info ms-1">System</span>}
                                                                {page.route && <code className="small text-muted ms-2">{page.route}</code>}
                                                              </div>
                                                            </td>
                                                            <td className="text-center align-middle">
                                                              <input
                                                                className="form-check-input"
                                                                type="checkbox"
                                                                checked={assigned}
                                                                onChange={() => handleTogglePageAssignment(page._id, assigned)}
                                                                disabled={saving}
                                                              />
                                                            </td>
                                                          </tr>
                                                        );
                                                      })}

                                                    </React.Fragment>
                                                  );
                                                })}
                                              </>
                                            )}

                                          </React.Fragment>
                                        );
                                      })}
                                    </>
                                  )}

                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowPageModal(false)}
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

export default Modules;
