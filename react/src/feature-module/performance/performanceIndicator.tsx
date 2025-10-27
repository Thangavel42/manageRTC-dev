import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { all_routes } from "../router/all_routes";
import CollapseHeader from "../../core/common/collapse-header/collapse-header";
import ImageWithBasePath from "../../core/common/imageWithBasePath";
import Table from "../../core/common/dataTable/index";
import PerformanceIndicatorModal from "../../core/modals/performanceIndicatorModal";
import Footer from "../../core/common/footer";
import performanceIndicatorService from "../../core/services/performance/performanceIndicator.service";

const PerformanceIndicator = () => {
  const routes = all_routes;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // REMOVE handleEdit and editingItem state

  useEffect(() => {
    fetchPerformanceIndicators();
  }, []);

  const fetchPerformanceIndicators = async () => {
    try {
      setLoading(true);
      const response = await performanceIndicatorService.getAllPerformanceIndicators();
      if (response.done) {
        setData(response.data || []);
      } else {
        setError(response.error || 'Failed to fetch performance indicators');
      }
    } catch (err) {
      setError('Failed to fetch performance indicators');
      console.error('Error fetching performance indicators:', err);
    } finally {
      setLoading(false);
    }
  };

  // REMOVE handleEdit function

  const handleDelete = async (item: any) => {
    if (window.confirm('Are you sure you want to delete this performance indicator?')) {
      try {
        const response = await performanceIndicatorService.deletePerformanceIndicator(item._id);
        if (response.done) {
          alert('Performance indicator deleted successfully!');
          fetchPerformanceIndicators(); // Refresh data
        } else {
          alert(response.error || 'Failed to delete performance indicator');
        }
      } catch (err) {
        alert('Failed to delete performance indicator');
        console.error('Error deleting performance indicator:', err);
      }
    }
  };
  const columns = [
    {
      title: "Designation",
      dataIndex: "designation",
      render: (text: string) => (
        <div className="d-flex align-items-center file-name-icon">
          <div className="ms-2">
            <h6 className="fw-medium">
              <Link to="#">{text}</Link>
            </h6>
          </div>
        </div>
      ),
      sorter: (a: any, b: any) => a.designation.localeCompare(b.designation),
    },
    {
      title: "Department",
      dataIndex: "department",
      sorter: (a: any, b: any) => a.department.localeCompare(b.department),
    },
    {
      title: "Approved By",
      dataIndex: "approvedBy",
      render: (text: string, record: any) => (
        <div className="d-flex align-items-center file-name-icon">
          <Link to="#" className="avatar avatar-md avatar-rounded">
            <ImageWithBasePath
              src={`assets/img/users/${record.image}`}
              className="img-fluid"
              alt="img"
            />
          </Link>
          <div className="ms-2">
            <h6 className="fw-medium">
              <Link to="#">{text}</Link>
            </h6>
            <p className="fs-12">{record.role}</p>
          </div>
        </div>
      ),
      sorter: (a: any, b: any) => a.approvedBy.localeCompare(b.approvedBy),
    },
    {
      title: "Created Date",
      dataIndex: "createdDate",
      sorter: (a: any, b: any) => {
        const aDate = new Date(a.createdDate);
        const bDate = new Date(b.createdDate);
        if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
          return aDate.getTime() - bDate.getTime();
        }
        return String(a.createdDate).localeCompare(String(b.createdDate));
      },
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
              <h2 className="mb-1">Performance Indicator</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">Performance</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Performance Indicator
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
                  data-bs-target="#add_performance_indicator"
                  className="btn btn-primary d-flex align-items-center"
                >
                  <i className="ti ti-circle-plus me-2" />
                  Add Indicator
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
              <h5>Performance Indicator List</h5>
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

      <PerformanceIndicatorModal onSuccess={fetchPerformanceIndicators} />
      {/* Removed edit modal */}
    </>
  );
};

export default PerformanceIndicator;