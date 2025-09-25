import React, { useEffect, useRef, useState, useCallback } from "react";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import { Link } from "react-router-dom";
import CommonSelect from "../../../core/common/commonSelect";
import { DatePicker } from "antd";
import CommonTagsInput from "../../../core/common/Taginput";
import CommonTextEditor from "../../../core/common/textEditor";
import dragula, { Drake } from "dragula";
import "dragula/dist/dragula.css";
import CollapseHeader from "../../../core/common/collapse-header/collapse-header";
import { useSocket } from "../../../SocketContext";
import { toast } from "react-toastify";

interface Task {
  _id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  projectId?: string;
  assignee?: string[];
  tags?: string[];
  progress?: number;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface TaskStats {
  total: number;
  pending: number;
  inprogress: number;
  completed: number;
  onhold: number;
}

interface KanbanTasks {
  todo: Task[];
  inprogress: Task[];
  completed: Task[];
  onhold: Task[];
}


const TaskCard: React.FC<{ task: Task; onStatusUpdate: (taskId: string, newStatus: string) => void }> = ({ task, onStatusUpdate }) => {
  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'badge-danger';
      case 'medium': return 'badge-warning';
      case 'low': return 'badge-success';
      default: return 'badge-secondary';
    }
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'No due date';
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="card kanban-card mb-2" data-task-id={task._id}>
      <div className="card-body">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div className="d-flex align-items-center">
            <span className={`badge bg-outline-dark me-2`}>
              {task.tags?.[0] || 'Task'}
            </span>
            <span className={`badge ${getPriorityColor(task.priority)} badge-xs d-flex align-items-center justify-content-center`}>
              <i className="fas fa-circle fs-6 me-1" />
              {task.priority}
            </span>
          </div>
          <div className="dropdown">
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
        <div className="mb-2">
          <h6 className="d-flex align-items-center">
            {task.title}
          </h6>
        </div>
        {task.progress !== undefined && (
          <div className="d-flex align-items-center mb-2">
            <div
              className="progress progress-sm flex-fill"
              role="progressbar"
              aria-valuenow={task.progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="progress-bar bg-warning"
                style={{ width: `${task.progress}%` }}
              />
            </div>
            <span className="d-block ms-2 text-gray-9 fw-medium">
              {task.progress}%
            </span>
          </div>
        )}
        <p className="fw-medium mb-0">
          Due on :{" "}
          <span className="text-gray-9">
            {formatDate(task.dueDate)}
          </span>
        </p>
        <div className="d-flex align-items-center justify-content-between border-top pt-2 mt-2">
          <div className="avatar-list-stacked avatar-group-sm me-3">
            {task.assignee && task.assignee.length > 0 ? (
              task.assignee.slice(0, 3).map((assignee, index) => (
                <span key={index} className="avatar avatar-rounded">
                  <ImageWithBasePath
                    className="border border-white"
                    src="assets/img/profiles/avatar-19.jpg"
                    alt="img"
                  />
                </span>
              ))
            ) : (
              <span className="avatar avatar-rounded bg-secondary text-white">
                <span className="fs-12 fw-medium">?</span>
              </span>
            )}
            {task.assignee && task.assignee.length > 3 && (
              <span className="avatar bg-primary avatar-rounded text-fixed-white fs-12 fw-medium">
                +{task.assignee.length - 3}
              </span>
            )}
          </div>
          <div className="d-flex align-items-center">
            <Link
              to="#"
              className="d-flex align-items-center text-dark me-2"
            >
              <i className="ti ti-message-circle text-gray me-1" />
              {task.tags?.length || 0}
            </Link>
            <Link
              to="#"
              className="d-flex align-items-center text-dark"
            >
              <i className="ti ti-paperclip text-gray me-1" />
              {task.tags?.length || 0}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};


const KanbanColumn = React.forwardRef<HTMLDivElement, {
  title: string;
  count: number;
  tasks: Task[];
  status: string;
  colorClass: string;
  bgColorClass: string;
  onTaskDrop: (taskId: string, newStatus: string) => void;
}>(({ title, count, tasks, status, colorClass, bgColorClass, onTaskDrop }, ref) => {
  return (
    <div className="p-3 rounded bg-transparent-secondary w-100 me-3">
      <div className="bg-white p-2 rounded mb-2">
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center">
            <span className={`${bgColorClass} p-1 d-flex rounded-circle me-2`}>
              <span className={`${colorClass} rounded-circle d-block p-1`} />
            </span>
            <h5 className="me-2">{title}</h5>
            <span className="badge bg-light rounded-pill">
              {count}
            </span>
          </div>
          <div className="dropdown">
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
                  to="#"
                  className="dropdown-item rounded-1"
                  data-bs-toggle="modal"
                  data-bs-target="#add_task"
                >
                  <i className="ti ti-plus me-2" />
                  Add Task
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="kanban-drag-wrap" ref={ref}>
        {tasks.length === 0 ? (
          <div className="text-center py-4 text-muted">
            <i className="ti ti-clipboard-off fs-2 mb-2"></i>
            <p>No tasks</p>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              onStatusUpdate={onTaskDrop}
            />
          ))
        )}
      </div>
    </div>
  );
});

const TaskBoard = () => {
  const socket = useSocket();


  const [kanbanTasks, setKanbanTasks] = useState<KanbanTasks>({
    todo: [],
    inprogress: [],
    completed: [],
    onhold: []
  });
  const [taskStats, setTaskStats] = useState<TaskStats>({
    total: 0,
    pending: 0,
    inprogress: 0,
    completed: 0,
    onhold: 0
  });
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  const [filters, setFilters] = useState({
    priority: "all",
    project: "all",
    search: "",
    status: "all",
    createdDate: null as Date | null,
    dueDate: null as Date | null
  });

  const getModalContainer = () => {
    const modalElement = document.getElementById("modal-datepicker");
    return modalElement ? modalElement : document.body;
  };

  const projectChoose = [
    { value: "all", label: "All Projects" },
    ...projects.map(project => ({ value: project._id, label: project.name }))
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


  const todoColumnRef = useRef<HTMLDivElement>(null);
  const inProgressColumnRef = useRef<HTMLDivElement>(null);
  const completedColumnRef = useRef<HTMLDivElement>(null);
  const onHoldColumnRef = useRef<HTMLDivElement>(null);


  const loadKanbanData = useCallback((filterParams = {}) => {
    if (!socket) return;

    setLoading(true);
    socket.emit("task:getKanbanData", {
      projectId: filters.project !== "all" ? filters.project : null,
      filters: filterParams
    });
  }, [socket, filters.project]);

  const loadProjects = useCallback(() => {
    if (!socket) return;

    socket.emit("project:getAllData", {});
  }, [socket]);

  const loadTaskStats = useCallback(() => {
    if (!socket) return;

    const projectId = filters.project !== "all" ? filters.project : null;
    socket.emit("task:getStats", projectId);
  }, [socket, filters.project]);

  const updateTaskStatus = useCallback((taskId: string, newStatus: string) => {
    if (!socket) return;

    socket.emit("task:updateStatus", { taskId, newStatus });
  }, [socket]);

  const handlePriorityFilter = useCallback((priority: string) => {
    setFilters(prev => ({ ...prev, priority }));
  }, []);

  const handleProjectFilter = useCallback((projectId: string) => {
    setFilters(prev => ({ ...prev, project: projectId }));
  }, []);

  const handleCreatedDateFilter = useCallback((date: Date | null) => {
    setFilters(prev => ({ ...prev, createdDate: date }));
  }, []);

  const handleDueDateFilter = useCallback((date: Date | null) => {
    setFilters(prev => ({ ...prev, dueDate: date }));
  }, []);

  const handleStatusFilter = useCallback((status: string) => {
    setFilters(prev => ({ ...prev, status: status.toLowerCase() }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({
      priority: "all",
      project: "all",
      search: "",
      status: "all",
      createdDate: null,
      dueDate: null
    });
    setSearchInput("");
  }, []);

  // Search state for debouncing
  const [searchInput, setSearchInput] = useState("");

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchInput }));
    }, 300); // 300ms delay

    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  // Search input handler
  const handleSearchInputChange = useCallback((value: string) => {
    setSearchInput(value);
  }, []);


  useEffect(() => {
    const containers = [
      todoColumnRef.current,
      inProgressColumnRef.current,
      completedColumnRef.current,
      onHoldColumnRef.current,
    ].filter((container) => container !== null);

    if (containers.length === 0) return;

    const drake: Drake = dragula(containers, {
      moves: (el, source, handle, sibling) => {

        return el.classList.contains('kanban-card');
      },
      accepts: (el, target, source, sibling) => {

        return target !== source && target?.classList.contains('kanban-drag-wrap');
      },
    });


    drake.on('drop', (el, target, source, sibling) => {
      if (!el || !target) return;


      const taskId = el.getAttribute('data-task-id');
      if (!taskId) return;


      let newStatus = '';
      if (target === todoColumnRef.current) {
        newStatus = 'Pending';
      } else if (target === inProgressColumnRef.current) {
        newStatus = 'Inprogress';
      } else if (target === completedColumnRef.current) {
        newStatus = 'Completed';
      } else if (target === onHoldColumnRef.current) {
        newStatus = 'Onhold';
      }

      if (newStatus) {
        updateTaskStatus(taskId, newStatus);
      }
    });

    return () => {
      drake.destroy();
    };
  }, [updateTaskStatus, kanbanTasks]);


  useEffect(() => {
    if (!socket) return;


    loadProjects();
    loadKanbanData(filters);


    const handleKanbanDataResponse = (response: any) => {
      setLoading(false);
      if (response.done) {
        setKanbanTasks(response.data);
        setError(null);
      } else {
        setError(response.error || "Failed to load tasks");
        toast.error(response.error || "Failed to load tasks");
      }
    };

    const handleProjectsResponse = (response: any) => {
      if (response.done) {
        setProjects(response.data.projects || []);
      }
    };

    const handleTaskStatsResponse = (response: any) => {
      if (response.done) {
        setTaskStats(response.data || {
          total: 0,
          pending: 0,
          inprogress: 0,
          completed: 0,
          onhold: 0
        });
      }
    };

    const handleTaskStatusUpdateResponse = (response: any) => {
      if (response.done) {
        toast.success("Task status updated successfully");
        loadKanbanData(filters);
        loadTaskStats();
      } else {
        toast.error(response.error || "Failed to update task status");
      }
    };

    const handleTaskStatusUpdated = (data: any) => {

      loadKanbanData(filters);
      loadTaskStats();
    };


    socket.on("task:getKanbanData-response", handleKanbanDataResponse);
    socket.on("project:getAllData-response", handleProjectsResponse);
    socket.on("task:getStats-response", handleTaskStatsResponse);
    socket.on("task:updateStatus-response", handleTaskStatusUpdateResponse);
    socket.on("task:status-updated", handleTaskStatusUpdated);

    return () => {
      socket.off("task:getKanbanData-response", handleKanbanDataResponse);
      socket.off("project:getAllData-response", handleProjectsResponse);
      socket.off("task:getStats-response", handleTaskStatsResponse);
      socket.off("task:updateStatus-response", handleTaskStatusUpdateResponse);
      socket.off("task:status-updated", handleTaskStatusUpdated);
    };
  }, [socket, loadKanbanData, loadProjects, loadTaskStats, filters]);


  useEffect(() => {
    if (socket) {
      loadProjects();
      loadTaskStats();
      loadKanbanData(filters);
    }
  }, [socket, loadProjects, loadTaskStats, loadKanbanData, filters]);


  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }


  if (error) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="alert alert-danger" role="alert">
            <i className="ti ti-alert-circle me-2"></i>
            {error}
            <button
              type="button"
              className="btn btn-sm btn-outline-danger ms-2"
              onClick={() => {
                setError(null);
                loadKanbanData(filters);
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>

      <div className="page-wrapper">
        <div className="content">
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Task Board</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to="index.html">
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">Projects</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Task Board
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
              <div className="dropdown me-2">
                <Link
                  to="#"
                  className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                  data-bs-toggle="dropdown"
                >
                  <i className="ti ti-file-export me-2" /> Export
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
              <Link
                to="#"
                className="btn btn-primary d-inline-flex align-items-center"
                data-bs-toggle="modal"
                data-inert={true}
                data-bs-target="#add_board"
              >
                <i className="ti ti-circle-plus me-1" />
                Add Board
              </Link>
              <div className="head-icons ms-2 mb-0">
                <CollapseHeader />
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
              <h4>
                {filters.project === "all"
                  ? "All Projects"
                  : projects.find(p => p._id === filters.project)?.name || "All Projects"}
              </h4>
              <div className="d-flex align-items-center flex-wrap row-gap-3">
                <div className="avatar-list-stacked avatar-group-sm me-3">
                  <span className="avatar avatar-rounded">
                    <ImageWithBasePath
                      className="border border-white"
                      src="assets/img/profiles/avatar-19.jpg"
                      alt="img"
                    />
                  </span>
                  <span className="avatar avatar-rounded">
                    <ImageWithBasePath
                      className="border border-white"
                      src="assets/img/profiles/avatar-29.jpg"
                      alt="img"
                    />
                  </span>
                  <span className="avatar avatar-rounded">
                    <ImageWithBasePath
                      className="border border-white"
                      src="assets/img/profiles/avatar-16.jpg"
                      alt="img"
                    />
                  </span>
                  <span className="avatar avatar-rounded bg-primary fs-12">
                    1+
                  </span>
                </div>
                <div className="d-flex align-items-center me-3">
                  <p className="mb-0 me-3 pe-3 border-end fs-14">
                    Total Task : <span className="text-dark"> {taskStats.total} </span>
                  </p>
                  <p className="mb-0 me-3 pe-3 border-end fs-14">
                    Pending : <span className="text-dark"> {taskStats.pending} </span>
                  </p>
                  <p className="mb-0 fs-14">
                    Completed : <span className="text-dark"> {taskStats.completed} </span>
                  </p>
                </div>
                <div className="input-icon-start position-relative">
                  <span className="input-icon-addon">
                    <i className={`ti ${searchInput !== filters.search ? 'ti-loader animate-spin' : 'ti-search'}`} />
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search tasks"
                    value={searchInput}
                    onChange={(e) => handleSearchInputChange(e.target.value)}
                  />
                  {searchInput && (
                    <span
                      className="input-icon-addon input-icon-end"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleSearchInputChange("")}
                    >
                      <i className="ti ti-x" />
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-lg-4">
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
                <div className="col-lg-8">
                  <div className="d-flex align-items-center justify-content-lg-end flex-wrap row-gap-3 mb-3">
                    <div className="dropdown me-2">
                      <button
                        className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                        data-bs-toggle="dropdown"
                        type="button"
                      >
                        {filters.project === "all"
                          ? "All Projects"
                          : projects.find(p => p._id === filters.project)?.name || "All Projects"}
                      </button>
                      <ul className="dropdown-menu dropdown-menu-end p-3">
                        <li>
                          <button
                            className="dropdown-item rounded-1"
                            onClick={() => handleProjectFilter("all")}
                          >
                            All Projects
                          </button>
                        </li>
                        {projects.map(project => (
                          <li key={project._id}>
                            <button
                              className="dropdown-item rounded-1"
                              onClick={() => handleProjectFilter(project._id)}
                            >
                              {project.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
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
                        placeholder="Created Date"
                        value={filters.createdDate}
                        onChange={handleCreatedDateFilter}
                      />
                    </div>
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
                        value={filters.dueDate}
                        onChange={handleDueDateFilter}
                      />
                    </div>
                    <div className="dropdown me-2">
                      <button
                        className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                        data-bs-toggle="dropdown"
                        type="button"
                      >
                        {filters.status === "all"
                          ? "All Status"
                          : filters.status.charAt(0).toUpperCase() + filters.status.slice(1)}
                      </button>
                      <ul className="dropdown-menu dropdown-menu-end p-3">
                        <li>
                          <button
                            className="dropdown-item rounded-1"
                            onClick={() => handleStatusFilter("all")}
                          >
                            All Status
                          </button>
                        </li>
                        <li>
                          <button
                            className="dropdown-item rounded-1"
                            onClick={() => handleStatusFilter("pending")}
                          >
                            Pending
                          </button>
                        </li>
                        <li>
                          <button
                            className="dropdown-item rounded-1"
                            onClick={() => handleStatusFilter("inprogress")}
                          >
                            In Progress
                          </button>
                        </li>
                        <li>
                          <button
                            className="dropdown-item rounded-1"
                            onClick={() => handleStatusFilter("completed")}
                          >
                            Completed
                          </button>
                        </li>
                        <li>
                          <button
                            className="dropdown-item rounded-1"
                            onClick={() => handleStatusFilter("onhold")}
                          >
                            On Hold
                          </button>
                        </li>
                      </ul>
                    </div>
                    <div className="d-flex align-items-center border rounded p-2">
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
                              High
                            </Link>
                          </li>
                          <li>
                            <Link to="#" className="dropdown-item rounded-1">
                              Medium
                            </Link>
                          </li>
                        </ul>
                      </div>
                    </div>
                    <button
                      className="btn btn-outline-secondary ms-2"
                      onClick={clearAllFilters}
                      type="button"
                    >
                      <i className="ti ti-x me-1" />
                      Clear Filters
                    </button>
                  </div>
                </div>
              </div>
              <div className="tab-content" id="pills-tabContent">
                <div
                  className="tab-pane fade show active"
                  id="pills-home"
                  role="tabpanel"
                >
                  <div className="d-flex align-items-start overflow-auto project-status pb-4">
                    <KanbanColumn
                      ref={todoColumnRef}
                      title="To Do"
                      count={kanbanTasks.todo.length}
                      tasks={kanbanTasks.todo}
                      status="todo"
                      colorClass="bg-purple"
                      bgColorClass="bg-transparent-purple"
                      onTaskDrop={updateTaskStatus}
                    />
                    <KanbanColumn
                      ref={inProgressColumnRef}
                      title="In Progress"
                      count={kanbanTasks.inprogress.length}
                      tasks={kanbanTasks.inprogress}
                      status="inprogress"
                      colorClass="bg-skyblue"
                      bgColorClass="bg-soft-skyblue"
                      onTaskDrop={updateTaskStatus}
                    />
                    <KanbanColumn
                      ref={completedColumnRef}
                      title="Completed"
                      count={kanbanTasks.completed.length}
                      tasks={kanbanTasks.completed}
                      status="completed"
                      colorClass="bg-success"
                      bgColorClass="bg-soft-success"
                      onTaskDrop={updateTaskStatus}
                    />
                    <KanbanColumn
                      ref={onHoldColumnRef}
                      title="On Hold"
                      count={kanbanTasks.onhold.length}
                      tasks={kanbanTasks.onhold}
                      status="onhold"
                      colorClass="bg-warning"
                      bgColorClass="bg-soft-warning"
                      onTaskDrop={updateTaskStatus}
                    />
                  </div>
                </div>
                <div
                  className="tab-pane fade"
                  id="pills-contact"
                  role="tabpanel"
                >
                  <div className="d-flex align-items-start overflow-auto project-status pb-4">
                    <KanbanColumn
                      title="To Do"
                      count={kanbanTasks.todo.filter(task => task.priority === 'High').length}
                      tasks={kanbanTasks.todo.filter(task => task.priority === 'High')}
                      status="todo"
                      colorClass="bg-purple"
                      bgColorClass="bg-transparent-purple"
                      onTaskDrop={updateTaskStatus}
                    />
                    <KanbanColumn
                      title="In Progress"
                      count={kanbanTasks.inprogress.filter(task => task.priority === 'High').length}
                      tasks={kanbanTasks.inprogress.filter(task => task.priority === 'High')}
                      status="inprogress"
                      colorClass="bg-skyblue"
                      bgColorClass="bg-soft-skyblue"
                      onTaskDrop={updateTaskStatus}
                    />
                    <KanbanColumn
                      title="Completed"
                      count={kanbanTasks.completed.filter(task => task.priority === 'High').length}
                      tasks={kanbanTasks.completed.filter(task => task.priority === 'High')}
                      status="completed"
                      colorClass="bg-success"
                      bgColorClass="bg-soft-success"
                      onTaskDrop={updateTaskStatus}
                    />
                    <KanbanColumn
                      title="On Hold"
                      count={kanbanTasks.onhold.filter(task => task.priority === 'High').length}
                      tasks={kanbanTasks.onhold.filter(task => task.priority === 'High')}
                      status="onhold"
                      colorClass="bg-warning"
                      bgColorClass="bg-soft-warning"
                      onTaskDrop={updateTaskStatus}
                    />
                  </div>
                </div>
                <div
                  className="tab-pane fade"
                  id="pills-medium"
                  role="tabpanel"
                >
                  <div className="d-flex align-items-start overflow-auto project-status pb-4">
                    <KanbanColumn
                      title="To Do"
                      count={kanbanTasks.todo.filter(task => task.priority === 'Medium').length}
                      tasks={kanbanTasks.todo.filter(task => task.priority === 'Medium')}
                      status="todo"
                      colorClass="bg-purple"
                      bgColorClass="bg-transparent-purple"
                      onTaskDrop={updateTaskStatus}
                    />
                    <KanbanColumn
                      title="In Progress"
                      count={kanbanTasks.inprogress.filter(task => task.priority === 'Medium').length}
                      tasks={kanbanTasks.inprogress.filter(task => task.priority === 'Medium')}
                      status="inprogress"
                      colorClass="bg-skyblue"
                      bgColorClass="bg-soft-skyblue"
                      onTaskDrop={updateTaskStatus}
                    />
                    <KanbanColumn
                      title="Completed"
                      count={kanbanTasks.completed.filter(task => task.priority === 'Medium').length}
                      tasks={kanbanTasks.completed.filter(task => task.priority === 'Medium')}
                      status="completed"
                      colorClass="bg-success"
                      bgColorClass="bg-soft-success"
                      onTaskDrop={updateTaskStatus}
                    />
                    <KanbanColumn
                      title="On Hold"
                      count={kanbanTasks.onhold.filter(task => task.priority === 'Medium').length}
                      tasks={kanbanTasks.onhold.filter(task => task.priority === 'Medium')}
                      status="onhold"
                      colorClass="bg-warning"
                      bgColorClass="bg-soft-warning"
                      onTaskDrop={updateTaskStatus}
                    />
                  </div>
                </div>
                <div
                  className="tab-pane fade"
                  id="pills-low"
                  role="tabpanel"
                >
                  <div className="d-flex align-items-start overflow-auto project-status pb-4">
                    <KanbanColumn
                      title="To Do"
                      count={kanbanTasks.todo.filter(task => task.priority === 'Low').length}
                      tasks={kanbanTasks.todo.filter(task => task.priority === 'Low')}
                      status="todo"
                      colorClass="bg-purple"
                      bgColorClass="bg-transparent-purple"
                      onTaskDrop={updateTaskStatus}
                    />
                    <KanbanColumn
                      title="In Progress"
                      count={kanbanTasks.inprogress.filter(task => task.priority === 'Low').length}
                      tasks={kanbanTasks.inprogress.filter(task => task.priority === 'Low')}
                      status="inprogress"
                      colorClass="bg-skyblue"
                      bgColorClass="bg-soft-skyblue"
                      onTaskDrop={updateTaskStatus}
                    />
                    <KanbanColumn
                      title="Completed"
                      count={kanbanTasks.completed.filter(task => task.priority === 'Low').length}
                      tasks={kanbanTasks.completed.filter(task => task.priority === 'Low')}
                      status="completed"
                      colorClass="bg-success"
                      bgColorClass="bg-soft-success"
                      onTaskDrop={updateTaskStatus}
                    />
                    <KanbanColumn
                      title="On Hold"
                      count={kanbanTasks.onhold.filter(task => task.priority === 'Low').length}
                      tasks={kanbanTasks.onhold.filter(task => task.priority === 'Low')}
                      status="onhold"
                      colorClass="bg-warning"
                      bgColorClass="bg-soft-warning"
                      onTaskDrop={updateTaskStatus}
                    />
                  </div>
                </div>
                <div className="modal fade" id="add_board" role="dialog">
                  <div className="modal-dialog modal-dialog-centered modal-lg">
                    <div className="modal-content">
                      <div className="modal-header">
                        <h4 className="modal-title">Add New Board</h4>
                        <button
                          type="button"
                          className="btn-close"
                          data-bs-dismiss="modal"
                        >
                          <i className="ti ti-x" />
                        </button>
                      </div>
                      <div className="modal-body">
                        <form>
                          <div className="row">
                            <div className="col-md-12">
                              <div className="mb-3">
                                <label className="form-label">
                                  Board Name <span className="text-danger">*</span>
                                </label>
                                <input type="text" className="form-control" />
                              </div>
                            </div>
                            <div className="col-md-6">
                              <div className="mb-3">
                                <label className="form-label">Client</label>
                                <CommonSelect
                                  className="select"
                                  options={projectChoose}
                                  defaultValue=""
                                />
                              </div>
                            </div>
                            <div className="col-md-6">
                              <div className="mb-3">
                                <label className="form-label">Priority</label>
                                <CommonSelect
                                  className="select"
                                  options={priorityChoose}
                                  defaultValue=""
                                />
                              </div>
                            </div>
                            <div className="col-md-6">
                              <div className="mb-3">
                                <label className="form-label">Start Date</label>
                                <div className="input-icon w-100 position-relative">
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
                                    placeholder="DD-MM-YYYY"
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="col-md-6">
                              <div className="mb-3">
                                <label className="form-label">End Date</label>
                                <div className="input-icon w-100 position-relative">
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
                                    placeholder="DD-MM-YYYY"
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="col-md-6">
                              <div className="mb-3">
                                <label className="form-label">Assignee</label>
                                <CommonTagsInput value={tags} onChange={setTags} />
                              </div>
                            </div>
                            <div className="col-md-6">
                              <div className="mb-3">
                                <label className="form-label">Tags</label>
                                <CommonTagsInput value={tags1} onChange={setTags1} />
                              </div>
                            </div>
                            <div className="col-md-12">
                              <div className="mb-3">
                                <label className="form-label">Description</label>
                                <CommonTextEditor />
                              </div>
                            </div>
                          </div>
                          <div className="text-end">
                            <button
                              type="button"
                              className="btn btn-light me-3"
                              data-bs-dismiss="modal"
                            >
                              Cancel
                            </button>
                            <button type="submit" className="btn btn-primary">
                              Add New Board
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TaskBoard;
