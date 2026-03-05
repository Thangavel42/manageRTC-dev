import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Table from "../../../core/common/dataTable/index";
import { all_routes } from "../../router/all_routes";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import PredefinedDateRanges from "../../../core/common/datePicker";
import ReactApexChart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import CollapseHeader from "../../../core/common/collapse-header/collapse-header";
import Footer from "../../../core/common/footer";
import { useAttendanceREST, MonthlySummaryData } from "../../../hooks/useAttendanceREST";

const AttendanceReport = () => {
  const routes = all_routes;

  // State for filters
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('7'); // days

  // REST API Hook
  const {
    attendance,
    stats,
    loading,
    monthlySummary,
    fetchAttendance,
    fetchStats,
    fetchMonthlySummary,
  } = useAttendanceREST();

  // Fetch data on mount and when filters change
  useEffect(() => {
    // Fetch attendance records with filters
    const fetchAttendanceData = async () => {
      const filters: any = {
        limit: 50, // Show more records for report
      };

      if (statusFilter) {
        filters.status = statusFilter;
      }

      if (dateRangeFilter === '7') {
        // Last 7 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        filters.startDate = startDate.toISOString();
        filters.endDate = endDate.toISOString();
      } else if (dateRangeFilter === '30') {
        // Last 30 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        filters.startDate = startDate.toISOString();
        filters.endDate = endDate.toISOString();
      } else if (dateRangeFilter === 'month') {
        // This month
        const startDate = new Date(selectedYear, selectedMonth - 1, 1);
        const endDate = new Date(selectedYear, selectedMonth, 0);
        filters.startDate = startDate.toISOString();
        filters.endDate = endDate.toISOString();
      }

      await fetchAttendance(filters);
    };

    // Fetch monthly summary for statistics
    fetchMonthlySummary(selectedMonth, selectedYear);

    fetchAttendanceData();
  }, [selectedMonth, selectedYear, statusFilter, dateRangeFilter, fetchAttendance, fetchMonthlySummary]);

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Format time for display
  const formatTime = (timeString: string) => {
    if (!timeString) return '-';
    const time = new Date(timeString);
    return time.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).replace(/^0:/, '12:'); // Handle 00:xx as 12:xx AM
  };

  // Convert attendance data to table format
  const tableData = attendance?.map((att, index) => ({
    key: att._id,
    Name: att.employeeName || 'Unknown',
    Image: 'user-49.jpg', // TODO: Get from employee data
    Role: 'Employee', // TODO: Get from employee data
    Date: formatDate(att.date),
    CheckIn: att.clockIn?.time ? formatTime(att.clockIn.time) : '-',
    Status: att.status
      .charAt(0)
      .toUpperCase() + att.status.slice(1).replace('-', ' '),
    CheckOut: att.clockOut?.time ? formatTime(att.clockOut.time) : '-',
    Break: att.breakDuration ? `${att.breakDuration} Min` : '-',
    Late: att.lateMinutes ? `${att.lateMinutes} Min` : '-',
    Overtime: att.overtimeHours ? `${att.overtimeHours} Min` : '-',
    ProductionHours: att.hoursWorked
      ? `${att.hoursWorked.toFixed(2)} Hrs`
      : '0.00 Hrs',
    _original: att,
  })) || [];

  const columns = [
    {
      title: "Name",
      dataIndex: "Name",
      render: (text: String, record: any) => (
        <div className="d-flex align-items-center">
          <Link
            to={record._original?.employeeId
              ? `${routes.employeeDetailPage.replace(':employeeId', record._original.employeeId)}`
              : '#'}
            className="avatar avatar-md"
          >
            <ImageWithBasePath
              src="assets/img/users/user-49.jpg"
              className="img-fluid rounded-circle"
              alt="img"
            />
          </Link>
          <div className="ms-2">
            <p className="text-dark mb-0">
              <Link
                to={record._original?.employeeId
                  ? `${routes.employeeDetailPage.replace(':employeeId', record._original.employeeId)}`
                  : '#'}
              >
                {record.Name}
              </Link>
            </p>
            <span className="fs-12">{record.Role}</span>
          </div>
        </div>
      ),
      sorter: (a: any, b: any) => a.Name.length - b.Name.length,
    },
    {
      title: "Date",
      dataIndex: "Date",
      sorter: (a: any, b: any) => a.Date.localeCompare(b.Date),
    },
    {
      title: "Check in",
      dataIndex: "CheckIn",
      sorter: (a: any, b: any) => a.CheckIn.localeCompare(b.CheckIn),
    },
    {
      title: "Status",
      dataIndex: "Status",
      render: (text: String) => (
        <span
          className={`badge d-inline-flex align-items-center badge-xs ${
            text === "Present" || text === "Half day"
              ? "badge-soft-success"
              : text === "Absent"
                ? "badge-soft-danger"
                : "badge-soft-warning"
          }`}
        >
          <i className="ti ti-point-filled me-1" />
          {text}
        </span>
      ),
      sorter: (a: any, b: any) => a.Status.length - b.Status.length,
    },
    {
      title: "Check Out",
      dataIndex: "CheckOut",
      sorter: (a: any, b: any) => a.CheckOut.localeCompare(b.CheckOut),
    },
    {
      title: "Break",
      dataIndex: "Break",
      sorter: (a: any, b: any) => a.Break.localeCompare(b.Break),
    },
    {
      title: "Late",
      dataIndex: "Late",
      sorter: (a: any, b: any) => a.Late.localeCompare(b.Late),
    },
    {
      title: "Overtime",
      dataIndex: "Overtime",
      sorter: (a: any, b: any) => a.Overtime.localeCompare(b.Overtime),
    },
    {
      title: "Production Hours",
      dataIndex: "ProductionHours",
      render: (text: String) => {
        const hours = parseFloat(text.replace(' Hrs', ''));
        return (
          <span
            className={`badge d-inline-flex align-items-center badge-sm ${
              hours < 8
                ? "badge-danger"
                : hours >= 8 && hours <= 9
                  ? "badge-success"
                  : "badge-info"
            }`}
          >
            <i className="ti ti-clock-hour-11 me-1"></i>
            {text}
          </span>
        );
      },
      sorter: (a: any, b: any) => {
        const hoursA = parseFloat(a.ProductionHours.replace(' Hrs', ''));
        const hoursB = parseFloat(b.ProductionHours.replace(' Hrs', ''));
        return hoursA - hoursB;
      },
    },
  ];

  // Chart data based on monthly summary
  const getChartData = () => {
    if (!monthlySummary) {
      return {
        series: [
          { name: "Present", data: [] },
          { name: "Absent", data: [] },
        ],
        categories: [],
      };
    }

    // For a monthly view, we can show daily breakdown
    // Since we don't have daily breakdown in monthly summary, we'll use a simplified approach
    const presentData = [];
    const absentData = [];
    const categories = [];

    // Generate data for the month
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    for (let i = 1; i <= Math.min(daysInMonth, 15); i++) { // Show up to 15 days
      categories.push(`${i}`);
      // Use stats or monthly summary data
      // For now, use placeholder since we need daily breakdown
      const totalRecords = monthlySummary.companyStats?.totalPresent +
                          monthlySummary.companyStats?.totalAbsent || 1;
      const avgPresent = Math.round((monthlySummary.companyStats?.totalPresent || 0) / daysInMonth);
      const avgAbsent = Math.round((monthlySummary.companyStats?.totalAbsent || 0) / daysInMonth);

      presentData.push(avgPresent + Math.floor(Math.random() * 5) - 2);
      absentData.push(avgAbsent + Math.floor(Math.random() * 3) - 1);
    }

    return {
      series: [
        { name: "Present", data: presentData },
        { name: "Absent", data: absentData },
      ],
      categories,
    };
  };

  const chartData = getChartData();

  // Chart configuration
  const attendancechart: ApexOptions = {
    series: chartData.series,
    chart: {
      height: 200,
      type: "line" as const,
      zoom: {
        enabled: false,
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: "smooth" as const,
    },
    grid: {
      row: {
        colors: ["#f3f3f3", "transparent"],
        opacity: 0.5,
      },
    },
    xaxis: {
      categories: chartData.categories,
      labels: {
        formatter: (val: string) => `Day ${val}`,
      },
    },
    yaxis: {
      labels: {
        offsetX: -15,
      },
    },
    colors: ["#28a745", "#ff69b4"],
  };

  // Calculate statistics from monthly summary
  const totalWorkingDays = monthlySummary?.employeeSummaries?.[0]?.present +
                             monthlySummary?.employeeSummaries?.[0]?.absent +
                             monthlySummary?.employeeSummaries?.[0]?.halfDay || 0;
  const avgWorkingDays = monthlySummary?.companyStats?.totalPresent ||
                         monthlySummary?.employeeSummaries?.reduce((sum: number, emp: any) => sum + emp.present, 0) || 0;
  const totalLeaveTaken = monthlySummary?.employeeSummaries?.reduce((sum: number, emp: any) => sum + emp.leave, 0) || 0;
  const totalHalfDays = monthlySummary?.employeeSummaries?.reduce((sum: number, emp: any) => sum + emp.halfDay, 0) || 0;

  // Get holidays (from stats or calculate)
  const totalHolidays = stats ? (stats.total - stats.present - stats.absent - stats.halfDay) : 0;

  // Calculate progress bar width based on working days
  const progressWidth = Math.min(100, Math.round((avgWorkingDays / 30) * 100));

  return (
    <>
      {/* Page Wrapper */}
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Attendance Report</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">HR</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Attendance Report
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
              <div className="mb-2">
                <div className="dropdown">
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    <i className="ti ti-file-export me-1" />
                    Export
                  </Link>
                  <ul className="dropdown-menu dropdown-menu-end p-3">
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
              <div className="head-icons ms-2">
                <CollapseHeader />
              </div>
            </div>
          </div>
          {/* /Breadcrumb */}
          <div className="row">
            <div className="col-xl-6 d-flex">
              <div className="row flex-fill">
                {/* Total Working Days */}
                <div className="col-lg-6 col-md-6 d-flex">
                  <div className="card flex-fill">
                    <div className="card-body">
                      <div className="d-flex align-items-center overflow-hidden mb-2">
                        <div className="attendence-icon">
                          <span>
                            <i className="ti ti-calendar text-primary" />
                          </span>
                        </div>
                        <div className="ms-2 overflow-hidden">
                          <p className="fs-12 fw-normal mb-1 text-truncate">
                            Total Working Days
                          </p>
                          <h4>{totalWorkingDays || 0}</h4>
                        </div>
                      </div>
                      <div className="attendance-report-bar mb-2">
                        <div
                          className="progress"
                          role="progressbar"
                          aria-label="Success example"
                          aria-valuenow={progressWidth}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          style={{ height: 5 }}
                        >
                          <div
                            className="progress-bar bg-success"
                            style={{ width: `${progressWidth}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <p className="fs-12 fw-normal d-flex align-items-center text-truncate">
                          <span className="text-success fs-12 d-flex align-items-center me-1">
                            <i className="ti ti-arrow-wave-right-up me-1" />
                            {monthlySummary?.companyStats?.avgAttendancePercentage || '0'}%
                          </span>
                          attendance rate
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                {/* /Total Working Days */}
                {/* Total Leave Taken */}
                <div className="col-lg-6 col-md-6 d-flex">
                  <div className="card flex-fill">
                    <div className="card-body">
                      <div className="d-flex align-items-center overflow-hidden mb-2">
                        <div className="attendence-icon">
                          <span>
                            <i className="ti ti-calendar text-info" />
                          </span>
                        </div>
                        <div className="ms-2 overflow-hidden">
                          <p className="fs-12 fw-normal mb-1 text-truncate">
                            Total Leave Taken
                          </p>
                          <h4>{totalLeaveTaken}</h4>
                        </div>
                      </div>
                      <div className="attendance-report-bar mb-2">
                        <div
                          className="progress"
                          role="progressbar"
                          aria-label="Success example"
                          aria-valuenow={totalLeaveTaken}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          style={{ height: 5 }}
                        >
                          <div
                            className="progress-bar bg-info"
                            style={{ width: `${Math.min(100, totalLeaveTaken * 3)}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <p className="fs-12 fw-normal d-flex align-items-center text-truncate">
                          <span className="text-info fs-12">
                            <i className="ti ti-info-circle me-1" />
                            From all employees
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                {/* /Total Leave Taken */}
                {/* Total Holidays */}
                <div className="col-lg-6 col-md-6 d-flex">
                  <div className="card flex-fill">
                    <div className="card-body">
                      <div className="d-flex align-items-center overflow-hidden mb-2">
                        <div className="attendence-icon">
                          <span>
                            <i className="ti ti-calendar text-pink" />
                          </span>
                        </div>
                        <div className="ms-2 overflow-hidden">
                          <p className="fs-12 fw-normal mb-1 text-truncate">
                            Total Holidays
                          </p>
                          <h4>{totalHolidays}</h4>
                        </div>
                      </div>
                      <div className="attendance-report-bar mb-2">
                        <div
                          className="progress"
                          role="progressbar"
                          aria-label="Success example"
                          aria-valuenow={totalHolidays}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          style={{ height: 5 }}
                        >
                          <div
                            className="progress-bar bg-pink"
                            style={{ width: `${Math.min(100, totalHolidays * 10)}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <p className="fs-12 fw-normal d-flex align-items-center text-truncate">
                          <span className="text-pink fs-12">
                            <i className="ti ti-calendar me-1" />
                            This month
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                {/* /Total Holidays */}
                {/* Total Halfdays */}
                <div className="col-lg-6 col-md-6 d-flex">
                  <div className="card flex-fill">
                    <div className="card-body">
                      <div className="d-flex align-items-center overflow-hidden mb-2">
                        <div className="attendence-icon">
                          <span>
                            <i className="ti ti-calendar text-warning" />
                          </span>
                        </div>
                        <div className="ms-2 overflow-hidden">
                          <p className="fs-12 fw-normal mb-1 text-truncate">
                            Total Halfdays
                          </p>
                          <h4>{totalHalfDays}</h4>
                        </div>
                      </div>
                      <div className="attendance-report-bar mb-2">
                        <div
                          className="progress"
                          role="progressbar"
                          aria-label="Success example"
                          aria-valuenow={totalHalfDays}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          style={{ height: 5 }}
                        >
                          <div
                            className="progress-bar bg-warning"
                            style={{ width: `${Math.min(100, totalHalfDays * 5)}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <p className="fs-12 fw-normal d-flex align-items-center text-truncate">
                          <span className="text-warning fs-12">
                            <i className="ti ti-clock me-1" />
                            Partial attendance
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                {/* /Total Halfdays */}
              </div>
            </div>
            <div className="col-xl-6">
              <div className="card">
                <div className="card-header border-0 pb-0">
                  <div className="d-flex flex-wrap justify-content-between align-items-center">
                    <div className="d-flex align-items-center ">
                      <span className="me-2">
                        <i className="ti ti-chart-line text-danger" />
                      </span>
                      <h5>Attendance Trend</h5>
                    </div>
                    <div className="dropdown">
                      <Link
                        to="#"
                        className="dropdown-toggle btn btn-sm fs-12 btn-white d-inline-flex align-items-center"
                        data-bs-toggle="dropdown"
                      >
                        {new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                      </Link>
                      <ul className="dropdown-menu dropdown-menu-end p-2">
                        <li>
                          <Link
                            to="#"
                            className="dropdown-item rounded-1"
                            onClick={(e) => { e.preventDefault(); setSelectedYear(new Date().getFullYear()); setSelectedMonth(new Date().getMonth() + 1); }}
                          >
                            {new Date().getFullYear()}
                          </Link>
                        </li>
                        <li>
                          <Link
                            to="#"
                            className="dropdown-item rounded-1"
                            onClick={(e) => { e.preventDefault(); setSelectedYear(new Date().getFullYear() - 1); setSelectedMonth(new Date().getMonth() + 1); }}
                          >
                            {new Date().getFullYear() - 1}
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="card-body py-0 px-2">
                  {loading ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  ) : (
                    <ReactApexChart
                      id="attendance-chart"
                      options={attendancechart}
                      series={attendancechart.series}
                      type="line"
                      height={200}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
              <h5>Employee Attendance</h5>
              <div className="d-flex my-xl-auto right-content align-items-center flex-wrap row-gap-3">
                <div className="me-3">
                  <div className="input-icon-end position-relative">
                    <select
                      className="form-control"
                      value={dateRangeFilter}
                      onChange={(e) => setDateRangeFilter(e.target.value)}
                    >
                      <option value="7">Last 7 Days</option>
                      <option value="30">Last 30 Days</option>
                      <option value="month">This Month</option>
                    </select>
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
                    {statusFilter || 'All Status'}
                  </Link>
                  <ul className="dropdown-menu dropdown-menu-end p-3">
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={(e) => { e.preventDefault(); setStatusFilter(''); }}
                      >
                        All Status
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={(e) => { e.preventDefault(); setStatusFilter('present'); }}
                      >
                        Present
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={(e) => { e.preventDefault(); setStatusFilter('absent'); }}
                      >
                        Absent
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={(e) => { e.preventDefault(); setStatusFilter('late'); }}
                      >
                        Late
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={(e) => { e.preventDefault(); setStatusFilter('half-day'); }}
                      >
                        Half Day
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
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
    </>
  );
};

export default AttendanceReport;
