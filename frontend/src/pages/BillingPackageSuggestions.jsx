import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';

export default function BillingPackageSuggestions() {
  const queryClient = useQueryClient();
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [expandedSuggestion, setExpandedSuggestion] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(null);
  const [selectedPrograms, setSelectedPrograms] = useState({}); // Track selected program per suggestion

  // Get recent patients for filter dropdown
  const { data: patientsResponse } = useQuery({
    queryKey: ['recent-patients'],
    queryFn: () => api.getRecentPatients({ limit: 100 })
  });

  // Extract patients array from response
  const patients = patientsResponse?.data || [];

  // Get suggestions history (all or filtered by patient)
  const { data: suggestionsResponse, isLoading } = useQuery({
    queryKey: ['suggestion-history', selectedPatient],
    queryFn: () => api.getSuggestionHistory({
      patientId: selectedPatient,
      limit: 50
    })
  });

  // Extract suggestions array from response
  const suggestions = suggestionsResponse?.data || [];

  // Approve suggestion mutation
  const approveMutation = useMutation({
    mutationFn: ({ suggestionId, clinicianId, selectedProgramType }) =>
      api.approveSuggestion(suggestionId, { clinicianId, selectedProgramType }),
    onSuccess: () => {
      queryClient.invalidateQueries(['suggestion-history']);
      alert('Suggestion approved successfully! Enrollment created.');
    },
    onError: (error) => {
      alert(`Error approving suggestion: ${error.response?.data?.message || error.message}`);
    }
  });

  // Reject suggestion mutation
  const rejectMutation = useMutation({
    mutationFn: ({ suggestionId, rejectionReason }) =>
      api.rejectSuggestion(suggestionId, { rejectionReason }),
    onSuccess: () => {
      queryClient.invalidateQueries(['suggestion-history']);
      setShowRejectModal(null);
      setRejectionReason('');
      alert('Suggestion rejected.');
    },
    onError: (error) => {
      alert(`Error rejecting suggestion: ${error.response?.data?.message || error.message}`);
    }
  });

  const handleApprove = (suggestionId) => {
    const user = api.getCurrentUser();
    if (!user || !user.clinicianId) {
      alert('No clinician ID found. Please ensure you are logged in as a clinician.');
      return;
    }

    const selectedProgramType = selectedPrograms[suggestionId];
    if (!selectedProgramType) {
      alert('Please select a billing program before approving.');
      return;
    }

    if (confirm(`Approve this billing package suggestion for ${selectedProgramType} program? This will create an enrollment for the patient.`)) {
      approveMutation.mutate({
        suggestionId,
        clinicianId: user.clinicianId,
        selectedProgramType
      });
    }
  };

  const handleReject = (suggestionId) => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }

    rejectMutation.mutate({ suggestionId, rejectionReason });
  };

  const getStatusBadge = (status) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const getMatchScoreBadge = (score) => {
    let colorClass = 'bg-gray-100 text-gray-800';
    if (score >= 80) colorClass = 'bg-green-100 text-green-800';
    else if (score >= 60) colorClass = 'bg-blue-100 text-blue-800';
    else if (score >= 40) colorClass = 'bg-yellow-100 text-yellow-800';
    else colorClass = 'bg-orange-100 text-orange-800';

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
        {score}% Match
      </span>
    );
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Billing Package Suggestions</h1>
          <p className="mt-2 text-sm text-gray-700">
            Automatic billing package suggestions based on patient diagnosis codes
          </p>
        </div>
      </div>

      {/* Filter by Patient */}
      <div className="mt-6 bg-white shadow rounded-lg p-4">
        <label htmlFor="patient-filter" className="block text-sm font-medium text-gray-700">
          Filter by Patient
        </label>
        <select
          id="patient-filter"
          value={selectedPatient || ''}
          onChange={(e) => setSelectedPatient(e.target.value || null)}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        >
          <option value="">All Patients</option>
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.firstName} {patient.lastName} - MRN: {patient.medicalRecordNumber}
            </option>
          ))}
        </select>
      </div>

      {/* Suggestions List */}
      <div className="mt-8 space-y-4">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-2 text-sm text-gray-500">Loading suggestions...</p>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-12 bg-white shadow rounded-lg">
            <InformationCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No suggestions found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {selectedPatient
                ? 'No billing package suggestions for this patient.'
                : 'No billing package suggestions available.'}
            </p>
          </div>
        ) : (
          suggestions.map((suggestion) => (
            <div key={suggestion.id} className="bg-white shadow rounded-lg overflow-hidden">
              {/* Suggestion Header */}
              <div className="px-4 py-5 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-medium text-gray-900">
                        {suggestion.patient?.firstName} {suggestion.patient?.lastName}
                      </h3>
                      {getStatusBadge(suggestion.status)}
                      {getMatchScoreBadge(parseFloat(suggestion.matchScore))}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      MRN: {suggestion.patient?.medicalRecordNumber} |
                      Created: {new Date(suggestion.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => setExpandedSuggestion(
                      expandedSuggestion === suggestion.id ? null : suggestion.id
                    )}
                    className="ml-4 p-2 text-gray-400 hover:text-gray-600"
                  >
                    {expandedSuggestion === suggestion.id ? (
                      <ChevronUpIcon className="h-5 w-5" />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Package Info */}
              <div className="border-t border-gray-200 px-4 py-4 sm:px-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Package</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {suggestion.metadata?.packageName} ({suggestion.metadata?.packageCode})
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Category</dt>
                    <dd className="mt-1 text-sm text-gray-900">{suggestion.metadata?.category}</dd>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedSuggestion === suggestion.id && (
                <div className="border-t border-gray-200 bg-gray-50 px-4 py-5 sm:px-6">
                  {/* Matched Diagnoses */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Matched Diagnoses</h4>
                    <div className="space-y-2">
                      {suggestion.matchedDiagnoses?.primary?.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700">Primary:</p>
                          <ul className="mt-1 list-disc list-inside text-sm text-gray-600">
                            {suggestion.matchedDiagnoses.primary.map((dx, idx) => (
                              <li key={idx}>
                                {dx.patientCode} - {dx.patientDisplay}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {suggestion.matchedDiagnoses?.secondary?.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700">Secondary:</p>
                          <ul className="mt-1 list-disc list-inside text-sm text-gray-600">
                            {suggestion.matchedDiagnoses.secondary.map((dx, idx) => (
                              <li key={idx}>
                                {dx.patientCode} - {dx.patientDisplay}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Suggested Programs */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Select Billing Program {suggestion.status === 'PENDING' && <span className="text-red-600">*</span>}
                    </h4>
                    <div className="space-y-2">
                      {suggestion.suggestedPrograms?.programs?.map((program, idx) => (
                        <label
                          key={idx}
                          className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                            selectedPrograms[suggestion.id] === program.programType
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          } ${suggestion.status !== 'PENDING' ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <input
                            type="radio"
                            name={`program-${suggestion.id}`}
                            value={program.programType}
                            checked={selectedPrograms[suggestion.id] === program.programType}
                            onChange={(e) => {
                              if (suggestion.status === 'PENDING') {
                                setSelectedPrograms(prev => ({
                                  ...prev,
                                  [suggestion.id]: e.target.value
                                }));
                              }
                            }}
                            disabled={suggestion.status !== 'PENDING'}
                            className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                          />
                          <div className="ml-3 flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {program.programType}: {program.billingProgramCode}
                            </p>
                            <p className="mt-1 text-xs text-gray-600">
                              CPT Codes: {program.cptCodes?.join(', ')}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Clinical Rationale */}
                  {suggestion.metadata?.clinicalRationale && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Clinical Rationale</h4>
                      <p className="text-sm text-gray-600">{suggestion.metadata.clinicalRationale}</p>
                    </div>
                  )}

                  {/* Rejection Reason (if rejected) */}
                  {suggestion.status === 'REJECTED' && suggestion.rejectionReason && (
                    <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
                      <h4 className="text-sm font-medium text-red-900 mb-1">Rejection Reason</h4>
                      <p className="text-sm text-red-700">{suggestion.rejectionReason}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {suggestion.status === 'PENDING' && (
                    <div className="mt-4 flex space-x-3">
                      <button
                        onClick={() => handleApprove(suggestion.id)}
                        disabled={approveMutation.isPending}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                      >
                        <CheckCircleIcon className="h-5 w-5 mr-2" />
                        {approveMutation.isPending ? 'Approving...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => setShowRejectModal(suggestion.id)}
                        disabled={rejectMutation.isPending}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                      >
                        <XCircleIcon className="h-5 w-5 mr-2" />
                        Reject
                      </button>
                    </div>
                  )}

                  {/* Approved Info */}
                  {suggestion.status === 'APPROVED' && (
                    <div className="mt-4 bg-green-50 border border-green-200 rounded-md p-3">
                      <p className="text-sm text-green-900">
                        <CheckCircleIcon className="h-5 w-5 inline mr-1" />
                        Approved on {new Date(suggestion.reviewedAt).toLocaleDateString()}
                      </p>
                      {suggestion.createdEnrollmentIds?.length > 0 && (
                        <p className="mt-1 text-xs text-green-700">
                          Created {suggestion.createdEnrollmentIds.length} enrollment(s)
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Reject Suggestion
                </h3>
                <div className="mt-2">
                  <label htmlFor="rejection-reason" className="block text-sm font-medium text-gray-700">
                    Reason for rejection
                  </label>
                  <textarea
                    id="rejection-reason"
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="Explain why this suggestion is being rejected..."
                  />
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  type="button"
                  onClick={() => handleReject(showRejectModal)}
                  disabled={rejectMutation.isPending || !rejectionReason.trim()}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:col-start-2 sm:text-sm disabled:opacity-50"
                >
                  {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRejectModal(null);
                    setRejectionReason('');
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
