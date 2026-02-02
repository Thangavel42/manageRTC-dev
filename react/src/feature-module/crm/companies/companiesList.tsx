import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import { all_routes } from "../../router/all_routes";
import { useCompanies } from "../../../hooks/useCompanies";
import CollapseHeader from "../../../core/common/collapse-header/collapse-header";
import Table from "../../../core/common/dataTable/index";
import CrmsModal from "../../../core/modals/crms_modal";
import { useAuth } from "@clerk/clerk-react";
import Footer from "../../../core/common/footer";

const CompaniesList = () => {
  const routes = all_routes;
  const { companies, fetchCompanies, loading, error } = useCompanies();
  const { getToken } = useAuth();
  const backendurl = process.env.REACT_APP_BACKEND_URL;

  // View Mode State
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // Shared state
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [statusFilter, setStatusFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Filtered and sorted data
  const data = useMemo(() => {
    let filteredCompanies = companies;

    // Apply search filter
    if (searchTerm) {
      filteredCompanies = filteredCompanies.filter(
        (c: any) =>
          c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.phone?.includes(searchTerm)
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filteredCompanies = filteredCompanies.filter(
        (c: any) => c.status === statusFilter
      );
    }

    // Apply company filter (for specific company selection)
    if (companyFilter !== "all") {
      filteredCompanies = filteredCompanies.filter(
        (c: any) => c._id === companyFilter
      );
    }

    // Apply sorting
    filteredCompanies = [...filteredCompanies].sort((a: any, b: any) => {
      let aValue = a[sortBy] || "";
      let bValue = b[sortBy] || "";

      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filteredCompanies.map((c: any) => ({
      key: c._id,
      Company_Name: c.name,
      Email: c.email || "",
      Phone: c.phone || "",
      Location: c.address?.city || c.address?.country || c.location || "",
      Rating: c.rating || 0,
      Owner: c.ownerName || "",
      Image: c.image || "company-01.svg",
      Status: c.status || "Active",
      _id: c._id,
      createdAt: c.createdAt,
      industry: c.industry,
      source: c.source,
      // Keep original object for grid view
      originalCompany: c,
    }));
  }, [companies, searchTerm, statusFilter, companyFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchCompanies({ limit: 100 });
  }, [fetchCompanies]);

  useEffect(() => {
    const onChanged = () => fetchCompanies({ limit: 100 });
    window.addEventListener("companies:changed", onChanged as any);
    return () =>
      window.removeEventListener("companies:changed", onChanged as any);
  }, [fetchCompanies]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const handleExport = async (format: "pdf" | "excel") => {
    try {
      const token = await getToken();
      const response = await fetch(
        `${backendurl}/api/companies/export?format=${format}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `companies.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error("Export failed");
        alert("Export failed. Please try again.");
      }
    } catch (error) {
      console.error("Export error:", error);
      alert("Export failed. Please try again.");
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (!window.confirm("Are you sure you want to delete this company?")) {
      return;
    }

    try {
      const token = await getToken();
      const response = await fetch(`${backendurl}/api/companies/${companyId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        window.dispatchEvent(new CustomEvent("companies:changed"));
        alert("Company deleted successfully!");
      } else {
        alert("Failed to delete company. Please try again.");
      }
    } catch (err) {
      console.error("delete company", err);
      alert("Error deleting company. Please try again.");
    }
  };

  // Table columns for list view
  const columns = [
    {
      title: (
        <div className="d-flex align-items-center">
          Company Name
          <button
            className="btn btn-sm btn-link p-0 ms-1"
            onClick={() => handleSort("name")}
          >
            <i
              className={`ti ti-arrow-up ${
                sortBy === "name" && sortOrder === "asc" ? "text-primary" : ""
              }`}
            ></i>
            <i
              className={`ti ti-arrow-down ${
                sortBy === "name" && sortOrder === "desc" ? "text-primary" : ""
              }`}
            ></i>
          </button>
        </div>
      ),
      dataIndex: "Company_Name",
      render: (text: string, record: any) => (
        <div className="d-flex align-items-center file-name-icon">
          <Link
            to={routes.companiesDetails.replace(":companyId", record._id)}
            className="avatar avatar-md border rounded-circle"
          >
            <ImageWithBasePath
              src={`assets/img/company/${record.Image}`}
              className="img-fluid"
              alt="img"
            />
          </Link>
          <div className="ms-2">
            <h6 className="fw-medium">
              <Link
                to={routes.companiesDetails.replace(":companyId", record._id)}
              >
                {text}
              </Link>
            </h6>
          </div>
        </div>
      ),
    },
    {
      title: (
        <div className="d-flex align-items-center">
          Email
          <button
            className="btn btn-sm btn-link p-0 ms-1"
            onClick={() => handleSort("email")}
          >
            <i
              className={`ti ti-arrow-up ${
                sortBy === "email" && sortOrder === "asc" ? "text-primary" : ""
              }`}
            ></i>
            <i
              className={`ti ti-arrow-down ${
                sortBy === "email" && sortOrder === "desc" ? "text-primary" : ""
              }`}
            ></i>
          </button>
        </div>
      ),
      dataIndex: "Email",
    },
    {
      title: (
        <div className="d-flex align-items-center">
          Phone
          <button
            className="btn btn-sm btn-link p-0 ms-1"
            onClick={() => handleSort("phone")}
          >
            <i
              className={`ti ti-arrow-up ${
                sortBy === "phone" && sortOrder === "asc" ? "text-primary" : ""
              }`}
            ></i>
            <i
              className={`ti ti-arrow-down ${
                sortBy === "phone" && sortOrder === "desc" ? "text-primary" : ""
              }`}
            ></i>
          </button>
        </div>
      ),
      dataIndex: "Phone",
    },
    {
      title: (
        <div className="d-flex align-items-center">
          Location
          <button
            className="btn btn-sm btn-link p-0 ms-1"
            onClick={() => handleSort("location")}
          >
            <i
              className={`ti ti-arrow-up ${
                sortBy === "location" && sortOrder === "asc"
                  ? "text-primary"
                  : ""
              }`}
            ></i>
            <i
              className={`ti ti-arrow-down ${
                sortBy === "location" && sortOrder === "desc"
                  ? "text-primary"
                  : ""
              }`}
            ></i>
          </button>
        </div>
      ),
      dataIndex: "Location",
    },
    {
      title: (
        <div className="d-flex align-items-center">
          Rating
          <button
            className="btn btn-sm btn-link p-0 ms-1"
            onClick={() => handleSort("rating")}
          >
            <i
              className={`ti ti-arrow-up ${
                sortBy === "rating" && sortOrder === "asc" ? "text-primary" : ""
              }`}
            ></i>
            <i
              className={`ti ti-arrow-down ${
                sortBy === "rating" && sortOrder === "desc"
                  ? "text-primary"
                  : ""
              }`}
            ></i>
          </button>
        </div>
      ),
      dataIndex: "Rating",
      render: (text: string) => (
        <span className="d-flex align-items-center">
          <i className="ti ti-star-filled text-warning me-2"></i>
          {text}
        </span>
      ),
    },
    {
      title: (
        <div className="d-flex align-items-center">
          Owner
          <button
            className="btn btn-sm btn-link p-0 ms-1"
            onClick={() => handleSort("ownerName")}
          >
            <i
              className={`ti ti-arrow-up ${
                sortBy === "ownerName" && sortOrder === "asc"
                  ? "text-primary"
                  : ""
              }`}
            ></i>
            <i
              className={`ti ti-arrow-down ${
                sortBy === "ownerName" && sortOrder === "desc"
                  ? "text-primary"
                  : ""
              }`}
            ></i>
          </button>
        </div>
      ),
      dataIndex: "Owner",
    },
    {
      title: "Contact",
      dataIndex: "",
      render: () => (
        <ul className="contact-icon d-flex align-items-center ">
          <li>
            <Link
              to="#"
              className="p-1 rounded-circle contact-icon-mail d-flex align-items-center justify-content-center"
            >
              <span className="d-flex align-items-center justify-content-center">
                <i className="ti ti-mail text-gray-5"></i>
              </span>
            </Link>
          </li>
          <li>
            <Link
              to="#"
              className="p-1 rounded-circle contact-icon-call d-flex align-items-center justify-content-center"
            >
              <span className="d-flex align-items-center justify-content-center">
                <i className="ti ti-phone-call text-gray-5"></i>
              </span>
            </Link>
          </li>
          <li>
            <Link
              to="#"
              className="p-1 rounded-circle contact-icon-msg d-flex align-items-center justify-content-center"
            >
              <span className="d-flex align-items-center justify-content-center">
                <i className="ti ti-message-2 text-gray-5"></i>
              </span>
            </Link>
          </li>
          <li>
            <Link
              to="#"
              className="p-1 rounded-circle contact-icon-skype d-flex align-items-center justify-content-center"
            >
              <span className="d-flex align-items-center justify-content-center">
                <i className="ti ti-brand-skype text-gray-5"></i>
              </span>
            </Link>
          </li>
          <li>
            <Link
              to="#"
              className="p-1 rounded-circle contact-icon-facebook d-flex align-items-center justify-content-center"
            >
              <span className="d-flex align-items-center justify-content-center">
                <i className="ti ti-brand-facebook text-gray-5"></i>
              </span>
            </Link>
          </li>
        </ul>
      ),
    },
    {
      title: "Status",
      dataIndex: "Status",
      render: (text: string) => (
        <span
          className={`badge d-inline-flex align-items-center badge-xs ${
            text === "Active" ? "badge-success" : "badge-danger"
          }`}
        >
          <i className="ti ti-point-filled me-1"></i>
          {text}
        </span>
      ),
    },
    {
      title: "Actions",
      dataIndex: "actions",
      render: (_: any, record: any) => (
        <div className="action-icon d-inline-flex">
          <Link
            to={routes.companiesDetails.replace(":companyId", record._id)}
            className="me-2"
            title="View Details"
          >
            <i className="ti ti-eye" />
          </Link>
          <Link
            to="#"
            onClick={() => handleDeleteCompany(record._id)}
            title="Delete Company"
          >
            <i className="ti ti-trash" />
          </Link>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Companies</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">CRM</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    {viewMode === "list" ? "Companies List" : "Companies Grid"}
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
              <div className="me-2 mb-2">
                <div className="d-flex align-items-center border bg-white rounded p-1 me-2 icon-list">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`btn btn-icon btn-sm ${
                      viewMode === "list" ? "active bg-primary text-white" : ""
                    } me-1`}
                  >
                    <i className="ti ti-list-tree" />
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`btn btn-icon btn-sm ${
                      viewMode === "grid" ? "active bg-primary text-white" : ""
                    }`}
                  >
                    <i className="ti ti-layout-grid" />
                  </button>
                </div>
              </div>
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
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={() => handleExport("pdf")}
                      >
                        <i className="ti ti-file-type-pdf me-1" />
                        Export as PDF
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={() => handleExport("excel")}
                      >
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
                  data-bs-target="#add_company"
                  className="btn btn-primary d-flex align-items-center"
                >
                  <i className="ti ti-circle-plus me-2" />
                  Add Company
                </Link>
              </div>
              <div className="ms-2 head-icons">
                <CollapseHeader />
              </div>
            </div>
          </div>
          {/* /Breadcrumb */}

          {/* LIST VIEW */}
          {viewMode === "list" && (
            <div className="card">
              <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
                <h5>Companies List ({data.length} companies)</h5>
                <div className="d-flex my-xl-auto right-content align-items-center flex-wrap row-gap-3">
                  {/* Search Input */}
                  <div className="me-3">
                    <div className="input-icon-end position-relative">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search companies..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <span className="input-icon-addon">
                        <i className="ti ti-search" />
                      </span>
                    </div>
                  </div>

                  {/* Company Filter */}
                  <div className="dropdown me-3">
                    <Link
                      to="#"
                      className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                      data-bs-toggle="dropdown"
                    >
                      {companyFilter === "all"
                        ? "All Companies"
                        : companies.find((c: any) => c._id === companyFilter)
                            ?.name || "Select Company"}
                    </Link>
                    <ul className="dropdown-menu dropdown-menu-end p-3">
                      <li>
                        <Link
                          to="#"
                          className="dropdown-item rounded-1"
                          onClick={() => setCompanyFilter("all")}
                        >
                          All Companies
                        </Link>
                      </li>
                      {companies.map((company: any) => (
                        <li key={company._id}>
                          <Link
                            to="#"
                            className="dropdown-item rounded-1"
                            onClick={() => setCompanyFilter(company._id)}
                          >
                            {company.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Status Filter */}
                  <div className="dropdown me-3">
                    <Link
                      to="#"
                      className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                      data-bs-toggle="dropdown"
                    >
                      {statusFilter === "all" ? "All Status" : statusFilter}
                    </Link>
                    <ul className="dropdown-menu dropdown-menu-end p-3">
                      <li>
                        <Link
                          to="#"
                          className="dropdown-item rounded-1"
                          onClick={() => setStatusFilter("all")}
                        >
                          All Status
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="#"
                          className="dropdown-item rounded-1"
                          onClick={() => setStatusFilter("Active")}
                        >
                          Active
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="#"
                          className="dropdown-item rounded-1"
                          onClick={() => setStatusFilter("Inactive")}
                        >
                          Inactive
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="card-body p-0">
                {loading ? (
                  <div className="d-flex justify-content-center align-items-center p-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <span className="ms-2">Loading companies...</span>
                  </div>
                ) : error ? (
                  <div className="d-flex justify-content-center align-items-center p-5">
                    <div className="text-center">
                      <i className="ti ti-alert-circle fs-48 text-danger mb-3"></i>
                      <h5>Error Loading Companies</h5>
                      <p className="text-muted">{error}</p>
                      <button
                        className="btn btn-primary"
                        onClick={() => fetchCompanies({ limit: 100 })}
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                ) : data.length === 0 ? (
                  <div className="d-flex justify-content-center align-items-center p-5">
                    <div className="text-center">
                      <i className="ti ti-building fs-48 text-muted mb-3"></i>
                      <h5>No Companies Found</h5>
                      <p className="text-muted">
                        {searchTerm ||
                        statusFilter !== "all" ||
                        companyFilter !== "all"
                          ? "No companies match your current filters."
                          : "Get started by adding your first company."}
                      </p>
                      {searchTerm ||
                      statusFilter !== "all" ||
                      companyFilter !== "all" ? (
                        <button
                          className="btn btn-outline-primary"
                          onClick={() => {
                            setSearchTerm("");
                            setStatusFilter("all");
                            setCompanyFilter("all");
                          }}
                        >
                          Clear Filters
                        </button>
                      ) : (
                        <Link
                          to="#"
                          data-bs-toggle="modal"
                          data-bs-target="#add_company"
                          className="btn btn-primary"
                        >
                          <i className="ti ti-circle-plus me-2" />
                          Add Company
                        </Link>
                      )}
                    </div>
                  </div>
                ) : (
                  <Table dataSource={data} columns={columns} Selection={true} />
                )}
              </div>
            </div>
          )}

          {/* GRID VIEW */}
          {viewMode === "grid" && (
            <>
              {/* Search/Filter/Sort Controls */}
              <div className="d-flex flex-wrap gap-2 mb-3">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search companies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ maxWidth: 200 }}
                />
                <select
                  className="form-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ maxWidth: 150 }}
                >
                  <option value="all">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <select
                  className="form-select"
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                  style={{ maxWidth: 200 }}
                >
                  <option value="all">All Companies</option>
                  {companies.map((c: any) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => handleSort("name")}
                >
                  Sort by Name{" "}
                  {sortBy === "name" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
                </button>
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => handleSort("rating")}
                >
                  Sort by Rating{" "}
                  {sortBy === "rating" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
                </button>
              </div>

              {/* Grid */}
              <div className="row">
                {loading ? (
                  <div className="d-flex justify-content-center align-items-center p-5 w-100">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <span className="ms-2">Loading companies...</span>
                  </div>
                ) : error ? (
                  <div className="alert alert-danger w-100">{error}</div>
                ) : data.length === 0 ? (
                  <div className="text-center p-5 w-100">
                    <i className="ti ti-building fs-48 text-muted mb-3"></i>
                    <h5>No Companies Found</h5>
                    <p className="text-muted">
                      {searchTerm ||
                      statusFilter !== "all" ||
                      companyFilter !== "all"
                        ? "Try adjusting your filters or add a new company."
                        : "Get started by adding your first company."}
                    </p>
                    {searchTerm ||
                    statusFilter !== "all" ||
                    companyFilter !== "all" ? (
                      <button
                        className="btn btn-outline-primary"
                        onClick={() => {
                          setSearchTerm("");
                          setStatusFilter("all");
                          setCompanyFilter("all");
                        }}
                      >
                        Clear Filters
                      </button>
                    ) : (
                      <Link
                        to="#"
                        data-bs-toggle="modal"
                        data-bs-target="#add_company"
                        className="btn btn-primary"
                      >
                        <i className="ti ti-circle-plus me-2" />
                        Add Company
                      </Link>
                    )}
                  </div>
                ) : (
                  data.map((record: any) => {
                    const c = record.originalCompany;
                    return (
                      <div className="col-xl-3 col-lg-4 col-md-6" key={c._id}>
                        <div className="card">
                          <div className="card-body">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <div className="form-check form-check-md">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                />
                              </div>
                              <div>
                                <Link
                                  to={routes.companiesDetails.replace(
                                    ":companyId",
                                    c._id
                                  )}
                                  className="avatar avatar-xl avatar-rounded online border rounded-circle"
                                >
                                  <ImageWithBasePath
                                    src={`assets/img/company/${
                                      c.image || "company-01.svg"
                                    }`}
                                    className="img-fluid h-auto w-auto"
                                    alt="img"
                                  />
                                </Link>
                              </div>
                              <div className="dropdown">
                                <button
                                  className="btn btn-icon btn-sm rounded-circle"
                                  type="button"
                                  data-bs-toggle="dropdown"
                                  aria-expanded="false"
                                >
                                  <i className="ti ti-dots-vertical" />
                                </button>
                                <ul className="dropdown-menu dropdown-menu-end p-3">
                                  <li>
                                    <Link
                                      className="dropdown-item rounded-1"
                                      to="#"
                                      onClick={() => handleDeleteCompany(c._id)}
                                    >
                                      <i className="ti ti-trash me-1" />
                                      Delete
                                    </Link>
                                  </li>
                                </ul>
                              </div>
                            </div>
                            <div className="text-center mb-3">
                              <h6 className="mb-1">
                                <Link
                                  to={routes.companiesDetails.replace(
                                    ":companyId",
                                    c._id
                                  )}
                                >
                                  {c.name}
                                </Link>
                              </h6>
                            </div>
                            <div className="d-flex flex-column">
                              <p className="text-dark d-inline-flex align-items-center mb-2">
                                <i className="ti ti-mail-forward text-gray-5 me-2" />
                                {c.email || "-"}
                              </p>
                              <p className="text-dark d-inline-flex align-items-center mb-2">
                                <i className="ti ti-phone text-gray-5 me-2" />
                                {c.phone || "-"}
                              </p>
                              <p className="text-dark d-inline-flex align-items-center">
                                <i className="ti ti-map-pin text-gray-5 me-2" />
                                {c.address?.city ||
                                  (typeof c.location === "object" &&
                                  c.location !== null
                                    ? `${c.location.city || ""}${
                                        c.location.state
                                          ? ", " + c.location.state
                                          : ""
                                      }${
                                        c.location.country
                                          ? ", " + c.location.country
                                          : ""
                                      }`.replace(/^,\s*/, "") || "-"
                                    : c.location) ||
                                  "-"}
                              </p>
                            </div>
                            <div className="d-flex align-items-center justify-content-between border-top pt-3 mt-3">
                              <span className="d-inline-flex align-items-center">
                                <i className="ti ti-star-filled text-warning me-1" />
                                {c.rating ?? 0}
                              </span>
                              <span
                                className={`badge badge-xs ${
                                  c.status === "Active"
                                    ? "badge-success"
                                    : "badge-danger"
                                }`}
                              >
                                {c.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {data.length > 0 && (
                <div className="text-center mb-4">
                  <Link to="#" className="btn btn-white border">
                    <i className="ti ti-loader-3 text-primary me-2" />
                    Load More
                  </Link>
                </div>
              )}
            </>
          )}
        </div>

        <Footer />
      </div>
      <CrmsModal />
    </>
  );
};

export default CompaniesList;
