import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { all_routes } from "../../router/all_routes";
import CollapseHeader from "../../../core/common/collapse-header/collapse-header";
import PredefinedDateRanges from "../../../core/common/datePicker";
// Live data via socket hook
// (remove static seed import)
import { useDeals, Deal } from "../../../hooks/useDeals";
import Table from "../../../core/common/dataTable/index";
import CrmsModal from "../../../core/modals/crms_modal";
import Footer from "../../../core/common/footer";

const DealsList = () => {
  const routes = all_routes;
  const { deals, loading, fetchDeals, updateDeal, deleteDeal } = useDeals();
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const handleEditDeal = (deal: Deal) => {
    setSelectedDeal(deal);
    // Trigger edit modal
    const modal = document.getElementById('edit_deals');
    if (modal) {
      // Try multiple ways to show the modal
      try {
        // Method 1: Try Bootstrap 5
        const bootstrap = (window as any).bootstrap;
        if (bootstrap && bootstrap.Modal) {
          const modalInstance = new bootstrap.Modal(modal);
          modalInstance.show();
          return;
        }
        
        // Method 2: Try jQuery Bootstrap (if available)
        if ((window as any).$ && (window as any).$.fn.modal) {
          (window as any).$(modal).modal('show');
          return;
        }
        
        // Method 3: Fallback - show modal manually
        modal.style.display = 'block';
        modal.classList.add('show');
        document.body.classList.add('modal-open');
        
        // Add backdrop
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop fade show';
        backdrop.id = 'modal-backdrop';
        document.body.appendChild(backdrop);
        
      } catch (error) {
        console.error('Error showing modal:', error);
        // Fallback - just show the modal element
        modal.style.display = 'block';
        modal.classList.add('show');
      }
    }
  };

  const handleDeleteDeal = (deal: Deal) => {
    setSelectedDeal(deal);
    // Trigger delete modal
    const modal = document.getElementById('delete_modal');
    if (modal) {
      // Try multiple ways to show the modal
      try {
        // Method 1: Try Bootstrap 5
        const bootstrap = (window as any).bootstrap;
        if (bootstrap && bootstrap.Modal) {
          const modalInstance = new bootstrap.Modal(modal);
          modalInstance.show();
          return;
        }
        
        // Method 2: Try jQuery Bootstrap (if available)
        if ((window as any).$ && (window as any).$.fn.modal) {
          (window as any).$(modal).modal('show');
          return;
        }
        
        // Method 3: Fallback - show modal manually
        modal.style.display = 'block';
        modal.classList.add('show');
        document.body.classList.add('modal-open');
        
        // Add backdrop
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop fade show';
        backdrop.id = 'modal-backdrop';
        document.body.appendChild(backdrop);
        
      } catch (error) {
        console.error('Error showing modal:', error);
        // Fallback - just show the modal element
        modal.style.display = 'block';
        modal.classList.add('show');
      }
    }
  };

  const confirmDelete = async () => {
    if (selectedDeal) {
      try {
        const success = await deleteDeal(selectedDeal.id || selectedDeal._id || '');
        if (success) {
          setSelectedDeal(null);
          // Close modal
          const modal = document.getElementById('delete_modal');
          if (modal) {
            try {
              // Try Bootstrap 5 method
              const bootstrap = (window as any).bootstrap;
              if (bootstrap && bootstrap.Modal) {
                const modalInstance = bootstrap.Modal.getInstance(modal);
                if (modalInstance) {
                  modalInstance.hide();
                  return;
                }
              }
              
              // Try jQuery Bootstrap method
              if ((window as any).$ && (window as any).$.fn.modal) {
                (window as any).$(modal).modal('hide');
                return;
              }
              
              // Fallback - hide modal manually
              modal.style.display = 'none';
              modal.classList.remove('show');
              document.body.classList.remove('modal-open');
              
              // Remove backdrop
              const backdrop = document.getElementById('modal-backdrop');
              if (backdrop) {
                backdrop.remove();
              }
              
            } catch (error) {
              console.error('Error hiding modal:', error);
              // Fallback - just hide the modal element
              modal.style.display = 'none';
              modal.classList.remove('show');
            }
          }
        }
      } catch (error) {
        console.error('Error deleting deal:', error);
      }
    }
  };

  const data = useMemo(() => {
    if (!deals || deals.length === 0) return [] as any[];
    return deals.map((d: any) => ({
      key: d.id || d._id,
      DealName: d.name || "-",
      Stage: d.stage || "-",
      DealValue: typeof d.dealValue === "number" ? `$${d.dealValue.toLocaleString()}` : 
                 (typeof d.value === "number" ? `$${d.value.toLocaleString()}` : "-"),
      Tags: Array.isArray(d.tags) && d.tags.length ? d.tags[0] : "-",
      ExpectedClosedDate: d.expectedClosedDate ? new Date(d.expectedClosedDate).toLocaleDateString() : 
                         (d.expectedClosingDate ? new Date(d.expectedClosingDate).toLocaleDateString() : "-"),
      Owner: d.owner?.name || d.owner || "-",
      Probability: typeof d.probability === "number" ? `${d.probability}%` : "-",
      Status: d.status || "-",
    }));
  }, [deals]);
  const columns = [
    {
      title: "Deal Name",
      dataIndex: "DealName",
      render: (text: string) => (
        <h6 className="fw-medium fs-14">
          <Link to={routes.dealsDetails}>{text}</Link>
        </h6>
      ),
      sorter: (a: any, b: any) => a.DealName.length - b.DealName.length,
    },
    {
      title: "Stage",
      dataIndex: "Stage",
      sorter: (a: any, b: any) => a.Stage.length - b.Stage.length,
    },
    {
      title: "Deal Value",
      dataIndex: "DealValue",
      sorter: (a: any, b: any) => a.DealValue.length - b.DealValue.length,
    },
    {
      title: "Tags",
      dataIndex: "Tags",
      render: (text: string) => (
        <span
          className={`badge  ${
            text === "Promotion"
              ? "badge-info-transparent"
              : text === "Rated"
              ? "badge-warning-transparent"
              : text === "Collab"
              ? "badge-pink-transparent"
              : text === "Rejected"
              ? "badge-danger-transparent"
              : "badge-purple-transparent"
          }`}
        >
          {text}
        </span>
      ),
      sorter: (a: any, b: any) => a.Tags.length - b.Tags.length,
    },
    {
      title: "Expected Closed Date",
      dataIndex: "ExpectedClosedDate",
      sorter: (a: any, b: any) =>
        a.ExpectedClosedDate.length - b.ExpectedClosedDate.length,
    },
    {
      title: "Owner",
      dataIndex: "Owner",
      sorter: (a: any, b: any) => a.Owner.length - b.Owner.length,
    },
    {
      title: "Probability",
      dataIndex: "Probability",
      sorter: (a: any, b: any) => a.Probability.length - b.Probability.length,
    },
    {
      title: "Status",
      dataIndex: "Status",
      render: (text: string) => (
        <>
          <span
            className={`badge d-inline-flex align-items-center badge-xs ${
              text === "Won"
                ? "badge-success"
                : text === "Lost"
                ? "badge-danger"
                : "badge-info"
            }`}
          >
            <i className="ti ti-point-filled me-1"></i>
            {text}
          </span>
        </>
      ),
      sorter: (a: any, b: any) => a.Status.length - b.Status.length,
    },

    {
      title: "",
      dataIndex: "actions",
      render: (text: string, record: any) => {
        const deal = deals.find((d: any) => (d.id || d._id) === record.key);
        return (
          <div className="action-icon d-inline-flex">
            <button
              className="btn btn-link me-2 p-0"
              onClick={() => deal && handleEditDeal(deal)}
              title="Edit Deal"
            >
              <i className="ti ti-edit" />
            </button>
            <button
              className="btn btn-link p-0"
              onClick={() => deal && handleDeleteDeal(deal)}
              title="Delete Deal"
            >
              <i className="ti ti-trash" />
            </button>
          </div>
        );
      },
    },
  ];
  return (
    <>
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Deals</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">CRM</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Deals List
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
              <div className="me-2 mb-2">
                <div className="d-flex align-items-center border bg-white rounded p-1 me-2 icon-list">
                  <Link
                    to={routes.dealsList}
                    className="btn btn-icon btn-sm active bg-primary text-white me-1"
                  >
                    <i className="ti ti-list-tree" />
                  </Link>
                  <Link to={routes.dealsGrid} className="btn btn-icon btn-sm">
                    <i className="ti ti-layout-grid" />
                  </Link>
                </div>
              </div>
              <div className="me-2 mb-2">
                <div className="dropdown">
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    <i className="ti ti-file-export me-1" />
                    Export
                  </Link>
                  <ul className="dropdown-menu  dropdown-menu-end p-3">
                    <li>
                      <Link to="#" className="dropdown-item rounded-1">
                        <i className="ti ti-file-type-pdf me-1" />
                        Export as PDF
                      </Link>
                    </li>
                    <li>
                      <Link to="#" className="dropdown-item rounded-1">
                        <i className="ti ti-file-type-xls me-1" />
                        Export as Excel{" "}
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="mb-2">
                <Link
                  to="#"
                  data-bs-toggle="modal"
                  data-bs-target="#add_deals"
                  className="btn btn-primary d-flex align-items-center"
                >
                  <i className="ti ti-circle-plus me-2" />
                  Add Deal
                </Link>
              </div>
              <div className="head-icons ms-2">
                <CollapseHeader />
              </div>
            </div>
          </div>
          {/* /Breadcrumb */}
          {/* Contact List */}
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
              <h5>Deal List</h5>
              <div className="d-flex my-xl-auto right-content align-items-center flex-wrap row-gap-3">
                <div className="me-3">
                  <div className="input-icon-end position-relative">
                    <PredefinedDateRanges />
                    <span className="input-icon-addon">
                      <i className="ti ti-chevron-down" />
                    </span>
                  </div>
                </div>
                <div className="dropdown me-3">
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    Stage
                  </Link>
                  <ul className="dropdown-menu  dropdown-menu-end p-3">
                    <li>
                      <Link to="#" className="dropdown-item rounded-1">
                        Quality To Buy
                      </Link>
                    </li>
                    <li>
                      <Link to="#" className="dropdown-item rounded-1">
                        Proposal Made
                      </Link>
                    </li>
                  </ul>
                </div>
                <div className="dropdown me-3">
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    Select Status
                  </Link>
                  <ul className="dropdown-menu  dropdown-menu-end p-3">
                    <li>
                      <Link to="#" className="dropdown-item rounded-1">
                        Active
                      </Link>
                    </li>
                    <li>
                      <Link to="#" className="dropdown-item rounded-1">
                        Inactive
                      </Link>
                    </li>
                  </ul>
                </div>
                <div className="dropdown">
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    Sort By : Last 7 Days
                  </Link>
                  <ul className="dropdown-menu  dropdown-menu-end p-3">
                    <li>
                      <Link to="#" className="dropdown-item rounded-1">
                        Recently Added
                      </Link>
                    </li>
                    <li>
                      <Link to="#" className="dropdown-item rounded-1">
                        Ascending
                      </Link>
                    </li>
                    <li>
                      <Link to="#" className="dropdown-item rounded-1">
                        Desending
                      </Link>
                    </li>
                    <li>
                      <Link to="#" className="dropdown-item rounded-1">
                        Last Month
                      </Link>
                    </li>
                    <li>
                      <Link to="#" className="dropdown-item rounded-1">
                        Last 7 Days
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="card-body p-0">
              <Table dataSource={data} columns={columns} Selection={true} />
            </div>
          </div>
          {/* /Contact List */}
        </div>
        <Footer />
      </div>
      <CrmsModal 
        selectedDeal={selectedDeal}
        onDeleteConfirm={confirmDelete}
      />
    </>
  );
};

export default DealsList;
