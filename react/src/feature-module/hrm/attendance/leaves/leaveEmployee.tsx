import { DatePicker, message } from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CollapseHeader from "../../../../core/common/collapse-header/collapse-header";
import CommonSelect from "../../../../core/common/commonSelect";
import Table from "../../../../core/common/dataTable/index";
import PredefinedDateRanges from "../../../../core/common/datePicker";
import Footer from "../../../../core/common/footer";
import LeaveDetailsModal from "../../../../core/modals/LeaveDetailsModal";
import { useAuth } from "../../../../hooks/useAuth";
import { useAutoReloadActions } from "../../../../hooks/useAutoReload";
import { useEmployeesREST } from "../../../../hooks/useEmployeesREST";
import { statusDisplayMap, useLeaveREST, type LeaveStatus, type LeaveTypeCode } from "../../../../hooks/useLeaveREST";
import { useLeaveTypesREST } from "../../../../hooks/useLeaveTypesREST";
import { useSocket } from "../../../../SocketContext";
import { all_routes } from "../../../router/all_routes";

// Skeleton Loader Components
const StatCardSkeleton = () => (
  <div className="card border border-light shadow-sm">
    <div className="card-body p-3">
      <div className="skeleton-text skeleton-stat-label mb-2"></div>
      <div className="skeleton-text skeleton-stat-value"></div>
    </div>
  </div>
);

const TableRowSkeleton = () => (
  <tr>
    <td><div className="skeleton-text skeleton-leave-type"></div></td>
    <td><div className="skeleton-text skeleton-manager"></div></td>
    <td><div className="skeleton-text skeleton-date"></div></td>
    <td><div className="skeleton-text skeleton-date"></div></td>
    <td><div className="skeleton-text skeleton-days"></div></td>
    <td><div className="skeleton-badge"></div></td>
    <td><div className="skeleton-actions"></div></td>
  </tr>
);

const TableSkeleton = () => (
  <div className="table-responsive">
    <table className="table datanew">
      <thead>
        <tr>
          <th>Leave Type</th>
          <th>Reporting Manager</th>
          <th>From</th>
          <th>To</th>
          <th>No of Days</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: 5 }).map((_, i) => (
          <TableRowSkeleton key={i} />
        ))}
      </tbody>
    </table>
  </div>
);

// Status badge component
const StatusBadge = ({ status }: { status: LeaveStatus }) => {
  const normalizedStatus = String(status || 'pending').toLowerCase() as LeaveStatus;
  const validStatus = statusDisplayMap[normalizedStatus] ? normalizedStatus : 'pending';
  const config = statusDisplayMap[validStatus] || statusDisplayMap.pending;
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
  const { leaves, loading, fetchMyLeaves, cancelLeave, getLeaveBalance, createLeave, updateLeave, leaveTypeDisplayMap } = useLeaveREST();
  const { activeOptions, fetchActiveLeaveTypes } = useLeaveTypesREST();
  const socket = useSocket();
  const { employeeId, isLoaded, isSignedIn, role } = useAuth();
  const { employees, fetchEmployees, fetchActiveEmployeesList } = useEmployeesREST({ autoFetch: false });

  // Fetch balance data - directly uses backend types (sick, casual, earned, etc.)
  const fetchBalanceData = useCallback(async () => {
    try {
      setBalanceLoading(true);
      const balanceData = await getLeaveBalance();
      console.log('[fetchBalanceData] API Response received, type:', typeof balanceData);
      console.log('[fetchBalanceData] Response:', balanceData);

      if (!balanceData) {
        console.error('[fetchBalanceData] API returned null/undefined');
        message.error('Failed to load leave balance. Please refresh the page.');
        setBalanceLoading(false);
        return;
      }

      if (Array.isArray(balanceData)) {
        console.error('[fetchBalanceData] Received array instead of object:', balanceData);
        message.error('Invalid balance data format received');
        setBalanceLoading(false);
        return;
      }

      if (typeof balanceData !== 'object') {
        console.error('[fetchBalanceData] Received non-object data:', typeof balanceData);
        message.error('Invalid balance data format received');
        setBalanceLoading(false);
        return;
      }

      // Log specific balance values for debugging
      const keys = Object.keys(balanceData);
      console.log('[fetchBalanceData] Balance keys:', keys);

      if ('earned' in balanceData) {
        console.log('[fetchBalanceData] earned balance:', balanceData.earned);
      }
      if ('sick' in balanceData) {
        console.log('[fetchBalanceData] sick balance:', balanceData.sick);
      }

      // Check if data has expected structure
      const hasValidData = keys.some(key => {
        const item = balanceData[key];
        return item && typeof item === 'object' && 'balance' in item;
      });

      if (!hasValidData) {
        console.warn('[fetchBalanceData] No valid balance items found');
      }

      console.log('[fetchBalanceData] Setting balances state with', keys.length, 'items');
      // getLeaveBalance already returns response.data which is the balances object
      setBalances(balanceData as Record<string, {
        total: number;
        used: number;
        balance: number;
        hasCustomPolicy?: boolean;
        customPolicyId?: string;
        customPolicyName?: string;
      }>);
      setBalanceLoading(false);
    } catch (error) {
      console.error('[fetchBalanceData] Error fetching balance:', error);
      message.error('Failed to fetch leave balance');
      setBalanceLoading(false);
    }
  }, [getLeaveBalance]);

  // Loading states
  const [balanceLoading, setBalanceLoading] = useState(true);

  // Auto-reload hook for refetching after actions
  const { refetchAfterAction } = useAutoReloadActions({
    fetchFn: () => {
      fetchMyLeaves();
      fetchBalanceData();
    },
    debug: true,
  });

  // Local state for balance - Initialize with empty state, will be populated from API
  // Backend types: sick, casual, earned, maternity, paternity, bereavement, compensatory, unpaid, special
  const [balances, setBalances] = useState<Record<string, {
    total: number;
    used: number;
    balance: number;
    hasCustomPolicy?: boolean;
    customPolicyId?: string;
    customPolicyName?: string;
  }>>({
    sick: { total: 0, used: 0, balance: 0 },
    casual: { total: 0, used: 0, balance: 0 },
    earned: { total: 0, used: 0, balance: 0 },
    maternity: { total: 0, used: 0, balance: 0 },
    paternity: { total: 0, used: 0, balance: 0 },
    bereavement: { total: 0, used: 0, balance: 0 },
    compensatory: { total: 0, used: 0, balance: 0 },
    unpaid: { total: 0, used: 0, balance: 0 },
    special: { total: 0, used: 0, balance: 0 },
  });

  // Form state for Add Leave modal
  const [addFormData, setAddFormData] = useState({
    leaveType: '',
    startDate: null as any,
    endDate: null as any,
    session: '',
    reason: '',
    noOfDays: 0,
  });

  // Per-field validation errors for Add Leave modal
  const [addFormErrors, setAddFormErrors] = useState<{
    leaveType?: string;
    startDate?: string;
    endDate?: string;
    session?: string;
    reason?: string;
  }>({});

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

  // Fetch employee leaves on mount (gated on auth readiness)
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    fetchMyLeaves();
    // Also fetch balance
    fetchBalanceData();
    // Fetch employee data to get avatar and role
    if (employeeId) {
      if (['admin', 'hr', 'superadmin', 'manager'].includes(role)) {
        fetchEmployees({ status: 'Active' });
      } else {
        fetchActiveEmployeesList();
      }
    }
  }, [isLoaded, isSignedIn, employeeId, role, fetchEmployees, fetchActiveEmployeesList, fetchMyLeaves, fetchBalanceData]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    fetchActiveLeaveTypes();
  }, [isLoaded, isSignedIn, fetchActiveLeaveTypes]);

  // Get current employee data for avatar and role
  const currentEmployee = useMemo(() => {
    return employees.find(emp => emp.employeeId === employeeId);
  }, [employees, employeeId]);

  // Employee name map for LeaveDetailsModal
  const employeeNameById = useMemo(() => {
    const entries = employees.map((emp): [string, string] => [
      emp.employeeId,
      `${emp.firstName} ${emp.lastName}`.trim(),
    ]);
    return new Map<string, string>(entries);
  }, [employees]);

  // Employee data map for avatar, role, etc.
  const employeeDataMap = useMemo(() => {
    const map = new Map<string, { avatar?: string; avatarUrl?: string; profileImage?: string; role?: string; designation?: string; employeeId?: string }>();
    employees.forEach(emp => {
      map.set(emp.employeeId, {
        avatar: emp.avatar,
        avatarUrl: emp.avatarUrl || emp.profileImage,
        profileImage: emp.profileImage,
        role: emp.role,
        designation: emp.designation,
        employeeId: emp.employeeId,
      });
    });
    return map;
  }, [employees]);

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
  }, [editFormData]);

  // Re-fetch balance when the manager approves this employee's leave (real-time update)
  useEffect(() => {
    if (!socket) return;
    const handleBalanceRefresh = () => {
      fetchBalanceData();
      fetchMyLeaves();
    };
    socket.on('leave:balance_updated', handleBalanceRefresh);
    socket.on('leave:approved', handleBalanceRefresh);
    return () => {
      socket.off('leave:balance_updated', handleBalanceRefresh);
      socket.off('leave:approved', handleBalanceRefresh);
    };
  }, [socket, fetchBalanceData, fetchMyLeaves]);

  // Transform leaves for table display
  const data = leaves.map((leave) => {
    // Get avatar from current employee data
    const avatarUrl = currentEmployee?.avatarUrl || currentEmployee?.profileImage || currentEmployee?.avatar;
    // Get role or designation from current employee data
    // designation may be a populated MongoDB object with a .designation string field
    const rawDesignation = currentEmployee?.designation;
    const designationStr = typeof rawDesignation === 'object' && rawDesignation !== null
      ? (rawDesignation as any).designation || (rawDesignation as any).name || ''
      : rawDesignation;
    const roleOrDesignation = currentEmployee?.role || designationStr || "Employee";

    return {
      key: leave._id,
      _id: leave._id,
      LeaveType: leave.leaveType,      // Code for backward compatibility
      LeaveTypeName: leave.leaveTypeName, // Display name from backend (ObjectId system)
      From: formatDate(leave.startDate),
      To: formatDate(leave.endDate),
      NoOfDays: leave.duration === 0.5 ? 'Half Day (0.5)' : `${leave.duration} Day${leave.duration > 1 ? 's' : ''}`,
      ReportingManager: leave.reportingManagerName || "-",
      ManagerStatus: (leave.managerStatus || 'pending').toLowerCase() as LeaveStatus,
      Status: (leave.finalStatus || leave.status || 'pending').toLowerCase() as LeaveStatus,
      Role: roleOrDesignation, // Fixed: "Roll" -> "Role", fetched from employee data
      Image: avatarUrl || "user-32.jpg", // Use employee avatar or default
      EmpId: leave.employeeId || employeeId || "-", // Add EmpId column
      rawLeave: leave,
    };
  });

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
      refetchAfterAction(); // Refresh list and balance
    }
  };

  // Open leave details modal
  const openLeaveDetailsModal = (leave: any) => {
    setSelectedLeave(leave);
    // Use setTimeout to ensure React state update is flushed before Bootstrap opens modal
    setTimeout(() => {
      const modalEl = document.getElementById('view_leave_details');
      if (modalEl) {
        const modal = new (window as any).bootstrap.Modal(modalEl);
        modal.show();
      }
    }, 0);
  };

  // Close leave details modal
  const closeLeaveDetailsModal = () => {
    const modalEl = document.getElementById('view_leave_details');
    if (modalEl) {
      const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    }
    setSelectedLeave(null);
  };

  // Helper to clear a single field error when the user edits it
  const clearFieldError = (field: keyof typeof addFormErrors) => {
    setAddFormErrors(prev => ({ ...prev, [field]: undefined }));
  };

  // Handler for Add Leave form submission
  const handleAddLeaveSubmit = async () => {
    // Collect all field errors at once
    const errors: typeof addFormErrors = {};
    if (!addFormData.leaveType) errors.leaveType = 'Leave type is required';
    if (!addFormData.startDate) errors.startDate = 'From date is required';
    if (!addFormData.endDate) errors.endDate = 'To date is required';
    if (addFormData.startDate && addFormData.endDate &&
      dayjs(addFormData.endDate).isBefore(dayjs(addFormData.startDate), 'day')) {
      errors.endDate = 'To date must be on or after From date';
    }
    if (!addFormData.session) errors.session = 'Day type is required';
    if (!addFormData.reason.trim()) errors.reason = 'Reason is required';
    else if (addFormData.reason.trim().length < 3) errors.reason = 'Reason must be at least 3 characters';

    if (Object.keys(errors).length > 0) {
      setAddFormErrors(errors);
      return;
    }
    setAddFormErrors({});

    const success = await createLeave({
      leaveType: addFormData.leaveType as any,
      startDate: addFormData.startDate.format('YYYY-MM-DD'),
      endDate: addFormData.endDate.format('YYYY-MM-DD'),
      session: addFormData.session,
      reason: addFormData.reason,
      employeeStatus: 'pending',
      managerStatus: 'pending',
      hrStatus: 'pending',
    } as any);

    if (success) {
      // Reset form and close modal
      setAddFormData({
        leaveType: '',
        startDate: null,
        endDate: null,
        session: '',
        reason: '',
        noOfDays: 0,
      });
      setAddFormErrors({});
      // Close modal using Bootstrap API
      const modalEl = document.getElementById('add_leaves');
      if (modalEl) {
        const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
      }
      // Refresh data using auto-reload
      refetchAfterAction();
    }
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
      // Refresh data using auto-reload
      refetchAfterAction();
    }
  };
  const columns = [
    {
      title: "Leave Type",
      dataIndex: "LeaveType",
      render: (leaveType: string, record: any) => {
        // Use leaveTypeName from backend (ObjectId system) with fallback to map for backward compatibility
        const displayName = record.LeaveTypeName || leaveTypeDisplayMap[leaveType?.toLowerCase?.()] || leaveType;
        return (
          <span className="fs-14 fw-medium d-flex align-items-center">
            {displayName}
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
      },
      sorter: (a: any, b: any) => (a.LeaveTypeName || '').localeCompare(b.LeaveTypeName || ''),
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
            title="View Details"
            onClick={(e) => { e.preventDefault(); openLeaveDetailsModal(record.rawLeave); }}
          >
            <i className="ti ti-eye" />
          </Link>
        </div>
      ),
    },
  ];

  // Dynamic leave type filter options built from active leave types in database
  const leaveTypeFilterOptions = useMemo(() => [
    { value: "", label: "All Types" },
    ...activeOptions.map(option => ({ value: option.value.toLowerCase(), label: String(option.label) })),
  ], [activeOptions]);

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
    // Use activeOptions directly - value is now ObjectId (from backend), label is display name
    const apiOptions = activeOptions.length
      ? activeOptions.map(option => ({ value: option.value, label: String(option.label) }))
      : [];
    return [{ value: "", label: "Select Leave Type" }, ...apiOptions];
  }, [activeOptions]);

  // Filter handlers
  const handleStatusFilter = (status: LeaveStatus) => {
    // Re-fetch with status filter
    fetchMyLeaves({ status }).then(() => fetchBalanceData());
  };

  const handleLeaveTypeFilter = (leaveType: string) => {
    // Re-fetch with leave type filter
    fetchMyLeaves({ leaveType: leaveType as LeaveTypeCode }).then(() => fetchBalanceData());
  };

  // Calculate total leaves and total remaining
  const totalLeaves = leaves.length;
  const totalRemaining = Object.values(balances).reduce((sum, b) => sum + b.balance, 0);

  const getModalContainer = () => {
    const modalElement = document.getElementById("modal-datepicker");
    return modalElement ? modalElement : document.body; // Fallback to document.body if modalElement is null
  };

  // Build dynamic balance display configuration from active leave types
  // Maps leave type code (lowercase) to display properties from database
  const BALANCE_DISPLAY_CONFIG = useMemo(() => {
    // Default fallback mapping for known leave types (used if not in activeOptions)
    const defaultConfig: Record<string, { label: string; icon: string; colorClass: string; cardClass: string; badgeClass: string }> = {
      earned: { label: 'Annual Leaves', icon: 'ti ti-calendar-event', colorClass: 'black', cardClass: 'bg-black-le', badgeClass: 'bg-secondary-transparent' },
      sick: { label: 'Medical Leaves', icon: 'ti ti-vaccine', colorClass: 'blue', cardClass: 'bg-blue-le', badgeClass: 'bg-info-transparent' },
      casual: { label: 'Casual Leaves', icon: 'ti ti-hexagon-letter-c', colorClass: 'purple', cardClass: 'bg-purple-le', badgeClass: 'bg-transparent-purple' },
      maternity: { label: 'Maternity Leaves', icon: 'ti ti-baby-carriage', colorClass: 'pink', cardClass: 'bg-pink-le', badgeClass: 'bg-pink-transparent' },
      paternity: { label: 'Paternity Leaves', icon: 'ti ti-user', colorClass: 'info', cardClass: 'bg-info-le', badgeClass: 'bg-transparent-info' },
      bereavement: { label: 'Bereavement Leaves', icon: 'ti ti-heart-broken', colorClass: 'secondary', cardClass: 'bg-secondary-le', badgeClass: 'bg-transparent-secondary' },
      compensatory: { label: 'Compensatory Off', icon: 'ti ti-calendar-time', colorClass: 'warning', cardClass: 'bg-warning-le', badgeClass: 'bg-transparent-warning' },
      unpaid: { label: 'Unpaid Leaves', icon: 'ti ti-money-off', colorClass: 'danger', cardClass: 'bg-danger-le', badgeClass: 'bg-transparent-danger' },
      special: { label: 'Special Leaves', icon: 'ti ti-star', colorClass: 'info', cardClass: 'bg-info-le', badgeClass: 'bg-transparent-info' },
    };

    // Build config from active leave types from database
    const config = activeOptions.map((option) => {
      // Use option.code (provided by backend) instead of option.value (which is now ObjectId)
      const code = (option.code || '').toLowerCase();
      const fallback = defaultConfig[code] || {
        label: option.label,
        icon: 'ti ti-calendar',
        colorClass: 'primary',
        cardClass: 'bg-primary-le',
        badgeClass: 'bg-primary-transparent'
      };

      return {
        key: code,
        label: option.label,
        icon: fallback.icon,
        colorClass: fallback.colorClass,
        cardClass: fallback.cardClass,
        badgeClass: fallback.badgeClass,
        // Additional properties from database
        code: code,
        name: option.label,
        leaveTypeId: option.value // ObjectId for future reference
      };
    });

    return config;
  }, [activeOptions]);

  return (
    <>
      {/* Skeleton Loader Styles */}
      <style>{`
        /* Skeleton Loader Styles */
        .skeleton-text {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: skeleton-loading 1.5s ease-in-out infinite;
          border-radius: 4px;
          height: 16px;
        }

        .skeleton-badge {
          width: 150px;
          height: 24px;
          border-radius: 12px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: skeleton-loading 1.5s ease-in-out infinite;
        }

        .skeleton-actions {
          width: 80px;
          height: 20px;
          border-radius: 4px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: skeleton-loading 1.5s ease-in-out infinite;
        }

        .skeleton-stat-label {
          width: 120px;
          height: 14px;
        }

        .skeleton-stat-value {
          width: 80px;
          height: 28px;
        }

        .skeleton-leave-type {
          width: 100px;
          height: 14px;
        }

        .skeleton-emp-id {
          width: 80px;
          height: 14px;
        }

        .skeleton-manager {
          width: 120px;
          height: 14px;
        }

        .skeleton-date {
          width: 90px;
          height: 14px;
        }

        .skeleton-days {
          width: 60px;
          height: 14px;
        }

        @keyframes skeleton-loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
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
              {/* Hide Add Leave button for admin role - admins cannot apply leaves */}
              {role !== 'admin' && (
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
              )}
              <div className="head-icons ms-2">
                <CollapseHeader />
              </div>
            </div>
          </div>
          {/* /Breadcrumb */}
          {/* Leaves Info - Dynamic balance cards from database */}
          <div className="row">
            {balanceLoading ? (
              <>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="col-xl-3 col-md-6">
                    <StatCardSkeleton />
                  </div>
                ))}
              </>
            ) : (
              <>
                {BALANCE_DISPLAY_CONFIG.map((config) => {
                  const balance = balances[config.key];
                  // Show all active leave types from database
                  // Display balance data, or show zeros if no balance exists yet
                  const total = balance?.total ?? 0;
                  const remaining = balance?.balance ?? 0;
                  const hasCustomPolicy = balance?.hasCustomPolicy || false;
                  const customPolicyName = balance?.customPolicyName;

                  // Debug: Log if balance is undefined or zero unexpectedly
                  if (!balance && config.key) {
                    console.warn(`[LeaveEmployee] No balance data found for "${config.key}". Available keys:`, Object.keys(balances));
                  }

                  // Calculate percentage of remaining leaves
                  const percentage = total > 0 ? (remaining / total) * 100 : 0;

                  // Determine status based on percentage
                  let statusBadge = { text: '', color: '', bgColor: '' };
                  let borderColor = 'border-light';

                  if (percentage >= 80) {
                    statusBadge = { text: 'Available', color: 'text-success', bgColor: 'bg-success-transparent' };
                    borderColor = 'border-success';
                  } else if (percentage >= 30) {
                    statusBadge = { text: 'Limited', color: 'text-warning', bgColor: 'bg-warning-transparent' };
                    borderColor = 'border-warning';
                  } else if (percentage > 0) {
                    statusBadge = { text: 'Low', color: 'text-danger', bgColor: 'bg-danger-transparent' };
                    borderColor = 'border-danger';
                  } else {
                    statusBadge = { text: 'Exhausted', color: 'text-danger', bgColor: 'bg-danger-transparent' };
                    borderColor = 'border-danger';
                  }

                  return (
                    <div key={config.key} className="col-xl-3 col-md-6">
                      <div className={`card ${borderColor} shadow-sm`} style={{ borderLeft: '3px solid' }}>
                        <div className="card-body p-3">
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <p className="mb-0 text-muted fs-13">{config.label}</p>
                            {hasCustomPolicy && (
                              <span
                                className="badge bg-primary-transparent text-primary fs-10"
                                title={`Custom Policy: ${customPolicyName}`}
                              >
                                <i className="ti ti-discount-check me-1"></i>Custom
                              </span>
                            )}
                          </div>
                          <div className="d-flex align-items-center justify-content-between">
                            <h4 className="mb-0 fw-semibold">{remaining} <span className="text-muted fw-normal">/ {total}</span></h4>
                            <span className={`badge ${statusBadge.bgColor} ${statusBadge.color} fs-10 fw-medium`}>
                              {statusBadge.text}
                            </span>
                          </div>
                          {hasCustomPolicy && customPolicyName && (
                            <div className="mt-2 pt-2 border-top">
                              <small className="text-muted d-flex align-items-center fs-11">
                                <i className="ti ti-info-circle text-primary me-1"></i>
                                Custom Policy: {total} days/year ({customPolicyName})
                              </small>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
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
                    {leaveTypeFilterOptions.map((option) => (
                      <li key={option.value}>
                        <Link
                          to="#"
                          className="dropdown-item rounded-1"
                          onClick={(e) => {
                            e.preventDefault();
                            handleLeaveTypeFilter(option.value);
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
                <TableSkeleton />
              ) : (
                <Table dataSource={data} columns={columns} Selection={true} rowId="_id" />
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
                onClick={() => {
                  setAddFormData({ leaveType: '', startDate: null, endDate: null, session: '', reason: '', noOfDays: 0 });
                  setAddFormErrors({});
                }}
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form>
              <div className="modal-body pb-0">
                <div className="row">

                  {/* Leave Type */}
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Leave Type <span className="text-danger">*</span>
                      </label>
                      <CommonSelect
                        className={`select${addFormErrors.leaveType ? ' is-invalid' : ''}`}
                        options={leaveTypeOptions}
                        value={addFormData.leaveType}
                        onChange={(option: any) => {
                          setAddFormData({ ...addFormData, leaveType: option?.value || '', session: '' });
                          clearFieldError('leaveType');
                        }}
                      />
                      {addFormErrors.leaveType && (
                        <div className="text-danger small mt-1">
                          <i className="ti ti-alert-circle me-1" />{addFormErrors.leaveType}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Balance Preview Card — shown when a leave type is selected */}
                  {addFormData.leaveType && balances[addFormData.leaveType] && (
                    <div className="col-md-12">
                      <div className={`alert mb-3 ${addFormData.noOfDays > 0 && addFormData.noOfDays > balances[addFormData.leaveType]?.balance ? 'alert-danger' : 'alert-success'}`}>
                        <div className="d-flex align-items-center">
                          <i className={`ti ti-${addFormData.noOfDays > 0 && addFormData.noOfDays > balances[addFormData.leaveType]?.balance ? 'alert-circle' : 'circle-check'} fs-24 me-3`} />
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center justify-content-between mb-1">
                              <h6 className="mb-0">Balance Overview</h6>
                              {balances[addFormData.leaveType]?.hasCustomPolicy && (
                                <span className="badge bg-primary-transparent text-primary fs-10">
                                  <i className="ti ti-discount-check me-1" />Custom Policy
                                </span>
                              )}
                            </div>
                            <p className="mb-0">
                              <strong>Available:</strong> {balances[addFormData.leaveType]?.balance} days &nbsp;|&nbsp;
                              <strong>Used:</strong> {balances[addFormData.leaveType]?.used} days &nbsp;|&nbsp;
                              <strong>Total:</strong> {balances[addFormData.leaveType]?.total} days
                            </p>
                            {addFormData.noOfDays > 0 && (
                              <p className="mb-0 mt-1">
                                <strong>Requesting:</strong> {addFormData.noOfDays} day{addFormData.noOfDays !== 1 ? 's' : ''} &nbsp;|&nbsp;
                                <strong>Remaining after approval:</strong> {Math.max(0, (balances[addFormData.leaveType]?.balance || 0) - addFormData.noOfDays)} days
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      {addFormData.noOfDays > 0 && addFormData.noOfDays > (balances[addFormData.leaveType]?.balance || 0) && (
                        <div className="alert alert-warning mb-3">
                          <i className="ti ti-alert-triangle me-2" />
                          <strong>Warning:</strong> Requested days exceed available balance. You may need to apply for Leave Without Pay.
                        </div>
                      )}
                    </div>
                  )}

                  {/* From Date */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        From <span className="text-danger">*</span>
                      </label>
                      <div className="input-icon-end position-relative">
                        <DatePicker
                          className={`form-control datetimepicker${addFormErrors.startDate ? ' border-danger' : ''}`}
                          format={{ format: "DD-MM-YYYY", type: "mask" }}
                          getPopupContainer={getModalContainer}
                          placeholder="DD-MM-YYYY"
                          value={addFormData.startDate}
                          onChange={(date) => {
                            setAddFormData({ ...addFormData, startDate: date });
                            clearFieldError('startDate');
                            clearFieldError('endDate');
                          }}
                        />
                        <span className="input-icon-addon">
                          <i className="ti ti-calendar text-gray-7" />
                        </span>
                      </div>
                      {addFormErrors.startDate && (
                        <div className="text-danger small mt-1">
                          <i className="ti ti-alert-circle me-1" />{addFormErrors.startDate}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* To Date */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        To <span className="text-danger">*</span>
                      </label>
                      <div className="input-icon-end position-relative">
                        <DatePicker
                          className={`form-control datetimepicker${addFormErrors.endDate ? ' border-danger' : ''}`}
                          format={{ format: "DD-MM-YYYY", type: "mask" }}
                          getPopupContainer={getModalContainer}
                          placeholder="DD-MM-YYYY"
                          value={addFormData.endDate}
                          disabledDate={(current) => addFormData.startDate ? current && current < addFormData.startDate.startOf('day') : false}
                          onChange={(date) => {
                            setAddFormData({ ...addFormData, endDate: date });
                            clearFieldError('endDate');
                          }}
                        />
                        <span className="input-icon-addon">
                          <i className="ti ti-calendar text-gray-7" />
                        </span>
                      </div>
                      {addFormErrors.endDate && (
                        <div className="text-danger small mt-1">
                          <i className="ti ti-alert-circle me-1" />{addFormErrors.endDate}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Day Type */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Day Type <span className="text-danger">*</span>
                      </label>
                      <CommonSelect
                        className={`select${addFormErrors.session ? ' is-invalid' : ''}`}
                        options={dayTypeOptions}
                        value={addFormData.session}
                        disabled={!addFormData.leaveType}
                        onChange={(option: any) => {
                          setAddFormData({ ...addFormData, session: option?.value || '' });
                          clearFieldError('session');
                        }}
                      />
                      {addFormErrors.session && (
                        <div className="text-danger small mt-1">
                          <i className="ti ti-alert-circle me-1" />{addFormErrors.session}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* No of Days (read-only, calculated) */}
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label">No of Days</label>
                      <input
                        type="text"
                        className="form-control bg-light"
                        value={addFormData.noOfDays === 0.5 ? '0.5 (Half Day)' : addFormData.noOfDays.toString()}
                        readOnly
                      />
                    </div>
                  </div>

                  {/* Remaining Days (read-only) */}
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label">Remaining Days</label>
                      <input
                        type="text"
                        className="form-control bg-light"
                        value={addFormData.leaveType && balances[addFormData.leaveType]
                          ? (balances[addFormData.leaveType].balance ?? 0).toString()
                          : '-'}
                        readOnly
                      />
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Reason <span className="text-danger">*</span>
                      </label>
                      <textarea
                        className={`form-control${addFormErrors.reason ? ' border-danger' : ''}`}
                        rows={3}
                        placeholder="Enter reason for leave (min 3 characters)"
                        value={addFormData.reason}
                        onChange={(e) => {
                          setAddFormData({ ...addFormData, reason: e.target.value });
                          clearFieldError('reason');
                        }}
                      />
                      {addFormErrors.reason && (
                        <div className="text-danger small mt-1">
                          <i className="ti ti-alert-circle me-1" />{addFormErrors.reason}
                        </div>
                      )}
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
                    setAddFormData({ leaveType: '', startDate: null, endDate: null, session: '', reason: '', noOfDays: 0 });
                    setAddFormErrors({});
                  }}
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
      <LeaveDetailsModal
        leave={selectedLeave}
        modalId="view_leave_details"
        leaveTypeDisplayMap={leaveTypeDisplayMap}
        employeeNameById={employeeNameById}
        employeeDataById={employeeDataMap}
        onClose={closeLeaveDetailsModal}
        canApproveReject={false}
      />
    </>
  );
};

export default LeaveEmployee;
