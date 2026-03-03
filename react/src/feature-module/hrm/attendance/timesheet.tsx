import { DatePicker, message } from "antd";
import dayjs from "dayjs";
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CollapseHeader from "../../../core/common/collapse-header/collapse-header";
import Table from "../../../core/common/dataTable/index";
import Footer from "../../../core/common/footer";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import { useProjectsREST } from "../../../hooks/useProjectsREST";
import { TimeEntry, useTimeTrackingREST } from "../../../hooks/useTimeTrackingREST";
import { useUserProfileREST } from "../../../hooks/useUserProfileREST";

interface FormData {
  projectId: string;
  taskId?: string;
  description: string;
  duration: string;
  date: string;
  billable: boolean;
  billRate?: string;
}

const TimeSheet = () => {
  // API Hooks
  const {
    timeEntries,
    loading,
    error,
    fetchTimeEntries,
    createTimeEntry,
    updateTimeEntry,
    deleteTimeEntry
  } = useTimeTrackingREST();

  const { projects, fetchProjects } = useProjectsREST();
  const { profile, isAdmin, isHR } = useUserProfileREST();

  // State
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [dateRange, setDateRange] = useState<{ startDate?: string; endDate?: string }>({});
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [viewingEntry, setViewingEntry] = useState<TimeEntry | null>(null);
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    projectId: "",
    taskId: "",
    description: "",
    duration: "",
    date: new Date().toISOString().split('T')[0],
    billable: false,
    billRate: ""
  });

  // Check if current user is a regular team member (not lead/manager)
  const isRegularTeamMember = useMemo(() => {
    // Admins and HR can see all entries
    if (isAdmin || isHR) return false;

    // If no profile or projects data, assume restricted access
    if (!profile || !projects || projects.length === 0) return true;

    const currentUserId = (profile as any)._id || (profile as any).userId;
    if (!currentUserId) return true;

    // Check if user is a team lead or project manager in any project
    const isLeadOrManager = projects.some(project => {
      const isTeamLeader = project.teamLeader?.some(leadId =>
        leadId === currentUserId || leadId === (profile as any).employeeId
      );
      const isProjectManager = project.projectManager?.some(managerId =>
        managerId === currentUserId || managerId === (profile as any).employeeId
      );
      return isTeamLeader || isProjectManager;
    });

    // If not a lead or manager, they are a regular team member
    return !isLeadOrManager;
  }, [profile, projects, isAdmin, isHR]);

  // Filter timesheet entries based on user role
  const filteredTimeEntries = useMemo(() => {
    // Admin and HR can see all entries
    if (isAdmin || isHR) {
      return timeEntries;
    }

    const currentUserId = (profile as any)?._id || (profile as any)?.userId || (profile as any)?.employeeId;
    if (!currentUserId || !projects || projects.length === 0) {
      // If no user ID or projects, show only own entries
      return timeEntries.filter(entry =>
        entry.userId === currentUserId || entry.createdBy === currentUserId
      );
    }

    // Find all projects where current user is Team Lead or Project Manager
    const managedProjectIds = projects
      .filter(project => {
        const isTeamLeader = project.teamLeader?.some(leadId =>
          leadId === currentUserId || leadId === (profile as any).employeeId
        );
        const isProjectManager = project.projectManager?.some(managerId =>
          managerId === currentUserId || managerId === (profile as any).employeeId
        );
        return isTeamLeader || isProjectManager;
      })
      .map(project => project._id);

    // If user is Team Lead or Project Manager of any projects
    if (managedProjectIds.length > 0) {
      // Show entries from managed projects only
      return timeEntries.filter(entry => {
        // Show entries that belong to managed projects
        if (managedProjectIds.includes(entry.projectId)) {
          return true;
        }
        // Also show own entries from other projects
        if (entry.userId === currentUserId || entry.createdBy === currentUserId) {
          return true;
        }
        return false;
      });
    }

    // Regular team member - show only own entries
    return timeEntries.filter(entry =>
      entry.userId === currentUserId || entry.createdBy === currentUserId
    );
  }, [timeEntries, profile, projects, isAdmin, isHR]);

  // Fetch data on mount
  useEffect(() => {
    fetchProjects();
    fetchTimeEntries({ page: 1, limit: 50, ...dateRange });
  }, [dateRange]);

  // Build table columns
  const columns = useMemo(() => {
    const allColumns = [
      // Employee column - only show for admins, HR, team leads, and project managers
      ...(!isRegularTeamMember ? [{
        title: "Employee",
        dataIndex: "employeeName",
        render: (text: string, record: TimeEntry) => (
          <div className="d-flex align-items-center file-name-icon">
            <span className="avatar avatar-md border avatar-rounded">
              {record.userDetails?.avatar ? (
                <ImageWithBasePath
                  src={record.userDetails.avatar}
                  className="img-fluid"
                  alt="img"
                />
              ) : (
                <span
                  className="avatar-title bg-primary-transparent text-primary"
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}
                >
                  {record.userDetails?.firstName?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              )}
            </span>
            <div className="ms-2">
              <h6 className="fw-medium">
                <Link to="#">{record.userDetails?.firstName && record.userDetails?.lastName
                  ? `${record.userDetails.firstName} ${record.userDetails.lastName}`
                  : 'Unknown Employee'}
                </Link>
              </h6>
              <span className="fs-12 fw-normal">{record.userDetails?.employeeId || 'N/A'}</span>
            </div>
          </div>
        ),
        sorter: (a: TimeEntry, b: TimeEntry) => (a.userDetails?.firstName || '').localeCompare(b.userDetails?.firstName || ''),
      }] : []),
      {
        title: "Date",
        dataIndex: "date",
        render: (date: string) => new Date(date).toLocaleDateString('en-GB'),
        sorter: (a: TimeEntry, b: TimeEntry) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      },
      {
        title: "Project",
        dataIndex: "projectDetails",
        render: (project: any, record: TimeEntry) => (
          <p className="fs-14 fw-medium text-gray-9 d-flex align-items-center">
            {project?.name || 'Unknown Project'}
          </p>
        ),
        sorter: (a: TimeEntry, b: TimeEntry) => (a.projectDetails?.name || '').localeCompare(b.projectDetails?.name || ''),
      },
      {
        title: "Description",
        dataIndex: "description",
        render: (text: string) => (
          <p className="fs-14 fw-medium text-gray-9" style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {text || '-'}
          </p>
        ),
      },
      {
        title: "Hours",
        dataIndex: "duration",
        render: (duration: number) => `${duration}h`,
        sorter: (a: TimeEntry, b: TimeEntry) => (a.duration || 0) - (b.duration || 0),
      },
      {
        title: "Status",
        dataIndex: "status",
        render: (status: string) => {
          const statusConfig = {
            'Draft': { color: 'bg-secondary', text: 'Draft' },
            'Submitted': { color: 'bg-info', text: 'Submitted' },
            'Approved': { color: 'bg-success', text: 'Approved' },
            'Rejected': { color: 'bg-danger', text: 'Rejected' }
          };
          const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['Draft'];
          return (
            <span className={`badge ${config.color} rounded-1`}>
              {config.text}
            </span>
          );
        },
        sorter: (a: TimeEntry, b: TimeEntry) => a.status.localeCompare(b.status),
      },
      {
        title: "Actions",
        dataIndex: "actions",
        render: (_: any, record: TimeEntry) => (
          <div className="action-icon d-inline-flex">
            <Link
              to="#"
              className="me-2"
              onClick={() => setViewingEntry(record)}
              data-bs-toggle="modal"
              data-inert={true}
              data-bs-target="#view_timesheet"
            >
              <i className="ti ti-eye" />
            </Link>
            <Link
              to="#"
              className="me-2"
              onClick={() => handleEdit(record)}
              data-bs-toggle="modal"
              data-inert={true}
              data-bs-target="#edit_timesheet"
            >
              <i className="ti ti-edit" />
            </Link>
            <Link
              to="#"
              onClick={() => setDeleteEntryId(record._id)}
              data-bs-toggle="modal"
              data-inert={true}
              data-bs-target="#delete_modal"
            >
              <i className="ti ti-trash" />
            </Link>
          </div>
        ),
      }];

    return allColumns;
  }, [isRegularTeamMember]);

  // Build project options for dropdowns
  const projectOptions = useMemo(() => {
    if (!projects) return [];
    return projects.map(p => ({ value: p._id, label: p.name }));
  }, [projects]);

  // Handle form input change
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle date range change
  const handleDateRangeChange = (dates: any) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange({
        startDate: dates[0].format('YYYY-MM-DD'),
        endDate: dates[1].format('YYYY-MM-DD')
      });
    }
  };

  // Handle project filter change
  const handleProjectFilter = (value: string) => {
    setSelectedProject(value);
    if (value) {
      fetchTimeEntries({ page: 1, limit: 50, projectId: value });
    } else {
      fetchTimeEntries({ page: 1, limit: 50 });
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      projectId: selectedProject || "",
      taskId: "",
      description: "",
      duration: "",
      date: new Date().toISOString().split('T')[0],
      billable: false,
      billRate: ""
    });
    setEditingEntry(null);
  };

  // Handle edit click
  const handleEdit = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setFormData({
      projectId: entry.projectId,
      taskId: entry.taskId || "",
      description: entry.description,
      duration: entry.duration.toString(),
      date: new Date(entry.date).toISOString().split('T')[0],
      billable: entry.billable,
      billRate: entry.billRate?.toString() || ""
    });
  };

  // Handle form submission (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.projectId) {
      message.error('Please select a project');
      return;
    }
    if (!formData.description || formData.description.trim().length < 5) {
      message.error('Description must be at least 5 characters');
      return;
    }
    if (formData.description.trim().length > 500) {
      message.error('Description must not exceed 500 characters');
      return;
    }
    if (!formData.duration || parseFloat(formData.duration) < 0.25) {
      message.error('Duration must be at least 0.25 hours');
      return;
    }
    if (!formData.date) {
      message.error('Please select a date');
      return;
    }

    const entryData = {
      projectId: formData.projectId,
      taskId: formData.taskId || undefined,
      description: formData.description.trim(),
      duration: parseFloat(formData.duration),
      date: new Date(formData.date).toISOString(),
      billable: formData.billable,
      billRate: formData.billRate ? parseFloat(formData.billRate) : undefined
    };

    let success = false;
    if (editingEntry) {
      success = await updateTimeEntry(editingEntry._id, entryData);
    } else {
      success = await createTimeEntry(entryData);
    }

    if (success) {
      // Close modals and reset
      const modalElement = document.getElementById('edit_timesheet');
      const bootstrapModal = (window as any).bootstrap;
      if (bootstrapModal && modalElement) {
        const modal = bootstrapModal.Modal.getInstance(modalElement);
        if (modal) modal.hide();
      }
      const addModalElement = document.getElementById('add_timesheet');
      if (bootstrapModal && addModalElement) {
        const addModal = bootstrapModal.Modal.getInstance(addModalElement);
        if (addModal) addModal.hide();
      }
      resetForm();
    }
  };

  // Handle delete confirmation
  const handleDelete = async () => {
    if (deleteEntryId) {
      const success = await deleteTimeEntry(deleteEntryId);
      if (success) {
        setDeleteEntryId(null);
        // Close modal
        const modalElement = document.getElementById('delete_modal');
        const bootstrapModal = (window as any).bootstrap;
        if (bootstrapModal && modalElement) {
          const modal = bootstrapModal.Modal.getInstance(modalElement);
          if (modal) modal.hide();
        }
      }
    }
  };

  // Calculate total hours for display (use filtered entries)
  const totalHours = filteredTimeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
  const billableHours = filteredTimeEntries.filter(e => e.billable).reduce((sum, entry) => sum + (entry.duration || 0), 0);

  const getModalContainer = () => {
    const modalElement = document.getElementById("modal-datepicker");
    return modalElement ? modalElement : document.body;
  };

  return (
    <>
      {/* Page Wrapper */}
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Timesheets</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to="index.html">
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">Employee</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Timesheets
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
              <div className="me-2 mb-2">
                <div className="dropdown">
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    <i className="ti ti-file-export me-1" />
                    Export
                  </Link>
                  <ul className="dropdown-menu dropdown-menu-end p-3">
                    <li>
                      <Link to="#" className="dropdown-item rounded-1">
                        <i className="ti ti-file-type-pdf me-1" />
                        Export as PDF
                      </Link>
                    </li>
                    <li>
                      <Link to="#" className="dropdown-item rounded-1">
                        <i className="ti ti-file-type-xls me-1" />
                        Export as Excel
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="mb-2">
                <Link
                  to="#"
                  data-bs-toggle="modal"
                  data-inert={true}
                  data-bs-target="#add_timesheet"
                  className="btn btn-primary d-flex align-items-center"
                  onClick={() => resetForm()}
                >
                  <i className="ti ti-circle-plus me-2" />
                  Add Today's Work
                </Link>
              </div>
              <div className="head-icons ms-2">
                <CollapseHeader />
              </div>
            </div>
          </div>
          {/* /Breadcrumb */}

          {/* Stats Cards */}
          <div className="row g-3 mb-3">
            <div className="col-md-3">
              <div className="card">
                <div className="card-body">
                  <h6 className="mb-1">Total Hours</h6>
                  <h4 className="mb-0">{totalHours.toFixed(1)}h</h4>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card">
                <div className="card-body">
                  <h6 className="mb-1">Billable Hours</h6>
                  <h4 className="mb-0">{billableHours.toFixed(1)}h</h4>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card">
                <div className="card-body">
                  <h6 className="mb-1">Entries</h6>
                  <h4 className="mb-0">{filteredTimeEntries.length}</h4>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card">
                <div className="card-body">
                  <h6 className="mb-1">Date Range</h6>
                  <p className="mb-0 text-truncate" style={{ fontSize: '13px' }}>
                    {dateRange.startDate && dateRange.endDate
                      ? `${new Date(dateRange.startDate).toLocaleDateString('en-GB')} - ${new Date(dateRange.endDate).toLocaleDateString('en-GB')}`
                      : 'All Time'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Indicator list */}
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
              <h5>Timesheet Entries</h5>
              <div className="d-flex my-xl-auto right-content align-items-center flex-wrap row-gap-3">
                <div className="dropdown me-3">
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    {selectedProject
                      ? projectOptions.find(p => p.value === selectedProject)?.label || 'Select Project'
                      : 'Select Project'
                    }
                  </Link>
                  <ul className="dropdown-menu dropdown-menu-end p-3">
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={() => handleProjectFilter('')}
                      >
                        All Projects
                      </Link>
                    </li>
                    {projectOptions.map(project => (
                      <li key={project.value}>
                        <Link
                          to="#"
                          className="dropdown-item rounded-1"
                          onClick={() => handleProjectFilter(project.value)}
                        >
                          {project.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="dropdown">
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    <i className="ti ti-filter me-1" />
                    Filter by Date
                  </Link>
                  <ul className="dropdown-menu dropdown-menu-end p-3">
                    <li>
                      <Link to="#" className="dropdown-item rounded-1" onClick={() => setDateRange({})}>
                        All Time
                      </Link>
                    </li>
                    <li>
                      <Link to="#" className="dropdown-item rounded-1" onClick={() => setDateRange({
                        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        endDate: new Date().toISOString().split('T')[0]
                      })}>
                        Last 7 Days
                      </Link>
                    </li>
                    <li>
                      <Link to="#" className="dropdown-item rounded-1" onClick={() => setDateRange({
                        startDate: new Date().toISOString().split('T')[0],
                        endDate: new Date().toISOString().split('T')[0]
                      })}>
                        Today
                      </Link>
                    </li>
                    <li>
                      <Link to="#" className="dropdown-item rounded-1" onClick={() => {
                        const now = new Date();
                        setDateRange({
                          startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
                          endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString().split('T')[0]
                        });
                      }}>
                        This Month
                      </Link>
                    </li>
                    <li>
                      <Link to="#" className="dropdown-item rounded-1" onClick={() => {
                        const now = new Date();
                        setDateRange({
                          startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0],
                          endDate: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString().split('T')[0]
                        });
                      }}>
                        Last Month
                      </Link>
                    </li>
                    <li>
                      <Link to="#" className="dropdown-item rounded-1" onClick={() => {
                        const now = new Date();
                        const startOfWeek = new Date(now);
                        startOfWeek.setDate(now.getDate() - now.getDay());
                        const endOfWeek = new Date(startOfWeek);
                        endOfWeek.setDate(startOfWeek.getDate() + 6);
                        setDateRange({
                          startDate: startOfWeek.toISOString().split('T')[0],
                          endDate: endOfWeek.toISOString().split('T')[0]
                        });
                      }}>
                        This Week
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="card-body p-0">
              {/* Info banner based on role */}
              {!isAdmin && !isHR && (
                <div className="alert alert-info border-0 rounded-0 m-0 mb-3" role="alert">
                  <div className="d-flex align-items-center">
                    <i className="ti ti-info-circle fs-20 me-2"></i>
                    <span>
                      {isRegularTeamMember
                        ? "You are viewing only your own timesheet entries."
                        : "You are viewing timesheet entries for projects where you are Team Lead or Project Manager, plus your own entries."}
                    </span>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status"></div>
                  <p className="mt-2">Loading timesheets...</p>
                </div>
              ) : error ? (
                <div className="text-center py-5">
                  <p className="text-danger">{error}</p>
                </div>
              ) : filteredTimeEntries.length === 0 ? (
                <div className="text-center py-5">
                  <p className="text-muted">No time entries found. Click "Add Today's Work" to create one.</p>
                </div>
              ) : (
                <Table dataSource={filteredTimeEntries} columns={columns} Selection={false} />
              )}
            </div>
          </div>
          {/* /Performance Indicator list */}
        </div>
        <Footer />
      </div>
      {/* /Page Wrapper */}

      {/* Add Timesheet */}
      <div className="modal fade" id="add_timesheet">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Add Today's Work</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body pb-0">
                <div className="row">
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Project <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-control"
                        value={formData.projectId}
                        onChange={(e) => handleInputChange('projectId', e.target.value)}
                        required
                      >
                        <option value="">Select Project</option>
                        {projectOptions.map(project => (
                          <option key={project.value} value={project.value}>{project.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Description <span className="text-danger">*</span>
                      </label>
                      <textarea
                        className="form-control"
                        rows={3}
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        placeholder="Describe what you worked on..."
                        maxLength={500}
                        required
                      />
                      <small className="text-muted">
                        {formData.description.length}/500 characters
                      </small>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Date <span className="text-danger">*</span>
                      </label>
                      <DatePicker
                        className="form-control datetimepicker"
                        format="DD-MM-YYYY"
                        getPopupContainer={getModalContainer}
                        placeholder="DD-MM-YYYY"
                        value={formData.date ? dayjs(formData.date) : null}
                        onChange={(date) => handleInputChange('date', date ? date.toISOString() : '')}
                        required
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Hours <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder="0.00"
                        step="0.25"
                        min="0.25"
                        max="24"
                        value={formData.duration}
                        onChange={(e) => handleInputChange('duration', e.target.value)}
                        required
                      />
                      <small className="text-muted">Minimum 0.25 hours (15 minutes)</small>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Billable</label>
                      <select
                        className="form-control"
                        value={formData.billable ? 'true' : 'false'}
                        onChange={(e) => handleInputChange('billable', e.target.value === 'true')}
                      >
                        <option value="false">No</option>
                        <option value="true">Yes</option>
                      </select>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Bill Rate ($)</label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        value={formData.billRate}
                        onChange={(e) => handleInputChange('billRate', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-light me-2"
                  data-bs-dismiss="modal"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Adding...' : 'Add Time Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Add Timesheet */}

      {/* Edit Timesheet */}
      <div className="modal fade" id="edit_timesheet">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Edit Time Entry</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body pb-0">
                <div className="row">
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Project <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-control"
                        value={formData.projectId}
                        onChange={(e) => handleInputChange('projectId', e.target.value)}
                        required
                      >
                        <option value="">Select Project</option>
                        {projectOptions.map(project => (
                          <option key={project.value} value={project.value}>{project.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Description <span className="text-danger">*</span>
                      </label>
                      <textarea
                        className="form-control"
                        rows={3}
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        placeholder="Describe what you worked on..."
                        maxLength={500}
                        required
                      />
                      <small className="text-muted">
                        {formData.description.length}/500 characters
                      </small>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Date <span className="text-danger">*</span>
                      </label>
                      <DatePicker
                        className="form-control datetimepicker"
                        format="DD-MM-YYYY"
                        getPopupContainer={getModalContainer}
                        placeholder="DD-MM-YYYY"
                        value={formData.date ? dayjs(formData.date) : null}
                        onChange={(date) => handleInputChange('date', date ? date.toISOString() : '')}
                        required
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Hours <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder="0.00"
                        step="0.25"
                        min="0.25"
                        max="24"
                        value={formData.duration}
                        onChange={(e) => handleInputChange('duration', e.target.value)}
                        required
                      />
                      <small className="text-muted">Minimum 0.25 hours (15 minutes)</small>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Billable</label>
                      <select
                        className="form-control"
                        value={formData.billable ? 'true' : 'false'}
                        onChange={(e) => handleInputChange('billable', e.target.value === 'true')}
                      >
                        <option value="false">No</option>
                        <option value="true">Yes</option>
                      </select>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Bill Rate ($)</label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        value={formData.billRate}
                        onChange={(e) => handleInputChange('billRate', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-light me-2"
                  data-bs-dismiss="modal"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Edit Timesheet */}

      {/* Delete Confirmation Modal */}
      <div className="modal fade" id="delete_modal">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Delete Time Entry</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this time entry? This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-light"
                data-bs-dismiss="modal"
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDelete}
                data-bs-dismiss="modal"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* View Timesheet Details Modal */}
      <div className="modal fade" id="view_timesheet">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Timesheet Entry Details</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="modal-body">
              {viewingEntry && (
                <div className="row g-3">
                  {/* Employee Information */}
                  <div className="col-12">
                    <div className="card mb-0">
                      <div className="card-body">
                        <h6 className="fw-semibold mb-3 border-bottom pb-2">
                          <i className="ti ti-user me-2 text-primary"></i>
                          Employee Information
                        </h6>
                        <div className="row">
                          <div className="col-md-6 mb-3">
                            <div className="d-flex align-items-center">
                              <span className="avatar avatar-md border avatar-rounded me-2">
                                {viewingEntry.userDetails?.avatar ? (
                                  <ImageWithBasePath
                                    src={viewingEntry.userDetails.avatar}
                                    className="img-fluid"
                                    alt="img"
                                  />
                                ) : (
                                  <span
                                    className="avatar-title bg-primary-transparent text-primary"
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      borderRadius: '50%',
                                      fontSize: '16px',
                                      fontWeight: '600'
                                    }}
                                  >
                                    {viewingEntry.userDetails?.firstName?.charAt(0)?.toUpperCase() || 'U'}
                                  </span>
                                )}
                              </span>
                              <div>
                                <p className="mb-0 fw-medium">
                                  {viewingEntry.userDetails?.firstName && viewingEntry.userDetails?.lastName
                                    ? `${viewingEntry.userDetails.firstName} ${viewingEntry.userDetails.lastName}`
                                    : 'Unknown Employee'}
                                </p>
                                <small className="text-muted">
                                  {viewingEntry.userDetails?.employeeId || 'N/A'}
                                </small>
                              </div>
                            </div>
                          </div>
                          <div className="col-md-6 mb-3">
                            <label className="form-label text-muted fs-12 mb-1">Entry ID</label>
                            <p className="mb-0 fw-medium">{viewingEntry.timeEntryId || viewingEntry._id}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Project & Task Information */}
                  <div className="col-12">
                    <div className="card mb-0">
                      <div className="card-body">
                        <h6 className="fw-semibold mb-3 border-bottom pb-2">
                          <i className="ti ti-briefcase me-2 text-success"></i>
                          Project & Task Details
                        </h6>
                        <div className="row">
                          <div className="col-md-6 mb-3">
                            <label className="form-label text-muted fs-12 mb-1">Project</label>
                            <p className="mb-0 fw-medium">
                              {viewingEntry.projectDetails?.name || 'Unknown Project'}
                            </p>
                          </div>
                          <div className="col-md-6 mb-3">
                            <label className="form-label text-muted fs-12 mb-1">Task</label>
                            <p className="mb-0 fw-medium">
                              {viewingEntry.taskDetails?.title || 'No task assigned'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Time Details */}
                  <div className="col-12">
                    <div className="card mb-0">
                      <div className="card-body">
                        <h6 className="fw-semibold mb-3 border-bottom pb-2">
                          <i className="ti ti-clock me-2 text-info"></i>
                          Time Details
                        </h6>
                        <div className="row">
                          <div className="col-md-4 mb-3">
                            <label className="form-label text-muted fs-12 mb-1">Date</label>
                            <p className="mb-0 fw-medium">
                              {new Date(viewingEntry.date).toLocaleDateString('en-GB')}
                            </p>
                          </div>
                          <div className="col-md-4 mb-3">
                            <label className="form-label text-muted fs-12 mb-1">Duration</label>
                            <p className="mb-0 fw-medium">
                              <span className="badge bg-primary-transparent text-primary fs-14">
                                {viewingEntry.duration}h
                              </span>
                            </p>
                          </div>
                          <div className="col-md-4 mb-3">
                            <label className="form-label text-muted fs-12 mb-1">Status</label>
                            <p className="mb-0">
                              {(() => {
                                const statusConfig = {
                                  'Draft': { color: 'bg-secondary', text: 'Draft' },
                                  'Submitted': { color: 'bg-info', text: 'Submitted' },
                                  'Approved': { color: 'bg-success', text: 'Approved' },
                                  'Rejected': { color: 'bg-danger', text: 'Rejected' }
                                };
                                const config = statusConfig[viewingEntry.status as keyof typeof statusConfig] || statusConfig['Draft'];
                                return (
                                  <span className={`badge ${config.color} rounded-1`}>
                                    {config.text}
                                  </span>
                                );
                              })()}
                            </p>
                          </div>
                        </div>
                        {viewingEntry.startTime && (
                          <div className="row">
                            <div className="col-md-6 mb-3">
                              <label className="form-label text-muted fs-12 mb-1">Start Time</label>
                              <p className="mb-0 fw-medium">{viewingEntry.startTime}</p>
                            </div>
                            <div className="col-md-6 mb-3">
                              <label className="form-label text-muted fs-12 mb-1">End Time</label>
                              <p className="mb-0 fw-medium">{viewingEntry.endTime || 'N/A'}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Billing Information */}
                  <div className="col-12">
                    <div className="card mb-0">
                      <div className="card-body">
                        <h6 className="fw-semibold mb-3 border-bottom pb-2">
                          <i className="ti ti-currency-dollar me-2 text-warning"></i>
                          Billing Information
                        </h6>
                        <div className="row">
                          <div className="col-md-4 mb-3">
                            <label className="form-label text-muted fs-12 mb-1">Billable</label>
                            <p className="mb-0">
                              <span className={`badge ${viewingEntry.billable ? 'bg-success-transparent text-success' : 'bg-secondary-transparent text-secondary'}`}>
                                {viewingEntry.billable ? 'Yes' : 'No'}
                              </span>
                            </p>
                          </div>
                          {viewingEntry.billable && (
                            <>
                              <div className="col-md-4 mb-3">
                                <label className="form-label text-muted fs-12 mb-1">Bill Rate</label>
                                <p className="mb-0 fw-medium">
                                  ${viewingEntry.billRate?.toFixed(2) || '0.00'}/hr
                                </p>
                              </div>
                              <div className="col-md-4 mb-3">
                                <label className="form-label text-muted fs-12 mb-1">Billed Amount</label>
                                <p className="mb-0 fw-medium text-success">
                                  ${((viewingEntry.billRate || 0) * viewingEntry.duration).toFixed(2)}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="col-12">
                    <div className="card mb-0">
                      <div className="card-body">
                        <h6 className="fw-semibold mb-3 border-bottom pb-2">
                          <i className="ti ti-file-description me-2 text-purple"></i>
                          Description
                        </h6>
                        <p className="mb-0 text-gray-9" style={{ whiteSpace: 'pre-wrap' }}>
                          {viewingEntry.description || 'No description provided'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Approval Information */}
                  {(viewingEntry.status === 'Approved' || viewingEntry.status === 'Rejected') && (
                    <div className="col-12">
                      <div className="card mb-0">
                        <div className="card-body">
                          <h6 className="fw-semibold mb-3 border-bottom pb-2">
                            <i className="ti ti-checks me-2 text-indigo"></i>
                            Approval Details
                          </h6>
                          <div className="row">
                            {viewingEntry.approvedBy && (
                              <div className="col-md-6 mb-3">
                                <label className="form-label text-muted fs-12 mb-1">
                                  {viewingEntry.status === 'Approved' ? 'Approved By' : 'Rejected By'}
                                </label>
                                <p className="mb-0 fw-medium">{viewingEntry.approvedBy}</p>
                              </div>
                            )}
                            {viewingEntry.approvedDate && (
                              <div className="col-md-6 mb-3">
                                <label className="form-label text-muted fs-12 mb-1">
                                  {viewingEntry.status === 'Approved' ? 'Approved Date' : 'Rejected Date'}
                                </label>
                                <p className="mb-0 fw-medium">
                                  {new Date(viewingEntry.approvedDate).toLocaleDateString('en-GB')}
                                </p>
                              </div>
                            )}
                            {viewingEntry.rejectionReason && (
                              <div className="col-12">
                                <label className="form-label text-muted fs-12 mb-1">Rejection Reason</label>
                                <p className="mb-0 text-danger">{viewingEntry.rejectionReason}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Record Information */}
                  <div className="col-12">
                    <div className="card mb-0 bg-light">
                      <div className="card-body">
                        <div className="row">
                          <div className="col-md-6 mb-2">
                            <label className="form-label text-muted fs-11 mb-1">Created At</label>
                            <p className="mb-0 fs-13">
                              {new Date(viewingEntry.createdAt).toLocaleString('en-GB')}
                            </p>
                          </div>
                          <div className="col-md-6 mb-2">
                            <label className="form-label text-muted fs-11 mb-1">Last Updated</label>
                            <p className="mb-0 fs-13">
                              {new Date(viewingEntry.updatedAt).toLocaleString('en-GB')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-light"
                data-bs-dismiss="modal"
              >
                Close
              </button>
              {viewingEntry && viewingEntry.status === 'Draft' && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    // Close view modal
                    const viewModal = document.getElementById('view_timesheet');
                    const bootstrapModal = (window as any).bootstrap;
                    if (bootstrapModal && viewModal) {
                      const modal = bootstrapModal.Modal.getInstance(viewModal);
                      if (modal) modal.hide();
                    }
                    // Open edit modal
                    handleEdit(viewingEntry);
                    setTimeout(() => {
                      const editModal = new (window as any).bootstrap.Modal(document.getElementById('edit_timesheet'));
                      editModal.show();
                    }, 300);
                  }}
                >
                  <i className="ti ti-edit me-1"></i>
                  Edit Entry
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TimeSheet;
