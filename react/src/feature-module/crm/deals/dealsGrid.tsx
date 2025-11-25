import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import { all_routes } from "../../router/all_routes";
import CollapseHeader from "../../../core/common/collapse-header/collapse-header";
import dragula, { Drake } from "dragula";
import "dragula/dist/dragula.css";
import CrmsModal from "../../../core/modals/crms_modal";
import { useDeals, Deal } from "../../../hooks/useDeals";
import Footer from "../../../core/common/footer";

const DealsGrid = () => {
  const routes = all_routes;
  const { deals, fetchDeals, updateDeal, deleteDeal } = useDeals();
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const container1Ref = useRef<HTMLDivElement>(null);
  const container2Ref = useRef<HTMLDivElement>(null);
  const container3Ref = useRef<HTMLDivElement>(null);
  const container4Ref = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const containers = [
      container1Ref.current as HTMLDivElement,
      container2Ref.current as HTMLDivElement,
      container3Ref.current as HTMLDivElement,
      container4Ref.current as HTMLDivElement,
    ].filter((container) => container !== null);

    const drake: Drake = dragula(containers);
    return () => {
      drake.destroy();
    };
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const grouped = useMemo(() => {
    const byStage: Record<string, any[]> = { New: [], Prospect: [], Proposal: [], Won: [] };
    (deals || []).forEach((d: any) => {
      const stage = (d.stage || 'New');
      if (!byStage[stage]) byStage[stage] = [];
      byStage[stage].push(d);
    });
    return byStage;
  }, [deals]);
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
                    Deals Grid
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
              <div className="me-2 mb-2">
                <div className="d-flex align-items-center border bg-white rounded p-1 me-2 icon-list">
                  <Link
                    to={routes.dealsList}
                    className="btn btn-icon btn-sm me-1"
                  >
                    <i className="ti ti-list-tree" />
                  </Link>
                  <Link
                    to={routes.dealsGrid}
                    className="btn btn-icon btn-sm active bg-primary text-white"
                  >
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
          {/* Deals Grid */}
          <div className="card">
            <div className="card-body p-3">
              <div className="d-flex align-items-center justify-content-between">
                <h5>Deals Grid</h5>
                <div className="dropdown">
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-sm btn-white d-inline-flex align-items-center"
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
          </div>
          <div className="d-flex overflow-x-auto align-items-start mb-4">
            <div className="kanban-list-items bg-white">
              <div className="card mb-0">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h4 className="fw-medium d-flex align-items-center mb-1">
                        <i className="ti ti-circle-filled fs-8 text-purple me-2" />
                        New
                      </h4>
                      <span className="fw-normal text-default">
                        03 Deals - $16,90,000
                      </span>
                    </div>
                    <div className="d-flex align-items-center">
                      <div className="action-icon d-inline-flex">
                        <Link to="#">
                          <i className="ti ti-circle-plus" />
                        </Link>
                        <Link
                          to="#"
                          className=""
                          data-bs-toggle="modal"
                          data-bs-target="#edit_deals"
                        >
                          <i className="ti ti-edit" />
                        </Link>
                        <Link
                          to="#"
                          data-bs-toggle="modal"
                          data-bs-target="#delete_modal"
                        >
                          <i className="ti ti-trash" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="kanban-drag-wrap pt-4" ref={container1Ref}>
                {(grouped.New || []).map((d: any) => (
                  <div className="card kanban-card" key={d._id}>
                    <div className="card-body">
                      <div className="d-block">
                        <div className="border-purple border border-2 mb-3" />
                        <div className="d-flex align-items-center mb-3">
                          <Link to={routes.dealsDetails} className="avatar avatar-lg bg-gray flex-shrink-0 me-2">
                            <span className="avatar-title text-dark">{(d.initials || d.name || 'D').substring(0, 2).toUpperCase()}</span>
                          </Link>
                          <h6 className="fw-medium">
                            <Link to={routes.dealsDetails}>{d.name || 'Untitled Deal'}</Link>
                          </h6>
                        </div>
                      </div>
                      <div className="mb-3 d-flex flex-column">
                        <p className="text-default d-inline-flex align-items-center mb-2">
                          <i className="ti ti-currency-dollar text-dark me-2" />
                          {typeof d.dealValue === 'number' ? `$${d.dealValue.toLocaleString()}` : 
                           (typeof d.value === 'number' ? `$${d.value.toLocaleString()}` : '-')}
                        </p>
                        <p className="text-default d-inline-flex align-items-center mb-2">
                          <i className="ti ti-mail text-dark me-2" />
                          {d.owner?.name || d.owner || '-'}
                        </p>
                      </div>
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center">
                          <Link to="#" className="avatar avatar-md avatar-rounded flex-shrink-0 me-2">
                            <ImageWithBasePath src="assets/img/profiles/avatar-20.jpg" alt="image" />
                          </Link>
                          <Link to="#" className="text-dark">{d.owner?.name || d.owner || '-'}</Link>
                        </div>
                        <span className="badge badge-sm badge-info-transparent">
                          <i className="ti ti-progress me-1" />
                          {typeof d.probability === 'number' ? `${d.probability}%` : '-'}
                        </span>
                      </div>
                      <div className="d-flex align-items-center justify-content-between border-top pt-3 mt-3">
                        <span className="text-dark">
                          <i className="ti ti-calendar-due text-gray-5" /> {d.expectedClosedDate ? new Date(d.expectedClosedDate).toLocaleDateString() : 
                           (d.expectedClosingDate ? new Date(d.expectedClosingDate).toLocaleDateString() : '-')}
                        </span>
                        <div className="d-flex align-items-center">
                          <button
                            className="btn btn-link p-1 me-1"
                            onClick={() => handleEditDeal(d)}
                            title="Edit Deal"
                          >
                            <i className="ti ti-edit text-primary" />
                          </button>
                          <button
                            className="btn btn-link p-1"
                            onClick={() => handleDeleteDeal(d)}
                            title="Delete Deal"
                          >
                            <i className="ti ti-trash text-danger" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="kanban-list-items bg-white">
              <div className="card mb-0">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h4 className="fw-medium d-flex align-items-center mb-1">
                        <i className="ti ti-circle-filled fs-8 text-skyblue me-2" />
                        Prospect
                      </h4>
                      <span className="fw-normal text-default">
                        30 Leads - $19,94,938
                      </span>
                    </div>
                    <div className="d-flex align-items-center">
                      <div className="action-icon d-inline-flex">
                        <Link to="#">
                          <i className="ti ti-circle-plus" />
                        </Link>
                        <Link
                          to="#"
                          className=""
                          data-bs-toggle="modal"
                          data-bs-target="#edit_deals"
                        >
                          <i className="ti ti-edit" />
                        </Link>
                        <Link
                          to="#"
                          data-bs-toggle="modal"
                          data-bs-target="#delete_modal"
                        >
                          <i className="ti ti-trash" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="kanban-drag-wrap pt-4" ref={container2Ref}>
                {(grouped.Prospect || []).map((d: any) => (
                  <div className="card kanban-card" key={d._id}>
                    <div className="card-body">
                      <div className="d-block">
                        <div className="border-skyblue border border-2 mb-3" />
                        <div className="d-flex align-items-center mb-3">
                          <Link to={routes.dealsDetails} className="avatar avatar-lg bg-gray flex-shrink-0 me-2">
                            <span className="avatar-title text-dark">{(d.initials || d.name || 'D').substring(0, 2).toUpperCase()}</span>
                          </Link>
                          <h6 className="fw-medium"><Link to={routes.dealsDetails}>{d.name || 'Untitled Deal'}</Link></h6>
                        </div>
                      </div>
                      <div className="mb-3 d-flex flex-column">
                        <p className="text-default d-inline-flex align-items-center mb-2"><i className="ti ti-currency-dollar text-dark me-2" />{typeof d.dealValue === 'number' ? `$${d.dealValue.toLocaleString()}` : (typeof d.value === 'number' ? `$${d.value.toLocaleString()}` : '-')}</p>
                      </div>
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center">
                          <Link to="#" className="avatar avatar-md avatar-rounded flex-shrink-0 me-2"><ImageWithBasePath src="assets/img/profiles/avatar-01.jpg" alt="image" /></Link>
                          <Link to="#" className="text-dark">{d.owner?.name || d.owner || '-'}</Link>
                        </div>
                        <span className="badge badge-sm badge-info-transparent"><i className="ti ti-progress me-1" />{typeof d.probability === 'number' ? `${d.probability}%` : '-'}</span>
                      </div>
                      <div className="d-flex align-items-center justify-content-between border-top pt-3 mt-3">
                        <span className="text-dark"><i className="ti ti-calendar-due text-gray-5" /> {d.expectedClosedDate ? new Date(d.expectedClosedDate).toLocaleDateString() : (d.expectedClosingDate ? new Date(d.expectedClosingDate).toLocaleDateString() : '-')}</span>
                        <div className="d-flex align-items-center">
                          <button
                            className="btn btn-link p-1 me-1"
                            onClick={() => handleEditDeal(d)}
                            title="Edit Deal"
                          >
                            <i className="ti ti-edit text-primary" />
                          </button>
                          <button
                            className="btn btn-link p-1"
                            onClick={() => handleDeleteDeal(d)}
                            title="Delete Deal"
                          >
                            <i className="ti ti-trash text-danger" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="kanban-list-items bg-white">
              <div className="card mb-0">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h4 className="fw-medium d-flex align-items-center mb-1">
                        <i className="ti ti-circle-filled fs-8 text-warning me-2" />
                        Proposal
                      </h4>
                      <span className="fw-normal text-default">
                        30 Leads - $19,94,938
                      </span>
                    </div>
                    <div className="d-flex align-items-center">
                      <div className="action-icon d-inline-flex">
                        <Link to="#">
                          <i className="ti ti-circle-plus" />
                        </Link>
                        <Link
                          to="#"
                          className=""
                          data-bs-toggle="modal"
                          data-bs-target="#edit_deals"
                        >
                          <i className="ti ti-edit" />
                        </Link>
                        <Link
                          to="#"
                          data-bs-toggle="modal"
                          data-bs-target="#delete_modal"
                        >
                          <i className="ti ti-trash" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="kanban-drag-wrap pt-4" ref={container3Ref}>
                {(grouped.Proposal || []).map((d: any) => (
                  <div className="card kanban-card" key={d._id}>
                    <div className="card-body">
                      <div className="d-block">
                        <div className="border-warning border border-2 mb-3" />
                        <div className="d-flex align-items-center mb-3">
                          <Link to={routes.dealsDetails} className="avatar avatar-lg bg-gray flex-shrink-0 me-2">
                            <span className="avatar-title text-dark">{(d.initials || d.name || 'D').substring(0, 2).toUpperCase()}</span>
                          </Link>
                          <h6 className="fw-medium"><Link to={routes.dealsDetails}>{d.name || 'Untitled Deal'}</Link></h6>
                        </div>
                      </div>
                      <div className="mb-3 d-flex flex-column">
                        <p className="text-default d-inline-flex align-items-center mb-2"><i className="ti ti-currency-dollar text-dark me-2" />{typeof d.dealValue === 'number' ? `$${d.dealValue.toLocaleString()}` : (typeof d.value === 'number' ? `$${d.value.toLocaleString()}` : '-')}</p>
                      </div>
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center">
                          <Link to="#" className="avatar avatar-md avatar-rounded flex-shrink-0 me-2"><ImageWithBasePath src="assets/img/profiles/avatar-24.jpg" alt="image" /></Link>
                          <Link to="#" className="text-dark">{d.owner?.name || d.owner || '-'}</Link>
                        </div>
                        <span className="badge badge-sm badge-info-transparent"><i className="ti ti-progress me-1" />{typeof d.probability === 'number' ? `${d.probability}%` : '-'}</span>
                      </div>
                      <div className="d-flex align-items-center justify-content-between border-top pt-3 mt-3">
                        <span className="text-dark"><i className="ti ti-calendar-due text-gray-5" /> {d.expectedClosedDate ? new Date(d.expectedClosedDate).toLocaleDateString() : (d.expectedClosingDate ? new Date(d.expectedClosingDate).toLocaleDateString() : '-')}</span>
                        <div className="d-flex align-items-center">
                          <button
                            className="btn btn-link p-1 me-1"
                            onClick={() => handleEditDeal(d)}
                            title="Edit Deal"
                          >
                            <i className="ti ti-edit text-primary" />
                          </button>
                          <button
                            className="btn btn-link p-1"
                            onClick={() => handleDeleteDeal(d)}
                            title="Delete Deal"
                          >
                            <i className="ti ti-trash text-danger" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="kanban-list-items bg-white me-0">
              <div className="card mb-0">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h4 className="fw-medium d-flex align-items-center mb-1">
                        <i className="ti ti-circle-filled fs-8 text-success me-2" />
                        Won
                      </h4>
                      <span className="fw-normal text-default">
                        30 Leads - $19,94,938
                      </span>
                    </div>
                    <div className="d-flex align-items-center">
                      <div className="action-icon d-inline-flex">
                        <Link to="#">
                          <i className="ti ti-circle-plus" />
                        </Link>
                        <Link
                          to="#"
                          className=""
                          data-bs-toggle="modal"
                          data-bs-target="#edit_deals"
                        >
                          <i className="ti ti-edit" />
                        </Link>
                        <Link
                          to="#"
                          data-bs-toggle="modal"
                          data-bs-target="#delete_modal"
                        >
                          <i className="ti ti-trash" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="kanban-drag-wrap pt-4" ref={container4Ref}>
                {(grouped.Won || []).map((d: any) => (
                  <div className="card kanban-card" key={d._id}>
                    <div className="card-body">
                      <div className="d-block">
                        <div className="border-success border border-2 mb-3" />
                        <div className="d-flex align-items-center mb-3">
                          <Link to={routes.dealsDetails} className="avatar avatar-lg bg-gray flex-shrink-0 me-2">
                            <span className="avatar-title text-dark">{(d.initials || d.name || 'D').substring(0, 2).toUpperCase()}</span>
                          </Link>
                          <h6 className="fw-medium"><Link to={routes.dealsDetails}>{d.name || 'Untitled Deal'}</Link></h6>
                        </div>
                      </div>
                      <div className="mb-3 d-flex flex-column">
                        <p className="text-default d-inline-flex align-items-center mb-2"><i className="ti ti-currency-dollar text-dark me-2" />{typeof d.dealValue === 'number' ? `$${d.dealValue.toLocaleString()}` : (typeof d.value === 'number' ? `$${d.value.toLocaleString()}` : '-')}</p>
                      </div>
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center">
                          <Link to="#" className="avatar avatar-md avatar-rounded flex-shrink-0 me-2"><ImageWithBasePath src="assets/img/profiles/avatar-10.jpg" alt="image" /></Link>
                          <Link to="#" className="text-dark">{d.owner?.name || d.owner || '-'}</Link>
                        </div>
                        <span className="badge badge-sm badge-info-transparent"><i className="ti ti-progress me-1" />{typeof d.probability === 'number' ? `${d.probability}%` : '-'}</span>
                      </div>
                      <div className="d-flex align-items-center justify-content-between border-top pt-3 mt-3">
                        <span className="text-dark"><i className="ti ti-calendar-due text-gray-5" /> {d.expectedClosedDate ? new Date(d.expectedClosedDate).toLocaleDateString() : (d.expectedClosingDate ? new Date(d.expectedClosingDate).toLocaleDateString() : '-')}</span>
                        <div className="d-flex align-items-center">
                          <button
                            className="btn btn-link p-1 me-1"
                            onClick={() => handleEditDeal(d)}
                            title="Edit Deal"
                          >
                            <i className="ti ti-edit text-primary" />
                          </button>
                          <button
                            className="btn btn-link p-1"
                            onClick={() => handleDeleteDeal(d)}
                            title="Delete Deal"
                          >
                            <i className="ti ti-trash text-danger" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* /Deals Grid */}
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

export default DealsGrid;
