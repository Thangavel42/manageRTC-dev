import { DatePicker, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CollapseHeader from "../../../../core/common/collapse-header/collapse-header";
import CommonSelect from "../../../../core/common/commonSelect";
import Table from "../../../../core/common/dataTable/index";
import Footer from "../../../../core/common/footer";
import ImageWithBasePath from "../../../../core/common/imageWithBasePath";
import { useAuth } from "../../../../hooks/useAuth";
import { useAutoReloadActions } from "../../../../hooks/useAutoReload";
import { useEmployeesREST } from "../../../../hooks/useEmployeesREST";
import { statusDisplayMap, useLeaveREST, type LeaveStatus, type LeaveTypeCode } from "../../../../hooks/useLeaveREST";
import { useLeaveTypesREST } from "../../../../hooks/useLeaveTypesREST";
import { all_routes } from "../../../router/all_routes";

// Skeleton Loaders
const StatCardSkeleton = () => (
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
        .skeleton-stat-label {
          width: 120px;
          height: 14px;
          margin-bottom: 8px;
        }
        .skeleton-stat-value {
          width: 60px;
          height: 32px;
        }
        .skeleton-icon {
          width: 48px;
          height: 48px;
          border-radius: 8px;
        }
      `}</style>
      <div className="d-flex align-items-center justify-content-between">
        <div>
          <div className="skeleton-text skeleton-stat-label"></div>
          <div className="skeleton-text skeleton-stat-value"></div>
        </div>
        <div className="skeleton-text skeleton-icon"></div>
      </div>
    </div>
  </div>
);

const TeamMemberCardSkeleton = () => (
  <div className="col-xl-4 col-md-6 mb-3">
    <div className="d-flex align-items-center p-3 border rounded">
      <style>{`
        .skeleton-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
        }
        .skeleton-team-name {
          width: 140px;
          height: 16px;
          margin-bottom: 8px;
        }
        .skeleton-team-info {
          width: 180px;
          height: 14px;
        }
        .skeleton-badge {
          width: 70px;
          height: 24px;
          border-radius: 4px;
        }
      `}</style>
      <div className="skeleton-text skeleton-avatar me-3"></div>
      <div className="flex-grow-1">
        <div className="skeleton-text skeleton-team-name"></div>
        <div className="skeleton-text skeleton-team-info"></div>
      </div>
      <div className="skeleton-text skeleton-badge"></div>
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
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="skeleton-text skeleton-table-row"></div>
    ))}
  </div>
);

// Status badge component
const StatusBadge = ({ status }: { status: LeaveStatus }) => {
  const validStatus = (status || 'pending') as LeaveStatus;
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

// Leave type badge component
const LeaveTypeBadge = ({ leaveType, leaveTypeDisplayMap }: { leaveType: string; leaveTypeDisplayMap: Record<string, string> }) => {
  const displayType = leaveTypeDisplayMap[leaveType?.toLowerCase?.()] || leaveType;
  return (
    <span className="fs-14 fw-medium d-flex align-items-center">
      {displayType}
    </span>
  );
};

const normalizeDate = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const ManagerLeaveDashboard = () => {
  const { role, userId } = useAuth();
  const { leaves, loading, fetchLeaves, approveLeave, rejectLeave, managerActionLeave, fetchStats, leaveTypeDisplayMap } = useLeaveREST();
  const { employees, fetchEmployees } = useEmployeesREST();
  const { activeOptions, fetchActiveLeaveTypes } = useLeaveTypesREST();

  // Auto-reload hook for refetching after actions
  const { refetchAfterAction } = useAutoReloadActions({
    fetchFn: () => {
      fetchLeaves(filters);
      // Stats will be recalculated via useEffect when leaves change
    },
    debug: true,
  });

  // Stats state
  const [stats, setStats] = useState({
    teamSize: 0,
    onLeaveToday: 0,
    pendingApprovals: 0,
    approvedThisMonth: 0,
    totalTeamLeaves: 0,
  });

  // Local state for filters
  const [filters, setFilters] = useState<{
    status?: LeaveStatus;
    leaveType?: LeaveTypeCode;
    page: number;
    limit: number;
    dateRange?: [any, any];
  }>({
    page: 1,
    limit: 20,
  });

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

  // Fetch data on mount
  useEffect(() => {
    fetchEmployees({ status: 'Active' });
    fetchLeaves(filters);
    fetchActiveLeaveTypes();
  }, []);

  // Fetch stats when leaves change
  useEffect(() => {
    const loadStats = async () => {
      const statsData = await fetchStats();
      if (statsData) {
        // Calculate team-specific stats
        const teamMembers = employees.filter(emp =>
          emp.reportingTo === userId
        );

        const teamEmployeeIds = teamMembers.map(emp => emp.employeeId);

        // Today's date range
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

        // Team members on leave today
        const onLeaveToday = leaves.filter(leave => {
          if (!teamEmployeeIds.includes(leave.employeeId)) return false;
          if (leave.status !== 'approved') return false;

          const startDate = new Date(leave.startDate);
          const endDate = new Date(leave.endDate);
          return startDate <= endOfToday && endDate >= startOfToday;
        }).length;

        // Pending approvals for manager
        const pendingApprovals = leaves.filter(leave =>
          teamEmployeeIds.includes(leave.employeeId) &&
          leave.status === 'pending' &&
          (leave.managerStatus === 'pending' || !leave.managerStatus)
        ).length;

        // Approved this month
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const approvedThisMonth = leaves.filter(leave => {
          if (!teamEmployeeIds.includes(leave.employeeId)) return false;
          if (leave.status !== 'approved') return false;

          const approvedDate = leave.approvedAt ? new Date(leave.approvedAt) : leave.updatedAt;
          return approvedDate >= startOfMonth && approvedDate <= today;
        }).length;

        setStats({
          teamSize: teamMembers.length,
          onLeaveToday,
          pendingApprovals,
          approvedThisMonth,
          totalTeamLeaves: leaves.filter(l => teamEmployeeIds.includes(l.employeeId)).length,
        });
      }
    };
    loadStats();
  }, [leaves, employees, userId]);

  // Filter to show only team's leaves
  const teamLeaves = useMemo(() => {
    if (!userId) return [];
    const teamEmployeeIds = employees
      .filter(emp => emp.reportingTo === userId)
      .map(emp => emp.employeeId);

    return leaves.filter(leave => teamEmployeeIds.includes(leave.employeeId));
  }, [leaves, employees, userId]);

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
  const data = useMemo(() => {
    return teamLeaves.map((leave) => {
      const employeeName = employeeNameById.get(leave.employeeId) || leave.employeeName || "Unknown";
      const employeeData = employeeDataMap.get(leave.employeeId);
      const managerStatusValue = leave.managerStatus || 'pending';
      const statusValue = leave.finalStatus || leave.status || 'pending';
      const startDate = new Date(leave.startDate);
      const endDate = new Date(leave.endDate);

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
        From: startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        To: endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        NoOfDays: `${leave.duration} Day${leave.duration > 1 ? 's' : ''}`,
        ManagerStatus: managerStatusValue,
        Status: statusValue,
        rawLeave: leave,
      };
    });
  }, [teamLeaves, employeeNameById, employeeDataMap]);

  // Helper function to format dates
  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // Handler functions
  const handleApprove = async (leave: any) => {
    const id = leave.rawLeave?.leaveId || leave._id;
    if (!id) {
      message.error('Missing leave identifier');
      return;
    }

    const success = await managerActionLeave(id, 'approved');
    if (success) {
      message.success('Leave approved successfully');
      refetchAfterAction();
    }
  };

  const handleReject = async (leave: any) => {
    const id = leave.rawLeave?.leaveId || leave._id;
    if (!id) {
      message.error('Missing leave identifier');
      return;
    }
    setRejectModal({ show: true, leaveId: id, reason: '' });
  };

  const handleRejectConfirm = async () => {
    if (!rejectModal.reason || !rejectModal.reason.trim()) {
      message.error('Rejection reason is required');
      return;
    }

    const success = await managerActionLeave(rejectModal.leaveId!, 'rejected', rejectModal.reason);
    if (success) {
      message.success('Leave rejected successfully');
      setRejectModal({ show: false, leaveId: null, reason: '' });
      refetchAfterAction();
    }
  };

  // Status filter options
  const statusOptions = [
    { value: "", label: "All Status" },
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
  ];

  // Dynamic leave type options built from active leave types in database
  // Use ObjectId (value) for filtering - backend supports both leaveType (legacy) and leaveTypeId (new)
  const leaveTypeOptions = useMemo(() => [
    { value: "", label: "All Types" },
    ...activeOptions.map(option => ({ value: option.value, label: String(option.label) })),
  ], [activeOptions]);

  // Table columns
  const columns = [
    {
      title: "Employee",
      dataIndex: "Employee",
      sorter: (a: any, b: any) => a.Employee.length - b.Employee.length,
      render: (employee: string, record: any) => (
        <div className="d-flex align-items-center">
          <span className="avatar avatar-md me-2">
            {record.Image && record.Image !== "user-32.jpg" ? (
              <img
                src={record.Image}
                className="rounded-circle"
                alt="img"
                onError={(e) => { (e.target as HTMLImageElement).src = 'assets/img/users/user-32.jpg'; }}
              />
            ) : (
              <ImageWithBasePath src="assets/img/users/user-32.jpg" className="rounded-circle" alt="img" />
            )}
          </span>
          <div>
            <span className="d-block">{employee}</span>
            <span className="fs-12 text-muted">{record.Role}</span>
          </div>
        </div>
      ),
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
          </span>
        );
      },
      sorter: (a: any, b: any) => (a.LeaveTypeName || '').localeCompare(b.LeaveTypeName || ''),
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
      title: "Days",
      dataIndex: "NoOfDays",
      sorter: (a: any, b: any) => parseInt(a.NoOfDays) - parseInt(b.NoOfDays),
    },
    {
      title: "Status",
      dataIndex: "ManagerStatus",
      render: (status: string) => <StatusBadge status={status as LeaveStatus} />,
      sorter: (a: any, b: any) => a.ManagerStatus.localeCompare(b.ManagerStatus),
    },
    {
      title: "Action",
      render: (_: any, record: any) => (
        <div className="d-flex align-items-center">
          {record.Status === 'pending' && (
            <>
              <Link
                to="#"
                className="me-2"
                onClick={() => handleApprove(record)}
              >
                <i className="ti ti-check text-success fs-5" />
              </Link>
              <Link
                to="#"
                onClick={() => handleReject(record)}
              >
                <i className="ti ti-x text-danger fs-5" />
              </Link>
            </>
          )}
          {record.Status !== 'pending' && (
            <span className="text-muted">
              <i className="ti ti-check-double fs-5" />
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Team Leave Management</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={all_routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">HRM</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Team Leaves
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
              <div className="head-icons ms-2">
                <CollapseHeader />
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="row">
            {(loading || employees.length === 0) ? (
              <>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="col-xl-3 col-md-6">
                    <StatCardSkeleton />
                  </div>
                ))}
              </>
            ) : (
              <>
                <div className="col-xl-3 col-md-6">
                  <div className="card bg-primary-img">
                    <div className="card-body">
                      <div className="d-flex align-items-center justify-content-between">
                        <div>
                          <p className="mb-1">Team Size</p>
                          <h4 className="mb-0">{stats.teamSize}</h4>
                        </div>
                        <div className="avatar avatar-md bg-primary-transparent rounded">
                          <i className="ti ti-users fs-24 text-primary" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-xl-3 col-md-6">
                  <div className="card bg-warning-img">
                    <div className="card-body">
                      <div className="d-flex align-items-center justify-content-between">
                        <div>
                          <p className="mb-1">On Leave Today</p>
                          <h4 className="mb-0">{stats.onLeaveToday}</h4>
                        </div>
                        <div className="avatar avatar-md bg-warning-transparent rounded">
                          <i className="ti ti-calendar-event fs-24 text-warning" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-xl-3 col-md-6">
                  <div className="card bg-info-img">
                    <div className="card-body">
                      <div className="d-flex align-items-center justify-content-between">
                        <div>
                          <p className="mb-1">Pending Approvals</p>
                          <h4 className="mb-0">{stats.pendingApprovals}</h4>
                        </div>
                        <div className="avatar avatar-md bg-info-transparent rounded">
                          <i className="ti ti-clock-hour-4 fs-24 text-info" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-xl-3 col-md-6">
                  <div className="card bg-success-img">
                    <div className="card-body">
                      <div className="d-flex align-items-center justify-content-between">
                        <div>
                          <p className="mb-1">Approved This Month</p>
                          <h4 className="mb-0">{stats.approvedThisMonth}</h4>
                        </div>
                        <div className="avatar avatar-md bg-success-transparent rounded">
                          <i className="ti ti-circle-check fs-24 text-success" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Team Members on Leave Today */}
          <div className="card mb-3">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h5 className="mb-0">Team Members on Leave Today</h5>
              <span className="badge bg-primary-transparent">
                {(loading || employees.length === 0) ? 0 : stats.onLeaveToday} member{stats.onLeaveToday !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="card-body">
              {(loading || employees.length === 0) ? (
                <div className="row">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <TeamMemberCardSkeleton key={i} />
                  ))}
                </div>
              ) : stats.onLeaveToday > 0 ? (
                <div className="row">
                  {teamLeaves
                    .filter(leave => {
                      const today = new Date();
                      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                      const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
                      const startDate = new Date(leave.startDate);
                      const endDate = new Date(leave.endDate);
                      return leave.status === 'approved' && startDate <= endOfToday && endDate >= startOfToday;
                    })
                    .map((leave) => {
                      const employeeName = employeeNameById.get(leave.employeeId) || leave.employeeName || "Unknown";
                      return (
                        <div key={leave._id} className="col-xl-4 col-md-6 mb-3">
                          <div className="d-flex align-items-center p-3 border rounded">
                            <span className="avatar avatar-md me-3">
                              <ImageWithBasePath src="assets/img/users/user-32.jpg" className="rounded-circle" alt="img" />
                            </span>
                            <div className="flex-grow-1">
                              <h6 className="mb-1">{employeeName}</h6>
                              <p className="text-muted mb-0 small">
                                {leave.leaveTypeName || leaveTypeDisplayMap[leave.leaveType] || leave.leaveType} - {leave.duration} day{leave.duration > 1 ? 's' : ''}
                              </p>
                            </div>
                            <span className="badge bg-success">On Leave</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p className="text-muted mb-0">No team members on leave today</p>
              )}
            </div>
          </div>

          {/* Team Leave Requests Table */}
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
              <div className="d-flex">
                <h5 className="me-2">Team Leave Requests</h5>
                <span className="badge bg-primary-transparent me-2">
                  Total: {stats.totalTeamLeaves}
                </span>
                <span className="badge bg-warning-transparent">
                  Pending: {stats.pendingApprovals}
                </span>
              </div>
              <div className="d-flex my-xl-auto right-content align-items-center flex-wrap row-gap-3">
                <div className="me-3">
                  <CommonSelect
                    className="select"
                    options={statusOptions}
                    onChange={(option) => setFilters({ ...filters, status: option.value as LeaveStatus, page: 1 })}
                  />
                </div>
                <div className="me-3">
                  <CommonSelect
                    className="select"
                    options={leaveTypeOptions}
                    onChange={(option) => setFilters({ ...filters, leaveType: option.value as LeaveTypeCode, page: 1 })}
                  />
                </div>
                <div>
                  <DatePicker.RangePicker
                    onChange={(dates: any) => {
                      if (dates && dates[0] && dates[1]) {
                        setFilters({ ...filters, dateRange: dates, page: 1 });
                      }
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <Table
                  columns={columns}
                  dataSource={data}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />

      {/* Rejection Modal */}
      {rejectModal.show && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Reject Leave Request</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setRejectModal({ show: false, leaveId: null, reason: '' })}
                />
              </div>
              <div className="modal-body">
                <label className="form-label">Rejection Reason <span className="text-danger">*</span></label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={rejectModal.reason}
                  onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                  placeholder="Please provide a reason for rejection..."
                />
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={() => setRejectModal({ show: false, leaveId: null, reason: '' })}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleRejectConfirm}
                >
                  Reject Leave
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ManagerLeaveDashboard;
