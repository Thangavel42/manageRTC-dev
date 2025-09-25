import React, { useState, useEffect, useCallback, useRef } from "react";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import { Link } from "react-router-dom";
import { all_routes } from "../../router/all_routes";
import CommonSelect from "../../../core/common/commonSelect";
import { label } from "yet-another-react-lightbox/*";
import { DatePicker } from "antd";
import CommonTagsInput from "../../../core/common/Taginput";
import CommonTextEditor from "../../../core/common/textEditor";
import CollapseHeader from "../../../core/common/collapse-header/collapse-header";
import { useSocket } from "../../../SocketContext";

const Task = () => {
  const getModalContainer = () => {
    const modalElement = document.getElementById("modal-datepicker");
    return modalElement ? modalElement : document.body;
  };

  const projectChoose = [
    { value: "Select", label: "Select" },
    { value: "Office Management", label: "Office Management" },
    { value: "Clinic Management", label: "Clinic Management" },
    { value: "Educational Platform", label: "Educational Platform" },
  ];
  const statusChoose = [
    { value: "Select", label: "Select" },
    { value: "Inprogress", label: "Inprogress" },
    { value: "Completed", label: "Completed" },
    { value: "Pending", label: "Pending" },
    { value: "Onhold", label: "Onhold" },
  ];
  const priorityChoose = [
    { value: "Select", label: "Select" },
    { value: "Medium", label: "Medium" },
    { value: "High", label: "High" },
    { value: "Low", label: "Low" },
  ];
  const [tags, setTags] = useState<string[]>([
    "Jerald",
    "Andrew",
    "Philip",
    "Davis",
  ]);
  const [tags1, setTags1] = useState<string[]>(["Collab", "Rated"]);
  const socket = useSocket() as any;
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    priority: 'all',
    status: 'all',
    project: 'all',
    search: ''
  });

  const loadTasks = useCallback(() => {
    if (!socket) return;

    setLoading(true);
    setError(null);
    socket.emit("task:getAllData", filters);
  }, [socket, filters]);

  const loadProjects = useCallback(() => {
    if (!socket) return;

    socket.emit("project:getAll", {});
  }, [socket]);

  const handleTaskDataResponse = useCallback((response: any) => {
    setLoading(false);
    if (response.done && response.data) {
      setTasks(response.data.tasks || []);
      setStats(response.data.stats || {});
    } else {
      setError(response.error || "Failed to load tasks");
    }
  }, []);

  const handleProjectResponse = useCallback((response: any) => {
    if (response.done && response.data) {
      setProjects(response.data || []);
    }
  }, []);

  const handlePriorityFilter = useCallback((priority: string) => {
    setFilters(prev => ({ ...prev, priority }));
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on("task:getAllData-response", handleTaskDataResponse);
      socket.on("project:getAll-response", handleProjectResponse);
      loadTasks();
      loadProjects();

      return () => {
        socket.off("task:getAllData-response", handleTaskDataResponse);
        socket.off("project:getAll-response", handleProjectResponse);
      };
    }
  }, [socket, handleTaskDataResponse, handleProjectResponse, loadTasks, loadProjects]);

  useEffect(() => {
    loadTasks();
  }, [filters, loadTasks]);

  return (
    <>
      <div className="page-wrapper">
        <div className="content">
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Tasks</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={all_routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">Employee</li>
                  <li className="breadcrumb-item active">Tasks</li>
                </ol>
              </nav>
            </div>
            <div className="my-xl-auto right-content d-flex">
              <div className="mb-2">
                <Link
                  to="#"
                  data-bs-toggle="modal"
                  data-bs-target="#add_task"
                  className="btn btn-primary d-flex align-items-center"
                >
                  <i className="ti ti-circle-plus me-2" />
                  Add Task
                </Link>
              </div>
              <div className="head-icons ms-2 mb-0">
                <CollapseHeader />
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-xl-4">
              <div>
                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading projects...</span>
                    </div>
                  </div>
                ) : error ? (
                  <div className="text-center py-5">
                    <i className="ti ti-alert-circle fs-1 text-danger mb-3"></i>
                    <h6 className="text-danger">Error loading projects</h6>
                    <p className="text-muted small">{error}</p>
                  </div>
                ) : projects.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="ti ti-folder-x fs-1 text-muted mb-3"></i>
                    <h6 className="text-muted">No projects found</h6>
                    <p className="text-muted small">Create your first project to see tasks</p>
                  </div>
                ) : (
                  projects.slice(0, 5).map((project: any, index: number) => (
                    <div key={project._id} className="card">
                      <div className="card-body">
                        <div className="d-flex align-items-center pb-3 mb-3 border-bottom">
                          <Link
                            to={`${all_routes.projectdetails}/${project._id}`}
                            className="flex-shrink-0 me-2"
                          >
                            <ImageWithBasePath
                              src={`assets/img/social/project-0${(index % 5) + 1}.svg`}
                              alt="Img"
                            />
                          </Link>
                          <div>
                            <h6 className="mb-1">
                              <Link to={`${all_routes.projectdetails}/${project._id}`}>
                                {project.name || 'Untitled Project'}
                              </Link>
                            </h6>
                            <div className="d-flex align-items-center">
                              <span>{project.totalTasks || 0} tasks</span>
                              <span className="mx-1">
                                <i className="ti ti-point-filled text-primary" />
                              </span>
                              <span>{project.completedTasks || 0} Completed</span>
                            </div>
                          </div>
                        </div>
                        <div className="row">
                          <div className="col-sm-4">
                            <div className="mb-3">
                              <span className="mb-1 d-block">Deadline</span>
                              <p className="text-dark">
                                {project.endDate ? new Date(project.endDate).toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                }) : 'No deadline'}
                              </p>
                            </div>
                          </div>
                          <div className="col-sm-4">
                            <div className="mb-3">
                              <span className="mb-1 d-block">Value</span>
                              <p className="text-dark">${project.projectValue || '0'}</p>
                            </div>
                          </div>
                          <div className="col-sm-4">
                            <div className="mb-3">
                              <span className="mb-1 d-block">Project Lead</span>
                              <h6 className="fw-normal d-flex align-items-center">
                                <ImageWithBasePath
                                  className="avatar avatar-xs rounded-circle me-1"
                                  src={`assets/img/profiles/avatar-0${(index % 10) + 1}.jpg`}
                                  alt="Img"
                                />
                                {project.projectManager?.[0] || project.teamLead?.[0] || 'Unassigned'}
                              </h6>
                            </div>
                          </div>
                        </div>
                        <div className="bg-light p-2">
                          <div className="row align-items-center">
                            <div className="col-6">
                              <span className="fw-medium d-flex align-items-center">
                                <i className="ti ti-clock text-primary me-2" />
                                Total {project.totalHours || project.hoursOfWork || '0'} Hrs
                              </span>
                            </div>
                            <div className="col-6">
                              <div>
                                <div className="d-flex align-items-center justify-content-between mb-1">
                                  <small className="text-dark">
                                    {project.totalTasks > 0
                                      ? Math.round((project.completedTasks || 0) / project.totalTasks * 100)
                                      : 0}% Completed
                                  </small>
                                </div>
                                <div className="progress progress-xs">
                                  <div
                                    className="progress-bar"
                                    role="progressbar"
                                    style={{
                                      width: `${project.totalTasks > 0
                                        ? Math.round((project.completedTasks || 0) / project.totalTasks * 100)
                                        : 0}%`,
                                      backgroundColor: project.totalTasks > 0 && (project.completedTasks || 0) / project.totalTasks > 0.8
                                        ? '#28a745' // green for >80%
                                        : project.totalTasks > 0 && (project.completedTasks || 0) / project.totalTasks > 0.5
                                          ? '#17a2b8' // blue for >50%
                                          : '#dc3545' // red for <50%
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="col-xl-8">
              <div className="row">
                <div className="col-lg-5">
                  <div className="d-flex align-items-center flex-wrap row-gap-3 mb-3">
                    <h6 className="me-2">Priority</h6>
                    <ul
                      className="nav nav-pills border d-inline-flex p-1 rounded bg-light todo-tabs"
                      id="pills-tab"
                      role="tablist"
                    >
                      <li className="nav-item" role="presentation">
                        <button
                          className={`nav-link btn btn-sm btn-icon py-3 d-flex align-items-center justify-content-center w-auto ${filters.priority === 'all' ? 'active' : ''}`}
                          onClick={() => handlePriorityFilter('all')}
                          type="button"
                          role="tab"
                        >
                          All
                        </button>
                      </li>
                      <li className="nav-item" role="presentation">
                        <button
                          className={`nav-link btn btn-sm btn-icon py-3 d-flex align-items-center justify-content-center w-auto ${filters.priority === 'High' ? 'active' : ''}`}
                          onClick={() => handlePriorityFilter('High')}
                          type="button"
                          role="tab"
                        >
                          High
                        </button>
                      </li>
                      <li className="nav-item" role="presentation">
                        <button
                          className={`nav-link btn btn-sm btn-icon py-3 d-flex align-items-center justify-content-center w-auto ${filters.priority === 'Medium' ? 'active' : ''}`}
                          onClick={() => handlePriorityFilter('Medium')}
                          type="button"
                          role="tab"
                        >
                          Medium
                        </button>
                      </li>
                      <li className="nav-item" role="presentation">
                        <button
                          className={`nav-link btn btn-sm btn-icon py-3 d-flex align-items-center justify-content-center w-auto ${filters.priority === 'Low' ? 'active' : ''}`}
                          onClick={() => handlePriorityFilter('Low')}
                          type="button"
                          role="tab"
                        >
                          Low
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="col-lg-7">
                  <div className="d-flex align-items-center justify-content-lg-end flex-wrap row-gap-3 mb-3">
                    <div className="input-icon w-120 position-relative me-2">
                      <span className="input-icon-addon">
                        <i className="ti ti-calendar" />
                      </span>
                      <DatePicker
                        className="form-control datetimepicker"
                        format={{
                          format: "DD-MM-YYYY",
                          type: "mask",
                        }}
                        getPopupContainer={getModalContainer}
                        placeholder="Due Date"
                      />
                    </div>
                    <div className="dropdown me-2">
                      <Link
                        to="#"
                        className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                        data-bs-toggle="dropdown"
                      >
                        All Tags
                      </Link>
                      <ul className="dropdown-menu  dropdown-menu-end p-3">
                        <li>
                          <Link to="#" className="dropdown-item rounded-1">
                            All Tags
                          </Link>
                        </li>
                        <li>
                          <Link to="#" className="dropdown-item rounded-1">
                            Internal
                          </Link>
                        </li>
                        <li>
                          <Link to="#" className="dropdown-item rounded-1">
                            Projects
                          </Link>
                        </li>
                        <li>
                          <Link to="#" className="dropdown-item rounded-1">
                            Meetings
                          </Link>
                        </li>
                        <li>
                          <Link to="#" className="dropdown-item rounded-1">
                            Reminder
                          </Link>
                        </li>
                        <li>
                          <Link to="#" className="dropdown-item rounded-1">
                            Research
                          </Link>
                        </li>
                      </ul>
                    </div>
                    <div className="d-flex align-items-center">
                      <span className="d-inline-flex me-2">Sort By : </span>
                      <div className="dropdown">
                        <Link
                          to="#"
                          className="dropdown-toggle btn btn-white d-inline-flex align-items-center border-0 bg-transparent p-0 text-dark"
                          data-bs-toggle="dropdown"
                        >
                          Created Date
                        </Link>
                        <ul className="dropdown-menu  dropdown-menu-end p-3">
                          <li>
                            <Link to="#" className="dropdown-item rounded-1">
                              Created Date
                            </Link>
                          </li>
                          <li>
                            <Link to="#" className="dropdown-item rounded-1">
                              Priority
                            </Link>
                          </li>
                          <li>
                            <Link to="#" className="dropdown-item rounded-1">
                              Due Date
                            </Link>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Dynamic Task List */}
              <div className="list-group list-group-flush mb-4">
                {tasks.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="ti ti-clipboard-x fs-1 text-muted mb-3"></i>
                    <h6 className="text-muted">No tasks found</h6>
                    <p className="text-muted small">Tasks will appear here once created</p>
                  </div>
                ) : (
                  tasks.map((task: any) => (
                    <div key={task._id} className="list-group-item list-item-hover shadow-sm rounded mb-2 p-3">
                      <div className="row align-items-center row-gap-3">
                        <div className="col-lg-6 col-md-7">
                          <div className="todo-inbox-check d-flex align-items-center flex-wrap row-gap-3">
                            <span className="me-2 d-flex align-items-center">
                              <i className="ti ti-grid-dots text-dark" />
                            </span>
                            <div className="form-check form-check-md me-2">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                checked={task.status === 'Completed'}
                                readOnly
                              />
                            </div>
                            <span className="me-2 d-flex align-items-center rating-select">
                              <i className={`ti ti-star${task.priority === 'High' ? '-filled filled' : ''}`} />
                            </span>
                            <div className="strike-info">
                              <h4 className="fs-14 text-truncate">
                                <Link to={`${all_routes.tasksdetails.replace(':taskId', task._id)}`}>
                                  {task.title}
                                </Link>
                              </h4>
                            </div>
                            {task.dueDate && (
                              <span className="badge bg-transparent-dark text-dark rounded-pill ms-2">
                                <i className="ti ti-calendar me-1" />
                                {new Date(task.dueDate).toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="col-lg-6 col-md-5">
                          <div className="d-flex align-items-center justify-content-md-end flex-wrap row-gap-3">
                            {task.tags && task.tags.length > 0 && (
                              <span className="badge badge-skyblue me-3">
                                {task.tags[0]}
                              </span>
                            )}
                            <span className={`badge d-inline-flex align-items-center me-3 ${
                              task.status === 'Completed' ? 'badge-soft-success' :
                              task.status === 'Inprogress' ? 'badge-soft-purple' :
                              task.status === 'Pending' ? 'badge-soft-warning' :
                              task.status === 'Onhold' ? 'badge-soft-pink' :
                              'badge-soft-secondary'
                            }`}>
                              <i className="fas fa-circle fs-6 me-1" />
                              {task.status || 'Pending'}
                            </span>
                            <div className="d-flex align-items-center">
                              <div className="avatar-list-stacked avatar-group-sm">
                                {task.assignee && task.assignee.slice(0, 3).map((assignee: string, idx: number) => (
                                  <span key={idx} className="avatar avatar-rounded">
                                    <ImageWithBasePath
                                      className="border border-white"
                                      src={`assets/img/profiles/avatar-${(idx % 10) + 1}.jpg`}
                                      alt="img"
                                    />
                                  </span>
                                ))}
                              </div>
                              <div className="dropdown ms-2">
                                <Link
                                  to="#"
                                  className="d-inline-flex align-items-center"
                                  data-bs-toggle="dropdown"
                                >
                                  <i className="ti ti-dots-vertical" />
                                </Link>
                                <ul className="dropdown-menu dropdown-menu-end p-3">
                                  <li>
                                    <Link
                                      to={`${all_routes.tasksdetails.replace(':taskId', task._id)}`}
                                      className="dropdown-item rounded-1"
                                    >
                                      <i className="ti ti-eye me-2" />
                                      View
                                    </Link>
                                  </li>
                                  <li>
                                    <Link
                                      to="#"
                                      className="dropdown-item rounded-1"
                                      data-bs-toggle="modal"
                                      data-bs-target="#edit_task"
                                    >
                                      <i className="ti ti-edit me-2" />
                                      Edit
                                    </Link>
                                  </li>
                                  <li>
                                    <Link
                                      to="#"
                                      className="dropdown-item rounded-1"
                                      data-bs-toggle="modal"
                                      data-bs-target="#delete_modal"
                                    >
                                      <i className="ti ti-trash me-2" />
                                      Delete
                                    </Link>
                                  </li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="text-center mb-4">
                <Link to="#" className="btn btn-primary">
                  <i className="ti ti-loader me-1" />
                  Load More
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div className="footer d-sm-flex align-items-center justify-content-between border-top bg-white p-3">
          <p className="mb-0">2014 - 2025 © Amasqis.</p>
          <p>
            Designed &amp; Developed By{" "}
            <Link to="https://amasqis.ai" className="text-primary">
              Amasqis
            </Link>
          </p>
        </div>
      </div>
      {/* /Page Wrapper */}
      {/* Add Task */}
      <div className="modal fade" id="add_task">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Add New Task</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form>
              <div className="modal-body">
                <div className="row">
                  <div className="col-12">
                    <div className="mb-3">
                      <label className="form-label">Title</label>
                      <input type="text" className="form-control" />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Due Date</label>
                      <div className="input-icon-end position-relative">
                        <DatePicker
                          className="form-control datetimepicker"
                          format={{
                            format: "DD-MM-YYYY",
                            type: "mask",
                          }}
                          getPopupContainer={getModalContainer}
                          placeholder="DD-MM-YYYY"
                        />
                        <span className="input-icon-addon">
                          <i className="ti ti-calendar text-gray-7" />
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Project</label>
                      <CommonSelect
                        className="select"
                        options={projectChoose}
                        defaultValue={projectChoose[1]}
                      />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label me-2">Team Members</label>
                      <CommonTagsInput
                        value={tags}
                        onChange={setTags}
                        placeholder="Add new"
                        className="custom-input-class" // Optional custom class
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Tag</label>
                      <CommonTagsInput
                        value={tags1}
                        onChange={setTags1}
                        placeholder="Add new"
                        className="custom-input-class" // Optional custom class
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Status</label>
                      <CommonSelect
                        className="select"
                        options={statusChoose}
                        defaultValue={statusChoose[1]}
                      />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Priority</label>
                      <CommonSelect
                        className="select"
                        options={priorityChoose}
                        defaultValue={priorityChoose[1]}
                      />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <label className="form-label">Who Can See this Task?</label>
                    <div className="d-flex align-items-center mb-3">
                      <div className="form-check me-3">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="flexRadioDefault"
                          id="flexRadioDefault1"
                        />
                        <label
                          className="form-check-label text-dark"
                          htmlFor="flexRadioDefault1"
                        >
                          Public
                        </label>
                      </div>
                      <div className="form-check me-3">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="flexRadioDefault"
                          id="flexRadioDefault2"
                          defaultChecked
                        />
                        <label
                          className="form-check-label text-dark"
                          htmlFor="flexRadioDefault2"
                        >
                          Private
                        </label>
                      </div>
                      <div className="form-check ">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="flexRadioDefault"
                          id="flexRadioDefault3"
                          defaultChecked
                        />
                        <label
                          className="form-check-label text-dark"
                          htmlFor="flexRadioDefault3"
                        >
                          Admin Only
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="col-lg-12">
                    <div className="mb-3">
                      <label className="form-label">Descriptions</label>
                      <CommonTextEditor />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <label className="form-label">Upload Attachment</label>
                    <div className="bg-light rounded p-2">
                      <div className="profile-uploader border-bottom mb-2 pb-2">
                        <div className="drag-upload-btn btn btn-sm btn-white border px-3">
                          Select File
                          <input
                            type="file"
                            className="form-control image-sign"
                            multiple
                          />
                        </div>
                      </div>
                      <div className="d-flex align-items-center justify-content-between border-bottom mb-2 pb-2">
                        <div className="d-flex align-items-center">
                          <h6 className="fs-12 fw-medium me-1">Logo.zip</h6>
                          <span className="badge badge-soft-info">21MB </span>
                        </div>
                        <Link to="#" className="btn btn-sm btn-icon">
                          <i className="ti ti-trash" />
                        </Link>
                      </div>
                      <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center">
                          <h6 className="fs-12 fw-medium me-1">Files.zip</h6>
                          <span className="badge badge-soft-info">25MB </span>
                        </div>
                        <Link to="#" className="btn btn-sm btn-icon">
                          <i className="ti ti-trash" />
                        </Link>
                      </div>
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
                  type="button"
                  data-bs-dismiss="modal"
                  className="btn btn-primary"
                >
                  Add New Task
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Add Task */}
      {/* Edit Task */}
      <div className="modal fade" id="edit_task">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Edit Task</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form>
              <div className="modal-body">
                <div className="row">
                  <div className="col-12">
                    <div className="mb-3">
                      <label className="form-label">Title</label>
                      <input type="text" className="form-control" />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Due Date</label>
                      <div className="input-icon-end position-relative">
                        <DatePicker
                          className="form-control datetimepicker"
                          format={{
                            format: "DD-MM-YYYY",
                            type: "mask",
                          }}
                          getPopupContainer={getModalContainer}
                          placeholder="DD-MM-YYYY"
                        />
                        <span className="input-icon-addon">
                          <i className="ti ti-calendar text-gray-7" />
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Project</label>
                      <CommonSelect
                        className="select"
                        options={projectChoose}
                        defaultValue={projectChoose[1]}
                      />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label me-2">Team Members</label>
                      <CommonTagsInput
                        value={tags}
                        onChange={setTags}
                        placeholder="Add new"
                        className="custom-input-class" // Optional custom class
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Tag</label>
                      <CommonTagsInput
                        value={tags1}
                        onChange={setTags1}
                        placeholder="Add new"
                        className="custom-input-class" // Optional custom class
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Status</label>
                      <CommonSelect
                        className="select"
                        options={statusChoose}
                        defaultValue={statusChoose[1]}
                      />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Priority</label>
                      <CommonSelect
                        className="select"
                        options={priorityChoose}
                        defaultValue={priorityChoose[1]}
                      />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <label className="form-label">Who Can See this Task?</label>
                    <div className="d-flex align-items-center mb-3">
                      <div className="form-check me-3">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="flexRadioDefault"
                          id="flexRadioDefault1"
                        />
                        <label
                          className="form-check-label text-dark"
                          htmlFor="flexRadioDefault1"
                        >
                          Public
                        </label>
                      </div>
                      <div className="form-check me-3">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="flexRadioDefault"
                          id="flexRadioDefault2"
                          defaultChecked
                        />
                        <label
                          className="form-check-label text-dark"
                          htmlFor="flexRadioDefault2"
                        >
                          Private
                        </label>
                      </div>
                      <div className="form-check ">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="flexRadioDefault"
                          id="flexRadioDefault3"
                          defaultChecked
                        />
                        <label
                          className="form-check-label text-dark"
                          htmlFor="flexRadioDefault3"
                        >
                          Admin Only
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="col-lg-12">
                    <div className="mb-3">
                      <label className="form-label">Descriptions</label>
                      <div className="summernote" />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <label className="form-label">Upload Attachment</label>
                    <div className="bg-light rounded p-2">
                      <div className="profile-uploader border-bottom mb-2 pb-2">
                        <div className="drag-upload-btn btn btn-sm btn-white border px-3">
                          Select File
                          <input
                            type="file"
                            className="form-control image-sign"
                            multiple
                          />
                        </div>
                      </div>
                      <div className="d-flex align-items-center justify-content-between border-bottom mb-2 pb-2">
                        <div className="d-flex align-items-center">
                          <h6 className="fs-12 fw-medium me-1">Logo.zip</h6>
                          <span className="badge badge-soft-info">21MB </span>
                        </div>
                        <Link to="#" className="btn btn-sm btn-icon">
                          <i className="ti ti-trash" />
                        </Link>
                      </div>
                      <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center">
                          <h6 className="fs-12 fw-medium me-1">Files.zip</h6>
                          <span className="badge badge-soft-info">25MB </span>
                        </div>
                        <Link to="#" className="btn btn-sm btn-icon">
                          <i className="ti ti-trash" />
                        </Link>
                      </div>
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
                  type="button"
                  data-bs-dismiss="modal"
                  className="btn btn-primary"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Edit Task */}
      {/* Todo Details */}
      <div className="modal fade" id="view_todo">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header bg-dark">
              <h4 className="modal-title text-white">
                Respond to any pending messages
              </h4>
              <span className="badge badge-danger d-inline-flex align-items-center">
                <i className="ti ti-square me-1" />
                Urgent
              </span>
              <span>
                <i className="ti ti-star-filled text-warning" />
              </span>
              <Link to="#">
                <i className="ti ti-trash text-white" />
              </Link>
              <button
                type="button"
                className="btn-close custom-btn-close bg-transparent fs-16 text-white position-static"
                data-bs-dismiss="modal"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="modal-body">
              <h5 className="mb-2">Task Details</h5>
              <div className="border rounded mb-3 p-2">
                <div className="row row-gap-3">
                  <div className="col-md-4">
                    <div className="text-center">
                      <span className="d-block mb-1">Created On</span>
                      <p className="text-dark">22 July 2025</p>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="text-center">
                      <span className="d-block mb-1">Due Date</span>
                      <p className="text-dark">22 July 2025</p>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="text-center">
                      <span className="d-block mb-1">Status</span>
                      <span className="badge badge-soft-success d-inline-flex align-items-center">
                        <i className="fas fa-circle fs-6 me-1" />
                        Completed
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mb-3">
                <h5 className="mb-2">Description</h5>
                <p>
                  Hiking is a long, vigorous walk, usually on trails or
                  footpaths in the countryside. Walking for pleasure developed
                  in Europe during the eighteenth century. Religious pilgrimages
                  have existed much longer but they involve walking long
                  distances for a spiritual purpose associated with specific
                  religions and also we achieve inner peace while we hike at a
                  local park.
                </p>
              </div>
              <div className="mb-3">
                <h5 className="mb-2">Tags</h5>
                <div className="d-flex align-items-center">
                  <span className="badge badge-danger me-2">Internal</span>
                  <span className="badge badge-success me-2">Projects</span>
                  <span className="badge badge-secondary">Reminder</span>
                </div>
              </div>
              <div>
                <h5 className="mb-2">Assignee</h5>
                <div className="avatar-list-stacked avatar-group-sm">
                  <span className="avatar avatar-rounded">
                    <ImageWithBasePath
                      className="border border-white"
                      src="assets/img/profiles/avatar-23.jpg"
                      alt="img"
                    />
                  </span>
                  <span className="avatar avatar-rounded">
                    <ImageWithBasePath
                      className="border border-white"
                      src="assets/img/profiles/avatar-24.jpg"
                      alt="img"
                    />
                  </span>
                  <span className="avatar avatar-rounded">
                    <ImageWithBasePath
                      className="border border-white"
                      src="assets/img/profiles/avatar-25.jpg"
                      alt="img"
                    />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* /Todo Details */}
    </>
  );
};

export default Task;
