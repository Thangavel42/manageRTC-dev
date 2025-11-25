import { DatePicker } from 'antd';
import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import CommonSelect from '../common/commonSelect';
import CommonTagsInput from '../common/Taginput';
import { useDeals, Deal } from '../../hooks/useDeals';
import { message } from 'antd';
import dayjs, { Dayjs } from 'dayjs';

interface EditDealsProps {
  selectedDeal?: Deal | null;
}

const EditDeals = ({ selectedDeal }: EditDealsProps) => {
  const { updateDeal } = useDeals();
  const [loading, setLoading] = useState(false);

  const getModalContainer = () => {
    const modalElement = document.getElementById('modal-datepicker');
    return modalElement ? modalElement : document.body; // Fallback to document.body if modalElement is null
  };
  const pipelineChoose = [
    { value: "Select", label: "Select" },
    { value: "Sales", label: "Sales" },
    { value: "Marketing", label: "Marketing" },
    { value: "Calls", label: "Calls" },
  ];
  const currency = [
    { value: "Select", label: "Select" },
    { value: "Dollar", label: "Dollar" },
    { value: "Euro", label: "Euro" },
  ];
  const source = [
    { value: "Select", label: "Select" },
    { value: "Phone Calls", label: "Phone Calls" },
    { value: "Social Media", label: "Social Media" },
    { value: "Refferal Sites", label: "Refferal Sites" },
    { value: "Web Analytics", label: "Web Analytics" },
    { value: "Previous Purchase", label: "Previous Purchase" },
  ];
  const statusChoose = [
    { value: "Select", label: "Select" },
    { value: "Open", label: "Open" },
    { value: "Won", label: "Won" },
    { value: "Lost", label: "Lost" },
  ]
  const stageChoose = [
    { value: "Select", label: "Select" },
    { value: "New", label: "New" },
    { value: "Prospect", label: "Prospect" },
    { value: "Proposal", label: "Proposal" },
    { value: "Won", label: "Won" },
    { value: "Lost", label: "Lost" },
  ]
  const priorityChoose = [
    { value: "Select", label: "Select" },
    { value: "High", label: "High" },
    { value: "Low", label: "Low" },
    { value: "Medium", label: "Medium" },
  ]
  const projectChoose = [
    { value: "Select", label: "Select" },
    { value: "Office Management App", label: "Office Management App" },
    { value: "Clinic Management", label: "Clinic Management" },
    { value: "Educational Platform", label: "Educational Platform" },
  ]
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    initials: '',
    stage: 'New' as 'New' | 'Prospect' | 'Proposal' | 'Won' | 'Lost',
    status: 'Open' as 'Won' | 'Lost' | 'Open',
    dealValue: '',
    probability: '',
    expectedClosedDate: null as Dayjs | null,
    owner: { name: '', avatar: '' },
    contact: { email: '', phone: '' },
    address: '',
    tags: [] as string[],
    pipeline: '',
    currency: 'USD',
    dueDate: null as Dayjs | null,
    followupDate: null as Dayjs | null,
    source: '',
    priority: 'Medium' as 'High' | 'Medium' | 'Low',
    description: ''
  });

  const [tags, setTags] = useState<string[]>([]);
  const [tags2, setTags2] = useState<string[]>([]);
  const [tags3, setTags3] = useState<string[]>([]);
  const [contacts, setContacts] = useState<string[]>([]);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [projects, setProjects] = useState<string[]>([]);

  // Populate form when selectedDeal changes
  useEffect(() => {
    if (selectedDeal) {
      setFormData({
        name: selectedDeal.name || '',
        initials: selectedDeal.initials || '',
        stage: selectedDeal.stage || 'New',
        status: selectedDeal.status || 'Open',
        dealValue: selectedDeal.dealValue?.toString() || selectedDeal.value?.toString() || '',
        probability: selectedDeal.probability?.toString() || '',
        expectedClosedDate: selectedDeal.expectedClosedDate ? dayjs(selectedDeal.expectedClosedDate) : null,
        owner: {
          name: selectedDeal.owner?.name || '',
          avatar: selectedDeal.owner?.avatar || ''
        },
        contact: {
          email: selectedDeal.contact?.email || '',
          phone: selectedDeal.contact?.phone || ''
        },
        address: selectedDeal.address || '',
        tags: selectedDeal.tags || [],
        pipeline: selectedDeal.pipeline || '',
        currency: selectedDeal.currency || 'USD',
        dueDate: selectedDeal.dueDate ? dayjs(selectedDeal.dueDate) : null,
        followupDate: selectedDeal.followupDate ? dayjs(selectedDeal.followupDate) : null,
        source: (selectedDeal as any).source || '',
        priority: selectedDeal.priority || 'Medium',
        description: (selectedDeal as any).description || ''
      });
      setTags(selectedDeal.tags || []);
    }
  }, [selectedDeal]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeal) return;
    
    setLoading(true);

    try {
      // Prepare deal data according to new schema
      const dealData = {
        name: formData.name,
        initials: formData.initials,
        stage: formData.stage as 'New' | 'Prospect' | 'Proposal' | 'Won' | 'Lost',
        status: formData.status,
        dealValue: parseFloat(formData.dealValue) || 0,
        probability: parseInt(formData.probability) || 0,
        expectedClosedDate: formData.expectedClosedDate?.format('YYYY-MM-DD'),
        owner: {
          name: formData.owner.name,
          avatar: formData.owner.avatar
        },
        contact: {
          email: formData.contact.email,
          phone: formData.contact.phone
        },
        address: formData.address,
        tags: tags,
        // Legacy fields for backward compatibility
        pipeline: formData.pipeline,
        currency: formData.currency,
        dueDate: formData.dueDate?.format('YYYY-MM-DD'),
        followupDate: formData.followupDate?.format('YYYY-MM-DD'),
        source: formData.source,
        priority: formData.priority,
        description: formData.description,
        contacts: contacts,
        assignees: assignees,
        projects: projects
      };

      const success = await updateDeal(selectedDeal.id || selectedDeal._id || '', dealData);
      if (success) {
        // Close modal
        const modal = document.getElementById('edit_deals');
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
      console.error('Error updating deal:', error);
      message.error('Failed to update deal');
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      {/* Edit Deals */}
      <div className="modal fade" id="edit_deals">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Edit Deals</h4>
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
                  <div className="col-md-8">
                    <div className="mb-3">
                      <label className="form-label">
                        Deal Name <span className="text-danger"> *</span>
                      </label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label className="form-label">
                        Initials
                      </label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={formData.initials}
                        onChange={(e) => handleInputChange('initials', e.target.value)}
                        placeholder="e.g., WR, CB"
                        maxLength={10}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="input-block mb-3">
                      <div className="d-flex justify-content-between align-items-center">
                        <label className="form-label">
                          Pipeline <span className="text-danger"> *</span>
                        </label>
                        <Link
                          to="#"
                          className="add-new text-primary"
                          data-bs-target="#add_pipeline"
                          data-bs-toggle="modal"
                        >
                          <i className="ti ti-plus text-primary me-1" />
                          Add New
                        </Link>
                      </div>
                      <CommonSelect
                        className='select'
                        options={pipelineChoose}
                        defaultValue={pipelineChoose.find(p => p.value === formData.pipeline) || pipelineChoose[1]}
                        onChange={(value) => handleInputChange('pipeline', value)}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Stage <span className="text-danger"> *</span>
                      </label>
                      <CommonSelect
                        className='select'
                        options={stageChoose}
                        defaultValue={stageChoose.find(s => s.value === formData.stage) || stageChoose[1]}
                        onChange={(value) => handleInputChange('stage', value)}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Status <span className="text-danger"> *</span>
                      </label>
                      <CommonSelect
                        className='select'
                        options={statusChoose}
                        defaultValue={statusChoose.find(s => s.value === formData.status) || statusChoose[1]}
                        onChange={(value) => handleInputChange('status', value)}
                      />
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label className="form-label">
                        Deal Value <span className="text-danger"> *</span>
                      </label>
                      <input 
                        type="number" 
                        className="form-control" 
                        value={formData.dealValue}
                        onChange={(e) => handleInputChange('dealValue', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label className="form-label">
                        Currency<span className="text-danger"> *</span>
                      </label>
                      <CommonSelect
                        className='select'
                        options={currency}
                        defaultValue={currency.find(c => c.value === formData.currency) || currency[1]}
                        onChange={(value) => handleInputChange('currency', value)}
                      />
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label className="form-label">
                        Probability <span className="text-danger"> *</span>
                      </label>
                      <input 
                        type="number" 
                        className="form-control" 
                        value={formData.probability}
                        onChange={(e) => handleInputChange('probability', e.target.value)}
                        min="0"
                        max="100"
                        required
                      />
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label className="form-label">
                        Owner Name <span className="text-danger"> *</span>
                      </label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={formData.owner.name}
                        onChange={(e) => handleInputChange('owner', { ...formData.owner, name: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Owner Avatar
                      </label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={formData.owner.avatar}
                        onChange={(e) => handleInputChange('owner', { ...formData.owner, avatar: e.target.value })}
                        placeholder="Avatar URL"
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Contact Email
                      </label>
                      <input 
                        type="email" 
                        className="form-control" 
                        value={formData.contact.email}
                        onChange={(e) => handleInputChange('contact', { ...formData.contact, email: e.target.value })}
                        placeholder="contact@example.com"
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Contact Phone
                      </label>
                      <input 
                        type="tel" 
                        className="form-control" 
                        value={formData.contact.phone}
                        onChange={(e) => handleInputChange('contact', { ...formData.contact, phone: e.target.value })}
                        placeholder="+1-555-0123"
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Address
                      </label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        placeholder="City, Country"
                      />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Contact <span className="text-danger"> *</span>
                      </label>
                      <CommonTagsInput
                        value={tags3}
                        onChange={setTags3}
                        placeholder="Add new"
                        className="custom-input-class" // Optional custom class
                      />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Project * <span className="text-danger"> *</span>
                      </label>
                      <CommonSelect
                        className='select'
                        options={projectChoose}
                        defaultValue={projectChoose[1]}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Due Date
                      </label>
                      <div className="input-icon-end position-relative">
                        <DatePicker
                          className="form-control datetimepicker"
                          value={formData.dueDate}
                          onChange={(date) => handleInputChange('dueDate', date)}
                          format={{
                            format: "DD-MM-YYYY",
                            type: "mask",
                          }}
                          getPopupContainer={getModalContainer}
                          placeholder="DD-MM-YYYY"
                        />
                        <span className="input-icon-addon">
                          <i className="ti ti-calendar text-gray-7" />
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Expected Closing Date{" "}
                        <span className="text-danger"> *</span>{" "}
                      </label>
                      <div className="input-icon-end position-relative">
                        <DatePicker
                          className="form-control datetimepicker"
                          value={formData.expectedClosedDate}
                          onChange={(date) => handleInputChange('expectedClosedDate', date)}
                          format={{
                            format: "DD-MM-YYYY",
                            type: "mask",
                          }}
                          getPopupContainer={getModalContainer}
                          placeholder="DD-MM-YYYY"
                        />
                        <span className="input-icon-addon">
                          <i className="ti ti-calendar text-gray-7" />
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3 ">
                      <label className="form-label">
                        Assignee <span className="text-danger"> *</span>
                      </label>
                      <CommonTagsInput
                        value={tags}
                        onChange={setTags}
                        placeholder="Add new"
                        className="custom-input-class" // Optional custom class
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3 ">
                      <label className="form-label">
                        Tags <span className="text-danger"> *</span>
                      </label>
                      <CommonTagsInput
                        value={tags2}
                        onChange={setTags2}
                        placeholder="Add new"
                        className="custom-input-class" // Optional custom class
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3 ">
                      <label className="form-label">
                        Followup Date
                      </label>
                      <div className="input-icon-end position-relative">
                        <DatePicker
                          className="form-control datetimepicker"
                          value={formData.followupDate}
                          onChange={(date) => handleInputChange('followupDate', date)}
                          format={{
                            format: "DD-MM-YYYY",
                            type: "mask",
                          }}
                          getPopupContainer={getModalContainer}
                          placeholder="DD-MM-YYYY"
                        />
                        <span className="input-icon-addon">
                          <i className="ti ti-calendar text-gray-7" />
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3 ">
                      <label className="form-label">
                        Source
                      </label>
                      <CommonSelect
                        className='select'
                        options={source}
                        defaultValue={source.find(s => s.value === formData.source) || source[1]}
                        onChange={(value) => handleInputChange('source', value)}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3 ">
                      <label className="form-label">
                        Priority
                      </label>
                      <CommonSelect
                        className='select'
                        options={priorityChoose}
                        defaultValue={priorityChoose.find(p => p.value === formData.priority) || priorityChoose[1]}
                        onChange={(value) => handleInputChange('priority', value)}
                      />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3 ">
                      <label className="form-label">
                        Description
                      </label>
                      <textarea 
                        className="form-control" 
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        rows={3}
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
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Edit Deals */}
    </>

  )
}

export default EditDeals
