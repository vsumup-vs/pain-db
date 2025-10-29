import axios from 'axios'

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('authToken')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Unified API object
export const api = {
  // Authentication
  login: (credentials) => apiClient.post('/auth/login', credentials),
  register: (userData) => apiClient.post('/auth/register', userData),
  logout: () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    return apiClient.post('/auth/logout')
  },
  refreshToken: () => apiClient.post('/auth/refresh'),
  getCurrentUser: () => {
    const user = localStorage.getItem('user')
    return user ? JSON.parse(user) : null
  },
  getCurrentUserProfile: () => apiClient.get('/auth/me'),
  isAuthenticated: () => {
    return !!localStorage.getItem('authToken')
  },

  // Patients
  getPatients: (params) => apiClient.get('/patients', { params }),
  getRecentPatients: (params) => apiClient.get('/patients/recent', { params }),
  getPatient: (id) => apiClient.get(`/patients/${id}`),
  getPatientContext: (id, params) => apiClient.get(`/patients/${id}/context`, { params }),
  createPatient: (data) => apiClient.post('/patients', data),
  updatePatient: (id, data) => apiClient.put(`/patients/${id}`, data),
  deletePatient: (id) => apiClient.delete(`/patients/${id}`),
  getPatientsStats: () => apiClient.get('/patients/stats'),

  // Clinicians
  getClinicians: (params) => apiClient.get('/clinicians', { params }),
  getClinician: (id) => apiClient.get(`/clinicians/${id}`),
  createClinician: (data) => apiClient.post('/clinicians', data),
  updateClinician: (id, data) => apiClient.put(`/clinicians/${id}`, data),
  deleteClinician: (id) => apiClient.delete(`/clinicians/${id}`),
  getCliniciansStats: () => apiClient.get('/clinicians/stats'),
  getSpecializations: () => apiClient.get('/clinicians/specializations'),

  // Metric Definitions
  getMetricDefinitions: (params = {}) => apiClient.get('/metric-definitions', {
    params: { limit: 100, ...params }
  }),
  getMetricDefinition: (id) => apiClient.get(`/metric-definitions/${id}`),
  createMetricDefinition: (data) => apiClient.post('/metric-definitions', data),
  updateMetricDefinition: (id, data) => apiClient.put(`/metric-definitions/${id}`, data),
  deleteMetricDefinition: (id) => apiClient.delete(`/metric-definitions/${id}`),
  getMetricDefinitionsStats: () => apiClient.get('/metric-definitions/stats'),
  customizeMetricDefinition: (id) => apiClient.post(`/metric-definitions/${id}/customize`),

  // Assessment Templates
  getAssessmentTemplates: (params) => apiClient.get('/assessment-templates', { params }),
  getAssessmentTemplate: (id) => apiClient.get(`/assessment-templates/${id}`),
  createAssessmentTemplate: (data) => apiClient.post('/assessment-templates', data),
  updateAssessmentTemplate: (id, data) => apiClient.put(`/assessment-templates/${id}`, data),
  deleteAssessmentTemplate: (id) => apiClient.delete(`/assessment-templates/${id}`),
  customizeAssessmentTemplate: (id) => apiClient.post(`/assessment-templates/${id}/customize`),

  // Enhanced Assessment Templates (v2 with standardization support)
  // Assessment Templates
  getAssessmentTemplatesV2: (params) => apiClient.get('/assessment-templates-v2', { params }),
  getStandardizedTemplates: (params) => apiClient.get('/assessment-templates-v2/standardized', { params }),
  getCustomTemplates: (params) => apiClient.get('/assessment-templates-v2/custom', { params }),
  getTemplateCategories: () => apiClient.get('/assessment-templates-v2/categories'),
  getAssessmentTemplateV2: (id) => apiClient.get(`/assessment-templates-v2/${id}`),

  // Condition Presets
  getConditionPresets: (params) => apiClient.get('/condition-presets', { params }),
  getConditionPreset: (id) => apiClient.get(`/condition-presets/${id}`),
  createConditionPreset: (data) => apiClient.post('/condition-presets', data),
  updateConditionPreset: (id, data) => apiClient.put(`/condition-presets/${id}`, data),
  deleteConditionPreset: (id) => apiClient.delete(`/condition-presets/${id}`),
  getConditionPresetsStats: () => apiClient.get('/condition-presets/stats'),
  customizeConditionPreset: (id) => apiClient.post(`/condition-presets/${id}/customize`),

  // Care Programs
  getCarePrograms: (params) => apiClient.get('/care-programs', { params }),
  getCareProgram: (id) => apiClient.get(`/care-programs/${id}`),
  createCareProgram: (data) => apiClient.post('/care-programs', data),
  updateCareProgram: (id, data) => apiClient.put(`/care-programs/${id}`, data),
  deleteCareProgram: (id) => apiClient.delete(`/care-programs/${id}`),

  // Alert Rules
  getAlertRules: (params) => apiClient.get('/alert-rules', { params }),
  getAlertRule: (id) => apiClient.get(`/alert-rules/${id}`),
  createAlertRule: (data) => apiClient.post('/alert-rules', data),
  updateAlertRule: (id, data) => apiClient.put(`/alert-rules/${id}`, data),
  deleteAlertRule: (id) => apiClient.delete(`/alert-rules/${id}`),
  getAlertRuleStats: () => apiClient.get('/alert-rules/stats'),
  getAlertRuleTemplates: () => apiClient.get('/alert-rules/templates'),
  customizeAlertRule: (id) => apiClient.post(`/alert-rules/${id}/customize`),

  // Observations
  getObservations: (params) => apiClient.get('/observations', { params }),
  getObservation: (id) => apiClient.get(`/observations/${id}`),
  createObservation: (data) => apiClient.post('/observations', data),
  updateObservation: (id, data) => apiClient.put(`/observations/${id}`, data),
  deleteObservation: (id) => apiClient.delete(`/observations/${id}`),
  getObservationStats: () => apiClient.get('/observations/stats'),
  getPatientObservationHistory: (patientId, params) => apiClient.get(`/observations/patient/${patientId}/history`, { params }),
  getObservationsByEnrollment: (enrollmentId) => apiClient.get(`/observations/enrollment/${enrollmentId}`),

  // Observation Review (RPM Workflow)
  getUnreviewedObservations: (params) => apiClient.get('/observations/review/unreviewed', { params }),
  reviewObservation: (observationId, data) => apiClient.post(`/observations/review/${observationId}`, data),
  bulkReviewObservations: (data) => apiClient.post('/observations/review/bulk', data),
  flagObservation: (observationId, data) => apiClient.post(`/observations/review/${observationId}/flag`, data),

  // Smart Assessment Continuity System
  // Assessment continuity endpoints
  createAssessmentWithContinuity: (data) => apiClient.post('/continuity/assessments/with-continuity', data),
  getContinuitySuggestions: (patientId, params) => apiClient.get(`/continuity/patients/${patientId}/continuity-suggestions`, { params }),
  getContinuityHistory: (patientId, params) => apiClient.get(`/continuity/patients/${patientId}/continuity-history`, { params }),
  
  // Observation context endpoints
  createObservationWithContext: (data) => apiClient.post('/continuity/observations/with-context', data),
  getObservationsWithContext: (patientId, params) => apiClient.get(`/continuity/patients/${patientId}/observations/context`, { params }),
  updateProviderReview: (observationId, data) => apiClient.patch(`/continuity/observations/${observationId}/review`, data),

  // Admin - Organizations (SUPER_ADMIN only)
  getOrganizations: (params) => apiClient.get('/organizations', { params }),
  getOrganization: (id) => apiClient.get(`/organizations/${id}`),
  getPlatformUsageStats: () => apiClient.get('/organizations/platform-usage'),
  createOrganization: (data) => apiClient.post('/organizations', data),
  updateOrganization: (id, data) => apiClient.put(`/organizations/${id}`, data),
  deleteOrganization: (id) => apiClient.delete(`/organizations/${id}`),

  // Organization Branding (ORG_ADMIN and ORG_SETTINGS_MANAGE)
  getBranding: (organizationId) => apiClient.get(`/organizations/${organizationId}/branding`),
  uploadLogo: (organizationId, formData) => apiClient.post(`/organizations/${organizationId}/branding/logo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateBranding: (organizationId, config) => apiClient.put(`/organizations/${organizationId}/branding`, config),
  deleteLogo: (organizationId) => apiClient.delete(`/organizations/${organizationId}/branding/logo`),

  // Admin - Users (SUPER_ADMIN and ORG_ADMIN)
  getUsers: (params) => apiClient.get('/auth/users', { params }),
  getUser: (id) => apiClient.get(`/auth/users/${id}`),
  createUser: (data) => apiClient.post('/auth/register', data),
  assignUserRole: (userId, data) => apiClient.post(`/auth/users/${userId}/assign-role`, data),

  // Organization Selection
  selectOrganization: (organizationId) => apiClient.post('/auth/select-organization', { organizationId }),
  switchOrganization: (organizationId) => apiClient.post('/auth/switch-organization', { organizationId }),

  // Platform Admin - Organization Management (PLATFORM_ADMIN only)
  getPlatformOrganizations: (params) => apiClient.get('/platform/organizations', { params }),
  createPlatformOrganization: (data) => apiClient.post('/platform/organizations', data),
  getPlatformOrganization: (id) => apiClient.get(`/platform/organizations/${id}`),
  updatePlatformOrganization: (id, data) => apiClient.put(`/platform/organizations/${id}`, data),
  deletePlatformOrganization: (id) => apiClient.delete(`/platform/organizations/${id}`),
  getPlatformOrganizationUsage: (id) => apiClient.get(`/platform/organizations/${id}/usage`),

  // Alerts
  getAlerts: (params) => apiClient.get('/alerts', { params }),
  getAlert: (id) => apiClient.get(`/alerts/${id}`),
  createAlert: (data) => apiClient.post('/alerts', data),
  updateAlert: (id, data) => apiClient.put(`/alerts/${id}`, data),
  deleteAlert: (id) => apiClient.delete(`/alerts/${id}`),
  getAlertStats: () => apiClient.get('/alerts/stats'),
  getRecentAlerts: (params) => apiClient.get('/alerts/recent', { params }),
  evaluateAlerts: (params) => apiClient.post('/alerts/evaluate', params),

  // Triage Queue (Phase 1a - Workflow Optimizer)
  getTriageQueue: (params) => apiClient.get('/alerts/triage-queue', { params }),
  claimAlert: (id) => apiClient.post(`/alerts/${id}/claim`),
  unclaimAlert: (id) => apiClient.post(`/alerts/${id}/unclaim`),
  forceClaimAlert: (id, data) => apiClient.post(`/alerts/${id}/force-claim`, data),
  acknowledgeAlert: (id) => apiClient.post(`/alerts/${id}/acknowledge`),
  resolveAlert: (id, data) => apiClient.post(`/alerts/${id}/resolve`, data),
  snoozeAlert: (id, data) => apiClient.post(`/alerts/${id}/snooze`, data),
  suppressAlert: (id, data) => apiClient.post(`/alerts/${id}/suppress`, data),

  // Bulk Alert Actions (Phase 1b - Multi-select operations)
  // Restricted to ORG_ADMIN role (coordinator-level access)
  bulkAlertActions: (action, alertIds, actionData = {}) =>
    apiClient.post('/alerts/bulk-actions', { action, alertIds, actionData }),

  // Tasks (Phase 1b - Task Management System)
  getTasks: (params) => apiClient.get('/tasks', { params }),
  getTask: (id) => apiClient.get(`/tasks/${id}`),
  createTask: (data) => apiClient.post('/tasks', data),
  updateTask: (id, data) => apiClient.put(`/tasks/${id}`, data),
  completeTask: (id, data) => apiClient.patch(`/tasks/${id}/complete`, data),
  cancelTask: (id, data) => apiClient.patch(`/tasks/${id}/cancel`, data),
  bulkAssignTasks: (data) => apiClient.post('/tasks/bulk-assign', data),
  bulkCompleteTasks: (data) => apiClient.post('/tasks/bulk-complete', data),
  getTaskStats: (params) => apiClient.get('/tasks/stats', { params }),

  // Billing Readiness (Configurable Billing Service - NEW)
  // Single enrollment billing readiness
  getEnrollmentBillingReadiness: (enrollmentId, billingMonth) =>
    apiClient.get(`/billing/readiness/${enrollmentId}/${billingMonth}`),

  // Organization-wide billing readiness for all enrollments
  getOrganizationBillingReadiness: (organizationId, billingMonth) =>
    apiClient.get(`/billing/organization/${organizationId}/${billingMonth}`),

  // Organization billing summary with financial projections
  getOrganizationBillingSummary: (organizationId, billingMonth) =>
    apiClient.get(`/billing/summary/${organizationId}/${billingMonth}`),

  // Export billing summary to CSV
  exportBillingSummaryCSV: (organizationId, billingMonth) =>
    apiClient.get(`/billing/export/${organizationId}/${billingMonth}`, {
      responseType: 'blob'
    }),

  // Billing program management
  getBillingPrograms: (params) => apiClient.get('/billing/programs', { params }),
  getBillingProgramByCode: (code) => apiClient.get(`/billing/programs/${code}`),
  getOrganizationBillingPrograms: (organizationId) =>
    apiClient.get(`/billing/programs/organization/${organizationId}`),

  // Get available CPT codes with contextual filtering
  getAvailableCPTCodes: (enrollmentId, billingMonth, duration) =>
    apiClient.get(`/billing/available-cpt-codes/${enrollmentId}/${billingMonth}`, {
      params: duration ? { duration } : {}
    }),

  // Encounter Notes (Phase 1a - Smart Documentation Templates)
  getEncounterNotes: (params) => apiClient.get('/encounter-notes', { params }),
  getEncounterNote: (id) => apiClient.get(`/encounter-notes/${id}`),
  createEncounterNote: (data) => apiClient.post('/encounter-notes', data),
  updateEncounterNote: (id, data) => apiClient.put(`/encounter-notes/${id}`, data),
  attestEncounterNote: (id) => apiClient.post(`/encounter-notes/${id}/attest`),
  deleteEncounterNote: (id) => apiClient.delete(`/encounter-notes/${id}`),

  // Time Tracking (Phase 1a - Auto-Start/Stop Time Tracking)
  startTimer: (data) => apiClient.post('/time-tracking/start', data),
  stopTimer: (data) => apiClient.post('/time-tracking/stop', data),
  getActiveTimer: (patientId) => apiClient.get('/time-tracking/active', { params: { patientId } }),
  getAllActiveTimers: () => apiClient.get('/time-tracking/active/all'),
  cancelTimer: (data) => apiClient.post('/time-tracking/cancel', data),
  adjustTimeLog: (id, data) => apiClient.patch(`/time-tracking/adjust/${id}`, data),

  // Analytics (Phase 1b - Clinician Workflow & Patient Engagement)
  getClinicianWorkflowAnalytics: (params) =>
    apiClient.get('/analytics/clinician-workflow', { params }),
  getOrganizationWorkflowAnalytics: (params) =>
    apiClient.get('/analytics/organization-workflow', { params }),
  getPatientEngagementMetrics: (params) =>
    apiClient.get('/analytics/patient-engagement', { params }),

  // Enrollments
  getEnrollments: (params) => apiClient.get('/enrollments', { params }),
  getEnrollment: (id) => apiClient.get(`/enrollments/${id}`),
  createEnrollment: (data) => apiClient.post('/enrollments', data),
  createBulkEnrollments: (data) => apiClient.post('/enrollments/bulk', data),
  updateEnrollment: (id, data) => apiClient.put(`/enrollments/${id}`, data),
  deleteEnrollment: (id) => apiClient.delete(`/enrollments/${id}`),

  // Scheduled Assessments (Smart Assessment Continuity System)
  getScheduledAssessments: (params) => apiClient.get('/scheduled-assessments', { params }),
  getScheduledAssessmentById: (id) => apiClient.get(`/scheduled-assessments/${id}`),
  getPendingAssessmentsForPatient: (patientId) =>
    apiClient.get(`/scheduled-assessments/patient/${patientId}/pending`),
  createScheduledAssessment: (data) => apiClient.post('/scheduled-assessments', data),
  updateScheduledAssessment: (id, data) => apiClient.put(`/scheduled-assessments/${id}`, data),
  startScheduledAssessment: (id) => apiClient.post(`/scheduled-assessments/${id}/start`),
  completeScheduledAssessment: (id, data) =>
    apiClient.post(`/scheduled-assessments/${id}/complete`, data),
  cancelScheduledAssessment: (id, data) =>
    apiClient.post(`/scheduled-assessments/${id}/cancel`, data),
  deleteScheduledAssessment: (id) => apiClient.delete(`/scheduled-assessments/${id}`),

  // Assessments (for completing scheduled assessments)
  createAssessment: (data) => apiClient.post('/assessments', data),
  getAssessment: (id) => apiClient.get(`/assessments/${id}`),
  getPatientAssessments: (patientId) => apiClient.get(`/assessments/patient/${patientId}`),

  // Saved Views
  getSavedViews: (params) => apiClient.get('/saved-views', { params }),
  getSavedView: (id) => apiClient.get(`/saved-views/${id}`),
  getDefaultView: async (viewType) => {
    const response = await apiClient.get('/saved-views', { params: { viewType } })
    console.log(`[API] getDefaultView(${viewType}) - raw response:`, response)

    // Handle different response structures - axios interceptor may have unwrapped it
    const views = Array.isArray(response) ? response : (response.data || [])
    console.log(`[API] getDefaultView(${viewType}) - fetched ${views.length} views:`, views)

    // API returns views sorted by isDefault desc, so first one is the default (if any)
    const defaultView = views.find(view => view.isDefault === true)
    console.log(`[API] getDefaultView(${viewType}) - default view:`, defaultView)
    return defaultView || null
  },
  createSavedView: (data) => apiClient.post('/saved-views', data),
  updateSavedView: (id, data) => apiClient.put(`/saved-views/${id}`, data),
  deleteSavedView: (id) => apiClient.delete(`/saved-views/${id}`),
  setDefaultView: (id) => apiClient.post(`/saved-views/${id}/set-default`),
  incrementViewUsage: (id) => apiClient.post(`/saved-views/${id}/use`)
}

export default api
