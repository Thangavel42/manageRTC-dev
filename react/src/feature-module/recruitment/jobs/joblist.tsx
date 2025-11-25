import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { all_routes } from "../../router/all_routes";
import { useSocket } from "../../../SocketContext";
import { Socket } from "socket.io-client";
import { useJobs, Job } from "../../../hooks/useJobs";
import Table from "../../../core/common/dataTable/index";
import CollapseHeader from "../../../core/common/collapse-header/collapse-header";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import AddJob from "./add_job";
import EditJob from "./edit_job";
import DeleteJob from "./delete_job";
import { message } from "antd";

const JobList = () => {
  const socket = useSocket() as Socket | null;

  // State management using the custom hook
  const {
    jobs,
    stats,
    fetchAllData,
    loading,
    error,
    exportPDF,
    exportExcel,
    exporting,
  } = useJobs();

  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  
  // Filter states
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedSort, setSelectedSort] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  // Extract unique categories and types for filters
  const [categories, setCategories] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Initialize data fetch
  useEffect(() => {
    console.log("JobList component mounted");
    fetchAllData();
  }, [fetchAllData]);

  // Extract unique values for filters whenever jobs change
  useEffect(() => {
    if (jobs && jobs.length > 0) {
      const uniqueCategories = Array.from(new Set(
        jobs
          .map(j => j.category)
          .filter((category): category is string => Boolean(category))
      ));
      
      const uniqueTypes = Array.from(new Set(
        jobs
          .map(j => j.type)
          .filter((type): type is string => Boolean(type))
      ));

      setCategories(uniqueCategories);
      setTypes(uniqueTypes);
    }
  }, [jobs]);

  // Apply filters whenever jobs or filter states change
  useEffect(() => {
    console.log("[JobList] Applying filters...");
    console.log("[JobList] Current filters:", {
      selectedStatus,
      selectedCategory,
      selectedType,
      selectedSort,
      searchQuery,
      dateRange,
    });

    if (!jobs || jobs.length === 0) {
      setFilteredJobs([]);
      return;
    }

    let result = [...jobs];

    // Status filter
    if (selectedStatus && selectedStatus !== "") {
      result = result.filter((job) => job.status === selectedStatus);
    }

    // Category filter
    if (selectedCategory && selectedCategory !== "") {
      result = result.filter((job) => job.category === selectedCategory);
    }

    // Type filter
    if (selectedType && selectedType !== "") {
      result = result.filter((job) => job.type === selectedType);
    }

    // Date range filter
    if (dateRange.start && dateRange.end) {
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      result = result.filter((job) => {
        const createdDate = new Date(job.createdAt);
        return createdDate >= startDate && createdDate <= endDate;
      });
    }

    // Search query filter
    if (searchQuery && searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((job) => {
        const title = job.title?.toLowerCase() || '';
        const description = job.description?.toLowerCase() || '';
        const skills = job.skills?.join(' ').toLowerCase() || '';
        const location = `${job.location?.city || ''} ${job.location?.state || ''} ${job.location?.country || ''}`.toLowerCase();
        
        return title.includes(query) ||
               description.includes(query) ||
               skills.includes(query) ||
               location.includes(query);
      });
    }

    // Sort
    if (selectedSort) {
      result.sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        
        switch (selectedSort) {
          case "title_asc":
            return a.title.localeCompare(b.title);
          case "title_desc":
            return b.title.localeCompare(a.title);
          case "date_recent":
            return dateB.getTime() - dateA.getTime();
          case "date_oldest":
            return dateA.getTime() - dateB.getTime();
          case "salary_high":
            return (b.salaryRange?.max || 0) - (a.salaryRange?.max || 0);
          case "salary_low":
            return (a.salaryRange?.min || 0) - (b.salaryRange?.min || 0);
          case "applications":
            return (b.appliedCount || 0) - (a.appliedCount || 0);
          default:
            return 0;
        }
      });
    }

    setFilteredJobs(result);
  }, [jobs, selectedStatus, selectedCategory, selectedType, selectedSort, searchQuery, dateRange]);

  // Handle filter changes
  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
  };

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
  };

  const handleSortChange = (sort: string) => {
    setSelectedSort(sort);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleClearFilters = () => {
    setSelectedStatus("");
    setSelectedCategory("");
    setSelectedType("");
    setSelectedSort("");
    setSearchQuery("");
    setDateRange({ start: "", end: "" });
  };

  // Handle job actions
  const handleEditJob = (job: Job) => {
    setSelectedJob(job);
    window.dispatchEvent(
      new CustomEvent("edit-job", { detail: { job } })
    );
  };

  const handleDeleteJob = (job: Job) => {
    setSelectedJob(job);
    window.dispatchEvent(
      new CustomEvent("delete-job", { detail: { job } })
    );
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
      case "Active":
        return "badge bg-success";
      case "Inactive":
        return "badge bg-danger";
      default:
        return "badge bg-light text-dark";
    }
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "software":
        return "ti ti-code";
      case "hardware":
        return "ti ti-cpu";
      case "design":
        return "ti ti-palette";
      case "marketing":
        return "ti ti-speakerphone";
      case "sales":
        return "ti ti-chart-line";
      case "hr":
        return "ti ti-users";
      case "finance":
        return "ti ti-coins";
      default:
        return "ti ti-briefcase";
    }
  };

  // Table columns configuration
  const columns = [
    {
      title: "Job Title",
      dataIndex: "title",
      render: (text: string, record: Job) => (
        <div className="d-flex align-items-center">
          <div className="avatar avatar-sm me-2 bg-primary-transparent rounded">
            <i className={`${getCategoryIcon(record.category)} fs-16`}></i>
          </div>
          <div>
            <h6 className="fw-medium mb-0">{record.title}</h6>
            <span className="fs-13 text-muted">{record.category}</span>
          </div>
        </div>
      ),
      sorter: (a: Job, b: Job) => a.title.localeCompare(b.title),
    },
    {
      title: "Type",
      dataIndex: "type",
      render: (text: string, record: Job) => (
        <span className="badge bg-light text-dark">{record.type}</span>
      ),
      sorter: (a: Job, b: Job) => a.type.localeCompare(b.type),
    },
    {
      title: "Location",
      dataIndex: "location",
      render: (text: any, record: Job) => (
        <span>
          {record.location?.city && record.location?.state && record.location?.country 
            ? `${record.location.city}, ${record.location.state}, ${record.location.country}`
            : "Not specified"}
        </span>
      ),
    },
    {
      title: "Salary Range",
      dataIndex: "salaryRange",
      render: (text: any, record: Job) => (
        <span>
          {record.salaryRange?.min && record.salaryRange?.max 
            ? `${record.salaryRange.min.toLocaleString()} - ${record.salaryRange.max.toLocaleString()} ${record.salaryRange.currency}`
            : "Not specified"}
        </span>
      ),
      sorter: (a: Job, b: Job) => (a.salaryRange?.max || 0) - (b.salaryRange?.max || 0),
    },
    {
      title: "Positions",
      dataIndex: "numberOfPositions",
      render: (text: string, record: Job) => (
        <span>{record.numberOfPositions}</span>
      ),
      sorter: (a: Job, b: Job) => a.numberOfPositions - b.numberOfPositions,
    },
    {
      title: "Applications",
      dataIndex: "appliedCount",
      render: (text: string, record: Job) => (
        <span className="fw-semibold text-primary">{record.appliedCount || 0}</span>
      ),
      sorter: (a: Job, b: Job) => (a.appliedCount || 0) - (b.appliedCount || 0),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (text: string, record: Job) => (
        <span className={getStatusBadgeClass(record.status)}>
          {record.status}
        </span>
      ),
      sorter: (a: Job, b: Job) => a.status.localeCompare(b.status),
    },
    {
      title: "Posted Date",
      dataIndex: "createdAt",
      render: (text: string, record: Job) => {
        const date = new Date(record.createdAt);
        return date.toLocaleDateString();
      },
      sorter: (a: Job, b: Job) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      },
    },
    {
      title: "Actions",
      dataIndex: "actions",
      render: (text: any, record: Job) => (
        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-sm btn-outline-primary"
            onClick={(e) => {
              e.preventDefault();
              handleEditJob(record);
            }}
            data-bs-toggle="modal"
            data-bs-target="#edit_job"
          >
            <i className="ti ti-edit"></i>
          </button>
          <button
            className="btn btn-sm btn-outline-danger"
            onClick={(e) => {
              e.preventDefault();
              handleDeleteJob(record);
            }}
            data-bs-toggle="modal"
            data-bs-target="#delete_job"
          >
            <i className="ti ti-trash"></i>
          </button>
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
              <h3 className="page-title mb-1">Jobs</h3>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={all_routes.adminDashboard}>Dashboard</Link>
                  </li>
                  <li className="breadcrumb-item">Recruitment</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Job List
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
               <div className="me-2 mb-2">
                <div className="d-flex align-items-center border bg-white rounded p-1 me-2 icon-list">
                  <Link
                    to={all_routes.joblist}
                    className="btn btn-icon btn-sm active bg-primary text-white"
                  >
                    <i className="ti ti-list-tree" />
                  </Link>
                  <Link
                    to={all_routes.jobgrid}
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
                  data-bs-target="#add_job"
                  className="btn btn-primary d-flex align-items-center"
                >
                  <i className="ti ti-plus me-2"></i>Add Job
                </Link>
              </div>
              <CollapseHeader />
            </div>
          </div>
          {/* /Breadcrumb */}

          {/* Job Statistics */}
          <div className="row">
            <div className="col-xl-3 col-md-6">
              <div className="card">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="me-2">
                      <p className="fs-13 fw-medium text-gray-9 mb-1">Total Jobs</p>
                      <h4>{stats?.totalJobs || 0}</h4>
                    </div>
                    <span className="avatar avatar-lg bg-primary-transparent rounded-circle">
                      <i className="ti ti-briefcase fs-20"></i>
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
                      <p className="fs-13 fw-medium text-gray-9 mb-1">Active Jobs</p>
                      <h4>{stats?.activeJobs || 0}</h4>
                    </div>
                    <span className="avatar avatar-lg bg-success-transparent rounded-circle">
                      <i className="ti ti-check fs-20"></i>
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
                      <p className="fs-13 fw-medium text-gray-9 mb-1">Inactive Jobs</p>
                      <h4>{stats?.inactiveJobs || 0}</h4>
                    </div>
                    <span className="avatar avatar-lg bg-danger-transparent rounded-circle">
                      <i className="ti ti-x fs-20"></i>
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
                      <p className="fs-13 fw-medium text-gray-9 mb-1">New Jobs</p>
                      <h4>{stats?.newJobs || 0}</h4>
                    </div>
                    <span className="avatar avatar-lg bg-info-transparent rounded-circle">
                      <i className="ti ti-plus fs-20"></i>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* /Job Statistics */}

          {/* Job List */}
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-0">
              <h4 className="mb-3">Job List</h4>
              <div className="d-flex align-items-center flex-wrap">
                {/* Search Input */}
                <div className="input-icon-start mb-3 me-2 position-relative">
                  <span className="icon-addon">
                    <i className="ti ti-search"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search jobs..."
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
                    {["Active", "Inactive"].map(status => (
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

                {/* Category Filter */}
                <div className="dropdown mb-3 me-2">
                  <Link
                    to="#"
                    className="btn btn-outline-light bg-white dropdown-toggle"
                    data-bs-toggle="dropdown"
                  >
                    {selectedCategory ? `Category: ${selectedCategory}` : "Select Category"}
                  </Link>
                  <div className="dropdown-menu dropdown-menu-end p-3">
                    <div className="dropdown-item">
                      <Link
                        to="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handleCategoryChange("");
                        }}
                      >
                        All Categories
                      </Link>
                    </div>
                    {categories.map(category => (
                      <div key={category} className="dropdown-item">
                        <Link
                          to="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handleCategoryChange(category);
                          }}
                        >
                          {category}
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Type Filter */}
                <div className="dropdown mb-3 me-2">
                  <Link
                    to="#"
                    className="btn btn-outline-light bg-white dropdown-toggle"
                    data-bs-toggle="dropdown"
                  >
                    {selectedType ? `Type: ${selectedType}` : "Select Type"}
                  </Link>
                  <div className="dropdown-menu dropdown-menu-end p-3">
                    <div className="dropdown-item">
                      <Link
                        to="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handleTypeChange("");
                        }}
                      >
                        All Types
                      </Link>
                    </div>
                    {types.map(type => (
                      <div key={type} className="dropdown-item">
                        <Link
                          to="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handleTypeChange(type);
                          }}
                        >
                          {type}
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
                          selectedSort === "title_asc"
                            ? "A-Z"
                            : selectedSort === "title_desc"
                            ? "Z-A"
                            : selectedSort === "date_recent"
                            ? "Recent"
                            : selectedSort === "date_oldest"
                            ? "Oldest"
                            : selectedSort === "salary_high"
                            ? "High Salary"
                            : selectedSort === "salary_low"
                            ? "Low Salary"
                            : "Applications"
                        }`
                      : "Sort By"}
                  </Link>
                  <div className="dropdown-menu dropdown-menu-end p-3">
                    <div className="dropdown-item">
                      <Link
                        to="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handleSortChange("title_asc");
                        }}
                      >
                        Title A-Z
                      </Link>
                    </div>
                    <div className="dropdown-item">
                      <Link
                        to="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handleSortChange("title_desc");
                        }}
                      >
                        Title Z-A
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
                        Recently Posted
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
                          handleSortChange("salary_high");
                        }}
                      >
                        Highest Salary
                      </Link>
                    </div>
                    <div className="dropdown-item">
                      <Link
                        to="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handleSortChange("salary_low");
                        }}
                      >
                        Lowest Salary
                      </Link>
                    </div>
                    <div className="dropdown-item">
                      <Link
                        to="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handleSortChange("applications");
                        }}
                      >
                        Most Applications
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Clear Filters */}
                {(selectedStatus ||
                  selectedCategory ||
                  selectedType ||
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

            <div className="card-body p-0">
              {loading ? (
                <div className="text-center p-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading jobs...</span>
                  </div>
                  <p className="mt-2">Loading jobs...</p>
                </div>
              ) : error ? (
                <div className="text-center p-4">
                  <div className="alert alert-danger" role="alert">
                    <strong>Error loading jobs:</strong> {error}
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => fetchAllData()}
                  >
                    <i className="ti ti-refresh me-2"></i>Retry
                  </button>
                </div>
              ) : (
                <>
                  {/* Filter Summary */}
                  <div className="px-4 py-3 border-bottom bg-light">
                    <div className="d-flex align-items-center justify-content-between">
                      <span className="text-muted">
                        Showing {filteredJobs.length} of {jobs.length} jobs
                      </span>
                      {(selectedStatus ||
                        selectedCategory ||
                        selectedType ||
                        selectedSort ||
                        searchQuery ||
                        dateRange.start ||
                        dateRange.end) && (
                        <div className="text-muted small">
                          Filters applied:
                          {selectedStatus && ` Status: ${selectedStatus}`}
                          {selectedCategory && ` Category: ${selectedCategory}`}
                          {selectedType && ` Type: ${selectedType}`}
                          {selectedSort && ` Sort: ${selectedSort}`}
                          {searchQuery && ` Search: "${searchQuery}"`}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Job Table */}
                  <Table
                    dataSource={filteredJobs}
                    columns={columns}
                    Selection={true}
                  />
                </>
              )}
            </div>
          </div>
          {/* /Job List */}
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
      <AddJob />
      <EditJob />
      <DeleteJob />
    </>
  );
};

export default JobList;