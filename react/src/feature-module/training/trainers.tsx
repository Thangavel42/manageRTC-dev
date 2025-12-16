import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { all_routes } from "../router/all_routes";
import CollapseHeader from "../../core/common/collapse-header/collapse-header";
import Table from "../../core/common/dataTable/index";
import ImageWithBasePath from "../../core/common/imageWithBasePath";
import CommonSelect from '../../core/common/commonSelect';
import { useSocket } from "../../SocketContext";
import { Socket } from "socket.io-client";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { Modal } from "antd";

type TrainersRow = {
  trainer: string;
  phone: string;
  email: string;
  desc: string;
  status: string;
  trainerId: string;
};

type Stats = {
  totalTrainers: string;
};

const Trainers = () => {

    const socket = useSocket() as Socket | null;
    const [rows, setRows] = useState<TrainersRow[]>([]);
    const [stats, setStats] = useState<Stats>({ totalTrainers: "0",});
    const [loading, setLoading] = useState<boolean>(true);
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
    const [filterType, setFilterType] = useState<string>("alltime");
    const [editing, setEditing] = useState<any>(null);
    const [customRange, setCustomRange] = useState<{ startDate?: string; endDate?: string }>({});
    
    const [editForm, setEditForm] = useState({
      trainer: "",
      phone: "",
      email: "",
      desc: "",
      status: "Active",
      trainerId: "",
    });

    const openEditModal = (row: any) => {
      setEditForm({
        trainer: row.trainer || "",
        phone: row.phone || "",
        email: row.email || "",
        desc: row.desc || "",
        status: row.status || "Active",
        trainerId: row.trainerId,
      });
    };

    const getModalContainer = () => {
      const modalElement = document.getElementById("modal-datepicker");
      return modalElement ? modalElement : document.body;
    };

    const [addForm, setAddForm] = useState({
      trainer: "",
      phone: "",
      email: "",
      desc: "",
      status: "Active",
    });

    const confirmDelete = (onConfirm: () => void) => {
      Modal.confirm({
        title: null,
        icon: null,
        closable: true,
        centered: true,
        okText: "Yes, Delete",
        cancelText: "Cancel",
        okButtonProps: { style: { background: "#ff4d4f", borderColor: "#ff4d4f" } },
        cancelButtonProps: { style: { background: "#f5f5f5" } },
        content: (
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: 56,
                height: 56,
                margin: "0 auto 12px",
                borderRadius: 12,
                background: "#ffecec",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <a aria-label="Delete">
                <DeleteOutlined style={{ fontSize: 18, color: "#ff4d4f" }} />
              </a>
            </div>
            <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 8 }}>
              Confirm Delete
            </div>
            <div style={{ color: "#6b7280" }}>
              You want to delete all the marked items, this can’t be undone once you delete.
            </div>
          </div>
        ),
        onOk: async () => {
          await onConfirm();
          socket.emit("hr/trainers/trainerslist", { type: "alltime" });
        },
      });
    };

    const onListResponse = useCallback((res: any) => {
      if (res?.done) {
        setRows(res.data || []);
      } else {
        setRows([]);
        // optionally toast error
        // toast.error(res?.message || "Failed to fetch trainerss");
      }
      setLoading(false);
    }, []);

    const onStatsResponse = useCallback((res: any) => {
      if (res?.done && res.data) {
        setStats(res.data);
      }
    }, []);

    const onAddResponse = useCallback((res: any) => {
      // feedback only; list and stats will be broadcast from controller
      if (!res?.done) {
        // toast.error(res?.message || "Failed to add trainers");
      }
    }, []);

    const onUpdateResponse = useCallback((res: any) => {
      if (!res?.done) {
        // toast.error(res?.message || "Failed to update trainers");
      }
    }, []);

    const onDeleteResponse = useCallback((res: any) => {
      if (res?.done) {
        setSelectedKeys([]);
      } else {
        // toast.error(res?.message || "Failed to delete");
      }
    }, []);

    useEffect(() => {
      if (!socket) return;

      socket.emit("join-room", "hr_room");

      socket.on("hr/trainers/trainerslist-response", onListResponse);
      socket.on("hr/trainers/trainers-details-response", onStatsResponse);
      socket.on("hr/trainers/add-trainers-response", onAddResponse);
      socket.on("hr/trainers/update-trainers-response", onUpdateResponse);
      socket.on("hr/trainers/delete-trainers-response", onDeleteResponse);

      return () => {
        socket.off("hr/trainers/trainerslist-response", onListResponse);
        socket.off("hr/trainers/trainers-details-response", onStatsResponse);
        socket.off("hr/trainers/add-trainers-response", onAddResponse);
        socket.off("hr/trainers/update-trainers-response", onUpdateResponse);
        socket.off("hr/trainers/delete-trainers-response", onDeleteResponse);
      };
    }, [socket, onListResponse, onStatsResponse, onAddResponse, onUpdateResponse, onDeleteResponse]);


    const fetchList = useCallback(
      (type: string, range?: { startDate?: string; endDate?: string }) => {
        if (!socket) return;
        setLoading(true);
        const payload: any = { type };
        if (type === "custom" && range?.startDate && range?.endDate) {
          payload.startDate = range.startDate;
          payload.endDate = range.endDate;
        }
        socket.emit("hr/trainers/trainerslist", payload);
      },
      [socket]
    );

    const handleAddSave = () => {
        if (!socket) return;

        // basic validation
        if (!addForm.trainer || !addForm.phone || !addForm.email || !addForm.desc || !addForm.status) {
          // toast.warn("Please fill required fields");
          return;
      }
        

      const payload = {
        trainer: addForm.trainer,
        phone: addForm.phone,
        email: addForm.email,
        desc: addForm.desc,
        status: addForm.status as "Active" | "Inactive",
      };

      socket.emit("hr/trainers/add-trainers", payload);
      // modal has data-bs-dismiss; optional: reset form
      setAddForm({
        trainer: "",
        desc: "",
        status: "Active",
        phone: "",
        email: "",
      });
      socket.emit("hr/trainers/trainerslist", { type: "alltime" });
    };

    const handleEditSave = () => {
        if (!socket) return;

      // basic validation
        if (!editForm.trainer || !editForm.phone || !editForm.email || !editForm.desc || !editForm.status || !editForm.trainerId) {
        // toast.warn("Please fill required fields");
          return;
      }

      const payload = {
        trainer: editForm.trainer,
        status: editForm.status as "Active" | "Inactive",
        desc: editForm.desc,
        phone: editForm.phone,
        email: editForm.email,
        trainerId: editForm.trainerId,
        };

      socket.emit("hr/trainers/update-trainers", payload);
      // modal has data-bs-dismiss; optional: reset form
      setEditForm({
        trainer: "",
        phone: "",
        email: "",
        desc: "",
        status: "Active", 
        trainerId:"",
      });
      socket.emit("hr/trainers/trainerslist", { type: "alltime" });
    };

    const fetchStats = useCallback(() => {
      if (!socket) return;
      socket.emit("hr/trainers/trainers-details");
    }, [socket]);

    useEffect(() => {
      if (!socket) return;
      fetchList(filterType, customRange);
      fetchStats();
    }, [socket, fetchList, fetchStats, filterType, customRange]);

    type Option = { value: string; label: string };
     
    const handleFilterChange = (opt: Option | null) => {
      const value = opt?.value ?? "alltime";
      setFilterType(value);
      if (value !== "custom") {
        setCustomRange({});
        fetchList(value);
      }
    };

    const handleCustomRange = (_: any, dateStrings: [string, string]) => {
      if (dateStrings && dateStrings[0] && dateStrings[1]) {
        const range = { startDate: dateStrings[0], endDate: dateStrings[1] };
        setCustomRange(range);
        fetchList("custom", range);
      }
    };

    const handleBulkDelete = () => {
      if (!socket || selectedKeys.length === 0) return;
      if (window.confirm(`Delete ${selectedKeys.length} record(s)? This cannot be undone.`)) {
        socket.emit("hr/trainers/delete-trainers", selectedKeys);
      }
    };

    const handleSelectionChange = (keys: React.Key[]) => {
      setSelectedKeys(keys as string[]);
    };

    const routes = all_routes;
    const columns = [
        {
          title: "Name",
          dataIndex: "trainer",
          render: (text: string, record: any) => (
            <div className="d-flex align-items-center file-name-icon">
                <Link to="#" className="avatar avatar-md border avatar-rounded">
                    <ImageWithBasePath src={"assets/img/favicon.png"} className="img-fluid" alt="img"/>
                </Link>
                <div className="ms-2">
                    <h6 className="fw-medium">
                        <Link to="#">{text}</Link>
                    </h6>
                </div>
            </div>
          ),
          sorter: (a: TrainersRow, b: TrainersRow) => a.trainer.localeCompare(b.trainer),
        },
        {
            title: "Phone",
            dataIndex: "phone",
            sorter: (a: TrainersRow, b: TrainersRow) => a.phone.localeCompare(b.phone),
        },
        {
            title: "Email",
            dataIndex: "email",
            sorter: (a: TrainersRow, b: TrainersRow) => a.email.localeCompare(b.email),
        },
        {
            title: "Description",
            dataIndex: "desc",
            sorter: (a: TrainersRow, b: TrainersRow) => a.desc.localeCompare(b.desc),
        },
        {
            title: "Status",
            dataIndex: "status",
            filters: [
              { text: "Active", value: "Active" },
              { text: "Inactive", value: "Inactive" },
            ],
            render: (text: string) => {
            const isActive = text === "Active";
            const cls = `badge ${isActive ? "badge-success" : "badge-danger"} d-inline-flex align-items-center badge-xs`;
            return (
              <span className={cls}>
              <i className="ti ti-point-filled me-1" />
                {text}
              </span>
            );
            },
          onFilter: (val: any, rec: any) => rec.status === val,
          sorter: (a: TrainersRow, b: TrainersRow) => a.status.localeCompare(b.status),
        },
        {
          title: "",
          dataIndex: "trainerId",
          render: (id: string, record: TrainersRow) => (
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <a href="#"
              data-bs-toggle="modal"
              data-bs-target="#edit_trainer"
              onClick={(e) => {
                // still prefill the form before Bootstrap opens it
                openEditModal(record);
              }}>
                <i className="ti ti-edit" />
              </a>
            <a
              aria-label="Delete"
              onClick={(e) => {
                e.preventDefault();
                confirmDelete(() =>
                  socket?.emit("hr/trainers/delete-trainers", [record.trainerId]));
              }}
            >
              <i className="ti ti-trash" />
            </a>
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
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Trainers</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">HR</li>
                  <li className="breadcrumb-item">Training</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Trainers
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
              <div className="mb-2">
                <Link
                  to="#"
                  data-bs-toggle="modal"
                  data-bs-target="#new_trainer"
                  className="btn btn-primary d-flex align-items-center"
                >
                  <i className="ti ti-circle-plus me-2" />
                  Add Trainer
                </Link>
              </div>
              <div className="head-icons ms-2">
                <CollapseHeader />
              </div>
            </div>
          </div>
          {/* /Breadcrumb */}
          {/* Performance Indicator list */}
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
              <h5>Trainers List</h5>
              <div className="d-flex my-xl-auto right-content align-items-center flex-wrap row-gap-3">
                <div className="dropdown">
                  <Link
                    to="#"
                    className="d-inline-flex align-items-center"
                  >
                    <label className="fs-12 d-inline-flex me-1">Sort By : </label>
                        <CommonSelect
                          className="select"
                          options={[
                            { value: "last7days", label: "Last 7 Days" },
                            { value: "thismonth", label: "This Month" },
                            { value: "lastmonth", label: "Last Month" },
                            { value: "alltime", label: "All Time" },
                          ]}
                          defaultValue={filterType}
                          onChange={handleFilterChange}
                        />                    
                  </Link>
                </div>
              </div>
            </div>
            <div className="card-body p-0">
                <Table dataSource={rows} columns={columns} Selection={true} />
            </div>
          </div>
          {/* /Performance Indicator list */}
        </div>
        <div className="footer d-sm-flex align-items-center justify-content-between border-top bg-white p-3">
          <p className="mb-0">2014 - 2025 © SmartHR.</p>
          <p>
            Designed &amp; Developed By{" "}
            <Link to="#" className="text-primary">
              Dreams
            </Link>
          </p>
        </div>
      </div>
      {/* /Page Wrapper */}
      {/* Add Trainer */}
        <div className="modal fade" id="new_trainer">
          <div className="modal-dialog modal-dialog-centered modal-md">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">Add Trainer</h4>
                <button
                  type="button"
                  className="btn-close custom-btn-close"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                >
                  <i className="ti ti-x" />
                </button>
              </div>
              <form>
                <div className="modal-body pb-0">
                  <div className="row">
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">
                          Name
                        </label>
                        <textarea
                          className="form-control"
                          rows={1} value={addForm.trainer} onChange ={(e) => setAddForm({ ...addForm, trainer: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">
                          Phone
                        </label>
                        <textarea
                          className="form-control"
                          rows={1} value={addForm.phone} onChange ={(e) => setAddForm({ ...addForm, phone: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">
                          Email
                        </label>
                        <textarea
                          className="form-control"
                          rows={1} value={addForm.email} onChange ={(e) => setAddForm({ ...addForm, email: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">
                          Description
                        </label>
                        <textarea
                          className="form-control"
                          rows={1} value={addForm.desc} onChange ={(e) => setAddForm({ ...addForm, desc: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">Status</label>
                        <CommonSelect
                          className="select"
                          options={[
                            { value: "Active", label: "Active" },
                            { value: "Inactive", label: "Inactive" },
                            ]}
                          defaultValue={addForm.status} onChange={(opt: { value: string } | null) => setAddForm({ ...addForm, status: opt?.value ?? "Active" })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-white border me-2"
                    data-bs-dismiss="modal"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    data-bs-dismiss="modal"
                    className="btn btn-primary"
                    onClick={handleAddSave}
                  >
                    Add Trainer
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        {/* /Add Trainer */}
        {/* Edit Trainer */}
        <div className="modal fade" id="edit_trainer">
          <div className="modal-dialog modal-dialog-centered modal-md">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">Edit Trainer</h4>
                <button
                  type="button"
                  className="btn-close custom-btn-close"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                >
                  <i className="ti ti-x" />
                </button>
              </div>
              <form>
                <div className="modal-body pb-0">
                  <div className="row">
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">
                          Name&nbsp;
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={editForm.trainer}
                          onChange={(e) => setEditForm({ ...editForm, trainer: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">Phone</label>
                        <textarea
                          className="form-control"
                          rows={1}
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">Email</label>
                        <textarea
                          className="form-control"
                          rows={1}
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">Description</label>
                        <textarea
                          className="form-control"
                          rows={1}
                          value={editForm.desc}
                          onChange={(e) => setEditForm({ ...editForm, desc: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">Status</label>
                        <CommonSelect
                          className="select"
                          defaultValue={editForm.status}
                          onChange={(opt: { value: string } | null) => setEditForm({ ...editForm, status: opt?.value ?? "Active" })}
                          options={[
                            { value: "Active", label: "Active" },
                            { value: "Inactive", label: "Inactive" },
                            ]}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-white border me-2"
                    data-bs-dismiss="modal"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    data-bs-dismiss="modal"
                    className="btn btn-primary"
                    onClick={handleEditSave}
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        {/* /Edit Trainer */}
    </>
  );
};

export default Trainers;
