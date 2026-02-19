"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
var jspdf_1 = require("jspdf");
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var XLSX = require("xlsx");
var collapse_header_1 = require("../../core/common/collapse-header/collapse-header");
var footer_1 = require("../../core/common/footer");
var imageWithBasePath_1 = require("../../core/common/imageWithBasePath");
var AssignTicketModal_1 = require("../../core/modals/AssignTicketModal");
var EditTicketModal_1 = require("../../core/modals/EditTicketModal");
var ticketListModal_1 = require("../../core/modals/ticketListModal");
var useAuth_1 = require("../../hooks/useAuth");
var SocketContext_1 = require("../../SocketContext");
var all_routes_1 = require("../router/all_routes");
var Tickets = function () {
    var routes = all_routes_1.all_routes;
    var socket = SocketContext_1.useSocket();
    var _a = useAuth_1.useAuth(), role = _a.role, userId = _a.userId;
    // Tab configuration
    var isAdmin = ['superadmin', 'admin', 'hr'].includes(role);
    var normalUserTabs = [
        { id: 'my-tickets', label: 'My Tickets' },
        { id: 'closed', label: 'Closed' }
    ];
    var adminTabs = [
        { id: 'new', label: 'New' },
        { id: 'active', label: 'Active' },
        { id: 'resolved', label: 'Resolved' },
        { id: 'closed', label: 'Closed' },
        { id: 'my-tickets', label: 'My Tickets' }
    ];
    var tabs = isAdmin ? adminTabs : normalUserTabs;
    // Get current tab from URL hash or default to first tab
    var getCurrentTabFromHash = function () {
        var _a;
        var hash = window.location.hash.replace('#', '');
        return ((_a = tabs.find(function (tab) { return tab.id === hash; })) === null || _a === void 0 ? void 0 : _a.id) || tabs[0].id;
    };
    // State for current tab
    var _b = react_1.useState(getCurrentTabFromHash()), currentTab = _b[0], setCurrentTab = _b[1];
    // State for "My Tickets" sub-tabs
    var _c = react_1.useState('assigned-to-me'), myTicketsSubTab = _c[0], setMyTicketsSubTab = _c[1];
    // State for view mode (list or grid)
    var _d = react_1.useState('list'), viewMode = _d[0], setViewMode = _d[1];
    // State for dynamic data
    var _e = react_1.useState({
        newTickets: 0,
        openTickets: 0,
        solvedTickets: 0,
        pendingTickets: 0,
        percentageChange: 0,
        monthlyTrends: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        categoryStats: [],
        agentStats: []
    }), ticketsStats = _e[0], setTicketsStats = _e[1];
    var _f = react_1.useState(true), loading = _f[0], setLoading = _f[1];
    // State for ticket list
    var _g = react_1.useState([]), ticketsList = _g[0], setTicketsList = _g[1];
    var _h = react_1.useState([]), filteredTickets = _h[0], setFilteredTickets = _h[1];
    var _j = react_1.useState(true), ticketsLoading = _j[0], setTicketsLoading = _j[1];
    var _k = react_1.useState({
        priority: '',
        sortBy: 'recently'
    }), filters = _k[0], setFilters = _k[1];
    var _l = react_1.useState(false), exportLoading = _l[0], setExportLoading = _l[1];
    // State for categories
    var _m = react_1.useState([]), categories = _m[0], setCategories = _m[1];
    var _o = react_1.useState(false), loadingCategories = _o[0], setLoadingCategories = _o[1];
    // State for IT Support agents sidebar
    var _p = react_1.useState([]), supportAgents = _p[0], setSupportAgents = _p[1];
    var _q = react_1.useState(false), loadingAgents = _q[0], setLoadingAgents = _q[1];
    // Tab counts
    var _r = react_1.useState({}), tabCounts = _r[0], setTabCounts = _r[1];
    // Fetch tickets statistics
    react_1.useEffect(function () {
        if (socket) {
            socket.emit('tickets/dashboard/get-stats');
            socket.on('tickets/dashboard/get-stats-response', function (response) {
                if (response.done) {
                    setTicketsStats(response.data);
                }
                setLoading(false);
            });
            return function () {
                socket.off('tickets/dashboard/get-stats-response');
            };
        }
    }, [socket]);
    // Fetch ticket categories with counts
    react_1.useEffect(function () {
        if (socket) {
            setLoadingCategories(true);
            socket.emit('tickets/categories/get-categories');
            socket.on('tickets/categories/get-categories-response', function (response) {
                if (response.done) {
                    setCategories(response.data);
                }
                setLoadingCategories(false);
            });
            return function () {
                socket.off('tickets/categories/get-categories-response');
            };
        }
    }, [socket]);
    // Fetch IT Support employees for sidebar
    react_1.useEffect(function () {
        if (socket) {
            setLoadingAgents(true);
            socket.emit('tickets/employees/get-list');
            var handleAgentsResponse_1 = function (response) {
                if (response.done) {
                    setSupportAgents(response.data || []);
                }
                setLoadingAgents(false);
            };
            socket.on('tickets/employees/get-list-response', handleAgentsResponse_1);
            return function () {
                socket.off('tickets/employees/get-list-response', handleAgentsResponse_1);
            };
        }
    }, [socket]);
    // Listen for real-time updates
    react_1.useEffect(function () {
        if (socket) {
            console.log('🎧 TICKETS: Setting up real-time event listeners...');
            socket.on('tickets/ticket-created', function (data) {
                console.log('🔄 TICKETS: Ticket created event received:', data);
                socket.emit('tickets/dashboard/get-stats');
                socket.emit('tickets/categories/get-categories'); // Refresh categories with new counts
                fetchTicketsList(); // Refresh the ticket list
            });
            socket.on('tickets/ticket-updated', function (data) {
                console.log('🔄 TICKETS: Ticket updated event received:', data);
                socket.emit('tickets/dashboard/get-stats');
                fetchTicketsList(); // Refresh the ticket list
            });
            socket.on('tickets/ticket-deleted', function (data) {
                console.log('🔄 TICKETS: Ticket deleted event received:', data);
                socket.emit('tickets/dashboard/get-stats');
                socket.emit('tickets/categories/get-categories'); // Refresh categories with new counts
                fetchTicketsList(); // Refresh the ticket list
            });
            socket.on('tickets/category-created', function (data) {
                console.log('🔄 TICKETS: Category created event received:', data);
                socket.emit('tickets/categories/get-categories'); // Refresh categories list
            });
            socket.on('tickets/category-updated', function (data) {
                console.log('🔄 TICKETS: Category updated event received:', data);
                socket.emit('tickets/categories/get-categories'); // Refresh categories list
            });
            socket.on('tickets/category-deleted', function (data) {
                console.log('🔄 TICKETS: Category deleted event received:', data);
                socket.emit('tickets/categories/get-categories'); // Refresh categories list
            });
            return function () {
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
    var fetchTicketsList = function () {
        if (socket) {
            console.log("\uD83D\uDCCB Fetching tickets for tab: " + currentTab + ", sub-tab: " + myTicketsSubTab + ", role: " + role);
            setTicketsLoading(true);
            // For 'my-tickets' tab, include sub-tab filter
            var emitData = {
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
    var handleTabChange = function (tabId) {
        setCurrentTab(tabId);
        window.location.hash = tabId;
    };
    // Update current tab when URL hash changes
    react_1.useEffect(function () {
        var handleHashChange = function () {
            var tabFromHash = getCurrentTabFromHash();
            if (tabFromHash !== currentTab) {
                setCurrentTab(tabFromHash);
            }
        };
        window.addEventListener('hashchange', handleHashChange);
        return function () {
            window.removeEventListener('hashchange', handleHashChange);
        };
    }, [currentTab]);
    // Set up socket listener for tickets list response
    react_1.useEffect(function () {
        if (socket) {
            var handleTicketsListResponse_1 = function (response) {
                if (response.done) {
                    console.log('📋 FRONTEND: Received tickets list:', response.data.length, 'tickets');
                    setTicketsList(response.data);
                    setFilteredTickets(response.data);
                }
                setTicketsLoading(false);
            };
            socket.on('tickets/get-my-tickets-response', handleTicketsListResponse_1);
            // Initial fetch
            fetchTicketsList();
            return function () {
                socket.off('tickets/get-my-tickets-response', handleTicketsListResponse_1);
            };
        }
    }, [socket, currentTab, myTicketsSubTab]); // Re-fetch when currentTab or myTicketsSubTab changes
    // Fetch tab counts
    react_1.useEffect(function () {
        if (socket) {
            var handleTabCountsResponse_1 = function (response) {
                if (response.done) {
                    console.log('📊 Tab counts:', response.data);
                    setTabCounts(response.data);
                }
            };
            socket.on('tickets/get-tab-counts-response', handleTabCountsResponse_1);
            // Fetch tab counts
            socket.emit('tickets/get-tab-counts');
            return function () {
                socket.off('tickets/get-tab-counts-response', handleTabCountsResponse_1);
            };
        }
    }, [socket]);
    // Listen for real-time updates and refresh tab counts
    react_1.useEffect(function () {
        if (socket) {
            var handleUpdate_1 = function () {
                // Refresh tab counts when tickets are updated
                socket.emit('tickets/get-tab-counts');
            };
            socket.on('tickets/ticket-created', handleUpdate_1);
            socket.on('tickets/ticket-updated', handleUpdate_1);
            socket.on('tickets/ticket-deleted', handleUpdate_1);
            return function () {
                socket.off('tickets/ticket-created', handleUpdate_1);
                socket.off('tickets/ticket-updated', handleUpdate_1);
                socket.off('tickets/ticket-deleted', handleUpdate_1);
            };
        }
    }, [socket]);
    // Filter and sort tickets
    react_1.useEffect(function () {
        var filtered = __spreadArrays(ticketsList);
        // Apply priority filter only (status is handled by tabs)
        if (filters.priority) {
            filtered = filtered.filter(function (ticket) { return ticket.priority === filters.priority; });
        }
        // Apply sorting
        switch (filters.sortBy) {
            case 'recently':
                filtered.sort(function (a, b) { return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); });
                break;
            case 'ascending':
                filtered.sort(function (a, b) { return a.title.localeCompare(b.title); });
                break;
            case 'descending':
                filtered.sort(function (a, b) { return b.title.localeCompare(a.title); });
                break;
            case 'lastMonth':
                var lastMonth_1 = new Date();
                lastMonth_1.setMonth(lastMonth_1.getMonth() - 1);
                filtered = filtered.filter(function (ticket) { return new Date(ticket.createdAt).getTime() >= lastMonth_1.getTime(); });
                break;
            case 'last7Days':
                var last7Days_1 = new Date();
                last7Days_1.setDate(last7Days_1.getDate() - 7);
                filtered = filtered.filter(function (ticket) { return new Date(ticket.createdAt).getTime() >= last7Days_1.getTime(); });
                break;
            default:
                break;
        }
        setFilteredTickets(filtered);
    }, [ticketsList, filters]);
    // Handle filter changes
    var handleFilterChange = function (filterType, value) {
        setFilters(function (prev) {
            var _a;
            return (__assign(__assign({}, prev), (_a = {}, _a[filterType] = value, _a)));
        });
    };
    // Helper function to get priority badge class
    var getPriorityBadgeClass = function (priority) {
        switch (priority) {
            case 'High': return 'badge-danger';
            case 'Medium': return 'badge-warning';
            case 'Low': return 'badge-success';
            case 'Critical': return 'badge-danger';
            default: return 'badge-secondary';
        }
    };
    // Helper function to get status badge class
    var getStatusBadgeClass = function (status) {
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
    var getTimeAgo = function (date) {
        var now = new Date();
        var ticketDate = new Date(date);
        var diffInHours = Math.floor((now.getTime() - ticketDate.getTime()) / (1000 * 60 * 60));
        if (diffInHours < 1)
            return 'Just now';
        if (diffInHours < 24)
            return diffInHours + " hours ago";
        var diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7)
            return diffInDays + " days ago";
        return ticketDate.toLocaleDateString();
    };
    // Handle PDF export
    var handleExportPDF = function () { return __awaiter(void 0, void 0, void 0, function () {
        var doc_1, currentDate, currentTime, currentYear, primaryColor, secondaryColor, textColor_1, lightGray_1, borderColor, addCompanyLogo, logoAdded, yPosition_1, pageCount, i, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    setExportLoading(true);
                    doc_1 = new jspdf_1["default"]();
                    currentDate = new Date().toLocaleDateString();
                    currentTime = new Date().toLocaleTimeString();
                    currentYear = new Date().getFullYear();
                    primaryColor = [242, 101, 34];
                    secondaryColor = [59, 112, 128];
                    textColor_1 = [33, 37, 41];
                    lightGray_1 = [248, 249, 250];
                    borderColor = [222, 226, 230];
                    addCompanyLogo = function () { return __awaiter(void 0, void 0, void 0, function () {
                        var logoPaths, _loop_1, _i, logoPaths_1, logoPath, state_1;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    console.log('🎯 Starting logo loading process...');
                                    logoPaths = [
                                        '/assets/img/logo.svg',
                                        '/assets/img/logo-white.svg',
                                        '/assets/img/logo-small.svg',
                                    ];
                                    _loop_1 = function (logoPath) {
                                        var approaches, _loop_2, _i, approaches_1, url, state_2, error_2;
                                        return __generator(this, function (_a) {
                                            switch (_a.label) {
                                                case 0:
                                                    _a.trys.push([0, 5, , 6]);
                                                    console.log("\uD83D\uDD04 Loading NEW logo: " + logoPath);
                                                    approaches = [
                                                        // Approach 1: Direct fetch with cache busting
                                                        logoPath + "?v=" + Date.now() + "&bust=" + Math.random(),
                                                        // Approach 2: Simple cache busting
                                                        logoPath + "?t=" + Date.now(),
                                                        // Approach 3: No cache busting
                                                        logoPath
                                                    ];
                                                    _loop_2 = function (url) {
                                                        var response, svgText_1, canvas_1, ctx_1, img_1, imagePromise, pngDataUrl, canvasError_1, svgDataUrl, fetchError_1;
                                                        return __generator(this, function (_a) {
                                                            switch (_a.label) {
                                                                case 0:
                                                                    _a.trys.push([0, 9, , 10]);
                                                                    console.log("\uD83D\uDD04 Trying URL: " + url);
                                                                    return [4 /*yield*/, fetch(url, {
                                                                            method: 'GET',
                                                                            cache: 'no-store',
                                                                            headers: {
                                                                                'Cache-Control': 'no-cache, no-store, must-revalidate',
                                                                                'Pragma': 'no-cache',
                                                                                'Expires': '0'
                                                                            }
                                                                        })];
                                                                case 1:
                                                                    response = _a.sent();
                                                                    if (!response.ok) return [3 /*break*/, 7];
                                                                    console.log("\u2705 Logo response OK: " + response.status);
                                                                    return [4 /*yield*/, response.text()];
                                                                case 2:
                                                                    svgText_1 = _a.sent();
                                                                    console.log("\uD83D\uDCC4 SVG content length: " + svgText_1.length + " characters");
                                                                    // Check if this is a valid SVG
                                                                    if (svgText_1.includes('<svg') && svgText_1.length > 100) {
                                                                        console.log('🎉 Found valid SVG logo!');
                                                                    }
                                                                    else {
                                                                        console.log('⚠️ Invalid SVG content, trying next approach...');
                                                                        return [2 /*return*/, "continue"];
                                                                    }
                                                                    _a.label = 3;
                                                                case 3:
                                                                    _a.trys.push([3, 5, , 6]);
                                                                    canvas_1 = document.createElement('canvas');
                                                                    ctx_1 = canvas_1.getContext('2d');
                                                                    img_1 = new Image();
                                                                    // Set canvas size to maintain aspect ratio (logo.svg is 115x40)
                                                                    canvas_1.width = 115;
                                                                    canvas_1.height = 40;
                                                                    imagePromise = new Promise(function (resolve, reject) {
                                                                        img_1.onload = function () {
                                                                            try {
                                                                                // Draw the SVG image to canvas maintaining aspect ratio
                                                                                ctx_1 === null || ctx_1 === void 0 ? void 0 : ctx_1.drawImage(img_1, 0, 0, 115, 40);
                                                                                // Convert canvas to PNG data URL
                                                                                var pngDataUrl_1 = canvas_1.toDataURL('image/png');
                                                                                console.log("\u2705 Successfully converted SVG to PNG: " + logoPath);
                                                                                resolve(pngDataUrl_1);
                                                                            }
                                                                            catch (error) {
                                                                                reject(error);
                                                                            }
                                                                        };
                                                                        img_1.onerror = reject;
                                                                        // Set the SVG as image source
                                                                        var svgDataUrl = "data:image/svg+xml;base64," + btoa(svgText_1);
                                                                        img_1.src = svgDataUrl;
                                                                    });
                                                                    return [4 /*yield*/, imagePromise];
                                                                case 4:
                                                                    pngDataUrl = _a.sent();
                                                                    // Add PNG to PDF with proper dimensions (maintain aspect ratio)
                                                                    doc_1.addImage(pngDataUrl, 'PNG', 20, 15, 30, 10.4);
                                                                    console.log("\u2705 Successfully added logo to PDF: " + logoPath);
                                                                    return [2 /*return*/, { value: true }];
                                                                case 5:
                                                                    canvasError_1 = _a.sent();
                                                                    console.log("\u274C Canvas conversion failed:", canvasError_1);
                                                                    // Fallback: Try direct SVG
                                                                    try {
                                                                        svgDataUrl = "data:image/svg+xml;base64," + btoa(svgText_1);
                                                                        doc_1.addImage(svgDataUrl, 'SVG', 20, 15, 30, 10.4);
                                                                        console.log("\u2705 Successfully added logo as SVG: " + logoPath);
                                                                        return [2 /*return*/, { value: true }];
                                                                    }
                                                                    catch (svgError) {
                                                                        console.log("\u274C SVG format also failed:", svgError);
                                                                    }
                                                                    return [3 /*break*/, 6];
                                                                case 6: return [3 /*break*/, 8];
                                                                case 7:
                                                                    console.log("\u274C Logo fetch failed: " + response.status + " " + response.statusText);
                                                                    _a.label = 8;
                                                                case 8: return [3 /*break*/, 10];
                                                                case 9:
                                                                    fetchError_1 = _a.sent();
                                                                    console.log("\u274C Fetch error for " + url + ":", fetchError_1);
                                                                    return [3 /*break*/, 10];
                                                                case 10: return [2 /*return*/];
                                                            }
                                                        });
                                                    };
                                                    _i = 0, approaches_1 = approaches;
                                                    _a.label = 1;
                                                case 1:
                                                    if (!(_i < approaches_1.length)) return [3 /*break*/, 4];
                                                    url = approaches_1[_i];
                                                    return [5 /*yield**/, _loop_2(url)];
                                                case 2:
                                                    state_2 = _a.sent();
                                                    if (typeof state_2 === "object")
                                                        return [2 /*return*/, state_2];
                                                    _a.label = 3;
                                                case 3:
                                                    _i++;
                                                    return [3 /*break*/, 1];
                                                case 4: return [3 /*break*/, 6];
                                                case 5:
                                                    error_2 = _a.sent();
                                                    console.log("\u274C Error loading " + logoPath + ":", error_2);
                                                    return [3 /*break*/, 6];
                                                case 6: return [2 /*return*/];
                                            }
                                        });
                                    };
                                    _i = 0, logoPaths_1 = logoPaths;
                                    _a.label = 1;
                                case 1:
                                    if (!(_i < logoPaths_1.length)) return [3 /*break*/, 4];
                                    logoPath = logoPaths_1[_i];
                                    return [5 /*yield**/, _loop_1(logoPath)];
                                case 2:
                                    state_1 = _a.sent();
                                    if (typeof state_1 === "object")
                                        return [2 /*return*/, state_1.value];
                                    _a.label = 3;
                                case 3:
                                    _i++;
                                    return [3 /*break*/, 1];
                                case 4:
                                    console.log('❌ All logo loading attempts failed');
                                    return [2 /*return*/, false];
                            }
                        });
                    }); };
                    return [4 /*yield*/, addCompanyLogo()];
                case 1:
                    logoAdded = _a.sent();
                    if (!logoAdded) {
                        console.log("❌ CRITICAL: New logo loading failed!");
                        console.log("🔍 Check if logo files exist: /assets/img/logo.svg, /assets/img/logo-white.svg, /assets/img/logo-small.svg");
                        console.log("📁 Make sure React dev server is running and files are accessible");
                        // NO FALLBACK TEXT - just leave space for logo
                        console.log("⚠️ No logo added to PDF - using empty space instead of fallback text");
                    }
                    else {
                        console.log("✅ Logo successfully added to PDF!");
                    }
                    // Header section
                    doc_1.setTextColor(textColor_1[0], textColor_1[1], textColor_1[2]);
                    doc_1.setFontSize(24);
                    doc_1.setFont('helvetica', 'bold');
                    doc_1.text('Tickets Report', 50, 30);
                    // Company info
                    doc_1.setFontSize(10);
                    doc_1.setFont('helvetica', 'normal');
                    doc_1.text("Generated on: " + currentDate + " at " + currentTime, 50, 40);
                    doc_1.text("Total Tickets: " + filteredTickets.length, 50, 45);
                    // Add security watermark
                    doc_1.setGState(new doc_1.GState({ opacity: 0.1 }));
                    doc_1.setTextColor(128, 128, 128);
                    doc_1.setFontSize(60);
                    doc_1.setFont('helvetica', 'bold');
                    doc_1.text('CONFIDENTIAL', 60, 120, { angle: 45 });
                    doc_1.setGState(new doc_1.GState({ opacity: 1 }));
                    yPosition_1 = 60;
                    doc_1.setFillColor(lightGray_1[0], lightGray_1[1], lightGray_1[2]);
                    doc_1.rect(20, yPosition_1, 170, 8, 'F');
                    doc_1.setTextColor(textColor_1[0], textColor_1[1], textColor_1[2]);
                    doc_1.setFontSize(10);
                    doc_1.setFont('helvetica', 'bold');
                    doc_1.text('Ticket ID', 22, yPosition_1 + 6);
                    doc_1.text('Title', 45, yPosition_1 + 6);
                    doc_1.text('Status', 90, yPosition_1 + 6);
                    doc_1.text('Priority', 110, yPosition_1 + 6);
                    doc_1.text('Assigned To', 130, yPosition_1 + 6);
                    doc_1.text('Created', 160, yPosition_1 + 6);
                    yPosition_1 += 10;
                    // Table data
                    doc_1.setFont('helvetica', 'normal');
                    doc_1.setFontSize(8);
                    filteredTickets.forEach(function (ticket, index) {
                        var _a, _b;
                        if (yPosition_1 > 270) {
                            doc_1.addPage();
                            yPosition_1 = 20;
                            // Add header to new page
                            doc_1.setFillColor(lightGray_1[0], lightGray_1[1], lightGray_1[2]);
                            doc_1.rect(20, yPosition_1, 170, 8, 'F');
                            doc_1.setTextColor(textColor_1[0], textColor_1[1], textColor_1[2]);
                            doc_1.setFontSize(10);
                            doc_1.setFont('helvetica', 'bold');
                            doc_1.text('Ticket ID', 22, yPosition_1 + 6);
                            doc_1.text('Title', 45, yPosition_1 + 6);
                            doc_1.text('Status', 90, yPosition_1 + 6);
                            doc_1.text('Priority', 110, yPosition_1 + 6);
                            doc_1.text('Assigned To', 130, yPosition_1 + 6);
                            doc_1.text('Created', 160, yPosition_1 + 6);
                            yPosition_1 += 10;
                        }
                        // Alternate row colors
                        if (index % 2 === 0) {
                            doc_1.setFillColor(255, 255, 255);
                        }
                        else {
                            doc_1.setFillColor(248, 249, 250);
                        }
                        doc_1.rect(20, yPosition_1, 170, 6, 'F');
                        // Row data
                        doc_1.setTextColor(textColor_1[0], textColor_1[1], textColor_1[2]);
                        doc_1.setFont('helvetica', 'normal');
                        doc_1.setFontSize(8);
                        doc_1.text(ticket.ticketId || 'N/A', 22, yPosition_1 + 4);
                        doc_1.text((ticket.title || 'Untitled').substring(0, 20), 45, yPosition_1 + 4);
                        doc_1.text(ticket.status || 'New', 90, yPosition_1 + 4);
                        doc_1.text(ticket.priority || 'Medium', 110, yPosition_1 + 4);
                        doc_1.text(((_a = ticket.assignedTo) === null || _a === void 0 ? void 0 : _a.firstName) && ((_b = ticket.assignedTo) === null || _b === void 0 ? void 0 : _b.lastName)
                            ? (ticket.assignedTo.firstName + " " + ticket.assignedTo.lastName).substring(0, 15)
                            : 'Unassigned', 130, yPosition_1 + 4);
                        doc_1.text(new Date(ticket.createdAt).toLocaleDateString(), 160, yPosition_1 + 4);
                        yPosition_1 += 8;
                    });
                    pageCount = doc_1.getNumberOfPages();
                    for (i = 1; i <= pageCount; i++) {
                        doc_1.setPage(i);
                        doc_1.setFontSize(8);
                        doc_1.setTextColor(128, 128, 128);
                        doc_1.text("Page " + i + " of " + pageCount, 20, 290);
                        doc_1.text("\u00A9 " + currentYear + " ManageRTC. All rights reserved.", 120, 290);
                    }
                    // Save the PDF
                    doc_1.save("tickets_report_" + Date.now() + ".pdf");
                    setExportLoading(false);
                    console.log("PDF exported successfully");
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _a.sent();
                    setExportLoading(false);
                    console.error("Error exporting PDF:", error_1);
                    alert("Failed to export PDF");
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); };
    // Handle Excel export
    var handleExportExcel = function () {
        try {
            setExportLoading(true);
            var currentDate = new Date().toLocaleDateString();
            var wb = XLSX.utils.book_new();
            // Prepare tickets data for Excel
            var ticketsDataForExcel = filteredTickets.map(function (ticket) {
                var _a, _b, _c, _d, _e, _f;
                return ({
                    "Ticket ID": ticket.ticketId || "",
                    "Title": ticket.title || "",
                    "Description": ticket.description || "",
                    "Category": ticket.category || "",
                    "Status": ticket.status || "",
                    "Priority": ticket.priority || "",
                    "Assigned To": ((_a = ticket.assignedTo) === null || _a === void 0 ? void 0 : _a.firstName) && ((_b = ticket.assignedTo) === null || _b === void 0 ? void 0 : _b.lastName)
                        ? ticket.assignedTo.firstName + " " + ticket.assignedTo.lastName
                        : "Unassigned",
                    "Created By": ((_c = ticket.createdBy) === null || _c === void 0 ? void 0 : _c.firstName) && ((_d = ticket.createdBy) === null || _d === void 0 ? void 0 : _d.lastName)
                        ? ticket.createdBy.firstName + " " + ticket.createdBy.lastName
                        : "Unknown",
                    "Created Date": ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : "",
                    "Updated Date": ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleDateString() : "",
                    "Comments Count": ((_e = ticket.comments) === null || _e === void 0 ? void 0 : _e.length) || 0,
                    "Tags": ((_f = ticket.tags) === null || _f === void 0 ? void 0 : _f.join(', ')) || ""
                });
            });
            // Create worksheet
            var ws = XLSX.utils.json_to_sheet(ticketsDataForExcel);
            // Set column widths
            var colWidths = [
                { wch: 15 },
                { wch: 30 },
                { wch: 40 },
                { wch: 20 },
                { wch: 15 },
                { wch: 15 },
                { wch: 25 },
                { wch: 25 },
                { wch: 15 },
                { wch: 15 },
                { wch: 15 },
                { wch: 30 } // Tags
            ];
            ws['!cols'] = colWidths;
            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(wb, ws, "Tickets");
            // Save the Excel file
            XLSX.writeFile(wb, "tickets_report_" + Date.now() + ".xlsx");
            setExportLoading(false);
            console.log("Excel exported successfully");
        }
        catch (error) {
            setExportLoading(false);
            console.error("Error exporting Excel:", error);
            alert("Failed to export Excel");
        }
    };
    // Render ticket card for grid view
    var renderTicketCard = function (ticket) {
        var _a, _b, _c, _d;
        return (React.createElement("div", { key: ticket.ticketId, className: "col-xl-3 col-lg-4 col-md-6" },
            React.createElement("div", { className: "card" },
                React.createElement("div", { className: "card-body" },
                    React.createElement("div", { className: "d-flex justify-content-between align-items-start mb-2" },
                        React.createElement("div", { className: "form-check form-check-md" },
                            React.createElement("input", { className: "form-check-input", type: "checkbox" })),
                        React.createElement("div", null,
                            React.createElement(react_router_dom_1.Link, { to: routes.ticketDetails + "?id=" + ticket.ticketId, className: "avatar avatar-xl avatar-rounded border p-1 rounded-circle " + (ticket.createdBy ? 'online border-primary' : ''), style: !ticket.createdBy ? { opacity: 0.5, borderColor: '#dee2e6' } : {} },
                                React.createElement(imageWithBasePath_1["default"], { src: ((_a = ticket.createdBy) === null || _a === void 0 ? void 0 : _a.avatarUrl) || ((_b = ticket.createdBy) === null || _b === void 0 ? void 0 : _b.avatar) || "assets/img/profiles/avatar-01.jpg", className: "img-fluid h-auto w-auto", alt: ticket.createdBy ? ((ticket.createdBy.firstName || '') + " " + (ticket.createdBy.lastName || '')).trim() : "Unknown" }))),
                        React.createElement("div", { className: "dropdown" },
                            React.createElement("button", { className: "btn btn-icon btn-sm rounded-circle", type: "button", "data-bs-toggle": "dropdown", "aria-expanded": "false" },
                                React.createElement("i", { className: "ti ti-dots-vertical" })),
                            React.createElement("ul", { className: "dropdown-menu dropdown-menu-end p-3" },
                                React.createElement("li", null,
                                    React.createElement(react_router_dom_1.Link, { className: "dropdown-item rounded-1", to: "#", "data-bs-toggle": "modal", "data-bs-target": "#edit_ticket" },
                                        React.createElement("i", { className: "ti ti-edit me-1" }),
                                        "Edit")),
                                React.createElement("li", null,
                                    React.createElement(react_router_dom_1.Link, { className: "dropdown-item rounded-1", to: "#", "data-bs-toggle": "modal", "data-bs-target": "#delete_modal" },
                                        React.createElement("i", { className: "ti ti-trash me-1" }),
                                        "Delete"))))),
                    React.createElement("div", { className: "text-center mb-3" },
                        React.createElement("h6", { className: "mb-1" },
                            React.createElement(react_router_dom_1.Link, { to: routes.ticketDetails + "?id=" + ticket.ticketId }, ticket.title || 'Untitled')),
                        React.createElement("span", { className: "badge bg-info-transparent fs-10 fw-medium" }, ticket.ticketId || 'N/A')),
                    React.createElement("div", { className: "d-flex flex-column" },
                        React.createElement("div", { className: "d-flex align-items-center justify-content-between mb-3" },
                            React.createElement("span", null, "Category"),
                            React.createElement("h6", { className: "fw-medium" }, ticket.category || 'N/A')),
                        React.createElement("div", { className: "d-flex align-items-center justify-content-between mb-3" },
                            React.createElement("span", null, "Status"),
                            React.createElement("span", { className: "badge " + getStatusBadgeClass(ticket.status) + " d-inline-flex align-items-center fs-10 fw-medium" },
                                React.createElement("i", { className: "ti ti-circle-filled fs-5 me-1" }),
                                ticket.status || 'N/A')),
                        React.createElement("div", { className: "d-flex align-items-center justify-content-between" },
                            React.createElement("span", null, "Priority"),
                            React.createElement("span", { className: "badge " + getPriorityBadgeClass(ticket.priority) + " d-inline-flex align-items-center fs-10 fw-medium" },
                                React.createElement("i", { className: "ti ti-circle-filled fs-5 me-1" }),
                                ticket.priority || 'N/A'))),
                    React.createElement("div", { className: "d-flex align-items-center justify-content-between border-top pt-3 mt-3" },
                        React.createElement("div", null,
                            React.createElement("p", { className: "mb-1 fs-12" }, "Assigned To"),
                            React.createElement("div", { className: "d-flex align-items-center" },
                                React.createElement("span", { className: "avatar avatar-xs avatar-rounded me-2" }, ticket.assignedTo ? (React.createElement(imageWithBasePath_1["default"], { src: ticket.assignedTo.avatarUrl || ticket.assignedTo.avatar || "assets/img/profiles/avatar-01.jpg", alt: "Assigned" })) : (React.createElement(imageWithBasePath_1["default"], { src: "assets/img/profiles/avatar-01.jpg", alt: "Unassigned", style: { opacity: 0.5 } }))),
                                React.createElement("h6", { className: "fw-normal" }, ((_c = ticket.assignedTo) === null || _c === void 0 ? void 0 : _c.firstName) && ((_d = ticket.assignedTo) === null || _d === void 0 ? void 0 : _d.lastName)
                                    ? ticket.assignedTo.firstName + " " + ticket.assignedTo.lastName
                                    : 'Unassigned'))),
                        React.createElement("div", { className: "icons-social d-flex align-items-center" },
                            React.createElement(react_router_dom_1.Link, { to: "#", className: "avatar avatar-rounded avatar-sm bg-primary-transparent me-2" },
                                React.createElement("i", { className: "ti ti-message text-primary" })),
                            React.createElement(react_router_dom_1.Link, { to: "#", className: "avatar avatar-rounded avatar-sm bg-light" },
                                React.createElement("i", { className: "ti ti-phone" }))))))));
    };
    // Dynamic chart data that updates with ticketsStats
    var Areachart = {
        series: [
            {
                name: "Tickets",
                data: ticketsStats.monthlyTrends || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
            },
        ],
        chart: {
            type: "bar",
            width: 70,
            height: 70,
            toolbar: {
                show: false
            },
            zoom: {
                enabled: false
            },
            dropShadow: {
                enabled: false,
                top: 3,
                left: 14,
                blur: 4,
                opacity: 0.12,
                color: "#fff"
            },
            sparkline: {
                enabled: !0
            }
        },
        markers: {
            size: 0,
            colors: ["#F26522"],
            strokeColors: "#fff",
            strokeWidth: 2,
            hover: {
                size: 7
            }
        },
        plotOptions: {
            bar: {
                horizontal: !1,
                columnWidth: "35%",
                endingShape: "rounded"
            }
        },
        dataLabels: {
            enabled: false
        },
        stroke: {
            show: !0,
            width: 2.5,
            curve: "smooth"
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
                show: false
            }
        },
        tooltip: {
            show: false,
            theme: "dark",
            fixed: {
                enabled: false
            },
            x: {
                show: false
            },
            marker: {
                show: false
            }
        }
    };
    var Areachart1 = {
        series: [
            {
                name: "Tickets",
                data: ticketsStats.monthlyTrends || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
            },
        ],
        chart: {
            type: "bar",
            width: 70,
            height: 70,
            toolbar: {
                show: false
            },
            zoom: {
                enabled: false
            },
            dropShadow: {
                enabled: false,
                top: 3,
                left: 14,
                blur: 4,
                opacity: 0.12,
                color: "#fff"
            },
            sparkline: {
                enabled: !0
            }
        },
        markers: {
            size: 0,
            colors: ["#F26512"],
            strokeColors: "#fff",
            strokeWidth: 2,
            hover: {
                size: 7
            }
        },
        plotOptions: {
            bar: {
                horizontal: !1,
                columnWidth: "35%",
                endingShape: "rounded"
            }
        },
        dataLabels: {
            enabled: false
        },
        stroke: {
            show: !0,
            width: 2.5,
            curve: "smooth"
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
                show: false
            }
        },
        tooltip: {
            show: false,
            theme: "dark",
            fixed: {
                enabled: false
            },
            x: {
                show: false
            },
            marker: {
                show: false
            }
        }
    };
    var Areachart2 = {
        series: [
            {
                name: "Tickets",
                data: ticketsStats.monthlyTrends || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
            },
        ],
        chart: {
            type: "bar",
            width: 70,
            height: 70,
            toolbar: {
                show: false
            },
            zoom: {
                enabled: false
            },
            dropShadow: {
                enabled: false,
                top: 3,
                left: 14,
                blur: 4,
                opacity: 0.12,
                color: "#fff"
            },
            sparkline: {
                enabled: !0
            }
        },
        markers: {
            size: 0,
            colors: ["#F26522"],
            strokeColors: "#fff",
            strokeWidth: 2,
            hover: {
                size: 7
            }
        },
        plotOptions: {
            bar: {
                horizontal: !1,
                columnWidth: "35%",
                endingShape: "rounded"
            }
        },
        dataLabels: {
            enabled: false
        },
        stroke: {
            show: !0,
            width: 2.5,
            curve: "smooth"
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
                show: false
            }
        },
        tooltip: {
            show: false,
            theme: "dark",
            fixed: {
                enabled: false
            },
            x: {
                show: false
            },
            marker: {
                show: false
            }
        }
    };
    var Areachart3 = {
        series: [
            {
                name: "Tickets",
                data: ticketsStats.monthlyTrends || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
            },
        ],
        chart: {
            type: "bar",
            width: 70,
            height: 70,
            toolbar: {
                show: false
            },
            zoom: {
                enabled: false
            },
            dropShadow: {
                enabled: false,
                top: 3,
                left: 14,
                blur: 4,
                opacity: 0.12,
                color: "#fff"
            },
            sparkline: {
                enabled: !0
            }
        },
        markers: {
            size: 0,
            colors: ["#F26522"],
            strokeColors: "#fff",
            strokeWidth: 2,
            hover: {
                size: 7
            }
        },
        plotOptions: {
            bar: {
                horizontal: !1,
                columnWidth: "35%",
                endingShape: "rounded"
            }
        },
        dataLabels: {
            enabled: false
        },
        stroke: {
            show: !0,
            width: 2.5,
            curve: "smooth"
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
                show: false
            }
        },
        tooltip: {
            show: false,
            theme: "dark",
            fixed: {
                enabled: false
            },
            x: {
                show: false
            },
            marker: {
                show: false
            }
        }
    };
    return (React.createElement(React.Fragment, null,
        React.createElement("div", { className: "page-wrapper" },
            React.createElement("div", { className: "content" },
                React.createElement("div", { className: "d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3" },
                    React.createElement("div", { className: "my-auto mb-2" },
                        React.createElement("h2", { className: "mb-1" }, "Tickets"),
                        React.createElement("nav", null,
                            React.createElement("ol", { className: "breadcrumb mb-0" },
                                React.createElement("li", { className: "breadcrumb-item" },
                                    React.createElement(react_router_dom_1.Link, { to: routes.adminDashboard },
                                        React.createElement("i", { className: "ti ti-smart-home" }))),
                                React.createElement("li", { className: "breadcrumb-item" }, "Employee"),
                                React.createElement("li", { className: "breadcrumb-item active", "aria-current": "page" }, "Tickets")))),
                    React.createElement("div", { className: "d-flex my-xl-auto right-content align-items-center flex-wrap " },
                        React.createElement("div", { className: "me-2 mb-2" },
                            React.createElement("div", { className: "d-flex align-items-center border bg-white rounded p-1 me-2 icon-list" },
                                React.createElement("button", { onClick: function () { return setViewMode('list'); }, className: "btn btn-icon btn-sm me-1 " + (viewMode === 'list' ? 'active bg-primary text-white' : '') },
                                    React.createElement("i", { className: "ti ti-list-tree" })),
                                React.createElement("button", { onClick: function () { return setViewMode('grid'); }, className: "btn btn-icon btn-sm " + (viewMode === 'grid' ? 'active bg-primary text-white' : '') },
                                    React.createElement("i", { className: "ti ti-layout-grid" })))),
                        React.createElement("div", { className: "me-2 mb-2" },
                            React.createElement("div", { className: "dropdown" },
                                React.createElement(react_router_dom_1.Link, { to: "#", className: "dropdown-toggle btn btn-white d-inline-flex align-items-center", "data-bs-toggle": "dropdown" },
                                    React.createElement("i", { className: "ti ti-file-export me-1" }),
                                    "Export"),
                                React.createElement("ul", { className: "dropdown-menu  dropdown-menu-end p-3" },
                                    React.createElement("li", null,
                                        React.createElement(react_router_dom_1.Link, { to: "#", className: "dropdown-item rounded-1", onClick: function (e) {
                                                e.preventDefault();
                                                handleExportPDF();
                                            } },
                                            React.createElement("i", { className: "ti ti-file-type-pdf me-1" }),
                                            "Export as PDF")),
                                    React.createElement("li", null,
                                        React.createElement(react_router_dom_1.Link, { to: "#", className: "dropdown-item rounded-1", onClick: function (e) {
                                                e.preventDefault();
                                                handleExportExcel();
                                            } },
                                            React.createElement("i", { className: "ti ti-file-type-xls me-1" }),
                                            "Export as Excel",
                                            " "))))),
                        React.createElement("div", { className: "mb-2" },
                            React.createElement(react_router_dom_1.Link, { to: "#", "data-bs-toggle": "modal", "data-bs-target": "#add_ticket", className: "btn btn-primary d-flex align-items-center" },
                                React.createElement("i", { className: "ti ti-circle-plus me-2" }),
                                "Add Ticket")),
                        React.createElement("div", { className: "head-icons ms-2" },
                            React.createElement(collapse_header_1["default"], null)))),
                React.createElement("div", { className: "row" },
                    React.createElement("div", { className: "col-xl-3 col-md-6 d-flex" },
                        React.createElement("div", { className: "card flex-fill" },
                            React.createElement("div", { className: "card-body" },
                                React.createElement("div", { className: "row" },
                                    React.createElement("div", { className: "col-6 d-flex" },
                                        React.createElement("div", { className: "flex-fill" },
                                            React.createElement("div", { className: "border border-dashed border-primary rounded-circle d-inline-flex align-items-center justify-content-center p-1 mb-3" },
                                                React.createElement("span", { className: "avatar avatar-lg avatar-rounded bg-primary-transparent " },
                                                    React.createElement("i", { className: "ti ti-ticket fs-20" }))),
                                            React.createElement("p", { className: "fw-medium fs-12 mb-1" }, "New Tickets"),
                                            React.createElement("h4", null, loading ? '...' : ticketsStats.newTickets))),
                                    React.createElement("div", { className: "col-6 text-end d-flex" },
                                        React.createElement("div", { className: "d-flex flex-column justify-content-between align-items-end" })))))),
                    React.createElement("div", { className: "col-xl-3 col-md-6 d-flex" },
                        React.createElement("div", { className: "card flex-fill" },
                            React.createElement("div", { className: "card-body" },
                                React.createElement("div", { className: "row" },
                                    React.createElement("div", { className: "col-6 d-flex" },
                                        React.createElement("div", { className: "flex-fill" },
                                            React.createElement("div", { className: "border border-dashed border-purple rounded-circle d-inline-flex align-items-center justify-content-center p-1 mb-3" },
                                                React.createElement("span", { className: "avatar avatar-lg avatar-rounded bg-transparent-purple" },
                                                    React.createElement("i", { className: "ti ti-folder-open fs-20" }))),
                                            React.createElement("p", { className: "fw-medium fs-12 mb-1" }, "Open Tickets"),
                                            React.createElement("h4", null, loading ? '...' : ticketsStats.openTickets))),
                                    React.createElement("div", { className: "col-6 text-end d-flex" },
                                        React.createElement("div", { className: "d-flex flex-column justify-content-between align-items-end" })))))),
                    React.createElement("div", { className: "col-xl-3 col-md-6 d-flex" },
                        React.createElement("div", { className: "card flex-fill" },
                            React.createElement("div", { className: "card-body" },
                                React.createElement("div", { className: "row" },
                                    React.createElement("div", { className: "col-6 d-flex" },
                                        React.createElement("div", { className: "flex-fill" },
                                            React.createElement("div", { className: "border border-dashed border-success rounded-circle d-inline-flex align-items-center justify-content-center p-1 mb-3" },
                                                React.createElement("span", { className: "avatar avatar-lg avatar-rounded bg-success-transparent" },
                                                    React.createElement("i", { className: "ti ti-checks fs-20" }))),
                                            React.createElement("p", { className: "fw-medium fs-12 mb-1" }, "Solved Tickets"),
                                            React.createElement("h4", null, loading ? '...' : ticketsStats.solvedTickets))),
                                    React.createElement("div", { className: "col-6 text-end d-flex" },
                                        React.createElement("div", { className: "d-flex flex-column justify-content-between align-items-end" })))))),
                    React.createElement("div", { className: "col-xl-3 col-md-6 d-flex" },
                        React.createElement("div", { className: "card flex-fill" },
                            React.createElement("div", { className: "card-body" },
                                React.createElement("div", { className: "row" },
                                    React.createElement("div", { className: "col-6 d-flex" },
                                        React.createElement("div", { className: "flex-fill" },
                                            React.createElement("div", { className: "border border-dashed border-info rounded-circle d-inline-flex align-items-center justify-content-center p-1 mb-3" },
                                                React.createElement("span", { className: "avatar avatar-lg avatar-rounded bg-info-transparent" },
                                                    React.createElement("i", { className: "ti ti-progress-alert fs-20" }))),
                                            React.createElement("p", { className: "fw-medium fs-12 mb-1" }, "Pending Tickets"),
                                            React.createElement("h4", null, loading ? '...' : ticketsStats.pendingTickets))),
                                    React.createElement("div", { className: "col-6 text-end d-flex" },
                                        React.createElement("div", { className: "d-flex flex-column justify-content-between align-items-end" }))))))),
                React.createElement("ul", { className: "nav nav-tabs nav-tabs-bottom mb-3" }, tabs.map(function (tab) { return (React.createElement("li", { className: "nav-item", key: tab.id },
                    React.createElement(react_router_dom_1.Link, { to: "#" + tab.id, className: "nav-link " + (currentTab === tab.id ? 'active' : ''), onClick: function (e) {
                            e.preventDefault();
                            handleTabChange(tab.id);
                        } },
                        tab.label,
                        tabCounts[tab.id] !== undefined && (React.createElement("span", { className: "badge bg-primary ms-1" }, tabCounts[tab.id] || 0))))); })),
                currentTab === 'my-tickets' && (React.createElement("ul", { className: "nav nav-tabs nav-tabs-bottom-sub mb-3" },
                    React.createElement("li", { className: "nav-item" },
                        React.createElement(react_router_dom_1.Link, { to: "#assigned-to-me", className: "nav-link " + (myTicketsSubTab === 'assigned-to-me' ? 'active' : ''), onClick: function (e) {
                                e.preventDefault();
                                setMyTicketsSubTab('assigned-to-me');
                            } }, "Assigned to Me")),
                    React.createElement("li", { className: "nav-item" },
                        React.createElement(react_router_dom_1.Link, { to: "#created-by-me", className: "nav-link " + (myTicketsSubTab === 'created-by-me' ? 'active' : ''), onClick: function (e) {
                                e.preventDefault();
                                setMyTicketsSubTab('created-by-me');
                            } }, "Created by Me")))),
                React.createElement("div", { className: "card" },
                    React.createElement("div", { className: "card-body p-3" },
                        React.createElement("div", { className: "d-flex align-items-center justify-content-between flex-wrap row-gap-3" },
                            React.createElement("h5", null, "Ticket List"),
                            React.createElement("div", { className: "d-flex align-items-center flex-wrap row-gap-3" },
                                React.createElement("div", { className: "dropdown me-2" },
                                    React.createElement(react_router_dom_1.Link, { to: "#", className: "dropdown-toggle btn btn-sm btn-white d-inline-flex align-items-center", "data-bs-toggle": "dropdown" }, filters.priority || 'Priority'),
                                    React.createElement("ul", { className: "dropdown-menu  dropdown-menu-end p-3" },
                                        React.createElement("li", null,
                                            React.createElement(react_router_dom_1.Link, { to: "#", className: "dropdown-item rounded-1", onClick: function (e) {
                                                    e.preventDefault();
                                                    handleFilterChange('priority', '');
                                                } }, "All Priorities")),
                                        React.createElement("li", null,
                                            React.createElement(react_router_dom_1.Link, { to: "#", className: "dropdown-item rounded-1", onClick: function (e) {
                                                    e.preventDefault();
                                                    handleFilterChange('priority', 'High');
                                                } }, "High")),
                                        React.createElement("li", null,
                                            React.createElement(react_router_dom_1.Link, { to: "#", className: "dropdown-item rounded-1", onClick: function (e) {
                                                    e.preventDefault();
                                                    handleFilterChange('priority', 'Low');
                                                } }, "Low")),
                                        React.createElement("li", null,
                                            React.createElement(react_router_dom_1.Link, { to: "#", className: "dropdown-item rounded-1", onClick: function (e) {
                                                    e.preventDefault();
                                                    handleFilterChange('priority', 'Medium');
                                                } }, "Medium")))),
                                React.createElement("div", { className: "dropdown" },
                                    React.createElement(react_router_dom_1.Link, { to: "#", className: "dropdown-toggle btn btn-sm btn-white d-inline-flex align-items-center", "data-bs-toggle": "dropdown" },
                                        "Sort By: ",
                                        filters.sortBy === 'recently' ? 'Recently Added' :
                                            filters.sortBy === 'ascending' ? 'Ascending' :
                                                filters.sortBy === 'descending' ? 'Descending' :
                                                    filters.sortBy === 'lastMonth' ? 'Last Month' :
                                                        filters.sortBy === 'last7Days' ? 'Last 7 Days' : 'Recently Added'),
                                    React.createElement("ul", { className: "dropdown-menu  dropdown-menu-end p-3" },
                                        React.createElement("li", null,
                                            React.createElement(react_router_dom_1.Link, { to: "#", className: "dropdown-item rounded-1", onClick: function (e) {
                                                    e.preventDefault();
                                                    handleFilterChange('sortBy', 'recently');
                                                } }, "Recently Added")),
                                        React.createElement("li", null,
                                            React.createElement(react_router_dom_1.Link, { to: "#", className: "dropdown-item rounded-1", onClick: function (e) {
                                                    e.preventDefault();
                                                    handleFilterChange('sortBy', 'ascending');
                                                } }, "Ascending")),
                                        React.createElement("li", null,
                                            React.createElement(react_router_dom_1.Link, { to: "#", className: "dropdown-item rounded-1", onClick: function (e) {
                                                    e.preventDefault();
                                                    handleFilterChange('sortBy', 'descending');
                                                } }, "Descending")),
                                        React.createElement("li", null,
                                            React.createElement(react_router_dom_1.Link, { to: "#", className: "dropdown-item rounded-1", onClick: function (e) {
                                                    e.preventDefault();
                                                    handleFilterChange('sortBy', 'lastMonth');
                                                } }, "Last Month")),
                                        React.createElement("li", null,
                                            React.createElement(react_router_dom_1.Link, { to: "#", className: "dropdown-item rounded-1", onClick: function (e) {
                                                    e.preventDefault();
                                                    handleFilterChange('sortBy', 'last7Days');
                                                } }, "Last 7 Days")))))))),
                React.createElement("div", { className: "row" },
                    React.createElement("div", { className: "col-xl-9 col-md-8" },
                        ticketsLoading && (React.createElement("div", { className: "row" },
                            [1, 2, 3, 4].map(function (item) { return (React.createElement("div", { key: item, className: "col-xl-3 col-lg-4 col-md-6" },
                                React.createElement("div", { className: "card" },
                                    React.createElement("div", { className: "card-body" },
                                        React.createElement("div", { className: "d-flex justify-content-between mb-3" },
                                            React.createElement("div", { className: "bg-light rounded", style: { height: '20px', width: '20px' } }),
                                            React.createElement("div", { className: "bg-light rounded-circle", style: { height: '60px', width: '60px' } }),
                                            React.createElement("div", { className: "bg-light rounded", style: { height: '20px', width: '20px' } })),
                                        React.createElement("div", { className: "text-center mb-3" },
                                            React.createElement("div", { className: "bg-light rounded mx-auto mb-2", style: { height: '20px', width: '70%' } }),
                                            React.createElement("div", { className: "bg-light rounded mx-auto", style: { height: '16px', width: '40%' } })),
                                        React.createElement("div", { className: "bg-light rounded mb-2", style: { height: '16px', width: '100%' } }),
                                        React.createElement("div", { className: "bg-light rounded mb-2", style: { height: '16px', width: '100%' } }),
                                        React.createElement("div", { className: "bg-light rounded mb-3", style: { height: '16px', width: '100%' } }),
                                        React.createElement("div", { className: "d-flex justify-content-between border-top pt-3" },
                                            React.createElement("div", { className: "bg-light rounded", style: { height: '30px', width: '45%' } }),
                                            React.createElement("div", { className: "bg-light rounded", style: { height: '30px', width: '45%' } })))))); }),
                            React.createElement("div", { className: "col-12 text-center mt-3" },
                                React.createElement("div", { className: "spinner-border text-primary", role: "status" },
                                    React.createElement("span", { className: "visually-hidden" }, "Loading tickets...")),
                                React.createElement("p", { className: "mt-2 text-muted" }, "Loading tickets...")))),
                        !ticketsLoading && viewMode === 'grid' && (React.createElement("div", { className: "row" }, filteredTickets.length > 0 ? (filteredTickets.map(function (ticket) { return renderTicketCard(ticket); })) : (React.createElement("div", { className: "col-12" },
                            React.createElement("div", { className: "card" },
                                React.createElement("div", { className: "card-body text-center py-5" },
                                    React.createElement("i", { className: "ti ti-ticket fs-48 text-muted mb-3" }),
                                    React.createElement("h5", { className: "text-muted" }, "No tickets found"),
                                    React.createElement("p", { className: "text-muted" }, "Try adjusting your filters or create a new ticket."))))))),
                        !ticketsLoading && viewMode === 'list' && (React.createElement(React.Fragment, null, filteredTickets.length > 0 ? (React.createElement("div", { className: "card" },
                            React.createElement("div", { className: "card-body p-0" },
                                React.createElement("div", { className: "table-responsive" },
                                    React.createElement("table", { className: "table table-hover table-striped mb-0" },
                                        React.createElement("thead", null,
                                            React.createElement("tr", null,
                                                React.createElement("th", { style: { width: '5%' } },
                                                    React.createElement("div", { className: "form-check form-check-md" },
                                                        React.createElement("input", { className: "form-check-input", type: "checkbox" }))),
                                                React.createElement("th", { style: { width: '10%' } }, "Ticket ID"),
                                                React.createElement("th", { style: { width: '25%' } }, "Title"),
                                                React.createElement("th", { style: { width: '12%' } }, "Category"),
                                                React.createElement("th", { style: { width: '12%' } }, "Status"),
                                                React.createElement("th", { style: { width: '10%' } }, "Priority"),
                                                React.createElement("th", { style: { width: '12%' } }, "Assigned To"),
                                                React.createElement("th", { style: { width: '10%' } }, "Updated"),
                                                React.createElement("th", { style: { width: '4%' } }, "Actions"))),
                                        React.createElement("tbody", null, filteredTickets.map(function (ticket, index) {
                                            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
                                            return (React.createElement("tr", { key: ticket.ticketId || index },
                                                React.createElement("td", null,
                                                    React.createElement("div", { className: "form-check form-check-md" },
                                                        React.createElement("input", { className: "form-check-input", type: "checkbox" }))),
                                                React.createElement("td", null,
                                                    React.createElement("span", { className: "badge bg-info-transparent fw-medium" }, ticket.ticketId || 'N/A')),
                                                React.createElement("td", null,
                                                    React.createElement("div", { className: "d-flex flex-column" },
                                                        React.createElement(react_router_dom_1.Link, { to: routes.ticketDetails + "?id=" + ticket.ticketId, className: "text-dark fw-semibold mb-1" }, ticket.title || 'Untitled'),
                                                        React.createElement("div", { className: "d-flex align-items-center" },
                                                            React.createElement(imageWithBasePath_1["default"], { src: ((_a = ticket.createdBy) === null || _a === void 0 ? void 0 : _a.avatarUrl) || ((_b = ticket.createdBy) === null || _b === void 0 ? void 0 : _b.avatar) || "assets/img/profiles/avatar-01.jpg", className: "avatar avatar-xs rounded-circle me-2", alt: "Creator" }),
                                                            React.createElement("small", { className: "text-muted" }, ((_c = ticket.createdBy) === null || _c === void 0 ? void 0 : _c.firstName) && ((_d = ticket.createdBy) === null || _d === void 0 ? void 0 : _d.lastName)
                                                                ? ticket.createdBy.firstName + " " + ticket.createdBy.lastName
                                                                : 'Unknown')))),
                                                React.createElement("td", null,
                                                    React.createElement("div", { className: "d-flex flex-column" },
                                                        React.createElement("span", { className: "fw-medium mb-1" }, ticket.category || 'N/A'),
                                                        ticket.subCategory && (React.createElement("small", { className: "text-muted" },
                                                            React.createElement("i", { className: "ti ti-arrow-right me-1" }),
                                                            ticket.subCategory)))),
                                                React.createElement("td", null,
                                                    React.createElement("span", { className: "badge " + getStatusBadgeClass(ticket.status) + " d-inline-flex align-items-center" },
                                                        React.createElement("i", { className: "ti ti-circle-filled fs-5 me-1" }),
                                                        ticket.status || 'New')),
                                                React.createElement("td", null,
                                                    React.createElement("span", { className: "badge " + getPriorityBadgeClass(ticket.priority) + " d-inline-flex align-items-center" },
                                                        React.createElement("i", { className: "ti ti-circle-filled fs-5 me-1" }),
                                                        ticket.priority || 'Medium')),
                                                React.createElement("td", null,
                                                    React.createElement("div", { className: "d-flex align-items-center" }, ticket.assignedTo ? (React.createElement(React.Fragment, null,
                                                        React.createElement(imageWithBasePath_1["default"], { src: ticket.assignedTo.avatarUrl || ticket.assignedTo.avatar || "assets/img/profiles/avatar-01.jpg", className: "avatar avatar-xs rounded-circle me-2", alt: "Assigned" }),
                                                        React.createElement("span", { className: "text-truncate", style: { maxWidth: '120px' } }, ticket.assignedTo.firstName && ticket.assignedTo.lastName
                                                            ? ticket.assignedTo.firstName + " " + ticket.assignedTo.lastName
                                                            : 'Assigned'))) : (React.createElement(React.Fragment, null,
                                                        React.createElement(imageWithBasePath_1["default"], { src: "assets/img/profiles/avatar-01.jpg", className: "avatar avatar-xs rounded-circle me-2", alt: "Unassigned", style: { opacity: 0.5 } }),
                                                        React.createElement("span", { className: "text-muted" }, "Unassigned"))))),
                                                React.createElement("td", null,
                                                    React.createElement("div", { className: "d-flex flex-column" },
                                                        React.createElement("small", { className: "text-muted mb-1" },
                                                            React.createElement("i", { className: "ti ti-calendar me-1" }),
                                                            getTimeAgo(ticket.updatedAt)),
                                                        React.createElement("small", { className: "text-muted" },
                                                            React.createElement("i", { className: "ti ti-message me-1" }),
                                                            ((_e = ticket.comments) === null || _e === void 0 ? void 0 : _e.length) || 0,
                                                            " Comments"))),
                                                React.createElement("td", null,
                                                    React.createElement("div", { className: "dropdown" },
                                                        React.createElement("button", { className: "btn btn-icon btn-sm rounded-circle", type: "button", "data-bs-toggle": "dropdown", "aria-expanded": "false" },
                                                            React.createElement("i", { className: "ti ti-dots-vertical" })),
                                                        React.createElement("ul", { className: "dropdown-menu dropdown-menu-end p-3" },
                                                            React.createElement("li", null,
                                                                React.createElement(react_router_dom_1.Link, { className: "dropdown-item rounded-1", to: routes.ticketDetails + "?id=" + ticket.ticketId },
                                                                    React.createElement("i", { className: "ti ti-eye me-2" }),
                                                                    "View Details")),
                                                            ticket.status === 'Open' && ((_f = ticket.createdBy) === null || _f === void 0 ? void 0 : _f._id) === userId && (React.createElement("li", null,
                                                                React.createElement("button", { type: "button", className: "dropdown-item rounded-1", "data-bs-toggle": "modal", "data-bs-target": "#edit_ticket", "data-ticket-id": ticket.ticketId, "data-ticket-title": ticket.title, "data-ticket-description": ticket.description, "data-ticket-category": ticket.category, "data-ticket-subcategory": ticket.subCategory, "data-ticket-priority": ticket.priority },
                                                                    React.createElement("i", { className: "ti ti-edit me-2" }),
                                                                    "Edit"))),
                                                            (role === 'hr' || role === 'admin' || role === 'superadmin') && (React.createElement("li", null,
                                                                React.createElement("button", { type: "button", className: "dropdown-item rounded-1", "data-bs-toggle": "modal", "data-bs-target": "#assign_ticket", "data-ticket-id": ticket.ticketId, "data-ticket-title": ticket.title, "data-current-assignee": ((_g = ticket.assignedTo) === null || _g === void 0 ? void 0 : _g.firstName) && ((_h = ticket.assignedTo) === null || _h === void 0 ? void 0 : _h.lastName)
                                                                        ? ticket.assignedTo.firstName + " " + ticket.assignedTo.lastName
                                                                        : 'Unassigned', "data-current-assignee-id": ((_j = ticket.assignedTo) === null || _j === void 0 ? void 0 : _j._id) || '' },
                                                                    React.createElement("i", { className: "ti ti-user-check me-2" }),
                                                                    ((_k = ticket.assignedTo) === null || _k === void 0 ? void 0 : _k._id) ? 'Reassign' : 'Assign'))))))));
                                        }))))))) : (React.createElement("div", { className: "card" },
                            React.createElement("div", { className: "card-body text-center py-5" },
                                React.createElement("i", { className: "ti ti-ticket fs-48 text-muted mb-3" }),
                                React.createElement("h5", { className: "text-muted" }, "No tickets found"),
                                React.createElement("p", { className: "text-muted" }, "Try adjusting your filters or create a new ticket.")))))),
                        filteredTickets.length > 10 && (React.createElement("div", { className: "text-center mb-4" },
                            React.createElement(react_router_dom_1.Link, { to: "#", className: "btn btn-primary" },
                                React.createElement("i", { className: "ti ti-loader-3 me-1" }),
                                "Load More")))),
                    React.createElement("div", { className: "col-xl-3 col-md-4" },
                        React.createElement("div", { className: "card" },
                            React.createElement("div", { className: "card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3" },
                                React.createElement("h4", null, "Ticket Categories"),
                                role === 'superadmin' && (React.createElement(react_router_dom_1.Link, { to: "#", "data-bs-toggle": "modal", "data-bs-target": "#add_category", className: "btn btn-primary d-flex align-items-center" },
                                    React.createElement("i", { className: "ti ti-circle-plus me-2" }),
                                    "Add"))),
                            React.createElement("div", { className: "card-body p-0" }, loadingCategories ? (React.createElement("div", { className: "d-flex align-items-center justify-content-center p-3" },
                                React.createElement("div", { className: "spinner-border spinner-border-sm", role: "status" },
                                    React.createElement("span", { className: "visually-hidden" }, "Loading...")))) : categories && categories.length > 0 ? (React.createElement("div", { className: "d-flex flex-column" }, categories.map(function (category, index) { return (React.createElement("div", { key: category._id || index, className: "d-flex align-items-center justify-content-between p-3 " + (index < categories.length - 1 ? 'border-bottom' : '') },
                                React.createElement(react_router_dom_1.Link, { to: "#" }, category.name),
                                React.createElement("div", { className: "d-flex align-items-center" },
                                    React.createElement("span", { className: "badge badge-xs bg-dark rounded-circle" }, category.ticketCount || 0)))); }))) : (React.createElement("div", { className: "d-flex align-items-center justify-content-center p-3 text-muted" },
                                React.createElement("p", { className: "mb-0" }, "No categories available"))))),
                        React.createElement("div", { className: "card" },
                            React.createElement("div", { className: "card-header" },
                                React.createElement("h4", null, "Support Agents")),
                            React.createElement("div", { className: "card-body p-0" },
                                React.createElement("div", { className: "d-flex flex-column" }, loadingAgents ? (React.createElement("div", { className: "d-flex align-items-center justify-content-center p-3" },
                                    React.createElement("div", { className: "spinner-border spinner-border-sm", role: "status" },
                                        React.createElement("span", { className: "visually-hidden" }, "Loading...")))) : supportAgents.length > 0 ? (supportAgents.map(function (agent, index) { return (React.createElement("div", { key: agent._id || index, className: "d-flex align-items-center justify-content-between p-3 " + (index < supportAgents.length - 1 ? 'border-bottom' : '') },
                                    React.createElement("span", { className: "d-flex align-items-center" },
                                        React.createElement(imageWithBasePath_1["default"], { src: agent.avatar || 'assets/img/profiles/avatar-01.jpg', className: "avatar avatar-xs rounded-circle me-2", alt: "img" }),
                                        agent.firstName || agent.lastName
                                            ? ((agent.firstName || '') + " " + (agent.lastName || '')).trim()
                                            : agent.employeeId || 'Unknown'),
                                    React.createElement("div", { className: "d-flex align-items-center" },
                                        React.createElement("span", { className: "badge badge-xs bg-dark rounded-circle" }, agent.ticketCount || 0)))); })) : (React.createElement("div", { className: "d-flex align-items-center justify-content-center p-3 text-muted" },
                                    React.createElement("p", { className: "mb-0" }, "No IT Support employees found"))))))))),
            React.createElement(footer_1["default"], null)),
        React.createElement(ticketListModal_1["default"], null),
        React.createElement(EditTicketModal_1["default"], { onTicketUpdated: fetchTicketsList }),
        React.createElement(AssignTicketModal_1["default"], { onTicketAssigned: fetchTicketsList })));
};
exports["default"] = Tickets;
