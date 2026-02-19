import { DeleteOutlined } from "@ant-design/icons";
import { DatePicker, Input, Modal, Select } from "antd";
import dayjs from "dayjs";
import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Socket } from "socket.io-client";
import CollapseHeader from "../../core/common/collapse-header/collapse-header";
import CommonSelect from '../../core/common/commonSelect';
import Table from "../../core/common/dataTable/index";
import ImageWithBasePath from "../../core/common/imageWithBasePath";
import { useSocket } from "../../SocketContext";
import { all_routes } from "../router/all_routes";

type TrainingRow = {
  trainingType: string;
  trainer: string;
  trainerProfileImage?: string;
  employee: string [];
  startDate: string;
  endDate: string;
  timeDuration: string;
  desc: string;
  cost: string;
  status: string;
  trainingId: string;
};

type TrainingTypesRow = {
  trainingType: string;
  desc: string;
  status: string;
  typeId: string;
};

type TrainersRow = {
  trainer: string;
  phone: string;
  email: string;
  desc: string;
  status: string;
  trainerId: string;
};

type EmployeeRow = {
  employeeId: string;
  firstName: string;
  lastName: string;
};

type Stats = {
  totalTrainingList: string;
};

type EmpLite = {
  employeeId: string;
  firstName: string;
  lastName: string;
  trainer?: string
};

const TrainingList = () => {

    const socket = useSocket() as Socket | null;
    const [rowsType, setRowsType] = useState<TrainingTypesRow[]>([]);
    const [rows, setRows] = useState<TrainingRow[]>([]);
    const [rowsTrainer, setRowsTrainer] = useState<TrainersRow[]>([]);
    const [rowsEmployee, setRowsEmployee] = useState<EmployeeRow[]>([]);
    const [stats, setStats] = useState<Stats>({ totalTrainingList: "0",});
    const [loading, setLoading] = useState<boolean>(true);
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
    const [filterType, setFilterType] = useState<string>("alltime");
    const [editing, setEditing] = useState<any>(null);
    const [customRange, setCustomRange] = useState<{ startDate?: string; endDate?: string }>({});
    const [empPopupOpen, setEmpPopupOpen] = useState(false);
    const [empPopupTrainer, setEmpPopupTrainer] = useState<string>("");
    const [empPopupList, setEmpPopupList] = useState<EmpLite[]>([]);
    const [empPopupQuery, setEmpPopupQuery] = useState("");

    // Validation errors for Add Training form
    const [addFormErrors, setAddFormErrors] = useState<{
      trainingType?: string;
      trainer?: string;
      employee?: string;
      startDate?: string;
      endDate?: string;
      desc?: string;
      status?: string;
    }>({});

    const [editForm, setEditForm] = useState({
      trainingType: "",
      trainer: "",
      employee: [],
      startDate: "",
      endDate: "",
      desc: "",
      cost: "",
      status: "Active",
      trainingId: "",
    });

    const openEditModal = (row: any) => {
      // Convert ISO dates back to DD-MM-YYYY format if they exist
      const formatISOtoDD_MM_YYYY = (isoDate: string) => {
        if (!isoDate) return "";
        const date = new Date(isoDate);
        const day = String(date.getUTCDate()).padStart(2, "0");
        const month = String(date.getUTCMonth() + 1).padStart(2, "0");
        const year = date.getUTCFullYear();
        return `${day}-${month}-${year}`;
      };

      setEditForm({
          trainingType: row.trainingType || "",
          trainer: row.trainer || "",
          employee: row.employee || [],
          startDate: formatISOtoDD_MM_YYYY(row.startDate),
          endDate: formatISOtoDD_MM_YYYY(row.endDate),
          desc: row.desc || "",
          cost: row.cost || "",
          status: row.status || "Active",
          trainingId: row.trainingId,
      });
    };

    const getModalContainer = () => {
      const modalElement = document.getElementById("modal-datepicker");
      return modalElement ? modalElement : document.body;
    };

    const [addForm, setAddForm] = useState({
      trainingType: "",
      trainer: "",
      employee: [],
      startDate: "",
      endDate: "",
      desc: "",
      cost: "",
      status: "Active",
    });

    const resetAddForm = () => {
      setAddForm({
        trainingType: "",
        trainer: "",
        employee: [],
        startDate: "",
        endDate: "",
        desc: "",
        cost: "",
        status: "Active",
      });
      setAddFormErrors({});
    };

    const resetEditForm = () => {
      setEditForm({
        trainingType: "",
        trainer: "",
        employee: [],
        startDate: "",
        endDate: "",
        desc: "",
        cost: "",
        status: "Active",
        trainingId: "",
      });
    };

    const confirmDelete = (onConfirm: () => void) => {
      Modal.confirm({
        title: null,
        icon: null,
        closable: true,
        centered: true,
        okText: "Yes, Delete",
        cancelText: "Cancel",
        okButtonProps: { style: { background: "#ff4d4f", borderColor: "#ff4d4f" } },
        cancelButtonProps: { style: { background: "#f5f5f5" } },
        content: (
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: 56,
                height: 56,
                margin: "0 auto 12px",
                borderRadius: 12,
                background: "#ffecec",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <a aria-label="Delete">
                <DeleteOutlined style={{ fontSize: 18, color: "#ff4d4f" }} />
              </a>
            </div>
            <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 8 }}>
              Confirm Delete
            </div>
            <div style={{ color: "#6b7280" }}>
              You want to delete all the marked items, this can’t be undone once you delete.
            </div>
          </div>
        ),
        onOk: async () => {
          await onConfirm();
        },
      });
    };

    const onListResponse = useCallback((res: any) => {
      if (res?.done) {
        console.log("📥 Training list received:", res.data);
        setRows(res.data || []);
      } else {
        console.error("❌ Failed to fetch training list:", res);
        setRows([]);
      }
      setLoading(false);
    }, []);

  const onTypeListResponse = useCallback((res: any) => {
    if (res?.done) {
      setRowsType(res.data || []);
    } else {
      setRowsType([]);
      // optionally toast error
      // toast.error(res?.message || "Failed to fetch trainingTypess");
    }
    setLoading(false);
  }, []);

    const onTrainersListResponse = useCallback((res: any) => {
      if (res?.done) {
        setRowsTrainer(res.data || []);
      } else {
        setRowsTrainer([]);
      }
      setLoading(false);
    }, []);

    const onEmployeeListResponse = useCallback ((res:any) => {
      if (res?.done) {
        setRowsEmployee(res.data || []);
      } else {
        setRowsEmployee([]);
      }
      setLoading(false);
    },[]);

    const onStatsResponse = useCallback((res: any) => {
      if (res?.done && res.data) {
        setStats(res.data);
      }
    }, []);

    const onAddResponse = useCallback((res: any) => {
      // feedback only; list and stats will be broadcast from controller
      if (res?.done) {
        console.log("✅ Training added successfully:", res);
        // Optional: Show success toast
        // toast.success("Training added successfully");
      } else {
        console.error("❌ Failed to add training:", res);
        // toast.error(res?.message || "Failed to add training");
      }
    }, []);

    const onUpdateResponse = useCallback((res: any) => {
      if (res?.done) {
        console.log("✅ Training updated successfully:", res);
        // Optional: Show success toast
        // toast.success("Training updated successfully");
      } else {
        console.error("❌ Failed to update training:", res);
        // toast.error(res?.message || "Failed to update training");
      }
    }, []);

    const onDeleteResponse = useCallback((res: any) => {
      if (res?.done) {
        setSelectedKeys([]);
      } else {
        // toast.error(res?.message || "Failed to delete");
      }
    }, []);

    useEffect(() => {
      if (!socket) return;

      socket.emit("join-room", "hr_room");

      socket.on("hr/trainingList/trainingListlist-response", onListResponse);
      socket.on("hr/trainingList/trainingList-details-response", onStatsResponse);
      socket.on("hr/trainingList/add-trainingList-response", onAddResponse);
      socket.on("hr/trainingList/update-trainingList-response", onUpdateResponse);
      socket.on("hr/trainingList/delete-trainingList-response", onDeleteResponse);
      socket.on("hr/trainingTypes/trainingTypeslist-response", onTypeListResponse);
      socket.on("hr/trainers/trainerslist-response", onTrainersListResponse);
      socket.on("hr/trainingList/get-employeeDetails-response", onEmployeeListResponse);

      return () => {
        socket.off("hr/trainingList/trainingListlist-response", onListResponse);
        socket.off("hr/trainingList/trainingList-details-response", onStatsResponse);
        socket.off("hr/trainingList/add-trainingList-response", onAddResponse);
        socket.off("hr/trainingList/update-trainingList-response", onUpdateResponse);
        socket.off("hr/trainingList/delete-trainingList-response", onDeleteResponse);
        socket.off("hr/trainingTypes/trainingTypeslist-response", onTypeListResponse);
        socket.off("hr/trainers/trainerslist-response", onTrainersListResponse);
        socket.off("hr/trainingList/get-employeeDetails-response", onEmployeeListResponse);
      };
    }, [socket, onListResponse, onStatsResponse, onAddResponse, onUpdateResponse, onDeleteResponse, onTypeListResponse, onTrainersListResponse, onEmployeeListResponse]);

    const fetchList = useCallback(
      (type: string, range?: { startDate?: string; endDate?: string }) => {
        if (!socket) return;
        setLoading(true);
        const payload: any = { type };
        if (type === "custom" && range?.startDate && range?.endDate) {
          payload.startDate = range.startDate;
          payload.endDate = range.endDate;
        }
        socket.emit("hr/trainingList/trainingListlist", payload);
      },
      [socket]
    );

    const fetchTypeList = useCallback(
      (type: string, range?: { startDate?: string; endDate?: string }) => {
        if (!socket) return;
        setLoading(true);
        const payload= "all time";
        socket.emit("hr/trainingTypes/trainingTypeslist", payload);
      },
      [socket]
    );

    const fetchTrainersList = useCallback(
      (type: string, range?: { startDate?: string; endDate?: string }) => {
        if (!socket) return;
        setLoading(true);
        const payload= "all time";
        socket.emit("hr/trainers/trainerslist", payload);
      },
      [socket]
    );

    const fetchEmployeeList = useCallback(() => {
        if (!socket) return;
        setLoading(true);
        socket.emit("hr/trainingList/get-employeeDetails");
      },
      [socket]
    );

      const toIsoFromDDMMYYYY = (s: string) => {
        // s like "13-09-2025"
          const [dd, mm, yyyy] = s.split("-").map(Number);
          if (!dd || !mm || !yyyy) return null;
        // Construct UTC date to avoid TZ shifts
          const d = new Date(Date.UTC(yyyy, mm - 1, dd, 0, 0, 0));
          return isNaN(d.getTime()) ? null : d.toISOString();
        };

    const fmtYMD = (s: string) :string => {
      const [dd, mm, yyyy] = s.split("-").map(Number);
      const d = new Date(Date.UTC(yyyy, (mm ?? 1) - 1, dd ?? 1));
      const parts = new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC'
      }).formatToParts(d);
      const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
      // Some locales include commas; rebuild explicitly as "16 Jan 2026"
      return `${get('day')} ${get('month')} ${get('year')}`;
    };

    // Validate Add Training form
    const validateAddForm = () => {
      const errors: typeof addFormErrors = {};

      if (!addForm.trainingType || !addForm.trainingType.trim()) {
        errors.trainingType = "Training type is required";
      }

      if (!addForm.trainer || !addForm.trainer.trim()) {
        errors.trainer = "Trainer is required";
      }

      if (!addForm.employee || addForm.employee.length === 0) {
        errors.employee = "At least one employee is required";
      }

      if (!addForm.startDate || !addForm.startDate.trim()) {
        errors.startDate = "Start date is required";
      } else if (!/^\d{2}-\d{2}-\d{4}$/.test(addForm.startDate)) {
        errors.startDate = "Invalid date format. Use DD-MM-YYYY";
      }

      if (!addForm.endDate || !addForm.endDate.trim()) {
        errors.endDate = "End date is required";
      } else if (!/^\d{2}-\d{2}-\d{4}$/.test(addForm.endDate)) {
        errors.endDate = "Invalid date format. Use DD-MM-YYYY";
      } else if (addForm.startDate && addForm.endDate) {
        // Check if end date is before start date
        const startIso = toIsoFromDDMMYYYY(addForm.startDate);
        const endIso = toIsoFromDDMMYYYY(addForm.endDate);
        if (startIso && endIso && new Date(endIso) < new Date(startIso)) {
          errors.endDate = "End date must be after start date";
        }
      }

      if (!addForm.desc || !addForm.desc.trim()) {
        errors.desc = "Description is required";
      }

      if (!addForm.status || !addForm.status.trim()) {
        errors.status = "Status is required";
      }

      setAddFormErrors(errors);
      return Object.keys(errors).length === 0;
    };

    // Clear individual field error
    const clearAddFormError = (fieldName: string) => {
      if (addFormErrors[fieldName as keyof typeof addFormErrors]) {
        setAddFormErrors({
          ...addFormErrors,
          [fieldName]: undefined
        });
      }
    };

    const handleAddSave = () => {
        if (!socket) return;

        // Validate form
        if (!validateAddForm()) {
          console.warn("⚠️ Validation failed: Please check all required fields");
          return;
        }

      console.log("📤 Submitting training data:", addForm);

      const startIso = toIsoFromDDMMYYYY(addForm.startDate);
      const endIso = toIsoFromDDMMYYYY(addForm.endDate);

      if (!startIso || !endIso) {
        console.error("❌ Invalid date format");
        // toast.error("Invalid date format. Please use DD-MM-YYYY");
        return;
      }

      const startfmt= fmtYMD(addForm.startDate);
      const endfmt = fmtYMD(addForm.endDate);
      const timeDurationfmt= startfmt+" - "+endfmt;

      const payload = {
          trainingType: addForm.trainingType,
          trainer: addForm.trainer,
          employee: addForm.employee,
          startDate: startIso,
          endDate: endIso,
          timeDuration: timeDurationfmt,
          desc: addForm.desc,
          cost: addForm.cost,
          status: addForm.status as "Active" | "Inactive",
      };

      console.log("📤 Payload being sent:", payload);

      socket.emit("hr/trainingList/add-trainingList", payload);

      // Close modal programmatically
      const modal = document.getElementById('new_training');
      const modalInstance = (window as any).bootstrap?.Modal?.getInstance(modal);
      if (modalInstance) {
        modalInstance.hide();
      }

      // Reset form after submission
      resetAddForm();
    };

    const handleEditSave = () => {
        if (!socket) return;

      // basic validation
        if (!editForm.trainingType || !editForm.trainer || !editForm.employee || !editForm.startDate || !editForm.endDate || !editForm.desc || !editForm.cost || !editForm.status || !editForm.trainingId) {
        console.warn("⚠️ Validation failed: Missing required fields");
        // toast.warn("Please fill required fields");
          return;
      }

      console.log("📤 Updating training data:", editForm);

      const startiso=toIsoFromDDMMYYYY(editForm.startDate);
      const endiso=toIsoFromDDMMYYYY(editForm.endDate);

      if (!startiso || !endiso) {
        console.error("❌ Invalid date format");
        // toast.error("Invalid date format. Please use DD-MM-YYYY");
        return;
      }

      const startfmt = fmtYMD(editForm.startDate);
      const endfmt = fmtYMD(editForm.endDate);

      const timeDurationfmt= startfmt+" - "+endfmt;

      const payload = {
          trainingType: editForm.trainingType,
          trainer: editForm.trainer,
          employee: editForm.employee,
          startDate: startiso,
          endDate: endiso,
          timeDuration: timeDurationfmt,
          desc: editForm.desc,
          cost: editForm.cost,
          status: editForm.status as "Active" | "Inactive",
          trainingId: editForm.trainingId,
      };

      console.log("📤 Update payload being sent:", payload);

      socket.emit("hr/trainingList/update-trainingList", payload);

      // Close modal programmatically
      const modal = document.getElementById('edit_training');
      const modalInstance = (window as any).bootstrap?.Modal?.getInstance(modal);
      if (modalInstance) {
        modalInstance.hide();
      }

      // Reset form after submission
      resetEditForm();
    };

    const fetchStats = useCallback(() => {
      if (!socket) return;
      socket.emit("hr/trainingList/trainingList-details");
    }, [socket]);

    useEffect(() => {
      if (!socket) return;
      fetchList(filterType, customRange);
      fetchTypeList(filterType, customRange);
      fetchTrainersList(filterType,customRange);
      fetchEmployeeList();
      fetchStats();
    }, [socket, fetchList, fetchTypeList, fetchTrainersList, fetchEmployeeList, fetchStats, filterType, customRange]);

    type Option = { value: string; label: string };

    const handleFilterChange = (opt: Option | null) => {
      const value = opt?.value ?? "alltime";
      setFilterType(value);
      if (value !== "custom") {
        setCustomRange({});
        fetchList(value);
      }
    };

    type OptionTypes = { value: string; label: string };

    const trainingTypeOptions: OptionTypes[] = (rowsType as any[]).map((t: any) => ({
      value: t.trainingType,
      label: t.trainingType,
    }));

    // Helper to find option object from string value
    const toOption = (val: string | undefined) =>
      val ? trainingTypeOptions.find(o => o.value === val) : undefined;

    type OptionTrainer = { value: string; label: string };

    const trainingTrainerOptions: OptionTrainer[] = (rowsTrainer as any[]).map((t: any) => ({
      value: t.trainer,
      label: t.trainer,
    }));

    // Helper to find option object from string value
    const toOptionTrainer = (val: string | undefined) =>
      val ? trainingTrainerOptions.find(o => o.value === val) : undefined;

    type OptionEmployee = { value: string; label: string };

    const trainingEmployeeOptions: OptionEmployee[] = (rowsEmployee as any[]).map((t: any) => ({
      value: t.employeeId,
      label: t.firstName+" "+t.lastName+ " - "+t.employeeId,
    }));


    const handleCustomRange = (_: any, dateStrings: [string, string]) => {
      if (dateStrings && dateStrings[0] && dateStrings[1]) {
        const range = { startDate: dateStrings[0], endDate: dateStrings[1] };
        setCustomRange(range);
        fetchList("custom", range);
      }
    };

    const handleBulkDelete = () => {
      if (!socket || selectedKeys.length === 0) return;
      if (window.confirm(`Delete ${selectedKeys.length} record(s)? This cannot be undone.`)) {
        socket.emit("hr/trainingList/delete-trainingList", selectedKeys);
      }
    };

    const handleSelectionChange = (keys: React.Key[]) => {
      setSelectedKeys(keys as string[]);
    };

    const getModalContainerEmp = () =>
        document.getElementById("new_training") || document.body;

    const empNameById = React.useMemo(() => {
      const m = new Map<string, string>();
      rowsEmployee.forEach(e => {
        const name = [e.firstName, e.lastName].filter(Boolean).join(" ");
        m.set(e.employeeId, name || e.employeeId);
      });
      return m;
    }, [rowsEmployee]);

    const filteredEmpPopup = React.useMemo(() => {
      const q = empPopupQuery.trim().toLowerCase();
      if (!q) return empPopupList;
      return empPopupList.filter(e => {
        const name = [e.firstName, e.lastName].join(" ").toLowerCase();
        return e.employeeId.toLowerCase().includes(q) || name.includes(q);
      });
    }, [empPopupList, empPopupQuery]);

  const routes = all_routes;
  const columns = [
    {
      title: "Training Type",
      dataIndex: "trainingType",
      sorter: (a: TrainingRow, b: TrainingRow) => a.trainingType.localeCompare(b.trainingType),
    },
    {
      title: "Trainer",
      dataIndex: "trainer",
      render: (text: string, record: any) => (
        <div className="d-flex align-items-center file-name-icon">
          <Link to="#" className="avatar avatar-md border avatar-rounded">
            <ImageWithBasePath
              src={record.trainerProfileImage || "assets/img/profiles/avatar-14.jpg"}
              className="img-fluid"
              alt="img"
            />
          </Link>
          <div className="ms-2">
            <h6 className="fw-medium">
              <Link to="#">{text}</Link>
            </h6>
          </div>
        </div>
      ),
      sorter: (a: TrainingRow, b: TrainingRow) => a.trainer.localeCompare(b.trainer),
    },
    {
      title: "Employee",
      dataIndex: "employee",
      render: (text: string[] | string, record: any) => {
          const ids = Array.isArray(record.employee) ? record.employee : [];
          const max = 4;
          const visible = ids.slice(0, max);
          const extra = ids.length - visible.length;

          const handleOpenEmpPopup = () => {
            // Build employee list for this trainer: map ids -> rowsEmployee info
            const list: EmpLite[] = ids.map(id => {
              const full = rowsEmployee.find(e => e.employeeId === id);
              return {
                employeeId: id,
                firstName: full?.firstName || "",
                lastName: full?.lastName || "",
              };
            });
            setEmpPopupTrainer(record.trainer || "");
            setEmpPopupList(list);
            setEmpPopupQuery("");
            setEmpPopupOpen(true);
          };
          return (
      <div className="d-flex align-items-center file-name-icon">
        {visible.map((empId) => {
          const name = empNameById.get(empId) || empId;
          return (
                <a
                  key={empId}
                  href="#"
                  className="avatar avatar-md border avatar-rounded me-1"
                  onClick={(e) => {
                    e.preventDefault();
                    handleOpenEmpPopup();
                  }}
                  aria-label={name}
                  title={name}
                >
                  <ImageWithBasePath
                    src={"assets/img/favicon.png"}
                    className="img-fluid"
                    alt={name}
                  />
                </a>
              );
            })}
            {extra > 0 && (
              <a
                href="#"
                className="avatar avatar-md border avatar-rounded me-1"
                onClick={(e) => {
                  e.preventDefault();
                  handleOpenEmpPopup();
                }}
                aria-label={`+${extra}`}
                title={`+${extra}`}
                style={{
                  backgroundColor: "#e5e7eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#374151",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                +{extra}
              </a>
            )}
          </div>
        );
      },
    },
    {
      title: "Time Duration",
      dataIndex: "timeDuration",
      sorter: (a: TrainingRow, b: TrainingRow) => a.timeDuration.localeCompare(b.timeDuration),
    },
    {
      title: "Description",
      dataIndex: "desc",
      sorter: (a: TrainingRow, b: TrainingRow) => a.desc.localeCompare(b.desc),
    },
    {
      title: "Cost",
      dataIndex: "cost",
      sorter: (a: TrainingRow, b: TrainingRow) => a.desc.localeCompare(b.desc),
    },
    {
      title: "Status",
      dataIndex: "status",
      filters: [
          { text: "Active", value: "Active" },
          { text: "Inactive", value: "Inactive" },
        ],
        render: (text: string) => {
        const isActive = text === "Active";
        const cls = `badge ${isActive ? "badge-success" : "badge-danger"} d-inline-flex align-items-center badge-xs`;
        return (
          <span className={cls}>
          <i className="ti ti-point-filled me-1" />
           {text}
          </span>
        );
        },
      onFilter: (val: any, rec: any) => rec.status === val,
      sorter: (a: TrainingRow, b: TrainingRow) => a.status.localeCompare(b.status),
    },
    {
      title: "",
      dataIndex: "trainingId",
      render: (id: string, record: TrainingRow) => (
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <a href="#"
              data-bs-toggle="modal"
              data-bs-target="#edit_training"
              onClick={(e) => {
                // still prefill the form before Bootstrap opens it
                openEditModal(record);
              }}>
                <i className="ti ti-edit" />
              </a>
            <a
              aria-label="Delete"
              onClick={(e) => {
                e.preventDefault();
                confirmDelete(() =>
                  socket?.emit("hr/trainingList/delete-trainingList", [record.trainingId]));
              }}
            >
              <i className="ti ti-trash" />
            </a>
          </div>
        ),
    },
  ];
  return (
    <>
      {/* Page Wrapper */}
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Training</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">HR</li>
                  <li className="breadcrumb-item">Training</li>
                  <li className="breadcrumb-item">Training List</li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
              <div className="mb-2">
                <Link
                  to="#"
                  data-bs-toggle="modal"
                  data-bs-target="#new_training"
                  className="btn btn-primary d-flex align-items-center"
                >
                  <i className="ti ti-circle-plus me-2" />
                  Add Training
                </Link>
              </div>
              <div className="head-icons ms-2">
                <CollapseHeader />
              </div>
            </div>
          </div>
          {/* /Breadcrumb */}
          {/* Performance Indicator list */}
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
              <h5>Training List</h5>
              <div className="d-flex my-xl-auto right-content align-items-center flex-wrap row-gap-3">
                <div className="dropdown">
                  <Link
                        to="#"
                        className="d-inline-flex align-items-center fs-12"
                      >
                        <label className="fs-12 d-inline-flex me-1">Sort By : </label>
                        <CommonSelect
                          className="select"
                          options={[
                            { value: "today", label: "Today" },
                            { value: "yesterday", label: "Yesterday" },
                            { value: "last7days", label: "Last 7 Days" },
                            { value: "last30days", label: "Last 30 Days" },
                            { value: "thismonth", label: "This Month" },
                            { value: "lastmonth", label: "Last Month" },
                            { value: "thisyear", label: "This Year" },
                          ]}
                          defaultValue={filterType}
                          onChange={handleFilterChange}
                        />
                    </Link>
                </div>
              </div>
            </div>
            <div className="card-body p-0">
              <Table dataSource={rows} columns={columns} Selection={true} />
            </div>
          </div>
          {/* /Performance Indicator list */}
        </div>
        {/* Footer */}
                <div className="footer d-sm-flex align-items-center justify-content-between bg-white border-top p-3">
                  <p className="mb-0">2026 © amasQIS.ai</p>
                  <p>
                    Designed &amp; Developed By{" "}
                    <Link to="amasqis.ai" className="text-primary">
                      amasQIS.ai
                    </Link>
                  </p>
                </div>
                {/* /Footer */}
      </div>
      {/* /Page Wrapper */}
      {/* Add Training */}
        <div className="modal fade" id="new_training">
          <div className="modal-dialog modal-dialog-centered modal-md">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">Add Training</h4>
                <button
                  type="button"
                  className="btn-close custom-btn-close"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                  onClick={resetAddForm}
                >
                  <i className="ti ti-x" />
                </button>
              </div>
              <form>
                <div className="modal-body pb-0">
                  <div className="row g-4">
                        <div className="col-md-6">
                          <div className="mb-0">
                            <label className="form-label">
                              Training Type <span className="text-danger">*</span>
                            </label>
                            <CommonSelect
                              className="select"
                              defaultValue={toOption(addForm.trainingType)}
                              onChange={(opt: OptionTypes | null) => {
                                setAddForm({ ...addForm, trainingType: typeof opt === "string" ? opt : (opt?.value ?? "") });
                                clearAddFormError('trainingType');
                              }}
                              options={trainingTypeOptions}
                            />
                            {addFormErrors.trainingType && (
                              <div className="text-danger mt-1" style={{ fontSize: '12px' }}>
                                {addFormErrors.trainingType}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-0">
                            <label className="form-label">
                              Trainer <span className="text-danger">*</span>
                            </label>
                            <CommonSelect
                              className="select"
                              defaultValue={toOptionTrainer(addForm.trainer)}
                              onChange={(opt: OptionTrainer | null) => {
                                setAddForm({ ...addForm, trainer: typeof opt === "string" ? opt : (opt?.value ?? "") });
                                clearAddFormError('trainer');
                              }}
                              options={trainingTrainerOptions}
                            />
                            {addFormErrors.trainer && (
                              <div className="text-danger mt-1" style={{ fontSize: '12px' }}>
                                {addFormErrors.trainer}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-0">
                            <label className="form-label">
                              Employee <span className="text-danger">*</span>
                            </label>
                            <Select
                              className="select"
                              mode="multiple"
                              style={{width:'100%'}}
                              showSearch
                              optionFilterProp="label"
                              listHeight={256}
                              defaultValue={addForm.employee} // string[]
                              options={trainingEmployeeOptions} // OptionEmployee[]
                              onChange={(vals: string[]) => {
                                setAddForm({ ...addForm, employee: vals });
                                clearAddFormError('employee');
                              }}
                              getPopupContainer={getModalContainerEmp}  // render dropdown inside modal
                              dropdownStyle={{ zIndex: 2000 }}
                              placeholder="Select employees"
                            />
                            {addFormErrors.employee && (
                              <div className="text-danger mt-1" style={{ fontSize: '12px' }}>
                                {addFormErrors.employee}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-0">
                            <label className="form-label">
                              Training Cost <span className="text-muted">(Optional)</span>
                            </label>
                            <textarea
                              className="form-control"
                              rows={1} value={addForm.cost} onChange ={(e) => setAddForm({ ...addForm, cost: e.target.value})}
                            />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-0">
                            <label className="form-label">
                              Start Date <span className="text-danger">*</span>
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
                                onChange={(_, dateString) => {
                                  setAddForm({ ...addForm, startDate: dateString as string });
                                  clearAddFormError('startDate');
                                }}
                              />
                              <span className="input-icon-addon">
                                <i className="ti ti-calendar text-gray-7" />
                              </span>
                            </div>
                            {addFormErrors.startDate && (
                              <div className="text-danger mt-1" style={{ fontSize: '12px' }}>
                                {addFormErrors.startDate}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-0">
                            <label className="form-label">
                              End Date <span className="text-danger">*</span>
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
                                onChange={(_, dateString) => {
                                  setAddForm({ ...addForm, endDate: dateString as string });
                                  clearAddFormError('endDate');
                                }}
                              />
                              <span className="input-icon-addon">
                                <i className="ti ti-calendar text-gray-7" />
                              </span>
                            </div>
                            {addFormErrors.endDate && (
                              <div className="text-danger mt-1" style={{ fontSize: '12px' }}>
                                {addFormErrors.endDate}
                              </div>
                            )}
                          </div>
                      </div>

                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">
                          Description <span className="text-danger">*</span>
                        </label>
                        <textarea
                          className="form-control"
                          rows={2}
                          value={addForm.desc}
                          onChange={(e) => {
                            setAddForm({ ...addForm, desc: e.target.value});
                            clearAddFormError('desc');
                          }}
                        />
                        {addFormErrors.desc && (
                          <div className="text-danger mt-1" style={{ fontSize: '12px' }}>
                            {addFormErrors.desc}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">Status <span className="text-danger">*</span></label>
                        <CommonSelect
                          className="select"
                          options={[
                            { value: "Active", label: "Active" },
                            { value: "Inactive", label: "Inactive" },
                            ]}
                          defaultValue={addForm.status}
                          onChange={(opt: { value: string } | null) => {
                            setAddForm({ ...addForm, status: opt?.value ?? "Active" });
                            clearAddFormError('status');
                          }}
                        />
                        {addFormErrors.status && (
                          <div className="text-danger mt-1" style={{ fontSize: '12px' }}>
                            {addFormErrors.status}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-white border me-2"
                    data-bs-dismiss="modal"
                    onClick={resetAddForm}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleAddSave}
                  >
                    Add Training
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        {/* /Add Trainer */}
        {/* Edit Trainer */}
        <div className="modal fade" id="edit_training">
          <div className="modal-dialog modal-dialog-centered modal-md">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">Edit Training</h4>
                <button
                  type="button"
                  className="btn-close custom-btn-close"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                  onClick={resetEditForm}
                >
                  <i className="ti ti-x" />
                </button>
              </div>
              <form>
                <div className="modal-body pb-0">
                  <div className="row g-4">
                        <div className="col-md-6">
                          <div className="mb-0">
                            <label className="form-label">
                              Training Type&nbsp;
                            </label>
                            <CommonSelect
                              className="select"
                              defaultValue={toOption(editForm.trainingType)}
                              onChange={(opt: OptionTypes | null) =>setEditForm({ ...editForm, trainingType: typeof opt === "string" ? opt : (opt?.value ?? "") })}
                              options={trainingTypeOptions}
                            />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-0">
                            <label className="form-label">Trainer</label>
                            <CommonSelect
                              className="select"
                              defaultValue={toOptionTrainer(editForm.trainer)}
                              onChange={(opt: OptionTrainer | null) =>setEditForm({ ...editForm, trainer: typeof opt === "string" ? opt : (opt?.value ?? "") })}
                              options={trainingTrainerOptions}
                            />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-0">
                            <label className="form-label">Employee</label>
                            <Select
                              className="select"
                              mode="multiple"
                              style={{width:'100%'}}
                              showSearch
                              optionFilterProp="label"
                              listHeight={256}
                              options={trainingEmployeeOptions}                // [{value, label}]
                              value={editForm.employee}                        // string[] of employeeIds
                              onChange={(vals: string[]) =>
                                setEditForm({ ...editForm, employee: vals })   // keep only ids in state
                              }
                              getPopupContainer={getModalContainer}  // render dropdown inside modal
                              dropdownStyle={{ zIndex: 2000 }}
                              placeholder="Select employees"
                            />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-0">
                            <label className="form-label">Cost</label>
                            <textarea
                              className="form-control"
                              rows={1}
                              value={editForm.cost}
                              onChange={(e) => setEditForm({ ...editForm, cost: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-0">
                            <label className="form-label">
                              Start Date
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
                                defaultValue={editForm.startDate ? dayjs(editForm.startDate, "DD-MM-YYYY") : null}
                                onChange={(_, dateString) => setEditForm({ ...editForm, startDate: dateString as string })}
                              />
                              <span className="input-icon-addon">
                                <i className="ti ti-calendar text-gray-7" />
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-0">
                            <label className="form-label">
                              End Date
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
                                defaultValue={editForm.endDate ? dayjs(editForm.endDate, "DD-MM-YYYY") : null}
                                onChange={(_, dateString) => setEditForm({ ...editForm, endDate: dateString as string })}
                              />
                              <span className="input-icon-addon">
                                <i className="ti ti-calendar text-gray-7" />
                              </span>
                            </div>
                          </div>
                      </div>


                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">Description</label>
                        <textarea
                          className="form-control"
                          rows={2}
                          value={editForm.desc}
                          onChange={(e) => setEditForm({ ...editForm, desc: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">Status</label>
                        <CommonSelect
                          className="select"
                          defaultValue={editForm.status}
                          onChange={(opt: { value: string } | null) => setEditForm({ ...editForm, status: opt?.value ?? "Active" })}
                          options={[
                            { value: "Active", label: "Active" },
                            { value: "Inactive", label: "Inactive" },
                            ]}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-white border me-2"
                    data-bs-dismiss="modal"
                    onClick={resetEditForm}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleEditSave}
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        {/* /Edit Training */}
        <Modal
          open={empPopupOpen}
          onCancel={() => setEmpPopupOpen(false)}
          footer={null}
          width={520}
          centered
          destroyOnClose
        >
          <div className="mb-3">
            <h5 className="mb-1">Employees for Trainer</h5>
            <div className="text-muted" style={{ fontSize: 12 }}>{empPopupTrainer}</div>
          </div>
          <Input.Search
            placeholder="Search by name or Employee ID"
            allowClear
            autoFocus
            onChange={(e) => setEmpPopupQuery(e.target.value)}
            onSearch={(v) => setEmpPopupQuery(v)}
            style={{ marginBottom: 12 }}
          />
          <div style={{ maxHeight: 320, overflowY: "auto" }}>
            {filteredEmpPopup.map((e) => {
              const name = [e.firstName, e.lastName].filter(Boolean).join(" ");
              return (
                <div
                  key={e.employeeId}
                  className="d-flex align-items-center p-2 rounded"
                  style={{ cursor: "default" }}
                >
                  <span className="avatar avatar-md border avatar-rounded me-2">
                    <ImageWithBasePath
                      src={"assets/img/favicon.png"}
                      className="img-fluid"
                      alt={name || e.employeeId}
                    />
                  </span>
                  <div className="d-flex flex-column">
                    <span className="fw-medium">{name || e.employeeId}</span>
                    <span className="text-muted" style={{ fontSize: 12 }}>
                      {e.employeeId}
                    </span>
                  </div>
                </div>
              );
            })}
            {filteredEmpPopup.length === 0 && (
              <div className="text-muted p-3">No employees found</div>
            )}
          </div>
        </Modal>
    </>
  );
};

export default TrainingList;
