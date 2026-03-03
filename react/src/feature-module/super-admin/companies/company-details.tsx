import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import CollapseHeader from '../../../core/common/collapse-header/collapse-header';
import CommonSelect from '../../../core/common/commonSelect';
import Footer from '../../../core/common/footer';
import ImageWithBasePath from '../../../core/common/imageWithBasePath';
import {
  useSuperadminCompaniesREST,
  type CompanyDetails,
} from '../../../hooks/useSuperadminCompaniesREST';
import { useCompanyChangeRequestREST, type CompanyChangeRequest } from '../../../hooks/useCompanyChangeRequestREST';
import { all_routes } from '../../router/all_routes';

// Skeleton Loaders
const ProfileHeaderSkeleton = () => (
  <div className="card mb-3">
    <div className="card-body">
      <div className="d-flex align-items-center">
        <div className="me-3">
          <div
            className="skeleton-loader rounded-circle"
            style={{ width: '120px', height: '120px' }}
          />
        </div>
        <div className="flex-grow-1">
          <div
            className="skeleton-loader mb-2"
            style={{ width: '200px', height: '28px' }}
          />
          <div
            className="skeleton-loader mb-2"
            style={{ width: '300px', height: '20px' }}
          />
          <div
            className="skeleton-loader"
            style={{ width: '150px', height: '20px' }}
          />
        </div>
      </div>
    </div>
  </div>
);

const SectionCardSkeleton = () => (
  <div className="card mb-3">
    <div className="card-header">
      <div
        className="skeleton-loader"
        style={{ width: '180px', height: '24px' }}
      />
    </div>
    <div className="card-body">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="row mb-3">
          <div className="col-md-4">
            <div
              className="skeleton-loader"
              style={{ width: '100%', height: '20px' }}
            />
          </div>
          <div className="col-md-8">
            <div
              className="skeleton-loader"
              style={{ width: '80%', height: '20px' }}
            />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Info Row Component
const InfoRow = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <div className="row mb-3">
    <div className="col-md-4">
      <span className="text-muted fw-medium">{label}</span>
    </div>
    <div className="col-md-8">
      <span>{value || 'N/A'}</span>
    </div>
  </div>
);

const CompanyDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const routes = all_routes;

  const { companyDetails, detailsLoading, viewCompany, updateCompany, packages } =
    useSuperadminCompaniesREST();
  const {
    allRequests: changeRequests,
    loading: crLoading,
    fetchAllRequests,
    approveField,
    rejectField,
    bulkApprove,
    bulkReject,
  } = useCompanyChangeRequestREST();

  const [activeTab, setActiveTab] = useState('general');
  const [showEditModal, setShowEditModal] = useState(false);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [logo, setLogo] = useState<string | null>(null);
  const [imageUpload, setImageUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inputKey, setInputKey] = useState(Date.now());
  const [rejectNoteMap, setRejectNoteMap] = useState<Record<string, string>>({});
  const [showRejectInput, setShowRejectInput] = useState<string | null>(null);

  const [formData, setFormData] = useState<Record<string, any>>({
    _id: '',
    name: '',
    email: '',
    domain: '',
    phone: '',
    phone2: '',
    fax: '',
    website: '',
    address: '',
    status: 'Active',
    plan_name: '',
    plan_type: '',
    plan_id: '',
    currency: '',
    description: '',
    // Registration & Legal
    legalName: '',
    registrationNumber: '',
    taxId: '',
    taxIdType: '',
    legalEntityType: '',
    incorporationCountry: '',
    // Industry & Classification
    industry: '',
    subIndustry: '',
    companySize: '',
    companyType: '',
    // Contact & Founder
    contactPerson: { name: '', email: '', phone: '', designation: '' },
    founderName: '',
    // Social
    social: { linkedin: '', twitter: '', facebook: '', instagram: '' },
    // Structured Address
    structuredAddress: { street: '', street2: '', city: '', state: '', country: '', postalCode: '' },
    // Billing
    billingEmail: '',
    billingAddress: { street: '', city: '', state: '', postalCode: '', country: '' },
  });

  const handleEditCompany = () => {
    if (companyDetails) {
      setFormData({
        _id: companyDetails._id || companyDetails.id || '',
        name: companyDetails.name || '',
        email: companyDetails.email || '',
        domain: companyDetails.domain || '',
        phone: companyDetails.phone || '',
        phone2: companyDetails.phone2 || '',
        fax: companyDetails.fax || '',
        website: companyDetails.website || '',
        address: companyDetails.address || '',
        status: companyDetails.status || 'Active',
        plan_name: companyDetails.plan_name || '',
        plan_type: companyDetails.plan_type || '',
        plan_id: companyDetails.plan_id || '',
        currency: companyDetails.currency || '',
        description: companyDetails.description || '',
        legalName: companyDetails.legalName || '',
        registrationNumber: companyDetails.registrationNumber || '',
        taxId: companyDetails.taxId || '',
        taxIdType: companyDetails.taxIdType || '',
        legalEntityType: companyDetails.legalEntityType || '',
        incorporationCountry: companyDetails.incorporationCountry || '',
        industry: companyDetails.industry || '',
        subIndustry: companyDetails.subIndustry || '',
        companySize: companyDetails.companySize || '',
        companyType: companyDetails.companyType || '',
        contactPerson: companyDetails.contactPerson || { name: '', email: '', phone: '', designation: '' },
        founderName: companyDetails.founderName || '',
        social: companyDetails.social || { linkedin: '', twitter: '', facebook: '', instagram: '' },
        structuredAddress: companyDetails.structuredAddress || { street: '', street2: '', city: '', state: '', country: '', postalCode: '' },
        billingEmail: companyDetails.billingEmail || '',
        billingAddress: companyDetails.billingAddress || { street: '', city: '', state: '', postalCode: '', country: '' },
      });
      setLogo(companyDetails.logo || null);
      setShowEditModal(true);
    }
  };

  // Form handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let processedValue = value;

    // Convert domain and website to lowercase
    if (name === 'domain' || name === 'website') {
      processedValue = value.toLowerCase();
    }

    setFormData((prevState) => ({
      ...prevState,
      [name]: processedValue,
    }));
  };

  // Handle nested object field changes (for structuredAddress, contactPerson, social, billingAddress)
  const handleNestedInputChange = (parentKey: string, childKey: string, value: any) => {
    setFormData((prevState: any) => ({
      ...prevState,
      [parentKey]: {
        ...(prevState[parentKey] || {}),
        [childKey]: value,
      },
    }));
  };

  const handleSelectChange = (name: string, selectedOption: any) => {
    if (!selectedOption) return;
    setFormData((prevState) => ({
      ...prevState,
      [name]: selectedOption.value,
    }));
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    setLogo(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'amasqis');

    const res = await fetch(
      'https://api.cloudinary.com/v1_1/dwc3b5zfe/image/upload',
      {
        method: 'POST',
        body: formData,
      }
    );

    const data = await res.json();
    return data.secure_url;
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const maxSize = 4 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File size must be less than 4MB.');
      event.target.value = '';
      return;
    }

    if (['image/jpeg', 'image/png', 'image/jpg', 'image/ico'].includes(file.type)) {
      setImageUpload(true);
      const uploadedUrl = await uploadImage(file);
      setLogo(uploadedUrl);
      setImageUpload(false);
    } else {
      toast.error('Please upload image file only (JPG, JPEG, PNG, ICO).');
      event.target.value = '';
    }
  };

  const removeLogo = () => {
    setLogo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!logo) {
      toast.error('Please upload a logo.');
      return;
    }

    setIsEditLoading(true);

    const formDataWithLogo = {
      ...formData,
      logo: logo,
    };

    const success = await updateCompany(formDataWithLogo as any);
    setIsEditLoading(false);

    if (success) {
      setShowEditModal(false);
      toast.success('Company updated successfully!');
      if (id) {
        viewCompany(id); // Refresh company data
      }
    } else {
      toast.error('Failed to update company');
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setFormData({
      _id: '', name: '', email: '', domain: '', phone: '', phone2: '', fax: '',
      website: '', address: '', status: 'Active', plan_name: '', plan_type: '', plan_id: '',
      currency: '', description: '', legalName: '', registrationNumber: '', taxId: '',
      taxIdType: '', legalEntityType: '', incorporationCountry: '', industry: '', subIndustry: '',
      companySize: '', companyType: '',
      contactPerson: { name: '', email: '', phone: '', designation: '' },
      founderName: '',
      social: { linkedin: '', twitter: '', facebook: '', instagram: '' },
      structuredAddress: { street: '', street2: '', city: '', state: '', country: '', postalCode: '' },
      billingEmail: '',
      billingAddress: { street: '', city: '', state: '', postalCode: '', country: '' },
    });
    setLogo(null);
    setInputKey(Date.now());
  };

  // Prepare plan options
  const planOptions = packages.map(p => ({ label: p.plan_name, value: p.id }));
  const statusOptions = [
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' },
  ];
  const companySizeOptions = [
    { label: '1-10', value: '1-10' },
    { label: '11-50', value: '11-50' },
    { label: '51-200', value: '51-200' },
    { label: '201-500', value: '201-500' },
    { label: '501-1000', value: '501-1000' },
    { label: '1001-5000', value: '1001-5000' },
    { label: '5000+', value: '5000+' },
  ];

  useEffect(() => {
    if (id) {
      viewCompany(id);
      fetchAllRequests({ companyId: id });
    }
  }, [id]);

  const company: CompanyDetails | null = companyDetails;

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return <span className="badge bg-secondary">Unknown</span>;
    const isActive =
      status.toLowerCase() === 'active' || status.toLowerCase() === 'true';
    return (
      <span className={`badge bg-${isActive ? 'success' : 'danger'}`}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };

  const formatStructuredAddress = (addr?: CompanyDetails['structuredAddress']) => {
    if (!addr) return 'N/A';
    const parts = [
      addr.street,
      addr.street2,
      addr.city,
      addr.state,
      addr.postalCode,
      addr.country,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'N/A';
  };

  const formatBillingAddress = (addr?: CompanyDetails['billingAddress']) => {
    if (!addr) return 'N/A';
    const parts = [
      addr.street,
      addr.city,
      addr.state,
      addr.postalCode,
      addr.country,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'N/A';
  };

  return (
    <div className="page-wrapper">
      <div className="content">
        {/* Breadcrumb */}
        <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
          <div className="my-auto mb-2">
            <h3 className="page-title mb-1">Company Details</h3>
            <nav>
              <ol className="breadcrumb mb-0">
                <li className="breadcrumb-item">
                  <Link to={routes.superAdminDashboard || '#'}>Super Admin</Link>
                </li>
                <li className="breadcrumb-item">
                  <Link to={routes.superAdminCompanies}>Companies</Link>
                </li>
                <li className="breadcrumb-item active" aria-current="page">
                  Company Details
                </li>
              </ol>
            </nav>
          </div>
          <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
            <Link
              to={routes.superAdminCompanies}
              className="btn btn-outline-primary me-2"
            >
              <i className="ti ti-arrow-left me-1" />
              Back to Companies
            </Link>
            <CollapseHeader />
          </div>
        </div>

        {/* Loading State */}
        {detailsLoading ? (
          <>
            <ProfileHeaderSkeleton />
            <div className="row">
              <div className="col-lg-4">
                <SectionCardSkeleton />
                <SectionCardSkeleton />
              </div>
              <div className="col-lg-8">
                <SectionCardSkeleton />
                <SectionCardSkeleton />
              </div>
            </div>
          </>
        ) : company ? (
          <>
            {/* Profile Header Card */}
            <div className="card mb-3">
              <div className="card-body">
                <div className="d-flex align-items-center flex-wrap">
                  <div className="me-3 mb-2">
                    {company.logo ? (
                      <img
                        src={company.logo}
                        alt={company.name}
                        className="rounded-circle"
                        style={{
                          width: '120px',
                          height: '120px',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <div
                        className="rounded-circle bg-primary d-flex align-items-center justify-content-center"
                        style={{
                          width: '120px',
                          height: '120px',
                          fontSize: '48px',
                          color: '#fff',
                        }}
                      >
                        {company.name?.charAt(0)?.toUpperCase() || 'C'}
                      </div>
                    )}
                  </div>
                  <div className="flex-grow-1 mb-2">
                    <h3 className="mb-1">{company.name}</h3>
                    <p className="text-muted mb-1">
                      <i className="ti ti-mail me-1" />
                      {company.email}
                    </p>
                    <p className="text-muted mb-1">
                      <i className="ti ti-world me-1" />
                      {company.domain || 'N/A'}
                    </p>
                    <div className="d-flex align-items-center gap-2">
                      {getStatusBadge(company.status)}
                      <span className="text-muted">
                        <i className="ti ti-calendar me-1" />
                        Created: {formatDate(company.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="mb-2">
                    <button
                      onClick={handleEditCompany}
                      className="btn btn-primary"
                    >
                      <i className="ti ti-edit me-1" />
                      Edit Company
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Pending Change Requests */}
            {changeRequests.filter(r => r.status === 'pending').length > 0 && (
              <div className="card mb-3 border-warning">
                <div className="card-header bg-warning bg-opacity-10">
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="card-title mb-0 text-warning">
                      <i className="ti ti-alert-triangle me-2" />
                      Pending Change Requests ({changeRequests.filter(r => r.status === 'pending').length})
                    </h5>
                  </div>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Type</th>
                          <th>Field</th>
                          <th>Current Value</th>
                          <th>Requested Value</th>
                          <th>Requested By</th>
                          <th>Date</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {changeRequests
                          .filter(r => r.status === 'pending')
                          .flatMap((req) =>
                            (req.fields || [])
                              .filter(f => f.status === 'pending')
                              .map((field, fIdx) => (
                                <tr key={`${req._id}-${fIdx}`}>
                                  <td><span className="badge bg-info text-capitalize">{req.requestType}</span></td>
                                  <td className="fw-medium">{field.label || field.field}</td>
                                  <td><span className="text-muted">{String(field.oldValue || 'N/A')}</span></td>
                                  <td><span className="text-primary fw-medium">{String(field.newValue || 'N/A')}</span></td>
                                  <td>{req.requestedByName || 'Admin'}</td>
                                  <td>{req.createdAt ? new Date(req.createdAt as string).toLocaleDateString() : 'N/A'}</td>
                                  <td>
                                    {showRejectInput === `${req._id}-${fIdx}` ? (
                                      <div className="d-flex gap-1 align-items-center">
                                        <input
                                          type="text"
                                          className="form-control form-control-sm"
                                          placeholder="Rejection reason (min 5 chars)"
                                          value={rejectNoteMap[`${req._id}-${fIdx}`] || ''}
                                          onChange={(e) => setRejectNoteMap(prev => ({ ...prev, [`${req._id}-${fIdx}`]: e.target.value }))}
                                          style={{ minWidth: '150px' }}
                                        />
                                        <button
                                          className="btn btn-danger btn-sm"
                                          disabled={crLoading || (rejectNoteMap[`${req._id}-${fIdx}`] || '').trim().length < 5}
                                          onClick={async () => {
                                            const success = await rejectField(req._id, fIdx, rejectNoteMap[`${req._id}-${fIdx}`] || '');
                                            if (success) {
                                              setShowRejectInput(null);
                                              if (id) { viewCompany(id); fetchAllRequests({ companyId: id }); }
                                            }
                                          }}
                                        >
                                          Confirm
                                        </button>
                                        <button className="btn btn-light btn-sm" onClick={() => setShowRejectInput(null)}>
                                          <i className="ti ti-x" />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="d-flex gap-1">
                                        <button
                                          className="btn btn-success btn-sm"
                                          disabled={crLoading}
                                          onClick={async () => {
                                            const success = await approveField(req._id, fIdx);
                                            if (success && id) { viewCompany(id); fetchAllRequests({ companyId: id }); }
                                          }}
                                          title="Approve"
                                        >
                                          <i className="ti ti-check" />
                                        </button>
                                        <button
                                          className="btn btn-outline-danger btn-sm"
                                          disabled={crLoading}
                                          onClick={() => setShowRejectInput(`${req._id}-${fIdx}`)}
                                          title="Reject"
                                        >
                                          <i className="ti ti-x" />
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ))
                          )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Two-Column Layout */}
            <div className="row">
              {/* Sidebar */}
              <div className="col-lg-4">
                {/* Quick Info Card */}
                <div className="card mb-3">
                  <div className="card-header">
                    <h5 className="card-title mb-0">Quick Info</h5>
                  </div>
                  <div className="card-body">
                    <InfoRow label="Status" value={getStatusBadge(company.status)} />
                    <InfoRow label="Domain" value={company.domain} />
                    <InfoRow label="Phone" value={company.phone} />
                    <InfoRow label="Email" value={company.email} />
                    <InfoRow label="Website" value={company.website} />
                  </div>
                </div>

                {/* Subscription Card */}
                <div className="card mb-3">
                  <div className="card-header">
                    <h5 className="card-title mb-0">Subscription</h5>
                  </div>
                  <div className="card-body">
                    <InfoRow label="Plan Name" value={company.plan_name} />
                    <InfoRow label="Plan Type" value={company.plan_type} />
                    <InfoRow
                      label="Price"
                      value={
                        company.price
                          ? `${company.currency || ''} ${company.price}`
                          : 'N/A'
                      }
                    />
                    <InfoRow
                      label="Register Date"
                      value={formatDate(company.registerdate)}
                    />
                    <InfoRow
                      label="Expire Date"
                      value={formatDate(company.expiredate)}
                    />
                  </div>
                </div>

                {/* Admin Details Card */}
                {company.adminDetails && (
                  <div className="card mb-3">
                    <div className="card-header">
                      <h5 className="card-title mb-0">Admin Details</h5>
                    </div>
                    <div className="card-body">
                      <InfoRow
                        label="Admin Name"
                        value={company.adminDetails.name}
                      />
                      <InfoRow
                        label="Email"
                        value={company.adminDetails.email}
                      />
                      <InfoRow
                        label="Phone"
                        value={company.adminDetails.phone}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Main Content */}
              <div className="col-lg-8">
                <div className="card mb-3">
                  {/* Tab Navigation */}
                  <div className="card-header">
                    <ul className="nav nav-tabs card-header-tabs">
                      <li className="nav-item">
                        <button
                          className={`nav-link ${activeTab === 'general' ? 'active' : ''}`}
                          onClick={() => setActiveTab('general')}
                        >
                          General Info
                        </button>
                      </li>
                      <li className="nav-item">
                        <button
                          className={`nav-link ${activeTab === 'legal' ? 'active' : ''}`}
                          onClick={() => setActiveTab('legal')}
                        >
                          Legal &amp; Registration
                        </button>
                      </li>
                      <li className="nav-item">
                        <button
                          className={`nav-link ${activeTab === 'industry' ? 'active' : ''}`}
                          onClick={() => setActiveTab('industry')}
                        >
                          Industry &amp; Classification
                        </button>
                      </li>
                      <li className="nav-item">
                        <button
                          className={`nav-link ${activeTab === 'billing' ? 'active' : ''}`}
                          onClick={() => setActiveTab('billing')}
                        >
                          Billing
                        </button>
                      </li>
                    </ul>
                  </div>

                  {/* Tab Content */}
                  <div className="card-body">
                    {/* General Info Tab */}
                    {activeTab === 'general' && (
                      <div>
                        <InfoRow label="Company Name" value={company.name} />
                        <InfoRow label="Description" value={company.description} />
                        <InfoRow label="Address" value={company.address} />
                        <InfoRow
                          label="Structured Address"
                          value={formatStructuredAddress(
                            company.structuredAddress
                          )}
                        />
                        <InfoRow label="Phone 2" value={company.phone2} />
                        <InfoRow label="Fax" value={company.fax} />
                        {company.social && (
                          <>
                            <hr />
                            <h6 className="mb-3">Social Links</h6>
                            <InfoRow
                              label="LinkedIn"
                              value={
                                company.social.linkedin ? (
                                  <a
                                    href={company.social.linkedin}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    {company.social.linkedin}
                                  </a>
                                ) : (
                                  'N/A'
                                )
                              }
                            />
                            <InfoRow
                              label="Twitter"
                              value={
                                company.social.twitter ? (
                                  <a
                                    href={company.social.twitter}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    {company.social.twitter}
                                  </a>
                                ) : (
                                  'N/A'
                                )
                              }
                            />
                            <InfoRow
                              label="Facebook"
                              value={
                                company.social.facebook ? (
                                  <a
                                    href={company.social.facebook}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    {company.social.facebook}
                                  </a>
                                ) : (
                                  'N/A'
                                )
                              }
                            />
                            <InfoRow
                              label="Instagram"
                              value={
                                company.social.instagram ? (
                                  <a
                                    href={company.social.instagram}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    {company.social.instagram}
                                  </a>
                                ) : (
                                  'N/A'
                                )
                              }
                            />
                          </>
                        )}
                      </div>
                    )}

                    {/* Legal & Registration Tab */}
                    {activeTab === 'legal' && (
                      <div>
                        <InfoRow
                          label="Registration Number"
                          value={company.registrationNumber}
                        />
                        <InfoRow label="Tax ID" value={company.taxId} />
                        <InfoRow label="Tax ID Type" value={company.taxIdType} />
                        <InfoRow label="Legal Name" value={company.legalName} />
                        <InfoRow
                          label="Legal Entity Type"
                          value={company.legalEntityType}
                        />
                        <InfoRow
                          label="Incorporation Country"
                          value={company.incorporationCountry}
                        />
                      </div>
                    )}

                    {/* Industry & Classification Tab */}
                    {activeTab === 'industry' && (
                      <div>
                        <InfoRow label="Industry" value={company.industry} />
                        <InfoRow
                          label="Sub-Industry"
                          value={company.subIndustry}
                        />
                        <InfoRow
                          label="Company Size"
                          value={company.companySize}
                        />
                        <InfoRow
                          label="Company Type"
                          value={company.companyType}
                        />
                        <InfoRow
                          label="Founder Name"
                          value={company.founderName}
                        />
                        {company.contactPerson && (
                          <>
                            <hr />
                            <h6 className="mb-3">Contact Person</h6>
                            <InfoRow
                              label="Name"
                              value={company.contactPerson.name}
                            />
                            <InfoRow
                              label="Email"
                              value={company.contactPerson.email}
                            />
                            <InfoRow
                              label="Phone"
                              value={company.contactPerson.phone}
                            />
                            <InfoRow
                              label="Designation"
                              value={company.contactPerson.designation}
                            />
                          </>
                        )}
                      </div>
                    )}

                    {/* Billing Tab */}
                    {activeTab === 'billing' && (
                      <div>
                        <InfoRow
                          label="Billing Email"
                          value={company.billingEmail}
                        />
                        <InfoRow
                          label="Billing Address"
                          value={formatBillingAddress(company.billingAddress)}
                        />
                        {company.billingAddress && (
                          <>
                            <hr />
                            <h6 className="mb-3">Address Breakdown</h6>
                            <InfoRow
                              label="Street"
                              value={company.billingAddress.street}
                            />
                            <InfoRow
                              label="City"
                              value={company.billingAddress.city}
                            />
                            <InfoRow
                              label="State"
                              value={company.billingAddress.state}
                            />
                            <InfoRow
                              label="Postal Code"
                              value={company.billingAddress.postalCode}
                            />
                            <InfoRow
                              label="Country"
                              value={company.billingAddress.country}
                            />
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="card">
            <div className="card-body text-center py-5">
              <i
                className="ti ti-building-skyscraper"
                style={{ fontSize: '48px', color: '#ccc' }}
              />
              <h5 className="mt-3">Company Not Found</h5>
              <p className="text-muted">
                The company you are looking for does not exist or could not be
                loaded.
              </p>
              <Link to={routes.superAdminCompanies} className="btn btn-primary">
                Back to Companies
              </Link>
            </div>
          </div>
        )}

        {/* Edit Company Modal */}
        {showEditModal && (
          <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h4 className="modal-title">Edit Company</h4>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={closeEditModal}
                  />
                </div>
                <form onSubmit={handleEditSubmit} autoComplete="off">
                  <div className="modal-body pb-0">
                    <div className="row">
                      {/* Logo Upload */}
                      <div className="col-md-12">
                        <div className="d-flex align-items-center flex-wrap row-gap-3 bg-light w-100 rounded p-3 mb-4">
                          <div className="d-flex align-items-center justify-content-center avatar avatar-xxl rounded-circle border border-dashed me-2 flex-shrink-0 text-dark frames">
                            {logo ? (
                              <img
                                src={logo}
                                alt="Logo"
                                className="rounded-circle"
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                }}
                              />
                            ) : imageUpload ? (
                              <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Uploading...</span>
                              </div>
                            ) : (
                              <ImageWithBasePath
                                src="assets/img/profiles/avatar-30.jpg"
                                alt="img"
                                className="rounded-circle"
                              />
                            )}
                          </div>
                          <div className="profile-upload">
                            <div className="mb-2">
                              <h6 className="mb-1">Upload Profile Image</h6>
                              <p className="fs-12">Image should be below 4 mb</p>
                            </div>
                            <div className="profile-uploader d-flex align-items-center">
                              <div className="drag-upload-btn btn btn-sm btn-primary me-2">
                                {logo ? 'Change' : 'Upload'}
                                <input
                                  type="file"
                                  className="form-control image-sign"
                                  accept=".png,.jpeg,.jpg,.ico"
                                  key={inputKey}
                                  ref={fileInputRef}
                                  onChange={handleImageUpload}
                                />
                              </div>
                              {logo && (
                                <button
                                  type="button"
                                  onClick={removeLogo}
                                  className="btn btn-light btn-sm"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Form Fields */}
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">
                            Name <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            className="form-control"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            maxLength={100}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">
                            Email <span className="text-danger">*</span>
                          </label>
                          <input
                            type="email"
                            required
                            className="form-control"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            maxLength={100}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">
                            Phone <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            className="form-control"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            maxLength={100}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Website</label>
                          <input
                            type="text"
                            className="form-control"
                            name="website"
                            value={formData.website}
                            onChange={handleInputChange}
                            maxLength={100}
                          />
                        </div>
                      </div>
                      <div className="col-md-12">
                        <div className="mb-3">
                          <label className="form-label">Address</label>
                          <input
                            type="text"
                            className="form-control"
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            maxLength={100}
                          />
                        </div>
                      </div>

                      {/* Additional Details */}
                      <div className="col-md-12 mb-2">
                        <hr className="my-2" />
                        <p className="text-muted small mb-2"><strong>Additional Contact Details</strong> (Optional)</p>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Secondary Phone</label>
                          <input
                            type="text"
                            className="form-control"
                            name="phone2"
                            value={formData.phone2 || ''}
                            onChange={handleInputChange}
                            maxLength={20}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Fax</label>
                          <input
                            type="text"
                            className="form-control"
                            name="fax"
                            value={formData.fax || ''}
                            onChange={handleInputChange}
                            maxLength={20}
                          />
                        </div>
                      </div>
                      <div className="col-md-12">
                        <div className="mb-3">
                          <label className="form-label">Description</label>
                          <input
                            type="text"
                            className="form-control"
                            name="description"
                            value={formData.description || ''}
                            onChange={handleInputChange}
                            maxLength={500}
                          />
                        </div>
                      </div>

                      {/* Registration & Legal */}
                      <div className="col-md-12 mb-2">
                        <hr className="my-2" />
                        <p className="text-muted small mb-2"><strong>Registration & Legal Information</strong> (Optional)</p>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Legal Name</label>
                          <input
                            type="text"
                            className="form-control"
                            name="legalName"
                            value={formData.legalName || ''}
                            onChange={handleInputChange}
                            maxLength={200}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Registration Number</label>
                          <input
                            type="text"
                            className="form-control"
                            name="registrationNumber"
                            value={formData.registrationNumber || ''}
                            onChange={handleInputChange}
                            maxLength={100}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Tax ID</label>
                          <input
                            type="text"
                            className="form-control"
                            name="taxId"
                            value={formData.taxId || ''}
                            onChange={handleInputChange}
                            maxLength={100}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Tax ID Type</label>
                          <CommonSelect
                            className="select"
                            options={[
                              { label: 'GST', value: 'GST' },
                              { label: 'VAT', value: 'VAT' },
                              { label: 'EIN', value: 'EIN' },
                              { label: 'TIN', value: 'TIN' },
                              { label: 'PAN', value: 'PAN' },
                              { label: 'Other', value: 'Other' },
                            ]}
                            defaultValue={formData.taxIdType || undefined}
                            onChange={(opt) => handleSelectChange('taxIdType', opt)}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Legal Entity Type</label>
                          <CommonSelect
                            className="select"
                            options={[
                              { label: 'Sole Proprietorship', value: 'Sole Proprietorship' },
                              { label: 'Partnership', value: 'Partnership' },
                              { label: 'LLP', value: 'LLP' },
                              { label: 'Private Limited', value: 'Private Limited' },
                              { label: 'Public Limited', value: 'Public Limited' },
                              { label: 'Corporation', value: 'Corporation' },
                              { label: 'LLC', value: 'LLC' },
                              { label: 'Non-Profit', value: 'Non-Profit' },
                              { label: 'Government Entity', value: 'Government Entity' },
                              { label: 'Other', value: 'Other' },
                            ]}
                            defaultValue={formData.legalEntityType || undefined}
                            onChange={(opt) => handleSelectChange('legalEntityType', opt)}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Incorporation Country</label>
                          <input
                            type="text"
                            className="form-control"
                            name="incorporationCountry"
                            value={formData.incorporationCountry || ''}
                            onChange={handleInputChange}
                            maxLength={100}
                          />
                        </div>
                      </div>

                      {/* Industry & Classification */}
                      <div className="col-md-12 mb-2">
                        <hr className="my-2" />
                        <p className="text-muted small mb-2"><strong>Industry & Classification</strong> (Optional)</p>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Industry</label>
                          <input
                            type="text"
                            className="form-control"
                            name="industry"
                            value={formData.industry || ''}
                            onChange={handleInputChange}
                            maxLength={100}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Company Size</label>
                          <CommonSelect
                            className="select"
                            options={companySizeOptions}
                            defaultValue={formData.companySize || undefined}
                            onChange={(selectedOption) =>
                              handleSelectChange('companySize', selectedOption)
                            }
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Sub-Industry</label>
                          <input
                            type="text"
                            className="form-control"
                            name="subIndustry"
                            value={formData.subIndustry || ''}
                            onChange={handleInputChange}
                            maxLength={100}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Company Type</label>
                          <CommonSelect
                            className="select"
                            options={[
                              { label: 'Startup', value: 'Startup' },
                              { label: 'SME', value: 'SME' },
                              { label: 'Enterprise', value: 'Enterprise' },
                              { label: 'Government', value: 'Government' },
                              { label: 'NGO', value: 'NGO' },
                            ]}
                            defaultValue={formData.companyType || undefined}
                            onChange={(opt) => handleSelectChange('companyType', opt)}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Founder Name</label>
                          <input
                            type="text"
                            className="form-control"
                            name="founderName"
                            value={formData.founderName || ''}
                            onChange={handleInputChange}
                            maxLength={100}
                          />
                        </div>
                      </div>

                      {/* Billing */}
                      <div className="col-md-12 mb-2">
                        <hr className="my-2" />
                        <p className="text-muted small mb-2"><strong>Billing Information</strong> (Optional)</p>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Billing Email</label>
                          <input
                            type="email"
                            className="form-control"
                            name="billingEmail"
                            value={formData.billingEmail || ''}
                            onChange={handleInputChange}
                            maxLength={100}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Billing Street</label>
                          <input
                            type="text"
                            className="form-control"
                            value={formData.billingAddress?.street || ''}
                            onChange={(e) => handleNestedInputChange('billingAddress', 'street', e.target.value)}
                            maxLength={200}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Billing City</label>
                          <input
                            type="text"
                            className="form-control"
                            value={formData.billingAddress?.city || ''}
                            onChange={(e) => handleNestedInputChange('billingAddress', 'city', e.target.value)}
                            maxLength={100}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Billing State</label>
                          <input
                            type="text"
                            className="form-control"
                            value={formData.billingAddress?.state || ''}
                            onChange={(e) => handleNestedInputChange('billingAddress', 'state', e.target.value)}
                            maxLength={100}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Billing Postal Code</label>
                          <input
                            type="text"
                            className="form-control"
                            value={formData.billingAddress?.postalCode || ''}
                            onChange={(e) => handleNestedInputChange('billingAddress', 'postalCode', e.target.value)}
                            maxLength={20}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Billing Country</label>
                          <input
                            type="text"
                            className="form-control"
                            value={formData.billingAddress?.country || ''}
                            onChange={(e) => handleNestedInputChange('billingAddress', 'country', e.target.value)}
                            maxLength={100}
                          />
                        </div>
                      </div>

                      {/* Structured Address */}
                      <div className="col-md-12 mb-2">
                        <hr className="my-2" />
                        <p className="text-muted small mb-2"><strong>Structured Address</strong> (Optional)</p>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Street</label>
                          <input
                            type="text"
                            className="form-control"
                            value={formData.structuredAddress?.street || ''}
                            onChange={(e) => handleNestedInputChange('structuredAddress', 'street', e.target.value)}
                            maxLength={200}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Street Line 2</label>
                          <input
                            type="text"
                            className="form-control"
                            value={formData.structuredAddress?.street2 || ''}
                            onChange={(e) => handleNestedInputChange('structuredAddress', 'street2', e.target.value)}
                            maxLength={200}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">City</label>
                          <input
                            type="text"
                            className="form-control"
                            value={formData.structuredAddress?.city || ''}
                            onChange={(e) => handleNestedInputChange('structuredAddress', 'city', e.target.value)}
                            maxLength={100}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">State</label>
                          <input
                            type="text"
                            className="form-control"
                            value={formData.structuredAddress?.state || ''}
                            onChange={(e) => handleNestedInputChange('structuredAddress', 'state', e.target.value)}
                            maxLength={100}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Postal Code</label>
                          <input
                            type="text"
                            className="form-control"
                            value={formData.structuredAddress?.postalCode || ''}
                            onChange={(e) => handleNestedInputChange('structuredAddress', 'postalCode', e.target.value)}
                            maxLength={20}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Country</label>
                          <input
                            type="text"
                            className="form-control"
                            value={formData.structuredAddress?.country || ''}
                            onChange={(e) => handleNestedInputChange('structuredAddress', 'country', e.target.value)}
                            maxLength={100}
                          />
                        </div>
                      </div>

                      {/* Contact Person */}
                      <div className="col-md-12 mb-2">
                        <hr className="my-2" />
                        <p className="text-muted small mb-2"><strong>Contact Person</strong> (Optional)</p>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Contact Person Name</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Contact person name"
                            value={formData.contactPerson?.name || ''}
                            onChange={(e) => handleNestedInputChange('contactPerson', 'name', e.target.value)}
                            maxLength={100}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Contact Person Email</label>
                          <input
                            type="email"
                            className="form-control"
                            placeholder="contact@company.com"
                            value={formData.contactPerson?.email || ''}
                            onChange={(e) => handleNestedInputChange('contactPerson', 'email', e.target.value)}
                            maxLength={100}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Contact Person Phone</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Contact phone number"
                            value={formData.contactPerson?.phone || ''}
                            onChange={(e) => handleNestedInputChange('contactPerson', 'phone', e.target.value)}
                            maxLength={20}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Contact Person Designation</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Designation/Title"
                            value={formData.contactPerson?.designation || ''}
                            onChange={(e) => handleNestedInputChange('contactPerson', 'designation', e.target.value)}
                            maxLength={100}
                          />
                        </div>
                      </div>

                      {/* Social Links */}
                      <div className="col-md-12 mb-2">
                        <hr className="my-2" />
                        <p className="text-muted small mb-2"><strong>Social Media Links</strong> (Optional)</p>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">LinkedIn</label>
                          <input
                            type="url"
                            className="form-control"
                            placeholder="https://linkedin.com/company/..."
                            value={formData.social?.linkedin || ''}
                            onChange={(e) => handleNestedInputChange('social', 'linkedin', e.target.value)}
                            maxLength={200}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Twitter</label>
                          <input
                            type="url"
                            className="form-control"
                            placeholder="https://twitter.com/..."
                            value={formData.social?.twitter || ''}
                            onChange={(e) => handleNestedInputChange('social', 'twitter', e.target.value)}
                            maxLength={200}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Facebook</label>
                          <input
                            type="url"
                            className="form-control"
                            placeholder="https://facebook.com/..."
                            value={formData.social?.facebook || ''}
                            onChange={(e) => handleNestedInputChange('social', 'facebook', e.target.value)}
                            maxLength={200}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Instagram</label>
                          <input
                            type="url"
                            className="form-control"
                            placeholder="https://instagram.com/..."
                            value={formData.social?.instagram || ''}
                            onChange={(e) => handleNestedInputChange('social', 'instagram', e.target.value)}
                            maxLength={200}
                          />
                        </div>
                      </div>

                      {/* Plan & Status */}
                      <div className="col-md-12 mb-2">
                        <hr className="my-2" />
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">
                            Plan Name <span className="text-danger">*</span>
                          </label>
                          <CommonSelect
                            className="select"
                            options={planOptions}
                            defaultValue={formData.plan_name}
                            onChange={(selectedOption) =>
                              handleSelectChange('plan_id', selectedOption)
                            }
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Status</label>
                          <CommonSelect
                            className="select"
                            options={statusOptions}
                            defaultValue={formData.status}
                            onChange={(selectedOption) =>
                              handleSelectChange('status', selectedOption)
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
                      onClick={closeEditModal}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isEditLoading}
                    >
                      {isEditLoading ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-2"
                            role="status"
                            aria-hidden="true"
                          />
                          Updating...
                        </>
                      ) : (
                        'Update Company'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        <ToastContainer />
        <Footer />
      </div>
    </div>
  );
};

export default CompanyDetailsPage;
