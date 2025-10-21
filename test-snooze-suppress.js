const http = require('http');
const fs = require('fs');

const API_BASE = 'localhost:3000';
const token = fs.readFileSync(process.env.HOME + '/.pain-db-token', 'utf8').trim();

// Test alert IDs from create-test-alert-data.js output
const ALERT_ID_1 = 'cmgweuyqm00017kxeaadpgsdd'; // Snooze test
const ALERT_ID_2 = 'cmgweuyr200037kxesc198yf8'; // Suppress test
const ALERT_ID_3 = 'cmgweuyr600057kxekh74903r'; // Validation test

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api${path}`,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(responseData)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: responseData
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('======================================');
  console.log('Alert Snooze & Suppress API Tests');
  console.log('======================================\n');

  // Test 1: Snooze Alert
  console.log('Test 1: Snooze alert with 60-minute duration');
  console.log('--------------------------------------------');
  try {
    const result = await makeRequest('POST', `/alerts/${ALERT_ID_1}/snooze`, {
      snoozeMinutes: 60
    });
    console.log(`Status: ${result.status}`);
    console.log(`Response:`, JSON.stringify(result.data, null, 2));

    if (result.status === 200 && result.data.success && result.data.data.snoozedUntil) {
      console.log('✅ Test 1 PASSED: Alert snoozed successfully\n');
    } else {
      console.log('❌ Test 1 FAILED: Alert not snoozed\n');
    }
  } catch (error) {
    console.log('❌ Test 1 FAILED:', error.message, '\n');
  }

  // Test 2: Suppress Alert
  console.log('Test 2: Suppress alert with FALSE_POSITIVE reason');
  console.log('--------------------------------------------------');
  try {
    const result = await makeRequest('POST', `/alerts/${ALERT_ID_2}/suppress`, {
      suppressReason: 'FALSE_POSITIVE',
      suppressNotes: 'Testing suppress functionality - false positive detection'
    });
    console.log(`Status: ${result.status}`);
    console.log(`Response:`, JSON.stringify(result.data, null, 2));

    if (result.status === 200 && result.data.success && result.data.data.isSuppressed === true) {
      console.log('✅ Test 2 PASSED: Alert suppressed successfully\n');
    } else {
      console.log('❌ Test 2 FAILED: Alert not suppressed\n');
    }
  } catch (error) {
    console.log('❌ Test 2 FAILED:', error.message, '\n');
  }

  // Test 3: Invalid snooze duration (exceeds max)
  console.log('Test 3: Validation - Invalid snooze duration (20000 > 10080)');
  console.log('-------------------------------------------------------------');
  try {
    const result = await makeRequest('POST', `/alerts/${ALERT_ID_3}/snooze`, {
      snoozeMinutes: 20000
    });
    console.log(`Status: ${result.status}`);
    console.log(`Response:`, JSON.stringify(result.data, null, 2));

    if (result.status === 400 || (result.data.error && result.data.error.includes('10080'))) {
      console.log('✅ Test 3 PASSED: Validation rejected invalid duration\n');
    } else {
      console.log('❌ Test 3 FAILED: Should have rejected invalid duration\n');
    }
  } catch (error) {
    console.log('❌ Test 3 FAILED:', error.message, '\n');
  }

  // Test 4: Suppress with OTHER reason but no notes
  console.log('Test 4: Validation - OTHER reason requires notes');
  console.log('------------------------------------------------');

  // First create another test alert for this test
  console.log('Creating additional test alert for validation test...');
  const createResult = await makeRequest('POST', '/alerts', {
    patientId: 'cmgwe8qer00017kvru6vhr9zf',
    ruleId: 'cmgwe8qf600037kvr9m5qjrg5',
    message: 'Validation test alert',
    severity: 'LOW',
    priorityRank: 2
  });

  if (createResult.status === 201 && createResult.data.alert) {
    const newAlertId = createResult.data.alert.id;
    console.log(`Created alert: ${newAlertId}\n`);

    try {
      const result = await makeRequest('POST', `/alerts/${newAlertId}/suppress`, {
        suppressReason: 'OTHER',
        suppressNotes: ''
      });
      console.log(`Status: ${result.status}`);
      console.log(`Response:`, JSON.stringify(result.data, null, 2));

      if (result.status === 400 || (result.data.error && result.data.error.toLowerCase().includes('notes'))) {
        console.log('✅ Test 4 PASSED: Validation required notes for OTHER reason\n');
      } else {
        console.log('❌ Test 4 FAILED: Should have required notes for OTHER reason\n');
      }
    } catch (error) {
      console.log('❌ Test 4 FAILED:', error.message, '\n');
    }
  } else {
    console.log('❌ Test 4 SKIPPED: Could not create test alert\n');
  }

  console.log('======================================');
  console.log('All tests completed!');
  console.log('======================================');
}

runTests().catch(console.error);
