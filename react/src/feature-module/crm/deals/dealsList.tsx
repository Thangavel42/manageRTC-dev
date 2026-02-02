import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import { all_routes } from "../../router/all_routes";
import CollapseHeader from "../../../core/common/collapse-header/collapse-header";
import PredefinedDateRanges from "../../../core/common/datePicker";
import { useDeals, Deal } from "../../../hooks/useDeals";
import Table from "../../../core/common/dataTable/index";
import CrmsModal from "../../../core/modals/crms_modal";
import Footer from "../../../core/common/footer";
import dragula, { Drake } from "dragula";
import "dragula/dist/dragula.css";

const DealsList = () => {
  const routes = all_routes;
  const { deals, loading, fetchDeals, updateDeal, deleteDeal } = useDeals();
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  // View Mode State
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // Refs for drag-and-drop (grid view only)
  const container1Ref = useRef<HTMLDivElement>(null);
  const container2Ref = useRef<HTMLDivElement>(null);
  const container3Ref = useRef<HTMLDivElement>(null);
  const container4Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  // Initialize drag-and-drop for grid view
  useEffect(() => {
    if (viewMode !== "grid") return;

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
  }, [viewMode]);

  const handleEditDeal = (deal: Deal) => {
    setSelectedDeal(deal);
    // Trigger edit modal
    const modal = document.getElementById("edit_deals");
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
          (window as any).$(modal).modal("show");
          return;
        }

        // Method 3: Fallback - show modal manually
        modal.style.display = "block";
        modal.classList.add("show");
        document.body.classList.add("modal-open");

        // Add backdrop
        const backdrop = document.createElement("div");
        backdrop.className = "modal-backdrop fade show";
        backdrop.id = "modal-backdrop";
        document.body.appendChild(backdrop);
      } catch (error) {
        console.error("Error showing modal:", error);
        // Fallback - just show the modal element
        modal.style.display = "block";
        modal.classList.add("show");
      }
    }
  };

  const handleDeleteDeal = (deal: Deal) => {
    setSelectedDeal(deal);
    // Trigger delete modal
    const modal = document.getElementById("delete_modal");
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
          (window as any).$(modal).modal("show");
          return;
        }

        // Method 3: Fallback - show modal manually
        modal.style.display = "block";
        modal.classList.add("show");
        document.body.classList.add("modal-open");

        // Add backdrop
        const backdrop = document.createElement("div");
        backdrop.className = "modal-backdrop fade show";
        backdrop.id = "modal-backdrop";
        document.body.appendChild(backdrop);
      } catch (error) {
        console.error("Error showing modal:", error);
        // Fallback - just show the modal element
        modal.style.display = "block";
        modal.classList.add("show");
      }
    }
  };

  const confirmDelete = async () => {
    if (selectedDeal) {
      try {
        const success = await deleteDeal(
          selectedDeal.id || selectedDeal._id || ""
        );
        if (success) {
          setSelectedDeal(null);
          // Close modal
          const modal = document.getElementById("delete_modal");
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
                (window as any).$(modal).modal("hide");
                return;
              }

              // Fallback - hide modal manually
              modal.style.display = "none";
              modal.classList.remove("show");
              document.body.classList.remove("modal-open");

              // Remove backdrop
              const backdrop = document.getElementById("modal-backdrop");
              if (backdrop) {
                backdrop.remove();
              }
            } catch (error) {
              console.error("Error hiding modal:", error);
              // Fallback - just hide the modal element
              modal.style.display = "none";
              modal.classList.remove("show");
            }
          }
        }
      } catch (error) {
        console.error("Error deleting deal:", error);
      }
    }
  };

  // Data for list view
  const data = useMemo(() => {
    if (!deals || deals.length === 0) return [] as any[];
    return deals.map((d: any) => ({
      key: d.id || d._id,
      DealName: d.name || "-",
      Stage: d.stage || "-",
      DealValue:
        typeof d.dealValue === "number"
          ? `$${d.dealValue.toLocaleString()}`
          : typeof d.value === "number"
          ? `$${d.value.toLocaleString()}`
          : "-",
      Tags: Array.isArray(d.tags) && d.tags.length ? d.tags[0] : "-",
      ExpectedClosedDate: d.expectedClosedDate
        ? new Date(d.expectedClosedDate).toLocaleDateString()
        : d.expectedClosingDate
        ? new Date(d.expectedClosingDate).toLocaleDateString()
        : "-",
      Owner: d.owner?.name || d.owner || "-",
      Probability: typeof d.probability === "number" ? `${d.probability}%` : "-",
      Status: d.status || "-",
    }));
  }, [deals]);

  // Grouped data for grid view (Kanban)
  const grouped = useMemo(() => {
    const byStage: Record<string, any[]> = {
      New: [],
      Prospect: [],
      Proposal: [],
      Won: [],
    };
    (deals || []).forEach((d: any) => {
      const stage = d.stage || "New";
      if (!byStage[stage]) byStage[stage] = [];
      byStage[stage].push(d);
    });
    return byStage;
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
                    {viewMode === "list" ? "Deals List" : "Deals Grid"}
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
              <div className="me-2 mb-2">
                <div className="d-flex align-items-center border bg-white rounded p-1 me-2 icon-list">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`btn btn-icon btn-sm ${
                      viewMode === "list" ? "active bg-primary text-white" : ""
                    } me-1`}
                  >
                    <i className="ti ti-list-tree" />
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`btn btn-icon btn-sm ${
                      viewMode === "grid" ? "active bg-primary text-white" : ""
                    }`}
                  >
                    <i className="ti ti-layout-grid" />
                  </button>
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

          {/* LIST VIEW */}
          {viewMode === "list" && (
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
          )}

          {/* GRID VIEW (KANBAN) */}
          {viewMode === "grid" && (
            <>
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
                {/* NEW Column */}
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
                            {grouped.New?.length || 0} Deals
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
                              <Link
                                to={routes.dealsDetails}
                                className="avatar avatar-lg bg-gray flex-shrink-0 me-2"
                              >
                                <span className="avatar-title text-dark">
                                  {(d.initials || d.name || "D")
                                    .substring(0, 2)
                                    .toUpperCase()}
                                </span>
                              </Link>
                              <h6 className="fw-medium">
                                <Link to={routes.dealsDetails}>
                                  {d.name || "Untitled Deal"}
                                </Link>
                              </h6>
                            </div>
                          </div>
                          <div className="mb-3 d-flex flex-column">
                            <p className="text-default d-inline-flex align-items-center mb-2">
                              <i className="ti ti-currency-dollar text-dark me-2" />
                              {typeof d.dealValue === "number"
                                ? `$${d.dealValue.toLocaleString()}`
                                : typeof d.value === "number"
                                ? `$${d.value.toLocaleString()}`
                                : "-"}
                            </p>
                            <p className="text-default d-inline-flex align-items-center mb-2">
                              <i className="ti ti-mail text-dark me-2" />
                              {d.owner?.name || d.owner || "-"}
                            </p>
                          </div>
                          <div className="d-flex justify-content-between align-items-center">
                            <div className="d-flex align-items-center">
                              <Link
                                to="#"
                                className="avatar avatar-md avatar-rounded flex-shrink-0 me-2"
                              >
                                <ImageWithBasePath
                                  src="assets/img/profiles/avatar-20.jpg"
                                  alt="image"
                                />
                              </Link>
                              <Link to="#" className="text-dark">
                                {d.owner?.name || d.owner || "-"}
                              </Link>
                            </div>
                            <span className="badge badge-sm badge-info-transparent">
                              <i className="ti ti-progress me-1" />
                              {typeof d.probability === "number"
                                ? `${d.probability}%`
                                : "-"}
                            </span>
                          </div>
                          <div className="d-flex align-items-center justify-content-between border-top pt-3 mt-3">
                            <span className="text-dark">
                              <i className="ti ti-calendar-due text-gray-5" />{" "}
                              {d.expectedClosedDate
                                ? new Date(
                                    d.expectedClosedDate
                                  ).toLocaleDateString()
                                : d.expectedClosingDate
                                ? new Date(
                                    d.expectedClosingDate
                                  ).toLocaleDateString()
                                : "-"}
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

                {/* PROSPECT Column */}
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
                            {grouped.Prospect?.length || 0} Deals
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
                              <Link
                                to={routes.dealsDetails}
                                className="avatar avatar-lg bg-gray flex-shrink-0 me-2"
                              >
                                <span className="avatar-title text-dark">
                                  {(d.initials || d.name || "D")
                                    .substring(0, 2)
                                    .toUpperCase()}
                                </span>
                              </Link>
                              <h6 className="fw-medium">
                                <Link to={routes.dealsDetails}>
                                  {d.name || "Untitled Deal"}
                                </Link>
                              </h6>
                            </div>
                          </div>
                          <div className="mb-3 d-flex flex-column">
                            <p className="text-default d-inline-flex align-items-center mb-2">
                              <i className="ti ti-currency-dollar text-dark me-2" />
                              {typeof d.dealValue === "number"
                                ? `$${d.dealValue.toLocaleString()}`
                                : typeof d.value === "number"
                                ? `$${d.value.toLocaleString()}`
                                : "-"}
                            </p>
                          </div>
                          <div className="d-flex justify-content-between align-items-center">
                            <div className="d-flex align-items-center">
                              <Link
                                to="#"
                                className="avatar avatar-md avatar-rounded flex-shrink-0 me-2"
                              >
                                <ImageWithBasePath
                                  src="assets/img/profiles/avatar-01.jpg"
                                  alt="image"
                                />
                              </Link>
                              <Link to="#" className="text-dark">
                                {d.owner?.name || d.owner || "-"}
                              </Link>
                            </div>
                            <span className="badge badge-sm badge-info-transparent">
                              <i className="ti ti-progress me-1" />
                              {typeof d.probability === "number"
                                ? `${d.probability}%`
                                : "-"}
                            </span>
                          </div>
                          <div className="d-flex align-items-center justify-content-between border-top pt-3 mt-3">
                            <span className="text-dark">
                              <i className="ti ti-calendar-due text-gray-5" />{" "}
                              {d.expectedClosedDate
                                ? new Date(
                                    d.expectedClosedDate
                                  ).toLocaleDateString()
                                : d.expectedClosingDate
                                ? new Date(
                                    d.expectedClosingDate
                                  ).toLocaleDateString()
                                : "-"}
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

                {/* PROPOSAL Column */}
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
                            {grouped.Proposal?.length || 0} Deals
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
                              <Link
                                to={routes.dealsDetails}
                                className="avatar avatar-lg bg-gray flex-shrink-0 me-2"
                              >
                                <span className="avatar-title text-dark">
                                  {(d.initials || d.name || "D")
                                    .substring(0, 2)
                                    .toUpperCase()}
                                </span>
                              </Link>
                              <h6 className="fw-medium">
                                <Link to={routes.dealsDetails}>
                                  {d.name || "Untitled Deal"}
                                </Link>
                              </h6>
                            </div>
                          </div>
                          <div className="mb-3 d-flex flex-column">
                            <p className="text-default d-inline-flex align-items-center mb-2">
                              <i className="ti ti-currency-dollar text-dark me-2" />
                              {typeof d.dealValue === "number"
                                ? `$${d.dealValue.toLocaleString()}`
                                : typeof d.value === "number"
                                ? `$${d.value.toLocaleString()}`
                                : "-"}
                            </p>
                          </div>
                          <div className="d-flex justify-content-between align-items-center">
                            <div className="d-flex align-items-center">
                              <Link
                                to="#"
                                className="avatar avatar-md avatar-rounded flex-shrink-0 me-2"
                              >
                                <ImageWithBasePath
                                  src="assets/img/profiles/avatar-24.jpg"
                                  alt="image"
                                />
                              </Link>
                              <Link to="#" className="text-dark">
                                {d.owner?.name || d.owner || "-"}
                              </Link>
                            </div>
                            <span className="badge badge-sm badge-info-transparent">
                              <i className="ti ti-progress me-1" />
                              {typeof d.probability === "number"
                                ? `${d.probability}%`
                                : "-"}
                            </span>
                          </div>
                          <div className="d-flex align-items-center justify-content-between border-top pt-3 mt-3">
                            <span className="text-dark">
                              <i className="ti ti-calendar-due text-gray-5" />{" "}
                              {d.expectedClosedDate
                                ? new Date(
                                    d.expectedClosedDate
                                  ).toLocaleDateString()
                                : d.expectedClosingDate
                                ? new Date(
                                    d.expectedClosingDate
                                  ).toLocaleDateString()
                                : "-"}
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

                {/* WON Column */}
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
                            {grouped.Won?.length || 0} Deals
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
                              <Link
                                to={routes.dealsDetails}
                                className="avatar avatar-lg bg-gray flex-shrink-0 me-2"
                              >
                                <span className="avatar-title text-dark">
                                  {(d.initials || d.name || "D")
                                    .substring(0, 2)
                                    .toUpperCase()}
                                </span>
                              </Link>
                              <h6 className="fw-medium">
                                <Link to={routes.dealsDetails}>
                                  {d.name || "Untitled Deal"}
                                </Link>
                              </h6>
                            </div>
                          </div>
                          <div className="mb-3 d-flex flex-column">
                            <p className="text-default d-inline-flex align-items-center mb-2">
                              <i className="ti ti-currency-dollar text-dark me-2" />
                              {typeof d.dealValue === "number"
                                ? `$${d.dealValue.toLocaleString()}`
                                : typeof d.value === "number"
                                ? `$${d.value.toLocaleString()}`
                                : "-"}
                            </p>
                          </div>
                          <div className="d-flex justify-content-between align-items-center">
                            <div className="d-flex align-items-center">
                              <Link
                                to="#"
                                className="avatar avatar-md avatar-rounded flex-shrink-0 me-2"
                              >
                                <ImageWithBasePath
                                  src="assets/img/profiles/avatar-10.jpg"
                                  alt="image"
                                />
                              </Link>
                              <Link to="#" className="text-dark">
                                {d.owner?.name || d.owner || "-"}
                              </Link>
                            </div>
                            <span className="badge badge-sm badge-info-transparent">
                              <i className="ti ti-progress me-1" />
                              {typeof d.probability === "number"
                                ? `${d.probability}%`
                                : "-"}
                            </span>
                          </div>
                          <div className="d-flex align-items-center justify-content-between border-top pt-3 mt-3">
                            <span className="text-dark">
                              <i className="ti ti-calendar-due text-gray-5" />{" "}
                              {d.expectedClosedDate
                                ? new Date(
                                    d.expectedClosedDate
                                  ).toLocaleDateString()
                                : d.expectedClosingDate
                                ? new Date(
                                    d.expectedClosingDate
                                  ).toLocaleDateString()
                                : "-"}
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
              </div>
            </>
          )}
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
