"use strict";
exports.__esModule = true;
var dayjs_1 = require("dayjs");
var react_1 = require("react");
var designationUtils_1 = require("../../utils/designationUtils");
var imageWithBasePath_1 = require("../common/imageWithBasePath");
var TerminationDetailsModal = function (_a) {
    var termination = _a.termination, _b = _a.modalId, modalId = _b === void 0 ? "view_termination_details" : _b;
    // Extract just the name part if employeeName contains "ID - Name" format
    var getDisplayName = function (employeeName) {
        if (!employeeName)
            return "Unknown Employee";
        // Check if name contains " - " pattern (e.g., "EMP-8984 - Hari Haran")
        var parts = employeeName.split(' - ');
        if (parts.length > 1) {
            // Return everything after the first " - "
            return parts.slice(1).join(' - ');
        }
        return employeeName;
    };
    var displayName = termination ? getDisplayName(termination.employeeName) : '';
    // Always render modal structure, just show empty/loading state when no data
    if (!termination) {
        return (react_1["default"].createElement("div", { className: "modal fade", id: modalId },
            react_1["default"].createElement("div", { className: "modal-dialog modal-dialog-centered modal-lg" },
                react_1["default"].createElement("div", { className: "modal-content" },
                    react_1["default"].createElement("div", { className: "modal-header" },
                        react_1["default"].createElement("h4", { className: "modal-title" }, "Termination Details"),
                        react_1["default"].createElement("button", { type: "button", className: "btn-close custom-btn-close", "data-bs-dismiss": "modal", "aria-label": "Close" },
                            react_1["default"].createElement("i", { className: "ti ti-x" }))),
                    react_1["default"].createElement("div", { className: "modal-body pb-0" },
                        react_1["default"].createElement("div", { className: "text-center py-5" },
                            react_1["default"].createElement("p", { className: "text-muted" }, "No termination selected"))),
                    react_1["default"].createElement("div", { className: "modal-footer" },
                        react_1["default"].createElement("button", { type: "button", className: "btn btn-primary", "data-bs-dismiss": "modal" }, "Close"))))));
    }
    return (react_1["default"].createElement("div", { className: "modal fade", id: modalId },
        react_1["default"].createElement("div", { className: "modal-dialog modal-dialog-centered modal-lg" },
            react_1["default"].createElement("div", { className: "modal-content" },
                react_1["default"].createElement("div", { className: "modal-header" },
                    react_1["default"].createElement("h4", { className: "modal-title" }, "Termination Details"),
                    react_1["default"].createElement("button", { type: "button", className: "btn-close custom-btn-close", "data-bs-dismiss": "modal", "aria-label": "Close" },
                        react_1["default"].createElement("i", { className: "ti ti-x" }))),
                react_1["default"].createElement("div", { className: "modal-body pb-0" },
                    react_1["default"].createElement("div", { className: "row" },
                        react_1["default"].createElement("div", { className: "col-md-12 mb-4" },
                            react_1["default"].createElement("div", { className: "d-flex align-items-center justify-content-between" },
                                react_1["default"].createElement("div", { className: "d-flex align-items-center" },
                                    react_1["default"].createElement("div", { className: "avatar avatar-lg me-3" }, termination.employeeImage && termination.employeeImage.trim() !== '' ? (react_1["default"].createElement(imageWithBasePath_1["default"], { src: termination.employeeImage, className: "rounded-circle img-fluid", alt: displayName, isLink: true })) : (react_1["default"].createElement("div", { className: "avatar-title bg-danger-transparent rounded-circle text-danger" }, displayName.charAt(0).toUpperCase()))),
                                    react_1["default"].createElement("div", null,
                                        react_1["default"].createElement("h5", { className: "mb-1" }, displayName),
                                        react_1["default"].createElement("p", { className: "text-muted mb-0" }, termination.department || termination.departmentId || "N/A"))),
                                termination.status && (react_1["default"].createElement("div", null, (function () {
                                    var _a;
                                    var statusMap = {
                                        pending: { className: "badge badge-soft-warning", text: "Pending" },
                                        processed: { className: "badge badge-soft-success", text: "Processed" },
                                        cancelled: { className: "badge badge-soft-danger", text: "Cancelled" }
                                    };
                                    var statusInfo = statusMap[((_a = termination.status) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || ""] || {
                                        className: "badge badge-soft-secondary",
                                        text: termination.status
                                    };
                                    return react_1["default"].createElement("span", { className: statusInfo.className }, statusInfo.text);
                                })())))),
                        react_1["default"].createElement("div", { className: "col-md-12" },
                            react_1["default"].createElement("div", { className: "card bg-light-300 border-0 mb-3" },
                                react_1["default"].createElement("div", { className: "card-body" },
                                    react_1["default"].createElement("div", { className: "row" },
                                        react_1["default"].createElement("div", { className: "col-md-6 mb-3" },
                                            react_1["default"].createElement("label", { className: "form-label text-muted mb-1" }, "Employee ID"),
                                            react_1["default"].createElement("p", { className: "fw-medium mb-0" }, termination.employeeId || termination.employee_id || "N/A")),
                                        react_1["default"].createElement("div", { className: "col-md-6 mb-3" },
                                            react_1["default"].createElement("label", { className: "form-label text-muted mb-1" }, "Department"),
                                            react_1["default"].createElement("p", { className: "fw-medium mb-0" }, termination.department || termination.departmentId || "N/A")),
                                        termination.designation && (react_1["default"].createElement("div", { className: "col-md-6 mb-3" },
                                            react_1["default"].createElement("label", { className: "form-label text-muted mb-1" }, "Designation"),
                                            react_1["default"].createElement("p", { className: "fw-medium mb-0" }, designationUtils_1.resolveDesignation(termination.designation, 'N/A')))),
                                        react_1["default"].createElement("div", { className: "col-md-6 mb-3" },
                                            react_1["default"].createElement("label", { className: "form-label text-muted mb-1" }, "Termination Type"),
                                            react_1["default"].createElement("p", { className: "fw-medium mb-0" },
                                                react_1["default"].createElement("span", { className: "badge badge-soft-info" }, termination.terminationType))),
                                        react_1["default"].createElement("div", { className: "col-md-6 mb-3" },
                                            react_1["default"].createElement("label", { className: "form-label text-muted mb-1" }, "Notice Date"),
                                            react_1["default"].createElement("p", { className: "fw-medium mb-0" },
                                                react_1["default"].createElement("i", { className: "ti ti-calendar me-1 text-gray-5" }),
                                                dayjs_1["default"](termination.noticeDate).format("DD MMM YYYY"))),
                                        react_1["default"].createElement("div", { className: "col-md-6 mb-3" },
                                            react_1["default"].createElement("label", { className: "form-label text-muted mb-1" }, "Termination Date"),
                                            react_1["default"].createElement("p", { className: "fw-medium mb-0 text-danger" },
                                                react_1["default"].createElement("i", { className: "ti ti-calendar-x me-1" }),
                                                dayjs_1["default"](termination.terminationDate).format("DD MMM YYYY"))),
                                        termination.lastWorkingDate && (react_1["default"].createElement("div", { className: "col-md-6 mb-3" },
                                            react_1["default"].createElement("label", { className: "form-label text-muted mb-1" }, "Last Working Date"),
                                            react_1["default"].createElement("p", { className: "fw-medium mb-0" },
                                                react_1["default"].createElement("i", { className: "ti ti-calendar-check me-1 text-gray-5" }),
                                                dayjs_1["default"](termination.lastWorkingDate).format("DD MMM YYYY")))),
                                        termination.processedBy && (react_1["default"].createElement("div", { className: "col-md-6 mb-3" },
                                            react_1["default"].createElement("label", { className: "form-label text-muted mb-1" }, "Processed By"),
                                            react_1["default"].createElement("p", { className: "fw-medium mb-0" }, termination.processedBy))),
                                        termination.processedAt && (react_1["default"].createElement("div", { className: "col-md-6 mb-3" },
                                            react_1["default"].createElement("label", { className: "form-label text-muted mb-1" }, "Processed At"),
                                            react_1["default"].createElement("p", { className: "fw-medium mb-0" }, dayjs_1["default"](termination.processedAt).format("DD MMM YYYY")))),
                                        termination.reason && (react_1["default"].createElement("div", { className: "col-md-12 mb-0" },
                                            react_1["default"].createElement("label", { className: "form-label text-muted mb-1" }, "Reason"),
                                            react_1["default"].createElement("p", { className: "mb-0" }, termination.reason))))))))),
                react_1["default"].createElement("div", { className: "modal-footer" },
                    react_1["default"].createElement("button", { type: "button", className: "btn btn-primary", "data-bs-dismiss": "modal" }, "Close"))))));
};
exports["default"] = TerminationDetailsModal;
