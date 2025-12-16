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
import Footer from "../../../core/common/footer";

const CandidateGrid = () => {
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
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedExperience, setSelectedExperience] = useState("");
  const [selectedSort, setSelectedSort] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  // Extract unique roles for filters
  const [roles, setRoles] = useState<string[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  // Initialize data fetch
  useEffect(() => {
    console.log("CandidateGrid component mounted");
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
    console.log("[CandidateGrid] Applying filters...");
    console.log("[CandidateGrid] Current filters:", {
      selectedStatus,
      selectedRole,
      selectedExperience,
      selectedSort,
      searchQuery,
      dateRange,
    });

    if (!candidates || candidates.length === 0) {
      setFilteredCandidates([]);
      return;
    }

    let result = [...candidates];

    // Status filter
    if (selectedStatus && selectedStatus !== "") {
      result = result.filter((candidate) => candidate.status === selectedStatus);
    }

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

    // Sort
    if (selectedSort) {
      result.sort((a, b) => {
        const dateA = new Date(a.applicationInfo?.appliedDate || a.createdAt);
        const dateB = new Date(b.applicationInfo?.appliedDate || b.createdAt);
        
        switch (selectedSort) {
          case "name_asc":
            return a.fullName.localeCompare(b.fullName);
          case "name_desc":
            return b.fullName.localeCompare(a.fullName);
          case "date_recent":
            return dateB.getTime() - dateA.getTime();
          case "date_oldest":
            return dateA.getTime() - dateB.getTime();
          case "role":
            return (a.applicationInfo?.appliedRole || '').localeCompare(b.applicationInfo?.appliedRole || '');
          case "experience":
            return (b.professionalInfo?.experienceYears || 0) - (a.professionalInfo?.experienceYears || 0);
          default:
            return 0;
        }
      });
    }

    setFilteredCandidates(result);
  }, [candidates, selectedStatus, selectedRole, selectedExperience, selectedSort, searchQuery, dateRange]);

  // Handle filter changes
  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
  };

  const handleRoleChange = (role: string) => {
    setSelectedRole(role);
  };

  const handleExperienceChange = (experience: string) => {
    setSelectedExperience(experience);
  };

  const handleSortChange = (sort: string) => {
    setSelectedSort(sort);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleClearFilters = () => {
    setSelectedStatus("");
    setSelectedRole("");
    setSelectedExperience("");
    setSelectedSort("");
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

  // Handle status change
  const handleStatusUpdate = async (candidateId: string, newStatus: string) => {
    const success = await updateCandidateStatus(candidateId, newStatus, `Status updated to ${newStatus}`);
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
    switch (status) {
      case "New Application":
        return "badge bg-info";
      case "Screening":
        return "badge bg-warning";
      case "Interview":
        return "badge bg-primary";
      case "Technical Test":
        return "badge bg-secondary";
      case "Offer Stage":
        return "badge bg-success";
      case "Hired":
        return "badge bg-success";
      case "Rejected":
        return "badge bg-danger";
      default:
        return "badge bg-light text-dark";
    }
  };

  // Get experience level badge
  const getExperienceBadge = (years: number) => {
    if (years < 2) return { text: "Entry Level", class: "badge bg-info" };
    if (years < 5) return { text: "Mid Level", class: "badge bg-warning" };
    if (years < 10) return { text: "Senior Level", class: "badge bg-primary" };
    return { text: "Expert Level", class: "badge bg-success" };
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
                    Candidate Grid
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
               <div className="me-2 mb-2">
                <div className="d-flex align-items-center border bg-white rounded p-1 me-2 icon-list">
                  <Link
                    to={all_routes.candidateskanban}
                    className="btn btn-icon btn-sm me-1"
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
                    className="btn btn-icon btn-sm active bg-primary text-white"
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

          {/* Candidates Grid */}
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-0">
              <h4 className="mb-3">Candidate Grid</h4>
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

                {/* Status Filter */}
                <div className="dropdown mb-3 me-2">
                  <Link
                    to="#"
                    className="btn btn-outline-light bg-white dropdown-toggle"
                    data-bs-toggle="dropdown"
                  >
                    {selectedStatus ? `Status: ${selectedStatus}` : "Select Status"}
                  </Link>
                  <div className="dropdown-menu dropdown-menu-end p-3">
                    <div className="dropdown-item">
                      <Link
                        to="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handleStatusChange("");
                        }}
                      >
                        All Status
                      </Link>
                    </div>
                    {["New Application", "Screening", "Interview", "Technical Test", "Offer Stage", "Hired", "Rejected"].map(status => (
                      <div key={status} className="dropdown-item">
                        <Link
                          to="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handleStatusChange(status);
                          }}
                        >
                          {status}
                        </Link>
                      </div>
                    ))}
                  </div>
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

                {/* Sort Filter */}
                <div className="dropdown mb-3 me-2">
                  <Link
                    to="#"
                    className="btn btn-outline-light bg-white dropdown-toggle"
                    data-bs-toggle="dropdown"
                  >
                    {selectedSort
                      ? `Sort: ${
                          selectedSort === "name_asc"
                            ? "A-Z"
                            : selectedSort === "name_desc"
                            ? "Z-A"
                            : selectedSort === "date_recent"
                            ? "Recent"
                            : selectedSort === "date_oldest"
                            ? "Oldest"
                            : "Experience"
                        }`
                      : "Sort By"}
                  </Link>
                  <div className="dropdown-menu dropdown-menu-end p-3">
                    <div className="dropdown-item">
                      <Link
                        to="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handleSortChange("name_asc");
                        }}
                      >
                        Name A-Z
                      </Link>
                    </div>
                    <div className="dropdown-item">
                      <Link
                        to="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handleSortChange("name_desc");
                        }}
                      >
                        Name Z-A
                      </Link>
                    </div>
                    <div className="dropdown-item">
                      <Link
                        to="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handleSortChange("date_recent");
                        }}
                      >
                        Recently Applied
                      </Link>
                    </div>
                    <div className="dropdown-item">
                      <Link
                        to="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handleSortChange("date_oldest");
                        }}
                      >
                        Oldest First
                      </Link>
                    </div>
                    <div className="dropdown-item">
                      <Link
                        to="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handleSortChange("experience");
                        }}
                      >
                        By Experience
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Clear Filters */}
                {(selectedStatus ||
                  selectedRole ||
                  selectedExperience ||
                  selectedSort ||
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
              </div>
            </div>

            <div className="card-body">
              {/* Filter Summary */}
              {!loading && !error && (
                <div className="d-flex align-items-center justify-content-between mb-4 p-3 bg-light rounded">
                  <span className="text-muted">
                    Showing {filteredCandidates.length} of {candidates.length} candidates
                  </span>
                  {(selectedStatus ||
                    selectedRole ||
                    selectedExperience ||
                    selectedSort ||
                    searchQuery ||
                    dateRange.start ||
                    dateRange.end) && (
                    <div className="text-muted small">
                      Filters applied:
                      {selectedStatus && ` Status: ${selectedStatus}`}
                      {selectedRole && ` Role: ${selectedRole}`}
                      {selectedExperience && ` Experience: ${selectedExperience}`}
                      {selectedSort && ` Sort: ${selectedSort}`}
                      {searchQuery && ` Search: "${searchQuery}"`}
                    </div>
                  )}
                </div>
              )}

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
                <div className="row">
                  {filteredCandidates.map((candidate) => {
                    const experienceBadge = getExperienceBadge(candidate.professionalInfo?.experienceYears || 0);
                    return (
                      <div key={candidate._id} className="col-xxl-3 col-xl-4 col-md-6">
                        <div className="card border-0 shadow-sm h-100">
                          <div className="card-body">
                            {/* Header with Actions */}
                            <div className="d-flex justify-content-between align-items-start mb-3">
                              <div className="dropdown">
                                <span className={getStatusBadgeClass(candidate.status)} data-bs-toggle="dropdown" style={{ cursor: 'pointer' }}>
                                  {candidate.status}
                                </span>
                                <ul className="dropdown-menu">
                                  {["New Application", "Screening", "Interview", "Technical Test", "Offer Stage", "Hired", "Rejected"].map(status => (
                                    <li key={status}>
                                      <button
                                        className="dropdown-item"
                                        onClick={() => {
                                          if (status !== candidate.status) {
                                            handleStatusUpdate(candidate._id, status);
                                          }
                                        }}
                                      >
                                        {status}
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div className="dropdown">
                                <button
                                  className="btn btn-sm btn-light"
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
                                </ul>
                              </div>
                            </div>

                            {/* Candidate Profile */}
                            <div className="text-center mb-3">
                              <div className="avatar avatar-lg mb-2">
                                <ImageWithBasePath
                                  src="assets/img/profiles/avatar-01.jpg"
                                  className="img-fluid rounded-circle"
                                  alt="Profile"
                                />
                              </div>
                              <h5 className="mb-1">{candidate.fullName}</h5>
                              <p className="text-muted fs-13 mb-2">{candidate.applicationInfo?.appliedRole || "N/A"}</p>
                              <span className={experienceBadge.class}>
                                {experienceBadge.text}
                              </span>
                            </div>

                            {/* Candidate Details */}
                            <div className="border-top pt-3">
                              {candidate.personalInfo?.email && (
                                <div className="d-flex align-items-center mb-2">
                                  <i className="ti ti-mail me-2 text-muted"></i>
                                  <span className="fs-13 text-muted">{candidate.personalInfo.email}</span>
                                </div>
                              )}
                              
                              {candidate.personalInfo?.phone && (
                                <div className="d-flex align-items-center mb-2">
                                  <i className="ti ti-phone me-2 text-muted"></i>
                                  <span className="fs-13 text-muted">{candidate.personalInfo.phone}</span>
                                </div>
                              )}

                              {candidate.professionalInfo?.experienceYears !== undefined && (
                                <div className="d-flex align-items-center mb-2">
                                  <i className="ti ti-briefcase me-2 text-muted"></i>
                                  <span className="fs-13 text-muted">
                                    {candidate.professionalInfo.experienceYears} years experience
                                  </span>
                                </div>
                              )}

                              {candidate.applicationInfo?.appliedDate && (
                                <div className="d-flex align-items-center mb-2">
                                  <i className="ti ti-calendar me-2 text-muted"></i>
                                  <span className="fs-13 text-muted">
                                    Applied: {new Date(candidate.applicationInfo.appliedDate).toLocaleDateString()}
                                  </span>
                                </div>
                              )}

                              {candidate.professionalInfo?.currentRole && (
                                <div className="d-flex align-items-center mb-2">
                                  <i className="ti ti-user me-2 text-muted"></i>
                                  <span className="fs-13 text-muted">
                                    {candidate.professionalInfo.currentRole}
                                    {candidate.professionalInfo.currentCompany && 
                                      ` at ${candidate.professionalInfo.currentCompany}`
                                    }
                                  </span>
                                </div>
                              )}

                              {candidate.personalInfo?.city && (
                                <div className="d-flex align-items-center mb-2">
                                  <i className="ti ti-map-pin me-2 text-muted"></i>
                                  <span className="fs-13 text-muted">
                                    {candidate.personalInfo.city}
                                    {candidate.personalInfo.state && `, ${candidate.personalInfo.state}`}
                                  </span>
                                </div>
                              )}

                              {candidate.professionalInfo?.skills && candidate.professionalInfo.skills.length > 0 && (
                                <div className="mt-3">
                                  <h6 className="fs-13 fw-medium mb-2">Key Skills:</h6>
                                  <div className="d-flex flex-wrap gap-1">
                                    {candidate.professionalInfo.skills.slice(0, 3).map((skill, index) => (
                                      <span key={index} className="badge bg-light text-dark fs-12">
                                        {skill}
                                      </span>
                                    ))}
                                    {candidate.professionalInfo.skills.length > 3 && (
                                      <span className="badge bg-light text-muted fs-12">
                                        +{candidate.professionalInfo.skills.length - 3} more
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {candidate.applicationInfo?.recruiterName && (
                                <div className="mt-3 pt-3 border-top">
                                  <div className="d-flex align-items-center">
                                    <i className="ti ti-user-check me-2 text-muted"></i>
                                    <span className="fs-13 text-muted">
                                      Recruiter: {candidate.applicationInfo.recruiterName}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          {/* /Candidates Grid */}
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

export default CandidateGrid;