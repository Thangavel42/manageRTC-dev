import React, { useState, useEffect } from "react";
import CommonSelect from "../common/commonSelect";
import goalTypeService from "../services/performance/goalType.service";

const GoalTypeModal = ({ onSuccess, editData, isEdit = false, modalId = "add_goal_type" }: { 
    onSuccess?: () => void, 
    editData?: any, 
    isEdit?: boolean,
    modalId?: string 
}) => {
    const [formData, setFormData] = useState({
        type: "",
        description: "",
        status: "Active"
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Set form data when editing
    useEffect(() => {
        if (isEdit && editData) {
            setFormData({
                type: editData.type || "",
                description: editData.description || "",
                status: editData.status || "Active"
            });
        } else {
            // Reset form for add mode
            setFormData({
                type: "",
                description: "",
                status: "Active"
            });
        }
    }, [isEdit, editData]);

    const status = [
        { value: "Select", label: "Select" },
        { value: "Active", label: "Active" },
        { value: "Inactive", label: "Inactive" },
    ];

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.type.trim()) {
            setError("Goal type is required");
            return;
        }

        try {
            setLoading(true);
            setError(null);
            
            let response;
            if (isEdit && editData?._id) {
                response = await goalTypeService.updateGoalType(editData._id, formData);
            } else {
                response = await goalTypeService.createGoalType(formData);
            }
            
            console.log('API Response:', response);
            
            // FIX: Check for response.done or response.success
            if (response && (response.done || response.success)) {
                // Reset form
                setFormData({
                    type: "",
                    description: "",
                    status: "Active"
                });
                // Close modal
                const modal = document.getElementById(modalId);
                if (modal) {
                    const bootstrap = (window as any).bootstrap;
if (bootstrap && bootstrap.Modal) {
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
                alert(isEdit ? 'Goal type updated successfully!' : 'Goal type created successfully!');
            } else {
                setError(response.error || `Failed to ${isEdit ? 'update' : 'create'} goal type`);
            }
        } catch (err) {
            setError(`Failed to ${isEdit ? 'update' : 'create'} goal type`);
            console.error(`Error ${isEdit ? 'updating' : 'creating'} goal type:`, err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Add/Edit Goal Type */}
            <div className="modal fade" id={modalId}>
                <div className="modal-dialog modal-dialog-centered modal-md">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h4 className="modal-title">{isEdit ? 'Edit Goal Type' : 'Add Goal Type'}</h4>
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
                                            <input 
                                                type="text" 
                                                className="form-control" 
                                                value={formData.type}
                                                onChange={(e) => handleInputChange('type', e.target.value)}
                                                required
                                            />
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
                                            <div>
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
                                        isEdit ? 'Update Goal Type' : 'Add Goal Type'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            {/* /Add/Edit Goal Type */}
        </>
    );
};

export default GoalTypeModal;