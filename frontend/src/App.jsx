import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import AssessmentTemplates from './pages/AssessmentTemplates'
import Patients from './pages/Patients'
import Clinicians from './pages/Clinicians'
import MetricDefinitions from './pages/MetricDefinitions'
import Observations from './pages/Observations'
import Alerts from './pages/Alerts'
import Enrollments from './pages/Enrollments'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/clinicians" element={<Clinicians />} />
        <Route path="/metric-definitions" element={<MetricDefinitions />} />
        <Route path="/assessment-templates" element={<AssessmentTemplates />} />
        <Route path="/observations" element={<Observations />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/enrollments" element={<Enrollments />} />
      </Routes>
    </Layout>
  )
}

export default App