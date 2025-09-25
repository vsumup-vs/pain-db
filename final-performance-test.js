const { spawn } = require('child_process');

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
      resolve({ time, success: code === 0 });
    });
    
    curl.on('error', (err) => {
      const time = Date.now() - start;
      console.log(`${description}: ${time}ms (ERROR)`);
      resolve({ time, success: false });
    });
  });
}

async function finalPerformanceTest() {
  console.log('🎯 FINAL DASHBOARD PERFORMANCE TEST\n');
  console.log('Testing optimized dashboard loading...\n');

  try {
    // Test optimized dashboard loading
    console.log('📊 OPTIMIZED DASHBOARD (using /recent endpoints):');
    const start = Date.now();
    
    const [
      patientsStats,
      cliniciansStats,
      alertsStats,
      recentPatients,
      recentAlerts
    ] = await Promise.all([
      curlTest('http://localhost:3000/api/patients/stats', '  📈 Patients stats'),
      curlTest('http://localhost:3000/api/clinicians/stats', '  👨‍⚕️ Clinicians stats'),
      curlTest('http://localhost:3000/api/alerts/stats', '  🚨 Alerts stats'),
      curlTest('http://localhost:3000/api/patients/recent?limit=5', '  👥 Recent patients'),
      curlTest('http://localhost:3000/api/alerts/recent?limit=5', '  🔔 Recent alerts')
    ]);
    
    const optimizedTotal = Date.now() - start;
    console.log(`\n✅ OPTIMIZED TOTAL: ${optimizedTotal}ms\n`);

    // Test original dashboard loading
    console.log('⚠️  ORIGINAL DASHBOARD (using full endpoints):');
    const start2 = Date.now();
    
    const [
      patientsStats2,
      cliniciansStats2,
      alertsStats2,
      originalPatients,
      originalAlerts
    ] = await Promise.all([
      curlTest('http://localhost:3000/api/patients/stats', '  📈 Patients stats'),
      curlTest('http://localhost:3000/api/clinicians/stats', '  👨‍⚕️ Clinicians stats'),
      curlTest('http://localhost:3000/api/alerts/stats', '  🚨 Alerts stats'),
      curlTest('http://localhost:3000/api/patients?limit=5', '  👥 All patients (heavy)'),
      curlTest('http://localhost:3000/api/alerts?limit=5&sortBy=createdAt&sortOrder=desc', '  🔔 All alerts (heavy)')
    ]);
    
    const originalTotal = Date.now() - start2;
    console.log(`\n❌ ORIGINAL TOTAL: ${originalTotal}ms\n`);

    // Calculate improvements
    const improvement = originalTotal - optimizedTotal;
    const improvementPercent = Math.round((improvement / originalTotal) * 100);
    
    console.log('🎯 PERFORMANCE SUMMARY:');
    console.log('═══════════════════════════════════════');
    console.log(`Original dashboard:  ${originalTotal}ms`);
    console.log(`Optimized dashboard: ${optimizedTotal}ms`);
    console.log(`Improvement:         ${improvement}ms faster (${improvementPercent}%)`);
    
    if (optimizedTotal < 200) {
      console.log('\n🎉 EXCELLENT! Dashboard loads very fast');
    } else if (optimizedTotal < 400) {
      console.log('\n✅ GOOD! Dashboard loads reasonably fast');
    } else if (optimizedTotal < 600) {
      console.log('\n⚠️  ACCEPTABLE! Dashboard loads moderately fast');
    } else {
      console.log('\n❌ SLOW! Dashboard still needs optimization');
    }

    console.log('\n🚀 OPTIMIZATIONS APPLIED:');
    console.log('• Created /api/patients/recent endpoint (lightweight)');
    console.log('• Created /api/alerts/recent endpoint (minimal includes)');
    console.log('• Optimized clinician stats with raw SQL');
    console.log('• Simplified patient stats (removed redundant data)');
    console.log('• All queries run in parallel');

  } catch (error) {
    console.error('❌ Error in performance test:', error.message);
  }
}

finalPerformanceTest();