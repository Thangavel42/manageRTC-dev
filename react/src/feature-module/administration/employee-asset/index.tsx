import { DatePicker } from 'antd';
import { Modal } from 'bootstrap';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Socket } from 'socket.io-client';
import CommonSelect from '../../../core/common/commonSelect';
import Table from '../../../core/common/dataTable/index';
import ImageWithBasePath from '../../../core/common/imageWithBasePath';
import { useAssetCategoriesREST } from '../../../hooks/useAssetCategoriesREST';
import { Asset as HookAsset, useAssetsREST } from '../../../hooks/useAssetsREST';
import { useAssetUsersREST } from '../../../hooks/useAssetUsersREST';
import { get as apiGet } from '../../../services/api';
import { useSocket } from '../../../SocketContext';
import { all_routes } from '../../router/all_routes';

type Asset = {
  _id: string;
  assetId?: string;
  assetName: string;
  assetCategory?: string;
  categoryId?: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar?: string;
  employeeIdDisplay?: string;
  purchaseDate?: string;
  warrantyMonths?: number;
  warrantyEndDate?: string;
  status: string;
  serialNumber?: string;
  purchaseFrom?: string;
  manufacture?: string;
  model?: string;
  assignedDate?: string;
  createdAt: string;
  updatedAt?: string;
  assetUserId?: string; // ID of the asset-user assignment record
};

// Helper function to map hook's Asset format to component's Asset format
const mapHookAssetToComponentAsset = (asset: HookAsset): Asset => ({
  _id: asset._id,
  assetId: asset.assetId,
  assetName: asset.name,
  assetCategory: asset.categoryName || '',
  categoryId: asset.category,
  employeeId: '',
  employeeName: 'Not Assigned',
  employeeAvatar: undefined,
  employeeIdDisplay: undefined,
  purchaseDate: asset.purchaseDate,
  warrantyMonths: asset.warrantyMonths,
  warrantyEndDate: asset.warranty?.expiryDate,
  status: asset.status,
  serialNumber: asset.serialNumber,
  purchaseFrom: asset.vendor?.name,
  manufacture: '',
  model: asset.model,
  assignedDate: asset.createdAt,
  createdAt: asset.createdAt || '',
  updatedAt: asset.updatedAt,
});

const EmployeeAsset = () => {
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
  const {
    createAssetUser,
    updateAssetUser,
    deleteAssetUser,
    fetchAssetUsers,
    assetUsers,
    loading,
    error,
  } = useAssetUsersREST();
  const [newAsset, setNewAsset] = useState<Partial<Asset>>({ status: 'active' });
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedSort, setSelectedSort] = useState('purchase_desc');

  const [data, setData] = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<
    { _id: string; employeeId?: string; firstName: string; lastName: string; avatar?: string }[]
  >([]);

  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [editForm, setEditForm] = useState<Partial<Asset>>({});
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [confirmAssetName, setConfirmAssetName] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Assign Asset Modal State
  const [assignAssetForm, setAssignAssetForm] = useState<{
    assetId: string;
    employeeId: string;
    assignedDate: string;
  }>({
    assetId: '',
    employeeId: '',
    assignedDate: dayjs().format('YYYY-MM-DD'),
  });
  const [assignFieldErrors, setAssignFieldErrors] = useState<Record<string, string>>({});

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

  const employeesLoaded = employees.length > 0;

  const columns = [
    {
      title: 'Asset ID',
      dataIndex: 'assetId',
      render: (text: string, record: any) => (
        <span className="text-primary fw-semibold">
          {text || record._id.slice(-8).toUpperCase()}
        </span>
      ),
      sorter: (a: any, b: any) => (a.assetId || '').localeCompare(b.assetId || ''),
    },
    {
      title: 'Asset Name',
      dataIndex: 'assetName',
      render: (text: string) => <h6 className="fs-14 fw-medium">{text}</h6>,
      sorter: (a: any, b: any) => a.assetName.length - b.assetName.length,
    },
    {
      title: 'Asset User',
      dataIndex: 'employeeName',
      render: (text: string, record: any) => {
        // Only show assigned employees (filter out "Not Assigned")
        if (!text || text === 'Not Assigned' || !record.employeeId) {
          return <span className="text-muted small">No Employee</span>;
        }

        // Split name into first and last name for initials
        const nameParts = text.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts[nameParts.length - 1] || '';
        const initial = (firstName.charAt(0) || '?').toUpperCase();

        return (
          <div className="bg-gray-100 p-1 rounded d-flex align-items-center">
            <Link
              to="#"
              className="avatar avatar-sm avatar-rounded border border-white flex-shrink-0 me-2"
              title={`${text}${record.employeeIdDisplay ? ` (${record.employeeIdDisplay})` : ''}`}
            >
              {record.employeeAvatar ? (
                <ImageWithBasePath
                  className="border border-white"
                  src={record.employeeAvatar}
                  alt={text}
                />
              ) : (
                <span
                  className="avatar-title bg-purple border border-white fs-10"
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                  }}
                >
                  {initial}
                </span>
              )}
            </Link>
            <h6 className="fs-12 mb-0">
              <Link to="#">
                {record.employeeIdDisplay ? `${record.employeeIdDisplay} - ` : ''}
                {text}
              </Link>
            </h6>
          </div>
        );
      },
      sorter: (a: any, b: any) => (a.employeeName || '').localeCompare(b.employeeName || ''),
    },
    {
      title: 'Category',
      dataIndex: 'assetCategory',
      render: (text: string) => <span className="badge badge-soft-info">{text || 'N/A'}</span>,
      sorter: (a: any, b: any) => (a.assetCategory || '').localeCompare(b.assetCategory || ''),
    },
    {
      title: 'Provided Date',
      dataIndex: 'assignedDate',
      render: (text: string, record: any) => {
        const dateToShow = text || record.createdAt;
        return dateToShow ? dayjs(dateToShow).format('DD MMM YYYY') : 'N/A';
      },
      sorter: (a: any, b: any) => {
        const dateA = a.assignedDate || a.createdAt;
        const dateB = b.assignedDate || b.createdAt;
        const timeA = dateA ? new Date(dateA).getTime() : 0;
        const timeB = dateB ? new Date(dateB).getTime() : 0;
        return timeA - timeB;
      },
    },
    {
      title: '',
      dataIndex: 'actions',
      render: (_text: string, record: Asset) => (
        <div className="action-icon d-inline-flex">
          <Link
            to="#"
            className="me-2"
            data-bs-toggle="modal"
            data-bs-target="#edit_asset"
            onClick={() => handleEdit(record)}
          >
            <i className="ti ti-edit" />
          </Link>
          <Link
            to="#"
            data-bs-toggle="modal"
            data-bs-target="#delete_asset"
            onClick={() => handleDeleteClick(record)}
          >
            <i className="ti ti-trash" />
          </Link>
        </div>
      ),
    },
  ];

  useEffect(() => {
    fetchCategories();
    fetchAssetUsers({ status: 'assigned' }); // Fetch assigned assets
    fetchAssetsREST(); // Load all assets for assignment dropdown
  }, [fetchCategories, fetchAssetUsers, fetchAssetsREST]);

  useEffect(() => {
    // Use assetUsers as primary data source since it contains assignment information
    if (assetUsers && assetUsers.length > 0) {
      // Map AssetUsers data to component Asset format
      const assetsFromAssignments = assetUsers
        .filter((au) => au.status === 'assigned')
        .map((assignment) => {
          const asset: Asset = {
            _id: assignment.assetId,
            assetId: assignment.assetIdDisplay || '',
            assetName: assignment.assetName || 'Unknown Asset',
            assetCategory: assignment.assetCategoryName || '',
            categoryId: '',
            employeeId: assignment.employeeId,
            employeeName: assignment.employeeName || 'Unknown Employee',
            employeeAvatar: assignment.employeeAvatar,
            employeeIdDisplay: assignment.employeeIdDisplay,
            purchaseDate: assignment.assetPurchaseDate,
            warrantyMonths: assignment.assetWarrantyMonths,
            warrantyEndDate: undefined,
            status: assignment.assetStatus || 'active',
            serialNumber: assignment.assetSerialNumber,
            purchaseFrom: assignment.assetVendorName,
            manufacture: '',
            model: assignment.assetModel,
            assignedDate: assignment.assignedDate,
            createdAt: assignment.createdAt || assignment.assignedDate,
            updatedAt: assignment.updatedAt,
            assetUserId: assignment._id, // Store the asset-user assignment ID
          };
          return asset;
        });

      setData(assetsFromAssignments);
    } else {
      setData([]);
    }
  }, [assetUsers]);

  useEffect(() => {
    if (socket) {
      socket.on('asset:created', (newAssetData: HookAsset) => {
        const mappedAsset = mapHookAssetToComponentAsset(newAssetData);
        if (mappedAsset.employeeId && mappedAsset.employeeName !== 'Not Assigned') {
          setData((prevData) => [mappedAsset, ...prevData]);
          toast.success('New asset assigned');
        }
      });

      socket.on('asset:updated', (updatedAssetData: HookAsset) => {
        const mappedAsset = mapHookAssetToComponentAsset(updatedAssetData);
        setData((prevData) =>
          prevData
            .map((asset) => (asset._id === mappedAsset._id ? mappedAsset : asset))
            .filter((asset) => asset.employeeId && asset.employeeName !== 'Not Assigned')
        );
        toast.info('Asset updated');
      });

      socket.on('asset:deleted', ({ assetId }: { assetId: string }) => {
        setData((prevData) => prevData.filter((asset) => asset._id !== assetId));
        toast.info('Asset removed');
      });

      return () => {
        socket.off('asset:created');
        socket.off('asset:updated');
        socket.off('asset:deleted');
      };
    }
  }, [socket]);

  // Load employees from API for assignment modal (matching project team member assignment pattern)
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        console.log('[EmployeeAsset] Loading employees from API...');
        const response = await apiGet('/employees', { params: { limit: 100 } });

        console.log('[EmployeeAsset] Raw API response:', response);

        // Handle both response structures: { data: [...] } or direct array
        const employeeData = response.data || response;

        if (employeeData && Array.isArray(employeeData)) {
          const employeeOptions = employeeData.map((emp: any) => ({
            _id: emp._id,
            firstName: emp.firstName,
            lastName: emp.lastName,
            employeeId: emp.employeeId || undefined,
            avatar: emp.avatar || undefined,
          }));
          setEmployees(employeeOptions);
          console.log(`[EmployeeAsset] ✅ Loaded ${employeeOptions.length} employees`);
        } else {
          console.warn('[EmployeeAsset] ⚠️ Employee data is not an array:', employeeData);
        }
      } catch (error) {
        console.error('[EmployeeAsset] ❌ Failed to load employees:', error);
        toast.error('Failed to load employees');
      }
    };
    loadEmployees();
  }, []);

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setEditForm({
      ...asset,
      categoryId: asset.categoryId || '',
    });
    setFieldErrors({});
  };

  const handleDeleteClick = (asset: Asset) => {
    setAssetToDelete(asset);
    setConfirmAssetName('');
  };

  const handleConfirmDelete = async () => {
    if (!assetToDelete) return;

    if (confirmAssetName !== assetToDelete.assetName) {
      toast.error('Asset name does not match');
      return;
    }

    try {
      // Delete the asset-user assignment (sets isDeleted=true)
      if (assetToDelete.assetUserId) {
        await deleteAssetUser(assetToDelete.assetUserId);
      }

      // Update the asset to set assigned=false
      await updateAssetREST(assetToDelete._id, {
        assignedTo: '',
      });

      toast.success('Asset assignment deleted successfully');
      const deleteModal = Modal.getInstance(document.getElementById('delete_asset')!);
      deleteModal?.hide();
      setAssetToDelete(null);
      setConfirmAssetName('');
      // Refresh data
      fetchAssetUsers({ status: 'assigned' });
    } catch (error) {
      console.error('Error deleting asset assignment:', error);
      toast.error('Failed to delete asset assignment');
    }
  };

  const validateAssetField = (fieldName: string, value: any): string | null => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
    }
    return null;
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingAsset || !editForm.assetUserId) return;

    const errors: Record<string, string> = {};

    const employeeError = validateAssetField('employeeId', editForm.employeeId);
    if (employeeError) errors.employeeId = employeeError;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error('Please fill in all required fields');
      return;
    }

    setFieldErrors({});

    const success = await updateAssetUser(editForm.assetUserId, {
      status: 'assigned',
    });

    if (success) {
      toast.success('Asset assignment updated successfully');
      const editModal = Modal.getInstance(document.getElementById('edit_asset')!);
      editModal?.hide();
      setEditingAsset(null);
      setEditForm({});
      // Refresh data
      fetchAssetUsers({ status: 'assigned' });
    }
  };

  const getCategoryOptions = () => {
    return categories.map((cat) => ({
      value: cat._id,
      label: cat.name,
    }));
  };

  // Get all assets for assign modal dropdown (including unassigned)
  const getAllAssetOptions = () => {
    return (
      restAssets
        ?.filter((asset) => !asset.assigned) // Only unassigned assets
        .map((asset) => ({
          value: asset._id,
          label: `${asset.name} - ${asset.assetId || asset._id.slice(-6)}`,
        })) || []
    );
  };

  // Handle assign asset form submission
  const handleAssignAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};

    if (!assignAssetForm.assetId || assignAssetForm.assetId.trim() === '') {
      errors.assetId = 'Asset is required';
    }

    if (!assignAssetForm.employeeId || assignAssetForm.employeeId.trim() === '') {
      errors.employeeId = 'Employee is required';
    }

    if (!assignAssetForm.assignedDate || assignAssetForm.assignedDate.trim() === '') {
      errors.assignedDate = 'Assignment date is required';
    }

    if (Object.keys(errors).length > 0) {
      setAssignFieldErrors(errors);
      toast.error('Please fill in all required fields');
      return;
    }

    setAssignFieldErrors({});

    const success = await createAssetUser({
      assetId: assignAssetForm.assetId,
      employeeId: assignAssetForm.employeeId,
      assignedDate: assignAssetForm.assignedDate,
    });

    if (success) {
      toast.success('Asset assigned successfully');
      const assignModal = Modal.getInstance(document.getElementById('assign_asset')!);
      assignModal?.hide();
      setAssignAssetForm({
        assetId: '',
        employeeId: '',
        assignedDate: dayjs().format('YYYY-MM-DD'),
      });
      // Refresh data
      fetchAssetUsers({ status: 'assigned' }); // Refresh assigned assets
      fetchAssetsREST(); // Refresh asset list for assignment dropdown
    }
  };

  return (
    <>
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Employee Assets</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={all_routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">Administration</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Employee Assets
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
              <Link
                to="#"
                className="btn btn-primary"
                data-bs-toggle="modal"
                data-bs-target="#assign_asset"
              >
                <i className="ti ti-square-rounded-plus me-2" />
                Assign Asset
              </Link>
            </div>
          </div>
          {/* /Breadcrumb */}

          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
              <h5>Employee Assets List</h5>
            </div>
            <div className="card-body p-0">
              <Table columns={columns} dataSource={data} Selection={false} />
            </div>
          </div>
        </div>
      </div>

      {/* Edit Asset Modal */}
      <div className="modal fade" id="edit_asset">
        <div className="modal-dialog modal-dialog-centered modal-md">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Edit Asset Assignment</h4>
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
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Asset <span className="text-danger"> *</span>
                      </label>
                      <CommonSelect
                        className="select"
                        options={[
                          {
                            value: editForm._id || '',
                            label: `${editForm.assetName || ''} - ${editForm.assetId || editForm._id?.slice(-6) || ''}`,
                          },
                        ]}
                        value={editForm._id || ''}
                        onChange={() => {}} // No-op, asset cannot be changed
                        disabled={true}
                      />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Employee <span className="text-danger"> *</span>
                      </label>
                      <CommonSelect
                        className={`select ${fieldErrors.employeeId ? 'is-invalid' : ''}`}
                        options={getEmployeeOptions()}
                        value={editForm.employeeId || ''}
                        onChange={(option: any) =>
                          setEditForm({ ...editForm, employeeId: option?.value || '' })
                        }
                      />
                      {fieldErrors.employeeId && (
                        <div className="invalid-feedback d-block">{fieldErrors.employeeId}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-white border me-2" data-bs-dismiss="modal">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Edit Asset Modal */}

      {/* Delete Asset Modal */}
      <div className="modal fade" id="delete_asset">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header border-0 m-0 justify-content-end">
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="modal-body">
              <div className="success-message text-center">
                <div className="success-popup-icon bg-light-red">
                  <i className="ti ti-trash-x" />
                </div>
                <h3>Delete Asset?</h3>
                <p className="del-info">Are you sure you want to delete this asset?</p>
                <div className="mb-3">
                  <label className="form-label">Type "{assetToDelete?.assetName}" to confirm</label>
                  <input
                    type="text"
                    className="form-control"
                    value={confirmAssetName}
                    onChange={(e) => setConfirmAssetName(e.target.value)}
                  />
                </div>
                <div className="col-lg-12 text-center modal-btn">
                  <button type="button" className="btn btn-light me-2" data-bs-dismiss="modal">
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleConfirmDelete}
                    disabled={confirmAssetName !== assetToDelete?.assetName}
                  >
                    Yes, Delete it
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* /Delete Asset Modal */}

      {/* Assign Asset Modal */}
      <div className="modal fade" id="assign_asset">
        <div className="modal-dialog modal-dialog-centered modal-md">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Assign Asset to Employee</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form onSubmit={handleAssignAssetSubmit}>
              <div className="modal-body pb-0">
                <div className="row">
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Asset <span className="text-danger"> *</span>
                      </label>
                      <CommonSelect
                        className={`select ${assignFieldErrors.assetId ? 'is-invalid' : ''}`}
                        options={getAllAssetOptions()}
                        value={assignAssetForm.assetId || ''}
                        onChange={(option: any) =>
                          setAssignAssetForm({ ...assignAssetForm, assetId: option?.value || '' })
                        }
                      />
                      {assignFieldErrors.assetId && (
                        <div className="invalid-feedback d-block">{assignFieldErrors.assetId}</div>
                      )}
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Employee <span className="text-danger"> *</span>
                      </label>
                      <CommonSelect
                        className={`select ${assignFieldErrors.employeeId ? 'is-invalid' : ''}`}
                        options={getEmployeeOptions()}
                        value={assignAssetForm.employeeId || ''}
                        onChange={(option: any) =>
                          setAssignAssetForm({
                            ...assignAssetForm,
                            employeeId: option?.value || '',
                          })
                        }
                      />
                      {assignFieldErrors.employeeId && (
                        <div className="invalid-feedback d-block">
                          {assignFieldErrors.employeeId}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Assignment Date <span className="text-danger"> *</span>
                      </label>
                      <div
                        className={`input-icon-end position-relative ${assignFieldErrors.assignedDate ? 'border border-danger rounded' : ''}`}
                      >
                        <DatePicker
                          className="form-control datetimepicker"
                          format="DD-MM-YYYY"
                          getPopupContainer={getModalContainer}
                          placeholder="DD-MM-YYYY"
                          value={
                            assignAssetForm.assignedDate
                              ? dayjs(assignAssetForm.assignedDate)
                              : null
                          }
                          onChange={(date) =>
                            setAssignAssetForm({
                              ...assignAssetForm,
                              assignedDate: date ? date.format('YYYY-MM-DD') : '',
                            })
                          }
                        />
                        <span className="input-icon-addon">
                          <i className="ti ti-calendar text-gray-7" />
                        </span>
                      </div>
                      {assignFieldErrors.assignedDate && (
                        <div className="invalid-feedback d-block">
                          {assignFieldErrors.assignedDate}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-white border me-2" data-bs-dismiss="modal">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Assign Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Assign Asset Modal */}
    </>
  );
};

export default EmployeeAsset;
