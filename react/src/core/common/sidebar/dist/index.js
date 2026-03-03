"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
var clerk_react_1 = require("@clerk/clerk-react");
var react_1 = require("react");
var react_custom_scrollbars_2_1 = require("react-custom-scrollbars-2");
var react_redux_1 = require("react-redux");
var react_router_dom_1 = require("react-router-dom");
var CompanyPagesContext_1 = require("../../../contexts/CompanyPagesContext");
var all_routes_1 = require("../../../feature-module/router/all_routes");
var useIsReportingManager_1 = require("../../../hooks/useIsReportingManager");
require("../../../style/icon/tabler-icons/webfont/tabler-icons.css");
var sidebarMenu_1 = require("../../data/json/sidebarMenu");
var sidebarSlice_1 = require("../../data/redux/sidebarSlice");
var themeSettingSlice_1 = require("../../data/redux/themeSettingSlice");
var imageWithBasePath_1 = require("../imageWithBasePath");
var usePreviousRoute_1 = require("./usePreviousRoute");
var Sidebar = function () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w;
    var Location = react_router_dom_1.useLocation();
    var user = clerk_react_1.useUser().user;
    var _x = CompanyPagesContext_1.useCompanyPages(), isRouteEnabled = _x.isRouteEnabled, allEnabled = _x.allEnabled, isMenuLoading = _x.isLoading;
    var _y = useIsReportingManager_1.useIsReportingManager(), isReportingManager = _y.isReportingManager, reporteeCount = _y.reporteeCount, checkingManagerStatus = _y.loading;
    var SidebarDataTest = sidebarMenu_1["default"]();
    // Debug: Log reporting manager status
    react_1.useEffect(function () {
        var _a;
        console.log('[Sidebar] Reporting Manager Status:', {
            isReportingManager: isReportingManager,
            reporteeCount: reporteeCount,
            checkingManagerStatus: checkingManagerStatus,
            userId: user === null || user === void 0 ? void 0 : user.id,
            userRole: (_a = user === null || user === void 0 ? void 0 : user.publicMetadata) === null || _a === void 0 ? void 0 : _a.role
        });
    }, [isReportingManager, reporteeCount, checkingManagerStatus, user]);
    // Get current user role
    var getUserRole = function () {
        var _a, _b;
        if (!user)
            return "guest";
        return ((_b = (_a = user.publicMetadata) === null || _a === void 0 ? void 0 : _a.role) === null || _b === void 0 ? void 0 : _b.toLowerCase()) || "employee";
    };
    // Check if user has access to menu item (case-insensitive)
    var hasAccess = function (roles) {
        if (!roles || roles.length === 0) {
            console.log('[Sidebar hasAccess] No roles specified - ALLOWING');
            return true;
        }
        if (roles.includes("public")) {
            console.log('[Sidebar hasAccess] Public role - ALLOWING');
            return true;
        }
        var userRole = getUserRole();
        // Normalize both sides to lowercase for case-insensitive comparison
        var normalizedRoles = roles.map(function (r) { return r === null || r === void 0 ? void 0 : r.toLowerCase(); });
        var hasAccessResult = normalizedRoles.includes(userRole === null || userRole === void 0 ? void 0 : userRole.toLowerCase());
        // BRUTAL DEBUGGING: Log ALL access checks
        console.log('[Sidebar hasAccess]', {
            userRole: userRole,
            requiredRoles: roles,
            normalizedRoles: normalizedRoles,
            result: hasAccessResult ? '✅ ALLOWED' : '❌ DENIED'
        });
        return hasAccessResult;
    };
    /**
     * Check if a menu item should be visible.
     * Special handling for "Team Leaves" - only show if user is a reporting manager.
     * @param item Menu item object with link property
     * @returns true if item should be shown, false otherwise
     */
    var shouldShowMenuItem = function (item) {
        // Special check for Team Leaves menu item
        if (item.link === all_routes_1.all_routes.leavemanager) {
            console.log('[Sidebar shouldShowMenuItem] Team Leaves check:', {
                isReportingManager: isReportingManager,
                checkingManagerStatus: checkingManagerStatus,
                reporteeCount: reporteeCount,
                willShow: checkingManagerStatus || isReportingManager
            });
            // While checking manager status, show the menu item (will be checked on page load)
            if (checkingManagerStatus)
                return true;
            // Hide if user is not a reporting manager
            return isReportingManager;
        }
        // For all other menu items, show by default (role check handled elsewhere)
        return true;
    };
    /**
     * Check if a menu item (at any depth) is enabled based on company plan/modules.
     * - Leaf item: enabled if its route is in the company's enabled pages.
     * - Parent item: enabled if at least one descendant leaf is enabled.
     * - allEnabled (superadmin): always true.
     */
    var isMenuEnabled = function (item) {
        if (allEnabled)
            return true;
        if (!item)
            return false;
        // Parent with children: enabled if any child is enabled
        if (item.submenuItems && item.submenuItems.length > 0) {
            return item.submenuItems.some(function (child) { return isMenuEnabled(child); });
        }
        // Leaf item: check route
        var link = item.link;
        if (!link || link === '#' || link === 'index')
            return false;
        return isRouteEnabled(link);
    };
    var _z = react_1.useState("Dashboard"), subOpen = _z[0], setSubopen = _z[1];
    var _0 = react_1.useState(""), subsidebar = _0[0], setSubsidebar = _0[1];
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
    var handleLayoutChange = function (layout) {
        dispatch(themeSettingSlice_1.setDataLayout(layout));
    };
    var handleClick = function (label, themeSetting, layout) {
        toggleSidebar(label);
        if (themeSetting) {
            handleLayoutChange(layout);
        }
    };
    var getLayoutClass = function (label) {
        switch (label) {
            case "Default":
                return "default_layout";
            case "Mini":
                return "mini_layout";
            case "Box":
                return "boxed_layout";
            case "Dark":
                return "dark_data_theme";
            case "RTL":
                return "rtl";
            default:
                return "";
        }
    };
    var location = react_router_dom_1.useLocation();
    var dispatch = react_redux_1.useDispatch();
    var previousLocation = usePreviousRoute_1["default"]();
    var dataLayout = react_redux_1.useSelector(function (state) { return state.themeSetting.dataLayout; });
    var miniSidebar = react_redux_1.useSelector(function (state) { return state.sidebarSlice.miniSidebar; });
    var expandMenu = react_redux_1.useSelector(function (state) { return state.sidebarSlice.expandMenu; });
    // Debug: Log the sidebar data received from useSidebarData
    console.log('[Sidebar Component] Rendering sidebar with data:', {
        dataReceived: !!SidebarDataTest,
        dataLength: SidebarDataTest === null || SidebarDataTest === void 0 ? void 0 : SidebarDataTest.length,
        sections: SidebarDataTest === null || SidebarDataTest === void 0 ? void 0 : SidebarDataTest.map(function (s) { return s.tittle; }),
        userRole: (_a = user === null || user === void 0 ? void 0 : user.publicMetadata) === null || _a === void 0 ? void 0 : _a.role
    });
    // Debug: Check if menu-horizontal class is applied
    var isHorizontalLayout = dataLayout === "horizontal" || dataLayout === "horizontal-single" || dataLayout === "horizontal-overlay" || dataLayout === "horizontal-box";
    console.log('[Sidebar Component] Layout info:', {
        dataLayout: dataLayout,
        isHorizontalLayout: isHorizontalLayout,
        verticalSidebarVisible: !isHorizontalLayout
    });
    react_1.useEffect(function () {
        var layoutPages = [
            "/layout-dark",
            "/layout-rtl",
            "/layout-mini",
            "/layout-box",
            "/layout-default",
        ];
        var isCurrentLayoutPage = layoutPages.some(function (path) {
            return location.pathname.includes(path);
        });
        var isPreviousLayoutPage = previousLocation &&
            layoutPages.some(function (path) { return previousLocation.pathname.includes(path); });
    }, [location, previousLocation, dispatch]);
    react_1.useEffect(function () {
        var currentMenu = localStorage.getItem("menuOpened") || "Dashboard";
        setSubopen(currentMenu);
        // Select all 'submenu' elements
        var submenus = document.querySelectorAll(".submenu");
        // Loop through each 'submenu'
        submenus.forEach(function (submenu) {
            // Find all 'li' elements within the 'submenu'
            var listItems = submenu.querySelectorAll("li");
            submenu.classList.remove("active");
            // Check if any 'li' has the 'active' class
            listItems.forEach(function (item) {
                if (item.classList.contains("active")) {
                    // Add 'active' class to the 'submenu'
                    submenu.classList.add("active");
                    return;
                }
            });
        });
    }, [Location.pathname]);
    var onMouseEnter = function () {
        dispatch(sidebarSlice_1.setExpandMenu(true));
    };
    var onMouseLeave = function () {
        dispatch(sidebarSlice_1.setExpandMenu(false));
    };
    var isLayoutMini = dataLayout === "mini";
    var isSidebarCollapsed = (isLayoutMini || miniSidebar) && !expandMenu;
    var isSidebarExpanded = !isSidebarCollapsed;
    return (react_1["default"].createElement(react_1["default"].Fragment, null,
        react_1["default"].createElement("div", { className: "sidebar", id: "sidebar", onMouseEnter: onMouseEnter, onMouseLeave: onMouseLeave },
            react_1["default"].createElement("div", { className: "sidebar-logo text-center" },
                react_1["default"].createElement(react_router_dom_1.Link, { to: "routes.index", className: "logo-small" },
                    react_1["default"].createElement(imageWithBasePath_1["default"], { src: "assets\\img\\favicon.png", alt: "Logo" })),
                isSidebarExpanded && (react_1["default"].createElement(react_router_dom_1.Link, { to: "routes.index", className: "dark-logo" },
                    react_1["default"].createElement(imageWithBasePath_1["default"], { src: "assets/img/logo-white.svg", alt: "Logo" })))),
            react_1["default"].createElement("div", { className: "modern-profile p-3 pb-0" },
                react_1["default"].createElement("div", { className: "text-center rounded bg-light p-3 mb-4 user-profile" },
                    react_1["default"].createElement("div", { className: "avatar avatar-lg online mb-3" },
                        react_1["default"].createElement(imageWithBasePath_1["default"], { src: (user === null || user === void 0 ? void 0 : user.imageUrl) || "assets/img/profiles/avatar-02.jpg", alt: "Profile", className: "img-fluid rounded-circle" })),
                    react_1["default"].createElement("h6", { className: "fs-12 fw-normal mb-1" }, (user === null || user === void 0 ? void 0 : user.fullName) || (((user === null || user === void 0 ? void 0 : user.firstName) || "") + " " + ((user === null || user === void 0 ? void 0 : user.lastName) || "")).trim() || "User"),
                    react_1["default"].createElement("p", { className: "fs-10" }, ((_c = (_b = user === null || user === void 0 ? void 0 : user.publicMetadata) === null || _b === void 0 ? void 0 : _b.role) === null || _c === void 0 ? void 0 : _c.toLowerCase()) === "admin" ? "Admin" :
                        ((_e = (_d = user === null || user === void 0 ? void 0 : user.publicMetadata) === null || _d === void 0 ? void 0 : _d.role) === null || _e === void 0 ? void 0 : _e.toLowerCase()) === "hr" ? "HR" :
                            ((_g = (_f = user === null || user === void 0 ? void 0 : user.publicMetadata) === null || _f === void 0 ? void 0 : _f.role) === null || _g === void 0 ? void 0 : _g.toLowerCase()) === "superadmin" ? "Super Admin" :
                                ((_j = (_h = user === null || user === void 0 ? void 0 : user.publicMetadata) === null || _h === void 0 ? void 0 : _h.role) === null || _j === void 0 ? void 0 : _j.toLowerCase()) === "manager" ? "Manager" :
                                    ((_l = (_k = user === null || user === void 0 ? void 0 : user.publicMetadata) === null || _k === void 0 ? void 0 : _k.role) === null || _l === void 0 ? void 0 : _l.toLowerCase()) === "leads" ? "Leads" :
                                        "Employee")),
                react_1["default"].createElement("div", { className: "sidebar-nav mb-3" },
                    react_1["default"].createElement("ul", { className: "nav nav-tabs nav-tabs-solid nav-tabs-rounded nav-justified bg-transparent", role: "tablist" },
                        react_1["default"].createElement("li", { className: "nav-item" },
                            react_1["default"].createElement(react_router_dom_1.Link, { className: "nav-link active border-0", to: "#" }, "Menu")),
                        react_1["default"].createElement("li", { className: "nav-item" },
                            react_1["default"].createElement(react_router_dom_1.Link, { className: "nav-link border-0", to: "#" }, "Chats")),
                        react_1["default"].createElement("li", { className: "nav-item" },
                            react_1["default"].createElement(react_router_dom_1.Link, { className: "nav-link border-0", to: "#" }, "Inbox"))))),
            react_1["default"].createElement("div", { className: "sidebar-header p-3 pb-0 pt-2" },
                react_1["default"].createElement("div", { className: "text-center rounded bg-light p-2 mb-4 sidebar-profile d-flex align-items-center" },
                    react_1["default"].createElement("div", { className: "avatar avatar-md onlin" },
                        react_1["default"].createElement(imageWithBasePath_1["default"], { src: (user === null || user === void 0 ? void 0 : user.imageUrl) || "assets/img/profiles/avatar-02.jpg", alt: "Profile", className: "img-fluid rounded-circle" })),
                    react_1["default"].createElement("div", { className: "text-start sidebar-profile-info ms-2" },
                        react_1["default"].createElement("h6", { className: "fs-12 fw-normal mb-1" }, (user === null || user === void 0 ? void 0 : user.fullName) || (((user === null || user === void 0 ? void 0 : user.firstName) || "") + " " + ((user === null || user === void 0 ? void 0 : user.lastName) || "")).trim() || "User"),
                        react_1["default"].createElement("p", { className: "fs-10" }, ((_o = (_m = user === null || user === void 0 ? void 0 : user.publicMetadata) === null || _m === void 0 ? void 0 : _m.role) === null || _o === void 0 ? void 0 : _o.toLowerCase()) === "admin" ? "Admin" :
                            ((_q = (_p = user === null || user === void 0 ? void 0 : user.publicMetadata) === null || _p === void 0 ? void 0 : _p.role) === null || _q === void 0 ? void 0 : _q.toLowerCase()) === "hr" ? "HR" :
                                ((_s = (_r = user === null || user === void 0 ? void 0 : user.publicMetadata) === null || _r === void 0 ? void 0 : _r.role) === null || _s === void 0 ? void 0 : _s.toLowerCase()) === "superadmin" ? "Super Admin" :
                                    ((_u = (_t = user === null || user === void 0 ? void 0 : user.publicMetadata) === null || _t === void 0 ? void 0 : _t.role) === null || _u === void 0 ? void 0 : _u.toLowerCase()) === "manager" ? "Manager" :
                                        ((_w = (_v = user === null || user === void 0 ? void 0 : user.publicMetadata) === null || _v === void 0 ? void 0 : _v.role) === null || _w === void 0 ? void 0 : _w.toLowerCase()) === "leads" ? "Leads" :
                                            "Employee"))),
                react_1["default"].createElement("div", { className: "input-group input-group-flat d-inline-flex mb-4" },
                    react_1["default"].createElement("span", { className: "input-icon-addon" },
                        react_1["default"].createElement("i", { className: "ti ti-search" })),
                    react_1["default"].createElement("input", { type: "text", className: "form-control", placeholder: "Search in ManageRTC" }),
                    react_1["default"].createElement("span", { className: "input-group-text" },
                        react_1["default"].createElement("kbd", null, "CTRL + / "))),
                react_1["default"].createElement("div", { className: "d-flex align-items-center justify-content-between menu-item mb-3" },
                    react_1["default"].createElement("div", { className: "me-3" },
                        react_1["default"].createElement(react_router_dom_1.Link, { to: "#", className: "btn btn-menubar position-relative" },
                            react_1["default"].createElement("i", { className: "ti ti-shopping-bag" }),
                            react_1["default"].createElement("span", { className: "badge bg-success rounded-pill d-flex align-items-center justify-content-center header-badge" }, "5"))),
                    react_1["default"].createElement("div", { className: "me-3" },
                        react_1["default"].createElement(react_router_dom_1.Link, { to: "#", className: "btn btn-menubar" },
                            react_1["default"].createElement("i", { className: "ti ti-layout-grid-remove" }))),
                    react_1["default"].createElement("div", { className: "me-3" },
                        react_1["default"].createElement(react_router_dom_1.Link, { to: "#", className: "btn btn-menubar position-relative" },
                            react_1["default"].createElement("i", { className: "ti ti-brand-hipchat" }),
                            react_1["default"].createElement("span", { className: "badge bg-info rounded-pill d-flex align-items-center justify-content-center header-badge" }, "5"))),
                    react_1["default"].createElement("div", { className: "me-3 notification-item" },
                        react_1["default"].createElement(react_router_dom_1.Link, { to: "#", className: "btn btn-menubar position-relative me-1" },
                            react_1["default"].createElement("i", { className: "ti ti-bell" }),
                            react_1["default"].createElement("span", { className: "notification-status-dot" }))),
                    react_1["default"].createElement("div", { className: "me-0" },
                        react_1["default"].createElement(react_router_dom_1.Link, { to: "#", className: "btn btn-menubar" },
                            react_1["default"].createElement("i", { className: "ti ti-message" }))))),
            react_1["default"].createElement(react_custom_scrollbars_2_1["default"], null,
                react_1["default"].createElement("div", { className: "sidebar-inner slimscroll" },
                    react_1["default"].createElement("div", { id: "sidebar-menu", className: "sidebar-menu" }, isMenuLoading ? (react_1["default"].createElement("ul", null,
                        __spreadArrays(Array(6)).map(function (_, i) { return (react_1["default"].createElement("li", { key: "skel-" + i, style: { padding: "6px 16px", marginBottom: 4 } },
                            react_1["default"].createElement("div", { style: {
                                    height: 14,
                                    borderRadius: 6,
                                    background: "rgba(255,255,255,0.12)",
                                    animation: "pulse 1.4s ease-in-out infinite",
                                    width: 60 + (i % 3) * 15 + "%"
                                } }))); }),
                        react_1["default"].createElement("style", null, "\n                    @keyframes pulse {\n                      0%, 100% { opacity: 1; }\n                      50% { opacity: 0.35; }\n                    }\n                  "))) : (react_1["default"].createElement("ul", null, SidebarDataTest === null || SidebarDataTest === void 0 ? void 0 : SidebarDataTest.map(function (mainLabel, index) {
                        var _a;
                        var enabledItems = (_a = mainLabel === null || mainLabel === void 0 ? void 0 : mainLabel.submenuItems) === null || _a === void 0 ? void 0 : _a.filter(function (title) { return isMenuEnabled(title); });
                        if (!allEnabled && (!enabledItems || enabledItems.length === 0))
                            return null;
                        return (react_1["default"].createElement(react_1["default"].Fragment, { key: "main-" + index },
                            react_1["default"].createElement("li", { className: "menu-title" },
                                react_1["default"].createElement("span", null, mainLabel === null || mainLabel === void 0 ? void 0 : mainLabel.tittle)),
                            react_1["default"].createElement("li", null,
                                react_1["default"].createElement("ul", null, enabledItems === null || enabledItems === void 0 ? void 0 : enabledItems.map(function (title, i) {
                                    var _a, _b, _c, _d;
                                    var link_array = [];
                                    if ("submenuItems" in title) {
                                        (_a = title.submenuItems) === null || _a === void 0 ? void 0 : _a.forEach(function (link) {
                                            var _a;
                                            link_array.push(link === null || link === void 0 ? void 0 : link.link);
                                            if ((link === null || link === void 0 ? void 0 : link.submenu) && "submenuItems" in link) {
                                                (_a = link.submenuItems) === null || _a === void 0 ? void 0 : _a.forEach(function (item) {
                                                    link_array.push(item === null || item === void 0 ? void 0 : item.link);
                                                });
                                            }
                                        });
                                    }
                                    title.links = link_array;
                                    return (react_1["default"].createElement("li", { className: "submenu", key: "title-" + i },
                                        react_1["default"].createElement(react_router_dom_1.Link, { to: (title === null || title === void 0 ? void 0 : title.submenu) ? "#" : title === null || title === void 0 ? void 0 : title.link, onClick: function () {
                                                return handleClick(title === null || title === void 0 ? void 0 : title.label, title === null || title === void 0 ? void 0 : title.themeSetting, getLayoutClass(title === null || title === void 0 ? void 0 : title.label));
                                            }, className: (subOpen === (title === null || title === void 0 ? void 0 : title.label) ? "subdrop" : "") + " " + (((_b = title === null || title === void 0 ? void 0 : title.links) === null || _b === void 0 ? void 0 : _b.includes(Location.pathname)) ? "active"
                                                : "") + " " + (((_c = title === null || title === void 0 ? void 0 : title.submenuItems) === null || _c === void 0 ? void 0 : _c.map(function (link) { return link === null || link === void 0 ? void 0 : link.link; }).includes(Location.pathname)) ||
                                                (title === null || title === void 0 ? void 0 : title.link) === Location.pathname
                                                ? "active"
                                                : "") },
                                            react_1["default"].createElement("i", { className: "ti ti-" + title.icon }),
                                            react_1["default"].createElement("span", null, title === null || title === void 0 ? void 0 : title.label),
                                            (title === null || title === void 0 ? void 0 : title.dot) && (react_1["default"].createElement("span", { className: "badge badge-danger fs-10 fw-medium text-white p-1" }, "Hot")),
                                            react_1["default"].createElement("span", { className: (title === null || title === void 0 ? void 0 : title.submenu) ? "menu-arrow" : "" })),
                                        (title === null || title === void 0 ? void 0 : title.submenu) !== false &&
                                            subOpen === (title === null || title === void 0 ? void 0 : title.label) && (react_1["default"].createElement("ul", { style: {
                                                display: subOpen === (title === null || title === void 0 ? void 0 : title.label)
                                                    ? "block"
                                                    : "none"
                                            } }, (_d = title === null || title === void 0 ? void 0 : title.submenuItems) === null || _d === void 0 ? void 0 : _d.filter(function (item) { return hasAccess(item === null || item === void 0 ? void 0 : item.roles) && isMenuEnabled(item) && shouldShowMenuItem(item); }).map(function (item, j) {
                                            var _a, _b;
                                            return (react_1["default"].createElement("li", { className: (item === null || item === void 0 ? void 0 : item.submenuItems) ? "submenu submenu-two"
                                                    : "", key: "item-" + j },
                                                react_1["default"].createElement(react_router_dom_1.Link, { to: (item === null || item === void 0 ? void 0 : item.submenu) ? "#" : item === null || item === void 0 ? void 0 : item.link, className: (((_a = item === null || item === void 0 ? void 0 : item.submenuItems) === null || _a === void 0 ? void 0 : _a.map(function (link) { return link === null || link === void 0 ? void 0 : link.link; }).includes(Location.pathname)) ||
                                                        (item === null || item === void 0 ? void 0 : item.link) === Location.pathname
                                                        ? "active"
                                                        : "") + " " + (subsidebar === (item === null || item === void 0 ? void 0 : item.label)
                                                        ? "subdrop"
                                                        : ""), onClick: function () {
                                                        toggleSubsidebar(item === null || item === void 0 ? void 0 : item.label);
                                                    } }, item === null || item === void 0 ? void 0 :
                                                    item.label,
                                                    react_1["default"].createElement("span", { className: (item === null || item === void 0 ? void 0 : item.submenu) ? "menu-arrow"
                                                            : "" })),
                                                (item === null || item === void 0 ? void 0 : item.submenuItems) ? (react_1["default"].createElement("ul", { style: {
                                                        display: subsidebar === (item === null || item === void 0 ? void 0 : item.label)
                                                            ? "block"
                                                            : "none"
                                                    } }, (_b = item === null || item === void 0 ? void 0 : item.submenuItems) === null || _b === void 0 ? void 0 : _b.filter(function (items) { return hasAccess(items === null || items === void 0 ? void 0 : items.roles) && isMenuEnabled(items) && shouldShowMenuItem(items); }).map(function (items, k) {
                                                    var _a;
                                                    return (react_1["default"].createElement("li", { key: "submenu-item-" + k },
                                                        react_1["default"].createElement(react_router_dom_1.Link, { to: (items === null || items === void 0 ? void 0 : items.submenu) ? "#"
                                                                : items === null || items === void 0 ? void 0 : items.link, className: (subsidebar === (items === null || items === void 0 ? void 0 : items.label)
                                                                ? "submenu-two subdrop"
                                                                : "submenu-two") + " " + (((_a = items === null || items === void 0 ? void 0 : items.submenuItems) === null || _a === void 0 ? void 0 : _a.map(function (link) {
                                                                return link.link;
                                                            }).includes(Location.pathname)) ||
                                                                (items === null || items === void 0 ? void 0 : items.link) ===
                                                                    Location.pathname
                                                                ? "active"
                                                                : "") }, items === null || items === void 0 ? void 0 : items.label)));
                                                }))) : null));
                                        })))));
                                })))));
                    })))))))));
};
exports["default"] = Sidebar;
