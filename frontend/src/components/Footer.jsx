import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'

export default function Footer() {
  // Get current user to access organization ID
  const currentUser = api.getCurrentUser()

  // Fetch organization branding
  const { data: brandingData } = useQuery({
    queryKey: ['organizationBranding', currentUser?.currentOrganization],
    queryFn: () => api.getBranding(currentUser.currentOrganization),
    enabled: !!currentUser?.currentOrganization,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  const brandingConfig = brandingData?.data?.brandingConfig
  const organizationName = brandingData?.data?.organizationName

  // Default values
  const currentYear = new Date().getFullYear()
  const copyright = brandingConfig?.copyright || `© ${currentYear} ${organizationName || 'VitalEdge'}. All rights reserved.`
  const showPoweredBy = brandingConfig?.showPoweredBy !== false // Default to true

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between space-y-2 sm:flex-row sm:space-y-0">
          <div className="text-sm text-gray-500">
            {copyright}
          </div>
          {showPoweredBy && (
            <div className="text-sm text-gray-400">
              Powered by{' '}
              <a
                href="https://vitaledge.health"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                VitalEdge
              </a>
            </div>
          )}
        </div>
      </div>
    </footer>
  )
}
