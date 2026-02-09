import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { all_routes } from '../../router/all_routes';
import CollapseHeader from '../../../core/common/collapse-header/collapse-header';
import CommonSelect from '../../../core/common/commonSelect';
import Footer from '../../../core/common/footer';
import { useProfile, Profile, ProfileFilters } from '../../../hooks/useProfile';
import { message, Modal, Table, Tag, Button, Space } from 'antd';
import ImageWithBasePath from '../../../core/common/imageWithBasePath';
import { format } from 'date-fns';

const ProfileManagement = () => {
  const route = all_routes;
  const {
    profiles,
    stats,
    loading,
    error,
    fetchAllData,
    deleteProfile,
    exportPDF,
    exportExcel,
    exporting
  } = useProfile();

  // State for filters and search
  const [filters, setFilters] = useState<ProfileFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedRole, setSelectedRole] = useState('All');
  const [selectedSort, setSelectedSort] = useState('newest');

  // Load data on component mount
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Filter profiles based on current filters
  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch = !searchQuery || 
      profile.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.employeeId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.designation?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = selectedStatus === 'All' || profile.status === selectedStatus;
    const matchesDepartment = selectedDepartment === 'All' || profile.department === selectedDepartment;
    const matchesRole = selectedRole === 'All' || profile.role === selectedRole;

    return matchesSearch && matchesStatus && matchesDepartment && matchesRole;
  }).sort((a, b) => {
    switch (selectedSort) {
      case 'name':
        return a.firstName.localeCompare(b.firstName);
      case 'email':
        return a.email.localeCompare(b.email);
      case 'department':
        return (a.department || '').localeCompare(b.department || '');
      case 'newest':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Handle filter changes
  const handleFilterChange = (type: string, value: string) => {
    switch (type) {
      case 'status':
        setSelectedStatus(value);
        break;
      case 'department':
        setSelectedDepartment(value);
        break;
      case 'role':
        setSelectedRole(value);
        break;
      case 'sort':
        setSelectedSort(value);
        break;
    }
  };

  // Handle profile deletion
  const handleDeleteProfile = (profile: Profile) => {
    Modal.confirm({
      title: 'Delete Profile',
      content: `Are you sure you want to delete ${profile.firstName} ${profile.lastName}'s profile? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        const success = await deleteProfile(profile._id);
        if (success) {
          message.success('Profile deleted successfully');
        }
      },
    });
  };

  // Handle profile view
  const handleViewProfile = (profile: Profile) => {
    // Navigate to profile details page or open modal
    console.log('View profile:', profile);
    // You can implement navigation to profile details page here
  };

  // Handle profile edit
  const handleEditProfile = (profile: Profile) => {
    // Navigate to edit profile page or open modal
    console.log('Edit profile:', profile);
    // You can implement navigation to edit profile page here
  };

  // Filter options
  const statusOptions = [
    { value: 'All', label: 'All Status' },
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' }
  ];

  const departmentOptions = [
    { value: 'All', label: 'All Departments' },
    { value: 'IT', label: 'IT' },
    { value: 'HR', label: 'HR' },
    { value: 'Finance', label: 'Finance' },
    { value: 'Marketing', label: 'Marketing' },
    { value: 'Sales', label: 'Sales' },
    { value: 'Operations', label: 'Operations' },
    { value: 'Support', label: 'Support' }
  ];

  const roleOptions = [
    { value: 'All', label: 'All Roles' },
    { value: 'admin', label: 'Admin' },
    { value: 'hr', label: 'HR' },
    { value: 'employee', label: 'Employee' },
    { value: 'manager', label: 'Manager' }
  ];

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'name', label: 'Name A-Z' },
    { value: 'email', label: 'Email A-Z' },
    { value: 'department', label: 'Department A-Z' }
  ];

  // Table columns
  const columns = [
    {
      title: 'Profile',
      key: 'profile',
      render: (_, profile: Profile) => (
        <div className="d-flex align-items-center">
          <div className="avatar avatar-md rounded-circle me-2">
            {profile.profilePhoto ? (
              <img
                src={profile.profilePhoto}
                alt={`${profile.firstName} ${profile.lastName}`}
                className="rounded-circle"
                style={{ width: '40px', height: '40px', objectFit: 'cover' }}
              />
            ) : (
              <div className="avatar-placeholder bg-primary text-white d-flex align-items-center justify-content-center rounded-circle">
                {profile.firstName.charAt(0)}{profile.lastName.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <h6 className="mb-0">{profile.firstName} {profile.lastName}</h6>
            <small className="text-muted">{profile.employeeId || 'No ID'}</small>
          </div>
        </div>
      )
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      render: (department: string) => department || 'Not assigned'
    },
    {
      title: 'Designation',
      dataIndex: 'designation',
      key: 'designation',
      render: (designation: string) => designation || 'Not assigned'
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        const normalizedRole = role?.toLowerCase();
        return (
          <Tag color={normalizedRole === 'admin' ? 'red' : normalizedRole === 'hr' ? 'orange' : 'blue'}>
            {role?.toUpperCase() || 'EMPLOYEE'}
          </Tag>
        );
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'Active' ? 'green' : 'red'}>
          {status}
        </Tag>
      )
    },
    {
      title: 'Joined',
      dataIndex: 'joiningDate',
      key: 'joiningDate',
      render: (date: string) => date ? format(new Date(date), 'MMM dd, yyyy') : 'Not set'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, profile: Profile) => (
        <Space>
          <Button
            type="link"
            onClick={() => handleViewProfile(profile)}
            className="text-primary"
          >
            <i className="ti ti-eye"></i>
          </Button>
          <Button
            type="link"
            onClick={() => handleEditProfile(profile)}
            className="text-warning"
          >
            <i className="ti ti-edit"></i>
          </Button>
          <Button
            type="link"
            onClick={() => handleDeleteProfile(profile)}
            className="text-danger"
          >
            <i className="ti ti-trash"></i>
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div className="page-wrapper">
      <div className="content">
        {/* Breadcrumb */}
        <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
          <div className="my-auto mb-2">
            <h2 className="mb-1">Profile Management</h2>
            <nav>
              <ol className="breadcrumb mb-0">
                <li className="breadcrumb-item">
                  <Link to={route.adminDashboard}>
                    <i className="ti ti-smart-home"></i>
                  </Link>
                </li>
                <li className="breadcrumb-item">HR</li>
                <li className="breadcrumb-item active" aria-current="page">
                  Profile Management
                </li>
              </ol>
            </nav>
          </div>
          <div className="head-icons ms-2">
            <CollapseHeader />
          </div>
        </div>
        {/* /Breadcrumb */}

        {/* Statistics Cards */}
        {stats && (
          <div className="row mb-4">
            <div className="col-xl-3 col-sm-6 col-12 d-flex">
              <div className="card bg-comman w-100">
                <div className="card-body">
                  <div className="db-widgets d-flex justify-content-between align-items-center">
                    <div className="db-info">
                      <h6>Total Profiles</h6>
                      <h3>{stats.totalProfiles}</h3>
                    </div>
                    <div className="db-icon">
                      <i className="ti ti-users bg-primary"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-sm-6 col-12 d-flex">
              <div className="card bg-comman w-100">
                <div className="card-body">
                  <div className="db-widgets d-flex justify-content-between align-items-center">
                    <div className="db-info">
                      <h6>Active Profiles</h6>
                      <h3>{stats.activeProfiles}</h3>
                    </div>
                    <div className="db-icon">
                      <i className="ti ti-user-check bg-success"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-sm-6 col-12 d-flex">
              <div className="card bg-comman w-100">
                <div className="card-body">
                  <div className="db-widgets d-flex justify-content-between align-items-center">
                    <div className="db-info">
                      <h6>Inactive Profiles</h6>
                      <h3>{stats.inactiveProfiles}</h3>
                    </div>
                    <div className="db-icon">
                      <i className="ti ti-user-x bg-danger"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-sm-6 col-12 d-flex">
              <div className="card bg-comman w-100">
                <div className="card-body">
                  <div className="db-widgets d-flex justify-content-between align-items-center">
                    <div className="db-info">
                      <h6>New This Month</h6>
                      <h3>{stats.newProfiles}</h3>
                    </div>
                    <div className="db-icon">
                      <i className="ti ti-user-plus bg-info"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
            <h5>Profile Management</h5>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap row-gap-3">
              <div className="me-3">
                <div className="input-icon-end position-relative">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search profiles..."
                    value={searchQuery}
                    onChange={handleSearch}
                  />
                  <span className="input-icon-addon">
                    <i className="ti ti-search text-gray-7"></i>
                  </span>
                </div>
              </div>
              <div className="dropdown me-3">
                <Link
                  to="#"
                  className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                  data-bs-toggle="dropdown"
                >
                  Status: {selectedStatus}
                </Link>
                <ul className="dropdown-menu p-3">
                  {statusOptions.map(option => (
                    <li key={option.value}>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={() => handleFilterChange('status', option.value)}
                      >
                        {option.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="dropdown me-3">
                <Link
                  to="#"
                  className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                  data-bs-toggle="dropdown"
                >
                  Department: {selectedDepartment}
                </Link>
                <ul className="dropdown-menu p-3">
                  {departmentOptions.map(option => (
                    <li key={option.value}>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={() => handleFilterChange('department', option.value)}
                      >
                        {option.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="dropdown me-3">
                <Link
                  to="#"
                  className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                  data-bs-toggle="dropdown"
                >
                  Role: {selectedRole}
                </Link>
                <ul className="dropdown-menu p-3">
                  {roleOptions.map(option => (
                    <li key={option.value}>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={() => handleFilterChange('role', option.value)}
                      >
                        {option.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="dropdown me-3">
                <Link
                  to="#"
                  className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                  data-bs-toggle="dropdown"
                >
                  Sort: {sortOptions.find(opt => opt.value === selectedSort)?.label}
                </Link>
                <ul className="dropdown-menu p-3">
                  {sortOptions.map(option => (
                    <li key={option.value}>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={() => handleFilterChange('sort', option.value)}
                      >
                        {option.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="dropdown">
                <Link
                  to="#"
                  className="dropdown-toggle btn btn-primary d-inline-flex align-items-center"
                  data-bs-toggle="dropdown"
                >
                  <i className="ti ti-download me-2"></i>
                  Export
                </Link>
                <ul className="dropdown-menu p-3">
                  <li>
                    <Link
                      to="#"
                      className="dropdown-item rounded-1"
                      onClick={exportPDF}
                      style={{ pointerEvents: exporting ? 'none' : 'auto', opacity: exporting ? 0.5 : 1 }}
                    >
                      <i className="ti ti-file-type-pdf me-2"></i>
                      Export as PDF
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="#"
                      className="dropdown-item rounded-1"
                      onClick={exportExcel}
                      style={{ pointerEvents: exporting ? 'none' : 'auto', opacity: exporting ? 0.5 : 1 }}
                    >
                      <i className="ti ti-file-type-xlsx me-2"></i>
                      Export as Excel
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="card-body p-0">
            {error && (
              <div className="alert alert-danger m-3">
                <h6>Error loading profiles</h6>
                <p className="mb-0">{error}</p>
              </div>
            )}

            <div className="table-responsive">
              <Table
                columns={columns}
                dataSource={filteredProfiles}
                loading={loading}
                rowKey="_id"
                pagination={{
                  total: filteredProfiles.length,
                  pageSize: 10,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} profiles`,
                }}
                className="table datanew dataTable no-footer"
              />
            </div>

            {!loading && filteredProfiles.length === 0 && !error && (
              <div className="text-center p-5">
                <div className="mb-3">
                  <i className="ti ti-user-search fs-48 text-muted"></i>
                </div>
                <h5>No profiles found</h5>
                <p className="text-muted">
                  {searchQuery || selectedStatus !== 'All' || selectedDepartment !== 'All' || selectedRole !== 'All'
                    ? 'No profiles match your current filters.'
                    : 'No profiles have been created yet.'}
                </p>
                {(searchQuery || selectedStatus !== 'All' || selectedDepartment !== 'All' || selectedRole !== 'All') && (
                  <Button
                    type="primary"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedStatus('All');
                      setSelectedDepartment('All');
                      setSelectedRole('All');
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ProfileManagement;