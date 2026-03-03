import { DatePicker } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CollapseHeader from '../../../../core/common/collapse-header/collapse-header';
import CommonSelect from '../../../../core/common/commonSelect';
import Table from '../../../../core/common/dataTable/index';
import Footer from '../../../../core/common/footer';
import { useAuth } from '../../../../hooks/useAuth';
import { LedgerFilters, transactionTypeDisplayMap, useLeaveLedger } from '../../../../hooks/useLeaveLedger';
import { useLeaveTypesREST } from '../../../../hooks/useLeaveTypesREST';
import { all_routes } from '../../../router/all_routes';
import { useAutoReloadActions } from '../../../../hooks/useAutoReload';

// Skeleton Loaders
const BalanceCardSkeleton = () => (
  <div className="col-xl-3 col-md-6 mb-3">
    <div className="card border border-light shadow-sm">
      <div className="card-body">
        <style>{`
          @keyframes skeleton-loading {
            0% { background-color: #e0e0e0; }
            50% { background-color: #f0f0f0; }
            100% { background-color: #e0e0e0; }
          }
          .skeleton-text {
            animation: skeleton-loading 1.5s ease-in-out infinite;
            border-radius: 4px;
          }
          .skeleton-balance-label {
            width: 120px;
            height: 14px;
            margin-bottom: 8px;
          }
          .skeleton-balance-value {
            width: 100px;
            height: 32px;
            margin-bottom: 4px;
          }
          .skeleton-balance-detail {
            width: 180px;
            height: 12px;
          }
          .skeleton-icon {
            width: 48px;
            height: 48px;
            border-radius: 8px;
          }
        `}</style>
        <div className="d-flex align-items-center justify-content-between">
          <div className="flex-grow-1">
            <div className="skeleton-text skeleton-balance-label"></div>
            <div className="skeleton-text skeleton-balance-value"></div>
            <div className="skeleton-text skeleton-balance-detail"></div>
          </div>
          <div className="skeleton-text skeleton-icon"></div>
        </div>
      </div>
    </div>
  </div>
);

const TableSkeleton = () => (
  <div className="p-4">
    <style>{`
      .skeleton-table-row {
        height: 60px;
        margin-bottom: 8px;
        border-radius: 4px;
      }
    `}</style>
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="skeleton-text skeleton-table-row"></div>
    ))}
  </div>
);

// Transaction type badge component
const TransactionTypeBadge = ({ transactionType }: { transactionType: string }) => {
  const config = transactionTypeDisplayMap[transactionType as keyof typeof transactionTypeDisplayMap] || {
    label: transactionType,
    color: 'default',
    icon: 'ti ti-circle'
  };

  const colorMap: Record<string, string> = {
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    info: 'bg-info',
    primary: 'bg-primary',
    purple: 'bg-purple',
    orange: 'bg-orange',
    default: 'bg-secondary'
  };

  return (
    <span className={`badge ${colorMap[config.color]} d-flex align-items-center`}>
      <i className={`${config.icon} me-1`} />
      {config.label}
    </span>
  );
};

// Amount display component (green for credit, red for debit)
const AmountDisplay = ({ amount, transactionType }: { amount: number; transactionType: string }) => {
  const isCredit = amount > 0 && ['allocated', 'restored', 'carry_forward'].includes(transactionType);
  const isDebit = amount < 0 || ['used', 'encashed', 'expired'].includes(transactionType);

  return (
    <span className={isCredit ? 'text-success' : isDebit ? 'text-danger' : ''}>
      {amount > 0 ? '+' : ''}{amount}
    </span>
  );
};

const LeaveLedger = () => {
  const { userId } = useAuth();
  const {
    transactions,
    summary,
    loading,
    fetchMyBalanceHistory,
    fetchMyBalanceSummary,
  } = useLeaveLedger();

  // Auto-reload hook for refetching after actions
  const { refetchAfterAction } = useAutoReloadActions({
    fetchFn: () => {
      fetchMyBalanceHistory();
      fetchMyBalanceSummary();
    },
    debug: true,
  });

  // Fetch active leave types from database
  const { activeOptions, fetchActiveLeaveTypes } = useLeaveTypesREST();

  // Create dynamic leave type display map from database
  // Maps both ObjectId (new system) and code (legacy) to display name
  const leaveTypeDisplayMap = useMemo(() => {
    const map: Record<string, string> = {};
    activeOptions.forEach(option => {
      // Map by ObjectId (new system) - primary key
      map[option.value] = String(option.label);
      // Map by code (legacy) - fallback for backward compatibility
      if (option.code) {
        map[option.code.toLowerCase()] = String(option.label);
      }
    });
    return map;
  }, [activeOptions]);

  // Filters state
  const [filters, setFilters] = useState<LedgerFilters>({
    limit: 100
  });

  // Date range state
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);

  // Fetch data on mount
  useEffect(() => {
    fetchActiveLeaveTypes();
    fetchMyBalanceSummary();
    fetchMyBalanceHistory(filters);
  }, [fetchActiveLeaveTypes]);

  // Leave type filter options - fetched from database, use ObjectId value
  const leaveTypeOptions = useMemo(() => {
    return [
      { value: '', label: 'All Types' },
      ...activeOptions.map((lt) => ({
        value: lt.value, // ObjectId for filtering
        label: lt.label,
      }))
    ];
  }, [activeOptions]);

  // Dynamic year options - current year +/- 2 years
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const options = [{ value: '', label: 'All Years' }];
    for (let year = currentYear - 2; year <= currentYear + 1; year++) {
      options.push({ value: year.toString(), label: year.toString() });
    }
    return options;
  }, []);

  // Handle filter changes
  const handleFilterChange = (key: string, value: string) => {
    const newFilters: LedgerFilters = {
      ...filters,
      [key]: value || undefined,
    };
    setFilters(newFilters);
    fetchMyBalanceHistory(newFilters);
  };

  // Handle date range change
  const handleDateRangeChange = (dates: any) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange(dates);
      fetchMyBalanceHistory({
        ...filters,
        startDate: dates[0].startOf('day').toISOString(),
        endDate: dates[1].endOf('day').toISOString(),
      });
    } else {
      setDateRange(null);
      fetchMyBalanceHistory(filters);
    }
  };

  // Transform transactions for table
  const tableData = useMemo(() => {
    return transactions.map((tx) => ({
      key: tx._id,
      _id: tx._id,
      Date: dayjs(tx.transactionDate).format('DD MMM YYYY'),
      // Use dynamic leave type name from summary, fallback to leaveTypeDisplayMap, then raw code
      'Leave Type': summary?.[tx.leaveType]?.leaveTypeName || leaveTypeDisplayMap[tx.leaveType] || tx.leaveType,
      Transaction: tx.transactionType,
      Amount: tx.amount,
      'Balance Before': tx.balanceBefore,
      'Balance After': tx.balanceAfter,
      Description: tx.description,
      'Changed By': tx.changedBy ? `${tx.changedBy.firstName} ${tx.changedBy.lastName}` : '-',
      rawTransaction: tx,
    }));
  }, [transactions, summary]);

  // Table columns
  const columns = [
    {
      title: 'Date',
      dataIndex: 'Date',
      sorter: (a: any, b: any) => dayjs(a.Date).unix() - dayjs(b.Date).unix(),
      width: 120,
    },
    {
      title: 'Leave Type',
      dataIndex: 'Leave Type',
      sorter: (a: any, b: any) => a['Leave Type'].length - b['Leave Type'].length,
      width: 150,
    },
    {
      title: 'Transaction',
      dataIndex: 'Transaction',
      render: (transactionType: string) => <TransactionTypeBadge transactionType={transactionType} />,
      sorter: (a: any, b: any) => a.Transaction.length - b.Transaction.length,
      width: 180,
    },
    {
      title: 'Amount',
      dataIndex: 'Amount',
      render: (amount: number, record: any) => (
        <AmountDisplay amount={amount} transactionType={record.Transaction} />
      ),
      sorter: (a: any, b: any) => a.Amount - b.Amount,
      width: 100,
    },
    {
      title: 'Balance Before',
      dataIndex: 'Balance Before',
      sorter: (a: any, b: any) => a['Balance Before'] - b['Balance Before'],
      width: 120,
    },
    {
      title: 'Balance After',
      dataIndex: 'Balance After',
      sorter: (a: any, b: any) => a['Balance After'] - b['Balance After'],
      width: 120,
    },
    {
      title: 'Description',
      dataIndex: 'Description',
      ellipsis: true,
      width: 200,
    },
    {
      title: 'Changed By',
      dataIndex: 'Changed By',
      width: 150,
    },
  ];

  return (
    <>
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Leave Balance History</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={all_routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">HRM</li>
                  <li className="breadcrumb-item">Leaves</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Balance History
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
              <div className="head-icons ms-2">
                <CollapseHeader />
              </div>
            </div>
          </div>

          {/* Balance Summary Cards */}
          {summary ? (
            <div className="row mb-3">
              {Object.entries(summary).map(([leaveType, data]) => (
                <div key={leaveType} className="col-xl-3 col-md-6 mb-3">
                  <div className="card">
                    <div className="card-body">
                      <div className="d-flex align-items-center justify-content-between">
                        <div>
                          <p className="mb-1 text-muted">
                            {data.leaveTypeName || leaveTypeDisplayMap[leaveType] || leaveType}
                          </p>
                          <h4 className="mb-0">
                            {data.balance} <span className="fs-14 text-muted">/ {data.total}</span>
                          </h4>
                          <small className="text-muted">
                            {data.isPaid !== false ? 'Paid' : 'Unpaid'} • Used: {data.used} | Pending: {(Math.abs(data.total - data.used - data.balance)).toFixed(1)}
                          </small>
                        </div>
                        <div className="avatar avatar-md bg-primary-transparent rounded">
                          <i className="ti ti-calendar-event fs-24 text-primary" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="row mb-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <BalanceCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Filters */}
          <div className="card mb-3">
            <div className="card-body">
              <div className="d-flex flex-wrap gap-3 align-items-center">
                <div>
                  <label className="form-label mb-1">Leave Type</label>
                  <CommonSelect
                    className="select"
                    options={leaveTypeOptions}
                    value={filters.leaveType || ''}
                    onChange={(option) => handleFilterChange('leaveType', option.value)}
                  />
                </div>
                <div>
                  <label className="form-label mb-1">Year</label>
                  <CommonSelect
                    className="select"
                    options={yearOptions}
                    value={filters.year?.toString() || ''}
                    onChange={(option) => handleFilterChange('year', option.value)}
                  />
                </div>
                <div>
                  <label className="form-label mb-1">Date Range</label>
                  <DatePicker.RangePicker
                    value={dateRange}
                    onChange={handleDateRangeChange}
                    format="DD MMM YYYY"
                  />
                </div>
                <div className="ms-auto">
                  <button
                    className="btn btn-white"
                    onClick={() => {
                      setFilters({ limit: 100 });
                      setDateRange(null);
                      fetchMyBalanceHistory({ limit: 100 });
                    }}
                  >
                    <i className="ti ti-refresh me-1" />
                    Reset Filters
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h5 className="mb-0">
                Transaction History
                <span className="badge bg-primary-transparent ms-2">
                  {loading && transactions.length === 0 ? 0 : transactions.length} records
                </span>
              </h5>
            </div>
            <div className="card-body p-0">
              {loading && transactions.length === 0 ? (
                <TableSkeleton />
              ) : (
                <div className="table-responsive">
                  <Table
                    columns={columns}
                    dataSource={tableData}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default LeaveLedger;
