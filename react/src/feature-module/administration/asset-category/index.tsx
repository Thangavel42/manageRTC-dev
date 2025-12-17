import React, { useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import { useSocket } from "../../../SocketContext";
import CommonSelect from "../../../core/common/commonSelect";
import { status } from "../../../core/common/selectoption/selectoption";
import { Link } from "react-router-dom";
import { all_routes } from "../../router/all_routes";
import PredefinedDateRanges from "../../../core/common/datePicker";
import Table from "../../../core/common/dataTable/index";
import CollapseHeader from "../../../core/common/collapse-header/collapse-header";
import { Modal } from "bootstrap";

type AssetCategory = {
  _id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
};

const AssetsCategory = () => {
  const socket = useSocket() as Socket | null;
  const [data, setData] = useState<AssetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [newCategory, setNewCategory] = useState<Partial<AssetCategory>>({});
  const [editingCategory, setEditingCategory] = useState<AssetCategory | null>(null);
  const [editForm, setEditForm] = useState<Partial<AssetCategory>>({});
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  // Filter states
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedSort, setSelectedSort] = useState("name_asc");

  const columns = [
    {
      title: "Category Name",
      dataIndex: "name",
      render: (text: string) => <h6 className="fs-14 fw-medium">{text}</h6>,
      sorter: (a: any, b: any) => a.name.length - b.name.length,
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
      title: "",
      dataIndex: "actions",
      render: (_: any, record: AssetCategory) => (
        <div className="action-icon d-inline-flex">
          <Link
            to="#"
            className="me-2"
            data-bs-toggle="modal"
            data-bs-target="#edit_assets"
            onClick={() => {
              setEditingCategory(record);
              setEditForm({ ...record });
            }}
          >
            <i className="ti ti-edit" />
          </Link>
          <Link
            to="#"
            data-bs-toggle="modal"
            data-bs-target="#delete_modal"
            onClick={() => setCategoryToDelete(record._id)}
          >
            <i className="ti ti-trash" />
          </Link>
        </div>
      ),
    },
  ];

  const SORT_MAPPING: Record<string, string> = {
    recently_added: "createdAt_desc",
    name_asc: "name_asc",
    name_desc: "name_desc",
  };

  const fetchCategories = (statusFilter = selectedStatus, sortOption = selectedSort) => {
    if (!socket) return;
    setLoading(true);

    socket.emit("admin/asset-categories/get", {
      page: 1,
      pageSize: 100,
      sortBy: SORT_MAPPING[sortOption] || "name_asc",
      filters: {
        status: statusFilter !== "All" ? statusFilter : undefined,
        search: "",
      },
    });
  };

  // Initial fetch
  useEffect(() => {
    if (!socket) return;
    fetchCategories();
  }, [socket]);

  // Handle socket responses
  useEffect(() => {
    if (!socket) return;

    const handleGetResponse = (res: {
      done: boolean;
      data?: AssetCategory[];
      error?: string;
    }) => {
      if (res.done) {
        setData(res.data || []);
        setError(null);
      } else {
        setError(res.error || "Failed to fetch categories.");
      }
      setLoading(false);
    };

    const handleListUpdate = (res: { done: boolean; data?: AssetCategory[] }) => {
      if (res.done && res.data) {
        setData(res.data);
      }
    };

    socket.on("admin/asset-categories/get-response", handleGetResponse);
    socket.on("admin/asset-categories/list-update", handleListUpdate);

    return () => {
      socket.off("admin/asset-categories/get-response", handleGetResponse);
      socket.off("admin/asset-categories/list-update", handleListUpdate);
    };
  }, [socket]);

  // Handle create/update/delete responses
  useEffect(() => {
    if (!socket) return;

    const handleCreateResponse = (res: any) => {
      if (res.done) {
        const modal = document.getElementById("add_assets");
        if (modal) {
          const modalInstance = Modal.getInstance(modal) || new Modal(modal);
          modalInstance.hide();
        }
        setNewCategory({});
      } else {
        alert(res.error || "Failed to create category");
      }
    };

    const handleUpdateResponse = (res: any) => {
      if (res.done) {
        const modal = document.getElementById("edit_assets");
        if (modal) {
          const modalInstance = Modal.getInstance(modal) || new Modal(modal);
          modalInstance.hide();
        }
        setEditingCategory(null);
        setEditForm({});
      } else {
        alert(res.error || "Failed to update category");
      }
    };

    const handleDeleteResponse = (res: any) => {
      if (!res.done) {
        alert(res.error || "Failed to delete category");
      }
    };

    socket.on("admin/asset-categories/create-response", handleCreateResponse);
    socket.on("admin/asset-categories/update-response", handleUpdateResponse);
    socket.on("admin/asset-categories/delete-response", handleDeleteResponse);

    return () => {
      socket.off("admin/asset-categories/create-response", handleCreateResponse);
      socket.off("admin/asset-categories/update-response", handleUpdateResponse);
      socket.off("admin/asset-categories/delete-response", handleDeleteResponse);
    };
  }, [socket]);

  // CRUD operations
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket) return;

    if (!newCategory.name?.trim()) {
      alert("Please enter a category name");
      return;
    }

    socket.emit("admin/asset-categories/create", {
      name: newCategory.name,
      status: newCategory.status?.toLowerCase() || "active",
    });
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !editForm._id) return;

    if (!editForm.name?.trim()) {
      alert("Please enter a category name");
      return;
    }

    socket.emit("admin/asset-categories/update", {
      categoryId: editForm._id,
      updateData: {
        name: editForm.name,
        status: editForm.status?.toLowerCase() || "active",
      },
    });
  };

  const confirmDelete = () => {
    if (!socket || !categoryToDelete) return;
    socket.emit("admin/asset-categories/delete", { categoryId: categoryToDelete });
    setCategoryToDelete(null);

    const modal = document.getElementById("delete_modal");
    if (modal) {
      const modalInstance = Modal.getInstance(modal) || new Modal(modal);
      modalInstance.hide();
    }
  };

  const resetAddForm = () => {
    setNewCategory({});
  };

  const resetEditForm = () => {
    setEditingCategory(null);
    setEditForm({});
  };

  return (
    <>
      {/* Page Wrapper */}
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Asset Category</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={all_routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">Administration</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Asset Category
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
                  data-bs-target="#add_assets"
                  className="btn btn-primary d-flex align-items-center"
                >
                  <i className="ti ti-circle-plus me-2" />
                  Add New Category
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
              <h5>Asset Category List</h5>
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
                  <ul className="dropdown-menu  dropdown-menu-end p-3">
                    {["All", "active", "inactive"].map((statusOption) => (
                      <li key={statusOption}>
                        <Link
                          to="#"
                          className="dropdown-item rounded-1"
                          onClick={() => {
                            setSelectedStatus(statusOption);
                            fetchCategories(statusOption, selectedSort);
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
                    Sort By : Name (A → Z)
                  </Link>
                  <ul className="dropdown-menu  dropdown-menu-end p-3">
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={() => {
                          setSelectedSort("recently_added");
                          fetchCategories(selectedStatus, "recently_added");
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
                          setSelectedSort("name_asc");
                          fetchCategories(selectedStatus, "name_asc");
                        }}
                      >
                        Name (A → Z)
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={() => {
                          setSelectedSort("name_desc");
                          fetchCategories(selectedStatus, "name_desc");
                        }}
                      >
                        Name (Z → A)
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

      {/* Add Category Modal */}
      <div className="modal fade" id="add_assets">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Add Category</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={resetAddForm}
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form onSubmit={handleAddCategory}>
              <div className="modal-body pb-0">
                <div className="row">
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Category Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={newCategory.name || ""}
                        onChange={(e) =>
                          setNewCategory({ ...newCategory, name: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3 ">
                      <label className="form-label">Status</label>
                      <CommonSelect
                        className="select"
                        options={status}
                        value={
                          status.find((s) => s.value === newCategory.status) || null
                        }
                        onChange={(opt) => {
                          if (opt) setNewCategory({ ...newCategory, status: opt.value });
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
                  onClick={resetAddForm}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Category
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Add Category Modal */}

      {/* Edit Category Modal */}
      <div className="modal fade" id="edit_assets">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Edit Category</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={resetEditForm}
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form onSubmit={handleUpdateSubmit}>
              <div className="modal-body pb-0">
                <div className="row">
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Category Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={editForm.name || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, name: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>
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
                  onClick={resetEditForm}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Edit Category Modal */}

      {/* Delete Modal */}
      <div className="modal fade" id="delete_modal">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Delete Category</h4>
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
              <p>
                Are you sure you want to delete this category? This action cannot be
                undone.
              </p>
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

export default AssetsCategory;
