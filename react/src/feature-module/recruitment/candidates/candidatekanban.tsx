import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { all_routes } from "../../router/all_routes";
import { useSocket } from "../../../SocketContext";
import { Socket } from "socket.io-client";
import { useCandidates, Candidate } from "../../../hooks/useCandidates";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import CollapseHeader from "../../../core/common/collapse-header/collapse-header";
import AddCandidate from "./add_candidate";
import EditCandidate from "./edit_candidate";
import DeleteCandidate from "./delete_candidate";
import { message } from "antd";

// Define status columns for Kanban
const STATUS_COLUMNS = [
  { key: "New Application", title: "New Applications", color: "info" },
  { key: "Screening", title: "Screening", color: "warning" },
  { key: "Interview", title: "Interview", color: "primary" },
  { key: "Technical Test", title: "Technical Test", color: "secondary" },
  { key: "Offer Stage", title: "Offer Stage", color: "success" },
  { key: "Hired", title: "Hired", color: "success" },
  { key: "Rejected", title: "Rejected", color: "danger" }
];


const CandidateKanban = () => {
  const socket = useSocket() as Socket | null;

  // State management using the custom hook
  const {
    candidates,
    stats,
    fetchAllData,
    loading,
    error,
    exportPDF,
    exportExcel,
    exporting,
    updateCandidateStatus,
  } = useCandidates();

  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
  
  // Filter states
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedExperience, setSelectedExperience] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  // Extract unique roles for filters
  const [roles, setRoles] = useState<string[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  // Group candidates by status
  const [candidatesByStatus, setCandidatesByStatus] = useState<{[key: string]: Candidate[]}>({});

  // Initialize data fetch
  useEffect(() => {
    console.log("CandidateKanban component mounted");
    fetchAllData();
  }, [fetchAllData]);

  // Extract unique values for filters whenever candidates change
  useEffect(() => {
    if (candidates && candidates.length > 0) {
      // Fix TypeScript error by properly typing the filter operation
      const uniqueRoles = Array.from(new Set(
        candidates
          .map(c => c.applicationInfo?.appliedRole)
          .filter((role): role is string => Boolean(role))
      ));
      setRoles(uniqueRoles);
    }
  }, [candidates]);

  // Apply filters whenever candidates or filter states change
  useEffect(() => {
    console.log("[CandidateKanban] Applying filters...");

    if (!candidates || candidates.length === 0) {
      setFilteredCandidates([]);
      return;
    }

    let result = [...candidates];

    // Role filter
    if (selectedRole && selectedRole !== "") {
      result = result.filter((candidate) => candidate.applicationInfo?.appliedRole === selectedRole);
    }

    // Experience level filter
    if (selectedExperience && selectedExperience !== "") {
      result = result.filter((candidate) => {
        const experience = candidate.professionalInfo?.experienceYears || 0;
        switch (selectedExperience) {
          case "Entry Level":
            return experience < 2;
          case "Mid Level":
            return experience >= 2 && experience < 5;
          case "Senior Level":
            return experience >= 5 && experience < 10;
          case "Expert Level":
            return experience >= 10;
          default:
            return true;
        }
      });
    }

    // Date range filter
    if (dateRange.start && dateRange.end) {
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      result = result.filter((candidate) => {
        const appliedDate = new Date(candidate.applicationInfo?.appliedDate || candidate.createdAt);
        return appliedDate >= startDate && appliedDate <= endDate;
      });
    }

    // Search query filter
    if (searchQuery && searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((candidate) => {
        const fullName = `${candidate.personalInfo?.firstName || ''} ${candidate.personalInfo?.lastName || ''}`.toLowerCase();
        const email = candidate.personalInfo?.email?.toLowerCase() || '';
        const phone = candidate.personalInfo?.phone?.toLowerCase() || '';
        const appliedRole = candidate.applicationInfo?.appliedRole?.toLowerCase() || '';
        const currentRole = candidate.professionalInfo?.currentRole?.toLowerCase() || '';
        const skills = candidate.professionalInfo?.skills?.join(' ').toLowerCase() || '';
        
        return fullName.includes(query) ||
               email.includes(query) ||
               phone.includes(query) ||
               appliedRole.includes(query) ||
               currentRole.includes(query) ||
               skills.includes(query);
      });
    }

    setFilteredCandidates(result);
  }, [candidates, selectedRole, selectedExperience, searchQuery, dateRange]);

  // Group filtered candidates by status
  useEffect(() => {
    const grouped = STATUS_COLUMNS.reduce((acc, column) => {
      acc[column.key] = filteredCandidates.filter(candidate => candidate.status === column.key);
      return acc;
    }, {} as {[key: string]: Candidate[]});

    setCandidatesByStatus(grouped);
  }, [filteredCandidates]);

  // Handle filter changes
  const handleRoleChange = (role: string) => {
    setSelectedRole(role);
  };

  const handleExperienceChange = (experience: string) => {
    setSelectedExperience(experience);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleClearFilters = () => {
    setSelectedRole("");
    setSelectedExperience("");
    setSearchQuery("");
    setDateRange({ start: "", end: "" });
  };

  // Handle candidate actions
  const handleEditCandidate = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    window.dispatchEvent(
      new CustomEvent("edit-candidate", { detail: { candidate } })
    );
  };

  const handleDeleteCandidate = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    window.dispatchEvent(
      new CustomEvent("delete-candidate", { detail: { candidate } })
    );
  };

  // Handle status change (drag and drop simulation)
  const handleStatusUpdate = async (candidateId: string, newStatus: string) => {
    const success = await updateCandidateStatus(candidateId, newStatus, `Status updated to ${newStatus} via Kanban`);
    if (success) {
      // Data will be refreshed automatically via the hook
    }
  };

  // Export functions
  const handleExportPDF = useCallback(() => {
    exportPDF();
  }, [exportPDF]);

  const handleExportExcel = useCallback(() => {
    exportExcel();
  }, [exportExcel]);

  // Get status badge class
  const getStatusBadgeClass = (status: string) => {
    const column = STATUS_COLUMNS.find(col => col.key === status);
    return `badge bg-${column?.color || 'light'}`;
  };

  // Get experience level badge
  const getExperienceBadge = (years: number) => {
    if (years < 2) return { text: "Entry", class: "badge bg-info" };
    if (years < 5) return { text: "Mid", class: "badge bg-warning" };
    if (years < 10) return { text: "Senior", class: "badge bg-primary" };
    return { text: "Expert", class: "badge bg-success" };
  };

  // Kanban custom styles object (replacing styled-jsx)
  const kanbanStyles = {
    kanbanColumn: {
      background: '#f8f9fa',
      minWidth: '300px',
      width: '300px'
    },
    kanbanColumnHeader: {
      position: 'sticky' as const,
      top: 0,
      zIndex: 10
    },
    kanbanCard: {
      cursor: 'pointer',
      transition: 'transform 0.2s, box-shadow 0.2s'
    },
    kanbanContainer: {
      minHeight: '70vh'
    },
    candidateDetails: {
      minHeight: '120px'
    }
  };

  return (
    <>
      {/* Page Wrapper */}
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
            <div className="my-auto mb-2">
              <h3 className="page-title mb-1">Candidates</h3>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={all_routes.adminDashboard}>Dashboard</Link>
                  </li>
                  <li className="breadcrumb-item">Employee</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Candidate Kanban
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
              <div className="me-2 mb-2">
                <div className="d-flex align-items-center border bg-white rounded p-1 me-2 icon-list">
                  <Link
                    to={all_routes.candidateskanban}
                    className="btn btn-icon btn-sm active bg-primary text-white me-1"
                  >
                    <i className="ti ti-layout-kanban" />
                  </Link>
                  <Link
                    to={all_routes.candidateslist}
                    className="btn btn-icon btn-sm me-1"
                  >
                    <i className="ti ti-list-tree" />
                  </Link>
                  <Link
                    to={all_routes.candidatesGrid}
                    className="btn btn-icon btn-sm"
                  >
                    <i className="ti ti-layout-grid" />
                  </Link>
                </div>
              </div>
              <div className="mb-2 me-2">
                <div className="dropdown">
                  <Link
                    to="#"
                    className="btn btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    Export
                  </Link>
                  <ul className="dropdown-menu dropdown-menu-end p-3">
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={(e) => {
                          e.preventDefault();
                          handleExportPDF();
                        }}
                      >
                        {exporting ? "Exporting..." : "Export as PDF"}
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={(e) => {
                          e.preventDefault();
                          handleExportExcel();
                        }}
                      >
                        {exporting ? "Exporting..." : "Export as Excel"}
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="mb-2 me-2">
                <Link
                  to="#"
                  data-bs-toggle="modal"
                  data-bs-target="#add_candidate"
                  className="btn btn-primary d-flex align-items-center"
                >
                  <i className="ti ti-plus me-2"></i>Add Candidate
                </Link>
              </div>
              <CollapseHeader />
            </div>
          </div>
          {/* /Breadcrumb */}

          {/* Candidates Statistics */}
          <div className="row">
            <div className="col-xl-3 col-md-6">
              <div className="card">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="me-2">
                      <p className="fs-13 fw-medium text-gray-9 mb-1">Total Candidates</p>
                      <h4>{stats?.totalCandidates || 0}</h4>
                    </div>
                    <span className="avatar avatar-lg bg-primary-transparent rounded-circle">
                      <i className="ti ti-users fs-20"></i>
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-md-6">
              <div className="card">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="me-2">
                      <p className="fs-13 fw-medium text-gray-9 mb-1">New Applications</p>
                      <h4>{stats?.newApplications || 0}</h4>
                    </div>
                    <span className="avatar avatar-lg bg-info-transparent rounded-circle">
                      <i className="ti ti-user-plus fs-20"></i>
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-md-6">
              <div className="card">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="me-2">
                      <p className="fs-13 fw-medium text-gray-9 mb-1">In Interview</p>
                      <h4>{stats?.interview || 0}</h4>
                    </div>
                    <span className="avatar avatar-lg bg-warning-transparent rounded-circle">
                      <i className="ti ti-message-circle fs-20"></i>
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-md-6">
              <div className="card">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="me-2">
                      <p className="fs-13 fw-medium text-gray-9 mb-1">Hired This Month</p>
                      <h4>{stats?.monthlyHires || 0}</h4>
                    </div>
                    <span className="avatar avatar-lg bg-success-transparent rounded-circle">
                      <i className="ti ti-check fs-20"></i>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* /Candidates Statistics */}

          {/* Filters */}
          <div className="card mb-3">
            <div className="card-body">
              <div className="d-flex align-items-center flex-wrap">
                {/* Search Input */}
                <div className="input-icon-start mb-3 me-2 position-relative">
                  <span className="icon-addon">
                    <i className="ti ti-search"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search candidates..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                  />
                </div>

                {/* Role Filter */}
                <div className="dropdown mb-3 me-2">
                  <Link
                    to="#"
                    className="btn btn-outline-light bg-white dropdown-toggle"
                    data-bs-toggle="dropdown"
                  >
                    {selectedRole ? `Role: ${selectedRole}` : "Select Role"}
                  </Link>
                  <div className="dropdown-menu dropdown-menu-end p-3">
                    <div className="dropdown-item">
                      <Link
                        to="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handleRoleChange("");
                        }}
                      >
                        All Roles
                      </Link>
                    </div>
                    {roles.map(role => (
                      <div key={role} className="dropdown-item">
                        <Link
                          to="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handleRoleChange(role);
                          }}
                        >
                          {role}
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Experience Filter */}
                <div className="dropdown mb-3 me-2">
                  <Link
                    to="#"
                    className="btn btn-outline-light bg-white dropdown-toggle"
                    data-bs-toggle="dropdown"
                  >
                    {selectedExperience ? `Experience: ${selectedExperience}` : "Experience Level"}
                  </Link>
                  <div className="dropdown-menu dropdown-menu-end p-3">
                    <div className="dropdown-item">
                      <Link
                        to="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handleExperienceChange("");
                        }}
                      >
                        All Levels
                      </Link>
                    </div>
                    {["Entry Level", "Mid Level", "Senior Level", "Expert Level"].map(level => (
                      <div key={level} className="dropdown-item">
                        <Link
                          to="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handleExperienceChange(level);
                          }}
                        >
                          {level}
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Clear Filters */}
                {(selectedRole ||
                  selectedExperience ||
                  searchQuery ||
                  dateRange.start ||
                  dateRange.end) && (
                  <div className="mb-3">
                    <Link
                      to="#"
                      className="btn btn-outline-danger"
                      onClick={(e) => {
                        e.preventDefault();
                        handleClearFilters();
                      }}
                    >
                      Clear Filters
                    </Link>
                  </div>
                )}

                {/* Filter Summary */}
                <div className="mb-3 ms-auto">
                  <span className="text-muted">
                    Showing {filteredCandidates.length} of {candidates.length} candidates
                  </span>
                </div>
              </div>
            </div>
          </div>
          {/* /Filters */}

          {/* Kanban Board */}
          <div className="card">
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center p-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading candidates...</span>
                  </div>
                  <p className="mt-2">Loading candidates...</p>
                </div>
              ) : error ? (
                <div className="text-center p-4">
                  <div className="alert alert-danger" role="alert">
                    <strong>Error loading candidates:</strong> {error}
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => fetchAllData()}
                  >
                    <i className="ti ti-refresh me-2"></i>Retry
                  </button>
                </div>
              ) : (
                <div className="d-flex overflow-auto" style={kanbanStyles.kanbanContainer}>
                  {STATUS_COLUMNS.map((column) => (
                    <div 
                      key={column.key} 
                      className="kanban-column flex-shrink-0 border-end" 
                      style={kanbanStyles.kanbanColumn}
                    >
                      {/* Column Header */}
                      <div 
                        className={`kanban-column-header p-3 border-bottom`}
                        style={{
                          ...kanbanStyles.kanbanColumnHeader,
                          backgroundColor: `rgba(var(--bs-${column.color}-rgb), 0.1)`
                        }}
                      >
                        <div className="d-flex justify-content-between align-items-center">
                          <h6 className="mb-0 fw-semibold">
                            {column.title}
                          </h6>
                          <span className={`badge bg-${column.color}`}>
                            {candidatesByStatus[column.key]?.length || 0}
                          </span>
                        </div>
                      </div>

                      {/* Column Content */}
                      <div className="kanban-column-content p-3" style={{ maxHeight: 'calc(70vh - 80px)', overflowY: 'auto' }}>
                        <div className="d-flex flex-column gap-3">
                          {candidatesByStatus[column.key]?.map((candidate) => {
                            const experienceBadge = getExperienceBadge(candidate.professionalInfo?.experienceYears || 0);
                            return (
                              <div 
                                key={candidate._id} 
                                className="kanban-card card border shadow-sm h-auto"
                                style={kanbanStyles.kanbanCard}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'translateY(-2px)';
                                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'translateY(0)';
                                  e.currentTarget.style.boxShadow = '';
                                }}
                              >
                                <div className="card-body p-3">
                                  {/* Card Header */}
                                  <div className="d-flex justify-content-between align-items-start mb-2">
                                    <span className={experienceBadge.class}>
                                      {experienceBadge.text}
                                    </span>
                                    <div className="dropdown">
                                      <button
                                        className="btn btn-sm btn-light p-1"
                                        type="button"
                                        data-bs-toggle="dropdown"
                                      >
                                        <i className="ti ti-dots-vertical"></i>
                                      </button>
                                      <ul className="dropdown-menu">
                                        <li>
                                          <button
                                            className="dropdown-item"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              handleEditCandidate(candidate);
                                            }}
                                            data-bs-toggle="modal"
                                            data-bs-target="#edit_candidate"
                                          >
                                            <i className="ti ti-edit me-2"></i>Edit
                                          </button>
                                        </li>
                                        <li>
                                          <button
                                            className="dropdown-item text-danger"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              handleDeleteCandidate(candidate);
                                            }}
                                            data-bs-toggle="modal"
                                            data-bs-target="#delete_candidate"
                                          >
                                            <i className="ti ti-trash me-2"></i>Delete
                                          </button>
                                        </li>
                                        <li><hr className="dropdown-divider" /></li>
                                        <li className="dropdown-header">Move to:</li>
                                        {STATUS_COLUMNS.filter(col => col.key !== candidate.status).map(status => (
                                          <li key={status.key}>
                                            <button
                                              className="dropdown-item"
                                              onClick={() => handleStatusUpdate(candidate._id, status.key)}
                                            >
                                              <i className="ti ti-arrow-right me-2"></i>{status.title}
                                            </button>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  </div>

                                  {/* Candidate Info */}
                                  <div className="text-center mb-3">
                                    <div className="avatar avatar-md mb-2">
                                      <ImageWithBasePath
                                        src="assets/img/profiles/avatar-01.jpg"
                                        className="img-fluid rounded-circle"
                                        alt="Profile"
                                      />
                                    </div>
                                    <h6 className="mb-1 fw-semibold">{candidate.fullName}</h6>
                                    <p className="text-muted fs-13 mb-0">
                                      {candidate.applicationInfo?.appliedRole || "N/A"}
                                    </p>
                                  </div>

                                  {/* Candidate Details */}
                                  <div className="candidate-details" style={kanbanStyles.candidateDetails}>
                                    {candidate.personalInfo?.email && (
                                      <div className="d-flex align-items-center mb-1">
                                        <i className="ti ti-mail me-2 text-muted fs-12"></i>
                                        <span className="fs-12 text-muted text-truncate">
                                          {candidate.personalInfo.email}
                                        </span>
                                      </div>
                                    )}
                                    
                                    {candidate.personalInfo?.phone && (
                                      <div className="d-flex align-items-center mb-1">
                                        <i className="ti ti-phone me-2 text-muted fs-12"></i>
                                        <span className="fs-12 text-muted">
                                          {candidate.personalInfo.phone}
                                        </span>
                                      </div>
                                    )}

                                    {candidate.professionalInfo?.experienceYears !== undefined && (
                                      <div className="d-flex align-items-center mb-1">
                                        <i className="ti ti-briefcase me-2 text-muted fs-12"></i>
                                        <span className="fs-12 text-muted">
                                          {candidate.professionalInfo.experienceYears} years exp.
                                        </span>
                                      </div>
                                    )}

                                    {candidate.applicationInfo?.appliedDate && (
                                      <div className="d-flex align-items-center mb-2">
                                        <i className="ti ti-calendar me-2 text-muted fs-12"></i>
                                        <span className="fs-12 text-muted">
                                          {new Date(candidate.applicationInfo.appliedDate).toLocaleDateString()}
                                        </span>
                                      </div>
                                    )}

                                    {candidate.professionalInfo?.skills && candidate.professionalInfo.skills.length > 0 && (
                                      <div className="mt-2">
                                        <div className="d-flex flex-wrap gap-1">
                                          {candidate.professionalInfo.skills.slice(0, 2).map((skill, index) => (
                                            <span key={index} className="badge bg-light text-dark fs-11">
                                              {skill}
                                            </span>
                                          ))}
                                          {candidate.professionalInfo.skills.length > 2 && (
                                            <span className="badge bg-light text-muted fs-11">
                                              +{candidate.professionalInfo.skills.length - 2}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {candidate.applicationInfo?.recruiterName && (
                                      <div className="mt-2 pt-2 border-top">
                                        <div className="d-flex align-items-center">
                                          <i className="ti ti-user-check me-2 text-muted fs-12"></i>
                                          <span className="fs-12 text-muted">
                                            {candidate.applicationInfo.recruiterName}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* /Kanban Board */}
        </div>

        {/* Footer */}
        <div className="footer d-sm-flex align-items-center justify-content-between border-top bg-white p-3">
          <p className="mb-0">2014 - 2025 © AmasQIS.</p>
          <p className="mb-0">
            Designed &amp; Developed By{" "}
            <Link to="#" className="text-primary">
              AmasQIS
            </Link>
          </p>
        </div>
        {/* /Footer */}
      </div>
      {/* /Page Wrapper */}

      {/* Modal Components */}
      <AddCandidate />
      <EditCandidate />
      <DeleteCandidate />
    </>
  );
};

export default CandidateKanban;