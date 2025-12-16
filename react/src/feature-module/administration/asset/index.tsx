import React, { useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import { useSocket } from "../../../SocketContext";
import CommonSelect from "../../../core/common/commonSelect";
import { status } from "../../../core/common/selectoption/selectoption";
import { Link } from "react-router-dom";
import { all_routes } from "../../router/all_routes";
import { DatePicker } from "antd";
import PredefinedDateRanges from "../../../core/common/datePicker";
import Table from "../../../core/common/dataTable/index";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import CollapseHeader from "../../../core/common/collapse-header/collapse-header";
import { Modal } from "bootstrap";
import dayjs from "dayjs";

type Asset = {
  _id: string;
  assetName: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar?: string;
  purchaseDate?: string;
  warrantyMonths?: number;
  warrantyEndDate?: string;
  status: string;
  serialNumber?: string;
  purchaseFrom?: string;
  manufacture?: string;
  model?: string;
  createdAt: string;
  updatedAt?: string;
};



const Assets = () => {
  const socket = useSocket() as Socket | null;
  const [newAsset, setNewAsset] = useState<Partial<Asset>>({});
  const [selectedStatus, setSelectedStatus] = useState("All"); // Default to "All"
  const [selectedSort, setSelectedSort] = useState("purchase_desc"); // Default sort


  const [data, setData] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
const [employees, setEmployees] = useState<
  { _id: string; firstName: string; lastName: string; avatar?: string }[]
>([]);

  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [editForm, setEditForm] = useState<Partial<Asset>>({});
  const [assetToDelete, setAssetToDelete] = useState<string | null>(null);

  const getModalContainer = () => {
    const modalElement = document.getElementById("modal-datepicker");
    return modalElement ? modalElement : document.body;
  };

  const columns = [
    {
      title: "Asset Name",
      dataIndex: "assetName",
      render: (text: string) => <h6 className="fs-14 fw-medium">{text}</h6>,
      sorter: (a: any, b: any) => a.assetName.length - b.assetName.length,
    },
    {
      title: "Asset User",
      dataIndex: "employeeName",
      render: (text: string, record: any) => (
        <div className="d-flex align-items-center file-name-icon">
          <Link to="#" className="avatar avatar-md border avatar-rounded">
            <ImageWithBasePath
              src={record.employeeAvatar}
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
      sorter: (a: any, b: any) => a.employeeName.length - b.employeeName.length,
    },
    {
      title: "Purchase Date",
      dataIndex: "purchaseDate",
      sorter: (a: any, b: any) =>
        (a.purchaseDate || "").length - (b.purchaseDate || "").length,
    },
    {
      title: "Warrenty",
      dataIndex: "warrantyMonths",
      sorter: (a: any, b: any) =>
      (a.warrantyMonths || 0) - (b.warrantyMonths || 0),

    },
    {
      title: "Warrenty End Date",
      dataIndex: "warrantyEndDate",
      sorter: (a: any, b: any) =>
      (a.warrantyEndDate || "").length - (b.warrantyEndDate || "").length,

    },
    {
      title: "Status",
      dataIndex: "status",
      render: (text: string) => (
       <span
          className={`badge d-inline-flex align-items-center badge-xs ${
            text.toLowerCase() === "active"
              ? "badge-success"
              : text.toLowerCase() === "inactive"
              ? "badge-danger"
              : "badge-warning"
          }`}
>
  <i className="ti ti-point-filled me-1"></i>
  {text}
</span>

      ),
      sorter: (a: any, b: any) => a.status.length - b.status.length,
    },
    {
      title: "Actions",
      dataIndex: "actions",
      render: (_: any, record: Asset) => (
        <div className="action-icon d-inline-flex">
          <Link
            to="#"
            className="me-2"
            data-bs-toggle="modal"
            data-bs-target="#edit_assets"
            onClick={() => {
              console.log("🟡 Edit Clicked - Asset Record:", record);
              console.log("🟡 Record EmployeeId:", record.employeeId);
              console.log("🟡 Employees List at Click:", employees);
              console.log("Edit clicked - record:", record);
              setEditingAsset(record);
              setEditForm({
                ...record,
                employeeId: record.employeeId?.trim() || "",
              });
            }}

          >
            <i className="ti ti-edit" />
          </Link>

          <Link
            to="#"
            data-bs-toggle="modal"
            data-bs-target="#delete_modal"
            onClick={() => setAssetToDelete(record._id)}
          >
            <i className="ti ti-trash" />
          </Link>
        </div>
      ),
    },
  ];

  const SORT_MAPPING: Record<string, string> = {
  recently_added: "createdAt_desc",
  asc: "assetName_asc",
  desc: "assetName_desc",
  last_month: "purchaseDate_last_month",
  last_7_days: "purchaseDate_last_7_days",
};

const fetchAssets = (statusFilter = selectedStatus, sortOption = selectedSort) => {
  if (!socket) return;
  setLoading(true);

  socket.emit("admin/assets/get", {
    page: 1,
    pageSize: 10,
    sortBy: SORT_MAPPING[sortOption] || "createdAt_desc",
    filters: {
      status: statusFilter !== "All" ? statusFilter : undefined,
      search: "",
      purchaseDate: { from: null, to: null },
      assetUser: ""
    }
  });
};


useEffect(() => {
  if (!socket) return;
  fetchAssets();
}, [socket]);


useEffect(() => {
  if (!socket) return;

  socket.emit("admin/employees/get-list");
  const handler = (res: any) => {
    if (res.done) setEmployees(res.data || []);
  };
  socket.on("admin/employees/get-list-response", handler);

  return () => {
    socket.off("admin/employees/get-list-response", handler);
  };
}, [socket]);


useEffect(() => {
  if (!socket) return;
  // Normalize mapping so frontend always gets clean Asset[]
 const mapAssets = (assets: any[] = []): Asset[] =>
  
  assets.map((asset) => {
    console.log("🟢 mapAssets received:", assets);
    const employee = employees.find(emp => emp._id === asset.employeeId);

    console.log("🔵 Mapping Asset:", asset.assetName);
    console.log("🔵 Backend employeeId:", asset.employeeId);
    console.log("🔵 Matched Employee:", employee);

    return {
      _id: asset._id || asset.id || "",
      assetName: asset.assetName,
      employeeId: asset.employeeId || "",  // ✅ always have a string fallback
      employeeName: employee 
        ? `${employee.firstName} ${employee.lastName}` 
        : asset.employeeName || "",
      employeeAvatar: asset.employeeAvatar || employee?.avatar || "",
      purchaseDate: asset.purchaseDate,
      warrantyMonths: asset.warrantyMonths,
      warrantyEndDate: asset.warrantyEndDate,
      serialNumber: asset.serialNumber,
      purchaseFrom: asset.purchaseFrom,
      manufacture: asset.manufacture,
      model: asset.model,
      status: asset.status,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
    };
  });





  // Handle initial GET
  const handleGetResponse = (res: {
    done: boolean;
    data?: any[];
    error?: string;
  }) => {
    if (res.done) {
      setData(mapAssets(Array.isArray(res.data) ? res.data : []));
      setError(null);
    } else {
      setError(res.error || "Failed to fetch assets.");
    }
    setLoading(false);
  };

  // Handle list update (backend sends plain list, not wrapped in { done })
  const handleListUpdate = (assets: any[]) => {
     setData(mapAssets(Array.isArray(assets) ? assets : []));
  };

  socket.on("admin/assets/get-response", handleGetResponse);
  socket.on("admin/assets/list-update", handleListUpdate);

  return () => {
    socket.off("admin/assets/get-response", handleGetResponse);
    socket.off("admin/assets/list-update", handleListUpdate);
  };
}, [socket]);


  // ===== CRUD =====
const handleAddAsset = (newAsset: Partial<Asset>) => {
  if (!socket) return;
  console.log("🔴 Submit - editForm.employeeId:", editForm.employeeId);
console.log("🔴 Submit - Employees List:", employees);
  const selectedEmployee = employees.find(emp => emp._id === newAsset.employeeId);
  console.log("🔴 Submit - Selected Employee:", selectedEmployee);

  if (!selectedEmployee) {
    alert("Please select an employee before saving");
    return;
  }

  socket.emit("admin/assets/create", {
    asset: { 
      assetName: newAsset.assetName,
      serialNumber: newAsset.serialNumber,
      purchaseFrom: newAsset.purchaseFrom,
      manufacture: newAsset.manufacture,
      model: newAsset.model,
      purchaseDate: newAsset.purchaseDate,
      warrantyMonths: newAsset.warrantyMonths,
      status: newAsset.status?.toLowerCase(),

      // ✅ Include employee details here
      employeeId: selectedEmployee._id,
      employeeName: `${selectedEmployee.firstName} ${selectedEmployee.lastName}`,
      employeeAvatar: selectedEmployee.avatar || null,
    },
  });
};


useEffect(() => {
  if (!socket) return;
  socket.on("admin/assets/create-response", (res) => {
    console.log("CREATE RESPONSE:", res);
  });
  socket.on("admin/assets/update-response", (res) => {
    console.log("UPDATE RESPONSE:", res);
  });
}, [socket]);



const handleUpdateSubmit = (e: React.FormEvent) => {
  e.preventDefault(); // ✅ Prevent default form submit

  if (!socket || !editForm._id) {
  alert("No asset selected for update!");
  return;
}

if (!editForm.employeeId || editForm.employeeId.trim() === "") {
  alert("Please select an Asset User before saving!");
  return;
}


const selectedEmployee = employees.find(emp => emp._id === editForm.employeeId);

  socket.emit("admin/assets/update", {
    assetId: editForm._id, // ✅ must be correct
    updateData: {
      assetName: editForm.assetName,
      serialNumber: editForm.serialNumber,
      purchaseFrom: editForm.purchaseFrom,
      manufacture: editForm.manufacture,
      model: editForm.model,
      purchaseDate: editForm.purchaseDate,
      warrantyMonths: editForm.warrantyMonths,
      status: editForm.status?.toLowerCase(),

      // ✅ include employee details here
      employeeId: selectedEmployee?._id,
      employeeName: selectedEmployee
        ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}`
        : "",
      employeeAvatar: selectedEmployee?.avatar || "",
    },
  });
};




  const confirmDelete = () => {
    if (!socket || !assetToDelete) return;
    socket.emit("admin/assets/delete", { assetId: assetToDelete });
    setAssetToDelete(null);
  };

  return (
    <>
      {/* Page Wrapper */}
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Assets</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={all_routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">Administration</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Assets
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
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
                  data-bs-target="#add_assets"
                  className="btn btn-primary d-flex align-items-center"
                >
                  <i className="ti ti-circle-plus me-2" />
                  Add New Asset
                </Link>
              </div>
              <div className="ms-2 head-icons">
                <CollapseHeader />
              </div>
            </div>
          </div>
          {/* /Breadcrumb */}
          {/* Assets Lists */}
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
              <h5>Assets List</h5>
              <div className="d-flex my-xl-auto right-content align-items-center flex-wrap row-gap-3">
                <div className="me-3">
                  <div className="input-icon-end position-relative">
                    <PredefinedDateRanges />
                    <span className="input-icon-addon">
                      <i className="ti ti-chevron-down" />
                    </span>
                  </div>
                </div>
                <div className="dropdown me-3">
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    Status
                  </Link>
                  <ul className="dropdown-menu dropdown-menu-end p-3">
                    {["All", "active", "inactive"].map((statusOption) => (
                      <li key={statusOption}>
                        <Link
                          to="#"
                          className="dropdown-item rounded-1"
                          onClick={() => {
                            setSelectedStatus(statusOption);
                            fetchAssets(statusOption.toLowerCase(), selectedSort); // ✅ lowercase

                          }}
                        >
                          {statusOption}
                        </Link>
                      </li>
                    ))}
                  </ul>

                </div>
                <div className="dropdown">
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    Sort By : Last 7 Days
                  </Link>
                  <ul className="dropdown-menu dropdown-menu-end p-3">
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={() => {
                          setSelectedSort("recently_added");
                          fetchAssets(selectedStatus, "recently_added");
                        }}
                      >
                        Recently Added
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={() => {
                          setSelectedSort("asc");
                          fetchAssets(selectedStatus, "asc");
                        }}
                      >
                        Asset Name (A → Z)
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={() => {
                          setSelectedSort("desc");
                          fetchAssets(selectedStatus, "desc");
                        }}
                      >
                        Asset Name (Z → A)
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={() => {
                          setSelectedSort("last_month");
                          fetchAssets(selectedStatus, "last_month");
                        }}
                      >
                        Purchased Last Month
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={() => {
                          setSelectedSort("last_7_days");
                          fetchAssets(selectedStatus, "last_7_days");
                        }}
                      >
                        Purchased Last 7 Days
                      </Link>
                    </li>
                  </ul>


                </div>
              </div>
            </div>
            <div className="card-body p-0">
              <Table dataSource={data} columns={columns} Selection={true} />
            </div>
          </div>
        </div>
        
      </div>
      {/* /Page Wrapper */}
      {/* Add Assets */}
      <div className="modal fade" id="add_assets">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Add Asset</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddAsset(newAsset);
                setNewAsset({}); // reset after add
              }}
            >

              <div className="modal-body pb-0">
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Asset Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newAsset.assetName || ""}
                        onChange={(e) => setNewAsset({ ...newAsset, assetName: e.target.value })}

                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Purchased Date</label>
                      <div className="input-icon-end position-relative">
                        <DatePicker
                          className="form-control datetimepicker"
                          value={newAsset.purchaseDate ? dayjs(newAsset.purchaseDate) : null}
                            onChange={(date) =>
                            setNewAsset({
                              ...newAsset,
                              purchaseDate: date ? dayjs(date).toISOString() : undefined,
                            })
                          }


                          format="DD-MM-YYYY"
                          getPopupContainer={getModalContainer}
                          placeholder="DD-MM-YYYY"
                        />


                        <span className="input-icon-addon">
                          <i className="ti ti-calendar text-gray-7" />
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Purchase From</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newAsset.purchaseFrom || ""}
                        onChange={(e) => setNewAsset({ ...newAsset, purchaseFrom: e.target.value })}
                      />

                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Manufacture</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newAsset.manufacture || ""}
                        onChange={(e) => setNewAsset({ ...newAsset, manufacture: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Serial Number</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newAsset.serialNumber || ""}
                        onChange={(e) => setNewAsset({ ...newAsset, serialNumber: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3 ">
                      <label className="form-label">Model</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newAsset.model || ""}
                        onChange={(e) => setNewAsset({ ...newAsset, model: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Warranty (Months)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={newAsset.warrantyMonths || ""}
                        onChange={(e) =>
                          setNewAsset({ ...newAsset, warrantyMonths: parseInt(e.target.value, 10) })
                        }
                      />
                    </div>
                  </div>

                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Asset User</label>
                      <CommonSelect
                        options={employees.map((emp) => ({
                          value: emp._id,
                          label: `${emp.firstName} ${emp.lastName}`,
                        }))}
                        value={
                            employees
                              .map((emp) => ({
                                value: emp._id,
                                label: `${emp.firstName} ${emp.lastName}`,
                              }))
                              .find((opt) => opt.value === newAsset.employeeId) || null
                          }

                        onChange={(opt) => {
                          console.log(setEmployees);
                          if (opt) setNewAsset({ ...newAsset, employeeId: opt.value });
                        }}
                      />



                    </div>
                  </div>

                  <div className="col-md-12">
                    <div className="mb-3 ">
                      <label className="form-label">Status</label>
                      <CommonSelect
                        className="select"
                        options={status}
                        value={status.find((s) => s.value === newAsset.status) || null}
                        onChange={(opt) => {
                            if (opt) setNewAsset({ ...newAsset, status: opt.value });
                          }}   
                      />

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
                <button type="submit" className="btn btn-primary">
                  Add Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Add Assets */}
      {/* Edit Assets */}
<div className="modal fade" id="edit_assets">
  <div className="modal-dialog modal-dialog-centered modal-lg">
    <div className="modal-content">
      <div className="modal-header">
        <h4 className="modal-title">Edit Asset</h4>
        <button
          type="button"
          className="btn-close custom-btn-close"
          data-bs-dismiss="modal"
          aria-label="Close"
        >
          <i className="ti ti-x" />
        </button>
      </div>
      <form onSubmit={handleUpdateSubmit}>
        <div className="modal-body pb-0">
          <div className="row">
            {/* Asset Name */}
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label">Asset Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={editForm.assetName || ""}
                  onChange={(e) => setEditForm({ ...editForm, assetName: e.target.value })}
                />
              </div>
            </div>

            {/* Purchase Date */}
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label">Purchased Date</label>
                <div className="input-icon-end position-relative">
                  <DatePicker
                    className="form-control datetimepicker"
                    value={editForm.purchaseDate ? dayjs(editForm.purchaseDate) : null}
                    onChange={(date) =>
                      setEditForm({
                        ...editForm,
                        purchaseDate: date ? dayjs(date).toISOString() : undefined,
                      })
                    }

                    format="DD-MM-YYYY"
                    getPopupContainer={getModalContainer}
                    placeholder="DD-MM-YYYY"
                  />

                  <span className="input-icon-addon">
                    <i className="ti ti-calendar text-gray-7" />
                  </span>
                </div>
              </div>
            </div>

            {/* Purchase From */}
            <div className="col-md-12">
              <div className="mb-3">
                <label className="form-label">Purchase From</label>
                <input
                  type="text"
                  className="form-control"
                  value={editForm.purchaseFrom|| ""}
                  onChange={(e) => setEditForm({ ...editForm, purchaseFrom: e.target.value })}
                />
              </div>
            </div>

            {/* Manufacture */}
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label">Manufacture</label>
                <input
                  type="text"
                  className="form-control"
                  value={editForm.manufacture || ""}
                  onChange={(e) => setEditForm({ ...editForm, manufacture: e.target.value })}
                />
              </div>
            </div>

            {/* Serial Number */}
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label">Serial Number</label>
                <input
                  type="text"
                  className="form-control"
                  value={editForm.serialNumber || ""}
                  onChange={(e) => setEditForm({ ...editForm, serialNumber: e.target.value })}
                />
              </div>
            </div>

            {/* Model */}
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label">Model</label>
                <input
                  type="text"
                  className="form-control"
                  value={editForm.model || ""}
                  onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
                />
              </div>
            </div>

            {/* Warranty */}
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label">Warranty (Months)</label>
                <input
                  type="number"
                  className="form-control"
                  value={editForm.warrantyMonths || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, warrantyMonths: parseInt(e.target.value, 10) })
                  }
                />
              </div>
            </div>


            {/* Asset User */}
            <div className="col-md-12">
              <div className="mb-3">
                <label className="form-label">Asset User</label>
                <CommonSelect
                  options={employees.map((emp) => ({
                    value: emp._id,
                    label: `${emp.firstName} ${emp.lastName}`,
                  }))}
                  value={
                    employees
                      .map((emp) => ({
                        value: emp._id,
                        label: `${emp.firstName} ${emp.lastName}`,
                      }))
                      .find((opt) => opt.value === editForm.employeeId) || null
                  }


                  onChange={(opt) => {
                    console.log(employees);
                    if (opt) setEditForm({ ...editForm, employeeId: opt.value });
                  }}
                />



              </div>
            </div>


            {/* Status */}
            <div className="col-md-12">
              <div className="mb-3 ">
                <label className="form-label">Status</label>
                <CommonSelect
                  className="select"
                  options={status}
                  value={status.find((s) => s.value === editForm.status) || null}
                  onChange={(opt) => {
                    if (opt) setEditForm({ ...editForm, status: opt.value });
                  }}
                />
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
          <button type="submit" className="btn btn-primary">
            Save Asset
          </button>
        </div>
      </form>
    </div>
  </div>
</div>
{/* /Edit Assets */}

    </>
  );
};

export default Assets;
