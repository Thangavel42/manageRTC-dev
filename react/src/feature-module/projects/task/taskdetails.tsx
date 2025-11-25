import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
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
import Footer from "../../../core/common/footer";

const TaskDetails = () => {
  const { taskId } = useParams();
  const socket = useSocket() as any;

  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTask = useCallback(() => {
    if (!taskId || !socket) return;

    setLoading(true);
    setError(null);
    socket.emit("task:getById", taskId);
  }, [taskId, socket]);

  const handleTaskResponse = useCallback((response: any) => {
    setLoading(false);
    if (response.done && response.data) {
      setTask(response.data);
    } else {
      setError(response.error || "Failed to load task details");
    }
  }, [taskId, socket]);

  useEffect(() => {
    if (socket) {
      socket.on("task:getById-response", handleTaskResponse);
      loadTask();

      return () => {
        socket.off("task:getById-response", handleTaskResponse);
      };
    }
  }, [socket, handleTaskResponse, loadTask]);

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

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading task details...</span>
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
          <div className="text-center py-5">
            <i className="ti ti-alert-circle fs-1 text-danger mb-3"></i>
            <h5 className="text-danger">Error Loading Task</h5>
            <p className="text-muted mb-3">{error}</p>
            <button
              className="btn btn-primary"
              onClick={loadTask}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="text-center py-5">
            <i className="ti ti-file-x fs-1 text-muted mb-3"></i>
            <h5 className="mb-2">Task Not Found</h5>
            <p className="text-muted mb-3">The task you're looking for doesn't exist or has been deleted.</p>
            <Link to={all_routes.tasks} className="btn btn-primary">
              Back to Tasks
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-wrapper">
        <div className="content">
          <div className="row align-items-center mb-4">
            <div className="d-md-flex d-sm-block justify-content-between align-items-center flex-wrap">
              <h6 className="fw-medium d-inline-flex align-items-center mb-3 mb-sm-0">
                <Link to={all_routes.tasks}>
                  <i className="ti ti-arrow-left me-2" />
                  Back to List
                </Link>
              </h6>
              <div className="d-flex">
                <div className="text-end">
                  <Link
                    to="#"
                    className="btn btn-primary"
                    data-bs-toggle="modal"
                    data-bs-target="#edit_task"
                  >
                    <i className="ti ti-edit me-1" />
                    Edit Task
                  </Link>
                </div>
                <div className="head-icons ms-2 text-end">
                  <CollapseHeader />
                </div>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-xl-8">
              <div className="card">
                <div className="card-body pb-1">
                  <div className="d-flex align-items-center justify-content-between flex-wrap row-gap-3 mb-4">
                    <div>
                      <h4 className="mb-1">
                        {task.title || 'Untitled Task'}
                      </h4>
                      <p>
                        Priority :{" "}
                        <span className={`badge ${task.priority === 'High' ? 'badge-danger' :
                          task.priority === 'Medium' ? 'badge-warning' :
                            'badge-success'
                          }`}>
                          <i className="ti ti-point-filled me-1" />
                          {task.priority || 'Low'}
                        </span>
                      </p>
                    </div>
                    <div className="dropdown">
                      <Link
                        to="#"
                        className="dropdown-toggle btn btn-sm btn-white d-inline-flex align-items-center"
                        data-bs-toggle="dropdown"
                      >
                        <i className="ti ti-file-export me-1" /> Mark All as
                        Completed
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
                  </div>
                  <div className="row align-items-center">
                    <div className="col-sm-12">
                      <div className="mb-3">
                        <h6 className="mb-1">Description</h6>
                        <p>
                          {task.description || 'No description available for this task.'}
                        </p>
                      </div>
                    </div>
                    <div className="col-sm-3">
                      <p className="d-flex align-items-center mb-3">
                        <i className="ti ti-users-group me-2" />
                        Team
                      </p>
                    </div>
                    <div className="col-sm-9">
                      <div className="d-flex align-items-center mb-3">
                        {task.team && task.team.length > 0 ? (
                          task.team.map((member: any, index: number) => (
                            <div key={index} className="bg-gray-100 p-1 rounded d-flex align-items-center me-2">
                              <Link
                                to="#"
                                className="avatar avatar-sm avatar-rounded border border-white flex-shrink-0 me-2"
                              >
                                <ImageWithBasePath
                                  src={member.avatar || `assets/img/profiles/avatar-${(index % 10) + 1}.jpg`}
                                  alt="Img"
                                />
                              </Link>
                              <h6 className="fs-12">
                                <Link to="#">{member.name || member}</Link>
                              </h6>
                            </div>
                          ))
                        ) : (
                          <p className="text-muted mb-0">No team members assigned</p>
                        )}
                        <div>
                          <Link
                            to="#"
                            className="d-flex align-items-center fs-12"
                          >
                            <i className="ti ti-circle-plus me-1" />
                            Add New
                          </Link>
                        </div>
                      </div>
                    </div>
                    <div className="col-sm-3">
                      <p className="d-flex align-items-center mb-3">
                        <i className="ti ti-user-shield me-2" />
                        Assignee
                      </p>
                    </div>
                    <div className="col-sm-9">
                      <div className="d-flex align-items-center mb-3">
                        {task.assignee && task.assignee.length > 0 ? (
                          task.assignee.map((assignee: any, index: number) => (
                            <div key={index} className="bg-gray-100 p-1 rounded d-flex align-items-center me-2">
                              <Link
                                to="#"
                                className="avatar avatar-sm avatar-rounded border border-white flex-shrink-0 me-2"
                              >
                                <ImageWithBasePath
                                  src={assignee.avatar || `assets/img/profiles/avatar-${(index % 10) + 1}.jpg`}
                                  alt="Img"
                                />
                              </Link>
                              <h6 className="fs-12">
                                <Link to="#">{assignee.name || assignee}</Link>
                              </h6>
                            </div>
                          ))
                        ) : (
                          <p className="text-muted mb-0">No assignee assigned</p>
                        )}
                        <div>
                          <Link
                            to="#"
                            className="d-flex align-items-center fs-12"
                          >
                            <i className="ti ti-circle-plus me-1" />
                            Add New
                          </Link>
                        </div>
                      </div>
                    </div>
                    <div className="col-sm-3">
                      <p className="d-flex align-items-center mb-3">
                        <i className="ti ti-bookmark me-2" />
                        Tags
                      </p>
                    </div>
                    <div className="col-sm-9">
                      <div className="d-flex align-items-center mb-3">
                        {task.tags && task.tags.length > 0 ? (
                          task.tags.map((tag: string, index: number) => (
                            <Link
                              key={index}
                              to="#"
                              className={`badge task-tag rounded-pill me-2 ${index % 2 === 0 ? 'bg-pink' : 'badge-info'
                                }`}
                            >
                              {tag}
                            </Link>
                          ))
                        ) : (
                          <p className="text-muted mb-0">No tags assigned</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-4">
              <div className="card">
                <div className="card-body p-0">
                  <div className="d-flex flex-column">
                    <div className="d-flex align-items-center justify-content-between border-bottom p-3">
                      <p className="mb-0">Project</p>
                      <h6 className="fw-normal">{task.projectName || task.project || 'No project assigned'}</h6>
                    </div>
                    <div className="d-flex align-items-center justify-content-between border-bottom p-3">
                      <p className="mb-0">Created on</p>
                      <h6 className="fw-normal">{task.createdAt ? new Date(task.createdAt).toLocaleDateString() : 'Not set'}</h6>
                    </div>
                    <div className="d-flex align-items-center justify-content-between border-bottom p-3">
                      <p className="mb-0">Started on</p>
                      <h6 className="fw-normal">{task.startedAt ? new Date(task.startedAt).toLocaleDateString() : 'Not started'}</h6>
                    </div>
                    <div className="d-flex align-items-center justify-content-between p-3">
                      <p className="mb-0">Due Date</p>
                      <h6 className="fw-normal">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}</h6>
                    </div>
                  </div>
                </div>
              </div>
              <div className="custom-accordion-items">
                <div className="accordion accordions-items-seperate">
                  <div className="accordion-item flex-fill">
                    <div className="accordion-header" id="headingSix">
                      <div className="accordion-button">
                        <div className="d-flex align-items-center flex-fill">
                          <h5>Activity</h5>
                          <div className="d-flex align-items-center ms-auto">
                            <Link
                              to="#"
                              className="btn btn-primary btn-xs d-inline-flex align-items-center me-3"
                            >
                              <i className="ti ti-square-rounded-plus-filled me-1" />
                              Add New
                            </Link>
                            <Link
                              to="#"
                              className="d-flex align-items-center collapse-arrow"
                              data-bs-toggle="collapse"
                              data-bs-target="#primaryBorderSix"
                              aria-expanded="true"
                              aria-controls="primaryBorderSix"
                            >
                              <i className="ti ti-chevron-down fs-18" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      id="primaryBorderSix"
                      className="accordion-collapse collapse show border-top"
                      aria-labelledby="headingSix"
                    >
                      <div className="accordion-body">
                        <div className="notice-widget">
                          {task.activities && task.activities.length > 0 ? (
                            task.activities.map((activity: any, index: number) => (
                              <div key={index} className="d-flex align-items-center justify-content-between mb-4">
                                <div className="d-flex overflow-hidden">
                                  <span className={`avatar avatar-md me-3 rounded-circle flex-shrink-0 ${activity.type === 'task_created' ? 'bg-info' :
                                    activity.type === 'task_updated' ? 'bg-warning' :
                                      activity.type === 'task_completed' ? 'bg-success' :
                                        activity.type === 'file_uploaded' ? 'bg-secondary' : 'bg-purple'
                                    }`}>
                                    <i className={`fs-16 ${activity.type === 'task_created' ? 'ti ti-checkup-list' :
                                      activity.type === 'task_updated' ? 'ti ti-circle-dot' :
                                        activity.type === 'task_completed' ? 'ti ti-check' :
                                          activity.type === 'file_uploaded' ? 'ti ti-photo' : 'ti ti-activity'
                                      }`} />
                                  </span>
                                  <div className="overflow-hidden">
                                    <p className="text-truncate mb-1">
                                      <span className="text-gray-9 fw-medium">
                                        {activity.user || 'Unknown User'}
                                      </span>
                                      {" "}
                                      {activity.message || activity.description}
                                    </p>
                                    <p className="mb-1">
                                      {activity.timestamp ? new Date(activity.timestamp).toLocaleString() : 'Unknown time'}
                                    </p>
                                    {activity.statusChange && (
                                      <div className="d-flex align-items-center">
                                        {activity.oldStatus && (
                                          <span className="badge badge-success me-2">
                                            <i className="ti ti-point-filled me-1" />
                                            {activity.oldStatus}
                                          </span>
                                        )}
                                        {activity.oldStatus && activity.newStatus && (
                                          <span>
                                            <i className="ti ti-arrows-left-right me-2" />
                                          </span>
                                        )}
                                        {activity.newStatus && (
                                          <span className="badge badge-purple">
                                            <i className="ti ti-point-filled me-1" />
                                            {activity.newStatus}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-4">
                              <i className="ti ti-activity fs-1 text-muted mb-3"></i>
                              <p className="text-muted">No activities found for this task</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
      {/* /Page Wrapper */}

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
                aria-label="Close"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form action={all_routes.tasks}>
              <div className="modal-body">
                <div className="row">
                  <div className="col-12">
                    <div className="mb-3">
                      <label className="form-label">Title</label>
                      <input
                        type="text"
                        className="form-control"
                        defaultValue={task.title || ''}
                      />
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
                          defaultValue={task.dueDate ? new Date(task.dueDate) : undefined}
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
                        defaultValue={projectChoose.find(p => p.value === task.projectName || p.value === task.project) || projectChoose[0]}
                      />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label me-2">Team Members</label>
                      <CommonTagsInput
                        value={task.team ? task.team.map((member: any) => member.name || member).filter(Boolean) : []}
                        onChange={setTags}
                        placeholder="Add new"
                        className="custom-input-class"
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Tag</label>
                      <CommonTagsInput
                        value={task.tags || []}
                        onChange={setTags1}
                        placeholder="Add new"
                        className="custom-input-class"
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Status</label>
                      <CommonSelect
                        className="select"
                        options={statusChoose}
                        defaultValue={statusChoose.find(s => s.value.toLowerCase() === (task.status || '').toLowerCase()) || statusChoose[0]}
                      />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Priority</label>
                      <CommonSelect
                        className="select"
                        options={priorityChoose}
                        defaultValue={priorityChoose.find(p => p.value.toLowerCase() === (task.priority || '').toLowerCase()) || priorityChoose[0]}
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
                      <CommonTextEditor
                        defaultValue={task.description || ''}
                        onChange={() => { }}
                      />
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
                      {task.attachments && task.attachments.length > 0 ? (
                        task.attachments.map((attachment: any, index: number) => (
                          <div key={index} className="d-flex align-items-center justify-content-between border-bottom mb-2 pb-2">
                            <div className="d-flex align-items-center">
                              <h6 className="fs-12 fw-medium me-1">{attachment.name || attachment.filename}</h6>
                              <span className="badge badge-soft-info">{attachment.size || 'Unknown size'}</span>
                            </div>
                            <Link to="#" className="btn btn-sm btn-icon">
                              <i className="ti ti-trash" />
                            </Link>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-3">
                          <i className="ti ti-file-x fs-2 text-muted mb-2"></i>
                          <p className="text-muted mb-0">No attachments uploaded</p>
                        </div>
                      )}
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
    </>
  );
};

export default TaskDetails;
