/**
 * Test Auto-Start/Stop Timer Functionality
 * This script tests the complete timer workflow via API
 */

const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3000/api';
const TOKEN_FILE = path.join(process.env.HOME, '.pain-db-token');

// Color codes
const colors = {
  green: '\x1b[0;32m',
  yellow: '\x1b[1;33m',
  red: '\x1b[0;31m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function makeRequest(method, endpoint, data = null) {
  const token = fs.readFileSync(TOKEN_FILE, 'utf8').trim();

  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, options);
  return response.json();
}

async function runTests() {
  console.log('======================================');
  console.log('Timer Functionality End-to-End Test');
  console.log('======================================');
  console.log('');

  try {
    // Check if token exists
    if (!fs.existsSync(TOKEN_FILE)) {
      log('red', `❌ Error: Token file not found at ${TOKEN_FILE}`);
      console.log('Please login first using:');
      console.log(`curl -X POST ${API_BASE}/auth/login -H 'Content-Type: application/json' -d '{"email":"clinician@testclinic.com","password":"clinician123"}' | jq -r '.tokens.accessToken' > ${TOKEN_FILE}`);
      process.exit(1);
    }

    // Test patient ID and enrollment from persistent test data
    const PATIENT_ID = 'cmgx5a4wf00017k0uuocitsrm'; // John Smith
    const ENROLLMENT_ID = 'cmgx5a4x800077k0u3bzpdx5j'; // John Smith's RPM enrollment

    // Step 1: Get or create an alert rule
    log('yellow', 'Step 1: Get or create an alert rule');
    let rulesResponse = await makeRequest('GET', '/alert-rules');
    let ruleId = rulesResponse.data?.[0]?.id;

    if (!ruleId) {
      log('red', '❌ No alert rules found. Creating a test rule...');
      const ruleResponse = await makeRequest('POST', '/alert-rules', {
        name: 'Test High Blood Pressure Alert',
        description: 'Test alert for timer functionality',
        conditions: { threshold: 140, operator: '>' },
        actions: ['NOTIFY_CLINICIAN'],
        severity: 'HIGH',
        category: 'Cardiovascular'
      });
      ruleId = ruleResponse.data?.id;
    }

    log('green', `✓ Using alert rule ID: ${ruleId}`);
    console.log('');

    // Step 2: Create a test alert
    log('yellow', 'Step 2: Create a test alert');
    const alertResponse = await makeRequest('POST', '/alerts', {
      patientId: PATIENT_ID,
      enrollmentId: ENROLLMENT_ID,
      ruleId: ruleId,
      message: 'Test alert for timer functionality - Blood pressure 145/95',
      severity: 'HIGH',
      priorityRank: 8,
      details: { systolic: 145, diastolic: 95 }
    });

    const alertId = alertResponse.id || alertResponse.alert?.id;
    if (!alertId) {
      log('red', '❌ Failed to create alert');
      console.log(JSON.stringify(alertResponse, null, 2));
      process.exit(1);
    }

    log('green', `✓ Created alert ID: ${alertId}`);
    console.log('');

    // Step 3: Start timer for patient
    log('yellow', 'Step 3: Start timer for patient');
    const timerStartResponse = await makeRequest('POST', '/time-tracking/start', {
      patientId: PATIENT_ID,
      activity: 'Patient engagement',
      source: 'alert',
      sourceId: alertId
    });

    console.log(JSON.stringify(timerStartResponse, null, 2));

    if (!timerStartResponse.success) {
      log('red', '❌ Failed to start timer');
      process.exit(1);
    }

    log('green', '✓ Timer started successfully');
    console.log('');

    // Step 4: Verify timer is active
    log('yellow', 'Step 4: Verify timer is active');
    const activeTimerResponse = await makeRequest('GET', `/time-tracking/active?patientId=${PATIENT_ID}`);

    console.log(JSON.stringify(activeTimerResponse, null, 2));

    if (!activeTimerResponse.data?.active) {
      log('red', '❌ Timer is not active');
      process.exit(1);
    }

    log('green', '✓ Timer is active');
    console.log('');

    // Step 5: Wait for 3 seconds
    log('yellow', 'Step 5: Wait for 3 seconds (simulating work time)...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('');

    // Step 6: Stop timer and create time log
    log('yellow', 'Step 6: Stop timer and create time log');
    const timerStopResponse = await makeRequest('POST', '/time-tracking/stop', {
      patientId: PATIENT_ID,
      notes: 'Reviewed blood pressure readings, advised patient to monitor closely',
      cptCode: '99457',
      billable: true
    });

    console.log(JSON.stringify(timerStopResponse, null, 2));

    if (!timerStopResponse.success) {
      log('red', '❌ Failed to stop timer');
      process.exit(1);
    }

    const timeLogId = timerStopResponse.data?.timeLog?.id;
    const duration = timerStopResponse.data?.timeLog?.duration;

    log('green', '✓ Timer stopped successfully');
    log('green', `✓ Time log created (ID: ${timeLogId}, Duration: ${duration} minutes)`);
    console.log('');

    // Step 7: Verify timer is no longer active
    log('yellow', 'Step 7: Verify timer is no longer active');
    const inactiveTimerResponse = await makeRequest('GET', `/time-tracking/active?patientId=${PATIENT_ID}`);

    console.log(JSON.stringify(inactiveTimerResponse, null, 2));

    if (inactiveTimerResponse.data?.active) {
      log('red', '❌ Timer is still active (should be stopped)');
      process.exit(1);
    }

    log('green', '✓ Timer is no longer active');
    console.log('');

    // Success summary
    console.log('======================================');
    log('green', '✅ All timer functionality tests passed!');
    console.log('======================================');
    console.log('');
    console.log('Summary:');
    console.log(`- Alert created: ${alertId}`);
    console.log('- Timer started and stopped successfully');
    console.log(`- Time log created: ${timeLogId}`);
    console.log(`- Duration tracked: ${duration} minutes`);

  } catch (error) {
    log('red', `❌ Test failed with error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

runTests();
