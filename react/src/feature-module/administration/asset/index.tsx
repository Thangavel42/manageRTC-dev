import { DatePicker } from 'antd';
import { Modal } from 'bootstrap';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Socket } from 'socket.io-client';
import { useSocket } from '../../../SocketContext';
import CollapseHeader from '../../../core/common/collapse-header/collapse-header';
import CommonSelect from '../../../core/common/commonSelect';
import Table from '../../../core/common/dataTable/index';
import PredefinedDateRanges from '../../../core/common/datePicker';
import { status } from '../../../core/common/selectoption/selectoption';
import { useAssetCategoriesREST } from '../../../hooks/useAssetCategoriesREST';
import { useAssetsREST } from '../../../hooks/useAssetsREST';
import { all_routes } from '../../router/all_routes';

type Asset = {
  _id: string;
  assetId?: string; // Generated unique asset ID (e.g., AST-2026-0001)
  assetName: string;
  assetCategory?: string;
  categoryId?: string;
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
  const { categories, fetchCategories } = useAssetCategoriesREST();
  const {
    assets: restAssets,
    loading: restLoading,
    fetchAssets: fetchAssetsREST,
    createAsset,
    updateAsset: updateAssetREST,
    deleteAsset: deleteAssetREST,
  } = useAssetsREST();
  const [newAsset, setNewAsset] = useState<Partial<Asset>>({ status: 'active' });
  const [selectedStatus, setSelectedStatus] = useState('All'); // Default to "All"
  const [selectedSort, setSelectedSort] = useState('purchase_desc'); // Default sort

  const [data, setData] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<
    { _id: string; employeeId?: string; firstName: string; lastName: string; avatar?: string }[]
  >([]);

  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [editForm, setEditForm] = useState<Partial<Asset>>({});
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [confirmAssetName, setConfirmAssetName] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const getModalContainer = () => {
    const modalElement = document.getElementById('modal-datepicker');
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
      title: 'Asset ID',
      dataIndex: 'assetId',
      render: (text: string) => <span className="fw-medium text-primary">{text || '-'}</span>,
      sorter: (a: any, b: any) => (a.assetId || '').localeCompare(b.assetId || ''),
    },
    {
      title: 'Asset Name',
      dataIndex: 'assetName',
      render: (text: string) => <h6 className="fs-14 fw-medium">{text}</h6>,
      sorter: (a: any, b: any) => a.assetName.length - b.assetName.length,
    },
    {
      title: 'Category',
      dataIndex: 'assetCategory',
      render: (text: string) => <span className="badge badge-soft-info">{text || 'N/A'}</span>,
      sorter: (a: any, b: any) => (a.assetCategory || '').localeCompare(b.assetCategory || ''),
    },
    {
      title: 'Asset User',
      dataIndex: 'employeeName',
      render: (text: string, record: any) => {
        // Handle "Not Assigned" case
        if (!text || text === 'Not Assigned' || !record.employeeId) {
          return (
            <div className="d-flex align-items-center">
              <h6 className="fw-medium mb-0 text-muted">Not Assigned</h6>
            </div>
          );
        }

        const employee = employees.find((emp) => emp._id === record.employeeId);
        const employeeDisplayId = employee?.employeeId || record.employeeId?.slice(-6) || '';
        const avatarSrc = employee?.avatar || record.employeeAvatar || 'assets/img/favicon.png';

        return (
          <div className="d-flex align-items-center">
            <Link to="#" className="avatar avatar-md">
              <img src={avatarSrc} className="img-fluid rounded-circle" alt="img" />
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
      title: 'Purchase Date',
      dataIndex: 'purchaseDate',
      render: (text: string) => (text ? dayjs(text).format('DD-MM-YYYY') : '-'),
      sorter: (a: any, b: any) => (a.purchaseDate || '').length - (b.purchaseDate || '').length,
    },
    {
      title: 'Warrenty',
      dataIndex: 'warrantyMonths',
      sorter: (a: any, b: any) => (a.warrantyMonths || 0) - (b.warrantyMonths || 0),
    },
    {
      title: 'Warrenty End Date',
      dataIndex: 'warrantyEndDate',
      render: (text: string) => (text ? dayjs(text).format('DD-MM-YYYY') : '-'),
      sorter: (a: any, b: any) =>
        (a.warrantyEndDate || '').length - (b.warrantyEndDate || '').length,
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
      title: 'Actions',
      dataIndex: 'actions',
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
                employeeId: record.employeeId?.trim() || '',
                categoryId: record.categoryId || record.assetCategory || '',
              });
            }}
          >
            <i className="ti ti-edit" />
          </Link>

          <Link
            to="#"
            data-bs-toggle="modal"
            data-bs-target="#delete_modal"
            onClick={() => {
              setAssetToDelete(record);
              setConfirmAssetName('');
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
    asc: 'assetName_asc',
    desc: 'assetName_desc',
    last_month: 'purchaseDate_last_month',
    last_7_days: 'purchaseDate_last_7_days',
  };

  const fetchAssets = async (statusFilter = selectedStatus, sortOption = selectedSort) => {
    setLoading(true);

    const sortMap: Record<string, { sortBy: string; order: 'asc' | 'desc' }> = {
      name_asc: { sortBy: 'name', order: 'asc' },
      name_desc: { sortBy: 'name', order: 'desc' },
      purchaseDate_asc: { sortBy: 'purchaseDate', order: 'asc' },
      purchaseDate_desc: { sortBy: 'purchaseDate', order: 'desc' },
      createdAt_asc: { sortBy: 'createdAt', order: 'asc' },
      createdAt_desc: { sortBy: 'createdAt', order: 'desc' },
      last_7_days: { sortBy: 'purchaseDate', order: 'desc' },
    };

    const sortConfig = sortMap[sortOption] || { sortBy: 'createdAt', order: 'desc' as 'desc' };

    console.log('🔄 Fetching assets with params:', {
      page: 1,
      pageSize: 100,
      sortBy: sortConfig.sortBy,
      order: sortConfig.order,
      status: statusFilter !== 'All' ? statusFilter : undefined,
    });

    await fetchAssetsREST({
      page: 1,
      pageSize: 100,
      sortBy: sortConfig.sortBy,
      order: sortConfig.order,
      status: statusFilter !== 'All' ? statusFilter : undefined,
    });

    setLoading(false);
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  // Sync REST assets to local state
  useEffect(() => {
    console.log('📊 REST Assets updated:', restAssets?.length || 0, 'assets');
    if (restAssets) {
      // Map REST Asset format to component Asset format
      const mappedAssets = restAssets.map(
        (asset): Asset => ({
          _id: asset._id,
          assetId: asset.assetId, // Include generated asset ID
          assetName: asset.name,
          assetCategory: asset.categoryName || '',
          categoryId: asset.category,
          employeeId: '',
          employeeName: 'Not Assigned',
          employeeAvatar: undefined,
          purchaseDate: asset.purchaseDate,
          warrantyMonths: asset.warrantyMonths,
          warrantyEndDate: asset.warranty?.expiryDate,
          status: asset.status,
          serialNumber: asset.serialNumber,
          purchaseFrom: asset.vendor?.name,
          manufacture: '',
          model: asset.model,
          createdAt: asset.createdAt || '',
          updatedAt: asset.updatedAt,
        })
      );
      console.log('✅ Mapped assets, setting data:', mappedAssets.length);
      setData(mappedAssets);
    }
  }, [restAssets]);

  // Fetch asset categories on mount
  useEffect(() => {
    fetchCategories({ page: 1, pageSize: 100, status: 'active' });
  }, [fetchCategories]);

  useEffect(() => {
    if (!socket) {
      console.log('⚠️ Socket not available for employee list request');
      return;
    }

    console.log('📤 Requesting employee list...');
    socket.emit('admin/employees/get-list');

    const handler = (res: any) => {
      console.log('📥 Employee list response:', res);
      if (res.done) {
        console.log('✅ Loaded employees:', res.data?.length || 0);
        setEmployees(res.data || []);
      } else {
        console.error('❌ Failed to load employees:', res.error);
        setEmployees([]);
      }
    };

    socket.on('admin/employees/get-list-response', handler);

    return () => {
      socket.off('admin/employees/get-list-response', handler);
    };
  }, [socket]);

  // Validation function
  const validateAssetField = useCallback((fieldName: string, value: any): string => {
    switch (fieldName) {
      case 'assetCategory':
        if (!value || !value.trim()) return 'Asset category is required';
        break;
      case 'assetName':
        if (!value || !value.trim()) return 'Asset name is required';
        break;
      case 'purchaseDate':
        if (!value) return 'Purchase date is required';
        break;
      case 'purchaseFrom':
        if (!value || !value.trim()) return 'Purchase from is required';
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

  // ===== CRUD =====
  const handleAddAsset = async (newAsset: Partial<Asset>) => {
    // Validation
    const errors: Record<string, string> = {};

    const categoryError = validateAssetField('assetCategory', newAsset.categoryId);
    if (categoryError) errors.assetCategory = categoryError;

    const nameError = validateAssetField('assetName', newAsset.assetName);
    if (nameError) errors.assetName = nameError;

    const dateError = validateAssetField('purchaseDate', newAsset.purchaseDate);
    if (dateError) errors.purchaseDate = dateError;

    const fromError = validateAssetField('purchaseFrom', newAsset.purchaseFrom);
    if (fromError) errors.purchaseFrom = fromError;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error('Please fill in all required fields');
      return;
    }

    setFieldErrors({});

    // Backend REST API expects: { name, category (as _id), purchaseDate, purchaseValue }
    const success = await createAsset({
      name: newAsset.assetName!,
      category: newAsset.categoryId!, // Send category _id
      serialNumber: newAsset.serialNumber || '',
      model: newAsset.model || '',
      vendor: {
        name: newAsset.purchaseFrom || '',
      },
      purchaseDate: newAsset.purchaseDate!,
      purchaseValue: 0, // Default value, can be made configurable
      warrantyMonths: newAsset.warrantyMonths || 0,
      status: newAsset.status?.toLowerCase() || 'active',
    });

    if (success) {
      console.log('✅ Asset created successfully, reloading assets...');
      // Close modal
      const modal = document.getElementById('add_assets');
      if (modal) {
        const modalInstance = Modal.getInstance(modal) || new Modal(modal);
        modalInstance.hide();
      }
      // Reset form
      setNewAsset({ status: 'active' });
      setFieldErrors({});
      // Reload assets
      await fetchAssets();
      console.log('🔄 Assets reloaded');
    } else {
      console.error('❌ Asset creation failed');
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editForm._id) {
      toast.error('No asset selected for update!');
      return;
    }

    // Validation
    const errors: Record<string, string> = {};

    const categoryError = validateAssetField('assetCategory', editForm.categoryId);
    if (categoryError) errors.assetCategory = categoryError;

    const nameError = validateAssetField('assetName', editForm.assetName);
    if (nameError) errors.assetName = nameError;

    const dateError = validateAssetField('purchaseDate', editForm.purchaseDate);
    if (dateError) errors.purchaseDate = dateError;

    const fromError = validateAssetField('purchaseFrom', editForm.purchaseFrom);
    if (fromError) errors.purchaseFrom = fromError;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error('Please fill in all required fields');
      return;
    }

    setFieldErrors({});

    const success = await updateAssetREST(editForm._id, {
      name: editForm.assetName!,
      category: editForm.categoryId!,
      serialNumber: editForm.serialNumber || '',
      model: editForm.model || '',
      vendor: {
        name: editForm.purchaseFrom || '',
      },
      purchaseDate: editForm.purchaseDate!,
      purchaseValue: 0,
      warrantyMonths: editForm.warrantyMonths || 0,
      status: editForm.status?.toLowerCase() || 'active',
    });

    if (success) {
      // Close modal
      const modal = document.getElementById('edit_assets');
      if (modal) {
        const modalInstance = Modal.getInstance(modal) || new Modal(modal);
        modalInstance.hide();
      }
      // Reset form
      setEditForm({});
      setEditingAsset(null);
      setFieldErrors({});
      // Reload assets
      fetchAssets();
    }
  };

  const confirmDelete = async () => {
    if (!assetToDelete) return;

    const success = await deleteAssetREST(assetToDelete._id);

    if (success) {
      setAssetToDelete(null);
      setConfirmAssetName('');

      // Close modal
      const modal = document.getElementById('delete_modal');
      if (modal) {
        const modalInstance = Modal.getInstance(modal) || new Modal(modal);
        modalInstance.hide();
      }

      // Reload assets
      fetchAssets();
    }
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
                    {['All', 'active', 'inactive'].map((statusOption) => (
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
                          setSelectedSort('recently_added');
                          fetchAssets(selectedStatus, 'recently_added');
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
                          setSelectedSort('asc');
                          fetchAssets(selectedStatus, 'asc');
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
                          setSelectedSort('desc');
                          fetchAssets(selectedStatus, 'desc');
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
                          setSelectedSort('last_month');
                          fetchAssets(selectedStatus, 'last_month');
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
                          setSelectedSort('last_7_days');
                          fetchAssets(selectedStatus, 'last_7_days');
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
                onClick={() => {
                  setNewAsset({ status: 'active' });
                  setFieldErrors({});
                }}
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form>
              <div className="modal-body pb-0">
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Asset Category <span className="text-danger">*</span>
                      </label>
                      <CommonSelect
                        className={`select ${fieldErrors.assetCategory ? 'is-invalid' : ''}`}
                        options={categories.map((cat) => ({ value: cat._id, label: cat.name }))}
                        value={
                          categories
                            .map((cat) => ({ value: cat._id, label: cat.name }))
                            .find((opt) => opt.value === newAsset.categoryId) || null
                        }
                        onChange={(opt) => {
                          if (opt) {
                            setNewAsset({ ...newAsset, categoryId: opt.value });
                            clearFieldError('assetCategory');
                          }
                        }}
                        isSearchable={true}
                      />
                      {fieldErrors.assetCategory && (
                        <div className="invalid-feedback d-block">{fieldErrors.assetCategory}</div>
                      )}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Asset Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${fieldErrors.assetName ? 'is-invalid' : ''}`}
                        value={newAsset.assetName || ''}
                        onChange={(e) => {
                          setNewAsset({ ...newAsset, assetName: e.target.value });
                          clearFieldError('assetName');
                        }}
                      />
                      {fieldErrors.assetName && (
                        <div className="invalid-feedback d-block">{fieldErrors.assetName}</div>
                      )}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Purchased Date <span className="text-danger">*</span>
                      </label>
                      <div
                        className={`input-icon-end position-relative ${fieldErrors.purchaseDate ? 'border border-danger rounded' : ''}`}
                      >
                        <DatePicker
                          className="form-control datetimepicker"
                          value={newAsset.purchaseDate ? dayjs(newAsset.purchaseDate) : null}
                          onChange={(date) => {
                            setNewAsset({
                              ...newAsset,
                              purchaseDate: date ? dayjs(date).toISOString() : undefined,
                            });
                            clearFieldError('purchaseDate');
                          }}
                          format="DD-MM-YYYY"
                          getPopupContainer={getModalContainer}
                          placeholder="DD-MM-YYYY"
                        />

                        <span className="input-icon-addon">
                          <i className="ti ti-calendar text-gray-7" />
                        </span>
                      </div>
                      {fieldErrors.purchaseDate && (
                        <div className="invalid-feedback d-block">{fieldErrors.purchaseDate}</div>
                      )}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Purchase From <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${fieldErrors.purchaseFrom ? 'is-invalid' : ''}`}
                        value={newAsset.purchaseFrom || ''}
                        onChange={(e) => {
                          setNewAsset({ ...newAsset, purchaseFrom: e.target.value });
                          clearFieldError('purchaseFrom');
                        }}
                      />
                      {fieldErrors.purchaseFrom && (
                        <div className="invalid-feedback d-block">{fieldErrors.purchaseFrom}</div>
                      )}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Serial Number</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newAsset.serialNumber || ''}
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
                        value={newAsset.model || ''}
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
                        value={newAsset.warrantyMonths || ''}
                        onChange={(e) =>
                          setNewAsset({ ...newAsset, warrantyMonths: parseInt(e.target.value, 10) })
                        }
                      />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="mb-3 ">
                      <label className="form-label">Status</label>
                      <CommonSelect
                        className="select"
                        options={status}
                        value={status.find((s) => s.value === newAsset.status) || null}
                        onChange={(opt) => {
                          if (opt) setNewAsset({ ...newAsset, status: opt.value });
                        }}
                        disabled={true}
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
                    setNewAsset({ status: 'active' });
                    setFieldErrors({});
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={(e) => {
                    e.preventDefault();
                    handleAddAsset(newAsset);
                  }}
                >
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
                  setFieldErrors({});
                }}
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form onSubmit={handleUpdateSubmit}>
              <div className="modal-body pb-0">
                <div className="row">
                  {/* Asset Category */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Asset Category <span className="text-danger">*</span>
                      </label>
                      <CommonSelect
                        className={`select ${fieldErrors.assetCategory ? 'is-invalid' : ''}`}
                        options={categories.map((cat) => ({ value: cat._id, label: cat.name }))}
                        value={
                          categories
                            .map((cat) => ({ value: cat._id, label: cat.name }))
                            .find((opt) => opt.value === editForm.categoryId) || null
                        }
                        onChange={(opt) => {
                          if (opt) {
                            setEditForm({ ...editForm, categoryId: opt.value });
                            clearFieldError('assetCategory');
                          }
                        }}
                        isSearchable={true}
                      />
                      {fieldErrors.assetCategory && (
                        <div className="invalid-feedback d-block">{fieldErrors.assetCategory}</div>
                      )}
                    </div>
                  </div>

                  {/* Asset Name */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Asset Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${fieldErrors.assetName ? 'is-invalid' : ''}`}
                        value={editForm.assetName || ''}
                        onChange={(e) => {
                          setEditForm({ ...editForm, assetName: e.target.value });
                          clearFieldError('assetName');
                        }}
                      />
                      {fieldErrors.assetName && (
                        <div className="invalid-feedback d-block">{fieldErrors.assetName}</div>
                      )}
                    </div>
                  </div>

                  {/* Purchase Date */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Purchased Date <span className="text-danger">*</span>
                      </label>
                      <div
                        className={`input-icon-end position-relative ${fieldErrors.purchaseDate ? 'border border-danger rounded' : ''}`}
                      >
                        <DatePicker
                          className="form-control datetimepicker"
                          value={editForm.purchaseDate ? dayjs(editForm.purchaseDate) : null}
                          onChange={(date) => {
                            setEditForm({
                              ...editForm,
                              purchaseDate: date ? dayjs(date).toISOString() : undefined,
                            });
                            clearFieldError('purchaseDate');
                          }}
                          format="DD-MM-YYYY"
                          getPopupContainer={getModalContainer}
                          placeholder="DD-MM-YYYY"
                        />

                        <span className="input-icon-addon">
                          <i className="ti ti-calendar text-gray-7" />
                        </span>
                      </div>
                      {fieldErrors.purchaseDate && (
                        <div className="invalid-feedback d-block">{fieldErrors.purchaseDate}</div>
                      )}
                    </div>
                  </div>

                  {/* Purchase From */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Purchase From <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${fieldErrors.purchaseFrom ? 'is-invalid' : ''}`}
                        value={editForm.purchaseFrom || ''}
                        onChange={(e) => {
                          setEditForm({ ...editForm, purchaseFrom: e.target.value });
                          clearFieldError('purchaseFrom');
                        }}
                      />
                      {fieldErrors.purchaseFrom && (
                        <div className="invalid-feedback d-block">{fieldErrors.purchaseFrom}</div>
                      )}
                    </div>
                  </div>

                  {/* Serial Number */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Serial Number</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editForm.serialNumber || ''}
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
                        value={editForm.model || ''}
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
                        value={editForm.warrantyMonths || ''}
                        onChange={(e) =>
                          setEditForm({ ...editForm, warrantyMonths: parseInt(e.target.value, 10) })
                        }
                      />
                    </div>
                  </div>

                  {/* Status */}
                  <div className="col-md-6">
                    <div className="mb-3">
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
                    setFieldErrors({});
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
        <div className="modal-dialog modal-dialog-centered modal-sm">
          <div className="modal-content">
            <div className="modal-body">
              <div className="text-center p-3">
                <span className="avatar avatar-lg avatar-rounded bg-danger mb-3">
                  <i className="ti ti-trash fs-24" />
                </span>
                <h5 className="mb-2">Delete Asset</h5>
                {assetToDelete && (
                  <>
                    <div className="bg-light p-3 rounded mb-3">
                      <h6 className="mb-1">{assetToDelete.assetName}</h6>
                      <p className="mb-1 text-muted">
                        Category: <strong>{assetToDelete.assetCategory || 'N/A'}</strong>
                      </p>
                      <p className="mb-0 text-muted">
                        Assigned to: <strong>{assetToDelete.employeeName || 'N/A'}</strong>
                      </p>
                    </div>
                    <div className="text-start mb-3">
                      <p className="text-danger fw-medium mb-2" style={{ fontSize: '13px' }}>
                        This action is permanent. The asset will be removed from the employee's
                        assets.
                      </p>
                      <label className="form-label text-muted" style={{ fontSize: '13px' }}>
                        Type <strong>{assetToDelete.assetName}</strong> to confirm deletion:
                      </label>
                      <input
                        type="text"
                        className={`form-control form-control-sm ${
                          confirmAssetName &&
                          confirmAssetName.trim().toLowerCase() !==
                            assetToDelete.assetName.trim().toLowerCase()
                            ? 'is-invalid'
                            : ''
                        } ${
                          confirmAssetName.trim().toLowerCase() ===
                          assetToDelete.assetName.trim().toLowerCase()
                            ? 'is-valid'
                            : ''
                        }`}
                        placeholder={`Type "${assetToDelete.assetName}" to confirm`}
                        value={confirmAssetName}
                        onChange={(e) => setConfirmAssetName(e.target.value)}
                        autoComplete="off"
                      />
                      {confirmAssetName &&
                        confirmAssetName.trim().toLowerCase() !==
                          assetToDelete.assetName.trim().toLowerCase() && (
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
                      setAssetToDelete(null);
                      setConfirmAssetName('');
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={confirmDelete}
                    disabled={
                      !assetToDelete ||
                      confirmAssetName.trim().toLowerCase() !==
                        assetToDelete.assetName.trim().toLowerCase()
                    }
                  >
                    Delete Asset
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

export default Assets;
