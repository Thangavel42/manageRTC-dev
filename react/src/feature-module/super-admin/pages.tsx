import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { all_routes } from "../router/all_routes";
import CollapseHeader from "../../core/common/collapse-header/collapse-header";
import Footer from "../../core/common/footer";

// API Base URL
const API_BASE = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

// Types
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
  availableActions?: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface GroupedPages {
  _id: string;
  pages?: Page[];
  count: number;
}

interface PageStats {
  totalPages: number;
  activePages: number;
  systemPages: number;
  customPages: number;
  byCategory: { _id: string; count: number }[];
}

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

const ACTION_LABELS: Record<string, string> = {
  'all': 'All',
  'read': 'Read',
  'create': 'Create',
  'write': 'Write',
  'delete': 'Delete',
  'import': 'Import',
  'export': 'Export',
  'approve': 'Approve',
  'assign': 'Assign',
};

const Pages = () => {
  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pages, setPages] = useState<GroupedPages[]>([]);
  const [filteredPages, setFilteredPages] = useState<Page[]>([]);
  const [stats, setStats] = useState<PageStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'sortOrder' | 'name'>('sortOrder');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Modal states
  const [showPageModal, setShowPageModal] = useState(false);
  const [pageMode, setPageMode] = useState<'create' | 'edit' | 'view'>('view');
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);

  // Form state
  const [pageForm, setPageForm] = useState({
    name: '',
    displayName: '',
    description: '',
    route: '',
    icon: 'ti ti-file',
    moduleCategory: 'super-admin',
    sortOrder: 0,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  });

  // Fetch pages and stats on mount
  useEffect(() => {
    fetchPages();
    fetchStats();
  }, []);

  // Filter pages whenever dependencies change
  useEffect(() => {
    filterPages();
  }, [pages, searchTerm, categoryFilter, statusFilter, sortBy]);

  // Expand all categories when pages are loaded
  useEffect(() => {
    if (pages.length > 0) {
      const categories = new Set(pages.filter(p => p._id).map(p => p._id));
      setExpandedCategories(categories);
    }
  }, [pages]);

  const fetchPages = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/rbac/pages/grouped`);
      const data = await response.json();
      if (data.success) {
        setPages(data.data);
      }
    } catch (error) {
      console.error('Error fetching pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/rbac/pages/stats`);
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const filterPages = () => {
    let flatPages: Page[] = [];
    pages.forEach(group => {
      if (group.pages) {
        // Preserve category from group._id for each page
        const pagesWithCategory = group.pages.map(page => ({
          ...page,
          moduleCategory: page.moduleCategory || group._id
        }));
        flatPages = [...flatPages, ...pagesWithCategory];
      }
    });

    let filtered = flatPages;

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(p => p.moduleCategory === categoryFilter);
    }

    // Status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter(p => p.isActive);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(p => !p.isActive);
    }

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.displayName.toLowerCase().includes(searchLower) ||
        p.name.toLowerCase().includes(searchLower) ||
        p.route.toLowerCase().includes(searchLower) ||
        (p.description && p.description.toLowerCase().includes(searchLower))
      );
    }

    // Apply sorting
    if (sortBy === 'name') {
      filtered = [...filtered].sort((a, b) => a.displayName.localeCompare(b.displayName));
    } else {
      filtered = [...filtered].sort((a, b) => a.sortOrder - b.sortOrder);
    }

    setFilteredPages(filtered);
  };

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // Group filtered pages by category for display
  const groupedFilteredPages = React.useMemo(() => {
    const groups: { category: string; pages: Page[] }[] = [];
    const categoryMap = new Map<string, Page[]>();

    filteredPages.forEach(page => {
      const category = page.moduleCategory || 'uncategorized';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(page);
    });

    categoryMap.forEach((categoryPages, category) => {
      groups.push({ category, pages: categoryPages });
    });

    // Sort categories alphabetically
    return groups.sort((a, b) => a.category.localeCompare(b.category));
  }, [filteredPages]);

  const handleToggleStatus = async (pageId: string) => {
    try {
      setSaving(true);
      const response = await fetch(`${API_BASE}/api/rbac/pages/${pageId}/toggle-status`, {
        method: 'PATCH',
      });
      const data = await response.json();
      if (data.success) {
        await fetchPages();
        await fetchStats();
      } else {
        alert(data.error || 'Failed to toggle status');
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Failed to toggle status');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenCreateModal = () => {
    setPageForm({
      name: '',
      displayName: '',
      description: '',
      route: '',
      icon: 'ti ti-file',
      moduleCategory: 'super-admin',
      sortOrder: 0,
      availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
    });
    setPageMode('create');
    setShowPageModal(true);
  };

  const handleOpenEditModal = (page: Page) => {
    setPageForm({
      name: page.name,
      displayName: page.displayName,
      description: page.description || '',
      route: page.route,
      icon: page.icon,
      moduleCategory: page.moduleCategory,
      sortOrder: page.sortOrder,
      availableActions: page.availableActions || []
    });
    setSelectedPage(page);
    setPageMode('edit');
    setShowPageModal(true);
  };

  const handleOpenViewModal = (page: Page) => {
    setSelectedPage(page);
    setPageMode('view');
    setShowPageModal(true);
  };

  const handleSavePage = async () => {
    try {
      setSaving(true);
      const url = pageMode === 'create'
        ? `${API_BASE}/api/rbac/pages`
        : `${API_BASE}/api/rbac/pages/${selectedPage?._id}`;
      const method = pageMode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pageForm),
      });
      const data = await response.json();

      if (data.success) {
        setShowPageModal(false);
        await fetchPages();
        await fetchStats();
      } else {
        alert(data.error || 'Failed to save page');
      }
    } catch (error) {
      console.error('Error saving page:', error);
      alert('Failed to save page');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePage = async (pageId: string, displayName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${displayName}"?`)) return;

    try {
      setSaving(true);
      const response = await fetch(`${API_BASE}/api/rbac/pages/${pageId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        await fetchPages();
        await fetchStats();
      } else {
        alert(data.error || 'Failed to delete page');
      }
    } catch (error) {
      console.error('Error deleting page:', error);
      alert('Failed to delete page');
    } finally {
      setSaving(false);
    }
  };

  const handleActionToggle = (action: string) => {
    const currentActions = pageForm.availableActions;
    let newActions;

    if (action === 'all') {
      if (currentActions.includes('all')) {
        // Remove 'all' and all other actions
        newActions = [];
      } else {
        // Add 'all' and all standard actions
        newActions = ['all', 'read', 'create', 'write', 'delete', 'import', 'export', 'approve', 'assign'];
      }
    } else {
      // For individual actions, toggle them
      if (currentActions.includes(action)) {
        newActions = currentActions.filter(a => a !== action && a !== 'all');
      } else {
        newActions = [...currentActions.filter(a => a !== 'all'), action];
      }
    }

    setPageForm({ ...pageForm, availableActions: newActions });
  };

  // Columns for data table
  const columns = [
    {
      title: "Page Name",
      dataIndex: "displayName",
      sorter: (a: Page, b: Page) => a.displayName.localeCompare(b.displayName),
      render: (text: string, record: Page) => (
        <div>
          <span className="fw-medium">{text}</span>
          {record.isSystem && (
            <span className="badge bg-info ms-2">System</span>
          )}
        </div>
      ),
    },
    {
      title: "Identifier",
      dataIndex: "name",
      render: (text: string) => <code className="small text-muted">{text}</code>,
    },
    {
      title: "Route",
      dataIndex: "route",
      render: (text: string) => <code className="small">{text}</code>,
    },
    {
      title: "Category",
      dataIndex: "moduleCategory",
      render: (category: string) => (
        <span className="badge bg-light text-dark">
          {MODULE_CATEGORY_LABELS[category] || category}
        </span>
      ),
    },
    {
      title: "Available Actions",
      dataIndex: "availableActions",
      render: (actions: string[] | undefined) => (
        <div className="d-flex flex-wrap gap-1">
          {!actions || actions.length === 0 ? (
            <span className="text-muted small">None</span>
          ) : (
            actions.map(action => (
              <span key={action} className="badge bg-light text-dark" style={{ fontSize: '10px' }}>
                {ACTION_LABELS[action] || action}
              </span>
            ))
          )}
        </div>
      ),
    },
    {
      title: "Sort Order",
      dataIndex: "sortOrder",
      sorter: (a: Page, b: Page) => a.sortOrder - b.sortOrder,
      render: (order: number) => <span className="badge bg-secondary">{order}</span>,
    },
    {
      title: "Status",
      dataIndex: "isActive",
      render: (isActive: boolean, record: Page) => (
        <div className="form-check form-switch">
          <input
            className="form-check-input"
            type="checkbox"
            checked={isActive}
            onChange={() => handleToggleStatus(record._id)}
            disabled={saving || record.isSystem}
          />
        </div>
      ),
    },
    {
      title: "Actions",
      render: (_: any, record: Page) => (
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
                onClick={() => handleOpenViewModal(record)}
              >
                <i className="ti ti-eye me-2"></i>View Details
              </button>
            </li>
            <li>
              <button
                className="dropdown-item"
                onClick={() => handleOpenEditModal(record)}
              >
                <i className="ti ti-edit me-2"></i>Edit Page
              </button>
            </li>
            <li><hr className="dropdown-divider" /></li>
            <li>
              <button
                className="dropdown-item text-danger"
                onClick={() => handleDeletePage(record._id, record.displayName)}
                disabled={record.isSystem}
              >
                <i className="ti ti-trash me-2"></i>Delete
              </button>
            </li>
          </ul>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="text-center p-5">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="mt-2">Loading pages...</p>
          </div>
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
              <h2 className="mb-1">Pages Management</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={all_routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">Super Admin</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Pages
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
            {/* Total Pages */}
            <div className="col-lg-3 col-md-6 d-flex">
              <div className="card flex-fill">
                <div className="card-body d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center overflow-hidden">
                    <div>
                      <span className="avatar avatar-lg bg-dark rounded-circle">
                        <i className="ti ti-file" />
                      </span>
                    </div>
                    <div className="ms-2 overflow-hidden">
                      <p className="fs-12 fw-medium mb-1 text-truncate">
                        Total Pages
                      </p>
                      <h4>{stats?.totalPages || 0}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* /Total Pages */}
            {/* Active Pages */}
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
                        Active Pages
                      </p>
                      <h4>{stats?.activePages || 0}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* /Active Pages */}
            {/* System Pages */}
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
                        System Pages
                      </p>
                      <h4>{stats?.systemPages || 0}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* /System Pages */}
            {/* Custom Pages */}
            <div className="col-lg-3 col-md-6 d-flex">
              <div className="card flex-fill">
                <div className="card-body d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center overflow-hidden">
                    <div>
                      <span className="avatar avatar-lg bg-warning rounded-circle">
                        <i className="ti ti-file-description" />
                      </span>
                    </div>
                    <div className="ms-2 overflow-hidden">
                      <p className="fs-12 fw-medium mb-1 text-truncate">
                        Custom Pages
                      </p>
                      <h4>{stats?.customPages || 0}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* /Custom Pages */}
          </div>
          {/* /Stats Cards */}

          {/* Filters and Actions */}
          <div className="card mb-3">
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-md-3">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search pages..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="col-md-2">
                  <select
                    className="form-select"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <option value="all">All Categories</option>
                    {pages.filter(p => p._id).map(cat => (
                      <option key={cat._id} value={cat._id}>
                        {MODULE_CATEGORY_LABELS[cat._id] || cat._id}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <select
                    className="form-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <div className="btn-group w-100">
                    <button
                      type="button"
                      className={`btn ${sortBy === 'sortOrder' ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => setSortBy('sortOrder')}
                      title="Sort by Sort Order"
                    >
                      <i className="ti ti-sort-ascending-numbers me-1"></i>Order
                    </button>
                    <button
                      type="button"
                      className={`btn ${sortBy === 'name' ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => setSortBy('name')}
                      title="Sort by Name"
                    >
                      <i className="ti ti-sort-ascending-letters me-1"></i>Name
                    </button>
                  </div>
                </div>
                <div className="col-md-3 text-end">
                  <button
                    className="btn btn-primary"
                    onClick={handleOpenCreateModal}
                  >
                    <i className="ti ti-plus me-1"></i> Add New Page
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Pages Table */}
          <div className="card mb-3">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Pages List ({filteredPages.length})</h5>
              <div className="d-flex gap-2">
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => {
                    const allCategories = new Set(pages.filter(p => p._id).map(p => p._id));
                    setExpandedCategories(allCategories);
                  }}
                >
                  <i className="ti ti-chevron-down me-1"></i>Expand All
                </button>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setExpandedCategories(new Set())}
                >
                  <i className="ti ti-chevron-right me-1"></i>Collapse All
                </button>
              </div>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-bordered mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: '25%' }}>Page Name</th>
                      <th style={{ width: '15%' }}>Identifier</th>
                      <th style={{ width: '15%' }}>Route</th>
                      <th style={{ width: '20%' }}>Available Actions</th>
                      <th className="text-center" style={{ width: '8%' }}>Sort</th>
                      <th className="text-center" style={{ width: '7%' }}>Status</th>
                      <th className="text-center" style={{ width: '10%' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedFilteredPages.map(group => (
                      <React.Fragment key={group.category}>
                        {/* Category Header Row */}
                        <tr className="table-light">
                          <td colSpan={7}>
                            <button
                              className="btn btn-link text-decoration-none p-0 fw-bold"
                              onClick={() => toggleCategory(group.category)}
                            >
                              <i className={`ti ti-chevron-${expandedCategories.has(group.category) ? 'down' : 'right'} me-1`}></i>
                              {MODULE_CATEGORY_LABELS[group.category] || group.category.replace('-', ' ').toUpperCase()}
                              <span className="badge bg-secondary ms-2">
                                {group.pages.filter(p => p.isActive).length}/{group.pages.length}
                              </span>
                            </button>
                          </td>
                        </tr>
                        {/* Pages in this category */}
                        {expandedCategories.has(group.category) && group.pages.map((page) => (
                          <tr key={page._id} className={!page.isActive ? 'table-light' : ''}>
                            <td>
                              <div className="d-flex align-items-center">
                                <i className={`${page.icon} me-2 text-muted`}></i>
                                <div>
                                  <span className="fw-medium">{page.displayName}</span>
                                  {page.isSystem && (
                                    <span className="badge bg-info ms-2">System</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td>
                              <code className="small text-muted">{page.name}</code>
                            </td>
                            <td>
                              <code className="small">{page.route}</code>
                            </td>
                            <td>
                              <div className="d-flex flex-wrap gap-1">
                                {!page.availableActions || page.availableActions.length === 0 ? (
                                  <span className="text-muted small">None</span>
                                ) : (
                                  page.availableActions.map((action) => (
                                    <span key={action} className="badge bg-light text-dark" style={{ fontSize: '9px' }}>
                                      {ACTION_LABELS[action] || action}
                                    </span>
                                  ))
                                )}
                              </div>
                            </td>
                            <td className="text-center">
                              <span className="badge bg-secondary">{page.sortOrder}</span>
                            </td>
                            <td className="text-center">
                              <div className="form-check form-switch d-flex justify-content-center">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  checked={page.isActive}
                                  onChange={() => handleToggleStatus(page._id)}
                                  disabled={saving || page.isSystem}
                                />
                              </div>
                            </td>
                            <td className="text-center">
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
                                      onClick={() => handleOpenViewModal(page)}
                                    >
                                      <i className="ti ti-eye me-2"></i>View
                                    </button>
                                  </li>
                                  <li>
                                    <button
                                      className="dropdown-item"
                                      onClick={() => handleOpenEditModal(page)}
                                    >
                                      <i className="ti ti-edit me-2"></i>Edit
                                    </button>
                                  </li>
                                  <li><hr className="dropdown-divider" /></li>
                                  <li>
                                    <button
                                      className="dropdown-item text-danger"
                                      onClick={() => handleDeletePage(page._id, page.displayName)}
                                      disabled={page.isSystem}
                                    >
                                      <i className="ti ti-trash me-2"></i>Delete
                                    </button>
                                  </li>
                                </ul>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredPages.length === 0 && (
                <div className="text-center py-5 text-muted">
                  <i className="ti ti-file-off fs-1"></i>
                  <p className="mt-2 mb-0">No pages found matching your criteria.</p>
                </div>
              )}
            </div>
          </div>
        </div>
        <Footer />
      </div>

      {/* Page Modal (Create/Edit/View) */}
      {showPageModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {pageMode === 'create' && 'Add New Page'}
                  {pageMode === 'edit' && 'Edit Page'}
                  {pageMode === 'view' && 'Page Details'}
                </h5>
                <button
                  type="button"
                  className="btn-close custom-btn-close"
                  onClick={() => setShowPageModal(false)}
                >
                  <i className="ti ti-x" />
                </button>
              </div>

              {pageMode === 'view' && selectedPage ? (
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Page Name</label>
                      <div className="form-control-plaintext">{selectedPage.displayName}</div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Identifier</label>
                      <div className="form-control-plaintext"><code>{selectedPage.name}</code></div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Route</label>
                      <div className="form-control-plaintext"><code>{selectedPage.route}</code></div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Icon</label>
                      <div className="form-control-plaintext">
                        <i className={selectedPage.icon}></i> {selectedPage.icon}
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Category</label>
                      <div className="form-control-plaintext">
                        {MODULE_CATEGORY_LABELS[selectedPage.moduleCategory] || selectedPage.moduleCategory}
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Sort Order</label>
                      <div className="form-control-plaintext">{selectedPage.sortOrder}</div>
                    </div>
                    <div className="col-md-12 mb-3">
                      <label className="form-label">Description</label>
                      <div className="form-control-plaintext">{selectedPage.description || '-'}</div>
                    </div>
                    <div className="col-md-12 mb-3">
                      <label className="form-label">Available Actions</label>
                      <div className="d-flex flex-wrap gap-2">
                        {!selectedPage.availableActions || selectedPage.availableActions.length === 0 ? (
                          <span className="text-muted">None</span>
                        ) : (
                          selectedPage.availableActions.map(action => (
                            <span key={action} className="badge bg-primary">
                              {ACTION_LABELS[action] || action}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">System Page</label>
                      <div className="form-control-plaintext">{selectedPage.isSystem ? 'Yes' : 'No'}</div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Status</label>
                      <div className="form-control-plaintext">
                        <span className={`badge ${selectedPage.isActive ? 'badge-success' : 'badge-danger'}`}>
                          {selectedPage.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); handleSavePage(); }}>
                  <div className="modal-body pb-0">
                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Display Name *</label>
                          <input
                            type="text"
                            className="form-control"
                            value={pageForm.displayName}
                            onChange={(e) => setPageForm({ ...pageForm, displayName: e.target.value })}
                            placeholder="e.g., Dashboard"
                            required
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Identifier *</label>
                          <input
                            type="text"
                            className="form-control"
                            value={pageForm.name}
                            onChange={(e) => setPageForm({
                              ...pageForm,
                              name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                              displayName: pageForm.displayName || e.target.value
                            })}
                            placeholder="e.g., super-admin.dashboard"
                            disabled={pageMode === 'edit'}
                            required
                          />
                          {pageMode === 'edit' && (
                            <small className="text-muted">Cannot modify identifier</small>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Route *</label>
                          <input
                            type="text"
                            className="form-control"
                            value={pageForm.route}
                            onChange={(e) => setPageForm({ ...pageForm, route: e.target.value })}
                            placeholder="e.g., /super-admin/dashboard"
                            required
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Icon</label>
                          <input
                            type="text"
                            className="form-control"
                            value={pageForm.icon}
                            onChange={(e) => setPageForm({ ...pageForm, icon: e.target.value })}
                            placeholder="e.g., ti ti-smart-home"
                          />
                          <small className="text-muted">Tabler icon class</small>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Category *</label>
                          <select
                            className="form-select"
                            value={pageForm.moduleCategory}
                            onChange={(e) => setPageForm({ ...pageForm, moduleCategory: e.target.value })}
                            required
                          >
                            {Object.entries(MODULE_CATEGORY_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Sort Order</label>
                          <input
                            type="number"
                            className="form-control"
                            value={pageForm.sortOrder}
                            onChange={(e) => setPageForm({ ...pageForm, sortOrder: parseInt(e.target.value) || 0 })}
                            min="0"
                          />
                        </div>
                      </div>
                      <div className="col-md-12">
                        <div className="mb-3">
                          <label className="form-label">Description</label>
                          <textarea
                            className="form-control"
                            rows={2}
                            value={pageForm.description}
                            onChange={(e) => setPageForm({ ...pageForm, description: e.target.value })}
                            placeholder="Brief description of the page"
                          />
                        </div>
                      </div>
                      <div className="col-md-12">
                        <div className="mb-3">
                          <label className="form-label">Available Actions</label>
                          <div className="d-flex flex-wrap gap-3">
                            {Object.keys(ACTION_LABELS).map((action) => (
                              <div key={action} className="form-check">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  id={`action-${action}`}
                                  checked={pageForm.availableActions.includes(action)}
                                  onChange={() => handleActionToggle(action)}
                                />
                                <label className="form-check-label ms-2" htmlFor={`action-${action}`}>
                                  {ACTION_LABELS[action]}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-light me-2"
                      onClick={() => setShowPageModal(false)}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Saving...
                        </>
                      ) : (
                        <>
                          {pageMode === 'create' && 'Create Page'}
                          {pageMode === 'edit' && 'Save Changes'}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Pages;
