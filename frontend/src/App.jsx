import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import AssessmentTemplatesEnhanced from './pages/AssessmentTemplatesEnhanced'
import Patients from './pages/Patients'
import Clinicians from './pages/Clinicians'
import ConditionPresets from './pages/ConditionPresets'
import MetricDefinitions from './pages/MetricDefinitions'
import Observations from './pages/Observations'
import Alerts from './pages/Alerts'
import AlertRules from './pages/AlertRules'
import Enrollments from './pages/Enrollments'
import EnrollmentDetails from './pages/EnrollmentDetails'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/clinicians" element={<Clinicians />} />
        <Route path="/condition-presets" element={<ConditionPresets />} />
        <Route path="/metric-definitions" element={<MetricDefinitions />} />
        <Route path="/assessment-templates" element={<AssessmentTemplatesEnhanced />} />
        <Route path="/observations" element={<Observations />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/alert-rules" element={<AlertRules />} />
        <Route path="/enrollments" element={<Enrollments />} />
        <Route path="/enrollments/:id" element={<EnrollmentDetails />} />
      </Routes>
    </Layout>
  )
}

export default App