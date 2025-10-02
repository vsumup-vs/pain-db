const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestAutomation {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0,
      coverage: null,
      duration: 0,
      failedTests: []
    };
  }

  async runAllTests() {
    console.log('🚀 Starting Backend Test Automation...\n');
    
    const startTime = Date.now();
    
    try {
      // Run tests with coverage
      console.log('📊 Running tests with coverage...');
      const output = execSync('npm run test:coverage', { 
        encoding: 'utf8',
        cwd: path.resolve(__dirname, '..')
      });
      
      this.parseTestResults(output);
      this.testResults.duration = Date.now() - startTime;
      
      console.log('\n✅ Test automation completed successfully!');
      this.printSummary();
      
    } catch (error) {
      console.error('❌ Test automation failed:', error.message);
      this.parseTestResults(error.stdout || error.message);
      this.testResults.duration = Date.now() - startTime;
      this.printSummary();
      throw error;
    }
  }

  async runSpecificController(controllerName) {
    console.log(`🎯 Running tests for ${controllerName} controller...\n`);
    
    try {
      const output = execSync(`npm test -- --testNamePattern="${controllerName}"`, {
        encoding: 'utf8',
        cwd: path.resolve(__dirname, '..')
      });
      
      console.log(output);
      console.log(`✅ ${controllerName} controller tests completed!`);
      
    } catch (error) {
      console.error(`❌ ${controllerName} controller tests failed:`, error.message);
      throw error;
    }
  }

  async runIntegrationTests() {
    console.log('🔗 Running integration tests...\n');
    
    try {
      const output = execSync('npm test -- tests/integration/', {
        encoding: 'utf8',
        cwd: path.resolve(__dirname, '..')
      });
      
      console.log(output);
      console.log('✅ Integration tests completed!');
      
    } catch (error) {
      console.error('❌ Integration tests failed:', error.message);
      throw error;
    }
  }

  parseTestResults(output) {
    // Parse Jest output for test results
    const passedMatch = output.match(/(\d+) passed/);
    const failedMatch = output.match(/(\d+) failed/);
    const totalMatch = output.match(/Tests:\s+(\d+)/);
    
    if (passedMatch) this.testResults.passed = parseInt(passedMatch[1]);
    if (failedMatch) this.testResults.failed = parseInt(failedMatch[1]);
    if (totalMatch) this.testResults.total = parseInt(totalMatch[1]);
    
    // Parse coverage information
    const coverageMatch = output.match(/All files\s+\|\s+([\d.]+)/);
    if (coverageMatch) {
      this.testResults.coverage = parseFloat(coverageMatch[1]);
    }
  }

  printSummary() {
    console.log('\n📋 TEST AUTOMATION SUMMARY');
    console.log('=' .repeat(50));
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📊 Total: ${this.testResults.total}`);
    console.log(`⏱️  Duration: ${(this.testResults.duration / 1000).toFixed(2)}s`);
    
    if (this.testResults.coverage) {
      console.log(`📈 Coverage: ${this.testResults.coverage}%`);
    }
    
    console.log('=' .repeat(50));
    
    if (this.testResults.failed > 0) {
      console.log('❌ Some tests failed. Check the output above for details.');
    } else {
      console.log('🎉 All tests passed successfully!');
    }
  }

  async generateTestReport() {
    const report = {
      timestamp: new Date().toISOString(),
      results: this.testResults,
      environment: {
        nodeVersion: process.version,
        platform: process.platform
      }
    };
    
    const reportPath = path.join(__dirname, '../test-reports');
    if (!fs.existsSync(reportPath)) {
      fs.mkdirSync(reportPath, { recursive: true });
    }
    
    const fileName = `test-report-${Date.now()}.json`;
    fs.writeFileSync(
      path.join(reportPath, fileName),
      JSON.stringify(report, null, 2)
    );
    
    console.log(`📄 Test report saved: ${fileName}`);
  }

  async validateTestCoverage(minimumCoverage = 80) {
    if (!this.testResults.coverage) {
      console.log('⚠️  Coverage information not available');
      return false;
    }
    
    if (this.testResults.coverage >= minimumCoverage) {
      console.log(`✅ Coverage target met: ${this.testResults.coverage}% >= ${minimumCoverage}%`);
      return true;
    } else {
      console.log(`❌ Coverage target not met: ${this.testResults.coverage}% < ${minimumCoverage}%`);
      return false;
    }
  }
}

// CLI interface
if (require.main === module) {
  const automation = new TestAutomation();
  const command = process.argv[2];
  
  (async () => {
    try {
      switch (command) {
        case 'all':
          await automation.runAllTests();
          await automation.generateTestReport();
          break;
          
        case 'controller':
          const controllerName = process.argv[3];
          if (!controllerName) {
            console.error('Please specify controller name: npm run test:automation controller <name>');
            process.exit(1);
          }
          await automation.runSpecificController(controllerName);
          break;
          
        case 'integration':
          await automation.runIntegrationTests();
          break;
          
        case 'coverage':
          await automation.runAllTests();
          await automation.validateTestCoverage(80);
          break;
          
        default:
          console.log('Available commands:');
          console.log('  all        - Run all tests with coverage');
          console.log('  controller - Run specific controller tests');
          console.log('  integration- Run integration tests');
          console.log('  coverage   - Run tests and validate coverage');
          break;
      }
    } catch (error) {
      console.error('Test automation failed:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = TestAutomation;