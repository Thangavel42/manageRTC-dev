import jsPDF from "jspdf";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";
import CollapseHeader from "../../core/common/collapse-header/collapse-header";
import Footer from "../../core/common/footer";
import ImageWithBasePath from "../../core/common/imageWithBasePath";
import AssignTicketModal from "../../core/modals/AssignTicketModal";
import EditTicketModal from "../../core/modals/EditTicketModal";
import TicketListModal from "../../core/modals/ticketListModal";
import { useAuth } from "../../hooks/useAuth";
import { useSocket } from "../../SocketContext";
import { all_routes } from "../router/all_routes";

const Tickets = () => {
  const routes = all_routes;
  const socket = useSocket();
  const { role, userId } = useAuth();

  // Tab configuration
  const isAdmin = ['superadmin', 'admin', 'hr'].includes(role);

  const normalUserTabs = [
    { id: 'my-tickets', label: 'My Tickets' },
    { id: 'closed', label: 'Closed' }
  ];

  const adminTabs = [
    { id: 'new', label: 'New' },
    { id: 'active', label: 'Active' },
    { id: 'resolved', label: 'Resolved' },
    { id: 'closed', label: 'Closed' },
    { id: 'my-tickets', label: 'My Tickets' }
  ];

  const tabs = isAdmin ? adminTabs : normalUserTabs;

  // Get current tab from URL hash or default to first tab
  const getCurrentTabFromHash = () => {
    const hash = window.location.hash.replace('#', '');
    return tabs.find(tab => tab.id === hash)?.id || tabs[0].id;
  };

  // State for current tab
  const [currentTab, setCurrentTab] = useState(getCurrentTabFromHash());

  // State for "My Tickets" sub-tabs
  const [myTicketsSubTab, setMyTicketsSubTab] = useState<'assigned-to-me' | 'created-by-me'>('assigned-to-me');

  // State for view mode (list or grid)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

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
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [filters, setFilters] = useState({
    priority: '',
    sortBy: 'recently'
  });
  const [exportLoading, setExportLoading] = useState(false);

  // State for categories
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // State for IT Support agents sidebar
  const [supportAgents, setSupportAgents] = useState([]);
  const [loadingAgents, setLoadingAgents] = useState(false);

  // Tab counts
  const [tabCounts, setTabCounts] = useState({});

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

  // Fetch ticket categories with counts
  useEffect(() => {
    if (socket) {
      setLoadingCategories(true);
      socket.emit('tickets/categories/get-categories');

      socket.on('tickets/categories/get-categories-response', (response) => {
        if (response.done) {
          setCategories(response.data);
        }
        setLoadingCategories(false);
      });

      return () => {
        socket.off('tickets/categories/get-categories-response');
      };
    }
  }, [socket]);

  // Fetch IT Support employees for sidebar
  useEffect(() => {
    if (socket) {
      setLoadingAgents(true);
      socket.emit('tickets/employees/get-list');

      const handleAgentsResponse = (response: any) => {
        if (response.done) {
          setSupportAgents(response.data || []);
        }
        setLoadingAgents(false);
      };

      socket.on('tickets/employees/get-list-response', handleAgentsResponse);

      return () => {
        socket.off('tickets/employees/get-list-response', handleAgentsResponse);
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
        socket.emit('tickets/categories/get-categories'); // Refresh categories with new counts
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
        socket.emit('tickets/categories/get-categories'); // Refresh categories with new counts
        fetchTicketsList(); // Refresh the ticket list
      });

      socket.on('tickets/category-created', (data) => {
        console.log('🔄 TICKETS: Category created event received:', data);
        socket.emit('tickets/categories/get-categories'); // Refresh categories list
      });

      socket.on('tickets/category-updated', (data) => {
        console.log('🔄 TICKETS: Category updated event received:', data);
        socket.emit('tickets/categories/get-categories'); // Refresh categories list
      });

      socket.on('tickets/category-deleted', (data) => {
        console.log('🔄 TICKETS: Category deleted event received:', data);
        socket.emit('tickets/categories/get-categories'); // Refresh categories list
      });

      return () => {
        console.log('🧹 TICKETS: Cleaning up real-time event listeners...');
        socket.off('tickets/ticket-created');
        socket.off('tickets/ticket-updated');
        socket.off('tickets/ticket-deleted');
        socket.off('tickets/category-created');
        socket.off('tickets/category-updated');
        socket.off('tickets/category-deleted');
      };
    }
  }, [socket]);

  // Fetch tickets list (role-based with tab support)
  const fetchTicketsList = () => {
    if (socket) {
      console.log(`📋 Fetching tickets for tab: ${currentTab}, sub-tab: ${myTicketsSubTab}, role: ${role}`);
      setTicketsLoading(true);

      // For 'my-tickets' tab, include sub-tab filter
      const emitData: any = {
        tab: currentTab,
        page: 1,
        limit: 50,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };

      if (currentTab === 'my-tickets') {
        emitData.subTab = myTicketsSubTab;
      }

      socket.emit('tickets/get-my-tickets', emitData);
    }
  };

  // Handle tab change
  const handleTabChange = (tabId: string) => {
    setCurrentTab(tabId);
    window.location.hash = tabId;
  };

  // Update current tab when URL hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const tabFromHash = getCurrentTabFromHash();
      if (tabFromHash !== currentTab) {
        setCurrentTab(tabFromHash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [currentTab]);

  // Set up socket listener for tickets list response
  useEffect(() => {
    if (socket) {
      const handleTicketsListResponse = (response: any) => {
        if (response.done) {
          console.log('📋 FRONTEND: Received tickets list:', response.data.length, 'tickets');
          setTicketsList(response.data);
          setFilteredTickets(response.data);
        }
        setTicketsLoading(false);
      };

      socket.on('tickets/get-my-tickets-response', handleTicketsListResponse);

      // Initial fetch
      fetchTicketsList();

      return () => {
        socket.off('tickets/get-my-tickets-response', handleTicketsListResponse);
      };
    }
  }, [socket, currentTab, myTicketsSubTab]); // Re-fetch when currentTab or myTicketsSubTab changes

  // Fetch tab counts
  useEffect(() => {
    if (socket) {
      const handleTabCountsResponse = (response: any) => {
        if (response.done) {
          console.log('📊 Tab counts:', response.data);
          setTabCounts(response.data);
        }
      };

      socket.on('tickets/get-tab-counts-response', handleTabCountsResponse);

      // Fetch tab counts
      socket.emit('tickets/get-tab-counts');

      return () => {
        socket.off('tickets/get-tab-counts-response', handleTabCountsResponse);
      };
    }
  }, [socket]);

  // Listen for real-time updates and refresh tab counts
  useEffect(() => {
    if (socket) {
      const handleUpdate = () => {
        // Refresh tab counts when tickets are updated
        socket.emit('tickets/get-tab-counts');
      };

      socket.on('tickets/ticket-created', handleUpdate);
      socket.on('tickets/ticket-updated', handleUpdate);
      socket.on('tickets/ticket-deleted', handleUpdate);

      return () => {
        socket.off('tickets/ticket-created', handleUpdate);
        socket.off('tickets/ticket-updated', handleUpdate);
        socket.off('tickets/ticket-deleted', handleUpdate);
      };
    }
  }, [socket]);

  // Filter and sort tickets
  useEffect(() => {
    let filtered = [...ticketsList];

    // Apply priority filter only (status is handled by tabs)
    if (filters.priority) {
      filtered = filtered.filter(ticket => ticket.priority === filters.priority);
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
      case 'Open': return 'bg-outline-primary';
      case 'Assigned': return 'bg-outline-info';
      case 'In Progress': return 'bg-outline-pink';
      case 'On Hold': return 'bg-outline-warning';
      case 'Resolved': return 'bg-outline-success';
      case 'Closed': return 'bg-outline-secondary';
      case 'Reopened': return 'bg-outline-danger';
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
        doc.text(`© ${currentYear} ManageRTC. All rights reserved.`, 120, 290);
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

  // Render ticket card for grid view
  const renderTicketCard = (ticket) => {
    return (
      <div key={ticket.ticketId} className="col-xl-3 col-lg-4 col-md-6">
        <div className="card">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div className="form-check form-check-md">
                <input className="form-check-input" type="checkbox" />
              </div>
              <div>
                <Link
                  to={`${routes.ticketDetails}?id=${ticket.ticketId}`}
                  className={`avatar avatar-xl avatar-rounded border p-1 rounded-circle ${ticket.createdBy ? 'online border-primary' : ''}`}
                  style={!ticket.createdBy ? { opacity: 0.5, borderColor: '#dee2e6' } : {}}
                >
                  <ImageWithBasePath
                    src={ticket.createdBy?.avatarUrl || ticket.createdBy?.avatar || "assets/img/profiles/avatar-01.jpg"}
                    className="img-fluid h-auto w-auto"
                    alt={ticket.createdBy ? `${ticket.createdBy.firstName || ''} ${ticket.createdBy.lastName || ''}`.trim() : "Unknown"}
                  />
                </Link>
              </div>
              <div className="dropdown">
                <button
                  className="btn btn-icon btn-sm rounded-circle"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <i className="ti ti-dots-vertical" />
                </button>
                <ul className="dropdown-menu dropdown-menu-end p-3">
                  <li>
                    <Link
                      className="dropdown-item rounded-1"
                      to="#"
                      data-bs-toggle="modal"
                      data-bs-target="#edit_ticket"
                    >
                      <i className="ti ti-edit me-1" />
                      Edit
                    </Link>
                  </li>
                  <li>
                    <Link
                      className="dropdown-item rounded-1"
                      to="#"
                      data-bs-toggle="modal"
                      data-bs-target="#delete_modal"
                    >
                      <i className="ti ti-trash me-1" />
                      Delete
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className="text-center mb-3">
              <h6 className="mb-1">
                <Link to={`${routes.ticketDetails}?id=${ticket.ticketId}`}>{ticket.title || 'Untitled'}</Link>
              </h6>
              <span className="badge bg-info-transparent fs-10 fw-medium">
                {ticket.ticketId || 'N/A'}
              </span>
            </div>
            <div className="d-flex flex-column">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <span>Category</span>
                <h6 className="fw-medium">{ticket.category || 'N/A'}</h6>
              </div>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <span>Status</span>
                <span className={`badge ${getStatusBadgeClass(ticket.status)} d-inline-flex align-items-center fs-10 fw-medium`}>
                  <i className="ti ti-circle-filled fs-5 me-1" />
                  {ticket.status || 'N/A'}
                </span>
              </div>
              <div className="d-flex align-items-center justify-content-between">
                <span>Priority</span>
                <span className={`badge ${getPriorityBadgeClass(ticket.priority)} d-inline-flex align-items-center fs-10 fw-medium`}>
                  <i className="ti ti-circle-filled fs-5 me-1" />
                  {ticket.priority || 'N/A'}
                </span>
              </div>
            </div>
            <div className="d-flex align-items-center justify-content-between border-top pt-3 mt-3">
              <div>
                <p className="mb-1 fs-12">Assigned To</p>
                <div className="d-flex align-items-center">
                  <span className="avatar avatar-xs avatar-rounded me-2">
                    {ticket.assignedTo ? (
                      <ImageWithBasePath
                        src={ticket.assignedTo.avatarUrl || ticket.assignedTo.avatar || "assets/img/profiles/avatar-01.jpg"}
                        alt="Assigned"
                      />
                    ) : (
                      <ImageWithBasePath
                        src="assets/img/profiles/avatar-01.jpg"
                        alt="Unassigned"
                        style={{ opacity: 0.5 }}
                      />
                    )}
                  </span>
                  <h6 className="fw-normal">
                    {ticket.assignedTo?.firstName && ticket.assignedTo?.lastName
                      ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`
                      : 'Unassigned'
                    }
                  </h6>
                </div>
              </div>
              <div className="icons-social d-flex align-items-center">
                <Link
                  to="#"
                  className="avatar avatar-rounded avatar-sm bg-primary-transparent me-2"
                >
                  <i className="ti ti-message text-primary" />
                </Link>
                <Link
                  to="#"
                  className="avatar avatar-rounded avatar-sm bg-light"
                >
                  <i className="ti ti-phone" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
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
                  <button
                    onClick={() => setViewMode('list')}
                    className={`btn btn-icon btn-sm me-1 ${viewMode === 'list' ? 'active bg-primary text-white' : ''}`}
                  >
                    <i className="ti ti-list-tree" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`btn btn-icon btn-sm ${viewMode === 'grid' ? 'active bg-primary text-white' : ''}`}
                  >
                    <i className="ti ti-layout-grid" />
                  </button>
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
                        {/* <span className="badge bg-transparent-purple d-inline-flex align-items-center mb-3">
                          <i className="ti ti-arrow-wave-right-down me-1" />
                          {loading ? '...' : `+${ticketsStats.percentageChange}%`}
                        </span> */}
                        {/* <ReactApexChart
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
                        /> */}
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
                        {/* <span className="badge bg-transparent-dark text-dark d-inline-flex align-items-center mb-3">
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
                        /> */}
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
                        {/* <span className="badge bg-info-transparent d-inline-flex align-items-center mb-3">
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
                        /> */}
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
                        {/* <span className="badge bg-secondary-transparent d-inline-flex align-items-center mb-3">
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
                        /> */}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Ticket Tabs Navigation */}
          <ul className="nav nav-tabs nav-tabs-bottom mb-3">
            {tabs.map((tab) => (
              <li className="nav-item" key={tab.id}>
                <Link
                  to={`#${tab.id}`}
                  className={`nav-link ${currentTab === tab.id ? 'active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    handleTabChange(tab.id);
                  }}
                >
                  {tab.label}
                  {tabCounts[tab.id] !== undefined && (
                    <span className="badge bg-primary ms-1">{tabCounts[tab.id] || 0}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>

          {/* Sub-tabs for "My Tickets" - Assigned to Me / Created by Me */}
          {currentTab === 'my-tickets' && (
            <ul className="nav nav-tabs nav-tabs-bottom-sub mb-3">
              <li className="nav-item">
                <Link
                  to="#assigned-to-me"
                  className={`nav-link ${myTicketsSubTab === 'assigned-to-me' ? 'active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setMyTicketsSubTab('assigned-to-me');
                  }}
                >
                  Assigned to Me
                </Link>
              </li>
              <li className="nav-item">
                <Link
                  to="#created-by-me"
                  className={`nav-link ${myTicketsSubTab === 'created-by-me' ? 'active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setMyTicketsSubTab('created-by-me');
                  }}
                >
                  Created by Me
                </Link>
              </li>
            </ul>
          )}

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
              {/* Loading State */}
              {ticketsLoading && (
                <div className="row">
                  {[1, 2, 3, 4].map((item) => (
                    <div key={item} className="col-xl-3 col-lg-4 col-md-6">
                      <div className="card">
                        <div className="card-body">
                          <div className="d-flex justify-content-between mb-3">
                            <div className="bg-light rounded" style={{ height: '20px', width: '20px' }}></div>
                            <div className="bg-light rounded-circle" style={{ height: '60px', width: '60px' }}></div>
                            <div className="bg-light rounded" style={{ height: '20px', width: '20px' }}></div>
                          </div>
                          <div className="text-center mb-3">
                            <div className="bg-light rounded mx-auto mb-2" style={{ height: '20px', width: '70%' }}></div>
                            <div className="bg-light rounded mx-auto" style={{ height: '16px', width: '40%' }}></div>
                          </div>
                          <div className="bg-light rounded mb-2" style={{ height: '16px', width: '100%' }}></div>
                          <div className="bg-light rounded mb-2" style={{ height: '16px', width: '100%' }}></div>
                          <div className="bg-light rounded mb-3" style={{ height: '16px', width: '100%' }}></div>
                          <div className="d-flex justify-content-between border-top pt-3">
                            <div className="bg-light rounded" style={{ height: '30px', width: '45%' }}></div>
                            <div className="bg-light rounded" style={{ height: '30px', width: '45%' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="col-12 text-center mt-3">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading tickets...</span>
                    </div>
                    <p className="mt-2 text-muted">Loading tickets...</p>
                  </div>
                </div>
              )}

              {/* Grid View */}
              {!ticketsLoading && viewMode === 'grid' && (
                <div className="row">
                  {filteredTickets.length > 0 ? (
                    filteredTickets.map((ticket) => renderTicketCard(ticket))
                  ) : (
                    <div className="col-12">
                      <div className="card">
                        <div className="card-body text-center py-5">
                          <i className="ti ti-ticket fs-48 text-muted mb-3"></i>
                          <h5 className="text-muted">No tickets found</h5>
                          <p className="text-muted">Try adjusting your filters or create a new ticket.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* List View */}
              {!ticketsLoading && viewMode === 'list' && (
                <>
                  {filteredTickets.length > 0 ? (
                    <div className="card">
                      <div className="card-body p-0">
                        <div className="table-responsive">
                          <table className="table table-hover table-striped mb-0">
                            <thead>
                              <tr>
                                <th style={{ width: '5%' }}>
                                  <div className="form-check form-check-md">
                                    <input className="form-check-input" type="checkbox" />
                                  </div>
                                </th>
                                <th style={{ width: '10%' }}>Ticket ID</th>
                                <th style={{ width: '25%' }}>Title</th>
                                <th style={{ width: '12%' }}>Category</th>
                                <th style={{ width: '12%' }}>Status</th>
                                <th style={{ width: '10%' }}>Priority</th>
                                <th style={{ width: '12%' }}>Assigned To</th>
                                <th style={{ width: '10%' }}>Updated</th>
                                <th style={{ width: '4%' }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredTickets.map((ticket, index) => (
                                <tr key={ticket.ticketId || index}>
                                  <td>
                                    <div className="form-check form-check-md">
                                      <input className="form-check-input" type="checkbox" />
                                    </div>
                                  </td>
                                  <td>
                                    <span className="badge bg-info-transparent fw-medium">
                                      {ticket.ticketId || 'N/A'}
                                    </span>
                                  </td>
                                  <td>
                                    <div className="d-flex flex-column">
                                      <Link
                                        to={`${routes.ticketDetails}?id=${ticket.ticketId}`}
                                        className="text-dark fw-semibold mb-1"
                                      >
                                        {ticket.title || 'Untitled'}
                                      </Link>
                                      <div className="d-flex align-items-center">
                                        <ImageWithBasePath
                                          src={ticket.createdBy?.avatarUrl || ticket.createdBy?.avatar || "assets/img/profiles/avatar-01.jpg"}
                                          className="avatar avatar-xs rounded-circle me-2"
                                          alt="Creator"
                                        />
                                        <small className="text-muted">
                                          {ticket.createdBy?.firstName && ticket.createdBy?.lastName
                                            ? `${ticket.createdBy.firstName} ${ticket.createdBy.lastName}`
                                            : 'Unknown'
                                          }
                                        </small>
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    <div className="d-flex flex-column">
                                      <span className="fw-medium mb-1">{ticket.category || 'N/A'}</span>
                                      {ticket.subCategory && (
                                        <small className="text-muted">
                                          <i className="ti ti-arrow-right me-1" />
                                          {ticket.subCategory}
                                        </small>
                                      )}
                                    </div>
                                  </td>
                                  <td>
                                    <span className={`badge ${getStatusBadgeClass(ticket.status)} d-inline-flex align-items-center`}>
                                      <i className="ti ti-circle-filled fs-5 me-1" />
                                      {ticket.status || 'New'}
                                    </span>
                                  </td>
                                  <td>
                                    <span className={`badge ${getPriorityBadgeClass(ticket.priority)} d-inline-flex align-items-center`}>
                                      <i className="ti ti-circle-filled fs-5 me-1" />
                                      {ticket.priority || 'Medium'}
                                    </span>
                                  </td>
                                  <td>
                                    <div className="d-flex align-items-center">
                                      {ticket.assignedTo ? (
                                        <>
                                          <ImageWithBasePath
                                            src={ticket.assignedTo.avatarUrl || ticket.assignedTo.avatar || "assets/img/profiles/avatar-01.jpg"}
                                            className="avatar avatar-xs rounded-circle me-2"
                                            alt="Assigned"
                                          />
                                          <span className="text-truncate" style={{ maxWidth: '120px' }}>
                                            {ticket.assignedTo.firstName && ticket.assignedTo.lastName
                                              ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`
                                              : 'Assigned'
                                            }
                                          </span>
                                        </>
                                      ) : (
                                        <>
                                          <ImageWithBasePath
                                            src="assets/img/profiles/avatar-01.jpg"
                                            className="avatar avatar-xs rounded-circle me-2"
                                            alt="Unassigned"
                                            style={{ opacity: 0.5 }}
                                          />
                                          <span className="text-muted">Unassigned</span>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                  <td>
                                    <div className="d-flex flex-column">
                                      <small className="text-muted mb-1">
                                        <i className="ti ti-calendar me-1" />
                                        {getTimeAgo(ticket.updatedAt)}
                                      </small>
                                      <small className="text-muted">
                                        <i className="ti ti-message me-1" />
                                        {ticket.comments?.length || 0} Comments
                                      </small>
                                    </div>
                                  </td>
                                  <td>
                                    <div className="dropdown">
                                      <button
                                        className="btn btn-icon btn-sm rounded-circle"
                                        type="button"
                                        data-bs-toggle="dropdown"
                                        aria-expanded="false"
                                      >
                                        <i className="ti ti-dots-vertical" />
                                      </button>
                                      <ul className="dropdown-menu dropdown-menu-end p-3">
                                        <li>
                                          <Link
                                            className="dropdown-item rounded-1"
                                            to={`${routes.ticketDetails}?id=${ticket.ticketId}`}
                                          >
                                            <i className="ti ti-eye me-2" />
                                            View Details
                                          </Link>
                                        </li>
                                        {ticket.status === 'Open' && ticket.createdBy?._id === userId && (
                                          <li>
                                            <button
                                              type="button"
                                              className="dropdown-item rounded-1"
                                              data-bs-toggle="modal"
                                              data-bs-target="#edit_ticket"
                                              data-ticket-id={ticket.ticketId}
                                              data-ticket-title={ticket.title}
                                              data-ticket-description={ticket.description}
                                              data-ticket-category={ticket.category}
                                              data-ticket-subcategory={ticket.subCategory}
                                              data-ticket-priority={ticket.priority}
                                            >
                                              <i className="ti ti-edit me-2" />
                                              Edit
                                            </button>
                                          </li>
                                        )}
                                        {(role === 'hr' || role === 'admin' || role === 'superadmin') && (
                                          <li>
                                            <button
                                              type="button"
                                              className="dropdown-item rounded-1"
                                              data-bs-toggle="modal"
                                              data-bs-target="#assign_ticket"
                                              data-ticket-id={ticket.ticketId}
                                              data-ticket-title={ticket.title}
                                              data-current-assignee={
                                                ticket.assignedTo?.firstName && ticket.assignedTo?.lastName
                                                  ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`
                                                  : 'Unassigned'
                                              }
                                              data-current-assignee-id={ticket.assignedTo?._id || ''}
                                            >
                                              <i className="ti ti-user-check me-2" />
                                              {ticket.assignedTo?._id ? 'Reassign' : 'Assign'}
                                            </button>
                                          </li>
                                        )}
                                      </ul>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="card">
                      <div className="card-body text-center py-5">
                        <i className="ti ti-ticket fs-48 text-muted mb-3"></i>
                        <h5 className="text-muted">No tickets found</h5>
                        <p className="text-muted">Try adjusting your filters or create a new ticket.</p>
                      </div>
                    </div>
                  )}
                </>
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
                <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
                  <h4>Ticket Categories</h4>
                  {role === 'superadmin' && (
                    <Link
                      to="#"
                      data-bs-toggle="modal"
                      data-bs-target="#add_category"
                      className="btn btn-primary d-flex align-items-center"
                    >
                      <i className="ti ti-circle-plus me-2" />
                      Add
                    </Link>
                  )}
                </div>
                <div className="card-body p-0">
                  {loadingCategories ? (
                    <div className="d-flex align-items-center justify-content-center p-3">
                      <div className="spinner-border spinner-border-sm" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  ) : categories && categories.length > 0 ? (
                    <div className="d-flex flex-column">
                      {categories.map((category, index) => (
                        <div
                          key={category._id || index}
                          className={`d-flex align-items-center justify-content-between p-3 ${
                            index < categories.length - 1 ? 'border-bottom' : ''
                          }`}
                        >
                          <Link to="#">{category.name}</Link>
                          <div className="d-flex align-items-center">
                            <span className="badge badge-xs bg-dark rounded-circle">
                              {category.ticketCount || 0}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="d-flex align-items-center justify-content-center p-3 text-muted">
                      <p className="mb-0">No categories available</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="card">
                <div className="card-header">
                  <h4>Support Agents</h4>
                </div>
                <div className="card-body p-0">
                  <div className="d-flex flex-column">
                    {loadingAgents ? (
                      <div className="d-flex align-items-center justify-content-center p-3">
                        <div className="spinner-border spinner-border-sm" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      </div>
                    ) : supportAgents.length > 0 ? (
                      supportAgents.map((agent: any, index: number) => (
                        <div
                          key={agent._id || index}
                          className={`d-flex align-items-center justify-content-between p-3 ${
                            index < supportAgents.length - 1 ? 'border-bottom' : ''
                          }`}
                        >
                          <span className="d-flex align-items-center">
                            <ImageWithBasePath
                              src={agent.avatar || 'assets/img/profiles/avatar-01.jpg'}
                              className="avatar avatar-xs rounded-circle me-2"
                              alt="img"
                            />
                            {agent.firstName || agent.lastName
                              ? `${agent.firstName || ''} ${agent.lastName || ''}`.trim()
                              : agent.employeeId || 'Unknown'}
                          </span>
                          <div className="d-flex align-items-center">
                            <span className="badge badge-xs bg-dark rounded-circle">{agent.ticketCount || 0}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="d-flex align-items-center justify-content-center p-3 text-muted">
                        <p className="mb-0">No IT Support employees found</p>
                      </div>
                    )}
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
      <EditTicketModal onTicketUpdated={fetchTicketsList} />
      <AssignTicketModal onTicketAssigned={fetchTicketsList} />
    </>
  );
};

export default Tickets;
