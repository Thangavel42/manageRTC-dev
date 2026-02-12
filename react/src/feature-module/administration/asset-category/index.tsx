import { Modal } from 'bootstrap';
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import CollapseHeader from '../../../core/common/collapse-header/collapse-header';
import CommonSelect from '../../../core/common/commonSelect';
import Table from '../../../core/common/dataTable/index';
import PredefinedDateRanges from '../../../core/common/datePicker';
import { status } from '../../../core/common/selectoption/selectoption';
import { AssetCategory, useAssetCategoriesREST } from '../../../hooks/useAssetCategoriesREST';
import { all_routes } from '../../router/all_routes';

const AssetsCategory = () => {
  const {
    categories,
    loading,
    error,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useAssetCategoriesREST();

  // Form states
  const [newCategory, setNewCategory] = useState<Partial<AssetCategory>>({});
  const [editingCategory, setEditingCategory] = useState<AssetCategory | null>(null);
  const [editForm, setEditForm] = useState<Partial<AssetCategory>>({});
  const [categoryToDelete, setCategoryToDelete] = useState<AssetCategory | null>(null);
  const [confirmCategoryName, setConfirmCategoryName] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Filter states
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedSort, setSelectedSort] = useState('name_asc');

  const columns = [
    {
      title: 'Category Name',
      dataIndex: 'name',
      render: (text: string) => <h6 className="fs-14 fw-medium">{text}</h6>,
      sorter: (a: any, b: any) => a.name.length - b.name.length,
    },
    {
      title: 'Assets Count',
      dataIndex: 'assetsCount',
      render: (count: number) => <span className="badge badge-soft-primary">{count || 0}</span>,
      sorter: (a: any, b: any) => (a.assetsCount || 0) - (b.assetsCount || 0),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (text: string) => (
        <span
          className={`badge d-inline-flex align-items-center badge-xs ${
            text.toLowerCase() === 'active'
              ? 'badge-success'
              : text.toLowerCase() === 'inactive'
                ? 'badge-danger'
                : 'badge-warning'
          }`}
        >
          <i className="ti ti-point-filled me-1"></i>
          {text}
        </span>
      ),
      sorter: (a: any, b: any) => a.status.length - b.status.length,
    },
    {
      title: '',
      dataIndex: 'actions',
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
            onClick={() => {
              setCategoryToDelete(record);
              setConfirmCategoryName('');
            }}
          >
            <i className="ti ti-trash" />
          </Link>
        </div>
      ),
    },
  ];

  const SORT_MAPPING: Record<string, string> = {
    recently_added: 'createdAt_desc',
    name_asc: 'name_asc',
    name_desc: 'name_desc',
  };

  // Validation function
  const validateCategoryField = useCallback((fieldName: string, value: any): string => {
    switch (fieldName) {
      case 'name':
        if (!value || !value.trim()) return 'Category name is required';
        break;
    }
    return '';
  }, []);

  const clearFieldError = useCallback((fieldName: string) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  }, []);

  const loadCategories = async (statusFilter = selectedStatus, sortOption = selectedSort) => {
    await fetchCategories({
      page: 1,
      pageSize: 100,
      sortBy: SORT_MAPPING[sortOption] || 'name_asc',
      status: statusFilter !== 'All' ? statusFilter : undefined,
    });
  };

  // Initial fetch
  useEffect(() => {
    loadCategories();
  }, []);

  // CRUD operations
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameError = validateCategoryField('name', newCategory.name);
    if (nameError) {
      setFieldErrors({ name: nameError });
      toast.error(nameError);
      return;
    }

    setFieldErrors({});

    const success = await createCategory({
      name: newCategory.name!,
      status: newCategory.status?.toLowerCase() || 'active',
    });

    if (success) {
      toast.success('Category created successfully!');
      const modal = document.getElementById('add_assets');
      if (modal) {
        const modalInstance = Modal.getInstance(modal) || new Modal(modal);
        modalInstance.hide();
      }
      setNewCategory({});
      setFieldErrors({});
      loadCategories();
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editForm._id) return;

    const nameError = validateCategoryField('name', editForm.name);
    if (nameError) {
      setFieldErrors({ name: nameError });
      toast.error(nameError);
      return;
    }

    setFieldErrors({});

    const success = await updateCategory(editForm._id, {
      name: editForm.name!,
      status: editForm.status?.toLowerCase() || 'active',
    });

    if (success) {
      toast.success('Category updated successfully!');
      const modal = document.getElementById('edit_assets');
      if (modal) {
        const modalInstance = Modal.getInstance(modal) || new Modal(modal);
        modalInstance.hide();
      }
      setEditingCategory(null);
      setEditForm({});
      setFieldErrors({});
      loadCategories();
    }
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;

    const success = await deleteCategory(categoryToDelete._id);

    if (success) {
      toast.success('Category deleted successfully!');
      setCategoryToDelete(null);
      setConfirmCategoryName('');
      const modal = document.getElementById('delete_modal');
      if (modal) {
        const modalInstance = Modal.getInstance(modal) || new Modal(modal);
        modalInstance.hide();
      }
      loadCategories();
    }
  };

  const resetAddForm = () => {
    setNewCategory({});
    setFieldErrors({});
  };

  const resetEditForm = () => {
    setEditingCategory(null);
    setEditForm({});
    setFieldErrors({});
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
                        Export as Excel{' '}
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
                    {['All', 'active', 'inactive'].map((statusOption) => (
                      <li key={statusOption}>
                        <Link
                          to="#"
                          className="dropdown-item rounded-1"
                          onClick={() => {
                            setSelectedStatus(statusOption);
                            loadCategories(statusOption, selectedSort);
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
                          setSelectedSort('recently_added');
                          loadCategories(selectedStatus, 'recently_added');
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
                          setSelectedSort('name_asc');
                          loadCategories(selectedStatus, 'name_asc');
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
                          setSelectedSort('name_desc');
                          loadCategories(selectedStatus, 'name_desc');
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
              <Table dataSource={categories} columns={columns} Selection={true} />
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
                        className={`form-control ${fieldErrors.name ? 'is-invalid' : ''}`}
                        value={newCategory.name || ''}
                        onChange={(e) => {
                          setNewCategory({ ...newCategory, name: e.target.value });
                          clearFieldError('name');
                        }}
                      />
                      {fieldErrors.name && (
                        <div className="invalid-feedback d-block">{fieldErrors.name}</div>
                      )}
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3 ">
                      <label className="form-label">Status</label>
                      <CommonSelect
                        className="select"
                        options={status}
                        value={status.find((s) => s.value === newCategory.status) || null}
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
                        className={`form-control ${fieldErrors.name ? 'is-invalid' : ''}`}
                        value={editForm.name || ''}
                        onChange={(e) => {
                          setEditForm({ ...editForm, name: e.target.value });
                          clearFieldError('name');
                        }}
                      />
                      {fieldErrors.name && (
                        <div className="invalid-feedback d-block">{fieldErrors.name}</div>
                      )}
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
        <div className="modal-dialog modal-dialog-centered modal-sm">
          <div className="modal-content">
            <div className="modal-body">
              <div className="text-center p-3">
                <span className="avatar avatar-lg avatar-rounded bg-danger mb-3">
                  <i className="ti ti-trash fs-24" />
                </span>
                <h5 className="mb-2">Delete Category</h5>
                {categoryToDelete && (
                  <>
                    <div className="bg-light p-3 rounded mb-3">
                      <h6 className="mb-1">{categoryToDelete.name}</h6>
                      <p className="mb-1 text-muted">
                        Assets: <strong>{categoryToDelete.assetsCount || 0}</strong>
                      </p>
                      <p className="mb-0 text-muted">
                        Status:{' '}
                        <span
                          className={`badge badge-xs ${
                            categoryToDelete.status?.toLowerCase() === 'active'
                              ? 'badge-success'
                              : 'badge-danger'
                          }`}
                        >
                          {categoryToDelete.status}
                        </span>
                      </p>
                    </div>
                    <div className="text-start mb-3">
                      <p className="text-danger fw-medium mb-2" style={{ fontSize: '13px' }}>
                        This action is permanent. All assets in this category will lose their
                        category reference.
                      </p>
                      <label className="form-label text-muted" style={{ fontSize: '13px' }}>
                        Type <strong>{categoryToDelete.name}</strong> to confirm deletion:
                      </label>
                      <input
                        type="text"
                        className={`form-control form-control-sm ${
                          confirmCategoryName &&
                          confirmCategoryName.trim().toLowerCase() !==
                            categoryToDelete.name.trim().toLowerCase()
                            ? 'is-invalid'
                            : ''
                        } ${
                          confirmCategoryName.trim().toLowerCase() ===
                          categoryToDelete.name.trim().toLowerCase()
                            ? 'is-valid'
                            : ''
                        }`}
                        placeholder={`Type "${categoryToDelete.name}" to confirm`}
                        value={confirmCategoryName}
                        onChange={(e) => setConfirmCategoryName(e.target.value)}
                        autoComplete="off"
                      />
                      {confirmCategoryName &&
                        confirmCategoryName.trim().toLowerCase() !==
                          categoryToDelete.name.trim().toLowerCase() && (
                          <div className="invalid-feedback">Name does not match</div>
                        )}
                    </div>
                  </>
                )}
                <div className="d-flex justify-content-center gap-2">
                  <button
                    type="button"
                    className="btn btn-light"
                    data-bs-dismiss="modal"
                    onClick={() => {
                      setCategoryToDelete(null);
                      setConfirmCategoryName('');
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={confirmDelete}
                    disabled={
                      !categoryToDelete ||
                      confirmCategoryName.trim().toLowerCase() !==
                        categoryToDelete.name.trim().toLowerCase()
                    }
                  >
                    Delete Category
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* /Delete Modal */}
    </>
  );
};

export default AssetsCategory;
