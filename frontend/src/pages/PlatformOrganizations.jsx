import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  FunnelIcon,
  XMarkIcon,
  ChartBarIcon,
  DocumentTextIcon,
  UserGroupIcon,
  CreditCardIcon,
  LifebuoyIcon
} from '@heroicons/react/24/outline';

const PlatformOrganizations = () => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    tier: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState(null);
  const [error, setError] = useState(null);
  const [detailsTab, setDetailsTab] = useState('overview');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    domain: '',
    website: '',
    type: 'CLINIC',
    subscriptionTier: 'BASIC',
    subscriptionStatus: 'TRIAL',
    subscriptionStartDate: new Date().toISOString().split('T')[0],
    subscriptionEndDate: '',
    maxUsers: 10,
    maxPatients: 100,
    maxClinicians: 5,
    billingContactName: '',
    billingContactEmail: '',
    billingContactPhone: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchOrganizations();
  }, [pagination.page, filters, searchTerm]);

  const fetchOrganizations = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm || undefined,
        status: filters.status || undefined,
        tier: filters.tier || undefined,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      };

      const response = await api.getPlatformOrganizations(params);
      setOrganizations(response.organizations);
      setPagination(prev => ({
        ...prev,
        total: response.pagination.total,
        totalPages: response.pagination.totalPages
      }));
    } catch (err) {
      console.error('Error fetching organizations:', err);
      setError('Failed to load organizations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      tier: '',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
    setSearchTerm('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      domain: '',
      website: '',
      type: 'CLINIC',
      subscriptionTier: 'BASIC',
      subscriptionStatus: 'TRIAL',
      subscriptionStartDate: new Date().toISOString().split('T')[0],
      subscriptionEndDate: '',
      maxUsers: 10,
      maxPatients: 100,
      maxClinicians: 5,
      billingContactName: '',
      billingContactEmail: '',
      billingContactPhone: ''
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) errors.name = 'Organization name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }
    if (formData.maxUsers < 1) errors.maxUsers = 'Must be at least 1';
    if (formData.maxPatients < 1) errors.maxPatients = 'Must be at least 1';
    if (formData.maxClinicians < 1) errors.maxClinicians = 'Must be at least 1';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateOrganization = () => {
    resetForm();
    setSelectedOrganization(null);
    setShowCreateModal(true);
  };

  const handleEditOrganization = (org) => {
    setSelectedOrganization(org);
    setFormData({
      name: org.name || '',
      email: org.email || '',
      phone: org.phone || '',
      address: org.address || '',
      domain: org.domain || '',
      website: org.website || '',
      type: org.type || 'CLINIC',
      subscriptionTier: org.subscriptionTier || 'BASIC',
      subscriptionStatus: org.subscriptionStatus || 'TRIAL',
      subscriptionStartDate: org.subscriptionStartDate ? new Date(org.subscriptionStartDate).toISOString().split('T')[0] : '',
      subscriptionEndDate: org.subscriptionEndDate ? new Date(org.subscriptionEndDate).toISOString().split('T')[0] : '',
      maxUsers: org.maxUsers || 10,
      maxPatients: org.maxPatients || 100,
      maxClinicians: org.maxClinicians || 5,
      billingContactName: org.billingContact?.name || '',
      billingContactEmail: org.billingContact?.email || '',
      billingContactPhone: org.billingContact?.phone || ''
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  const handleViewDetails = (org) => {
    setSelectedOrganization(org);
    setDetailsTab('overview');
    setShowDetailsModal(true);
  };

  const handleDeleteOrganization = async (org) => {
    if (!window.confirm(`Are you sure you want to delete ${org.name}? This will set the organization to inactive and cancel their subscription.`)) {
      return;
    }

    try {
      await api.deletePlatformOrganization(org.id);
      fetchOrganizations();
    } catch (err) {
      console.error('Error deleting organization:', err);
      alert('Failed to delete organization. Please try again.');
    }
  };

  const handleSubmitCreate = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        address: formData.address || null,
        domain: formData.domain || null,
        website: formData.website || null,
        type: formData.type,
        subscriptionTier: formData.subscriptionTier,
        subscriptionStatus: formData.subscriptionStatus,
        subscriptionStartDate: new Date(formData.subscriptionStartDate),
        subscriptionEndDate: formData.subscriptionEndDate ? new Date(formData.subscriptionEndDate) : null,
        maxUsers: parseInt(formData.maxUsers),
        maxPatients: parseInt(formData.maxPatients),
        maxClinicians: parseInt(formData.maxClinicians),
        billingContact: {
          name: formData.billingContactName || null,
          email: formData.billingContactEmail || null,
          phone: formData.billingContactPhone || null
        }
      };

      await api.createPlatformOrganization(payload);
      setShowCreateModal(false);
      resetForm();
      fetchOrganizations();
    } catch (err) {
      console.error('Error creating organization:', err);
      alert('Failed to create organization. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        address: formData.address || null,
        domain: formData.domain || null,
        website: formData.website || null,
        type: formData.type,
        subscriptionTier: formData.subscriptionTier,
        subscriptionStatus: formData.subscriptionStatus,
        subscriptionStartDate: new Date(formData.subscriptionStartDate),
        subscriptionEndDate: formData.subscriptionEndDate ? new Date(formData.subscriptionEndDate) : null,
        maxUsers: parseInt(formData.maxUsers),
        maxPatients: parseInt(formData.maxPatients),
        maxClinicians: parseInt(formData.maxClinicians),
        billingContact: {
          name: formData.billingContactName || null,
          email: formData.billingContactEmail || null,
          phone: formData.billingContactPhone || null
        }
      };

      await api.updatePlatformOrganization(selectedOrganization.id, payload);
      setShowEditModal(false);
      resetForm();
      fetchOrganizations();
    } catch (err) {
      console.error('Error updating organization:', err);
      alert('Failed to update organization. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      TRIAL: 'bg-blue-100 text-blue-800',
      ACTIVE: 'bg-green-100 text-green-800',
      SUSPENDED: 'bg-yellow-100 text-yellow-800',
      CANCELLED: 'bg-red-100 text-red-800',
      EXPIRED: 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const getTierBadge = (tier) => {
    const tierColors = {
      BASIC: 'bg-gray-100 text-gray-800',
      PRO: 'bg-blue-100 text-blue-800',
      ENTERPRISE: 'bg-purple-100 text-purple-800',
      CUSTOM: 'bg-indigo-100 text-indigo-800'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tierColors[tier] || 'bg-gray-100 text-gray-800'}`}>
        {tier}
      </span>
    );
  };

  const getUsagePercentage = (current, max) => {
    if (!max || max === 0) return 0;
    return Math.round((current / max) * 100);
  };

  const getUsageColor = (percentage) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Platform Organizations</h1>
            <p className="mt-2 text-sm text-gray-700">
              Manage client organizations, subscriptions, and usage limits
            </p>
          </div>
          <button
            onClick={handleCreateOrganization}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Organization
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Search and Filters */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={handleSearch}
                placeholder="Search by name, email, or domain..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Subscription Status
            </label>
            <select
              id="status"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">All Statuses</option>
              <option value="TRIAL">Trial</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>

          {/* Tier Filter */}
          <div>
            <label htmlFor="tier" className="block text-sm font-medium text-gray-700 mb-1">
              Subscription Tier
            </label>
            <select
              id="tier"
              value={filters.tier}
              onChange={(e) => handleFilterChange('tier', e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">All Tiers</option>
              <option value="BASIC">Basic</option>
              <option value="PRO">Pro</option>
              <option value="ENTERPRISE">Enterprise</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </div>
        </div>

        {/* Active Filters and Clear Button */}
        {(searchTerm || filters.status || filters.tier) && (
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FunnelIcon className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-600">
                Active filters: {[searchTerm && 'Search', filters.status && 'Status', filters.tier && 'Tier'].filter(Boolean).join(', ')}
              </span>
            </div>
            <button
              onClick={clearFilters}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <XMarkIcon className="h-4 w-4 mr-1" />
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Organizations Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Organization
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Subscription
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usage
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">Loading organizations...</p>
                </td>
              </tr>
            ) : organizations.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center">
                  <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm font-medium text-gray-900">No organizations found</p>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm || filters.status || filters.tier
                      ? 'Try adjusting your search or filters'
                      : 'Get started by creating a new organization'}
                  </p>
                </td>
              </tr>
            ) : (
              organizations.map((org) => (
                <tr key={org.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <BuildingOfficeIcon className="h-10 w-10 text-gray-400" />
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{org.name}</div>
                        <div className="text-sm text-gray-500">{org.email}</div>
                        {org.domain && (
                          <div className="text-xs text-gray-400">{org.domain}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col space-y-1">
                      {getTierBadge(org.subscriptionTier)}
                      {getStatusBadge(org.subscriptionStatus)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div className={`${getUsageColor(org.usagePercentages?.users || 0)}`}>
                        Users: {org.userCount || 0}/{org.maxUsers || 'N/A'} ({org.usagePercentages?.users || 0}%)
                      </div>
                      <div className={`${getUsageColor(org.usagePercentages?.patients || 0)}`}>
                        Patients: {org.patientCount || 0}/{org.maxPatients || 'N/A'} ({org.usagePercentages?.patients || 0}%)
                      </div>
                      <div className={`${getUsageColor(org.usagePercentages?.clinicians || 0)}`}>
                        Clinicians: {org.clinicianCount || 0}/{org.maxClinicians || 'N/A'} ({org.usagePercentages?.clinicians || 0}%)
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {org.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {org.isActive ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleViewDetails(org)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="View Details"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleEditOrganization(org)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteOrganization(org)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {!loading && organizations.length > 0 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>{' '}
                  of <span className="font-medium">{pagination.total}</span> organizations
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Next</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CREATE ORGANIZATION MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-medium text-gray-900">Create Organization</h3>
            </div>

            <form onSubmit={handleSubmitCreate}>
              <div className="px-6 py-4 space-y-6">
                {/* Basic Information */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Basic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Organization Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 ${formErrors.name ? 'border-red-300' : 'border-gray-300'}`}
                      />
                      {formErrors.name && <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 ${formErrors.email ? 'border-red-300' : 'border-gray-300'}`}
                      />
                      {formErrors.email && <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
                      <input
                        type="text"
                        value={formData.domain}
                        onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                        placeholder="example.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                      <input
                        type="url"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        placeholder="https://example.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Organization Type</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="HOSPITAL">Hospital</option>
                        <option value="CLINIC">Clinic</option>
                        <option value="PRACTICE">Practice</option>
                        <option value="RESEARCH">Research</option>
                        <option value="INSURANCE">Insurance</option>
                        <option value="PHARMACY">Pharmacy</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <textarea
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        rows="2"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Subscription Settings */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Subscription Settings</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Tier</label>
                      <select
                        value={formData.subscriptionTier}
                        onChange={(e) => setFormData({ ...formData, subscriptionTier: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="BASIC">Basic</option>
                        <option value="PRO">Pro</option>
                        <option value="ENTERPRISE">Enterprise</option>
                        <option value="CUSTOM">Custom</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Status</label>
                      <select
                        value={formData.subscriptionStatus}
                        onChange={(e) => setFormData({ ...formData, subscriptionStatus: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="TRIAL">Trial</option>
                        <option value="ACTIVE">Active</option>
                        <option value="SUSPENDED">Suspended</option>
                        <option value="CANCELLED">Cancelled</option>
                        <option value="EXPIRED">Expired</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={formData.subscriptionStartDate}
                        onChange={(e) => setFormData({ ...formData, subscriptionStartDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Date (Optional)</label>
                      <input
                        type="date"
                        value={formData.subscriptionEndDate}
                        onChange={(e) => setFormData({ ...formData, subscriptionEndDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Usage Limits */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Usage Limits</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Users <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.maxUsers}
                        onChange={(e) => setFormData({ ...formData, maxUsers: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 ${formErrors.maxUsers ? 'border-red-300' : 'border-gray-300'}`}
                      />
                      {formErrors.maxUsers && <p className="mt-1 text-sm text-red-600">{formErrors.maxUsers}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Patients <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.maxPatients}
                        onChange={(e) => setFormData({ ...formData, maxPatients: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 ${formErrors.maxPatients ? 'border-red-300' : 'border-gray-300'}`}
                      />
                      {formErrors.maxPatients && <p className="mt-1 text-sm text-red-600">{formErrors.maxPatients}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Clinicians <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.maxClinicians}
                        onChange={(e) => setFormData({ ...formData, maxClinicians: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 ${formErrors.maxClinicians ? 'border-red-300' : 'border-gray-300'}`}
                      />
                      {formErrors.maxClinicians && <p className="mt-1 text-sm text-red-600">{formErrors.maxClinicians}</p>}
                    </div>
                  </div>
                </div>

                {/* Billing Contact */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Billing Contact (Optional)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                      <input
                        type="text"
                        value={formData.billingContactName}
                        onChange={(e) => setFormData({ ...formData, billingContactName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                      <input
                        type="email"
                        value={formData.billingContactEmail}
                        onChange={(e) => setFormData({ ...formData, billingContactEmail: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                      <input
                        type="tel"
                        value={formData.billingContactPhone}
                        onChange={(e) => setFormData({ ...formData, billingContactPhone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end space-x-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Creating...' : 'Create Organization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ORGANIZATION MODAL */}
      {showEditModal && selectedOrganization && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-medium text-gray-900">Edit Organization: {selectedOrganization.name}</h3>
            </div>

            <form onSubmit={handleSubmitEdit}>
              <div className="px-6 py-4 space-y-6">
                {/* Basic Information */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Basic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Organization Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 ${formErrors.name ? 'border-red-300' : 'border-gray-300'}`}
                      />
                      {formErrors.name && <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 ${formErrors.email ? 'border-red-300' : 'border-gray-300'}`}
                      />
                      {formErrors.email && <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
                      <input
                        type="text"
                        value={formData.domain}
                        onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                        placeholder="example.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                      <input
                        type="url"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        placeholder="https://example.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Organization Type</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="HOSPITAL">Hospital</option>
                        <option value="CLINIC">Clinic</option>
                        <option value="PRACTICE">Practice</option>
                        <option value="RESEARCH">Research</option>
                        <option value="INSURANCE">Insurance</option>
                        <option value="PHARMACY">Pharmacy</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <textarea
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        rows="2"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Subscription Settings */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Subscription Settings</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Tier</label>
                      <select
                        value={formData.subscriptionTier}
                        onChange={(e) => setFormData({ ...formData, subscriptionTier: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="BASIC">Basic</option>
                        <option value="PRO">Pro</option>
                        <option value="ENTERPRISE">Enterprise</option>
                        <option value="CUSTOM">Custom</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Status</label>
                      <select
                        value={formData.subscriptionStatus}
                        onChange={(e) => setFormData({ ...formData, subscriptionStatus: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="TRIAL">Trial</option>
                        <option value="ACTIVE">Active</option>
                        <option value="SUSPENDED">Suspended</option>
                        <option value="CANCELLED">Cancelled</option>
                        <option value="EXPIRED">Expired</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={formData.subscriptionStartDate}
                        onChange={(e) => setFormData({ ...formData, subscriptionStartDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Date (Optional)</label>
                      <input
                        type="date"
                        value={formData.subscriptionEndDate}
                        onChange={(e) => setFormData({ ...formData, subscriptionEndDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Usage Limits */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Usage Limits</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Users <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.maxUsers}
                        onChange={(e) => setFormData({ ...formData, maxUsers: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 ${formErrors.maxUsers ? 'border-red-300' : 'border-gray-300'}`}
                      />
                      {formErrors.maxUsers && <p className="mt-1 text-sm text-red-600">{formErrors.maxUsers}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Patients <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.maxPatients}
                        onChange={(e) => setFormData({ ...formData, maxPatients: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 ${formErrors.maxPatients ? 'border-red-300' : 'border-gray-300'}`}
                      />
                      {formErrors.maxPatients && <p className="mt-1 text-sm text-red-600">{formErrors.maxPatients}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Clinicians <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.maxClinicians}
                        onChange={(e) => setFormData({ ...formData, maxClinicians: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 ${formErrors.maxClinicians ? 'border-red-300' : 'border-gray-300'}`}
                      />
                      {formErrors.maxClinicians && <p className="mt-1 text-sm text-red-600">{formErrors.maxClinicians}</p>}
                    </div>
                  </div>
                </div>

                {/* Billing Contact */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Billing Contact (Optional)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                      <input
                        type="text"
                        value={formData.billingContactName}
                        onChange={(e) => setFormData({ ...formData, billingContactName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                      <input
                        type="email"
                        value={formData.billingContactEmail}
                        onChange={(e) => setFormData({ ...formData, billingContactEmail: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                      <input
                        type="tel"
                        value={formData.billingContactPhone}
                        onChange={(e) => setFormData({ ...formData, billingContactPhone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end space-x-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ORGANIZATION DETAILS MODAL */}
      {showDetailsModal && selectedOrganization && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-medium text-gray-900">Organization Details: {selectedOrganization.name}</h3>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px space-x-8 px-6" aria-label="Tabs">
                <button
                  onClick={() => setDetailsTab('overview')}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                    detailsTab === 'overview'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <BuildingOfficeIcon className="h-5 w-5 inline mr-2" />
                  Overview
                </button>
                <button
                  onClick={() => setDetailsTab('subscription')}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                    detailsTab === 'subscription'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <DocumentTextIcon className="h-5 w-5 inline mr-2" />
                  Subscription
                </button>
                <button
                  onClick={() => setDetailsTab('usage')}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                    detailsTab === 'usage'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <ChartBarIcon className="h-5 w-5 inline mr-2" />
                  Usage
                </button>
                <button
                  onClick={() => setDetailsTab('billing')}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                    detailsTab === 'billing'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <CreditCardIcon className="h-5 w-5 inline mr-2" />
                  Billing
                </button>
                <button
                  onClick={() => setDetailsTab('support')}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                    detailsTab === 'support'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <LifebuoyIcon className="h-5 w-5 inline mr-2" />
                  Support
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {detailsTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Organization Name</h4>
                      <p className="text-lg text-gray-900">{selectedOrganization.name}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Type</h4>
                      <p className="text-lg text-gray-900">{selectedOrganization.type}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Email</h4>
                      <p className="text-lg text-gray-900">{selectedOrganization.email}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Phone</h4>
                      <p className="text-lg text-gray-900">{selectedOrganization.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Domain</h4>
                      <p className="text-lg text-gray-900">{selectedOrganization.domain || 'N/A'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Website</h4>
                      <p className="text-lg text-gray-900">
                        {selectedOrganization.website ? (
                          <a href={selectedOrganization.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-900">
                            {selectedOrganization.website}
                          </a>
                        ) : (
                          'N/A'
                        )}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Address</h4>
                      <p className="text-lg text-gray-900">{selectedOrganization.address || 'N/A'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Status</h4>
                      <p className="text-lg">
                        {selectedOrganization.isActive ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                            Inactive
                          </span>
                        )}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Created</h4>
                      <p className="text-lg text-gray-900">{new Date(selectedOrganization.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              )}

              {detailsTab === 'subscription' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Subscription Tier</h4>
                      <p className="text-lg">{getTierBadge(selectedOrganization.subscriptionTier)}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Status</h4>
                      <p className="text-lg">{getStatusBadge(selectedOrganization.subscriptionStatus)}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Start Date</h4>
                      <p className="text-lg text-gray-900">
                        {selectedOrganization.subscriptionStartDate
                          ? new Date(selectedOrganization.subscriptionStartDate).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">End Date</h4>
                      <p className="text-lg text-gray-900">
                        {selectedOrganization.subscriptionEndDate
                          ? new Date(selectedOrganization.subscriptionEndDate).toLocaleDateString()
                          : 'No end date (ongoing)'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-8">
                    <h4 className="text-md font-medium text-gray-900 mb-4">Subscription History</h4>
                    <p className="text-sm text-gray-500">Subscription history tracking - To be implemented</p>
                  </div>
                </div>
              )}

              {detailsTab === 'usage' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Users Usage */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-700">Users</h4>
                        <UserGroupIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900 mb-1">
                        {selectedOrganization.userCount || 0} / {selectedOrganization.maxUsers}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div
                          className={`h-2 rounded-full ${
                            getUsagePercentage(selectedOrganization.userCount, selectedOrganization.maxUsers) >= 90
                              ? 'bg-red-600'
                              : getUsagePercentage(selectedOrganization.userCount, selectedOrganization.maxUsers) >= 70
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${getUsagePercentage(selectedOrganization.userCount, selectedOrganization.maxUsers)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        {getUsagePercentage(selectedOrganization.userCount, selectedOrganization.maxUsers)}% utilized
                      </p>
                    </div>

                    {/* Patients Usage */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-700">Patients</h4>
                        <UserGroupIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900 mb-1">
                        {selectedOrganization.patientCount || 0} / {selectedOrganization.maxPatients}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div
                          className={`h-2 rounded-full ${
                            getUsagePercentage(selectedOrganization.patientCount, selectedOrganization.maxPatients) >= 90
                              ? 'bg-red-600'
                              : getUsagePercentage(selectedOrganization.patientCount, selectedOrganization.maxPatients) >= 70
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${getUsagePercentage(selectedOrganization.patientCount, selectedOrganization.maxPatients)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        {getUsagePercentage(selectedOrganization.patientCount, selectedOrganization.maxPatients)}% utilized
                      </p>
                    </div>

                    {/* Clinicians Usage */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-700">Clinicians</h4>
                        <UserGroupIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900 mb-1">
                        {selectedOrganization.clinicianCount || 0} / {selectedOrganization.maxClinicians}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div
                          className={`h-2 rounded-full ${
                            getUsagePercentage(selectedOrganization.clinicianCount, selectedOrganization.maxClinicians) >= 90
                              ? 'bg-red-600'
                              : getUsagePercentage(selectedOrganization.clinicianCount, selectedOrganization.maxClinicians) >= 70
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${getUsagePercentage(selectedOrganization.clinicianCount, selectedOrganization.maxClinicians)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        {getUsagePercentage(selectedOrganization.clinicianCount, selectedOrganization.maxClinicians)}% utilized
                      </p>
                    </div>
                  </div>

                  <div className="mt-8">
                    <h4 className="text-md font-medium text-gray-900 mb-4">Usage Trends</h4>
                    <p className="text-sm text-gray-500">Usage trend charts - To be implemented</p>
                  </div>
                </div>
              )}

              {detailsTab === 'billing' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Billing Contact Name</h4>
                      <p className="text-lg text-gray-900">{selectedOrganization.billingContact?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Billing Contact Email</h4>
                      <p className="text-lg text-gray-900">{selectedOrganization.billingContact?.email || 'N/A'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Billing Contact Phone</h4>
                      <p className="text-lg text-gray-900">{selectedOrganization.billingContact?.phone || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="mt-8">
                    <h4 className="text-md font-medium text-gray-900 mb-4">Recent Invoices</h4>
                    <p className="text-sm text-gray-500">Invoice list - To be implemented</p>
                  </div>
                </div>
              )}

              {detailsTab === 'support' && (
                <div className="space-y-6">
                  <h4 className="text-md font-medium text-gray-900">Support Tickets</h4>
                  <p className="text-sm text-gray-500">Support ticket list - To be implemented</p>
                </div>
              )}
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-end border-t border-gray-200">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlatformOrganizations;
