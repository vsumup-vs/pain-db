const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class TestMonitor {
  constructor() {
    this.reportDir = path.join(__dirname, '../test-reports');
    this.ensureReportDir();
  }

  ensureReportDir() {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  async monitorTestHealth() {
    console.log('🔍 Monitoring test health...\n');

    const health = {
      timestamp: new Date().toISOString(),
      testFiles: this.analyzeTestFiles(),
      coverage: await this.analyzeCoverage(),
      performance: await this.analyzePerformance(),
      dependencies: this.analyzeDependencies()
    };

    this.generateHealthReport(health);
    return health;
  }

  analyzeTestFiles() {
    const testDir = path.join(__dirname, 'controllers');
    const testFiles = fs.readdirSync(testDir).filter(f => f.endsWith('.test.js'));
    
    const analysis = {
      total: testFiles.length,
      files: [],
      coverage: {
        controllers: 0,
        missing: []
      }
    };

    // Check which controllers have tests
    const controllerDir = path.join(__dirname, '../src/controllers');
    const controllers = fs.readdirSync(controllerDir).filter(f => f.endsWith('.js'));
    
    controllers.forEach(controller => {
      const testFile = controller.replace('.js', '.test.js');
      const hasTest = testFiles.includes(testFile);
      
      if (hasTest) {
        analysis.coverage.controllers++;
        
        // Analyze test file content
        const testPath = path.join(testDir, testFile);
        const content = fs.readFileSync(testPath, 'utf8');
        
        analysis.files.push({
          name: testFile,
          controller: controller,
          lines: content.split('\n').length,
          testCases: (content.match(/it\(/g) || []).length,
          describes: (content.match(/describe\(/g) || []).length
        });
      } else {
        analysis.coverage.missing.push(controller);
      }
    });

    return analysis;
  }

  async analyzeCoverage() {
    try {
      // Run tests with coverage
      execSync('npm run test:coverage -- --silent', { stdio: 'pipe' });
      
      // Read coverage report
      const coverageFile = path.join(__dirname, '../coverage/coverage-summary.json');
      if (fs.existsSync(coverageFile)) {
        const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
        return {
          total: coverage.total,
          byFile: Object.keys(coverage)
            .filter(key => key !== 'total')
            .map(file => ({
              file: file.replace(process.cwd(), ''),
              ...coverage[file]
            }))
        };
      }
    } catch (error) {
      console.warn('Could not analyze coverage:', error.message);
    }
    
    return null;
  }

  async analyzePerformance() {
    const startTime = Date.now();
    
    try {
      // Run a quick test to measure performance
      execSync('npm test -- --testNamePattern="should" --maxWorkers=1', { 
        stdio: 'pipe',
        timeout: 30000
      });
      
      const duration = Date.now() - startTime;
      
      return {
        testDuration: duration,
        averagePerTest: duration / 10, // Rough estimate
        status: duration < 10000 ? 'good' : duration < 20000 ? 'warning' : 'slow'
      };
    } catch (error) {
      return {
        testDuration: Date.now() - startTime,
        status: 'error',
        error: error.message
      };
    }
  }

  analyzeDependencies() {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')
    );
    
    const testDeps = packageJson.devDependencies || {};
    
    return {
      testFramework: testDeps.jest ? 'Jest' : 'Unknown',
      testingLibraries: Object.keys(testDeps).filter(dep => 
        dep.includes('test') || dep.includes('jest') || dep.includes('supertest')
      ),
      total: Object.keys(testDeps).length
    };
  }

  generateHealthReport(health) {
    const reportPath = path.join(this.reportDir, `health-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(health, null, 2));
    
    // Generate human-readable summary
    console.log('📊 TEST HEALTH SUMMARY');
    console.log('=' .repeat(50));
    console.log(`📁 Test Files: ${health.testFiles.total}`);
    console.log(`🎯 Controller Coverage: ${health.testFiles.coverage.controllers}/${health.testFiles.coverage.controllers + health.testFiles.coverage.missing.length}`);
    
    if (health.testFiles.coverage.missing.length > 0) {
      console.log(`❌ Missing Tests: ${health.testFiles.coverage.missing.join(', ')}`);
    }
    
    if (health.coverage) {
      console.log(`📈 Code Coverage: ${health.coverage.total.lines.pct}%`);
    }
    
    if (health.performance) {
      console.log(`⏱️  Performance: ${health.performance.status} (${health.performance.testDuration}ms)`);
    }
    
    console.log('=' .repeat(50));
    console.log(`📄 Full report: ${reportPath}`);
  }

  async watchTests() {
    console.log('👀 Starting test watcher...\n');
    
    const chokidar = require('chokidar');
    
    // Watch test files and source files
    const watcher = chokidar.watch([
      'tests/**/*.test.js',
      'src/**/*.js'
    ], {
      ignored: /node_modules/,
      persistent: true
    });
    
    watcher.on('change', async (filePath) => {
      console.log(`🔄 File changed: ${filePath}`);
      
      if (filePath.includes('.test.js')) {
        // Run specific test file
        try {
          execSync(`npm test -- ${filePath}`, { stdio: 'inherit' });
        } catch (error) {
          console.error('Test failed:', error.message);
        }
      } else {
        // Run related tests
        const testFile = filePath
          .replace('src/', 'tests/')
          .replace('.js', '.test.js');
        
        if (fs.existsSync(testFile)) {
          try {
            execSync(`npm test -- ${testFile}`, { stdio: 'inherit' });
          } catch (error) {
            console.error('Test failed:', error.message);
          }
        }
      }
    });
    
    console.log('Watching for changes... Press Ctrl+C to stop.');
  }
}

// CLI interface
if (require.main === module) {
  const monitor = new TestMonitor();
  const command = process.argv[2];
  
  (async () => {
    switch (command) {
      case 'health':
        await monitor.monitorTestHealth();
        break;
        
      case 'watch':
        await monitor.watchTests();
        break;
        
      default:
        console.log('Test Monitor Commands:');
        console.log('  health - Analyze test health and coverage');
        console.log('  watch  - Watch files and run tests on changes');
        break;
    }
  })();
}

module.exports = TestMonitor;