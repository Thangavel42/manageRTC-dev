import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { all_routes } from "../../router/all_routes";
import { useSocket } from "../../../SocketContext";
import { Socket } from "socket.io-client";
import { useJobs, Job } from "../../../hooks/useJobs";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import CollapseHeader from "../../../core/common/collapse-header/collapse-header";

import AddJob from "./add_job";
import EditJob from "./edit_job";
import DeleteJob from "./delete_job";
import { message } from "antd";


const JobGrid = () => {
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
    console.log("JobGrid component mounted");
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
    console.log("[JobGrid] Applying filters...");
    console.log("[JobGrid] Current filters:", {
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
                    Job Grid
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
              <div className="me-2 mb-2">
                <div className="d-flex align-items-center border bg-white rounded p-1 me-2 icon-list">
                  <Link
                    to={all_routes.joblist}
                    className="btn btn-icon btn-sm"
                  >
                    <i className="ti ti-list-tree" />
                  </Link>
                  <Link
                    to={all_routes.jobgrid}
                    className="btn btn-icon btn-sm active bg-primary text-white me-1"
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

          {/* Job Grid */}
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-0">
              <h4 className="mb-3">Job Grid</h4>
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
                            : "Low Salary"
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

            <div className="card-body">
              {/* Filter Summary */}
              {!loading && !error && (
                <div className="d-flex align-items-center justify-content-between mb-4 p-3 bg-light rounded">
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
              )}

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
                <div className="row">
                  {filteredJobs.map((job) => (
                    <div key={job._id} className="col-xxl-4 col-xl-6 col-md-6">
                      <div className="card border-0 shadow-sm h-100">
                        <div className="card-body">
                          {/* Header with Actions */}
                          <div className="d-flex justify-content-between align-items-start mb-3">
                            <span className={getStatusBadgeClass(job.status)}>
                              {job.status}
                            </span>
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
                                      handleEditJob(job);
                                    }}
                                    data-bs-toggle="modal"
                                    data-bs-target="#edit_job"
                                  >
                                    <i className="ti ti-edit me-2"></i>Edit
                                  </button>
                                </li>
                                <li>
                                  <button
                                    className="dropdown-item text-danger"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleDeleteJob(job);
                                    }}
                                    data-bs-toggle="modal"
                                    data-bs-target="#delete_job"
                                  >
                                    <i className="ti ti-trash me-2"></i>Delete
                                  </button>
                                </li>
                              </ul>
                            </div>
                          </div>

                          {/* Job Header */}
                          <div className="d-flex align-items-center mb-3">
                            <div className="avatar avatar-lg bg-primary-transparent rounded me-3">
                              <i className={`${getCategoryIcon(job.category)} fs-24`}></i>
                            </div>
                            <div>
                              <h5 className="mb-1">{job.title}</h5>
                              <p className="text-muted fs-13 mb-0">{job.category}</p>
                            </div>
                          </div>

                          {/* Job Details */}
                          <div className="mb-3">
                            <div className="d-flex align-items-center mb-2">
                              <i className="ti ti-users me-2 text-muted"></i>
                              <span className="fs-13 text-muted">
                                {job.appliedCount || 0} Applicants
                              </span>
                            </div>
                            
                            <div className="d-flex align-items-center mb-2">
                              <i className="ti ti-map-pin me-2 text-muted"></i>
                              <span className="fs-13 text-muted">
                                {job.location?.city && job.location?.state && job.location?.country 
                                  ? `${job.location.city}, ${job.location.state}, ${job.location.country}`
                                  : "Location not specified"}
                              </span>
                            </div>

                            {job.salaryRange?.min && job.salaryRange?.max && (
                              <div className="d-flex align-items-center mb-2">
                                <i className="ti ti-currency-dollar me-2 text-muted"></i>
                                <span className="fs-13 text-muted">
                                  {job.salaryRange.min.toLocaleString()} - {job.salaryRange.max.toLocaleString()} {job.salaryRange.currency} / month
                                </span>
                              </div>
                            )}

                            <div className="d-flex align-items-center mb-2">
                              <i className="ti ti-clock me-2 text-muted"></i>
                              <span className="fs-13 text-muted">{job.type}</span>
                            </div>

                            <div className="d-flex align-items-center mb-2">
                              <i className="ti ti-briefcase me-2 text-muted"></i>
                              <span className="fs-13 text-muted">
                                {job.numberOfPositions} position{job.numberOfPositions > 1 ? 's' : ''} available
                              </span>
                            </div>
                          </div>

                          {/* Skills */}
                          {job.skills && job.skills.length > 0 && (
                            <div className="mb-3">
                              <h6 className="fs-13 fw-medium mb-2">Required Skills:</h6>
                              <div className="d-flex flex-wrap gap-1">
                                {job.skills.slice(0, 3).map((skill, index) => (
                                  <span key={index} className="badge bg-light text-dark fs-12">
                                    {skill}
                                  </span>
                                ))}
                                {job.skills.length > 3 && (
                                  <span className="badge bg-light text-muted fs-12">
                                    +{job.skills.length - 3} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Description */}
                          {job.description && (
                            <div className="mb-3">
                              <p className="text-muted fs-13 mb-0">
                                {job.description.length > 100 
                                  ? `${job.description.substring(0, 100)}...`
                                  : job.description}
                              </p>
                            </div>
                          )}

                          {/* Posted Date */}
                          <div className="border-top pt-3">
                            <small className="text-muted">
                              Posted: {new Date(job.createdAt).toLocaleDateString()}
                            </small>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* /Job Grid */}
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

export default JobGrid;