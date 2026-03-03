import { ReloadOutlined } from "@ant-design/icons";
import { message, Spin } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CollapseHeader from "../../../core/common/collapse-header/collapse-header";
import Table from "../../../core/common/dataTable/index";
import PredefinedDateRanges from "../../../core/common/datePicker";
import Footer from "../../../core/common/footer";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import { formatAttendanceDate, formatAttendanceTime, toTableFormat, useAttendanceREST } from "../../../hooks/useAttendanceREST";
import { useAuth } from "../../../hooks/useAuth";
import { useAutoReloadActions } from "../../../hooks/useAutoReload";
import { all_routes } from "../../router/all_routes";

const AttendanceEmployee = () => {
  // Role-based access control
  const { role } = useAuth();
  // Show switch only if user has access to both attendance pages (hr and superadmin have access to both)
  const canAccessAdminAttendance = ['hr', 'superadmin'].includes(role);

  // API Hook
  const {
    myAttendance,
    loading,
    error,
    pagination,
    needsEmployeeSync,
    fetchMyAttendance,
    clockIn,
    clockOut,
    syncEmployeeRecord
  } = useAttendanceREST();

  // Auto-reload hook for refetching after actions
  const { refetchAfterAction } = useAutoReloadActions({
    fetchFn: () => fetchMyAttendance(filters),
    debug: true,
  });

  // State
  const [filters, setFilters] = useState({
    page: 1,
    limit: 31,
    status: '',
    startDate: '',
    endDate: ''
  });

  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Fetch my attendance on mount and when filters change
  useEffect(() => {
    fetchMyAttendance(filters);
  }, [filters]);

  // Transform attendance data for table display
  const tableData = useMemo(() => {
    return myAttendance.map(toTableFormat);
  }, [myAttendance]);

  // Get today's attendance to check if clocked in
  const todayAttendance = useMemo(() => {
    // Use local date for comparison to handle timezone differences
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    return myAttendance.find((att) => {
      if (!att.date) return false;
      // Check if date string starts with today's date
      if (typeof att.date === 'string' && att.date.startsWith(todayStr)) return true;
      // Also check Date object conversion (compare local dates)
      const attDate = new Date(att.date);
      const attDateStr = `${attDate.getFullYear()}-${String(attDate.getMonth() + 1).padStart(2, '0')}-${String(attDate.getDate()).padStart(2, '0')}`;
      return attDateStr === todayStr;
    });
  }, [myAttendance]);

  const isClockedIn = todayAttendance?.clockIn?.time && !todayAttendance?.clockOut?.time;
  const canClockIn = !isClockedIn;
  const canClockOut = isClockedIn;

  // Calculate production hours for today
  const todayHours = todayAttendance?.hoursWorked || 0;

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const greeting = getGreeting();

  // Clock in handler
  const handleClockIn = async () => {
    const success = await clockIn({
      time: new Date().toISOString(),
      location: {
        type: 'office' as const
      },
      notes: ''
    });
    if (success) {
      message.success('Successfully clocked in!');
    }
    // Always refresh to show updated data (even on failure, to sync UI state)
    refetchAfterAction();
  };

  // Clock out handler
  const handleClockOut = async () => {
    if (!todayAttendance?._id) {
      message.error('No active attendance record found. Please clock in first.');
      return;
    }
    const success = await clockOut(todayAttendance._id, {
      time: new Date().toISOString(),
      location: {
        type: 'office' as const
      },
      notes: ''
    });
    if (success) {
      message.success('Successfully clocked out!');
      // Immediately refresh to show updated data
      refetchAfterAction();
    }
  };

  // Format time display
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Format date display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Filter handlers
  const handleStatusFilter = (status: string) => {
    setSelectedStatus(status);
    setFilters({ ...filters, status, page: 1 });
  };

  const handleDateRangeChange = (dateRange: any) => {
    setSelectedDateRange(dateRange);
    if (dateRange && dateRange.startDate && dateRange.endDate) {
      setFilters({
        ...filters,
        startDate: dateRange.startDate.format('YYYY-MM-DD'),
        endDate: dateRange.endDate.format('YYYY-MM-DD'),
        page: 1
      });
    } else {
      // Clear date filters
      setFilters({
        ...filters,
        startDate: '',
        endDate: '',
        page: 1
      });
    }
  };

  const handleRefresh = () => {
    refetchAfterAction();
  };

  // Table columns
  const columns = [
    {
      title: "Date",
      dataIndex: "Date",
      render: (text: string, record: any) => (
        <span>{formatAttendanceDate(record._original?.date)}</span>
      ),
      sorter: true,
    },
    {
      title: "Check In",
      dataIndex: "CheckIn",
      render: (text: string, record: any) => (
        <span>{record.CheckIn}</span>
      ),
      sorter: true,
    },
    {
      title: "Status",
      dataIndex: "Status",
      render: (text: string, record: any) => (
        <span
          className={`badge ${record.Status === "Present"
            ? "badge-success-transparent"
            : record.Status === "Late"
              ? "badge-warning-transparent"
              : record.Status === "Half Day"
                ? "badge-info-transparent"
                : "badge-danger-transparent"
            } d-inline-flex align-items-center`}
        >
          <i className="ti ti-point-filled me-1" />
          {record.Status}
        </span>
      ),
      sorter: true,
    },
    {
      title: "Check Out",
      dataIndex: "CheckOut",
      render: (text: string, record: any) => (
        <span>{record.CheckOut}</span>
      ),
      sorter: true,
    },
    {
      title: "Break",
      dataIndex: "Break",
      render: (text: string, record: any) => (
        <span>{record.Break}</span>
      ),
      sorter: true,
    },
    {
      title: "Late",
      dataIndex: "Late",
      render: (text: string, record: any) => (
        <span>{record.Late}</span>
      ),
      sorter: true,
    },
    {
      title: "Overtime",
      dataIndex: "Overtime",
      render: (text: string, record: any) => {
        const original = record._original;
        const overtime = original?.overtimeHours || 0;
        return <span>{overtime > 0 ? `${overtime.toFixed(2)} Hrs` : '-'}</span>;
      },
      sorter: true,
    },
    {
      title: "Production Hours",
      dataIndex: "ProductionHours",
      render: (text: string, record: any) => (
        <span
          className={`badge d-inline-flex align-items-center badge-sm ${parseFloat(record.ProductionHours) < 8
            ? "badge-danger"
            : parseFloat(record.ProductionHours) >= 8 &&
              parseFloat(record.ProductionHours) <= 9
              ? "badge-success"
              : "badge-info"
            }`}
        >
          <i className="ti ti-clock-hour-11 me-1"></i>
          {record.ProductionHours}
        </span>
      ),
      sorter: true,
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
              <h2 className="mb-1">Employee Attendance</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={all_routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">Employee</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Employee Attendance
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
              {canAccessAdminAttendance && (
                <div className="me-2 mb-2">
                  <div className="d-flex align-items-center border bg-white rounded p-1 me-2 icon-list">
                    <Link
                      to={all_routes.attendanceemployee}
                      className="btn btn-icon btn-sm active bg-primary text-white me-1"
                    >
                      <i className="ti ti-brand-days-counter" />
                    </Link>
                    <Link
                      to={all_routes.attendanceadmin}
                      className="btn btn-icon btn-sm"
                    >
                      <i className="ti ti-calendar-event" />
                    </Link>
                  </div>
                </div>
              )}
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
                  className="btn btn-primary d-flex align-items-center"
                  data-bs-toggle="modal"
                  data-inert={true}
                  data-bs-target="#attendance_report"
                >
                  <i className="ti ti-file-analytics me-2" />
                  Report
                </Link>
              </div>
              <div className="ms-2 head-icons">
                <CollapseHeader />
              </div>
            </div>
          </div>
          {/* /Breadcrumb */}
          <div className="row">
            <div className="col-xl-3 col-lg-4 d-flex">
              <div className="card flex-fill">
                <div className="card-body">
                  <div className="mb-3 text-center">
                    <h6 className="fw-medium text-gray-5 mb-2">
                      {greeting}, Employee
                    </h6>
                    <h4>{formatTime(currentTime)}, {formatDate(currentTime)}</h4>
                  </div>
                  <div
                    className="attendance-circle-progress mx-auto mb-3"
                    data-value={Math.min((todayHours / 8) * 100, 100)}
                  >
                    <span className="progress-left">
                      <span className="progress-bar border-success" />
                    </span>
                    <span className="progress-right">
                      <span className="progress-bar border-success" />
                    </span>
                    <div className="avatar avatar-xxl avatar-rounded">
                      <ImageWithBasePath
                        src="assets/img/profiles/avatar-27.jpg"
                        alt="Img"
                      />
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="badge badge-md badge-primary mb-3">
                      Production : {todayHours.toFixed(2)} hrs
                    </div>
                    <h6 className="fw-medium d-flex align-items-center justify-content-center mb-3">
                      <i className="ti ti-fingerprint text-primary me-1" />
                      {todayAttendance?.clockIn?.time
                        ? `Punch In at ${formatAttendanceTime(todayAttendance.clockIn.time)}`
                        : 'Not punched in yet'}
                    </h6>
                    {canClockIn ? (
                      <button
                        className="btn btn-primary w-100"
                        onClick={handleClockIn}
                        disabled={loading}
                      >
                        {loading ? <Spin size="small" /> : 'Punch In'}
                      </button>
                    ) : (
                      <button
                        className="btn btn-dark w-100"
                        onClick={handleClockOut}
                        disabled={loading}
                      >
                        {loading ? <Spin size="small" /> : 'Punch Out'}
                      </button>
                    )}
                    {needsEmployeeSync && (
                      <div className="alert alert-warning mt-2 mb-0" role="alert">
                        <i className="ti ti-alert-triangle me-2" />
                        <strong>Profile Setup Required</strong>
                        <p className="mb-2 mt-1">Please sync your employee profile to use attendance features.</p>
                        <button
                          className="btn btn-warning btn-sm w-100"
                          onClick={async () => {
                            const success = await syncEmployeeRecord();
                            if (success) {
                              await fetchMyAttendance(filters);
                            }
                          }}
                        >
                          <i className="ti ti-refresh me-1" />
                          Sync Profile
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-9 col-lg-8 d-flex">
              <div className="row flex-fill">
                <div className="col-xl-3 col-md-6">
                  <div className="card">
                    <div className="card-body">
                      <div className="border-bottom mb-2 pb-2">
                        <span className="avatar avatar-sm bg-primary mb-2">
                          <i className="ti ti-clock-stop" />
                        </span>
                        <h2 className="mb-2">
                          {todayHours.toFixed(2)} / <span className="fs-20 text-gray-5"> 9</span>
                        </h2>
                        <p className="fw-medium text-truncate">
                          Total Hours Today
                        </p>
                      </div>
                      <div>
                        <p className="d-flex align-items-center fs-13">
                          <span className="avatar avatar-xs rounded-circle bg-success flex-shrink-0 me-2">
                            <i className="ti ti-clock fs-12" />
                          </span>
                          <span>{todayHours >= 8 ? 'Full day achieved' : 'In progress'}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-xl-3 col-md-6">
                  <div className="card">
                    <div className="card-body">
                      <div className="border-bottom mb-2 pb-2">
                        <span className="avatar avatar-sm bg-dark mb-2">
                          <i className="ti ti-clock-up" />
                        </span>
                        <h2 className="mb-2">
                          {myAttendance.reduce((sum, att) => sum + (att.hoursWorked || 0), 0).toFixed(2)} / <span className="fs-20 text-gray-5"> 40</span>
                        </h2>
                        <p className="fw-medium text-truncate">
                          Total Hours Week
                        </p>
                      </div>
                      <div>
                        <p className="d-flex align-items-center fs-13">
                          <span className="avatar avatar-xs rounded-circle bg-success flex-shrink-0 me-2">
                            <i className="ti ti-calendar fs-12" />
                          </span>
                          <span>Current week</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-xl-3 col-md-6">
                  <div className="card">
                    <div className="card-body">
                      <div className="border-bottom mb-2 pb-2">
                        <span className="avatar avatar-sm bg-info mb-2">
                          <i className="ti ti-calendar-up" />
                        </span>
                        <h2 className="mb-2">
                          {myAttendance.reduce((sum, att) => sum + (att.hoursWorked || 0), 0).toFixed(2)} / <span className="fs-20 text-gray-5"> 160</span>
                        </h2>
                        <p className="fw-medium text-truncate">
                          Total Hours Month
                        </p>
                      </div>
                      <div>
                        <p className="d-flex align-items-center fs-13 text-truncate">
                          <span className="avatar avatar-xs rounded-circle bg-info flex-shrink-0 me-2">
                            <i className="ti ti-calendar fs-12" />
                          </span>
                          <span>Current month</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-xl-3 col-md-6">
                  <div className="card">
                    <div className="card-body">
                      <div className="border-bottom mb-2 pb-2">
                        <span className="avatar avatar-sm bg-pink mb-2">
                          <i className="ti ti-calendar-star" />
                        </span>
                        <h2 className="mb-2">
                          {myAttendance.reduce((sum, att) => sum + (att.overtimeHours || 0), 0).toFixed(2)} hrs
                        </h2>
                        <p className="fw-medium text-truncate">
                          Overtime this Period
                        </p>
                      </div>
                      <div>
                        <p className="d-flex align-items-center fs-13 text-truncate">
                          <span className="avatar avatar-xs rounded-circle bg-warning flex-shrink-0 me-2">
                            <i className="ti ti-time-duration fs-12" />
                          </span>
                          <span>{myAttendance.filter(att => att.overtimeHours && att.overtimeHours > 0).length} days with overtime</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-12">
                  <div className="card">
                    <div className="card-body">
                      <div className="row">
                        <div className="col-xl-3">
                          <div className="mb-3">
                            <p className="d-flex align-items-center mb-1">
                              <i className="ti ti-point-filled text-dark-transparent me-1" />
                              Total Working hours
                            </p>
                            <h3>{todayAttendance?.hoursWorked ? `${Math.floor(todayAttendance.hoursWorked)}h ${Math.round((todayAttendance.hoursWorked % 1) * 60)}m` : '0h 0m'}</h3>
                          </div>
                        </div>
                        <div className="col-xl-3">
                          <div className="mb-3">
                            <p className="d-flex align-items-center mb-1">
                              <i className="ti ti-point-filled text-success me-1" />
                              Productive Hours
                            </p>
                            <h3>{todayAttendance?.regularHours ? `${Math.floor(todayAttendance.regularHours)}h ${Math.round((todayAttendance.regularHours % 1) * 60)}m` : (todayAttendance?.hoursWorked ? `${Math.floor(todayAttendance.hoursWorked)}h ${Math.round((todayAttendance.hoursWorked % 1) * 60)}m` : '0h 0m')}</h3>
                          </div>
                        </div>
                        <div className="col-xl-3">
                          <div className="mb-3">
                            <p className="d-flex align-items-center mb-1">
                              <i className="ti ti-point-filled text-warning me-1" />
                              Break hours
                            </p>
                            <h3>{todayAttendance?.breakDuration ? `${Math.floor(todayAttendance.breakDuration / 60)}h ${todayAttendance.breakDuration % 60}m` : '0h 0m'}</h3>
                          </div>
                        </div>
                        <div className="col-xl-3">
                          <div className="mb-3">
                            <p className="d-flex align-items-center mb-1">
                              <i className="ti ti-point-filled text-info me-1" />
                              Overtime
                            </p>
                            <h3>{todayAttendance?.overtimeHours ? `${Math.floor(todayAttendance.overtimeHours)}h ${Math.round((todayAttendance.overtimeHours % 1) * 60)}m` : '0h 0m'}</h3>
                          </div>
                        </div>
                      </div>
                      <div className="row">
                        <div className="col-md-12">
                          <div
                            className="progress bg-transparent-dark mb-3"
                            style={{ height: 24 }}
                          >
                            <div
                              className="progress-bar bg-white rounded"
                              role="progressbar"
                              style={{ width: "18%" }}
                            />
                            <div
                              className="progress-bar bg-success rounded me-2"
                              role="progressbar"
                              style={{ width: "18%" }}
                            />
                            <div
                              className="progress-bar bg-warning rounded me-2"
                              role="progressbar"
                              style={{ width: "5%" }}
                            />
                            <div
                              className="progress-bar bg-success rounded me-2"
                              role="progressbar"
                              style={{ width: "28%" }}
                            />
                            <div
                              className="progress-bar bg-warning rounded me-2"
                              role="progressbar"
                              style={{ width: "17%" }}
                            />
                            <div
                              className="progress-bar bg-success rounded me-2"
                              role="progressbar"
                              style={{ width: "22%" }}
                            />
                            <div
                              className="progress-bar bg-warning rounded me-2"
                              role="progressbar"
                              style={{ width: "5%" }}
                            />
                            <div
                              className="progress-bar bg-info rounded me-2"
                              role="progressbar"
                              style={{ width: "3%" }}
                            />
                            <div
                              className="progress-bar bg-info rounded"
                              role="progressbar"
                              style={{ width: "2%" }}
                            />
                            <div
                              className="progress-bar bg-white rounded"
                              role="progressbar"
                              style={{ width: "18%" }}
                            />
                          </div>
                        </div>
                        <div className="co-md-12">
                          <div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2">
                            <span className="fs-10">06:00</span>
                            <span className="fs-10">07:00</span>
                            <span className="fs-10">08:00</span>
                            <span className="fs-10">09:00</span>
                            <span className="fs-10">10:00</span>
                            <span className="fs-10">11:00</span>
                            <span className="fs-10">12:00</span>
                            <span className="fs-10">01:00</span>
                            <span className="fs-10">02:00</span>
                            <span className="fs-10">03:00</span>
                            <span className="fs-10">04:00</span>
                            <span className="fs-10">05:00</span>
                            <span className="fs-10">06:00</span>
                            <span className="fs-10">07:00</span>
                            <span className="fs-10">08:00</span>
                            <span className="fs-10">09:00</span>
                            <span className="fs-10">10:00</span>
                            <span className="fs-10">11:00</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
              <h5>Employee Attendance</h5>
              <div className="d-flex my-xl-auto right-content align-items-center flex-wrap row-gap-3">
                <div className="me-3">
                  <button
                    className="btn btn-white d-inline-flex align-items-center"
                    onClick={handleRefresh}
                    disabled={loading}
                  >
                    <ReloadOutlined spin={loading} className="me-1" />
                    Refresh
                  </button>
                </div>
                <div className="me-3">
                  <div className="input-icon-end position-relative">
                    <PredefinedDateRanges onChange={handleDateRangeChange} />
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
                    {selectedStatus || 'Select Status'}
                  </Link>
                  <ul className="dropdown-menu dropdown-menu-end p-3">
                    <li>
                      <Link
                        to="#"
                        className={`dropdown-item rounded-1 ${selectedStatus === '' ? 'active' : ''}`}
                        onClick={() => handleStatusFilter('')}
                      >
                        All Status
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="#"
                        className={`dropdown-item rounded-1 ${selectedStatus === 'present' ? 'active' : ''}`}
                        onClick={() => handleStatusFilter('present')}
                      >
                        Present
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="#"
                        className={`dropdown-item rounded-1 ${selectedStatus === 'absent' ? 'active' : ''}`}
                        onClick={() => handleStatusFilter('absent')}
                      >
                        Absent
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="#"
                        className={`dropdown-item rounded-1 ${selectedStatus === 'late' ? 'active' : ''}`}
                        onClick={() => handleStatusFilter('late')}
                      >
                        Late
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="#"
                        className={`dropdown-item rounded-1 ${selectedStatus === 'half-day' ? 'active' : ''}`}
                        onClick={() => handleStatusFilter('half-day')}
                      >
                        Half Day
                      </Link>
                    </li>
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
                <div className="text-center p-5">
                  <Spin size="large" tip="Loading attendance data..." />
                </div>
              ) : error ? (
                <div className="text-center p-5">
                  <p className="text-danger">{error}</p>
                </div>
              ) : (
                <Table dataSource={tableData} columns={columns} Selection={false} />
              )}
            </div>
          </div>
        </div>
        <Footer />
      </div>
      {/* /Page Wrapper */}
      {/* Attendance Report */}
      <div className="modal fade" id="attendance_report">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Attendance</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="modal-body">
              <div className="card shadow-none bg-transparent-light">
                <div className="card-body pb-1">
                  <div className="row">
                    <div className="col-sm-3">
                      <div className="mb-3">
                        <span>Date</span>
                        <p className="text-gray-9 fw-medium">
                          {todayAttendance ? formatAttendanceDate(todayAttendance.date) : formatDate(currentTime)}
                        </p>
                      </div>
                    </div>
                    <div className="col-sm-3">
                      <div className="mb-3">
                        <span>Punch in at</span>
                        <p className="text-gray-9 fw-medium">
                          {todayAttendance?.clockIn?.time
                            ? formatAttendanceTime(todayAttendance.clockIn.time)
                            : '-'}
                        </p>
                      </div>
                    </div>
                    <div className="col-sm-3">
                      <div className="mb-3">
                        <span>Punch out at</span>
                        <p className="text-gray-9 fw-medium">
                          {todayAttendance?.clockOut?.time
                            ? formatAttendanceTime(todayAttendance.clockOut.time)
                            : '-'}
                        </p>
                      </div>
                    </div>
                    <div className="col-sm-3">
                      <div className="mb-3">
                        <span>Status</span>
                        <p className="text-gray-9 fw-medium">
                          {todayAttendance?.status
                            ? todayAttendance.status.charAt(0).toUpperCase() + todayAttendance.status.slice(1).replace('-', ' ')
                            : 'Not Available'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="card shadow-none border mb-0">
                <div className="card-body">
                  <div className="row">
                    <div className="col-xl-3">
                      <div className="mb-4">
                        <p className="d-flex align-items-center mb-1">
                          <i className="ti ti-point-filled text-dark-transparent me-1" />
                          Total Working hours
                        </p>
                        <h3>{todayAttendance?.hoursWorked ? `${todayAttendance.hoursWorked.toFixed(2)} hrs` : '0.00 hrs'}</h3>
                      </div>
                    </div>
                    <div className="col-xl-3">
                      <div className="mb-4">
                        <p className="d-flex align-items-center mb-1">
                          <i className="ti ti-point-filled text-success me-1" />
                          Productive Hours
                        </p>
                        <h3>{todayAttendance?.regularHours ? `${todayAttendance.regularHours.toFixed(2)} hrs` : (todayAttendance?.hoursWorked ? `${todayAttendance.hoursWorked.toFixed(2)} hrs` : '0.00 hrs')}</h3>
                      </div>
                    </div>
                    <div className="col-xl-3">
                      <div className="mb-4">
                        <p className="d-flex align-items-center mb-1">
                          <i className="ti ti-point-filled text-warning me-1" />
                          Break hours
                        </p>
                        <h3>{todayAttendance?.breakDuration ? `${todayAttendance.breakDuration} min` : '0 min'}</h3>
                      </div>
                    </div>
                    <div className="col-xl-3">
                      <div className="mb-4">
                        <p className="d-flex align-items-center mb-1">
                          <i className="ti ti-point-filled text-info me-1" />
                          Overtime
                        </p>
                        <h3>{todayAttendance?.overtimeHours ? `${todayAttendance.overtimeHours.toFixed(2)} hrs` : '0.00 hrs'}</h3>
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-8 mx-auto">
                      <div
                        className="progress bg-transparent-dark mb-3"
                        style={{ height: 24 }}
                      >
                        <div
                          className="progress-bar bg-success rounded me-2"
                          role="progressbar"
                          style={{ width: "18%" }}
                        />
                        <div
                          className="progress-bar bg-warning rounded me-2"
                          role="progressbar"
                          style={{ width: "5%" }}
                        />
                        <div
                          className="progress-bar bg-success rounded me-2"
                          role="progressbar"
                          style={{ width: "28%" }}
                        />
                        <div
                          className="progress-bar bg-warning rounded me-2"
                          role="progressbar"
                          style={{ width: "17%" }}
                        />
                        <div
                          className="progress-bar bg-success rounded me-2"
                          role="progressbar"
                          style={{ width: "22%" }}
                        />
                        <div
                          className="progress-bar bg-warning rounded me-2"
                          role="progressbar"
                          style={{ width: "5%" }}
                        />
                        <div
                          className="progress-bar bg-info rounded me-2"
                          role="progressbar"
                          style={{ width: "3%" }}
                        />
                        <div
                          className="progress-bar bg-info rounded"
                          role="progressbar"
                          style={{ width: "2%" }}
                        />
                      </div>
                    </div>
                    <div className="co-md-12">
                      <div className="d-flex align-items-center justify-content-between">
                        <span className="fs-10">06:00</span>
                        <span className="fs-10">07:00</span>
                        <span className="fs-10">08:00</span>
                        <span className="fs-10">09:00</span>
                        <span className="fs-10">10:00</span>
                        <span className="fs-10">11:00</span>
                        <span className="fs-10">12:00</span>
                        <span className="fs-10">01:00</span>
                        <span className="fs-10">02:00</span>
                        <span className="fs-10">03:00</span>
                        <span className="fs-10">04:00</span>
                        <span className="fs-10">05:00</span>
                        <span className="fs-10">06:00</span>
                        <span className="fs-10">07:00</span>
                        <span className="fs-10">08:00</span>
                        <span className="fs-10">09:00</span>
                        <span className="fs-10">10:00</span>
                        <span className="fs-10">11:00</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* /Attendance Report */}
    </>
  );
};

export default AttendanceEmployee;
