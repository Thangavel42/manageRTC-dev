import React, { useState, useEffect } from "react";
import { all_routes } from "../../router/all_routes";
import { Link } from "react-router-dom";
import PredefinedDateRanges from "../../../core/common/datePicker";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import { DatePicker } from "antd";
import CommonSelect from "../../../core/common/commonSelect";
import CollapseHeader from "../../../core/common/collapse-header/collapse-header";
import Footer from "../../../core/common/footer";
import { useSocket } from "../../../SocketContext";
import { toast } from "react-toastify";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

const JobGrid = () => {
  const socket = useSocket();
  const [jobsData, setJobsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    category: "",
    status: "",
    jobType: "",
    location: "",
    sortBy: "postedDate",
    sortOrder: "desc"
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 12,
    total: 0
  });
  const [dateRange, setDateRange] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [jobForm, setJobForm] = useState<any>({
    title: "",
    description: "",
    category: "",
    jobType: "",
    jobLevel: "",
    experience: "",
    qualification: "",
    minSalary: "",
    maxSalary: "",
    expiredDate: null as any,
    skills: "",
    address: "",
    country: "",
    state: "",
    city: "",
    zip: "",
    gender: "",
    image: "",
    imageName: "",
    imageMime: "",
  });

  const updateForm = (field: string, value: any) => {
    setJobForm((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e: any) => {
    const file = e?.target?.files?.[0];
    console.log('[PostJob][UI] Image selected:', file?.name, file?.type, file?.size);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      console.log('[PostJob][UI] Image read as data URL, length:', (reader.result as string)?.length);
      updateForm('image', reader.result);
      updateForm('imageName', file.name);
      updateForm('imageMime', file.type);
    };
    reader.onerror = () => {
      console.error('[PostJob][UI] Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  const getModalContainer = () => {
    const modalElement = document.getElementById("modal-datepicker");
    return modalElement ? modalElement : document.body;
  };

  // const handleExportPDF = async () => {
  //   if (!socket) {
  //     alert("Socket connection not available");
  //     return;
  //   }

  //   setExporting(true);
  //   try {
  //     console.log("Starting PDF export...");
  //     socket.emit("jobs/export-pdf", { filters });

  //     const handlePDFResponse = (response) => {
  //       if (response.done) {
  //         console.log("PDF generated successfully:", response.data.pdfUrl);
  //         const link = document.createElement("a");
  //         link.href = response.data.pdfUrl;
  //         link.download = `jobs_${Date.now()}.pdf`;
  //         document.body.appendChild(link);
  //         link.click();
  //         document.body.removeChild(link);
  //         alert("PDF exported successfully!");
  //       } else {
  //         console.error("PDF export failed:", response.error);
  //         alert(`PDF export failed: ${response.error}`);
  //       }
  //       setExporting(false);
  //       socket.off("jobs/export-pdf-response", handlePDFResponse);
  //     };

  //     socket.on("jobs/export-pdf-response", handlePDFResponse);
  //   } catch (error) {
  //     console.error("Error exporting PDF:", error);
  //     alert("Failed to export PDF");
  //     setExporting(false);
  //   }
  // };

  // const handleExportExcel = async () => {
  //   if (!socket) {
  //     alert("Socket connection not available");
  //     return;
  //   }

  //   setExporting(true);
  //   try {
  //     console.log("Starting Excel export...");
  //     socket.emit("jobs/export-excel", { filters });

  //     const handleExcelResponse = (response) => {
  //       if (response.done) {
  //         console.log("Excel generated successfully:", response.data.excelUrl);
  //         const link = document.createElement("a");
  //         link.href = response.data.excelUrl;
  //         link.download = `jobs_${Date.now()}.xlsx`;
  //         document.body.appendChild(link);
  //         link.click();
  //         document.body.removeChild(link);
  //         alert("Excel exported successfully!");
  //       } else {
  //         console.error("Excel export failed:", response.error);
  //         alert(`Excel export failed: ${response.error}`);
  //       }
  //       setExporting(false);
  //       socket.off("jobs/export-excel-response", handleExcelResponse);
  //     };

  //     socket.on("jobs/export-excel-response", handleExcelResponse);
  //   } catch (error) {
  //     console.error("Error exporting Excel:", error);
  //     alert("Failed to export Excel");
  //     setExporting(false);
  //   }
  // };

  // Handle PDF export (Client-side)
  const handleExportPDF = async () => {
    try {
      setExporting(true);
      
      const doc = new jsPDF();
      const currentDate = new Date().toLocaleDateString();
      const currentTime = new Date().toLocaleTimeString();

      // Header
      doc.setFontSize(20);
      doc.text("Jobs Grid Report", 20, 20);
      
      doc.setFontSize(12);
      doc.text(`Generated on: ${currentDate}`, 20, 35);
      doc.text(`Time: ${currentTime}`, 20, 45);
      doc.text(`Total Jobs: ${jobsData.length}`, 20, 55);

      let yPosition = 70;

      // Summary section
      if (jobsData.length > 0) {
        const totalApplicants = jobsData.reduce((sum: number, job: any) => sum + (job.applicantsCount || 0), 0);
        const totalValue = jobsData.reduce((sum: number, job: any) => sum + (job.maxSalary || 0), 0);

        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text("SUMMARY", 20, yPosition);
        
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.text(`Total Jobs: ${jobsData.length}`, 20, yPosition + 8);
        doc.text(`Total Applicants: ${totalApplicants}`, 20, yPosition + 16);
        doc.text(`Total Salary Value: $${totalValue.toLocaleString()}`, 20, yPosition + 24);

        yPosition += 35;
      }

      // Jobs grid - display as cards
      jobsData.forEach((job: any, index: number) => {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        // Job card background
        doc.setFillColor(245, 245, 245);
        doc.rect(20, yPosition, 170, 40, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.rect(20, yPosition, 170, 40, 'S');

        // Job title
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        const title = (job.title || "N/A").substring(0, 40);
        doc.text(title, 25, yPosition + 8);

        // Job details
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.text(`Category: ${job.category || "N/A"}`, 25, yPosition + 16);
        doc.text(`Type: ${job.jobType || "N/A"}`, 25, yPosition + 22);
        doc.text(`Location: ${job.location?.city || "N/A"}, ${job.location?.country || "N/A"}`, 25, yPosition + 28);
        
        // Salary and status on the right
        const salary = `$${(job.minSalary || 0).toLocaleString()} - $${(job.maxSalary || 0).toLocaleString()} ${job.currency || 'USD'}`;
        doc.text(salary, 120, yPosition + 16);
        doc.text(`Applicants: ${job.applicantsCount || 0}`, 120, yPosition + 22);
        doc.text(`Status: ${job.status || "N/A"}`, 120, yPosition + 28);

        yPosition += 45;
      });

      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Page ${i} of ${pageCount}`, 20, 290);
        doc.text(`Generated by HRMS`, 150, 290);
      }

      // Save the PDF
      doc.save(`jobs_grid_report_${Date.now()}.pdf`);
      setExporting(false);
      
      toast.success(`PDF exported successfully! ${jobsData.length} jobs`);
    } catch (error) {
      console.error("Error exporting PDF:", error);
      setExporting(false);
      toast.error("Failed to export PDF");
    }
  };

  // Handle Excel export (Client-side)
  const handleExportExcel = () => {
    try {
      setExporting(true);
      const currentDate = new Date().toLocaleDateString();
      const wb = XLSX.utils.book_new();

      // Prepare jobs data for Excel
      const jobsDataForExcel = jobsData.map((job: any) => ({
        "Job Title": job.title || "",
        "Category": job.category || "",
        "Type": job.jobType || "",
        "Level": job.jobLevel || "",
        "Experience": job.experience || "",
        "Location": `${job.location?.city || ''}, ${job.location?.country || ''}`,
        "Min Salary": job.minSalary || 0,
        "Max Salary": job.maxSalary || 0,
        "Currency": job.currency || "USD",
        "Status": job.status || "",
        "Applicants": job.applicantsCount || 0,
        "Posted Date": job.postedDate ? new Date(job.postedDate).toLocaleDateString() : ""
      }));

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(jobsDataForExcel);
      
      // Set column widths
      const colWidths = [
        { wch: 30 }, // Job Title
        { wch: 15 }, // Category
        { wch: 12 }, // Type
        { wch: 15 }, // Level
        { wch: 15 }, // Experience
        { wch: 25 }, // Location
        { wch: 12 }, // Min Salary
        { wch: 12 }, // Max Salary
        { wch: 10 }, // Currency
        { wch: 12 }, // Status
        { wch: 12 }, // Applicants
        { wch: 15 }  // Posted Date
      ];
      ws['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Jobs Grid");

      // Save the Excel file
      XLSX.writeFile(wb, `jobs_grid_report_${Date.now()}.xlsx`);
      setExporting(false);
      
      toast.success(`Excel exported successfully! ${jobsData.length} jobs`);
    } catch (error) {
      console.error("Error exporting Excel:", error);
      setExporting(false);
      toast.error("Failed to export Excel");
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handlePageChange = (page) => {
    setPagination(prev => ({
      ...prev,
      current: page
    }));
  };

  const formatSalary = (minSalary, maxSalary, currency, salaryPeriod) => {
    return `${minSalary?.toLocaleString()} - ${maxSalary?.toLocaleString()} ${currency} / ${salaryPeriod}`;
  };

  const formatLocation = (location) => {
    if (!location) return "Location not specified";
    return `${location.city}, ${location.country}`;
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case "published":
        return "badge badge-success-transparent";
      case "draft":
        return "badge badge-warning-transparent";
      case "closed":
        return "badge badge-danger-transparent";
      default:
        return "badge badge-secondary-transparent";
    }
  };

  const getJobTypeBadgeClass = (jobType) => {
    switch (jobType?.toLowerCase()) {
      case "full time":
        return "badge badge-pink-transparent";
      case "part time":
        return "badge badge-info-transparent";
      case "contract":
        return "badge badge-warning-transparent";
      default:
        return "badge badge-secondary-transparent";
    }
  };

  // Fetch jobs data function
  const fetchJobsData = () => {
    if (!socket) return;

    setLoading(true);
    setError(null);

    try {
      const requestData = {
        ...filters,
        dateRange: dateRange,
        page: pagination.current,
        limit: pagination.pageSize
      };

      const handleResponse = (response) => {
        setLoading(false);

        if (response.done) {
          const data = response.data || {};
          setJobsData(data.jobs || []);
          setPagination({
            current: data.pagination?.currentPage || 1,
            pageSize: data.pagination?.limit || 12,
            total: data.pagination?.total || 0
          });
          setError(null);
        } else {
          setError(response.error || "Failed to load jobs data");
          setJobsData([]);
        }
      };

      socket.on('jobs/list/get-jobs-response', handleResponse);
      socket.emit('jobs/list/get-jobs', requestData);

      const timeout = setTimeout(() => {
        socket.off('jobs/list/get-jobs-response', handleResponse);
        if (loading) {
          setLoading(false);
          setError("Request timed out");
        }
      }, 10000);

      socket.on('jobs/list/get-jobs-response', (response) => {
        clearTimeout(timeout);
        handleResponse(response);
        socket.off('jobs/list/get-jobs-response', handleResponse);
      });

    } catch (error) {
      console.error("[JobGrid] Error fetching jobs:", error);
      setLoading(false);
      setError("Failed to fetch jobs data");
    }
  };

  // Listen for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleJobCreated = (data) => {
      const newJob = (data && (data.job || data)) || null;
      if (newJob) {
        setJobsData(prev => [newJob, ...prev]);
        setPagination(prev => ({
          ...prev,
          total: (prev.total || 0) + 1,
        }));
      } else {
        fetchJobsData();
      }
    };

    const handleJobUpdated = (data) => {
      const updated = (data && (data.job || data)) || null;
      if (updated && updated.jobId) {
        setJobsData(prev => prev.map(j => j.jobId === updated.jobId ? updated : j));
      } else {
        fetchJobsData();
      }
    };

    const handleJobDeleted = (data) => {
      const deletedId = data && data.jobId;
      if (deletedId) {
        setJobsData(prev => prev.filter(j => j.jobId !== deletedId));
        setPagination(prev => ({
          ...prev,
          total: Math.max(0, (prev.total || 1) - 1),
        }));
      } else {
        fetchJobsData();
      }
    };

    socket.on('jobs/job-created', handleJobCreated);
    socket.on('jobs/job-updated', handleJobUpdated);
    socket.on('jobs/job-deleted', handleJobDeleted);

    return () => {
      socket.off('jobs/job-created', handleJobCreated);
      socket.off('jobs/job-updated', handleJobUpdated);
      socket.off('jobs/job-deleted', handleJobDeleted);
    };
  }, [socket]);

  // Fetch data on component mount and filter changes
  useEffect(() => {
    fetchJobsData();
  }, [socket, filters, dateRange, pagination.current]);

  // Location dependency data and computed options for Post Job modal
  const locationData: Record<string, { states: Record<string, string[]> }> = {
    USA: {
      states: {
        California: ["Los Angeles", "San Diego", "San Francisco", "Fresno"],
        Texas: ["Houston", "Dallas", "Austin"],
        Florida: ["Miami", "Orlando", "Tampa"],
        "New York": ["New York City", "Buffalo", "Rochester"],
      },
    },
    Canada: {
      states: {
        Ontario: ["Toronto", "Ottawa"],
        Quebec: ["Montreal", "Quebec City"],
        Alberta: ["Calgary", "Edmonton"],
      },
    },
    Germany: {
      states: {
        Bavaria: ["Munich", "Nuremberg"],
        "North Rhine-Westphalia": ["Cologne", "Düsseldorf"],
        Berlin: ["Berlin"],
      },
    },
    France: {
      states: {
        "Île-de-France": ["Paris", "Versailles"],
        Provence: ["Marseille", "Nice"],
        Normandy: ["Rouen", "Caen"],
      },
    },
  };

  const toOptions = (vals: string[]) => [{ value: "Select", label: "Select" }, ...vals.map(v => ({ value: v, label: v }))];
  const countryOptions = toOptions(Object.keys(locationData));
  const stateOptions = jobForm.country && locationData[jobForm.country]
    ? toOptions(Object.keys(locationData[jobForm.country].states))
    : toOptions([]);
  const cityOptions = jobForm.country && jobForm.state && locationData[jobForm.country]?.states[jobForm.state]
    ? toOptions(locationData[jobForm.country].states[jobForm.state])
    : toOptions([]);

  const jobCategory = [
    { value: "Select", label: "Select" },
    { value: "IOS", label: "IOS" },
    { value: "Web & Application", label: "Web & Application" },
    { value: "Networking", label: "Networking" },
  ];
  const jobtype = [
    { value: "Select", label: "Select" },
    { value: "Full Time", label: "Full Time" },
    { value: "Part Time", label: "Part Time" },
  ];
  const joblevel = [
    { value: "Select", label: "Select" },
    { value: "Team Lead", label: "Team Lead" },
    { value: "Manager", label: "Manager" },
    { value: "Senior", label: "Senior" },
  ];
  const experience = [
    { value: "Select", label: "Select" },
    { value: "Entry Level", label: "Entry Level" },
    { value: "Mid Level", label: "Mid Level" },
    { value: "Expert", label: "Expert" },
  ];
  const qualification = [
    { value: "Select", label: "Select" },
    { value: "Bachelore Degree", label: "Bachelore Degree" },
    { value: "Master Degree", label: "Master Degree" },
    { value: "Others", label: "Others" },
  ];
  const genderChoose = [
    { value: "Select", label: "Select" },
    { value: "Male", label: "Male" },
    { value: "Female", label: "Female" },
  ];
  const sallary = [
    { value: "Select", label: "Select" },
    { value: "10k - 15k", label: "10k - 15k" },
    { value: "15k -20k", label: "15k -20k" },
  ];
  const maxsallary = [
    { value: "Select", label: "Select" },
    { value: "40k - 50k", label: "40k - 50k" },
    { value: "50k - 60k", label: "50k - 60k" },
  ];

  return (
    <>
      {/* Page Wrapper */}
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Jobs</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={all_routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">Administration</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Jobs
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
              <div className="me-2 mb-2">
                <div className="d-flex align-items-center border bg-white rounded p-1 me-2 icon-list">
                  <Link
                    to={all_routes.joblist}
                    className="btn btn-icon btn-sm me-1"
                  >
                    <i className="ti ti-list-tree" />
                  </Link>
                  <Link
                    to={all_routes.jobgrid}
                    className="btn btn-icon btn-sm active bg-primary text-white"
                  >
                    <i className="ti ti-layout-grid" />
                  </Link>
                </div>
              </div>
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
                      <Link 
                        to="#" 
                        className="dropdown-item rounded-1"
                        onClick={(e) => {
                          e.preventDefault();
                          handleExportPDF();
                        }}
                        style={{ opacity: exporting ? 0.6 : 1, pointerEvents: exporting ? 'none' : 'auto' }}
                      >
                        <i className="ti ti-file-type-pdf me-1" />
                        {exporting ? 'Exporting...' : 'Export as PDF'}
                      </Link>
                    </li>
                    <li>
                      <Link 
                        to="#" 
                        className="dropdown-item rounded-1"
                        onClick={(e) => {
                          e.preventDefault();
                          handleExportExcel();
                        }}
                        style={{ opacity: exporting ? 0.6 : 1, pointerEvents: exporting ? 'none' : 'auto' }}
                      >
                        <i className="ti ti-file-type-xls me-1" />
                        {exporting ? 'Exporting...' : 'Export as Excel'}
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="mb-2">
                <Link
                  to="#"
                  data-bs-toggle="modal"
                  data-bs-target="#add_post"
                  className="btn btn-primary d-flex align-items-center"
                >
                  <i className="ti ti-circle-plus me-2" />
                  Post Job
                </Link>
              </div>
              <div className="head-icons ms-2">
                <CollapseHeader />
              </div>
            </div>
          </div>
          {/* /Breadcrumb */}
          <div className="card">
            <div className="card-body p-3">
              <div className="d-flex align-items-center justify-content-between">
                <h5>Job Grid</h5>
                <div className="d-flex my-xl-auto right-content align-items-center flex-wrap row-gap-3">
                  <div className="me-3">
                    <div className="input-icon-end position-relative">
                      <PredefinedDateRanges 
                        onChange={(range) => setDateRange(range)}
                        value={dateRange}
                      />
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
                      Category: {filters.category || 'All Categories'}
                    </Link>
                    <ul className="dropdown-menu dropdown-menu-end p-3">
                      <li>
                        <Link 
                          to="#" 
                          className="dropdown-item rounded-1"
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange("category", "");
                          }}
                        >
                          All Categories
                        </Link>
                      </li>
                      <li>
                        <Link 
                          to="#" 
                          className="dropdown-item rounded-1"
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange("category", "Software");
                          }}
                        >
                          Software
                        </Link>
                      </li>
                      <li>
                        <Link 
                          to="#" 
                          className="dropdown-item rounded-1"
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange("category", "Design");
                          }}
                        >
                          Design
                        </Link>
                      </li>
                      <li>
                        <Link 
                          to="#" 
                          className="dropdown-item rounded-1"
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange("category", "Marketing");
                          }}
                        >
                          Marketing
                        </Link>
                      </li>
                    </ul>
                  </div>
                  <div className="dropdown me-3">
                    <Link
                      to="#"
                      className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                      data-bs-toggle="dropdown"
                    >
                      Status: {filters.status || 'All Status'}
                    </Link>
                    <ul className="dropdown-menu dropdown-menu-end p-3">
                      <li>
                        <Link 
                          to="#" 
                          className="dropdown-item rounded-1"
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange("status", "");
                          }}
                        >
                          All Status
                        </Link>
                      </li>
                      <li>
                        <Link 
                          to="#" 
                          className="dropdown-item rounded-1"
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange("status", "Published");
                          }}
                        >
                          Published
                        </Link>
                      </li>
                      <li>
                        <Link 
                          to="#" 
                          className="dropdown-item rounded-1"
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange("status", "Draft");
                          }}
                        >
                          Draft
                        </Link>
                      </li>
                      <li>
                        <Link 
                          to="#" 
                          className="dropdown-item rounded-1"
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange("status", "Closed");
                          }}
                        >
                          Closed
                        </Link>
                      </li>
                    </ul>
                  </div>
                  <div className="dropdown me-3">
                    <Link
                      to="#"
                      className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                      data-bs-toggle="dropdown"
                    >
                      Job Type: {filters.jobType || 'All Types'}
                    </Link>
                    <ul className="dropdown-menu dropdown-menu-end p-3">
                      <li>
                        <Link 
                          to="#" 
                          className="dropdown-item rounded-1"
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange("jobType", "");
                          }}
                        >
                          All Types
                        </Link>
                      </li>
                      <li>
                        <Link 
                          to="#" 
                          className="dropdown-item rounded-1"
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange("jobType", "Full Time");
                          }}
                        >
                          Full Time
                        </Link>
                      </li>
                      <li>
                        <Link 
                          to="#" 
                          className="dropdown-item rounded-1"
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange("jobType", "Part Time");
                          }}
                        >
                          Part Time
                        </Link>
                      </li>
                      <li>
                        <Link 
                          to="#" 
                          className="dropdown-item rounded-1"
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange("jobType", "Contract");
                          }}
                        >
                          Contract
                        </Link>
                      </li>
                      <li>
                        <Link 
                          to="#" 
                          className="dropdown-item rounded-1"
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange("jobType", "Freelance");
                          }}
                        >
                          Freelance
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
                      Sort By: {filters.sortBy === 'postedDate' ? 'Recently Added' : filters.sortBy === 'title' ? (filters.sortOrder === 'asc' ? 'Title A-Z' : 'Title Z-A') : (filters.sortOrder === 'asc' ? 'Salary Low to High' : 'Salary High to Low')}
                    </Link>
                    <ul className="dropdown-menu dropdown-menu-end p-3">
                      <li>
                        <Link 
                          to="#" 
                          className="dropdown-item rounded-1"
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange("sortBy", "postedDate");
                            handleFilterChange("sortOrder", "desc");
                          }}
                        >
                          Recently Added
                        </Link>
                      </li>
                      <li>
                        <Link 
                          to="#" 
                          className="dropdown-item rounded-1"
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange("sortBy", "title");
                            handleFilterChange("sortOrder", "asc");
                          }}
                        >
                          Title A-Z
                        </Link>
                      </li>
                      <li>
                        <Link 
                          to="#" 
                          className="dropdown-item rounded-1"
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange("sortBy", "title");
                            handleFilterChange("sortOrder", "desc");
                          }}
                        >
                          Title Z-A
                        </Link>
                      </li>
                      <li>
                        <Link 
                          to="#" 
                          className="dropdown-item rounded-1"
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange("sortBy", "minSalary");
                            handleFilterChange("sortOrder", "asc");
                          }}
                        >
                          Salary Low to High
                        </Link>
                      </li>
                      <li>
                        <Link 
                          to="#" 
                          className="dropdown-item rounded-1"
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange("sortBy", "minSalary");
                            handleFilterChange("sortOrder", "desc");
                          }}
                        >
                          Salary High to Low
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="row">
                <div className="col-12">
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2">Loading jobs...</p>
                  </div>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="row">
                <div className="col-12">
                  <div className="alert alert-danger" role="alert">
                    <i className="ti ti-alert-circle me-2"></i>
                    {error}
                  </div>
                </div>
              </div>
            )}

            {/* Jobs Grid */}
            {!loading && !error && (
              <div className="row">
                {jobsData.length === 0 ? (
                  <div className="col-12">
                    <div className="text-center py-5">
                      <i className="ti ti-briefcase fs-48 text-gray-5 mb-3"></i>
                      <h5>No jobs found</h5>
                      <p className="text-gray">No jobs match your current filters.</p>
                    </div>
                  </div>
                ) : (
                  jobsData.map((job) => (
                    <div key={job._id} className="col-xl-3 col-lg-4 col-md-6">
                      <div className="card">
                        <div className="card-body">
                          <div className="card bg-light">
                            <div className="card-body p-3">
                              <div className="d-flex align-items-center">
                                <Link to="#" className="me-2">
                                  <span className="avatar avatar-lg bg-gray">
                                    {job.image && typeof job.image === 'string' && job.image.startsWith('data:') ? (
                                      <img
                                        src={job.image}
                                        alt="company logo"
                                        className="img-fluid rounded-circle"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                      />
                                    ) : (
                                      <ImageWithBasePath
                                        src={job.image || "assets/img/icons/briefcase.svg"}
                                        className="img-fluid rounded-circle"
                                        alt="company logo"
                                      />
                                    )}
                                  </span>
                                </Link>
                                <div>
                                  <h6 className="fw-medium mb-1 text-truncate">
                                    <Link to="#">{job.title}</Link>
                                  </h6>
                                  <p className="fs-12 text-gray fw-normal">
                                    {job.applicantsCount || 0} Applicants
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="d-flex flex-column mb-3">
                            <p className="text-dark d-inline-flex align-items-center mb-2">
                              <i className="ti ti-map-pin-check text-gray-5 me-2" />
                              {formatLocation(job.location)}
                            </p>
                            <p className="text-dark d-inline-flex align-items-center mb-2">
                              <i className="ti ti-currency-dollar text-gray-5 me-2" />
                              {formatSalary(job.minSalary, job.maxSalary, job.currency, job.salaryPeriod)}
                            </p>
                            <p className="text-dark d-inline-flex align-items-center">
                              <i className="ti ti-briefcase text-gray-5 me-2" />
                              {job.experience} experience
                            </p>
                          </div>
                          <div className="mb-3">
                            <span className={getJobTypeBadgeClass(job.jobType)}>
                              {job.jobType}
                            </span>
                            <span className={getStatusBadgeClass(job.status)}>
                              {job.status}
                            </span>
                          </div>
                          <div className="progress progress-xs mb-2">
                            <div
                              className="progress-bar bg-warning"
                              role="progressbar"
                              style={{ width: "30%" }}
                            />
                          </div>
                          <div>
                            <p className="fs-12 text-gray fw-normal">
                              {Math.floor((job.applicantsCount || 0) * 0.3)} of {job.applicantsCount || 0} filled
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Pagination */}
            {!loading && !error && jobsData.length > 0 && pagination.total > pagination.pageSize && (
              <div className="row">
                <div className="col-12">
                  <div className="d-flex justify-content-center mt-4">
                    <nav aria-label="Jobs pagination">
                      <ul className="pagination">
                        <li className={`page-item ${pagination.current === 1 ? 'disabled' : ''}`}>
                          <button 
                            className="page-link" 
                            onClick={() => handlePageChange(pagination.current - 1)}
                            disabled={pagination.current === 1}
                          >
                            Previous
                          </button>
                        </li>
                        {Array.from({ length: Math.ceil(pagination.total / pagination.pageSize) }, (_, i) => i + 1).map(page => (
                          <li key={page} className={`page-item ${pagination.current === page ? 'active' : ''}`}>
                            <button 
                              className="page-link" 
                              onClick={() => handlePageChange(page)}
                            >
                              {page}
                            </button>
                          </li>
                        ))}
                        <li className={`page-item ${pagination.current === Math.ceil(pagination.total / pagination.pageSize) ? 'disabled' : ''}`}>
                          <button 
                            className="page-link" 
                            onClick={() => handlePageChange(pagination.current + 1)}
                            disabled={pagination.current === Math.ceil(pagination.total / pagination.pageSize)}
                          >
                            Next
                          </button>
                        </li>
                      </ul>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <Footer />
      </div>
      
      {/* /Page Wrapper */}

      {/* Add Post Modal */}
      <div className="modal fade" id="add_post">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Post Job</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); }}>
              <div className="modal-body pb-0">
                <div className="row">
                  <div className="contact-grids-tab pt-0">
                    <ul className="nav nav-underline" id="myTab" role="tablist">
                      <li className="nav-item" role="presentation">
                        <button
                          className="nav-link active"
                          id="info-tab"
                          data-bs-toggle="tab"
                          data-bs-target="#basic-info"
                          type="button"
                          role="tab"
                          aria-selected="true"
                        >
                          Basic Information
                        </button>
                      </li>
                      <li className="nav-item" role="presentation">
                        <button
                          className="nav-link"
                          id="address-tab"
                          data-bs-toggle="tab"
                          data-bs-target="#address"
                          type="button"
                          role="tab"
                          aria-selected="false"
                        >
                          Location
                        </button>
                      </li>
                    </ul>
                  </div>
                  <div className="tab-content" id="myTabContent">
                    <div
                      className="tab-pane fade show active"
                      id="basic-info"
                      role="tabpanel"
                      aria-labelledby="info-tab"
                      tabIndex={0}
                    >
                      <div className="row">
                        <div className="col-md-12">
                          <div className="d-flex align-items-center flex-wrap row-gap-3 bg-light w-100 rounded p-3 mb-4">
                            <div className="d-flex align-items-center justify-content-center avatar avatar-xxl rounded-circle border border-dashed me-2 flex-shrink-0 text-dark frames">
                              {jobForm.image && typeof jobForm.image === 'string' && jobForm.image.startsWith('data:') ? (
                                <img
                                  src={jobForm.image}
                                  alt="preview"
                                  className="rounded-circle"
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              ) : (
                              <ImageWithBasePath
                                src="assets/img/profiles/avatar-30.jpg"
                                alt="img"
                                className="rounded-circle"
                              />
                              )}
                            </div>
                            <div className="profile-upload">
                              <div className="mb-2">
                                <h6 className="mb-1">Upload Profile Image</h6>
                                <p className="fs-12">
                                  Image should be below 4 mb
                                </p>
                              </div>
                              <div className="profile-uploader d-flex align-items-center">
                                <div className="drag-upload-btn btn btn-sm btn-primary me-2">
                                  Upload
                                  <input
                                    type="file"
                                    className="form-control image-sign"
                                    multiple
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                  />
                                </div>
                                <Link to="#" className="btn btn-light btn-sm">
                                  Cancel
                                </Link>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-12">
                          <div className="mb-3">
                            <label className="form-label">
                              Job Title <span className="text-danger"> *</span>
                            </label>
                            <input 
                              type="text" 
                              className="form-control" 
                              value={jobForm.title} 
                              onChange={(e) => updateForm("title", e.target.value)} 
                            />
                          </div>
                        </div>
                        <div className="col-md-12">
                          <div className="mb-3">
                            <label className="form-label">
                              Job Description{" "}
                              <span className="text-danger"> *</span>
                            </label>
                            <textarea
                              rows={3}
                              className="form-control"
                              value={jobForm.description}
                              onChange={(e) => updateForm("description", e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label">
                              Job Category{" "}
                              <span className="text-danger"> *</span>
                            </label>
                            <CommonSelect
                              className="select"
                              options={jobCategory}
                              value={jobForm.category ? { value: jobForm.category, label: jobForm.category } : jobCategory[0]}
                              onChange={(opt: any) => updateForm("category", opt?.value === "Select" ? "" : opt?.value)}
                            />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label">
                              Job Type <span className="text-danger"> *</span>
                            </label>
                            <CommonSelect
                              className="select"
                              options={jobtype}
                              value={jobForm.jobType ? { value: jobForm.jobType, label: jobForm.jobType } : jobtype[0]}
                              onChange={(opt: any) => updateForm("jobType", opt?.value === "Select" ? "" : opt?.value)}
                            />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label">
                              Job Level <span className="text-danger"> *</span>
                            </label>
                            <CommonSelect
                              className="select"
                              options={joblevel}
                              value={jobForm.jobLevel ? { value: jobForm.jobLevel, label: jobForm.jobLevel } : joblevel[0]}
                              onChange={(opt: any) => updateForm("jobLevel", opt?.value === "Select" ? "" : opt?.value)}
                            />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label">
                              Experience <span className="text-danger"> *</span>
                            </label>
                            <CommonSelect
                              className="select"
                              options={experience}
                              value={jobForm.experience ? { value: jobForm.experience, label: jobForm.experience } : experience[0]}
                              onChange={(opt: any) => updateForm("experience", opt?.value === "Select" ? "" : opt?.value)}
                            />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label">
                              Qualification{" "}
                              <span className="text-danger"> *</span>
                            </label>
                            <CommonSelect
                              className="select"
                              options={qualification}
                              value={jobForm.qualification ? { value: jobForm.qualification, label: jobForm.qualification } : qualification[0]}
                              onChange={(opt: any) => updateForm("qualification", opt?.value === "Select" ? "" : opt?.value)}
                            />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label">
                              Gender <span className="text-danger"> *</span>
                            </label>
                            <CommonSelect
                              className="select"
                              options={genderChoose}
                              value={jobForm.gender ? { value: jobForm.gender, label: jobForm.gender } : genderChoose[0]}
                              onChange={(opt: any) => updateForm("gender", opt?.value === "Select" ? "" : opt?.value)}
                            />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label">
                              Min. Sallary{" "}
                              <span className="text-danger"> *</span>
                            </label>
                            <CommonSelect
                              className="select"
                              options={sallary}
                              value={jobForm.minSalary ? { value: jobForm.minSalary, label: jobForm.minSalary } : sallary[0]}
                              onChange={(opt: any) => updateForm("minSalary", opt?.value === "Select" ? "" : opt?.value)}
                            />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label">
                              Max. Sallary{" "}
                              <span className="text-danger"> *</span>
                            </label>
                            <CommonSelect
                              className="select"
                              options={maxsallary}
                              value={jobForm.maxSalary ? { value: jobForm.maxSalary, label: jobForm.maxSalary } : maxsallary[0]}
                              onChange={(opt: any) => updateForm("maxSalary", opt?.value === "Select" ? "" : opt?.value)}
                            />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-3 ">
                            <label className="form-label">
                              Job Expired Date{" "}
                              <span className="text-danger"> *</span>
                            </label>
                            <div className="input-icon-end position-relative">
                              <DatePicker
                                className="form-control datetimepicker"
                                format={{
                                  format: "DD-MM-YYYY",
                                  type: "mask",
                                }}
                                getPopupContainer={getModalContainer}
                                placeholder="DD-MM-YYYY"
                                value={jobForm.expiredDate as any}
                                onChange={(date: any) => updateForm("expiredDate", date)}
                              />
                              <span className="input-icon-addon">
                                <i className="ti ti-calendar text-gray-7" />
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label">
                              Required Skills
                            </label>
                            <input 
                              type="text" 
                              className="form-control" 
                              value={jobForm.skills} 
                              onChange={(e) => updateForm("skills", e.target.value)} 
                            />
                          </div>
                        </div>
                      </div>
                      <div className="modal-footer">
                        <button
                          type="button"
                          className="btn btn-light me-2"
                          data-bs-dismiss="modal"
                          disabled={submitting}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => {
                            // move to Location tab
                            const addressTab: any = document.querySelector('#address-tab');
                            addressTab?.click();
                          }}
                          disabled={submitting}
                        >
                          Save &amp; Next
                        </button>
                      </div>
                    </div>
                    <div
                      className="tab-pane fade"
                      id="address"
                      role="tabpanel"
                      aria-labelledby="address-tab"
                      tabIndex={0}
                    >
                      <div className="row">
                        <div className="col-md-12">
                          <div className="mb-3">
                            <label className="form-label">
                              Address <span className="text-danger"> *</span>
                            </label>
                            <input 
                              type="text" 
                              className="form-control" 
                              value={jobForm.address} 
                              onChange={(e) => updateForm("address", e.target.value)} 
                            />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label">
                              Country <span className="text-danger"> *</span>
                            </label>
                            <CommonSelect
                              className="select"
                              options={countryOptions}
                              value={jobForm.country ? { value: jobForm.country, label: jobForm.country } : countryOptions[0]}
                              onChange={(opt: any) => {
                                const nextCountry = opt?.value === "Select" ? "" : opt?.value;
                                updateForm("country", nextCountry);
                                // Reset state/city if country changes
                                updateForm("state", "");
                                updateForm("city", "");
                              }}
                            />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label">
                              State <span className="text-danger"> *</span>
                            </label>
                            <CommonSelect
                              className="select"
                              options={stateOptions}
                              value={jobForm.state ? { value: jobForm.state, label: jobForm.state } : stateOptions[0]}
                              onChange={(opt: any) => {
                                const nextState = opt?.value === "Select" ? "" : opt?.value;
                                updateForm("state", nextState);
                                // Reset city when state changes
                                updateForm("city", "");
                              }}
                            />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label">
                              City <span className="text-danger"> *</span>
                            </label>
                            <CommonSelect
                              className="select"
                              options={cityOptions}
                              value={jobForm.city ? { value: jobForm.city, label: jobForm.city } : cityOptions[0]}
                              onChange={(opt: any) => updateForm("city", opt?.value === "Select" ? "" : opt?.value)}
                            />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label">
                              Zip Code <span className="text-danger"> *</span>
                            </label>
                            <input 
                              type="text" 
                              className="form-control" 
                              value={jobForm.zip} 
                              onChange={(e) => updateForm("zip", e.target.value)} 
                            />
                          </div>
                        </div>
                        <div className="col-md-12">
                          <div className="map-grid mb-3">
                            <iframe
                              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d6509170.989457427!2d-123.80081967108484!3d37.192957227641294!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x808fb9fe5f285e3d%3A0x8b5109a227086f55!2sCalifornia%2C%20USA!5e0!3m2!1sen!2sin!4v1669181581381!5m2!1sen!2sin"
                              style={{ border: 0 }}
                              allowFullScreen
                              loading="lazy"
                              referrerPolicy="no-referrer-when-downgrade"
                              className="w-100"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="modal-footer">
                        <button
                          type="button"
                          className="btn btn-light me-2"
                          data-bs-dismiss="modal"
                          disabled={submitting}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => {
                            if (!socket) { alert('Socket not ready'); return; }
                            // basic validations
                            const required = ['title','description','category','jobType','jobLevel','experience','qualification'];
                            for (const f of required) {
                              if (!jobForm[f] || (typeof jobForm[f] === 'string' && jobForm[f].trim() === '')) { alert(`Please fill ${f}`); return; }
                            }
                            if (!jobForm.minSalary || !jobForm.maxSalary) { alert('Please select salary range'); return; }
                            if (!jobForm.expiredDate) { alert('Please select expired date'); return; }
                            if (!jobForm.address || !jobForm.country || !jobForm.state || !jobForm.city || !jobForm.zip) { alert('Please complete location'); return; }

                            const parseMinSalary = (val: string) => {
                              if (typeof val !== 'string') return 0;
                              const match = val.match(/(\d+)\s*[kK]?\s*(?:-|to)?/);
                              if (!match) return 0;
                              const base = parseInt(match[1], 10);
                              return val.toLowerCase().includes('k') ? base * 1000 : base;
                            };
                            const parseMaxSalary = (val: string) => {
                              if (typeof val !== 'string') return 0;
                              const match = val.match(/(?:-|to)\s*(\d+)\s*[kK]?/);
                              // if there's no explicit range, fallback to first number
                              const num = match ? match[1] : (val.match(/(\d+)/)?.[1] || '0');
                              const base = parseInt(num, 10);
                              return val.toLowerCase().includes('k') ? base * 1000 : base;
                            };

                            const payload: any = {
                              title: jobForm.title.trim(),
                              description: jobForm.description.trim(),
                              category: jobForm.category,
                              jobType: jobForm.jobType,
                              jobLevel: jobForm.jobLevel,
                              experience: jobForm.experience,
                              qualification: jobForm.qualification,
                              minSalary: parseMinSalary(jobForm.minSalary),
                              maxSalary: parseMaxSalary(jobForm.maxSalary),
                              currency: 'USD',
                              salaryPeriod: 'yearly',
                              expiredDate: jobForm.expiredDate?.toDate ? jobForm.expiredDate.toDate() : (jobForm.expiredDate?._d || jobForm.expiredDate),
                              location: {
                                address: jobForm.address,
                                country: jobForm.country,
                                state: jobForm.state,
                                city: jobForm.city,
                                zip: jobForm.zip,
                              },
                              skills: jobForm.skills ? jobForm.skills.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
                              image: jobForm.image || '',
                              imageName: jobForm.imageName || '',
                              imageMime: jobForm.imageMime || '',
                              status: 'Draft'
                            };

                            console.log('[PostJob][UI] Prepared payload keys:', Object.keys(payload));
                            if (payload.image) {
                              console.log('[PostJob][UI] Image present. dataUrl length:', (payload.image as string).length);
                            } else {
                              console.log('[PostJob][UI] No image provided');
                            }

                            if (payload.minSalary >= payload.maxSalary) { alert('Min salary must be less than max salary'); return; }
                            if (new Date(payload.expiredDate) <= new Date()) { alert('Expired date must be in the future'); return; }

                            setSubmitting(true);
                            console.log('[PostJob][UI] Emitting jobs/create-job...');
                            socket.emit('jobs/create-job', payload);
                            const onResp = (resp: any) => {
                              setSubmitting(false);
                              socket.off('jobs/create-job-response', onResp);
                              console.log('[PostJob][UI] Received jobs/create-job-response:', resp);
                              if (resp?.done) {
                                // reset and close
                                setJobForm({
                                  title: "",
                                  description: "",
                                  category: "",
                                  jobType: "",
                                  jobLevel: "",
                                  experience: "",
                                  qualification: "",
                                  minSalary: "",
                                  maxSalary: "",
                                  expiredDate: null as any,
                                  skills: "",
                                  address: "",
                                  country: "",
                                  state: "",
                                  city: "",
                                  zip: "",
                                  gender: "",
                                  image: "",
                                  imageName: "",
                                  imageMime: "",
                                });
                                fetchJobsData();
                                // show success and close modal safely
                                alert('Job posted successfully');
                                const addPostEl: any = document.querySelector('#add_post .btn-close');
                                addPostEl?.click();
                              } else {
                                alert(resp?.message || resp?.error || 'Failed to create job');
                              }
                            };
                            socket.on('jobs/create-job-response', onResp);
                          }}
                          disabled={submitting}
                        >
                          {submitting ? 'Posting...' : 'Post'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Post Job */}
      {/* Add Job Success */}
      <div className="modal fade" id="success_modal" role="dialog">
        <div className="modal-dialog modal-dialog-centered modal-xm">
          <div className="modal-content">
            <div className="modal-body">
              <div className="text-center p-3">
                <span className="avatar avatar-lg avatar-rounded bg-success mb-3">
                  <i className="ti ti-check fs-24" />
                </span>
                <h5 className="mb-2">Job Posted Successfully</h5>
                <div>
                  <div className="row g-2">
                    <div className="col-12">
                      <Link
                        to={all_routes.jobgrid}
                        data-bs-dismiss="modal"
                        className="btn btn-dark w-100"
                      >
                        Back to List
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* /Add Client Success */}
      {/* Toast Notifications  */}
      <ToastContainer 
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </>
    
  );
};

export default JobGrid;