#!/usr/bin/env node
/**
 * API Documentation Generator
 *
 * Automatically generates API endpoint documentation
 * by scanning route files and extracting endpoint definitions.
 *
 * Usage: node scripts/generate-api-docs.js
 */

const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.join(__dirname, '../src/routes');
const OUTPUT_PATH = path.join(__dirname, '../docs/api-endpoints-generated.md');

function scanRouteFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath, '.js');
  const endpoints = [];

  // Extract route definitions
  const routeRegex = /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*([^)]+)\)/g;
  let match;

  while ((match = routeRegex.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    const path = match[2];
    const middlewareChain = match[3];

    // Extract controller function
    const controllerMatch = middlewareChain.match(/(\w+Controller)\.(\w+)/);
    const controller = controllerMatch ? controllerMatch[1] : 'unknown';
    const functionName = controllerMatch ? controllerMatch[2] : 'unknown';

    // Check for auth middleware
    const requiresAuth = middlewareChain.includes('requireAuth') || middlewareChain.includes('authenticate');

    // Check for permission middleware
    const permissionMatch = middlewareChain.match(/requirePermission\(['"`](\w+)['"`]\)/);
    const permission = permissionMatch ? permissionMatch[1] : null;

    endpoints.push({
      method,
      path,
      controller,
      functionName,
      requiresAuth,
      permission,
      file: fileName
    });
  }

  return endpoints;
}

function scanAllRoutes() {
  const routeFiles = fs.readdirSync(ROUTES_DIR)
    .filter(file => file.endsWith('.js'))
    .map(file => path.join(ROUTES_DIR, file));

  const allEndpoints = [];

  routeFiles.forEach(file => {
    const endpoints = scanRouteFile(file);
    allEndpoints.push(...endpoints);
  });

  return allEndpoints;
}

function groupEndpointsByPrefix(endpoints) {
  const grouped = {};

  endpoints.forEach(endpoint => {
    const prefix = endpoint.path.split('/')[1] || 'root';
    if (!grouped[prefix]) {
      grouped[prefix] = [];
    }
    grouped[prefix].push(endpoint);
  });

  return grouped;
}

function generateMarkdown(endpoints) {
  let markdown = `# API Endpoints Reference\n\n`;
  markdown += `> **Auto-generated** from route files\n`;
  markdown += `> Last Updated: ${new Date().toISOString()}\n\n`;

  markdown += `## Overview\n\n`;
  markdown += `Total Endpoints: ${endpoints.length}\n\n`;

  const grouped = groupEndpointsByPrefix(endpoints);

  Object.keys(grouped).sort().forEach(prefix => {
    markdown += `## ${prefix.charAt(0).toUpperCase() + prefix.slice(1)} Endpoints\n\n`;
    markdown += `| Method | Endpoint | Controller | Function | Auth | Permission |\n`;
    markdown += `|--------|----------|------------|----------|------|------------|\n`;

    grouped[prefix].forEach(endpoint => {
      const auth = endpoint.requiresAuth ? '✅' : '❌';
      const perm = endpoint.permission || '-';

      markdown += `| ${endpoint.method} | \`${endpoint.path}\` | ${endpoint.controller} | ${endpoint.functionName} | ${auth} | ${perm} |\n`;
    });

    markdown += `\n`;
  });

  // Add authentication guide
  markdown += `## Authentication Guide\n\n`;
  markdown += `### Required Headers\n\n`;
  markdown += `For endpoints marked with ✅ in the Auth column:\n\n`;
  markdown += `\`\`\`http\n`;
  markdown += `Authorization: Bearer <access_token>\n`;
  markdown += `Content-Type: application/json\n`;
  markdown += `\`\`\`\n\n`;

  markdown += `### Getting an Access Token\n\n`;
  markdown += `\`\`\`bash\n`;
  markdown += `curl -X POST http://localhost:3000/api/auth/login \\\n`;
  markdown += `  -H "Content-Type: application/json" \\\n`;
  markdown += `  -d '{"email":"user@example.com","password":"password123"}'\n`;
  markdown += `\`\`\`\n\n`;

  markdown += `Response:\n`;
  markdown += `\`\`\`json\n`;
  markdown += `{\n`;
  markdown += `  "success": true,\n`;
  markdown += `  "token": "eyJhbGc...",\n`;
  markdown += `  "refreshToken": "eyJhbGc...",\n`;
  markdown += `  "user": { ... }\n`;
  markdown += `}\n`;
  markdown += `\`\`\`\n\n`;

  return markdown;
}

function main() {
  console.log('Scanning route files...');
  const endpoints = scanAllRoutes();

  console.log(`Found ${endpoints.length} API endpoints`);

  console.log('Generating markdown documentation...');
  const markdown = generateMarkdown(endpoints);

  fs.writeFileSync(OUTPUT_PATH, markdown, 'utf-8');

  console.log(`✅ API documentation generated at: ${OUTPUT_PATH}`);

  // Group by prefix for summary
  const grouped = groupEndpointsByPrefix(endpoints);
  console.log(`\nEndpoints by category:`);
  Object.keys(grouped).sort().forEach(prefix => {
    console.log(`  ${prefix}: ${grouped[prefix].length} endpoints`);
  });
}

if (require.main === module) {
  main();
}

module.exports = { scanRouteFile, scanAllRoutes, generateMarkdown };
