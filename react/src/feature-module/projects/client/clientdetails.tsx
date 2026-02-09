import { message } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import CollapseHeader from '../../../core/common/collapse-header/collapse-header';
import CommonSelect from '../../../core/common/commonSelect';
import Footer from '../../../core/common/footer';
import ImageWithBasePath from '../../../core/common/imageWithBasePath';
import CommonTextEditor from '../../../core/common/textEditor';
import { Client, useClientsREST } from '../../../hooks/useClientsREST';
import { Project, useProjectsREST } from '../../../hooks/useProjectsREST';
import { all_routes } from '../../router/all_routes';
import EditClient from './edit_client';

type PasswordField = 'password' | 'confirmPassword';

const ClientDetails = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const { getClientById, loading, error } = useClientsREST();
  const { projects: allProjects, fetchProjects } = useProjectsREST();
  const navigate = useNavigate();

  const [client, setClient] = useState<Client | null>(null);
  const [loadingClient, setLoadingClient] = useState(true);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [clientProjects, setClientProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

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

  // Handle edit client
  const handleEditClient = () => {
    if (client) {
      setSelectedClient(client);
      // Store client data for the edit modal
      (window as any).currentEditClient = client;
      console.log('[ClientDetails] Dispatching edit event with client:', client);
      // Dispatch custom event that edit_client.tsx is listening for
      window.dispatchEvent(new CustomEvent('edit-client', { detail: { client } }));
    } else {
      console.log('[ClientDetails] No client data available for edit');
      message.error('Client data not loaded yet. Please try again.');
    }
  };

  // Fetch client details on component mount
  const loadClient = useCallback(async () => {
    if (!clientId) {
      console.log('[ClientDetails] No clientId in URL params');
      setLoadingClient(false);
      return;
    }

    setLoadingClient(true);
    setClient(null);

    try {
      console.log('[ClientDetails] Fetching client with ID:', clientId);
      const clientData = await getClientById(clientId);
      console.log('[ClientDetails] Received client data:', clientData);

      if (clientData) {
        setClient(clientData);
        console.log('[ClientDetails] Client set successfully:', {
          id: clientData._id,
          name: clientData.name,
          company: clientData.company,
        });

        // Fetch projects for this client
        await loadClientProjects(clientData.name);
      } else {
        console.log('[ClientDetails] No client data received');
        message.error('Client not found');
      }
    } catch (error: any) {
      console.error('[ClientDetails] Error fetching client details:', error);
      console.error('[ClientDetails] Error message:', error?.message);
      console.error('[ClientDetails] Error response:', error?.response?.data);
      message.error(error?.message || 'Failed to load client details');
    } finally {
      setLoadingClient(false);
    }
  }, [clientId, getClientById]);

  // Load projects for the client
  const loadClientProjects = useCallback(
    async (clientName: string) => {
      setLoadingProjects(true);
      try {
        console.log('[ClientDetails] Fetching projects for client:', clientName);
        await fetchProjects({ client: clientName });
      } catch (error) {
        console.error('[ClientDetails] Error fetching projects:', error);
      } finally {
        setLoadingProjects(false);
      }
    },
    [fetchProjects]
  );

  // Filter projects by client name
  useEffect(() => {
    if (client && allProjects) {
      const filtered = allProjects.filter((project) => project.client === client.name);
      setClientProjects(filtered);
      console.log('[ClientDetails] Filtered projects:', filtered.length);
    }
  }, [client, allProjects]);

  useEffect(() => {
    loadClient();
  }, [loadClient]);

  // Listen for client updates
  useEffect(() => {
    const handleClientUpdated = () => {
      console.log('[ClientDetails] Client updated event received, reloading...');
      loadClient();
    };

    window.addEventListener('client-updated', handleClientUpdated);

    return () => {
      window.removeEventListener('client-updated', handleClientUpdated);
    };
  }, [loadClient]);

  // Listen for project updates
  useEffect(() => {
    const handleProjectUpdate = () => {
      console.log('[ClientDetails] Project update event received, reloading projects...');
      if (client) {
        loadClientProjects(client.name);
      }
    };

    window.addEventListener('project-created', handleProjectUpdate);
    window.addEventListener('project-updated', handleProjectUpdate);
    window.addEventListener('project-deleted', handleProjectUpdate);

    return () => {
      window.removeEventListener('project-created', handleProjectUpdate);
      window.removeEventListener('project-updated', handleProjectUpdate);
      window.removeEventListener('project-deleted', handleProjectUpdate);
    };
  }, [client, loadClientProjects]);

  const tags = [
    { value: 'Select', label: 'Select' },
    { value: 'Internal', label: 'Internal' },
    { value: 'Projects', label: 'Projects' },
    { value: 'Meetings', label: 'Meetings' },
    { value: 'Reminder', label: 'Reminder' },
  ];
  const priority = [
    { value: 'Select', label: 'Select' },
    { value: 'High', label: 'High' },
    { value: 'Medium', label: 'Medium' },
    { value: 'Low', label: 'Low' },
  ];
  const addassignee = [
    { value: 'Select', label: 'Select' },
    { value: 'Sophie', label: 'Sophie' },
    { value: 'Cameron', label: 'Cameron' },
    { value: 'Doris', label: 'Doris' },
    { value: 'Rufana', label: 'Rufana' },
  ];
  const statusChoose = [
    { value: 'Select', label: 'Select' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Onhold', label: 'Onhold' },
    { value: 'Inprogress', label: 'Inprogress' },
  ];

  // Show loading state
  if (loadingClient) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="row justify-content-between align-items-center mb-4">
            <div className="col-md-12">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="fw-medium d-inline-flex align-items-center mb-3 mb-sm-0">
                  <Link to={all_routes.clientlist}>
                    <i className="ti ti-arrow-left me-2" />
                    Clients
                  </Link>
                </h6>
                <div className="ms-2 head-icons">
                  <CollapseHeader />
                </div>
              </div>
            </div>
          </div>
          <div className="text-center p-5">
            <div className="spinner-border text-primary" role="status">
              <span className="sr-only">Loading client details...</span>
            </div>
            <p className="mt-3 text-muted">Loading client details...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="row justify-content-between align-items-center mb-4">
            <div className="col-md-12">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="fw-medium d-inline-flex align-items-center mb-3 mb-sm-0">
                  <Link to={all_routes.clientlist}>
                    <i className="ti ti-arrow-left me-2" />
                    Clients
                  </Link>
                </h6>
                <div className="ms-2 head-icons">
                  <CollapseHeader />
                </div>
              </div>
            </div>
          </div>
          <div className="alert alert-danger m-3">
            <h6>Error loading client details</h6>
            <p className="mb-0">{error}</p>
            <button className="btn btn-primary mt-2" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show not found state
  if (!client) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="row justify-content-between align-items-center mb-4">
            <div className="col-md-12">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="fw-medium d-inline-flex align-items-center mb-3 mb-sm-0">
                  <Link to={all_routes.clientlist}>
                    <i className="ti ti-arrow-left me-2" />
                    Clients
                  </Link>
                </h6>
                <div className="ms-2 head-icons">
                  <CollapseHeader />
                </div>
              </div>
            </div>
          </div>
          <div className="alert alert-warning m-3">
            <h6>Client not found</h6>
            <p className="mb-0">The requested client could not be found.</p>
            <Link to={all_routes.clientlist} className="btn btn-primary mt-2">
              Back to Clients
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Page Wrapper */}
      <div className="page-wrapper">
        <div className="content">
          <div className="row justify-content-between align-items-center mb-4">
            <div className="col-md-12">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="fw-medium d-inline-flex align-items-center mb-3 mb-sm-0">
                  <Link to={all_routes.clientlist}>
                    <i className="ti ti-arrow-left me-2" />
                    Clients
                  </Link>
                </h6>
                <div className="ms-2 head-icons">
                  <CollapseHeader />
                </div>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-xl-4 theiaStickySidebar">
              <div className="card card-bg-1">
                <div className="card-body p-0">
                  <span className="avatar avatar-xl avatar-rounded border border-2 border-white m-auto d-flex mb-2">
                    <ImageWithBasePath
                      src={client?.logo || 'assets/img/users/user-13.jpg'}
                      className="w-auto h-auto"
                      alt={client?.name || 'Client'}
                      isLink={client?.logo ? client.logo.startsWith('https://') : false}
                    />
                  </span>
                  <div className="text-center px-3 pb-3 border-bottom">
                    <div className="mb-3">
                      <h5 className="d-flex align-items-center justify-content-center mb-1">
                        {client?.name || 'Loading...'}
                        <i className="ti ti-discount-check-filled text-success ms-1" />
                      </h5>
                      <p className="text-dark mb-1">{client?.company || 'Loading...'}</p>
                      <span
                        className={`badge fw-medium ${
                          client?.status === 'Active' ? 'badge-soft-success' : 'badge-soft-danger'
                        }`}
                      >
                        {client?.status || 'Loading...'}
                      </span>
                    </div>
                    <div>
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span className="d-inline-flex align-items-center">
                          <i className="ti ti-id me-2" />
                          Client ID
                        </span>
                        <p className="text-dark">
                          {client?.clientId
                            ? client.clientId.toUpperCase()
                            : client?._id?.slice(-8).toUpperCase() || 'Loading...'}
                        </p>
                      </div>
                      <div className="d-flex align-items-center justify-content-between">
                        <span className="d-inline-flex align-items-center">
                          <i className="ti ti-calendar-check me-2" />
                          Added on
                        </span>
                        <p className="text-dark">
                          {client?.createdAt
                            ? new Date(client.createdAt).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : 'Loading...'}
                        </p>
                      </div>
                      <div className="row gx-2 mt-3" style={{ display: 'none' }}>
                        <div className="col-6">
                          <div>
                            <Link to={all_routes.voiceCall} className="btn btn-dark w-100">
                              <i className="ti ti-phone-call me-1" />
                              Call
                            </Link>
                          </div>
                        </div>
                        <div className="col-6">
                          <div>
                            <Link to={all_routes.chat} className="btn btn-primary w-100">
                              <i className="ti ti-message-heart me-1" />
                              Message
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 border-bottom">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <h6>Basic information</h6>
                      <Link
                        to="#"
                        className="btn btn-icon btn-sm"
                        data-bs-toggle="modal"
                        data-inert={true}
                        data-bs-target="#edit_client"
                        onClick={(e) => {
                          e.preventDefault();
                          handleEditClient();
                        }}
                      >
                        <i className="ti ti-edit" />
                      </Link>
                    </div>
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="d-inline-flex align-items-center">
                        <i className="ti ti-phone me-2" />
                        Phone
                      </span>
                      <p className="text-dark">{client?.phone || 'Not provided'}</p>
                    </div>
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="d-inline-flex align-items-center">
                        <i className="ti ti-mail-check me-2" />
                        Email
                      </span>
                      <Link to="to" className="text-info d-inline-flex align-items-center">
                        {client?.email || 'Not provided'}
                        <i className="ti ti-copy text-dark ms-2" />
                      </Link>
                    </div>
                    <div className="d-flex align-items-center justify-content-between">
                      <span className="d-inline-flex align-items-center">
                        <i className="ti ti-map-pin-check me-2" />
                        Address
                      </span>
                      <p className="text-dark text-end">{client?.address || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <h6>Social Links</h6>
                      <Link
                        to="#"
                        className="btn btn-icon btn-sm"
                        data-bs-toggle="modal"
                        data-inert={true}
                        data-bs-target="#edit_client"
                        onClick={(e) => {
                          e.preventDefault();
                          handleEditClient();
                        }}
                      >
                        <i className="ti ti-edit" />
                      </Link>
                    </div>
                    <div className="d-flex align-items-center">
                      {client?.socialLinks?.instagram && (
                        <Link
                          to={client.socialLinks.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="me-2 btn btn-icon btn-sm btn-outline-danger rounded-circle"
                          title="Instagram"
                        >
                          <i className="ti ti-brand-instagram" />
                        </Link>
                      )}
                      {client?.socialLinks?.facebook && (
                        <Link
                          to={client.socialLinks.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="me-2 btn btn-icon btn-sm btn-outline-primary rounded-circle"
                          title="Facebook"
                        >
                          <i className="ti ti-brand-facebook" />
                        </Link>
                      )}
                      {client?.socialLinks?.linkedin && (
                        <Link
                          to={client.socialLinks.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="me-2 btn btn-icon btn-sm btn-outline-info rounded-circle"
                          title="LinkedIn"
                        >
                          <i className="ti ti-brand-linkedin" />
                        </Link>
                      )}
                      {client?.socialLinks?.whatsapp && (
                        <Link
                          to={
                            client.socialLinks.whatsapp.startsWith('http')
                              ? client.socialLinks.whatsapp
                              : `https://wa.me/${client.socialLinks.whatsapp.replace(/[^0-9]/g, '')}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="me-2 btn btn-icon btn-sm btn-outline-success rounded-circle"
                          title="WhatsApp"
                        >
                          <i className="ti ti-brand-whatsapp" />
                        </Link>
                      )}
                      {!client?.socialLinks?.instagram &&
                        !client?.socialLinks?.facebook &&
                        !client?.socialLinks?.linkedin &&
                        !client?.socialLinks?.whatsapp && (
                          <span className="text-muted">No social links added</span>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-8">
              <div>
                <div className="bg-white rounded">
                  <ul
                    className="nav nav-tabs nav-tabs-bottom nav-justified flex-wrap mb-4"
                    role="tablist"
                  >
                    <li className="nav-item" role="presentation">
                      <Link
                        className="nav-link active fw-medium d-flex align-items-center justify-content-center"
                        to="#bottom-justified-tab1"
                        data-bs-toggle="tab"
                        aria-selected="false"
                        role="tab"
                      >
                        <i className="ti ti-star me-1" />
                        Overview
                      </Link>
                    </li>
                    <li className="nav-item" role="presentation">
                      <Link
                        className="nav-link fw-medium d-flex align-items-center justify-content-center"
                        to="#bottom-justified-tab2"
                        data-bs-toggle="tab"
                        aria-selected="false"
                        role="tab"
                      >
                        <i className="ti ti-box me-1" />
                        Projects
                      </Link>
                    </li>
                    <li className="nav-item" role="presentation" style={{ display: 'none' }}>
                      <Link
                        className="nav-link fw-medium d-flex align-items-center justify-content-center"
                        to="#bottom-justified-tab3"
                        data-bs-toggle="tab"
                        aria-selected="true"
                        role="tab"
                      >
                        <i className="ti ti-basket-code me-1" />
                        Tasks
                      </Link>
                    </li>
                    <li className="nav-item" role="presentation" style={{ display: 'none' }}>
                      <Link
                        className="nav-link fw-medium d-flex align-items-center justify-content-center"
                        to="#bottom-justified-tab4"
                        data-bs-toggle="tab"
                        aria-selected="true"
                        role="tab"
                      >
                        <i className="ti ti-file-invoice me-1" />
                        Invoices
                      </Link>
                    </li>
                    <li className="nav-item" role="presentation" style={{ display: 'none' }}>
                      <Link
                        className="nav-link fw-medium d-flex align-items-center justify-content-center"
                        to="#bottom-justified-tab5"
                        data-bs-toggle="tab"
                        aria-selected="true"
                        role="tab"
                      >
                        <i className="ti ti-file-description me-1" />
                        Notes
                      </Link>
                    </li>
                    <li className="nav-item" role="presentation" style={{ display: 'none' }}>
                      <Link
                        className="nav-link fw-medium d-flex align-items-center justify-content-center"
                        to="#bottom-justified-tab6"
                        data-bs-toggle="tab"
                        aria-selected="true"
                        role="tab"
                      >
                        <i className="ti ti-folder-open me-1" />
                        Documents
                      </Link>
                    </li>
                  </ul>
                </div>
                <div className="tab-content custom-accordion-items client-accordion">
                  <div className="tab-pane active show" id="bottom-justified-tab1" role="tabpanel">
                    <div className="accordion accordions-items-seperate" id="accordionExample">
                      <div className="accordion-item">
                        <div className="accordion-header" id="headingOne">
                          <div
                            className="accordion-button bg-white"
                            data-bs-toggle="collapse"
                            data-bs-target="#primaryBorderOne"
                            aria-expanded="true"
                            aria-controls="primaryBorderOne"
                            role="button"
                          >
                            <h5>Projects</h5>
                          </div>
                        </div>
                        <div
                          id="primaryBorderOne"
                          className="accordion-collapse collapse show border-top"
                          aria-labelledby="headingOne"
                          data-bs-parent="#accordionExample"
                        >
                          <div className="accordion-body pb-0">
                            {loadingProjects ? (
                              <div className="text-center py-5">
                                <div className="spinner-border text-primary" role="status">
                                  <span className="visually-hidden">Loading projects...</span>
                                </div>
                                <p className="mt-2">Loading projects...</p>
                              </div>
                            ) : clientProjects.length === 0 ? (
                              <div className="text-center py-5">
                                <i
                                  className="ti ti-folder-off"
                                  style={{ fontSize: '48px', color: '#ccc' }}
                                />
                                <p className="text-muted mt-2">No projects found for this client</p>
                              </div>
                            ) : (
                              <div className="row">
                                {clientProjects.map((project) => (
                                  <div key={project._id} className="col-xxl-6 col-lg-12 col-md-6">
                                    <div
                                      className="card"
                                      onClick={() =>
                                        navigate(
                                          all_routes.projectdetails.replace(
                                            ':projectId',
                                            project._id
                                          )
                                        )
                                      }
                                      style={{
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        border: '2px solid transparent',
                                      }}
                                      onMouseEnter={(e) =>
                                        (e.currentTarget.style.borderColor = '#0d6efd')
                                      }
                                      onMouseLeave={(e) =>
                                        (e.currentTarget.style.borderColor = 'transparent')
                                      }
                                    >
                                      <div className="card-body">
                                        <div className="d-flex align-items-center pb-3 mb-3 border-bottom">
                                          <div className="flex-shrink-0 me-2">
                                            <ImageWithBasePath
                                              src="assets/img/social/project-01.svg"
                                              alt="Img"
                                            />
                                          </div>
                                          <div>
                                            <h6 className="mb-1">{project.name}</h6>
                                            <div className="d-flex align-items-center">
                                              <span
                                                className={`badge badge-${
                                                  project.status === 'Active'
                                                    ? 'success'
                                                    : project.status === 'Completed'
                                                      ? 'info'
                                                      : project.status === 'On Hold'
                                                        ? 'warning'
                                                        : 'danger'
                                                }`}
                                              >
                                                {project.status}
                                              </span>
                                              <span className="mx-2">
                                                <i className="ti ti-point-filled text-primary" />
                                              </span>
                                              <span
                                                className={`badge badge-${
                                                  project.priority === 'High'
                                                    ? 'danger'
                                                    : project.priority === 'Medium'
                                                      ? 'warning'
                                                      : 'info'
                                                }`}
                                              >
                                                {project.priority}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="row">
                                          <div className="col-sm-4">
                                            <div className="mb-3">
                                              <span className="mb-1 d-block">Deadline</span>
                                              <p className="text-dark">
                                                {project.dueDate
                                                  ? new Date(project.dueDate).toLocaleDateString(
                                                      'en-US',
                                                      {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        year: 'numeric',
                                                      }
                                                    )
                                                  : 'Not set'}
                                              </p>
                                            </div>
                                          </div>
                                          <div className="col-sm-4">
                                            <div className="mb-3">
                                              <span className="mb-1 d-block">Budget</span>
                                              <p className="text-dark">
                                                {project.projectValue || project.budget
                                                  ? `$${(project.projectValue || project.budget)?.toLocaleString()}`
                                                  : 'Not set'}
                                              </p>
                                            </div>
                                          </div>
                                          <div className="col-sm-4">
                                            <div className="mb-3">
                                              <span className="mb-1 d-block">Progress</span>
                                              <div className="d-flex align-items-center">
                                                <div
                                                  className="progress flex-fill me-2"
                                                  style={{ height: '6px' }}
                                                >
                                                  <div
                                                    className="progress-bar bg-success"
                                                    role="progressbar"
                                                    style={{ width: `${project.progress}%` }}
                                                  />
                                                </div>
                                                <span className="text-dark">
                                                  {project.progress}%
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                        {project.description && (
                                          <div className="mb-2">
                                            <span className="mb-1 d-block text-muted">
                                              Description
                                            </span>
                                            <p
                                              className="text-dark mb-0"
                                              style={{
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                              }}
                                            >
                                              {project.description}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="accordion-item" style={{ display: 'none' }}>
                        <div className="accordion-header" id="headingTwo">
                          <div
                            className="accordion-button collapsed"
                            data-bs-toggle="collapse"
                            data-bs-target="#primaryBorderTwo"
                            aria-expanded="false"
                            aria-controls="primaryBorderTwo"
                            role="button"
                          >
                            <h5>Tasks</h5>
                          </div>
                        </div>
                        <div
                          id="primaryBorderTwo"
                          className="accordion-collapse collapse border-top"
                          aria-labelledby="headingTwo"
                          data-bs-parent="#accordionExample"
                        >
                          <div className="accordion-body">
                            <div className="list-group list-group-flush">
                              <div className="list-group-item border rounded mb-2 p-2">
                                <div className="row align-items-center row-gap-3">
                                  <div className="col-md-7">
                                    <div className="todo-inbox-check d-flex align-items-center flex-wrap row-gap-3">
                                      <div className="form-check form-check-md me-2">
                                        <input className="form-check-input" type="checkbox" />
                                      </div>
                                      <span className="me-2 d-flex align-items-center rating-select">
                                        <i className="ti ti-star-filled filled" />
                                      </span>
                                      <div className="strike-info">
                                        <h4 className="fs-14">Patient appointment booking</h4>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="col-md-5">
                                    <div className="d-flex align-items-center justify-content-md-end flex-wrap row-gap-3">
                                      <span className="badge bg-soft-pink d-inline-flex align-items-center me-3">
                                        <i className="fas fa-circle fs-6 me-1" />
                                        Onhold
                                      </span>
                                      <div className="d-flex align-items-center">
                                        <div className="avatar-list-stacked avatar-group-sm">
                                          <span className="avatar avatar-rounded">
                                            <ImageWithBasePath
                                              className="border border-white"
                                              src="assets/img/profiles/avatar-13.jpg"
                                              alt="img"
                                            />
                                          </span>
                                          <span className="avatar avatar-rounded">
                                            <ImageWithBasePath
                                              className="border border-white"
                                              src="assets/img/profiles/avatar-14.jpg"
                                              alt="img"
                                            />
                                          </span>
                                          <span className="avatar avatar-rounded">
                                            <ImageWithBasePath
                                              className="border border-white"
                                              src="assets/img/profiles/avatar-15.jpg"
                                              alt="img"
                                            />
                                          </span>
                                        </div>
                                        <div className="dropdown ms-2">
                                          <Link
                                            to="to"
                                            className="d-inline-flex align-items-center"
                                            data-bs-toggle="dropdown"
                                          >
                                            <i className="ti ti-dots-vertical" />
                                          </Link>
                                          <ul className="dropdown-menu dropdown-menu-end p-3">
                                            <li>
                                              <Link
                                                to="to"
                                                className="dropdown-item rounded-1"
                                                data-bs-toggle="modal"
                                                data-inert={true}
                                                data-bs-target="#edit_todo"
                                              >
                                                <i className="ti ti-edit me-2" />
                                                Edit
                                              </Link>
                                            </li>
                                            <li>
                                              <Link
                                                to="to"
                                                className="dropdown-item rounded-1"
                                                data-bs-toggle="modal"
                                                data-inert={true}
                                                data-bs-target="#delete_modal"
                                              >
                                                <i className="ti ti-trash me-2" />
                                                Delete
                                              </Link>
                                            </li>
                                            <li>
                                              <Link
                                                to="to"
                                                className="dropdown-item rounded-1"
                                                data-bs-toggle="modal"
                                                data-inert={true}
                                                data-bs-target="#view_todo"
                                              >
                                                <i className="ti ti-eye me-2" />
                                                View
                                              </Link>
                                            </li>
                                          </ul>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="list-group-item border rounded mb-2 p-2">
                                <div className="row align-items-center row-gap-3">
                                  <div className="col-md-7">
                                    <div className="todo-inbox-check d-flex align-items-center flex-wrap row-gap-3">
                                      <div className="form-check form-check-md me-2">
                                        <input className="form-check-input" type="checkbox" />
                                      </div>
                                      <span className="me-2 rating-select d-flex align-items-center">
                                        <i className="ti ti-star" />
                                      </span>
                                      <div className="strike-info">
                                        <h4 className="fs-14">
                                          Appointment booking with payment gateway
                                        </h4>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="col-md-5">
                                    <div className="d-flex align-items-center justify-content-md-end flex-wrap row-gap-3">
                                      <span className="badge bg-transparent-purple d-flex align-items-center me-3">
                                        <i className="fas fa-circle fs-6 me-1" />
                                        Inprogress
                                      </span>
                                      <div className="d-flex align-items-center">
                                        <div className="avatar-list-stacked avatar-group-sm">
                                          <span className="avatar avatar-rounded">
                                            <ImageWithBasePath
                                              className="border border-white"
                                              src="assets/img/profiles/avatar-20.jpg"
                                              alt="img"
                                            />
                                          </span>
                                          <span className="avatar avatar-rounded">
                                            <ImageWithBasePath
                                              className="border border-white"
                                              src="assets/img/profiles/avatar-21.jpg"
                                              alt="img"
                                            />
                                          </span>
                                          <span className="avatar avatar-rounded">
                                            <ImageWithBasePath
                                              className="border border-white"
                                              src="assets/img/profiles/avatar-22.jpg"
                                              alt="img"
                                            />
                                          </span>
                                        </div>
                                        <div className="dropdown ms-2">
                                          <Link
                                            to="to"
                                            className="d-inline-flex align-items-center"
                                            data-bs-toggle="dropdown"
                                          >
                                            <i className="ti ti-dots-vertical" />
                                          </Link>
                                          <ul className="dropdown-menu dropdown-menu-end p-3">
                                            <li>
                                              <Link
                                                to="to"
                                                className="dropdown-item rounded-1"
                                                data-bs-toggle="modal"
                                                data-inert={true}
                                                data-bs-target="#edit_todo"
                                              >
                                                <i className="ti ti-edit me-2" />
                                                Edit
                                              </Link>
                                            </li>
                                            <li>
                                              <Link
                                                to="to"
                                                className="dropdown-item rounded-1"
                                                data-bs-toggle="modal"
                                                data-inert={true}
                                                data-bs-target="#delete_modal"
                                              >
                                                <i className="ti ti-trash me-2" />
                                                Delete
                                              </Link>
                                            </li>
                                            <li>
                                              <Link
                                                to="to"
                                                className="dropdown-item rounded-1"
                                                data-bs-toggle="modal"
                                                data-inert={true}
                                                data-bs-target="#view_todo"
                                              >
                                                <i className="ti ti-eye me-2" />
                                                View
                                              </Link>
                                            </li>
                                          </ul>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="list-group-item border rounded mb-2 p-2">
                                <div className="row align-items-center row-gap-3">
                                  <div className="col-md-7">
                                    <div className="todo-inbox-check d-flex align-items-center flex-wrap row-gap-3">
                                      <div className="form-check form-check-md me-2">
                                        <input className="form-check-input" type="checkbox" />
                                      </div>
                                      <span className="me-2 rating-select d-flex align-items-center">
                                        <i className="ti ti-star" />
                                      </span>
                                      <div className="strike-info">
                                        <h4 className="fs-14">
                                          Patient and Doctor video conferencing
                                        </h4>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="col-md-5">
                                    <div className="d-flex align-items-center justify-content-md-end flex-wrap row-gap-3">
                                      <span className="badge badge-soft-success align-items-center me-3">
                                        <i className="fas fa-circle fs-6 me-1" />
                                        Completed
                                      </span>
                                      <div className="d-flex align-items-center">
                                        <div className="avatar-list-stacked avatar-group-sm">
                                          <span className="avatar avatar-rounded">
                                            <ImageWithBasePath
                                              className="border border-white"
                                              src="assets/img/profiles/avatar-28.jpg"
                                              alt="img"
                                            />
                                          </span>
                                          <span className="avatar avatar-rounded">
                                            <ImageWithBasePath
                                              className="border border-white"
                                              src="assets/img/profiles/avatar-29.jpg"
                                              alt="img"
                                            />
                                          </span>
                                          <span className="avatar avatar-rounded">
                                            <ImageWithBasePath
                                              className="border border-white"
                                              src="assets/img/profiles/avatar-24.jpg"
                                              alt="img"
                                            />
                                          </span>
                                        </div>
                                        <div className="dropdown ms-2">
                                          <Link
                                            to="to"
                                            className="d-inline-flex align-items-center"
                                            data-bs-toggle="dropdown"
                                          >
                                            <i className="ti ti-dots-vertical" />
                                          </Link>
                                          <ul className="dropdown-menu dropdown-menu-end p-3">
                                            <li>
                                              <Link
                                                to="to"
                                                className="dropdown-item rounded-1"
                                                data-bs-toggle="modal"
                                                data-inert={true}
                                                data-bs-target="#edit_todo"
                                              >
                                                <i className="ti ti-edit me-2" />
                                                Edit
                                              </Link>
                                            </li>
                                            <li>
                                              <Link
                                                to="to"
                                                className="dropdown-item rounded-1"
                                                data-bs-toggle="modal"
                                                data-inert={true}
                                                data-bs-target="#delete_modal"
                                              >
                                                <i className="ti ti-trash me-2" />
                                                Delete
                                              </Link>
                                            </li>
                                            <li>
                                              <Link
                                                to="to"
                                                className="dropdown-item rounded-1"
                                                data-bs-toggle="modal"
                                                data-inert={true}
                                                data-bs-target="#view_todo"
                                              >
                                                <i className="ti ti-eye me-2" />
                                                View
                                              </Link>
                                            </li>
                                          </ul>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="list-group-item border rounded p-2">
                                <div className="row align-items-center row-gap-3">
                                  <div className="col-md-7">
                                    <div className="todo-inbox-check d-flex align-items-center flex-wrap row-gap-3 todo-strike-content">
                                      <div className="form-check form-check-md me-2">
                                        <input
                                          className="form-check-input"
                                          type="checkbox"
                                          defaultChecked
                                        />
                                      </div>
                                      <span className="me-2 rating-select d-flex align-items-center">
                                        <i className="ti ti-star" />
                                      </span>
                                      <div className="strike-info">
                                        <h4 className="fs-14">Private chat module</h4>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="col-md-5">
                                    <div className="d-flex align-items-center justify-content-md-end flex-wrap row-gap-3">
                                      <span className="badge badge-secondary-transparent d-flex align-items-center me-3">
                                        <i className="fas fa-circle fs-6 me-1" />
                                        Pending
                                      </span>
                                      <div className="d-flex align-items-center">
                                        <div className="avatar-list-stacked avatar-group-sm">
                                          <span className="avatar avatar-rounded">
                                            <ImageWithBasePath
                                              className="border border-white"
                                              src="assets/img/profiles/avatar-23.jpg"
                                              alt="img"
                                            />
                                          </span>
                                          <span className="avatar avatar-rounded">
                                            <ImageWithBasePath
                                              className="border border-white"
                                              src="assets/img/profiles/avatar-24.jpg"
                                              alt="img"
                                            />
                                          </span>
                                          <span className="avatar avatar-rounded">
                                            <ImageWithBasePath
                                              className="border border-white"
                                              src="assets/img/profiles/avatar-25.jpg"
                                              alt="img"
                                            />
                                          </span>
                                        </div>
                                        <div className="dropdown ms-2">
                                          <Link
                                            to="to"
                                            className="d-inline-flex align-items-center"
                                            data-bs-toggle="dropdown"
                                          >
                                            <i className="ti ti-dots-vertical" />
                                          </Link>
                                          <ul className="dropdown-menu dropdown-menu-end p-3">
                                            <li>
                                              <Link
                                                to="to"
                                                className="dropdown-item rounded-1"
                                                data-bs-toggle="modal"
                                                data-inert={true}
                                                data-bs-target="#edit_todo"
                                              >
                                                <i className="ti ti-edit me-2" />
                                                Edit
                                              </Link>
                                            </li>
                                            <li>
                                              <Link
                                                to="to"
                                                className="dropdown-item rounded-1"
                                                data-bs-toggle="modal"
                                                data-inert={true}
                                                data-bs-target="#delete_modal"
                                              >
                                                <i className="ti ti-trash me-2" />
                                                Delete
                                              </Link>
                                            </li>
                                            <li>
                                              <Link
                                                to="to"
                                                className="dropdown-item rounded-1"
                                                data-bs-toggle="modal"
                                                data-inert={true}
                                                data-bs-target="#view_todo"
                                              >
                                                <i className="ti ti-eye me-2" />
                                                View
                                              </Link>
                                            </li>
                                          </ul>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="accordion-item" style={{ display: 'none' }}>
                        <div className="accordion-header" id="headingThree">
                          <div
                            className="accordion-button collapsed"
                            data-bs-toggle="collapse"
                            role="button"
                            data-bs-target="#primaryBorderThree"
                            aria-expanded="false"
                            aria-controls="primaryBorderThree"
                          >
                            <h5>Invoices</h5>
                          </div>
                        </div>
                        <div
                          id="primaryBorderThree"
                          className="accordion-collapse collapse border-top"
                          aria-labelledby="headingThree"
                          data-bs-parent="#accordionExample"
                        >
                          <div className="accordion-body">
                            <div className="row align-items-center g-3 mb-3">
                              <div className="col-sm-8">
                                <h6>Total No of Invoice : 45</h6>
                              </div>
                              <div className="col-sm-4">
                                <div className="position-relative input-icon">
                                  <span className="input-icon-addon">
                                    <i className="ti ti-search" />
                                  </span>
                                  <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Search"
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="list-group list-group-flush mb-3">
                              <div className="list-group-item border rounded mb-2 p-2">
                                <div className="row align-items-center g-3">
                                  <div className="col-sm-6">
                                    <div className="d-flex align-items-center">
                                      <span className="avatar avatar-lg bg-light flex-shrink-0 me-2">
                                        <i className="ti ti-file-invoice text-dark fs-24" />
                                      </span>
                                      <div>
                                        <h6 className="fw-medium mb-1">Phase 2 Completion</h6>
                                        <p>
                                          <Link to="#" className="text-info">
                                            #INV-123{' '}
                                          </Link>{' '}
                                          11 Sep 2025, 05:35 pm
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="col-sm-3">
                                    <div>
                                      <span>Amount</span>
                                      <p className="text-dark">$6,598</p>
                                    </div>
                                  </div>
                                  <div className="col-sm-3">
                                    <div className="d-flex align-items-center justify-content-sm-end">
                                      <span className="badge badge-soft-success d-inline-flex  align-items-center me-4">
                                        <i className="ti ti-point-filled me-1" />
                                        Paid
                                      </span>
                                      <Link to="#" className="btn btn-icon btn-sm">
                                        <i className="ti ti-edit" />
                                      </Link>
                                      <Link to="#" className="btn btn-icon btn-sm ">
                                        <i className="ti ti-trash" />
                                      </Link>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="list-group-item border rounded mb-2 p-2">
                                <div className="row align-items-center g-3">
                                  <div className="col-sm-6">
                                    <div className="d-flex align-items-center">
                                      <span className="avatar avatar-lg bg-light flex-shrink-0 me-2">
                                        <i className="ti ti-file-invoice text-dark fs-24" />
                                      </span>
                                      <div>
                                        <h6 className="fw-medium mb-1">Advance for Project</h6>
                                        <p>
                                          <Link to="#" className="text-info">
                                            #INV-124{' '}
                                          </Link>{' '}
                                          14 Sep 2025, 05:35 pm
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="col-sm-3">
                                    <div>
                                      <span>Amount</span>
                                      <p className="text-dark">$3312</p>
                                    </div>
                                  </div>
                                  <div className="col-sm-3">
                                    <div className="d-flex align-items-center justify-content-sm-end">
                                      <span className="badge badge-soft-success d-inline-flex  align-items-center me-4">
                                        <i className="ti ti-point-filled me-1" />
                                        Hold
                                      </span>
                                      <Link to="#" className="btn btn-icon btn-sm">
                                        <i className="ti ti-edit" />
                                      </Link>
                                      <Link to="#" className="btn btn-icon btn-sm ">
                                        <i className="ti ti-trash" />
                                      </Link>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="list-group-item border rounded mb-2 p-2">
                                <div className="row align-items-center g-3">
                                  <div className="col-sm-6">
                                    <div className="d-flex align-items-center">
                                      <span className="avatar avatar-lg bg-light flex-shrink-0 me-2">
                                        <i className="ti ti-file-invoice text-dark fs-24" />
                                      </span>
                                      <div>
                                        <h6 className="fw-medium mb-1">
                                          Changes &amp; design Alignments
                                        </h6>
                                        <p>
                                          <Link to="#" className="text-info">
                                            #INV-125{' '}
                                          </Link>{' '}
                                          15 Sep 2025, 05:35 pm
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="col-sm-3">
                                    <div>
                                      <span>Amount</span>
                                      <p className="text-dark">$4154</p>
                                    </div>
                                  </div>
                                  <div className="col-sm-3">
                                    <div className="d-flex align-items-center justify-content-sm-end">
                                      <span className="badge badge-soft-success d-inline-flex  align-items-center me-4">
                                        <i className="ti ti-point-filled me-1" />
                                        Paid
                                      </span>
                                      <Link to="#" className="btn btn-icon btn-sm">
                                        <i className="ti ti-edit" />
                                      </Link>
                                      <Link to="#" className="btn btn-icon btn-sm ">
                                        <i className="ti ti-trash" />
                                      </Link>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="list-group-item border rounded mb-2 p-2">
                                <div className="row align-items-center g-3">
                                  <div className="col-sm-6">
                                    <div className="d-flex align-items-center">
                                      <span className="avatar avatar-lg bg-light flex-shrink-0 me-2">
                                        <i className="ti ti-file-invoice text-dark fs-24" />
                                      </span>
                                      <div>
                                        <h6 className="fw-medium mb-1">Added New Functionality</h6>
                                        <p>
                                          <Link to="#" className="text-info">
                                            #INV-126{' '}
                                          </Link>{' '}
                                          16 Sep 2025, 05:35 pm
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="col-sm-3">
                                    <div>
                                      <span>Amount</span>
                                      <p className="text-dark">$658</p>
                                    </div>
                                  </div>
                                  <div className="col-sm-3">
                                    <div className="d-flex align-items-center justify-content-sm-end">
                                      <span className="badge badge-soft-success d-inline-flex  align-items-center me-4">
                                        <i className="ti ti-point-filled me-1" />
                                        Paid
                                      </span>
                                      <Link to="#" className="btn btn-icon btn-sm">
                                        <i className="ti ti-edit" />
                                      </Link>
                                      <Link to="#" className="btn btn-icon btn-sm ">
                                        <i className="ti ti-trash" />
                                      </Link>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="list-group-item border rounded p-2">
                                <div className="row align-items-center g-3">
                                  <div className="col-sm-6">
                                    <div className="d-flex align-items-center">
                                      <span className="avatar avatar-lg bg-light flex-shrink-0 me-2">
                                        <i className="ti ti-file-invoice text-dark fs-24" />
                                      </span>
                                      <div>
                                        <h6 className="fw-medium mb-1">Phase 1 Completion</h6>
                                        <p>
                                          <Link to="#" className="text-info">
                                            #INV-127{' '}
                                          </Link>{' '}
                                          17 Sep 2025, 05:35 pm
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="col-sm-3">
                                    <div>
                                      <span>Amount</span>
                                      <p className="text-dark">$1259</p>
                                    </div>
                                  </div>
                                  <div className="col-sm-3">
                                    <div className="d-flex align-items-center justify-content-sm-end">
                                      <span className="badge badge-soft-danger d-inline-flex  align-items-center me-4">
                                        <i className="ti ti-point-filled me-1" />
                                        unpaid
                                      </span>
                                      <Link to="#" className="btn btn-icon btn-sm">
                                        <i className="ti ti-edit" />
                                      </Link>
                                      <Link to="#" className="btn btn-icon btn-sm ">
                                        <i className="ti ti-trash" />
                                      </Link>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="text-center">
                              <Link to="#" className="btn btn-primary btn-sm">
                                Load More
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="accordion-item" style={{ display: 'none' }}>
                        <div className="accordion-header" id="headingFour">
                          <div
                            className="accordion-button collapsed"
                            data-bs-toggle="collapse"
                            role="button"
                            data-bs-target="#primaryBorderFour"
                            aria-expanded="false"
                            aria-controls="primaryBorderFour"
                          >
                            <h5>Notes</h5>
                          </div>
                        </div>
                        <div
                          id="primaryBorderFour"
                          className="accordion-collapse collapse border-top"
                          aria-labelledby="headingFour"
                          data-bs-parent="#accordionExample"
                        >
                          <div className="accordion-body">
                            <div className="row align-items-center g-3 mb-3">
                              <div className="col-sm-8">
                                <h6>Total No of Notes : 45</h6>
                              </div>
                              <div className="col-sm-4">
                                <div className="position-relative input-icon">
                                  <span className="input-icon-addon">
                                    <i className="ti ti-search" />
                                  </span>
                                  <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Search"
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="row">
                              <div className="col-md-4 col-sm-6 d-flex">
                                <div className="card flex-fill">
                                  <div className="card-body">
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                      <h6 className="text-gray-5 fw-medium">15 May 2025</h6>
                                      <div className="dropdown">
                                        <Link
                                          to="to"
                                          className="d-inline-flex align-items-center"
                                          data-bs-toggle="dropdown"
                                          aria-expanded="false"
                                        >
                                          <i className="ti ti-dots-vertical" />
                                        </Link>
                                        <ul className="dropdown-menu dropdown-menu-end p-3">
                                          <li>
                                            <Link to="to" className="dropdown-item rounded-1">
                                              <i className="ti ti-edit me-2" />
                                              Edit
                                            </Link>
                                          </li>
                                          <li>
                                            <Link to="to" className="dropdown-item rounded-1">
                                              <i className="ti ti-trash me-1" />
                                              Delete
                                            </Link>
                                          </li>
                                        </ul>
                                      </div>
                                    </div>
                                    <h6 className="d-flex align-items-center mb-2">
                                      <i className="ti ti-point-filled text-primary me-1" />
                                      Changes &amp; design
                                    </h6>
                                    <p className="text-truncate line-clamb-3">
                                      An office management app project streamlines administrative
                                      tasks by integrating tools for scheduling, communication, and
                                      task management, enhancing overall productivity and
                                      efficiency.
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="col-md-4 col-sm-6 d-flex">
                                <div className="card flex-fill">
                                  <div className="card-body">
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                      <h6 className="text-gray-5 fw-medium">16 May 2025</h6>
                                      <div className="dropdown">
                                        <Link
                                          to="to"
                                          className="d-inline-flex align-items-center"
                                          data-bs-toggle="dropdown"
                                          aria-expanded="false"
                                        >
                                          <i className="ti ti-dots-vertical" />
                                        </Link>
                                        <ul className="dropdown-menu dropdown-menu-end p-3">
                                          <li>
                                            <Link to="to" className="dropdown-item rounded-1">
                                              <i className="ti ti-edit me-2" />
                                              Edit
                                            </Link>
                                          </li>
                                          <li>
                                            <Link to="to" className="dropdown-item rounded-1">
                                              <i className="ti ti-trash me-1" />
                                              Delete
                                            </Link>
                                          </li>
                                        </ul>
                                      </div>
                                    </div>
                                    <h6 className="d-flex align-items-center mb-2">
                                      <i className="ti ti-point-filled text-success me-1" />
                                      Phase 1 Completion
                                    </h6>
                                    <p className="text-truncate line-clamb-3">
                                      An office management app project streamlines administrative
                                      tasks by integrating tools for scheduling, communication, and
                                      task management, enhancing overall productivity and
                                      efficiency.
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="col-md-4 col-sm-6 d-flex">
                                <div className="card flex-fill">
                                  <div className="card-body">
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                      <h6 className="text-gray-5 fw-medium">17 May 2025</h6>
                                      <div className="dropdown">
                                        <Link
                                          to="to"
                                          className="d-inline-flex align-items-center"
                                          data-bs-toggle="dropdown"
                                          aria-expanded="false"
                                        >
                                          <i className="ti ti-dots-vertical" />
                                        </Link>
                                        <ul className="dropdown-menu dropdown-menu-end p-3">
                                          <li>
                                            <Link to="to" className="dropdown-item rounded-1">
                                              <i className="ti ti-edit me-2" />
                                              Edit
                                            </Link>
                                          </li>
                                          <li>
                                            <Link to="to" className="dropdown-item rounded-1">
                                              <i className="ti ti-trash me-1" />
                                              Delete
                                            </Link>
                                          </li>
                                        </ul>
                                      </div>
                                    </div>
                                    <h6 className="d-flex align-items-center mb-2">
                                      <i className="ti ti-point-filled text-danger me-1" />
                                      Phase 2 Completion
                                    </h6>
                                    <p className="text-truncate line-clamb-3">
                                      An office management app project streamlines administrative
                                      tasks by integrating tools for scheduling, communication, and
                                      task management, enhancing overall productivity and
                                      efficiency.
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="col-md-12">
                                <div className="text-center">
                                  <Link to="#" className="btn btn-primary btn-sm">
                                    Load More
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="accordion-item" style={{ display: 'none' }}>
                        <div className="accordion-header" id="headingFive">
                          <div
                            className="accordion-button collapsed"
                            data-bs-toggle="collapse"
                            role="button"
                            data-bs-target="#primaryBorderFive"
                            aria-expanded="false"
                            aria-controls="primaryBorderFive"
                          >
                            <h5>Documents</h5>
                          </div>
                        </div>
                        <div
                          id="primaryBorderFive"
                          className="accordion-collapse collapse border-top"
                          aria-labelledby="headingFive"
                          data-bs-parent="#accordionExample"
                        >
                          <div className="accordion-body">
                            <div className="row align-items-center g-3 mb-3">
                              <div className="col-sm-4">
                                <h6>Total No of Documents : 45</h6>
                              </div>
                              <div className="col-sm-8">
                                <div className="d-flex align-items-center">
                                  <div className="dropdown me-2">
                                    <Link
                                      to="to"
                                      className="dropdown-toggle btn btn-white"
                                      data-bs-toggle="dropdown"
                                      aria-expanded="false"
                                    >
                                      Sort By : Docs Type
                                    </Link>
                                    <ul className="dropdown-menu dropdown-menu-end p-3">
                                      <li>
                                        <Link to="to" className="dropdown-item rounded-1">
                                          Docs
                                        </Link>
                                      </li>
                                      <li>
                                        <Link to="to" className="dropdown-item rounded-1">
                                          Pdf
                                        </Link>
                                      </li>
                                      <li>
                                        <Link to="to" className="dropdown-item rounded-1">
                                          Image
                                        </Link>
                                      </li>
                                      <li>
                                        <Link to="to" className="dropdown-item rounded-1">
                                          Folder
                                        </Link>
                                      </li>
                                      <li>
                                        <Link to="to" className="dropdown-item rounded-1">
                                          Xml
                                        </Link>
                                      </li>
                                    </ul>
                                  </div>
                                  <div className="position-relative input-icon flex-fill">
                                    <span className="input-icon-addon">
                                      <i className="ti ti-search" />
                                    </span>
                                    <input
                                      type="text"
                                      className="form-control"
                                      placeholder="Search"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="custom-datatable-filter table-responsive no-datatable-length border">
                              <table className="table datatable">
                                <thead className="thead-light">
                                  <tr>
                                    <th>Name</th>
                                    <th>Size</th>
                                    <th>Type</th>
                                    <th>Modified</th>
                                    <th>Share</th>
                                    <th />
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td>
                                      <div className="d-flex align-items-center file-name-icon">
                                        <Link
                                          to="#"
                                          className="avatar avatar-md bg-light"
                                          data-bs-toggle="offcanvas"
                                          data-bs-target="#preview"
                                        >
                                          <ImageWithBasePath
                                            src="assets/img/icons/file-01.svg"
                                            className="img-fluid"
                                            alt="img"
                                          />
                                        </Link>
                                        <div className="ms-2">
                                          <p className="text-title fw-medium  mb-0">
                                            <Link
                                              to="#"
                                              data-bs-toggle="offcanvas"
                                              data-bs-target="#preview"
                                            >
                                              Secret
                                            </Link>
                                          </p>
                                        </div>
                                      </div>
                                    </td>
                                    <td>7.6 MB</td>
                                    <td>Doc</td>
                                    <td>
                                      <p className="text-title mb-0">Mar 15, 2025</p>
                                      <span>05:00:14 PM</span>
                                    </td>
                                    <td>
                                      <div className="avatar-list-stacked avatar-group-sm">
                                        <span className="avatar avatar-rounded">
                                          <ImageWithBasePath
                                            className="border border-white"
                                            src="assets/img/profiles/avatar-27.jpg"
                                            alt="img"
                                          />
                                        </span>
                                        <span className="avatar avatar-rounded">
                                          <ImageWithBasePath
                                            className="border border-white"
                                            src="assets/img/profiles/avatar-29.jpg"
                                            alt="img"
                                          />
                                        </span>
                                        <span className="avatar avatar-rounded">
                                          <ImageWithBasePath
                                            className="border border-white"
                                            src="assets/img/profiles/avatar-12.jpg"
                                            alt="img"
                                          />
                                        </span>
                                      </div>
                                    </td>
                                    <td>
                                      <div className="d-flex align-items-center">
                                        <div className="rating-select me-2">
                                          <Link to="to">
                                            <i className="ti ti-star" />
                                          </Link>
                                        </div>
                                        <div className="dropdown">
                                          <Link
                                            to="#"
                                            className="d-flex align-items-center justify-content-center"
                                            data-bs-toggle="dropdown"
                                            aria-expanded="false"
                                          >
                                            <i className="ti ti-dots fs-14" />
                                          </Link>
                                          <ul className="dropdown-menu dropdown-menu-right p-3">
                                            <li>
                                              <Link className="dropdown-item rounded-1" to="#">
                                                <i className="ti ti-trash me-2" />
                                                Permanent Delete
                                              </Link>
                                            </li>
                                            <li>
                                              <Link className="dropdown-item rounded-1" to="#">
                                                <i className="ti ti-edit-circle me-2" />
                                                Restore File
                                              </Link>
                                            </li>
                                          </ul>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td>
                                      <div className="d-flex align-items-center file-name-icon">
                                        <Link
                                          to="#"
                                          className="avatar avatar-md bg-light"
                                          data-bs-toggle="offcanvas"
                                          data-bs-target="#preview"
                                        >
                                          <ImageWithBasePath
                                            src="assets/img/icons/file-02.svg"
                                            className="img-fluid"
                                            alt="img"
                                          />
                                        </Link>
                                        <div className="ms-2">
                                          <p className="text-title fw-medium  mb-0">
                                            <Link
                                              to="#"
                                              data-bs-toggle="offcanvas"
                                              data-bs-target="#preview"
                                            >
                                              Sophie Headrick
                                            </Link>
                                          </p>
                                        </div>
                                      </div>
                                    </td>
                                    <td>7.4 MB</td>
                                    <td>PDF</td>
                                    <td>
                                      <p className="text-title mb-0">Jan 8, 2025</p>
                                      <span>08:20:13 PM</span>
                                    </td>
                                    <td>
                                      <div className="avatar-list-stacked avatar-group-sm">
                                        <span className="avatar avatar-rounded">
                                          <ImageWithBasePath
                                            className="border border-white"
                                            src="assets/img/profiles/avatar-15.jpg"
                                            alt="img"
                                          />
                                        </span>
                                        <span className="avatar avatar-rounded">
                                          <ImageWithBasePath
                                            className="border border-white"
                                            src="assets/img/profiles/avatar-16.jpg"
                                            alt="img"
                                          />
                                        </span>
                                      </div>
                                    </td>
                                    <td>
                                      <div className="d-flex align-items-center">
                                        <div className="rating-select me-2">
                                          <Link to="to">
                                            <i className="ti ti-star" />
                                          </Link>
                                        </div>
                                        <div className="dropdown">
                                          <Link
                                            to="#"
                                            className="d-flex align-items-center justify-content-center"
                                            data-bs-toggle="dropdown"
                                            aria-expanded="false"
                                          >
                                            <i className="ti ti-dots fs-14" />
                                          </Link>
                                          <ul className="dropdown-menu dropdown-menu-right p-3">
                                            <li>
                                              <Link className="dropdown-item rounded-1" to="#">
                                                <i className="ti ti-trash me-2" />
                                                Permanent Delete
                                              </Link>
                                            </li>
                                            <li>
                                              <Link className="dropdown-item rounded-1" to="#">
                                                <i className="ti ti-edit-circle me-2" />
                                                Restore File
                                              </Link>
                                            </li>
                                          </ul>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td>
                                      <div className="d-flex align-items-center file-name-icon">
                                        <Link
                                          to="#"
                                          className="avatar avatar-md bg-light"
                                          data-bs-toggle="offcanvas"
                                          data-bs-target="#preview"
                                        >
                                          <ImageWithBasePath
                                            src="assets/img/icons/file-03.svg"
                                            className="img-fluid"
                                            alt="img"
                                          />
                                        </Link>
                                        <div className="ms-2">
                                          <p className="text-title fw-medium  mb-0">
                                            <Link
                                              to="#"
                                              data-bs-toggle="offcanvas"
                                              data-bs-target="#preview"
                                            >
                                              Gallery
                                            </Link>
                                          </p>
                                        </div>
                                      </div>
                                    </td>
                                    <td>6.1 MB</td>
                                    <td>Image</td>
                                    <td>
                                      <p className="text-title mb-0">Aug 6, 2025</p>
                                      <span>04:10:12 PM</span>
                                    </td>
                                    <td>
                                      <div className="avatar-list-stacked avatar-group-sm">
                                        <span className="avatar avatar-rounded">
                                          <ImageWithBasePath
                                            className="border border-white"
                                            src="assets/img/profiles/avatar-02.jpg"
                                            alt="img"
                                          />
                                        </span>
                                        <span className="avatar avatar-rounded">
                                          <ImageWithBasePath
                                            className="border border-white"
                                            src="assets/img/profiles/avatar-03.jpg"
                                            alt="img"
                                          />
                                        </span>
                                        <span className="avatar avatar-rounded">
                                          <ImageWithBasePath
                                            className="border border-white"
                                            src="assets/img/profiles/avatar-05.jpg"
                                            alt="img"
                                          />
                                        </span>
                                        <span className="avatar avatar-rounded">
                                          <ImageWithBasePath
                                            className="border border-white"
                                            src="assets/img/profiles/avatar-06.jpg"
                                            alt="img"
                                          />
                                        </span>
                                        <Link
                                          className="avatar bg-primary avatar-rounded text-fixed-white"
                                          to="to"
                                        >
                                          +1
                                        </Link>
                                      </div>
                                    </td>
                                    <td>
                                      <div className="d-flex align-items-center">
                                        <div className="rating-select me-2">
                                          <Link to="to">
                                            <i className="ti ti-star" />
                                          </Link>
                                        </div>
                                        <div className="dropdown">
                                          <Link
                                            to="#"
                                            className="d-flex align-items-center justify-content-center"
                                            data-bs-toggle="dropdown"
                                            aria-expanded="false"
                                          >
                                            <i className="ti ti-dots fs-14" />
                                          </Link>
                                          <ul className="dropdown-menu dropdown-menu-right p-3">
                                            <li>
                                              <Link className="dropdown-item rounded-1" to="#">
                                                <i className="ti ti-trash me-2" />
                                                Permanent Delete
                                              </Link>
                                            </li>
                                            <li>
                                              <Link className="dropdown-item rounded-1" to="#">
                                                <i className="ti ti-edit-circle me-2" />
                                                Restore File
                                              </Link>
                                            </li>
                                          </ul>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td>
                                      <div className="d-flex align-items-center file-name-icon">
                                        <Link
                                          to="#"
                                          className="avatar avatar-md bg-light"
                                          data-bs-toggle="offcanvas"
                                          data-bs-target="#preview"
                                        >
                                          <ImageWithBasePath
                                            src="assets/img/icons/file-04.svg"
                                            className="img-fluid"
                                            alt="img"
                                          />
                                        </Link>
                                        <div className="ms-2">
                                          <p className="text-title fw-medium  mb-0">
                                            <Link
                                              to="#"
                                              data-bs-toggle="offcanvas"
                                              data-bs-target="#preview"
                                            >
                                              Doris Crowley
                                            </Link>
                                          </p>
                                        </div>
                                      </div>
                                    </td>
                                    <td>5.2 MB</td>
                                    <td>Folder</td>
                                    <td>
                                      <p className="text-title mb-0">Jan 6, 2025</p>
                                      <span>03:40:14 PM</span>
                                    </td>
                                    <td>
                                      <div className="avatar-list-stacked avatar-group-sm">
                                        <span className="avatar avatar-rounded">
                                          <ImageWithBasePath
                                            className="border border-white"
                                            src="assets/img/profiles/avatar-06.jpg"
                                            alt="img"
                                          />
                                        </span>
                                        <span className="avatar avatar-rounded">
                                          <ImageWithBasePath
                                            className="border border-white"
                                            src="assets/img/profiles/avatar-10.jpg"
                                            alt="img"
                                          />
                                        </span>
                                        <span className="avatar avatar-rounded">
                                          <ImageWithBasePath
                                            className="border border-white"
                                            src="assets/img/profiles/avatar-15.jpg"
                                            alt="img"
                                          />
                                        </span>
                                      </div>
                                    </td>
                                    <td>
                                      <div className="d-flex align-items-center">
                                        <div className="rating-select me-2">
                                          <Link to="to">
                                            <i className="ti ti-star" />
                                          </Link>
                                        </div>
                                        <div className="dropdown">
                                          <Link
                                            to="#"
                                            className="d-flex align-items-center justify-content-center"
                                            data-bs-toggle="dropdown"
                                            aria-expanded="false"
                                          >
                                            <i className="ti ti-dots fs-14" />
                                          </Link>
                                          <ul className="dropdown-menu dropdown-menu-right p-3">
                                            <li>
                                              <Link className="dropdown-item rounded-1" to="#">
                                                <i className="ti ti-trash me-2" />
                                                Permanent Delete
                                              </Link>
                                            </li>
                                            <li>
                                              <Link className="dropdown-item rounded-1" to="#">
                                                <i className="ti ti-edit-circle me-2" />
                                                Restore File
                                              </Link>
                                            </li>
                                          </ul>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td>
                                      <div className="d-flex align-items-center file-name-icon">
                                        <Link
                                          to="#"
                                          className="avatar avatar-md bg-light"
                                          data-bs-toggle="offcanvas"
                                          data-bs-target="#preview"
                                        >
                                          <ImageWithBasePath
                                            src="assets/img/icons/file-05.svg"
                                            className="img-fluid"
                                            alt="img"
                                          />
                                        </Link>
                                        <div className="ms-2">
                                          <p className="text-title fw-medium  mb-0">
                                            <Link
                                              to="#"
                                              data-bs-toggle="offcanvas"
                                              data-bs-target="#preview"
                                            >
                                              Cheat_codez
                                            </Link>
                                          </p>
                                        </div>
                                      </div>
                                    </td>
                                    <td>8 MB</td>
                                    <td>Xml</td>
                                    <td>
                                      <p className="text-title mb-0">Oct 12, 2025</p>
                                      <span>05:00:14 PM</span>
                                    </td>
                                    <td>
                                      <div className="avatar-list-stacked avatar-group-sm">
                                        <span className="avatar avatar-rounded">
                                          <ImageWithBasePath
                                            className="border border-white"
                                            src="assets/img/profiles/avatar-04.jpg"
                                            alt="img"
                                          />
                                        </span>
                                        <span className="avatar avatar-rounded">
                                          <ImageWithBasePath
                                            className="border border-white"
                                            src="assets/img/profiles/avatar-28.jpg"
                                            alt="img"
                                          />
                                        </span>
                                        <span className="avatar avatar-rounded">
                                          <ImageWithBasePath
                                            className="border border-white"
                                            src="assets/img/profiles/avatar-14.jpg"
                                            alt="img"
                                          />
                                        </span>
                                        <span className="avatar avatar-rounded">
                                          <ImageWithBasePath
                                            className="border border-white"
                                            src="assets/img/profiles/avatar-15.jpg"
                                            alt="img"
                                          />
                                        </span>
                                      </div>
                                    </td>
                                    <td>
                                      <div className="d-flex align-items-center">
                                        <div className="rating-select me-2">
                                          <Link to="to">
                                            <i className="ti ti-star" />
                                          </Link>
                                        </div>
                                        <div className="dropdown">
                                          <Link
                                            to="#"
                                            className="d-flex align-items-center justify-content-center"
                                            data-bs-toggle="dropdown"
                                            aria-expanded="false"
                                          >
                                            <i className="ti ti-dots fs-14" />
                                          </Link>
                                          <ul className="dropdown-menu dropdown-menu-right p-3">
                                            <li>
                                              <Link className="dropdown-item rounded-1" to="#">
                                                <i className="ti ti-trash me-2" />
                                                Permanent Delete
                                              </Link>
                                            </li>
                                            <li>
                                              <Link className="dropdown-item rounded-1" to="#">
                                                <i className="ti ti-edit-circle me-2" />
                                                Restore File
                                              </Link>
                                            </li>
                                          </ul>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="tab-pane" id="bottom-justified-tab2" role="tabpanel">
                    <div className="accordion accordions-items-seperate">
                      <div className="accordion-item">
                        <div className="accordion-header" id="headingOne2">
                          <div
                            className="accordion-button bg-white"
                            data-bs-toggle="collapse"
                            data-bs-target="#primaryBorderOne2"
                            aria-expanded="true"
                            aria-controls="primaryBorderOne2"
                            role="button"
                          >
                            <h5>Projects</h5>
                          </div>
                        </div>
                        <div
                          id="primaryBorderOne2"
                          className="accordion-collapse collapse show border-top"
                          aria-labelledby="headingOne2"
                        >
                          <div className="accordion-body pb-0">
                            {loadingProjects ? (
                              <div className="text-center py-5">
                                <div className="spinner-border text-primary" role="status">
                                  <span className="visually-hidden">Loading projects...</span>
                                </div>
                                <p className="mt-2">Loading projects...</p>
                              </div>
                            ) : clientProjects.length === 0 ? (
                              <div className="text-center py-5">
                                <i
                                  className="ti ti-folder-off"
                                  style={{ fontSize: '48px', color: '#ccc' }}
                                />
                                <p className="text-muted mt-2">No projects found for this client</p>
                              </div>
                            ) : (
                              <div className="row">
                                {clientProjects.map((project) => (
                                  <div key={project._id} className="col-xxl-6 col-lg-12 col-md-6">
                                    <div
                                      className="card"
                                      onClick={() =>
                                        navigate(
                                          all_routes.projectdetails.replace(
                                            ':projectId',
                                            project._id
                                          )
                                        )
                                      }
                                      style={{
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        border: '2px solid transparent',
                                      }}
                                      onMouseEnter={(e) =>
                                        (e.currentTarget.style.borderColor = '#0d6efd')
                                      }
                                      onMouseLeave={(e) =>
                                        (e.currentTarget.style.borderColor = 'transparent')
                                      }
                                    >
                                      <div className="card-body">
                                        <div className="d-flex align-items-center pb-3 mb-3 border-bottom">
                                          <div className="flex-shrink-0 me-2">
                                            <ImageWithBasePath
                                              src="assets/img/social/project-01.svg"
                                              alt="Img"
                                            />
                                          </div>
                                          <div>
                                            <h6 className="mb-1">{project.name}</h6>
                                            <div className="d-flex align-items-center">
                                              <span
                                                className={`badge badge-${
                                                  project.status === 'Active'
                                                    ? 'success'
                                                    : project.status === 'Completed'
                                                      ? 'info'
                                                      : project.status === 'On Hold'
                                                        ? 'warning'
                                                        : 'danger'
                                                }`}
                                              >
                                                {project.status}
                                              </span>
                                              <span className="mx-2">
                                                <i className="ti ti-point-filled text-primary" />
                                              </span>
                                              <span
                                                className={`badge badge-${
                                                  project.priority === 'High'
                                                    ? 'danger'
                                                    : project.priority === 'Medium'
                                                      ? 'warning'
                                                      : 'info'
                                                }`}
                                              >
                                                {project.priority}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="row">
                                          <div className="col-sm-4">
                                            <div className="mb-3">
                                              <span className="mb-1 d-block">Deadline</span>
                                              <p className="text-dark">
                                                {project.dueDate
                                                  ? new Date(project.dueDate).toLocaleDateString(
                                                      'en-US',
                                                      {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        year: 'numeric',
                                                      }
                                                    )
                                                  : 'Not set'}
                                              </p>
                                            </div>
                                          </div>
                                          <div className="col-sm-4">
                                            <div className="mb-3">
                                              <span className="mb-1 d-block">Budget</span>
                                              <p className="text-dark">
                                                {project.projectValue || project.budget
                                                  ? `$${(project.projectValue || project.budget)?.toLocaleString()}`
                                                  : 'Not set'}
                                              </p>
                                            </div>
                                          </div>
                                          <div className="col-sm-4">
                                            <div className="mb-3">
                                              <span className="mb-1 d-block">Progress</span>
                                              <div className="d-flex align-items-center">
                                                <div
                                                  className="progress flex-fill me-2"
                                                  style={{ height: '6px' }}
                                                >
                                                  <div
                                                    className="progress-bar bg-success"
                                                    role="progressbar"
                                                    style={{ width: `${project.progress}%` }}
                                                  />
                                                </div>
                                                <span className="text-dark">
                                                  {project.progress}%
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                        {project.description && (
                                          <div className="mb-2">
                                            <span className="mb-1 d-block text-muted">
                                              Description
                                            </span>
                                            <p
                                              className="text-dark mb-0"
                                              style={{
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                              }}
                                            >
                                              {project.description}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    className="tab-pane"
                    id="bottom-justified-tab3"
                    role="tabpanel"
                    style={{ display: 'none' }}
                  >
                    <div className="accordion accordions-items-seperate">
                      <div className="accordion-item">
                        <div className="accordion-header" id="headingTwo2">
                          <div
                            className="accordion-button collapsed"
                            data-bs-toggle="collapse"
                            role="button"
                            data-bs-target="#primaryBorderTwo2"
                            aria-expanded="true"
                            aria-controls="primaryBorderTwo2"
                          >
                            <h5>Tasks</h5>
                          </div>
                        </div>
                        <div
                          id="primaryBorderTwo2"
                          className="accordion-collapse collapse show border-top"
                          aria-labelledby="headingTwo2"
                        >
                          <div className="accordion-body">
                            <div className="list-group list-group-flush">
                              <div className="list-group-item border rounded mb-2 p-2">
                                <div className="row align-items-center row-gap-3">
                                  <div className="col-md-7">
                                    <div className="todo-inbox-check d-flex align-items-center flex-wrap row-gap-3">
                                      <div className="form-check form-check-md me-2">
                                        <input className="form-check-input" type="checkbox" />
                                      </div>
                                      <span className="me-2 d-flex align-items-center rating-select">
                                        <i className="ti ti-star-filled filled" />
                                      </span>
                                      <div className="strike-info">
                                        <h4 className="fs-14">Patient appointment booking</h4>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="col-md-5">
                                    <div className="d-flex align-items-center justify-content-md-end flex-wrap row-gap-3">
                                      <span className="badge bg-soft-pink d-inline-flex align-items-center me-3">
                                        <i className="fas fa-circle fs-6 me-1" />
                                        Onhold
                                      </span>
                                      <div className="d-flex align-items-center">
                                        <div className="avatar-list-stacked avatar-group-sm">
                                          <span className="avatar avatar-rounded">
                                            <ImageWithBasePath
                                              className="border border-white"
                                              src="assets/img/profiles/avatar-13.jpg"
                                              alt="img"
                                            />
                                          </span>
                                          <span className="avatar avatar-rounded">
                                            <ImageWithBasePath
                                              className="border border-white"
                                              src="assets/img/profiles/avatar-14.jpg"
                                              alt="img"
                                            />
                                          </span>
                                          <span className="avatar avatar-rounded">
                                            <ImageWithBasePath
                                              className="border border-white"
                                              src="assets/img/profiles/avatar-15.jpg"
                                              alt="img"
                                            />
                                          </span>
                                        </div>
                                        <div className="dropdown ms-2">
                                          <Link
                                            to="to"
                                            className="d-inline-flex align-items-center"
                                            data-bs-toggle="dropdown"
                                          >
                                            <i className="ti ti-dots-vertical" />
                                          </Link>
                                          <ul className="dropdown-menu dropdown-menu-end p-3">
                                            <li>
                                              <Link
                                                to="to"
                                                className="dropdown-item rounded-1"
                                                data-bs-toggle="modal"
                                                data-inert={true}
                                                data-bs-target="#edit_todo"
                                              >
                                                <i className="ti ti-edit me-2" />
                                                Edit
                                              </Link>
                                            </li>
                                            <li>
                                              <Link
                                                to="to"
                                                className="dropdown-item rounded-1"
                                                data-bs-toggle="modal"
                                                data-inert={true}
                                                data-bs-target="#delete_modal"
                                              >
                                                <i className="ti ti-trash me-2" />
                                                Delete
                                              </Link>
                                            </li>
                                            <li>
                                              <Link
                                                to="to"
                                                className="dropdown-item rounded-1"
                                                data-bs-toggle="modal"
                                                data-inert={true}
                                                data-bs-target="#view_todo"
                                              >
                                                <i className="ti ti-eye me-2" />
                                                View
                                              </Link>
                                            </li>
                                          </ul>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="list-group-item border rounded mb-2 p-2">
                                <div className="row align-items-center row-gap-3">
                                  <div className="col-md-7">
                                    <div className="todo-inbox-check d-flex align-items-center flex-wrap row-gap-3">
                                      <div className="form-check form-check-md me-2">
                                        <input className="form-check-input" type="checkbox" />
                                      </div>
                                      <span className="me-2 rating-select d-flex align-items-center">
                                        <i className="ti ti-star" />
                                      </span>
                                      <div className="strike-info">
                                        <h4 className="fs-14">
                                          Appointment booking with payment gateway
                                        </h4>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="col-md-5">
                                    <div className="d-flex align-items-center justify-content-md-end flex-wrap row-gap-3">
                                      <span className="badge bg-transparent-purple d-flex align-items-center me-3">
                                        <i className="fas fa-circle fs-6 me-1" />
                                        Inprogress
                                      </span>
                                      <div className="d-flex align-items-center">
                                        <div className="avatar-list-stacked avatar-group-sm">
                                          <span className="avatar avatar-rounded">
                                            <ImageWithBasePath
                                              className="border border-white"
                                              src="assets/img/profiles/avatar-20.jpg"
                                              alt="img"
                                            />
                                          </span>
                                          <span className="avatar avatar-rounded">
                                            <ImageWithBasePath
                                              className="border border-white"
                                              src="assets/img/profiles/avatar-21.jpg"
                                              alt="img"
                                            />
                                          </span>
                                          <span className="avatar avatar-rounded">
                                            <ImageWithBasePath
                                              className="border border-white"
                                              src="assets/img/profiles/avatar-22.jpg"
                                              alt="img"
                                            />
                                          </span>
                                        </div>
                                        <div className="dropdown ms-2">
                                          <Link
                                            to="to"
                                            className="d-inline-flex align-items-center"
                                            data-bs-toggle="dropdown"
                                          >
                                            <i className="ti ti-dots-vertical" />
                                          </Link>
                                          <ul className="dropdown-menu dropdown-menu-end p-3">
                                            <li>
                                              <Link
                                                to="to"
                                                className="dropdown-item rounded-1"
                                                data-bs-toggle="modal"
                                                data-inert={true}
                                                data-bs-target="#edit_todo"
                                              >
                                                <i className="ti ti-edit me-2" />
                                                Edit
                                              </Link>
                                            </li>
                                            <li>
                                              <Link
                                                to="to"
                                                className="dropdown-item rounded-1"
                                                data-bs-toggle="modal"
                                                data-inert={true}
                                                data-bs-target="#delete_modal"
                                              >
                                                <i className="ti ti-trash me-2" />
                                                Delete
                                              </Link>
                                            </li>
                                            <li>
                                              <Link
                                                to="to"
                                                className="dropdown-item rounded-1"
                                                data-bs-toggle="modal"
                                                data-inert={true}
                                                data-bs-target="#view_todo"
                                              >
                                                <i className="ti ti-eye me-2" />
                                                View
                                              </Link>
                                            </li>
                                          </ul>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="list-group-item border rounded mb-2 p-2">
                                <div className="row align-items-center row-gap-3">
                                  <div className="col-md-7">
                                    <div className="todo-inbox-check d-flex align-items-center flex-wrap row-gap-3">
                                      <div className="form-check form-check-md me-2">
                                        <input className="form-check-input" type="checkbox" />
                                      </div>
                                      <span className="me-2 rating-select d-flex align-items-center">
                                        <i className="ti ti-star" />
                                      </span>
                                      <div className="strike-info">
                                        <h4 className="fs-14">
                                          Patient and Doctor video conferencing
                                        </h4>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="col-md-5">
                                    <div className="d-flex align-items-center justify-content-md-end flex-wrap row-gap-3">
                                      <span className="badge badge-soft-success align-items-center me-3">
                                        <i className="fas fa-circle fs-6 me-1" />
                                        Completed
                                      </span>
                                      <div className="d-flex align-items-center">
                                        <div className="avatar-list-stacked avatar-group-sm">
                                          <span className="avatar avatar-rounded">
                                            <ImageWithBasePath
                                              className="border border-white"
                                              src="assets/img/profiles/avatar-28.jpg"
                                              alt="img"
                                            />
                                          </span>
                                          <span className="avatar avatar-rounded">
                                            <ImageWithBasePath
                                              className="border border-white"
                                              src="assets/img/profiles/avatar-29.jpg"
                                              alt="img"
                                            />
                                          </span>
                                          <span className="avatar avatar-rounded">
                                            <ImageWithBasePath
                                              className="border border-white"
                                              src="assets/img/profiles/avatar-24.jpg"
                                              alt="img"
                                            />
                                          </span>
                                        </div>
                                        <div className="dropdown ms-2">
                                          <Link
                                            to="to"
                                            className="d-inline-flex align-items-center"
                                            data-bs-toggle="dropdown"
                                          >
                                            <i className="ti ti-dots-vertical" />
                                          </Link>
                                          <ul className="dropdown-menu dropdown-menu-end p-3">
                                            <li>
                                              <Link
                                                to="to"
                                                className="dropdown-item rounded-1"
                                                data-bs-toggle="modal"
                                                data-inert={true}
                                                data-bs-target="#edit_todo"
                                              >
                                                <i className="ti ti-edit me-2" />
                                                Edit
                                              </Link>
                                            </li>
                                            <li>
                                              <Link
                                                to="to"
                                                className="dropdown-item rounded-1"
                                                data-bs-toggle="modal"
                                                data-inert={true}
                                                data-bs-target="#delete_modal"
                                              >
                                                <i className="ti ti-trash me-2" />
                                                Delete
                                              </Link>
                                            </li>
                                            <li>
                                              <Link
                                                to="to"
                                                className="dropdown-item rounded-1"
                                                data-bs-toggle="modal"
                                                data-inert={true}
                                                data-bs-target="#view_todo"
                                              >
                                                <i className="ti ti-eye me-2" />
                                                View
                                              </Link>
                                            </li>
                                          </ul>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="list-group-item border rounded p-2">
                                <div className="row align-items-center row-gap-3">
                                  <div className="col-md-7">
                                    <div className="todo-inbox-check d-flex align-items-center flex-wrap row-gap-3 todo-strike-content">
                                      <div className="form-check form-check-md me-2">
                                        <input
                                          className="form-check-input"
                                          type="checkbox"
                                          defaultChecked
                                        />
                                      </div>
                                      <span className="me-2 rating-select d-flex align-items-center">
                                        <i className="ti ti-star" />
                                      </span>
                                      <div className="strike-info">
                                        <h4 className="fs-14">Private chat module</h4>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="col-md-5">
                                    <div className="d-flex align-items-center justify-content-md-end flex-wrap row-gap-3">
                                      <span className="badge badge-secondary-transparent d-flex align-items-center me-3">
                                        <i className="fas fa-circle fs-6 me-1" />
                                        Pending
                                      </span>
                                      <div className="d-flex align-items-center">
                                        <div className="avatar-list-stacked avatar-group-sm">
                                          <span className="avatar avatar-rounded">
                                            <ImageWithBasePath
                                              className="border border-white"
                                              src="assets/img/profiles/avatar-23.jpg"
                                              alt="img"
                                            />
                                          </span>
                                          <span className="avatar avatar-rounded">
                                            <ImageWithBasePath
                                              className="border border-white"
                                              src="assets/img/profiles/avatar-24.jpg"
                                              alt="img"
                                            />
                                          </span>
                                          <span className="avatar avatar-rounded">
                                            <ImageWithBasePath
                                              className="border border-white"
                                              src="assets/img/profiles/avatar-25.jpg"
                                              alt="img"
                                            />
                                          </span>
                                        </div>
                                        <div className="dropdown ms-2">
                                          <Link
                                            to="to"
                                            className="d-inline-flex align-items-center"
                                            data-bs-toggle="dropdown"
                                          >
                                            <i className="ti ti-dots-vertical" />
                                          </Link>
                                          <ul className="dropdown-menu dropdown-menu-end p-3">
                                            <li>
                                              <Link
                                                to="to"
                                                className="dropdown-item rounded-1"
                                                data-bs-toggle="modal"
                                                data-inert={true}
                                                data-bs-target="#edit_todo"
                                              >
                                                <i className="ti ti-edit me-2" />
                                                Edit
                                              </Link>
                                            </li>
                                            <li>
                                              <Link
                                                to="to"
                                                className="dropdown-item rounded-1"
                                                data-bs-toggle="modal"
                                                data-inert={true}
                                                data-bs-target="#delete_modal"
                                              >
                                                <i className="ti ti-trash me-2" />
                                                Delete
                                              </Link>
                                            </li>
                                            <li>
                                              <Link
                                                to="to"
                                                className="dropdown-item rounded-1"
                                                data-bs-toggle="modal"
                                                data-inert={true}
                                                data-bs-target="#view_todo"
                                              >
                                                <i className="ti ti-eye me-2" />
                                                View
                                              </Link>
                                            </li>
                                          </ul>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    className="tab-pane"
                    id="bottom-justified-tab4"
                    role="tabpanel"
                    style={{ display: 'none' }}
                  >
                    <div className="accordion accordions-items-seperate">
                      <div className="accordion-item">
                        <div className="accordion-header" id="headingThree2">
                          <div
                            className="accordion-button collapsed"
                            data-bs-toggle="collapse"
                            role="button"
                            data-bs-target="#primaryBorderThree2"
                            aria-expanded="true"
                            aria-controls="primaryBorderThree2"
                          >
                            <h5>Invoices</h5>
                          </div>
                        </div>
                        <div
                          id="primaryBorderThree2"
                          className="accordion-collapse collapse show border-top"
                          aria-labelledby="headingThree2"
                        >
                          <div className="accordion-body">
                            <div className="row align-items-center g-3 mb-3">
                              <div className="col-sm-8">
                                <h6>Total No of Invoice : 45</h6>
                              </div>
                              <div className="col-sm-4">
                                <div className="position-relative input-icon">
                                  <span className="input-icon-addon">
                                    <i className="ti ti-search" />
                                  </span>
                                  <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Search"
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="list-group list-group-flush mb-3">
                              <div className="list-group-item border rounded mb-2 p-2">
                                <div className="row align-items-center g-3">
                                  <div className="col-sm-6">
                                    <div className="d-flex align-items-center">
                                      <span className="avatar avatar-lg bg-light flex-shrink-0 me-2">
                                        <i className="ti ti-file-invoice text-dark fs-24" />
                                      </span>
                                      <div>
                                        <h6 className="fw-medium mb-1">Phase 2 Completion</h6>
                                        <p>
                                          <Link to="#" className="text-info">
                                            #INV-123{' '}
                                          </Link>{' '}
                                          11 Sep 2025, 05:35 pm
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="col-sm-3">
                                    <div>
                                      <span>Amount</span>
                                      <p className="text-dark">$6,598</p>
                                    </div>
                                  </div>
                                  <div className="col-sm-3">
                                    <div className="d-flex align-items-center justify-content-sm-end">
                                      <span className="badge badge-soft-success d-inline-flex  align-items-center me-4">
                                        <i className="ti ti-point-filled me-1" />
                                        Paid
                                      </span>
                                      <Link to="#" className="btn btn-icon btn-sm">
                                        <i className="ti ti-edit" />
                                      </Link>
                                      <Link to="#" className="btn btn-icon btn-sm ">
                                        <i className="ti ti-trash" />
                                      </Link>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="list-group-item border rounded mb-2 p-2">
                                <div className="row align-items-center g-3">
                                  <div className="col-sm-6">
                                    <div className="d-flex align-items-center">
                                      <span className="avatar avatar-lg bg-light flex-shrink-0 me-2">
                                        <i className="ti ti-file-invoice text-dark fs-24" />
                                      </span>
                                      <div>
                                        <h6 className="fw-medium mb-1">Advance for Project</h6>
                                        <p>
                                          <Link to="#" className="text-info">
                                            #INV-124{' '}
                                          </Link>{' '}
                                          14 Sep 2025, 05:35 pm
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="col-sm-3">
                                    <div>
                                      <span>Amount</span>
                                      <p className="text-dark">$3312</p>
                                    </div>
                                  </div>
                                  <div className="col-sm-3">
                                    <div className="d-flex align-items-center justify-content-sm-end">
                                      <span className="badge badge-soft-success d-inline-flex  align-items-center me-4">
                                        <i className="ti ti-point-filled me-1" />
                                        Hold
                                      </span>
                                      <Link to="#" className="btn btn-icon btn-sm">
                                        <i className="ti ti-edit" />
                                      </Link>
                                      <Link to="#" className="btn btn-icon btn-sm ">
                                        <i className="ti ti-trash" />
                                      </Link>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="list-group-item border rounded mb-2 p-2">
                                <div className="row align-items-center g-3">
                                  <div className="col-sm-6">
                                    <div className="d-flex align-items-center">
                                      <span className="avatar avatar-lg bg-light flex-shrink-0 me-2">
                                        <i className="ti ti-file-invoice text-dark fs-24" />
                                      </span>
                                      <div>
                                        <h6 className="fw-medium mb-1">
                                          Changes &amp; design Alignments
                                        </h6>
                                        <p>
                                          <Link to="#" className="text-info">
                                            #INV-125{' '}
                                          </Link>{' '}
                                          15 Sep 2025, 05:35 pm
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="col-sm-3">
                                    <div>
                                      <span>Amount</span>
                                      <p className="text-dark">$4154</p>
                                    </div>
                                  </div>
                                  <div className="col-sm-3">
                                    <div className="d-flex align-items-center justify-content-sm-end">
                                      <span className="badge badge-soft-success d-inline-flex  align-items-center me-4">
                                        <i className="ti ti-point-filled me-1" />
                                        Paid
                                      </span>
                                      <Link to="#" className="btn btn-icon btn-sm">
                                        <i className="ti ti-edit" />
                                      </Link>
                                      <Link to="#" className="btn btn-icon btn-sm ">
                                        <i className="ti ti-trash" />
                                      </Link>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="list-group-item border rounded mb-2 p-2">
                                <div className="row align-items-center g-3">
                                  <div className="col-sm-6">
                                    <div className="d-flex align-items-center">
                                      <span className="avatar avatar-lg bg-light flex-shrink-0 me-2">
                                        <i className="ti ti-file-invoice text-dark fs-24" />
                                      </span>
                                      <div>
                                        <h6 className="fw-medium mb-1">Added New Functionality</h6>
                                        <p>
                                          <Link to="#" className="text-info">
                                            #INV-126{' '}
                                          </Link>{' '}
                                          16 Sep 2025, 05:35 pm
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="col-sm-3">
                                    <div>
                                      <span>Amount</span>
                                      <p className="text-dark">$658</p>
                                    </div>
                                  </div>
                                  <div className="col-sm-3">
                                    <div className="d-flex align-items-center justify-content-sm-end">
                                      <span className="badge badge-soft-success d-inline-flex  align-items-center me-4">
                                        <i className="ti ti-point-filled me-1" />
                                        Paid
                                      </span>
                                      <Link to="#" className="btn btn-icon btn-sm">
                                        <i className="ti ti-edit" />
                                      </Link>
                                      <Link to="#" className="btn btn-icon btn-sm ">
                                        <i className="ti ti-trash" />
                                      </Link>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="list-group-item border rounded p-2">
                                <div className="row align-items-center g-3">
                                  <div className="col-sm-6">
                                    <div className="d-flex align-items-center">
                                      <span className="avatar avatar-lg bg-light flex-shrink-0 me-2">
                                        <i className="ti ti-file-invoice text-dark fs-24" />
                                      </span>
                                      <div>
                                        <h6 className="fw-medium mb-1">Phase 1 Completion</h6>
                                        <p>
                                          <Link to="#" className="text-info">
                                            #INV-127{' '}
                                          </Link>{' '}
                                          17 Sep 2025, 05:35 pm
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="col-sm-3">
                                    <div>
                                      <span>Amount</span>
                                      <p className="text-dark">$1259</p>
                                    </div>
                                  </div>
                                  <div className="col-sm-3">
                                    <div className="d-flex align-items-center justify-content-sm-end">
                                      <span className="badge badge-soft-danger d-inline-flex  align-items-center me-4">
                                        <i className="ti ti-point-filled me-1" />
                                        unpaid
                                      </span>
                                      <Link to="#" className="btn btn-icon btn-sm">
                                        <i className="ti ti-edit" />
                                      </Link>
                                      <Link to="#" className="btn btn-icon btn-sm ">
                                        <i className="ti ti-trash" />
                                      </Link>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="text-center">
                              <Link to="#" className="btn btn-primary btn-sm">
                                Load More
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    className="tab-pane"
                    id="bottom-justified-tab5"
                    role="tabpanel"
                    style={{ display: 'none' }}
                  >
                    <div className="accordion accordions-items-seperate">
                      <div className="accordion-item">
                        <div className="accordion-header" id="headingFour2">
                          <div
                            className="accordion-button collapsed"
                            data-bs-toggle="collapse"
                            role="button"
                            data-bs-target="#primaryBorderFour2"
                            aria-expanded="true"
                            aria-controls="primaryBorderFour2"
                          >
                            <h5>Notes</h5>
                          </div>
                        </div>
                        <div
                          id="primaryBorderFour2"
                          className="accordion-collapse collapse show border-top"
                          aria-labelledby="headingFour2"
                        >
                          <div className="accordion-body">
                            <div className="row align-items-center g-3 mb-3">
                              <div className="col-sm-8">
                                <h6>Total No of Notes : 45</h6>
                              </div>
                              <div className="col-sm-4">
                                <div className="position-relative input-icon">
                                  <span className="input-icon-addon">
                                    <i className="ti ti-search" />
                                  </span>
                                  <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Search"
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="row">
                              <div className="col-md-4 col-sm-6 d-flex">
                                <div className="card flex-fill">
                                  <div className="card-body">
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                      <h6 className="text-gray-5 fw-medium">15 May 2025</h6>
                                      <div className="dropdown">
                                        <Link
                                          to="to"
                                          className="d-inline-flex align-items-center"
                                          data-bs-toggle="dropdown"
                                          aria-expanded="false"
                                        >
                                          <i className="ti ti-dots-vertical" />
                                        </Link>
                                        <ul className="dropdown-menu dropdown-menu-end p-3">
                                          <li>
                                            <Link to="to" className="dropdown-item rounded-1">
                                              <i className="ti ti-edit me-2" />
                                              Edit
                                            </Link>
                                          </li>
                                          <li>
                                            <Link to="to" className="dropdown-item rounded-1">
                                              <i className="ti ti-trash me-1" />
                                              Delete
                                            </Link>
                                          </li>
                                        </ul>
                                      </div>
                                    </div>
                                    <h6 className="d-flex align-items-center mb-2">
                                      <i className="ti ti-point-filled text-primary me-1" />
                                      Changes &amp; design
                                    </h6>
                                    <p className="text-truncate line-clamb-3">
                                      An office management app project streamlines administrative
                                      tasks by integrating tools for scheduling, communication, and
                                      task management, enhancing overall productivity and
                                      efficiency.
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="col-md-4 col-sm-6 d-flex">
                                <div className="card flex-fill">
                                  <div className="card-body">
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                      <h6 className="text-gray-5 fw-medium">16 May 2025</h6>
                                      <div className="dropdown">
                                        <Link
                                          to="to"
                                          className="d-inline-flex align-items-center"
                                          data-bs-toggle="dropdown"
                                          aria-expanded="false"
                                        >
                                          <i className="ti ti-dots-vertical" />
                                        </Link>
                                        <ul className="dropdown-menu dropdown-menu-end p-3">
                                          <li>
                                            <Link to="to" className="dropdown-item rounded-1">
                                              <i className="ti ti-edit me-2" />
                                              Edit
                                            </Link>
                                          </li>
                                          <li>
                                            <Link to="to" className="dropdown-item rounded-1">
                                              <i className="ti ti-trash me-1" />
                                              Delete
                                            </Link>
                                          </li>
                                        </ul>
                                      </div>
                                    </div>
                                    <h6 className="d-flex align-items-center mb-2">
                                      <i className="ti ti-point-filled text-success me-1" />
                                      Phase 1 Completion
                                    </h6>
                                    <p className="text-truncate line-clamb-3">
                                      An office management app project streamlines administrative
                                      tasks by integrating tools for scheduling, communication, and
                                      task management, enhancing overall productivity and
                                      efficiency.
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="col-md-4 col-sm-6 d-flex">
                                <div className="card flex-fill">
                                  <div className="card-body">
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                      <h6 className="text-gray-5 fw-medium">17 May 2025</h6>
                                      <div className="dropdown">
                                        <Link
                                          to="to"
                                          className="d-inline-flex align-items-center"
                                          data-bs-toggle="dropdown"
                                          aria-expanded="false"
                                        >
                                          <i className="ti ti-dots-vertical" />
                                        </Link>
                                        <ul className="dropdown-menu dropdown-menu-end p-3">
                                          <li>
                                            <Link to="to" className="dropdown-item rounded-1">
                                              <i className="ti ti-edit me-2" />
                                              Edit
                                            </Link>
                                          </li>
                                          <li>
                                            <Link to="to" className="dropdown-item rounded-1">
                                              <i className="ti ti-trash me-1" />
                                              Delete
                                            </Link>
                                          </li>
                                        </ul>
                                      </div>
                                    </div>
                                    <h6 className="d-flex align-items-center mb-2">
                                      <i className="ti ti-point-filled text-danger me-1" />
                                      Phase 2 Completion
                                    </h6>
                                    <p className="text-truncate line-clamb-3">
                                      An office management app project streamlines administrative
                                      tasks by integrating tools for scheduling, communication, and
                                      task management, enhancing overall productivity and
                                      efficiency.
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="col-md-12">
                                <div className="text-center">
                                  <Link to="#" className="btn btn-primary btn-sm">
                                    Load More
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    className="tab-pane"
                    id="bottom-justified-tab6"
                    role="tabpanel"
                    style={{ display: 'none' }}
                  >
                    <div className="accordion accordions-items-seperate">
                      <div className="accordion-item">
                        <div className="accordion-header" id="headingFive2">
                          <div
                            className="accordion-button collapsed"
                            data-bs-toggle="collapse"
                            role="button"
                            data-bs-target="#primaryBorderFive2"
                            aria-expanded="true"
                            aria-controls="primaryBorderFive2"
                          >
                            <h5>Documents</h5>
                          </div>
                        </div>
                        <div
                          id="primaryBorderFive2"
                          className="accordion-collapse collapse show border-top"
                          aria-labelledby="headingFive2"
                        >
                          <div className="accordion-body">
                            <div className="row align-items-center g-3 mb-3">
                              <div className="col-sm-4">
                                <h6>Total No of Documents : 45</h6>
                              </div>
                              <div className="col-sm-8">
                                <div className="d-flex align-items-center">
                                  <div className="dropdown me-2">
                                    <Link
                                      to="to"
                                      className="dropdown-toggle btn btn-white"
                                      data-bs-toggle="dropdown"
                                      aria-expanded="false"
                                    >
                                      Sort By : Docs Type
                                    </Link>
                                    <ul className="dropdown-menu dropdown-menu-end p-3">
                                      <li>
                                        <Link to="to" className="dropdown-item rounded-1">
                                          Docs
                                        </Link>
                                      </li>
                                      <li>
                                        <Link to="to" className="dropdown-item rounded-1">
                                          Pdf
                                        </Link>
                                      </li>
                                      <li>
                                        <Link to="to" className="dropdown-item rounded-1">
                                          Image
                                        </Link>
                                      </li>
                                      <li>
                                        <Link to="to" className="dropdown-item rounded-1">
                                          Folder
                                        </Link>
                                      </li>
                                      <li>
                                        <Link to="to" className="dropdown-item rounded-1">
                                          Xml
                                        </Link>
                                      </li>
                                    </ul>
                                  </div>
                                  <div className="position-relative input-icon flex-fill">
                                    <span className="input-icon-addon">
                                      <i className="ti ti-search" />
                                    </span>
                                    <input
                                      type="text"
                                      className="form-control"
                                      placeholder="Search"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="custom-datatable-filter table-responsive no-datatable-length border">
                              <table className="table datatable">
                                <thead className="thead-light">
                                  <tr>
                                    <th>Name</th>
                                    <th>Size</th>
                                    <th>Type</th>
                                    <th>Modified</th>
                                    <th>Share</th>
                                    <th />
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td>
                                      <div className="d-flex align-items-center file-name-icon">
                                        <Link
                                          to="#"
                                          className="avatar avatar-md bg-light"
                                          data-bs-toggle="offcanvas"
                                          data-bs-target="#preview"
                                        >
                                          <ImageWithBasePath
                                            src="assets/img/icons/file-01.svg"
                                            className="img-fluid"
                                            alt="img"
                                          />
                                        </Link>
                                        <div className="ms-2">
                                          <p className="text-title fw-medium  mb-0">
                                            <Link
                                              to="#"
                                              data-bs-toggle="offcanvas"
                                              data-bs-target="#preview"
                                            >
                                              Secret
                                            </Link>
                                          </p>
                                        </div>
                                      </div>
                                    </td>
                                    <td>7.6 MB</td>
                                    <td>Doc</td>
                                    <td>
                                      <p className="text-title mb-0">Mar 15, 2025</p>
                                      <span>05:00:14 PM</span>
                                    </td>
                                    <td>
                                      <div className="avatar-list-stacked avatar-group-sm">
                                        <span className="avatar avatar-rounded">
                                          <ImageWithBasePath
                                            className="border border-white"
                                            src="assets/img/profiles/avatar-27.jpg"
                                            alt="img"
                                          />
                                        </span>
                                        <span className="avatar avatar-rounded">
                                          <ImageWithBasePath
                                            className="border border-white"
                                            src="assets/img/profiles/avatar-29.jpg"
                                            alt="img"
                                          />
                                        </span>
                                        <span className="avatar avatar-rounded">
                                          <ImageWithBasePath
                                            className="border border-white"
                                            src="assets/img/profiles/avatar-12.jpg"
                                            alt="img"
                                          />
                                        </span>
                                      </div>
                                    </td>
                                    <td>
                                      <div className="d-flex align-items-center">
                                        <div className="rating-select me-2">
                                          <Link to="to">
                                            <i className="ti ti-star" />
                                          </Link>
                                        </div>
                                        <div className="dropdown">
                                          <Link
                                            to="#"
                                            className="d-flex align-items-center justify-content-center"
                                            data-bs-toggle="dropdown"
                                            aria-expanded="false"
                                          >
                                            <i className="ti ti-dots fs-14" />
                                          </Link>
                                          <ul className="dropdown-menu dropdown-menu-right p-3">
                                            <li>
                                              <Link className="dropdown-item rounded-1" to="#">
                                                <i className="ti ti-trash me-2" />
                                                Permanent Delete
                                              </Link>
                                            </li>
                                            <li>
                                              <Link className="dropdown-item rounded-1" to="#">
                                                <i className="ti ti-edit-circle me-2" />
                                                Restore File
                                              </Link>
                                            </li>
                                          </ul>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td>
                                      <div className="d-flex align-items-center file-name-icon">
                                        <Link
                                          to="#"
                                          className="avatar avatar-md bg-light"
                                          data-bs-toggle="offcanvas"
                                          data-bs-target="#preview"
                                        >
                                          <ImageWithBasePath
                                            src="assets/img/icons/file-02.svg"
                                            className="img-fluid"
                                            alt="img"
                                          />
                                        </Link>
                                        <div className="ms-2">
                                          <p className="text-title fw-medium  mb-0">
                                            <Link
                                              to="#"
                                              data-bs-toggle="offcanvas"
                                              data-bs-target="#preview"
                                            >
                                              Sophie Headrick
                                            </Link>
                                          </p>
                                        </div>
                                      </div>
                                    </td>
                                    <td>7.4 MB</td>
                                    <td>PDF</td>
                                    <td>
                                      <p className="text-title mb-0">Jan 8, 2025</p>
                                      <span>08:20:13 PM</span>
                                    </td>
                                    <td>
                                      <div className="avatar-list-stacked avatar-group-sm">
                                        <span className="avatar avatar-rounded">
                                          <ImageWithBasePath
                                            className="border border-white"
                                            src="assets/img/profiles/avatar-15.jpg"
                                            alt="img"
                                          />
                                        </span>
                                        <span className="avatar avatar-rounded">
                                          <ImageWithBasePath
                                            className="border border-white"
                                            src="assets/img/profiles/avatar-16.jpg"
                                            alt="img"
                                          />
                                        </span>
                                      </div>
                                    </td>
                                    <td>
                                      <div className="d-flex align-items-center">
                                        <div className="rating-select me-2">
                                          <Link to="to">
                                            <i className="ti ti-star" />
                                          </Link>
                                        </div>
                                        <div className="dropdown">
                                          <Link
                                            to="#"
                                            className="d-flex align-items-center justify-content-center"
                                            data-bs-toggle="dropdown"
                                            aria-expanded="false"
                                          >
                                            <i className="ti ti-dots fs-14" />
                                          </Link>
                                          <ul className="dropdown-menu dropdown-menu-right p-3">
                                            <li>
                                              <Link className="dropdown-item rounded-1" to="#">
                                                <i className="ti ti-trash me-2" />
                                                Permanent Delete
                                              </Link>
                                            </li>
                                            <li>
                                              <Link className="dropdown-item rounded-1" to="#">
                                                <i className="ti ti-edit-circle me-2" />
                                                Restore File
                                              </Link>
                                            </li>
                                          </ul>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td>
                                      <div className="d-flex align-items-center file-name-icon">
                                        <Link
                                          to="#"
                                          className="avatar avatar-md bg-light"
                                          data-bs-toggle="offcanvas"
                                          data-bs-target="#preview"
                                        >
                                          <ImageWithBasePath
                                            src="assets/img/icons/file-03.svg"
                                            className="img-fluid"
                                            alt="img"
                                          />
                                        </Link>
                                        <div className="ms-2">
                                          <p className="text-title fw-medium  mb-0">
                                            <Link
                                              to="#"
                                              data-bs-toggle="offcanvas"
                                              data-bs-target="#preview"
                                            >
                                              Gallery
                                            </Link>
                                          </p>
                                        </div>
                                      </div>
                                    </td>
                                    <td>6.1 MB</td>
                                    <td>Image</td>
                                    <td>
                                      <p className="text-title mb-0">Aug 6, 2025</p>
                                      <span>04:10:12 PM</span>
                                    </td>
                                    <td>
                                      <div className="avatar-list-stacked avatar-group-sm">
                                        <span className="avatar avatar-rounded">
                                          <ImageWithBasePath
                                            className="border border-white"
                                            src="assets/img/profiles/avatar-02.jpg"
                                            alt="img"
                                          />
                                        </span>
                                        <span className="avatar avatar-rounded">
                                          <ImageWithBasePath
                                            className="border border-white"
                                            src="assets/img/profiles/avatar-03.jpg"
                                            alt="img"
                                          />
                                        </span>
                                        <span className="avatar avatar-rounded">
                                          <ImageWithBasePath
                                            className="border border-white"
                                            src="assets/img/profiles/avatar-05.jpg"
                                            alt="img"
                                          />
                                        </span>
                                        <span className="avatar avatar-rounded">
                                          <ImageWithBasePath
                                            className="border border-white"
                                            src="assets/img/profiles/avatar-06.jpg"
                                            alt="img"
                                          />
                                        </span>
                                        <Link
                                          className="avatar bg-primary avatar-rounded text-fixed-white"
                                          to="to"
                                        >
                                          +1
                                        </Link>
                                      </div>
                                    </td>
                                    <td>
                                      <div className="d-flex align-items-center">
                                        <div className="rating-select me-2">
                                          <Link to="to">
                                            <i className="ti ti-star" />
                                          </Link>
                                        </div>
                                        <div className="dropdown">
                                          <Link
                                            to="#"
                                            className="d-flex align-items-center justify-content-center"
                                            data-bs-toggle="dropdown"
                                            aria-expanded="false"
                                          >
                                            <i className="ti ti-dots fs-14" />
                                          </Link>
                                          <ul className="dropdown-menu dropdown-menu-right p-3">
                                            <li>
                                              <Link className="dropdown-item rounded-1" to="#">
                                                <i className="ti ti-trash me-2" />
                                                Permanent Delete
                                              </Link>
                                            </li>
                                            <li>
                                              <Link className="dropdown-item rounded-1" to="#">
                                                <i className="ti ti-edit-circle me-2" />
                                                Restore File
                                              </Link>
                                            </li>
                                          </ul>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td>
                                      <div className="d-flex align-items-center file-name-icon">
                                        <Link
                                          to="#"
                                          className="avatar avatar-md bg-light"
                                          data-bs-toggle="offcanvas"
                                          data-bs-target="#preview"
                                        >
                                          <ImageWithBasePath
                                            src="assets/img/icons/file-04.svg"
                                            className="img-fluid"
                                            alt="img"
                                          />
                                        </Link>
                                        <div className="ms-2">
                                          <p className="text-title fw-medium  mb-0">
                                            <Link
                                              to="#"
                                              data-bs-toggle="offcanvas"
                                              data-bs-target="#preview"
                                            >
                                              Doris Crowley
                                            </Link>
                                          </p>
                                        </div>
                                      </div>
                                    </td>
                                    <td>5.2 MB</td>
                                    <td>Folder</td>
                                    <td>
                                      <p className="text-title mb-0">Jan 6, 2025</p>
                                      <span>03:40:14 PM</span>
                                    </td>
                                    <td>
                                      <div className="avatar-list-stacked avatar-group-sm">
                                        <span className="avatar avatar-rounded">
                                          <ImageWithBasePath
                                            className="border border-white"
                                            src="assets/img/profiles/avatar-06.jpg"
                                            alt="img"
                                          />
                                        </span>
                                        <span className="avatar avatar-rounded">
                                          <ImageWithBasePath
                                            className="border border-white"
                                            src="assets/img/profiles/avatar-10.jpg"
                                            alt="img"
                                          />
                                        </span>
                                        <span className="avatar avatar-rounded">
                                          <ImageWithBasePath
                                            className="border border-white"
                                            src="assets/img/profiles/avatar-15.jpg"
                                            alt="img"
                                          />
                                        </span>
                                      </div>
                                    </td>
                                    <td>
                                      <div className="d-flex align-items-center">
                                        <div className="rating-select me-2">
                                          <Link to="to">
                                            <i className="ti ti-star" />
                                          </Link>
                                        </div>
                                        <div className="dropdown">
                                          <Link
                                            to="#"
                                            className="d-flex align-items-center justify-content-center"
                                            data-bs-toggle="dropdown"
                                            aria-expanded="false"
                                          >
                                            <i className="ti ti-dots fs-14" />
                                          </Link>
                                          <ul className="dropdown-menu dropdown-menu-right p-3">
                                            <li>
                                              <Link className="dropdown-item rounded-1" to="#">
                                                <i className="ti ti-trash me-2" />
                                                Permanent Delete
                                              </Link>
                                            </li>
                                            <li>
                                              <Link className="dropdown-item rounded-1" to="#">
                                                <i className="ti ti-edit-circle me-2" />
                                                Restore File
                                              </Link>
                                            </li>
                                          </ul>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td>
                                      <div className="d-flex align-items-center file-name-icon">
                                        <Link
                                          to="#"
                                          className="avatar avatar-md bg-light"
                                          data-bs-toggle="offcanvas"
                                          data-bs-target="#preview"
                                        >
                                          <ImageWithBasePath
                                            src="assets/img/icons/file-05.svg"
                                            className="img-fluid"
                                            alt="img"
                                          />
                                        </Link>
                                        <div className="ms-2">
                                          <p className="text-title fw-medium  mb-0">
                                            <Link
                                              to="#"
                                              data-bs-toggle="offcanvas"
                                              data-bs-target="#preview"
                                            >
                                              Cheat_codez
                                            </Link>
                                          </p>
                                        </div>
                                      </div>
                                    </td>
                                    <td>8 MB</td>
                                    <td>Xml</td>
                                    <td>
                                      <p className="text-title mb-0">Oct 12, 2025</p>
                                      <span>05:00:14 PM</span>
                                    </td>
                                    <td>
                                      <div className="avatar-list-stacked avatar-group-sm">
                                        <span className="avatar avatar-rounded">
                                          <ImageWithBasePath
                                            className="border border-white"
                                            src="assets/img/profiles/avatar-04.jpg"
                                            alt="img"
                                          />
                                        </span>
                                        <span className="avatar avatar-rounded">
                                          <ImageWithBasePath
                                            className="border border-white"
                                            src="assets/img/profiles/avatar-28.jpg"
                                            alt="img"
                                          />
                                        </span>
                                        <span className="avatar avatar-rounded">
                                          <ImageWithBasePath
                                            className="border border-white"
                                            src="assets/img/profiles/avatar-14.jpg"
                                            alt="img"
                                          />
                                        </span>
                                        <span className="avatar avatar-rounded">
                                          <ImageWithBasePath
                                            className="border border-white"
                                            src="assets/img/profiles/avatar-15.jpg"
                                            alt="img"
                                          />
                                        </span>
                                      </div>
                                    </td>
                                    <td>
                                      <div className="d-flex align-items-center">
                                        <div className="rating-select me-2">
                                          <Link to="to">
                                            <i className="ti ti-star" />
                                          </Link>
                                        </div>
                                        <div className="dropdown">
                                          <Link
                                            to="#"
                                            className="d-flex align-items-center justify-content-center"
                                            data-bs-toggle="dropdown"
                                            aria-expanded="false"
                                          >
                                            <i className="ti ti-dots fs-14" />
                                          </Link>
                                          <ul className="dropdown-menu dropdown-menu-right p-3">
                                            <li>
                                              <Link className="dropdown-item rounded-1" to="#">
                                                <i className="ti ti-trash me-2" />
                                                Permanent Delete
                                              </Link>
                                            </li>
                                            <li>
                                              <Link className="dropdown-item rounded-1" to="#">
                                                <i className="ti ti-edit-circle me-2" />
                                                Restore File
                                              </Link>
                                            </li>
                                          </ul>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-end mb-4" style={{ display: 'none' }}>
                  <div className="dropdown">
                    <Link
                      to="to"
                      className="d-inline-flex align-items-center avatar avatar-lg avatar-rounded bg-primary"
                      data-bs-toggle="dropdown"
                    >
                      <i className="ti ti-plus fs-24 text-white" />
                    </Link>
                    <ul className="dropdown-menu dropdown-menu-end bg-gray-900 dropdown-menu-md dropdown-menu-dark p-3">
                      <li>
                        <Link to="to" className="dropdown-item rounded-1 d-flex align-items-center">
                          <span className="avatar avatar-md bg-gray-800 flex-shrink-0 me-2">
                            <i className="ti ti-basket-code" />
                          </span>
                          <div>
                            <h6 className="fw-medium text-white mb-1">Add a Task</h6>
                            <p className="text-white">Create a new Priority tasks </p>
                          </div>
                        </Link>
                      </li>
                      <li>
                        <Link to="to" className="dropdown-item rounded-1 d-flex align-items-center">
                          <span className="avatar avatar-md bg-gray-800 flex-shrink-0 me-2">
                            <i className="ti ti-file-invoice" />
                          </span>
                          <div>
                            <h6 className="fw-medium text-white mb-1">Add Invoice</h6>
                            <p className="text-white">Create a new Billing</p>
                          </div>
                        </Link>
                      </li>
                      <li>
                        <Link to="to" className="dropdown-item rounded-1 d-flex align-items-center">
                          <span className="avatar avatar-md bg-gray-800 flex-shrink-0 me-2">
                            <i className="ti ti-file-description" />
                          </span>
                          <div>
                            <h6 className="fw-medium text-white mb-1">Notes</h6>
                            <p className="text-white">Create new note for you &amp; team</p>
                          </div>
                        </Link>
                      </li>
                      <li>
                        <Link to="to" className="dropdown-item rounded-1 d-flex align-items-center">
                          <span className="avatar avatar-md bg-gray-800 flex-shrink-0 me-2">
                            <i className="ti ti-folder-open" />
                          </span>
                          <div>
                            <h6 className="fw-medium text-white mb-1">Add Files</h6>
                            <p className="text-white">Upload New files for this Client</p>
                          </div>
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
      {/* /Page Wrapper */}
      {/* /Edit Client */}
      {/* Edit Todo */}
      <div className="modal fade" id="edit_todo">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Edit Todo</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form>
              <div className="modal-body">
                <div className="row">
                  <div className="col-12">
                    <div className="mb-3">
                      <label className="form-label">Todo Title</label>
                      <input
                        type="text"
                        className="form-control"
                        defaultValue="Update calendar and schedule"
                      />
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="mb-3">
                      <label className="form-label">Tag</label>
                      <CommonSelect className="select" options={tags} defaultValue={tags[1]} />
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="mb-3">
                      <label className="form-label">Priority</label>
                      <CommonSelect
                        className="select"
                        options={priority}
                        defaultValue={priority[1]}
                      />
                    </div>
                  </div>
                  <div className="col-lg-12">
                    <div className="mb-3">
                      <label className="form-label">Descriptions</label>
                      <CommonTextEditor />
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="mb-3">
                      <label className="form-label">Add Assignee</label>
                      <CommonSelect
                        className="select"
                        options={addassignee}
                        defaultValue={addassignee[1]}
                      />
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="mb-0">
                      <label className="form-label">Status</label>
                      <CommonSelect
                        className="select"
                        options={statusChoose}
                        defaultValue={statusChoose[1]}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-light me-2" data-bs-dismiss="modal">
                  Cancel
                </button>
                <button type="button" data-bs-dimiss="modal" className="btn btn-primary">
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Edit Todo */}
      {/* Todo Details */}
      <div className="modal fade" id="view_todo">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header bg-dark">
              <h4 className="modal-title text-white">Respond to any pending messages</h4>
              <span className="badge badge-danger d-inline-flex align-items-center">
                <i className="ti ti-square me-1" />
                Urgent
              </span>
              <span>
                <i className="ti ti-star-filled text-warning" />
              </span>
              <Link to="#">
                <i className="ti ti-trash text-white" />
              </Link>
              <button
                type="button"
                className="btn-close custom-btn-close bg-transparent fs-16 text-white position-static"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="modal-body">
              <h5 className="mb-2">Task Details</h5>
              <div className="border rounded mb-3 p-2">
                <div className="row row-gap-3">
                  <div className="col-md-4">
                    <div className="text-center">
                      <span className="d-block mb-1">Created On</span>
                      <p className="text-dark">22 July 2025</p>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="text-center">
                      <span className="d-block mb-1">Due Date</span>
                      <p className="text-dark">22 July 2025</p>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="text-center">
                      <span className="d-block mb-1">Status</span>
                      <span className="badge badge-soft-success d-inline-flex align-items-center">
                        <i className="fas fa-circle fs-6 me-1" />
                        Completed
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mb-3">
                <h5 className="mb-2">Description</h5>
                <p>
                  Hiking is a long, vigorous walk, usually on trails or footpaths in the
                  countryside. Walking for pleasure developed in Europe during the eighteenth
                  century. Religious pilgrimages have existed much longer but they involve walking
                  long distances for a spiritual purpose associated with specific religions and also
                  we achieve inner peace while we hike at a local park.
                </p>
              </div>
              <div className="mb-3">
                <h5 className="mb-2">Tags</h5>
                <div className="d-flex align-items-center">
                  <span className="badge badge-danger me-2">Internal</span>
                  <span className="badge badge-success me-2">Projects</span>
                  <span className="badge badge-secondary">Reminder</span>
                </div>
              </div>
              <div>
                <h5 className="mb-2">Assignee</h5>
                <div className="avatar-list-stacked avatar-group-sm">
                  <span className="avatar avatar-rounded">
                    <ImageWithBasePath
                      className="border border-white"
                      src="assets/img/profiles/avatar-23.jpg"
                      alt="img"
                    />
                  </span>
                  <span className="avatar avatar-rounded">
                    <ImageWithBasePath
                      className="border border-white"
                      src="assets/img/profiles/avatar-24.jpg"
                      alt="img"
                    />
                  </span>
                  <span className="avatar avatar-rounded">
                    <ImageWithBasePath
                      className="border border-white"
                      src="assets/img/profiles/avatar-25.jpg"
                      alt="img"
                    />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* /Todo Details */}
      {/* Add Note */}
      <div className="modal fade" id="add_notes" role="dialog">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header header-border align-items-center justify-content-between">
              <h5 className="modal-title">Add New Note</h5>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">
                    Title <span className="text-danger"> *</span>
                  </label>
                  <input className="form-control" type="text" />
                </div>
                <div className="mb-3">
                  <label className="form-label">
                    Note <span className="text-danger"> *</span>
                  </label>
                  <textarea className="form-control" rows={4} defaultValue={''} />
                </div>
                <div className="mb-3">
                  <label className="form-label">
                    Attachment <span className="text-danger"> *</span>
                  </label>
                  <div className="d-flex align-items-center justify-content-center border border-dashed rounded p-3 flex-column">
                    <span className="avatar avatar-lg avatar-rounded bg-primary-transparent mb-2">
                      <i className="ti ti-folder-open fs-24" />
                    </span>
                    <p className="fs-14 text-center mb-2">Drag and drop your files</p>
                    <div className="file-upload position-relative btn btn-sm btn-primary px-3 mb-2">
                      <i className="ti ti-upload me-1" />
                      Upload
                      <input type="file" accept="video/image" />
                    </div>
                  </div>
                </div>
                <div className="mb-0">
                  <label className="form-label">Uploaded Files</label>
                  <div className="border bg-light-500 rounded mb-3 p-3">
                    <h6 className="fw-medium mb-1">Projectneonals teyys.xls</h6>
                    <p className="mb-2">4.25 MB</p>
                    <div className="progress progress-xs mb-2">
                      <div
                        className="progress-bar bg-success"
                        role="progressbar"
                        style={{ width: '45%' }}
                        aria-valuenow={25}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      />
                    </div>
                    <p>45%</p>
                  </div>
                  <div className="d-flex align-items-center justify-content-between bg-light-500 rounded p-3">
                    <div>
                      <h6 className="fw-medium mb-1">tes.txt</h6>
                      <p>1.2 MB</p>
                    </div>
                    <Link to="to" className="btn btn-sm btn-icon text-danger">
                      <i className="ti ti-trash fs-20" />
                    </Link>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <div className="d-flex align-items-center justify-content-end m-0">
                  <button type="button" className="btn btn-outline-light border me-2">
                    Cancel
                  </button>
                  <button className="btn btn-primary" type="button" data-bs-dimiss="modal">
                    Save
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Add Note */}

      {/* Modal Components */}
      <EditClient />
    </>
  );
};

export default ClientDetails;
