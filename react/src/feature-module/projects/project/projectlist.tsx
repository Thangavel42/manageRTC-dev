import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { all_routes } from "../../router/all_routes";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import Table from "../../../core/common/dataTable/index";
import CollapseHeader from "../../../core/common/collapse-header/collapse-header";
import { useSocket } from "../../../SocketContext";
import { toast } from "react-toastify";
import CommonSelect, { Option } from "../../../core/common/commonSelect";
import ProjectModals from "../../../core/modals/projectModal";
import Footer from "../../../core/common/footer";

interface Project {
  _id: string;
  name: string;
  description?: string;
  status: string;
  priority: string;
  client?: string;
  teamMembers?: string[];
  startDate?: Date;
  endDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ProjectStats {
  total: number;
  active: number;
  completed: number;
  onHold: number;
  overdue: number;
}

const ProjectList = () => {
  const socket = useSocket() as any;

  useEffect(() => {
  }, [socket]);

  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<ProjectStats>({ total: 0, active: 0, completed: 0, onHold: 0, overdue: 0 });
  const [clients, setClients] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: "all",
    priority: "all",
    client: "all",
    search: ""
  });

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "Active", label: "Active" },
    { value: "Completed", label: "Completed" },
    { value: "On Hold", label: "On Hold" },
  ];

  const priorityOptions = [
    { value: "all", label: "All Priority" },
    { value: "High", label: "High" },
    { value: "Medium", label: "Medium" },
    { value: "Low", label: "Low" },
  ];

  const clientOptions = [
    { value: "all", label: "All Clients" },
    ...clients.map(client => ({ value: client, label: client }))
  ];


  const handleSearchChange = useCallback((value: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: value }));
    }, 500);
  }, []);


  const clearFilters = useCallback(() => {
    setFilters({
      status: "all",
      priority: "all",
      client: "all",
      search: ""
    });
  }, []);

  const loadProjects = useCallback((filterParams = {}) => {

    if (!socket) return;

    setLoading(true);
    socket.emit("project:getAllData", filterParams);
  }, [socket]);

  const handleCreateProject = useCallback((projectData: any) => {
    if (!socket) return;

    socket.emit("project:create", projectData);
  }, [socket]);

  const handleUpdateProject = useCallback((projectId: string, updateData: any) => {
    if (!socket) return;

    socket.emit("project:update", { projectId, update: updateData });
  }, [socket]);

  const handleDeleteProject = useCallback((projectId: string) => {
    if (!socket) return;

    socket.emit("project:delete", { projectId });
  }, [socket]);


  useEffect(() => {
    if (!socket) return;

    const handleGetAllDataResponse = (response: any) => {
      setLoading(false);

      if (response.done) {
        setProjects(response.data.projects || []);
        setStats(response.data.stats || { total: 0, active: 0, completed: 0, onHold: 0, overdue: 0 });
        setClients(response.data.clients || []);
        setError(null);
      } else {
        setError(response.error || "Failed to load projects");
        toast.error(response.error || "Failed to load projects");
      }
    };

    const handleCreateResponse = (response: any) => {
      if (response.done) {
        toast.success("Project created successfully");
        loadProjects(filters);
      } else {
        toast.error(response.error || "Failed to create project");
      }
    };

    const handleUpdateResponse = (response: any) => {
      if (response.done) {
        toast.success("Project updated successfully");
        loadProjects(filters);
      } else {
        toast.error(response.error || "Failed to update project");
      }
    };

    const handleDeleteResponse = (response: any) => {
      if (response.done) {
        toast.success("Project deleted successfully");
        loadProjects(filters);
      } else {
        toast.error(response.error || "Failed to delete project");
      }
    };


    socket.on("project:getAllData-response", handleGetAllDataResponse);
    socket.on("admin/project/add-response", handleCreateResponse);
    socket.on("project:update-response", handleUpdateResponse);
    socket.on("project:delete-response", handleDeleteResponse);


    loadProjects(filters);

    return () => {
      socket.off("project:getAllData-response", handleGetAllDataResponse);
      socket.off("admin/project/add-response", handleCreateResponse);
      socket.off("project:update-response", handleUpdateResponse);
      socket.off("project:delete-response", handleDeleteResponse);
    };
  }, [socket, loadProjects, filters]);


  useEffect(() => {
    if (socket) {
      loadProjects(filters);
    }
  }, [filters, socket, loadProjects]);


  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const columns = [
    {
      title: "Project ID",
      dataIndex: "_id",
      render: (text: string, record: Project) => (
        <Link to={`/projects-details/${record._id}`}>
          {record._id.substring(0, 8).toUpperCase()}
        </Link>
      ),
      sorter: (a: Project, b: Project) => a._id.localeCompare(b._id),
    },
    {
      title: "Project Name",
      dataIndex: "name",
      render: (text: string, record: Project) => (
        <h6 className="fw-medium">
          <Link to={`${all_routes.projectdetails}/${record._id}`}>
            {record.name || "Unnamed Project"}
          </Link>
        </h6>
      ),
      sorter: (a: Project, b: Project) => (a.name || "").localeCompare(b.name || ""),
    },
    {
      title: "Client",
      dataIndex: "client",
      render: (text: string, record: Project) => (
        <div className="d-flex align-items-center file-name-icon">
          <div className="avatar avatar-sm border avatar-rounded bg-primary text-white">
            <span className="fs-12 fw-medium">
              {(record.client && record.client.length > 0 ? record.client.charAt(0).toUpperCase() : '?')}
            </span>
          </div>
          <div className="ms-2">
            <h6 className="fw-normal">
              <Link to="#">{record.client || "No Client"}</Link>
            </h6>
          </div>
        </div>
      ),
      sorter: (a: Project, b: Project) => (a.client || "").localeCompare(b.client || ""),
    },
    {
      title: "Team",
      dataIndex: "teamMembers",
      render: (text: string[], record: Project) => (
        <div className="avatar-list-stacked avatar-group-sm">
          {record.teamMembers && record.teamMembers.length > 0 ? (
            record.teamMembers.slice(0, 3).map((member, index) => (
              <span key={index} className="avatar avatar-rounded bg-primary text-white">
                <span className="fs-12 fw-medium">
                  {member && typeof member === 'string' && member.length > 0 ? member.charAt(0).toUpperCase() : '?'}
                </span>
              </span>
            ))
          ) : (
            <span className="avatar avatar-rounded bg-secondary text-white">
              <span className="fs-12 fw-medium">?</span>
            </span>
          )}
          {record.teamMembers && record.teamMembers.length > 3 && (
            <Link
              className="avatar bg-primary avatar-rounded text-fixed-white fs-12 fw-medium"
              to="#"
            >
              +{record.teamMembers.length - 3}
            </Link>
          )}
        </div>
      ),
      sorter: (a: Project, b: Project) => (a.teamMembers?.length || 0) - (b.teamMembers?.length || 0),
    },
    {
      title: "Deadline",
      dataIndex: "endDate",
      render: (text: Date, record: Project) => (
        <span>
          {record.endDate ? new Date(record.endDate).toLocaleDateString() : "No Deadline"}
        </span>
      ),
      sorter: (a: Project, b: Project) => {
        const aDate = a.endDate ? new Date(a.endDate).getTime() : 0;
        const bDate = b.endDate ? new Date(b.endDate).getTime() : 0;
        return aDate - bDate;
      },
    },
    {
      title: "Priority",
      dataIndex: "priority",
      render: (text: string, record: Project) => (
        <span
          className={`badge ${record.priority === "High"
            ? "badge-danger"
            : record.priority === "Low"
              ? "badge-success"
              : "badge-warning"
            } d-inline-flex align-items-center`}
        >
          <i className="ti ti-point-filled me-1" />
          {record.priority || "Medium"}
        </span>
      ),
      sorter: (a: Project, b: Project) => {
        const priorityOrder = { High: 3, Medium: 2, Low: 1 };
        return (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) -
          (priorityOrder[b.priority as keyof typeof priorityOrder] || 2);
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (text: string, record: Project) => (
        <span
          className={`badge ${record.status === "Active"
            ? "badge-success"
            : record.status === "Completed"
              ? "badge-primary"
              : record.status === "On Hold"
                ? "badge-warning"
                : "badge-secondary"
            } d-inline-flex align-items-center badge-xs`}
        >
          <i className="ti ti-point-filled me-1" />
          {record.status || "Unknown"}
        </span>
      ),
      sorter: (a: Project, b: Project) => (a.status || "").localeCompare(b.status || ""),
    },
    {
      title: "",
      dataIndex: "actions",
      render: (text: any, record: Project) => (
        <div className="action-icon d-inline-flex">
          <button
            className="btn btn-icon btn-sm me-2"
            onClick={() => {

              alert(`Edit project: ${record.name}`);
            }}
            title="Edit"
          >
            <i className="ti ti-edit" />
          </button>
          <button
            className="btn btn-icon btn-sm text-danger"
            onClick={() => {
              if (window.confirm(`Are you sure you want to delete "${record.name}"?`)) {
                handleDeleteProject(record._id);
              }
            }}
            title="Delete"
          >
            <i className="ti ti-trash" />
          </button>
        </div>
      ),
    },
  ];
  return (
    <>
      <>
        <div className="page-wrapper">
          <div className="content">
            <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
              <div className="my-auto mb-2">
                <h2 className="mb-1">Projects</h2>
                <nav>
                  <ol className="breadcrumb mb-0">
                    <li className="breadcrumb-item">
                      <Link to={all_routes.adminDashboard}>
                        <i className="ti ti-smart-home" />
                      </Link>
                    </li>
                    <li className="breadcrumb-item">Employee</li>
                    <li className="breadcrumb-item active" aria-current="page">
                      Projects
                    </li>
                  </ol>
                </nav>
              </div>
              <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
                <div className="me-2 mb-2">
                  <div className="d-flex align-items-center border bg-white rounded p-1 me-2 icon-list">
                    <Link
                      to={all_routes.projectlist}
                      className="btn btn-icon btn-sm active bg-primary text-white me-1"
                    >
                      <i className="ti ti-list-tree" />
                    </Link>
                    <Link
                      to={all_routes.project}
                      className="btn btn-icon btn-sm"
                    >
                      <i className="ti ti-layout-grid" />
                    </Link>
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
                    <ul className="dropdown-menu  dropdown-menu-end p-3">
                      <li>
                        <Link to="#" className="dropdown-item rounded-1">
                          <i className="ti ti-file-type-pdf me-1" />
                          Export as PDF
                        </Link>
                      </li>
                      <li>
                        <Link to="#" className="dropdown-item rounded-1">
                          <i className="ti ti-file-type-xls me-1" />
                          Export as Excel{" "}
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
                    data-bs-target="#add_project"
                    className="btn btn-primary d-flex align-items-center"
                  >
                    <i className="ti ti-circle-plus me-2" />
                    Add Project
                  </Link>
                </div>
                <div className="ms-2 head-icons">
                  <CollapseHeader />
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
                <h5>Project List</h5>
                <div className="d-flex my-xl-auto right-content align-items-center flex-wrap row-gap-3">
                  <div className="dropdown me-2">
                    <CommonSelect
                      className="select"
                      options={statusOptions}
                      defaultValue={filters.status}
                      onChange={(option) => setFilters(prev => ({ ...prev, status: option?.value || "all" }))}
                    />
                  </div>
                  <div className="dropdown me-2">
                    <CommonSelect
                      className="select"
                      options={priorityOptions}
                      defaultValue={filters.priority}
                      onChange={(option) => setFilters(prev => ({ ...prev, priority: option?.value || "all" }))}
                    />
                  </div>
                  <div className="dropdown me-2">
                    <CommonSelect
                      className="select"
                      options={clientOptions}
                      defaultValue={filters.client}
                      onChange={(option) => setFilters(prev => ({ ...prev, client: option?.value || "all" }))}
                    />
                  </div>
                  <div className="input-group me-2" style={{ width: '200px' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search projects..."
                      defaultValue={filters.search}
                      onChange={(e) => handleSearchChange(e.target.value)}
                    />
                  </div>
                  {(filters.status !== "all" || filters.priority !== "all" || filters.client !== "all" || filters.search) && (
                    <button
                      className="btn btn-outline-secondary me-2"
                      onClick={clearFilters}
                      title="Clear all filters"
                    >
                      <i className="ti ti-x" />
                    </button>
                  )}
                </div>
              </div>
              <div className="card-body p-0">
                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2 text-muted">Loading projects...</p>
                  </div>
                ) : (
                  <Table dataSource={projects} columns={columns} Selection={true} />
                )}
              </div>
            </div>
          </div>
          
          <Footer />
        </div>
      </>
      <ProjectModals onProjectCreated={() => loadProjects(filters)} />
    </>
  );
};

export default ProjectList;
