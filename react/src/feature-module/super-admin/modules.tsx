import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { all_routes } from "../router/all_routes";
import CollapseHeader from "../../core/common/collapse-header/collapse-header";
import Footer from "../../core/common/footer";

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

interface Page {
  _id: string;
  name: string;
  displayName: string;
  description: string;
  route: string;
  icon: string;
  moduleCategory: string;
  sortOrder: number;
  isSystem: boolean;
  isActive: boolean;
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

const MODULE_CATEGORY_LABELS: Record<string, string> = {
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

// Only allow these modules to be displayed/managed
const ALLOWED_MODULES = ['hrm', 'projects', 'crm'];

const Modules = () => {
  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modules, setModules] = useState<Module[]>([]);
  const [allPages, setAllPages] = useState<Page[]>([]);
  const [stats, setStats] = useState<ModuleStats | null>(null);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showPageModal, setShowPageModal] = useState(false);
  const [moduleMode, setModuleMode] = useState<'create' | 'edit'>('create');

  // Page configuration state
  const [modulePages, setModulePages] = useState<ModulePage[]>([]);
  const [expandedPageCategories, setExpandedPageCategories] = useState<Set<string>>(new Set());

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
    fetchAllPages();
  }, []);

  const fetchModules = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/rbac/modules`);
      const data = await response.json();
      if (data.success) {
        // Only display HRM, Projects, and CRM modules
        const filteredModules = data.data.filter(mod =>
          ALLOWED_MODULES.includes(mod.name)
        );
        setModules(filteredModules);
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

  const fetchAllPages = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/rbac/modules/pages`);
      const data = await response.json();
      if (data.success) {
        setAllPages(data.data);
      }
    } catch (error) {
      console.error('Error fetching pages:', error);
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

  // Expand all categories when modal opens and allPages is available
  useEffect(() => {
    if (showPageModal && allPages.length > 0) {
      const categories = Array.from(new Set(allPages.map(p => p.moduleCategory)));
      setExpandedPageCategories(new Set(categories));
    }
  }, [showPageModal, allPages]);

  // Toggle page category expansion
  const togglePageCategory = (category: string) => {
    const newExpanded = new Set(expandedPageCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedPageCategories(newExpanded);
  };

  // Toggle page assignment (add/remove)
  const handleTogglePageAssignment = async (pageId: string, isCurrentlyAssigned: boolean) => {
    if (isCurrentlyAssigned) {
      await handleRemovePage(pageId);
    } else {
      await handleAddPage(pageId);
    }
  };

  // Group pages by category
  const groupedPages = React.useMemo(() => {
    const groups: { category: string; pages: Page[] }[] = [];
    const categoryMap = new Map<string, Page[]>();

    allPages.forEach(page => {
      const category = page.moduleCategory || 'uncategorized';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(page);
    });

    categoryMap.forEach((pages, category) => {
      // Sort pages by sortOrder within each category
      const sortedPages = [...pages].sort((a, b) => a.sortOrder - b.sortOrder);
      groups.push({ category, pages: sortedPages });
    });

    // Sort categories alphabetically
    return groups.sort((a, b) => a.category.localeCompare(b.category));
  }, [allPages]);

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
  const handleTogglePage = async (pageId: string) => {
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
                      <h4>{allPages.length || 0}</h4>
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
                          <span className={`badge ${
                            module.accessLevel === 'all' ? 'bg-success' :
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
                        {modulePages.length} of {allPages.length} assigned
                      </span>
                      {saving && (
                        <span className="badge bg-warning">
                          <i className="ti ti-loader me-1"></i>Saving...
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="card-body p-0" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    <div className="table-responsive">
                      <table className="table table-bordered mb-0">
                        <thead className="table-light">
                          <tr>
                            <th style={{ width: '35%' }}>Page Name</th>
                            <th style={{ width: '25%' }}>Route</th>
                            <th className="text-center" style={{ width: '20%' }}>
                              <i className="ti ti-check me-1"></i>Assigned
                            </th>
                            <th className="text-center" style={{ width: '20%' }}>
                              <i className="ti ti-power me-1"></i>Active
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupedPages.map(group => (
                            <React.Fragment key={group.category}>
                              {/* Category Header Row */}
                              <tr className="table-light">
                                <td colSpan={4}>
                                  <button
                                    className="btn btn-link text-decoration-none p-0 fw-bold"
                                    onClick={() => togglePageCategory(group.category)}
                                  >
                                    <i className={`ti ti-chevron-${expandedPageCategories.has(group.category) ? 'down' : 'right'} me-1`}></i>
                                    {MODULE_CATEGORY_LABELS[group.category] || group.category.replace('-', ' ').toUpperCase()}
                                    <span className="badge bg-secondary ms-2">
                                      {modulePages.filter(mp => {
                                        const mpPageId = typeof mp.pageId === 'object' && mp.pageId !== null
                                          ? (mp.pageId as any)._id
                                          : mp.pageId;
                                        return group.pages.some(p => String(p._id) === String(mpPageId));
                                      }).length}/{group.pages.length}
                                    </span>
                                  </button>
                                </td>
                              </tr>
                              {/* Pages in this category */}
                              {expandedPageCategories.has(group.category) && group.pages.map(page => {
                                // Handle populated pageId (object with _id) vs string
                                const modulePage = modulePages.find(mp => {
                                  const mpPageId = typeof mp.pageId === 'object' && mp.pageId !== null
                                    ? (mp.pageId as any)._id
                                    : mp.pageId;
                                  return String(mpPageId) === String(page._id);
                                });
                                const isAssigned = !!modulePage;
                                const isActive = modulePage?.isActive ?? false;
                                return (
                                  <tr key={page._id} className={isAssigned ? '' : 'table-light'}>
                                    <td>
                                      <div className="d-flex align-items-center">
                                        <i className={`${page.icon} me-2 text-muted`}></i>
                                        <div>
                                          <span className="text-gray-9">{page.displayName}</span>
                                          <br />
                                          <small className="text-muted">{page.name}</small>
                                        </div>
                                      </div>
                                    </td>
                                    <td>
                                      <code className="small">{page.route}</code>
                                    </td>
                                    <td className="text-center">
                                      <div className="form-check form-check-md d-flex justify-content-center">
                                        <input
                                          className="form-check-input"
                                          type="checkbox"
                                          checked={isAssigned}
                                          onChange={() => handleTogglePageAssignment(page._id, isAssigned)}
                                          disabled={saving}
                                        />
                                      </div>
                                    </td>
                                    <td className="text-center">
                                      <div className="form-check form-check-md d-flex justify-content-center">
                                        <input
                                          className="form-check-input"
                                          type="checkbox"
                                          checked={isActive}
                                          onChange={() => handleTogglePage(page._id)}
                                          disabled={saving || !isAssigned}
                                        />
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {allPages.length === 0 && (
                      <div className="text-center py-5 text-muted">
                        <i className="ti ti-file-off fs-1"></i>
                        <p className="mt-2 mb-0">No pages found in the system.</p>
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
