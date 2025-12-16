import React, { useState, useEffect } from "react";
import CommonSelect from "../common/commonSelect";
import { DatePicker } from "antd";
import goalTrackingService from "../services/performance/goalTracking.service";

const GoalTrackingModal = ({ onSuccess, editData, isEdit = false, modalId = "add_goal" }: { 
  onSuccess?: () => void, 
  editData?: any, 
  isEdit?: boolean,
  modalId?: string 
}) => {
  const [formData, setFormData] = useState({
    goalType: "",
    subject: "",
    targetAchievement: "",
    startDate: null as any,
    endDate: null as any,
    description: "",
    status: "Active",
    progress: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set form data when editing
  useEffect(() => {
    if (isEdit && editData) {
      setFormData({
        goalType: editData.goalType || "",
        subject: editData.subject || "",
        targetAchievement: editData.targetAchievement || "",
        startDate: editData.startDate ? new Date(editData.startDate) : null,
        endDate: editData.endDate ? new Date(editData.endDate) : null,
        description: editData.description || "",
        status: editData.status || "Active",
        progress: editData.progress || ""
      });
    } else {
      // Reset form for add mode
      setFormData({
        goalType: "",
        subject: "",
        targetAchievement: "",
        startDate: null,
        endDate: null,
        description: "",
        status: "Active",
        progress: ""
      });
    }
  }, [isEdit, editData]);

  const goalType = [
    { value: "Select", label: "Select" },
    { value: "Development Goals", label: "Development Goals" },
    { value: "Project Goals", label: "Project Goals" },
    { value: "Performance Goals", label: "Performance Goals" },
    { value: "Learning Goals", label: "Learning Goals" },
  ];
  const status = [
    { value: "Select", label: "Select" },
    { value: "Active", label: "Active" },
    { value: "Inactive", label: "Inactive" },
    { value: "Completed", label: "Completed" },
    { value: "Pending", label: "Pending" },
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.goalType || formData.goalType === "Select") {
      setError("Goal type is required");
      return;
    }
    if (!formData.subject.trim()) {
      setError("Subject is required");
      return;
    }
    if (!formData.startDate) {
      setError("Start date is required");
      return;
    }
    if (!formData.endDate) {
      setError("End date is required");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const submitData = {
        ...formData,
        startDate: formData.startDate?.format('YYYY-MM-DD'),
        endDate: formData.endDate?.format('YYYY-MM-DD')
      };
      
      let response;
      if (isEdit && editData?._id) {
        response = await goalTrackingService.updateGoalTracking(editData._id, submitData);
      } else {
        response = await goalTrackingService.createGoalTracking(submitData);
      }
      
      console.log('Goal Tracking API Response:', response);
      
      if (response && (response.done || response.success)) {
        // Reset form
        setFormData({
          goalType: "",
          subject: "",
          targetAchievement: "",
          startDate: null,
          endDate: null,
          description: "",
          status: "Active",
          progress: ""
        });
        
        // Close modal
        const modal = document.getElementById(modalId);
        if (modal) {
          const bootstrap = (window as any).bootstrap;
          if (bootstrap && bootstrap.Modal){
            const modalInstance = bootstrap.Modal.getInstance(modal);
            if (modalInstance) {
              modalInstance.hide();
            }
          }
        }
        
        // Refresh data
        if (onSuccess) {
          onSuccess();
        }
        
        // Show success message
        alert(isEdit ? 'Goal tracking updated successfully!' : 'Goal tracking created successfully!');
      } else {
        setError(response.error || `Failed to ${isEdit ? 'update' : 'create'} goal tracking`);
      }
    } catch (err) {
      setError(`Failed to ${isEdit ? 'update' : 'create'} goal tracking`);
      console.error(`Error ${isEdit ? 'updating' : 'creating'} goal tracking:`, err);
    } finally {
      setLoading(false);
    }
  };

  const getModalContainer = () => {
    const modalElement = document.getElementById("modal-datepicker");
    return modalElement ? modalElement : document.body;
  };

  return (
    <>
      {/* Add/Edit Goal Tracking */}
      <div className="modal fade" id={modalId}>
        <div className="modal-dialog modal-dialog-centered modal-md">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">{isEdit ? 'Edit Goal Tracking' : 'Add Goal Tracking'}</h4>
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
                {error && (
                  <div className="alert alert-danger" role="alert">
                    {error}
                  </div>
                )}
                <div className="row">
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Goal Type *</label>
                      <CommonSelect
                        className="select"
                        options={goalType}
                        defaultValue={goalType.find(gt => gt.value === formData.goalType) || goalType[0]}
                        onChange={(option) => handleInputChange('goalType', option?.value || '')}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Subject *</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={formData.subject}
                        onChange={(e) => handleInputChange('subject', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Target Achievement</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={formData.targetAchievement}
                        onChange={(e) => handleInputChange('targetAchievement', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Start Date *</label>
                      <div className="input-icon-end position-relative">
                        <DatePicker
                          className="form-control datetimepicker"
                          format={{
                            format: "DD-MM-YYYY",
                            type: "mask",
                          }}
                          getPopupContainer={getModalContainer}
                          placeholder="DD-MM-YYYY"
                          value={formData.startDate}
                          onChange={(date) => handleInputChange('startDate', date)}
                        />
                        <span className="input-icon-addon">
                          <i className="ti ti-calendar text-gray-7" />
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">End Date *</label>
                      <div className="input-icon-end position-relative">
                        <DatePicker
                          className="form-control datetimepicker"
                          format={{
                            format: "DD-MM-YYYY",
                            type: "mask",
                          }}
                          getPopupContainer={getModalContainer}
                          placeholder="DD-MM-YYYY"
                          value={formData.endDate}
                          onChange={(date) => handleInputChange('endDate', date)}
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
                        className="form-control" 
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
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
                        defaultValue={status.find(s => s.value === formData.status) || status[1]}
                        onChange={(option) => handleInputChange('status', option?.value || '')}
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
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      {isEdit ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    isEdit ? 'Update Goal Tracking' : 'Add Goal Tracking'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Add/Edit Goal Tracking */}
    </>
  );
};

export default GoalTrackingModal;