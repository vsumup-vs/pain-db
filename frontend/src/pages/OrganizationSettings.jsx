import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import {
  PhotoIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

export default function OrganizationSettings() {
  const queryClient = useQueryClient()
  const currentUser = api.getCurrentUser()
  const organizationId = currentUser?.currentOrganization

  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [copyright, setCopyright] = useState('')
  const [showPoweredBy, setShowPoweredBy] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Fetch current branding
  const { data: brandingData, isLoading } = useQuery({
    queryKey: ['organizationBranding', organizationId],
    queryFn: () => api.getBranding(organizationId),
    enabled: !!organizationId,
    onSuccess: (data) => {
      const config = data?.data?.brandingConfig
      setCopyright(config?.copyright || '')
      setShowPoweredBy(config?.showPoweredBy !== false)
    }
  })

  // Upload logo mutation
  const uploadLogoMutation = useMutation({
    mutationFn: (formData) => api.uploadLogo(organizationId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries(['organizationBranding', organizationId])
      setSuccess('Logo uploaded successfully')
      setLogoFile(null)
      setLogoPreview(null)
      setTimeout(() => setSuccess(''), 3000)
    },
    onError: (error) => {
      setError(error.response?.data?.error || 'Failed to upload logo')
      setTimeout(() => setError(''), 5000)
    }
  })

  // Delete logo mutation
  const deleteLogoMutation = useMutation({
    mutationFn: () => api.deleteLogo(organizationId),
    onSuccess: () => {
      queryClient.invalidateQueries(['organizationBranding', organizationId])
      setSuccess('Logo deleted successfully')
      setTimeout(() => setSuccess(''), 3000)
    },
    onError: (error) => {
      setError(error.response?.data?.error || 'Failed to delete logo')
      setTimeout(() => setError(''), 5000)
    }
  })

  // Update branding config mutation
  const updateBrandingMutation = useMutation({
    mutationFn: (config) => api.updateBranding(organizationId, config),
    onSuccess: () => {
      queryClient.invalidateQueries(['organizationBranding', organizationId])
      setSuccess('Branding settings updated successfully')
      setTimeout(() => setSuccess(''), 3000)
    },
    onError: (error) => {
      setError(error.response?.data?.error || 'Failed to update branding settings')
      setTimeout(() => setError(''), 5000)
    }
  })

  const handleLogoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp']
      if (!validTypes.includes(file.type)) {
        setError('Invalid file type. Only JPEG, PNG, GIF, SVG, and WebP are allowed.')
        return
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size too large. Maximum size is 5MB.')
        return
      }

      setLogoFile(file)
      setError('')

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUploadLogo = () => {
    if (!logoFile) return

    const formData = new FormData()
    formData.append('logo', logoFile)
    uploadLogoMutation.mutate(formData)
  }

  const handleDeleteLogo = () => {
    if (window.confirm('Are you sure you want to delete the organization logo?')) {
      deleteLogoMutation.mutate()
    }
  }

  const handleSaveSettings = () => {
    updateBrandingMutation.mutate({
      copyright: copyright || null,
      showPoweredBy
    })
  }

  const organizationLogo = brandingData?.data?.logoUrl
  const organizationName = brandingData?.data?.organizationName

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Organization Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage your organization's branding and appearance
        </p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <CheckIcon className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Logo Upload Section */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-base font-semibold leading-6 text-gray-900">
            Organization Logo
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>Upload your organization's logo to display in the sidebar.</p>
            <p className="mt-1">Accepted formats: JPEG, PNG, GIF, SVG, WebP. Max size: 5MB.</p>
          </div>

          <div className="mt-5">
            {/* Current Logo */}
            {organizationLogo && !logoPreview && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Current Logo</p>
                <div className="flex items-center space-x-4">
                  <img
                    src={organizationLogo}
                    alt="Current Organization Logo"
                    className="h-16 w-16 object-contain border border-gray-300 rounded-md p-2"
                  />
                  <button
                    type="button"
                    onClick={handleDeleteLogo}
                    disabled={deleteLogoMutation.isLoading}
                    className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    <TrashIcon className="h-4 w-4 mr-2" />
                    {deleteLogoMutation.isLoading ? 'Deleting...' : 'Delete Logo'}
                  </button>
                </div>
              </div>
            )}

            {/* Logo Preview */}
            {logoPreview && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">New Logo Preview</p>
                <div className="flex items-center space-x-4">
                  <img
                    src={logoPreview}
                    alt="Logo Preview"
                    className="h-16 w-16 object-contain border border-gray-300 rounded-md p-2"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setLogoFile(null)
                      setLogoPreview(null)
                    }}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <XMarkIcon className="h-4 w-4 mr-2" />
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* File Input */}
            <div className="flex items-center space-x-4">
              <label className="relative cursor-pointer rounded-md bg-white font-medium text-blue-600 hover:text-blue-500">
                <span className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <PhotoIcon className="h-5 w-5 mr-2" />
                  Choose File
                </span>
                <input
                  type="file"
                  className="sr-only"
                  accept="image/jpeg,image/png,image/gif,image/svg+xml,image/webp"
                  onChange={handleLogoChange}
                />
              </label>
              {logoFile && (
                <button
                  type="button"
                  onClick={handleUploadLogo}
                  disabled={uploadLogoMutation.isLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {uploadLogoMutation.isLoading ? 'Uploading...' : 'Upload Logo'}
                </button>
              )}
            </div>
            {logoFile && (
              <p className="mt-2 text-sm text-gray-500">
                Selected: {logoFile.name} ({(logoFile.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Branding Configuration Section */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-base font-semibold leading-6 text-gray-900">
            Branding Configuration
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>Customize how your organization appears in the application.</p>
          </div>

          <div className="mt-5 space-y-4">
            {/* Copyright Text */}
            <div>
              <label htmlFor="copyright" className="block text-sm font-medium text-gray-700">
                Copyright Text
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="copyright"
                  value={copyright}
                  onChange={(e) => setCopyright(e.target.value)}
                  placeholder={`© ${new Date().getFullYear()} ${organizationName}. All rights reserved.`}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Leave empty to use default: "© {new Date().getFullYear()} {organizationName}. All rights reserved."
              </p>
            </div>

            {/* Show Powered By */}
            <div className="flex items-start">
              <div className="flex h-5 items-center">
                <input
                  id="showPoweredBy"
                  type="checkbox"
                  checked={showPoweredBy}
                  onChange={(e) => setShowPoweredBy(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="showPoweredBy" className="font-medium text-gray-700">
                  Show "Powered by VitalEdge"
                </label>
                <p className="text-gray-500">
                  Display "Powered by VitalEdge" attribution in the footer
                </p>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-3">
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={updateBrandingMutation.isLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {updateBrandingMutation.isLoading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Future Features Placeholder */}
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-2">
          Coming Soon
        </h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Custom color themes (primary and secondary colors)</li>
          <li>• Custom favicon</li>
          <li>• Login page branding</li>
          <li>• Custom domain support</li>
        </ul>
      </div>
    </div>
  )
}
