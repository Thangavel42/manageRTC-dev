import { DeleteOutlined } from "@ant-design/icons";
import { Modal } from "antd";
import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Socket } from "socket.io-client";
import CollapseHeader from "../../core/common/collapse-header/collapse-header";
import CommonSelect from '../../core/common/commonSelect';
import Table from "../../core/common/dataTable/index";
import ImageWithBasePath from "../../core/common/imageWithBasePath";
import { useSocket } from "../../SocketContext";
import { all_routes } from "../router/all_routes";

type TrainersRow = {
  trainer: string;
  phone: string;
  email: string;
  desc: string;
  status: string;
  trainerId: string;
  trainerType?: string;
  employeeId?: string;
  profileImage?: string;
};

type Stats = {
  totalTrainers: string;
};

type Employee = {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  profileImage?: string;
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
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [trainerType, setTrainerType] = useState<"Internal" | "External">("Internal");

    const [editForm, setEditForm] = useState({
      trainer: "",
      phone: "",
      email: "",
      desc: "",
      status: "Active",
      trainerId: "",
      trainerType: "Internal" as "Internal" | "External",
      employeeId: "",
    });

    const openEditModal = (row: any) => {
      setEditForm({
        trainer: row.trainer || "",
        phone: row.phone || "",
        email: row.email || "",
        desc: row.desc || "",
        status: row.status || "Active",
        trainerId: row.trainerId,
        trainerType: row.trainerType || "External",
        employeeId: row.employeeId || "",
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
      trainerType: "Internal" as "Internal" | "External",
      employeeId: "",
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

    const onEmployeesResponse = useCallback((res: any) => {
      if (res?.done && res.data) {
        setEmployees(res.data);
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
      socket.on("users/get-all-response", onEmployeesResponse);

      // Fetch employees list
      socket.emit("users/get-all");

      return () => {
        socket.off("hr/trainers/trainerslist-response", onListResponse);
        socket.off("hr/trainers/trainers-details-response", onStatsResponse);
        socket.off("hr/trainers/add-trainers-response", onAddResponse);
        socket.off("hr/trainers/update-trainers-response", onUpdateResponse);
        socket.off("hr/trainers/delete-trainers-response", onDeleteResponse);
        socket.off("users/get-all-response", onEmployeesResponse);
      };
    }, [socket, onListResponse, onStatsResponse, onAddResponse, onUpdateResponse, onDeleteResponse, onEmployeesResponse]);


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

    const handleTrainerTypeChange = (opt: { value: string; label: string } | null) => {
      const type = opt?.value as "Internal" | "External" || "Internal";
      setTrainerType(type);
      setAddForm({
        trainer: "",
        phone: "",
        email: "",
        desc: "",
        status: "Active",
        trainerType: type,
        employeeId: "",
      });
      setSelectedEmployee(null);
    };

    const handleEmployeeSelect = (opt: { value: string; label: string } | null) => {
      if (!opt) {
        setSelectedEmployee(null);
        setAddForm({
          ...addForm,
          trainer: "",
          phone: "",
          email: "",
          employeeId: "",
        });
        return;
      }

      const employee = employees.find(emp => emp._id === opt.value);
      if (employee) {
        setSelectedEmployee(employee);
        console.log("📋 Selected employee:", employee);
        setAddForm({
          ...addForm,
          trainer: `${employee.firstName} ${employee.lastName}`,
          phone: employee.phone || "",
          email: employee.email || "",
          employeeId: employee._id,
        });
      }
    };

    const handleAddSave = () => {
        if (!socket) return;

        // Validation based on trainer type
        if (addForm.trainerType === "Internal") {
          // For internal trainers, only need employeeId, desc, and status
          if (!addForm.employeeId || !addForm.desc || !addForm.status) {
            alert("Please select an employee and fill all required fields");
            return;
          }
        } else {
          // For external trainers, need all fields
          if (!addForm.trainer || !addForm.phone || !addForm.email || !addForm.desc || !addForm.status) {
            alert("Please fill all required fields");
            return;
          }

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(addForm.email)) {
            alert("Please enter a valid email address");
            return;
          }

          // Validate phone number (only +, (, ), space, and numbers)
          const phoneRegex = /^[+()\s\d]+$/;
          if (!phoneRegex.test(addForm.phone)) {
            alert("Phone number can only contain +, (, ), space, and numbers");
            return;
          }
        }

      const payload: any = {
        desc: addForm.desc,
        status: addForm.status as "Active" | "Inactive",
        trainerType: addForm.trainerType,
      };

      // For internal trainers, only send employeeId
      if (addForm.trainerType === "Internal") {
        payload.employeeId = addForm.employeeId;
      } else {
        // For external trainers, send full details
        payload.trainer = addForm.trainer;
        payload.phone = addForm.phone;
        payload.email = addForm.email;
      }

      console.log("📤 Adding trainer:", payload);
      socket.emit("hr/trainers/add-trainers", payload);

      // Reset form
      setAddForm({
        trainer: "",
        desc: "",
        status: "Active",
        phone: "",
        email: "",
        trainerType: "Internal",
        employeeId: "",
      });
      setSelectedEmployee(null);
      setTrainerType("Internal");
    };

    const handleEditSave = () => {
        if (!socket) return;

      // Validation based on trainer type
      if (editForm.trainerType === "Internal") {
        // For internal trainers, only need employeeId, desc, and status
        if (!editForm.employeeId || !editForm.desc || !editForm.status || !editForm.trainerId) {
          alert("Please fill all required fields");
          return;
        }
      } else {
        // For external trainers, need all fields
        if (!editForm.trainer || !editForm.phone || !editForm.email || !editForm.desc || !editForm.status || !editForm.trainerId) {
          alert("Please fill all required fields");
          return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(editForm.email)) {
          alert("Please enter a valid email address");
          return;
        }

        // Validate phone number (only +, (, ), space, and numbers)
        const phoneRegex = /^[+()\s\d]+$/;
        if (!phoneRegex.test(editForm.phone)) {
          alert("Phone number can only contain +, (, ), space, and numbers");
          return;
        }
      }

      const payload: any = {
        desc: editForm.desc,
        status: editForm.status as "Active" | "Inactive",
        trainerId: editForm.trainerId,
        trainerType: editForm.trainerType,
      };

      // For internal trainers, only include employeeId
      if (editForm.trainerType === "Internal") {
        payload.employeeId = editForm.employeeId;
      } else {
        // For external trainers, include full details
        payload.trainer = editForm.trainer;
        payload.phone = editForm.phone;
        payload.email = editForm.email;
      }

      console.log("📤 Updating trainer:", payload);
      socket.emit("hr/trainers/update-trainers", payload);

      // Reset form
      setEditForm({
        trainer: "",
        phone: "",
        email: "",
        desc: "",
        status: "Active",
        trainerId:"",
        trainerType: "Internal",        employeeId: "",      });
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
                    <ImageWithBasePath
                      src={record.profileImage || "assets/img/profiles/avatar-14.jpg"}
                      className="img-fluid"
                      alt="img"
                    />
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
            title: "Type",
            dataIndex: "trainerType",
            render: (text: string) => {
              const type = text || "External";
              const isInternal = type === "Internal";
              const cls = `badge ${isInternal ? "badge-info" : "badge-warning"} d-inline-flex align-items-center badge-xs`;
              return (
                <span className={cls}>
                  <i className={`ti ${isInternal ? "ti-users" : "ti-user"} me-1`} />
                  {type}
                </span>
              );
            },
            filters: [
              { text: "Internal", value: "Internal" },
              { text: "External", value: "External" },
            ],
            onFilter: (val: any, rec: any) => (rec.trainerType || "External") === val,
            sorter: (a: TrainersRow, b: TrainersRow) => (a.trainerType || "External").localeCompare(b.trainerType || "External"),
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
                          Trainer Type <span className="text-danger">*</span>
                        </label>
                        <CommonSelect
                          className="select"
                          options={[
                            { value: "Internal", label: "Internal (Employee)" },
                            { value: "External", label: "External" }
                          ]}
                          value={{ value: trainerType, label: trainerType === "Internal" ? "Internal (Employee)" : "External" }}
                          onChange={handleTrainerTypeChange}
                        />
                      </div>
                    </div>

                    {trainerType === "Internal" ? (
                      <>
                        <div className="col-md-12">
                          <div className="mb-3">
                            <label className="form-label">
                              Select Employee <span className="text-danger">*</span>
                            </label>
                            <CommonSelect
                              className="select"
                              options={employees.map(emp => ({
                                value: emp._id,
                                label: `${emp.employeeId} - ${emp.firstName} ${emp.lastName}`
                              }))}
                              value={selectedEmployee ? {
                                value: selectedEmployee._id,
                                label: `${selectedEmployee.employeeId} - ${selectedEmployee.firstName} ${selectedEmployee.lastName}`
                              } : null}
                              onChange={handleEmployeeSelect}
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="col-md-12">
                          <div className="mb-3">
                            <label className="form-label">
                              Trainer Name <span className="text-danger">*</span>
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Enter trainer name"
                              value={addForm.trainer}
                              onChange={(e) => setAddForm({ ...addForm, trainer: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="col-md-12">
                          <div className="mb-3">
                            <label className="form-label">
                              Phone <span className="text-danger">*</span>
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Enter phone number"
                              value={addForm.phone}
                              onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="col-md-12">
                          <div className="mb-3">
                            <label className="form-label">
                              Email <span className="text-danger">*</span>
                            </label>
                            <input
                              type="email"
                              className="form-control"
                              placeholder="Enter email address"
                              value={addForm.email}
                              onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                            />
                          </div>
                        </div>
                      </>
                    )}
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">
                          Description <span className="text-danger">*</span>
                        </label>
                        <textarea
                          className="form-control"
                          rows={3}
                          value={addForm.desc}
                          onChange={(e) => setAddForm({ ...addForm, desc: e.target.value})}
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
                          Trainer Type <span className="text-danger">*</span>
                        </label>
                        <CommonSelect
                          className="select"
                          options={[
                            { value: "Internal", label: "Internal (Employee)" },
                            { value: "External", label: "External" }
                          ]}
                          value={{
                            value: editForm.trainerType,
                            label: editForm.trainerType === "Internal" ? "Internal (Employee)" : "External"
                          }}
                          onChange={(opt: { value: string } | null) =>
                            setEditForm({ ...editForm, trainerType: (opt?.value as "Internal" | "External") || "External" })
                          }
                        />
                      </div>
                    </div>
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">
                          Trainer Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={editForm.trainer}
                          onChange={(e) => setEditForm({ ...editForm, trainer: e.target.value })}
                          readOnly={editForm.trainerType === "Internal"}
                          disabled={editForm.trainerType === "Internal"}
                          style={editForm.trainerType === "Internal" ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
                        />
                        {editForm.trainerType === "Internal" && (
                          <small className="text-muted">Name is fetched from employee record</small>
                        )}
                      </div>
                    </div>
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">
                          Phone <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          readOnly={editForm.trainerType === "Internal"}
                          disabled={editForm.trainerType === "Internal"}
                          style={editForm.trainerType === "Internal" ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
                        />
                        {editForm.trainerType === "Internal" && (
                          <small className="text-muted">Phone is fetched from employee record</small>
                        )}
                      </div>
                    </div>
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">
                          Email <span className="text-danger">*</span>
                        </label>
                        <input
                          type="email"
                          className="form-control"
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          readOnly={editForm.trainerType === "Internal"}
                          disabled={editForm.trainerType === "Internal"}
                          style={editForm.trainerType === "Internal" ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
                        />
                        {editForm.trainerType === "Internal" && (
                          <small className="text-muted">Email is fetched from employee record</small>
                        )}
                      </div>
                    </div>
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">
                          Description <span className="text-danger">*</span>
                        </label>
                        <textarea
                          className="form-control"
                          rows={3}
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
