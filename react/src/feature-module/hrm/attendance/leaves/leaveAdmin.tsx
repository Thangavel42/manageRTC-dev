import { DatePicker, message, Spin } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CollapseHeader from "../../../../core/common/collapse-header/collapse-header";
import CommonSelect from "../../../../core/common/commonSelect";
import Table from "../../../../core/common/dataTable/index";
import PredefinedDateRanges from "../../../../core/common/datePicker";
import Footer from "../../../../core/common/footer";
import ImageWithBasePath from "../../../../core/common/imageWithBasePath";
import { useAuth } from "../../../../hooks/useAuth";
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
  // Ensure we have a valid status, default to pending if not
  const validStatus = (status || 'pending') as LeaveStatus;
  const config = statusDisplayMap[validStatus] || statusDisplayMap.pending;

  // Color mapping for leave statuses
  const statusColors: Record<LeaveStatus, { backgroundColor: string; color: string }> = {
    approved: { backgroundColor: '#03c95a', color: '#ffffff' },
    rejected: { backgroundColor: '#f8220a', color: '#ffffff' },
    pending: { backgroundColor: '#fed24e', color: '#ffffff' },
    cancelled: { backgroundColor: '#6c757d', color: '#ffffff' },
    'on-hold': { backgroundColor: '#17a2b8', color: '#ffffff' },
  };

  const colors = statusColors[validStatus] || statusColors.pending;

  return (
    <span
      className="badge d-flex justify-content-center align-items-center"
      style={{
        minWidth: '80px',
        backgroundColor: colors.backgroundColor,
        color: colors.color
      }}
    >
      {config.label}
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

const getLeaveIdentifier = (leave: any) => {
  if (!leave) return null;
  if (typeof leave === 'string') return leave;
  return leave.leaveId ?? leave._id ?? null;
};

const LeaveAdmin = () => {
  // API hooks
  const { leaves, loading, fetchLeaves, approveLeave, rejectLeave, managerActionLeave, deleteLeave, pagination, createLeave, updateLeave } = useLeaveREST();
  const { activeOptions, fetchActiveLeaveTypes } = useLeaveTypesREST();
  const { employees, fetchEmployees } = useEmployeesREST();
  const { role } = useAuth();

  // Local state for filters
  const [filters, setFilters] = useState<{
    status?: LeaveStatus;
    leaveType?: LeaveType;
    page: number;
    limit: number;
  }>({
    page: 1,
    limit: 20,
  });

  const [selectedLeaveIds, setSelectedLeaveIds] = useState<string[]>([]);
  const [selectedLeave, setSelectedLeave] = useState<any | null>(null);

  // State for rejection modal
  const [rejectModal, setRejectModal] = useState<{
    show: boolean;
    leaveId: string | null;
    reason: string;
  }>({
    show: false,
    leaveId: null,
    reason: ''
  });

  // Form state for Add Leave modal
  const [addFormData, setAddFormData] = useState({
    employeeId: '',
    reportingManagerId: '',
    leaveType: '',
    startDate: null as any,
    endDate: null as any,
    session: '',
    reason: '',
    noOfDays: 0,
  });

  // Form state for Edit Leave modal
  const [editFormData, setEditFormData] = useState<{
    _id: string;
    employeeId: string;
    reportingManagerId: string;
    leaveType: string;
    startDate: any;
    endDate: any;
    session: string;
    reason: string;
    noOfDays: number;
  } | null>(null);

  // Fetch employees on mount for dropdown
  useEffect(() => {
    fetchEmployees({ status: 'Active' }); // Only fetch active employees
  }, []);

  useEffect(() => {
    fetchActiveLeaveTypes();
  }, [fetchActiveLeaveTypes]);

  // Fetch leaves on mount and when filters change
  useEffect(() => {
    fetchLeaves(filters);
  }, [filters]);

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

  const employeeNameById = useMemo(() => {
    const entries = employees.map((emp): [string, string] => [
      emp.employeeId,
      `${emp.firstName} ${emp.lastName}`.trim(),
    ]);
    return new Map<string, string>(entries);
  }, [employees]);

  // Transform leaves for table display
  const data = leaves.map((leave) => {
    const employeeName = employeeNameById.get(leave.employeeId) || leave.employeeName || "Unknown";
    const managerStatusValue = leave.managerStatus || 'pending';
    const statusValue = leave.finalStatus || leave.status || 'pending';

    return {
      key: leave._id,
      _id: leave._id,
      Image: "user-32.jpg",
      Employee: employeeName,
      Role: "Employee",
      ReportingManager: leave.reportingManagerName || "-",
      LeaveType: leave.leaveType,
      From: formatDate(leave.startDate),
      To: formatDate(leave.endDate),
      NoOfDays: `${leave.duration} Day${leave.duration > 1 ? 's' : ''}`,
      ManagerStatus: managerStatusValue,
      Status: statusValue,
      rawLeave: leave,
    };
  });

  // Helper function to format dates
  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // Handler functions
  const handleApprove = async (leave: any) => {
    const id = getLeaveIdentifier(leave);
    if (!id) {
      message.error('Missing leave identifier');
      return;
    }
    if (role === 'hr') {
      message.error('HR cannot approve leave requests');
      return;
    }

    const success = role === 'manager'
      ? await managerActionLeave(id, 'approved', undefined, 'Approved')
      : await approveLeave(id, "Approved");
    if (success) {
      fetchLeaves(filters); // Refresh list
    }
  };

  const handleRejectClick = (leave: any) => {
    const leaveId = getLeaveIdentifier(leave);
    if (!leaveId) {
      message.error('Missing leave identifier');
      return;
    }
    setRejectModal({
      show: true,
      leaveId,
      reason: ''
    });
  };

  const handleRejectConfirm = async () => {
    if (rejectModal.leaveId && rejectModal.reason.trim()) {
      if (role === 'hr') {
        message.error('HR cannot reject leave requests');
        return;
      }

      const success = role === 'manager'
        ? await managerActionLeave(rejectModal.leaveId, 'rejected', rejectModal.reason)
        : await rejectLeave(rejectModal.leaveId, rejectModal.reason);
      if (success) {
        fetchLeaves(filters); // Refresh list
      }
      setRejectModal({ show: false, leaveId: null, reason: '' });
    }
  };

  const handleRejectCancel = () => {
    setRejectModal({ show: false, leaveId: null, reason: '' });
  };

  const closeLeaveDetailsModal = () => {
    const modalEl = document.getElementById('leave_details');
    if (modalEl) {
      const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    }
    setSelectedLeave(null);
  };

  const handleDelete = async (leaveId: string) => {
    if (window.confirm("Are you sure you want to delete this leave request?")) {
      const success = await deleteLeave(leaveId);
      if (success) {
        fetchLeaves(filters); // Refresh list
      }
    }
  };

  // Handler for Add Leave form submission
  const handleAddLeaveSubmit = async () => {
    if (!addFormData.employeeId) {
      message.error('Please select an employee');
      return;
    }
    if (!addFormData.reportingManagerId) {
      message.error('Please select a reporting manager');
      return;
    }
    if (!addFormData.leaveType) {
      message.error('Please select a leave type');
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
      employeeId: addFormData.employeeId,
      reportingManagerId: addFormData.reportingManagerId || undefined,
      leaveType: addFormData.leaveType as any,
      startDate: addFormData.startDate.format('YYYY-MM-DD'),
      endDate: addFormData.endDate.format('YYYY-MM-DD'),
      reason: addFormData.reason,
    });

    if (success) {
      // Reset form and close modal
      setAddFormData({
        employeeId: '',
        reportingManagerId: '',
        leaveType: '',
        startDate: null,
        endDate: null,
        session: '',
        reason: '',
        noOfDays: 0,
      });
      // Close modal using Bootstrap API
      const modalEl = document.getElementById('add_leaves');
      if (modalEl) {
        const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
      }
      // Refresh data
      fetchLeaves(filters);
    }
  };

  // Handler for Edit Leave button click
  const handleEditClick = (leave: any) => {
    setEditFormData({
      _id: leave._id,
      employeeId: leave.employeeId || '',
      reportingManagerId: leave.reportingManagerId || '',
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

    if (!editFormData.employeeId) {
      message.error('Please select an employee');
      return;
    }
    if (!editFormData.reportingManagerId) {
      message.error('Please select a reporting manager');
      return;
    }
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
      employeeId: editFormData.employeeId,
      reportingManagerId: editFormData.reportingManagerId || undefined,
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
      fetchLeaves(filters);
    }
  };

  // Employee options for dropdown - Phase 2: Using real employees from API
  const getEmployeeOptionLabel = (emp: any) => {
    const name = `${emp.firstName} ${emp.lastName}`.trim();
    const id = emp.employeeId ? ` (${emp.employeeId})` : '';
    const department = emp.department || emp.departmentId ? ` - ${emp.department || emp.departmentId}` : '';
    return `${name}${id}${department}`;
  };

  const employeename = [
    { value: "", label: "Select Employee" },
    ...employees.map(emp => ({
      value: emp.employeeId,
      label: getEmployeeOptionLabel(emp)
    }))
  ];

  const reportingManagerOptions = [
    { value: "", label: "Select Reporting Manager" },
    ...employees.map(emp => ({
      value: emp.employeeId,
      label: getEmployeeOptionLabel(emp)
    }))
  ];

  const columns = [
    {
      title: "Employee",
      dataIndex: "Employee",
      render: (text: String, record: any) => (
        <div className="d-flex align-items-center file-name-icon">
          <Link to="#" className="avatar avatar-md border avatar-rounded">
            <ImageWithBasePath
              src={`assets/img/users/${record.Image}`}
              className="img-fluid"
              alt="img"
            />
          </Link>
          <div className="ms-2">
            <h6 className="fw-medium">
              <Link
                to="#"
                data-bs-toggle="modal"
                data-bs-target="#leave_details"
                onClick={() => setSelectedLeave(record.rawLeave)}
              >
                {record.Employee}
              </Link>
            </h6>
            <span className="fs-12 fw-normal ">{record.Role}</span>
          </div>
        </div>
      ),
      sorter: (a: any, b: any) => a.Employee.length - b.Employee.length,
    },
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
      sorter: (a: any, b: any) => a.From.localeCompare(b.From),
    },
    {
      title: "To",
      dataIndex: "To",
      sorter: (a: any, b: any) => a.To.localeCompare(b.To),
    },
    {
      title: "No of Days",
      dataIndex: "NoOfDays",
      sorter: (a: any, b: any) => {
        const aDays = parseInt(a.NoOfDays) || 0;
        const bDays = parseInt(b.NoOfDays) || 0;
        return aDays - bDays;
      },
    },
    {
      title: "Manager Status",
      dataIndex: "ManagerStatus",
      key: "ManagerStatus",
      render: (status: string) => {
        const bgColor = status === 'approved' ? '#03c95a' : status === 'rejected' ? '#f8220a' : '#fed24e';
        return (
          <div
            style={{
              backgroundColor: bgColor,
              color: '#ffffff',
              padding: '6px 16px',
              borderRadius: '4px',
              display: 'inline-block',
              minWidth: '90px',
              textAlign: 'center',
              fontSize: '13px',
              fontWeight: '500'
            }}
          >
            {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending'}
          </div>
        );
      },
      sorter: (a: any, b: any) => (a.ManagerStatus || '').localeCompare(b.ManagerStatus || ''),
    },
    {
      title: "Status",
      dataIndex: "Status",
      key: "Status",
      render: (status: string) => {
        const bgColor = status === 'approved' ? '#03c95a' : status === 'rejected' ? '#f8220a' : '#fed24e';
        return (
          <div
            style={{
              backgroundColor: bgColor,
              color: '#ffffff',
              padding: '6px 16px',
              borderRadius: '4px',
              display: 'inline-block',
              minWidth: '90px',
              textAlign: 'center',
              fontSize: '13px',
              fontWeight: '500'
            }}
          >
            {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending'}
          </div>
        );
      },
      sorter: (a: any, b: any) => (a.Status || '').localeCompare(b.Status || ''),
    },
    {
      title: "",
      dataIndex: "actions",
      render: (_: any, record: any) => (
        <div className="action-icon d-inline-flex">
          {record.Status === 'pending' && role !== 'hr' && (
            <>
              <Link
                to="#"
                className="me-2"
                data-bs-toggle="tooltip"
                title="Approve"
                onClick={() => handleApprove(record.rawLeave)}
              >
                <i className="ti ti-check text-success" style={{ fontSize: '18px' }} />
              </Link>
              <Link
                to="#"
                className="me-2"
                data-bs-toggle="tooltip"
                title="Reject"
                onClick={() => handleRejectClick(record.rawLeave)}
              >
                <i className="ti ti-x text-danger" style={{ fontSize: '18px' }} />
              </Link>
            </>
          )}
          {role !== 'hr' && (
            <>
              <Link
                to="#"
                className="me-2"
                data-bs-toggle="modal"
                data-inert={true}
                data-bs-target="#edit_leaves"
                onClick={() => handleEditClick(record.rawLeave)}
              >
                <i className="ti ti-edit" />
              </Link>
              <Link
                to="#"
                data-bs-toggle="modal"
                data-inert={true}
                data-bs-target="#delete_modal"
                onClick={() => setSelectedLeaveIds([record._id])}
              >
                <i className="ti ti-trash" />
              </Link>
            </>
          )}
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

  // Filter handlers
  const handleStatusFilter = (status: LeaveStatus) => {
    setFilters(prev => ({ ...prev, status, page: 1 }));
  };

  const handleLeaveTypeFilter = (leaveType: LeaveType) => {
    setFilters(prev => ({ ...prev, leaveType, page: 1 }));
  };

  // Calculate stats from leaves data
  const stats = {
    totalPresent: leaves.length > 0 ? leaves.length + 165 : 180,
    plannedLeaves: leaves.filter(l => l.leaveType === 'casual' || l.leaveType === 'earned').length,
    unplannedLeaves: leaves.filter(l => l.leaveType === 'sick').length,
    pendingRequests: leaves.filter(l => l.status === 'pending').length,
  };

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
              <div className="card bg-green-img">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                      <div className="flex-shrink-0 me-2">
                        <span className="avatar avatar-md rounded-circle bg-white d-flex align-items-center justify-content-center">
                          <i className="ti ti-user-check text-success fs-18" />
                        </span>
                      </div>
                    </div>
                    <div className="text-end">
                      <p className="mb-1">Total Present</p>
                      <h4>{stats.totalPresent}/200</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-md-6">
              <div className="card bg-pink-img">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                      <div className="flex-shrink-0 me-2">
                        <span className="avatar avatar-md rounded-circle bg-white d-flex align-items-center justify-content-center">
                          <i className="ti ti-user-edit text-pink fs-18" />
                        </span>
                      </div>
                    </div>
                    <div className="text-end">
                      <p className="mb-1">Planned Leaves</p>
                      <h4>{stats.plannedLeaves}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-md-6">
              <div className="card bg-yellow-img">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                      <div className="flex-shrink-0 me-2">
                        <span className="avatar avatar-md rounded-circle bg-white d-flex align-items-center justify-content-center">
                          <i className="ti ti-user-exclamation text-warning fs-18" />
                        </span>
                      </div>
                    </div>
                    <div className="text-end">
                      <p className="mb-1">Unplanned Leaves</p>
                      <h4>{stats.unplannedLeaves}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-md-6">
              <div className="card bg-blue-img">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                      <div className="flex-shrink-0 me-2">
                        <span className="avatar avatar-md rounded-circle bg-white d-flex align-items-center justify-content-center">
                          <i className="ti ti-user-question text-info fs-18" />
                        </span>
                      </div>
                    </div>
                    <div className="text-end">
                      <p className="mb-1">Pending Requests</p>
                      <h4>{stats.pendingRequests}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* /Leaves Info */}
          {/* Leaves list */}
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
              <h5>Leave List</h5>
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
                  <ul className="dropdown-menu dropdown-menu-end p-3">
                    {leavetype.map(option => (
                      <li key={option.value}>
                        <Link
                          to="#"
                          className="dropdown-item rounded-1"
                          onClick={() => option.value && handleLeaveTypeFilter(option.value as LeaveType)}
                        >
                          {option.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="dropdown">
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-sm btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    Status
                  </Link>
                  <ul className="dropdown-menu dropdown-menu-end p-3">
                    {statusOptions.map(option => (
                      <li key={option.value}>
                        <Link
                          to="#"
                          className="dropdown-item rounded-1 d-flex justify-content-start align-items-center"
                          onClick={() => option.value && handleStatusFilter(option.value as LeaveStatus)}
                        >
                          {option.value && <StatusBadge status={option.value as LeaveStatus} />}
                          {!option.value && <span>All Status</span>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <LoadingSpinner />
              ) : (
                <Table
                  dataSource={data}
                  columns={columns}
                  Selection={true}
                  rowId="key"
                />
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
                  employeeId: '',
                  reportingManagerId: '',
                  leaveType: '',
                  startDate: null,
                  endDate: null,
                  session: '',
                  reason: '',
                  noOfDays: 0,
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
                      <label className="form-label">Employee Name</label>
                      <CommonSelect
                        className="select"
                        options={employeename}
                        value={addFormData.employeeId}
                        onChange={(option: any) => setAddFormData({ ...addFormData, employeeId: option?.value || '' })}
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
                      <div className="input-icon-end position-relative">
                        <DatePicker
                          className="form-control datetimepicker"
                          format={{
                            format: "DD-MM-YYYY",
                            type: "mask",
                          }}
                          getPopupContainer={getModalContainer}
                          placeholder="DD-MM-YYYY"
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
                        value={addFormData.reason}
                        onChange={(e) => setAddFormData({ ...addFormData, reason: e.target.value })}
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
                  onClick={() => setAddFormData({
                    employeeId: '',
                    reportingManagerId: '',
                    leaveType: '',
                    startDate: null,
                    endDate: null,
                    session: '',
                    reason: '',
                    noOfDays: 0,
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
                      <label className="form-label">Employee Name</label>
                      <CommonSelect
                        className="select"
                        options={employeename}
                        value={editFormData?.employeeId || ''}
                        onChange={(option: any) => editFormData && setEditFormData({ ...editFormData, employeeId: option?.value || '' })}
                      />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Reporting Manager</label>
                      <CommonSelect
                        className="select"
                        options={reportingManagerOptions}
                        value={editFormData?.reportingManagerId || ''}
                        onChange={(option: any) => editFormData && setEditFormData({ ...editFormData, reportingManagerId: option?.value || '' })}
                      />
                    </div>
                  </div>
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
                        <DatePicker
                          className="form-control datetimepicker"
                          format={{
                            format: "DD-MM-YYYY",
                            type: "mask",
                          }}
                          getPopupContainer={getModalContainer}
                          placeholder="DD-MM-YYYY"
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
      {/* Delete Modal */}
      <div className="modal fade" id="delete_modal" tabIndex={-1}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-body text-center">
              <span className="avatar avatar-xl bg-transparent-danger text-danger mb-3">
                <i className="ti ti-trash-x fs-36" />
              </span>
              <h4 className="mb-1">Confirm Delete</h4>
              <p className="mb-3">
                Are you sure you want to delete this leave request? This action cannot be undone.
              </p>
              <div className="d-flex justify-content-center">
                <Link
                  to="#"
                  className="btn btn-light me-3"
                  data-bs-dismiss="modal"
                >
                  Cancel
                </Link>
                <Link
                  to="#"
                  className="btn btn-danger"
                  data-bs-dismiss="modal"
                  onClick={() => selectedLeaveIds.forEach(id => handleDelete(id))}
                >
                  Yes, Delete
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* /Delete Modal */}
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
                onClick={closeLeaveDetailsModal}
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="modal-body">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Employee</label>
                  <div className="fw-medium">
                    {selectedLeave
                      ? employeeNameById.get(selectedLeave.employeeId) || selectedLeave.employeeName || "Unknown"
                      : "-"}
                  </div>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Reporting Manager</label>
                  <div className="fw-medium">
                    {selectedLeave?.reportingManagerName || "-"}
                  </div>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Leave Type</label>
                  <div className="fw-medium">
                    {selectedLeave ? (leaveTypeDisplayMap[selectedLeave.leaveType] || selectedLeave.leaveType) : "-"}
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
                <div className="col-md-6 mb-3">
                  <label className="form-label">Status</label>
                  <div className="fw-medium">
                    {selectedLeave ? (statusDisplayMap[selectedLeave.finalStatus || selectedLeave.status]?.label || selectedLeave.finalStatus || selectedLeave.status) : "-"}
                  </div>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Manager Status</label>
                  <div className="fw-medium">
                    {selectedLeave ? (statusDisplayMap[selectedLeave.managerStatus || 'pending']?.label || selectedLeave.managerStatus) : "-"}
                  </div>
                </div>
                <div className="col-md-12 mb-3">
                  <label className="form-label">Reason</label>
                  <div className="fw-medium">{selectedLeave?.reason || "-"}</div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-light"
                data-bs-dismiss="modal"
                onClick={closeLeaveDetailsModal}
              >
                Close
              </button>
              {selectedLeave?.status === 'pending' && (
                <>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => {
                      closeLeaveDetailsModal();
                      handleRejectClick(selectedLeave);
                    }}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={async () => {
                      await handleApprove(selectedLeave);
                      closeLeaveDetailsModal();
                    }}
                  >
                    Approve
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* /Leave Details Modal */}
      {/* Reject Modal */}
      {rejectModal.show && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">Reject Leave Request</h4>
                <button
                  type="button"
                  className="btn-close custom-btn-close"
                  onClick={handleRejectCancel}
                  aria-label="Close"
                >
                  <i className="ti ti-x" />
                </button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Rejection Reason <span className="text-danger">*</span></label>
                  <textarea
                    className="form-control"
                    rows={4}
                    placeholder="Please enter the reason for rejecting this leave request"
                    value={rejectModal.reason}
                    onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={handleRejectCancel}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleRejectConfirm}
                  disabled={!rejectModal.reason.trim()}
                >
                  Reject Leave
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* /Reject Modal */}
    </>
  );
};

export default LeaveAdmin;
