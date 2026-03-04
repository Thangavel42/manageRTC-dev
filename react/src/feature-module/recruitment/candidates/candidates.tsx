import { Table } from "antd";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Socket } from "socket.io-client";
import CollapseHeader from "../../../core/common/collapse-header/collapse-header";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import { Candidate, useCandidates } from "../../../hooks/useCandidates";
import { useSocket } from "../../../SocketContext";
import { all_routes } from "../../router/all_routes";
import AddCandidate from "./add_candidate";
import DeleteCandidate from "./delete_candidate";
import EditCandidate from "./edit_candidate";
import ViewCandidate from "./view_candidate";

// Status columns for Kanban
const STATUS_COLUMNS = [
  { key: "New Application", title: "New Applications", color: "purple" },
  { key: "Screening", title: "Screening", color: "pink" },
  { key: "Interview", title: "Interview", color: "info" },
  { key: "Technical Test", title: "Technical Test", color: "secondary" },
  { key: "Offer Stage", title: "Offer Stage", color: "warning" },
  { key: "Hired", title: "Hired", color: "success" },
  { key: "Rejected", title: "Rejected", color: "danger" }
];

type ViewMode = 'list' | 'grid' | 'kanban';

const Candidates = () => {
  const socket = useSocket() as Socket | null;

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

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedExperience, setSelectedExperience] = useState("");
  const [selectedSort, setSelectedSort] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [roles, setRoles] = useState<string[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  // Kanban state
  const [groupedCandidates, setGroupedCandidates] = useState<Record<string, Candidate[]>>({});

  useEffect(() => {
    console.log("Candidates component mounted");
    fetchAllData();
  }, [fetchAllData]);

  // Listen for candidate created event
  useEffect(() => {
    const handleCandidateCreated = () => {
      console.log("[Candidates] Candidate created, refreshing data...");
      fetchAllData();
    };

    window.addEventListener('candidate-created', handleCandidateCreated);

    return () => {
      window.removeEventListener('candidate-created', handleCandidateCreated);
    };
  }, [fetchAllData]);

  // Extract unique roles
  useEffect(() => {
    if (candidates && candidates.length > 0) {
      const uniqueRoles = Array.from(new Set(
        candidates
          .map(c => c.applicationInfo?.appliedRole)
          .filter((role): role is string => Boolean(role))
      ));
      setRoles(uniqueRoles);
    }
  }, [candidates]);

  // Apply filters
  useEffect(() => {
    if (!candidates || candidates.length === 0) {
      setFilteredCandidates([]);
      setGroupedCandidates({});
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

    // Date range filter
    if (dateRange.start && dateRange.end) {
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      result = result.filter((candidate) => {
        const appliedDate = new Date(candidate.applicationInfo?.appliedDate || candidate.createdAt);
        return appliedDate >= startDate && appliedDate <= endDate;
      });
    }

    // Sort
    if (selectedSort && selectedSort !== "") {
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

    // Group by status for Kanban
    const grouped = STATUS_COLUMNS.reduce((acc, column) => {
      acc[column.key] = result.filter(candidate => candidate.status === column.key);
      return acc;
    }, {} as Record<string, Candidate[]>);

    setGroupedCandidates(grouped);
  }, [candidates, selectedStatus, selectedRole, selectedExperience, selectedSort, searchQuery, dateRange]);

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

  const handleViewCandidate = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    window.dispatchEvent(
      new CustomEvent("view-candidate", { detail: { candidate } })
    );
  };

  const handleStatusUpdate = async (candidateId: string, newStatus: string) => {
    const success = await updateCandidateStatus(candidateId, newStatus, `Status updated to ${newStatus}`);
    if (success) {
      // Data will be refreshed automatically via the hook
    }
  };

  const handleExportPDF = useCallback(() => {
    exportPDF();
  }, [exportPDF]);

  const handleExportExcel = useCallback(() => {
    exportExcel();
  }, [exportExcel]);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "New Application":
        return "badge" + " " + "bg-purple text-white";
      case "Screening":
        return "badge" + " " + "bg-pink text-white";
      case "Interview":
        return "badge" + " " + "bg-info text-white";
      case "Technical Test":
        return "badge" + " " + "bg-secondary text-white";
      case "Offer Stage":
        return "badge" + " " + "bg-warning text-dark";
      case "Hired":
        return "badge" + " " + "bg-success text-white";
      case "Rejected":
        return "badge" + " " + "bg-danger text-white";
      default:
        return "badge" + " " + "bg-light text-dark";
    }
  };

  const getStatusDisplayText = (status: string) => {
    return status === "New Application" ? "New" : status;
  };

  // Table columns for list view
  const columns = [
    {
      title: "Application ID",
      dataIndex: "applicationNumber",
      sorter: (a: Candidate, b: Candidate) => (a.applicationNumber || "").localeCompare(b.applicationNumber || ""),
    },
    {
      title: "Candidate",
      dataIndex: "fullName",
      render: (text: string, record: Candidate) => (
        <div className="d-flex align-items-center">
          <Link to="#" className="avatar avatar-md me-2" onClick={() => handleViewCandidate(record)} data-bs-toggle="offcanvas" data-bs-target="#view_candidate">
            <ImageWithBasePath
              src="assets/img/profiles/avatar-01.jpg"
              className="img-fluid rounded-circle"
              alt="img"
            />
          </Link>
          <div>
            <h6 className="fw-medium mb-0">
              <Link to="#" onClick={() => handleViewCandidate(record)} data-bs-toggle="offcanvas" data-bs-target="#view_candidate">
                {record.fullName}
              </Link>
            </h6>
            <span className="fs-13 d-block text-muted">{record.personalInfo?.email}</span>
          </div>
        </div>
      ),
      sorter: (a: Candidate, b: Candidate) => (a.fullName || "").localeCompare(b.fullName || ""),
    },
    {
      title: "Applied Role",
      dataIndex: "applicationInfo",
      render: (applicationInfo: any) => {
        return applicationInfo?.appliedRoleDetails?.designation || applicationInfo?.appliedRole || "N/A";
      },
    },
    {
      title: "Phone",
      dataIndex: "personalInfo",
      render: (personalInfo: any) => personalInfo?.phone || "N/A",
    },
    {
      title: "Experience",
      dataIndex: "professionalInfo",
      render: (professionalInfo: any) => {
        const years = professionalInfo?.experienceYears || 0;
        return `${years} ${years === 1 ? 'year' : 'years'}`;
      },
    },
    {
      title: "Applied Date",
      dataIndex: "applicationInfo",
      render: (applicationInfo: any) => {
        if (!applicationInfo?.appliedDate) return "N/A";
        return new Date(applicationInfo.appliedDate).toLocaleDateString('en-US', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
      },
      sorter: (a: Candidate, b: Candidate) => {
        const dateA = a.applicationInfo?.appliedDate ? new Date(a.applicationInfo.appliedDate).getTime() : 0;
        const dateB = b.applicationInfo?.appliedDate ? new Date(b.applicationInfo.appliedDate).getTime() : 0;
        return dateA - dateB;
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (text: string, record: Candidate) => (
        <span className={getStatusBadgeClass(record.status)}>
          {getStatusDisplayText(record.status)}
        </span>
      ),
      sorter: (a: Candidate, b: Candidate) => a.status.localeCompare(b.status),
    },
    {
      title: "Recruiter",
      dataIndex: "applicationInfo",
      render: (applicationInfo: any) => {
        if (applicationInfo?.recruiterDetails) {
          const { fullName, firstName, lastName, employeeId } = applicationInfo.recruiterDetails;
          return `${fullName || `${firstName} ${lastName}`} (${employeeId})`;
        }
        return applicationInfo?.recruiterId || "N/A";
      },
    },
    {
      title: "Action",
      render: (_: any, record: Candidate) => (
        <div className="dropdown">
          <Link to="#" className="btn btn-white btn-icon btn-sm d-flex align-items-center justify-content-center rounded-circle p-0" data-bs-toggle="dropdown" aria-expanded="false">
            <i className="ti ti-dots-vertical fs-14" />
          </Link>
          <ul className="dropdown-menu dropdown-menu-right p-3">
            <li>
              <Link className="dropdown-item rounded-1" to="#" onClick={() => handleViewCandidate(record)} data-bs-toggle="offcanvas" data-bs-target="#view_candidate">
                <i className="ti ti-eye me-2" />
                View Details
              </Link>
            </li>
            <li>
              <Link className="dropdown-item rounded-1" to="#" onClick={() => handleEditCandidate(record)} data-bs-toggle="modal" data-bs-target="#edit_candidate">
                <i className="ti ti-edit-circle me-2" />
                Edit
              </Link>
            </li>
            <li>
              <Link className="dropdown-item rounded-1" to="#" onClick={() => handleDeleteCandidate(record)} data-bs-toggle="modal" data-bs-target="#delete_candidate">
                <i className="ti ti-trash-x me-2" />
                Delete
              </Link>
            </li>
          </ul>
        </div>
      ),
    },
  ];

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
                    Candidate {viewMode === 'grid' ? 'Grid' : viewMode === 'list' ? 'List' : 'Kanban'}
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
              <div className="me-2 mb-2">
                <div className="d-flex align-items-center border bg-white rounded p-1 me-2 icon-list">
                  <Link
                    to="#"
                    className={`btn btn-icon btn-sm me-1 ${viewMode === 'kanban' ? 'active bg-primary text-white' : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setViewMode('kanban');
                    }}
                  >
                    <i className="ti ti-layout-kanban" />
                  </Link>
                  <Link
                    to="#"
                    className={`btn btn-icon btn-sm me-1 ${viewMode === 'list' ? 'active bg-primary text-white' : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setViewMode('list');
                    }}
                  >
                    <i className="ti ti-list-tree" />
                  </Link>
                  <Link
                    to="#"
                    className={`btn btn-icon btn-sm ${viewMode === 'grid' ? 'active bg-primary text-white' : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setViewMode('grid');
                    }}
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
              <div className="mb-2">
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

          {/* Render based on view mode */}
          {viewMode === 'list' && (
            <div className="card">
              <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-0">
                <h4 className="mb-3">Candidates List</h4>
                <div className="d-flex align-items-center flex-wrap">
                  <div className="input-icon-start mb-3 me-2 position-relative">
                    <i className="ti ti-search" />
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search candidates..."
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="card-body">
                <Table
                  columns={columns}
                  dataSource={filteredCandidates}
                  rowKey="_id"
                  loading={loading}
                  pagination={{
                    total: filteredCandidates.length,
                    showTotal: (total, range) => `Showing ${range[0]} to ${range[1]} of ${total} entries`,
                    showSizeChanger: true,
                    defaultPageSize: 10,
                    pageSizeOptions: ['10', '25', '50', '100']
                  }}
                />
              </div>
            </div>
          )}

          {viewMode === 'grid' && (
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
                        ? `Sort: ${selectedSort === "name_asc"
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
                {!loading && !error && (selectedStatus ||
                  selectedRole ||
                  selectedExperience ||
                  selectedSort ||
                  searchQuery ||
                  dateRange.start ||
                  dateRange.end) && (
                    <div className="d-flex align-items-center justify-content-between mb-4 p-3 bg-light rounded">
                      <div className="text-muted small">
                        Filters applied:
                        {selectedStatus && ` Status: ${selectedStatus}`}
                        {selectedRole && ` Role: ${selectedRole}`}
                        {selectedExperience && ` Experience: ${selectedExperience}`}
                        {selectedSort && ` Sort: ${selectedSort}`}
                        {searchQuery && ` Search: "${searchQuery}"`}
                      </div>
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
                      return (
                        <div key={candidate._id} className="col-xxl-3 col-xl-4 col-md-6">
                          <div className="card">
                            <div className="card-body">
                              <div className="d-flex justify-content-between align-items-start mb-3">
                                <div className="d-flex align-items-center flex-shrink-0">
                                  <Link
                                    to="#"
                                    className="avatar avatar-lg avatar rounded-circle me-2"
                                    data-bs-toggle="offcanvas"
                                    data-bs-target="#view_candidate"
                                    onClick={() => handleViewCandidate(candidate)}
                                  >
                                    <ImageWithBasePath
                                      src="assets/img/profiles/avatar-01.jpg"
                                      className="img-fluid h-auto w-auto"
                                      alt="img"
                                    />
                                  </Link>
                                  <div className="d-flex flex-column">
                                    <div className="d-flex flex-wrap mb-1">
                                      <h6 className="fs-16 fw-semibold me-1">
                                        <Link
                                          to="#"
                                          data-bs-toggle="offcanvas"
                                          data-bs-target="#view_candidate"
                                          onClick={() => handleViewCandidate(candidate)}
                                        >
                                          {candidate.fullName}
                                        </Link>
                                      </h6>
                                      <span className="badge bg-primary-transparent">
                                        {candidate.applicationNumber || 'N/A'}
                                      </span>
                                    </div>
                                    <p className="text-gray fs-13 fw-normal">
                                      {candidate.personalInfo?.email || 'N/A'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="bg-light rounder p-2">
                                <div className="d-flex align-items-center justify-content-between mb-2">
                                  <h6 className="text-gray fs-14 fw-normal">Applied Role</h6>
                                  <span className="text-dark fs-14 fw-medium">
                                    {candidate.applicationInfo?.appliedRoleDetails?.designation ||
                                      candidate.applicationInfo?.appliedRole?.toString() || "N/A"}
                                  </span>
                                </div>
                                <div className="d-flex align-items-center justify-content-between mb-2">
                                  <h6 className="text-gray fs-14 fw-normal">Applied Date</h6>
                                  <span className="text-dark fs-14 fw-medium">
                                    {candidate.applicationInfo?.appliedDate
                                      ? new Date(candidate.applicationInfo.appliedDate).toLocaleDateString('en-US', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric'
                                      })
                                      : 'N/A'}
                                  </span>
                                </div>
                                <div className="d-flex align-items-center justify-content-between">
                                  <h6 className="text-gray fs-14 fw-normal">Status</h6>
                                  <span className={`fs-10 fw-medium ${getStatusBadgeClass(candidate.status)}`}>
                                    <i className="ti ti-point-filled" /> {getStatusDisplayText(candidate.status)}
                                  </span>
                                </div>
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
          )}

          {viewMode === 'kanban' && (
            <div className="card">
              <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-0">
                <h4 className="mb-3">Candidates Kanban</h4>
              </div>
              <div className="card-body">
                <div className="d-flex gap-3 overflow-auto pb-3" style={{ minHeight: '600px' }}>
                  {STATUS_COLUMNS.map((column) => (
                    <div key={column.key} className="kanban-column bg-light rounded p-3" style={{ minWidth: '300px', width: '300px' }}>
                      <div className="d-flex align-items-center justify-content-between mb-3 sticky-top bg-light py-2">
                        <h6 className="fw-semibold mb-0">{column.title}</h6>
                        <span className={`badge bg-${column.color}`}>
                          {groupedCandidates[column.key]?.length || 0}
                        </span>
                      </div>
                      <div className="d-flex flex-column gap-2">
                        {groupedCandidates[column.key]?.map((candidate) => (
                          <div key={candidate._id} className="card mb-0">
                            <div className="card-body p-3">
                              <div className="d-flex align-items-start mb-2">
                                <Link
                                  to="#"
                                  className="avatar avatar-sm rounded-circle me-2"
                                  data-bs-toggle="offcanvas"
                                  data-bs-target="#view_candidate"
                                  onClick={() => handleViewCandidate(candidate)}
                                >
                                  <ImageWithBasePath
                                    src="assets/img/profiles/avatar-01.jpg"
                                    className="img-fluid"
                                    alt="img"
                                  />
                                </Link>
                                <div className="flex-grow-1">
                                  <h6 className="fw-medium mb-0 fs-14">
                                    <Link
                                      to="#"
                                      data-bs-toggle="offcanvas"
                                      data-bs-target="#view_candidate"
                                      onClick={() => handleViewCandidate(candidate)}
                                    >
                                      {candidate.fullName}
                                    </Link>
                                  </h6>
                                  <span className="text-muted fs-12">{candidate.applicationNumber}</span>
                                </div>
                              </div>
                              <div className="mb-2">
                                <span className="text-muted fs-12">Applied Role:</span>
                                <div className="fw-medium fs-13">
                                  {candidate.applicationInfo?.appliedRoleDetails?.designation || "N/A"}
                                </div>
                              </div>
                              <div className="d-flex align-items-center justify-content-between">
                                <span className="text-muted fs-12">
                                  {candidate.applicationInfo?.appliedDate
                                    ? new Date(candidate.applicationInfo.appliedDate).toLocaleDateString('en-US', {
                                      day: '2-digit',
                                      month: 'short'
                                    })
                                    : 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
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
      <ViewCandidate />
    </>
  );
};

export default Candidates;
