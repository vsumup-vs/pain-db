import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  BuildingOfficeIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { api } from '../services/api';

const AdminOrganizations = () => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'HOSPITAL',
    email: '',
    phone: '',
    address: '',
    website: '',
    isActive: true
  });

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const response = await api.getOrganizations();
      setOrganizations(response.data || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast.error('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingOrg) {
        await api.updateOrganization(editingOrg.id, formData);
        toast.success('Organization updated successfully');
      } else {
        await api.createOrganization(formData);
        toast.success('Organization created successfully');
      }

      setShowModal(false);
      setEditingOrg(null);
      resetForm();
      fetchOrganizations();
    } catch (error) {
      console.error('Error saving organization:', error);
      toast.error(error.response?.data?.error || 'Failed to save organization');
    }
  };

  const handleEdit = (org) => {
    setEditingOrg(org);
    setFormData({
      name: org.name,
      type: org.type,
      email: org.email || '',
      phone: org.phone || '',
      address: org.address || '',
      website: org.website || '',
      isActive: org.isActive
    });
    setShowModal(true);
  };

  const handleDelete = async (orgId) => {
    if (!window.confirm('Are you sure you want to delete this organization? This action cannot be undone.')) {
      return;
    }

    try {
      await api.deleteOrganization(orgId);
      toast.success('Organization deleted successfully');
      fetchOrganizations();
    } catch (error) {
      console.error('Error deleting organization:', error);
      toast.error(error.response?.data?.error || 'Failed to delete organization');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'HOSPITAL',
      email: '',
      phone: '',
      address: '',
      website: '',
      isActive: true
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingOrg(null);
    resetForm();
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
          <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage healthcare organizations (SUPER_ADMIN only)
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
          New Organization
        </button>
      </div>

      {/* Organizations List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {organizations.length === 0 ? (
            <li className="px-6 py-8 text-center text-gray-500">
              No organizations found. Create one to get started.
            </li>
          ) : (
            organizations.map((org) => (
              <li key={org.id}>
                <div className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <BuildingOfficeIcon className="h-6 w-6 text-gray-400" />
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{org.name}</h3>
                        <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {org.type}
                          </span>
                          {org.email && <span>{org.email}</span>}
                          {org.phone && <span>{org.phone}</span>}
                          {org.isActive ? (
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
                        </div>
                      </div>
                    </div>
                    {org.address && (
                      <p className="mt-2 text-sm text-gray-500 ml-9">{org.address}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(org)}
                      className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md"
                      title="Edit organization"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(org.id)}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md"
                      title="Delete organization"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleCloseModal}></div>

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      {editingOrg ? 'Edit Organization' : 'Create New Organization'}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {editingOrg ? 'Update organization details' : 'Add a new healthcare organization to the platform'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Organization Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        id="name"
                        required
                        value={formData.name}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                        Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="type"
                        id="type"
                        required
                        value={formData.type}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="HOSPITAL">Hospital</option>
                        <option value="CLINIC">Clinic</option>
                        <option value="PRACTICE">Practice</option>
                        <option value="RESEARCH">Research</option>
                        <option value="INSURANCE">Insurance</option>
                        <option value="PHARMACY">Pharmacy</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        id="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                        Phone
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        id="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                        Website
                      </label>
                      <input
                        type="url"
                        name="website"
                        id="website"
                        value={formData.website}
                        onChange={handleInputChange}
                        placeholder="https://example.com"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                        Address
                      </label>
                      <textarea
                        name="address"
                        id="address"
                        rows="2"
                        value={formData.address}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="isActive"
                          checked={formData.isActive}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Active</span>
                      </label>
                    </div>
                  </div>

                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                    <button
                      type="submit"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm"
                    >
                      {editingOrg ? 'Update' : 'Create'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseModal}
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

export default AdminOrganizations;
