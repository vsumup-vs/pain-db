import React from 'react';
import { BuildingOfficeIcon } from '@heroicons/react/24/outline';

const OrganizationSelector = ({ organizations, onSelect, title = "Select Organization" }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {title}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            You have access to multiple organizations. Please select which one you want to work with.
          </p>
        </div>

        <div className="mt-8 space-y-3">
          {organizations.map((org) => (
            <button
              key={org.id}
              onClick={() => onSelect(org.id)}
              className="w-full flex items-center justify-between p-4 border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <div className="flex items-center space-x-3">
                <BuildingOfficeIcon className="h-8 w-8 text-gray-400" />
                <div className="text-left">
                  <p className="text-lg font-medium text-gray-900">{org.name}</p>
                  <p className="text-sm text-gray-500">
                    {org.type} • {org.role}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Select
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="text-center text-sm text-gray-500">
          <p>
            You can switch organizations later from your profile settings
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrganizationSelector;
