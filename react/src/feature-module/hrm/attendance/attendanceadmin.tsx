import { ReloadOutlined } from "@ant-design/icons";
import { DatePicker, Input, Spin, TimePicker } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CollapseHeader from "../../../core/common/collapse-header/collapse-header";
import CommonSelect from "../../../core/common/commonSelect";
import Table from "../../../core/common/dataTable/index";
import PredefinedDateRanges from "../../../core/common/datePicker";
import Footer from "../../../core/common/footer";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import { toTableFormat, useAttendanceREST } from "../../../hooks/useAttendanceREST";
import { useAuth } from "../../../hooks/useAuth";
import { useAutoReloadActions } from "../../../hooks/useAutoReload";
import { all_routes } from "../../router/all_routes";

const AttendanceAdmin = () => {
  // Role-based access control
  const { role } = useAuth();
  // Show switch only if user has access to both attendance pages (hr and superadmin have access to both)
  const showPageSwitch = ['hr', 'superadmin'].includes(role);

  // API Hook
  const {
    attendance,
    stats,
    loading,
    error,
    pagination,
    fetchAttendance,
    fetchStats,
    deleteAttendance,
    bulkAction,
    updateAttendance
  } = useAttendanceREST();

  // Auto-reload hook for refetching after actions
  const { refetchAfterAction } = useAutoReloadActions({
    fetchFn: () => {
      fetchAttendance(filters);
      fetchStats();
    },
    debug: true,
  });

  // Filters state
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    status: '',
    search: '',
    startDate: '',
    endDate: '',
    sortBy: 'date',
    order: 'desc' as 'asc' | 'desc'
  });

  // UI state
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('');

  // Edit form state
  const [editFormData, setEditFormData] = useState<{
    _id: string;
    date: any;
    clockIn: any;
    clockOut: any;
    breakDuration: number;
    lateMinutes: number;
    hoursWorked: number;
    status: string;
  } | null>(null);

  // Fetch data on mount and when filters change
  useEffect(() => {
    fetchAttendance(filters);
  }, [filters]);

  // Fetch statistics on mount
  useEffect(() => {
    fetchStats();
  }, []);

  // Transform attendance data for table display
  const tableData = useMemo(() => {
    return attendance.map(toTableFormat);
  }, [attendance]);

  // Table columns
  const columns = [
    {
      title: "Employee",
      dataIndex: "Employee",
      render: (text: string, record: any) => (
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
              <Link to="#">{record.Employee}</Link>
            </h6>
            <span className="fs-12 fw-normal ">{record.Role}</span>
          </div>
        </div>
      ),
      sorter: true,
    },
    {
      title: "Status",
      dataIndex: "Status",
      render: (text: string) => (
        <span
          className={`badge ${text === "Present" || text === "Late"
            ? "badge-success-transparent"
            : text === "Absent"
              ? "badge-danger-transparent"
              : "badge-warning-transparent"
            } d-inline-flex align-items-center`}
        >
          <i className="ti ti-point-filled me-1" />
          {text}
        </span>
      ),
      sorter: true,
    },
    {
      title: "Check In",
      dataIndex: "CheckIn",
      sorter: true,
    },
    {
      title: "Check Out",
      dataIndex: "CheckOut",
      sorter: true,
    },
    {
      title: "Break",
      dataIndex: "Break",
      sorter: true,
    },
    {
      title: "Late",
      dataIndex: "Late",
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
    {
      title: "",
      dataIndex: "actions",
      render: (_: any, record: any) => (
        <div className="action-icon d-inline-flex">
          <Link
            to="#"
            className="me-2"
            data-bs-toggle="modal"
            data-inert={true}
            data-bs-target="#edit_attendance"
            onClick={() => handleEdit(record._original)}
          >
            <i className="ti ti-edit" />
          </Link>
        </div>
      ),
    },
  ];

  const statusChoose = [
    { value: "", label: "All" },
    { value: "present", label: "Present" },
    { value: "absent", label: "Absent" },
    { value: "late", label: "Late" },
    { value: "half-day", label: "Half Day" },
  ];

  // Filter handlers
  const handleStatusFilter = (status: string) => {
    setSelectedStatus(status);
    setFilters({ ...filters, status, page: 1 });
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilters({ ...filters, search: value, page: 1 });
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
    }
  };

  const handleSort = (sortBy: string, order: 'asc' | 'desc') => {
    setFilters({ ...filters, sortBy, order });
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
  };

  const handleRefresh = () => {
    refetchAfterAction();
  };

  const handleEdit = (attendance: any) => {
    setEditFormData({
      _id: attendance._id,
      date: attendance.date ? attendance.date : null,
      clockIn: attendance.clockIn?.time ? attendance.clockIn.time : null,
      clockOut: attendance.clockOut?.time ? attendance.clockOut.time : null,
      breakDuration: attendance.breakDuration || 0,
      lateMinutes: attendance.lateMinutes || 0,
      hoursWorked: attendance.hoursWorked || 0,
      status: attendance.status || 'present',
    });
  };

  const handleEditSubmit = async () => {
    if (!editFormData) return;

    const payload: any = {
      date: editFormData.date?.format ? editFormData.date.format('YYYY-MM-DD') : editFormData.date,
      status: editFormData.status,
      breakDuration: editFormData.breakDuration,
      lateMinutes: editFormData.lateMinutes,
    };

    if (editFormData.clockIn) {
      payload.clockIn = {
        time: editFormData.clockIn?.format ? editFormData.clockIn.format('HH:mm:ss') : editFormData.clockIn,
      };
    }

    if (editFormData.clockOut) {
      payload.clockOut = {
        time: editFormData.clockOut?.format ? editFormData.clockOut.format('HH:mm:ss') : editFormData.clockOut,
      };
    }

    const success = await updateAttendance(editFormData._id, payload);

    if (success) {
      setEditFormData(null);
      // Close modal using Bootstrap API
      const modalEl = document.getElementById('edit_attendance');
      if (modalEl) {
        const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
      }
      // Refresh data using auto-reload
      refetchAfterAction();
    }
  };

  const handleDelete = async (attendanceId: string) => {
    if (window.confirm('Are you sure you want to delete this attendance record?')) {
      await deleteAttendance(attendanceId);
      // Refresh data using auto-reload
      refetchAfterAction();
    }
  };

  const getModalContainer = () => {
    const modalElement = document.getElementById("modal-datepicker");
    return modalElement ? modalElement : document.body;
  };

  const getModalContainer2 = () => {
    const modalElement = document.getElementById("modal_datepicker");
    return modalElement ? modalElement : document.body;
  };

  return (
    <>
      {/* Page Wrapper */}
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Attendance Admin</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={all_routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">Employee</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Attendance Admin
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
              {showPageSwitch && (
                <div className="me-2 mb-2">
                  <div className="d-flex align-items-center border bg-white rounded p-1 me-2 icon-list">
                    <Link
                      to={all_routes.attendanceemployee}
                      className="btn btn-icon btn-sm  me-1"
                    >
                      <i className="ti ti-brand-days-counter" />
                    </Link>
                    <Link
                      to={all_routes.attendanceadmin}
                      className="btn btn-icon btn-sm active bg-primary text-white"
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
                  data-bs-target="#attendance_report"
                  data-bs-toggle="modal"
                  data-inert={true}
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
          <div className="card border-0">
            <div className="card-body">
              <div className="row align-items-center mb-4">
                <div className="col-md-5">
                  <div className="mb-3 mb-md-0">
                    <h4 className="mb-1">Attendance Details Today</h4>
                    <p>{stats ? `Total: ${stats.total} employees` : 'Loading...'}</p>
                  </div>
                </div>
                <div className="col-md-7">
                  <div className="d-flex align-items-center justify-content-md-end">
                    <h6>Total Absenties today</h6>
                    <div className="avatar-list-stacked avatar-group-sm ms-4">
                      <span className="avatar avatar-rounded">
                        <ImageWithBasePath
                          className="border border-white"
                          src="assets/img/profiles/avatar-02.jpg"
                          alt="img"
                        />
                      </span>
                      <span className="avatar avatar-rounded">
                        <ImageWithBasePath
                          className="border border-white"
                          src="assets/img/profiles/avatar-03.jpg"
                          alt="img"
                        />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Statistics Cards */}
              <div className="border rounded">
                <div className="row gx-0">
                  <div className="col-md col-sm-4 border-end">
                    <div className="p-3">
                      <span className="fw-medium mb-1 d-block">Present</span>
                      <div className="d-flex align-items-center justify-content-between">
                        <h5>{stats?.present || 0}</h5>
                        <span className="badge badge-success d-inline-flex align-items-center">
                          <i className="ti ti-arrow-wave-right-down me-1" />
                          {stats?.attendanceRate ? `${stats.attendanceRate}%` : '0%'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md col-sm-4 border-end">
                    <div className="p-3">
                      <span className="fw-medium mb-1 d-block">Late Login</span>
                      <div className="d-flex align-items-center justify-content-between">
                        <h5>{stats?.late || 0}</h5>
                        <span className="badge badge-danger d-inline-flex align-items-center">
                          <i className="ti ti-arrow-wave-right-down me-1" />
                          {stats?.lateRate ? `${stats.lateRate}%` : '0%'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md col-sm-4 border-end">
                    <div className="p-3">
                      <span className="fw-medium mb-1 d-block">Absent</span>
                      <div className="d-flex align-items-center justify-content-between">
                        <h5>{stats?.absent || 0}</h5>
                        <span className="badge badge-danger d-inline-flex align-items-center">
                          <i className="ti ti-arrow-wave-right-down me-1" />
                          -
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md col-sm-4">
                    <div className="p-3">
                      <span className="fw-medium mb-1 d-block">Half Day</span>
                      <div className="d-flex align-items-center justify-content-between">
                        <h5>{stats?.halfDay || 0}</h5>
                        <span className="badge badge-warning d-inline-flex align-items-center">
                          <i className="ti ti-minus me-1" />
                          -
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Attendance Table */}
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
              <h5>Admin Attendance</h5>
              <div className="d-flex my-xl-auto right-content align-items-center flex-wrap row-gap-3">
                {/* Refresh Button */}
                <button
                  className="btn btn-white me-3"
                  onClick={handleRefresh}
                  disabled={loading}
                >
                  <ReloadOutlined spin={loading} />
                </button>

                {/* Date Range Picker */}
                <div className="me-3">
                  <div className="input-icon-end position-relative">
                    <PredefinedDateRanges onChange={handleDateRangeChange} />
                    <span className="input-icon-addon">
                      <i className="ti ti-chevron-down" />
                    </span>
                  </div>
                </div>

                {/* Status Filter */}
                <div className="dropdown me-3">
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    {selectedStatus ? statusChoose.find(s => s.value === selectedStatus)?.label : 'Select Status'}
                  </Link>
                  <ul className="dropdown-menu dropdown-menu-end p-3">
                    {statusChoose.map((option) => (
                      <li key={option.value}>
                        <Link
                          to="#"
                          className="dropdown-item rounded-1"
                          onClick={() => handleStatusFilter(option.value)}
                        >
                          {option.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Search */}
                <div className="me-3">
                  <Input.Search
                    placeholder="Search notes..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    onSearch={handleSearch}
                    allowClear
                    style={{ width: 200 }}
                  />
                </div>

                {/* Sort */}
                <div className="dropdown">
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    Sort By : {filters.sortBy === 'date' ? 'Date' : filters.sortBy}
                  </Link>
                  <ul className="dropdown-menu dropdown-menu-end p-3">
                    <li>
                      <Link to="#" className="dropdown-item rounded-1" onClick={() => handleSort('date', 'desc')}>
                        Recently Added
                      </Link>
                    </li>
                    <li>
                      <Link to="#" className="dropdown-item rounded-1" onClick={() => handleSort('date', 'asc')}>
                        Date Ascending
                      </Link>
                    </li>
                    <li>
                      <Link to="#" className="dropdown-item rounded-1" onClick={() => handleSort('date', 'desc')}>
                        Date Desending
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center py-5">
                  <Spin size="large" tip="Loading attendance data..." />
                </div>
              ) : error ? (
                <div className="text-center py-5 text-danger">
                  {error}
                </div>
              ) : (
                <Table
                  dataSource={tableData}
                  columns={columns}
                  Selection={true}
                />
              )}
            </div>
          </div>
        </div>
        <Footer />
      </div>
      {/* /Page Wrapper */}

      {/* Edit Attendance Modal */}
      <div className="modal fade" id="edit_attendance">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Edit Attendance</h4>
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
                      <label className="form-label">Date</label>
                      <div className="input-icon input-icon-new position-relative w-100 me-2">
                        <DatePicker
                          className="form-control datetimepicker"
                          format={{
                            format: "DD-MM-YYYY",
                            type: "mask",
                          }}
                          getPopupContainer={getModalContainer}
                          placeholder="DD-MM-YYYY"
                          value={editFormData?.date}
                          onChange={(date) => editFormData && setEditFormData({ ...editFormData, date })}
                        />
                        <span className="input-icon-addon">
                          <i className="ti ti-calendar" />
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Check In</label>
                      <div className="input-icon input-icon-new position-relative w-100">
                        <TimePicker
                          getPopupContainer={getModalContainer2}
                          use12Hours
                          placeholder="Choose"
                          format="h:mm A"
                          className="form-control timepicker"
                          value={editFormData?.clockIn}
                          onChange={(time) => editFormData && setEditFormData({ ...editFormData, clockIn: time })}
                        />
                        <span className="input-icon-addon">
                          <i className="ti ti-clock-hour-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Check Out</label>
                      <div className="input-icon input-icon-new position-relative w-100">
                        <TimePicker
                          getPopupContainer={getModalContainer2}
                          use12Hours
                          placeholder="Choose"
                          format="h:mm A"
                          className="form-control timepicker"
                          value={editFormData?.clockOut}
                          onChange={(time) => editFormData && setEditFormData({ ...editFormData, clockOut: time })}
                        />
                        <span className="input-icon-addon">
                          <i className="ti ti-clock-hour-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Break (minutes)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={editFormData?.breakDuration || 0}
                        onChange={(e) => editFormData && setEditFormData({ ...editFormData, breakDuration: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Late (minutes)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={editFormData?.lateMinutes || 0}
                        onChange={(e) => editFormData && setEditFormData({ ...editFormData, lateMinutes: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Status</label>
                      <CommonSelect
                        className="select"
                        options={statusChoose}
                        defaultValue={editFormData ? statusChoose.find(s => s.value === editFormData.status) || statusChoose[0] : statusChoose[0]}
                        onChange={(option: any) => editFormData && setEditFormData({ ...editFormData, status: option.value })}
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
                  onClick={handleEditSubmit}
                  disabled={!editFormData}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Edit Attendance */}

      {/* Attendance Report Modal */}
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
                  <div className="row align-items-center">
                    <div className="col-lg-4">
                      <div className="d-flex align-items-center mb-3">
                        <span className="avatar avatar-sm avatar-rounded flex-shrink-0 me-2">
                          <ImageWithBasePath
                            src="assets/img/profiles/avatar-02.jpg"
                            alt="Img"
                          />
                        </span>
                        <div>
                          <h6 className="fw-medium">Anthony Lewis</h6>
                          <span>UI/UX Team</span>
                        </div>
                      </div>
                    </div>
                    <div className="col-lg-8">
                      <div className="row">
                        <div className="col-sm-3">
                          <div className="mb-3 text-sm-end">
                            <span>Date</span>
                            <p className="text-gray-9 fw-medium">15 Apr 2025</p>
                          </div>
                        </div>
                        <div className="col-sm-3">
                          <div className="mb-3 text-sm-end">
                            <span>Punch in at</span>
                            <p className="text-gray-9 fw-medium">09:00 AM</p>
                          </div>
                        </div>
                        <div className="col-sm-3">
                          <div className="mb-3 text-sm-end">
                            <span>Punch out at</span>
                            <p className="text-gray-9 fw-medium">06:45 PM</p>
                          </div>
                        </div>
                        <div className="col-sm-3">
                          <div className="mb-3 text-sm-end">
                            <span>Status</span>
                            <p className="text-gray-9 fw-medium">Present</p>
                          </div>
                        </div>
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
                        <h3>{stats?.totalHoursWorked ? `${parseFloat(stats.totalHoursWorked).toFixed(1)}h` : '0h'}</h3>
                      </div>
                    </div>
                    <div className="col-xl-3">
                      <div className="mb-4">
                        <p className="d-flex align-items-center mb-1">
                          <i className="ti ti-point-filled text-success me-1" />
                          Avg Hours
                        </p>
                        <h3>{stats?.averageHoursPerDay || '0.00'}h</h3>
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

export default AttendanceAdmin;
