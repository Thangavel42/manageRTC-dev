import React, { useEffect, useState, useCallback } from "react";
import ReactApexChart from "react-apexcharts";
import { Link } from "react-router-dom";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import { all_routes } from "../../router/all_routes";
import { Chart } from "primereact/chart";
import { Calendar } from "primereact/calendar";
import CollapseHeader from "../../../core/common/collapse-header/collapse-header";
import { useUser } from "@clerk/clerk-react";
import { useSocket } from "../../../SocketContext";
import { Socket } from "socket.io-client";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import Footer from "../../../core/common/footer";
import { Nullable } from "primereact/ts-helpers";

interface HRDashboardData {
  stats?: {
    totalEmployees: number;
    activeEmployees: number;
    inactiveEmployees: number;
    newJoiners: number;
    totalResignations: number;
    resignationsLast30Days: number;
    totalTerminations: number;
    terminationsLast30Days: number;
    // Growth percentages
    employeesGrowth?: number;
    activeGrowth?: number;
    inactiveGrowth?: number;
    joinersGrowth?: number;
  };
  employeesByDepartment?: Array<{ department: string; count: number }>;
  employeesByStatus?: {
    active: number;
    inactive: number;
    onNotice: number;
    terminated: number;
    resigned: number;
  };
  departmentStats?: {
    totalDepartments: number;
    activeDepartments: number;
    inactiveDepartments: number;
    recentlyAdded: number;
  };
  designationStats?: {
    totalDesignations: number;
    activeDesignations: number;
    inactiveDesignations: number;
    departmentWiseCount: Array<{ department: string; count: number }>;
  };
  policyStats?: {
    totalActivePolicies: number;
    policiesCreatedLast30Days: number;
    policiesAppliedToAll: number;
    policiesSelective: number;
  };
  holidayStats?: {
    totalHolidays: number;
    upcomingHolidays: number;
    holidayTypesCount: number;
  };
  trainingStats?: {
    totalTrainings: number;
    activeTrainings: number;
    totalTrainers: number;
    employeesInTraining: number;
  };
  projectStats?: {
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    onHoldProjects: number;
  };
  resourceStats?: {
    allocatedResources: number;
    availableResources: number;
    overAllocated: number;
    averageTeamSize: number;
  };
  recentActivities?: Array<{
    _id: string;
    action: string;
    description: string;
    createdAt: string;
    actorName: string;
    actorRole: string;
  }>;
  departmentWiseProjects?: Array<{ department: string; count: number }>;
  trainingDistribution?: Array<{ type: string; count: number }>;
  upcomingHolidays?: Array<{
    _id: string;
    title: string;
    date: string;
    originalDate: string;
    description: string;
    status: string;
    holidayTypeName: string;
    holidayTypeId: string;
    repeatsEveryYear: boolean;
  }>;
  todaysHolidays?: Array<{
    _id: string;
    title: string;
    date: string;
    originalDate: string;
    description: string;
    status: string;
    holidayTypeName: string;
    holidayTypeId: string;
    repeatsEveryYear: boolean;
  }>;
  allActiveHolidays?: Array<{
    _id: string;
    title: string;
    date: string;
    originalDate: string;
    holidayTypeName: string;
    repeatsEveryYear: boolean;
  }>;
}

const HRDashboard = () => {
  const routes = all_routes;
  const { user } = useUser();
  const socket = useSocket() as Socket | null;
  const [dashboardData, setDashboardData] = useState<HRDashboardData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(new Date());
  const [miniCalendarDate, setMiniCalendarDate] = useState<Nullable<Date>>(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    employeeDistribution: "all",
    employeeStatus: "all",
    lifecycle: "all",
    projects: "all",
  });

  const handleYearChange = (newDate: Date) => {
    console.log(`[HR Dashboard] Year changed to: ${newDate.getFullYear()}`);
    setDate(newDate);

    if (socket) {
      const year = newDate.getFullYear();
      socket.emit("hr/dashboard/get-all-data", { year });
    }
  };

  const getUserName = () => {
    if (!user) return "HR Manager";
    return (
      user.fullName ||
      `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
      "HR Manager"
    );
  };

  // Helper function to get dynamic title based on selected date
  const getDateTitle = (selectedDate: Date | null) => {
    if (!selectedDate) {
      return { title: "Today's Events", badge: "Live", prefix: "About Today" };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (selected.getTime() === today.getTime()) {
      return { title: "Today's Events", badge: "Live", prefix: "About Today" };
    } else if (selected.getTime() === yesterday.getTime()) {
      return { title: "Yesterday's Events", badge: "Past", prefix: "About Yesterday" };
    } else if (selected.getTime() === tomorrow.getTime()) {
      return { title: "Tomorrow's Events", badge: "Upcoming", prefix: "About Tomorrow" };
    } else {
      const dateStr = selected.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: selected.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
      });
      return { 
        title: `Events on ${dateStr}`, 
        badge: selected < today ? "Past" : "Upcoming",
        prefix: `About ${dateStr}`
      };
    }
  };

  // Helper function to check if a date matches the selected date
  const isDateMatch = (dateStr: string, selectedDate: Date | null) => {
    if (!selectedDate) {
      // If no date selected, show today's events
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const eventDate = new Date(dateStr);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate.getTime() === today.getTime();
    }

    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    const eventDate = new Date(dateStr);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate.getTime() === selected.getTime();
  };

  // Helper function to check if date is within range from selected date
  const isWithinDaysFromSelected = (dateStr: string, selectedDate: Date | null, days: number) => {
    const baseDate = selectedDate || new Date();
    const base = new Date(baseDate);
    base.setHours(0, 0, 0, 0);
    
    const futureDate = new Date(base);
    futureDate.setDate(futureDate.getDate() + days);
    
    const eventDate = new Date(dateStr);
    eventDate.setHours(0, 0, 0, 0);
    
    return eventDate >= base && eventDate <= futureDate;
  };

  // Helper function to check if a date is a holiday and return holiday info
  // Handles repeating yearly holidays by matching day+month only
  const getHolidayForDate = (date: Date) => {
    if (!dashboardData.allActiveHolidays) return null;
    
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    return dashboardData.allActiveHolidays.find(holiday => {
      const holidayDate = new Date(holiday.date);
      holidayDate.setHours(0, 0, 0, 0);
      
      if (holiday.repeatsEveryYear) {
        // For repeating holidays, match day and month only (ignore year)
        return (
          holidayDate.getDate() === checkDate.getDate() &&
          holidayDate.getMonth() === checkDate.getMonth()
        );
      } else {
        // For non-repeating holidays, match exact date
        return holidayDate.getTime() === checkDate.getTime();
      }
    });
  };

  // Date template for calendar to highlight holidays
  const dateTemplate = (date: any) => {
    // PrimeReact Calendar passes {day, month, year, ...} object
    // Construct a proper Date object
    const fullDate = new Date(date.year, date.month, date.day);
    const holiday = getHolidayForDate(fullDate);
    
    if (holiday) {
      return (
        <div
          className="p-highlight"
          style={{
            backgroundColor: "#e7f3ff",
            borderRadius: "50%",
            fontWeight: "bold",
            color: "#1677ff",
            width: "2.5rem",
            height: "2.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title={`${holiday.title} - ${holiday.holidayTypeName}`}
        >
          {date.day}
        </div>
      );
    }
    
    return date.day;
  };

  useEffect(() => {
    let isMounted = true;

    const initDashboard = () => {
      if (!socket) {
        console.log("[HR Dashboard] Socket not available yet, waiting...");
        return;
      }

      console.log("[HR Dashboard] Socket available, initializing dashboard...");
      setLoading(true);

      const timeoutId = setTimeout(() => {
        if (loading && isMounted) {
          console.warn("[HR Dashboard] Dashboard loading timeout");
          setError("Dashboard loading timed out. Please refresh the page.");
          setLoading(false);
        }
      }, 30000);

      const currentYear = date.getFullYear();
      console.log(`[HR Dashboard] Sending year: ${currentYear}`);
      socket.emit("hr/dashboard/get-all-data", { year: currentYear });

      const handleDashboardResponse = (response: any) => {
        console.log("[HR Dashboard] Received dashboard data:", response);
        clearTimeout(timeoutId);
        if (!isMounted) return;

        if (response.done) {
          console.log("[HR Dashboard] Dashboard data loaded successfully");
          setDashboardData(response.data);
          setLoading(false);
        } else {
          console.error("[HR Dashboard] Error:", response.error);
          setError(response.error || "Failed to fetch dashboard data");
          setLoading(false);
        }
      };

      socket.on("hr/dashboard/get-all-data-response", handleDashboardResponse);

      return () => {
        clearTimeout(timeoutId);
        if (socket) {
          socket.off("hr/dashboard/get-all-data-response", handleDashboardResponse);
        }
      };
    };

    if (socket) {
      const cleanup = initDashboard();
      return cleanup;
    }

    return () => {
      isMounted = false;
    };
  }, [socket, date]);

  // Export to PDF
  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      const currentDate = new Date().toLocaleDateString();
      const currentYear = date.getFullYear();

      doc.setFontSize(20);
      doc.text("HR Dashboard Report", 20, 20);

      doc.setFontSize(12);
      doc.text(`Generated on: ${currentDate}`, 20, 35);
      doc.text(`Year: ${currentYear}`, 20, 45);

      let yPosition = 60;

      // Employee Statistics
      doc.setFontSize(16);
      doc.text("Employee Overview", 20, yPosition);
      yPosition += 15;

      doc.setFontSize(10);
      if (dashboardData.stats) {
        doc.text(`Total Employees: ${dashboardData.stats.totalEmployees || 0}`, 20, yPosition);
        yPosition += 8;
        doc.text(`Active Employees: ${dashboardData.stats.activeEmployees || 0}`, 20, yPosition);
        yPosition += 8;
        doc.text(`Inactive Employees: ${dashboardData.stats.inactiveEmployees || 0}`, 20, yPosition);
        yPosition += 8;
        doc.text(`New Joiners (Last 30 Days): ${dashboardData.stats.newJoiners || 0}`, 20, yPosition);
        yPosition += 15;
      }

      // Department & Designation
      if (dashboardData.departmentStats) {
        doc.setFontSize(16);
        doc.text("Department Statistics", 20, yPosition);
        yPosition += 15;

        doc.setFontSize(10);
        doc.text(`Total Departments: ${dashboardData.departmentStats.totalDepartments || 0}`, 20, yPosition);
        yPosition += 8;
        doc.text(`Active Departments: ${dashboardData.departmentStats.activeDepartments || 0}`, 20, yPosition);
        yPosition += 8;
        doc.text(`Recently Added: ${dashboardData.departmentStats.recentlyAdded || 0}`, 20, yPosition);
        yPosition += 15;
      }

      doc.save(`hr-dashboard-${currentDate.replace(/\//g, "-")}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF export. Please try again.");
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    try {
      const currentDate = new Date().toLocaleDateString();
      const wb = XLSX.utils.book_new();

      // Employee Stats Sheet
      if (dashboardData.stats) {
        const employeeData: (string | number)[][] = [
          ["Employee Statistics", ""],
          ["Total Employees", dashboardData.stats.totalEmployees || 0],
          ["Active Employees", dashboardData.stats.activeEmployees || 0],
          ["Inactive Employees", dashboardData.stats.inactiveEmployees || 0],
          ["New Joiners (Last 30 Days)", dashboardData.stats.newJoiners || 0],
          ["Total Resignations", dashboardData.stats.totalResignations || 0],
          ["Resignations (Last 30 Days)", dashboardData.stats.resignationsLast30Days || 0],
          ["Total Terminations", dashboardData.stats.totalTerminations || 0],
          ["Terminations (Last 30 Days)", dashboardData.stats.terminationsLast30Days || 0],
        ];
        const employeeWS = XLSX.utils.aoa_to_sheet(employeeData);
        XLSX.utils.book_append_sheet(wb, employeeWS, "Employee Stats");
      }

      XLSX.writeFile(wb, `hr-dashboard-${currentDate.replace(/\//g, "-")}.xlsx`);
    } catch (error) {
      console.error("Error generating Excel:", error);
      alert("Error generating Excel export. Please try again.");
    }
  };

  // Chart Configuration - Employee Distribution by Department
  const empDepartmentOptions = {
    chart: {
      height: 280,
      type: "bar" as const,
      toolbar: { show: false },
    },
    fill: {
      colors: ["#F26522"],
      opacity: 1,
    },
    colors: ["#F26522"],
    grid: {
      borderColor: "#E5E7EB",
      strokeDashArray: 5,
      padding: { top: -20, left: 20, right: 20, bottom: 0 },
    },
    plotOptions: {
      bar: {
        borderRadius: 5,
        horizontal: true,
        barHeight: "45%",
        endingShape: "rounded",
      },
    },
    dataLabels: {
      enabled: true,
      style: {
        fontSize: "12px",
        fontWeight: "bold",
        colors: ["#fff"],
      },
      offsetX: 10,
    },
    series: [
      {
        data:
          dashboardData.employeesByDepartment?.map((dept) => ({
            x: dept.department,
            y: dept.count,
          })) || [],
        name: "Employees",
      },
    ],
    xaxis: {
      labels: {
        style: { colors: "#111827", fontSize: "12px" },
      },
    },
    yaxis: {
      labels: {
        style: { colors: "#6B7280", fontSize: "12px" },
      },
    },
  };

  // Employee Status Distribution Chart
  const employeeStatusData = {
    labels: ["Active", "Inactive", "On Notice", "Resigned", "Terminated"],
    datasets: [
      {
        label: "Employee Status",
        data: [
          dashboardData.employeesByStatus?.active || 0,
          dashboardData.employeesByStatus?.inactive || 0,
          dashboardData.employeesByStatus?.onNotice || 0,
          dashboardData.employeesByStatus?.resigned || 0,
          dashboardData.employeesByStatus?.terminated || 0,
        ],
        backgroundColor: ["#03C95A", "#FFC107", "#1B84FF", "#F26522", "#E70D0D"],
        borderWidth: 5,
        borderRadius: 10,
        borderColor: "#fff",
        hoverBorderWidth: 0,
        cutout: "60%",
      },
    ],
  };

  const employeeStatusOptions = {
    rotation: -100,
    circumference: 200,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
  };

  // Department-wise Project Distribution Chart
  const deptProjectOptions = {
    chart: {
      height: 260,
      type: "bar" as const,
      toolbar: { show: false },
    },
    colors: ["#1B84FF"],
    plotOptions: {
      bar: {
        borderRadius: 5,
        horizontal: false,
        columnWidth: "45%",
        endingShape: "rounded",
      },
    },
    dataLabels: { enabled: false },
    series: [
      {
        name: "Projects",
        data: dashboardData.departmentWiseProjects?.map((dept) => dept.count) || [],
      },
    ],
    xaxis: {
      categories: dashboardData.departmentWiseProjects?.map((dept) => dept.department) || [],
      labels: {
        style: { colors: "#6B7280", fontSize: "11px" },
      },
    },
    yaxis: {
      labels: {
        style: { colors: "#6B7280", fontSize: "12px" },
      },
    },
    grid: {
      borderColor: "#E5E7EB",
      strokeDashArray: 5,
    },
  };

  // Training Distribution Donut Chart
  const trainingDistributionData = {
    labels: dashboardData.trainingDistribution?.map((t) => t.type) || ["No Data"],
    datasets: [
      {
        label: "Training Distribution",
        data: dashboardData.trainingDistribution?.map((t) => t.count) || [0],
        backgroundColor: ["#F26522", "#1B84FF", "#03C95A", "#FFC107", "#E70D0D", "#AB47BC"],
        borderWidth: 5,
        borderRadius: 10,
        borderColor: "#fff",
        hoverBorderWidth: 0,
        cutout: "60%",
      },
    ],
  };

  const trainingDistributionOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "400px" }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">HR Dashboard</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={routes.hrDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">Dashboard</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    HR Dashboard
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
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
                  <ul className="dropdown-menu dropdown-menu-end p-3">
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={exportToPDF}
                      >
                        <i className="ti ti-file-type-pdf me-1" />
                        Export as PDF
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={exportToExcel}
                      >
                        <i className="ti ti-file-type-xls me-1" />
                        Export as Excel
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="mb-2">
                <div className="input-icon w-120 position-relative">
                  <span className="input-icon-addon">
                    <i className="ti ti-calendar text-gray-9" />
                  </span>
                  <Calendar
                    value={date}
                    onChange={(e: any) => handleYearChange(e.value)}
                    view="year"
                    dateFormat="yy"
                    className="Calendar-form"
                  />
                </div>
              </div>
              <div className="ms-2 head-icons">
                <CollapseHeader />
              </div>
            </div>
          </div>
          {/* /Breadcrumb */}

          {/* Welcome Card */}
          <div className="card border-0">
            <div className="card-body d-flex align-items-center justify-content-between flex-wrap pb-1">
              <div className="d-flex align-items-center mb-3">
                <span className="avatar avatar-xl flex-shrink-0">
                  <ImageWithBasePath
                    src={user?.imageUrl || "assets/img/profiles/avatar-31.jpg"}
                    className="rounded-circle"
                    alt="img"
                  />
                </span>
                <div className="ms-3">
                  <h3 className="mb-2">
                    Welcome Back, {getUserName()}
                  </h3>
                  <p className="text-muted">
                    Human Resource Overview & Workforce Insights
                  </p>
                </div>
              </div>
            </div>
          </div>
          {/* /Welcome Card */}
 {/* TIER 2: CORE METRICS - KPI Summary Row */}
          <div className="row">
            <div className="col-md-3 d-flex">
              <div className="card flex-fill bg-linear-gradiant border-white border-2 overlay-bg-3 position-relative">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center flex-wrap mb-3">
                    <div>
                      <p className="fw-medium mb-1">Total Employees</p>
                      <h5>{dashboardData.stats?.totalEmployees || 0}</h5>
                    </div>
                    <div className="avatar avatar-md br-10 icon-rotate bg-primary">
                      <span className="d-flex align-items-center">
                        <i className="ti ti-users-group text-white fs-16" />
                      </span>
                    </div>
                  </div>
                  <div className="progress progress-xs mb-2">
                    <div
                      className="progress-bar bg-primary"
                      role="progressbar"
                      style={{ width: "100%" }}
                    />
                  </div>
                  <p className="fw-medium fs-13">
                    Total workforce count
                  </p>
                </div>
              </div>
            </div>

            <div className="col-md-3 d-flex">
              <div className="card flex-fill bg-linear-gradiant border-white border-2 overlay-bg-3 position-relative">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center flex-wrap mb-3">
                    <div>
                      <p className="fw-medium mb-1">Active Employees</p>
                      <h5>{dashboardData.stats?.activeEmployees || 0}</h5>
                    </div>
                    <div className="avatar avatar-md br-10 icon-rotate bg-success">
                      <span className="d-flex align-items-center">
                        <i className="ti ti-user-check text-white fs-16" />
                      </span>
                    </div>
                  </div>
                  <div className="progress progress-xs mb-2">
                    <div
                      className="progress-bar bg-success"
                      role="progressbar"
                      style={{ width: "100%" }}
                    />
                  </div>
                  <p className="fw-medium fs-13">
                    Currently active workforce
                  </p>
                </div>
              </div>
            </div>

            <div className="col-md-3 d-flex">
              <div className="card flex-fill bg-linear-gradiant border-white border-2 overlay-bg-3 position-relative">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center flex-wrap mb-3">
                    <div>
                      <p className="fw-medium mb-1">Inactive Employees</p>
                      <h5>{dashboardData.stats?.inactiveEmployees || 0}</h5>
                    </div>
                    <div className="avatar avatar-md br-10 icon-rotate bg-warning">
                      <span className="d-flex align-items-center">
                        <i className="ti ti-user-pause text-white fs-16" />
                      </span>
                    </div>
                  </div>
                  <div className="progress progress-xs mb-2">
                    <div
                      className="progress-bar bg-warning"
                      role="progressbar"
                      style={{ width: "100%" }}
                    />
                  </div>
                  <p className="fw-medium fs-13">
                    Inactive status employees
                  </p>
                </div>
              </div>
            </div>

            <div className="col-md-3 d-flex">
              <div className="card flex-fill bg-linear-gradiant border-white border-2 overlay-bg-3 position-relative">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center flex-wrap mb-3">
                    <div>
                      <p className="fw-medium mb-1">New Joiners</p>
                      <h5>{dashboardData.stats?.newJoiners || 0}</h5>
                    </div>
                    <div className="avatar avatar-md br-10 icon-rotate bg-info">
                      <span className="d-flex align-items-center">
                        <i className="ti ti-user-plus text-white fs-16" />
                      </span>
                    </div>
                  </div>
                  <div className="progress progress-xs mb-2">
                    <div
                      className="progress-bar bg-info"
                      role="progressbar"
                      style={{ width: "100%" }}
                    />
                  </div>
                  <p className="fw-medium fs-13">
                    Last 30 days
                  </p>
                </div>
              </div>
            </div>
          </div>
          {/* /KPI Summary Row */}
          {/* TIER 1: CRITICAL - Employee Lifecycle Overview */}
          <div className="row">
            <div className="col-md-3 d-flex">
              <div className="card flex-fill">
                <div className="card-body">
                  <span className="avatar rounded-circle bg-danger mb-2">
                    <i className="ti ti-user-minus fs-16" />
                  </span>
                  <h6 className="fs-13 fw-medium text-default mb-1">
                    Total Resignations
                  </h6>
                  <h3 className="mb-3">{dashboardData.stats?.totalResignations || 0}</h3>
                  <Link to={routes.resignation} className="link-default">
                    View Details
                  </Link>
                </div>
              </div>
            </div>

            <div className="col-md-3 d-flex">
              <div className="card flex-fill">
                <div className="card-body">
                  <span className="avatar rounded-circle bg-warning mb-2">
                    <i className="ti ti-user-x fs-16" />
                  </span>
                  <h6 className="fs-13 fw-medium text-default mb-1">
                    Resignations (Last 30 Days)
                  </h6>
                  <h3 className="mb-3">{dashboardData.stats?.resignationsLast30Days || 0}</h3>
                  <Link to={routes.resignation} className="link-default">
                    View Recent
                  </Link>
                </div>
              </div>
            </div>

            <div className="col-md-3 d-flex">
              <div className="card flex-fill">
                <div className="card-body">
                  <span className="avatar rounded-circle bg-dark mb-2">
                    <i className="ti ti-ban fs-16" />
                  </span>
                  <h6 className="fs-13 fw-medium text-default mb-1">
                    Total Terminations
                  </h6>
                  <h3 className="mb-3">{dashboardData.stats?.totalTerminations || 0}</h3>
                  <Link to={routes.termination} className="link-default">
                    View Details
                  </Link>
                </div>
              </div>
            </div>

            <div className="col-md-3 d-flex">
              <div className="card flex-fill">
                <div className="card-body">
                  <span className="avatar rounded-circle bg-secondary mb-2">
                    <i className="ti ti-user-cancel fs-16" />
                  </span>
                  <h6 className="fs-13 fw-medium text-default mb-1">
                    Terminations (Last 30 Days)
                  </h6>
                  <h3 className="mb-3">{dashboardData.stats?.terminationsLast30Days || 0}</h3>
                  <Link to={routes.termination} className="link-default">
                    View Recent
                  </Link>
                </div>
              </div>
            </div>
          </div>
          {/* /TIER 1: Employee Lifecycle Overview */}
{/* TIER 3: OPERATIONAL PLANNING - Calendar, Holidays & Today's Info */}
          <div className="row">
            {/* Column 1: Mini Calendar */}
            <div className="col-xxl-4 col-xl-4 d-flex">
              <div className="card flex-fill">
                <div className="card-header border-bottom">
                  <h5 className="mb-0">
                    <i className="ti ti-calendar text-primary me-2"></i>
                    Calendar
                  </h5>
                </div>
                <div className="card-body p-3">
                  <Calendar
                    className="datepickers"
                    value={miniCalendarDate}
                    onChange={(e: any) => setMiniCalendarDate(e.value)}
                    inline={true}
                    dateTemplate={dateTemplate}
                  />
                </div>
              </div>
            </div>
            {/* /Column 1: Mini Calendar */}

            {/* Column 2: Upcoming Holidays */}
            <div className="col-xxl-4 col-xl-4 d-flex">
              <div className="card flex-fill">
                <div className="card-header border-bottom">
                  <h5 className="mb-0">
                    <i className="ti ti-calendar-event text-success me-2"></i>
                    Upcoming Holidays
                    {dashboardData.upcomingHolidays && dashboardData.upcomingHolidays.length > 0 && (
                      <span className="badge badge-success rounded-pill ms-2 fs-10">
                        {dashboardData.upcomingHolidays.length}
                      </span>
                    )}
                  </h5>
                </div>
                <div className="card-body">
                  {dashboardData.upcomingHolidays && dashboardData.upcomingHolidays.length > 0 ? (
                    <div style={{ maxHeight: "320px", overflowY: "auto" }}>
                      {dashboardData.upcomingHolidays.slice(0, 7).map((holiday) => {
                        // Color rotation for borders
                        const colors = ["purple", "pink", "success", "info", "warning"];
                        const colorIndex = dashboardData.upcomingHolidays!.indexOf(holiday) % colors.length;
                        const borderColor = colors[colorIndex];
                        
                        return (
                          <div key={holiday._id} className={`border-start border-${borderColor} border-3 mb-3 pb-2`}>
                            <div className="ps-3">
                              <div className="d-flex align-items-start justify-content-between mb-1">
                                <h6 className="fw-semibold mb-0">{holiday.title}</h6>
                                {holiday.repeatsEveryYear && (
                                  <i className="ti ti-refresh text-primary" title="Repeats every year"></i>
                                )}
                              </div>
                              <p className="fs-12 mb-1">
                                <span className="badge badge-soft-info">{holiday.holidayTypeName}</span>
                              </p>
                              <p className="fs-12 mb-0 text-muted">
                                <i className="ti ti-calendar-check text-info me-1" />
                                {new Date(holiday.date).toLocaleDateString("en-US", {
                                  weekday: "short",
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-5">
                      <i className="ti ti-calendar-x fs-48 text-muted mb-2"></i>
                      <p className="text-muted mb-0">No upcoming holidays</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* /Column 2: Upcoming Holidays */}

            {/* Column 3: Dynamic Events */}
            <div className="col-xxl-4 col-xl-4 d-flex">
              <div className="card flex-fill">
                <div className="card-header border-bottom">
                  <h5 className="mb-0">
                    <i className="ti ti-calendar-star text-info me-2"></i>
                    {getDateTitle(miniCalendarDate).title}
                    <span className={`badge badge-soft-${getDateTitle(miniCalendarDate).badge === 'Live' ? 'primary' : getDateTitle(miniCalendarDate).badge === 'Past' ? 'secondary' : 'info'} ms-2 fs-10`}>
                      {getDateTitle(miniCalendarDate).badge}
                    </span>
                  </h5>
                </div>
                <div className="card-body">
                  {/* Selected Date Header */}
                  <div className="border-bottom pb-2 mb-3">
                    <p className="mb-0 fs-12 fw-semibold text-primary">
                      <i className="ti ti-calendar-time me-1"></i>
                      {(miniCalendarDate || new Date()).toLocaleDateString("en-US", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  {/* Events List */}
                  <div style={{ maxHeight: "320px", overflowY: "auto" }}>
                    {/* Notice Period Ending Events */}
                    {dashboardData.stats?.resignationsLast30Days && dashboardData.stats.resignationsLast30Days > 0 ? (
                      <div className="border-start border-warning border-3 mb-3 pb-2">
                        <div className="ps-3">
                          <div className="d-flex align-items-start justify-content-between mb-1">
                            <div className="d-flex align-items-start">
                              <span className="avatar avatar-xs rounded-circle bg-warning-transparent me-2 mt-1">
                                <i className="ti ti-hourglass-low fs-12"></i>
                              </span>
                              <div>
                                <h6 className="fw-semibold mb-1 fs-13">Notice Period Ending</h6>
                                <p className="mb-1 fs-12 text-muted">
                                  {dashboardData.stats.resignationsLast30Days} employee(s) have notice periods ending soon
                                </p>
                                <p className="mb-0 fs-11 text-warning">
                                  <i className="ti ti-alert-circle me-1"></i>Action required: Plan replacement
                                </p>
                              </div>
                            </div>
                            <span className="badge badge-soft-warning fs-10">Urgent</span>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* New Joiners Today/This Week */}
                    {dashboardData.stats?.newJoiners && dashboardData.stats.newJoiners > 0 ? (
                      <div className="border-start border-success border-3 mb-3 pb-2">
                        <div className="ps-3">
                          <div className="d-flex align-items-start justify-content-between mb-1">
                            <div className="d-flex align-items-start">
                              <span className="avatar avatar-xs rounded-circle bg-success-transparent me-2 mt-1">
                                <i className="ti ti-user-check fs-12"></i>
                              </span>
                              <div>
                                <h6 className="fw-semibold mb-1 fs-13">New Joiners This Month</h6>
                                <p className="mb-1 fs-12 text-muted">
                                  {dashboardData.stats.newJoiners} new employee(s) joined recently
                                </p>
                                <p className="mb-0 fs-11 text-success">
                                  <i className="ti ti-checks me-1"></i>Onboarding in progress
                                </p>
                              </div>
                            </div>
                            <span className="badge badge-soft-success fs-10">Active</span>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* Training Events */}
                    {dashboardData.trainingStats?.activeTrainings && dashboardData.trainingStats.activeTrainings > 0 ? (
                      <div className="border-start border-info border-3 mb-3 pb-2">
                        <div className="ps-3">
                          <div className="d-flex align-items-start justify-content-between mb-1">
                            <div className="d-flex align-items-start">
                              <span className="avatar avatar-xs rounded-circle bg-info-transparent me-2 mt-1">
                                <i className="ti ti-school fs-12"></i>
                              </span>
                              <div>
                                <h6 className="fw-semibold mb-1 fs-13">Active Training Sessions</h6>
                                <p className="mb-1 fs-12 text-muted">
                                  {dashboardData.trainingStats.activeTrainings} training(s) ongoing with {dashboardData.trainingStats.employeesInTraining || 0} participants
                                </p>
                                <p className="mb-0 fs-11 text-info">
                                  <i className="ti ti-progress me-1"></i>In progress
                                </p>
                              </div>
                            </div>
                            <span className="badge badge-soft-info fs-10">Ongoing</span>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* Projects Due Soon */}
                    {dashboardData.projectStats?.activeProjects && dashboardData.projectStats.activeProjects > 0 ? (
                      <div className="border-start border-purple border-3 mb-3 pb-2">
                        <div className="ps-3">
                          <div className="d-flex align-items-start justify-content-between mb-1">
                            <div className="d-flex align-items-start">
                              <span className="avatar avatar-xs rounded-circle bg-purple-transparent me-2 mt-1">
                                <i className="ti ti-briefcase fs-12"></i>
                              </span>
                              <div>
                                <h6 className="fw-semibold mb-1 fs-13">Active Projects</h6>
                                <p className="mb-1 fs-12 text-muted">
                                  {dashboardData.projectStats.activeProjects} project(s) in progress
                                </p>
                                <p className="mb-0 fs-11 text-purple">
                                  <i className="ti ti-clock-hour-3 me-1"></i>Monitor deadlines closely
                                </p>
                              </div>
                            </div>
                            <span className="badge badge-soft-purple fs-10">Active</span>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* Today's Holidays */}
                    {dashboardData.todaysHolidays && dashboardData.todaysHolidays.length > 0 && (
                      dashboardData.todaysHolidays.map(holiday => (
                        <div key={holiday._id} className="border-start border-primary border-3 mb-3 pb-2">
                          <div className="ps-3">
                            <div className="d-flex align-items-start justify-content-between mb-1">
                              <div className="d-flex align-items-start">
                                <span className="avatar avatar-xs rounded-circle bg-primary-transparent me-2 mt-1">
                                  <i className="ti ti-gift fs-12"></i>
                                </span>
                                <div>
                                  <h6 className="fw-semibold mb-1 fs-13">🎉 {holiday.title}</h6>
                                  <p className="mb-1 fs-12 text-muted">
                                    <span className="badge badge-soft-info me-1">{holiday.holidayTypeName}</span>
                                    {holiday.repeatsEveryYear && (
                                      <span className="badge badge-soft-primary"><i className="ti ti-refresh"></i> Annual</span>
                                    )}
                                  </p>
                                  <p className="mb-0 fs-11 text-primary">
                                    <i className="ti ti-calendar-event me-1"></i>Company holiday - No work scheduled
                                  </p>
                                </div>
                              </div>
                              <span className="badge badge-soft-primary fs-10">Today</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}

                    {/* Holidays on Selected Date or Upcoming */}
                    {dashboardData.upcomingHolidays && dashboardData.upcomingHolidays.length > 0 && (() => {
                      const selectedDate = miniCalendarDate || new Date();
                      const selected = new Date(selectedDate);
                      selected.setHours(0, 0, 0, 0);
                      
                      // Check for holiday on exact date (handles repeating holidays)
                      const holidayOnDate = dashboardData.upcomingHolidays.find(holiday => {
                        const holidayDate = new Date(holiday.date);
                        holidayDate.setHours(0, 0, 0, 0);
                        
                        if (holiday.repeatsEveryYear) {
                          // For repeating holidays, match day and month only
                          return (
                            holidayDate.getDate() === selected.getDate() &&
                            holidayDate.getMonth() === selected.getMonth()
                          );
                        } else {
                          // For non-repeating holidays, match exact date
                          return holidayDate.getTime() === selected.getTime();
                        }
                      });

                      if (holidayOnDate) {
                        return (
                          <div className="border-start border-primary border-3 mb-3 pb-2">
                            <div className="ps-3">
                              <div className="d-flex align-items-start justify-content-between mb-1">
                                <div className="d-flex align-items-start">
                                  <span className="avatar avatar-xs rounded-circle bg-primary-transparent me-2 mt-1">
                                    <i className="ti ti-gift fs-12"></i>
                                  </span>
                                  <div>
                                    <h6 className="fw-semibold mb-1 fs-13">🎉 Holiday on This Date</h6>
                                    <p className="mb-1 fs-12 text-muted">
                                      {holidayOnDate.title}
                                      <span className="badge badge-soft-info ms-2">{holidayOnDate.holidayTypeName}</span>
                                    </p>
                                    <p className="mb-0 fs-11 text-primary">
                                      <i className="ti ti-calendar-event me-1"></i>Company holiday - No work scheduled
                                    </p>
                                  </div>
                                </div>
                                <span className="badge badge-soft-primary fs-10">Holiday</span>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // If no holiday on exact date, check for holidays within 7 days
                      const weekFromSelected = new Date(selected);
                      weekFromSelected.setDate(weekFromSelected.getDate() + 7);
                      
                      const upcomingFromDate = dashboardData.upcomingHolidays.filter(holiday => {
                        const holidayDate = new Date(holiday.date);
                        holidayDate.setHours(0, 0, 0, 0);
                        return holidayDate > selected && holidayDate <= weekFromSelected;
                      });
                      
                      return upcomingFromDate.length > 0 ? (
                        <div className="border-start border-primary border-3 mb-3 pb-2">
                          <div className="ps-3">
                            <div className="d-flex align-items-start justify-content-between mb-1">
                              <div className="d-flex align-items-start">
                                <span className="avatar avatar-xs rounded-circle bg-primary-transparent me-2 mt-1">
                                  <i className="ti ti-gift fs-12"></i>
                                </span>
                                <div>
                                  <h6 className="fw-semibold mb-1 fs-13">Upcoming Holiday</h6>
                                  <p className="mb-1 fs-12 text-muted">
                                    {upcomingFromDate[0].title} on {new Date(upcomingFromDate[0].date).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </p>
                                  <p className="mb-0 fs-11 text-primary">
                                    <i className="ti ti-calendar-event me-1"></i>Plan team schedules accordingly
                                  </p>
                                </div>
                              </div>
                              <span className="badge badge-soft-primary fs-10">Soon</span>
                            </div>
                          </div>
                        </div>
                      ) : null;
                    })()}

                    {/* Resource Availability Alert */}
                    {dashboardData.resourceStats?.overAllocated && dashboardData.resourceStats.overAllocated > 0 ? (
                      <div className="border-start border-danger border-3 mb-3 pb-2">
                        <div className="ps-3">
                          <div className="d-flex align-items-start justify-content-between mb-1">
                            <div className="d-flex align-items-start">
                              <span className="avatar avatar-xs rounded-circle bg-danger-transparent me-2 mt-1">
                                <i className="ti ti-alert-triangle fs-12"></i>
                              </span>
                              <div>
                                <h6 className="fw-semibold mb-1 fs-13">Resource Over-Allocation</h6>
                                <p className="mb-1 fs-12 text-muted">
                                  {dashboardData.resourceStats.overAllocated} resource(s) over-allocated
                                </p>
                                <p className="mb-0 fs-11 text-danger">
                                  <i className="ti ti-flag me-1"></i>Critical: Rebalance workload
                                </p>
                              </div>
                            </div>
                            <span className="badge badge-soft-danger fs-10">Critical</span>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* Policy Review Reminder */}
                    {dashboardData.policyStats?.policiesCreatedLast30Days && dashboardData.policyStats.policiesCreatedLast30Days > 0 ? (
                      <div className="border-start border-secondary border-3 mb-3 pb-2">
                        <div className="ps-3">
                          <div className="d-flex align-items-start justify-content-between mb-1">
                            <div className="d-flex align-items-start">
                              <span className="avatar avatar-xs rounded-circle bg-secondary-transparent me-2 mt-1">
                                <i className="ti ti-file-text fs-12"></i>
                              </span>
                              <div>
                                <h6 className="fw-semibold mb-1 fs-13">New Policy Updates</h6>
                                <p className="mb-1 fs-12 text-muted">
                                  {dashboardData.policyStats.policiesCreatedLast30Days} new policy/policies added this month
                                </p>
                                <p className="mb-0 fs-11 text-secondary">
                                  <i className="ti ti-bell me-1"></i>Ensure employee acknowledgment
                                </p>
                              </div>
                            </div>
                            <span className="badge badge-soft-secondary fs-10">Review</span>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* Date-specific Information Event */}
                    {(() => {
                      const selectedDate = miniCalendarDate || new Date();
                      const selected = new Date(selectedDate);
                      selected.setHours(0, 0, 0, 0);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      
                      const isPast = selected < today;
                      const isFuture = selected > today;
                      
                      // Show date-specific info card
                      return (
                        <div className="border-start border-info border-3 mb-3 pb-2">
                          <div className="ps-3">
                            <div className="d-flex align-items-start justify-content-between mb-1">
                              <div className="d-flex align-items-start">
                                <span className="avatar avatar-xs rounded-circle bg-info-transparent me-2 mt-1">
                                  <i className="ti ti-info-circle fs-12"></i>
                                </span>
                                <div>
                                  <h6 className="fw-semibold mb-1 fs-13">
                                    {selected.getTime() === today.getTime() ? "Today's Status" : 
                                     isPast ? "Historical Data" : "Future Planning"}
                                  </h6>
                                  <p className="mb-1 fs-12 text-muted">
                                    {selected.getTime() === today.getTime() ? 
                                      `${dashboardData.stats?.activeEmployees || 0} active employees currently` :
                                     isPast ? 
                                      "Past date - Historical events may not be available" :
                                      "Future date - Plan ahead for upcoming activities"}
                                  </p>
                                  <p className="mb-0 fs-11 text-info">
                                    <i className="ti ti-calendar-stats me-1"></i>
                                    {selected.getTime() === today.getTime() ? 
                                      "Real-time updates" :
                                     isPast ? 
                                      "View historical records" :
                                      "Schedule and prepare"}
                                  </p>
                                </div>
                              </div>
                              <span className={`badge badge-soft-${selected.getTime() === today.getTime() ? 'success' : isPast ? 'secondary' : 'info'} fs-10`}>
                                {selected.getTime() === today.getTime() ? 'Current' : isPast ? 'Past' : 'Future'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Empty State - Only when truly no events */}
                    {!dashboardData.stats?.resignationsLast30Days &&
                     !dashboardData.stats?.newJoiners &&
                     !dashboardData.trainingStats?.activeTrainings &&
                     !dashboardData.projectStats?.activeProjects &&
                     (() => {
                       const selectedDate = miniCalendarDate || new Date();
                       const selected = new Date(selectedDate);
                       selected.setHours(0, 0, 0, 0);
                       
                       const hasHolidayOnDate = dashboardData.upcomingHolidays?.some(holiday => {
                         const holidayDate = new Date(holiday.date);
                         holidayDate.setHours(0, 0, 0, 0);
                         return holidayDate.getTime() === selected.getTime();
                       });
                       
                       return !hasHolidayOnDate;
                     })() &&
                     !dashboardData.resourceStats?.overAllocated &&
                     !dashboardData.policyStats?.policiesCreatedLast30Days ? (
                      <div className="text-center py-4">
                        <i className="ti ti-calendar-check fs-40 text-muted mb-2"></i>
                        <p className="text-muted mb-0 fs-13">No additional events for this date</p>
                        <p className="text-muted fs-11 mb-0">Check other dates or add new activities</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
            {/* /Column 3: Dynamic Events (Today/Yesterday/Tomorrow/Specific Date) */}
          </div>
          {/* /TIER 3: Calendar */}
         


          {/* TIER 2: OPERATIONAL OVERVIEW - 3 Column Layout */}
          <div className="row">
            {/* Column 1: Recent Activities */}
            <div className="col-xxl-4 col-xl-4 d-flex">
              <div className="card flex-fill">
                <div className="card-header border-bottom">
                  <h5 className="mb-0">
                    <i className="ti ti-bell text-warning me-2"></i>
                    Recent Activities
                    <span className="badge badge-soft-danger ms-2 fs-10">Urgent</span>
                  </h5>
                </div>
                <div className="card-body">
                  {dashboardData.recentActivities && dashboardData.recentActivities.length > 0 ? (
                    <div className="activity-feed" style={{ maxHeight: "450px", overflowY: "auto" }}>
                      {dashboardData.recentActivities.slice(0, 10).map((activity) => (
                        <div key={activity._id} className="border-bottom pb-3 mb-3">
                          <div className="d-flex align-items-start">
                            <span className="avatar avatar-sm rounded-circle bg-primary-transparent flex-shrink-0 me-2">
                              <i className="ti ti-user fs-14" />
                            </span>
                            <div className="flex-fill">
                              <p className="mb-1">
                                <span className="fw-semibold">{activity.actorName}</span>
                                <span className="text-muted"> ({activity.actorRole})</span>
                              </p>
                              <p className="mb-1 text-muted fs-13">{activity.description}</p>
                              <p className="mb-0 fs-12 text-muted">
                                {new Date(activity.createdAt).toLocaleDateString()} at{" "}
                                {new Date(activity.createdAt).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-5">
                      <p className="text-muted">No recent activities</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* /Column 1: Recent Activities */}

            {/* Column 2: Quick Actions */}
            <div className="col-xxl-4 col-xl-4 d-flex">
              <div className="card flex-fill">
                <div className="card-header border-bottom">
                  <h5 className="mb-0">
                    <i className="ti ti-rocket text-primary me-2"></i>
                    Quick Actions
                  </h5>
                </div>
                <div className="card-body">
                  <div className="d-flex flex-column gap-3">
                    <Link
                      to={routes.employeeList}
                      className="btn btn-outline-primary d-flex align-items-center justify-content-start"
                    >
                      <i className="ti ti-user-plus me-2 fs-18" />
                      <div className="text-start">
                        <div className="fw-semibold">Add Employee</div>
                        <div className="fs-12 text-muted">Create new employee record</div>
                      </div>
                    </Link>
                    <Link
                      to={routes.departments}
                      className="btn btn-outline-success d-flex align-items-center justify-content-start"
                    >
                      <i className="ti ti-building me-2 fs-18" />
                      <div className="text-start">
                        <div className="fw-semibold">Add Department</div>
                        <div className="fs-12 text-muted">Create organizational unit</div>
                      </div>
                    </Link>
                    <Link
                      to={routes.designations}
                      className="btn btn-outline-info d-flex align-items-center justify-content-start"
                    >
                      <i className="ti ti-briefcase me-2 fs-18" />
                      <div className="text-start">
                        <div className="fw-semibold">Add Designation</div>
                        <div className="fs-12 text-muted">Define job role</div>
                      </div>
                    </Link>
                    <Link
                      to={routes.policy}
                      className="btn btn-outline-warning d-flex align-items-center justify-content-start"
                    >
                      <i className="ti ti-file-text me-2 fs-18" />
                      <div className="text-start">
                        <div className="fw-semibold">Create Policy</div>
                        <div className="fs-12 text-muted">Add company policy</div>
                      </div>
                    </Link>
                    <Link
                      to={routes.holidays}
                      className="btn btn-outline-danger d-flex align-items-center justify-content-start"
                    >
                      <i className="ti ti-calendar-event me-2 fs-18" />
                      <div className="text-start">
                        <div className="fw-semibold">Add Holiday</div>
                        <div className="fs-12 text-muted">Schedule company holiday</div>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            {/* /Column 2: Quick Actions */}

            {/* Column 3: Training Distribution + Overview */}
            <div className="col-xxl-4 col-xl-4 d-flex">
              <div className="card flex-fill">
                <div className="card-header border-bottom">
                  <h5 className="mb-0">
                    <i className="ti ti-school text-success me-2"></i>
                    Training Insights
                  </h5>
                </div>
                <div className="card-body">
                  {/* Training Distribution Chart */}
                  <div className="border-bottom pb-3 mb-3">
                    <h6 className="fw-semibold mb-3">Training Distribution</h6>
                    {dashboardData.trainingDistribution && dashboardData.trainingDistribution.length > 0 ? (
                      <div className="row align-items-center">
                        <div className="col-6">
                          <div style={{ height: "140px" }}>
                            <Chart
                              type="doughnut"
                              data={trainingDistributionData}
                              options={trainingDistributionOptions}
                              style={{ height: "140px" }}
                            />
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="d-flex flex-column gap-2">
                            {dashboardData.trainingDistribution.map((training, index) => {
                              const colors = ["primary", "info", "success", "warning", "danger", "purple"];
                              const color = colors[index % colors.length];
                              return (
                                <div key={index} className="d-flex justify-content-between align-items-center">
                                  <span className="fs-12">
                                    <i className={`ti ti-circle-filled text-${color} me-1 fs-8`} />
                                    {training.type}
                                  </span>
                                  <span className="fw-bold fs-13">{training.count}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-3">
                        <p className="text-muted fs-13 mb-0">No training data</p>
                      </div>
                    )}
                  </div>
                  {/* /Training Distribution Chart */}

                  {/* Training Overview Stats */}
                  <div>
                    <h6 className="fw-semibold mb-3">Training Overview</h6>
                    <div className="row g-2">
                      <div className="col-6">
                        <div className="border rounded p-2 text-center">
                          <h5 className="text-primary mb-1">{dashboardData.trainingStats?.totalTrainings || 0}</h5>
                          <p className="mb-0 text-muted fs-12">Total</p>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="border rounded p-2 text-center">
                          <h5 className="text-success mb-1">{dashboardData.trainingStats?.activeTrainings || 0}</h5>
                          <p className="mb-0 text-muted fs-12">Active</p>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="border rounded p-2 text-center">
                          <h5 className="text-info mb-1">{dashboardData.trainingStats?.totalTrainers || 0}</h5>
                          <p className="mb-0 text-muted fs-12">Trainers</p>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="border rounded p-2 text-center">
                          <h5 className="text-warning mb-1">{dashboardData.trainingStats?.employeesInTraining || 0}</h5>
                          <p className="mb-0 text-muted fs-12">In Training</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* /Training Overview Stats */}
                </div>
              </div>
            </div>
            {/* /Column 3: Training */}
          </div>
          {/* /TIER 2: 3 Column Layout */}


          {/* Employee Distribution Section */}
          <div className="row">
            <div className="col-xl-6 d-flex">
              <div className="card flex-fill">
                <div className="card-header pb-2 d-flex align-items-center justify-content-between flex-wrap">
                  <h5 className="mb-2">Employee Distribution by Department</h5>
                  <div className="dropdown mb-2">
                    <Link
                      to="#"
                      className="btn btn-white border btn-sm d-inline-flex align-items-center"
                      data-bs-toggle="dropdown"
                    >
                      <i className="ti ti-calendar me-1" />
                      This Year
                    </Link>
                    <ul className="dropdown-menu dropdown-menu-end p-3">
                      <li>
                        <Link to="#" className="dropdown-item rounded-1">
                          This Year
                        </Link>
                      </li>
                      <li>
                        <Link to="#" className="dropdown-item rounded-1">
                          Last Year
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="card-body">
                  {dashboardData.employeesByDepartment && dashboardData.employeesByDepartment.length > 0 ? (
                    <ReactApexChart
                      id="emp-department"
                      options={empDepartmentOptions}
                      series={empDepartmentOptions.series}
                      type="bar"
                      height={280}
                    />
                  ) : (
                    <div className="text-center py-5">
                      <p className="text-muted">No data available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-xl-6 d-flex">
              <div className="card flex-fill">
                <div className="card-header pb-2 d-flex align-items-center justify-content-between flex-wrap">
                  <h5 className="mb-2">Employee Status Distribution</h5>
                  <div className="dropdown mb-2">
                    <Link
                      to="#"
                      className="btn btn-white border btn-sm d-inline-flex align-items-center"
                      data-bs-toggle="dropdown"
                    >
                      <i className="ti ti-calendar me-1" />
                      Current
                    </Link>
                    <ul className="dropdown-menu dropdown-menu-end p-3">
                      <li>
                        <Link to="#" className="dropdown-item rounded-1">
                          Current
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="card-body">
                  <div className="row align-items-center">
                    <div className="col-md-6">
                      <div style={{ height: "200px" }}>
                        <Chart
                          type="doughnut"
                          data={employeeStatusData}
                          options={employeeStatusOptions}
                          style={{ height: "200px" }}
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="d-flex flex-column gap-2">
                        <div className="d-flex justify-content-between align-items-center">
                          <span>
                            <i className="ti ti-circle-filled text-success me-1 fs-8" />
                            Active
                          </span>
                          <span className="fw-bold">{dashboardData.employeesByStatus?.active || 0}</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <span>
                            <i className="ti ti-circle-filled text-warning me-1 fs-8" />
                            Inactive
                          </span>
                          <span className="fw-bold">{dashboardData.employeesByStatus?.inactive || 0}</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <span>
                            <i className="ti ti-circle-filled text-info me-1 fs-8" />
                            On Notice
                          </span>
                          <span className="fw-bold">{dashboardData.employeesByStatus?.onNotice || 0}</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <span>
                            <i className="ti ti-circle-filled text-primary me-1 fs-8" />
                            Resigned
                          </span>
                          <span className="fw-bold">{dashboardData.employeesByStatus?.resigned || 0}</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <span>
                            <i className="ti ti-circle-filled text-danger me-1 fs-8" />
                            Terminated
                          </span>
                          <span className="fw-bold">{dashboardData.employeesByStatus?.terminated || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* /Employee Distribution Section */}

          {/* TIER 2: CRITICAL CAPACITY - Resource Allocation */}
          <div className="row">
            <div className="col-12 d-flex">
              <div className="card flex-fill">
                <div className="card-header">
                  <h5>
                    <i className="ti ti-users text-info me-2"></i>
                    Resource Allocation
                    <span className="badge badge-soft-info ms-2 fs-10">Capacity</span>
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-md-3 col-sm-6">
                      <div className="border rounded p-3 text-center bg-success-transparent">
                        <h3 className="text-success mb-1">{dashboardData.resourceStats?.allocatedResources || 0}</h3>
                        <p className="mb-0 text-muted">Allocated Resources</p>
                      </div>
                    </div>
                    <div className="col-md-3 col-sm-6">
                      <div className="border rounded p-3 text-center bg-primary-transparent">
                        <h3 className="text-primary mb-1">{dashboardData.resourceStats?.availableResources || 0}</h3>
                        <p className="mb-0 text-muted">Available Resources</p>
                      </div>
                    </div>
                    <div className="col-md-3 col-sm-6">
                      <div className="border rounded p-3 text-center bg-danger-transparent">
                        <h3 className="text-danger mb-1">{dashboardData.resourceStats?.overAllocated || 0}</h3>
                        <p className="mb-0 text-muted">Over Allocated</p>
                      </div>
                    </div>
                    <div className="col-md-3 col-sm-6">
                      <div className="border rounded p-3 text-center bg-info-transparent">
                        <h3 className="text-info mb-1">{dashboardData.resourceStats?.averageTeamSize || 0}</h3>
                        <p className="mb-0 text-muted">Avg Team Size</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* /TIER 2: Resource Allocation */}

          

          {/* TIER 3: COMPLIANCE - Policy & Holiday Overview */}
          <div className="row">
            <div className="col-xl-6 d-flex">
              <div className="card flex-fill">
                <div className="card-header">
                  <h5>Policy Overview</h5>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-6">
                      <div className="border rounded p-3 text-center bg-primary-transparent">
                        <h3 className="text-primary mb-1">{dashboardData.policyStats?.totalActivePolicies || 0}</h3>
                        <p className="mb-0 text-muted">Total Active Policies</p>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="border rounded p-3 text-center bg-success-transparent">
                        <h3 className="text-success mb-1">{dashboardData.policyStats?.policiesCreatedLast30Days || 0}</h3>
                        <p className="mb-0 text-muted">Created (Last 30 Days)</p>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="border rounded p-3 text-center bg-info-transparent">
                        <h3 className="text-info mb-1">{dashboardData.policyStats?.policiesAppliedToAll || 0}</h3>
                        <p className="mb-0 text-muted">Applied to All</p>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="border rounded p-3 text-center bg-warning-transparent">
                        <h3 className="text-warning mb-1">{dashboardData.policyStats?.policiesSelective || 0}</h3>
                        <p className="mb-0 text-muted">Selective Assignment</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-6 d-flex">
              <div className="card flex-fill">
                <div className="card-header">
                  <h5>Holiday Overview</h5>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-4">
                      <div className="border rounded p-3 text-center bg-primary-transparent">
                        <h3 className="text-primary mb-1">{dashboardData.holidayStats?.totalHolidays || 0}</h3>
                        <p className="mb-0 text-muted fs-12">Total Holidays</p>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="border rounded p-3 text-center bg-success-transparent">
                        <h3 className="text-success mb-1">{dashboardData.holidayStats?.upcomingHolidays || 0}</h3>
                        <p className="mb-0 text-muted fs-12">Upcoming</p>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="border rounded p-3 text-center bg-info-transparent">
                        <h3 className="text-info mb-1">{dashboardData.holidayStats?.holidayTypesCount || 0}</h3>
                        <p className="mb-0 text-muted fs-12">Holiday Types</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* /TIER 3: Policy & Holiday */}

          {/* TIER 4: BUSINESS ALIGNMENT - Projects Overview */}
          <div className="row">
            <div className="col-xl-6 d-flex">
              <div className="card flex-fill">
                <div className="card-header">
                  <h5>Project Overview</h5>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-6">
                      <div className="border rounded p-3 text-center">
                        <h3 className="text-primary mb-1">{dashboardData.projectStats?.totalProjects || 0}</h3>
                        <p className="mb-0 text-muted">Total Projects</p>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="border rounded p-3 text-center">
                        <h3 className="text-success mb-1">{dashboardData.projectStats?.activeProjects || 0}</h3>
                        <p className="mb-0 text-muted">Active Projects</p>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="border rounded p-3 text-center">
                        <h3 className="text-info mb-1">{dashboardData.projectStats?.completedProjects || 0}</h3>
                        <p className="mb-0 text-muted">Completed</p>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="border rounded p-3 text-center">
                        <h3 className="text-warning mb-1">{dashboardData.projectStats?.onHoldProjects || 0}</h3>
                        <p className="mb-0 text-muted">On Hold</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-6 d-flex">
              <div className="card flex-fill">
                <div className="card-header pb-2 d-flex align-items-center justify-content-between flex-wrap">
                  <h5 className="mb-2">Department-wise Projects</h5>
                </div>
                <div className="card-body">
                  {dashboardData.departmentWiseProjects && dashboardData.departmentWiseProjects.length > 0 ? (
                    <ReactApexChart
                      id="dept-projects"
                      options={deptProjectOptions}
                      series={deptProjectOptions.series}
                      type="bar"
                      height={260}
                    />
                  ) : (
                    <div className="text-center py-5">
                      <p className="text-muted">No department project data</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* /TIER 4: Projects */}

          {/* TIER 5: ORGANIZATIONAL STRUCTURE - Department & Designation Overview */}
          <div className="row">
            <div className="col-xl-6 d-flex">
              <div className="card flex-fill">
                <div className="card-header">
                  <h5>Department Overview</h5>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-6">
                      <div className="border rounded p-3 text-center">
                        <h3 className="text-primary mb-1">{dashboardData.departmentStats?.totalDepartments || 0}</h3>
                        <p className="mb-0 text-muted">Total Departments</p>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="border rounded p-3 text-center">
                        <h3 className="text-success mb-1">{dashboardData.departmentStats?.activeDepartments || 0}</h3>
                        <p className="mb-0 text-muted">Active Departments</p>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="border rounded p-3 text-center">
                        <h3 className="text-warning mb-1">{dashboardData.departmentStats?.inactiveDepartments || 0}</h3>
                        <p className="mb-0 text-muted">Inactive Departments</p>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="border rounded p-3 text-center">
                        <h3 className="text-info mb-1">{dashboardData.departmentStats?.recentlyAdded || 0}</h3>
                        <p className="mb-0 text-muted">Recently Added (30 days)</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-6 d-flex">
              <div className="card flex-fill">
                <div className="card-header">
                  <h5>Designation Overview</h5>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-6">
                      <div className="border rounded p-3 text-center">
                        <h3 className="text-primary mb-1">{dashboardData.designationStats?.totalDesignations || 0}</h3>
                        <p className="mb-0 text-muted">Total Designations</p>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="border rounded p-3 text-center">
                        <h3 className="text-success mb-1">{dashboardData.designationStats?.activeDesignations || 0}</h3>
                        <p className="mb-0 text-muted">Active Designations</p>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="border rounded p-3 text-center">
                        <h3 className="text-warning mb-1">{dashboardData.designationStats?.inactiveDesignations || 0}</h3>
                        <p className="mb-0 text-muted">Inactive Designations</p>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="border rounded p-3 text-center">
                        <h3 className="text-info mb-1">
                          {dashboardData.designationStats?.departmentWiseCount?.length || 0}
                        </h3>
                        <p className="mb-0 text-muted">Departments Covered</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* /TIER 5: Department & Designation Overview */}
        </div>
        <Footer />
      </div>
    </>
  );
};

export default HRDashboard;