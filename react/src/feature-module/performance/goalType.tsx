import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import CollapseHeader from "../../core/common/collapse-header/collapse-header";
import { all_routes } from "../router/all_routes";
import Table from "../../core/common/dataTable/index";
import GoalTypeModal from "../../core/modals/goalTypeModal";
import Footer from "../../core/common/footer";
import goalTypeService from "../../core/services/performance/goalType.service";

const GoalType = () => {
  const routes = all_routes;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchGoalTypes();
  }, []);

  const fetchGoalTypes = async () => {
    try {
      setLoading(true);
      const response = await goalTypeService.getAllGoalTypes();
      if (response.done) {
        setData(response.data || []);
      } else {
        setError(response.error || 'Failed to fetch goal types');
      }
    } catch (err) {
      setError('Failed to fetch goal types');
      console.error('Error fetching goal types:', err);
    } finally {
      setLoading(false);
    }
  };


  const handleDelete = async (item: any) => {
    if (window.confirm('Are you sure you want to delete this goal type?')) {
      try {
        const response = await goalTypeService.deleteGoalType(item._id);
        if (response.done) {
          alert('Goal type deleted successfully!');
          fetchGoalTypes(); // Refresh data
        } else {
          alert(response.error || 'Failed to delete goal type');
        }
      } catch (err) {
        alert('Failed to delete goal type');
        console.error('Error deleting goal type:', err);
      }
    }
  };
  const columns = [
    {
      title: "Type",
      dataIndex: "type",
      sorter: (a: any, b: any) => a.type.localeCompare(b.type),
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
              <h2 className="mb-1">Goal Type</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">Performance</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Add New Goal Type{" "}
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
                  data-bs-target="#add_goal_type"
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
              <h5>Goal Type List</h5>
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

      <GoalTypeModal onSuccess={fetchGoalTypes} />
      {/* Removed edit modal */}
    </>
  );
};

export default GoalType;
