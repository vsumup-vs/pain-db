const { PrismaClient } = require('./generated/prisma');
const axios = require('axios');

const prisma = global.prisma || new PrismaClient();

async function testOptimizedEndpoints() {
  console.log('🚀 Testing optimized dashboard endpoints...\n');

  const baseURL = 'http://localhost:3000/api';
  
  try {
    // Test 1: Recent Patients (optimized)
    console.log('Testing /patients/recent...');
    const start1 = Date.now();
    const recentPatientsResponse = await axios.get(`${baseURL}/patients/recent?limit=5`);
    const time1 = Date.now() - start1;
    console.log(`✅ Recent patients: ${time1}ms (${recentPatientsResponse.data.data?.length || 0} patients)`);

    // Test 2: Recent Alerts (optimized)
    console.log('Testing /alerts/recent...');
    const start2 = Date.now();
    const recentAlertsResponse = await axios.get(`${baseURL}/alerts/recent?limit=5`);
    const time2 = Date.now() - start2;
    console.log(`✅ Recent alerts: ${time2}ms (${recentAlertsResponse.data.alerts?.length || 0} alerts)`);

    // Test 3: Compare with original endpoints
    console.log('\nComparing with original endpoints...');
    
    // Original patients endpoint (with heavy includes)
    const start3 = Date.now();
    const originalPatientsResponse = await axios.get(`${baseURL}/patients?limit=5`);
    const time3 = Date.now() - start3;
    console.log(`⚠️  Original patients: ${time3}ms (${originalPatientsResponse.data.data?.length || 0} patients)`);

    // Original alerts endpoint (with heavy includes)
    const start4 = Date.now();
    const originalAlertsResponse = await axios.get(`${baseURL}/alerts?limit=5&sortBy=createdAt&sortOrder=desc`);
    const time4 = Date.now() - start4;
    console.log(`⚠️  Original alerts: ${time4}ms (${originalAlertsResponse.data.alerts?.length || 0} alerts)`);

    // Test 4: All stats endpoints
    console.log('\nTesting stats endpoints...');
    
    const start5 = Date.now();
    const [patientsStats, cliniciansStats, alertsStats] = await Promise.all([
      axios.get(`${baseURL}/patients/stats`),
      axios.get(`${baseURL}/clinicians/stats`),
      axios.get(`${baseURL}/alerts/stats`)
    ]);
    const time5 = Date.now() - start5;
    console.log(`✅ All stats (parallel): ${time5}ms`);

    console.log('\n📊 Performance Summary:');
    console.log(`Recent patients (optimized): ${time1}ms`);
    console.log(`Recent alerts (optimized): ${time2}ms`);
    console.log(`Original patients: ${time3}ms`);
    console.log(`Original alerts: ${time4}ms`);
    console.log(`All stats: ${time5}ms`);
    
    const improvement1 = Math.round(((time3 - time1) / time3) * 100);
    const improvement2 = Math.round(((time4 - time2) / time4) * 100);
    
    console.log(`\n🎯 Performance improvements:`);
    console.log(`Patients: ${improvement1}% faster`);
    console.log(`Alerts: ${improvement2}% faster`);

  } catch (error) {
    console.error('❌ Error testing endpoints:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testOptimizedEndpoints();