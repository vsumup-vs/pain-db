const axios = require('axios');

async function testDashboardPerformance() {
  console.log('📊 Testing complete dashboard loading performance...\n');

  const baseURL = 'http://localhost:3000/api';
  
  try {
    // Simulate dashboard loading - all API calls made by Dashboard.jsx
    console.log('🔄 Simulating dashboard load (all API calls in parallel)...');
    
    const startTime = Date.now();
    
    const [
      patientsStats,
      cliniciansStats, 
      alertsStats,
      recentPatients,
      recentAlerts
    ] = await Promise.all([
      axios.get(`${baseURL}/patients/stats`),
      axios.get(`${baseURL}/clinicians/stats`),
      axios.get(`${baseURL}/alerts/stats`),
      axios.get(`${baseURL}/patients/recent?limit=5`),
      axios.get(`${baseURL}/alerts/recent?limit=5`)
    ]);
    
    const totalTime = Date.now() - startTime;
    
    console.log('✅ Dashboard loaded successfully!');
    console.log(`⏱️  Total loading time: ${totalTime}ms`);
    
    console.log('\n📋 Data summary:');
    console.log(`- Patients: ${patientsStats.data.data.total} total, ${recentPatients.data.data.length} recent`);
    console.log(`- Clinicians: ${cliniciansStats.data.data.total} total, ${cliniciansStats.data.data.active} active`);
    console.log(`- Alerts: ${alertsStats.data.data.total} total, ${alertsStats.data.data.active} active`);
    console.log(`- Recent alerts: ${recentAlerts.data.alerts.length} items`);
    
    if (totalTime < 200) {
      console.log('\n🎉 EXCELLENT! Dashboard loads in under 200ms');
    } else if (totalTime < 500) {
      console.log('\n✅ GOOD! Dashboard loads in under 500ms');
    } else if (totalTime < 1000) {
      console.log('\n⚠️  ACCEPTABLE! Dashboard loads in under 1 second');
    } else {
      console.log('\n❌ SLOW! Dashboard takes over 1 second to load');
    }

  } catch (error) {
    console.error('❌ Error testing dashboard:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testDashboardPerformance();