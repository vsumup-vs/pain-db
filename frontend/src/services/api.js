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
  // Assessment Templates
  getAssessmentTemplatesV2: (params) => apiClient.get('/assessment-templates-v2', { params }),
  getStandardizedTemplates: (params) => apiClient.get('/assessment-templates-v2/standardized', { params }),
  getCustomTemplates: (params) => apiClient.get('/assessment-templates-v2/custom', { params }),
  getTemplateCategories: () => apiClient.get('/assessment-templates-v2/categories'),
  getAssessmentTemplate: (id) => apiClient.get(`/assessment-templates-v2/${id}`),

  // Condition Presets
  getConditionPresets: (params) => apiClient.get('/condition-presets', { params }),
  getConditionPreset: (id) => apiClient.get(`/condition-presets/${id}`),
  createConditionPreset: (data) => apiClient.post('/condition-presets', data),
  updateConditionPreset: (id, data) => apiClient.put(`/condition-presets/${id}`, data),
  deleteConditionPreset: (id) => apiClient.delete(`/condition-presets/${id}`),
  getConditionPresetsStats: () => apiClient.get('/condition-presets/stats')
}

export default api
