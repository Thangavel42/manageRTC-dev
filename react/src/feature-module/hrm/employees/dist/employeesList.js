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
var react_1 = require("react");
var react_2 = require("react");
var all_routes_1 = require("../../router/all_routes");
var react_router_dom_1 = require("react-router-dom");
var index_1 = require("../../../core/common/dataTable/index");
var imageWithBasePath_1 = require("../../../core/common/imageWithBasePath");
var EmployeeNameCell_1 = require("../../../core/common/EmployeeNameCell");
var datePicker_1 = require("../../../core/common/datePicker");
var employees_list_details_1 = require("../../../core/data/json/employees_list_details");
var antd_1 = require("antd");
var commonSelect_1 = require("../../../core/common/commonSelect");
var collapse_header_1 = require("../../../core/common/collapse-header/collapse-header");
var SocketContext_1 = require("../../../SocketContext");
var react_toastify_1 = require("react-toastify");
var dayjs_1 = require("dayjs");
var footer_1 = require("../../../core/common/footer");
// Helper Functions
var generateId = function (prefix) {
    var randomNum = Math.floor(1 + Math.random() * 9999);
    var paddedNum = randomNum.toString().padStart(4, "0");
    return prefix + "-" + paddedNum;
};
// Normalize status to ensure correct case for all possible statuses
var normalizeStatus = function (status) {
    if (!status)
        return "Active";
    var normalized = status.toLowerCase();
    // Map all possible status values with case-insensitive matching
    if (normalized === "active")
        return "Active";
    if (normalized === "inactive")
        return "Inactive";
    if (normalized === "on notice")
        return "On Notice";
    if (normalized === "resigned")
        return "Resigned";
    if (normalized === "terminated")
        return "Terminated";
    if (normalized === "on leave")
        return "On Leave";
    // Default to Active for unknown statuses
    return "Active";
};
var MODULES = [
    "holidays",
    "leaves",
    "clients",
    "projects",
    "tasks",
    "chats",
    "assets",
    "timingSheets",
];
var EMPTY_OPTION = { value: "", label: "Select Designation" };
var initialState = {
    enabledModules: {
        holidays: false,
        leaves: false,
        clients: false,
        projects: false,
        tasks: false,
        chats: false,
        assets: false,
        timingSheets: false
    },
    permissions: {
        holidays: {
            read: false,
            write: false,
            create: false,
            "delete": false,
            "import": false,
            "export": false
        },
        leaves: {
            read: false,
            write: false,
            create: false,
            "delete": false,
            "import": false,
            "export": false
        },
        clients: {
            read: false,
            write: false,
            create: false,
            "delete": false,
            "import": false,
            "export": false
        },
        projects: {
            read: false,
            write: false,
            create: false,
            "delete": false,
            "import": false,
            "export": false
        },
        tasks: {
            read: false,
            write: false,
            create: false,
            "delete": false,
            "import": false,
            "export": false
        },
        chats: {
            read: false,
            write: false,
            create: false,
            "delete": false,
            "import": false,
            "export": false
        },
        assets: {
            read: false,
            write: false,
            create: false,
            "delete": false,
            "import": false,
            "export": false
        },
        timingSheets: {
            read: false,
            write: false,
            create: false,
            "delete": false,
            "import": false,
            "export": false
        }
    },
    selectAll: {
        holidays: false,
        leaves: false,
        clients: false,
        projects: false,
        tasks: false,
        chats: false,
        assets: false,
        timingSheets: false
    }
};
var EmployeeList = function () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7;
    // const {  isLoaded } = useUser();
    var navigate = react_router_dom_1.useNavigate();
    var _8 = react_2.useState(null), error = _8[0], setError = _8[1];
    var _9 = react_2.useState(false), loading = _9[0], setLoading = _9[1];
    var _10 = react_2.useState(false), isValidating = _10[0], setIsValidating = _10[1];
    var _11 = react_2.useState("basic-info"), activeTab = _11[0], setActiveTab = _11[1];
    var _12 = react_2.useState(null), responseData = _12[0], setResponseData = _12[1];
    var fileInputRef = react_2.useRef(null);
    var _13 = react_2.useState(false), imageUpload = _13[0], setImageUpload = _13[1];
    var _14 = react_2.useState({}), fieldErrors = _14[0], setFieldErrors = _14[1];
    var _15 = react_2.useState(false), isBasicInfoValidated = _15[0], setIsBasicInfoValidated = _15[1];
    var _16 = react_2.useState([]), department = _16[0], setDepartment = _16[1];
    var _17 = react_2.useState([]), designation = _17[0], setDesignation = _17[1];
    var _18 = react_2.useState([]), allDesignations = _18[0], setAllDesignations = _18[1];
    var _19 = react_2.useState([]), filteredDesignations = _19[0], setFilteredDesignations = _19[1];
    var _20 = react_2.useState(""), selectedDepartment = _20[0], setSelectedDepartment = _20[1];
    var _21 = react_2.useState(""), selectedDesignation = _21[0], setSelectedDesignation = _21[1];
    var _22 = react_2.useState(""), confirmPassword = _22[0], setConfirmPassword = _22[1];
    var _23 = react_2.useState(""), sortOrder = _23[0], setSortOrder = _23[1];
    var _24 = react_2.useState(""), selectedStatus = _24[0], setSelectedStatus = _24[1];
    var _25 = react_2.useState(null), employeeToDelete = _25[0], setEmployeeToDelete = _25[1];
    var _26 = react_2.useState(null), editingEmployee = _26[0], setEditingEmployee = _26[1];
    var _27 = react_2.useState(null), newlyAddedEmployee = _27[0], setNewlyAddedEmployee = _27[1];
    var _28 = react_2.useState({
        startDate: "",
        endDate: "",
        status: "",
        departmentId: ""
    }), filters = _28[0], setFilters = _28[1];
    var addEmployeeModalRef = react_2.useRef(null);
    var editEmployeeModalRef = react_2.useRef(null);
    var successModalRef = react_2.useRef(null);
    var _29 = react_2.useState([]), sortedEmployee = _29[0], setSortedEmployee = _29[1];
    var _30 = react_2.useState([]), employees = _30[0], setEmployees = _30[1];
    var _31 = react_2.useState({
        totalEmployees: 0,
        activeCount: 0,
        inactiveCount: 0,
        newJoinersCount: 0
    }), stats = _31[0], setStats = _31[1];
    // Lifecycle status tracking for status dropdown control
    var _32 = react_2.useState(null), lifecycleStatus = _32[0], setLifecycleStatus = _32[1];
    // View state - 'list' or 'grid'
    var _33 = react_2.useState("list"), viewMode = _33[0], setViewMode = _33[1];
    var _34 = react_2.useState({
        employeeId: generateId("EMP"),
        avatarUrl: "",
        firstName: "",
        lastName: "",
        dateOfJoining: "",
        contact: {
            email: "",
            phone: ""
        },
        account: {
            userName: "",
            password: ""
        },
        personal: {
            gender: "",
            birthday: "",
            address: {
                street: "",
                city: "",
                state: "",
                postalCode: "",
                country: ""
            }
        },
        companyName: "",
        designationId: "",
        departmentId: "",
        about: "",
        status: "Active"
    }), formData = _34[0], setFormData = _34[1];
    var _35 = react_2.useState(initialState), permissions = _35[0], setPermissions = _35[1];
    var socket = SocketContext_1.useSocket();
    react_2.useEffect(function () {
        if (!socket)
            return;
        var isMounted = true;
        setLoading(true);
        var timeoutId = setTimeout(function () {
            if (loading && isMounted) {
                console.warn("Employees loading timeout - showing fallback");
                setError("Employees loading timed out. Please refresh the page.");
                setLoading(false);
            }
        }, 30000);
        // Fetch employee data (works for both list and grid views)
        socket.emit("hrm/employees/get-employee-stats");
        socket.emit("hr/departments/get");
        // Designations will be loaded when a department is selected
        var handleAddEmployeeResponse = function (response) {
            var _a;
            if (!isMounted)
                return;
            if (response.done) {
                setResponseData(response.data);
                setError(null);
                setFieldErrors({});
                setLoading(false);
                // Close the add employee modal
                if (addEmployeeModalRef.current) {
                    addEmployeeModalRef.current.click();
                    // Clean up backdrop
                    setTimeout(function () { return closeModal(); }, 100);
                }
                // Store the newly added employee data
                if (response.data && response.data.employee) {
                    setNewlyAddedEmployee(response.data.employee);
                }
                else if (response.data) {
                    // If the response structure is different, try to use the whole data
                    setNewlyAddedEmployee(response.data);
                }
                // Show success modal with navigation options
                setTimeout(function () {
                    if (successModalRef.current) {
                        successModalRef.current.click();
                        // Ensure previous modal backdrop is removed
                        closeModal();
                    }
                }, 300);
                // Refresh employee list
                if (socket) {
                    socket.emit("hrm/employees/get-employee-stats");
                }
            }
            else {
                setLoading(false);
                // Parse error and set inline field error
                var errorInfo_1 = parseBackendError(response.error || "Failed to add employee");
                if (errorInfo_1) {
                    setFieldErrors((_a = {}, _a[errorInfo_1.field] = errorInfo_1.message, _a));
                    // If error is for a basic field, switch to basic info tab, reset validation, and scroll
                    var basicFields = ['firstName', 'lastName', 'email', 'userName', 'password', 'phone', 'departmentId', 'designationId', 'dateOfJoining'];
                    if (basicFields.includes(errorInfo_1.field) || errorInfo_1.field === 'general') {
                        setActiveTab("basic-info");
                        setIsBasicInfoValidated(false); // Reset validation flag
                        setTimeout(function () {
                            var _a, _b;
                            var errorElement = document.querySelector("[name=\"" + errorInfo_1.field + "\"]") ||
                                document.querySelector("#" + errorInfo_1.field) ||
                                document.querySelector('.is-invalid');
                            if (errorElement) {
                                errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                (_b = (_a = errorElement).focus) === null || _b === void 0 ? void 0 : _b.call(_a);
                            }
                        }, 100);
                    }
                }
                else {
                    setFieldErrors({ general: response.error || "Failed to add employee" });
                }
                setError(response.error || "Failed to add employee");
                // No toast - error shown inline only
            }
        };
        var handleDesignationResponse = function (response) {
            if (!isMounted)
                return;
            if (response.done && Array.isArray(response.data)) {
                console.log("Designations response:", response);
                // Map all designations from the response
                var mappedDesignations = response.data.map(function (d) { return ({
                    value: d._id,
                    label: d.designation
                }); });
                setDesignation(__spreadArrays([{ value: "", label: "Select" }], mappedDesignations));
                // If we're editing and the designation exists in the new list, keep it selected
                if (editingEmployee === null || editingEmployee === void 0 ? void 0 : editingEmployee.designationId) {
                    var designationExists = response.data.some(function (d) { return d._id === editingEmployee.designationId; });
                    if (!designationExists) {
                        setSelectedDesignation("");
                        setEditingEmployee(function (prev) {
                            return prev ? __assign(__assign({}, prev), { designationId: "" }) : prev;
                        });
                    }
                }
                setError(null);
                setLoading(false);
            }
            else {
                setError(response.error || "Failed to get designations");
                setLoading(false);
            }
        };
        var handleDepartmentResponse = function (response) {
            if (!isMounted)
                return;
            if (response.done && Array.isArray(response.data)) {
                var mappedDepartments = response.data.map(function (d) { return ({
                    value: d._id,
                    label: d.department
                }); });
                setDepartment(__spreadArrays([{ value: "", label: "Select" }], mappedDepartments));
                setError(null);
                setLoading(false);
            }
            else {
                setError(response.error || "Failed to get departments");
                setLoading(false);
            }
        };
        var handleEmployeeResponse = function (response) {
            if (!isMounted)
                return;
            console.log("response hrm-employee", response);
            if (response.done) {
                console.log("response hrm-employee", response);
                if (response.data.stats) {
                    setStats(response.data.stats);
                }
                if (Array.isArray(response.data.employees)) {
                    // Normalize status for all employees to ensure correct case
                    var normalizedEmployees = response.data.employees.map(function (emp) {
                        console.log("Employee " + emp.employeeId + " - Raw status: \"" + emp.status + "\", Normalized: \"" + normalizeStatus(emp.status) + "\"");
                        return __assign(__assign({}, emp), { status: normalizeStatus(emp.status) });
                    });
                    setEmployees(normalizedEmployees);
                }
                setError(null);
                setLoading(false);
            }
            else {
                setError(response.error || "Failed to fetch employees");
                setLoading(false);
            }
        };
        var handleEmployeeDelete = function (response) {
            if (!isMounted)
                return;
            if (response.done) {
                setResponseData(response.data);
                setError(null);
                setLoading(false);
                react_toastify_1.toast.success("Employee deleted successfully!", {
                    position: "top-right",
                    autoClose: 3000
                });
                if (socket) {
                    socket.emit("hrm/employees/get-employee-stats");
                }
            }
            else {
                setError(response.error || "Failed to delete employee");
                setLoading(false);
                react_toastify_1.toast.error(response.error || "Failed to delete employee", {
                    position: "top-right",
                    autoClose: 3000
                });
            }
        };
        var handleUpdateEmployeeResponse = function (response) {
            if (response.done) {
                // Close the modal
                if (editEmployeeModalRef.current) {
                    editEmployeeModalRef.current.click();
                    // Clean up backdrop
                    setTimeout(function () { return closeModal(); }, 100);
                }
                react_toastify_1.toast.success("Employee updated successfully!", {
                    position: "top-right",
                    autoClose: 3000
                });
                // Refresh employee list
                if (socket) {
                    socket.emit("hrm/employees/get-employee-stats");
                }
                setEditingEmployee(null); // Close modal or reset editing state
                setError(null);
                setLoading(false);
            }
            else {
                react_toastify_1.toast.error(response.error || "Failed to update employee.", {
                    position: "top-right",
                    autoClose: 3000
                });
                setError(response.error || "Failed to update employee.");
                setLoading(false);
            }
        };
        var handleUpdatePermissionResponse = function (response) {
            if (response.done) {
                react_toastify_1.toast.success("Employee permissions updated successfully!", {
                    position: "top-right",
                    autoClose: 3000
                });
                // Refresh employee list or permissions
                if (socket) {
                    socket.emit("hrm/employees/get-employee-stats");
                }
                setError(null);
                setLoading(false);
            }
            else {
                react_toastify_1.toast.error(response.error || "Failed to update permissions.", {
                    position: "top-right",
                    autoClose: 3000
                });
                setError(response.error || "Failed to update permissions.");
                setLoading(false);
            }
        };
        var handleLifecycleStatusResponse = function (response) {
            if (!isMounted)
                return;
            if (response.done && response.data) {
                setLifecycleStatus(response.data);
                // Show warning if employee has lifecycle records
                if (response.data.hasLifecycleRecord && response.data.message) {
                    react_toastify_1.toast.info(response.data.message, {
                        position: "top-right",
                        autoClose: 5000
                    });
                }
            }
            else {
                // Clear lifecycle status if check fails
                setLifecycleStatus(null);
            }
        };
        socket.on("hrm/employees/add-response", handleAddEmployeeResponse);
        socket.on("hrm/designations/get-response", handleDesignationResponse);
        socket.on("hr/departments/get-response", handleDepartmentResponse);
        socket.on("hrm/employees/get-employee-stats-response", handleEmployeeResponse);
        socket.on("hrm/employees/get-employee-grid-stats-response", handleEmployeeResponse);
        socket.on("hrm/employees/delete-response", handleEmployeeDelete);
        socket.on("hrm/employees/update-response", handleUpdateEmployeeResponse);
        socket.on("hrm/employees/update-permissions-response", handleUpdatePermissionResponse);
        socket.on("hrm/employees/check-lifecycle-status-response", handleLifecycleStatusResponse);
        return function () {
            isMounted = false;
            clearTimeout(timeoutId);
            socket.off("hrm/employees/add-response", handleAddEmployeeResponse);
            socket.off("hrm/designations/get-response", handleDesignationResponse);
            socket.off("hr/departments/get-response", handleDepartmentResponse);
            socket.off("hrm/employees/get-employee-stats-response", handleEmployeeResponse);
            socket.off("hrm/employees/get-employee-grid-stats-response", handleEmployeeResponse);
            socket.off("hrm/employees/delete-response", handleEmployeeDelete);
            socket.off("hrm/employees/update-response", handleUpdateEmployeeResponse);
            socket.off("hrm/employees/update-permissions-response", handleUpdatePermissionResponse);
            socket.off("hrm/employees/check-lifecycle-status-response", handleLifecycleStatusResponse);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket]);
    react_2.useEffect(function () {
        if (editingEmployee && socket) {
            // Fetch designations for the employee's department
            console.log("Emitting for departmentID", editingEmployee.departmentId);
            // Check lifecycle status when employee is selected for editing
            socket.emit("hrm/employees/check-lifecycle-status", {
                employeeId: editingEmployee.employeeId
            });
            if (editingEmployee.departmentId) {
                socket.emit("hrm/designations/get", {
                    departmentId: editingEmployee.departmentId
                });
            }
        }
    }, [editingEmployee, socket]);
    react_2.useEffect(function () {
        if (editingEmployee && editingEmployee.permissions) {
            setPermissions({
                enabledModules: __assign(__assign({}, initialState.enabledModules), editingEmployee.enabledModules),
                permissions: __assign(__assign({}, initialState.permissions), editingEmployee.permissions),
                selectAll: __assign({}, initialState.selectAll)
            });
        }
        else {
            setPermissions(initialState);
        }
    }, [editingEmployee]);
    // Clean up modal backdrops on component unmount or when activeTab changes
    react_2.useEffect(function () {
        return function () {
            // Cleanup on unmount
            closeModal();
        };
    }, []);
    // Also clean up backdrops whenever modals might have closed
    react_2.useEffect(function () {
        var handleModalHidden = function () {
            setTimeout(function () { return closeModal(); }, 100);
        };
        // Listen for Bootstrap modal hidden events
        var modals = document.querySelectorAll('.modal');
        modals.forEach(function (modal) {
            modal.addEventListener('hidden.bs.modal', handleModalHidden);
        });
        return function () {
            modals.forEach(function (modal) {
                modal.removeEventListener('hidden.bs.modal', handleModalHidden);
            });
        };
    }, []);
    var data = employees_list_details_1.employee_list_details;
    var columns = [
        {
            title: "Emp ID",
            dataIndex: "employeeId",
            render: function (text, record) { return (react_1["default"].createElement(react_router_dom_1.Link, { to: "/employees/" + record._id }, text)); },
            sorter: function (a, b) { return (a.employeeId || "").length - (b.employeeId || "").length; }
        },
        {
            title: "Name",
            dataIndex: "name",
            render: function (text, record) {
                return (react_1["default"].createElement(EmployeeNameCell_1["default"], { name: record.firstName + " " + record.lastName, image: record.avatarUrl, employeeId: record._id, secondaryText: record.role, avatarTheme: "primary" }));
            },
            sorter: function (a, b) { return (a.firstName || "").localeCompare(b.firstName || ""); }
        },
        {
            title: "Email",
            dataIndex: ["contact", "email"],
            sorter: function (a, b) { var _a, _b; return (((_a = a.contact) === null || _a === void 0 ? void 0 : _a.email) || "").localeCompare(((_b = b.contact) === null || _b === void 0 ? void 0 : _b.email) || ""); }
        },
        {
            title: "Phone",
            dataIndex: ["contact", "phone"],
            sorter: function (a, b) { var _a, _b; return (((_a = a.contact) === null || _a === void 0 ? void 0 : _a.phone) || "").localeCompare(((_b = b.contact) === null || _b === void 0 ? void 0 : _b.phone) || ""); }
        },
        {
            title: "Department",
            dataIndex: "departmentId",
            render: function (text, record) { var _a; return (_a = department.find(function (dep) { return dep.value === record.departmentId; })) === null || _a === void 0 ? void 0 : _a.label; },
            sorter: function (a, b) { return (a.departmentId || "").localeCompare(b.departmentId || ""); }
        },
        {
            title: "Joining Date",
            dataIndex: "dateOfJoining",
            sorter: function (a, b) {
                return new Date(a.dateOfJoining).getTime() -
                    new Date(b.dateOfJoining).getTime();
            },
            render: function (date) {
                if (!date)
                    return "-";
                var d = new Date(date);
                return d.toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                });
            }
        },
        {
            title: "Status",
            dataIndex: "status",
            render: function (text, record) {
                // Normalize status for comparison (handle case-insensitive)
                var status = (text || "").toLowerCase();
                // Determine badge color based on status
                var badgeClass = "badge-secondary"; // Default gray
                if (status === "active") {
                    badgeClass = "badge-success"; // Green
                }
                else if (status === "on notice") {
                    badgeClass = "badge-warning"; // Yellow/Orange
                }
                else if (status === "resigned") {
                    badgeClass = "badge-info"; // Blue
                }
                else if (status === "terminated") {
                    badgeClass = "badge-danger"; // Red
                }
                else if (status === "inactive") {
                    badgeClass = "badge-secondary"; // Gray
                }
                else if (status === "on leave") {
                    badgeClass = "badge-soft-warning"; // Soft yellow
                }
                return (react_1["default"].createElement("span", { className: "badge " + badgeClass + " d-inline-flex align-items-center badge-xs" },
                    react_1["default"].createElement("i", { className: "ti ti-point-filled me-1" }),
                    text));
            },
            sorter: function (a, b) { return (a.status || "").localeCompare(b.status || ""); },
            filters: [
                { text: "Active", value: "Active" },
                { text: "On Notice", value: "On Notice" },
                { text: "Resigned", value: "Resigned" },
                { text: "Terminated", value: "Terminated" },
                { text: "Inactive", value: "Inactive" },
                { text: "On Leave", value: "On Leave" },
            ],
            onFilter: function (value, record) { return record.status === value; }
        },
        {
            title: "",
            dataIndex: "actions",
            key: "actions",
            render: function (_test, employee) { return (react_1["default"].createElement("div", { className: "action-icon d-inline-flex", key: "actions-" + employee._id },
                react_1["default"].createElement(react_router_dom_1.Link, { to: "#", className: "me-2", "data-bs-toggle": "modal", "data-inert": true, "data-bs-target": "#edit_employee", onClick: function () {
                        var preparedEmployee = prepareEmployeeForEdit(employee);
                        setEditingEmployee(preparedEmployee);
                        // Load permissions for editing
                        if (employee.permissions && employee.enabledModules) {
                            setPermissions({
                                permissions: employee.permissions,
                                enabledModules: employee.enabledModules,
                                selectAll: Object.keys(employee.enabledModules).reduce(function (acc, key) {
                                    acc[key] = false;
                                    return acc;
                                }, {})
                            });
                        }
                        // Load department and designation
                        if (employee.departmentId) {
                            setSelectedDepartment(employee.departmentId);
                            if (socket) {
                                socket.emit("hrm/designations/get", {
                                    departmentId: employee.departmentId
                                });
                            }
                        }
                        if (employee.designationId) {
                            setSelectedDesignation(employee.designationId);
                        }
                    } },
                    react_1["default"].createElement("i", { className: "ti ti-edit" })),
                react_1["default"].createElement(react_router_dom_1.Link, { to: "#", "data-bs-toggle": "modal", "data-inert": true, "data-bs-target": "#delete_modal", onClick: function () {
                        setEmployeeToDelete(employee);
                    } },
                    react_1["default"].createElement("i", { className: "ti ti-trash" })))); }
        },
    ];
    console.log("Editing employee", editingEmployee);
    var _36 = react_2.useState({
        password: false,
        confirmPassword: false
    }), passwordVisibility = _36[0], setPasswordVisibility = _36[1];
    // Helper functions
    var handleChange = function (e) {
        var _a = e.target, name = _a.name, value = _a.value;
        if (name === "email" || name === "phone") {
            setFormData(function (prev) {
                var _a;
                return (__assign(__assign({}, prev), { contact: __assign(__assign({}, prev.contact), (_a = {}, _a[name] = value, _a)) }));
            });
        }
        else if (name === "userName" || name === "password") {
            setFormData(function (prev) {
                var _a;
                return (__assign(__assign({}, prev), { account: __assign(__assign({}, prev.account), (_a = {}, _a[name] = value, _a)) }));
            });
        }
        else if (name === "gender") {
            setFormData(function (prev) { return (__assign(__assign({}, prev), { personal: __assign(__assign({}, prev.personal), { gender: value }) })); });
        }
        else if (name === "street" ||
            name === "city" ||
            name === "state" ||
            name === "postalCode" ||
            name === "country") {
            setFormData(function (prev) {
                var _a;
                var _b;
                return (__assign(__assign({}, prev), { personal: __assign(__assign({}, prev.personal), { address: __assign(__assign({}, (_b = prev.personal) === null || _b === void 0 ? void 0 : _b.address), (_a = {}, _a[name] = value, _a)) }) }));
            });
        }
        else {
            setFormData(function (prev) {
                var _a;
                return (__assign(__assign({}, prev), (_a = {}, _a[name] = value, _a)));
            });
        }
    };
    var onSelectStatus = function (status) {
        if (!status)
            return;
        setSelectedStatus(status);
        applyFilters({ status: status });
    };
    var onSelectDepartment = function (id) {
        console.log(id);
        applyFilters({ departmentId: id });
    };
    var applyFilters = function (updatedFields) {
        try {
            setFilters(function (prevFilters) {
                var newFilters = __assign(__assign({}, prevFilters), updatedFields);
                if (socket) {
                    socket.emit("hrm/employees/get-employee-stats", __assign({}, newFilters));
                }
                return newFilters;
            });
        }
        catch (error) {
            console.error("Error applying filters:", error);
        }
    };
    // Clear all filters
    var clearAllFilters = function () {
        try {
            setFilters({
                startDate: "",
                endDate: "",
                status: "",
                departmentId: ""
            });
            setSelectedDepartment("");
            setSelectedStatus("");
            setSortOrder("");
            if (socket) {
                socket.emit("hrm/employees/get-employee-stats", {
                    startDate: "",
                    endDate: "",
                    status: "",
                    departmentId: ""
                });
            }
            react_toastify_1.toast.success("All filters cleared", {
                position: "top-right",
                autoClose: 2000
            });
        }
        catch (error) {
            console.error("Error clearing filters:", error);
        }
    };
    // Handle file upload
    var uploadImage = function (file) { return __awaiter(void 0, void 0, void 0, function () {
        var formData, res, data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    formData = new FormData();
                    formData.append("file", file);
                    formData.append("upload_preset", "amasqis");
                    return [4 /*yield*/, fetch("https://api.cloudinary.com/v1_1/dwc3b5zfe/image/upload", {
                            method: "POST",
                            body: formData
                        })];
                case 1:
                    res = _a.sent();
                    return [4 /*yield*/, res.json()];
                case 2:
                    data = _a.sent();
                    console.log(data);
                    return [2 /*return*/, data.secure_url];
            }
        });
    }); };
    var handleImageUpload = function (event) { return __awaiter(void 0, void 0, void 0, function () {
        var file, maxSize, uploadedUrl_1, error_1;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    file = (_a = event.target.files) === null || _a === void 0 ? void 0 : _a[0];
                    if (!file)
                        return [2 /*return*/];
                    maxSize = 4 * 1024 * 1024;
                    if (file.size > maxSize) {
                        react_toastify_1.toast.error("File size must be less than 4MB.", {
                            position: "top-right",
                            autoClose: 3000
                        });
                        event.target.value = "";
                        return [2 /*return*/];
                    }
                    if (!["image/jpeg", "image/png", "image/jpg", "image/ico"].includes(file.type)) return [3 /*break*/, 6];
                    setImageUpload(true);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, uploadImage(file)];
                case 2:
                    uploadedUrl_1 = _b.sent();
                    setFormData(function (prev) { return (__assign(__assign({}, prev), { avatarUrl: uploadedUrl_1 })); });
                    setImageUpload(false);
                    return [3 /*break*/, 5];
                case 3:
                    error_1 = _b.sent();
                    setImageUpload(false);
                    react_toastify_1.toast.error("Failed to upload image. Please try again.", {
                        position: "top-right",
                        autoClose: 3000
                    });
                    event.target.value = "";
                    return [3 /*break*/, 5];
                case 4:
                    // setLoading(false);
                    console.log("hi");
                    return [7 /*endfinally*/];
                case 5: return [3 /*break*/, 7];
                case 6:
                    react_toastify_1.toast.error("Please upload image file only.", {
                        position: "top-right",
                        autoClose: 3000
                    });
                    event.target.value = "";
                    _b.label = 7;
                case 7: return [2 /*return*/];
            }
        });
    }); };
    var removeLogo = function () {
        setFormData(function (prev) { return (__assign(__assign({}, prev), { avatarUrl: "" })); });
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };
    var handleDateRangeFilter = function (ranges) {
        if (ranges === void 0) { ranges = { start: "", end: "" }; }
        try {
            if (ranges.start && ranges.end) {
                applyFilters({ startDate: ranges.start, endDate: ranges.end });
            }
            else {
                applyFilters({ startDate: "", endDate: "" });
            }
        }
        catch (error) {
            console.error("Error handling time range selection:", error);
        }
    };
    // Handle date change
    var handleDateChange = function (date) {
        setFormData(function (prev) { return (__assign(__assign({}, prev), { dateOfJoining: date })); });
    };
    // Handle select dropdown changes
    var handleSelectChange = function (field, value) {
        setFormData(function (prev) {
            var _a;
            return (__assign(__assign({}, prev), (_a = {}, _a[field] = value, _a)));
        });
    };
    // Toggle password visibility
    var togglePasswordVisibility = function (field) {
        setPasswordVisibility(function (prev) {
            var _a;
            return (__assign(__assign({}, prev), (_a = {}, _a[field] = !prev[field], _a)));
        });
    };
    var handleSort = function (order) {
        setSortOrder(order);
        if (!order) {
            setSortedEmployee(employees);
            return;
        }
        var sortedData = __spreadArrays(employees).sort(function (a, b) {
            console.log("from sorted data", employees);
            var nameA = a.firstName.toLowerCase() || "a";
            var nameB = b.firstName.toLowerCase() || "b";
            if (order === "ascending") {
                return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
            }
            if (order === "descending") {
                return nameA > nameB ? -1 : nameA < nameB ? 1 : 0;
            }
            return 0;
        });
        setSortedEmployee(sortedData); // may not need this later
        setEmployees(sortedData);
    };
    var deleteEmployee = function (id) {
        try {
            setLoading(true);
            setError(null);
            if (!socket) {
                setError("Socket connection is not available");
                setLoading(false);
                return;
            }
            if (!id) {
                setError("Employee ID is required");
                setLoading(false);
                return;
            }
            socket.emit("hrm/employees/delete", { _id: id });
        }
        catch (error) {
            console.error("Delete error:", error);
            setError("Failed to initiate policy deletion");
            setLoading(false);
        }
    };
    // ======================
    // PERMISSIONS HANDLERS
    // ======================
    // Constant array matching PermissionModule union type exactly
    var MODULES = [
        "holidays",
        "leaves",
        "clients",
        "projects",
        "tasks",
        "chats",
        "assets",
        "timingSheets",
    ];
    // Constant array for actions, matching PermissionSet keys exactly
    var ACTIONS = [
        "read",
        "write",
        "create",
        "delete",
        "import",
        "export",
    ];
    // Toggle individual permission (single action in a module)
    var handlePermissionChange = function (module, action, checked) {
        setPermissions(function (prev) {
            var _a, _b, _c;
            var updatedModulePermissions = __assign(__assign({}, prev.permissions[module]), (_a = {}, _a[action] = checked, _a));
            // Check if all actions selected for this module
            var allSelected = ACTIONS.every(function (act) { return updatedModulePermissions[act]; });
            return __assign(__assign({}, prev), { permissions: __assign(__assign({}, prev.permissions), (_b = {}, _b[module] = updatedModulePermissions, _b)), selectAll: __assign(__assign({}, prev.selectAll), (_c = {}, _c[module] = allSelected, _c)) });
        });
    };
    // Toggle enable/disable a module
    var toggleModule = function (module) {
        setPermissions(function (prev) {
            var _a;
            return (__assign(__assign({}, prev), { enabledModules: __assign(__assign({}, prev.enabledModules), (_a = {}, _a[module] = !prev.enabledModules[module], _a)) }));
        });
    };
    // Toggle "Select All" for a specific module (all permissions checked or unchecked)
    var toggleSelectAllForModule = function (module) {
        setPermissions(function (prev) {
            var _a, _b;
            var newSelectAllState = !prev.selectAll[module];
            // Build a new permission set with all actions set to newSelectAllState
            var newPermissionsForModule = ACTIONS.reduce(function (acc, action) {
                acc[action] = newSelectAllState;
                return acc;
            }, {});
            return __assign(__assign({}, prev), { permissions: __assign(__assign({}, prev.permissions), (_a = {}, _a[module] = newPermissionsForModule, _a)), selectAll: __assign(__assign({}, prev.selectAll), (_b = {}, _b[module] = newSelectAllState, _b)) });
        });
    };
    // Toggle "Enable All Modules" master switch
    var toggleAllModules = function (enable) {
        setPermissions(function (prev) {
            var newEnabledModules = MODULES.reduce(function (acc, module) {
                acc[module] = enable;
                return acc;
            }, {});
            return __assign(__assign({}, prev), { enabledModules: newEnabledModules });
        });
    };
    // Toggle "Select All" permissions globally (all modules & all actions)
    var toggleGlobalSelectAll = function (checked) {
        setPermissions(function (prev) {
            // Build new permissions for every module & action
            var newPermissions = MODULES.reduce(function (accModules, module) {
                var newModulePermissions = ACTIONS.reduce(function (accActions, action) {
                    accActions[action] = checked;
                    return accActions;
                }, {});
                accModules[module] = newModulePermissions;
                return accModules;
            }, {});
            // Build new selectAll flags for every module
            var newSelectAll = MODULES.reduce(function (acc, module) {
                acc[module] = checked;
                return acc;
            }, {});
            return __assign(__assign({}, prev), { permissions: newPermissions, selectAll: newSelectAll });
        });
    };
    // ======================
    // FORM SUBMISSION
    // ======================
    // Parse backend error message and map to field name
    var parseBackendError = function (errorMessage) {
        var errorMap = {
            "Field 'about' must be a non-empty string": { field: "about", message: "About is required" },
            "Field 'about' must be a string if provided": { field: "about", message: "About must be text" },
            "Field 'departmentId' must be a non-empty string": { field: "departmentId", message: "Please select a department" },
            "Field 'designationId' must be a non-empty string": { field: "designationId", message: "Please select a designation" },
            "Field 'employeeId' must be a non-empty string": { field: "employeeId", message: "Employee ID is required" },
            "Field 'firstName' must be a non-empty string": { field: "firstName", message: "First name is required" },
            "Field 'lastName' must be a non-empty string": { field: "lastName", message: "Last name is required" },
            "Missing required field: account": { field: "general", message: "Account information is required" },
            "Field 'account.userName' must be a non-empty string": { field: "userName", message: "Username is required" },
            "Field 'account.password' must be a non-empty string": { field: "password", message: "Password is required" },
            "Missing required field: contact": { field: "general", message: "Contact information is required" },
            "Field 'contact.email' must be a non-empty string": { field: "email", message: "Email is required" },
            "Field 'contact.phone' must be a non-empty string": { field: "phone", message: "Phone is required" },
            "Missing required field: dateOfJoining": { field: "dateOfJoining", message: "Joining date is required" },
            "dateOfJoining must be a string, Date object, or valid date wrapper": { field: "dateOfJoining", message: "Invalid joining date" },
            "Email already registered": { field: "email", message: "This email is already registered" },
            "Username already exists": { field: "userName", message: "This username is already taken" },
            "Phone number already registered": { field: "phone", message: "This phone number is already registered" },
            "Employee email or phone number already exists.": { field: "email", message: "Email or phone already exists" },
            "Employee with same details already exists": { field: "general", message: "Employee with same details already exists" },
            "Failed to add employee": { field: "general", message: "Failed to add employee. Please try again." }
        };
        // Direct match
        if (errorMap[errorMessage]) {
            return errorMap[errorMessage];
        }
        // Pattern matching for field errors
        var fieldMatch = errorMessage.match(/Field '(.+?)' must be/);
        if (fieldMatch) {
            var fieldPath = fieldMatch[1];
            // Extract last part of nested field (e.g., 'account.userName' -> 'userName')
            var fieldName = fieldPath.includes('.') ? fieldPath.split('.').pop() : fieldPath;
            return { field: fieldName, message: errorMessage };
        }
        // Pattern matching for missing fields
        var missingMatch = errorMessage.match(/Missing required field: (.+)/);
        if (missingMatch) {
            var fieldPath = missingMatch[1];
            var fieldName = fieldPath.includes('.') ? fieldPath.split('.').pop() : fieldPath;
            return { field: fieldName, message: fieldName + " is required" };
        }
        return { field: "general", message: errorMessage };
    };
    // Validate a single field and return error message
    var validateField = function (fieldName, value) {
        switch (fieldName) {
            case "firstName":
                if (!value || !value.trim())
                    return "First name is required";
                break;
            case "lastName":
                if (!value || !value.trim())
                    return "Last name is required";
                break;
            case "email":
                if (!value || !value.trim())
                    return "Email is required";
                var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value))
                    return "Enter a valid email";
                break;
            case "userName":
                if (!value || !value.trim())
                    return "Username is required";
                break;
            case "password":
                if (!value || !value.trim())
                    return "Password is required";
                if (value.length < 6)
                    return "Password must be at least 6 characters";
                break;
            case "confirmPassword":
                if (!value || !value.trim())
                    return "Confirm password is required";
                if (formData.account.password !== value)
                    return "Passwords don't match";
                break;
            case "phone":
                if (!value || !value.trim())
                    return "Phone number is required";
                if (!/^\d{10,15}$/.test(value.replace(/[\s\-\(\)]/g, '')))
                    return "Enter a valid phone number";
                break;
            case "gender":
                if (!value)
                    return "Gender is required";
                break;
            case "birthday":
                if (!value)
                    return "Birthday is required";
                break;
            case "dateOfJoining":
                if (!value)
                    return "Joining date is required";
                break;
        }
        return "";
    };
    // Validate a field on blur
    var handleFieldBlur = function (fieldName, value) {
        var error = validateField(fieldName, value);
        setFieldErrors(function (prev) {
            var _a;
            return (__assign(__assign({}, prev), (_a = {}, _a[fieldName] = error, _a)));
        });
    };
    // Clear field error when user starts typing
    var clearFieldError = function (fieldName) {
        setFieldErrors(function (prev) {
            var newErrors = __assign({}, prev);
            delete newErrors[fieldName];
            return newErrors;
        });
    };
    // Validate form before submission - matches backend validation
    var validateForm = function () {
        var errors = {};
        // Required fields (must match backend requiredStringFields)
        if (!formData.firstName || !formData.firstName.trim()) {
            errors.firstName = "First name is required";
        }
        if (!formData.lastName || !formData.lastName.trim()) {
            errors.lastName = "Last name is required";
        }
        if (!formData.departmentId || !formData.departmentId.trim()) {
            errors.departmentId = "Department is required";
        }
        if (!formData.designationId || !formData.designationId.trim()) {
            errors.designationId = "Designation is required";
        }
        // Account fields (required by backend)
        if (!formData.account.userName || !formData.account.userName.trim()) {
            errors.userName = "Username is required";
        }
        if (!formData.account.password || !formData.account.password.trim()) {
            errors.password = "Password is required";
        }
        else if (formData.account.password.length < 6) {
            errors.password = "Password must be at least 6 characters";
        }
        if (!confirmPassword || !confirmPassword.trim()) {
            errors.confirmPassword = "Confirm password is required";
        }
        else if (formData.account.password !== confirmPassword) {
            errors.confirmPassword = "Passwords don't match";
        }
        // Contact fields (required by backend)
        if (!formData.contact.email || !formData.contact.email.trim()) {
            errors.email = "Email is required";
        }
        else {
            var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.contact.email)) {
                errors.email = "Enter a valid email";
            }
        }
        if (!formData.contact.phone || !formData.contact.phone.trim()) {
            errors.phone = "Phone number is required";
        }
        else if (!/^\d{10,15}$/.test(formData.contact.phone.replace(/[\s\-\(\)]/g, ''))) {
            errors.phone = "Enter a valid phone number";
        }
        // Date of joining (required by backend)
        if (!formData.dateOfJoining) {
            errors.dateOfJoining = "Joining date is required";
        }
        // Optional frontend validations (nice to have but not backend required)
        // Gender and Birthday are optional in backend but good UX to require
        // Set errors in state
        setFieldErrors(errors);
        // If there are errors, scroll to first error field
        if (Object.keys(errors).length > 0) {
            setActiveTab("basic-info");
            // Scroll to first error field after a short delay to allow tab switch
            setTimeout(function () {
                var _a, _b;
                var firstErrorField = Object.keys(errors)[0];
                var errorElement = document.querySelector("[name=\"" + firstErrorField + "\"]") ||
                    document.querySelector("#" + firstErrorField) ||
                    document.querySelector(".field-" + firstErrorField);
                if (errorElement) {
                    errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    (_b = (_a = errorElement).focus) === null || _b === void 0 ? void 0 : _b.call(_a);
                }
            }, 100);
            return false;
        }
        return true;
    };
    // Handle form submission (final save - validation already done in handleNext)
    var handleSubmit = function (e) { return __awaiter(void 0, void 0, void 0, function () {
        var employeeId, avatarUrl, firstName, lastName, dateOfJoining, _a, email, phone, _b, userName, password, personal, companyName, departmentId, designationId, about, status, basicInfo, submissionData;
        var _c, _d, _e, _f, _g;
        return __generator(this, function (_h) {
            console.log("Submitting form and permissions");
            e.preventDefault();
            try {
                setError(null);
                setLoading(true);
                employeeId = formData.employeeId, avatarUrl = formData.avatarUrl, firstName = formData.firstName, lastName = formData.lastName, dateOfJoining = formData.dateOfJoining, _a = formData.contact, email = _a.email, phone = _a.phone, _b = formData.account, userName = _b.userName, password = _b.password, personal = formData.personal, companyName = formData.companyName, departmentId = formData.departmentId, designationId = formData.designationId, about = formData.about, status = formData.status;
                basicInfo = {
                    employeeId: employeeId,
                    avatarUrl: avatarUrl,
                    firstName: firstName,
                    lastName: lastName,
                    dateOfJoining: dateOfJoining,
                    account: { userName: userName, password: password },
                    contact: { email: email, phone: phone },
                    personal: {
                        gender: (personal === null || personal === void 0 ? void 0 : personal.gender) || "",
                        birthday: (personal === null || personal === void 0 ? void 0 : personal.birthday) || null,
                        address: {
                            street: ((_c = personal === null || personal === void 0 ? void 0 : personal.address) === null || _c === void 0 ? void 0 : _c.street) || "",
                            city: ((_d = personal === null || personal === void 0 ? void 0 : personal.address) === null || _d === void 0 ? void 0 : _d.city) || "",
                            state: ((_e = personal === null || personal === void 0 ? void 0 : personal.address) === null || _e === void 0 ? void 0 : _e.state) || "",
                            postalCode: ((_f = personal === null || personal === void 0 ? void 0 : personal.address) === null || _f === void 0 ? void 0 : _f.postalCode) || "",
                            country: ((_g = personal === null || personal === void 0 ? void 0 : personal.address) === null || _g === void 0 ? void 0 : _g.country) || ""
                        }
                    },
                    companyName: companyName,
                    departmentId: departmentId,
                    designationId: designationId,
                    about: about,
                    status: status
                };
                submissionData = {
                    employeeData: basicInfo,
                    permissionsData: {
                        permissions: permissions.permissions,
                        enabledModules: permissions.enabledModules
                    }
                };
                console.log("Full Submission Data:", submissionData);
                if (!socket) {
                    console.log("Socket connection is not available");
                    setError("Socket connection is not available.");
                    setLoading(false);
                    return [2 /*return*/];
                }
                // Directly save - validation already done in handleNext
                socket.emit("hrm/employees/add", submissionData);
            }
            catch (error) {
                console.error("Error submitting form and permissions:", error);
                setError("An error occurred while submitting data.");
                setLoading(false);
            }
            return [2 /*return*/];
        });
    }); };
    // 1. Update basic info
    var handleUpdateSubmit = function (e) {
        var _a, _b, _c, _d, _e, _f;
        e.preventDefault();
        if (!editingEmployee) {
            react_toastify_1.toast.error("No employee selected for editing.");
            return;
        }
        // Lifecycle statuses that should only be set through HR workflows
        var lifecycleStatuses = ["Terminated", "Resigned", "On Notice"];
        var currentStatus = normalizeStatus(editingEmployee.status);
        var payload = {
            employeeId: editingEmployee.employeeId || "",
            firstName: editingEmployee.firstName || "",
            lastName: editingEmployee.lastName || "",
            account: {
                userName: ((_a = editingEmployee.account) === null || _a === void 0 ? void 0 : _a.userName) || ""
            },
            contact: {
                email: ((_b = editingEmployee.contact) === null || _b === void 0 ? void 0 : _b.email) || "",
                phone: ((_c = editingEmployee.contact) === null || _c === void 0 ? void 0 : _c.phone) || ""
            },
            personal: {
                gender: ((_d = editingEmployee.personal) === null || _d === void 0 ? void 0 : _d.gender) || "",
                birthday: ((_e = editingEmployee.personal) === null || _e === void 0 ? void 0 : _e.birthday) || null,
                address: ((_f = editingEmployee.personal) === null || _f === void 0 ? void 0 : _f.address) || {
                    street: "",
                    city: "",
                    state: "",
                    postalCode: "",
                    country: ""
                }
            },
            companyName: editingEmployee.companyName || "",
            departmentId: editingEmployee.departmentId || "",
            designationId: editingEmployee.designationId || "",
            dateOfJoining: editingEmployee.dateOfJoining || null,
            about: editingEmployee.about || "",
            avatarUrl: editingEmployee.avatarUrl || ""
        };
        // Only include status if it's NOT a lifecycle status
        // Lifecycle statuses should only be set through termination/resignation workflows
        if (!lifecycleStatuses.includes(currentStatus)) {
            payload.status = currentStatus;
        }
        console.log("update payload", payload);
        if (socket) {
            socket.emit("hrm/employees/update", payload);
            // Success toast will be shown in handleUpdateEmployeeResponse when backend confirms update
        }
        else {
            react_toastify_1.toast.error("Socket connection is not available.", {
                position: "top-right",
                autoClose: 3000
            });
        }
    };
    // 2. Update permissions
    var handlePermissionUpdateSubmit = function (e) {
        e.preventDefault();
        if (!editingEmployee) {
            console.log("****he**-**");
            react_toastify_1.toast.error("No employee selected for editing.");
            return;
        }
        var payload = {
            employeeId: editingEmployee._id,
            permissions: permissions.permissions,
            enabledModules: permissions.enabledModules
        };
        console.log("edit perm payload", payload);
        if (socket) {
            socket.emit("hrm/employees/update-permissions", payload);
            // toast.success("Employee permissions update request sent.");
            setPermissions(initialState);
        }
        else {
            console.log(error);
            return;
            // toast.error("Socket connection is not available.");
        }
    };
    console.log("editing employee", editingEmployee);
    var handleResetFormData = function () {
        setFormData({
            employeeId: generateId("EMP"),
            avatarUrl: "",
            firstName: "",
            lastName: "",
            dateOfJoining: "",
            contact: {
                email: "",
                phone: ""
            },
            account: {
                userName: "",
                password: ""
            },
            personal: {
                gender: "",
                birthday: "",
                address: {
                    street: "",
                    city: "",
                    state: "",
                    postalCode: "",
                    country: ""
                }
            },
            companyName: "",
            departmentId: "",
            designationId: "",
            about: "",
            status: "Active"
        });
        setPermissions(initialState);
        setError("");
        setFieldErrors({});
        setConfirmPassword("");
        setIsBasicInfoValidated(false);
    };
    // Helper function to safely prepare employee for editing
    var prepareEmployeeForEdit = function (emp) {
        return __assign(__assign({}, emp), { account: emp.account || { userName: "" }, contact: emp.contact || { email: "", phone: "" }, personal: emp.personal || {
                gender: "",
                birthday: null,
                address: {
                    street: "",
                    city: "",
                    state: "",
                    postalCode: "",
                    country: ""
                }
            }, firstName: emp.firstName || "", lastName: emp.lastName || "", companyName: emp.companyName || "", departmentId: emp.departmentId || "", designationId: emp.designationId || "", about: emp.about || "", avatarUrl: emp.avatarUrl || "", status: normalizeStatus(emp.status), dateOfJoining: emp.dateOfJoining || null });
    };
    // Modal container helper (for DatePicker positioning)
    var getModalContainer = function () {
        var modalElement = document.getElementById("modal-datepicker");
        return modalElement ? modalElement : document.body;
    };
    // Utility function to properly close modal and remove backdrop
    var closeModal = function () {
        // Remove all modal backdrops
        var backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(function (backdrop) { return backdrop.remove(); });
        // Remove modal-open class from body
        document.body.classList.remove('modal-open');
        // Reset body style
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    };
    // Handle "Save and Next" - validate with backend before going to permissions tab
    var handleNext = function (e) { return __awaiter(void 0, void 0, void 0, function () {
        var checkDuplicates, result, fieldName, errorMessage, errorInfo_2, error_2, errorMsg, errorMsg;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    e.preventDefault();
                    // Clear previous errors
                    setFieldErrors({});
                    setError(null);
                    // First run frontend validation (fast, synchronous)
                    if (!validateForm()) {
                        return [2 /*return*/];
                    }
                    // Check if socket is available
                    if (!socket) {
                        setFieldErrors({ general: "Connection unavailable. Please refresh the page." });
                        return [2 /*return*/];
                    }
                    // Show validating state
                    setIsValidating(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    checkDuplicates = new Promise(function (resolve, reject) {
                        var timeoutId = setTimeout(function () {
                            reject(new Error("timeout"));
                        }, 15000); // 15 second timeout
                        // Listen for duplicate check response
                        var responseHandler = function (response) {
                            console.log("=== FRONTEND: Received response from backend ===", response);
                            clearTimeout(timeoutId);
                            resolve(response);
                        };
                        socket.once("hrm/employees/check-duplicates-response", responseHandler);
                        // Emit duplicate check request
                        var requestData = {
                            email: formData.contact.email,
                            userName: formData.account.userName,
                            phone: formData.contact.phone
                        };
                        console.log("=== FRONTEND: Emitting check-duplicates ===", requestData);
                        socket.emit("hrm/employees/check-duplicates", requestData);
                    });
                    return [4 /*yield*/, checkDuplicates];
                case 2:
                    result = _a.sent();
                    setIsValidating(false);
                    console.log("Check duplicates result:", result);
                    if (!result.done) {
                        fieldName = result.field || "general";
                        errorMessage = result.error || "Validation failed";
                        console.log("Setting field error:", fieldName, errorMessage);
                        errorInfo_2 = parseBackendError(errorMessage);
                        if (errorInfo_2 && errorInfo_2.field !== "general") {
                            // Set error for specific field
                            setFieldErrors(function (prev) {
                                var _a;
                                return (__assign(__assign({}, prev), (_a = {}, _a[errorInfo_2.field] = errorInfo_2.message, _a)));
                            });
                            // Also show toast as backup
                            react_toastify_1.toast.error(errorInfo_2.message, {
                                position: "top-right",
                                autoClose: 5000
                            });
                            // Scroll to error field
                            setTimeout(function () {
                                var _a, _b;
                                var errorElement = document.querySelector("[name=\"" + errorInfo_2.field + "\"]") ||
                                    document.querySelector("#" + errorInfo_2.field) ||
                                    document.querySelector('.is-invalid');
                                if (errorElement) {
                                    errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    (_b = (_a = errorElement).focus) === null || _b === void 0 ? void 0 : _b.call(_a);
                                }
                            }, 100);
                        }
                        else {
                            // General error
                            setFieldErrors({ general: errorMessage });
                            react_toastify_1.toast.error(errorMessage, {
                                position: "top-right",
                                autoClose: 5000
                            });
                        }
                        return [2 /*return*/]; // Don't proceed to next tab
                    }
                    // All validation passed - mark as validated and proceed to permissions tab
                    setIsBasicInfoValidated(true);
                    setActiveTab("address");
                    return [3 /*break*/, 4];
                case 3:
                    error_2 = _a.sent();
                    console.error("Validation error:", error_2);
                    setIsValidating(false);
                    if (error_2.message === "timeout") {
                        errorMsg = "Validation is taking longer than expected. Please check your connection and try again.";
                        setFieldErrors({ general: errorMsg });
                        react_toastify_1.toast.error(errorMsg, {
                            position: "top-right",
                            autoClose: 5000
                        });
                    }
                    else {
                        errorMsg = "Unable to validate. Please try again.";
                        setFieldErrors({ general: errorMsg });
                        react_toastify_1.toast.error(errorMsg, {
                            position: "top-right",
                            autoClose: 5000
                        });
                    }
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var allPermissionsSelected = function () {
        return MODULES.every(function (module) {
            return ACTIONS.every(function (action) { return permissions.permissions[module][action]; });
        });
    };
    // incase of error (done:false)
    if (loading) {
        return (react_1["default"].createElement("div", { className: "page-wrapper" },
            react_1["default"].createElement("div", { className: "content" },
                react_1["default"].createElement("div", { className: "d-flex justify-content-center align-items-center", style: { height: "400px" } },
                    react_1["default"].createElement("div", { className: "spinner-border text-primary", role: "status" },
                        react_1["default"].createElement("span", { className: "visually-hidden" }, "Loading..."))))));
    }
    if (error && error !== "null") {
        return (react_1["default"].createElement("div", { className: "page-wrapper" },
            react_1["default"].createElement("div", { className: "content" },
                react_1["default"].createElement("div", { className: "alert alert-danger", role: "alert" },
                    react_1["default"].createElement("h4", { className: "alert-heading" }, "Error!"),
                    react_1["default"].createElement("p", null, error)))));
    }
    return (react_1["default"].createElement(react_1["default"].Fragment, null,
        react_1["default"].createElement("style", null, "\n        .nav-link.disabled {\n          opacity: 0.5;\n          cursor: not-allowed !important;\n          pointer-events: all !important;\n        }\n        .nav-link.disabled:hover {\n          background-color: transparent !important;\n        }\n      "),
        react_1["default"].createElement("div", { className: "page-wrapper" },
            react_1["default"].createElement("div", { className: "content" },
                react_1["default"].createElement("div", { className: "d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3" },
                    react_1["default"].createElement("div", { className: "my-auto mb-2" },
                        react_1["default"].createElement("h2", { className: "mb-1" }, "Employee"),
                        react_1["default"].createElement("nav", null,
                            react_1["default"].createElement("ol", { className: "breadcrumb mb-0" },
                                react_1["default"].createElement("li", { className: "breadcrumb-item" },
                                    react_1["default"].createElement(react_router_dom_1.Link, { to: all_routes_1.all_routes.adminDashboard },
                                        react_1["default"].createElement("i", { className: "ti ti-smart-home" }))),
                                react_1["default"].createElement("li", { className: "breadcrumb-item" }, "Employee")))),
                    react_1["default"].createElement("div", { className: "d-flex my-xl-auto right-content align-items-center flex-wrap " },
                        react_1["default"].createElement("div", { className: "me-2 mb-2" },
                            react_1["default"].createElement("div", { className: "d-flex align-items-center border bg-white rounded p-1 me-2 icon-list" },
                                react_1["default"].createElement("button", { onClick: function () { return setViewMode("list"); }, className: "btn btn-icon btn-sm " + (viewMode === "list" ? "active bg-primary text-white" : "") + " me-1" },
                                    react_1["default"].createElement("i", { className: "ti ti-list-tree" })),
                                react_1["default"].createElement("button", { onClick: function () { return setViewMode("grid"); }, className: "btn btn-icon btn-sm " + (viewMode === "grid" ? "active bg-primary text-white" : "") },
                                    react_1["default"].createElement("i", { className: "ti ti-layout-grid" })))),
                        react_1["default"].createElement("div", { className: "me-2 mb-2" },
                            react_1["default"].createElement("div", { className: "dropdown" },
                                react_1["default"].createElement(react_router_dom_1.Link, { to: "#", className: "dropdown-toggle btn btn-white d-inline-flex align-items-center", "data-bs-toggle": "dropdown" },
                                    react_1["default"].createElement("i", { className: "ti ti-file-export me-1" }),
                                    "Export"),
                                react_1["default"].createElement("ul", { className: "dropdown-menu  dropdown-menu-end p-3" },
                                    react_1["default"].createElement("li", null,
                                        react_1["default"].createElement(react_router_dom_1.Link, { to: "#", className: "dropdown-item rounded-1" },
                                            react_1["default"].createElement("i", { className: "ti ti-file-type-pdf me-1" }),
                                            "Export as PDF")),
                                    react_1["default"].createElement("li", null,
                                        react_1["default"].createElement(react_router_dom_1.Link, { to: "#", className: "dropdown-item rounded-1" },
                                            react_1["default"].createElement("i", { className: "ti ti-file-type-xls me-1" }),
                                            "Export as Excel",
                                            " "))))),
                        react_1["default"].createElement("div", { className: "mb-2" },
                            react_1["default"].createElement(react_router_dom_1.Link, { to: "#", "data-bs-toggle": "modal", "data-inert": true, "data-bs-target": "#add_employee", className: "btn btn-primary d-flex align-items-center", onClick: function () { return generateId("EMP"); } },
                                react_1["default"].createElement("i", { className: "ti ti-circle-plus me-2" }),
                                "Add Employee")),
                        react_1["default"].createElement("div", { className: "head-icons ms-2" },
                            react_1["default"].createElement(collapse_header_1["default"], null)))),
                react_1["default"].createElement("div", { className: "row" },
                    react_1["default"].createElement("div", { className: "col-lg-3 col-md-6 d-flex" },
                        react_1["default"].createElement("div", { className: "card flex-fill" },
                            react_1["default"].createElement("div", { className: "card-body d-flex align-items-center justify-content-between" },
                                react_1["default"].createElement("div", { className: "d-flex align-items-center overflow-hidden" },
                                    react_1["default"].createElement("div", null,
                                        react_1["default"].createElement("span", { className: "avatar avatar-lg bg-dark rounded-circle" },
                                            react_1["default"].createElement("i", { className: "ti ti-users" }))),
                                    react_1["default"].createElement("div", { className: "ms-2 overflow-hidden" },
                                        react_1["default"].createElement("p", { className: "fs-12 fw-medium mb-1 text-truncate" }, "Total Employee"),
                                        react_1["default"].createElement("h4", null, (stats === null || stats === void 0 ? void 0 : stats.totalEmployees) || 0)))))),
                    react_1["default"].createElement("div", { className: "col-lg-3 col-md-6 d-flex" },
                        react_1["default"].createElement("div", { className: "card flex-fill" },
                            react_1["default"].createElement("div", { className: "card-body d-flex align-items-center justify-content-between" },
                                react_1["default"].createElement("div", { className: "d-flex align-items-center overflow-hidden" },
                                    react_1["default"].createElement("div", null,
                                        react_1["default"].createElement("span", { className: "avatar avatar-lg bg-success rounded-circle" },
                                            react_1["default"].createElement("i", { className: "ti ti-user-share" }))),
                                    react_1["default"].createElement("div", { className: "ms-2 overflow-hidden" },
                                        react_1["default"].createElement("p", { className: "fs-12 fw-medium mb-1 text-truncate" }, "Active"),
                                        react_1["default"].createElement("h4", null, stats === null || stats === void 0 ? void 0 : stats.activeCount)))))),
                    react_1["default"].createElement("div", { className: "col-lg-3 col-md-6 d-flex" },
                        react_1["default"].createElement("div", { className: "card flex-fill" },
                            react_1["default"].createElement("div", { className: "card-body d-flex align-items-center justify-content-between" },
                                react_1["default"].createElement("div", { className: "d-flex align-items-center overflow-hidden" },
                                    react_1["default"].createElement("div", null,
                                        react_1["default"].createElement("span", { className: "avatar avatar-lg bg-danger rounded-circle" },
                                            react_1["default"].createElement("i", { className: "ti ti-user-pause" }))),
                                    react_1["default"].createElement("div", { className: "ms-2 overflow-hidden" },
                                        react_1["default"].createElement("p", { className: "fs-12 fw-medium mb-1 text-truncate" }, "Inactive"),
                                        react_1["default"].createElement("h4", null, stats === null || stats === void 0 ? void 0 : stats.inactiveCount)))))),
                    react_1["default"].createElement("div", { className: "col-lg-3 col-md-6 d-flex" },
                        react_1["default"].createElement("div", { className: "card flex-fill" },
                            react_1["default"].createElement("div", { className: "card-body d-flex align-items-center justify-content-between" },
                                react_1["default"].createElement("div", { className: "d-flex align-items-center overflow-hidden" },
                                    react_1["default"].createElement("div", null,
                                        react_1["default"].createElement("span", { className: "avatar avatar-lg bg-info rounded-circle" },
                                            react_1["default"].createElement("i", { className: "ti ti-user-plus" }))),
                                    react_1["default"].createElement("div", { className: "ms-2 overflow-hidden" },
                                        react_1["default"].createElement("p", { className: "fs-12 fw-medium mb-1 text-truncate" }, "New Joiners"),
                                        react_1["default"].createElement("h4", null, stats === null || stats === void 0 ? void 0 : stats.newJoinersCount))))))),
                react_1["default"].createElement("div", { className: "card" },
                    react_1["default"].createElement("div", { className: "card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3" },
                        react_1["default"].createElement("h5", null, "Employee"),
                        react_1["default"].createElement("div", { className: "d-flex my-xl-auto right-content align-items-center flex-wrap row-gap-3" },
                            react_1["default"].createElement("div", { className: "me-3" },
                                react_1["default"].createElement("div", { className: "input-icon-end position-relative" },
                                    react_1["default"].createElement(datePicker_1["default"], { onChange: handleDateRangeFilter }),
                                    react_1["default"].createElement("span", { className: "input-icon-addon" },
                                        react_1["default"].createElement("i", { className: "ti ti-chevron-down" })))),
                            react_1["default"].createElement("div", { className: "dropdown me-3" },
                                react_1["default"].createElement("a", { href: "#", className: "dropdown-toggle btn btn-white d-inline-flex align-items-center", "data-bs-toggle": "dropdown", role: "button", "aria-expanded": "false" },
                                    "Department",
                                    selectedDepartment
                                        ? ": " + (((_a = department.find(function (dep) { return dep.value === selectedDepartment; })) === null || _a === void 0 ? void 0 : _a.label) || "None")
                                        : ": None"),
                                react_1["default"].createElement("ul", { className: "dropdown-menu dropdown-menu-end p-3" }, department
                                    .filter(function (dep) { return dep.value; })
                                    .map(function (dep) { return (react_1["default"].createElement("li", { key: dep.value },
                                    react_1["default"].createElement(react_router_dom_1.Link, { to: "#", className: "dropdown-item rounded-1" + (selectedDepartment === dep.value ? " bg-primary text-white" : ""), onClick: function (e) {
                                            e.preventDefault();
                                            setSelectedDepartment(dep.value);
                                            onSelectDepartment(dep.value);
                                        } }, dep.label))); }))),
                            react_1["default"].createElement("div", { className: "dropdown me-3" },
                                react_1["default"].createElement("a", { href: "#", className: "dropdown-toggle btn btn-white d-inline-flex align-items-center", "data-bs-toggle": "dropdown" },
                                    "Select status",
                                    " ",
                                    selectedStatus
                                        ? ": " + (selectedStatus.charAt(0).toUpperCase() +
                                            selectedStatus.slice(1))
                                        : ": None"),
                                react_1["default"].createElement("ul", { className: "dropdown-menu  dropdown-menu-end p-3" },
                                    react_1["default"].createElement("li", null,
                                        react_1["default"].createElement(react_router_dom_1.Link, { to: "#", className: "dropdown-item rounded-1", onClick: function () { return onSelectStatus("all"); } }, "All")),
                                    react_1["default"].createElement("li", null,
                                        react_1["default"].createElement(react_router_dom_1.Link, { to: "#", className: "dropdown-item rounded-1", onClick: function () { return onSelectStatus("Active"); } }, "Active")),
                                    react_1["default"].createElement("li", null,
                                        react_1["default"].createElement(react_router_dom_1.Link, { to: "#", className: "dropdown-item rounded-1", onClick: function () { return onSelectStatus("Inactive"); } }, "Inactive")))),
                            react_1["default"].createElement("div", { className: "dropdown me-3" },
                                react_1["default"].createElement("a", { href: "#", className: "dropdown-toggle btn btn-white d-inline-flex align-items-center", "data-bs-toggle": "dropdown" },
                                    "Sort By",
                                    sortOrder
                                        ? ": " + (sortOrder.charAt(0).toUpperCase() + sortOrder.slice(1))
                                        : ": None"),
                                react_1["default"].createElement("ul", { className: "dropdown-menu dropdown-menu-end p-3" },
                                    react_1["default"].createElement("li", null,
                                        react_1["default"].createElement("button", { type: "button", className: "dropdown-item rounded-1", onClick: function () { return handleSort("ascending"); } }, "Ascending")),
                                    react_1["default"].createElement("li", null,
                                        react_1["default"].createElement("button", { type: "button", className: "dropdown-item rounded-1", onClick: function () { return handleSort("descending"); } }, "Descending")),
                                    react_1["default"].createElement("li", null,
                                        react_1["default"].createElement("button", { type: "button", className: "dropdown-item rounded-1", onClick: function () { return handleSort(""); } }, "None")))),
                            react_1["default"].createElement("button", { type: "button", className: "btn btn-light d-inline-flex align-items-center", onClick: clearAllFilters, title: "Clear all filters" },
                                react_1["default"].createElement("i", { className: "ti ti-filter-off me-1" }),
                                "Clear Filters"))),
                    viewMode === "list" ? (
                    // LIST VIEW
                    react_1["default"].createElement("div", { className: "card-body p-0" },
                        react_1["default"].createElement(index_1["default"], { dataSource: employees, columns: columns, Selection: true }))) : (
                    // GRID VIEW
                    react_1["default"].createElement("div", { className: "card-body p-0" },
                        react_1["default"].createElement("div", { className: "row mt-4" }, employees.length === 0 ? (react_1["default"].createElement("p", { className: "text-center" }, "No employees found")) : (employees.map(function (emp) {
                            var _a;
                            var _id = emp._id, firstName = emp.firstName, lastName = emp.lastName, role = emp.role, employeeId = emp.employeeId, contact = emp.contact, departmentId = emp.departmentId, status = emp.status, avatarUrl = emp.avatarUrl;
                            var fullName = ((firstName || "") + " " + (lastName || "")).trim() ||
                                "Unknown Name";
                            return (react_1["default"].createElement("div", { key: _id, className: "col-xl-3 col-lg-4 col-md-6 mb-4" },
                                react_1["default"].createElement("div", { className: "card" },
                                    react_1["default"].createElement("div", { className: "card-body" },
                                        react_1["default"].createElement("div", { className: "d-flex justify-content-between align-items-start mb-2" },
                                            react_1["default"].createElement("div", { className: "form-check form-check-md" },
                                                react_1["default"].createElement("input", { className: "form-check-input", type: "checkbox" })),
                                            react_1["default"].createElement("div", null,
                                                react_1["default"].createElement(react_router_dom_1.Link, { to: all_routes_1.all_routes.employeedetails + "/" + _id, className: "avatar avatar-xl avatar-rounded border p-1 border-primary rounded-circle " + (emp.status === "Active"
                                                        ? "online"
                                                        : "offline" // or "inactive"
                                                    ) },
                                                    react_1["default"].createElement("img", { src: avatarUrl || "assets/img/users/user-32.jpg", className: "img-fluid", alt: fullName }))),
                                            react_1["default"].createElement("div", { className: "dropdown" },
                                                react_1["default"].createElement("button", { className: "btn btn-icon btn-sm rounded-circle bg-primary text-white", type: "button", "data-bs-toggle": "dropdown", "aria-expanded": "false" },
                                                    react_1["default"].createElement("i", { className: "ti ti-dots-vertical" })),
                                                react_1["default"].createElement("ul", { className: "dropdown-menu dropdown-menu-end p-3" },
                                                    react_1["default"].createElement("li", null,
                                                        react_1["default"].createElement(react_router_dom_1.Link, { className: "dropdown-item rounded-1", to: "#", "data-bs-toggle": "modal", "data-inert": true, "data-bs-target": "#edit_employee", onClick: function () {
                                                                var preparedEmployee = prepareEmployeeForEdit(emp);
                                                                setEditingEmployee(preparedEmployee);
                                                                // Load permissions for editing
                                                                if (emp.permissions && emp.enabledModules) {
                                                                    setPermissions({
                                                                        permissions: emp.permissions,
                                                                        enabledModules: emp.enabledModules,
                                                                        selectAll: Object.keys(emp.enabledModules).reduce(function (acc, key) {
                                                                            acc[key] = false;
                                                                            return acc;
                                                                        }, {})
                                                                    });
                                                                }
                                                                // Load department and designation
                                                                if (emp.departmentId) {
                                                                    setSelectedDepartment(emp.departmentId);
                                                                    if (socket) {
                                                                        socket.emit("hrm/designations/get", {
                                                                            departmentId: emp.departmentId
                                                                        });
                                                                    }
                                                                }
                                                                if (emp.designationId) {
                                                                    setSelectedDesignation(emp.designationId);
                                                                }
                                                            } },
                                                            react_1["default"].createElement("i", { className: "ti ti-edit me-1" }),
                                                            " Edit")),
                                                    react_1["default"].createElement("li", null,
                                                        react_1["default"].createElement(react_router_dom_1.Link, { className: "dropdown-item rounded-1", to: "#", "data-bs-toggle": "modal", "data-inert": true, "data-bs-target": "#delete_modal", onClick: function () { return setEmployeeToDelete(emp); } },
                                                            react_1["default"].createElement("i", { className: "ti ti-trash me-1" }),
                                                            " Delete"))))),
                                        react_1["default"].createElement("div", { className: "text-center mb-3" },
                                            react_1["default"].createElement("h6", { className: "mb-1" },
                                                react_1["default"].createElement(react_router_dom_1.Link, { to: "/employees/" + emp._id }, fullName)),
                                            react_1["default"].createElement("span", { className: "badge bg-pink-transparent fs-10 fw-medium" }, role || "employee")),
                                        react_1["default"].createElement("div", { className: "mb-3" },
                                            react_1["default"].createElement("div", { className: "d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom" },
                                                react_1["default"].createElement("span", { className: "text-muted fs-12" }, "Emp ID"),
                                                react_1["default"].createElement("span", { className: "fw-medium fs-13" }, employeeId || "-")),
                                            react_1["default"].createElement("div", { className: "d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom" },
                                                react_1["default"].createElement("span", { className: "text-muted fs-12" }, "Email"),
                                                react_1["default"].createElement("span", { className: "fw-medium fs-13 text-truncate", style: { maxWidth: "150px" }, title: (contact === null || contact === void 0 ? void 0 : contact.email) || "-" }, (contact === null || contact === void 0 ? void 0 : contact.email) || "-")),
                                            react_1["default"].createElement("div", { className: "d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom" },
                                                react_1["default"].createElement("span", { className: "text-muted fs-12" }, "Phone"),
                                                react_1["default"].createElement("span", { className: "fw-medium fs-13" }, (contact === null || contact === void 0 ? void 0 : contact.phone) || "-")),
                                            react_1["default"].createElement("div", { className: "d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom" },
                                                react_1["default"].createElement("span", { className: "text-muted fs-12" }, "Department"),
                                                react_1["default"].createElement("span", { className: "fw-medium fs-13" }, ((_a = department.find(function (dep) { return dep.value === departmentId; })) === null || _a === void 0 ? void 0 : _a.label) || "-")),
                                            react_1["default"].createElement("div", { className: "d-flex justify-content-between align-items-center" },
                                                react_1["default"].createElement("span", { className: "text-muted fs-12" }, "Status"),
                                                react_1["default"].createElement("span", { className: "badge " + (status === "Active"
                                                        ? "badge-success"
                                                        : "badge-danger") + " d-inline-flex align-items-center badge-xs" },
                                                    react_1["default"].createElement("i", { className: "ti ti-point-filled me-1" }),
                                                    status)))))));
                        }))))))),
            react_1["default"].createElement(footer_1["default"], null)),
        react_1["default"].createElement(react_toastify_1.ToastContainer, null),
        react_1["default"].createElement("div", { className: "modal fade", id: "add_employee" },
            react_1["default"].createElement("div", { className: "modal-dialog modal-dialog-centered modal-lg" },
                react_1["default"].createElement("div", { className: "modal-content" },
                    react_1["default"].createElement("div", { className: "modal-header" },
                        react_1["default"].createElement("div", { className: "d-flex align-items-center" },
                            react_1["default"].createElement("h4", { className: "modal-title me-2" }, "Add New Employee"),
                            react_1["default"].createElement("span", null,
                                "Employee ID : ",
                                formData.employeeId)),
                        react_1["default"].createElement("button", { type: "button", className: "btn-close custom-btn-close", "data-bs-dismiss": "modal", "aria-label": "Close", onClick: function () {
                                handleResetFormData();
                                setActiveTab("basic-info");
                                setTimeout(function () { return closeModal(); }, 100);
                            } },
                            react_1["default"].createElement("i", { className: "ti ti-x" }))),
                    react_1["default"].createElement("button", { type: "button", ref: addEmployeeModalRef, "data-bs-dismiss": "modal", style: { display: "none" } }),
                    react_1["default"].createElement("form", { action: all_routes_1.all_routes.employeeList, onSubmit: handleSubmit },
                        react_1["default"].createElement("div", { className: "contact-grids-tab" },
                            react_1["default"].createElement("ul", { className: "nav nav-underline", id: "myTab", role: "tablist" },
                                react_1["default"].createElement("li", { className: "nav-item", role: "presentation" },
                                    react_1["default"].createElement("button", { id: "info-tab", "data-bs-toggle": "tab", "data-bs-target": "#basic-info", className: "nav-link " + (activeTab === "basic-info" ? "active" : ""), type: "button", role: "tab", "aria-selected": "true", onClick: function () { return setActiveTab("basic-info"); } }, "Basic Information")),
                                react_1["default"].createElement("li", { className: "nav-item", role: "presentation" },
                                    react_1["default"].createElement("button", { className: "nav-link " + (activeTab === "address" ? "active" : "") + " " + (!isBasicInfoValidated ? "disabled" : ""), onClick: function (e) {
                                            // Prevent access to permissions tab until basic info is validated
                                            if (!isBasicInfoValidated) {
                                                e.preventDefault();
                                                react_toastify_1.toast.info("Please complete and validate basic information first", {
                                                    position: "top-right",
                                                    autoClose: 3000
                                                });
                                                return;
                                            }
                                            // Check if basic info tab has any errors
                                            var basicInfoFields = ['firstName', 'lastName', 'email', 'userName', 'password', 'confirmPassword', 'phone', 'departmentId', 'designationId', 'dateOfJoining'];
                                            var hasBasicInfoErrors = basicInfoFields.some(function (field) { return fieldErrors[field]; });
                                            if (hasBasicInfoErrors) {
                                                e.preventDefault();
                                                // Scroll to first error field instead of toast
                                                setTimeout(function () {
                                                    var _a, _b;
                                                    var firstErrorField = basicInfoFields.find(function (field) { return fieldErrors[field]; });
                                                    if (firstErrorField) {
                                                        var errorElement = document.querySelector("[name=\"" + firstErrorField + "\"]") ||
                                                            document.querySelector("#" + firstErrorField) ||
                                                            document.querySelector('.is-invalid');
                                                        if (errorElement) {
                                                            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                            (_b = (_a = errorElement).focus) === null || _b === void 0 ? void 0 : _b.call(_a);
                                                        }
                                                    }
                                                }, 100);
                                                return;
                                            }
                                            setActiveTab("address");
                                        }, id: "address-tab", "data-bs-toggle": "tab", "data-bs-target": "#address", type: "button", role: "tab", "aria-selected": "false", disabled: !isBasicInfoValidated }, "Permissions")))),
                        react_1["default"].createElement("div", { className: "tab-content", id: "myTabContent" },
                            react_1["default"].createElement("div", { className: "tab-pane fade " + (activeTab === "basic-info" ? "show active" : ""), id: "basic-info", role: "tabpanel", "aria-labelledby": "info-tab", tabIndex: 0 },
                                react_1["default"].createElement("div", { className: "modal-body pb-0 " },
                                    fieldErrors.general && (react_1["default"].createElement("div", { className: "alert alert-danger mb-3", role: "alert" }, fieldErrors.general)),
                                    react_1["default"].createElement("div", { className: "row" },
                                        react_1["default"].createElement("div", { className: "col-md-12" },
                                            react_1["default"].createElement("div", { className: "d-flex align-items-center flex-wrap row-gap-3 bg-light w-100 rounded p-3 mb-4" },
                                                formData.avatarUrl ? (react_1["default"].createElement("img", { src: formData.avatarUrl, alt: "Profile", className: "avatar avatar-xxl rounded-circle border border-dashed me-2 flex-shrink-0" })) : (react_1["default"].createElement("div", { className: "d-flex align-items-center justify-content-center avatar avatar-xxl rounded-circle border border-dashed me-2 flex-shrink-0 text-dark frames" },
                                                    react_1["default"].createElement("i", { className: "ti ti-photo text-gray-2 fs-16" }))),
                                                react_1["default"].createElement("div", { className: "profile-upload" },
                                                    react_1["default"].createElement("div", { className: "mb-2" },
                                                        react_1["default"].createElement("h6", { className: "mb-1" }, "Upload Profile Image (Optional)"),
                                                        react_1["default"].createElement("p", { className: "fs-12" }, "Image should be below 4 mb")),
                                                    react_1["default"].createElement("div", { className: "profile-uploader d-flex align-items-center" },
                                                        react_1["default"].createElement("div", { className: "drag-upload-btn btn btn-sm btn-primary me-2" },
                                                            loading ? "Uploading..." : "Upload",
                                                            react_1["default"].createElement("input", { type: "file", className: "form-control image-sign", accept: ".png,.jpeg,.jpg,.ico", ref: fileInputRef, onChange: handleImageUpload, disabled: loading, style: {
                                                                    cursor: loading ? "not-allowed" : "pointer",
                                                                    opacity: 0,
                                                                    position: "absolute",
                                                                    top: 0,
                                                                    left: 0,
                                                                    width: "100%",
                                                                    height: "100%"
                                                                } })),
                                                        react_1["default"].createElement("button", { type: "button", className: "btn btn-light btn-sm", onClick: function () {
                                                                return setFormData(function (prev) { return (__assign(__assign({}, prev), { avatarUrl: "" })); });
                                                            }, disabled: loading }, "Cancel"))))),
                                        react_1["default"].createElement("div", { className: "col-md-6" },
                                            react_1["default"].createElement("div", { className: "mb-3" },
                                                react_1["default"].createElement("label", { className: "form-label" },
                                                    "First Name ",
                                                    react_1["default"].createElement("span", { className: "text-danger" }, " *")),
                                                react_1["default"].createElement("input", { type: "text", className: "form-control " + (fieldErrors.firstName ? 'is-invalid' : ''), name: "firstName", value: formData.firstName, onChange: handleChange, onFocus: function () { return clearFieldError('firstName'); }, onBlur: function (e) { return handleFieldBlur('firstName', e.target.value); } }),
                                                fieldErrors.firstName && (react_1["default"].createElement("div", { className: "invalid-feedback d-block" }, fieldErrors.firstName)))),
                                        react_1["default"].createElement("div", { className: "col-md-6" },
                                            react_1["default"].createElement("div", { className: "mb-3" },
                                                react_1["default"].createElement("label", { className: "form-label" },
                                                    "Last Name ",
                                                    react_1["default"].createElement("span", { className: "text-danger" }, " *")),
                                                react_1["default"].createElement("input", { type: "text", className: "form-control " + (fieldErrors.lastName ? 'is-invalid' : ''), name: "lastName", value: formData.lastName, onChange: handleChange, onFocus: function () { return clearFieldError('lastName'); }, onBlur: function (e) { return handleFieldBlur('lastName', e.target.value); } }),
                                                fieldErrors.lastName && (react_1["default"].createElement("div", { className: "invalid-feedback d-block" }, fieldErrors.lastName)))),
                                        react_1["default"].createElement("div", { className: "col-md-6" },
                                            react_1["default"].createElement("div", { className: "mb-3" },
                                                react_1["default"].createElement("label", { className: "form-label" },
                                                    "Employee ID ",
                                                    react_1["default"].createElement("span", { className: "text-danger" }, " *")),
                                                react_1["default"].createElement("input", { type: "text", className: "form-control", value: formData.employeeId, readOnly: true }))),
                                        react_1["default"].createElement("div", { className: "col-md-6" },
                                            react_1["default"].createElement("div", { className: "mb-3" },
                                                react_1["default"].createElement("label", { className: "form-label" },
                                                    "Joining Date ",
                                                    react_1["default"].createElement("span", { className: "text-danger" }, " *")),
                                                react_1["default"].createElement("div", { className: "input-icon-end position-relative" },
                                                    react_1["default"].createElement(antd_1.DatePicker, { className: "form-control datetimepicker " + (fieldErrors.dateOfJoining ? 'is-invalid' : ''), format: {
                                                            format: "DD-MM-YYYY",
                                                            type: "mask"
                                                        }, getPopupContainer: getModalContainer, placeholder: "DD-MM-YYYY", name: "dateOfJoining", value: formData.dateOfJoining, onFocus: function () { return clearFieldError('dateOfJoining'); }, onChange: function (date) {
                                                            handleDateChange(date);
                                                            handleFieldBlur('dateOfJoining', date);
                                                        } }),
                                                    react_1["default"].createElement("span", { className: "input-icon-addon" },
                                                        react_1["default"].createElement("i", { className: "ti ti-calendar text-gray-7" }))),
                                                fieldErrors.dateOfJoining && (react_1["default"].createElement("div", { className: "invalid-feedback d-block" }, fieldErrors.dateOfJoining)))),
                                        react_1["default"].createElement("div", { className: "col-md-6" },
                                            react_1["default"].createElement("div", { className: "mb-3" },
                                                react_1["default"].createElement("label", { className: "form-label" },
                                                    "Username ",
                                                    react_1["default"].createElement("span", { className: "text-danger" }, " *")),
                                                react_1["default"].createElement("input", { type: "text", className: "form-control " + (fieldErrors.userName ? 'is-invalid' : ''), name: "userName", value: formData.account.userName, onChange: handleChange, onFocus: function () { return clearFieldError('userName'); }, onBlur: function (e) { return handleFieldBlur('userName', e.target.value); } }),
                                                fieldErrors.userName && (react_1["default"].createElement("div", { className: "invalid-feedback d-block" }, fieldErrors.userName)))),
                                        react_1["default"].createElement("div", { className: "col-md-6" },
                                            react_1["default"].createElement("div", { className: "mb-3" },
                                                react_1["default"].createElement("label", { className: "form-label" },
                                                    "Email ",
                                                    react_1["default"].createElement("span", { className: "text-danger" }, " *")),
                                                react_1["default"].createElement("input", { type: "email", className: "form-control " + (fieldErrors.email ? 'is-invalid' : ''), name: "email", value: formData.contact.email, onChange: handleChange, onFocus: function () { return clearFieldError('email'); }, onBlur: function (e) { return handleFieldBlur('email', e.target.value); } }),
                                                fieldErrors.email && (react_1["default"].createElement("div", { className: "invalid-feedback d-block" }, fieldErrors.email)))),
                                        react_1["default"].createElement("div", { className: "col-md-6" },
                                            react_1["default"].createElement("div", { className: "mb-3" },
                                                react_1["default"].createElement("label", { className: "form-label" },
                                                    "Gender ",
                                                    react_1["default"].createElement("span", { className: "text-danger" }, " *")),
                                                react_1["default"].createElement("select", { className: "form-control " + (fieldErrors.gender ? 'is-invalid' : ''), name: "gender", value: ((_b = formData.personal) === null || _b === void 0 ? void 0 : _b.gender) || "", onFocus: function () { return clearFieldError('gender'); }, onChange: function (e) {
                                                        var value = e.target.value;
                                                        setFormData(function (prev) { return (__assign(__assign({}, prev), { personal: __assign(__assign({}, prev.personal), { gender: value }) })); });
                                                        handleFieldBlur('gender', value);
                                                    } },
                                                    react_1["default"].createElement("option", { value: "" }, "Select Gender"),
                                                    react_1["default"].createElement("option", { value: "male" }, "Male"),
                                                    react_1["default"].createElement("option", { value: "female" }, "Female"),
                                                    react_1["default"].createElement("option", { value: "other" }, "Other")),
                                                fieldErrors.gender && (react_1["default"].createElement("div", { className: "invalid-feedback d-block" }, fieldErrors.gender)))),
                                        react_1["default"].createElement("div", { className: "col-md-6" },
                                            react_1["default"].createElement("div", { className: "mb-3" },
                                                react_1["default"].createElement("label", { className: "form-label" },
                                                    "Birthday ",
                                                    react_1["default"].createElement("span", { className: "text-danger" }, " *")),
                                                react_1["default"].createElement("div", { className: "input-icon-end position-relative" },
                                                    react_1["default"].createElement(antd_1.DatePicker, { className: "form-control datetimepicker " + (fieldErrors.birthday ? 'is-invalid' : ''), format: "DD-MM-YYYY", getPopupContainer: getModalContainer, placeholder: "DD-MM-YYYY", name: "birthday", value: ((_c = formData.personal) === null || _c === void 0 ? void 0 : _c.birthday) ? dayjs_1["default"](formData.personal.birthday)
                                                            : null, onFocus: function () { return clearFieldError('birthday'); }, onChange: function (date) {
                                                            var isoDate = date ? date.toDate().toISOString() : null;
                                                            setFormData(function (prev) { return (__assign(__assign({}, prev), { personal: __assign(__assign({}, prev.personal), { birthday: isoDate }) })); });
                                                            handleFieldBlur('birthday', isoDate);
                                                        } }),
                                                    react_1["default"].createElement("span", { className: "input-icon-addon" },
                                                        react_1["default"].createElement("i", { className: "ti ti-calendar text-gray-7" }))),
                                                fieldErrors.birthday && (react_1["default"].createElement("div", { className: "invalid-feedback d-block" }, fieldErrors.birthday)))),
                                        react_1["default"].createElement("div", { className: "col-md-12" },
                                            react_1["default"].createElement("div", { className: "mb-3" },
                                                react_1["default"].createElement("label", { className: "form-label" }, "Address"),
                                                react_1["default"].createElement("input", { type: "text", className: "form-control", placeholder: "Street", name: "street", value: ((_e = (_d = formData.personal) === null || _d === void 0 ? void 0 : _d.address) === null || _e === void 0 ? void 0 : _e.street) || "", onChange: function (e) {
                                                        return setFormData(function (prev) {
                                                            var _a;
                                                            return (__assign(__assign({}, prev), { personal: __assign(__assign({}, prev.personal), { address: __assign(__assign({}, (_a = prev.personal) === null || _a === void 0 ? void 0 : _a.address), { street: e.target.value }) }) }));
                                                        });
                                                    } }),
                                                react_1["default"].createElement("div", { className: "row mt-3" },
                                                    react_1["default"].createElement("div", { className: "col-md-6" },
                                                        react_1["default"].createElement("input", { type: "text", className: "form-control", placeholder: "City", name: "city", value: ((_g = (_f = formData.personal) === null || _f === void 0 ? void 0 : _f.address) === null || _g === void 0 ? void 0 : _g.city) || "", onChange: function (e) {
                                                                return setFormData(function (prev) {
                                                                    var _a;
                                                                    return (__assign(__assign({}, prev), { personal: __assign(__assign({}, prev.personal), { address: __assign(__assign({}, (_a = prev.personal) === null || _a === void 0 ? void 0 : _a.address), { city: e.target.value }) }) }));
                                                                });
                                                            } })),
                                                    react_1["default"].createElement("div", { className: "col-md-6" },
                                                        react_1["default"].createElement("input", { type: "text", className: "form-control", placeholder: "State", name: "state", value: ((_j = (_h = formData.personal) === null || _h === void 0 ? void 0 : _h.address) === null || _j === void 0 ? void 0 : _j.state) || "", onChange: function (e) {
                                                                return setFormData(function (prev) {
                                                                    var _a;
                                                                    return (__assign(__assign({}, prev), { personal: __assign(__assign({}, prev.personal), { address: __assign(__assign({}, (_a = prev.personal) === null || _a === void 0 ? void 0 : _a.address), { state: e.target.value }) }) }));
                                                                });
                                                            } }))),
                                                react_1["default"].createElement("div", { className: "row mt-3" },
                                                    react_1["default"].createElement("div", { className: "col-md-6" },
                                                        react_1["default"].createElement("input", { type: "text", className: "form-control", placeholder: "Postal Code", name: "postalCode", value: ((_l = (_k = formData.personal) === null || _k === void 0 ? void 0 : _k.address) === null || _l === void 0 ? void 0 : _l.postalCode) || "", onChange: function (e) {
                                                                return setFormData(function (prev) {
                                                                    var _a;
                                                                    return (__assign(__assign({}, prev), { personal: __assign(__assign({}, prev.personal), { address: __assign(__assign({}, (_a = prev.personal) === null || _a === void 0 ? void 0 : _a.address), { postalCode: e.target.value }) }) }));
                                                                });
                                                            } })),
                                                    react_1["default"].createElement("div", { className: "col-md-6" },
                                                        react_1["default"].createElement("input", { type: "text", className: "form-control", placeholder: "Country", name: "country", value: ((_o = (_m = formData.personal) === null || _m === void 0 ? void 0 : _m.address) === null || _o === void 0 ? void 0 : _o.country) || "", onChange: function (e) {
                                                                return setFormData(function (prev) {
                                                                    var _a;
                                                                    return (__assign(__assign({}, prev), { personal: __assign(__assign({}, prev.personal), { address: __assign(__assign({}, (_a = prev.personal) === null || _a === void 0 ? void 0 : _a.address), { country: e.target.value }) }) }));
                                                                });
                                                            } }))))),
                                        react_1["default"].createElement("div", { className: "col-md-6" },
                                            react_1["default"].createElement("div", { className: "mb-3 " },
                                                react_1["default"].createElement("label", { className: "form-label" },
                                                    "Password ",
                                                    react_1["default"].createElement("span", { className: "text-danger" }, " *")),
                                                react_1["default"].createElement("div", { className: "pass-group" },
                                                    react_1["default"].createElement("input", { type: passwordVisibility.password
                                                            ? "text"
                                                            : "password", className: "pass-input form-control " + (fieldErrors.password ? 'is-invalid' : ''), name: "password", value: formData.account.password, onChange: handleChange, onFocus: function () { return clearFieldError('password'); }, onBlur: function (e) { return handleFieldBlur('password', e.target.value); } }),
                                                    react_1["default"].createElement("span", { className: "ti toggle-passwords " + (passwordVisibility.password
                                                            ? "ti-eye"
                                                            : "ti-eye-off"), onClick: function () {
                                                            return togglePasswordVisibility("password");
                                                        } })),
                                                fieldErrors.password && (react_1["default"].createElement("div", { className: "invalid-feedback d-block" }, fieldErrors.password)))),
                                        react_1["default"].createElement("div", { className: "col-md-6" },
                                            react_1["default"].createElement("div", { className: "mb-3 " },
                                                react_1["default"].createElement("label", { className: "form-label" },
                                                    "Confirm Password",
                                                    " ",
                                                    react_1["default"].createElement("span", { className: "text-danger" }, " *")),
                                                react_1["default"].createElement("div", { className: "pass-group" },
                                                    react_1["default"].createElement("input", { type: passwordVisibility.confirmPassword
                                                            ? "text"
                                                            : "password", className: "pass-input form-control " + (fieldErrors.confirmPassword ? 'is-invalid' : ''), name: "confirmPassword", value: confirmPassword, onChange: function (e) {
                                                            return setConfirmPassword(e.target.value);
                                                        }, onFocus: function () { return clearFieldError('confirmPassword'); }, onBlur: function (e) { return handleFieldBlur('confirmPassword', e.target.value); } }),
                                                    react_1["default"].createElement("span", { className: "ti toggle-passwords " + (passwordVisibility.confirmPassword
                                                            ? "ti-eye"
                                                            : "ti-eye-off"), onClick: function () {
                                                            return togglePasswordVisibility("confirmPassword");
                                                        } })),
                                                fieldErrors.confirmPassword && (react_1["default"].createElement("div", { className: "invalid-feedback d-block" }, fieldErrors.confirmPassword)))),
                                        react_1["default"].createElement("div", { className: "col-md-6" },
                                            react_1["default"].createElement("div", { className: "mb-3" },
                                                react_1["default"].createElement("label", { className: "form-label" },
                                                    "Phone Number ",
                                                    react_1["default"].createElement("span", { className: "text-danger" }, " *")),
                                                react_1["default"].createElement("input", { type: "text", className: "form-control " + (fieldErrors.phone ? 'is-invalid' : ''), name: "phone", value: formData.contact.phone, onChange: handleChange, onFocus: function () { return clearFieldError('phone'); }, onBlur: function (e) { return handleFieldBlur('phone', e.target.value); } }),
                                                fieldErrors.phone && (react_1["default"].createElement("div", { className: "invalid-feedback d-block" }, fieldErrors.phone)))),
                                        react_1["default"].createElement("div", { className: "col-md-6" },
                                            react_1["default"].createElement("div", { className: "mb-3" },
                                                react_1["default"].createElement("label", { className: "form-label" },
                                                    "Department ",
                                                    react_1["default"].createElement("span", { className: "text-danger" }, "*")),
                                                react_1["default"].createElement(commonSelect_1["default"], { className: "select " + (fieldErrors.departmentId ? 'is-invalid' : ''), options: department, defaultValue: EMPTY_OPTION, onChange: function (option) {
                                                        if (option) {
                                                            handleSelectChange("departmentId", option.value);
                                                            setSelectedDepartment(option.value);
                                                            // Reset designation when department changes
                                                            setDesignation([
                                                                { value: "", label: "Select" },
                                                            ]);
                                                            handleSelectChange("designationId", "");
                                                            // Clear errors for both department and designation
                                                            clearFieldError('departmentId');
                                                            clearFieldError('designationId');
                                                            // Fetch new designations for selected department
                                                            if (socket) {
                                                                socket.emit("hrm/designations/get", {
                                                                    departmentId: option.value
                                                                });
                                                            }
                                                        }
                                                    } }),
                                                fieldErrors.departmentId && (react_1["default"].createElement("div", { className: "invalid-feedback d-block" }, fieldErrors.departmentId)))),
                                        react_1["default"].createElement("div", { className: "col-md-6" },
                                            react_1["default"].createElement("div", { className: "mb-3" },
                                                react_1["default"].createElement("label", { className: "form-label" },
                                                    "Designation ",
                                                    react_1["default"].createElement("span", { className: "text-danger" }, "*")),
                                                react_1["default"].createElement(commonSelect_1["default"], { className: "select " + (fieldErrors.designationId ? 'is-invalid' : ''), options: designation, defaultValue: EMPTY_OPTION, onChange: function (option) {
                                                        if (option) {
                                                            handleSelectChange("designationId", option.value);
                                                            clearFieldError('designationId');
                                                        }
                                                    } }),
                                                fieldErrors.designationId && (react_1["default"].createElement("div", { className: "invalid-feedback d-block" }, fieldErrors.designationId)))),
                                        react_1["default"].createElement("div", { className: "col-md-6" },
                                            react_1["default"].createElement("div", { className: "mb-3" },
                                                react_1["default"].createElement("label", { className: "form-label" },
                                                    "Status ",
                                                    react_1["default"].createElement("span", { className: "text-danger" }, " *")),
                                                react_1["default"].createElement("div", { className: "d-flex align-items-center" },
                                                    react_1["default"].createElement("div", { className: "form-check form-switch" },
                                                        react_1["default"].createElement("input", { className: "form-check-input", type: "checkbox", role: "switch", id: "statusSwitch", checked: formData.status === "Active", onChange: function (e) {
                                                                return setFormData(function (prev) { return (__assign(__assign({}, prev), { status: e.target.checked ? "Active" : "Inactive" })); });
                                                            } }),
                                                        react_1["default"].createElement("label", { className: "form-check-label", htmlFor: "statusSwitch" },
                                                            react_1["default"].createElement("span", { className: "badge " + (formData.status === "Active"
                                                                    ? "badge-success"
                                                                    : "badge-danger") + " d-inline-flex align-items-center" },
                                                                react_1["default"].createElement("i", { className: "ti ti-point-filled me-1" }),
                                                                formData.status)))))),
                                        react_1["default"].createElement("div", { className: "col-md-12" },
                                            react_1["default"].createElement("div", { className: "mb-3" },
                                                react_1["default"].createElement("label", { className: "form-label" }, "About"),
                                                react_1["default"].createElement("textarea", { className: "form-control", rows: 3, name: "about", value: formData.about, onChange: handleChange }))))),
                                fieldErrors.general && (react_1["default"].createElement("div", { className: "alert alert-danger mx-3 mb-0", role: "alert" },
                                    react_1["default"].createElement("i", { className: "ti ti-alert-circle me-2" }),
                                    fieldErrors.general)),
                                react_1["default"].createElement("div", { className: "modal-footer" },
                                    react_1["default"].createElement("button", { type: "button", className: "btn btn-outline-light border me-2", "data-bs-dismiss": "modal", onClick: function () { return setTimeout(function () { return closeModal(); }, 100); } }, "Cancel"),
                                    react_1["default"].createElement("button", { type: "button", className: "btn btn-primary", onClick: handleNext, disabled: isValidating || loading }, isValidating ? (react_1["default"].createElement(react_1["default"].Fragment, null,
                                        react_1["default"].createElement("span", { className: "spinner-border spinner-border-sm me-2", role: "status", "aria-hidden": "true" }),
                                        "Validating...")) : ("Save and Next")))),
                            react_1["default"].createElement("div", { className: "tab-pane fade " + (activeTab === "address" ? "show active" : ""), id: "address", role: "tabpanel", "aria-labelledby": "address-tab", tabIndex: 0 },
                                react_1["default"].createElement("div", { className: "modal-body" },
                                    react_1["default"].createElement("div", { className: "card bg-light-500 shadow-none" },
                                        react_1["default"].createElement("div", { className: "card-body d-flex align-items-center justify-content-between flex-wrap row-gap-3" },
                                            react_1["default"].createElement("h6", null, "Enable Options"),
                                            react_1["default"].createElement("div", { className: "d-flex align-items-center justify-content-end" },
                                                react_1["default"].createElement("div", { className: "form-check form-switch me-2" },
                                                    react_1["default"].createElement("label", { className: "form-check-label mt-0" },
                                                        react_1["default"].createElement("input", { className: "form-check-input me-2", type: "checkbox", role: "switch", checked: Object.values(permissions.enabledModules).every(Boolean), onChange: function (e) {
                                                                return toggleAllModules(e.target.checked);
                                                            } }),
                                                        "Enable all Module")),
                                                react_1["default"].createElement("div", { className: "form-check d-flex align-items-center" },
                                                    react_1["default"].createElement("label", { className: "form-check-label mt-0" },
                                                        react_1["default"].createElement("input", { className: "form-check-input", type: "checkbox", checked: Object.values(permissions.selectAll).every(Boolean), onChange: function (e) {
                                                                return toggleGlobalSelectAll(e.target.checked);
                                                            } }),
                                                        "Select All"))))),
                                    react_1["default"].createElement("div", { className: "table-responsive border rounded" },
                                        react_1["default"].createElement("table", { className: "table" },
                                            react_1["default"].createElement("tbody", null, MODULES.map(function (module) { return (react_1["default"].createElement("tr", { key: module },
                                                react_1["default"].createElement("td", null,
                                                    react_1["default"].createElement("div", { className: "form-check form-switch me-2" },
                                                        react_1["default"].createElement("label", { className: "form-check-label mt-0" },
                                                            react_1["default"].createElement("input", { className: "form-check-input me-2", type: "checkbox", role: "switch", checked: permissions.enabledModules[module], onChange: function () { return toggleModule(module); } }),
                                                            module.charAt(0).toUpperCase() +
                                                                module.slice(1)))),
                                                ACTIONS.map(function (action) { return (react_1["default"].createElement("td", { key: action },
                                                    react_1["default"].createElement("div", { className: "form-check d-flex align-items-center" },
                                                        react_1["default"].createElement("label", { className: "form-check-label mt-0" },
                                                            react_1["default"].createElement("input", { className: "form-check-input", type: "checkbox", checked: permissions.permissions[module][action], onChange: function (e) {
                                                                    return handlePermissionChange(module, action, e.target.checked);
                                                                }, disabled: !permissions.enabledModules[module] }),
                                                            action.charAt(0).toUpperCase() +
                                                                action.slice(1))))); }))); }))))),
                                react_1["default"].createElement("div", { className: "modal-footer" },
                                    react_1["default"].createElement("button", { type: "button", className: "btn btn-outline-light border me-2", "data-bs-dismiss": "modal", onClick: function () {
                                            handleResetFormData();
                                            setActiveTab("basic-info");
                                            setTimeout(function () { return closeModal(); }, 100);
                                        } }, "Cancel"),
                                    react_1["default"].createElement("button", { type: "submit", className: "btn btn-primary", disabled: isValidating || loading }, isValidating ? (react_1["default"].createElement(react_1["default"].Fragment, null,
                                        react_1["default"].createElement("span", { className: "spinner-border spinner-border-sm me-2", role: "status", "aria-hidden": "true" }),
                                        "Validating...")) : loading ? (react_1["default"].createElement(react_1["default"].Fragment, null,
                                        react_1["default"].createElement("span", { className: "spinner-border spinner-border-sm me-2", role: "status", "aria-hidden": "true" }),
                                        "Saving...")) : ("Save"))))))))),
        react_1["default"].createElement("div", { className: "modal fade", id: "edit_employee" },
            react_1["default"].createElement("div", { className: "modal-dialog modal-dialog-centered modal-lg" },
                react_1["default"].createElement("div", { className: "modal-content" },
                    react_1["default"].createElement("div", { className: "modal-header" },
                        react_1["default"].createElement("div", { className: "d-flex align-items-center" },
                            react_1["default"].createElement("h4", { className: "modal-title me-2" }, "Edit Employee"),
                            react_1["default"].createElement("span", null,
                                "Employee ID : ", editingEmployee === null || editingEmployee === void 0 ? void 0 :
                                editingEmployee.employeeId)),
                        react_1["default"].createElement("button", { type: "button", className: "btn-close custom-btn-close", "data-bs-dismiss": "modal", "aria-label": "Close", onClick: function () {
                                setEditingEmployee(null);
                                setTimeout(function () { return closeModal(); }, 100);
                            } },
                            react_1["default"].createElement("i", { className: "ti ti-x" }))),
                    react_1["default"].createElement("button", { type: "button", ref: editEmployeeModalRef, "data-bs-dismiss": "modal", style: { display: "none" } }),
                    react_1["default"].createElement("form", { action: all_routes_1.all_routes.employeeList },
                        react_1["default"].createElement("div", { className: "contact-grids-tab" },
                            react_1["default"].createElement("ul", { className: "nav nav-underline", id: "myTab2", role: "tablist" },
                                react_1["default"].createElement("li", { className: "nav-item", role: "presentation" },
                                    react_1["default"].createElement("button", { className: "nav-link active", id: "info-tab2", "data-bs-toggle": "tab", "data-bs-target": "#basic-info2", type: "button", role: "tab", "aria-selected": "true" }, "Basic Information")),
                                react_1["default"].createElement("li", { className: "nav-item", role: "presentation" },
                                    react_1["default"].createElement("button", { className: "nav-link", id: "address-tab2", "data-bs-toggle": "tab", "data-bs-target": "#address2", type: "button", role: "tab", "aria-selected": "false" }, "Permissions")))),
                        react_1["default"].createElement("div", { className: "tab-content", id: "myTabContent2" },
                            react_1["default"].createElement("div", { className: "tab-pane fade show active", id: "basic-info2", role: "tabpanel", "aria-labelledby": "info-tab2", tabIndex: 0 },
                                react_1["default"].createElement("div", { className: "modal-body pb-0 " },
                                    react_1["default"].createElement("div", { className: "row" },
                                        react_1["default"].createElement("div", { className: "col-md-12" },
                                            react_1["default"].createElement("div", { className: "d-flex align-items-center flex-wrap row-gap-3 bg-light w-100 rounded p-3 mb-4" },
                                                react_1["default"].createElement("div", { className: "d-flex align-items-center justify-content-center avatar avatar-xxl rounded-circle border border-dashed me-2 flex-shrink-0 text-dark frames" }, (editingEmployee === null || editingEmployee === void 0 ? void 0 : editingEmployee.avatarUrl) ? (react_1["default"].createElement("img", { src: editingEmployee.avatarUrl, alt: "Profile", className: "avatar avatar-xxl rounded-circle border border-dashed me-2 flex-shrink-0" })) : (react_1["default"].createElement(imageWithBasePath_1["default"], { src: "assets/img/users/user-13.jpg", alt: "img", className: "rounded-circle" }))),
                                                react_1["default"].createElement("div", { className: "profile-upload" },
                                                    react_1["default"].createElement("div", { className: "mb-2" },
                                                        react_1["default"].createElement("h6", { className: "mb-1" }, "Upload Profile Image"),
                                                        react_1["default"].createElement("p", { className: "fs-12" }, "Image should be below 4 mb")),
                                                    react_1["default"].createElement("div", { className: "profile-uploader d-flex align-items-center" },
                                                        react_1["default"].createElement("div", { className: "drag-upload-btn btn btn-sm btn-primary me-2" },
                                                            "Upload",
                                                            react_1["default"].createElement("input", { type: "file", className: "form-control image-sign", accept: ".png,.jpeg,.jpg,.ico", onChange: function (event) { return __awaiter(void 0, void 0, void 0, function () {
                                                                    var file, maxSize, formData_1, res, data_1, error_3;
                                                                    var _a;
                                                                    return __generator(this, function (_b) {
                                                                        switch (_b.label) {
                                                                            case 0:
                                                                                file = (_a = event.target.files) === null || _a === void 0 ? void 0 : _a[0];
                                                                                if (!file)
                                                                                    return [2 /*return*/];
                                                                                maxSize = 4 * 1024 * 1024;
                                                                                if (file.size > maxSize) {
                                                                                    react_toastify_1.toast.error("File size must be less than 4MB.");
                                                                                    event.target.value = "";
                                                                                    return [2 /*return*/];
                                                                                }
                                                                                if (![
                                                                                    "image/jpeg",
                                                                                    "image/png",
                                                                                    "image/jpg",
                                                                                    "image/ico",
                                                                                ].includes(file.type)) return [3 /*break*/, 6];
                                                                                _b.label = 1;
                                                                            case 1:
                                                                                _b.trys.push([1, 4, , 5]);
                                                                                formData_1 = new FormData();
                                                                                formData_1.append("file", file);
                                                                                formData_1.append("upload_preset", "amasqis");
                                                                                return [4 /*yield*/, fetch("https://api.cloudinary.com/v1_1/dwc3b5zfe/image/upload", { method: "POST", body: formData_1 })];
                                                                            case 2:
                                                                                res = _b.sent();
                                                                                return [4 /*yield*/, res.json()];
                                                                            case 3:
                                                                                data_1 = _b.sent();
                                                                                setEditingEmployee(function (prev) {
                                                                                    return prev
                                                                                        ? __assign(__assign({}, prev), { avatarUrl: data_1.secure_url }) : prev;
                                                                                });
                                                                                return [3 /*break*/, 5];
                                                                            case 4:
                                                                                error_3 = _b.sent();
                                                                                react_toastify_1.toast.error("Failed to upload image. Please try again.");
                                                                                event.target.value = "";
                                                                                return [3 /*break*/, 5];
                                                                            case 5: return [3 /*break*/, 7];
                                                                            case 6:
                                                                                react_toastify_1.toast.error("Please upload image file only.");
                                                                                event.target.value = "";
                                                                                _b.label = 7;
                                                                            case 7: return [2 /*return*/];
                                                                        }
                                                                    });
                                                                }); }, style: {
                                                                    cursor: "pointer",
                                                                    opacity: 0,
                                                                    position: "absolute",
                                                                    top: 0,
                                                                    left: 0,
                                                                    width: "100%",
                                                                    height: "100%"
                                                                } })),
                                                        react_1["default"].createElement("button", { type: "button", className: "btn btn-light btn-sm", onClick: function () {
                                                                return setEditingEmployee(function (prev) {
                                                                    return prev ? __assign(__assign({}, prev), { avatarUrl: "" }) : prev;
                                                                });
                                                            } }, "Cancel"))))),
                                        react_1["default"].createElement("div", { className: "col-md-6" },
                                            react_1["default"].createElement("div", { className: "mb-3" },
                                                react_1["default"].createElement("label", { className: "form-label" },
                                                    "First Name ",
                                                    react_1["default"].createElement("span", { className: "text-danger" }, " *")),
                                                react_1["default"].createElement("input", { type: "text", className: "form-control", value: (editingEmployee === null || editingEmployee === void 0 ? void 0 : editingEmployee.firstName) || "", onChange: function (e) {
                                                        return setEditingEmployee(function (prev) {
                                                            return prev
                                                                ? __assign(__assign({}, prev), { firstName: e.target.value }) : prev;
                                                        });
                                                    } }))),
                                        react_1["default"].createElement("div", { className: "col-md-6" },
                                            react_1["default"].createElement("div", { className: "mb-3" },
                                                react_1["default"].createElement("label", { className: "form-label" }, "Last Name"),
                                                react_1["default"].createElement("input", { type: "text", className: "form-control", value: (editingEmployee === null || editingEmployee === void 0 ? void 0 : editingEmployee.lastName) || "", onChange: function (e) {
                                                        return setEditingEmployee(function (prev) {
                                                            return prev
                                                                ? __assign(__assign({}, prev), { lastName: e.target.value }) : prev;
                                                        });
                                                    } }))),
                                        react_1["default"].createElement("div", { className: "col-md-6" },
                                            react_1["default"].createElement("div", { className: "mb-3" },
                                                react_1["default"].createElement("label", { className: "form-label" },
                                                    "Employee ID ",
                                                    react_1["default"].createElement("span", { className: "text-danger" }, " *")),
                                                react_1["default"].createElement("input", { type: "text", className: "form-control", value: (editingEmployee === null || editingEmployee === void 0 ? void 0 : editingEmployee.employeeId) || "", readOnly: true }))),
                                        react_1["default"].createElement("div", { className: "col-md-6" },
                                            react_1["default"].createElement("div", { className: "mb-3" },
                                                react_1["default"].createElement("label", { className: "form-label" },
                                                    "Joining Date ",
                                                    react_1["default"].createElement("span", { className: "text-danger" }, " *")),
                                                react_1["default"].createElement("div", { className: "input-icon-end position-relative" },
                                                    react_1["default"].createElement(antd_1.DatePicker, { className: "form-control datetimepicker", format: "DD-MM-YYYY", getPopupContainer: getModalContainer, placeholder: "DD-MM-YYYY", name: "dateOfJoining", value: (editingEmployee === null || editingEmployee === void 0 ? void 0 : editingEmployee.dateOfJoining) ? dayjs_1["default"](editingEmployee.dateOfJoining)
                                                            : null, onChange: function (date) {
                                                            setEditingEmployee(function (prev) {
                                                                return prev
                                                                    ? __assign(__assign({}, prev), { dateOfJoining: date
                                                                            ? date.toDate().toISOString()
                                                                            : "" }) : prev;
                                                            });
                                                        } }),
                                                    react_1["default"].createElement("span", { className: "input-icon-addon" },
                                                        react_1["default"].createElement("i", { className: "ti ti-calendar text-gray-7" }))))),
                                        react_1["default"].createElement("div", { className: "col-md-6" },
                                            react_1["default"].createElement("div", { className: "mb-3" },
                                                react_1["default"].createElement("label", { className: "form-label" },
                                                    "Username ",
                                                    react_1["default"].createElement("span", { className: "text-danger" }, " *")),
                                                react_1["default"].createElement("input", { type: "text", className: "form-control", value: ((_p = editingEmployee === null || editingEmployee === void 0 ? void 0 : editingEmployee.account) === null || _p === void 0 ? void 0 : _p.userName) || "", onChange: function (e) {
                                                        return setEditingEmployee(function (prev) {
                                                            return prev
                                                                ? __assign(__assign({}, prev), { account: __assign(__assign({}, prev.account), { userName: e.target.value }) }) : prev;
                                                        });
                                                    } }))),
                                        react_1["default"].createElement("div", { className: "col-md-6" },
                                            react_1["default"].createElement("div", { className: "mb-3" },
                                                react_1["default"].createElement("label", { className: "form-label" },
                                                    "Email ",
                                                    react_1["default"].createElement("span", { className: "text-danger" }, " *")),
                                                react_1["default"].createElement("input", { type: "email", className: "form-control", value: ((_q = editingEmployee === null || editingEmployee === void 0 ? void 0 : editingEmployee.contact) === null || _q === void 0 ? void 0 : _q.email) || "", onChange: function (e) {
                                                        return setEditingEmployee(function (prev) {
                                                            return prev
                                                                ? __assign(__assign({}, prev), { contact: __assign(__assign({}, prev.contact), { email: e.target.value }) }) : prev;
                                                        });
                                                    } }))),
                                        react_1["default"].createElement("div", { className: "col-md-6" },
                                            react_1["default"].createElement("div", { className: "mb-3" },
                                                react_1["default"].createElement("label", { className: "form-label" },
                                                    "Gender ",
                                                    react_1["default"].createElement("span", { className: "text-danger" }, " *")),
                                                react_1["default"].createElement("select", { className: "form-control", value: ((_r = editingEmployee === null || editingEmployee === void 0 ? void 0 : editingEmployee.personal) === null || _r === void 0 ? void 0 : _r.gender) || "", onChange: function (e) {
                                                        return setEditingEmployee(function (prev) {
                                                            return prev
                                                                ? __assign(__assign({}, prev), { personal: __assign(__assign({}, prev.personal), { gender: e.target.value }) }) : prev;
                                                        });
                                                    } },
                                                    react_1["default"].createElement("option", { value: "" }, "Select Gender"),
                                                    react_1["default"].createElement("option", { value: "male" }, "Male"),
                                                    react_1["default"].createElement("option", { value: "female" }, "Female"),
                                                    react_1["default"].createElement("option", { value: "other" }, "Other")))),
                                        react_1["default"].createElement("div", { className: "col-md-6" },
                                            react_1["default"].createElement("div", { className: "mb-3" },
                                                react_1["default"].createElement("label", { className: "form-label" },
                                                    "Birthday ",
                                                    react_1["default"].createElement("span", { className: "text-danger" }, " *")),
                                                react_1["default"].createElement("div", { className: "input-icon-end position-relative" },
                                                    react_1["default"].createElement(antd_1.DatePicker, { className: "form-control datetimepicker", format: "DD-MM-YYYY", getPopupContainer: getModalContainer, placeholder: "DD-MM-YYYY", value: ((_s = editingEmployee === null || editingEmployee === void 0 ? void 0 : editingEmployee.personal) === null || _s === void 0 ? void 0 : _s.birthday) ? dayjs_1["default"](editingEmployee.personal.birthday)
                                                            : null, onChange: function (date) {
                                                            return setEditingEmployee(function (prev) {
                                                                return prev
                                                                    ? __assign(__assign({}, prev), { personal: __assign(__assign({}, prev.personal), { birthday: date
                                                                                ? date.toDate().toISOString()
                                                                                : null }) }) : prev;
                                                            });
                                                        } }),
                                                    react_1["default"].createElement("span", { className: "input-icon-addon" },
                                                        react_1["default"].createElement("i", { className: "ti ti-calendar text-gray-7" }))))),
                                        react_1["default"].createElement("div", { className: "col-md-12" },
                                            react_1["default"].createElement("div", { className: "mb-3" },
                                                react_1["default"].createElement("label", { className: "form-label" }, "Address"),
                                                react_1["default"].createElement("input", { type: "text", className: "form-control", placeholder: "Street", value: ((_u = (_t = editingEmployee === null || editingEmployee === void 0 ? void 0 : editingEmployee.personal) === null || _t === void 0 ? void 0 : _t.address) === null || _u === void 0 ? void 0 : _u.street) || "", onChange: function (e) {
                                                        return setEditingEmployee(function (prev) {
                                                            var _a;
                                                            return prev
                                                                ? __assign(__assign({}, prev), { personal: __assign(__assign({}, prev.personal), { address: __assign(__assign({}, (_a = prev.personal) === null || _a === void 0 ? void 0 : _a.address), { street: e.target.value }) }) }) : prev;
                                                        });
                                                    } }),
                                                react_1["default"].createElement("div", { className: "row mt-3" },
                                                    react_1["default"].createElement("div", { className: "col-md-6" },
                                                        react_1["default"].createElement("input", { type: "text", className: "form-control", placeholder: "City", value: ((_w = (_v = editingEmployee === null || editingEmployee === void 0 ? void 0 : editingEmployee.personal) === null || _v === void 0 ? void 0 : _v.address) === null || _w === void 0 ? void 0 : _w.city) || "", onChange: function (e) {
                                                                return setEditingEmployee(function (prev) {
                                                                    var _a;
                                                                    return prev
                                                                        ? __assign(__assign({}, prev), { personal: __assign(__assign({}, prev.personal), { address: __assign(__assign({}, (_a = prev.personal) === null || _a === void 0 ? void 0 : _a.address), { city: e.target.value }) }) }) : prev;
                                                                });
                                                            } })),
                                                    react_1["default"].createElement("div", { className: "col-md-6" },
                                                        react_1["default"].createElement("input", { type: "text", className: "form-control", placeholder: "State", value: ((_y = (_x = editingEmployee === null || editingEmployee === void 0 ? void 0 : editingEmployee.personal) === null || _x === void 0 ? void 0 : _x.address) === null || _y === void 0 ? void 0 : _y.state) ||
                                                                "", onChange: function (e) {
                                                                return setEditingEmployee(function (prev) {
                                                                    var _a;
                                                                    return prev
                                                                        ? __assign(__assign({}, prev), { personal: __assign(__assign({}, prev.personal), { address: __assign(__assign({}, (_a = prev.personal) === null || _a === void 0 ? void 0 : _a.address), { state: e.target.value }) }) }) : prev;
                                                                });
                                                            } }))),
                                                react_1["default"].createElement("div", { className: "row mt-3" },
                                                    react_1["default"].createElement("div", { className: "col-md-6" },
                                                        react_1["default"].createElement("input", { type: "text", className: "form-control", placeholder: "Postal Code", value: ((_0 = (_z = editingEmployee === null || editingEmployee === void 0 ? void 0 : editingEmployee.personal) === null || _z === void 0 ? void 0 : _z.address) === null || _0 === void 0 ? void 0 : _0.postalCode) || "", onChange: function (e) {
                                                                return setEditingEmployee(function (prev) {
                                                                    var _a;
                                                                    return prev
                                                                        ? __assign(__assign({}, prev), { personal: __assign(__assign({}, prev.personal), { address: __assign(__assign({}, (_a = prev.personal) === null || _a === void 0 ? void 0 : _a.address), { postalCode: e.target.value }) }) }) : prev;
                                                                });
                                                            } })),
                                                    react_1["default"].createElement("div", { className: "col-md-6" },
                                                        react_1["default"].createElement("input", { type: "text", className: "form-control", placeholder: "Country", value: ((_2 = (_1 = editingEmployee === null || editingEmployee === void 0 ? void 0 : editingEmployee.personal) === null || _1 === void 0 ? void 0 : _1.address) === null || _2 === void 0 ? void 0 : _2.country) ||
                                                                "", onChange: function (e) {
                                                                return setEditingEmployee(function (prev) {
                                                                    var _a;
                                                                    return prev
                                                                        ? __assign(__assign({}, prev), { personal: __assign(__assign({}, prev.personal), { address: __assign(__assign({}, (_a = prev.personal) === null || _a === void 0 ? void 0 : _a.address), { country: e.target.value }) }) }) : prev;
                                                                });
                                                            } }))))),
                                        react_1["default"].createElement("div", { className: "col-md-6" },
                                            react_1["default"].createElement("div", { className: "mb-3" },
                                                react_1["default"].createElement("label", { className: "form-label" },
                                                    "Phone Number ",
                                                    react_1["default"].createElement("span", { className: "text-danger" }, " *")),
                                                react_1["default"].createElement("input", { type: "text", className: "form-control", value: ((_3 = editingEmployee === null || editingEmployee === void 0 ? void 0 : editingEmployee.contact) === null || _3 === void 0 ? void 0 : _3.phone) || "", onChange: function (e) {
                                                        return setEditingEmployee(function (prev) {
                                                            return prev
                                                                ? __assign(__assign({}, prev), { contact: __assign(__assign({}, prev.contact), { phone: e.target.value }) }) : prev;
                                                        });
                                                    } }))),
                                        react_1["default"].createElement("div", { className: "col-md-6" },
                                            react_1["default"].createElement("div", { className: "mb-3" },
                                                react_1["default"].createElement("label", { className: "form-label" },
                                                    "Company",
                                                    react_1["default"].createElement("span", { className: "text-danger" }, " *")),
                                                react_1["default"].createElement("input", { type: "text", className: "form-control", value: (editingEmployee === null || editingEmployee === void 0 ? void 0 : editingEmployee.companyName) || "", onChange: function (e) {
                                                        return setEditingEmployee(function (prev) {
                                                            return prev
                                                                ? __assign(__assign({}, prev), { companyName: e.target.value }) : prev;
                                                        });
                                                    } }))),
                                        react_1["default"].createElement("div", { className: "col-md-6" },
                                            react_1["default"].createElement("div", { className: "mb-3" },
                                                react_1["default"].createElement("label", { className: "form-label" }, "Department"),
                                                react_1["default"].createElement(commonSelect_1["default"], { key: "dept-" + (editingEmployee === null || editingEmployee === void 0 ? void 0 : editingEmployee._id) + "-" + (editingEmployee === null || editingEmployee === void 0 ? void 0 : editingEmployee.departmentId), className: "select", options: department, defaultValue: department.find(function (dep) {
                                                        return dep.value === (editingEmployee === null || editingEmployee === void 0 ? void 0 : editingEmployee.departmentId);
                                                    }) || { value: "", label: "Select" }, onChange: function (option) {
                                                        if (option) {
                                                            setSelectedDepartment(option.value);
                                                            setEditingEmployee(function (prev) {
                                                                return prev
                                                                    ? __assign(__assign({}, prev), { departmentId: option.value, designationId: "" }) : prev;
                                                            });
                                                            setSelectedDesignation("");
                                                            if (socket && option.value) {
                                                                console.log("Fetching designations for department:", option.value);
                                                                socket.emit("hrm/designations/get", {
                                                                    departmentId: option.value
                                                                });
                                                            }
                                                            else {
                                                                setDesignation([
                                                                    { value: "", label: "Select" },
                                                                ]);
                                                            }
                                                        }
                                                    } }))),
                                        react_1["default"].createElement("div", { className: "col-md-6" },
                                            react_1["default"].createElement("div", { className: "mb-3" },
                                                react_1["default"].createElement("label", { className: "form-label" }, "Designation"),
                                                react_1["default"].createElement(commonSelect_1["default"], { key: "desig-" + (editingEmployee === null || editingEmployee === void 0 ? void 0 : editingEmployee._id) + "-" + (editingEmployee === null || editingEmployee === void 0 ? void 0 : editingEmployee.designationId), className: "select", options: designation, defaultValue: designation.find(function (dep) {
                                                        return dep.value === (editingEmployee === null || editingEmployee === void 0 ? void 0 : editingEmployee.designationId);
                                                    }) || { value: "", label: "Select" }, onChange: function (option) {
                                                        if (option) {
                                                            setSelectedDesignation(option.value);
                                                            setEditingEmployee(function (prev) {
                                                                return prev
                                                                    ? __assign(__assign({}, prev), { designationId: option.value }) : prev;
                                                            });
                                                        }
                                                    } }))),
                                        react_1["default"].createElement("div", { className: "col-md-6" },
                                            react_1["default"].createElement("div", { className: "mb-3" },
                                                react_1["default"].createElement("label", { className: "form-label" },
                                                    "Status ",
                                                    react_1["default"].createElement("span", { className: "text-danger" }, " *")),
                                                react_1["default"].createElement("div", null,
                                                    react_1["default"].createElement("div", { className: "form-check form-switch" },
                                                        react_1["default"].createElement("input", { className: "form-check-input", type: "checkbox", role: "switch", id: "editStatusSwitch", checked: (editingEmployee === null || editingEmployee === void 0 ? void 0 : editingEmployee.status) === "Active", disabled: ((_4 = editingEmployee === null || editingEmployee === void 0 ? void 0 : editingEmployee.status) === null || _4 === void 0 ? void 0 : _4.toLowerCase()) !== "active" &&
                                                                ((_5 = editingEmployee === null || editingEmployee === void 0 ? void 0 : editingEmployee.status) === null || _5 === void 0 ? void 0 : _5.toLowerCase()) !== "inactive", onChange: function (e) {
                                                                var _a;
                                                                var currentStatus = (_a = editingEmployee === null || editingEmployee === void 0 ? void 0 : editingEmployee.status) === null || _a === void 0 ? void 0 : _a.toLowerCase();
                                                                // Only allow editing if status is Active or Inactive
                                                                if (currentStatus !== "active" && currentStatus !== "inactive") {
                                                                    react_toastify_1.toast.warning("Status cannot be changed for " + ((editingEmployee === null || editingEmployee === void 0 ? void 0 : editingEmployee.status) || 'this') + " employees. This status is managed by HR workflow.", { position: "top-right", autoClose: 4000 });
                                                                    return;
                                                                }
                                                                setEditingEmployee(function (prev) {
                                                                    return prev
                                                                        ? __assign(__assign({}, prev), { status: e.target.checked ? "Active" : "Inactive" }) : prev;
                                                                });
                                                            } }),
                                                        react_1["default"].createElement("label", { className: "form-check-label", htmlFor: "editStatusSwitch", style: {
                                                                opacity: (((_6 = editingEmployee === null || editingEmployee === void 0 ? void 0 : editingEmployee.status) === null || _6 === void 0 ? void 0 : _6.toLowerCase()) !== "active" &&
                                                                    ((_7 = editingEmployee === null || editingEmployee === void 0 ? void 0 : editingEmployee.status) === null || _7 === void 0 ? void 0 : _7.toLowerCase()) !== "inactive") ? 0.6 : 1
                                                            } },
                                                            react_1["default"].createElement("span", { className: "badge " + ((editingEmployee === null || editingEmployee === void 0 ? void 0 : editingEmployee.status) === "Active"
                                                                    ? "badge-success"
                                                                    : "badge-danger") + " d-inline-flex align-items-center" },
                                                                react_1["default"].createElement("i", { className: "ti ti-point-filled me-1" }),
                                                                (editingEmployee === null || editingEmployee === void 0 ? void 0 : editingEmployee.status) || "Active")))))),
                                        react_1["default"].createElement("div", { className: "col-md-12" },
                                            react_1["default"].createElement("div", { className: "mb-3" },
                                                react_1["default"].createElement("label", { className: "form-label" },
                                                    "About ",
                                                    react_1["default"].createElement("span", { className: "text-danger" }, " *")),
                                                react_1["default"].createElement("textarea", { className: "form-control", rows: 3, value: (editingEmployee === null || editingEmployee === void 0 ? void 0 : editingEmployee.about) || "", onChange: function (e) {
                                                        return setEditingEmployee(function (prev) {
                                                            return prev ? __assign(__assign({}, prev), { about: e.target.value }) : prev;
                                                        });
                                                    } }))))),
                                react_1["default"].createElement("div", { className: "modal-footer" },
                                    react_1["default"].createElement("button", { type: "button", className: "btn btn-outline-light border me-2", "data-bs-dismiss": "modal", onClick: function () { return setTimeout(function () { return closeModal(); }, 100); } }, "Cancel"),
                                    react_1["default"].createElement("button", { type: "button", "data-bs-dismiss": "modal", className: "btn btn-primary", onClick: handleUpdateSubmit }, "Save"))),
                            react_1["default"].createElement("div", { className: "tab-pane fade", id: "address2", role: "tabpanel", "aria-labelledby": "address-tab2", tabIndex: 0 },
                                react_1["default"].createElement("div", { className: "modal-body" },
                                    react_1["default"].createElement("div", { className: "card bg-light-500 shadow-none" },
                                        react_1["default"].createElement("div", { className: "card-body d-flex align-items-center justify-content-between flex-wrap row-gap-3" },
                                            react_1["default"].createElement("h6", null, "Enable Options"),
                                            react_1["default"].createElement("div", { className: "d-flex align-items-center justify-content-end" },
                                                react_1["default"].createElement("div", { className: "form-check form-switch me-2" },
                                                    react_1["default"].createElement("input", { id: "enableAllModules", className: "form-check-input me-2", type: "checkbox", role: "switch", checked: Object.values(permissions.enabledModules).every(Boolean), onChange: function () { return toggleAllModules(true); } }),
                                                    react_1["default"].createElement("label", { className: "form-check-label mt-0", htmlFor: "enableAllModules" }, "Enable all Modules")),
                                                react_1["default"].createElement("div", { className: "form-check d-flex align-items-center" },
                                                    react_1["default"].createElement("input", { id: "selectAllPermissions", className: "form-check-input", type: "checkbox", checked: allPermissionsSelected(), onChange: function () { return toggleGlobalSelectAll(true); } }),
                                                    react_1["default"].createElement("label", { className: "form-check-label mt-0", htmlFor: "selectAllPermissions" }, "Select All"))))),
                                    react_1["default"].createElement("div", { className: "table-responsive border rounded" },
                                        react_1["default"].createElement("table", { className: "table" },
                                            react_1["default"].createElement("tbody", null, MODULES.map(function (module) { return (react_1["default"].createElement("tr", { key: module },
                                                react_1["default"].createElement("td", null,
                                                    react_1["default"].createElement("div", { className: "form-check form-switch me-2" },
                                                        react_1["default"].createElement("input", { id: "module-" + module, className: "form-check-input me-2", type: "checkbox", role: "switch", checked: permissions.enabledModules[module], onChange: function () { return toggleModule(module); } }),
                                                        react_1["default"].createElement("label", { className: "form-check-label mt-0", htmlFor: "module-" + module }, module.charAt(0).toUpperCase() +
                                                            module.slice(1)))),
                                                ACTIONS.map(function (action) { return (react_1["default"].createElement("td", { key: action, className: "align-middle" },
                                                    react_1["default"].createElement("div", { className: "form-check d-flex align-items-center justify-content-center" },
                                                        react_1["default"].createElement("input", { id: "perm-" + module + "-" + action, className: "form-check-input", type: "checkbox", checked: permissions.permissions[module][action], onChange: function (e) {
                                                                return handlePermissionChange(module, action, e.target.checked);
                                                            }, disabled: !permissions.enabledModules[module] }),
                                                        react_1["default"].createElement("label", { className: "form-check-label mt-0 ms-1", htmlFor: "perm-" + module + "-" + action }, action.charAt(0).toUpperCase() +
                                                            action.slice(1))))); }))); }))))),
                                react_1["default"].createElement("div", { className: "modal-footer" },
                                    react_1["default"].createElement("button", { type: "button", className: "btn btn-outline-light border me-2", "data-bs-dismiss": "modal", onClick: function () { return setTimeout(function () { return closeModal(); }, 100); } }, "Cancel"),
                                    react_1["default"].createElement("button", { type: "button", className: "btn btn-primary", onClick: function (e) {
                                            handlePermissionUpdateSubmit(e);
                                            // Close modal after submission
                                            if (editEmployeeModalRef.current) {
                                                editEmployeeModalRef.current.click();
                                                setTimeout(function () { return closeModal(); }, 100);
                                            }
                                        } },
                                        "Save",
                                        " ")))))))),
        react_1["default"].createElement("div", { className: "modal fade", id: "success_modal", role: "dialog" },
            react_1["default"].createElement("div", { className: "modal-dialog modal-dialog-centered modal-sm" },
                react_1["default"].createElement("div", { className: "modal-content" },
                    react_1["default"].createElement("div", { className: "modal-body" },
                        react_1["default"].createElement("div", { className: "text-center p-3" },
                            react_1["default"].createElement("span", { className: "avatar avatar-lg avatar-rounded bg-success mb-3" },
                                react_1["default"].createElement("i", { className: "ti ti-check fs-24" })),
                            react_1["default"].createElement("h5", { className: "mb-2" }, "Employee Added Successfully"),
                            react_1["default"].createElement("p", { className: "mb-3" },
                                formData.firstName,
                                " has been added with Employee ID :",
                                react_1["default"].createElement("span", { className: "text-primary" },
                                    "#",
                                    formData.employeeId)),
                            react_1["default"].createElement("div", null,
                                react_1["default"].createElement("div", { className: "row g-2" },
                                    react_1["default"].createElement("div", { className: "col-6" },
                                        react_1["default"].createElement(react_router_dom_1.Link, { to: all_routes_1.all_routes.employeeList, className: "btn btn-dark w-100", "data-bs-dismiss": "modal", onClick: function () {
                                                handleResetFormData();
                                                setTimeout(function () { return closeModal(); }, 100);
                                            } }, "Back to List")),
                                    react_1["default"].createElement("div", { className: "col-6" },
                                        react_1["default"].createElement(react_router_dom_1.Link, { to: all_routes_1.all_routes.employeedetails, className: "btn btn-primary w-100", onClick: handleResetFormData }, "Detail Page"))))))))),
        react_1["default"].createElement("div", { className: "modal fade", id: "employee_success_modal" },
            react_1["default"].createElement("div", { className: "modal-dialog modal-dialog-centered" },
                react_1["default"].createElement("div", { className: "modal-content" },
                    react_1["default"].createElement("div", { className: "modal-body text-center" },
                        react_1["default"].createElement("span", { className: "avatar avatar-xl bg-success text-white mb-3" },
                            react_1["default"].createElement("i", { className: "ti ti-circle-check fs-36" })),
                        react_1["default"].createElement("h4", { className: "mb-1" }, "Employee Added Successfully!"),
                        react_1["default"].createElement("p", { className: "mb-3" }, newlyAddedEmployee
                            ? (newlyAddedEmployee.firstName || '') + " " + (newlyAddedEmployee.lastName || '') + " has been added to the system."
                            : "The employee has been added successfully."),
                        react_1["default"].createElement("div", { className: "d-flex justify-content-center gap-2" },
                            react_1["default"].createElement("button", { className: "btn btn-light", "data-bs-dismiss": "modal", onClick: function () {
                                    setNewlyAddedEmployee(null);
                                    setTimeout(function () { return closeModal(); }, 100);
                                } },
                                react_1["default"].createElement("i", { className: "ti ti-list me-1" }),
                                "Back to List"),
                            react_1["default"].createElement("button", { className: "btn btn-primary", "data-bs-dismiss": "modal", onClick: function () {
                                    if (newlyAddedEmployee && newlyAddedEmployee._id) {
                                        navigate(all_routes_1.all_routes.employeedetails + "/" + newlyAddedEmployee._id);
                                    }
                                    setNewlyAddedEmployee(null);
                                    setTimeout(function () { return closeModal(); }, 100);
                                } },
                                react_1["default"].createElement("i", { className: "ti ti-eye me-1" }),
                                "View Details")))))),
        react_1["default"].createElement("button", { ref: successModalRef, "data-bs-toggle": "modal", "data-bs-target": "#employee_success_modal", style: { display: "none" } }),
        react_1["default"].createElement("div", { className: "modal fade", id: "delete_modal" },
            react_1["default"].createElement("div", { className: "modal-dialog modal-dialog-centered" },
                react_1["default"].createElement("div", { className: "modal-content" },
                    react_1["default"].createElement("div", { className: "modal-body text-center" },
                        react_1["default"].createElement("span", { className: "avatar avatar-xl bg-transparent-danger text-danger mb-3" },
                            react_1["default"].createElement("i", { className: "ti ti-trash-x fs-36" })),
                        react_1["default"].createElement("h4", { className: "mb-1" }, "Confirm Deletion"),
                        react_1["default"].createElement("p", { className: "mb-3" }, employeeToDelete
                            ? "Are you sure you want to delete employee \"" + (employeeToDelete === null || employeeToDelete === void 0 ? void 0 : employeeToDelete.firstName) + "\"? This cannot be undone."
                            : "You want to delete all the marked items, this can't be undone once you delete."),
                        react_1["default"].createElement("div", { className: "d-flex justify-content-center" },
                            react_1["default"].createElement("button", { className: "btn btn-light me-3", "data-bs-dismiss": "modal", onClick: function () {
                                    setEmployeeToDelete(null);
                                    setTimeout(function () { return closeModal(); }, 100);
                                }, disabled: loading }, "Cancel"),
                            react_1["default"].createElement("button", { className: "btn btn-danger", "data-bs-dismiss": "modal", onClick: function () {
                                    if (employeeToDelete) {
                                        deleteEmployee(employeeToDelete._id);
                                    }
                                    setEmployeeToDelete(null);
                                    setTimeout(function () { return closeModal(); }, 100);
                                }, disabled: loading }, loading ? "Deleting..." : "Yes, Delete"))))))));
};
exports["default"] = EmployeeList;
