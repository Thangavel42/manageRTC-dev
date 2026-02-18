import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CollapseHeader from '../../../core/common/collapse-header/collapse-header';
import Table from '../../../core/common/dataTable/index';
import Footer from '../../../core/common/footer';
import { get as apiGet } from '../../../services/api';
import { all_routes } from '../../router/all_routes';
import AddSubContract from './add_subcontract';
import DeleteSubContract from './delete_subcontract';
import EditSubContract from './edit_subcontract';

interface SubContract {
  _id: string;
  companyId: string;
  contractId?: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  logo?: string;
  status: 'Active' | 'Inactive';
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    linkedin?: string;
    whatsapp?: string;
  };
  createdAt: string;
  updatedAt: string;
}

const SubContractList = () => {
  const [subContracts, setSubContracts] = useState<SubContract[]>([]);
  const [filteredSubContracts, setFilteredSubContracts] = useState<SubContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedSort, setSelectedSort] = useState<string>('');

  // Stats
  const [totalContracts, setTotalContracts] = useState(0);
  const [activeContracts, setActiveContracts] = useState(0);
  const [inactiveContracts, setInactiveContracts] = useState(0);

  // Initialize data fetch
  useEffect(() => {
    console.log('SubContractList component mounted');
    fetchSubContracts();

    // Listen for sub-contract created event to refresh list
    const handleSubContractCreated = () => {
      console.log('[SubContractList] Sub-contract created, refreshing list...');
      fetchSubContracts();
    };

    const handleSubContractUpdated = () => {
      console.log('[SubContractList] Sub-contract updated, refreshing list...');
      fetchSubContracts();
    };

    const handleSubContractDeleted = () => {
      console.log('[SubContractList] Sub-contract deleted, refreshing list...');
      fetchSubContracts();
    };

    window.addEventListener('subcontract-created', handleSubContractCreated);
    window.addEventListener('subcontract-updated', handleSubContractUpdated);
    window.addEventListener('subcontract-deleted', handleSubContractDeleted);

    return () => {
      window.removeEventListener('subcontract-created', handleSubContractCreated);
      window.removeEventListener('subcontract-updated', handleSubContractUpdated);
      window.removeEventListener('subcontract-deleted', handleSubContractDeleted);
    };
  }, []);

  const fetchSubContracts = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all sub-contracts from the dedicated endpoint
      const response = await apiGet('/subcontracts');
      if (response.success && response.data) {
        const contracts = Array.isArray(response.data) ? response.data : [];
        setSubContracts(contracts);

        // Fetch and set stats from the stats endpoint
        const statsResponse = await apiGet('/subcontracts/stats');
        if (statsResponse.success && statsResponse.data) {
          setTotalContracts(statsResponse.data.totalContracts || 0);
          setActiveContracts(statsResponse.data.activeContracts || 0);
          setInactiveContracts(statsResponse.data.inactiveContracts || 0);
        } else {
          // Fallback: calculate stats locally
          setTotalContracts(contracts.length);
          setActiveContracts(contracts.filter((sc: SubContract) => sc.status === 'Active').length);
          setInactiveContracts(
            contracts.filter((sc: SubContract) => sc.status === 'Inactive').length
          );
        }
      }
    } catch (err: any) {
      console.error('[SubContractList] Failed to load sub-contracts:', err);
      setError(err.message || 'Failed to load sub-contracts');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  useEffect(() => {
    if (!subContracts || subContracts.length === 0) {
      setFilteredSubContracts([]);
      return;
    }

    let result = [...subContracts];

    // Status filter
    if (selectedStatus && selectedStatus !== '') {
      result = result.filter((sc) => sc.status === selectedStatus);
    }

    // Sort
    if (selectedSort && selectedSort !== '') {
      result.sort((a, b) => {
        switch (selectedSort) {
          case 'asc':
            return a.name.localeCompare(b.name);
          case 'desc':
            return b.name.localeCompare(a.name);
          case 'recent':
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case 'oldest':
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case 'company':
            return a.company.localeCompare(b.company);
          default:
            return 0;
        }
      });
    }

    setFilteredSubContracts(result);
  }, [subContracts, selectedStatus, selectedSort]);

  const handleClearFilters = () => {
    setSelectedStatus('');
    setSelectedSort('');
  };

  const handleRefresh = () => {
    fetchSubContracts();
  };

  const handleEditSubContract = (subcontract: SubContract) => {
    console.log('[SubContractList] Opening edit modal for:', subcontract);
    window.dispatchEvent(
      new CustomEvent('edit-subcontract', {
        detail: { subcontract },
      })
    );

    // Open the modal using Bootstrap
    setTimeout(() => {
      const modal = document.getElementById('edit_subcontract');
      if (modal) {
        if ((window as any).bootstrap && (window as any).bootstrap.Modal) {
          const bootstrapModal = new (window as any).bootstrap.Modal(modal);
          bootstrapModal.show();
        } else if ((window as any).$ && (window as any).$.fn && (window as any).$.fn.modal) {
          (window as any).$('#edit_subcontract').modal('show');
        }
      }
    }, 100);
  };

  const handleDeleteSubContract = (subcontract: SubContract) => {
    console.log('[SubContractList] Opening delete modal for:', subcontract);
    window.dispatchEvent(
      new CustomEvent('delete-subcontract', {
        detail: { subcontract },
      })
    );

    // Open the modal using Bootstrap
    setTimeout(() => {
      const modal = document.getElementById('delete_subcontract');
      if (modal) {
        if ((window as any).bootstrap && (window as any).bootstrap.Modal) {
          const bootstrapModal = new (window as any).bootstrap.Modal(modal);
          bootstrapModal.show();
        } else if ((window as any).$ && (window as any).$.fn && (window as any).$.fn.modal) {
          (window as any).$('#delete_subcontract').modal('show');
        }
      }
    }, 100);
  };

  const columns = [
    {
      title: 'Contract ID',
      dataIndex: '_id',
      render: (text: string, record: any) => (
        <span className="fw-medium">
          {record.contractId ? record.contractId.toUpperCase() : record._id.slice(-8).toUpperCase()}
        </span>
      ),
      sorter: (a: any, b: any) => (a.contractId || a._id).localeCompare(b.contractId || b._id),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      render: (text: string, record: any) => (
        <div className="d-flex align-items-center">
          {record.logo && (
            <img
              src={record.logo}
              alt={record.name}
              className="avatar avatar-sm rounded-circle me-2"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <div>
            <h6 className="fw-medium">{record.name}</h6>
            <span className="fs-12 text-muted">{record.email}</span>
          </div>
        </div>
      ),
      sorter: (a: any, b: any) => a.name.localeCompare(b.name),
    },
    {
      title: 'Company',
      dataIndex: 'company',
      sorter: (a: any, b: any) => a.company.localeCompare(b.company),
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      render: (text: string) => text || '-',
    },
    {
      title: 'Address',
      dataIndex: 'address',
      render: (text: string) => (
        <span className="text-truncate d-inline-block" style={{ maxWidth: '200px' }}>
          {text || '-'}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (text: string, record: any) => (
        <span
          className={`badge d-inline-flex align-items-center badge-xs ${
            record.status === 'Active' ? 'badge-success' : 'badge-danger'
          }`}
        >
          <i className="ti ti-point-filled me-1" />
          {record.status}
        </span>
      ),
      sorter: (a: any, b: any) => a.status.localeCompare(b.status),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      render: (text: string) => dayjs(text).format('DD MMM YYYY'),
      sorter: (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      render: (_: any, record: SubContract) => (
        <div className="d-flex align-items-center">
          <Link
            to="#"
            className="btn btn-sm btn-icon btn-primary me-2"
            onClick={(e) => {
              e.preventDefault();
              handleEditSubContract(record);
            }}
            title="Edit Sub-Contract"
          >
            <i className="ti ti-edit" />
          </Link>
          <Link
            to="#"
            className="btn btn-sm btn-icon btn-danger"
            onClick={(e) => {
              e.preventDefault();
              handleDeleteSubContract(record);
            }}
            title="Delete Sub-Contract"
          >
            <i className="ti ti-trash" />
          </Link>
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
              <h2 className="mb-1">Sub-Contracts</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={all_routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">Projects</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Sub-Contracts
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
              <div className="me-2 mb-2">
                <button
                  onClick={handleRefresh}
                  className="btn btn-white d-inline-flex align-items-center"
                  disabled={loading}
                >
                  <i className="ti ti-refresh me-1" />
                  {loading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
              <div className="mb-2">
                <Link
                  to="#"
                  data-bs-toggle="modal"
                  data-bs-target="#add_subcontract"
                  className="btn btn-primary d-flex align-items-center"
                >
                  <i className="ti ti-circle-plus me-2" />
                  Add Sub-Contract
                </Link>
              </div>
              <div className="ms-2 head-icons">
                <CollapseHeader />
              </div>
            </div>
          </div>
          {/* /Breadcrumb */}

          {/* Stats Cards */}
          <div className="row">
            <div className="col-xl-4 col-md-6 d-flex">
              <div className="card flex-fill">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <h6 className="mb-2 text-muted">Total Contracts</h6>
                      <h3 className="mb-0">{totalContracts}</h3>
                    </div>
                    <div className="flex-shrink-0">
                      <span className="avatar avatar-lg avatar-rounded bg-primary-transparent">
                        <i className="ti ti-file-text fs-20" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-4 col-md-6 d-flex">
              <div className="card flex-fill">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <h6 className="mb-2 text-muted">Active Contracts</h6>
                      <h3 className="mb-0">{activeContracts}</h3>
                    </div>
                    <div className="flex-shrink-0">
                      <span className="avatar avatar-lg avatar-rounded bg-success-transparent">
                        <i className="ti ti-file-check fs-20" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-4 col-md-6 d-flex">
              <div className="card flex-fill">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <h6 className="mb-2 text-muted">Inactive Contracts</h6>
                      <h3 className="mb-0">{inactiveContracts}</h3>
                    </div>
                    <div className="flex-shrink-0">
                      <span className="avatar avatar-lg avatar-rounded bg-danger-transparent">
                        <i className="ti ti-file-x fs-20" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* /Stats Cards */}

          {/* Filter Section */}
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
              <h4 className="fw-semibold mb-0">Sub-Contracts List</h4>
              <div className="d-flex align-items-center flex-wrap row-gap-2">
                {/* Status Filter */}
                <div className="dropdown me-3">
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-sm btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    {selectedStatus ? `Status: ${selectedStatus}` : 'Select Status'}
                  </Link>
                  <ul className="dropdown-menu dropdown-menu-end p-3">
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedStatus('');
                        }}
                      >
                        All Status
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedStatus('Active');
                        }}
                      >
                        Active
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedStatus('Inactive');
                        }}
                      >
                        Inactive
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* Sort Filter */}
                <div className="dropdown me-3">
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-sm btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    {selectedSort
                      ? `Sort: ${
                          selectedSort === 'asc'
                            ? 'A-Z'
                            : selectedSort === 'desc'
                              ? 'Z-A'
                              : selectedSort === 'recent'
                                ? 'Recent'
                                : selectedSort === 'oldest'
                                  ? 'Oldest'
                                  : 'Company'
                        }`
                      : 'Sort By'}
                  </Link>
                  <ul className="dropdown-menu dropdown-menu-end p-3">
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedSort('asc');
                        }}
                      >
                        A-Z
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedSort('desc');
                        }}
                      >
                        Z-A
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedSort('recent');
                        }}
                      >
                        Recently Added
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedSort('oldest');
                        }}
                      >
                        Oldest First
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedSort('company');
                        }}
                      >
                        By Company
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* Clear Filters */}
                {(selectedStatus || selectedSort) && (
                  <div className="me-3">
                    <Link
                      to="#"
                      className="btn btn-sm btn-outline-danger d-inline-flex align-items-center"
                      onClick={(e) => {
                        e.preventDefault();
                        handleClearFilters();
                      }}
                    >
                      <i className="ti ti-x me-1" />
                      Clear Filters
                    </Link>
                  </div>
                )}
              </div>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="text-muted mt-3">Loading sub-contracts...</p>
                </div>
              ) : error ? (
                <div className="text-center py-5">
                  <i className="ti ti-alert-circle fs-1 text-danger mb-3" />
                  <h6 className="text-danger">{error}</h6>
                  <button onClick={fetchSubContracts} className="btn btn-primary mt-3">
                    Try Again
                  </button>
                </div>
              ) : filteredSubContracts.length === 0 ? (
                <div className="text-center py-5">
                  <i className="ti ti-file-off fs-1 text-muted mb-3" />
                  <h6 className="text-muted">No sub-contracts found</h6>
                  <p className="text-muted small">
                    {subContracts.length === 0
                      ? 'No sub-contracts have been created yet'
                      : 'Try adjusting your filters'}
                  </p>
                </div>
              ) : (
                <Table columns={columns} dataSource={filteredSubContracts} />
              )}
            </div>
          </div>
        </div>
        <Footer />
      </div>
      {/* /Page Wrapper */}

      {/* Modal Components */}
      <AddSubContract />
      <EditSubContract />
      <DeleteSubContract />
    </>
  );
};

export default SubContractList;
