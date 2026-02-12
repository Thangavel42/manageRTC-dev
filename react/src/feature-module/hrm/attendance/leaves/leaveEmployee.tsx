import { DatePicker, message, Spin } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CollapseHeader from "../../../../core/common/collapse-header/collapse-header";
import CommonSelect from "../../../../core/common/commonSelect";
import Table from "../../../../core/common/dataTable/index";
import PredefinedDateRanges from "../../../../core/common/datePicker";
import Footer from "../../../../core/common/footer";
import { useEmployeesREST } from "../../../../hooks/useEmployeesREST";
import { leaveTypeDisplayMap, statusDisplayMap, useLeaveREST, type LeaveStatus, type LeaveType } from "../../../../hooks/useLeaveREST";
import { useLeaveTypesREST } from "../../../../hooks/useLeaveTypesREST";
import { all_routes } from "../../../router/all_routes";

// Loading spinner component
const LoadingSpinner = () => (
  <div style={{ textAlign: 'center', padding: '50px' }}>
    <Spin size="large" />
  </div>
);

// Status badge component
const StatusBadge = ({ status }: { status: LeaveStatus }) => {
  const config = statusDisplayMap[status] || statusDisplayMap.pending;
  return (
    <span
      className={`rounded-circle ${config.badgeClass} d-flex justify-content-center align-items-center me-2`}
    >
      <i className={`ti ti-point-filled ${config.color}`} />
    </span>
  );
};

// Leave type badge component
const LeaveTypeBadge = ({ leaveType }: { leaveType: string }) => {
  const displayType = leaveTypeDisplayMap[leaveType] || leaveType;
  return (
    <span className="fs-14 fw-medium d-flex align-items-center">
      {displayType}
      <Link
        to="#"
        className="ms-2"
        data-bs-toggle="tooltip"
        data-bs-placement="right"
        title="Leave details"
      >
        <i className="ti ti-info-circle text-info" />
      </Link>
    </span>
  );
};

const normalizeDate = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const toDateValue = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const calculateLeaveDays = (startDate: any, endDate: any, session: string): number => {
  const start = toDateValue(startDate);
  const end = toDateValue(endDate);
  if (!start || !end) return 0;

  const normalizedStart = normalizeDate(start);
  const normalizedEnd = normalizeDate(end);
  if (normalizedEnd < normalizedStart) return 0;

  const diffMs = normalizedEnd.getTime() - normalizedStart.getTime();
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  if (session === "First Half" || session === "Second Half") {
    return Math.max(0.5, totalDays - 0.5);
  }
  return totalDays;
};

const LeaveEmployee = () => {
  // API hook for employee's leaves
  const { leaves, loading, fetchMyLeaves, cancelLeave, getLeaveBalance, createLeave, updateLeave } = useLeaveREST();
  const { activeOptions, fetchActiveLeaveTypes } = useLeaveTypesREST();
  const { employees: reportingManagers, fetchActiveEmployeesList: fetchReportingManagers } = useEmployeesREST();

  // Local state for balance
  const [balances, setBalances] = useState<Record<string, { total: number; used: number; balance: number }>>({
    annual: { total: 12, used: 5, balance: 7 },
    medical: { total: 12, used: 1, balance: 11 },
    casual: { total: 12, used: 2, balance: 10 },
    other: { total: 5, used: 0, balance: 5 },
  });

  // Form state for Add Leave modal
  const [addFormData, setAddFormData] = useState({
    leaveType: '',
    startDate: null as any,
    endDate: null as any,
    session: '',
    reason: '',
    noOfDays: 0,
    reportingManagerId: '',
  });

  // Form state for Edit Leave modal
  const [editFormData, setEditFormData] = useState<{
    _id: string;
    leaveType: string;
    startDate: any;
    endDate: any;
    session: string;
    reason: string;
    noOfDays: number;
  } | null>(null);

  const [selectedLeave, setSelectedLeave] = useState<any | null>(null);

  // Fetch employee leaves on mount
  useEffect(() => {
    fetchMyLeaves();
    // Also fetch balance
    fetchBalanceData();
  }, []);

  useEffect(() => {
    fetchActiveLeaveTypes();
  }, [fetchActiveLeaveTypes]);

  useEffect(() => {
    fetchReportingManagers();
  }, [fetchReportingManagers]);

  useEffect(() => {
    if (!addFormData.leaveType && addFormData.session) {
      setAddFormData(prev => ({ ...prev, session: '' }));
    }
  }, [addFormData.leaveType, addFormData.session]);

  useEffect(() => {
    const days = calculateLeaveDays(addFormData.startDate, addFormData.endDate, addFormData.session);
    setAddFormData(prev => (prev.noOfDays === days ? prev : { ...prev, noOfDays: days }));
  }, [addFormData.startDate, addFormData.endDate, addFormData.session]);

  useEffect(() => {
    if (!editFormData) return;
    if (!editFormData.leaveType && editFormData.session) {
      setEditFormData(prev => (prev ? { ...prev, session: '' } : prev));
      return;
    }
    const days = calculateLeaveDays(editFormData.startDate, editFormData.endDate, editFormData.session);
    setEditFormData(prev => (prev && prev.noOfDays === days ? prev : prev ? { ...prev, noOfDays: days } : prev));
  }, [editFormData?.leaveType, editFormData?.startDate, editFormData?.endDate, editFormData?.session]);

  // Fetch balance data
  const fetchBalanceData = async () => {
    const balanceData = await getLeaveBalance();
    if (balanceData && typeof balanceData === 'object') {
      // Transform balance data to UI format
      const transformedBalances: Record<string, { total: number; used: number; balance: number }> = {};
      Object.entries(balanceData).forEach(([key, value]: [string, any]) => {
        if (value && typeof value === 'object') {
          transformedBalances[key] = {
            total: value.total || 0,
            used: value.used || 0,
            balance: value.balance || 0,
          };
        }
      });
      setBalances(transformedBalances);
    }
  };

  // Transform leaves for table display
  const data = leaves.map((leave) => ({
    key: leave._id,
    _id: leave._id,
    LeaveType: leave.leaveType,
    From: formatDate(leave.startDate),
    To: formatDate(leave.endDate),
    NoOfDays: `${leave.duration} Day${leave.duration > 1 ? 's' : ''}`,
    ReportingManager: leave.reportingManagerName || "-",
    ManagerStatus: leave.managerStatus || 'pending',
    Status: leave.finalStatus || leave.status,
    Roll: "Employee", // Should come from employee data
    Image: "user-32.jpg", // Default image
    rawLeave: leave,
  }));

  // Helper function to format dates
  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // Handler for cancel leave
  const handleCancelLeave = async (leaveId: string) => {
    const reason = prompt("Please enter cancellation reason (optional):");
    const success = await cancelLeave(leaveId, reason || "Cancelled by employee");
    if (success) {
      fetchMyLeaves(); // Refresh list
      fetchBalanceData(); // Refresh balance
    }
  };

  // Handler for Add Leave form submission
  const handleAddLeaveSubmit = async () => {
    if (!addFormData.leaveType) {
      message.error('Please select a leave type');
      return;
    }
    if (!addFormData.reportingManagerId) {
      message.error('Reporting Manager is required');
      return;
    }
    if (!addFormData.startDate) {
      message.error('Please select a start date');
      return;
    }
    if (!addFormData.endDate) {
      message.error('Please select an end date');
      return;
    }
    if (!addFormData.session) {
      message.error('Please select day type');
      return;
    }
    if (!addFormData.reason.trim()) {
      message.error('Please provide a reason for the leave');
      return;
    }

    const success = await createLeave({
      leaveType: addFormData.leaveType as any,
      startDate: addFormData.startDate.format('YYYY-MM-DD'),
      endDate: addFormData.endDate.format('YYYY-MM-DD'),
      reason: addFormData.reason,
      reportingManagerId: addFormData.reportingManagerId,
      employeeStatus: 'pending',
      managerStatus: 'pending',
      hrStatus: 'pending',
    });

    if (success) {
      // Reset form and close modal
      setAddFormData({
        leaveType: '',
        startDate: null,
        endDate: null,
        session: '',
        reason: '',
        noOfDays: 0,
        reportingManagerId: '',
      });
      // Close modal using Bootstrap API
      const modalEl = document.getElementById('add_leaves');
      if (modalEl) {
        const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
      }
      // Refresh data
      fetchMyLeaves();
      fetchBalanceData();
    }
  };

  // Handler for Edit Leave button click
  const handleEditClick = (leave: any) => {
    setEditFormData({
      _id: leave._id,
      leaveType: leave.leaveType,
      startDate: leave.startDate,
      endDate: leave.endDate,
      session: 'Full Day',
      reason: leave.reason || '',
      noOfDays: calculateLeaveDays(leave.startDate, leave.endDate, 'Full Day'),
    });
  };

  // Handler for Edit Leave form submission
  const handleEditLeaveSubmit = async () => {
    if (!editFormData) return;

    if (!editFormData.leaveType) {
      message.error('Please select a leave type');
      return;
    }
    if (!editFormData.startDate) {
      message.error('Please select a start date');
      return;
    }
    if (!editFormData.endDate) {
      message.error('Please select an end date');
      return;
    }
    if (!editFormData.session) {
      message.error('Please select day type');
      return;
    }
    if (!editFormData.reason.trim()) {
      message.error('Please provide a reason for the leave');
      return;
    }

    const success = await updateLeave(editFormData._id, {
      leaveType: editFormData.leaveType as any,
      startDate: editFormData.startDate,
      endDate: editFormData.endDate,
      reason: editFormData.reason,
    });

    if (success) {
      setEditFormData(null);
      // Close modal using Bootstrap API
      const modalEl = document.getElementById('edit_leaves');
      if (modalEl) {
        const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
      }
      // Refresh data
      fetchMyLeaves();
      fetchBalanceData();
    }
  };
  const columns = [
    {
      title: "Leave Type",
      dataIndex: "LeaveType",
      render: (leaveType: string) => <LeaveTypeBadge leaveType={leaveType} />,
      sorter: (a: any, b: any) => a.LeaveType.length - b.LeaveType.length,
    },
    {
      title: "Reporting Manager",
      dataIndex: "ReportingManager",
      sorter: (a: any, b: any) => a.ReportingManager.localeCompare(b.ReportingManager),
    },
    {
      title: "From",
      dataIndex: "From",
      sorter: (a: any, b: any) => a.From.length - b.From.length,
    },
    {
      title: "To",
      dataIndex: "To",
      sorter: (a: any, b: any) => a.To.length - b.To.length,
    },
    {
      title: "No of Days",
      dataIndex: "NoOfDays",
      sorter: (a: any, b: any) => a.NoOfDays.length - b.NoOfDays.length,
    },
    {
      title: "Manager Status",
      dataIndex: "ManagerStatus",
      render: (status: LeaveStatus) => <StatusBadge status={status} />,
      sorter: (a: any, b: any) => a.ManagerStatus.localeCompare(b.ManagerStatus),
    },
    {
      title: "Status",
      dataIndex: "Status",
      render: (status: LeaveStatus) => <StatusBadge status={status} />,
      sorter: (a: any, b: any) => a.Status.localeCompare(b.Status),
    },
    {
      title: "",
      dataIndex: "actions",
      render: (_: any, record: any) => (
        <div className="action-icon d-inline-flex">
          {/* Show cancel button for pending leaves */}
          {record.Status === 'pending' && (
            <Link
              to="#"
              className="me-2"
              data-bs-toggle="tooltip"
              title="Cancel Leave"
              onClick={() => handleCancelLeave(record._id)}
            >
              <i className="ti ti-x text-warning" style={{ fontSize: '18px' }} />
            </Link>
          )}
          <Link
            to="#"
            className="me-2"
            data-bs-toggle="modal"
            data-inert={true}
            data-bs-target="#leave_details"
            onClick={() => setSelectedLeave(record.rawLeave)}
          >
            <i className="ti ti-eye" />
          </Link>
        </div>
      ),
    },
  ];

  // Dropdown options with proper backend values
  const leavetype = [
    { value: "", label: "All Types" },
    { value: "sick", label: "Medical Leave" },
    { value: "casual", label: "Casual Leave" },
    { value: "earned", label: "Annual Leave" },
  ];

  const statusOptions = [
    { value: "", label: "All Status" },
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
  ];

  const dayTypeOptions = useMemo(() => [
    { value: "", label: "Select Day Type" },
    { value: "Full Day", label: "Full Day" },
    { value: "First Half", label: "First Half" },
    { value: "Second Half", label: "Second Half" },
  ], []);

  const leaveTypeOptions = useMemo(() => {
    const fallbackOptions = Object.entries(leaveTypeDisplayMap).map(([value, label]) => ({ value, label }));
    const apiOptions = activeOptions.length
      ? activeOptions.map(option => ({ value: option.value.toLowerCase(), label: option.label }))
      : fallbackOptions;
    return [{ value: "", label: "Select Leave Type" }, ...apiOptions];
  }, [activeOptions]);

  const reportingManagerOptions = useMemo(() => {
    const options = reportingManagers.map(manager => {
      const name = `${manager.firstName || ''} ${manager.lastName || ''}`.trim() || manager.fullName || 'Unknown';
      const id = manager.employeeId ? ` (${manager.employeeId})` : '';
      const department = manager.department ? ` - ${manager.department}` : manager.departmentId ? ` - ${manager.departmentId}` : '';
      return {
        value: manager.employeeId,
        label: `${name}${id}${department}`
      };
    });
    return [{ value: "", label: "Select Reporting Manager" }, ...options];
  }, [reportingManagers]);

  // Filter handlers
  const handleStatusFilter = (status: LeaveStatus) => {
    // Re-fetch with status filter
    fetchMyLeaves({ status });
  };

  const handleLeaveTypeFilter = (leaveType: LeaveType) => {
    // Re-fetch with leave type filter
    fetchMyLeaves({ leaveType });
  };

  // Calculate stats from leaves data
  const stats = {
    annualLeaves: leaves.filter(l => l.leaveType === 'earned').length,
    medicalLeaves: leaves.filter(l => l.leaveType === 'sick').length,
    casualLeaves: leaves.filter(l => l.leaveType === 'casual').length,
    otherLeaves: leaves.filter(l => !['sick', 'casual', 'earned'].includes(l.leaveType)).length,
  };

  // Calculate total leaves and total remaining
  const totalLeaves = leaves.length;
  const totalRemaining = Object.values(balances).reduce((sum, b) => sum + b.balance, 0);

  const getModalContainer = () => {
    const modalElement = document.getElementById("modal-datepicker");
    return modalElement ? modalElement : document.body; // Fallback to document.body if modalElement is null
  };

  return (
    <>
      {/* Page Wrapper */}
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Leaves</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={all_routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">Employee</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Leaves
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
                  data-bs-target="#add_leaves"
                  className="btn btn-primary d-flex align-items-center"
                >
                  <i className="ti ti-circle-plus me-2" />
                  Add Leave
                </Link>
              </div>
              <div className="head-icons ms-2">
                <CollapseHeader />
              </div>
            </div>
          </div>
          {/* /Breadcrumb */}
          {/* Leaves Info */}
          <div className="row">
            <div className="col-xl-3 col-md-6">
              <div className="card bg-black-le">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="text-start">
                      <p className="mb-1">Annual Leaves</p>
                      <h4>{balances.annual?.used || 0}</h4>
                    </div>
                    <div className="d-flex">
                      <div className="flex-shrink-0 me-2">
                        <span className="avatar avatar-md d-flex">
                          <i className="ti ti-calendar-event fs-32" />
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="badge bg-secondary-transparent">
                    Remaining Leaves : {balances.annual?.balance || 0}
                  </span>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-md-6">
              <div className="card bg-blue-le">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="text-start">
                      <p className="mb-1">Medical Leaves</p>
                      <h4>{balances.medical?.used || 0}</h4>
                    </div>
                    <div className="d-flex">
                      <div className="flex-shrink-0 me-2">
                        <span className="avatar avatar-md d-flex">
                          <i className="ti ti-vaccine fs-32" />
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="badge bg-info-transparent">
                    Remaining Leaves : {balances.medical?.balance || 0}
                  </span>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-md-6">
              <div className="card bg-purple-le">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="text-start">
                      <p className="mb-1">Casual Leaves</p>
                      <h4>{balances.casual?.used || 0}</h4>
                    </div>
                    <div className="d-flex">
                      <div className="flex-shrink-0 me-2">
                        <span className="avatar avatar-md d-flex">
                          <i className="ti ti-hexagon-letter-c fs-32" />
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="badge bg-transparent-purple">
                    Remaining Leaves : {balances.casual?.balance || 0}
                  </span>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-md-6">
              <div className="card bg-pink-le">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="text-start">
                      <p className="mb-1">Other Leaves</p>
                      <h4>{balances.other?.used || 0}</h4>
                    </div>
                    <div className="d-flex">
                      <div className="flex-shrink-0 me-2">
                        <span className="avatar avatar-md d-flex">
                          <i className="ti ti-hexagonal-prism-plus fs-32" />
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="badge bg-pink-transparent">
                    Remaining Leaves : {balances.other?.balance || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
          {/* /Leaves Info */}
          {/* Leaves list */}
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
              <div className="d-flex">
                <h5 className="me-2">Leave List</h5>
                <span className="badge bg-primary-transparent me-2">
                  Total Leaves : {totalLeaves}
                </span>
                <span className="badge bg-secondary-transparent">
                  Total Remaining Leaves : {totalRemaining}
                </span>
              </div>
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
                    className="dropdown-toggle btn btn-sm btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    Leave Type
                  </Link>
                  <ul className="dropdown-menu  dropdown-menu-end p-3">
                    {leavetype.map((option) => (
                      <li key={option.value}>
                        <Link
                          to="#"
                          className="dropdown-item rounded-1"
                          onClick={(e) => {
                            e.preventDefault();
                            handleLeaveTypeFilter(option.value as LeaveType);
                          }}
                        >
                          {option.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="dropdown me-3">
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-sm btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    Approved By
                  </Link>
                  <ul className="dropdown-menu  dropdown-menu-end p-3">
                    <li>
                      <Link to="#" className="dropdown-item rounded-1">
                        Doglas Martini
                      </Link>
                    </li>
                    <li>
                      <Link to="#" className="dropdown-item rounded-1">
                        Warren Morales
                      </Link>
                    </li>
                    <li>
                      <Link to="#" className="dropdown-item rounded-1">
                        Doglas Martini
                      </Link>
                    </li>
                  </ul>
                </div>
                <div className="dropdown me-3">
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-sm btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    Select Status
                  </Link>
                  <ul className="dropdown-menu  dropdown-menu-end p-3">
                    {statusOptions.map((option) => {
                      if (option.value === "") {
                        return (
                          <li key={option.value}>
                            <Link
                              to="#"
                              className="dropdown-item rounded-1"
                              onClick={(e) => {
                                e.preventDefault();
                                handleStatusFilter(option.value as LeaveStatus);
                              }}
                            >
                              {option.label}
                            </Link>
                          </li>
                        );
                      }
                      const config = statusDisplayMap[option.value as LeaveStatus];
                      return (
                        <li key={option.value}>
                          <Link
                            to="#"
                            className="dropdown-item rounded-1 d-flex justify-content-start align-items-center"
                            onClick={(e) => {
                              e.preventDefault();
                              handleStatusFilter(option.value as LeaveStatus);
                            }}
                          >
                            <span className={`rounded-circle ${config.badgeClass} d-flex justify-content-center align-items-center me-2`}>
                              <i className={`ti ti-point-filled ${config.color}`} />
                            </span>
                            {config.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div className="dropdown">
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-sm btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    Sort By : Last 7 Days
                  </Link>
                  <ul className="dropdown-menu  dropdown-menu-end p-3">
                    <li>
                      <Link to="#" className="dropdown-item rounded-1">
                        Recently Added
                      </Link>
                    </li>
                    <li>
                      <Link to="#" className="dropdown-item rounded-1">
                        Ascending
                      </Link>
                    </li>
                    <li>
                      <Link to="#" className="dropdown-item rounded-1">
                        Desending
                      </Link>
                    </li>
                    <li>
                      <Link to="#" className="dropdown-item rounded-1">
                        Last Month
                      </Link>
                    </li>
                    <li>
                      <Link to="#" className="dropdown-item rounded-1">
                        Last 7 Days
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <LoadingSpinner />
              ) : (
                <Table dataSource={data} columns={columns} Selection={true} />
              )}
            </div>
          </div>
          {/* /Leaves list */}
        </div>
        <Footer />
      </div>
      {/* /Page Wrapper */}
      {/* Add Leaves */}
      <div className="modal fade" id="add_leaves">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Add Leave</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={() => setAddFormData({
                  leaveType: '',
                  startDate: null,
                  endDate: null,
                  session: '',
                  reason: '',
                  noOfDays: 0,
                  reportingManagerId: '',
                })}
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form>
              <div className="modal-body pb-0">
                <div className="row">
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Leave Type</label>
                      <CommonSelect
                        className="select"
                        options={leaveTypeOptions}
                        value={addFormData.leaveType}
                        onChange={(option: any) => setAddFormData({ ...addFormData, leaveType: option?.value || '' })}
                      />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Reporting Manager</label>
                      <CommonSelect
                        className="select"
                        options={reportingManagerOptions}
                        value={addFormData.reportingManagerId}
                        onChange={(option: any) => setAddFormData({ ...addFormData, reportingManagerId: option?.value || '' })}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">From </label>
                      <div className="input-icon-end position-relative">
                        <DatePicker
                          className="form-control datetimepicker"
                          format={{
                            format: "DD-MM-YYYY",
                            type: "mask",
                          }}
                          getPopupContainer={getModalContainer}
                          placeholder="DD-MM-YYYY"
                          value={addFormData.startDate}
                          onChange={(date) => setAddFormData({ ...addFormData, startDate: date })}
                        />
                        <span className="input-icon-addon">
                          <i className="ti ti-calendar text-gray-7" />
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">To </label>
                      <div className="input-icon-end position-relative">
                        <DatePicker
                          className="form-control datetimepicker"
                          format={{
                            format: "DD-MM-YYYY",
                            type: "mask",
                          }}
                          getPopupContainer={getModalContainer}
                          placeholder="DD-MM-YYYY"
                          value={addFormData.endDate}
                          onChange={(date) => setAddFormData({ ...addFormData, endDate: date })}
                        />
                        <span className="input-icon-addon">
                          <i className="ti ti-calendar text-gray-7" />
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <CommonSelect
                        className="select"
                        options={dayTypeOptions}
                        value={addFormData.session}
                        disabled={!addFormData.leaveType}
                        onChange={(option: any) => setAddFormData({ ...addFormData, session: option?.value || '' })}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">No of Days</label>
                      <input
                        type="text"
                        className="form-control"
                        value={addFormData.noOfDays.toString()}
                        disabled
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Remaining Days</label>
                      <input
                        type="text"
                        className="form-control"
                        defaultValue={8}
                        disabled
                      />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Reason</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        placeholder="Enter reason for leave"
                        value={addFormData.reason}
                        onChange={(e) => setAddFormData({ ...addFormData, reason: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Attachment Upload - Phase 4 */}
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Attachments (Optional)</label>
                      <div className="alert alert-info" role="alert">
                        <i className="ti ti-info-circle me-2"></i>
                        Supporting documents (medical certificates, etc.) can be uploaded after creating the leave request.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-light me-2"
                  data-bs-dismiss="modal"
                  onClick={() => setAddFormData({
                    leaveType: '',
                    startDate: null,
                    endDate: null,
                    session: '',
                    reason: '',
                    noOfDays: 0,
                    reportingManagerId: '',
                  })}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAddLeaveSubmit}
                >
                  Add Leave
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Add Leaves */}
      {/* Edit Leaves */}
      <div className="modal fade" id="edit_leaves">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Edit Leave</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={() => setEditFormData(null)}
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form>
              <div className="modal-body pb-0">
                <div className="row">
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Leave Type</label>
                      <CommonSelect
                        className="select"
                        options={leaveTypeOptions}
                        value={editFormData?.leaveType || ''}
                        onChange={(option: any) => editFormData && setEditFormData({ ...editFormData, leaveType: option?.value || '' })}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">From </label>
                      <div className="input-icon-end position-relative">
                        <DatePicker
                          className="form-control datetimepicker"
                          format={{
                            format: "DD-MM-YYYY",
                            type: "mask",
                          }}
                          getPopupContainer={getModalContainer}
                          placeholder="DD-MM-YYYY"
                          value={editFormData?.startDate ? editFormData.startDate : null}
                          onChange={(date) => editFormData && setEditFormData({ ...editFormData, startDate: date })}
                        />
                        <span className="input-icon-addon">
                          <i className="ti ti-calendar text-gray-7" />
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">To </label>
                      <div className="input-icon-end position-relative">
                        <DatePicker
                          className="form-control datetimepicker"
                          format={{
                            format: "DD-MM-YYYY",
                            type: "mask",
                          }}
                          getPopupContainer={getModalContainer}
                          placeholder="DD-MM-YYYY"
                          value={editFormData?.endDate ? editFormData.endDate : null}
                          onChange={(date) => editFormData && setEditFormData({ ...editFormData, endDate: date })}
                        />
                        <span className="input-icon-addon">
                          <i className="ti ti-calendar text-gray-7" />
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <div className="input-icon-end position-relative">
                        <input
                          type="text"
                          className="form-control datetimepicker"
                          value={editFormData?.startDate ? editFormData.startDate.format('DD/MM/YY') : ''}
                          disabled
                        />
                        <span className="input-icon-addon">
                          <i className="ti ti-calendar text-gray-7" />
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <CommonSelect
                        className="select"
                        options={dayTypeOptions}
                        value={editFormData?.session || ''}
                        disabled={!editFormData?.leaveType}
                        onChange={(option: any) => editFormData && setEditFormData({ ...editFormData, session: option?.value || '' })}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">No of Days</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editFormData?.noOfDays?.toString() || '0'}
                        disabled
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Remaining Days</label>
                      <input
                        type="text"
                        className="form-control"
                        defaultValue={"07"}
                        disabled
                      />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="d-flex align-items-center mb-3">
                      <div className="form-check me-2">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="leave1"
                          defaultValue="option4"
                          id="leave6"
                          checked={editFormData?.session === 'Full Day'}
                          onChange={() => editFormData && setEditFormData({ ...editFormData, session: 'Full Day' })}
                        />
                        <label className="form-check-label" htmlFor="leave6">
                          Full Day
                        </label>
                      </div>
                      <div className="form-check me-2">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="leave1"
                          defaultValue="option5"
                          id="leave5"
                          checked={editFormData?.session === 'First Half'}
                          onChange={() => editFormData && setEditFormData({ ...editFormData, session: 'First Half' })}
                        />
                        <label className="form-check-label" htmlFor="leave5">
                          First Half
                        </label>
                      </div>
                      <div className="form-check me-2">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="leave1"
                          defaultValue="option6"
                          id="leave4"
                          checked={editFormData?.session === 'Second Half'}
                          onChange={() => editFormData && setEditFormData({ ...editFormData, session: 'Second Half' })}
                        />
                        <label className="form-check-label" htmlFor="leave4">
                          Second Half
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Reason</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        value={editFormData?.reason || ''}
                        onChange={(e) => editFormData && setEditFormData({ ...editFormData, reason: e.target.value })}
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
                  onClick={() => setEditFormData(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleEditLeaveSubmit}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Edit Leaves */}
      {/* Leave Details Modal */}
      <div className="modal fade" id="leave_details" tabIndex={-1}>
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Leave Details</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={() => setSelectedLeave(null)}
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="modal-body">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Leave Type</label>
                  <div className="fw-medium">
                    {selectedLeave ? (leaveTypeDisplayMap[selectedLeave.leaveType] || selectedLeave.leaveType) : "-"}
                  </div>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Status</label>
                  <div className="fw-medium">
                    {selectedLeave ? (statusDisplayMap[selectedLeave.finalStatus || selectedLeave.status]?.label || selectedLeave.finalStatus || selectedLeave.status) : "-"}
                  </div>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">From</label>
                  <div className="fw-medium">
                    {selectedLeave ? formatDate(selectedLeave.startDate) : "-"}
                  </div>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">To</label>
                  <div className="fw-medium">
                    {selectedLeave ? formatDate(selectedLeave.endDate) : "-"}
                  </div>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">No. of Days</label>
                  <div className="fw-medium">
                    {selectedLeave ? `${selectedLeave.duration} Day${selectedLeave.duration > 1 ? 's' : ''}` : "-"}
                  </div>
                </div>
                <div className="col-md-12 mb-3">
                  <label className="form-label">Reason</label>
                  <div className="fw-medium">{selectedLeave?.reason || "-"}</div>
                </div>
                <div className="col-md-12">
                  <div className="leave-info-card">
                    <h4>Reporting Manager</h4>
                    <p><strong>Name:</strong> {selectedLeave?.reportingManagerName || '-'}</p>
                    <p>
                      <strong>Status:</strong>{' '}
                      <StatusBadge status={selectedLeave?.managerStatus || 'pending'} />
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-light"
                data-bs-dismiss="modal"
                onClick={() => setSelectedLeave(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* /Leave Details Modal */}
    </>
  );
};

export default LeaveEmployee;
