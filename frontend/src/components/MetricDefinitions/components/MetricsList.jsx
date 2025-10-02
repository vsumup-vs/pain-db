import React from 'react'
import { PlusIcon } from '@heroicons/react/24/outline'
import { MetricCard } from './MetricCard'

export const MetricsList = ({ 
  metrics, 
  onEdit, 
  onDelete, 
  onCreateFirst 
}) => {
  if (metrics.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-12 w-12 text-gray-400">
          <PlusIcon className="h-12 w-12" />
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No metric definitions</h3>
        <p className="mt-1 text-sm text-gray-500">Get started by creating your first metric definition.</p>
        <div className="mt-6">
          <button
            onClick={onCreateFirst}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create First Metric
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {metrics.map((metric) => (
        <MetricCard
          key={metric.id}
          metric={metric}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}