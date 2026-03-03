import { useUser } from "@clerk/clerk-react";
import { DatePicker, message, Spin } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CollapseHeader from "../../../../core/common/collapse-header/collapse-header";
import CommonSelect from "../../../../core/common/commonSelect";
import Table from "../../../../core/common/dataTable/index";
import PredefinedDateRanges from "../../../../core/common/datePicker";
import Footer from "../../../../core/common/footer";
import ImageWithBasePath from "../../../../core/common/imageWithBasePath";
import LeaveDetailsModal from "../../../../core/modals/LeaveDetailsModal";
import { useAuth } from "../../../../hooks/useAuth";
import { useAutoReloadActions } from "../../../../hooks/useAutoReload";
import { useEmployeesREST } from "../../../../hooks/useEmployeesREST";
import { useLeaveLedger } from "../../../../hooks/useLeaveLedger";
import { statusDisplayMap, useLeaveREST, type LeaveStatus, type LeaveTypeCode } from "../../../../hooks/useLeaveREST";
import { useLeaveTypesREST } from "../../../../hooks/useLeaveTypesREST";
import { all_routes } from "../../../router/all_routes";

// Loading spinner component
const LoadingSpinner = () => (
  <div style={{ textAlign: 'center', padding: '50px' }}>
    <Spin size="large" />
  </div>
);

// Skeleton Loader Components
const StatCardSkeleton = () => (
  <div className="card">
    <div className="card-body">
      <div className="d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center">
          <div className="flex-shrink-0 me-2">
            <div className="skeleton-avatar"></div>
          </div>
        </div>
        <div className="text-end">
          <div className="skeleton-text skeleton-stat-label mb-2"></div>
          <div className="skeleton-text skeleton-stat-value"></div>
        </div>
      </div>
    </div>
  </div>
);

const TableRowSkeleton = () => (
  <tr>
    <td><div className="skeleton-checkbox"></div></td>
    <td>
      <div className="d-flex align-items-center">
        <div className="skeleton-avatar me-2"></div>
        <div>
          <div className="skeleton-text skeleton-name mb-1"></div>
          <div className="skeleton-text skeleton-role"></div>
        </div>
      </div>
    </td>
    <td><div className="skeleton-text skeleton-emp-id"></div></td>
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
          <th><div className="skeleton-checkbox"></div></th>
          <th>Employee</th>
          <th>Emp ID</th>
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
const LeaveTypeBadge = ({ leaveType, onViewDetails, leaveTypeDisplayMap }: { leaveType: string; onViewDetails?: () => void; leaveTypeDisplayMap: Record<string, string> }) => {
  const displayType = leaveTypeDisplayMap[leaveType?.toLowerCase?.()] || leaveType;
  return (
    <span className="fs-14 fw-medium d-flex align-items-center">
      {displayType}
      <Link
        to="#"
        className="ms-2"
        data-bs-toggle="modal"
        data-bs-target="#view_leave_details"
        onClick={onViewDetails}
        data-bs-placement="right"
        title="View leave details"
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
  const { leaves, loading, fetchLeaves, approveLeave, rejectLeave, managerActionLeave, deleteLeave, pagination, createLeave, updateLeave, fetchStats, leaveTypeDisplayMap } = useLeaveREST();
  const { activeOptions, fetchActiveLeaveTypes, loading: leaveTypesLoading } = useLeaveTypesREST();
  const { employees, fetchEmployees, loading: employeesLoading } = useEmployeesREST();
  const { fetchEmployeeBalanceSummary } = useLeaveLedger();
  const { user: clerkUser } = useUser();
  const { role, employeeId: currentEmployeeId, isLoaded, isSignedIn } = useAuth();

  // Loading states
  const [statsLoading, setStatsLoading] = useState(true);

  // Returns true when the current HR user is also the assigned reporting manager for a leave.
  // Primary check: employeeId from Clerk metadata matches the leave's reportingManagerId.
  // Fallback check: full name match when employeeId is not yet set in Clerk metadata.
  // (Security is always enforced by the backend; this only controls UI visibility.)
  const isHRActingAsManager = (leave: any): boolean => {
    if (role !== 'hr') return false;
    if (currentEmployeeId && leave?.reportingManagerId === currentEmployeeId) return true;
    // Fallback: case-insensitive name match (when employeeId not stored in Clerk publicMetadata)
    if (!currentEmployeeId && clerkUser?.fullName && leave?.reportingManagerName) {
      return leave.reportingManagerName.trim().toLowerCase() === clerkUser.fullName.trim().toLowerCase();
    }
    return false;
  };

  // Returns true when the current user is allowed to approve/reject a leave
  const canApproveRejectLeave = (leave: any) =>
    role !== 'hr' || isHRActingAsManager(leave) || !!leave?.isHRFallback;

  // Auto-reload hook for refetching after actions
  const { refetchAfterAction } = useAutoReloadActions({
    fetchFn: () => {
      fetchLeaves(filters);
    },
    debug: true,
  });

  // Stats state from API
  const [stats, setStats] = useState<{
    totalPresent: number;
    plannedLeaves: number;
    unplannedLeaves: number;
    pendingRequests: number;
    totalEmployees: number;
  }>({
    totalPresent: 0,
    plannedLeaves: 0,
    unplannedLeaves: 0,
    pendingRequests: 0,
    totalEmployees: 0,
  });

  // Local state for filters
  const [filters, setFilters] = useState<{
    status?: LeaveStatus;
    leaveType?: LeaveTypeCode;
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
    isManagerAction: boolean;
  }>({
    show: false,
    leaveId: null,
    reason: '',
    isManagerAction: false,
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

  // Validation errors for Add Leave modal
  const [addFormErrors, setAddFormErrors] = useState<Record<string, string>>({});

  // Balance state for selected employee and leave type
  const [selectedEmployeeBalance, setSelectedEmployeeBalance] = useState<{
    balance: number;
    used: number;
    total: number;
    hasCustomPolicy?: boolean;
    customPolicyName?: string;
  } | null>(null);

  // Loading states for Add Leave modal
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [addLeaveLoading, setAddLeaveLoading] = useState(false);

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

  // Fetch employees on mount for dropdown (gated on auth readiness)
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    fetchEmployees({ status: 'Active' }); // Only fetch active employees
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    fetchActiveLeaveTypes();
  }, [isLoaded, isSignedIn, fetchActiveLeaveTypes]);

  // Fetch stats on mount (gated on auth readiness)
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const loadStats = async () => {
      setStatsLoading(true);
      const statsData = await fetchStats();
      if (statsData) {
        setStats({
          totalPresent: statsData.totalPresent || 0,
          plannedLeaves: statsData.plannedLeaves || 0,
          unplannedLeaves: statsData.unplannedLeaves || 0,
          pendingRequests: statsData.pendingRequests || 0,
          totalEmployees: statsData.totalEmployees || 0,
        });
      }
      setStatsLoading(false);
    };
    loadStats();
  }, [isLoaded, isSignedIn, fetchStats]);

  // Fetch leaves on mount and when filters change (gated on auth readiness)
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    fetchLeaves(filters);
  }, [isLoaded, isSignedIn, filters]);

  // Auto-populate reporting manager when employee is selected (Add Leave modal)
  useEffect(() => {
    if (addFormData.employeeId) {
      const selectedEmployee = employees.find(emp => emp._id === addFormData.employeeId);
      if (selectedEmployee?.reportingToEmployeeId) {
        setAddFormData(prev => ({ ...prev, reportingManagerId: selectedEmployee.reportingToEmployeeId! }));
      } else {
        setAddFormData(prev => ({ ...prev, reportingManagerId: '' }));
      }
    }
  }, [addFormData.employeeId, employees]);

  // Fetch balance when employeeId or leaveType changes in Add Leave modal
  // Uses Leave Ledger API to get accurate balance from ledger collection
  // Now uses ObjectId-based lookups (modern approach) instead of string codes
  useEffect(() => {
    const fetchEmployeeBalance = async () => {
      console.log('[leaveAdmin] fetchEmployeeBalance called', {
        employeeId: addFormData.employeeId,
        leaveType: addFormData.leaveType,
        hasEmployees: employees.length > 0
      });

      if (addFormData.employeeId && addFormData.leaveType) {
        setBalanceLoading(true); // Start loading
        // Find the employee object to get the employeeId string (e.g., "EMP-2865")
        // addFormData.employeeId contains MongoDB _id, we need the employeeId string for Ledger API
        const selectedEmployee = employees.find(emp => emp._id === addFormData.employeeId);
        const employeeIdString = selectedEmployee?.employeeId; // e.g., "EMP-2865"

        console.log('[leaveAdmin] Found employee:', {
          selectedEmployee,
          employeeIdString,
          allEmployees: employees.map(e => ({ _id: e._id, employeeId: e.employeeId, name: e.firstName }))
        });

        if (!employeeIdString) {
          console.warn('[leaveAdmin] No employeeIdString found, setting balance to null');
          setSelectedEmployeeBalance(null);
          setBalanceLoading(false);
          return;
        }

        // addFormData.leaveType is already the ObjectId (from dropdown value)
        // No need to convert to code - backend now returns summary keyed by ObjectId
        const leaveTypeId = addFormData.leaveType;

        console.log('[leaveAdmin] Leave type ObjectId:', leaveTypeId);

        // Use Leave Ledger API to get accurate balance from ledger collection (source of truth)
        console.log('[leaveAdmin] Calling fetchEmployeeBalanceSummary with:', employeeIdString);
        const balanceSummary = await fetchEmployeeBalanceSummary(employeeIdString);
        console.log('[leaveAdmin] Balance summary received:', balanceSummary);
        console.log('[leaveAdmin] Available keys in balanceSummary:', balanceSummary ? Object.keys(balanceSummary) : 'balanceSummary is null/undefined');

        if (balanceSummary && leaveTypeId) {
          // MODERN APPROACH: balanceSummary is now keyed by ObjectId (leaveTypeId)
          const balance = balanceSummary[leaveTypeId];

          console.log('[leaveAdmin] Balance for leave type ObjectId:', leaveTypeId, balance);

          if (balance) {
            console.log('[leaveAdmin] Setting balance state:', {
              balance: balance.balance,
              used: balance.used,
              total: balance.total
            });
            setSelectedEmployeeBalance({
              balance: balance.balance || 0,
              used: balance.used || 0,
              total: balance.total || 0,
              hasCustomPolicy: balance.hasCustomPolicy,
              customPolicyName: balance.customPolicyName,
            });
          } else {
            console.warn('[leaveAdmin] Balance not found for leave type ObjectId:', leaveTypeId);
            setSelectedEmployeeBalance(null);
          }
        } else {
          console.warn('[leaveAdmin] Balance summary is null or leaveTypeId is missing');
          setSelectedEmployeeBalance(null);
        }
        setBalanceLoading(false); // End loading
      } else {
        console.log('[leaveAdmin] employeeId or leaveType is missing, setting balance to null');
        setSelectedEmployeeBalance(null);
        setBalanceLoading(false);
      }
    };

    fetchEmployeeBalance();
  }, [addFormData.employeeId, addFormData.leaveType, employees, fetchEmployeeBalanceSummary]);

  // Fetch balance when employeeId or leaveType changes in Edit Leave modal
  // Uses Leave Ledger API to get accurate balance from ledger collection
  // Now uses ObjectId-based lookups (modern approach) instead of string codes
  useEffect(() => {
    const fetchEmployeeBalanceForEdit = async () => {
      console.log('[leaveAdmin] Edit mode - fetchEmployeeBalance called', {
        employeeId: editFormData?.employeeId,
        leaveType: editFormData?.leaveType,
        hasEmployees: employees.length > 0
      });

      if (editFormData?.employeeId && editFormData.leaveType) {
        // Find the employee object to get the employeeId string (e.g., "EMP-2865")
        const selectedEmployee = employees.find(emp => emp._id === editFormData.employeeId);
        const employeeIdString = selectedEmployee?.employeeId;

        console.log('[leaveAdmin] Edit mode - Found employee:', {
          selectedEmployee,
          employeeIdString
        });

        if (!employeeIdString) {
          setSelectedEmployeeBalance(null);
          return;
        }

        // editFormData.leaveType is already the ObjectId (from dropdown value)
        // No need to convert to code - backend now returns summary keyed by ObjectId
        const leaveTypeId = editFormData.leaveType;

        console.log('[leaveAdmin] Edit mode - Leave type ObjectId:', leaveTypeId);
        console.log('[leaveAdmin] Edit mode - Calling fetchEmployeeBalanceSummary for:', employeeIdString);

        // Use Leave Ledger API to get accurate balance from ledger collection (source of truth)
        const balanceSummary = await fetchEmployeeBalanceSummary(employeeIdString);
        console.log('[leaveAdmin] Edit mode - Balance summary received:', balanceSummary);

        if (balanceSummary && leaveTypeId) {
          // MODERN APPROACH: balanceSummary is now keyed by ObjectId (leaveTypeId)
          const balance = balanceSummary[leaveTypeId];

          console.log('[leaveAdmin] Edit mode - Balance for leave type ObjectId:', leaveTypeId, balance);

          if (balance) {
            setSelectedEmployeeBalance({
              balance: balance.balance || 0,
              used: balance.used || 0,
              total: balance.total || 0,
              hasCustomPolicy: balance.hasCustomPolicy,
              customPolicyName: balance.customPolicyName,
            });
          } else {
            setSelectedEmployeeBalance(null);
          }
        } else {
          setSelectedEmployeeBalance(null);
        }
      }
    };

    fetchEmployeeBalanceForEdit();
  }, [editFormData?.employeeId, editFormData?.leaveType, employees, fetchEmployeeBalanceSummary]);

  // Auto-populate reporting manager when employee is selected (Edit Leave modal)
  useEffect(() => {
    if (editFormData?.employeeId) {
      const selectedEmployee = employees.find(emp => emp._id === editFormData.employeeId);
      if (selectedEmployee?.reportingToEmployeeId) {
        setEditFormData(prev => prev ? { ...prev, reportingManagerId: selectedEmployee.reportingToEmployeeId! } : prev);
      }
    }
  }, [editFormData?.employeeId, employees]);

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

  // Employee data map for avatar, role, etc.
  const employeeDataMap = useMemo(() => {
    const map = new Map<string, { avatar?: string; avatarUrl?: string; profileImage?: string; role?: string; designation?: string }>();
    employees.forEach(emp => {
      map.set(emp.employeeId, {
        avatar: emp.avatar,
        avatarUrl: emp.avatarUrl || emp.profileImage,
        profileImage: emp.profileImage,
        role: emp.role,
        designation: emp.designation,
      });
    });
    return map;
  }, [employees]);

  // Transform leaves for table display
  const data = leaves.map((leave) => {
    const employeeName = employeeNameById.get(leave.employeeId) || leave.employeeName || "Unknown";
    const employeeData = employeeDataMap.get(leave.employeeId);
    const managerStatusValue = leave.managerStatus || 'pending';
    const statusValue = leave.finalStatus || leave.status || 'pending';

    // Get avatar URL (priority: avatarUrl > profileImage > avatar > default)
    const avatarUrl = employeeData?.avatarUrl || employeeData?.profileImage || employeeData?.avatar;
    // Get role or designation (priority: role > designation > "Employee")
    // designation may be a populated MongoDB object with a .designation string field
    const rawDesignation = employeeData?.designation;
    const designationStr = typeof rawDesignation === 'object' && rawDesignation !== null
      ? (rawDesignation as any).designation || (rawDesignation as any).name || ''
      : rawDesignation;
    const roleOrDesignation = employeeData?.role || designationStr || "Employee";

    return {
      key: leave._id,
      _id: leave._id,
      Image: avatarUrl || "user-32.jpg", // Use employee avatar or fallback to default
      Employee: employeeName,
      Role: roleOrDesignation,
      EmpId: leave.employeeId || "-",
      ReportingManager: leave.reportingManagerName || "-",
      LeaveType: leave.leaveType,
      LeaveTypeName: leave.leaveTypeName, // Display name from backend (ObjectId system)
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

    const useManagerAction = role === 'manager' || isHRActingAsManager(leave);
    const success = useManagerAction
      ? await managerActionLeave(id, 'approved', undefined, 'Approved')
      : await approveLeave(id, "Approved");
    if (success) {
      refetchAfterAction(); // Refresh list and stats
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
      reason: '',
      isManagerAction: role === 'manager' || isHRActingAsManager(leave),
    });
  };

  const handleRejectConfirm = async () => {
    if (rejectModal.leaveId && rejectModal.reason.trim()) {
      const success = rejectModal.isManagerAction
        ? await managerActionLeave(rejectModal.leaveId, 'rejected', rejectModal.reason)
        : await rejectLeave(rejectModal.leaveId, rejectModal.reason);
      if (success) {
        refetchAfterAction(); // Refresh list and stats
      }
      setRejectModal({ show: false, leaveId: null, reason: '', isManagerAction: false });
    }
  };

  const handleRejectCancel = () => {
    setRejectModal({ show: false, leaveId: null, reason: '', isManagerAction: false });
  };

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

  const closeLeaveDetailsModal = () => {
    const modalEl = document.getElementById('view_leave_details');
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
        refetchAfterAction(); // Refresh list and stats
      }
    }
  };

  // Handler for Add Leave form submission
  const handleAddLeaveSubmit = async () => {
    // Prevent duplicate submissions
    if (addLeaveLoading) return;

    const errors: Record<string, string> = {};
    if (!addFormData.employeeId) errors.employeeId = 'Please select an employee';
    // Note: reportingManagerId is auto-populated from employee data, no validation required
    if (!addFormData.leaveType) errors.leaveType = 'Please select a leave type';
    if (!addFormData.startDate) errors.startDate = 'Please select a start date';
    if (!addFormData.endDate) errors.endDate = 'Please select an end date';
    if (addFormData.startDate && addFormData.endDate && addFormData.endDate.isBefore(addFormData.startDate, 'day')) {
      errors.endDate = '"To" date must be same as or after "From" date';
    }
    if (!addFormData.session) errors.session = 'Please select day type';
    if (!addFormData.reason.trim()) errors.reason = 'Please provide a reason for the leave';
    // Balance validation
    if (addFormData.employeeId && addFormData.leaveType && selectedEmployeeBalance !== null && selectedEmployeeBalance.balance <= 0) {
      errors.remainingDays = 'No remaining leave balance. Cannot add leave for this employee.';
    }

    if (Object.keys(errors).length > 0) {
      setAddFormErrors(errors);
      return;
    }
    setAddFormErrors({});

    setAddLeaveLoading(true); // Start loading
    const success = await createLeave({
      employeeId: addFormData.employeeId,
      reportingManagerId: addFormData.reportingManagerId || undefined,
      leaveType: addFormData.leaveType as any,
      startDate: addFormData.startDate.format('YYYY-MM-DD'),
      endDate: addFormData.endDate.format('YYYY-MM-DD'),
      reason: addFormData.reason,
    });
    setAddLeaveLoading(false); // End loading

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
    // Note: reportingManagerId is auto-populated from employee data, no validation required
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
      // Refresh data using auto-reload
      refetchAfterAction();
    }
  };

  // Employee options for dropdown - Phase 2: Using real employees from API
  const getEmployeeOptionLabel = (emp: any) => {
    const name = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
    const id = emp.employeeId || '';
    return id ? `${id} ${name}` : name;
  };

  const employeename = [
    { value: "", label: "Select Employee" },
    ...employees.map(emp => ({
      value: emp._id, // Use MongoDB _id instead of employeeId
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
            {record.Image && record.Image !== "user-32.jpg" ? (
              <img
                src={record.Image}
                className="img-fluid rounded-circle"
                alt="img"
                onError={(e) => { (e.target as HTMLImageElement).src = 'assets/img/users/user-32.jpg'; }}
              />
            ) : (
              <ImageWithBasePath
                src={`assets/img/users/${record.Image}`}
                className="img-fluid"
                alt="img"
              />
            )}
          </Link>
          <div className="ms-2">
            <h6 className="fw-medium">
              <Link
                to="#"
                onClick={(e) => { e.preventDefault(); openLeaveDetailsModal(record.rawLeave); }}
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
      title: "Emp ID",
      dataIndex: "EmpId",
      width: 100,
      sorter: (a: any, b: any) => (a.EmpId || '').localeCompare(b.EmpId || ''),
    },
    {
      title: "Leave Type",
      dataIndex: "LeaveType",
      render: (_: string, record: any) => {
        // Use leaveTypeName from backend (ObjectId system) with fallback to map for backward compatibility
        const displayName = record.LeaveTypeName || leaveTypeDisplayMap[record.LeaveType?.toLowerCase?.()] || record.LeaveType;
        return (
          <span className="fs-14 fw-medium d-flex align-items-center">
            {displayName}
            <Link
              to="#"
              className="ms-2"
              onClick={(e) => { e.preventDefault(); openLeaveDetailsModal(record.rawLeave); }}
              data-bs-placement="right"
              title="View leave details"
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
      title: "Status",
      dataIndex: "Status",
      key: "Status",
      render: (status: string) => {
        // Normalize status for comparison (handle case-insensitive)
        const normalizedStatus = (status || 'pending').toLowerCase();

        // Determine badge color based on status
        let badgeClass = "badge-warning"; // Default yellow for pending

        if (normalizedStatus === "approved") {
          badgeClass = "badge-success"; // Green
        } else if (normalizedStatus === "rejected") {
          badgeClass = "badge-danger"; // Red
        } else if (normalizedStatus === "cancelled") {
          badgeClass = "badge-secondary"; // Gray
        } else if (normalizedStatus === "on-hold") {
          badgeClass = "badge-info"; // Blue
        } else if (normalizedStatus === "pending") {
          badgeClass = "badge-warning"; // Yellow
        }

        return (
          <span
            className={`badge ${badgeClass} d-inline-flex align-items-center badge-xs`}
          >
            <i className="ti ti-point-filled me-1" />
            {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending'}
          </span>
        );
      },
      sorter: (a: any, b: any) => (a.Status || '').localeCompare(b.Status || ''),
    },
    {
      title: "",
      dataIndex: "actions",
      render: (_: any, record: any) => (
        <div className="action-icon d-inline-flex">
          {record.Status === 'pending' && canApproveRejectLeave(record.rawLeave) && (
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
          <Link
            to="#"
            className="me-2"
            title="View details"
            onClick={(e) => { e.preventDefault(); openLeaveDetailsModal(record.rawLeave); }}
          >
            <i className="ti ti-eye" style={{ fontSize: '18px' }} />
          </Link>
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

  // Dynamic leave type filter options built from active leave types in database
  // Use ObjectId (value) for filtering - backend supports both leaveType (legacy) and leaveTypeId (new)
  const leaveTypeFilterOptions = useMemo(() => [
    { value: "", label: "All Types" },
    ...activeOptions.map(option => ({ value: option.value, label: String(option.label) })),
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
    setFilters(prev => ({ ...prev, status, page: 1 }));
  };

  const handleLeaveTypeFilter = (leaveTypeId: string) => {
    setFilters(prev => ({ ...prev, leaveTypeId, leaveType: undefined, page: 1 }));
  };

  // Stats are now fetched from API via fetchStats()
  const getModalContainer = () => {
    const modalElement = document.getElementById("modal-datepicker");
    return modalElement ? modalElement : document.body; // Fallback to document.body if modalElement is null
  };

  return (
    <>
      {/* Skeleton & Timeline Styles */}
      <style>{`
        /* Skeleton Loader Styles */
        .skeleton-text {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: skeleton-loading 1.5s ease-in-out infinite;
          border-radius: 4px;
          height: 16px;
        }

        .skeleton-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: skeleton-loading 1.5s ease-in-out infinite;
        }

        .skeleton-checkbox {
          width: 20px;
          height: 20px;
          border-radius: 4px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: skeleton-loading 1.5s ease-in-out infinite;
        }

        .skeleton-badge {
          width: 80px;
          height: 24px;
          border-radius: 12px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: skeleton-loading 1.5s ease-in-out infinite;
        }

        .skeleton-actions {
          width: 100px;
          height: 20px;
          border-radius: 4px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: skeleton-loading 1.5s ease-in-out infinite;
        }

        .skeleton-stat-label {
          width: 120px;
          height: 16px;
        }

        .skeleton-stat-value {
          width: 60px;
          height: 32px;
        }

        .skeleton-name {
          width: 140px;
          height: 14px;
        }

        .skeleton-role {
          width: 80px;
          height: 12px;
        }

        .skeleton-emp-id {
          width: 80px;
          height: 14px;
        }

        .skeleton-leave-type {
          width: 100px;
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

        /* Timeline Styles */
        .leave-timeline .timeline-item {
          position: relative;
          padding-bottom: 20px;
          padding-left: 30px;
        }
        .leave-timeline .timeline-item:last-child {
          padding-bottom: 0;
        }
        .leave-timeline .timeline-item:last-child .timeline-line {
          display: none;
        }
        .leave-timeline .timeline-dot {
          position: absolute;
          left: 0;
          top: 2px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          z-index: 1;
          border: 2px solid white;
          box-shadow: 0 0 0 2px #dee2e6;
        }
        .leave-timeline .timeline-line {
          position: absolute;
          left: 5px;
          top: 14px;
          width: 2px;
          height: calc(100% + 6px);
          background-color: #dee2e6;
          z-index: 0;
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
            {statsLoading ? (
              <>
                <div className="col-xl-3 col-md-6">
                  <StatCardSkeleton />
                </div>
                <div className="col-xl-3 col-md-6">
                  <StatCardSkeleton />
                </div>
                <div className="col-xl-3 col-md-6">
                  <StatCardSkeleton />
                </div>
                <div className="col-xl-3 col-md-6">
                  <StatCardSkeleton />
                </div>
              </>
            ) : (
              <>
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
                      <h4>{stats.totalPresent}/{stats.totalEmployees}</h4>
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
              </>
            )}
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
                    {leaveTypeFilterOptions.map(option => (
                      <li key={option.value}>
                        <Link
                          to="#"
                          className="dropdown-item rounded-1"
                          onClick={() => handleLeaveTypeFilter(option.value)}
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
                <TableSkeleton />
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
                onClick={() => {
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
                  setAddFormErrors({});
                  setBalanceLoading(false);
                  setAddLeaveLoading(false);
                }}
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form>
              <div className="modal-body pb-0">
                <div className="row">
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Employee Name <span className="text-danger">*</span></label>
                      <CommonSelect
                        className="select"
                        options={employeename}
                        value={addFormData.employeeId}
                        onChange={(option: any) => { setAddFormData({ ...addFormData, employeeId: option?.value || '' }); setAddFormErrors(prev => { const { employeeId, ...rest } = prev; return rest; }); }}
                      />
                      {addFormErrors.employeeId && <small className="text-danger">{addFormErrors.employeeId}</small>}
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Reporting Manager</label>
                      <input
                        type="text"
                        className="form-control bg-light"
                        value={(() => {
                          const manager = employees.find(emp => emp.employeeId === addFormData.reportingManagerId);
                          return manager ? `${manager.employeeId} ${manager.firstName} ${manager.lastName}`.trim() : 'No reporting manager assigned';
                        })()}
                        disabled
                      />
                      {!addFormData.reportingManagerId && addFormData.employeeId && (
                        <small className="text-warning fs-11">
                          <i className="ti ti-alert-triangle me-1"></i>
                          This employee has no reporting manager assigned
                        </small>
                      )}
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Leave Type <span className="text-danger">*</span></label>
                      <CommonSelect
                        className="select"
                        options={leaveTypeOptions}
                        value={leaveTypeOptions.find(opt => opt.value === addFormData.leaveType)?.value || addFormData.leaveType}
                        onChange={(option: any) => { setAddFormData({ ...addFormData, leaveType: option?.value || '' }); setAddFormErrors(prev => { const { leaveType, ...rest } = prev; return rest; }); }}
                      />
                      {addFormErrors.leaveType && <small className="text-danger">{addFormErrors.leaveType}</small>}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">From <span className="text-danger">*</span></label>
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
                          onChange={(date) => { setAddFormData({ ...addFormData, startDate: date }); setAddFormErrors(prev => { const { startDate, ...rest } = prev; return rest; }); }}
                        />
                        <span className="input-icon-addon">
                          <i className="ti ti-calendar text-gray-7" />
                        </span>
                      </div>
                      {addFormErrors.startDate && <small className="text-danger">{addFormErrors.startDate}</small>}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">To <span className="text-danger">*</span></label>
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
                          onChange={(date) => { setAddFormData({ ...addFormData, endDate: date }); setAddFormErrors(prev => { const { endDate, ...rest } = prev; return rest; }); }}
                        />
                        <span className="input-icon-addon">
                          <i className="ti ti-calendar text-gray-7" />
                        </span>
                      </div>
                      {addFormErrors.endDate && <small className="text-danger">{addFormErrors.endDate}</small>}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Day Type <span className="text-danger">*</span></label>
                      <CommonSelect
                        className="select"
                        options={dayTypeOptions}
                        value={addFormData.session}
                        disabled={!addFormData.leaveType}
                        onChange={(option: any) => { setAddFormData({ ...addFormData, session: option?.value || '' }); setAddFormErrors(prev => { const { session, ...rest } = prev; return rest; }); }}
                      />
                      {addFormErrors.session && <small className="text-danger">{addFormErrors.session}</small>}
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
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control bg-light"
                          value={balanceLoading ? '' : (selectedEmployeeBalance?.balance?.toString() || '-')}
                          disabled
                          placeholder={balanceLoading ? 'Loading...' : ''}
                        />
                        {balanceLoading && (
                          <span className="input-group-text bg-light border-start-0">
                            <span className="spinner-border spinner-border-sm text-primary" role="status">
                              <span className="visually-hidden">Loading...</span>
                            </span>
                          </span>
                        )}
                      </div>
                      {selectedEmployeeBalance !== null && selectedEmployeeBalance.balance <= 0 && (
                        <small className="text-danger">
                          <i className="ti ti-alert-circle me-1"></i>
                          No remaining leave balance. Cannot add leave for this employee.
                        </small>
                      )}
                      {addFormErrors.remainingDays && !selectedEmployeeBalance && <small className="text-danger">{addFormErrors.remainingDays}</small>}
                      {selectedEmployeeBalance?.hasCustomPolicy && selectedEmployeeBalance.balance > 0 && (
                        <small className="text-primary fs-11">
                          <i className="ti ti-discount-check me-1"></i>
                          Custom Policy: {selectedEmployeeBalance.customPolicyName || 'N/A'} ({selectedEmployeeBalance.total} days/year)
                        </small>
                      )}
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Reason <span className="text-danger">*</span></label>
                      <textarea
                        className="form-control"
                        rows={3}
                        value={addFormData.reason}
                        onChange={(e) => { setAddFormData({ ...addFormData, reason: e.target.value }); setAddFormErrors(prev => { const { reason, ...rest } = prev; return rest; }); }}
                      />
                      {addFormErrors.reason && <small className="text-danger">{addFormErrors.reason}</small>}
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
                    setAddFormErrors({});
                    setBalanceLoading(false);
                    setAddLeaveLoading(false);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAddLeaveSubmit}
                  disabled={addLeaveLoading || (selectedEmployeeBalance !== null && selectedEmployeeBalance.balance <= 0)}
                >
                  {addLeaveLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Submitting...
                    </>
                  ) : (
                    'Add Leave'
                  )}
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
                      <input
                        type="text"
                        className="form-control bg-light"
                        value={(() => {
                          const manager = employees.find(emp => emp.employeeId === editFormData?.reportingManagerId);
                          return manager ? `${manager.employeeId} ${manager.firstName} ${manager.lastName}`.trim() : 'No reporting manager assigned';
                        })()}
                        disabled
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
                        className="form-control bg-light"
                        value={selectedEmployeeBalance?.balance?.toString() || '-'}
                        disabled
                      />
                      {selectedEmployeeBalance?.hasCustomPolicy && (
                        <small className="text-primary fs-11">
                          <i className="ti ti-discount-check me-1"></i>
                          Custom Policy: {selectedEmployeeBalance.customPolicyName || 'N/A'} ({selectedEmployeeBalance.total} days/year)
                        </small>
                      )}
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
        onApprove={async (leave) => {
          await handleApprove(leave);
          closeLeaveDetailsModal();
        }}
        onReject={(leave) => {
          closeLeaveDetailsModal();
          handleRejectClick(leave);
        }}
        canApproveReject={selectedLeave ? canApproveRejectLeave(selectedLeave) : false}
      />
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
