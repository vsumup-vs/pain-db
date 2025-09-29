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
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Unified API object
export const api = {
  // Patients
  getPatients: (params) => apiClient.get('/patients', { params }),
  getRecentPatients: (params) => apiClient.get('/patients/recent', { params }),
  getPatient: (id) => apiClient.get(`/patients/${id}`),
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

  // Assessment Templates
  getAssessmentTemplates: (params) => apiClient.get('/assessment-templates', { params }),
  getAssessmentTemplate: (id) => apiClient.get(`/assessment-templates/${id}`),
  createAssessmentTemplate: (data) => apiClient.post('/assessment-templates', data),
  updateAssessmentTemplate: (id, data) => apiClient.put(`/assessment-templates/${id}`, data),
  deleteAssessmentTemplate: (id) => apiClient.delete(`/assessment-templates/${id}`),

  // Enhanced Assessment Templates (v2 with standardization support)
  getAssessmentTemplatesV2: (params) => apiClient.get('/assessment-templates-v2', { params }),
  getStandardizedTemplates: (params) => apiClient.get('/assessment-templates-v2/standardized', { params }),
  getCustomTemplates: (params) => apiClient.get('/assessment-templates-v2/custom', { params }),
  getTemplateCategories: () => apiClient.get('/assessment-templates-v2/categories'),
  getAssessmentTemplateV2: (id) => apiClient.get(`/assessment-templates-v2/${id}`),
  getAssessmentTemplateV2: (id) => apiClient.get(`/assessment-templates-v2/${id}`),
  getAssessmentTemplateV2: (id) => apiClient.get(`/assessment-templates-v2/${id}`),
  getAssessmentTemplateV2: (id) => apiClient.get(`/assessment-templates-v2/${id}`),

  // Observations
  getObservations: (params) => apiClient.get('/observations', { params }),
  getObservation: (id) => apiClient.get(`/observations/${id}`),
  createObservation: (data) => apiClient.post('/observations', data),
  updateObservation: (id, data) => apiClient.put(`/observations/${id}`, data),
  deleteObservation: (id) => apiClient.delete(`/observations/${id}`),
  getObservationsStats: () => apiClient.get('/observations/stats'),

  // Alerts
  getAlerts: (params) => apiClient.get('/alerts', { params }),
  getRecentAlerts: (params) => apiClient.get('/alerts/recent', { params }),
  getAlert: (id) => apiClient.get(`/alerts/${id}`),
  createAlert: (data) => apiClient.post('/alerts', data),
  updateAlert: (id, data) => apiClient.put(`/alerts/${id}`, data),
  deleteAlert: (id) => apiClient.delete(`/alerts/${id}`),
  getAlertsStats: () => apiClient.get('/alerts/stats'),

  // Alert Rules
  getAlertRules: (params) => apiClient.get('/alert-rules', { params }),
  getAlertRule: (id) => apiClient.get(`/alert-rules/${id}`),
  createAlertRule: (data) => apiClient.post('/alert-rules', data),
  updateAlertRule: (id, data) => apiClient.put(`/alert-rules/${id}`, data),
  deleteAlertRule: (id) => apiClient.delete(`/alert-rules/${id}`),
  getAlertRuleStats: () => apiClient.get('/alert-rules/stats'),
  getAlertRuleTemplates: () => apiClient.get('/alert-rules/templates'),

  // Enrollments
  getEnrollments: (params) => apiClient.get('/enrollments', { params }),
  getEnrollment: (id) => apiClient.get(`/enrollments/${id}`),
  createEnrollment: (data) => apiClient.post('/enrollments', data),
  createBulkEnrollments: (enrollmentData) => apiClient.post('/enrollments/bulk-create', { enrollments: enrollmentData }),
  updateEnrollment: (id, data) => apiClient.put(`/enrollments/${id}`, data),
  deleteEnrollment: (id) => apiClient.delete(`/enrollments/${id}`),
  getEnrollmentsStats: () => apiClient.get('/enrollments/stats'),
  getEnrollmentMedicationSummary: (id) => apiClient.get(`/enrollments/${id}/medications`),
  addMedicationToEnrollment: (id, data) => apiClient.post(`/enrollments/${id}/medications`, data),

  // Condition Presets
  getConditionPresets: (params) => apiClient.get('/condition-presets', { params }),
  getConditionPreset: (id) => apiClient.get(`/condition-presets/${id}`),
  createConditionPreset: (data) => apiClient.post('/condition-presets', data),
  updateConditionPreset: (id, data) => apiClient.put(`/condition-presets/${id}`, data),
  deleteConditionPreset: (id) => apiClient.delete(`/condition-presets/${id}`),
  getConditionPresetsStats: () => apiClient.get('/condition-presets/stats'),

  // Drugs
  getDrugs: (params) => apiClient.get('/drugs', { params }),
  getDrug: (id) => apiClient.get(`/drugs/${id}`),
  createDrug: (data) => apiClient.post('/drugs', data),
  updateDrug: (id, data) => apiClient.put(`/drugs/${id}`, data),
  deleteDrug: (id) => apiClient.delete(`/drugs/${id}`),
  getDrugClasses: () => apiClient.get('/drugs/classes'),

  // Patient Medications
  getPatientMedications: (params) => apiClient.get('/patient-medications', { params }),
  getPatientMedicationsById: (patientId, params) => apiClient.get(`/patient-medications/patient/${patientId}`, { params }),
  createPatientMedication: (data) => apiClient.post('/patient-medications', data),
  updatePatientMedication: (id, data) => apiClient.put(`/patient-medications/${id}`, data),
  deactivatePatientMedication: (id, data) => apiClient.patch(`/patient-medications/${id}/deactivate`, data),

  // Enrollment Medications
  addMedicationToEnrollment: (enrollmentId, data) => apiClient.post(`/enrollments/${enrollmentId}/medications`, data),
  getEnrollmentMedicationSummary: (enrollmentId) => apiClient.get(`/enrollments/${enrollmentId}/medications`)
}

export default api
