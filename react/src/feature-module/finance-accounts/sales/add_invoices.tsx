import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { all_routes } from "../../router/all_routes";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import CommonSelect from "../../../core/common/commonSelect";
import { DatePicker, message } from "antd";
import { useSocket } from "../../../SocketContext";
import { Socket } from "socket.io-client";
import dayjs from "dayjs";
import Footer from "../../../core/common/footer";  


type PasswordField = "password" | "confirmPassword";

const AddInvoice = () => {
  const navigate = useNavigate();
  const socket = useSocket() as Socket | null;

  const getModalContainer = () => {
    const modalElement = document.getElementById("modal-datepicker");
    return modalElement ? modalElement : document.body;
  };

  // Dropdown options
  const paymenttypeChoose = [
    { value: "Select", label: "Select" },
    { value: "Credit", label: "Credit" },
    { value: "Debit", label: "Debit" },
  ];
  const bankChoose = [
    { value: "Select", label: "Select" },
    { value: "Bank of America", label: "Bank of America" },
    { value: "U.S. Bank", label: "U.S. Bank" },
  ];

  // Form state
  const [title, setTitle] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState<any>(null);
  const [dueDate, setDueDate] = useState<any>(null);
 const [paymentDetails, setPaymentDetails] = useState([
  { customer: "", referenceNo: "", paymentType: paymenttypeChoose[0].value, bankDetails: bankChoose[0].value }
]);

  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");

  // Items state
  const [items, setItems] = useState([
    { description: "", qty: 1, discount: 0, rate: 0 },
  ]);

  const addItem = () => {
    setItems([...items, { description: "", qty: 1, discount: 0, rate: 0 }]);
  };
const addPaymentDetail = () => {
  setPaymentDetails([
    ...paymentDetails,
    { customer: "", referenceNo: "", paymentType: paymenttypeChoose[0].value, bankDetails: bankChoose[0].value }
  ]);
};

const updatePaymentDetail = (index: number, field: string, value: any) => {
  const updated = [...paymentDetails];
  (updated[index] as any)[field] = value;
  setPaymentDetails(updated);
};



  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  // Total amount
  const totalAmount = items.reduce(
    (sum, item) => sum + item.qty * item.rate - item.discount,
    0
  );

const handleSave = (status: "Draft" | "Unpaid") => {
  console.log("🚀 handleSave called with status:", status);
  if (!socket) {
    console.error("❌ No socket connection available");
    return;
  }

  // Validation: all paymentDetails must have customer filled
  for (const pd of paymentDetails) {
    if (!pd.customer.trim()) {
      message.error("Customer field is required in Payment Details.");
      return;
    }
  }

  const firstPD = paymentDetails[0] || { customer: "", referenceNo: "", paymentType: paymenttypeChoose[0].value, bankDetails: bankChoose[0].value };

  const clientId = firstPD.customer && /^[0-9a-fA-F]{24}$/.test(firstPD.customer) ? firstPD.customer : null;

  const payload = {
    title,
    invoiceNumber,
    invoiceDate: invoiceDate ? dayjs(invoiceDate).format("YYYY-MM-DD") : null,
    dueDate: dueDate ? dayjs(dueDate).format("YYYY-MM-DD") : null,

    clientId: clientId,
    clientName: clientId ? null : (firstPD.customer || null),

    referenceNo: firstPD.referenceNo || "",
    paymentType: firstPD.paymentType || "",
    bankDetails: firstPD.bankDetails || "",

    description,
    notes,
    items,
    amount: totalAmount,
    status,
  };

  console.log("📤 Emitting event: admin/invoices/create");
  console.log("📦 Payload being sent:", payload);

  socket.emit("admin/invoices/create", payload, (res: any) => {
    console.log("📥 Response from backend:", res);
      setTitle("");
      setInvoiceNumber("");
      setInvoiceDate(null);
      setDueDate(null);
      setPaymentDetails([
        { customer: "", referenceNo: "", paymentType: paymenttypeChoose[0].value, bankDetails: bankChoose[0].value }
      ]);
      setItems([{ description: "", qty: 1, discount: 0, rate: 0 }]);
      setDescription("");
      setNotes("");
      navigate(all_routes.invoices);
  });
};


  // Password visibility (for Add Customer modal)
  const [passwordVisibility, setPasswordVisibility] = useState({
    password: false,
    confirmPassword: false,
  });
  const togglePasswordVisibility = (field: PasswordField) => {
    setPasswordVisibility((prevState) => ({
      ...prevState,
      [field]: !prevState[field],
    }));
  };

  return (
    <>
      {/* Page Wrapper */}
      <div className="page-wrapper">
        <div className="content">
          <div className="row align-items-center">
            <div className="col-md-10 mx-auto">
              <div className="card">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between mb-4">
                    <Link
                      to={all_routes.invoices}
                      className="back-icon align-items-center fs-14 d-inline-flex fw-medium"
                    >
                      <span className=" d-flex justify-content-center align-items-center rounded-circle me-2">
                        <i className="ti ti-arrow-left fs-12" />
                      </span>
                      Back to List
                    </Link>
                    <Link
                      to="#"
                      className="text-primary text-decoration-underline"
                      data-bs-toggle="modal"
                      data-bs-target="#invoice_preview"
                    >
                      Preview
                    </Link>
                  </div>

                  {/* My details */}
                  <div className="bg-light p-3 rounded mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5>From</h5>
                      <Link to="#" className="text-dark fw-medium">
                        <span className="text-gray me-2">
                          <i className="ti ti-edit" />
                        </span>
                        Edit Details
                      </Link>
                    </div>
                    <div>
                      <h4 className="mb-1">Thomas Lawler</h4>
                      <p className="mb-1">
                        2077 Chicago Avenue Orosi, CA 93647
                      </p>
                      <p className="mb-1">
                        Email :{" "}
                        <span className="text-dark">Tarala2445@example.com</span>
                      </p>
                      <p>
                        Phone : <span className="text-dark">+1 987 654 3210</span>
                      </p>
                    </div>
                  </div>
                  {/* /My details */}

                  {/* Invoice Details */}
                  <div className="border-bottom mb-3">
                    <h4 className="mb-2">Invoice Details</h4>
                    <div className="mb-2">
                      <label className="form-label">Invoice Title</label>
                      <input
                        type="text"
                        className="form-control"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </div>
                    <div className="row">
                      <div className="col-md-4 col-sm-12">
                        <div className="mb-3">
                          <label className="form-label">Invoice No</label>
                          <input
                            type="text"
                            className="form-control"
                            value={invoiceNumber}
                            onChange={(e) => setInvoiceNumber(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="col-md-4 col-sm-12">
                        <div className="mb-3">
                          <label className="form-label">Invoice Date</label>
                          <div className="input-icon position-relative w-100 me-2">
                            <span className="input-icon-addon">
                              <i className="ti ti-calendar" />
                            </span>
                            <DatePicker
                              className="form-control datetimepicker"
                              format={{ format: "DD-MM-YYYY", type: "mask" }}
                              getPopupContainer={getModalContainer}
                              placeholder="DD-MM-YYYY"
                              value={invoiceDate}
                              onChange={(date) => setInvoiceDate(date)}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4 col-sm-12">
                        <div className="mb-3">
                          <label className="form-label">Due Date</label>
                          <div className="input-icon position-relative w-100 me-2">
                            <span className="input-icon-addon">
                              <i className="ti ti-calendar" />
                            </span>
                            <DatePicker
                              className="form-control datetimepicker"
                              format={{ format: "DD-MM-YYYY", type: "mask" }}
                              getPopupContainer={getModalContainer}
                              placeholder="DD-MM-YYYY"
                              value={dueDate}
                              onChange={(date) => setDueDate(date)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* /Invoice Details */}

                  {/* Payment Details */}
                  <div className="border-bottom mb-3">
                    <h4 className="mb-2">Payment Details</h4>
                    {paymentDetails.map((pd, index) => (
                      <div className="row mb-3 border rounded p-3" key={index}>
                        <div className="col-lg-3 col-md-6 col-sm-12">
                          <div className="mb-3">
                            <div className="d-flex justify-content-between align-items-center">
                              <label className="form-label">Customer</label>
                              {index === paymentDetails.length - 1 && (
                                <Link to="#" onClick={addPaymentDetail} className="text-primary fw-medium d-flex align-items-center">
                                  <i className="ti ti-plus me-2" />
                                  Add New
                                </Link>
                              )}
                            </div>
                            <input
                              type="text"
                              className="form-control"
                              value={pd.customer}
                              onChange={(e) => updatePaymentDetail(index, "customer", e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="col-lg-3 col-md-6 col-sm-12">
                          <div className="mb-3">
                            <label className="form-label">Reference Number</label>
                            <input
                              type="text"
                              className="form-control"
                              value={pd.referenceNo}
                              onChange={(e) => updatePaymentDetail(index, "referenceNo", e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="col-lg-3 col-md-6 col-sm-12">
                          <div className="mb-3">
                            <label className="form-label">Select Payment Type</label>
                            <CommonSelect
                              className="select"
                              options={paymenttypeChoose}
                              defaultValue={paymenttypeChoose.find(opt => opt.value === pd.paymentType)}
                              onChange={(opt: any) => updatePaymentDetail(index, "paymentType", opt.value)}
                            />
                          </div>
                        </div>
                        <div className="col-lg-3 col-md-6 col-sm-12">
                          <div className="mb-3">
                            <label className="form-label">Bank Details</label>
                            <CommonSelect
                              className="select"
                              options={bankChoose}
                              defaultValue={bankChoose.find(opt => opt.value === pd.bankDetails)}
                              onChange={(opt: any) => updatePaymentDetail(index, "bankDetails", opt.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* /Payment Details */}

                  {/* Add Items */}
                  <div className="border-bottom mb-3">
                    <h4 className="mb-2">Add Items</h4>
                    {items.map((item, index) => (
                      <div className="border rounded p-3 mb-3" key={index}>
                        <div className="add-description-info">
                          <div className="row">
                            <div className="col-md-6">
                              <div className="mb-3">
                                <label className="form-label">Description</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  value={item.description}
                                  onChange={(e) =>
                                    updateItem(index, "description", e.target.value)
                                  }
                                />
                              </div>
                            </div>
                            <div className="col-md-6">
                              <div className="row">
                                <div className="col-md-4">
                                  <div className="mb-3">
                                    <label className="form-label">Qty</label>
                                    <input
                                      type="number"
                                      className="form-control"
                                      value={item.qty}
                                      onChange={(e) =>
                                        updateItem(index, "qty", Number(e.target.value))
                                      }
                                    />
                                  </div>
                                </div>
                                <div className="col-md-4">
                                  <div className="mb-3">
                                    <label className="form-label">Discount</label>
                                    <input
                                      type="number"
                                      className="form-control"
                                      value={item.discount}
                                      onChange={(e) =>
                                        updateItem(
                                          index,
                                          "discount",
                                          Number(e.target.value)
                                        )
                                      }
                                    />
                                  </div>
                                </div>
                                <div className="col-md-4">
                                  <div className="mb-3">
                                    <label className="form-label">Rate</label>
                                    <input
                                      type="number"
                                      className="form-control"
                                      value={item.rate}
                                      onChange={(e) =>
                                        updateItem(index, "rate", Number(e.target.value))
                                      }
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        {index === items.length - 1 && (
                          <Link
                            to="#"
                            onClick={addItem}
                            className="text-primary add-more-description fw-medium d-flex align-items-center"
                          >
                            <i className="ti ti-plus me-2" />
                            Add New
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                  {/* /Add Items */}

                  {/* Additional Details */}
                  <div>
                    <h4 className="mb-2">Additional Details</h4>
                    <div className="mb-3">
                      <label className="form-label"> Description</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Notes</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                  </div>
                  {/* /Additional Details */}

                  <div className="d-flex justify-content-end align-items-center flex-wrap row-gap-3">
                    <button
                      type="button"
                      onClick={() => handleSave("Draft")}
                      className="btn btn-dark d-flex justify-content-center align-items-center"
                    >
                      <i className="ti ti-printer me-2" />
                      Save as Draft
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSave("Unpaid")}
                      className="btn btn-primary d-flex justify-content-center align-items-center ms-2"
                    >
                      <i className="ti ti-copy me-2" />
                      Save &amp; Send
                    </button>

                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Footer */}
        <Footer />
        {/* /Footer */}
      </div>
      {/* /Page Wrapper */}

      {/* Invoice Preview + Add Customer Modal remain unchanged */}
      {/* (your existing modal code here) */}
    </>
  );
};

export default AddInvoice
