const fs = require('fs');

// Read the seed file
const seedFile = '/home/vsumup/pain-db/seed-rtm-standard.js';
let content = fs.readFileSync(seedFile, 'utf8');

// Find and replace the MetricDefinition.create data object
const oldPattern = `      const created = await prisma.metricDefinition.create({
        data: {
          name: metric.displayName,`;

const newPattern = `      const created = await prisma.metricDefinition.create({
        data: {
          key: metric.key,
          name: metric.displayName,`;

content = content.replace(oldPattern, newPattern);

// Write the file back
fs.writeFileSync(seedFile, content);

console.log('✅ Fixed seed script - added key field to MetricDefinition.create()');
