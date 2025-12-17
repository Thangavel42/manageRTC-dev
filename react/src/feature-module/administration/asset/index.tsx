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
  { _id: string; employeeId?: string; firstName: string; lastName: string; avatar?: string }[]
>([]);

  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [editForm, setEditForm] = useState<Partial<Asset>>({});
  const [assetToDelete, setAssetToDelete] = useState<string | null>(null);

  const getModalContainer = () => {
    const modalElement = document.getElementById("modal-datepicker");
    return modalElement ? modalElement : document.body;
  };

  // Format employees for select dropdown with ID
  const getEmployeeOptions = () => {
    return employees.map((emp) => ({
      value: emp._id,
      label: `${emp.firstName} ${emp.lastName} ${emp.employeeId ? `(EmpID: ${emp.employeeId})` : `(ID: ${emp._id.slice(-6)})`}`,
    }));
  };

  // Check if employees are loaded
  const employeesLoaded = employees.length > 0;

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
      render: (text: string, record: any) => {
        const employee = employees.find(emp => emp._id === record.employeeId);
        const employeeDisplayId = employee?.employeeId || record.employeeId?.slice(-6) || "";
        const avatarSrc = employee?.avatar || record.employeeAvatar || "assets/img/favicon.png";
        
        return (
          <div className="d-flex align-items-center">
            <Link to="#" className="avatar avatar-md">
              <img
                src={avatarSrc}
                className="img-fluid rounded-circle"
                alt="img"
              />
            </Link>
            <div className="ms-2">
              <h6 className="fw-medium mb-0">
                <Link to="#">{text}</Link>
              </h6>
              <small className="text-muted">ID: {employeeDisplayId}</small>
            </div>
          </div>
        );
      },
      sorter: (a: any, b: any) => a.employeeName.length - b.employeeName.length,
    },
    {
      title: "Purchase Date",
      dataIndex: "purchaseDate",
      render: (text: string) => text ? dayjs(text).format("DD-MM-YYYY") : "-",
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
      render: (text: string) => text ? dayjs(text).format("DD-MM-YYYY") : "-",
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
          }`}>
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
  if (!socket) {
    console.log("⚠️ Socket not available for employee list request");
    return;
  }

  console.log("📤 Requesting employee list...");
  socket.emit("admin/employees/get-list");
  
  const handler = (res: any) => {
    console.log("📥 Employee list response:", res);
    if (res.done) {
      console.log("✅ Loaded employees:", res.data?.length || 0);
      setEmployees(res.data || []);
    } else {
      console.error("❌ Failed to load employees:", res.error);
      setEmployees([]);
    }
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
    const employee = employees.find(emp => emp._id === asset.employeeId);

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

  // Handle list update - backend sends same format as GET response
  const handleListUpdate = (res: { done: boolean; data?: any[] }) => {
    if (res.done && res.data) {
      setData(mapAssets(Array.isArray(res.data) ? res.data : []));
    }
  };

  socket.on("admin/assets/get-response", handleGetResponse);
  socket.on("admin/assets/list-update", handleListUpdate);

  return () => {
    socket.off("admin/assets/get-response", handleGetResponse);
    socket.off("admin/assets/list-update", handleListUpdate);
  };
}, [socket, employees]);


  // ===== CRUD =====
const handleAddAsset = (newAsset: Partial<Asset>) => {
  if (!socket) return;
  
  // Validation
  if (!newAsset.assetName?.trim()) {
    alert("Please enter an asset name");
    return;
  }

  if (!newAsset.employeeId) {
    alert("Please select an employee");
    return;
  }

  const selectedEmployee = employees.find(emp => emp._id === newAsset.employeeId);

  if (!selectedEmployee) {
    alert("Please select a valid employee");
    return;
  }

  // Backend expects: { employeeId, asset: {...fields} }
  socket.emit("admin/assets/create", {
    employeeId: selectedEmployee._id,
    asset: { 
      assetName: newAsset.assetName,
      serialNumber: newAsset.serialNumber,
      purchaseFrom: newAsset.purchaseFrom,
      manufacture: newAsset.manufacture,
      model: newAsset.model,
      purchaseDate: newAsset.purchaseDate,
      warrantyMonths: newAsset.warrantyMonths,
      status: newAsset.status?.toLowerCase() || "active",
    },
  });
};


useEffect(() => {
  if (!socket) return;
  
  const handleCreateResponse = (res: any) => {
    if (res.done) {
      // Close modal
      const modal = document.getElementById("add_assets");
      if (modal) {
        const modalInstance = Modal.getInstance(modal) || new Modal(modal);
        modalInstance.hide();
      }
      // Reset form
      setNewAsset({});
    } else {
      alert(res.error || "Failed to create asset");
    }
  };

  const handleUpdateResponse = (res: any) => {
    if (res.done) {
      // Close modal
      const modal = document.getElementById("edit_assets");
      if (modal) {
        const modalInstance = Modal.getInstance(modal) || new Modal(modal);
        modalInstance.hide();
      }
      // Reset form
      setEditingAsset(null);
      setEditForm({});
    } else {
      alert(res.error || "Failed to update asset");
    }
  };

  socket.on("admin/assets/create-response", handleCreateResponse);
  socket.on("admin/assets/update-response", handleUpdateResponse);

  return () => {
    socket.off("admin/assets/create-response", handleCreateResponse);
    socket.off("admin/assets/update-response", handleUpdateResponse);
  };
}, [socket]);



const handleUpdateSubmit = (e: React.FormEvent) => {
  e.preventDefault();

  if (!socket || !editForm._id) {
    alert("No asset selected for update!");
    return;
  }

  if (!editForm.assetName?.trim()) {
    alert("Please enter an asset name");
    return;
  }

  if (!editForm.employeeId || editForm.employeeId.trim() === "") {
    alert("Please select an Asset User before saving!");
    return;
  }

  socket.emit("admin/assets/update", {
    assetId: editForm._id,
    updateData: {
      assetName: editForm.assetName,
      serialNumber: editForm.serialNumber,
      purchaseFrom: editForm.purchaseFrom,
      manufacture: editForm.manufacture,
      model: editForm.model,
      purchaseDate: editForm.purchaseDate,
      warrantyMonths: editForm.warrantyMonths,
      status: editForm.status?.toLowerCase() || "active",
      employeeId: editForm.employeeId, // Backend handles employee transfer
    },
  });
};




  const confirmDelete = () => {
    if (!socket || !assetToDelete) return;
    socket.emit("admin/assets/delete", { assetId: assetToDelete });
    setAssetToDelete(null);
    
    // Close modal
    const modal = document.getElementById("delete_modal");
    if (modal) {
      const modalInstance = Modal.getInstance(modal) || new Modal(modal);
      modalInstance.hide();
    }
  };

  // Handle delete response
  useEffect(() => {
    if (!socket) return;
    
    const handleDeleteResponse = (res: any) => {
      if (!res.done) {
        alert(res.error || "Failed to delete asset");
      }
    };

    socket.on("admin/assets/delete-response", handleDeleteResponse);
    return () => {
      socket.off("admin/assets/delete-response", handleDeleteResponse);
    };
  }, [socket]);

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
                onClick={() => setNewAsset({})}
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddAsset(newAsset);
              }}
            >

              <div className="modal-body pb-0">
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Asset Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        value={newAsset.assetName || ""}
                        onChange={(e) => setNewAsset({ ...newAsset, assetName: e.target.value })}
                        required
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
                      <label className="form-label">
                        Asset User <span className="text-danger">*</span> {employees.length > 0 && <span className="text-muted">({employees.length} available)</span>}
                      </label>
                      <CommonSelect
                        options={getEmployeeOptions()}
                        value={getEmployeeOptions().find((opt) => opt.value === newAsset.employeeId) || null}
                        onChange={(opt) => {
                          if (opt) setNewAsset({ ...newAsset, employeeId: opt.value });
                        }}
                        isSearchable={true}
                        disabled={!employeesLoaded}
                      />
                      {!employeesLoaded && (
                        <small className="text-muted">Loading employees...</small>
                      )}
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
                  onClick={() => setNewAsset({})}
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
          onClick={() => {
            setEditingAsset(null);
            setEditForm({});
          }}
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
                <label className="form-label">Asset Name <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  value={editForm.assetName || ""}
                  onChange={(e) => setEditForm({ ...editForm, assetName: e.target.value })}
                  required
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
                <label className="form-label">
                  Asset User <span className="text-danger">*</span> {employees.length > 0 && <span className="text-muted">({employees.length} available)</span>}
                </label>
                <CommonSelect
                  options={getEmployeeOptions()}
                  value={getEmployeeOptions().find((opt) => opt.value === editForm.employeeId) || null}
                  onChange={(opt) => {
                    if (opt) setEditForm({ ...editForm, employeeId: opt.value });
                  }}
                  isSearchable={true}
                  disabled={!employeesLoaded}
                />
                {!employeesLoaded && (
                  <small className="text-muted">Loading employees...</small>
                )}
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
            onClick={() => {
              setEditingAsset(null);
              setEditForm({});
            }}
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

{/* Delete Modal */}
<div className="modal fade" id="delete_modal">
  <div className="modal-dialog modal-dialog-centered">
    <div className="modal-content">
      <div className="modal-header">
        <h4 className="modal-title">Delete Asset</h4>
        <button
          type="button"
          className="btn-close custom-btn-close"
          data-bs-dismiss="modal"
          aria-label="Close"
        >
          <i className="ti ti-x" />
        </button>
      </div>
      <div className="modal-body">
        <p>Are you sure you want to delete this asset? This action cannot be undone.</p>
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
          className="btn btn-danger"
          onClick={confirmDelete}
        >
          Delete
        </button>
      </div>
    </div>
  </div>
</div>
{/* /Delete Modal */}

    </>
  );
};

export default Assets;
