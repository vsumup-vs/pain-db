import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  UserGroupIcon,
  PlusIcon,
  PencilIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { api } from '../services/api';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'CLINICIAN',
    organizationId: ''
  });
  const [assignmentData, setAssignmentData] = useState({
    organizationId: '',
    role: 'CLINICIAN'
  });
  const [filters, setFilters] = useState({
    organizationId: '',
    role: ''
  });

  // Check if user is platform admin
  const isPlatformAdmin = currentUser?.isPlatformAdmin || false;

  useEffect(() => {
    fetchData();
  }, [filters]);

  useEffect(() => {
    // Fetch current user info
    const fetchCurrentUser = async () => {
      try {
        const userProfile = await api.getCurrentUserProfile();
        setCurrentUser(userProfile);

        // If not platform admin and no filter set, default to first organization
        const isPAdmin = userProfile.isPlatformAdmin || false;
        if (!isPAdmin && !filters.organizationId && userProfile.organizations?.length > 0) {
          setFilters(prev => ({
            ...prev,
            organizationId: userProfile.organizations[0].id
          }));
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };

    fetchCurrentUser();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, orgsRes] = await Promise.all([
        api.getUsers(filters),
        api.getOrganizations()
      ]);
      setUsers(usersRes.users || []);
      setOrganizations(orgsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAssignmentChange = (e) => {
    const { name, value } = e.target;
    setAssignmentData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await api.createUser(formData);
      toast.success('User created successfully');
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(error.response?.data?.error || 'Failed to create user');
    }
  };

  const handleAssignRole = async (e) => {
    e.preventDefault();

    try {
      await api.assignUserRole(selectedUser.id, assignmentData);
      toast.success('User role assigned successfully');
      setShowAssignModal(false);
      setSelectedUser(null);
      resetAssignmentForm();
      fetchData();
    } catch (error) {
      console.error('Error assigning role:', error);
      toast.error(error.response?.data?.error || 'Failed to assign role');
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      role: 'CLINICIAN',
      organizationId: ''
    });
  };

  const resetAssignmentForm = () => {
    setAssignmentData({
      organizationId: '',
      role: 'CLINICIAN'
    });
  };

  const openAssignModal = (user) => {
    setSelectedUser(user);
    setShowAssignModal(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage users and their organization assignments
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
          New User
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="filterOrg" className="block text-sm font-medium text-gray-700">
              Filter by Organization
            </label>
            <select
              id="filterOrg"
              name="organizationId"
              value={filters.organizationId}
              onChange={handleFilterChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              {isPlatformAdmin && <option value="">All Organizations</option>}
              {organizations.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filterRole" className="block text-sm font-medium text-gray-700">
              Filter by Role
            </label>
            <select
              id="filterRole"
              name="role"
              value={filters.role}
              onChange={handleFilterChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">All Roles</option>
              <option value="ORG_ADMIN">Org Admin</option>
              <option value="CLINICIAN">Clinician</option>
              <option value="NURSE">Nurse</option>
              <option value="BILLING_ADMIN">Billing Admin</option>
              <option value="PATIENT">Patient</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {users.length === 0 ? (
            <li className="px-6 py-8 text-center text-gray-500">
              No users found.
            </li>
          ) : (
            users.map((user) => (
              <li key={user.id}>
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <UserGroupIcon className="h-6 w-6 text-gray-400" />
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </h3>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>

                      {/* Organizations and Roles */}
                      <div className="mt-3 ml-9 space-y-2">
                        {user.organizations && user.organizations.length > 0 ? (
                          user.organizations.map((org, idx) => (
                            <div key={idx} className="flex items-center space-x-2 text-sm">
                              <BuildingOfficeIcon className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-700">{org.name}</span>
                              <span className="text-gray-400">•</span>
                              <ShieldCheckIcon className="h-4 w-4 text-gray-400" />
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                {org.role}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-400">No organization assigned</p>
                        )}
                      </div>

                      {/* Status */}
                      <div className="mt-2 ml-9 flex items-center space-x-4 text-sm">
                        {user.isActive ? (
                          <span className="inline-flex items-center text-green-600">
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-red-600">
                            <XCircleIcon className="h-4 w-4 mr-1" />
                            Inactive
                          </span>
                        )}
                        {user.emailVerified && (
                          <span className="text-gray-500">
                            Email verified
                          </span>
                        )}
                        {user.lastLoginAt && (
                          <span className="text-gray-500">
                            Last login: {new Date(user.lastLoginAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openAssignModal(user)}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <PlusIcon className="h-4 w-4 mr-1" />
                        Assign Role
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowModal(false)}></div>

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Create New User
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Add a new user to the platform
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        id="firstName"
                        required
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        id="lastName"
                        required
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        id="email"
                        required
                        value={formData.email}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                        Temporary Password <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        name="password"
                        id="password"
                        required
                        minLength="8"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Must be at least 8 characters with uppercase, lowercase, number, and special character
                      </p>
                    </div>

                    <div>
                      <label htmlFor="organizationId" className="block text-sm font-medium text-gray-700">
                        Organization
                      </label>
                      <select
                        name="organizationId"
                        id="organizationId"
                        value={formData.organizationId}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="">No organization</option>
                        {organizations.map(org => (
                          <option key={org.id} value={org.id}>{org.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                        Role
                      </label>
                      <select
                        name="role"
                        id="role"
                        value={formData.role}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="CLINICIAN">Clinician</option>
                        <option value="NURSE">Nurse</option>
                        <option value="ORG_ADMIN">Org Admin</option>
                        <option value="BILLING_ADMIN">Billing Admin</option>
                        <option value="PATIENT">Patient</option>
                                </select>
                    </div>
                  </div>

                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                    <button
                      type="submit"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm"
                    >
                      Create User
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        resetForm();
                      }}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Assign Role Modal */}
      {showAssignModal && selectedUser && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowAssignModal(false)}></div>

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <form onSubmit={handleAssignRole}>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Assign User to Organization
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Assign {selectedUser.firstName} {selectedUser.lastName} to an organization with a role
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="assignOrg" className="block text-sm font-medium text-gray-700">
                        Organization <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="organizationId"
                        id="assignOrg"
                        required
                        value={assignmentData.organizationId}
                        onChange={handleAssignmentChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="">Select organization</option>
                        {organizations.map(org => (
                          <option key={org.id} value={org.id}>{org.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="assignRole" className="block text-sm font-medium text-gray-700">
                        Role <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="role"
                        id="assignRole"
                        required
                        value={assignmentData.role}
                        onChange={handleAssignmentChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="CLINICIAN">Clinician</option>
                        <option value="NURSE">Nurse</option>
                        <option value="ORG_ADMIN">Org Admin</option>
                        <option value="BILLING_ADMIN">Billing Admin</option>
                        <option value="PATIENT">Patient</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                    <button
                      type="submit"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm"
                    >
                      Assign Role
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAssignModal(false);
                        setSelectedUser(null);
                        resetAssignmentForm();
                      }}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
