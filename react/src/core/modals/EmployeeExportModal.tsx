import React, { useEffect, useMemo, useState } from "react";
import { message } from "antd";
import { apiClient } from "../../services/api";

type ExportFormat = "pdf" | "excel";
type ExportMode = "single" | "multiple";

interface ExportEmployeeOption {
  _id: string;
  employeeId?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  status?: string;
}

interface EmployeeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  defaultEmployeeId?: string;
  defaultFormat?: ExportFormat;
}

const buildEmployeeName = (employee: ExportEmployeeOption): string => {
  const fullName = employee.fullName?.trim();
  if (fullName) return fullName;

  const fallback = [employee.firstName, employee.lastName].filter(Boolean).join(" ").trim();
  return fallback || "Unknown";
};

const sanitizeText = (value?: string): string => {
  if (!value) return "-";
  const trimmed = value.trim();
  return trimmed || "-";
};

const sanitizeFileNamePart = (value?: string): string => {
  if (!value) return "employee";
  const normalized = value
    .trim()
    .replace(/[^a-zA-Z0-9\s_-]/g, "")
    .replace(/\s+/g, "_");
  return normalized || "employee";
};

const parseBlobErrorMessage = async (error: any, fallback: string): Promise<string> => {
  try {
    const blob = error?.response?.data;
    if (blob instanceof Blob && blob.type?.includes("application/json")) {
      const text = await blob.text();
      const parsed = JSON.parse(text);
      return parsed?.error?.message || parsed?.message || fallback;
    }
  } catch {
    // Ignore blob parsing errors and fallback to standard extraction.
  }

  return error?.response?.data?.error?.message || error?.message || fallback;
};

const EmployeeExportModal: React.FC<EmployeeExportModalProps> = ({
  isOpen,
  onClose,
  title = "Export Employee Data",
  defaultEmployeeId,
  defaultFormat = "pdf",
}) => {
  const [format, setFormat] = useState<ExportFormat>(defaultFormat);
  const [mode, setMode] = useState<ExportMode>(defaultEmployeeId ? "single" : "multiple");
  const [searchTerm, setSearchTerm] = useState("");
  const [employees, setEmployees] = useState<ExportEmployeeOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    defaultEmployeeId ? [defaultEmployeeId] : []
  );
  const [loadingResults, setLoadingResults] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setFormat(defaultFormat);
    setMode(defaultEmployeeId ? "single" : "multiple");
    setSelectedIds(defaultEmployeeId ? [defaultEmployeeId] : []);
    setSearchTerm("");
  }, [isOpen, defaultEmployeeId, defaultFormat]);

  useEffect(() => {
    if (!isOpen) return;

    const timeoutId = window.setTimeout(async () => {
      try {
        setLoadingResults(true);
        const response = await apiClient.get("/employees/active-list", {
          params: {
            ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
            includeInactive: true,
            includeDeleted: true,
          },
        });

        const records: ExportEmployeeOption[] = response?.data?.data || [];
        setEmployees(records);
      } catch (error: any) {
        const errorMessage =
          error?.response?.data?.error?.message ||
          error?.message ||
          "Unable to load employees for export";
        message.error(errorMessage);
      } finally {
        setLoadingResults(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isOpen, searchTerm]);

  const canExport = useMemo(() => {
    if (mode === "single") {
      return selectedIds.length === 1;
    }
    return selectedIds.length > 0;
  }, [mode, selectedIds]);

  const getSelectionKey = (employee: ExportEmployeeOption): string => {
    return employee._id || employee.employeeId || "";
  };

  const isEmployeeSelected = (employee: ExportEmployeeOption): boolean => {
    const selectionKey = getSelectionKey(employee);
    const employeeCode = employee.employeeId;
    return selectedIds.includes(selectionKey) || (employeeCode ? selectedIds.includes(employeeCode) : false);
  };

  const toggleSelection = (employee: ExportEmployeeOption) => {
    const selectionKey = getSelectionKey(employee);
    if (!selectionKey) {
      return;
    }

    if (mode === "single") {
      setSelectedIds([selectionKey]);
      return;
    }

    setSelectedIds((prev) => {
      const aliases = [selectionKey, employee.employeeId].filter(Boolean) as string[];
      const isAlreadySelected = aliases.some((alias) => prev.includes(alias));

      if (isAlreadySelected) {
        return prev.filter((id) => !aliases.includes(id));
      }

      return [...prev, selectionKey];
    });
  };

  const handleExport = async () => {
    if (!canExport) {
      message.warning(
        mode === "single"
          ? "Please select one employee"
          : "Please select at least one employee"
      );
      return;
    }

    const getDownloadName = (): string => {
      const extension = format === "pdf" ? "pdf" : "excel";
      if (mode !== "single" || selectedIds.length !== 1) {
        return `employees details.${extension}`;
      }

      const selectedId = selectedIds[0];
      const selectedEmployee = employees.find(
        (employee) => employee.employeeId === selectedId || employee._id === selectedId
      );

      const namePart = sanitizeFileNamePart(
        selectedEmployee ? buildEmployeeName(selectedEmployee) : selectedId
      );
      const idPart = sanitizeFileNamePart(selectedEmployee?.employeeId || selectedId);

      return `${namePart}_${idPart}.${extension}`;
    };

    const downloadBlob = (response: any) => {
      const contentType =
        response?.headers?.["content-type"] ||
        (format === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = getDownloadName();
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    };

    try {
      setExporting(true);
      let response: any;
      const uniqueSelectedIds = Array.from(new Set(selectedIds.filter(Boolean)));

      try {
        response = await apiClient.post(
          "/employees/export",
          {
            format,
            exportMode: mode,
            employeeIds: uniqueSelectedIds,
            logoMode: "company",
          },
          {
            responseType: "blob",
          }
        );
      } catch (postError: any) {
        // Backward compatibility for environments that only expose GET /employees/export.
        if (postError?.response?.status === 404) {
          response = await apiClient.get("/employees/export", {
            params: {
              type: format,
              employeeIds: uniqueSelectedIds.join(","),
            },
            responseType: "blob",
          });
        } else {
          throw postError;
        }
      }

      downloadBlob(response);

      message.success(`Employee ${format === "pdf" ? "PDF" : "Excel"} exported successfully`);
      onClose();
    } catch (error: any) {
      const errorMessage = await parseBlobErrorMessage(error, "Failed to export employee data");
      message.error(errorMessage);
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div className="modal fade show" style={{ display: "block" }} tabIndex={-1} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label fw-semibold">Export Format</label>
                <div className="d-flex gap-4">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      id="export-format-pdf"
                      checked={format === "pdf"}
                      onChange={() => setFormat("pdf")}
                    />
                    <label className="form-check-label" htmlFor="export-format-pdf">
                      PDF
                    </label>
                  </div>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      id="export-format-excel"
                      checked={format === "excel"}
                      onChange={() => setFormat("excel")}
                    />
                    <label className="form-check-label" htmlFor="export-format-excel">
                      Excel
                    </label>
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">Export Mode</label>
                <div className="d-flex gap-4">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      id="export-mode-single"
                      checked={mode === "single"}
                      onChange={() => {
                        setMode("single");
                        if (selectedIds.length > 1) {
                          setSelectedIds(selectedIds.slice(0, 1));
                        }
                      }}
                    />
                    <label className="form-check-label" htmlFor="export-mode-single">
                      Single Employee
                    </label>
                  </div>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      id="export-mode-multiple"
                      checked={mode === "multiple"}
                      onChange={() => setMode("multiple")}
                    />
                    <label className="form-check-label" htmlFor="export-mode-multiple">
                      Multiple Employees
                    </label>
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">Search Employee</label>
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="ti ti-search" />
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by Name / Emp ID / Email / Phone"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </div>
              </div>

              <div className="border rounded p-2" style={{ maxHeight: 320, overflowY: "auto" }}>
                {loadingResults ? (
                  <div className="text-center py-3">Loading employees...</div>
                ) : employees.length === 0 ? (
                  <div className="text-center py-3 text-muted">No employees found</div>
                ) : (
                  employees.map((employee) => {
                    const selectionId = getSelectionKey(employee);
                    const isChecked = isEmployeeSelected(employee);

                    return (
                      <label
                        key={employee._id || selectionId}
                        className="d-flex align-items-start gap-2 py-2 px-1 border-bottom"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelection(employee)}
                        />
                        <div>
                          <div className="fw-medium">
                            {sanitizeText(employee.employeeId || employee._id)} - {buildEmployeeName(employee)}
                          </div>
                          <div className="text-muted fs-12">
                            {sanitizeText(employee.email)} | {sanitizeText(employee.phone)} | {sanitizeText(employee.status)}
                          </div>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-light" onClick={onClose} disabled={exporting}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleExport}
                disabled={exporting || !canExport}
              >
                {exporting ? "Generating..." : "Export"}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  );
};

export default EmployeeExportModal;
