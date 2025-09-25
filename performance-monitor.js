const { spawn } = require('child_process');
const { PrismaClient } = require('./generated/prisma');
const fs = require('fs').promises;
const path = require('path');

const prisma = global.prisma || new PrismaClient();

class PerformanceMonitor {
  constructor() {
    this.logFile = path.join(__dirname, 'performance-history.json');
    this.thresholds = {
      excellent: 50,   // < 50ms
      good: 100,       // < 100ms
      warning: 200,    // < 200ms
      critical: 500    // >= 500ms
    };
  }

  async loadHistory() {
    try {
      const data = await fs.readFile(this.logFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return { tests: [] };
    }
  }

  async saveHistory(history) {
    await fs.writeFile(this.logFile, JSON.stringify(history, null, 2));
  }

  getPerformanceLevel(time) {
    if (time < this.thresholds.excellent) return { level: 'EXCELLENT', emoji: '🚀' };
    if (time < this.thresholds.good) return { level: 'GOOD', emoji: '✅' };
    if (time < this.thresholds.warning) return { level: 'WARNING', emoji: '⚠️' };
    return { level: 'CRITICAL', emoji: '🚨' };
  }

  async getDataStats() {
    try {
      const [patientCount, observationCount, alertCount, enrollmentCount] = await Promise.all([
        prisma.patient.count(),
        prisma.observation.count(),
        prisma.alert.count(),
        prisma.enrollment.count()
      ]);

      return {
        patients: patientCount,
        observations: observationCount,
        alerts: alertCount,
        enrollments: enrollmentCount,
        total: patientCount + observationCount + alertCount + enrollmentCount
      };
    } catch (error) {
      console.error('Error getting data stats:', error);
      return null;
    }
  }

  async testDatabaseQueries() {
    const tests = [];

    // Test 1: Recent Patients (Optimized)
    const start1 = Date.now();
    try {
      await prisma.patient.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          createdAt: true
        }
      });
      tests.push({ name: 'Recent Patients (Optimized)', time: Date.now() - start1 });
    } catch (error) {
      tests.push({ name: 'Recent Patients (Optimized)', time: -1, error: error.message });
    }

    // Test 2: Recent Alerts (Optimized)
    const start2 = Date.now();
    try {
      await prisma.alert.findMany({
        orderBy: { triggeredAt: 'desc' },
        take: 5,
        select: {
          id: true,
          status: true,
          triggeredAt: true,
          enrollment: {
            select: {
              patient: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        }
      });
      tests.push({ name: 'Recent Alerts (Optimized)', time: Date.now() - start2 });
    } catch (error) {
      tests.push({ name: 'Recent Alerts (Optimized)', time: -1, error: error.message });
    }

    // Test 3: Patient Stats
    const start3 = Date.now();
    try {
      await Promise.all([
        prisma.patient.count(),
        prisma.observation.count()
      ]);
      tests.push({ name: 'Patient Stats', time: Date.now() - start3 });
    } catch (error) {
      tests.push({ name: 'Patient Stats', time: -1, error: error.message });
    }

    // Test 4: Alert Stats
    const start4 = Date.now();
    try {
      await Promise.all([
        prisma.alert.count(),
        prisma.alert.count({ where: { status: 'open' } }),
        prisma.alert.groupBy({
          by: ['status'],
          _count: { status: true }
        })
      ]);
      tests.push({ name: 'Alert Stats', time: Date.now() - start4 });
    } catch (error) {
      tests.push({ name: 'Alert Stats', time: -1, error: error.message });
    }

    // Test 5: Clinician Stats
    const start5 = Date.now();
    try {
      await Promise.all([
        prisma.clinician.count(),
        prisma.clinician.groupBy({
          by: ['specialization'],
          _count: { specialization: true }
        })
      ]);
      tests.push({ name: 'Clinician Stats', time: Date.now() - start5 });
    } catch (error) {
      tests.push({ name: 'Clinician Stats', time: -1, error: error.message });
    }

    return tests;
  }

  async testAPIEndpoints() {
    const tests = [];

    const curlTest = (url, description) => {
      return new Promise((resolve) => {
        const start = Date.now();
        const curl = spawn('curl', ['-s', '-m', '10', url]);
        
        let data = '';
        curl.stdout.on('data', (chunk) => {
          data += chunk;
        });
        
        curl.on('close', (code) => {
          const time = Date.now() - start;
          resolve({ 
            name: description, 
            time: code === 0 ? time : -1, 
            success: code === 0,
            error: code !== 0 ? `HTTP request failed (code: ${code})` : null
          });
        });
        
        curl.on('error', (err) => {
          resolve({ 
            name: description, 
            time: -1, 
            success: false, 
            error: err.message 
          });
        });
      });
    };

    // Test API endpoints
    const apiTests = [
      ['http://localhost:3000/api/patients/stats', 'API: Patient Stats'],
      ['http://localhost:3000/api/patients/recent?limit=5', 'API: Recent Patients'],
      ['http://localhost:3000/api/alerts/stats', 'API: Alert Stats'],
      ['http://localhost:3000/api/alerts/recent?limit=5', 'API: Recent Alerts'],
      ['http://localhost:3000/api/clinicians/stats', 'API: Clinician Stats']
    ];

    for (const [url, description] of apiTests) {
      const result = await curlTest(url, description);
      tests.push(result);
    }

    return tests;
  }

  async runFullTest() {
    console.log('🔍 PERFORMANCE MONITORING REPORT');
    console.log('═'.repeat(50));
    
    const timestamp = new Date().toISOString();
    console.log(`📅 Timestamp: ${timestamp}\n`);

    // Get current data statistics
    console.log('📊 DATABASE SIZE:');
    const dataStats = await this.getDataStats();
    if (dataStats) {
      console.log(`   👥 Patients: ${dataStats.patients.toLocaleString()}`);
      console.log(`   📈 Observations: ${dataStats.observations.toLocaleString()}`);
      console.log(`   🚨 Alerts: ${dataStats.alerts.toLocaleString()}`);
      console.log(`   📋 Enrollments: ${dataStats.enrollments.toLocaleString()}`);
      console.log(`   📦 Total Records: ${dataStats.total.toLocaleString()}\n`);
    }

    // Test database queries
    console.log('🗄️  DATABASE QUERY PERFORMANCE:');
    const dbTests = await this.testDatabaseQueries();
    let totalDbTime = 0;
    
    for (const test of dbTests) {
      if (test.time > 0) {
        const perf = this.getPerformanceLevel(test.time);
        console.log(`   ${perf.emoji} ${test.name}: ${test.time}ms (${perf.level})`);
        totalDbTime += test.time;
      } else {
        console.log(`   ❌ ${test.name}: FAILED (${test.error})`);
      }
    }

    // Test API endpoints
    console.log('\n🌐 API ENDPOINT PERFORMANCE:');
    const apiTests = await this.testAPIEndpoints();
    let totalApiTime = 0;
    let apiSuccessCount = 0;
    
    for (const test of apiTests) {
      if (test.time > 0) {
        const perf = this.getPerformanceLevel(test.time);
        console.log(`   ${perf.emoji} ${test.name}: ${test.time}ms (${perf.level})`);
        totalApiTime += test.time;
        apiSuccessCount++;
      } else {
        console.log(`   ❌ ${test.name}: FAILED (${test.error || 'Unknown error'})`);
      }
    }

    // Calculate dashboard simulation
    const dashboardTime = Math.max(totalDbTime, totalApiTime);
    const dashboardPerf = this.getPerformanceLevel(dashboardTime);
    
    console.log('\n🎯 DASHBOARD SIMULATION:');
    console.log(`   ${dashboardPerf.emoji} Total Loading Time: ${dashboardTime}ms (${dashboardPerf.level})`);
    
    if (apiSuccessCount > 0) {
      console.log(`   📊 Average API Response: ${Math.round(totalApiTime / apiSuccessCount)}ms`);
    }

    // Save to history
    const history = await this.loadHistory();
    const testResult = {
      timestamp,
      dataStats,
      dbTests,
      apiTests,
      totalDbTime,
      totalApiTime,
      dashboardTime,
      performance: dashboardPerf.level
    };
    
    history.tests.push(testResult);
    await this.saveHistory(history);

    // Show trends if we have previous data
    if (history.tests.length > 1) {
      console.log('\n📈 PERFORMANCE TRENDS:');
      const previous = history.tests[history.tests.length - 2];
      const change = dashboardTime - previous.dashboardTime;
      const changePercent = ((change / previous.dashboardTime) * 100).toFixed(1);
      
      if (change > 0) {
        console.log(`   📈 Performance: ${change}ms slower (${changePercent}% increase)`);
      } else if (change < 0) {
        console.log(`   📉 Performance: ${Math.abs(change)}ms faster (${Math.abs(changePercent)}% improvement)`);
      } else {
        console.log(`   ➡️  Performance: No change`);
      }

      if (dataStats && previous.dataStats) {
        const recordGrowth = dataStats.total - previous.dataStats.total;
        console.log(`   📦 Data Growth: +${recordGrowth.toLocaleString()} records`);
      }
    }

    // Performance recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    if (dashboardTime < 100) {
      console.log('   ✅ Performance is excellent! No action needed.');
    } else if (dashboardTime < 200) {
      console.log('   ⚠️  Consider implementing caching for stats queries.');
    } else if (dashboardTime < 500) {
      console.log('   🔧 Implement pagination and query optimization.');
    } else {
      console.log('   🚨 Critical: Implement database partitioning and caching immediately.');
    }

    console.log(`\n📝 Full history saved to: ${this.logFile}`);
    console.log('═'.repeat(50));
  }

  async showHistory(limit = 5) {
    const history = await this.loadHistory();
    const recent = history.tests.slice(-limit);
    
    console.log('📊 PERFORMANCE HISTORY:');
    console.log('═'.repeat(50));
    
    for (const test of recent) {
      const date = new Date(test.timestamp).toLocaleDateString();
      const time = new Date(test.timestamp).toLocaleTimeString();
      const perf = this.getPerformanceLevel(test.dashboardTime);
      
      console.log(`${date} ${time}: ${test.dashboardTime}ms (${perf.level}) ${perf.emoji}`);
      if (test.dataStats) {
        console.log(`   📦 Records: ${test.dataStats.total.toLocaleString()}`);
      }
    }
  }
}

// CLI interface
async function main() {
  const monitor = new PerformanceMonitor();
  const command = process.argv[2];

  switch (command) {
    case 'history':
      await monitor.showHistory(10);
      break;
    case 'test':
    default:
      await monitor.runFullTest();
      break;
  }

  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = PerformanceMonitor;