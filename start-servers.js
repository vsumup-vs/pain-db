#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function colorLog(color, prefix, message) {
    console.log(`${colors[color]}[${prefix}]${colors.reset} ${message}`);
}

function info(message) {
    colorLog('blue', 'INFO', message);
}

function success(message) {
    colorLog('green', 'SUCCESS', message);
}

function warning(message) {
    colorLog('yellow', 'WARNING', message);
}

function error(message) {
    colorLog('red', 'ERROR', message);
}

// Check if port is in use
function checkPort(port) {
    return new Promise((resolve) => {
        const cmd = process.platform === 'win32' 
            ? `netstat -an | findstr :${port}`
            : `lsof -i :${port}`;
        
        exec(cmd, (err, stdout) => {
            resolve(stdout.length > 0);
        });
    });
}

// Kill process on port
function killPort(port) {
    return new Promise((resolve) => {
        const cmd = process.platform === 'win32'
            ? `for /f "tokens=5" %a in ('netstat -aon ^| findstr :${port}') do taskkill /f /pid %a`
            : `lsof -ti:${port} | xargs kill -9`;
        
        exec(cmd, () => resolve());
    });
}

// Check if directory exists
function dirExists(dir) {
    return fs.existsSync(dir);
}

// Install dependencies
function installDependencies(dir = '.') {
    return new Promise((resolve, reject) => {
        const npm = spawn('npm', ['install'], { 
            cwd: dir, 
            stdio: 'inherit',
            shell: true 
        });
        
        npm.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`npm install failed with code ${code}`));
            }
        });
    });
}

// Run Prisma setup
function setupDatabase() {
    return new Promise((resolve) => {
        info('Setting up database...');
        
        const generate = spawn('npx', ['prisma', 'generate'], { 
            stdio: 'inherit',
            shell: true 
        });
        
        generate.on('close', () => {
            const migrate = spawn('npx', ['prisma', 'migrate', 'dev', '--name', 'init'], { 
                stdio: 'pipe',
                shell: true 
            });
            
            migrate.on('close', () => resolve());
        });
    });
}

// Start server
function startServer(name, command, args, cwd = '.') {
    return new Promise((resolve, reject) => {
        info(`Starting ${name}...`);
        
        const server = spawn(command, args, {
            cwd,
            stdio: 'pipe',
            shell: true
        });
        
        server.stdout.on('data', (data) => {
            console.log(`${colors.cyan}[${name}]${colors.reset} ${data.toString().trim()}`);
        });
        
        server.stderr.on('data', (data) => {
            console.log(`${colors.magenta}[${name}]${colors.reset} ${data.toString().trim()}`);
        });
        
        server.on('close', (code) => {
            if (code !== 0) {
                error(`${name} exited with code ${code}`);
            }
        });
        
        // Give server time to start
        setTimeout(() => resolve(server), 3000);
    });
}

async function main() {
    console.log('\n🚀 Pain Management Platform - Server Startup\n');
    
    // Check if we're in the right directory
    if (!fs.existsSync('package.json') || !fs.existsSync('frontend')) {
        error('Please run this script from the pain-db root directory');
        process.exit(1);
    }
    
    try {
        // Check and install backend dependencies
        if (!dirExists('node_modules')) {
            info('Installing backend dependencies...');
            await installDependencies('.');
        }
        
        // Check and install frontend dependencies
        if (!dirExists('frontend/node_modules')) {
            info('Installing frontend dependencies...');
            await installDependencies('frontend');
        }
        
        // Setup database
        await setupDatabase();
        
        // Check ports
        const backendPort = process.env.PORT || 3000;
        const frontendPort = 5173;
        
        if (await checkPort(backendPort)) {
            warning(`Port ${backendPort} is in use. Attempting to free it...`);
            await killPort(backendPort);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        if (await checkPort(frontendPort)) {
            warning(`Port ${frontendPort} is in use. Attempting to free it...`);
            await killPort(frontendPort);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Start servers
        const backendServer = await startServer('Backend', 'npm', ['run', 'dev']);
        const frontendServer = await startServer('Frontend', 'npm', ['run', 'dev'], 'frontend');
        
        success('✅ All servers are running!\n');
        console.log('📊 Server Information:');
        console.log(`  🔧 Backend API:  http://localhost:${backendPort}`);
        console.log(`  🎨 Frontend UI:  http://localhost:${frontendPort}\n`);
        console.log('🛑 Press Ctrl+C to stop all servers\n');
        
        // Handle cleanup
        process.on('SIGINT', () => {
            warning('Shutting down servers...');
            backendServer.kill();
            frontendServer.kill();
            process.exit(0);
        });
        
        process.on('SIGTERM', () => {
            warning('Shutting down servers...');
            backendServer.kill();
            frontendServer.kill();
            process.exit(0);
        });
        
    } catch (err) {
        error(`Failed to start servers: ${err.message}`);
        process.exit(1);
    }
}

main();