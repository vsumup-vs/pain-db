import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

const ObservationReview = () => {
  const queryClient = useQueryClient();
  const [selectedObservations, setSelectedObservations] = useState(new Set());
  const [expandedPatients, setExpandedPatients] = useState(new Set());
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [flaggingObservation, setFlaggingObservation] = useState(null);
  const [flagNotes, setFlagNotes] = useState('');
  const [patientReviewModalOpen, setPatientReviewModalOpen] = useState(false);
  const [reviewingPatient, setReviewingPatient] = useState(null);
  const [patientReviewNotes, setPatientReviewNotes] = useState('');
  const [filters, setFilters] = useState({
    enrollmentId: '',
    metricId: '',
    limit: 100, // Increased from 50 for better UX (fewer pagination clicks)
    offset: 0
  });

  // Fetch unreviewed observations
  const { data, isLoading, error } = useQuery({
    queryKey: ['unreviewed-observations', filters],
    queryFn: () => api.getUnreviewedObservations(filters)
  });

  // Fetch enrollments for filter dropdown
  const { data: enrollmentsData } = useQuery({
    queryKey: ['enrollments'],
    queryFn: () => api.getEnrollments({ limit: 100 })
  });

  // Fetch metrics for filter dropdown
  const { data: metricsData } = useQuery({
    queryKey: ['metrics'],
    queryFn: () => api.getMetricDefinitions({ limit: 100 })
  });

  // Review single observation mutation
  const reviewMutation = useMutation({
    mutationFn: (observationId) => api.reviewObservation(observationId, {}),
    onSuccess: () => {
      queryClient.invalidateQueries(['unreviewed-observations']);
      queryClient.invalidateQueries(['observations']);
    }
  });

  // Bulk review mutation
  const bulkReviewMutation = useMutation({
    mutationFn: ({ observationIds, reviewNotes }) =>
      api.bulkReviewObservations({ observationIds, reviewNotes }),
    onSuccess: () => {
      queryClient.invalidateQueries(['unreviewed-observations']);
      queryClient.invalidateQueries(['observations']);
      setSelectedObservations(new Set());
      setPatientReviewModalOpen(false);
      setReviewingPatient(null);
      setPatientReviewNotes('');
    }
  });

  // Flag observation mutation
  const flagMutation = useMutation({
    mutationFn: ({ observationId, reviewNotes }) =>
      api.flagObservation(observationId, { reviewNotes }),
    onSuccess: () => {
      queryClient.invalidateQueries(['unreviewed-observations']);
      queryClient.invalidateQueries(['observations']);
      setFlagModalOpen(false);
      setFlaggingObservation(null);
      setFlagNotes('');
    }
  });

  const observations = data?.data || [];
  const pagination = data?.pagination || {};

  // Group observations by patient
  const patientGroups = useMemo(() => {
    const groups = {};
    observations.forEach(obs => {
      const patientKey = obs.patient?.id;
      if (!patientKey) return;

      if (!groups[patientKey]) {
        groups[patientKey] = {
          patient: obs.patient,
          observations: [],
          latestDate: obs.recordedAt
        };
      }
      groups[patientKey].observations.push(obs);

      // Track latest observation date
      if (new Date(obs.recordedAt) > new Date(groups[patientKey].latestDate)) {
        groups[patientKey].latestDate = obs.recordedAt;
      }
    });

    // Sort by latest observation date (most recent first)
    return Object.entries(groups)
      .sort(([, a], [, b]) => new Date(b.latestDate) - new Date(a.latestDate))
      .map(([key, value]) => ({ patientId: key, ...value }));
  }, [observations]);

  // Toggle patient expansion
  const togglePatientExpansion = (patientId) => {
    const newExpanded = new Set(expandedPatients);
    if (newExpanded.has(patientId)) {
      newExpanded.delete(patientId);
    } else {
      newExpanded.add(patientId);
    }
    setExpandedPatients(newExpanded);
  };

  // Handle select all checkbox
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedObservations(new Set(observations.map(obs => obs.id)));
    } else {
      setSelectedObservations(new Set());
    }
  };

  // Handle select all for patient
  const handleSelectAllForPatient = (patientId, e) => {
    e.stopPropagation();
    const patientObs = patientGroups.find(g => g.patientId === patientId)?.observations || [];
    const newSelected = new Set(selectedObservations);

    const allSelected = patientObs.every(obs => newSelected.has(obs.id));

    if (allSelected) {
      // Deselect all for this patient
      patientObs.forEach(obs => newSelected.delete(obs.id));
    } else {
      // Select all for this patient
      patientObs.forEach(obs => newSelected.add(obs.id));
    }

    setSelectedObservations(newSelected);
  };

  // Handle individual checkbox
  const handleSelectObservation = (observationId) => {
    const newSelected = new Set(selectedObservations);
    if (newSelected.has(observationId)) {
      newSelected.delete(observationId);
    } else {
      newSelected.add(observationId);
    }
    setSelectedObservations(newSelected);
  };

  // Handle review single observation
  const handleReview = (observationId) => {
    if (confirm('Mark this observation as reviewed?')) {
      reviewMutation.mutate(observationId);
    }
  };

  // Handle review all for patient
  const handleReviewAllForPatient = (patientGroup) => {
    setReviewingPatient(patientGroup);
    setPatientReviewNotes('');
    setPatientReviewModalOpen(true);
  };

  // Submit patient review
  const handleSubmitPatientReview = (e) => {
    e.preventDefault();
    if (!patientReviewNotes || patientReviewNotes.trim().length < 10) {
      alert('Please provide review notes (minimum 10 characters) explaining your clinical decision for this patient.');
      return;
    }

    const observationIds = reviewingPatient.observations.map(obs => obs.id);
    bulkReviewMutation.mutate({
      observationIds,
      reviewNotes: patientReviewNotes.trim()
    });
  };

  // Handle bulk review
  const handleBulkReview = () => {
    if (selectedObservations.size === 0) {
      alert('Please select observations to review');
      return;
    }

    const notes = prompt('Review notes (recommended for compliance):');
    if (notes === null) return; // Cancelled

    bulkReviewMutation.mutate({
      observationIds: Array.from(selectedObservations),
      reviewNotes: notes || 'Bulk reviewed via Review Queue'
    });
  };

  // Handle flag observation
  const handleFlag = (observation) => {
    setFlaggingObservation(observation);
    setFlagModalOpen(true);
  };

  // Submit flag
  const handleSubmitFlag = (e) => {
    e.preventDefault();
    if (flagNotes.trim().length < 10) {
      alert('Please provide at least 10 characters for flag notes');
      return;
    }
    flagMutation.mutate({
      observationId: flaggingObservation.id,
      reviewNotes: flagNotes.trim()
    });
  };

  // Handle pagination
  const handlePreviousPage = () => {
    setFilters(prev => ({
      ...prev,
      offset: Math.max(0, prev.offset - prev.limit)
    }));
  };

  const handleNextPage = () => {
    setFilters(prev => ({
      ...prev,
      offset: prev.offset + prev.limit
    }));
  };

  // Format value for display
  const formatValue = (value, unit) => {
    if (typeof value === 'object' && value !== null) {
      // Extract value from stored format: {"numeric": 1}, {"text": "...}, etc.
      if ('numeric' in value) return unit ? `${value.numeric} ${unit}` : value.numeric;
      if ('text' in value) return value.text;
      if ('boolean' in value) return value.boolean ? 'Yes' : 'No';
      if ('categorical' in value) return value.categorical;
      if ('ordinal' in value) return value.ordinal;
      if ('date' in value) return new Date(value.date).toLocaleDateString();
      if ('time' in value) return value.time;
      if ('datetime' in value) return new Date(value.datetime).toLocaleString();
      if ('json' in value) return JSON.stringify(value.json);
      if ('value' in value) return unit ? `${value.value} ${unit}` : value.value;
      return JSON.stringify(value);
    }
    return unit ? `${value} ${unit}` : value;
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  // Get time ago string
  const getTimeAgo = (timestamp) => {
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
    if (seconds < 60) return `${seconds} seconds ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-600">Loading unreviewed observations...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Error loading observations: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Observation Review Queue</h1>
        <p className="text-gray-600 mt-1">
          Review pending observations grouped by patient. Observations auto-reviewed when alerts are resolved.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Enrollment
            </label>
            <select
              value={filters.enrollmentId}
              onChange={(e) => setFilters({ ...filters, enrollmentId: e.target.value, offset: 0 })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Enrollments</option>
              {enrollmentsData?.data?.map(enrollment => (
                <option key={enrollment.id} value={enrollment.id}>
                  {enrollment.patient?.firstName} {enrollment.patient?.lastName} - {enrollment.careProgram?.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Metric
            </label>
            <select
              value={filters.metricId}
              onChange={(e) => setFilters({ ...filters, metricId: e.target.value, offset: 0 })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Metrics</option>
              {metricsData?.data?.map(metric => (
                <option key={metric.id} value={metric.id}>
                  {metric.displayName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setFilters({ enrollmentId: '', metricId: '', limit: 50, offset: 0 })}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedObservations.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-blue-900 font-medium">
              {selectedObservations.size} observation{selectedObservations.size !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={handleBulkReview}
              disabled={bulkReviewMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {bulkReviewMutation.isPending ? 'Reviewing...' : 'Mark as Reviewed'}
            </button>
          </div>
        </div>
      )}

      {/* Patient-Grouped Observations */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {patientGroups.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <div className="flex flex-col items-center">
              <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-lg font-medium">No observations to review</p>
              <p className="text-sm text-gray-500 mt-1">
                All observations have been reviewed or are being handled via alerts
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {patientGroups.map((group) => {
              const isExpanded = expandedPatients.has(group.patientId);
              const allSelected = group.observations.every(obs => selectedObservations.has(obs.id));
              const someSelected = group.observations.some(obs => selectedObservations.has(obs.id)) && !allSelected;

              return (
                <div key={group.patientId} className="hover:bg-gray-50">
                  {/* Patient Header Row */}
                  <div
                    className="px-6 py-4 cursor-pointer flex items-center justify-between"
                    onClick={() => togglePatientExpansion(group.patientId)}
                  >
                    <div className="flex items-center space-x-4">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={input => {
                          if (input) input.indeterminate = someSelected;
                        }}
                        onChange={(e) => handleSelectAllForPatient(group.patientId, e)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />

                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'transform rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>

                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {group.patient?.firstName} {group.patient?.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          DOB: {group.patient?.dateOfBirth ? new Date(group.patient.dateOfBirth).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {group.observations.length} observation{group.observations.length !== 1 ? 's' : ''}
                        </span>
                        <span className="text-sm text-gray-500">
                          Last: {getTimeAgo(group.latestDate)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReviewAllForPatient(group);
                        }}
                        className="px-3 py-1.5 text-sm text-green-700 bg-green-100 rounded-md hover:bg-green-200"
                      >
                        ✓ Review All ({group.observations.length})
                      </button>
                    </div>
                  </div>

                  {/* Expanded Observations */}
                  {isExpanded && (
                    <div className="bg-gray-50 px-6 pb-4">
                      <table className="min-w-full">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Metric</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Program</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Recorded At</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {group.observations.map((observation) => (
                            <tr key={observation.id} className="hover:bg-white">
                              <td className="px-4 py-3">
                                <div className="text-sm text-gray-900">
                                  {observation.metric?.displayName}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {formatValue(observation.value, observation.metric?.unit)}
                                </div>
                                {observation.metric?.normalRange && (
                                  <div className="text-xs text-gray-500">
                                    Normal: {observation.metric.normalRange.min} - {observation.metric.normalRange.max}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm text-gray-900">
                                  {observation.enrollment?.careProgram?.name || 'N/A'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {observation.enrollment?.careProgram?.type}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {formatTimestamp(observation.recordedAt)}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleReview(observation.id)}
                                    disabled={reviewMutation.isPending}
                                    className="text-green-600 hover:text-green-900 text-sm font-medium disabled:opacity-50"
                                    title="Mark as reviewed"
                                  >
                                    ✓ Review
                                  </button>
                                  <button
                                    onClick={() => handleFlag(observation)}
                                    disabled={flagMutation.isPending}
                                    className="text-orange-600 hover:text-orange-900 text-sm font-medium disabled:opacity-50"
                                    title="Flag for follow-up"
                                  >
                                    🚩 Flag
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.total > 0 && (
          <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} observations
              ({patientGroups.length} patient{patientGroups.length !== 1 ? 's' : ''})
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handlePreviousPage}
                disabled={pagination.offset === 0}
                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={handleNextPage}
                disabled={!pagination.hasMore}
                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Patient Review Modal */}
      {patientReviewModalOpen && reviewingPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Review All Observations for {reviewingPatient.patient?.firstName} {reviewingPatient.patient?.lastName}
            </h3>

            {/* Trend Visualization */}
            {(() => {
              // Group observations by metric for trend analysis
              const metricGroups = {};
              reviewingPatient.observations.forEach(obs => {
                const metricKey = obs.metric?.id;
                if (!metricKey) return;

                if (!metricGroups[metricKey]) {
                  metricGroups[metricKey] = {
                    metric: obs.metric,
                    observations: []
                  };
                }
                metricGroups[metricKey].observations.push(obs);
              });

              // Render trend chart for each metric
              return Object.values(metricGroups).map((group, idx) => {
                // Only show trend for numeric metrics with multiple observations
                if (group.metric?.valueType !== 'numeric' || group.observations.length < 2) {
                  return null;
                }

                // Sort by date
                const sortedObs = [...group.observations].sort((a, b) =>
                  new Date(a.recordedAt) - new Date(b.recordedAt)
                );

                // Extract numeric values
                const values = sortedObs.map(obs => {
                  const val = obs.value;
                  if (typeof val === 'object' && val !== null && 'value' in val) {
                    return parseFloat(val.value);
                  }
                  return parseFloat(val);
                }).filter(v => !isNaN(v));

                if (values.length < 2) return null;

                const minValue = Math.min(...values);
                const maxValue = Math.max(...values);
                const range = maxValue - minValue || 1;
                const avgValue = values.reduce((sum, v) => sum + v, 0) / values.length;

                // Chart dimensions
                const width = 600;
                const height = 120;
                const padding = { top: 20, right: 40, bottom: 30, left: 50 };
                const chartWidth = width - padding.left - padding.right;
                const chartHeight = height - padding.top - padding.bottom;

                // Generate path points
                const points = values.map((value, i) => {
                  const x = padding.left + (i / (values.length - 1)) * chartWidth;
                  const y = padding.top + chartHeight - ((value - minValue) / range) * chartHeight;
                  return { x, y, value };
                });

                const pathData = points.map((p, i) =>
                  `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
                ).join(' ');

                // Determine trend direction
                const firstValue = values[0];
                const lastValue = values[values.length - 1];
                const change = lastValue - firstValue;
                const changePercent = (change / firstValue * 100).toFixed(1);
                const trendColor = change > 0 ? 'text-red-600' : change < 0 ? 'text-green-600' : 'text-gray-600';
                const trendIcon = change > 0 ? '↑' : change < 0 ? '↓' : '→';

                return (
                  <div key={idx} className="mb-4 border border-gray-200 rounded-lg p-4 bg-gradient-to-br from-blue-50 to-indigo-50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">
                          {group.metric.displayName} Trend
                        </h4>
                        <p className="text-xs text-gray-600">
                          {values.length} readings • Avg: {avgValue.toFixed(1)} {group.metric.unit}
                        </p>
                      </div>
                      <div className={`text-sm font-semibold ${trendColor}`}>
                        {trendIcon} {changePercent}%
                      </div>
                    </div>

                    <svg width={width} height={height} className="w-full">
                      {/* Grid lines */}
                      <line
                        x1={padding.left}
                        y1={padding.top}
                        x2={padding.left}
                        y2={height - padding.bottom}
                        stroke="#e5e7eb"
                        strokeWidth="1"
                      />
                      <line
                        x1={padding.left}
                        y1={height - padding.bottom}
                        x2={width - padding.right}
                        y2={height - padding.bottom}
                        stroke="#e5e7eb"
                        strokeWidth="1"
                      />

                      {/* Average line */}
                      <line
                        x1={padding.left}
                        y1={padding.top + chartHeight - ((avgValue - minValue) / range) * chartHeight}
                        x2={width - padding.right}
                        y2={padding.top + chartHeight - ((avgValue - minValue) / range) * chartHeight}
                        stroke="#9ca3af"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                      />

                      {/* Trend line */}
                      <path
                        d={pathData}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Data points */}
                      {points.map((p, i) => (
                        <g key={i}>
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r="4"
                            fill="#3b82f6"
                            stroke="white"
                            strokeWidth="2"
                          />
                          <title>{p.value.toFixed(1)} {group.metric.unit}</title>
                        </g>
                      ))}

                      {/* Y-axis labels */}
                      <text
                        x={padding.left - 10}
                        y={padding.top}
                        textAnchor="end"
                        className="text-xs fill-gray-600"
                      >
                        {maxValue.toFixed(0)}
                      </text>
                      <text
                        x={padding.left - 10}
                        y={height - padding.bottom}
                        textAnchor="end"
                        className="text-xs fill-gray-600"
                      >
                        {minValue.toFixed(0)}
                      </text>
                      <text
                        x={padding.left - 10}
                        y={padding.top + chartHeight - ((avgValue - minValue) / range) * chartHeight}
                        textAnchor="end"
                        className="text-xs fill-gray-500"
                      >
                        Avg
                      </text>

                      {/* X-axis labels (first and last date) */}
                      <text
                        x={padding.left}
                        y={height - 5}
                        textAnchor="start"
                        className="text-xs fill-gray-600"
                      >
                        {new Date(sortedObs[0].recordedAt).toLocaleDateString()}
                      </text>
                      <text
                        x={width - padding.right}
                        y={height - 5}
                        textAnchor="end"
                        className="text-xs fill-gray-600"
                      >
                        {new Date(sortedObs[sortedObs.length - 1].recordedAt).toLocaleDateString()}
                      </text>
                    </svg>
                  </div>
                );
              });
            })()}

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                You are reviewing <strong>{reviewingPatient.observations.length} observations</strong>:
              </p>
              <div className="bg-gray-50 rounded-md p-3 max-h-40 overflow-y-auto">
                {reviewingPatient.observations.map((obs, index) => (
                  <div key={obs.id} className="text-sm text-gray-700 mb-1">
                    {index + 1}. {obs.metric?.displayName}: {formatValue(obs.value, obs.metric?.unit)}
                    <span className="text-gray-500 ml-2">({new Date(obs.recordedAt).toLocaleString()})</span>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmitPatientReview}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Clinical Notes (minimum 10 characters) <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Document your clinical decision. Example: "BP readings trending high (avg 145/92) despite medication compliance. Counseled patient on sodium reduction and stress management. Will monitor for 3 days and escalate if no improvement."
              </p>
              <textarea
                value={patientReviewNotes}
                onChange={(e) => setPatientReviewNotes(e.target.value)}
                rows={6}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Document your clinical assessment and decision for this patient's observations..."
                required
              />
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setPatientReviewModalOpen(false);
                    setReviewingPatient(null);
                    setPatientReviewNotes('');
                  }}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkReviewMutation.isPending || patientReviewNotes.trim().length < 10}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {bulkReviewMutation.isPending ? 'Reviewing...' : `Review All ${reviewingPatient.observations.length} Observations`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Flag Modal */}
      {flagModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Flag Observation for Follow-up
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Patient: {flaggingObservation?.patient?.firstName} {flaggingObservation?.patient?.lastName}<br />
              Metric: {flaggingObservation?.metric?.displayName}<br />
              Value: {formatValue(flaggingObservation?.value, flaggingObservation?.metric?.unit)}
            </p>
            <form onSubmit={handleSubmitFlag}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (minimum 10 characters) *
              </label>
              <textarea
                value={flagNotes}
                onChange={(e) => setFlagNotes(e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Why is this observation being flagged? What follow-up is needed?"
                required
              />
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setFlagModalOpen(false);
                    setFlaggingObservation(null);
                    setFlagNotes('');
                  }}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={flagMutation.isPending || flagNotes.trim().length < 10}
                  className="px-4 py-2 text-sm bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
                >
                  {flagMutation.isPending ? 'Flagging...' : 'Flag Observation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ObservationReview;
