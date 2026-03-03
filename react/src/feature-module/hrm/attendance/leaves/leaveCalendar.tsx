import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CollapseHeader from "../../../../core/common/collapse-header/collapse-header";
import CommonSelect from "../../../../core/common/commonSelect";
import Footer from "../../../../core/common/footer";
import ImageWithBasePath from "../../../../core/common/imageWithBasePath";
import { useAuth } from "../../../../hooks/useAuth";
import { useAutoReloadActions } from "../../../../hooks/useAutoReload";
import { useEmployeesREST } from "../../../../hooks/useEmployeesREST";
import { useLeaveREST, type Leave } from "../../../../hooks/useLeaveREST";
import { useLeaveTypesREST } from "../../../../hooks/useLeaveTypesREST";
import { resolveDesignation } from "../../../../utils/designationUtils";
import { all_routes } from "../../../router/all_routes";

// Extend dayjs with plugins
dayjs.extend(isBetween);

interface LeaveEvent {
  leave: Leave;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
}

const LeaveCalendar = () => {
  const { leaves, loading, fetchLeaves, fetchMyLeaves, leaveTypeDisplayMap } = useLeaveREST();
  const { role, userId } = useAuth();
  const { activeOptions, fetchActiveLeaveTypes, loading: leaveTypesLoading } = useLeaveTypesREST();
  const { employees, fetchEmployees, fetchActiveEmployeesList, loading: employeesLoading } = useEmployeesREST({ autoFetch: false });

  // Auto-reload hook for refetching data
  const { refetchAfterAction } = useAutoReloadActions({
    fetchFn: () => {
      // Only admin/HR/superadmin can use the admin leaves endpoint; others use their own list to avoid 403s
      if (role === 'hr' || role === 'admin' || role === 'superadmin') {
        fetchLeaves({ limit: 1000 });
      } else {
        fetchMyLeaves({ limit: 1000 });
      }
    },
    debug: false, // Calendar doesn't need verbose logging
  });

  // Calendar state
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Fetch leaves on mount
  useEffect(() => {
    // Only admin/HR/superadmin can call the admin leaves endpoint; others fetch their own
    if (role === 'hr' || role === 'admin' || role === 'superadmin') {
      fetchLeaves({ limit: 1000 });
    } else {
      fetchMyLeaves({ limit: 1000 });
    }
    fetchActiveLeaveTypes();
    // Fetch employees for avatar and role data
    if (role === 'hr' || role === 'admin' || role === 'superadmin') {
      fetchEmployees({ status: 'Active' });
    } else {
      fetchActiveEmployeesList();
    }
  }, [role, fetchLeaves, fetchMyLeaves, fetchActiveLeaveTypes, fetchEmployees, fetchActiveEmployeesList]);

  // Employee data map for avatar, role, etc.
  const employeeDataMap = useMemo(() => {
    const map = new Map<string, { avatar?: string; avatarUrl?: string; profileImage?: string; role?: string; designation?: string; firstName?: string; lastName?: string }>();
    employees.forEach(emp => {
      map.set(emp.employeeId, {
        avatar: emp.avatar,
        avatarUrl: emp.avatarUrl || emp.profileImage,
        profileImage: emp.profileImage,
        role: emp.role,
        designation: resolveDesignation(emp.designation),
        firstName: emp.firstName,
        lastName: emp.lastName,
      });
    });
    return map;
  }, [employees]);

  // Leave type colors
  const getLeaveTypeColor = (leaveType: string): { bg: string; border: string; text: string } => {
    const colors: Record<string, { bg: string; border: string; text: string }> = {
      sick: { bg: '#e3f2fd', border: '#2196f3', text: '#1976d2' },          // Blue
      casual: { bg: '#f3e5f5', border: '#9c27b0', text: '#7b1fa2' },      // Purple
      earned: { bg: '#e8f5e9', border: '#4caf50', text: '#388e3c' },      // Green
      maternity: { bg: '#fce4ec', border: '#e91e63', text: '#c2185b' },  // Pink
      paternity: { bg: '#e3f2fd', border: '#2196f3', text: '#1565c0' },   // Light Blue
      bereavement: { bg: '#fff3e0', border: '#ff9800', text: '#e65100' }, // Orange
      compensatory: { bg: '#fff8e1', border: '#ffc107', text: '#f57c00' }, // Amber
      unpaid: { bg: '#ffebee', border: '#f44336', text: '#c62828' },     // Red
      special: { bg: '#f3e5f5', border: '#673ab7', text: '#512da8' },     // Indigo
    };
    return colors[leaveType] || { bg: '#f5f5f5', border: '#999', text: '#333' };
  };

  // Get status styling
  const getStatusStyle = (status: string) => {
    if (status === 'approved') return '✓';
    if (status === 'rejected') return '✗';
    if (status === 'pending') return '?';
    if (status === 'cancelled') return '○';
    if (status === 'on-hold') return '!';
    return '?';
  };

  // Get calendar days for the current month view
  const getCalendarDays = () => {
    const startOfMonth = currentDate.startOf('month');
    const endOfMonth = currentDate.endOf('month');

    // Get days from previous month to fill first week
    const startDayOfWeek = startOfMonth.day(); // 0 = Sunday
    const calendarStart = startOfMonth.subtract(startDayOfWeek, 'day');

    // Get all days to display
    const days: Date[] = [];
    let current = calendarStart;

    // Add 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
      days.push(current.toDate());
      current = current.add(1, 'day');
    }

    return days;
  };

  // Get leaves for a specific date
  const getLeavesForDate = (date: Date): LeaveEvent[] => {
    const dateStart = dayjs(date).startOf('day');
    const dateEnd = dayjs(date).endOf('day');

    return leaves
      .filter(leave => {
        // Filter by type if selected
        if (filterType !== 'all' && leave.leaveType !== filterType) return false;
        // Filter by status if selected
        if (filterStatus !== 'all' && leave.status !== filterStatus) return false;

        // Check if leave overlaps with this date
        const leaveStart = dayjs(leave.startDate);
        const leaveEnd = dayjs(leave.endDate);

        return dateStart.isSame(leaveEnd, 'day') ||
          dateStart.isBefore(leaveEnd) && dateEnd.isAfter(leaveStart) ||
          dateStart.isAfter(leaveStart) && dateStart.isBefore(leaveEnd);
      })
      .map(leave => {
        const colors = getLeaveTypeColor(leave.leaveType);
        return {
          leave,
          backgroundColor: colors.bg,
          borderColor: colors.border,
          textColor: colors.text,
        };
      });
  };

  // Get leave summary for a date
  const getDateSummary = (date: Date): { count: number; types: string[] } => {
    const events = getLeavesForDate(date);
    const uniqueTypes = [...new Set(events.map(e => e.leave.leaveType))];

    return {
      count: events.length,
      types: uniqueTypes.map(t => leaveTypeDisplayMap[t] || t)
    };
  };

  // Navigate between months
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      if (direction === 'prev') {
        return prev.subtract(1, 'month');
      } else {
        return prev.add(1, 'month');
      }
    });
  };

  const goToToday = () => {
    setCurrentDate(dayjs());
    setSelectedDate(dayjs());
  };

  const calendarDays = getCalendarDays();
  const currentMonthStart = currentDate.startOf('month');

  // Dynamic leave type filter options built from active leave types in database
  const leaveTypeOptions = useMemo(() => [
    { value: 'all', label: 'All Types' },
    ...activeOptions.map(option => ({ value: option.value.toLowerCase(), label: String(option.label) })),
  ], [activeOptions]);

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

  // Determine if any data is still loading
  const isLoading = loading || employeesLoading || leaveTypesLoading;

  // Skeleton Loader Components
  const CalendarSkeleton = () => (
    <div className="calendar-skeleton">
      <div className="calendar-header">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="weekday">
            <div className="skeleton-text skeleton-weekday"></div>
          </div>
        ))}
      </div>
      <div className="calendar-grid">
        {Array.from({ length: 42 }).map((_, i) => (
          <div key={i} className="calendar-day-skeleton">
            <div className="skeleton-text skeleton-date"></div>
            <div className="skeleton-event"></div>
            <div className="skeleton-dots">
              <div className="skeleton-dot"></div>
              <div className="skeleton-dot"></div>
              <div className="skeleton-dot"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const WeekViewSkeleton = () => (
    <div className="week-view">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="week-day-column">
          <div className="week-day-header">
            <div className="skeleton-text skeleton-day-name"></div>
            <div className="skeleton-text skeleton-day-number"></div>
          </div>
          <div className="week-day-content">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="skeleton-week-event">
                <div className="skeleton-text skeleton-event-type"></div>
                <div className="skeleton-text skeleton-event-detail"></div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const SelectedDateSkeleton = () => (
    <div className="row">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="col-md-6 mb-3">
          <div className="card border">
            <div className="card-body">
              <div className="d-flex align-items-center mb-2">
                <div className="skeleton-avatar me-2"></div>
                <div className="flex-1">
                  <div className="skeleton-text skeleton-title mb-2"></div>
                  <div className="skeleton-text skeleton-subtitle"></div>
                </div>
              </div>
              <div className="skeleton-text skeleton-description"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Leave Calendar</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={all_routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">HRM</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Leave Calendar
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
              <div className="me-3">
                {leaveTypesLoading ? (
                  <div className="skeleton-select"></div>
                ) : (
                  <CommonSelect
                    className="select"
                    options={leaveTypeOptions}
                    onChange={(option) => setFilterType(option.value)}
                  />
                )}
              </div>
              <div className="me-3">
                <CommonSelect
                  className="select"
                  options={statusOptions}
                  onChange={(option) => setFilterStatus(option.value)}
                />
              </div>
              <button
                className="btn btn-white me-2"
                onClick={() => setViewMode(viewMode === 'month' ? 'week' : 'month')}
                disabled={isLoading}
              >
                <i className={`ti ${viewMode === 'month' ? 'ti-calendar' : 'ti-list'} me-1`} />
                {viewMode === 'month' ? 'Month View' : 'Week View'}
              </button>
              <div className="head-icons ms-2">
                <CollapseHeader />
              </div>
            </div>
          </div>

          {/* Calendar Header */}
          <div className="card mb-3 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                  <button
                    className="btn btn-white me-2 shadow-sm"
                    onClick={() => navigateMonth('prev')}
                    disabled={isLoading}
                  >
                    <i className="ti ti-chevron-left" />
                  </button>
                  <h4 className="mb-0 me-3 text-primary fw-bold">
                    {currentDate.format('MMMM YYYY')}
                  </h4>
                  <button
                    className="btn btn-white me-2 shadow-sm"
                    onClick={() => navigateMonth('next')}
                    disabled={isLoading}
                  >
                    <i className="ti ti-chevron-right" />
                  </button>
                  <button
                    className="btn btn-primary shadow-sm"
                    onClick={goToToday}
                    disabled={isLoading}
                  >
                    <i className="ti ti-calendar-event me-1" />
                    Today
                  </button>
                </div>
                {isLoading && (
                  <div className="d-flex align-items-center">
                    <span className="spinner-border spinner-border-sm text-primary me-2" role="status"></span>
                    <small className="text-muted">Loading calendar data...</small>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Month Calendar */}
          {viewMode === 'month' ? (
            <div className="card shadow-sm">
              <div className="card-body p-0">
                {isLoading ? (
                  <CalendarSkeleton />
                ) : (
                  <>
                    {/* Weekday Headers */}
                    <div className="calendar-header">
                      <div className="weekday">Sun</div>
                      <div className="weekday">Mon</div>
                      <div className="weekday">Tue</div>
                      <div className="weekday">Wed</div>
                      <div className="weekday">Thu</div>
                      <div className="weekday">Fri</div>
                      <div className="weekday">Sat</div>
                    </div>

                    {/* Calendar Grid */}
                    <div className="calendar-grid">
                      {calendarDays.map((date, index) => {
                        const dateObj = dayjs(date);
                        const isCurrentMonth = dateObj.isSame(currentDate, 'month');
                        const isToday = dateObj.isSame(dayjs(), 'day');
                        const isSelected = dateObj.isSame(selectedDate, 'day');
                        const isWeekend = dateObj.day() === 0 || dateObj.day() === 6;

                        const events = getLeavesForDate(date);
                        const summary = getDateSummary(date);

                        return (
                          <div
                            key={index}
                            className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isWeekend ? 'weekend' : ''} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                            onClick={() => setSelectedDate(dateObj)}
                          >
                            <div className="date-number">
                              {dateObj.format('D')}
                              {isToday && <span className="today-badge">Today</span>}
                            </div>

                            {/* Events/Summary */}
                            {summary.count > 0 && (
                              <div className="day-summary">
                                <div className="summary-badge">
                                  <i className="ti ti-user me-1" style={{ fontSize: '9px' }}></i>
                                  {summary.count} leave{summary.count > 1 ? 's' : ''}
                                </div>
                              </div>
                            )}

                            {/* Event dots */}
                            <div className="event-dots">
                              {events.slice(0, 4).map((event, idx) => (
                                <div
                                  key={idx}
                                  className="event-dot"
                                  title={`${event.leave.leaveTypeName || leaveTypeDisplayMap[event.leave.leaveType] || event.leave.leaveType} - ${event.leave.status}`}
                                  style={{
                                    backgroundColor: event.backgroundColor,
                                    borderColor: event.borderColor,
                                  }}
                                />
                              ))}
                              {events.length > 4 && (
                                <div className="event-dot-more" title={`+${events.length - 4} more`}>
                                  +{events.length - 4}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Legend */}
                    <div className="calendar-footer p-3 border-top bg-light">
                      <div className="d-flex align-items-center justify-content-between flex-wrap">
                        <h6 className="mb-0 me-3 text-muted">
                          <i className="ti ti-palette me-1"></i>
                          Leave Types
                        </h6>
                        <div className="d-flex flex-wrap gap-3">
                          {Object.keys(leaveTypeDisplayMap).map((type) => {
                            const colors = getLeaveTypeColor(type);
                            return (
                              <div key={type} className="legend-item">
                                <div
                                  className="legend-dot"
                                  style={{ backgroundColor: colors.bg, borderColor: colors.border }}
                                />
                                <span className="legend-text">{leaveTypeDisplayMap[type] || type}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            /* Week View */
            <div className="card shadow-sm">
              <div className="card-body p-0">
                {isLoading ? (
                  <WeekViewSkeleton />
                ) : (
                  <div className="week-view">
                    {Array.from({ length: 7 }, (_, i) => {
                      const date = currentDate.startOf('week').add(i, 'day');
                      const isToday = date.isSame(dayjs(), 'day');
                      const events = getLeavesForDate(date.toDate());

                      return (
                        <div
                          key={i}
                          className={`week-day-column ${isToday ? 'today' : ''}`}
                          onClick={() => setSelectedDate(date)}
                        >
                          <div className="week-day-header">
                            <div className="day-name">{date.format('ddd')}</div>
                            <div className="day-number">{date.format('D')}</div>
                            {isToday && <div className="today-indicator">Today</div>}
                          </div>
                          <div className="week-day-content">
                            {events.length === 0 ? (
                              <div className="text-center text-muted py-3">
                                <i className="ti ti-calendar-off" style={{ fontSize: '24px' }}></i>
                                <p className="mb-0 small">No leaves</p>
                              </div>
                            ) : (
                              events.map((event) => {
                                const empData = employeeDataMap.get(event.leave.employeeId || '');
                                const avatarUrl = empData?.avatarUrl || empData?.profileImage || empData?.avatar;
                                const roleOrDesignation = empData?.role || empData?.designation || 'Employee';
                                const employeeName = empData ? `${empData.firstName} ${empData.lastName}`.trim() : (event.leave.employeeName || 'Employee');

                                return (
                                  <div
                                    key={event.leave._id}
                                    className="week-event"
                                    style={{
                                      backgroundColor: event.backgroundColor,
                                      borderLeft: `3px solid ${event.borderColor}`,
                                      color: event.textColor,
                                    }}
                                  >
                                    <div className="event-type">
                                      <i className="ti ti-briefcase me-1" style={{ fontSize: '10px' }}></i>
                                      {event.leave.leaveTypeName?.substring(0, 15) || leaveTypeDisplayMap[event.leave.leaveType]?.substring(0, 15) || event.leave.leaveType}
                                    </div>
                                    <div className="event-details">
                                      <div className="event-employee">
                                        {employeeName}
                                        <span className="event-role"> ({roleOrDesignation})</span>
                                      </div>
                                      <div className="event-status">
                                        {getStatusStyle(event.leave.status)}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Selected Date Details */}
          {selectedDate && (
            <div className="card mt-3 shadow-sm">
              <div className="card-header bg-light">
                <h5 className="mb-0">
                  <i className="ti ti-calendar-event me-2 text-primary"></i>
                  {selectedDate.format('dddd, MMMM D, YYYY')}
                  {selectedDate.isSame(dayjs(), 'day') && <span className="badge bg-primary ms-2">Today</span>}
                </h5>
              </div>
              <div className="card-body">
                {isLoading ? (
                  <SelectedDateSkeleton />
                ) : (
                  (() => {
                    const events = getLeavesForDate(selectedDate.toDate());

                    if (events.length === 0) {
                      return (
                        <div className="text-center py-5">
                          <div className="mb-3">
                            <i className="ti ti-calendar-off" style={{ fontSize: '64px', color: '#dee2e6' }}></i>
                          </div>
                          <h6 className="text-muted mb-1">No Leaves Scheduled</h6>
                          <p className="text-muted small mb-0">
                            There are no leave requests for this date
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="row">
                        {events.map((event) => {
                          const empData = employeeDataMap.get(event.leave.employeeId || '');
                          const avatarUrl = empData?.avatarUrl || empData?.profileImage || empData?.avatar;
                          const roleOrDesignation = empData?.role || empData?.designation || 'Employee';
                          const employeeName = empData ? `${empData.firstName} ${empData.lastName}`.trim() : (event.leave.employeeName || 'Employee');
                          const empId = event.leave.employeeId || '-';

                          return (
                            <div key={event.leave._id} className="col-md-6 mb-3">
                              <div
                                className="card border leave-detail-card"
                                style={{
                                  borderLeft: `4px solid ${event.borderColor}`,
                                  backgroundColor: event.backgroundColor,
                                }}
                              >
                                <div className="card-body">
                                  <div className="d-flex justify-content-between align-items-start mb-3">
                                    <div className="d-flex align-items-center">
                                      <span className="avatar avatar-md me-3 shadow-sm">
                                        {avatarUrl ? (
                                          <img
                                            src={avatarUrl}
                                            className="rounded-circle"
                                            alt="img"
                                            onError={(e) => { (e.target as HTMLImageElement).src = 'assets/img/users/user-32.jpg'; }}
                                          />
                                        ) : (
                                          <ImageWithBasePath src="assets/img/users/user-32.jpg" className="rounded-circle" alt="img" />
                                        )}
                                      </span>
                                      <div>
                                        <h6 className="mb-1 fw-bold" style={{ color: event.textColor }}>
                                          {event.leave.leaveTypeName || leaveTypeDisplayMap[event.leave.leaveType] || event.leave.leaveType}
                                        </h6>
                                        <div>
                                          <strong className="text-dark">{employeeName}</strong>
                                          <span className="badge bg-white text-dark ms-2 shadow-sm">{roleOrDesignation}</span>
                                        </div>
                                        <small className="text-muted">
                                          <i className="ti ti-id me-1"></i>
                                          {empId}
                                        </small>
                                      </div>
                                    </div>
                                    <span className={`badge shadow-sm ${event.leave.status === 'approved' ? 'bg-success' :
                                        event.leave.status === 'rejected' ? 'bg-danger' :
                                          event.leave.status === 'pending' ? 'bg-warning' :
                                            'bg-secondary'
                                      }`}>
                                      {event.leave.status.charAt(0).toUpperCase() + event.leave.status.slice(1)}
                                    </span>
                                  </div>
                                  <div className="mb-2 p-2 bg-white rounded">
                                    <small className="text-muted d-flex align-items-center">
                                      <i className="ti ti-calendar me-2 text-primary" />
                                      <strong className="me-1">Duration:</strong>
                                      {dayjs(event.leave.startDate).format('DD MMM YYYY')} - {dayjs(event.leave.endDate).format('DD MMM YYYY')}
                                      <span className="badge bg-primary ms-2">{event.leave.duration} day{event.leave.duration > 1 ? 's' : ''}</span>
                                    </small>
                                  </div>
                                  {event.leave.reason && (
                                    <div className="p-2 bg-white rounded border">
                                      <small className="text-muted d-block mb-1">
                                        <i className="ti ti-message-circle me-1"></i>
                                        <strong>Reason:</strong>
                                      </small>
                                      <small className="text-dark">
                                        <i>"{event.leave.reason}"</i>
                                      </small>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />

      <style>{`
        /* Skeleton Loader Styles */
        .skeleton-text {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: skeleton-loading 1.5s ease-in-out infinite;
          border-radius: 4px;
        }

        @keyframes skeleton-loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .skeleton-select {
          width: 180px;
          height: 38px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: skeleton-loading 1.5s ease-in-out infinite;
          border-radius: 6px;
        }

        .skeleton-weekday {
          height: 16px;
          width: 40px;
          margin: 0 auto;
        }

        .calendar-day-skeleton {
          min-height: 100px;
          padding: 8px;
          border-right: 1px solid #dee2e6;
          border-bottom: 1px solid #dee2e6;
        }

        .skeleton-date {
          width: 24px;
          height: 20px;
          margin-bottom: 8px;
        }

        .skeleton-event {
          height: 18px;
          margin-bottom: 4px;
          border-radius: 3px;
        }

        .skeleton-dots {
          display: flex;
          gap: 4px;
          margin-top: 8px;
        }

        .skeleton-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: skeleton-loading 1.5s ease-in-out infinite;
        }

        .skeleton-day-name {
          width: 40px;
          height: 14px;
          margin: 0 auto 4px;
        }

        .skeleton-day-number {
          width: 30px;
          height: 20px;
          margin: 0 auto;
        }

        .skeleton-week-event {
          padding: 8px;
          margin-bottom: 8px;
          border-radius: 4px;
          background-color: #f8f9fa;
        }

        .skeleton-event-type {
          height: 12px;
          width: 80%;
          margin-bottom: 6px;
        }

        .skeleton-event-detail {
          height: 10px;
          width: 60%;
        }

        .skeleton-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: skeleton-loading 1.5s ease-in-out infinite;
        }

        .skeleton-title {
          height: 16px;
          width: 150px;
        }

        .skeleton-subtitle {
          height: 12px;
          width: 100px;
        }

        .skeleton-description {
          height: 14px;
          width: 100%;
          margin-top: 8px;
        }

        /* Enhanced Calendar Styles */
        .calendar-header {
          display: flex;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 8px 8px 0 0;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
        }

        .weekday {
          flex: 1;
          padding: 14px;
          text-align: center;
          font-weight: 600;
          color: #ffffff;
          border-right: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 13px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .weekday:last-child {
          border-right: none;
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          border: 1px solid #dee2e6;
          border-top: none;
          background: #ffffff;
        }

        .calendar-day {
          min-height: 110px;
          padding: 10px;
          border-right: 1px solid #e9ecef;
          border-bottom: 1px solid #e9ecef;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          background: #ffffff;
        }

        .calendar-day:hover {
          background-color: #f8f9fa;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          z-index: 1;
        }

        .calendar-day.other-month {
          background-color: #fafafa;
          color: #adb5bd;
        }

        .calendar-day.weekend {
          background-color: #f8f9fa;
        }

        .calendar-day.selected {
          background-color: #e3f2fd !important;
          border: 2px solid #2196f3 !important;
          box-shadow: 0 4px 16px rgba(33, 150, 243, 0.2) !important;
        }

        .calendar-day.today {
          background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%) !important;
          border: 2px solid #ffc107 !important;
        }

        .date-number {
          font-weight: 700;
          margin-bottom: 6px;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .today-badge {
          font-size: 8px;
          padding: 2px 6px;
          border-radius: 10px;
          background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%);
          color: white;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 2px 4px rgba(255, 152, 0, 0.3);
        }

        .day-summary {
          margin-top: 6px;
        }

        .summary-badge {
          font-size: 10px;
          padding: 3px 8px;
          border-radius: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-align: center;
          margin-bottom: 6px;
          font-weight: 600;
          box-shadow: 0 2px 6px rgba(102, 126, 234, 0.3);
          display: inline-block;
        }

        .event-type-chip {
          font-size: 9px;
          padding: 2px 6px;
          border-radius: 4px;
          background-color: #495057;
          color: white;
          margin-bottom: 3px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          display: inline-block;
        }

        .event-dots {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 6px;
        }

        .event-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 2px solid;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          transition: transform 0.2s;
        }

        .event-dot:hover {
          transform: scale(1.3);
        }

        .event-dot-more {
          font-size: 8px;
          padding: 2px 4px;
          border-radius: 8px;
          background-color: #6c757d;
          color: white;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .calendar-footer {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .legend-item {
          display: flex;
          align-items: center;
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 4px;
          background: white;
          transition: all 0.2s;
        }

        .legend-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .legend-dot {
          width: 14px;
          height: 14px;
          border-radius: 3px;
          margin-right: 8px;
          border: 2px solid;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .legend-text {
          font-weight: 500;
          color: #495057;
        }

        .week-view {
          display: flex;
          min-height: 500px;
          border: 1px solid #dee2e6;
          background: #ffffff;
        }

        .week-day-column {
          flex: 1;
          border-right: 1px solid #dee2e6;
          min-height: 400px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .week-day-column:hover {
          background-color: #f8f9fa;
        }

        .week-day-column:last-child {
          border-right: none;
        }

        .week-day-column.today {
          background: linear-gradient(180deg, #fff8e1 0%, #ffffff 100%);
          border-left: 3px solid #ffc107;
          border-right: 3px solid #ffc107;
        }

        .week-day-header {
          padding: 14px;
          text-align: center;
          border-bottom: 2px solid #dee2e6;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        }

        .day-name {
          font-weight: 600;
          color: #495057;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .day-number {
          font-size: 20px;
          color: #212529;
          font-weight: 700;
        }

        .today-indicator {
          font-size: 9px;
          padding: 2px 8px;
          border-radius: 10px;
          background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%);
          color: white;
          font-weight: 600;
          margin-top: 4px;
          display: inline-block;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .week-day-content {
          padding: 10px;
          overflow-y: auto;
          max-height: 500px;
        }

        .week-event {
          padding: 10px;
          border-radius: 6px;
          margin-bottom: 8px;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 6px rgba(0,0,0,0.08);
        }

        .week-event:hover {
          transform: translateX(4px) scale(1.02);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .event-type {
          font-weight: 700;
          margin-bottom: 6px;
          text-transform: capitalize;
          font-size: 12px;
        }

        .event-details {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .event-employee {
          font-size: 10px;
          opacity: 0.9;
          font-weight: 500;
        }

        .event-role {
          font-size: 9px;
          opacity: 0.7;
          font-style: italic;
        }

        .event-status {
          font-size: 16px;
          font-weight: bold;
        }

        .leave-detail-card {
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .leave-detail-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }

        /* Smooth transitions */
        .card {
          transition: all 0.3s ease;
        }

        .btn {
          transition: all 0.2s ease;
        }

        .btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        /* Responsive improvements */
        @media (max-width: 768px) {
          .calendar-day {
            min-height: 80px;
            padding: 6px;
          }

          .date-number {
            font-size: 14px;
          }

          .summary-badge, .event-type-chip {
            font-size: 8px;
            padding: 2px 4px;
          }

          .event-dot {
            width: 6px;
            height: 6px;
          }

          .weekday {
            font-size: 11px;
            padding: 10px 6px;
          }
        }
      `}</style>
    </>
  );
};

export default LeaveCalendar;
