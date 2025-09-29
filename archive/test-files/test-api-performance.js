const { spawn } = require('child_process');
const { PrismaClient } = require('./generated/prisma');

const prisma = global.prisma || new PrismaClient();

async function testAPIPerformance() {
  console.log('🚀 Testing actual API endpoint performance...\n');

  // Function to make curl request and measure time
  function curlTest(url, description) {
    return new Promise((resolve) => {
      const start = Date.now();
      const curl = spawn('curl', ['-s', url]);
      
      let data = '';
      curl.stdout.on('data', (chunk) => {
        data += chunk;
      });
      
      curl.on('close', (code) => {
        const time = Date.now() - start;
        console.log(`${description}: ${time}ms`);
        try {
          const parsed = JSON.parse(data);
          resolve({ time, data: parsed, success: code === 0 });
        } catch (e) {
          resolve({ time, data: null, success: false, error: e.message });
        }
      });
      
      curl.on('error', (err) => {
        const time = Date.now() - start;
        console.log(`${description}: ${time}ms (ERROR: ${err.message})`);
        resolve({ time, data: null, success: false, error: err.message });
      });
    });
  }

  try {
    // Test if server is running
    console.log('Checking if server is running...');
    const healthCheck = await curlTest('http://localhost:3000/api', 'Health check');
    
    if (!healthCheck.success) {
      console.log('❌ Server not running. Please start with: npm start');
      return;
    }
    
    console.log('✅ Server is running\n');

    // Test all dashboard endpoints
    console.log('Testing dashboard API endpoints:');
    
    const [
      patientsStats,
      cliniciansStats,
      alertsStats,
      recentPatients,
      recentAlerts
    ] = await Promise.all([
      curlTest('http://localhost:3000/api/patients/stats', '📊 Patients stats'),
      curlTest('http://localhost:3000/api/clinicians/stats', '👨‍⚕️ Clinicians stats'),
      curlTest('http://localhost:3000/api/alerts/stats', '🚨 Alerts stats'),
      curlTest('http://localhost:3000/api/patients?limit=5', '👥 Recent patients (original)'),
      curlTest('http://localhost:3000/api/alerts?limit=5&sortBy=createdAt&sortOrder=desc', '🔔 Recent alerts (original)')
    ]);

    const totalTime = patientsStats.time + cliniciansStats.time + alertsStats.time + recentPatients.time + recentAlerts.time;
    
    console.log('\n📊 Dashboard loading simulation:');
    console.log(`Total time: ${totalTime}ms`);
    
    if (totalTime < 200) {
      console.log('🎉 EXCELLENT! Dashboard loads fast');
    } else if (totalTime < 500) {
      console.log('✅ GOOD! Dashboard loads reasonably fast');
    } else if (totalTime < 1000) {
      console.log('⚠️  SLOW! Dashboard takes time to load');
    } else {
      console.log('❌ VERY SLOW! Dashboard has performance issues');
    }

    // Test if our new optimized endpoints exist
    console.log('\nTesting optimized endpoints (if they exist):');
    const optimizedPatients = await curlTest('http://localhost:3000/api/patients/recent?limit=5', '👥 Recent patients (optimized)');
    const optimizedAlerts = await curlTest('http://localhost:3000/api/alerts/recent?limit=5', '🔔 Recent alerts (optimized)');

    if (optimizedPatients.success && optimizedAlerts.success) {
      const optimizedTotal = patientsStats.time + cliniciansStats.time + alertsStats.time + optimizedPatients.time + optimizedAlerts.time;
      console.log(`\n🚀 Optimized dashboard total: ${optimizedTotal}ms`);
      console.log(`Improvement: ${totalTime - optimizedTotal}ms faster`);
    }

  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testAPIPerformance();