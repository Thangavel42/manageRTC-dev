import { useUser } from "@clerk/clerk-react";
import jsPDF from "jspdf";
import { Calendar } from "primereact/calendar";
import { Chart } from "primereact/chart";
import { Tooltip } from "primereact/tooltip";
import { Nullable } from "primereact/ts-helpers";
import { useEffect, useState } from "react";
import ReactApexChart from "react-apexcharts";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";
import CollapseHeader from "../../../core/common/collapse-header/collapse-header";
import Footer from "../../../core/common/footer";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import { all_routes } from "../../router/all_routes";
// REST API Hook for HR Dashboard
import { useHRDashboardREST } from "../../../hooks/useHRDashboardREST";
// REST API Hook for user profile
import { useUserProfileREST } from "../../../hooks/useUserProfileREST";
// Role-Based Components
import { RoleBasedRenderer, HROnly } from "../../../core/components/RoleBasedRenderer";
import ErrorBoundary from "../../../core/components/ErrorBoundary";
import { PageLoading, CardSkeleton } from "../../../core/components/LoadingStates";

const HRDashboard = () => {
  const routes = all_routes;
  const { user } = useUser();
  const [date, setDate] = useState(new Date());
  const [miniCalendarDate, setMiniCalendarDate] = useState<Nullable<Date>>(null);

  // REST API Hook for HR Dashboard
  const {
    dashboardData,
    loading,
    error,
    fetchDashboardStats
  } = useHRDashboardREST();

  // REST API Hook for current user profile (for avatar display)
  const { profile } = useUserProfileREST();

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
  };

  const getUserName = () => {
    // Use profile data from REST API first, then fallback to Clerk user
    if (profile) {
      const firstName = (profile as any).firstName;
      const lastName = (profile as any).lastName;
      if (firstName || lastName) {
        return `${firstName || ""} ${lastName || ""}`.trim();
      }
    }
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

  // Helper function to get days until a date from selected date
  const getDaysUntil = (dateStr: string, selectedDate: Date | null) => {
    const baseDate = selectedDate || new Date();
    const base = new Date(baseDate);
    base.setHours(0, 0, 0, 0);

    const eventDate = new Date(dateStr);
    eventDate.setHours(0, 0, 0, 0);

    const diffTime = eventDate.getTime() - base.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  };

  // Helper function to check if two dates match by day and month (ignoring year)
  const isSameDayAndMonth = (date1: Date, date2: Date): boolean => {
    return date1.getDate() === date2.getDate() && date1.getMonth() === date2.getMonth();
  };

  // Helper function to get employee events for selected date
  const getEmployeeEventsForDate = (selectedDate: Date | null) => {
    const events: Array<{
      type: 'birthday' | 'anniversary' | 'birthday-reminder' | 'anniversary-reminder' | 'resignation' | 'termination' | 'promotion' | 'notice-period-end';
      employee?: any;
      data?: any;
      daysUntil?: number;
      message: string;
    }> = [];

    const checkDate = selectedDate || new Date();
    const check = new Date(checkDate);
    check.setHours(0, 0, 0, 0);
    const checkYear = check.getFullYear();

    // Check birthdays (Active and On Notice employees only)
    if (dashboardData?.employeeBirthdays) {
      dashboardData?.employeeBirthdays?.forEach(birthday => {
        // Birthdays are for Active and On Notice employees
        if (birthday.status !== "Active" && birthday.status !== "On Notice") {
          return; // Skip employees with other statuses
        }

        // Don't show birthday if checking a year before birth year
        if (checkYear < birthday.birthYear) {
          return;
        }

        const birthdayDate = new Date(birthday.date);
        birthdayDate.setHours(0, 0, 0, 0);

        // Check if selected date matches birthday (by day and month, ignoring year)
        // This allows viewing birthdays from any year
        const isBirthdayMatch = isSameDayAndMonth(check, birthdayDate);

        if (isBirthdayMatch) {
          // This is the actual birthday date
          events.push({
            type: 'birthday',
            employee: birthday,
            message: `Today is ${birthday.firstName} ${birthday.lastName}'s (${birthday.employeeId}) birthday. Wishing them a wonderful year ahead! 🎉`
          });
        } else {
          // Check for reminders based on days until (only for future dates)
          const daysUntil = getDaysUntil(birthday.date, selectedDate);

          // 1 day reminder (tomorrow)
          if (daysUntil === 1) {
            const dateStr = birthdayDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            events.push({
              type: 'birthday-reminder',
              employee: birthday,
              daysUntil: 1,
              message: `Reminder: ${birthday.firstName} ${birthday.lastName} (${birthday.employeeId}) celebrates their birthday tomorrow (${dateStr}). Don't forget to send your wishes!`
            });
          }
          // 7 days reminder
          else if (daysUntil === 7) {
            const dateStr = birthdayDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            events.push({
              type: 'birthday-reminder',
              employee: birthday,
              daysUntil: 7,
              message: `Reminder: ${birthday.firstName} ${birthday.lastName} (${birthday.employeeId}) has a birthday coming up in 7 days on ${dateStr}. You may plan wishes or celebrations.`
            });
          }
        }
      });
    }

    // Check anniversaries (ONLY Active employees)
    if (dashboardData?.employeeAnniversaries) {
      dashboardData?.employeeAnniversaries?.forEach(anniversary => {
        // Anniversaries are ONLY for Active employees (already filtered in backend)
        if (anniversary.status !== "Active") {
          return; // Extra safety check - skip non-Active employees
        }

        // Year validation based on event type
        if (anniversary.type === 'joined') {
          // "Joined" events only show in the joining year
          if (checkYear !== anniversary.joiningYear) {
            return;
          }
        } else if (anniversary.type === 'anniversary') {
          // Work anniversaries only show after joining year
          if (checkYear <= anniversary.joiningYear) {
            return;
          }
        }

        const anniversaryDate = new Date(anniversary.date);
        anniversaryDate.setHours(0, 0, 0, 0);

        // Check if selected date matches anniversary (by day and month, ignoring year)
        const isAnniversaryMatch = isSameDayAndMonth(check, anniversaryDate);

        if (isAnniversaryMatch) {
          // This is the actual date
          if (anniversary.type === 'joined') {
            // Employee joining day
            events.push({
              type: 'anniversary',
              employee: anniversary,
              message: `${anniversary.firstName} ${anniversary.lastName} (${anniversary.employeeId}) joined the company Today. Welcome to the team! 🎉`
            });
          } else {
            // Work anniversary
            events.push({
              type: 'anniversary',
              employee: anniversary,
              message: `${anniversary.firstName} ${anniversary.lastName} (${anniversary.employeeId}) is celebrating their work anniversary today (${anniversary.yearsWithCompany} ${anniversary.yearsWithCompany === 1 ? 'year' : 'years'} with the company).`
            });
          }
        } else {
          // Check for reminders based on days until (only for actual anniversaries, not joining day)
          if (anniversary.type === 'anniversary') {
            const daysUntil = getDaysUntil(anniversary.date, selectedDate);

            // 30 days reminder
            if (daysUntil === 30) {
              events.push({
                type: 'anniversary-reminder',
                employee: anniversary,
                daysUntil: 30,
                message: `Reminder: ${anniversary.firstName} ${anniversary.lastName} completes ${anniversary.yearsWithCompany + 1} ${anniversary.yearsWithCompany + 1 === 1 ? 'year' : 'years'} with the company in 30 days.`
              });
            }
          }
        }
      });
    }

    // Check Resignations
    if (dashboardData?.resignations) {
      dashboardData?.resignations?.forEach(resignation => {
        // Notice Date
        if (resignation.noticeDate && isDateMatch(resignation.noticeDate, selectedDate)) {
          events.push({
            type: 'resignation',
            data: resignation,
            message: `Employee (${resignation.employeeId}) submitted resignation notice today.`
          });
        }

        // Resignation Date
        if (resignation.resignationDate && isDateMatch(resignation.resignationDate, selectedDate)) {
          events.push({
            type: 'resignation',
            data: resignation,
            message: `Employee (${resignation.employeeId}) resignation is effective today.`
          });
        }

        // Last Working Day / Notice Period End
        if (resignation.lastWorkingDay && isDateMatch(resignation.lastWorkingDay, selectedDate)) {
          events.push({
            type: 'notice-period-end',
            data: resignation,
            message: `Employee (${resignation.employeeId}) last working day is today. End of notice period.`
          });
        }
      });
    }

    // Check Terminations
    if (dashboardData?.terminations) {
      dashboardData?.terminations?.forEach(termination => {
        if (termination.terminationDate && isDateMatch(termination.terminationDate, selectedDate)) {
          const typeText = termination.terminationType ? ` (${termination.terminationType})` : '';
          events.push({
            type: 'termination',
            data: termination,
            message: `Employee (${termination.employeeId}) termination${typeText} is effective today.`
          });
        }
      });
    }

    // Check Promotions
    if (dashboardData?.promotions) {
      dashboardData?.promotions?.forEach(promotion => {
        if (promotion.promotionDate && isDateMatch(promotion.promotionDate, selectedDate)) {
          events.push({
            type: 'promotion',
            data: promotion,
            message: `Employee (${promotion.employeeId}) promotion is effective today${promotion.fromDesignation && promotion.toDesignation ? ` (${promotion.fromDesignation} → ${promotion.toDesignation})` : ''}.`
          });
        }
      });
    }

    return events;
  };

  // Helper function to check if a date is a holiday and return holiday info
  // Handles repeating yearly holidays by matching day+month only
  const getHolidayForDate = (date: Date) => {
    if (!dashboardData?.allActiveHolidays) return null;

    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    if (!dashboardData?.allActiveHolidays) return null;
    return dashboardData?.allActiveHolidays?.find(holiday => {
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

  // Helper function to check if a date is a birthday (Active and On Notice employees only)
  const getBirthdayForDate = (date: Date) => {
    if (!dashboardData?.employeeBirthdays) return null;

    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    const checkYear = checkDate.getFullYear();

    if (!dashboardData?.employeeBirthdays) return null;
    return dashboardData?.employeeBirthdays?.find(birthday => {
      // Only show birthdays for Active and On Notice employees
      if (birthday.status !== "Active" && birthday.status !== "On Notice") {
        return false;
      }

      // Don't show birthday if checking a year before birth year
      if (checkYear < birthday.birthYear) {
        return false;
      }

      const birthdayDate = new Date(birthday.date);
      birthdayDate.setHours(0, 0, 0, 0);

      // Match day and month only (birthdays repeat yearly)
      return (
        birthdayDate.getDate() === checkDate.getDate() &&
        birthdayDate.getMonth() === checkDate.getMonth()
      );
    });
  };

  // Date template for calendar to highlight holidays and birthdays
  const dateTemplate = (date: any) => {
    // PrimeReact Calendar passes {day, month, year, ...} object
    // Construct a proper Date object
    const fullDate = new Date(date.year, date.month, date.day);
    const holiday = getHolidayForDate(fullDate);
    const birthday = getBirthdayForDate(fullDate);

    // Create unique ID for tooltip target
    const dateId = `cal-date-${date.year}-${date.month}-${date.day}`;

    // Priority: Birthday > Holiday
    if (birthday) {
      return (
        <>
          <div
            className="p-highlight calendar-birthday-date"
            data-pr-tooltip={`🎂 ${birthday.firstName} ${birthday.lastName}'s Birthday`}
            data-pr-position="top"
            data-pr-id={`birthday-${date.year}-${date.month}-${date.day}`}
            style={{
              backgroundColor: "#fff0f6",
              borderRadius: "8px",
              fontWeight: "600",
              color: "#eb2f96",
              width: "2.5rem",
              height: "2.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #ffadd2",
              cursor: "default",
              transition: "all 0.2s ease",
              userSelect: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.1)";
              e.currentTarget.style.backgroundColor = "#ffd6e7";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.backgroundColor = "#fff0f6";
            }}
            onClick={(e) => {
              // Trigger mouseLeave to hide tooltip naturally
              const mouseLeaveEvent = new MouseEvent('mouseleave', {
                view: window,
                bubbles: true,
                cancelable: true
              });
              e.currentTarget.dispatchEvent(mouseLeaveEvent);
              // Blur to ensure tooltip hides
              e.currentTarget.blur();
            }}
          >
            {date.day}
          </div>
        </>
      );
    }

    if (holiday) {
      return (
        <>
          <div
            className="p-highlight calendar-holiday-date"
            data-pr-tooltip={`${holiday.title} - ${holiday.holidayTypeName}`}
            data-pr-position="top"
            data-pr-id={`holiday-${date.year}-${date.month}-${date.day}`}
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
              cursor: "default",
              transition: "all 0.2s ease",
              userSelect: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.1)";
              e.currentTarget.style.backgroundColor = "#bae0ff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.backgroundColor = "#e7f3ff";
            }}
            onClick={(e) => {
              // Trigger mouseLeave to hide tooltip naturally
              const mouseLeaveEvent = new MouseEvent('mouseleave', {
                view: window,
                bubbles: true,
                cancelable: true
              });
              e.currentTarget.dispatchEvent(mouseLeaveEvent);
              // Blur to ensure tooltip hides
              e.currentTarget.blur();
            }}
          >
            {date.day}
          </div>
        </>
      );
    }

    return date.day;
  };

  // Fetch dashboard data when date changes
  useEffect(() => {
    const currentYear = date.getFullYear();
    console.log(`[HR Dashboard] Fetching data for year: ${currentYear}`);
    fetchDashboardStats({ year: currentYear });
  }, [date]);

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
      if (dashboardData?.stats) {
        doc.text(`Total Employees: ${dashboardData?.stats?.totalEmployees || 0}`, 20, yPosition);
        yPosition += 8;
        doc.text(`Active Employees: ${dashboardData?.stats?.activeEmployees || 0}`, 20, yPosition);
        yPosition += 8;
        doc.text(`Inactive Employees: ${dashboardData?.stats?.inactiveEmployees || 0}`, 20, yPosition);
        yPosition += 8;
        doc.text(`New Joiners (Last 30 Days): ${dashboardData?.stats?.newJoiners || 0}`, 20, yPosition);
        yPosition += 15;
      }

      // Department & Designation
      if (dashboardData?.departmentStats) {
        doc.setFontSize(16);
        doc.text("Department Statistics", 20, yPosition);
        yPosition += 15;

        doc.setFontSize(10);
        doc.text(`Total Departments: ${dashboardData?.departmentStats?.totalDepartments || 0}`, 20, yPosition);
        yPosition += 8;
        doc.text(`Active Departments: ${dashboardData?.departmentStats?.activeDepartments || 0}`, 20, yPosition);
        yPosition += 8;
        doc.text(`Recently Added: ${dashboardData?.departmentStats?.recentlyAdded || 0}`, 20, yPosition);
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
      if (dashboardData?.stats) {
        const employeeData: (string | number)[][] = [
          ["Employee Statistics", ""],
          ["Total Employees", dashboardData?.stats?.totalEmployees || 0],
          ["Active Employees", dashboardData?.stats?.activeEmployees || 0],
          ["Inactive Employees", dashboardData?.stats?.inactiveEmployees || 0],
          ["New Joiners (Last 30 Days)", dashboardData?.stats?.newJoiners || 0],
          ["Total Resignations", dashboardData?.stats?.totalResignations || 0],
          ["Resignations (Last 30 Days)", dashboardData?.stats?.resignationsLast30Days || 0],
          ["Total Terminations", dashboardData?.stats?.totalTerminations || 0],
          ["Terminations (Last 30 Days)", dashboardData?.stats?.terminationsLast30Days || 0],
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
          dashboardData?.employeesByDepartment?.map((dept) => ({
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
          dashboardData?.employeesByStatus?.active || 0,
          dashboardData?.employeesByStatus?.inactive || 0,
          dashboardData?.employeesByStatus?.onNotice || 0,
          dashboardData?.employeesByStatus?.resigned || 0,
          dashboardData?.employeesByStatus?.terminated || 0,
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
        data: dashboardData?.departmentWiseProjects?.map((dept) => dept.count) || [],
      },
    ],
    xaxis: {
      categories: dashboardData?.departmentWiseProjects?.map((dept) => dept.department) || [],
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
    labels: dashboardData?.trainingDistribution?.map((t) => t.type) || ["No Data"],
    datasets: [
      {
        label: "Training Distribution",
        data: dashboardData?.trainingDistribution?.map((t) => t.count) || [0],
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
    return <PageLoading message="Loading HR Dashboard..." />;
  }

  // Show loading state if data hasn't been fetched yet
  if (!dashboardData && !error) {
    return <PageLoading message="Loading dashboard data..." />;
  }

  // Show error state if there's an error or no data
  if (!dashboardData) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="alert alert-danger">
            <h5>Unable to load dashboard</h5>
            <p>Please refresh the page or try again later.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <HROnly>
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
                  {(() => {
                    // Determine avatar source based on role (case-insensitive)
                    let avatarSrc: string | undefined | null;
                    const userRole = profile?.role?.toLowerCase();
                    if (userRole === 'admin') {
                      // Admin uses companyLogo
                      avatarSrc = (profile as any).companyLogo;
                    } else if (userRole === 'hr' || userRole === 'employee') {
                      // HR and Employee use profileImage
                      avatarSrc = (profile as any).profileImage;
                    }

                    // Ensure path starts with / if it's a relative path
                    if (avatarSrc && !avatarSrc.startsWith('/') && !avatarSrc.startsWith('http')) {
                      avatarSrc = `/${avatarSrc}`;
                    }

                    const finalSrc = avatarSrc || user?.imageUrl || '/assets/img/profiles/profile.png';

                    return finalSrc ? (
                      <img
                        src={finalSrc}
                        className="rounded-circle"
                        alt="Profile"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/assets/img/profiles/profile.png";
                        }}
                      />
                    ) : (
                      <ImageWithBasePath
                        src="assets/img/profiles/profile.png"
                        alt="Profile"
                        className="rounded-circle"
                      />
                    );
                  })()}
                </span>
                <div className="ms-3">
                  <h3 className="mb-2">
                    Welcome Back, {getUserName()}
                  </h3>
                  <p>
                    You have{" "}
                    <span className="text-primary text-decoration-underline">
                      {dashboardData?.pendingItems?.approvals || 0}
                    </span>{" "}
                    Pending Approvals &amp;{" "}
                    <span className="text-primary text-decoration-underline">
                      {dashboardData?.pendingItems?.leaveRequests || 0}
                    </span>{" "}
                    Leave Requests
                  </p>
                </div>
              </div>
              <div className="d-flex align-items-center flex-wrap mb-1">
                <Link
                  to="/leaves"
                  className="btn btn-primary btn-md mb-2"
                >
                  <i className="ti ti-square-rounded-plus me-1" />
                  Manage Leaves
                </Link>
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
                      <h5>{dashboardData?.stats?.totalEmployees || 0}</h5>
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
                      <h5>{dashboardData?.stats?.activeEmployees || 0}</h5>
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
                      <h5>{dashboardData?.stats?.inactiveEmployees || 0}</h5>
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
                      <h5>{dashboardData?.stats?.newJoiners || 0}</h5>
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
                  <h3 className="mb-3">{dashboardData?.stats?.totalResignations || 0}</h3>
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
                  <h3 className="mb-3">{dashboardData?.stats?.resignationsLast30Days || 0}</h3>
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
                  <h3 className="mb-3">{dashboardData?.stats?.totalTerminations || 0}</h3>
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
                  <h3 className="mb-3">{dashboardData?.stats?.terminationsLast30Days || 0}</h3>
                  <Link to={routes.termination} className="link-default">
                    View Recent
                  </Link>
                </div>
              </div>
            </div>
          </div>
          {/* /TIER 1: Employee Lifecycle Overview */}

          {/* TIER 2: ATTENDANCE & RECRUITMENT */}
          <div className="row">
            {/* Attendance Overview */}
            <div className="col-xxl-4 col-xl-6 d-flex">
              <div className="card flex-fill">
                <div className="card-header pb-2 d-flex align-items-center justify-content-between flex-wrap">
                  <h5 className="mb-2">Attendance Overview</h5>
                </div>
                <div className="card-body">
                  <div className="chartjs-wrapper-demo position-relative mb-4">
                    <Chart
                      type="doughnut"
                      data={{
                        labels: ["Late", "Present", "Permission", "Absent"],
                        datasets: [
                          {
                            label: "Attendance",
                            data: [
                              dashboardData?.attendanceOverview?.late || 0,
                              dashboardData?.attendanceOverview?.present || 0,
                              dashboardData?.attendanceOverview?.permission || 0,
                              dashboardData?.attendanceOverview?.absent || 0,
                            ],
                            backgroundColor: ["#0C4B5E", "#03C95A", "#FFC107", "#E70D0D"],
                            borderWidth: 5,
                            borderRadius: 10,
                            borderColor: "#fff",
                            hoverBorderWidth: 0,
                            cutout: "60%",
                          },
                        ],
                      }}
                      options={{
                        rotation: -100,
                        circumference: 200,
                        layout: {
                          padding: {
                            top: -20,
                            bottom: -20,
                          },
                        },
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: false,
                          },
                        },
                      }}
                      className="w-full attendence-chart md:w-30rem"
                    />
                    <div className="position-absolute text-center attendance-canvas">
                      <p className="fs-13 mb-1">Total Attendance</p>
                      <h3>{dashboardData?.attendanceOverview?.total || 0}</h3>
                    </div>
                  </div>
                  <h6 className="mb-3">Status</h6>
                  <div className="d-flex align-items-center justify-content-between">
                    <p className="f-13 mb-2">
                      <i className="ti ti-circle-filled text-success me-1" />
                      Present
                    </p>
                    <p className="f-13 fw-medium text-gray-9 mb-2">
                      {dashboardData?.attendanceOverview?.present || 0}
                    </p>
                  </div>
                  <div className="d-flex align-items-center justify-content-between">
                    <p className="f-13 mb-2">
                      <i className="ti ti-circle-filled text-secondary me-1" />
                      Late
                    </p>
                    <p className="f-13 fw-medium text-gray-9 mb-2">
                      {dashboardData?.attendanceOverview?.late || 0}
                    </p>
                  </div>
                  <div className="d-flex align-items-center justify-content-between">
                    <p className="f-13 mb-2">
                      <i className="ti ti-circle-filled text-warning me-1" />
                      Permission
                    </p>
                    <p className="f-13 fw-medium text-gray-9 mb-2">
                      {dashboardData?.attendanceOverview?.permission || 0}
                    </p>
                  </div>
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <p className="f-13 mb-2">
                      <i className="ti ti-circle-filled text-danger me-1" />
                      Absent
                    </p>
                    <p className="f-13 fw-medium text-gray-9 mb-2">
                      {dashboardData?.attendanceOverview?.absent || 0}
                    </p>
                  </div>
                  {dashboardData?.attendanceOverview?.absentees && dashboardData?.attendanceOverview?.absentees.length > 0 && (
                    <div className="bg-light br-5 box-shadow-xs p-2 pb-0 d-flex align-items-center justify-content-between flex-wrap">
                      <div className="d-flex align-items-center">
                        <p className="mb-2 me-2">Total Absenties</p>
                        <div className="avatar-list-stacked avatar-group-sm mb-2">
                          {dashboardData?.attendanceOverview?.absentees
                            .slice(0, 4)
                            .map((absentee) => (
                              <span
                                key={absentee._id}
                                className="avatar avatar-rounded"
                              >
                                <ImageWithBasePath
                                  className="border border-white"
                                  src={absentee.avatar}
                                  alt="img"
                                />
                              </span>
                            ))}
                          {dashboardData?.attendanceOverview?.absentees.length > 4 && (
                            <Link
                              className="avatar bg-primary avatar-rounded text-fixed-white fs-10"
                              to="#"
                            >
                              +{dashboardData?.attendanceOverview?.absentees.length - 4}
                            </Link>
                          )}
                        </div>
                      </div>
                      <Link
                        to="/leaves"
                        className="fs-13 link-primary text-decoration-underline mb-2"
                      >
                        View Details
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* /Attendance Overview */}

            {/* Clock-In/Out */}
            <div className="col-xxl-4 col-xl-6 d-flex">
              <div className="card flex-fill">
                <div className="card-header pb-2 d-flex align-items-center justify-content-between flex-wrap">
                  <h5 className="mb-2">Clock-In/Out</h5>
                </div>
                <div className="card-body">
                  <div>
                    {dashboardData?.clockInOutData && dashboardData?.clockInOutData?.length > 0 ? (
                      dashboardData?.clockInOutData?.slice(0, 3).map((employee, index) => (
                        <div
                          key={employee._id}
                          className={`d-flex align-items-center justify-content-between mb-3 p-2 border ${
                            index === 0 ? "border-dashed" : ""
                          } br-5`}
                        >
                          <div className="d-flex align-items-center">
                            <Link to="#" className="avatar flex-shrink-0">
                              <ImageWithBasePath
                                src={employee.avatar}
                                className="rounded-circle border border-2"
                                alt="img"
                              />
                            </Link>
                            <div className="ms-2">
                              <h6 className="fw-medium mb-1">
                                <Link to="#">{employee.name}</Link>
                              </h6>
                              <p className="fs-13">{employee.position}</p>
                            </div>
                          </div>
                          <div className="text-end">
                            <p className="fs-13 text-gray-9 mb-1">
                              <i className="ti ti-clock me-1 text-info" />
                              {employee.clockIn ? new Date(employee.clockIn).toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                              }) : "--:--"}
                            </p>
                            <p className="fs-13 text-gray-9 mb-1">
                              <i className="ti ti-clock-pause me-1 text-danger" />
                              {employee.clockOut ? new Date(employee.clockOut).toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                              }) : "--:--"}
                            </p>
                            <span className={`badge badge-soft-${
                              employee.status === "present" ? "success" :
                              employee.status === "late" ? "warning" : "danger"
                            } fs-10`}>
                              {employee.hoursWorked ? `${employee.hoursWorked}h` : "In Progress"}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4">
                        <i className="ti ti-clock fs-40 text-muted mb-2"></i>
                        <p className="text-muted">No clock-in records today</p>
                      </div>
                    )}
                  </div>
                  {dashboardData?.clockInOutData && dashboardData?.clockInOutData?.length > 3 && (
                    <Link
                      to="/attendance-employee"
                      className="btn btn-light w-100 mt-2"
                    >
                      View All Clock Records
                    </Link>
                  )}
                </div>
              </div>
            </div>
            {/* /Clock-In/Out */}

            {/* Job Applicants */}
            <div className="col-xxl-4 col-xl-6 d-flex">
              <div className="card flex-fill">
                <div className="card-header pb-2 d-flex align-items-center justify-content-between flex-wrap">
                  <h5 className="mb-2">
                    <i className="ti ti-users-group text-success me-2"></i>
                    Job Applicants
                  </h5>
                  <Link to="/job-list" className="btn btn-sm btn-primary">
                    <i className="ti ti-eye me-1"></i>View All
                  </Link>
                </div>
                <div className="card-body">
                  {dashboardData?.jobApplicants?.openings && dashboardData?.jobApplicants?.openings?.length > 0 && (
                    <div className="mb-3 pb-3 border-bottom">
                      <h6 className="mb-2">Open Positions</h6>
                      <div className="d-flex flex-wrap gap-2">
                        {dashboardData?.jobApplicants?.openings?.slice(0, 3).map((opening) => (
                          <span key={opening._id} className="badge badge-soft-primary">
                            {opening.count} Opening{opening.count > 1 ? "s" : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <h6 className="mb-3">Recent Applicants</h6>
                  <div>
                    {dashboardData?.jobApplicants?.applicants && dashboardData?.jobApplicants?.applicants?.length > 0 ? (
                      dashboardData?.jobApplicants?.applicants?.slice(0, 4).map((applicant) => (
                        <div
                          key={applicant._id}
                          className="d-flex align-items-center justify-content-between mb-3 p-2 border br-5"
                        >
                          <div className="d-flex align-items-center">
                            <Link to="#" className="avatar avatar-md flex-shrink-0">
                              <ImageWithBasePath
                                src={applicant.avatar || "assets/img/profiles/avatar-14.jpg"}
                                className="rounded-circle"
                                alt="img"
                              />
                            </Link>
                            <div className="ms-2">
                              <h6 className="fw-medium mb-1">
                                <Link to="#">{applicant.name}</Link>
                              </h6>
                              <p className="fs-12 text-muted mb-1">{applicant.position}</p>
                              <span className="badge badge-soft-info fs-10">
                                <i className="ti ti-briefcase me-1"></i>
                                {applicant.experience}
                              </span>
                            </div>
                          </div>
                          <div className="text-end">
                            <p className="fs-12 text-muted mb-1">
                              <i className="ti ti-map-pin me-1"></i>
                              {applicant.location}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4">
                        <i className="ti ti-user-search fs-40 text-muted mb-2"></i>
                        <p className="text-muted">No recent applicants</p>
                      </div>
                    )}
                  </div>
                  {dashboardData?.jobApplicants?.applicants && dashboardData?.jobApplicants?.applicants?.length > 4 && (
                    <Link
                      to="/job-applicants"
                      className="btn btn-light w-100 mt-2"
                    >
                      View All Applicants
                    </Link>
                  )}
                </div>
              </div>
            </div>
            {/* /Job Applicants */}
          </div>
          {/* /TIER 2: ATTENDANCE & RECRUITMENT */}

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
                  {/* Tooltips for calendar dates */}
                  <Tooltip
                    target=".calendar-birthday-date"
                    className="calendar-birthday-tooltip"
                    event="hover"
                    position="top"
                    showDelay={300}
                    hideDelay={0}
                    autoHide={true}
                  />
                  <Tooltip
                    target=".calendar-holiday-date"
                    className="calendar-holiday-tooltip"
                    event="hover"
                    position="top"
                    showDelay={300}
                    hideDelay={0}
                    autoHide={true}
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
                    {dashboardData?.upcomingHolidays && dashboardData?.upcomingHolidays?.length > 0 && (
                      <span className="badge badge-success rounded-pill ms-2 fs-10">
                        {dashboardData?.upcomingHolidays?.length}
                      </span>
                    )}
                  </h5>
                </div>
                <div className="card-body">
                  {dashboardData?.upcomingHolidays && dashboardData?.upcomingHolidays?.length > 0 ? (
                    <div style={{ maxHeight: "320px", overflowY: "auto" }}>
                      {dashboardData?.upcomingHolidays?.slice(0, 7).map((holiday) => {
                        // Color rotation for borders
                        const colors = ["purple", "pink", "success", "info", "warning"];
                        const colorIndex = (dashboardData?.upcomingHolidays?.indexOf(holiday) || 0) % colors.length;
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
                    {/* Employee Birthday and Anniversary Events */}
                    {(() => {
                      const employeeEvents = getEmployeeEventsForDate(miniCalendarDate);

                      return employeeEvents.map((event, index) => {
                        if (event.type === 'birthday') {
                          return (
                            <div key={`birthday-${event.employee._id}`} className="border-start border-warning border-3 mb-3 pb-2">
                              <div className="ps-3">
                                <div className="d-flex align-items-start justify-content-between mb-1">
                                  <div className="d-flex align-items-start">
                                    <span className="avatar avatar-xs rounded-circle bg-warning-transparent me-2 mt-1">
                                      <i className="ti ti-cake fs-12"></i>
                                    </span>
                                    <div>
                                      <h6 className="fw-semibold mb-1 fs-13">🎂 Birthday Celebration</h6>
                                      <p className="mb-1 fs-12 text-muted">
                                        {event.message}
                                      </p>
                                      <p className="mb-0 fs-11 text-warning">
                                        <i className="ti ti-gift me-1"></i>Send birthday wishes!
                                      </p>
                                    </div>
                                  </div>
                                  <span className="badge badge-soft-warning fs-10">Today</span>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        if (event.type === 'birthday-reminder') {
                          return (
                            <div key={`birthday-reminder-${event.employee._id}-${event.daysUntil}`} className="border-start border-info border-3 mb-3 pb-2">
                              <div className="ps-3">
                                <div className="d-flex align-items-start justify-content-between mb-1">
                                  <div className="d-flex align-items-start">
                                    <span className="avatar avatar-xs rounded-circle bg-info-transparent me-2 mt-1">
                                      <i className="ti ti-bell fs-12"></i>
                                    </span>
                                    <div>
                                      <h6 className="fw-semibold mb-1 fs-13">🎈 Birthday Reminder</h6>
                                      <p className="mb-1 fs-12 text-muted">
                                        {event.message}
                                      </p>
                                      <p className="mb-0 fs-11 text-info">
                                        <i className="ti ti-calendar-time me-1"></i>Plan ahead for celebrations
                                      </p>
                                    </div>
                                  </div>
                                  <span className="badge badge-soft-info fs-10">{event.daysUntil}d</span>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        if (event.type === 'anniversary') {
                          return (
                            <div key={`anniversary-${event.employee._id}`} className="border-start border-success border-3 mb-3 pb-2">
                              <div className="ps-3">
                                <div className="d-flex align-items-start justify-content-between mb-1">
                                  <div className="d-flex align-items-start">
                                    <span className="avatar avatar-xs rounded-circle bg-success-transparent me-2 mt-1">
                                      <i className="ti ti-trophy fs-12"></i>
                                    </span>
                                    <div>
                                      <h6 className="fw-semibold mb-1 fs-13">🎊 Work Anniversary</h6>
                                      <p className="mb-1 fs-12 text-muted">
                                        {event.message}
                                      </p>
                                      <p className="mb-0 fs-11 text-success">
                                        <i className="ti ti-award me-1"></i>Celebrate their dedication!
                                      </p>
                                    </div>
                                  </div>
                                  <span className="badge badge-soft-success fs-10">Today</span>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        if (event.type === 'anniversary-reminder') {
                          return (
                            <div key={`anniversary-reminder-${event.employee._id}-${event.daysUntil}`} className="border-start border-secondary border-3 mb-3 pb-2">
                              <div className="ps-3">
                                <div className="d-flex align-items-start justify-content-between mb-1">
                                  <div className="d-flex align-items-start">
                                    <span className="avatar avatar-xs rounded-circle bg-secondary-transparent me-2 mt-1">
                                      <i className="ti ti-bell fs-12"></i>
                                    </span>
                                    <div>
                                      <h6 className="fw-semibold mb-1 fs-13">📅 Anniversary Reminder</h6>
                                      <p className="mb-1 fs-12 text-muted">
                                        {event.message}
                                      </p>
                                      <p className="mb-0 fs-11 text-secondary">
                                        <i className="ti ti-calendar-check me-1"></i>Prepare recognition plans
                                      </p>
                                    </div>
                                  </div>
                                  <span className="badge badge-soft-secondary fs-10">{event.daysUntil}d</span>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        if (event.type === 'resignation') {
                          return (
                            <div key={`resignation-${index}`} className="border-start border-warning border-3 mb-3 pb-2">
                              <div className="ps-3">
                                <div className="d-flex align-items-start justify-content-between mb-1">
                                  <div className="d-flex align-items-start">
                                    <span className="avatar avatar-xs rounded-circle bg-warning-transparent me-2 mt-1">
                                      <i className="ti ti-user-x fs-12"></i>
                                    </span>
                                    <div>
                                      <h6 className="fw-semibold mb-1 fs-13">📋 Resignation</h6>
                                      <p className="mb-1 fs-12 text-muted">
                                        {event.message}
                                      </p>
                                      <p className="mb-0 fs-11 text-warning">
                                        <i className="ti ti-clock-pause me-1"></i>Notice period tracking required
                                      </p>
                                    </div>
                                  </div>
                                  <span className="badge badge-soft-warning fs-10">Resignation</span>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        if (event.type === 'notice-period-end') {
                          return (
                            <div key={`notice-period-end-${index}`} className="border-start border-danger border-3 mb-3 pb-2">
                              <div className="ps-3">
                                <div className="d-flex align-items-start justify-content-between mb-1">
                                  <div className="d-flex align-items-start">
                                    <span className="avatar avatar-xs rounded-circle bg-danger-transparent me-2 mt-1">
                                      <i className="ti ti-hourglass-empty fs-12"></i>
                                    </span>
                                    <div>
                                      <h6 className="fw-semibold mb-1 fs-13">⚠️ Last Working Day</h6>
                                      <p className="mb-1 fs-12 text-muted">
                                        {event.message}
                                      </p>
                                      <p className="mb-0 fs-11 text-danger">
                                        <i className="ti ti-alert-triangle me-1"></i>Complete exit formalities
                                      </p>
                                    </div>
                                  </div>
                                  <span className="badge badge-soft-danger fs-10">Final Day</span>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        if (event.type === 'termination') {
                          return (
                            <div key={`termination-${index}`} className="border-start border-danger border-3 mb-3 pb-2">
                              <div className="ps-3">
                                <div className="d-flex align-items-start justify-content-between mb-1">
                                  <div className="d-flex align-items-start">
                                    <span className="avatar avatar-xs rounded-circle bg-danger-transparent me-2 mt-1">
                                      <i className="ti ti-ban fs-12"></i>
                                    </span>
                                    <div>
                                      <h6 className="fw-semibold mb-1 fs-13">🚫 Termination</h6>
                                      <p className="mb-1 fs-12 text-muted">
                                        {event.message}
                                      </p>
                                      <p className="mb-0 fs-11 text-danger">
                                        <i className="ti ti-file-x me-1"></i>Process final settlement
                                      </p>
                                    </div>
                                  </div>
                                  <span className="badge badge-soft-danger fs-10">Termination</span>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        if (event.type === 'promotion') {
                          return (
                            <div key={`promotion-${index}`} className="border-start border-success border-3 mb-3 pb-2">
                              <div className="ps-3">
                                <div className="d-flex align-items-start justify-content-between mb-1">
                                  <div className="d-flex align-items-start">
                                    <span className="avatar avatar-xs rounded-circle bg-success-transparent me-2 mt-1">
                                      <i className="ti ti-trending-up fs-12"></i>
                                    </span>
                                    <div>
                                      <h6 className="fw-semibold mb-1 fs-13">🎉 Promotion</h6>
                                      <p className="mb-1 fs-12 text-muted">
                                        {event.message}
                                      </p>
                                      <p className="mb-0 fs-11 text-success">
                                        <i className="ti ti-crown me-1"></i>Update employee records
                                      </p>
                                    </div>
                                  </div>
                                  <span className="badge badge-soft-success fs-10">Promotion</span>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        return null;
                      });
                    })()}

                    {/* Notice Period Ending Events */}
                    {dashboardData?.stats?.resignationsLast30Days && dashboardData?.stats?.resignationsLast30Days > 0 ? (
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
                                  {dashboardData?.stats?.resignationsLast30Days} employee(s) have notice periods ending soon
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

                    {/* Today's Holidays */}
                    {dashboardData?.todaysHolidays && dashboardData?.todaysHolidays?.length > 0 && (
                      dashboardData?.todaysHolidays?.map(holiday => (
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
                    {dashboardData?.upcomingHolidays && dashboardData?.upcomingHolidays?.length > 0 && (() => {
                      const selectedDate = miniCalendarDate || new Date();
                      const selected = new Date(selectedDate);
                      selected.setHours(0, 0, 0, 0);

                      // Check for holiday on exact date (handles repeating holidays)
                      const holidayOnDate = dashboardData?.upcomingHolidays?.find(holiday => {
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

                      const upcomingFromDate = dashboardData?.upcomingHolidays?.filter(holiday => {
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
                    {dashboardData?.resourceStats?.overAllocated && dashboardData?.resourceStats?.overAllocated > 0 ? (
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
                                  {dashboardData?.resourceStats?.overAllocated} resource(s) over-allocated
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

                    {/* Empty State - Only when truly no events */}
                    {!dashboardData?.stats?.resignationsLast30Days &&
                     !dashboardData?.stats?.newJoiners &&
                     !dashboardData?.trainingStats?.activeTrainings &&
                     !dashboardData?.projectStats?.activeProjects &&
                     (() => {
                       const selectedDate = miniCalendarDate || new Date();
                       const selected = new Date(selectedDate);
                       selected.setHours(0, 0, 0, 0);

                       const hasHolidayOnDate = dashboardData?.upcomingHolidays?.some(holiday => {
                         const holidayDate = new Date(holiday.date);
                         holidayDate.setHours(0, 0, 0, 0);
                         return holidayDate.getTime() === selected.getTime();
                       });

                       return !hasHolidayOnDate;
                     })() &&
                     !dashboardData?.resourceStats?.overAllocated &&
                     !dashboardData?.policyStats?.policiesCreatedLast30Days ? (
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
                  {dashboardData?.recentActivities && dashboardData?.recentActivities?.length > 0 ? (
                    <div className="activity-feed" style={{ maxHeight: "450px", overflowY: "auto" }}>
                      {dashboardData?.recentActivities?.slice(0, 10).map((activity) => (
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
                    {dashboardData?.trainingDistribution && dashboardData?.trainingDistribution?.length > 0 ? (
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
                            {dashboardData?.trainingDistribution?.map((training, index) => {
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
                          <h5 className="text-primary mb-1">{dashboardData?.trainingStats?.totalTrainings || 0}</h5>
                          <p className="mb-0 text-muted fs-12">Total</p>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="border rounded p-2 text-center">
                          <h5 className="text-success mb-1">{dashboardData?.trainingStats?.activeTrainings || 0}</h5>
                          <p className="mb-0 text-muted fs-12">Active</p>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="border rounded p-2 text-center">
                          <h5 className="text-info mb-1">{dashboardData?.trainingStats?.totalTrainers || 0}</h5>
                          <p className="mb-0 text-muted fs-12">Trainers</p>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="border rounded p-2 text-center">
                          <h5 className="text-warning mb-1">{dashboardData?.trainingStats?.employeesInTraining || 0}</h5>
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
                  {dashboardData?.employeesByDepartment && dashboardData?.employeesByDepartment?.length > 0 ? (
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
                          <span className="fw-bold">{dashboardData?.employeesByStatus?.active || 0}</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <span>
                            <i className="ti ti-circle-filled text-warning me-1 fs-8" />
                            Inactive
                          </span>
                          <span className="fw-bold">{dashboardData?.employeesByStatus?.inactive || 0}</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <span>
                            <i className="ti ti-circle-filled text-info me-1 fs-8" />
                            On Notice
                          </span>
                          <span className="fw-bold">{dashboardData?.employeesByStatus?.onNotice || 0}</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <span>
                            <i className="ti ti-circle-filled text-primary me-1 fs-8" />
                            Resigned
                          </span>
                          <span className="fw-bold">{dashboardData?.employeesByStatus?.resigned || 0}</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <span>
                            <i className="ti ti-circle-filled text-danger me-1 fs-8" />
                            Terminated
                          </span>
                          <span className="fw-bold">{dashboardData?.employeesByStatus?.terminated || 0}</span>
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
                        <h3 className="text-success mb-1">{dashboardData?.resourceStats?.allocatedResources || 0}</h3>
                        <p className="mb-0 text-muted">Allocated Resources</p>
                      </div>
                    </div>
                    <div className="col-md-3 col-sm-6">
                      <div className="border rounded p-3 text-center bg-primary-transparent">
                        <h3 className="text-primary mb-1">{dashboardData?.resourceStats?.availableResources || 0}</h3>
                        <p className="mb-0 text-muted">Available Resources</p>
                      </div>
                    </div>
                    <div className="col-md-3 col-sm-6">
                      <div className="border rounded p-3 text-center bg-danger-transparent">
                        <h3 className="text-danger mb-1">{dashboardData?.resourceStats?.overAllocated || 0}</h3>
                        <p className="mb-0 text-muted">Over Allocated</p>
                      </div>
                    </div>
                    <div className="col-md-3 col-sm-6">
                      <div className="border rounded p-3 text-center bg-info-transparent">
                        <h3 className="text-info mb-1">{dashboardData?.resourceStats?.averageTeamSize || 0}</h3>
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
                        <h3 className="text-primary mb-1">{dashboardData?.policyStats?.totalActivePolicies || 0}</h3>
                        <p className="mb-0 text-muted">Total Active Policies</p>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="border rounded p-3 text-center bg-success-transparent">
                        <h3 className="text-success mb-1">{dashboardData?.policyStats?.policiesCreatedLast30Days || 0}</h3>
                        <p className="mb-0 text-muted">Created (Last 30 Days)</p>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="border rounded p-3 text-center bg-info-transparent">
                        <h3 className="text-info mb-1">{dashboardData?.policyStats?.policiesAppliedToAll || 0}</h3>
                        <p className="mb-0 text-muted">Applied to All</p>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="border rounded p-3 text-center bg-warning-transparent">
                        <h3 className="text-warning mb-1">{dashboardData?.policyStats?.policiesSelective || 0}</h3>
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
                        <h3 className="text-primary mb-1">{dashboardData?.holidayStats?.totalHolidays || 0}</h3>
                        <p className="mb-0 text-muted fs-12">Total Holidays</p>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="border rounded p-3 text-center bg-success-transparent">
                        <h3 className="text-success mb-1">{dashboardData?.holidayStats?.upcomingHolidays || 0}</h3>
                        <p className="mb-0 text-muted fs-12">Upcoming</p>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="border rounded p-3 text-center bg-info-transparent">
                        <h3 className="text-info mb-1">{dashboardData?.holidayStats?.holidayTypesCount || 0}</h3>
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
                        <h3 className="text-primary mb-1">{dashboardData?.projectStats?.totalProjects || 0}</h3>
                        <p className="mb-0 text-muted">Total Projects</p>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="border rounded p-3 text-center">
                        <h3 className="text-success mb-1">{dashboardData?.projectStats?.activeProjects || 0}</h3>
                        <p className="mb-0 text-muted">Active Projects</p>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="border rounded p-3 text-center">
                        <h3 className="text-info mb-1">{dashboardData?.projectStats?.completedProjects || 0}</h3>
                        <p className="mb-0 text-muted">Completed</p>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="border rounded p-3 text-center">
                        <h3 className="text-warning mb-1">{dashboardData?.projectStats?.onHoldProjects || 0}</h3>
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
                  {dashboardData?.departmentWiseProjects && dashboardData?.departmentWiseProjects?.length > 0 ? (
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
                        <h3 className="text-primary mb-1">{dashboardData?.departmentStats?.totalDepartments || 0}</h3>
                        <p className="mb-0 text-muted">Total Departments</p>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="border rounded p-3 text-center">
                        <h3 className="text-success mb-1">{dashboardData?.departmentStats?.activeDepartments || 0}</h3>
                        <p className="mb-0 text-muted">Active Departments</p>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="border rounded p-3 text-center">
                        <h3 className="text-warning mb-1">{dashboardData?.departmentStats?.inactiveDepartments || 0}</h3>
                        <p className="mb-0 text-muted">Inactive Departments</p>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="border rounded p-3 text-center">
                        <h3 className="text-info mb-1">{dashboardData?.departmentStats?.recentlyAdded || 0}</h3>
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
                        <h3 className="text-primary mb-1">{dashboardData?.designationStats?.totalDesignations || 0}</h3>
                        <p className="mb-0 text-muted">Total Designations</p>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="border rounded p-3 text-center">
                        <h3 className="text-success mb-1">{dashboardData?.designationStats?.activeDesignations || 0}</h3>
                        <p className="mb-0 text-muted">Active Designations</p>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="border rounded p-3 text-center">
                        <h3 className="text-warning mb-1">{dashboardData?.designationStats?.inactiveDesignations || 0}</h3>
                        <p className="mb-0 text-muted">Inactive Designations</p>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="border rounded p-3 text-center">
                        <h3 className="text-info mb-1">
                          {dashboardData?.designationStats?.departmentWiseCount?.length || 0}
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
      </HROnly>
    </ErrorBoundary>
  );
};

export default HRDashboard;
