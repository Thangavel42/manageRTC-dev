import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { all_routes } from "../router/all_routes";
import CollapseHeader from "../../core/common/collapse-header/collapse-header";
import Footer from "../../core/common/footer";

// API Base URL
const API_BASE = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

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
  'hrm': 'HRM',
  'projects': 'Projects',
  'crm': 'CRM',
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
  const handleOpenPageModal = async (module: Module) => {
    setSelectedModule(module);
    setModulePages(module.pages || []);
    setShowPageModal(true);
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
          <div className="row mb-3">
            <div className="col-md-3">
              <div className="card bg-primary">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="flex-grow-1">
                      <span className="text-white-50">Total Modules</span>
                      <h3 className="text-white mb-0">{stats?.totalModules || 0}</h3>
                    </div>
                    <div className="text-white">
                      <i className="ti ti-apps fs-1 opacity-50"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-success">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="flex-grow-1">
                      <span className="text-white-50">Active Modules</span>
                      <h3 className="text-white mb-0">{stats?.activeModules || 0}</h3>
                    </div>
                    <div className="text-white">
                      <i className="ti ti-check fs-1 opacity-50"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-info">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="flex-grow-1">
                      <span className="text-white-50">System Modules</span>
                      <h3 className="text-white mb-0">{stats?.systemModules || 0}</h3>
                    </div>
                    <div className="text-white">
                      <i className="ti ti-lock fs-1 opacity-50"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-warning">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="flex-grow-1">
                      <span className="text-white-50">Total Pages</span>
                      <h3 className="text-white mb-0">{allPages.length || 0}</h3>
                    </div>
                    <div className="text-white">
                      <i className="ti ti-file fs-1 opacity-50"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

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
                            {module.activePageCount || 0}/{module.pageCount || 0} Pages
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
                      All Pages
                    </h6>
                    {saving && (
                      <span className="badge bg-warning">
                        <i className="ti ti-loader me-1"></i>Saving...
                      </span>
                    )}
                  </div>
                  <div className="card-body p-0" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    <div className="table-responsive">
                      <table className="table table-bordered mb-0">
                        <thead className="table-light">
                          <tr>
                            <th style={{ width: '5%' }}>Icon</th>
                            <th style={{ width: '25%' }}>Page Name</th>
                            <th style={{ width: '20%' }}>Route</th>
                            <th style={{ width: '15%' }}>Category</th>
                            <th className="text-center" style={{ width: '15%' }}>
                              <i className="ti ti-check me-1"></i>Assigned
                            </th>
                            <th className="text-center" style={{ width: '15%' }}>
                              <i className="ti ti-power me-1"></i>Active
                            </th>
                            <th style={{ width: '5%' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...allPages].sort((a, b) => {
                            const aInModule = modulePages.some(mp => mp.pageId === a._id);
                            const bInModule = modulePages.some(mp => mp.pageId === b._id);
                            if (aInModule && !bInModule) return -1;
                            if (!aInModule && bInModule) return 1;
                            return a.displayName.localeCompare(b.displayName);
                          }).map(page => {
                            const modulePage = modulePages.find(mp => mp.pageId === page._id);
                            const isAssigned = !!modulePage;
                            const isActive = modulePage?.isActive ?? false;
                            return (
                              <tr
                                key={page._id}
                                className={isAssigned ? '' : 'table-light'}
                              >
                                <td className="text-center">
                                  <i className={page.icon}></i>
                                </td>
                                <td>
                                  <div className="fw-medium">{page.displayName}</div>
                                  <small className="text-muted">{page.name}</small>
                                </td>
                                <td>
                                  <code className="small">{page.route}</code>
                                </td>
                                <td>
                                  <span className="badge bg-light text-dark">
                                    {MODULE_CATEGORY_LABELS[page.moduleCategory] || page.moduleCategory}
                                  </span>
                                </td>
                                <td className="text-center">
                                  <div className="form-check form-check-md d-flex justify-content-center">
                                    <input
                                      className="form-check-input"
                                      type="checkbox"
                                      checked={isAssigned}
                                      onChange={() => {
                                        if (isAssigned) {
                                          handleRemovePage(page._id);
                                        } else {
                                          handleAddPage(page._id);
                                        }
                                      }}
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
                                <td></td>
                              </tr>
                            );
                          })}
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
                <div className="me-auto">
                  <span className="text-muted">
                    <i className="ti ti-info-circle me-1"></i>
                    {modulePages.length} of {allPages.length} pages assigned
                  </span>
                </div>
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
