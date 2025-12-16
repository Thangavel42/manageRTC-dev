import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { all_routes } from "../router/all_routes";
import CollapseHeader from "../../core/common/collapse-header/collapse-header";
import ImageWithBasePath from "../../core/common/imageWithBasePath";
import Table from "../../core/common/dataTable/index";
import PerformanceAppraisalModal from "../../core/modals/performanceAppraisalModal";
import Footer from "../../core/common/footer";
import performanceAppraisalService from "../../core/services/performance/performanceAppraisal.service";

const PerformanceAppraisal = () => {
  const routes = all_routes;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPerformanceAppraisals();
  }, []);

  const fetchPerformanceAppraisals = async () => {
    try {
      setLoading(true);
      const response = await performanceAppraisalService.getAllPerformanceAppraisals();
      if (response.done) {
        setData(response.data || []);
      } else {
        setError(response.error || 'Failed to fetch performance appraisals');
      }
    } catch (err) {
      setError('Failed to fetch performance appraisals');
      console.error('Error fetching performance appraisals:', err);
    } finally {
      setLoading(false);
    }
  };


  const handleDelete = async (item: any) => {
    if (window.confirm('Are you sure you want to delete this performance appraisal?')) {
      try {
        const response = await performanceAppraisalService.deletePerformanceAppraisal(item._id);
        if (response.done) {
          alert('Performance appraisal deleted successfully!');
          fetchPerformanceAppraisals(); // Refresh data
        } else {
          alert(response.error || 'Failed to delete performance appraisal');
        }
      } catch (err) {
        alert('Failed to delete performance appraisal');
        console.error('Error deleting performance appraisal:', err);
      }
    }
  };
  const columns = [
    {
      title: "Name",
      dataIndex: "name",
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
          </div>
        </div>
      ),
      sorter: (a: any, b: any) => a.name.localeCompare(b.name),
    },
    {
      title: "Designation",
      dataIndex: "designation",
      sorter: (a: any, b: any) => a.designation.localeCompare(b.designation),
    },
    {
      title: "Department",
      dataIndex: "department",
      sorter: (a: any, b: any) => a.department.localeCompare(b.department),
    },
    {
      title: "Appraisal Date",
      dataIndex: "appraisalDate",
      sorter: (a: any, b: any) => {
        const aDate = new Date(a.appraisalDate);
        const bDate = new Date(b.appraisalDate);
        if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
          return aDate.getTime() - bDate.getTime();
        }
        return String(a.appraisalDate).localeCompare(String(b.appraisalDate));
      },
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
              <h2 className="mb-1">Performance Appraisal</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">Performance</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Performance Appraisal
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
                  data-bs-target="#add_performance_appraisal"
                  className="btn btn-primary d-flex align-items-center"
                >
                  <i className="ti ti-circle-plus me-2" />
                  Add Appraisal
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
              <h5>Performance Appraisal List</h5>
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

      <PerformanceAppraisalModal onSuccess={fetchPerformanceAppraisals} />
    </>
  );
};

export default PerformanceAppraisal;