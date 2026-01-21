"use strict";
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
exports.__esModule = true;
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var react_redux_1 = require("react-redux");
var clerk_react_1 = require("@clerk/clerk-react");
var themeSettingSlice_1 = require("../../data/redux/themeSettingSlice");
var imageWithBasePath_1 = require("../imageWithBasePath");
var sidebarSlice_1 = require("../../data/redux/sidebarSlice");
var all_routes_1 = require("../../../feature-module/router/all_routes");
var horizontalSidebar_1 = require("../../data/json/horizontalSidebar");
var Header = function () {
    var routes = all_routes_1.all_routes;
    var dispatch = react_redux_1.useDispatch();
    var dataLayout = react_redux_1.useSelector(function (state) { return state.themeSetting.dataLayout; });
    var Location = react_router_dom_1.useLocation();
    // Clerk authentication hooks
    var _a = clerk_react_1.useUser(), user = _a.user, isLoaded = _a.isLoaded, isSignedIn = _a.isSignedIn;
    var signOut = clerk_react_1.useClerk().signOut;
    var _b = react_1.useState(""), subOpen = _b[0], setSubopen = _b[1];
    var _c = react_1.useState(""), subsidebar = _c[0], setSubsidebar = _c[1];
    // Get user details with fallbacks
    var getUserName = function () {
        if (!user)
            return "Guest User";
        return user.fullName || ((user.firstName || '') + " " + (user.lastName || '')).trim() || "User";
    };
    var getUserEmail = function () {
        var _a, _b, _c;
        if (!user)
            return "guest@example.com";
        return ((_a = user.primaryEmailAddress) === null || _a === void 0 ? void 0 : _a.emailAddress) || ((_c = (_b = user.emailAddresses) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.emailAddress) || "No email";
    };
    var getCompanyId = function () {
        var _a;
        if (!user)
            return "Guest Company";
        return ((_a = user.publicMetadata) === null || _a === void 0 ? void 0 : _a.companyId) || "Company";
    };
    var getUserImage = function () {
        if (!user)
            return "assets/img/profiles/avatar-12.jpg";
        return user.imageUrl || "assets/img/profiles/avatar-12.jpg";
    };
    var getUserRole = function () {
        var _a;
        if (!user)
            return "Guest";
        return ((_a = user.publicMetadata) === null || _a === void 0 ? void 0 : _a.role) || "Employee";
    };
    // Handle signout
    var handleSignOut = function () { return __awaiter(void 0, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, signOut()];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _a.sent();
                    console.error("Error signing out:", error_1);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); };
    var toggleSidebar = function (title) {
        localStorage.setItem("menuOpened", title);
        if (title === subOpen) {
            setSubopen("");
        }
        else {
            setSubopen(title);
        }
    };
    var toggleSubsidebar = function (subitem) {
        if (subitem === subsidebar) {
            setSubsidebar("");
        }
        else {
            setSubsidebar(subitem);
        }
    };
    var mobileSidebar = react_redux_1.useSelector(function (state) { return state.sidebarSlice.mobileSidebar; });
    var toggleMobileSidebar = function () {
        dispatch(sidebarSlice_1.setMobileSidebar(!mobileSidebar));
    };
    var handleToggleMiniSidebar = function () {
        if (dataLayout === "mini_layout") {
            dispatch(themeSettingSlice_1.setDataLayout("default_layout"));
            localStorage.setItem("dataLayout", "default_layout");
        }
        else {
            dispatch(sidebarSlice_1.toggleMiniSidebar());
        }
    };
    var _d = react_1.useState(false), isFullscreen = _d[0], setIsFullscreen = _d[1];
    var toggleFullscreen = function () {
        if (!isFullscreen) {
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen()["catch"](function (err) {
                });
                setIsFullscreen(true);
            }
        }
        else {
            if (document.exitFullscreen) {
                if (document.fullscreenElement) {
                    document.exitFullscreen()["catch"](function (err) {
                    });
                }
                setIsFullscreen(false);
            }
        }
    };
    // Show loading state if Clerk data is not loaded yet
    if (!isLoaded) {
        return (react_1["default"].createElement("div", { className: "header" },
            react_1["default"].createElement("div", { className: "main-header" },
                react_1["default"].createElement("div", { className: "header-left" },
                    react_1["default"].createElement(react_router_dom_1.Link, { to: routes.adminDashboard, className: "logo" },
                        react_1["default"].createElement(imageWithBasePath_1["default"], { src: "assets/img/logo.svg", alt: "Logo" }))),
                react_1["default"].createElement("div", { className: "header-user" },
                    react_1["default"].createElement("div", { className: "nav user-menu nav-list" },
                        react_1["default"].createElement("div", { className: "d-flex align-items-center" },
                            react_1["default"].createElement("div", { className: "dropdown profile-dropdown" },
                                react_1["default"].createElement("div", { className: "d-flex align-items-center" },
                                    react_1["default"].createElement("span", { className: "avatar avatar-sm" },
                                        react_1["default"].createElement("div", { className: "spinner-border spinner-border-sm", role: "status" },
                                            react_1["default"].createElement("span", { className: "sr-only" }, "Loading...")))))))))));
    }
    return (react_1["default"].createElement(react_1["default"].Fragment, null,
        react_1["default"].createElement("div", { className: "header" },
            react_1["default"].createElement("div", { className: "main-header" },
                react_1["default"].createElement("div", { className: "header-left" },
                    react_1["default"].createElement(react_router_dom_1.Link, { to: routes.adminDashboard, className: "logo" },
                        react_1["default"].createElement(imageWithBasePath_1["default"], { src: "assets/img/logo.svg", alt: "Logo" })),
                    react_1["default"].createElement(react_router_dom_1.Link, { to: routes.adminDashboard, className: "dark-logo" },
                        react_1["default"].createElement(imageWithBasePath_1["default"], { src: "assets/img/logo-white.svg", alt: "Logo" }))),
                react_1["default"].createElement(react_router_dom_1.Link, { id: "mobile_btn", onClick: toggleMobileSidebar, className: "mobile_btn", to: "#sidebar" },
                    react_1["default"].createElement("span", { className: "bar-icon" },
                        react_1["default"].createElement("span", null),
                        react_1["default"].createElement("span", null),
                        react_1["default"].createElement("span", null))),
                react_1["default"].createElement("div", { className: "header-user" },
                    react_1["default"].createElement("div", { className: "nav user-menu nav-list" },
                        react_1["default"].createElement("div", { className: "me-auto d-flex align-items-center", id: "header-search" },
                            react_1["default"].createElement(react_router_dom_1.Link, { id: "toggle_btn", to: "#", onClick: handleToggleMiniSidebar, className: "btn btn-menubar me-1" },
                                react_1["default"].createElement("i", { className: "ti ti-arrow-bar-to-left" })),
                            react_1["default"].createElement("div", { className: "input-group input-group-flat d-inline-flex me-1" },
                                react_1["default"].createElement("span", { className: "input-icon-addon" },
                                    react_1["default"].createElement("i", { className: "ti ti-search" })),
                                react_1["default"].createElement("input", { type: "text", className: "form-control", placeholder: "Search in ManageRTC" }),
                                react_1["default"].createElement("span", { className: "input-group-text" },
                                    react_1["default"].createElement("kbd", null, "CTRL + / "))),
                            react_1["default"].createElement("div", { className: "dropdown crm-dropdown" },
                                react_1["default"].createElement("a", { href: "#", className: "btn btn-menubar me-1", "data-bs-toggle": "dropdown" },
                                    react_1["default"].createElement("i", { className: "ti ti-layout-grid" })),
                                react_1["default"].createElement("div", { className: "dropdown-menu dropdown-lg dropdown-menu-start" },
                                    react_1["default"].createElement("div", { className: "card mb-0 border-0 shadow-none" },
                                        react_1["default"].createElement("div", { className: "card-header" },
                                            react_1["default"].createElement("h4", null, "CRM")),
                                        react_1["default"].createElement("div", { className: "card-body pb-1" },
                                            react_1["default"].createElement("div", { className: "row" },
                                                react_1["default"].createElement("div", { className: "col-sm-6" },
                                                    react_1["default"].createElement(react_router_dom_1.Link, { to: routes.contactList, className: "d-flex align-items-center justify-content-between p-2 crm-link mb-3" },
                                                        react_1["default"].createElement("span", { className: "d-flex align-items-center me-3" },
                                                            react_1["default"].createElement("i", { className: "ti ti-user-shield text-default me-2" }),
                                                            "Contacts"),
                                                        react_1["default"].createElement("i", { className: "ti ti-arrow-right" })),
                                                    react_1["default"].createElement(react_router_dom_1.Link, { to: routes.dealsGrid, className: "d-flex align-items-center justify-content-between p-2 crm-link mb-3" },
                                                        react_1["default"].createElement("span", { className: "d-flex align-items-center me-3" },
                                                            react_1["default"].createElement("i", { className: "ti ti-heart-handshake text-default me-2" }),
                                                            "Deals"),
                                                        react_1["default"].createElement("i", { className: "ti ti-arrow-right" })),
                                                    react_1["default"].createElement(react_router_dom_1.Link, { to: routes.pipeline, className: "d-flex align-items-center justify-content-between p-2 crm-link mb-3" },
                                                        react_1["default"].createElement("span", { className: "d-flex align-items-center me-3" },
                                                            react_1["default"].createElement("i", { className: "ti ti-timeline-event-text text-default me-2" }),
                                                            "Pipeline"),
                                                        react_1["default"].createElement("i", { className: "ti ti-arrow-right" }))),
                                                react_1["default"].createElement("div", { className: "col-sm-6" },
                                                    react_1["default"].createElement(react_router_dom_1.Link, { to: routes.companiesGrid, className: "d-flex align-items-center justify-content-between p-2 crm-link mb-3" },
                                                        react_1["default"].createElement("span", { className: "d-flex align-items-center me-3" },
                                                            react_1["default"].createElement("i", { className: "ti ti-building text-default me-2" }),
                                                            "Companies"),
                                                        react_1["default"].createElement("i", { className: "ti ti-arrow-right" })),
                                                    react_1["default"].createElement(react_router_dom_1.Link, { to: routes.leadsGrid, className: "d-flex align-items-center justify-content-between p-2 crm-link mb-3" },
                                                        react_1["default"].createElement("span", { className: "d-flex align-items-center me-3" },
                                                            react_1["default"].createElement("i", { className: "ti ti-user-check text-default me-2" }),
                                                            "Leads"),
                                                        react_1["default"].createElement("i", { className: "ti ti-arrow-right" })),
                                                    react_1["default"].createElement(react_router_dom_1.Link, { to: routes.activity, className: "d-flex align-items-center justify-content-between p-2 crm-link mb-3" },
                                                        react_1["default"].createElement("span", { className: "d-flex align-items-center me-3" },
                                                            react_1["default"].createElement("i", { className: "ti ti-activity text-default me-2" }),
                                                            "Activities"),
                                                        react_1["default"].createElement("i", { className: "ti ti-arrow-right" })))))))),
                            react_1["default"].createElement(react_router_dom_1.Link, { to: routes.profilesettings, className: "btn btn-menubar" },
                                react_1["default"].createElement("i", { className: "ti ti-settings-cog" }))),
                        react_1["default"].createElement("div", { className: "sidebar sidebar-horizontal", id: "horizontal-single" },
                            react_1["default"].createElement("div", { className: "sidebar-menu" },
                                react_1["default"].createElement("div", { className: "main-menu" },
                                    react_1["default"].createElement("ul", { className: "nav-menu" },
                                        react_1["default"].createElement("li", { className: "menu-title" },
                                            react_1["default"].createElement("span", null, "Main")), horizontalSidebar_1.HorizontalSidebarData === null || horizontalSidebar_1.HorizontalSidebarData === void 0 ? void 0 :
                                        horizontalSidebar_1.HorizontalSidebarData.map(function (mainMenu, index) {
                                            var _a;
                                            return (react_1["default"].createElement(react_1["default"].Fragment, { key: "main-" + index }, (_a = mainMenu === null || mainMenu === void 0 ? void 0 : mainMenu.menu) === null || _a === void 0 ? void 0 : _a.map(function (data, i) {
                                                var _a, _b;
                                                return (react_1["default"].createElement("li", { className: "submenu", key: "menu-" + i },
                                                    react_1["default"].createElement(react_router_dom_1.Link, { to: "#", className: "\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t" + (((_a = data === null || data === void 0 ? void 0 : data.subMenus) === null || _a === void 0 ? void 0 : _a.map(function (link) { return link === null || link === void 0 ? void 0 : link.route; }).includes(Location.pathname)) ? "active"
                                                            : "") + " " + (subOpen === data.menuValue ? "subdrop" : ""), onClick: function () { return toggleSidebar(data.menuValue); } },
                                                        react_1["default"].createElement("i", { className: "ti ti-" + data.icon }),
                                                        react_1["default"].createElement("span", null, data.menuValue),
                                                        react_1["default"].createElement("span", { className: "menu-arrow" })),
                                                    react_1["default"].createElement("ul", { style: { display: subOpen === data.menuValue ? "block" : "none" } }, (_b = data === null || data === void 0 ? void 0 : data.subMenus) === null || _b === void 0 ? void 0 : _b.map(function (subMenu, j) {
                                                        var _a;
                                                        return (react_1["default"].createElement("li", { key: "submenu-" + j, className: (subMenu === null || subMenu === void 0 ? void 0 : subMenu.customSubmenuTwo) ? "submenu" : "" },
                                                            react_1["default"].createElement(react_router_dom_1.Link, { to: (subMenu === null || subMenu === void 0 ? void 0 : subMenu.route) || "#", className: (((_a = subMenu === null || subMenu === void 0 ? void 0 : subMenu.subMenusTwo) === null || _a === void 0 ? void 0 : _a.map(function (link) { return link === null || link === void 0 ? void 0 : link.route; }).includes(Location.pathname)) || (subMenu === null || subMenu === void 0 ? void 0 : subMenu.route) === Location.pathname
                                                                    ? "active"
                                                                    : "") + " " + (subsidebar === subMenu.menuValue ? "subdrop" : ""), onClick: function () { return toggleSubsidebar(subMenu.menuValue); } },
                                                                react_1["default"].createElement("span", null, subMenu === null || subMenu === void 0 ? void 0 : subMenu.menuValue),
                                                                (subMenu === null || subMenu === void 0 ? void 0 : subMenu.customSubmenuTwo) && react_1["default"].createElement("span", { className: "menu-arrow" })),
                                                            (subMenu === null || subMenu === void 0 ? void 0 : subMenu.customSubmenuTwo) && (subMenu === null || subMenu === void 0 ? void 0 : subMenu.subMenusTwo) && (react_1["default"].createElement("ul", { style: { display: subsidebar === subMenu.menuValue ? "block" : "none" } }, subMenu.subMenusTwo.map(function (subMenuTwo, k) { return (react_1["default"].createElement("li", { key: "submenu-two-" + k },
                                                                react_1["default"].createElement(react_router_dom_1.Link, { className: subMenuTwo.route === Location.pathname ? 'active' : '', to: subMenuTwo.route }, subMenuTwo.menuValue))); })))));
                                                    }))));
                                            })));
                                        }))))),
                        react_1["default"].createElement("div", { className: "d-flex align-items-center" },
                            react_1["default"].createElement("div", { className: "me-1" },
                                react_1["default"].createElement(react_router_dom_1.Link, { to: "#", onClick: toggleFullscreen, className: "btn btn-menubar btnFullscreen" },
                                    react_1["default"].createElement("i", { className: "ti ti-maximize" }))),
                            react_1["default"].createElement("div", { className: "dropdown me-1" },
                                react_1["default"].createElement("a", { href: "#", className: "btn btn-menubar", "data-bs-toggle": "dropdown" },
                                    react_1["default"].createElement("i", { className: "ti ti-layout-grid-remove" })),
                                react_1["default"].createElement("div", { className: "dropdown-menu dropdown-menu-end" },
                                    react_1["default"].createElement("div", { className: "card mb-0 border-0 shadow-none" },
                                        react_1["default"].createElement("div", { className: "card-header" },
                                            react_1["default"].createElement("h4", null, "Applications")),
                                        react_1["default"].createElement("div", { className: "card-body" },
                                            react_1["default"].createElement(react_router_dom_1.Link, { to: routes.calendar, className: "d-block pb-2" },
                                                react_1["default"].createElement("span", { className: "avatar avatar-md bg-transparent-dark me-2" },
                                                    react_1["default"].createElement("i", { className: "ti ti-calendar text-gray-9" })),
                                                "Calendar"),
                                            react_1["default"].createElement(react_router_dom_1.Link, { to: routes.todo, className: "d-block py-2" },
                                                react_1["default"].createElement("span", { className: "avatar avatar-md bg-transparent-dark me-2" },
                                                    react_1["default"].createElement("i", { className: "ti ti-subtask text-gray-9" })),
                                                "To Do"),
                                            react_1["default"].createElement(react_router_dom_1.Link, { to: routes.notes, className: "d-block py-2" },
                                                react_1["default"].createElement("span", { className: "avatar avatar-md bg-transparent-dark me-2" },
                                                    react_1["default"].createElement("i", { className: "ti ti-notes text-gray-9" })),
                                                "Notes"),
                                            react_1["default"].createElement(react_router_dom_1.Link, { to: routes.fileManager, className: "d-block py-2" },
                                                react_1["default"].createElement("span", { className: "avatar avatar-md bg-transparent-dark me-2" },
                                                    react_1["default"].createElement("i", { className: "ti ti-folder text-gray-9" })),
                                                "File Manager"),
                                            react_1["default"].createElement(react_router_dom_1.Link, { to: routes.kanbanView, className: "d-block py-2" },
                                                react_1["default"].createElement("span", { className: "avatar avatar-md bg-transparent-dark me-2" },
                                                    react_1["default"].createElement("i", { className: "ti ti-layout-kanban text-gray-9" })),
                                                "Kanban"),
                                            react_1["default"].createElement(react_router_dom_1.Link, { to: routes.invoice, className: "d-block py-2 pb-0" },
                                                react_1["default"].createElement("span", { className: "avatar avatar-md bg-transparent-dark me-2" },
                                                    react_1["default"].createElement("i", { className: "ti ti-file-invoice text-gray-9" })),
                                                "Invoices"))))),
                            react_1["default"].createElement("div", { className: "me-1" },
                                react_1["default"].createElement(react_router_dom_1.Link, { to: routes.chat, className: "btn btn-menubar position-relative" },
                                    react_1["default"].createElement("i", { className: "ti ti-brand-hipchat" }),
                                    react_1["default"].createElement("span", { className: "badge bg-info rounded-pill d-flex align-items-center justify-content-center header-badge" }, "5"))),
                            react_1["default"].createElement("div", { className: "me-1" },
                                react_1["default"].createElement(react_router_dom_1.Link, { to: routes.email, className: "btn btn-menubar" },
                                    react_1["default"].createElement("i", { className: "ti ti-mail" }))),
                            react_1["default"].createElement("div", { className: "me-1 notification_item" },
                                react_1["default"].createElement("a", { href: "#", className: "btn btn-menubar position-relative me-1", id: "notification_popup", "data-bs-toggle": "dropdown" },
                                    react_1["default"].createElement("i", { className: "ti ti-bell" }),
                                    react_1["default"].createElement("span", { className: "notification-status-dot" })),
                                react_1["default"].createElement("div", { className: "dropdown-menu dropdown-menu-end notification-dropdown p-4" },
                                    react_1["default"].createElement("div", { className: "d-flex align-items-center justify-content-between border-bottom p-0 pb-3 mb-3" },
                                        react_1["default"].createElement("h4", { className: "notification-title" }, "Notifications (2)"),
                                        react_1["default"].createElement("div", { className: "d-flex align-items-center" },
                                            react_1["default"].createElement(react_router_dom_1.Link, { to: "#", className: "text-primary fs-15 me-3 lh-1" }, "Mark all as read"),
                                            react_1["default"].createElement("div", { className: "dropdown" },
                                                react_1["default"].createElement("a", { href: "#", className: "bg-white dropdown-toggle", "data-bs-toggle": "dropdown" },
                                                    react_1["default"].createElement("i", { className: "ti ti-calendar-due me-1" }),
                                                    "Today"),
                                                react_1["default"].createElement("ul", { className: "dropdown-menu mt-2 p-3" },
                                                    react_1["default"].createElement("li", null,
                                                        react_1["default"].createElement(react_router_dom_1.Link, { to: "#", className: "dropdown-item rounded-1" }, "This Week")),
                                                    react_1["default"].createElement("li", null,
                                                        react_1["default"].createElement(react_router_dom_1.Link, { to: "#", className: "dropdown-item rounded-1" }, "Last Week")),
                                                    react_1["default"].createElement("li", null,
                                                        react_1["default"].createElement(react_router_dom_1.Link, { to: "#", className: "dropdown-item rounded-1" }, "Last Month")))))),
                                    react_1["default"].createElement("div", { className: "noti-content" },
                                        react_1["default"].createElement("div", { className: "d-flex flex-column" },
                                            react_1["default"].createElement("div", { className: "border-bottom mb-3 pb-3" },
                                                react_1["default"].createElement(react_router_dom_1.Link, { to: routes.activity },
                                                    react_1["default"].createElement("div", { className: "d-flex" },
                                                        react_1["default"].createElement("span", { className: "avatar avatar-lg me-2 flex-shrink-0" },
                                                            react_1["default"].createElement(imageWithBasePath_1["default"], { src: "assets/img/profiles/avatar-27.jpg", alt: "Profile" })),
                                                        react_1["default"].createElement("div", { className: "flex-grow-1" },
                                                            react_1["default"].createElement("p", { className: "mb-1" },
                                                                react_1["default"].createElement("span", { className: "text-dark fw-semibold" }, "Shawn"),
                                                                "performance in Math is below the threshold."),
                                                            react_1["default"].createElement("span", null, "Just Now"))))),
                                            react_1["default"].createElement("div", { className: "border-bottom mb-3 pb-3" },
                                                react_1["default"].createElement(react_router_dom_1.Link, { to: routes.activity, className: "pb-0" },
                                                    react_1["default"].createElement("div", { className: "d-flex" },
                                                        react_1["default"].createElement("span", { className: "avatar avatar-lg me-2 flex-shrink-0" },
                                                            react_1["default"].createElement(imageWithBasePath_1["default"], { src: "assets/img/profiles/avatar-23.jpg", alt: "Profile" })),
                                                        react_1["default"].createElement("div", { className: "flex-grow-1" },
                                                            react_1["default"].createElement("p", { className: "mb-1" },
                                                                react_1["default"].createElement("span", { className: "text-dark fw-semibold" }, "Sylvia"),
                                                                " added appointment on 02:00 PM"),
                                                            react_1["default"].createElement("span", null, "10 mins ago"),
                                                            react_1["default"].createElement("div", { className: "d-flex justify-content-start align-items-center mt-1" },
                                                                react_1["default"].createElement("span", { className: "btn btn-light btn-sm me-2" }, "Deny"),
                                                                react_1["default"].createElement("span", { className: "btn btn-primary btn-sm" }, "Approve")))))),
                                            react_1["default"].createElement("div", { className: "border-bottom mb-3 pb-3" },
                                                react_1["default"].createElement(react_router_dom_1.Link, { to: routes.activity },
                                                    react_1["default"].createElement("div", { className: "d-flex" },
                                                        react_1["default"].createElement("span", { className: "avatar avatar-lg me-2 flex-shrink-0" },
                                                            react_1["default"].createElement(imageWithBasePath_1["default"], { src: "assets/img/profiles/avatar-25.jpg", alt: "Profile" })),
                                                        react_1["default"].createElement("div", { className: "flex-grow-1" },
                                                            react_1["default"].createElement("p", { className: "mb-1" },
                                                                "New student record ",
                                                                react_1["default"].createElement("span", { className: "text-dark fw-semibold" }, " George"),
                                                                "is created by ",
                                                                react_1["default"].createElement("span", { className: "text-dark fw-semibold" }, "Teressa")),
                                                            react_1["default"].createElement("span", null, "2 hrs ago"))))),
                                            react_1["default"].createElement("div", { className: "border-0 mb-3 pb-0" },
                                                react_1["default"].createElement(react_router_dom_1.Link, { to: routes.activity },
                                                    react_1["default"].createElement("div", { className: "d-flex" },
                                                        react_1["default"].createElement("span", { className: "avatar avatar-lg me-2 flex-shrink-0" },
                                                            react_1["default"].createElement(imageWithBasePath_1["default"], { src: "assets/img/profiles/avatar-01.jpg", alt: "Profile" })),
                                                        react_1["default"].createElement("div", { className: "flex-grow-1" },
                                                            react_1["default"].createElement("p", { className: "mb-1" },
                                                                "A new teacher record for ",
                                                                react_1["default"].createElement("span", { className: "text-dark fw-semibold" }, "Elisa"),
                                                                " "),
                                                            react_1["default"].createElement("span", null, "09:45 AM"))))))),
                                    react_1["default"].createElement("div", { className: "d-flex p-0" },
                                        react_1["default"].createElement(react_router_dom_1.Link, { to: "#", className: "btn btn-light w-100 me-2" }, "Cancel"),
                                        react_1["default"].createElement(react_router_dom_1.Link, { to: routes.activity, className: "btn btn-primary w-100" }, "View All")))),
                            react_1["default"].createElement("div", { className: "dropdown profile-dropdown" },
                                react_1["default"].createElement("a", { href: "#", className: "dropdown-toggle d-flex align-items-center", "data-bs-toggle": "dropdown" },
                                    react_1["default"].createElement("span", { className: "avatar avatar-sm online" }, isSignedIn && user ? (react_1["default"].createElement("img", { src: getUserImage(), alt: "Profile", className: "img-fluid rounded-circle", onError: function (e) {
                                            // Fallback to default image if user image fails to load
                                            e.target.src = "assets/img/profiles/avatar-12.jpg";
                                        } })) : (react_1["default"].createElement(imageWithBasePath_1["default"], { src: "assets/img/profiles/avatar-12.jpg", alt: "Img", className: "img-fluid rounded-circle" })))),
                                react_1["default"].createElement("div", { className: "dropdown-menu shadow-none" },
                                    react_1["default"].createElement("div", { className: "card mb-0" },
                                        react_1["default"].createElement("div", { className: "card-header" },
                                            react_1["default"].createElement("div", { className: "d-flex align-items-center" },
                                                react_1["default"].createElement("span", { className: "avatar avatar-lg me-2 avatar-rounded" }, isSignedIn && user ? (react_1["default"].createElement("img", { src: getUserImage(), alt: "Profile", onError: function (e) {
                                                        // Fallback to default image if user image fails to load
                                                        e.target.src = "assets/img/profiles/avatar-12.jpg";
                                                    } })) : (react_1["default"].createElement(imageWithBasePath_1["default"], { src: "assets/img/profiles/avatar-12.jpg", alt: "img" }))),
                                                react_1["default"].createElement("div", null,
                                                    react_1["default"].createElement("h5", { className: "mb-0" }, getUserName()),
                                                    react_1["default"].createElement("p", { className: "fs-12 fw-medium mb-0" }, getUserEmail()),
                                                    isSignedIn && user ? (react_1["default"].createElement(react_1["default"].Fragment, null,
                                                        react_1["default"].createElement("p", { className: "fs-10 text-muted mb-0" },
                                                            "Role: ",
                                                            getUserRole()),
                                                        react_1["default"].createElement("p", { className: "fs-10 text-muted mt-0 mb-0" },
                                                            "CId: ",
                                                            getCompanyId()))) : null))),
                                        react_1["default"].createElement("div", { className: "card-body" },
                                            react_1["default"].createElement(react_router_dom_1.Link, { className: "dropdown-item d-inline-flex align-items-center p-0 py-2", to: routes.profile },
                                                react_1["default"].createElement("i", { className: "ti ti-user-circle me-1" }),
                                                "My Profile"),
                                            react_1["default"].createElement(react_router_dom_1.Link, { className: "dropdown-item d-inline-flex align-items-center p-0 py-2", to: routes.bussinessSettings },
                                                react_1["default"].createElement("i", { className: "ti ti-settings me-1" }),
                                                "Settings"),
                                            react_1["default"].createElement(react_router_dom_1.Link, { className: "dropdown-item d-inline-flex align-items-center p-0 py-2", to: routes.securitysettings },
                                                react_1["default"].createElement("i", { className: "ti ti-status-change me-1" }),
                                                "Status"),
                                            react_1["default"].createElement(react_router_dom_1.Link, { className: "dropdown-item d-inline-flex align-items-center p-0 py-2", to: routes.profilesettings },
                                                react_1["default"].createElement("i", { className: "ti ti-circle-arrow-up me-1" }),
                                                "My Account"),
                                            react_1["default"].createElement(react_router_dom_1.Link, { className: "dropdown-item d-inline-flex align-items-center p-0 py-2", to: routes.knowledgebase },
                                                react_1["default"].createElement("i", { className: "ti ti-question-mark me-1" }),
                                                "Knowledge Base")),
                                        react_1["default"].createElement("div", { className: "card-footer" },
                                            react_1["default"].createElement("button", { className: "dropdown-item d-inline-flex align-items-center p-0 py-2 btn btn-link text-start", onClick: handleSignOut, style: { border: 'none', background: 'none', width: '100%' } },
                                                react_1["default"].createElement("i", { className: "ti ti-login me-2" }),
                                                "Logout")))))))),
                react_1["default"].createElement("div", { className: "dropdown mobile-user-menu" },
                    react_1["default"].createElement("a", { href: "#", className: "nav-link dropdown-toggle", "data-bs-toggle": "dropdown", "aria-expanded": "false" },
                        react_1["default"].createElement("i", { className: "fa fa-ellipsis-v" })),
                    react_1["default"].createElement("div", { className: "dropdown-menu dropdown-menu-end" },
                        react_1["default"].createElement(react_router_dom_1.Link, { className: "dropdown-item", to: routes.profile }, "My Profile"),
                        react_1["default"].createElement(react_router_dom_1.Link, { className: "dropdown-item", to: routes.profilesettings }, "Settings"),
                        react_1["default"].createElement("button", { className: "dropdown-item btn btn-link text-start", onClick: handleSignOut, style: { border: 'none', background: 'none', width: '100%' } }, "Logout")))))));
};
exports["default"] = Header;
