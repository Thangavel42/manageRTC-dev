import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { all_routes } from "../router/all_routes";
import ImageWithBasePath from "../../core/common/imageWithBasePath";
import ReactApexChart from "react-apexcharts";
import TicketListModal from "../../core/modals/ticketListModal";
import CollapseHeader from "../../core/common/collapse-header/collapse-header";
import Footer from "../../core/common/footer";
import { useSocket } from "../../SocketContext";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

const Tickets = () => {
  const routes = all_routes;
  const socket = useSocket();
  
  // State for dynamic data
  const [ticketsStats, setTicketsStats] = useState({
    newTickets: 0,
    openTickets: 0,
    solvedTickets: 0,
    pendingTickets: 0,
    percentageChange: 0,
    monthlyTrends: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    categoryStats: [],
    agentStats: []
  });
  const [loading, setLoading] = useState(true);

  // State for ticket list
  const [ticketsList, setTicketsList] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [filters, setFilters] = useState({
    priority: '',
    status: '',
    sortBy: 'recently'
  });
  const [exportLoading, setExportLoading] = useState(false);

  // Fetch tickets statistics
  useEffect(() => {
    if (socket) {
      socket.emit('tickets/dashboard/get-stats');
      
      socket.on('tickets/dashboard/get-stats-response', (response) => {
        if (response.done) {
          setTicketsStats(response.data);
        }
        setLoading(false);
      });

      return () => {
        socket.off('tickets/dashboard/get-stats-response');
      };
    }
  }, [socket]);

  // Listen for real-time updates
  useEffect(() => {
    if (socket) {
      console.log('🎧 TICKETS: Setting up real-time event listeners...');
      
      socket.on('tickets/ticket-created', (data) => {
        console.log('🔄 TICKETS: Ticket created event received:', data);
        socket.emit('tickets/dashboard/get-stats');
        fetchTicketsList(); // Refresh the ticket list
      });

      socket.on('tickets/ticket-updated', (data) => {
        console.log('🔄 TICKETS: Ticket updated event received:', data);
        socket.emit('tickets/dashboard/get-stats');
        fetchTicketsList(); // Refresh the ticket list
      });

      socket.on('tickets/ticket-deleted', (data) => {
        console.log('🔄 TICKETS: Ticket deleted event received:', data);
        socket.emit('tickets/dashboard/get-stats');
        fetchTicketsList(); // Refresh the ticket list
      });

      return () => {
        console.log('🧹 TICKETS: Cleaning up real-time event listeners...');
        socket.off('tickets/ticket-created');
        socket.off('tickets/ticket-updated');
        socket.off('tickets/ticket-deleted');
      };
    }
  }, [socket]);

  // Fetch tickets list
  const fetchTicketsList = () => {
    if (socket) {
      socket.emit('tickets/list/get-tickets', {
        page: 1,
        limit: 50,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
    }
  };

  // Set up socket listener for tickets list response
  useEffect(() => {
    if (socket) {
      const handleTicketsListResponse = (response: any) => {
        if (response.done) {
          console.log('📋 FRONTEND: Received tickets list:', response.data.length, 'tickets');
          setTicketsList(response.data);
          setFilteredTickets(response.data);
        }
      };

      socket.on('tickets/list/get-tickets-response', handleTicketsListResponse);

      // Initial fetch
      fetchTicketsList();

      return () => {
        socket.off('tickets/list/get-tickets-response', handleTicketsListResponse);
      };
    }
  }, [socket]);

  // Filter and sort tickets
  useEffect(() => {
    let filtered = [...ticketsList];

    // Apply priority filter
    if (filters.priority) {
      filtered = filtered.filter(ticket => ticket.priority === filters.priority);
    }

    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter(ticket => ticket.status === filters.status);
    }

    // Apply sorting
    switch (filters.sortBy) {
      case 'recently':
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'ascending':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'descending':
        filtered.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case 'lastMonth':
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        filtered = filtered.filter(ticket => new Date(ticket.createdAt).getTime() >= lastMonth.getTime());
        break;
      case 'last7Days':
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);
        filtered = filtered.filter(ticket => new Date(ticket.createdAt).getTime() >= last7Days.getTime());
        break;
      default:
        break;
    }

    setFilteredTickets(filtered);
  }, [ticketsList, filters]);

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // Helper function to get priority badge class
  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'High': return 'badge-danger';
      case 'Medium': return 'badge-warning';
      case 'Low': return 'badge-success';
      case 'Critical': return 'badge-danger';
      default: return 'badge-secondary';
    }
  };

  // Helper function to get status badge class
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'New': return 'bg-outline-primary';
      case 'Open': return 'bg-outline-pink';
      case 'On Hold': return 'bg-outline-warning';
      case 'Solved': return 'bg-outline-success';
      case 'Closed': return 'bg-outline-secondary';
      default: return 'bg-outline-info';
    }
  };

  // Helper function to format time ago
  const getTimeAgo = (date) => {
    const now = new Date();
    const ticketDate = new Date(date);
    const diffInHours = Math.floor((now.getTime() - ticketDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return ticketDate.toLocaleDateString();
  };

  // Handle PDF export
  const handleExportPDF = async () => {
    try {
      setExportLoading(true);
      const doc = new jsPDF();
      const currentDate = new Date().toLocaleDateString();
      const currentTime = new Date().toLocaleTimeString();
      const currentYear = new Date().getFullYear();

      // Company colors (based on website theme)
      const primaryColor = [242, 101, 34]; // Orange - primary brand color
      const secondaryColor = [59, 112, 128]; // Blue-gray - secondary color
      const textColor = [33, 37, 41]; // Dark gray - main text
      const lightGray = [248, 249, 250]; // Light background
      const borderColor = [222, 226, 230]; // Border color

      // Add company logo with multiple fallback options
      const addCompanyLogo = async () => {
        console.log('🎯 Starting logo loading process...');
        
        // Try to load the new manage RTC logo first
        const logoPaths = [
          '/assets/img/logo.svg',           // New manage RTC logo (priority)
          '/assets/img/logo-white.svg',     // White version of manage RTC logo
          '/assets/img/logo-small.svg',     // Small version of manage RTC logo
        ];
        
        for (const logoPath of logoPaths) {
          try {
            console.log(`🔄 Loading NEW logo: ${logoPath}`);
            
            // Try multiple approaches to load the logo
            const approaches = [
              // Approach 1: Direct fetch with cache busting
              `${logoPath}?v=${Date.now()}&bust=${Math.random()}`,
              // Approach 2: Simple cache busting
              `${logoPath}?t=${Date.now()}`,
              // Approach 3: No cache busting
              logoPath
            ];
            
            for (const url of approaches) {
              try {
                console.log(`🔄 Trying URL: ${url}`);
                const response = await fetch(url, {
                  method: 'GET',
                  cache: 'no-store',
                  headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                  }
                });
                
                if (response.ok) {
                  console.log(`✅ Logo response OK: ${response.status}`);
                  
                  // Get the SVG content as text
                  const svgText = await response.text();
                  console.log(`📄 SVG content length: ${svgText.length} characters`);
                  
                  // Check if this is a valid SVG
                  if (svgText.includes('<svg') && svgText.length > 100) {
                    console.log('🎉 Found valid SVG logo!');
                  } else {
                    console.log('⚠️ Invalid SVG content, trying next approach...');
                    continue;
                  }
                  
                  // Try to convert SVG to canvas for better PDF compatibility
                  try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const img = new Image();
                    
                    // Set canvas size to maintain aspect ratio (logo.svg is 115x40)
                    canvas.width = 115;
                    canvas.height = 40;
                    
                    // Create a promise to handle image loading
                    const imagePromise = new Promise((resolve, reject) => {
                      img.onload = () => {
                        try {
                          // Draw the SVG image to canvas maintaining aspect ratio
                          ctx?.drawImage(img, 0, 0, 115, 40);
                          
                          // Convert canvas to PNG data URL
                          const pngDataUrl = canvas.toDataURL('image/png');
                          console.log(`✅ Successfully converted SVG to PNG: ${logoPath}`);
                          resolve(pngDataUrl);
                        } catch (error) {
                          reject(error);
                        }
                      };
                      img.onerror = reject;
                      
                      // Set the SVG as image source
                      const svgDataUrl = `data:image/svg+xml;base64,${btoa(svgText)}`;
                      img.src = svgDataUrl;
                    });
                    
                    // Wait for image conversion
                    const pngDataUrl = await imagePromise;
                    
                    // Add PNG to PDF with proper dimensions (maintain aspect ratio)
                    doc.addImage(pngDataUrl as string, 'PNG', 20, 15, 30, 10.4);
                    console.log(`✅ Successfully added logo to PDF: ${logoPath}`);
                    return true;
                    
                  } catch (canvasError) {
                    console.log(`❌ Canvas conversion failed:`, canvasError);
                    
                    // Fallback: Try direct SVG
                    try {
                      const svgDataUrl = `data:image/svg+xml;base64,${btoa(svgText)}`;
                      doc.addImage(svgDataUrl, 'SVG', 20, 15, 30, 10.4);
                      console.log(`✅ Successfully added logo as SVG: ${logoPath}`);
                      return true;
                    } catch (svgError) {
                      console.log(`❌ SVG format also failed:`, svgError);
                    }
                  }
                } else {
                  console.log(`❌ Logo fetch failed: ${response.status} ${response.statusText}`);
                }
              } catch (fetchError) {
                console.log(`❌ Fetch error for ${url}:`, fetchError);
              }
            }
          } catch (error) {
            console.log(`❌ Error loading ${logoPath}:`, error);
          }
        }
        
        console.log('❌ All logo loading attempts failed');
        return false;
      };

      // Try to add logo - NO FALLBACK TEXT, ONLY USE YOUR NEW LOGOS
      const logoAdded = await addCompanyLogo();
      if (!logoAdded) {
        console.log("❌ CRITICAL: New logo loading failed!");
        console.log("🔍 Check if logo files exist: /assets/img/logo.svg, /assets/img/logo-white.svg, /assets/img/logo-small.svg");
        console.log("📁 Make sure React dev server is running and files are accessible");
        // NO FALLBACK TEXT - just leave space for logo
        console.log("⚠️ No logo added to PDF - using empty space instead of fallback text");
      } else {
        console.log("✅ Logo successfully added to PDF!");
      }

      // Header section
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('Tickets Report', 50, 30);

      // Company info
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${currentDate} at ${currentTime}`, 50, 40);
      doc.text(`Total Tickets: ${filteredTickets.length}`, 50, 45);

      // Add security watermark
      (doc as any).setGState(new (doc as any).GState({opacity: 0.1}));
      doc.setTextColor(128, 128, 128);
      doc.setFontSize(60);
      doc.setFont('helvetica', 'bold');
      doc.text('CONFIDENTIAL', 60, 120, {angle: 45});
      (doc as any).setGState(new (doc as any).GState({opacity: 1}));

      // Table headers
      let yPosition = 60;
      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.rect(20, yPosition, 170, 8, 'F');
      
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      
      doc.text('Ticket ID', 22, yPosition + 6);
      doc.text('Title', 45, yPosition + 6);
      doc.text('Status', 90, yPosition + 6);
      doc.text('Priority', 110, yPosition + 6);
      doc.text('Assigned To', 130, yPosition + 6);
      doc.text('Created', 160, yPosition + 6);

      yPosition += 10;

      // Table data
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      
      filteredTickets.forEach((ticket, index) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
          
          // Add header to new page
          doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
          doc.rect(20, yPosition, 170, 8, 'F');
          doc.setTextColor(textColor[0], textColor[1], textColor[2]);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text('Ticket ID', 22, yPosition + 6);
          doc.text('Title', 45, yPosition + 6);
          doc.text('Status', 90, yPosition + 6);
          doc.text('Priority', 110, yPosition + 6);
          doc.text('Assigned To', 130, yPosition + 6);
          doc.text('Created', 160, yPosition + 6);
          yPosition += 10;
        }

        // Alternate row colors
        if (index % 2 === 0) {
          doc.setFillColor(255, 255, 255);
        } else {
          doc.setFillColor(248, 249, 250);
        }
        doc.rect(20, yPosition, 170, 6, 'F');

        // Row data
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        
        doc.text(ticket.ticketId || 'N/A', 22, yPosition + 4);
        doc.text((ticket.title || 'Untitled').substring(0, 20), 45, yPosition + 4);
        doc.text(ticket.status || 'New', 90, yPosition + 4);
        doc.text(ticket.priority || 'Medium', 110, yPosition + 4);
        doc.text(
          ticket.assignedTo?.firstName && ticket.assignedTo?.lastName 
            ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`.substring(0, 15)
            : 'Unassigned', 
          130, 
          yPosition + 4
        );
        doc.text(new Date(ticket.createdAt).toLocaleDateString(), 160, yPosition + 4);

        yPosition += 8;
      });

      // Footer
      const pageCount = (doc as any).getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(`Page ${i} of ${pageCount}`, 20, 290);
        doc.text(`© ${currentYear} HRMS Tool. All rights reserved.`, 120, 290);
      }

      // Save the PDF
      doc.save(`tickets_report_${Date.now()}.pdf`);
      setExportLoading(false);
      console.log("PDF exported successfully");
    } catch (error) {
      setExportLoading(false);
      console.error("Error exporting PDF:", error);
      alert("Failed to export PDF");
    }
  };

  // Handle Excel export
  const handleExportExcel = () => {
    try {
      setExportLoading(true);
      const currentDate = new Date().toLocaleDateString();
      const wb = XLSX.utils.book_new();

      // Prepare tickets data for Excel
      const ticketsDataForExcel = filteredTickets.map((ticket: any) => ({
        "Ticket ID": ticket.ticketId || "",
        "Title": ticket.title || "",
        "Description": ticket.description || "",
        "Category": ticket.category || "",
        "Status": ticket.status || "",
        "Priority": ticket.priority || "",
        "Assigned To": ticket.assignedTo?.firstName && ticket.assignedTo?.lastName 
          ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`
          : "Unassigned",
        "Created By": ticket.createdBy?.firstName && ticket.createdBy?.lastName 
          ? `${ticket.createdBy.firstName} ${ticket.createdBy.lastName}`
          : "Unknown",
        "Created Date": ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : "",
        "Updated Date": ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleDateString() : "",
        "Comments Count": ticket.comments?.length || 0,
        "Tags": ticket.tags?.join(', ') || ""
      }));

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(ticketsDataForExcel);
      
      // Set column widths
      const colWidths = [
        { wch: 15 }, // Ticket ID
        { wch: 30 }, // Title
        { wch: 40 }, // Description
        { wch: 20 }, // Category
        { wch: 15 }, // Status
        { wch: 15 }, // Priority
        { wch: 25 }, // Assigned To
        { wch: 25 }, // Created By
        { wch: 15 }, // Created Date
        { wch: 15 }, // Updated Date
        { wch: 15 }, // Comments Count
        { wch: 30 }  // Tags
      ];
      ws['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Tickets");

      // Save the Excel file
      XLSX.writeFile(wb, `tickets_report_${Date.now()}.xlsx`);
      setExportLoading(false);
      console.log("Excel exported successfully");
    } catch (error) {
      setExportLoading(false);
      console.error("Error exporting Excel:", error);
      alert("Failed to export Excel");
    }
  };

  // Dynamic chart data that updates with ticketsStats
  const Areachart = {
    series: [
      {
        name: "Tickets",
        data: ticketsStats.monthlyTrends || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      },
    ],

    chart: {
      type: "bar" as const,
      width: 70,
      height: 70,
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: false,
      },
      dropShadow: {
        enabled: false,
        top: 3,
        left: 14,
        blur: 4,
        opacity: 0.12,
        color: "#fff",
      },
      sparkline: {
        enabled: !0,
      },
    },
    markers: {
      size: 0,
      colors: ["#F26522"],
      strokeColors: "#fff",
      strokeWidth: 2,
      hover: {
        size: 7,
      },
    },
    plotOptions: {
      bar: {
        horizontal: !1,
        columnWidth: "35%",
        endingShape: "rounded",
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: !0,
      width: 2.5,
      curve: "smooth" as const,
    },
    colors: ["#FF6F28"],
    xaxis: {
      categories: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
      ],
      labels: {
        show: false,
      },
    },
    tooltip: {
      show: false,
      theme: "dark",
      fixed: {
        enabled: false,
      },
      x: {
        show: false,
      },

      marker: {
        show: false,
      },
    },
  };
  const Areachart1 = {
    series: [
      {
        name: "Tickets",
        data: ticketsStats.monthlyTrends || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      },
    ],

    chart: {
      type: "bar" as const,
      width: 70,
      height: 70,
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: false,
      },
      dropShadow: {
        enabled: false,
        top: 3,
        left: 14,
        blur: 4,
        opacity: 0.12,
        color: "#fff",
      },
      sparkline: {
        enabled: !0,
      },
    },
    markers: {
      size: 0,
      colors: ["#F26512"],
      strokeColors: "#fff",
      strokeWidth: 2,
      hover: {
        size: 7,
      },
    },
    plotOptions: {
      bar: {
        horizontal: !1,
        columnWidth: "35%",
        endingShape: "rounded",
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: !0,
      width: 2.5,
      curve: "smooth" as const,
    },
    colors: ["#AB47BC"],
    xaxis: {
      categories: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
      ],
      labels: {
        show: false,
      },
    },
    tooltip: {
      show: false,
      theme: "dark",
      fixed: {
        enabled: false,
      },
      x: {
        show: false,
      },

      marker: {
        show: false,
      },
    },
  };
  const Areachart2 = {
    series: [
      {
        name: "Tickets",
        data: ticketsStats.monthlyTrends || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      },
    ],

    chart: {
      type: "bar" as const,
      width: 70,
      height: 70,
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: false,
      },
      dropShadow: {
        enabled: false,
        top: 3,
        left: 14,
        blur: 4,
        opacity: 0.12,
        color: "#fff",
      },
      sparkline: {
        enabled: !0,
      },
    },
    markers: {
      size: 0,
      colors: ["#F26522"],
      strokeColors: "#fff",
      strokeWidth: 2,
      hover: {
        size: 7,
      },
    },
    plotOptions: {
      bar: {
        horizontal: !1,
        columnWidth: "35%",
        endingShape: "rounded",
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: !0,
      width: 2.5,
      curve: "smooth" as const,
    },
    colors: ["#02C95A"],
    xaxis: {
      categories: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
      ],
      labels: {
        show: false,
      },
    },
    tooltip: {
      show: false,
      theme: "dark",
      fixed: {
        enabled: false,
      },
      x: {
        show: false,
      },

      marker: {
        show: false,
      },
    },
  };
  const Areachart3 = {
    series: [
      {
        name: "Tickets",
        data: ticketsStats.monthlyTrends || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      },
    ],

    chart: {
      type: "bar" as const,
      width: 70,
      height: 70,
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: false,
      },
      dropShadow: {
        enabled: false,
        top: 3,
        left: 14,
        blur: 4,
        opacity: 0.12,
        color: "#fff",
      },
      sparkline: {
        enabled: !0,
      },
    },
    markers: {
      size: 0,
      colors: ["#F26522"],
      strokeColors: "#fff",
      strokeWidth: 2,
      hover: {
        size: 7,
      },
    },
    plotOptions: {
      bar: {
        horizontal: !1,
        columnWidth: "35%",
        endingShape: "rounded",
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: !0,
      width: 2.5,
      curve: "smooth" as const,
    },
    colors: ["#0DCAF0"],
    xaxis: {
      categories: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
      ],
      labels: {
        show: false,
      },
    },
    tooltip: {
      show: false,
      theme: "dark",
      fixed: {
        enabled: false,
      },
      x: {
        show: false,
      },

      marker: {
        show: false,
      },
    },
  };

  return (
    <>
      {/* Page Wrapper */}
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Tickets</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">Employee</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Tickets
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
              <div className="me-2 mb-2">
                <div className="d-flex align-items-center border bg-white rounded p-1 me-2 icon-list">
                  <Link
                    to={routes.tickets}
                    className="btn btn-icon btn-sm active bg-primary text-white me-1"
                  >
                    <i className="ti ti-list-tree" />
                  </Link>
                  <Link to={routes.ticketGrid} className="btn btn-icon btn-sm">
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
                      >
                        <i className="ti ti-file-type-pdf me-1" />
                        Export as PDF
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
                      >
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
                  data-bs-target="#add_ticket"
                  className="btn btn-primary d-flex align-items-center"
                >
                  <i className="ti ti-circle-plus me-2" />
                  Add Ticket
                </Link>
              </div>
              <div className="head-icons ms-2">
                <CollapseHeader />
              </div>
            </div>
          </div>
          {/* /Breadcrumb */}
          <div className="row">
            <div className="col-xl-3 col-md-6 d-flex">
              <div className="card flex-fill">
                <div className="card-body">
                  <div className="row">
                    <div className="col-6 d-flex">
                      <div className="flex-fill">
                        <div className="border border-dashed border-primary rounded-circle d-inline-flex align-items-center justify-content-center p-1 mb-3">
                          <span className="avatar avatar-lg avatar-rounded bg-primary-transparent ">
                            <i className="ti ti-ticket fs-20" />
                          </span>
                        </div>
                        <p className="fw-medium fs-12 mb-1">New Tickets</p>
                        <h4>{loading ? '...' : ticketsStats.newTickets}</h4>
                      </div>
                    </div>
                    <div className="col-6 text-end d-flex">
                      <div className="d-flex flex-column justify-content-between align-items-end">
                        <span className="badge bg-transparent-purple d-inline-flex align-items-center mb-3">
                          <i className="ti ti-arrow-wave-right-down me-1" />
                          {loading ? '...' : `+${ticketsStats.percentageChange}%`}
                        </span>
                        <ReactApexChart
                          options={{
                            ...Areachart,
                            series: [{
                              name: "Tickets",
                              data: ticketsStats.monthlyTrends || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
                            }]
                          }}
                          series={[{
                            name: "Tickets",
                            data: ticketsStats.monthlyTrends || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
                          }]}
                          type="bar"
                          height={70}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-md-6 d-flex">
              <div className="card flex-fill">
                <div className="card-body">
                  <div className="row">
                    <div className="col-6 d-flex">
                      <div className="flex-fill">
                        <div className="border border-dashed border-purple rounded-circle d-inline-flex align-items-center justify-content-center p-1 mb-3">
                          <span className="avatar avatar-lg avatar-rounded bg-transparent-purple">
                            <i className="ti ti-folder-open fs-20" />
                          </span>
                        </div>
                        <p className="fw-medium fs-12 mb-1">Open Tickets</p>
                        <h4>{loading ? '...' : ticketsStats.openTickets}</h4>
                      </div>
                    </div>
                    <div className="col-6 text-end d-flex">
                      <div className="d-flex flex-column justify-content-between align-items-end">
                        <span className="badge bg-transparent-dark text-dark d-inline-flex align-items-center mb-3">
                          <i className="ti ti-arrow-wave-right-down me-1" />
                          {loading ? '...' : `+${ticketsStats.percentageChange}%`}
                        </span>
                        <ReactApexChart
                          options={{
                            ...Areachart1,
                            series: [{
                              name: "Tickets",
                              data: ticketsStats.monthlyTrends || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
                            }]
                          }}
                          series={[{
                            name: "Tickets",
                            data: ticketsStats.monthlyTrends || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
                          }]}
                          type="bar"
                          height={70}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-md-6 d-flex">
              <div className="card flex-fill">
                <div className="card-body">
                  <div className="row">
                    <div className="col-6 d-flex">
                      <div className="flex-fill">
                        <div className="border border-dashed border-success rounded-circle d-inline-flex align-items-center justify-content-center p-1 mb-3">
                          <span className="avatar avatar-lg avatar-rounded bg-success-transparent">
                            <i className="ti ti-checks fs-20" />
                          </span>
                        </div>
                        <p className="fw-medium fs-12 mb-1">Solved Tickets</p>
                        <h4>{loading ? '...' : ticketsStats.solvedTickets}</h4>
                      </div>
                    </div>
                    <div className="col-6 text-end d-flex">
                      <div className="d-flex flex-column justify-content-between align-items-end">
                        <span className="badge bg-info-transparent d-inline-flex align-items-center mb-3">
                          <i className="ti ti-arrow-wave-right-down me-1" />
                          {loading ? '...' : `+${ticketsStats.percentageChange}%`}
                        </span>
                        <ReactApexChart
                          options={{
                            ...Areachart2,
                            series: [{
                              name: "Tickets",
                              data: ticketsStats.monthlyTrends || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
                            }]
                          }}
                          series={[{
                            name: "Tickets",
                            data: ticketsStats.monthlyTrends || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
                          }]}
                          type="bar"
                          height={70}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-md-6 d-flex">
              <div className="card flex-fill">
                <div className="card-body">
                  <div className="row">
                    <div className="col-6 d-flex">
                      <div className="flex-fill">
                        <div className="border border-dashed border-info rounded-circle d-inline-flex align-items-center justify-content-center p-1 mb-3">
                          <span className="avatar avatar-lg avatar-rounded bg-info-transparent">
                            <i className="ti ti-progress-alert fs-20" />
                          </span>
                        </div>
                        <p className="fw-medium fs-12 mb-1">Pending Tickets</p>
                        <h4>{loading ? '...' : ticketsStats.pendingTickets}</h4>
                      </div>
                    </div>
                    <div className="col-6 text-end d-flex">
                      <div className="d-flex flex-column justify-content-between align-items-end">
                        <span className="badge bg-secondary-transparent d-inline-flex align-items-center mb-3">
                          <i className="ti ti-arrow-wave-right-down me-1" />
                          {loading ? '...' : `+${ticketsStats.percentageChange}%`}
                        </span>
                        <ReactApexChart
                          options={{
                            ...Areachart3,
                            series: [{
                              name: "Tickets",
                              data: ticketsStats.monthlyTrends || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
                            }]
                          }}
                          series={[{
                            name: "Tickets",
                            data: ticketsStats.monthlyTrends || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
                          }]}
                          type="bar"
                          height={70}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-body p-3">
              <div className="d-flex align-items-center justify-content-between flex-wrap row-gap-3">
                <h5>Ticket List</h5>
                <div className="d-flex align-items-center flex-wrap row-gap-3">
                  <div className="dropdown me-2">
                    <Link
                      to="#"
                      className="dropdown-toggle btn btn-sm btn-white d-inline-flex align-items-center"
                      data-bs-toggle="dropdown"
                    >
                      {filters.priority || 'Priority'}
                    </Link>
                    <ul className="dropdown-menu  dropdown-menu-end p-3">
                      <li>
                        <Link 
                          to="#" 
                          className="dropdown-item rounded-1"
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange('priority', '');
                          }}
                        >
                          All Priorities
                        </Link>
                      </li>
                      <li>
                        <Link 
                          to="#" 
                          className="dropdown-item rounded-1"
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange('priority', 'High');
                          }}
                        >
                          High
                        </Link>
                      </li>
                      <li>
                        <Link 
                          to="#" 
                          className="dropdown-item rounded-1"
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange('priority', 'Low');
                          }}
                        >
                          Low
                        </Link>
                      </li>
                      <li>
                        <Link 
                          to="#" 
                          className="dropdown-item rounded-1"
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange('priority', 'Medium');
                          }}
                        >
                          Medium
                        </Link>
                      </li>
                    </ul>
                  </div>
                  <div className="dropdown me-2">
                    <Link
                      to="#"
                      className="dropdown-toggle btn btn-sm btn-white d-inline-flex align-items-center"
                      data-bs-toggle="dropdown"
                    >
                      {filters.status || 'Select Status'}
                    </Link>
                    <ul className="dropdown-menu  dropdown-menu-end p-3">
                      <li>
                        <Link 
                          to="#" 
                          className="dropdown-item rounded-1"
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange('status', '');
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
                            handleFilterChange('status', 'New');
                          }}
                        >
                          New
                        </Link>
                      </li>
                      <li>
                        <Link 
                          to="#" 
                          className="dropdown-item rounded-1"
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange('status', 'Open');
                          }}
                        >
                          Open
                        </Link>
                      </li>
                      <li>
                        <Link 
                          to="#" 
                          className="dropdown-item rounded-1"
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange('status', 'On Hold');
                          }}
                        >
                          On Hold
                        </Link>
                      </li>
                      <li>
                        <Link 
                          to="#" 
                          className="dropdown-item rounded-1"
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange('status', 'Solved');
                          }}
                        >
                          Solved
                        </Link>
                      </li>
                      <li>
                        <Link 
                          to="#" 
                          className="dropdown-item rounded-1"
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange('status', 'Closed');
                          }}
                        >
                          Closed
                        </Link>
                      </li>
                    </ul>
                  </div>
                  <div className="dropdown">
                    <Link
                      to="#"
                      className="dropdown-toggle btn btn-sm btn-white d-inline-flex align-items-center"
                      data-bs-toggle="dropdown"
                    >
                      Sort By: {filters.sortBy === 'recently' ? 'Recently Added' : 
                               filters.sortBy === 'ascending' ? 'Ascending' :
                               filters.sortBy === 'descending' ? 'Descending' :
                               filters.sortBy === 'lastMonth' ? 'Last Month' :
                               filters.sortBy === 'last7Days' ? 'Last 7 Days' : 'Recently Added'}
                    </Link>
                    <ul className="dropdown-menu  dropdown-menu-end p-3">
                      <li>
                        <Link 
                          to="#" 
                          className="dropdown-item rounded-1"
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange('sortBy', 'recently');
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
                            handleFilterChange('sortBy', 'ascending');
                          }}
                        >
                          Ascending
                        </Link>
                      </li>
                      <li>
                        <Link 
                          to="#" 
                          className="dropdown-item rounded-1"
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange('sortBy', 'descending');
                          }}
                        >
                          Descending
                        </Link>
                      </li>
                      <li>
                        <Link 
                          to="#" 
                          className="dropdown-item rounded-1"
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange('sortBy', 'lastMonth');
                          }}
                        >
                          Last Month
                        </Link>
                      </li>
                      <li>
                        <Link 
                          to="#" 
                          className="dropdown-item rounded-1"
                          onClick={(e) => {
                            e.preventDefault();
                            handleFilterChange('sortBy', 'last7Days');
                          }}
                        >
                          Last 7 Days
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-xl-9 col-md-8">
              {filteredTickets.length > 0 ? (
                filteredTickets.map((ticket, index) => (
                  <div key={ticket.ticketId || index} className="card mb-3">
                <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
                      <h5 className="text-info fw-medium">{ticket.category || 'IT Support'}</h5>
                  <div className="d-flex align-items-center">
                        <span className={`badge ${getPriorityBadgeClass(ticket.priority)} d-inline-flex align-items-center`}>
                      <i className="ti ti-circle-filled fs-5 me-1" />
                          {ticket.priority || 'Medium'}
                    </span>
                  </div>
                </div>
                <div className="card-body">
                  <div>
                    <span className="badge badge-info rounded-pill mb-2">
                          {ticket.ticketId || 'N/A'}
                    </span>
                    <div className="d-flex align-items-center mb-2">
                      <h5 className="fw-semibold me-2">
                            <Link to={`${routes.ticketDetails}?id=${ticket.ticketId}`}>
                              {ticket.title || 'Untitled'}
                            </Link>
                      </h5>
                          <span className={`badge ${getStatusBadgeClass(ticket.status)} d-flex align-items-center ms-1`}>
                        <i className="ti ti-circle-filled fs-5 me-1" />
                            {ticket.status || 'New'}
                      </span>
                    </div>
                    <div className="d-flex align-items-center flex-wrap row-gap-2">
                      <p className="d-flex align-items-center mb-0 me-2">
                        <ImageWithBasePath
                              src={ticket.assignedTo?.avatar || "assets/img/profiles/avatar-01.jpg"}
                          className="avatar avatar-xs rounded-circle me-2"
                          alt="img"
                        />{" "}
                        Assigned to{" "}
                            <span className="text-dark ms-1">
                              {ticket.assignedTo?.firstName && ticket.assignedTo?.lastName 
                                ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`
                                : 'Unassigned'
                              }
                    </span>
                      </p>
                      <p className="d-flex align-items-center mb-0 me-2">
                        <i className="ti ti-calendar-bolt me-1" />
                            Updated {getTimeAgo(ticket.updatedAt)}
                      </p>
                      <p className="d-flex align-items-center mb-0">
                            <i className="ti ti-message-share me-1" />
                            {ticket.comments?.length || 0} Comments
                      </p>
                    </div>
                  </div>
                </div>
              </div>
                ))
              ) : (
              <div className="card">
                  <div className="card-body text-center py-5">
                    <i className="ti ti-ticket fs-48 text-muted mb-3"></i>
                    <h5 className="text-muted">No tickets found</h5>
                    <p className="text-muted">Try adjusting your filters or create a new ticket.</p>
                  </div>
                </div>
              )}
              {filteredTickets.length > 10 && (
              <div className="text-center mb-4">
                <Link to="#" className="btn btn-primary">
                  <i className="ti ti-loader-3 me-1" />
                  Load More
                </Link>
              </div>
              )}
            </div>
            <div className="col-xl-3 col-md-4">
              <div className="card">
                <div className="card-header">
                  <h4>Ticket Categories</h4>
                </div>
                <div className="card-body p-0">
                  <div className="d-flex flex-column">
                    <div className="d-flex align-items-center justify-content-between border-bottom p-3">
                      <Link to="#">Internet Issue</Link>
                      <div className="d-flex align-items-center">
                        <span className="badge badge-xs bg-dark rounded-circle">
                          0
                        </span>
                      </div>
                    </div>
                    <div className="d-flex align-items-center justify-content-between border-bottom p-3">
                      <Link to="#">Computer</Link>
                      <div className="d-flex align-items-center">
                        <span className="badge badge-xs bg-dark rounded-circle">
                          1
                        </span>
                      </div>
                    </div>
                    <div className="d-flex align-items-center justify-content-between border-bottom p-3">
                      <Link to="#">Redistribute</Link>
                      <div className="d-flex align-items-center">
                        <span className="badge badge-xs bg-dark rounded-circle">
                          0
                        </span>
                      </div>
                    </div>
                    <div className="d-flex align-items-center justify-content-between border-bottom p-3">
                      <Link to="#">Payment</Link>
                      <div className="d-flex align-items-center">
                        <span className="badge badge-xs bg-dark rounded-circle">
                          2
                        </span>
                      </div>
                    </div>
                    <div className="d-flex align-items-center justify-content-between p-3">
                      <Link to="#">Complaint</Link>
                      <div className="d-flex align-items-center">
                        <span className="badge badge-xs bg-dark rounded-circle">
                          1
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="card-header">
                  <h4>Support Agents</h4>
                </div>
                <div className="card-body p-0">
                  <div className="d-flex flex-column">
                    <div className="d-flex align-items-center justify-content-between border-bottom p-3">
                      <span className="d-flex align-items-center">
                        <ImageWithBasePath
                          src="assets/img/profiles/avatar-01.jpg"
                          className="avatar avatar-xs rounded-circle me-2"
                          alt="img"
                        />
                        Edgar Hansel
                      </span>
                      <div className="d-flex align-items-center">
                        <span className="badge badge-xs bg-dark rounded-circle">
                          0
                        </span>
                      </div>
                    </div>
                    <div className="d-flex align-items-center justify-content-between border-bottom p-3">
                      <span className="d-flex align-items-center">
                        <ImageWithBasePath
                          src="assets/img/profiles/avatar-02.jpg"
                          className="avatar avatar-xs rounded-circle me-2"
                          alt="img"
                        />
                        Ann Lynch
                      </span>
                      <div className="d-flex align-items-center">
                        <span className="badge badge-xs bg-dark rounded-circle">
                          1
                        </span>
                      </div>
                    </div>
                    <div className="d-flex align-items-center justify-content-between border-bottom p-3">
                      <span className="d-flex align-items-center">
                        <ImageWithBasePath
                          src="assets/img/profiles/avatar-03.jpg"
                          className="avatar avatar-xs rounded-circle me-2"
                          alt="img"
                        />
                        Juan Hermann
                      </span>
                      <div className="d-flex align-items-center">
                        <span className="badge badge-xs bg-dark rounded-circle">
                          0
                        </span>
                      </div>
                    </div>
                    <div className="d-flex align-items-center justify-content-between p-3">
                      <span className="d-flex align-items-center">
                        <ImageWithBasePath
                          src="assets/img/profiles/avatar-04.jpg"
                          className="avatar avatar-xs rounded-circle me-2"
                          alt="img"
                        />
                        Jessie Otero
                      </span>
                      <div className="d-flex align-items-center">
                        <span className="badge badge-xs bg-dark rounded-circle">
                          2
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
      {/* /Page Wrapper */}

      <TicketListModal />
    </>
  );
};

export default Tickets;
