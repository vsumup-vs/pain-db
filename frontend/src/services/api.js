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

  // Metric Definitions
  getMetricDefinitions: (params) => apiClient.get('/metric-definitions', { params }),
  getMetricDefinition: (id) => apiClient.get(`/metric-definitions/${id}`),
  createMetricDefinition: (data) => apiClient.post('/metric-definitions', data),
  updateMetricDefinition: (id, data) => apiClient.put(`/metric-definitions/${id}`, data),
  deleteMetricDefinition: (id) => apiClient.delete(`/metric-definitions/${id}`),

  // Assessment Templates
  getAssessmentTemplates: (params) => apiClient.get('/assessment-templates', { params }),
  getAssessmentTemplate: (id) => apiClient.get(`/assessment-templates/${id}`),
  createAssessmentTemplate: (data) => apiClient.post('/assessment-templates', data),
  updateAssessmentTemplate: (id, data) => apiClient.put(`/assessment-templates/${id}`, data),
  deleteAssessmentTemplate: (id) => apiClient.delete(`/assessment-templates/${id}`),

  // Observations
  getObservations: (params) => apiClient.get('/observations', { params }),
  getObservation: (id) => apiClient.get(`/observations/${id}`),
  createObservation: (data) => apiClient.post('/observations', data),
  updateObservation: (id, data) => apiClient.put(`/observations/${id}`, data),
  deleteObservation: (id) => apiClient.delete(`/observations/${id}`),
  getObservationsStats: () => apiClient.get('/observations/stats'),

  // Alerts
  getAlerts: (params) => apiClient.get('/alerts', { params }),
  getAlert: (id) => apiClient.get(`/alerts/${id}`),
  createAlert: (data) => apiClient.post('/alerts', data),
  updateAlert: (id, data) => apiClient.put(`/alerts/${id}`, data),
  deleteAlert: (id) => apiClient.delete(`/alerts/${id}`),
  getAlertsStats: () => apiClient.get('/alerts/stats'),

  // Enrollments
  getEnrollments: (params) => apiClient.get('/enrollments', { params }),
  getEnrollment: (id) => apiClient.get(`/enrollments/${id}`),
  createEnrollment: (data) => apiClient.post('/enrollments', data),
  updateEnrollment: (id, data) => apiClient.put(`/enrollments/${id}`, data),
  deleteEnrollment: (id) => apiClient.delete(`/enrollments/${id}`),
  getEnrollmentsStats: () => apiClient.get('/enrollments/stats'),
}

export default api