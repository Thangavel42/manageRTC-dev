import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import CollapseHeader from "../../core/common/collapse-header/collapse-header";
import { all_routes } from "../router/all_routes";
import Table from "../../core/common/dataTable/index";
import { HolidaysData } from "../../core/data/json/holidaysData";
import HolidaysModal from "../../core/modals/holidaysModal";
import Footer from "../../core/common/footer";
import { useSocket } from "../../SocketContext";
import { Socket } from "socket.io-client";
import { log } from "console";
import { LogIn } from "react-feather";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface Holidays {
  _id: string;
  title: string;
  date: string;
  description: string;
  status: "active" | "inactive";
}

const Holidays = () => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [responseData, setResponseData] = useState(null);
  const [holiday, setHoliday] = useState<Holidays[]>([]);
  const [editingHoliday, setEditingHoliday] = useState<Holidays | null>(null);
  const [deleteHoliday, setDeleteHoliday] = useState<Holidays | null>(null);

  const socket = useSocket() as Socket | null;

  useEffect(() => {
    if (!socket) return;

    let isMounted = true;

    setLoading(true);

    const timeoutId = setTimeout(() => {
      if (loading && isMounted) {
        console.warn("Holidays loading timeout - showing fallback");
        setError("Holidays loading timed out. Please refresh the page.");
        setLoading(false);
      }
    }, 30000);

    socket.emit("hrm/holiday/get");

    const handleAddHolidayResponse = (response: any) => {
      if (!isMounted) return;

      if (response.done) {
        setResponseData(response.data);
        toast.success(response.message);
        setError(null);
        setLoading(false);
        if (socket) {
          socket.emit("hrm/holiday/get");
        }
      } else {
        setError(response.message || "Failed to add holiday");
        setLoading(false);
      }
    };

    const handleGetHolidayResponse = (response: any) => {
      if (!isMounted) return;

      if (response.done) {
        setHoliday(response.data);
        setResponseData(response.data);
        setError(null);
        setLoading(false);
      } else {
        setError(response.message || response.error || "Failed to get holiday");
        toast.error(error);
        setLoading(false);
      }
    };

    const handleEditHolidayResponse = (response: any) => {
      if (!isMounted) return;

      if (response.done) {
        setResponseData(response.data);
        setError(null);
        setLoading(false);
        if (socket) {
          socket.emit("hrm/holiday/get");
        }
      } else {
        setError(response.message || "Failed to get holiday");
        toast.error(error);
        setLoading(false);
      }
    }

    const handleDeleteHolidayResponse = (response: any) => {
      if (!isMounted) return;

      if (response.done) {
        setResponseData(response.data);
        toast.success("Holiday deleted successfully");
        setError(null);
        setLoading(false);
        if (socket) {
          socket.emit("hrm/holiday/get");
        }
      } else {
        setError(response.message || response.error || "Failed to delete holiday");
        toast.error(error);
        setLoading(false);
      }
    }

    socket.on("hrm/holiday/add-response", handleAddHolidayResponse);
    socket.on("hrm/holiday/get-response", handleGetHolidayResponse);
    socket.on("hrm/holiday/update-response", handleEditHolidayResponse);
    socket.on("hrm/holiday/delete-response", handleDeleteHolidayResponse);
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      socket.off("hrm/holiday/add-response", handleAddHolidayResponse);
      socket.off("hrm/holiday/get-response", handleGetHolidayResponse);
      socket.off("hrm/holiday/update-response", handleEditHolidayResponse);
      socket.off("hrm/holiday/delete-response", handleDeleteHolidayResponse);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  const handleDeleteHoliday = (holidayId: string) => {
    try {
      setLoading(true);
      setError(null);

      if (!socket) {
        setError("Socket connection is not available");
        setLoading(false);
        return;
      }

      if (!holidayId) {
        setError("Holiday ID is required");
        setLoading(false);
        return;
      }

      socket.emit("hrm/holiday/delete", holidayId);
    } catch (error) {
      setError("Failed to initiate holiday deletion");
      setLoading(false);
    }
  };

  const routes = all_routes;
  const data = holiday;
  const columns = [
    {
      title: "Title",
      dataIndex: "title",
      render: (text: string) => (
        <h6 className="fw-medium">
          <Link to="#">{text}</Link>
        </h6>
      ),
      sorter: (a: any, b: any) => a.Title.length - b.Title.length,
    },
    {
      title: "Date",
      dataIndex: "date",
      sorter: (a: any, b: any) => a.Date.length - b.Date.length,
      render: (date: string | Date) => {
        if (!date) return "-";
        const d = new Date(date);
        return d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric"
        });
      }
    },
    {
      title: "Description",
      dataIndex: "description",
      sorter: (a: any, b: any) => a.Description.length - b.Description.length,
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (text: string) => (
        <span className={`badge ${((text === 'active') || (text === 'Active')) ? 'badge-success' : 'badge-danger'}   d-inline-flex align-items-center badge-sm`}>
          <i className="ti ti-point-filled me-1" />
          {text}
        </span>
      ),
      sorter: (a: any, b: any) => a.Status.length - b.Status.length,
    },
    {
      title: "",
      dataIndex: "actions",
      render: (_test: any, holiday: Holidays) => (
        <div className="action-icon d-inline-flex">
          <Link
            to="#"
            className="me-2"
            data-bs-toggle="modal"
            data-inert={true}
            data-bs-target="#edit_holiday"
            onClick={() => setEditingHoliday(holiday)}
          >
            <i className="ti ti-edit" />
          </Link>
          <Link
            to="#"
            data-bs-toggle="modal"
            data-inert={true}
            data-bs-target="#delete_modal"
            onClick={() => setDeleteHoliday(holiday)}
          >
            <i className="ti ti-trash" />
          </Link>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div
            className="d-flex justify-content-center align-items-center"
            style={{ height: "400px" }}
          >
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    console.error(error);
    toast.error(error);
  }

  return (
    <>
      {/* Page Wrapper */}
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Holidays</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">Employee</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Holidays
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
              <div className="mb-2">
                <Link
                  to="#"
                  data-bs-toggle="modal"
                  data-inert={true}
                  data-bs-target="#add_holiday"
                  className="btn btn-primary d-flex align-items-center"
                >
                  <i className="ti ti-circle-plus me-2" />
                  Add Holiday
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
              <h5>Holidays List</h5>
            </div>
            <div className="card-body p-0">
              <Table dataSource={data} columns={columns} Selection={true} />
            </div>
          </div>
        </div>
        <Footer />
      </div>
      {/* /Page Wrapper */}

      <HolidaysModal socket={socket} editingHoliday={editingHoliday} />
      <ToastContainer />
      {/* delete modal */}
      <div className="modal fade" id="delete_modal">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-body text-center">
              <span className="avatar avatar-xl bg-transparent-danger text-danger mb-3">
                <i className="ti ti-trash-x fs-36" />
              </span>
              <h4 className="mb-1">Confirm Deletion</h4>
              <p className="mb-3">
                {deleteHoliday
                  ? `Are you sure you want to delete holiday "${deleteHoliday.title}"? This cannot be undone.`
                  : "You want to delete all the marked holidays, this can't be undone once you delete."}
              </p>
              <div className="d-flex justify-content-center">
                <button
                  className="btn btn-light me-3"
                  data-bs-dismiss="modal"
                  onClick={() => setDeleteHoliday(null)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  data-bs-dismiss="modal"
                  onClick={() => {
                    if (deleteHoliday) {
                      handleDeleteHoliday(deleteHoliday._id);
                    }
                    setDeleteHoliday(null);
                  }}
                  disabled={loading}
                >
                  {loading ? "Deleting..." : "Yes, Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* delete modal */}
    </>
  );
};

export default Holidays;
