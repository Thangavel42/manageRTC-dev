import { DatePicker } from 'antd';
import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import CommonSelect from '../common/commonSelect';
import CommonTagsInput from '../common/Taginput';
import { useDeals } from '../../hooks/useDeals';
import { message } from 'antd';

const AddDeals = () => {
  const { createDeal } = useDeals();
  const [loading, setLoading] = useState(false);

  const getModalContainer = () => {
    const modalElement = document.getElementById('modal-datepicker');
    return modalElement ? modalElement : document.body; // Fallback to document.body if modalElement is null
  };
  const dealsName = [
    { value: "Select", label: "Select" },
    { value: "Collins", label: "Collins" },
    { value: "Konopelski", label: "Konopelski" },
    { value: "Adams", label: "Adams" },
  ];
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
  const period = [
    { value: "Select", label: "Select" },
    { value: "Days", label: "Days" },
    { value: "Months", label: "Months" },
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

  const assigneeChoose = [
    { value: "Select", label: "Select" },
    { value: "Active", label: "Active" },
    { value: "Inactive", label: "Inactive" },
  ]
  const priorityChoose = [
    { value: "Select", label: "Select" },
    { value: "High", label: "High" },
    { value: "Low", label: "Low" },
    { value: "Medium", label: "Medium" },
  ]
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    initials: '',
    stage: 'New',
    status: 'Open',
    dealValue: '',
    probability: '',
    expectedClosedDate: null as any,
    owner: { name: '', avatar: '' },
    contact: { email: '', phone: '' },
    address: '',
    tags: [],
    pipeline: '',
    currency: 'USD',
    dueDate: null as any,
    followupDate: null as any,
    source: '',
    priority: 'Medium',
    description: ''
  });

  const [tags, setTags] = useState<string[]>([]);
  const [contacts, setContacts] = useState<string[]>([]);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [projects, setProjects] = useState<string[]>([]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Prepare deal data according to new schema
      const dealData = {
        name: formData.name,
        initials: formData.initials,
        stage: formData.stage as "New" | "Prospect" | "Proposal" | "Won" | "Lost",
        status: formData.status as "Won" | "Lost" | "Open",
        dealValue: parseFloat(formData.dealValue) || 0,
        probability: parseInt(formData.probability) || 0,
        expectedClosedDate: formData.expectedClosedDate ? formData.expectedClosedDate.format('YYYY-MM-DD') : undefined,
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
        dueDate: formData.dueDate ? formData.dueDate.format('YYYY-MM-DD') : undefined,
        followupDate: formData.followupDate ? formData.followupDate.format('YYYY-MM-DD') : undefined,
        source: formData.source,
        priority: formData.priority as "High" | "Medium" | "Low",
        description: formData.description,
        contacts: contacts,
        assignees: assignees,
        projects: projects
      };

      const success = await createDeal(dealData);
      if (success) {
        // Reset form
        setFormData({
          name: '',
          initials: '',
          stage: 'New',
          status: 'Open',
          dealValue: '',
          probability: '',
          expectedClosedDate: null as any,
          owner: { name: '', avatar: '' },
          contact: { email: '', phone: '' },
          address: '',
          tags: [],
          pipeline: '',
          currency: 'USD',
          dueDate: null as any,
          followupDate: null as any,
          source: '',
          priority: 'Medium',
          description: ''
        });
        setTags([]);
        setContacts([]);
        setAssignees([]);
        setProjects([]);
        
        // Close modal
        const modal = document.getElementById('add_deals');
        if (modal) {
          const bootstrap = (window as any).bootstrap;
          const modalInstance = bootstrap.Modal.getInstance(modal);
          if (modalInstance) {
            modalInstance.hide();
          }
        }
      }
    } catch (error) {
      console.error('Error creating deal:', error);
      message.error('Failed to create deal');
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      {/* Add Deals */}
      <div className="modal fade" id="add_deals">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Add New Deals</h4>
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
                    <div className="mb-3">
                        <label className="form-label">
                        Stage <span className="text-danger"> *</span>
                        </label>
                      <CommonSelect
                        className='select'
                        options={[
                          { value: "New", label: "New" },
                          { value: "Prospect", label: "Prospect" },
                          { value: "Proposal", label: "Proposal" },
                          { value: "Won", label: "Won" },
                          { value: "Lost", label: "Lost" }
                        ]}
                        defaultValue={{ value: formData.stage, label: formData.stage }}
                        onChange={(option: any) => handleInputChange('stage', option.value)}
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
                        defaultValue={{ value: formData.status, label: formData.status }}
                        onChange={(option: any) => handleInputChange('status', option.value)}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
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
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Probability <span className="text-danger"> *</span>
                      </label>
                      <input 
                        type="number" 
                        className="form-control" 
                        value={formData.probability}
                        onChange={(e) => handleInputChange('probability', e.target.value)}
                        required
                        min="0"
                        max="100"
                        placeholder="0-100"
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
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
                        Owner Avatar URL
                      </label>
                      <input 
                        type="url" 
                        className="form-control" 
                        value={formData.owner.avatar}
                        onChange={(e) => handleInputChange('owner', { ...formData.owner, avatar: e.target.value })}
                        placeholder="https://example.com/avatar.jpg"
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
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Address
                      </label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        placeholder="e.g., New York, United States"
                      />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Project<span className="text-danger"> *</span>
                      </label>
                      <CommonTagsInput
                        value={projects}
                        onChange={setProjects}
                        placeholder="Add new"
                        className="custom-input-class" // Optional custom class
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Due Date <span className="text-danger"> *</span>{" "}
                      </label>
                      <div className="input-icon-end position-relative">
                        <CommonSelect
                          className='select'
                          options={assigneeChoose}
                          defaultValue={assigneeChoose[0]}
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
                        Expected Closed Date{" "}
                        <span className="text-danger"> *</span>{" "}
                      </label>
                      <div className="input-icon-end position-relative">
                        <DatePicker
                          className="form-control datetimepicker"
                          format={{
                            format: "DD-MM-YYYY",
                            type: "mask",
                          }}
                          getPopupContainer={getModalContainer}
                          placeholder="DD-MM-YYYY"
                          value={formData.expectedClosedDate}
                          onChange={(date) => handleInputChange('expectedClosedDate', date)}
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
                        value={assignees}
                        onChange={setAssignees}
                        placeholder="Add New"
                        className="custom-input-class" // Optional custom class
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3 ">
                      <label className="form-label">
                        Tags
                      </label>
                      <CommonTagsInput
                        value={tags}
                        onChange={setTags}
                        placeholder="Add New"
                        className="custom-input-class" // Optional custom class
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3 ">
                      <label className="form-label">
                        Followup Date <span className="text-danger"> *</span>
                      </label>
                      <div className="input-icon-end position-relative">
                        <DatePicker
                          className="form-control datetimepicker"
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
                        Source <span className="text-danger"> *</span>
                      </label>
                      <CommonSelect
                        className='select'
                        options={source}
                        defaultValue={source[0]}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3 ">
                      <label className="form-label">
                        Priority <span className="text-danger"> *</span>
                      </label>
                      <CommonSelect
                        className='select'
                        options={priorityChoose}
                        defaultValue={priorityChoose[0]}
                      />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3 ">
                      <label className="form-label">
                        Description <span className="text-danger"> *</span>
                      </label>
                      <textarea className="form-control" defaultValue={""} />
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
                  {loading ? 'Adding...' : 'Add Deal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Add Deals */}
    </>



  )
}

export default AddDeals
