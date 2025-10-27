import React, { useState, useEffect } from "react";
import CommonSelect from "../common/commonSelect";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface HolidayForm {
  title: string;
  date: string;
  description: string;
  status: string;
}

type Props = {
  socket: any;
  editingHoliday: HolidayForm | null;
};

const status = [
  { value: "Select", label: "Select" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const getModalContainer = () => {
  const modalElement = document.getElementById("modal-datepicker");
  return modalElement ? modalElement : document.body; // Fallback to document.body if modalElement is null
};

const HolidaysModal = ({ socket, editingHoliday }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<HolidayForm>({
    title: "",
    date: "",
    description: "",
    status: "Select",
  });

  useEffect(() => {
    if (editingHoliday) {
      setFormData(editingHoliday);
    } else {
      setFormData({
        title: "",
        date: "",
        description: "",
        status: "Select",
      });
    }
  }, [editingHoliday]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.date) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    console.log("formDate", formData);

    // emit with acknowledgement
    socket.emit("hrm/holiday/add", formData, (response: any) => {
      setLoading(false);
      if (response?.done) {
        // reset fields
        setFormData({
          title: "",
          date: "",
          description: "",
          status: "Select",
        });
      }
    });
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.date) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setLoading(true);

    const payload = { ...formData, holidayId: editingHoliday?._id };
    console.log(payload);

    socket.emit("hrm/holiday/update", payload, (response: any) => {
      setLoading(false);
      if (response?.done) {
        toast.success("Holiday updated successfully");
        setFormData({
          title: "",
          date: "",
          description: "",
          status: "Select",
        });
      } else {
        toast.error(response?.message || "Failed to update holiday");
      }
    });
  };

  const handleStatusChange = (selected: { value: string; label: string }) => {
    setFormData((prev) => ({
      ...prev,
      status: selected.value,
    }));
  };

  return (
    <>
      {/* Add Plan */}
      <div className="modal fade" id="add_holiday">
        <div className="modal-dialog modal-dialog-centered modal-md">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Add Holiday</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body pb-0">
                <div className="row">
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Title</label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        className="form-control"
                      />
                    </div>
                  </div>

                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Date</label>
                      <div className="input-icon-end position-relative">
                        <DatePicker
                          className="form-control datetimepicker"
                          format={{
                            format: "DD-MM-YYYY",
                            type: "mask",
                          }}
                          getPopupContainer={getModalContainer}
                          placeholder="DD-MM-YYYY"
                          name="date"
                          value={formData.date ? dayjs(formData.date) : null}
                          onChange={(date) => {
                            setFormData((prev) => ({
                              ...prev,
                              date: date ? date.format("YYYY-MM-DD") : "",
                            }));
                          }}
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
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        className="form-control"
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Status</label>
                      <CommonSelect
                        className="select"
                        options={status}
                        value={
                          status.find(option => option.value === formData.status) || status[0]
                        }
                        onChange={selectedOption =>
                          setFormData(prev =>
                            prev ? { ...prev, status: selectedOption?.value || "" } : prev
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-light me-2"
                  data-bs-dismiss="modal"
                >
                  Cancel
                </button>
                <button type="submit" data-bs-dismiss="modal" className="btn btn-primary">
                  Add Holiday
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Add Plan */}
      {/* Edit Plan */}
      <div className="modal fade" id="edit_holiday">
        <div className="modal-dialog modal-dialog-centered modal-md">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Edit Holiday</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body pb-0">
                <div className="row">
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Title</label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        className="form-control"
                      />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Date</label>
                      <div className="input-icon-end position-relative">
                        <DatePicker
                          className="form-control datetimepicker"
                          format={{
                            format: "DD-MM-YYYY",
                            type: "mask",
                          }}
                          getPopupContainer={getModalContainer}
                          placeholder="DD-MM-YYYY"
                          name="date"
                          value={formData.date ? dayjs(formData.date) : null}
                          onChange={(date) => {
                            setFormData((prev) => ({
                              ...prev,
                              date: date ? date.format("YYYY-MM-DD") : "",
                            }));
                          }}
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
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        className="form-control"
                        rows={3}
                      />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Status</label>
                      <CommonSelect
                        className="select"
                        options={status}
                        defaultValue={status.find((opt) => opt.value === formData.status)}
                        onChange={handleStatusChange}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-light me-2"
                  data-bs-dismiss="modal"
                >
                  Cancel
                </button>
                <button type="submit" data-bs-dismiss="modal" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Edit Plan */}
      <ToastContainer />
    </>
  );
};

export default HolidaysModal;
