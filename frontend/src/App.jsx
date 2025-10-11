import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
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
import AdminOrganizations from './pages/AdminOrganizations'
import AdminUsers from './pages/AdminUsers'
import { api } from './services/api'

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const [isChecking, setIsChecking] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem('authToken')

      if (!token) {
        setIsAuthenticated(false)
        setIsChecking(false)
        return
      }

      try {
        // Verify token by fetching current user
        await api.getCurrentUserProfile()
        setIsAuthenticated(true)
      } catch (error) {
        // Token is invalid or expired
        console.error('Auth verification failed:', error)
        localStorage.removeItem('authToken')
        localStorage.removeItem('user')
        setIsAuthenticated(false)
      } finally {
        setIsChecking(false)
      }
    }

    verifyAuth()
  }, [location.pathname])

  if (isChecking) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/*" element={
          <ProtectedRoute>
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
                <Route path="/admin/organizations" element={<AdminOrganizations />} />
                <Route path="/admin/users" element={<AdminUsers />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </>
  )
}

export default App