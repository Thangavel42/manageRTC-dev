import { DeleteOutlined } from "@ant-design/icons";
import { Modal } from "antd";
import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Socket } from "socket.io-client";
import CollapseHeader from "../../core/common/collapse-header/collapse-header";
import CommonSelect from '../../core/common/commonSelect';
import Table from "../../core/common/dataTable/index";
import TrainingTypeModal from "../../core/modals/trainingTypeModal";
import { useSocket } from "../../SocketContext";
import { all_routes } from "../router/all_routes";

type TrainingTypesRow = {
  trainingType: string;
  desc: string;
  status: string;
  typeId: string;
};

type Stats = {
  totalTrainingTypes: string;
};

const TrainingType = () => {
  const socket = useSocket() as Socket | null;

  const [rows, setRows] = useState<TrainingTypesRow[]>([]);
  const [stats, setStats] = useState<Stats>({ totalTrainingTypes: "0",});
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string>("alltime");
  const [editing, setEditing] = useState<any>(null);
  const [customRange, setCustomRange] = useState<{ startDate?: string; endDate?: string }>({});

      // Controlled edit form data
    const [editForm, setEditForm] = useState({
      trainingType: "",
      desc: "",
      status: "Active",
      typeId: "",
    });

    const openEditModal = (row: any) => {
      setEditForm({
        trainingType: row.trainingType || "",
        desc: row.desc || "",
        status: row.status || "Active",
        typeId: row.typeId,
      });
    };

  const getModalContainer = () => {
    const modalElement = document.getElementById("modal-datepicker");
    return modalElement ? modalElement : document.body;
  };

    const [addForm, setAddForm] = useState({
      trainingType: "",
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
        },
      });
    };

  // event handlers
  const onListResponse = useCallback((res: any) => {
    if (res?.done) {
      setRows(res.data || []);
    } else {
      setRows([]);
      // optionally toast error
      // toast.error(res?.message || "Failed to fetch trainingTypess");
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
      // toast.error(res?.message || "Failed to add trainingTypes");
    }
  }, []);

  const onUpdateResponse = useCallback((res: any) => {
    if (!res?.done) {
      // toast.error(res?.message || "Failed to update trainingTypes");
    }
  }, []);

  const onDeleteResponse = useCallback((res: any) => {
    if (res?.done) {
      setSelectedKeys([]);
    } else {
      // toast.error(res?.message || "Failed to delete");
    }
  }, []);

  // register socket listeners and join room
  useEffect(() => {
    if (!socket) return;

    socket.emit("join-room", "hr_room");

    socket.on("hr/trainingTypes/trainingTypeslist-response", onListResponse);
    socket.on("hr/trainingTypes/trainingTypes-details-response", onStatsResponse);
    socket.on("hr/trainingTypes/add-trainingTypes-response", onAddResponse);
    socket.on("hr/trainingTypes/update-trainingTypes-response", onUpdateResponse);
    socket.on("hr/trainingTypes/delete-trainingTypes-response", onDeleteResponse);

    return () => {
      socket.off("hr/trainingTypes/trainingTypeslist-response", onListResponse);
      socket.off("hr/trainingTypes/trainingTypes-details-response", onStatsResponse);
      socket.off("hr/trainingTypes/add-trainingTypes-response", onAddResponse);
      socket.off("hr/trainingTypes/update-trainingTypes-response", onUpdateResponse);
      socket.off("hr/trainingTypes/delete-trainingTypes-response", onDeleteResponse);
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
      socket.emit("hr/trainingTypes/trainingTypeslist", payload);
    },
    [socket]
  );

  const handleAddSave = () => {
    console.log("Adding training type:", addForm); // Debug log
    // return;
    if (!socket) return;
    // basic validation
    if (!addForm.trainingType || !addForm.desc || !addForm.status) {
      // toast.warn("Please fill required fields");
      return;
    }

    const payload = {
     trainingType: addForm.trainingType,
     status: addForm.status as "Active" | "Inactive",
     desc: addForm.desc,
    };

    socket.emit("hr/trainingTypes/add-trainingTypes", payload);
    // modal has data-bs-dismiss; optional: reset form
    setAddForm({
      trainingType: "",
      desc: "",
      status: "Active",
    });
  };

  const handleEditSave = () => {
      if (!socket) return;

      // basic validation
      if (!editForm.trainingType || !editForm.desc || !editForm.status) {
        // toast.warn("Please fill required fields");
        return;
    }

    const payload = {
     trainingType: editForm.trainingType,
     status: editForm.status as "Active" | "Inactive",
     desc: editForm.desc,
     typeId: editForm.typeId,
    };

    socket.emit("hr/trainingTypes/update-trainingTypes", payload);
    // modal has data-bs-dismiss; optional: reset form
    setEditForm({
      trainingType: "",
      desc: "",
      status: "Active",
      typeId:"",
    });
    };

  const fetchStats = useCallback(() => {
    if (!socket) return;
    socket.emit("hr/trainingTypes/trainingTypes-details");
  }, [socket]);

  // initial + reactive fetch
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
      socket.emit("hr/trainingTypes/delete-trainingTypes", selectedKeys);
    }
  };

    const handleSelectionChange = (keys: React.Key[]) => {
      setSelectedKeys(keys as string[]);
    };

  const columns = [
    {
      title: "Type",
      dataIndex: "trainingType",
      sorter: (a: TrainingTypesRow, b: TrainingTypesRow) => a.trainingType.localeCompare(b.trainingType),
    },
    {
      title: "Description",
      dataIndex: "desc",
      sorter: (a: TrainingTypesRow, b: TrainingTypesRow) => a.desc.localeCompare(b.desc),
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
      sorter: (a: TrainingTypesRow, b: TrainingTypesRow) => a.status.localeCompare(b.status),
    },
    {
      title: "",
      dataIndex: "typeId",
      render: (id: string, record: TrainingTypesRow) => (
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <a href="#"
          data-bs-toggle="modal"
          data-bs-target="#edit_trainingtype"
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
              socket?.emit("hr/trainingTypes/delete-trainingTypes", [id]));
          }}
        >
          <i className="ti ti-trash" />
        </a>
      </div>
    ),
    },
  ];

  const rowSelection = {
    selectedRowKeys: selectedKeys,
    onChange: (keys: React.Key[]) => setSelectedKeys(keys as string[]),
  };

  return (
    <>
      {/* Page Wrapper */}
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Training Type</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={all_routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">HR</li>
                  <li className="breadcrumb-item">Training</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Training Type
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
              <div className="mb-2">
                <button
                  type="button"
                  data-bs-toggle="modal"
                  data-bs-target="#new_trainingtype"
                  className="btn btn-primary d-flex align-items-center"
                >
                  <i className="ti ti-circle-plus me-2" />
                  Add Training type
                </button>
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
              <h5>Training Type List</h5>
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
        {/* Footer */}
                <div className="footer d-sm-flex align-items-center justify-content-between bg-white border-top p-3">
                  <p className="mb-0">2026 © amasQIS.ai</p>
                  <p>
                    Designed &amp; Developed By{" "}
                    <Link to="amasqis.ai" className="text-primary">
                      amasQIS.ai
                    </Link>
                  </p>
                </div>
                {/* /Footer */}
      </div>
      {/* /Page Wrapper */}

      <TrainingTypeModal />
      {/* Add Termination */}
        <div className="modal fade" id="new_trainingtype">
          <div className="modal-dialog modal-dialog-centered modal-md">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">Add Training Type</h4>
                <button
                  type="button"
                  className="btn-close custom-btn-close"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                  onClick={() => setAddForm({ trainingType: "", desc: "", status: "Active" })}
                >
                  <i className="ti ti-x" />
                </button>
              </div>
              <form onSubmit={(e) => e.preventDefault()}>
                <div className="modal-body pb-0">
                  <div className="row">
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">
                          Type
                        </label>
                        <textarea
                          className="form-control"
                          rows={1} value={addForm.trainingType} onChange ={(e) => setAddForm({ ...addForm, trainingType: e.target.value})}
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
                    onClick={() => setAddForm({ trainingType: "", desc: "", status: "Active" })}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    data-bs-dismiss="modal"
                    className="btn btn-primary"
                    onClick={handleAddSave}
                  >
                    Add Training Type
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        {/* /Add Termination */}
        {/* Edit Termination */}
        <div className="modal fade" id="edit_trainingtype">
          <div className="modal-dialog modal-dialog-centered modal-md">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">Edit Training Type</h4>
                <button
                  type="button"
                  className="btn-close custom-btn-close"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                  onClick={() => setEditForm({ trainingType: "", desc: "", status: "Active", typeId: "" })}
                >
                  <i className="ti ti-x" />
                </button>
              </div>
              <form onSubmit={(e) => e.preventDefault()}>
                <div className="modal-body pb-0">
                  <div className="row">
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">
                          Type&nbsp;
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={editForm.trainingType}
                          onChange={(e) => setEditForm({ ...editForm, trainingType: e.target.value })}
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
                    onClick={() => setEditForm({ trainingType: "", desc: "", status: "Active", typeId: "" })}
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
        {/* /Edi Termination */}
    </>
  );
};

export default TrainingType;
