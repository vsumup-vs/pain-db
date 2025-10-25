const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testAnalyticsEndpoints() {
  console.log('🧪 Testing Analytics Endpoints\n');

  try {
    // 1. Authenticate
    console.log('1️⃣  Authenticating...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@testclinic.com',
      password: 'admin123'
    });

    const token = loginRes.data.token;
    console.log(`✓ Authentication successful\n`);

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // 2. Test Clinician Workflow Analytics
    console.log('2️⃣  Testing Clinician Workflow Analytics...');
    const workflowRes = await axios.get(`${API_BASE}/analytics/clinician-workflow`, {
      headers,
      params: { timeframe: '7d' }
    });

    console.log('✓ Clinician Workflow Analytics Response:');
    console.log(`  - Productivity Score: ${workflowRes.data.productivityScore || 'N/A'}`);
    console.log(`  - Total Alerts Resolved: ${workflowRes.data.totalAlertsResolved || 0}`);
    console.log(`  - Task Completion Rate: ${workflowRes.data.taskCompletionRate || 0}%`);
    console.log(`  - Avg Time per Patient: ${workflowRes.data.avgTimePerPatient || 0} min`);
    console.log(`  - Total Clinical Time: ${workflowRes.data.totalClinicalTime || 0} min`);
    console.log(`  - Billable Time %: ${workflowRes.data.billableTimePercentage || 0}%\n`);

    // 3. Test Patient Engagement Metrics
    console.log('3️⃣  Testing Patient Engagement Metrics...');
    const engagementRes = await axios.get(`${API_BASE}/analytics/patient-engagement`, {
      headers,
      params: { timeframe: '30d' }
    });

    console.log('✓ Patient Engagement Metrics Response:');
    console.log(`  - Total Patients: ${engagementRes.data.totalPatients || 0}`);
    console.log(`  - Avg Engagement Score: ${engagementRes.data.avgEngagementScore || 0}`);
    console.log(`  - Highly Engaged: ${engagementRes.data.highlyEngaged || 0}`);
    console.log(`  - At Risk: ${engagementRes.data.atRisk || 0}`);
    console.log(`  - Top Patients: ${engagementRes.data.topPatients?.length || 0} listed\n`);

    // 4. Test Organization Workflow Analytics
    console.log('4️⃣  Testing Organization Workflow Analytics...');
    const orgWorkflowRes = await axios.get(`${API_BASE}/analytics/organization-workflow`, {
      headers,
      params: { timeframe: '30d' }
    });

    console.log('✓ Organization Workflow Analytics Response:');
    console.log(`  - Total Clinicians: ${orgWorkflowRes.data.totalClinicians || 0}`);
    console.log(`  - Avg Productivity Score: ${orgWorkflowRes.data.avgProductivityScore || 0}`);
    console.log(`  - Total Alerts Resolved: ${orgWorkflowRes.data.totalAlertsResolved || 0}`);
    console.log(`  - Avg Task Completion: ${orgWorkflowRes.data.avgTaskCompletionRate || 0}%\n`);

    console.log('✅ All analytics endpoints are working correctly!\n');

    // 5. Test with specific clinician ID (if available)
    console.log('5️⃣  Fetching clinicians list...');
    const cliniciansRes = await axios.get(`${API_BASE}/clinicians`, {
      headers,
      params: { limit: 1 }
    });

    if (cliniciansRes.data.data && cliniciansRes.data.data.length > 0) {
      const clinicianId = cliniciansRes.data.data[0].id;
      console.log(`✓ Testing with specific clinician ID: ${clinicianId}\n`);

      const specificWorkflowRes = await axios.get(`${API_BASE}/analytics/clinician-workflow`, {
        headers,
        params: { clinicianId, timeframe: '7d' }
      });

      console.log('✓ Clinician-Specific Analytics Response:');
      console.log(`  - Clinician ID: ${specificWorkflowRes.data.clinicianId || 'N/A'}`);
      console.log(`  - Productivity Score: ${specificWorkflowRes.data.productivityScore || 'N/A'}`);
      console.log(`  - Alerts Resolved: ${specificWorkflowRes.data.totalAlertsResolved || 0}\n`);
    } else {
      console.log('⚠️  No clinicians found in database\n');
    }

    // 6. Test with specific patient ID (if available)
    console.log('6️⃣  Fetching patients list...');
    const patientsRes = await axios.get(`${API_BASE}/patients`, {
      headers,
      params: { limit: 1 }
    });

    if (patientsRes.data.data && patientsRes.data.data.length > 0) {
      const patientId = patientsRes.data.data[0].id;
      console.log(`✓ Testing with specific patient ID: ${patientId}\n`);

      const specificEngagementRes = await axios.get(`${API_BASE}/analytics/patient-engagement`, {
        headers,
        params: { patientId, timeframe: '30d' }
      });

      console.log('✓ Patient-Specific Engagement Response:');
      console.log(`  - Patient ID: ${specificEngagementRes.data.patientId || 'N/A'}`);
      console.log(`  - Engagement Score: ${specificEngagementRes.data.engagementScore || 'N/A'}`);
      console.log(`  - Assessment Adherence: ${specificEngagementRes.data.assessmentAdherence || 0}%`);
      console.log(`  - Medication Adherence: ${specificEngagementRes.data.medicationAdherence || 0}%\n`);
    } else {
      console.log('⚠️  No patients found in database\n');
    }

    console.log('🎉 Analytics endpoint testing complete!\n');

  } catch (error) {
    console.error('❌ Error testing analytics endpoints:');
    if (error.response) {
      console.error(`  Status: ${error.response.status}`);
      console.error(`  Message: ${error.response.data.error || error.response.data.message || 'Unknown error'}`);
      console.error(`  Details:`, JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(`  ${error.message}`);
    }
    process.exit(1);
  }
}

testAnalyticsEndpoints();
