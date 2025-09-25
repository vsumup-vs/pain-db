import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { toast } from 'react-toastify'
import {
  CloudArrowUpIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import Papa from 'papaparse'

const REQUIRED_FIELDS = {
  'Patient First Name': 'patient.firstName',
  'Patient Last Name': 'patient.lastName', 
  'Patient Email': 'patient.email',
  'Clinician Email': 'clinician.email',
  'Diagnosis Code': 'enrollment.diagnosisCode',
  'Care Program': 'careProgram.identifier'
}

const OPTIONAL_FIELDS = {
  'Patient Phone': 'patient.phone',
  'Patient DOB': 'patient.dateOfBirth',
  'Patient Gender': 'patient.gender',
  'Patient MRN': 'patient.mrn',
  'Clinician NPI': 'clinician.npi',
  'Clinician First Name': 'clinician.firstName',
  'Clinician Last Name': 'clinician.lastName',
  'Start Date': 'enrollment.startDate',
  'End Date': 'enrollment.endDate',
  'Notes': 'enrollment.notes'
}

const ALL_FIELDS = { ...REQUIRED_FIELDS, ...OPTIONAL_FIELDS }

// CSV header mapping for common underscore-separated formats
const CSV_HEADER_MAPPINGS = {
  'patient_first_name': 'patient.firstName',
  'patient_last_name': 'patient.lastName',
  'patient_email': 'patient.email',
  'patient_phone': 'patient.phone',
  'patient_date_of_birth': 'patient.dateOfBirth',
  'patient_gender': 'patient.gender',
  'patient_mrn': 'patient.mrn',
  'clinician_first_name': 'clinician.firstName',
  'clinician_last_name': 'clinician.lastName',
  'clinician_email': 'clinician.email',
  'clinician_npi': 'clinician.npi',
  'clinician_specialization': 'clinician.specialization',
  'clinician_license_number': 'clinician.licenseNumber',
  'diagnosis_code': 'enrollment.diagnosisCode',
  'care_program_name': 'careProgram.identifier',
  'enrollment_notes': 'enrollment.notes',
  'enrollment_start_date': 'enrollment.startDate',
  'enrollment_end_date': 'enrollment.endDate'
}

export default function BulkEnrollmentUpload({ 
  isOpen, 
  onClose, 
  onSubmit, 
  patients = [], 
  clinicians = [], 
  conditionPresets = [] 
}) {
  const [step, setStep] = useState(1) // 1: Upload, 2: Map Fields, 3: Preview & Confirm
  const [csvData, setCsvData] = useState([])
  const [csvHeaders, setCsvHeaders] = useState([])
  const [fieldMapping, setFieldMapping] = useState({})
  const [validationResults, setValidationResults] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0]
    if (!file) return

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file')
      return
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          toast.error('Error parsing CSV file')
          return
        }

        setCsvHeaders(results.meta.fields || [])
        setCsvData(results.data)
        setStep(2)
        
        // Auto-map fields based on header names
        const autoMapping = {}
        results.meta.fields?.forEach(header => {
          const normalizedHeader = header.toLowerCase().trim()
          
          // First, try direct mapping from CSV_HEADER_MAPPINGS
          if (CSV_HEADER_MAPPINGS[normalizedHeader]) {
            autoMapping[header] = CSV_HEADER_MAPPINGS[normalizedHeader]
            return
          }
          
          // Then try fuzzy matching with display names
          Object.entries(ALL_FIELDS).forEach(([displayName, fieldPath]) => {
            const normalizedDisplayName = displayName.toLowerCase()
            const displayNameNoSpaces = normalizedDisplayName.replace(/\s+/g, '')
            const displayNameWithUnderscores = normalizedDisplayName.replace(/\s+/g, '_')
            const headerNoUnderscores = normalizedHeader.replace(/_/g, '')
            
            if (normalizedHeader === displayNameWithUnderscores ||
                normalizedHeader === normalizedDisplayName ||
                headerNoUnderscores === displayNameNoSpaces ||
                normalizedHeader.includes(displayNameNoSpaces) ||
                displayNameNoSpaces.includes(headerNoUnderscores)) {
              autoMapping[header] = fieldPath
            }
          })
        })
        setFieldMapping(autoMapping)
      }
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    multiple: false
  })

  const validateData = () => {
    setIsProcessing(true)
    const results = []

    csvData.forEach((row, index) => {
      const result = {
        rowIndex: index + 1,
        data: row,
        errors: [],
        warnings: [],
        mappedData: {}
      }

      // Map fields according to field mapping
      Object.entries(fieldMapping).forEach(([csvField, targetPath]) => {
        const value = row[csvField]
        if (value) {
          const pathParts = targetPath.split('.')
          let current = result.mappedData
          for (let i = 0; i < pathParts.length - 1; i++) {
            if (!current[pathParts[i]]) current[pathParts[i]] = {}
            current = current[pathParts[i]]
          }
          current[pathParts[pathParts.length - 1]] = value
        }
      })

      // Validate required fields
      Object.entries(REQUIRED_FIELDS).forEach(([displayName, fieldPath]) => {
        const pathParts = fieldPath.split('.')
        let value = result.mappedData
        for (const part of pathParts) {
          value = value?.[part]
        }
        if (!value) {
          result.errors.push(`Missing required field: ${displayName}`)
        }
      })

      // Validate email formats
      if (result.mappedData.patient?.email && !isValidEmail(result.mappedData.patient.email)) {
        result.errors.push('Invalid patient email format')
      }
      if (result.mappedData.clinician?.email && !isValidEmail(result.mappedData.clinician.email)) {
        result.errors.push('Invalid clinician email format')
      }

      // Check if care program exists
      if (result.mappedData.careProgram?.identifier) {
        const programExists = conditionPresets.some(preset => 
          preset.name === result.mappedData.careProgram.identifier
        )
        if (!programExists) {
          result.warnings.push(`Care program "${result.mappedData.careProgram.identifier}" not found`)
        }
      }

      // Check if patient exists
      if (result.mappedData.patient?.email) {
        const patientExists = patients.some(patient => 
          patient.email === result.mappedData.patient.email
        )
        if (patientExists) {
          result.warnings.push('Patient already exists - will be linked')
        }
      }

      // Check if clinician exists
      if (result.mappedData.clinician?.email) {
        const clinicianExists = clinicians.some(clinician => 
          clinician.email === result.mappedData.clinician.email
        )
        if (!clinicianExists) {
          result.warnings.push('Clinician not found - will be created')
        }
      }

      results.push(result)
    })

    setValidationResults(results)
    setStep(3)
    setIsProcessing(false)
  }

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleSubmit = async () => {
    const validRows = validationResults.filter(result => result.errors.length === 0)
    
    if (validRows.length === 0) {
      toast.error('No valid rows to process')
      return
    }

    setIsProcessing(true)
    
    try {
      const enrollmentData = validRows.map(result => ({
        enrollment: {
          diagnosisCode: result.mappedData.enrollment?.diagnosisCode,
          startDate: result.mappedData.enrollment?.startDate,
          endDate: result.mappedData.enrollment?.endDate,
          notes: result.mappedData.enrollment?.notes
        },
        patient: {
          action: 'create_or_find',
          identifiers: {
            email: result.mappedData.patient?.email,
            mrn: result.mappedData.patient?.mrn
          },
          data: result.mappedData.patient
        },
        clinician: {
          action: 'find_or_create',
          identifiers: {
            email: result.mappedData.clinician?.email,
            npi: result.mappedData.clinician?.npi
          },
          data: result.mappedData.clinician
        },
        careProgram: {
          action: 'find_by_name',
          identifier: result.mappedData.careProgram?.identifier
        }
      }))

      await onSubmit(enrollmentData)
      resetForm()
      onClose()
    } catch (error) {
      toast.error('Failed to process bulk enrollment')
    } finally {
      setIsProcessing(false)
    }
  }

  const resetForm = () => {
    setStep(1)
    setCsvData([])
    setCsvHeaders([])
    setFieldMapping({})
    setValidationResults([])
    setIsProcessing(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <CloudArrowUpIcon className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Bulk Enrollment Upload
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            {[
              { step: 1, title: 'Upload File', icon: CloudArrowUpIcon },
              { step: 2, title: 'Map Fields', icon: DocumentTextIcon },
              { step: 3, title: 'Preview & Confirm', icon: CheckCircleIcon }
            ].map(({ step: stepNum, title, icon: Icon }) => (
              <div key={stepNum} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  step >= stepNum ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  {step > stepNum ? (
                    <CheckCircleIcon className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-medium">{stepNum}</span>
                  )}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  step >= stepNum ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  {title}
                </span>
                {stepNum < 3 && (
                  <div className={`ml-4 w-8 h-0.5 ${
                    step > stepNum ? 'bg-blue-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Upload CSV File
                </h3>
                <p className="text-gray-600 mb-6">
                  Upload a CSV file containing enrollment data. The file should include patient information, clinician details, and care program assignments.
                </p>
              </div>

              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input {...getInputProps()} />
                <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  {isDragActive ? 'Drop the file here' : 'Drag & drop a CSV file here'}
                </p>
                <p className="text-gray-600 mb-4">or click to select a file</p>
                <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Select File
                </button>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Required CSV Columns:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  {Object.keys(REQUIRED_FIELDS).map(field => (
                    <li key={field}>• {field}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Map CSV Fields
                </h3>
                <p className="text-gray-600 mb-6">
                  Map your CSV columns to the required fields. Auto-mapping has been applied where possible.
                </p>
              </div>

              <div className="grid gap-4">
                {csvHeaders.map(header => (
                  <div key={header} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CSV Column: <span className="font-semibold">{header}</span>
                      </label>
                      <select
                        value={fieldMapping[header] || ''}
                        onChange={(e) => setFieldMapping(prev => ({
                          ...prev,
                          [header]: e.target.value
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">-- Skip this column --</option>
                        <optgroup label="Required Fields">
                          {Object.entries(REQUIRED_FIELDS).map(([displayName, fieldPath]) => (
                            <option key={fieldPath} value={fieldPath}>
                              {displayName}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Optional Fields">
                          {Object.entries(OPTIONAL_FIELDS).map(([displayName, fieldPath]) => (
                            <option key={fieldPath} value={fieldPath}>
                              {displayName}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                    {csvData[0] && (
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Sample Data:
                        </label>
                        <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-600">
                          {csvData[0][header] || 'No data'}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={validateData}
                  disabled={Object.keys(fieldMapping).length === 0}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Validate Data
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Preview & Confirm
                </h3>
                <p className="text-gray-600 mb-6">
                  Review the validation results and confirm the enrollment creation.
                </p>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {validationResults.filter(r => r.errors.length === 0).length}
                  </div>
                  <div className="text-sm text-green-800">Valid Rows</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {validationResults.filter(r => r.errors.length > 0).length}
                  </div>
                  <div className="text-sm text-red-800">Invalid Rows</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {validationResults.filter(r => r.warnings.length > 0).length}
                  </div>
                  <div className="text-sm text-yellow-800">Warnings</div>
                </div>
              </div>

              {/* Validation Results */}
              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                {validationResults.map((result, index) => (
                  <div key={index} className={`p-4 border-b border-gray-200 last:border-b-0 ${
                    result.errors.length > 0 ? 'bg-red-50' : 
                    result.warnings.length > 0 ? 'bg-yellow-50' : 'bg-green-50'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">
                        Row {result.rowIndex}
                      </span>
                      <div className="flex items-center space-x-2">
                        {result.errors.length > 0 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <XMarkIcon className="h-3 w-3 mr-1" />
                            {result.errors.length} Error{result.errors.length > 1 ? 's' : ''}
                          </span>
                        )}
                        {result.warnings.length > 0 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                            {result.warnings.length} Warning{result.warnings.length > 1 ? 's' : ''}
                          </span>
                        )}
                        {result.errors.length === 0 && result.warnings.length === 0 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircleIcon className="h-3 w-3 mr-1" />
                            Valid
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {result.errors.length > 0 && (
                      <div className="mb-2">
                        <h5 className="text-sm font-medium text-red-800 mb-1">Errors:</h5>
                        <ul className="text-sm text-red-700 space-y-1">
                          {result.errors.map((error, i) => (
                            <li key={i}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {result.warnings.length > 0 && (
                      <div className="mb-2">
                        <h5 className="text-sm font-medium text-yellow-800 mb-1">Warnings:</h5>
                        <ul className="text-sm text-yellow-700 space-y-1">
                          {result.warnings.map((warning, i) => (
                            <li key={i}>• {warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-600">
                      Patient: {result.mappedData.patient?.firstName} {result.mappedData.patient?.lastName} ({result.mappedData.patient?.email}) | 
                      Clinician: {result.mappedData.clinician?.email} | 
                      Program: {result.mappedData.careProgram?.identifier}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isProcessing || validationResults.filter(r => r.errors.length === 0).length === 0}
                  className="inline-flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isProcessing && <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />}
                  Create {validationResults.filter(r => r.errors.length === 0).length} Enrollments
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}