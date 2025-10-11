const fs = require('fs');
const path = require('path');

const controllerPath = path.join(__dirname, 'src', 'controllers', 'observationController.js');
let content = fs.readFileSync(controllerPath, 'utf8');

// Replace metricDefinition with metric in includes
content = content.replace(/metricDefinition:/g, 'metric:');

fs.writeFileSync(controllerPath, content);
console.log('✅ Updated observation controller to use correct relationship names');
