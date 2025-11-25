import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { all_routes } from "../router/all_routes";
import CollapseHeader from "../../core/common/collapse-header/collapse-header";
import Table from "../../core/common/dataTable/index";
import GoalTrackingModal from "../../core/modals/goalTrackingModal";
import Footer from "../../core/common/footer";
import goalTrackingService from "../../core/services/performance/goalTracking.service";

const GoalTracking = () => {
  const routes = all_routes;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchGoalTrackings();
  }, []);

  const fetchGoalTrackings = async () => {
    try {
      setLoading(true);
      const response = await goalTrackingService.getAllGoalTrackings();
      if (response.done) {
        setData(response.data || []);
      } else {
        setError(response.error || 'Failed to fetch goal trackings');
      }
    } catch (err) {
      setError('Failed to fetch goal trackings');
      console.error('Error fetching goal trackings:', err);
    } finally {
      setLoading(false);
    }
  };

  

  const handleDelete = async (item: any) => {
    if (window.confirm('Are you sure you want to delete this goal tracking?')) {
      try {
        const response = await goalTrackingService.deleteGoalTracking(item._id);
        if (response.done) {
          alert('Goal tracking deleted successfully!');
          fetchGoalTrackings(); // Refresh data
        } else {
          alert(response.error || 'Failed to delete goal tracking');
        }
      } catch (err) {
        alert('Failed to delete goal tracking');
        console.error('Error deleting goal tracking:', err);
      }
    }
  };
  const columns = [
    {
      title: "Goal Type",
      dataIndex: "goalType",
      sorter: (a: any, b: any) => a.goalType.localeCompare(b.goalType),
    },
    {
      title: "Subject",
      dataIndex: "subject",
      sorter: (a: any, b: any) => a.subject.localeCompare(b.subject),
    },
    {
      title: "Target Achievement",
      dataIndex: "targetAchievement",
      sorter: (a: any, b: any) => {
        const aNum = parseFloat(a.targetAchievement);
        const bNum = parseFloat(b.targetAchievement);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum;
        }
        return String(a.targetAchievement).localeCompare(String(b.targetAchievement));
      },
    },
    {
      title: "Start Date",
      dataIndex: "startDate",
      sorter: (a: any, b: any) => {
        const aDate = new Date(a.startDate);
        const bDate = new Date(b.startDate);
        if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
          return aDate.getTime() - bDate.getTime();
        }
        return String(a.startDate).localeCompare(String(b.startDate));
      },
    },
    {
      title: "End Date",
      dataIndex: "endDate",
      sorter: (a: any, b: any) => {
        const aDate = new Date(a.endDate);
        const bDate = new Date(b.endDate);
        if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
          return aDate.getTime() - bDate.getTime();
        }
        return String(a.endDate).localeCompare(String(b.endDate));
      },
    },
    {
      title: "Description",
      dataIndex: "description",
      sorter: (a: any, b: any) => a.description.localeCompare(b.description),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (text: string) => {
        let badgeClass = "badge ";
        if (text.toLowerCase() === "active") badgeClass += "badge-success";
        else if (text.toLowerCase() === "inactive") badgeClass += "badge-danger";
        else if (text.toLowerCase() === "draft") badgeClass += "badge-warning";
        else badgeClass += "badge-secondary";
        return (
          <span className={`${badgeClass} d-inline-flex align-items-center badge-xs`}>
            <i className="ti ti-point-filled me-1" />
            {text}
          </span>
        );
      },
      sorter: (a: any, b: any) => a.status.localeCompare(b.status),
    },
    {
      title: "Progress",
      dataIndex: "progress",
      render: (text: string, record: any) => (
        <>
          <span className="fs-12 mb-1">{text}</span>
          <div className="progress" style={{ width: "87px", height: "5px" }}>
            <div
              className="progress-bar bg-primary"
              style={{
                width:
                  record.progress === "Completed 70%"
                    ? "80%"
                    : record.progress === "Completed 40%"
                    ? "40%"
                    : "60%",
              }}
            ></div>
          </div>
        </>
      ),
      sorter: (a: any, b: any) => a.progress.localeCompare(b.progress),
    },
    {
      title: "",
      dataIndex: "actions",
      render: (text: any, record: any) => (
        <div className="action-icon d-inline-flex">
          <button
            className="btn btn-link p-0 text-danger"
            onClick={() => handleDelete(record)}
            title="Delete"
          >
            <i className="ti ti-trash" />
          </button>
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
              <h2 className="mb-1">Goal Tracking</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">Performance</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Goal Tracking
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
                  data-bs-target="#add_goal"
                  className="btn btn-primary d-flex align-items-center"
                >
                  <i className="ti ti-circle-plus me-2" />
                  Add Goal{" "}
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
              <h5>Goal Tracking List</h5>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center p-4">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : error ? (
                <div className="text-center p-4">
                  <div className="alert alert-danger" role="alert">
                    {error}
                  </div>
                </div>
              ) : (
                <Table dataSource={data} columns={columns} Selection={true} />
              )}
            </div>
          </div>
          {/* /Performance Indicator list */}
        </div>
        <Footer />
      </div>
      {/* /Page Wrapper */}

      <GoalTrackingModal onSuccess={fetchGoalTrackings} />
    </>
  );
};

export default GoalTracking;
