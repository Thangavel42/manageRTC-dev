import React, { useState, useEffect, useCallback } from "react";
import { all_routes } from "../../router/all_routes";
import { Link } from "react-router-dom";
import PredefinedDateRanges from "../../../core/common/datePicker";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import { DatePicker } from "antd";
import CommonSelect from "../../../core/common/commonSelect";
import Table from "../../../core/common/dataTable/index";
import CollapseHeader from "../../../core/common/collapse-header/collapse-header";
import Footer from "../../../core/common/footer";
import { useSocket } from "../../../SocketContext";
import moment from "moment";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

const JobList = () => {
  const socket = useSocket();
  
  // State management
  const [jobsData, setJobsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    totalCount: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 10 
  });

  // Page size options
  const pageSizeOptions = [10, 20, 30, 50, 100];

  const [filters, setFilters] = useState({
    status: '',
    category: '',
    jobType: '',
    location: '',
    sortBy: 'postedDate',
    sortOrder: 'desc'
  });
  const [dateRange, setDateRange] = useState(null);
  const [currentJob, setCurrentJob] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);

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

  // Fetch jobs data from backend
  const fetchJobsData = useCallback(async () => {
    if (!socket) {
      console.log("[JobList] Socket not available yet");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const requestData = {
        ...filters,
        dateRange: dateRange,
        page: pagination.currentPage,
        limit: pagination.pageSize
      };

      // Set up response handler (single-shot via handled flag)
      let handled = false;
      const handleResponse = (response: any) => {
        if (handled) return;
        handled = true;
        setLoading(false);

        if (response.done) {
          const data = response.data || {};
          setJobsData(data.jobs || []);
          setPagination(prev => ({
            ...prev, // Preserve existing state including pageSize
            totalCount: data.pagination?.totalCount || 0,
            totalPages: data.pagination?.totalPages || 0,
            currentPage: data.pagination?.currentPage || 1
          }));
          setError(null);
        } else {
          setError(response.error || "Failed to load jobs data");
          setJobsData([]);
        }
        socket.off('jobs/list/get-jobs-response', handleResponse);
      };

      socket.on('jobs/list/get-jobs-response', handleResponse);
      socket.emit('jobs/list/get-jobs', requestData);

      const timeoutId = setTimeout(() => {
        if (!handled) {
          handled = true;
          socket.off('jobs/list/get-jobs-response', handleResponse);
          setLoading(false);
          setError("Request timed out");
        }
      }, 10000);

      // Cleanup timeout
      return () => clearTimeout(timeoutId);

    } catch (error) {
      console.error("[JobList] Error fetching jobs data:", error);
      setLoading(false);
      setError("Failed to fetch jobs data");
    }
  }, [socket, filters, dateRange, pagination.currentPage, pagination.pageSize]);

  // Effect to fetch data when component mounts or filters change
  useEffect(() => {
    fetchJobsData();
  }, [fetchJobsData]); // Fixed: use fetchJobsData as dependency

  // Listen for real-time updates
  useEffect(() => {
    if (socket) {
      socket.on('jobs/job-created', (data) => {
        const newJob = (data && (data.job || data)) || null;
        if (newJob) {
          setJobsData((prev: any[]) => [newJob, ...prev]);
          setPagination((prev: any) => ({
            ...prev,
            totalCount: (prev.totalCount || 0) + 1,
          }));
        } else {
          fetchJobsData();
        }
      });

      socket.on('jobs/job-updated', (data) => {
        const updated = (data && (data.job || data)) || null;
        if (updated && updated.jobId) {
          setJobsData((prev: any[]) => prev.map(j => j.jobId === updated.jobId ? updated : j));
        } else {
          fetchJobsData();
        }
      });

      socket.on('jobs/job-deleted', (data) => {
        const deletedId = data && data.jobId;
        if (deletedId) {
          setJobsData((prev: any[]) => prev.filter(j => j.jobId !== deletedId));
          setPagination((prev: any) => ({
            ...prev,
            totalCount: Math.max(0, (prev.totalCount || 1) - 1),
          }));
        } else {
          fetchJobsData();
        }
      });

      return () => {
        socket.off('jobs/job-created');
        socket.off('jobs/job-updated');
        socket.off('jobs/job-deleted');
      };
    }
  }, [socket, fetchJobsData]);

  // Export functions
  // const handleExportPDF = async () => {
  //   if (!socket) {
  //     alert("Socket connection not available");
  //     return;
  //   }

  //   setExporting(true);
  //   try {
  //     console.log("Starting PDF export...");
  //     socket.emit("jobs/export-pdf", { filters });

  //     const handlePDFResponse = (response: any) => {
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

  // Edit job function
  const handleEditJob = (job: any) => {
    setCurrentJob(job);
    setEditing(true);
    
    // Convert expiredDate to moment object if it exists
    let expiredDateValue = null;
    if (job.expiredDate) {
      // If it's already a moment object, use it directly
      if (job.expiredDate._isAMomentObject) {
        expiredDateValue = job.expiredDate;
      } else {
        // Convert Date string/object to moment
        expiredDateValue = moment(new Date(job.expiredDate));
      }
    }
    
    // Populate form with job data
    setJobForm({
      title: job.title || "",
      description: job.description || "",
      category: job.category || "",
      jobType: job.jobType || "",
      jobLevel: job.jobLevel || "",
      experience: job.experience || "",
      qualification: job.qualification || "",
      minSalary: job.minSalary ? `${job.minSalary}` : "",
      maxSalary: job.maxSalary ? `${job.maxSalary}` : "",
      expiredDate: expiredDateValue,
      skills: job.skills ? job.skills.join(', ') : "",
      address: job.location?.address || "",
      country: job.location?.country || "",
      state: job.location?.state || "",
      city: job.location?.city || "",
      zip: job.location?.zip || "",
      gender: job.gender || "",
      image: job.image || "",
      imageName: job.imageName || "",
      imageMime: job.imageMime || "",
    });
  };

  // Update job function
  const handleUpdateJob = () => {
    if (!socket || !currentJob) {
      alert('Socket not ready or no job selected');
      return;
    }

    // Basic validations
    const required = ['title','description','category','jobType','jobLevel','experience','qualification'];
    for (const f of required) {
      if (!jobForm[f] || (typeof jobForm[f] === 'string' && jobForm[f].trim() === '')) { 
        alert(`Please fill ${f}`); 
        return; 
      }
    }
    if (!jobForm.minSalary || !jobForm.maxSalary) { alert('Please select salary range'); return; }
    if (!jobForm.expiredDate) { alert('Please select expired date'); return; }
    if (!jobForm.address || !jobForm.country || !jobForm.state || !jobForm.city || !jobForm.zip) { 
      alert('Please complete location'); 
      return; 
    }

    const parseSalary = (val: string) => {
      if (typeof val !== 'string') return parseInt(val) || 0;
      const match = val.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    };

    const payload: any = {
      jobId: currentJob.jobId,
      title: jobForm.title.trim(),
      description: jobForm.description.trim(),
      category: jobForm.category,
      jobType: jobForm.jobType,
      jobLevel: jobForm.jobLevel,
      experience: jobForm.experience,
      qualification: jobForm.qualification,
      minSalary: parseSalary(jobForm.minSalary),
      maxSalary: parseSalary(jobForm.maxSalary),
      currency: 'USD',
      salaryPeriod: 'yearly',
      // Fix date conversion - extract the Date object from moment
      expiredDate: jobForm.expiredDate ? 
                  (jobForm.expiredDate.toDate ? jobForm.expiredDate.toDate() : 
                   (jobForm.expiredDate._d || jobForm.expiredDate)) : null,
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
    };

    if (payload.minSalary >= payload.maxSalary) { 
      alert('Min salary must be less than max salary'); 
      return; 
    }
    if (new Date(payload.expiredDate) <= new Date()) { 
      alert('Expired date must be in the future'); 
      return; 
    }

    setSubmitting(true);
    console.log('[UpdateJob][UI] Emitting jobs/update-job...');
    
    socket.emit('jobs/update-job', payload);
    const onResp = (resp: any) => {
      setSubmitting(false);
      socket.off('jobs/update-job-response', onResp);
      console.log('[UpdateJob][UI] Received jobs/update-job-response:', resp);
      
      if (resp?.done) {
        // Force refresh the data
        fetchJobsData();
        // Reset form and close modal
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
        setCurrentJob(null);
        setEditing(false);
        
        // Show success and close modal
        alert('Job updated successfully');
        const editPostEl: any = document.querySelector('#edit_post .btn-close');
        editPostEl?.click();
      } else {
        alert(resp?.message || resp?.error || 'Failed to update job');
      }
    };
    
    socket.on('jobs/update-job-response', onResp);
  };

  // Delete job function
  const handleDeleteJob = () => {
    if (!socket || !currentJob) {
      alert('Socket not ready or no job selected');
      return;
    }

    setDeleting(true);
    console.log('[DeleteJob][UI] Emitting jobs/delete-job...');
    
    socket.emit('jobs/delete-job', { jobId: currentJob.jobId });
    const onResp = (resp: any) => {
      setDeleting(false);
      socket.off('jobs/delete-job-response', onResp);
      console.log('[DeleteJob][UI] Received jobs/delete-job-response:', resp);
      
      if (resp?.done) {
        // Force refresh the data
        fetchJobsData();
      

        // Reset current job and close modal
        setCurrentJob(null);
        
        // Show success and close modal
        alert('Job deleted successfully');
        const deleteModalEl: any = document.querySelector('#delete_modal .btn-close');
        deleteModalEl?.click();
      } else {
        alert(resp?.message || resp?.error || 'Failed to delete job');
      }
    };
    
    socket.on('jobs/delete-job-response', onResp);
  };

  // const handleExportExcel = async () => {
  //   if (!socket) {
  //     alert("Socket connection not available");
  //     return;
  //   }

  //   setExporting(true);
  //   try {
  //     console.log("Starting Excel export...");
  //     socket.emit("jobs/export-excel", { filters });

  //     const handleExcelResponse = (response: any) => {
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
      doc.text("Jobs Report", 20, 20);
      
      doc.setFontSize(12);
      doc.text(`Generated on: ${currentDate}`, 20, 35);
      doc.text(`Time: ${currentTime}`, 20, 45);
      doc.text(`Total Jobs: ${jobsData.length}`, 20, 55);

      let yPosition = 70;

      // Summary section
      if (jobsData.length > 0) {
        const totalApplicants = jobsData.reduce((sum: number, job: any) => sum + (job.applicantsCount || 0), 0);
        const statusCounts = jobsData.reduce((acc: any, job: any) => {
          const status = job.status || 'Unknown';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {});

        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text("SUMMARY", 20, yPosition);
        
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.text(`Total Jobs: ${jobsData.length}`, 20, yPosition + 8);
        doc.text(`Total Applicants: ${totalApplicants}`, 20, yPosition + 16);
        doc.text(`Active Jobs: ${statusCounts['Published'] || 0}`, 100, yPosition + 8);
        doc.text(`Draft Jobs: ${statusCounts['Draft'] || 0}`, 100, yPosition + 16);

        yPosition += 30;
      }

      // Table header
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFillColor(59, 112, 128); // Secondary color
      doc.rect(20, yPosition, 170, 10, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text("JOB TITLE", 22, yPosition + 7);
      doc.text("CATEGORY", 70, yPosition + 7);
      doc.text("TYPE", 110, yPosition + 7);
      doc.text("LOCATION", 130, yPosition + 7);
      doc.text("STATUS", 170, yPosition + 7);
      yPosition += 13;

      // Table data
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);

      jobsData.forEach((job: any, index: number) => {
        if (yPosition > 280) {
          doc.addPage();
          yPosition = 20;
        }

        // Alternate row background
        if (index % 2 === 0) {
          doc.setFillColor(248, 249, 250);
          doc.rect(20, yPosition - 2, 170, 8, 'F');
        }

        // Truncate text to fit columns
        const title = (job.title || "N/A").substring(0, 25);
        const category = (job.category || "N/A").substring(0, 15);
        const jobType = (job.jobType || "N/A").substring(0, 10);
        const location = `${job.location?.city || ''}, ${job.location?.country || ''}`.substring(0, 15);
        const status = (job.status || "N/A").substring(0, 10);

        doc.text(title, 22, yPosition + 5);
        doc.text(category, 70, yPosition + 5);
        doc.text(jobType, 110, yPosition + 5);
        doc.text(location, 130, yPosition + 5);
        doc.text(status, 170, yPosition + 5);

        yPosition += 8;
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
      doc.save(`jobs_report_${Date.now()}.pdf`);
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
        "Job ID": job.jobId || "",
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
        { wch: 15 }, // Job ID
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
      XLSX.utils.book_append_sheet(wb, ws, "Jobs");

      // Save the Excel file
      XLSX.writeFile(wb, `jobs_report_${Date.now()}.xlsx`);
      setExporting(false);
      
      toast.success(`Excel exported successfully! ${jobsData.length} jobs`);
    } catch (error) {
      console.error("Error exporting Excel:", error);
      setExporting(false);
      toast.error("Failed to export Excel");
    }
  };

  const columns = [
    {
      title: "Job ID",
      dataIndex: "jobId",
      sorter: (a: any, b: any) => a.jobId.length - b.jobId.length,
    },
    {
      title: "Job Title",
      dataIndex: "title",
      render: (text: string, record: any) => (
        <div className="d-flex align-items-center file-name-icon">
          <Link to="#" className="avatar avatar-md bg-light rounded">
            {record.image && typeof record.image === 'string' && record.image.startsWith('data:') ? (
              <img
                src={record.image}
                className="img-fluid rounded-circle"
                alt="img"
              />
            ) : (
            <ImageWithBasePath
                src={record.image || "assets/img/icons/default-job.svg"}
              className="img-fluid rounded-circle"
              alt="img"
            />
            )}
          </Link>
          <div className="ms-2">
            <h6 className="fw-medium">
              <Link to="#">{record.title}</Link>
            </h6>
            <span className="d-block mt-1">{record.applicantsCount} Applicants</span>
          </div>
        </div>
      ),
      sorter: (a: any, b: any) => a.title.length - b.title.length,
    },
    {
      title: "Category",
      dataIndex: "category",
      sorter: (a: any, b: any) => a.category.length - b.category.length,
    },
    {
      title: "Location",
      dataIndex: "location",
      render: (text: string, record: any) => (
        <span>{record.location.city}, {record.location.country}</span>
      ),
      sorter: (a: any, b: any) => a.location.city.length - b.location.city.length,
    },
    {
      title: "Salary Range",
      dataIndex: "salaryRange",
      render: (text: string, record: any) => {
        const formatSalary = (amount) => {
          if (amount >= 1000) {
            return `${(amount / 1000).toFixed(0)}k`;
          }
          return amount.toString();
        };
        const min = formatSalary(record.minSalary);
        const max = formatSalary(record.maxSalary);
        const period = record.salaryPeriod === 'yearly' ? '/year' : '/month';
        return `${min} - ${max} ${record.currency} ${period}`;
      },
      sorter: (a: any, b: any) => a.minSalary - b.minSalary,
    },
    {
      title: "Posted Date",
      dataIndex: "postedDate",
      render: (text: string, record: any) => {
        return new Date(record.postedDate).toLocaleDateString();
      },
      sorter: (a: any, b: any) => new Date(a.postedDate).getTime() - new Date(b.postedDate).getTime(),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (text: string, record: any) => {
        const statusColors = {
          'Published': 'badge-success',
          'Draft': 'badge-warning',
          'Closed': 'badge-danger',
          'Expired': 'badge-secondary',
          'Cancelled': 'badge-dark'
        };
        return (
          <span className={`badge ${statusColors[record.status] || 'badge-secondary'}`}>
            {record.status}
          </span>
        );
      },
      sorter: (a: any, b: any) => a.status.length - b.status.length,
    },
    {
      title: "",
      dataIndex: "actions",
      render: (text: string, record: any) => (
        <div className="action-icon d-inline-flex">
          <Link
            to="#"
            className="me-2"
            data-bs-toggle="modal"
            data-bs-target="#edit_post"
            onClick={() => handleEditJob(record)}
          >
            <i className="ti ti-edit" />
          </Link>
          <Link 
            to="#" 
            data-bs-toggle="modal" 
            data-bs-target="#delete_modal"
            onClick={() => setCurrentJob(record)}
          >
            <i className="ti ti-trash" />
          </Link>
        </div>
      ),
    },
  ];

  const getModalContainer = () => {
    const modalElement = document.getElementById("modal-datepicker");
    return modalElement ? modalElement : document.body; // Fallback to document.body if modalElement is null
  };

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
                    className="btn btn-icon btn-sm active bg-primary text-white me-1"
                  >
                    <i className="ti ti-list-tree" />
                  </Link>
                  <Link to={all_routes.jobgrid} className="btn btn-icon btn-sm">
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
                  Post job
                </Link>
              </div>
              <div className="head-icons ms-2">
                <CollapseHeader />
              </div>
            </div>
          </div>
          {/* /Breadcrumb */}
          <div className="card">
          <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
            <h5>Job List</h5>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap row-gap-3">
              {/* Date Range Filter */}
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
              
              {/* Category Dropdown */}
              <div className="dropdown me-3">
                <Link
                  to="#"
                  className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                  data-bs-toggle="dropdown"
                >
                  Category: {filters.category || 'All Categories'}
                </Link>
                <ul className="dropdown-menu  dropdown-menu-end p-3">
                  <li>
                    <Link 
                      to="#" 
                      className="dropdown-item rounded-1"
                      onClick={() => setFilters(prev => ({ ...prev, category: '' }))}
                    >
                      All Categories
                    </Link>
                  </li>
                  <li>
                    <Link 
                      to="#" 
                      className="dropdown-item rounded-1"
                      onClick={() => setFilters(prev => ({ ...prev, category: 'Software' }))}
                    >
                      Software
                    </Link>
                  </li>
                  <li>
                    <Link 
                      to="#" 
                      className="dropdown-item rounded-1"
                      onClick={() => setFilters(prev => ({ ...prev, category: 'Design' }))}
                    >
                      Design
                    </Link>
                  </li>
                  <li>
                    <Link 
                      to="#" 
                      className="dropdown-item rounded-1"
                      onClick={() => setFilters(prev => ({ ...prev, category: 'Marketing' }))}
                    >
                      Marketing
                    </Link>
                  </li>
                </ul>
              </div>
              
              {/* Status Dropdown */}
              <div className="dropdown me-3">
                <Link
                  to="#"
                  className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                  data-bs-toggle="dropdown"
                >
                  Status: {filters.status || 'All Status'}
                </Link>
                <ul className="dropdown-menu  dropdown-menu-end p-3">
                  <li>
                    <Link 
                      to="#" 
                      className="dropdown-item rounded-1"
                      onClick={() => setFilters(prev => ({ ...prev, status: '' }))}
                    >
                      All Status
                    </Link>
                  </li>
                  <li>
                    <Link 
                      to="#" 
                      className="dropdown-item rounded-1"
                      onClick={() => setFilters(prev => ({ ...prev, status: 'Published' }))}
                    >
                      Published
                    </Link>
                  </li>
                  <li>
                    <Link 
                      to="#" 
                      className="dropdown-item rounded-1"
                      onClick={() => setFilters(prev => ({ ...prev, status: 'Draft' }))}
                    >
                      Draft
                    </Link>
                  </li>
                  <li>
                    <Link 
                      to="#" 
                      className="dropdown-item rounded-1"
                      onClick={() => setFilters(prev => ({ ...prev, status: 'Closed' }))}
                    >
                      Closed
                    </Link>
                  </li>
                  <li>
                    <Link 
                      to="#" 
                      className="dropdown-item rounded-1"
                      onClick={() => setFilters(prev => ({ ...prev, status: 'Expired' }))}
                    >
                      Expired
                    </Link>
                  </li>
                </ul>
              </div>
              
              {/* Job Type Dropdown */}
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
                      onClick={() => setFilters(prev => ({ ...prev, jobType: '' }))}
                    >
                      All Types
                    </Link>
                  </li>
                  <li>
                    <Link 
                      to="#" 
                      className="dropdown-item rounded-1"
                      onClick={() => setFilters(prev => ({ ...prev, jobType: 'Full Time' }))}
                    >
                      Full Time
                    </Link>
                  </li>
                  <li>
                    <Link 
                      to="#" 
                      className="dropdown-item rounded-1"
                      onClick={() => setFilters(prev => ({ ...prev, jobType: 'Part Time' }))}
                    >
                      Part Time
                    </Link>
                  </li>
                  <li>
                    <Link 
                      to="#" 
                      className="dropdown-item rounded-1"
                      onClick={() => setFilters(prev => ({ ...prev, jobType: 'Contract' }))}
                    >
                      Contract
                    </Link>
                  </li>
                  <li>
                    <Link 
                      to="#" 
                      className="dropdown-item rounded-1"
                      onClick={() => setFilters(prev => ({ ...prev, jobType: 'Freelance' }))}
                    >
                      Freelance
                    </Link>
                  </li>
                </ul>
              </div>
              
              {/* Rows per page Dropdown */}
              <div className="dropdown me-3">
                <Link
                  to="#"
                  className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                  data-bs-toggle="dropdown"
                >
                  Rows: {pagination.pageSize}
                </Link>
                <ul className="dropdown-menu dropdown-menu-end p-3">
                  {pageSizeOptions.map((size) => (
                    <li key={size}>
                      <Link 
                        to="#" 
                        className="dropdown-item rounded-1"
                        onClick={() => setPagination(prev => ({ ...prev, pageSize: size, currentPage: 1 }))}
                      >
                        {size} per page
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Sort By Dropdown */}
              <div className="dropdown">
                <Link
                  to="#"
                  className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                  data-bs-toggle="dropdown"
                >
                  Sort By: {filters.sortBy === 'postedDate' ? 'Recently Added' : filters.sortBy === 'title' ? (filters.sortOrder === 'asc' ? 'Title A-Z' : 'Title Z-A') : (filters.sortOrder === 'asc' ? 'Salary Low to High' : 'Salary High to Low')}
                </Link>
                <ul className="dropdown-menu  dropdown-menu-end p-3">
                  <li>
                    <Link 
                      to="#" 
                      className="dropdown-item rounded-1"
                      onClick={() => setFilters(prev => ({ ...prev, sortBy: 'postedDate', sortOrder: 'desc' }))}
                    >
                      Recently Added
                    </Link>
                  </li>
                  <li>
                    <Link 
                      to="#" 
                      className="dropdown-item rounded-1"
                      onClick={() => setFilters(prev => ({ ...prev, sortBy: 'title', sortOrder: 'asc' }))}
                    >
                      Title A-Z
                    </Link>
                  </li>
                  <li>
                    <Link 
                      to="#" 
                      className="dropdown-item rounded-1"
                      onClick={() => setFilters(prev => ({ ...prev, sortBy: 'title', sortOrder: 'desc' }))}
                    >
                      Title Z-A
                    </Link>
                  </li>
                  <li>
                    <Link 
                      to="#" 
                      className="dropdown-item rounded-1"
                      onClick={() => setFilters(prev => ({ ...prev, sortBy: 'minSalary', sortOrder: 'asc' }))}
                    >
                      Salary Low to High
                    </Link>
                  </li>
                  <li>
                    <Link 
                      to="#" 
                      className="dropdown-item rounded-1"
                      onClick={() => setFilters(prev => ({ ...prev, sortBy: 'minSalary', sortOrder: 'desc' }))}
                    >
                      Salary High to Low
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="card-body p-0">
            {loading ? (
              <div className="text-center p-4">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2">Loading jobs...</p>
              </div>
            ) : error ? (
              <div className="text-center p-4">
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
                <button 
                  className="btn btn-primary" 
                  onClick={fetchJobsData}
                >
                  Retry
                </button>
              </div>
            ) : (
              <>

                
                {/* Table Component - Remove pagination prop since it's not supported */}
                <Table 
                  dataSource={jobsData} 
                  columns={columns} 
                  Selection={true}
                  rowId="_id"
                />
              </>
            )}
          </div>
          </div>
        </div>
        <Footer />
      </div>
      {/* /Page Wrapper */}
      {/* Add Post */}
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
                            <input type="text" className="form-control" value={jobForm.title} onChange={(e) => updateForm("title", e.target.value)} />
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
                            <input type="text" className="form-control" value={jobForm.skills} onChange={(e) => updateForm("skills", e.target.value)} />
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
                            <input type="text" className="form-control" value={jobForm.address} onChange={(e) => updateForm("address", e.target.value)} />
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
                            <input type="text" className="form-control" value={jobForm.zip} onChange={(e) => updateForm("zip", e.target.value)} />
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
                              title="Location Map"
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
                              // Debug fields will be logged below
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
      {/* Edit Post */}
      <div className="modal fade" id="edit_post">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Edit Job</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={() => {
                  setEditing(false);
                  setCurrentJob(null);
                }}
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); }}>
              <div className="modal-body pb-0">
                <div className="row">
                  <div className="contact-grids-tab pt-0">
                    <ul
                      className="nav nav-underline"
                      id="myTabs"
                      role="tablist"
                    >
                      <li className="nav-item" role="presentation">
                        <button
                          className="nav-link active"
                          id="edit-info-tab"
                          data-bs-toggle="tab"
                          data-bs-target="#edit-basic-info"
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
                          id="edit-address-tab"
                          data-bs-toggle="tab"
                          data-bs-target="#edit-address"
                          type="button"
                          role="tab"
                          aria-selected="false"
                        >
                          Location
                        </button>
                      </li>
                    </ul>
                  </div>
                  <div className="tab-content" id="editTabContent">
                    <div
                      className="tab-pane fade show active"
                      id="edit-basic-info"
                      role="tabpanel"
                      aria-labelledby="edit-info-tab"
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
                              Job Description <span className="text-danger"> *</span>
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
                              Job Category <span className="text-danger"> *</span>
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
                              Qualification <span className="text-danger"> *</span>
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
                              Min. Salary <span className="text-danger"> *</span>
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
                              Max. Salary <span className="text-danger"> *</span>
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
                              Job Expired Date <span className="text-danger"> *</span>
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
                          onClick={() => {
                            setEditing(false);
                            setCurrentJob(null);
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => {
                            const addressTab: any = document.querySelector('#edit-address-tab');
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
                      id="edit-address"
                      role="tabpanel"
                      aria-labelledby="edit-address-tab"
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
                              title="Location Map"
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
                          onClick={() => {
                            setEditing(false);
                            setCurrentJob(null);
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={handleUpdateJob}
                          disabled={submitting}
                        >
                          {submitting ? 'Updating...' : 'Update Job'}
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
      {/* Delete Confirmation Modal */}
      <div className="modal fade" id="delete_modal" role="dialog">
        <div className="modal-dialog modal-dialog-centered modal-sm">
          <div className="modal-content">
            <div className="modal-body">
              <div className="text-center p-3">
                <span className="avatar avatar-lg avatar-rounded bg-danger mb-3">
                  <i className="ti ti-alert-triangle fs-24" />
                </span>
                <h5 className="mb-2">Delete Job</h5>
                <p className="mb-3">Are you sure you want to delete this job?</p>
                <div className="row g-2">
                  <div className="col-6">
                    <button
                      type="button"
                      className="btn btn-light w-100"
                      data-bs-dismiss="modal"
                      disabled={deleting}
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="col-6">
                    <button
                      type="button"
                      className="btn btn-danger w-100"
                      onClick={handleDeleteJob}
                      disabled={deleting}
                    >
                      {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
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

export default JobList;