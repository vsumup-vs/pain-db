import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import {
  ClipboardDocumentListIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'
import TaskModal from '../components/TaskModal'
import TaskDetailModal from '../components/TaskDetailModal'

export default function Tasks() {
  const [activeTab, setActiveTab] = useState('MY_TASKS')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('dueDate')
  const [sortOrder, setSortOrder] = useState('asc')
  const [selectedTasks, setSelectedTasks] = useState([])
  const [page, setPage] = useState(1)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState(null)
  const limit = 20

  const queryClient = useQueryClient()

  // Build filters based on active tab
  const getFilters = () => {
    const filters = {
      sortBy,
      sortOrder,
      page,
      limit
    }

    switch (activeTab) {
      case 'MY_TASKS':
        filters.assignedTo = 'me'
        filters.status = 'PENDING,IN_PROGRESS'
        break
      case 'ALL_TASKS':
        // No additional filters
        break
      case 'DUE_TODAY':
        filters.dueToday = true
        break
      case 'OVERDUE':
        filters.overdue = true
        break
      case 'COMPLETED':
        filters.status = 'COMPLETED'
        break
      default:
        break
    }

    return filters
  }

  // Fetch tasks
  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['tasks', activeTab, sortBy, sortOrder, page],
    queryFn: () => api.getTasks(getFilters())
  })

  const tasks = tasksData?.tasks || []
  const pagination = tasksData?.pagination || {}

  // Filter by search term (client-side)
  const filteredTasks = tasks.filter(task => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      task.title?.toLowerCase().includes(searchLower) ||
      task.description?.toLowerCase().includes(searchLower) ||
      task.patient?.firstName?.toLowerCase().includes(searchLower) ||
      task.patient?.lastName?.toLowerCase().includes(searchLower)
    )
  })

  // Complete task mutation
  const completeTaskMutation = useMutation({
    mutationFn: ({ id, completionNotes }) => api.completeTask(id, { completionNotes }),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks'])
      toast.success('Task completed successfully')
      setSelectedTasks([])
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to complete task')
    }
  })

  // Bulk complete mutation
  const bulkCompleteMutation = useMutation({
    mutationFn: (taskIds) => api.bulkCompleteTasks({ taskIds }),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks'])
      toast.success('Tasks completed successfully')
      setSelectedTasks([])
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to complete tasks')
    }
  })

  // Handle sorting
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
  }

  // Handle task selection
  const handleSelectTask = (taskId) => {
    setSelectedTasks(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    )
  }

  const handleSelectAll = () => {
    if (selectedTasks.length === filteredTasks.length) {
      setSelectedTasks([])
    } else {
      setSelectedTasks(filteredTasks.map(task => task.id))
    }
  }

  // Handle bulk complete
  const handleBulkComplete = () => {
    if (selectedTasks.length === 0) return
    if (window.confirm(`Complete ${selectedTasks.length} task(s)?`)) {
      bulkCompleteMutation.mutate(selectedTasks)
    }
  }

  // Get priority color classes
  const getPriorityBadge = (priority) => {
    const badges = {
      URGENT: 'bg-red-100 text-red-800 border-red-300',
      HIGH: 'bg-orange-100 text-orange-800 border-orange-300',
      MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      LOW: 'bg-gray-100 text-gray-800 border-gray-300'
    }
    return badges[priority] || badges.LOW
  }

  // Get status badge classes
  const getStatusBadge = (status) => {
    const badges = {
      PENDING: 'bg-blue-100 text-blue-800 border-blue-300',
      IN_PROGRESS: 'bg-purple-100 text-purple-800 border-purple-300',
      COMPLETED: 'bg-green-100 text-green-800 border-green-300',
      CANCELLED: 'bg-gray-100 text-gray-800 border-gray-300'
    }
    return badges[status] || badges.PENDING
  }

  // Get due date display with color coding
  const getDueDateDisplay = (dueDate) => {
    const due = new Date(dueDate)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate())

    const diffTime = dueDay - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    let colorClass = 'text-gray-600'
    let label = due.toLocaleDateString()

    if (diffDays < 0) {
      colorClass = 'text-red-600 font-bold'
      label = `Overdue (${Math.abs(diffDays)}d)`
    } else if (diffDays === 0) {
      colorClass = 'text-orange-600 font-semibold'
      label = 'Due Today'
    } else if (diffDays === 1) {
      colorClass = 'text-yellow-600'
      label = 'Due Tomorrow'
    } else if (diffDays <= 7) {
      colorClass = 'text-yellow-600'
      label = `Due in ${diffDays}d`
    }

    return { label, colorClass }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Tasks
              </h1>
              <p className="mt-2 text-gray-600">Manage and track clinical tasks</p>
            </div>
            <div className="mt-4 sm:mt-0">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Task
              </button>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 mb-6 overflow-hidden">
          <div className="flex flex-wrap border-b border-gray-200">
            {[
              { key: 'MY_TASKS', label: 'My Tasks' },
              { key: 'ALL_TASKS', label: 'All Tasks' },
              { key: 'DUE_TODAY', label: 'Due Today' },
              { key: 'OVERDUE', label: 'Overdue' },
              { key: 'COMPLETED', label: 'Completed' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key)
                  setPage(1)
                  setSelectedTasks([])
                }}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors duration-200 ${
                  activeTab === tab.key
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
          <div className="flex items-center mb-4">
            <FunnelIcon className="h-5 w-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Search & Filter</h3>
          </div>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by patient name or task title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedTasks.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {selectedTasks.length} task(s) selected
            </span>
            <div className="flex space-x-2">
              <button
                onClick={handleBulkComplete}
                disabled={bulkCompleteMutation.isLoading}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50"
              >
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Complete Selected
              </button>
              <button
                onClick={() => setSelectedTasks([])}
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Tasks Table - Desktop */}
        <div className="hidden md:block bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedTasks.length === filteredTasks.length && filteredTasks.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Task Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('priority')}
                      className="flex items-center hover:text-gray-700"
                    >
                      Priority
                      {sortBy === 'priority' && (
                        sortOrder === 'asc' ? <ChevronUpIcon className="h-4 w-4 ml-1" /> : <ChevronDownIcon className="h-4 w-4 ml-1" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('dueDate')}
                      className="flex items-center hover:text-gray-700"
                    >
                      Due Date
                      {sortBy === 'dueDate' && (
                        sortOrder === 'asc' ? <ChevronUpIcon className="h-4 w-4 ml-1" /> : <ChevronDownIcon className="h-4 w-4 ml-1" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-12 text-center">
                      <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
                      <p className="text-gray-500">
                        {searchTerm ? 'Try adjusting your search' : 'No tasks match the current filter'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => {
                    const { label: dueDateLabel, colorClass: dueDateColor } = getDueDateDisplay(task.dueDate)
                    return (
                      <tr
                        key={task.id}
                        className="hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                        onClick={(e) => {
                          if (e.target.type !== 'checkbox' && e.target.tagName !== 'BUTTON') {
                            setSelectedTaskId(task.id)
                          }
                        }}
                      >
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedTasks.includes(task.id)}
                            onChange={() => handleSelectTask(task.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {task.patient?.firstName} {task.patient?.lastName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600">{task.type}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{task.title}</div>
                          {task.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {task.description}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityBadge(task.priority)}`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {task.assignedUsers && task.assignedUsers.length > 0 ? (
                            <div className="flex items-center">
                              <UserIcon className="h-4 w-4 text-gray-400 mr-1" />
                              <span className="text-sm text-gray-900">
                                {task.assignedUsers[0].firstName} {task.assignedUsers[0].lastName}
                              </span>
                              {task.assignedUsers.length > 1 && (
                                <span className="ml-1 text-xs text-gray-500">
                                  +{task.assignedUsers.length - 1}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">Unassigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <ClockIcon className="h-4 w-4 mr-1 text-gray-400" />
                            <span className={`text-sm ${dueDateColor}`}>
                              {dueDateLabel}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(task.status)}`}>
                            {task.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                          {task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
                            <button
                              onClick={() => completeTaskMutation.mutate({ id: task.id, completionNotes: '' })}
                              disabled={completeTaskMutation.isLoading}
                              className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50"
                            >
                              <CheckCircleIcon className="h-3 w-3 mr-1" />
                              Complete
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tasks Cards - Mobile */}
        <div className="md:hidden space-y-4">
          {filteredTasks.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
              <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
              <p className="text-gray-500">
                {searchTerm ? 'Try adjusting your search' : 'No tasks match the current filter'}
              </p>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const { label: dueDateLabel, colorClass: dueDateColor } = getDueDateDisplay(task.dueDate)
              return (
                <div
                  key={task.id}
                  className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 cursor-pointer hover:shadow-xl transition-shadow duration-200"
                  onClick={() => setSelectedTaskId(task.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start space-x-3 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedTasks.includes(task.id)}
                        onChange={() => handleSelectTask(task.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                      />
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{task.title}</h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {task.patient?.firstName} {task.patient?.lastName}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityBadge(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                    <div>
                      <span className="text-gray-500">Type:</span>
                      <span className="ml-1 text-gray-900">{task.type}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Status:</span>
                      <span className={`ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(task.status)}`}>
                        {task.status}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500">Due:</span>
                      <span className={`ml-1 ${dueDateColor}`}>{dueDateLabel}</span>
                    </div>
                    {task.assignedUsers && task.assignedUsers.length > 0 && (
                      <div className="col-span-2">
                        <span className="text-gray-500">Assigned:</span>
                        <span className="ml-1 text-gray-900">
                          {task.assignedUsers[0].firstName} {task.assignedUsers[0].lastName}
                          {task.assignedUsers.length > 1 && ` +${task.assignedUsers.length - 1}`}
                        </span>
                      </div>
                    )}
                  </div>

                  {task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        completeTaskMutation.mutate({ id: task.id, completionNotes: '' })
                      }}
                      disabled={completeTaskMutation.isLoading}
                      className="w-full inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50"
                    >
                      <CheckCircleIcon className="h-4 w-4 mr-2" />
                      Complete Task
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="mt-8 flex justify-center">
            <nav className="flex items-center space-x-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-gray-700">
                Page {page} of {pagination.pages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === pagination.pages}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Next
              </button>
            </nav>
          </div>
        )}

        {/* Task Creation Modal */}
        <TaskModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />

        {/* Task Detail Modal */}
        <TaskDetailModal
          isOpen={!!selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          taskId={selectedTaskId}
        />
      </div>
    </div>
  )
}
