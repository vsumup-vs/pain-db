#!/bin/bash

echo "🔔 Testing Alert Reminder Service Components"
echo "============================================="

echo ""
echo "1. Testing API Health (if server is running):"
curl -s http://localhost:3000/health || echo "❌ Server not responding"

echo ""
echo "2. Testing Alert Rules API:"
curl -s http://localhost:3000/api/alert-rules | head -100 || echo "❌ Alert Rules API not responding"

echo ""
echo "3. Testing Alerts API:"
curl -s http://localhost:3000/api/alerts/stats || echo "❌ Alerts API not responding"

echo ""
echo "4. Testing Enrollments API:"
curl -s "http://localhost:3000/api/enrollments?limit=5" | head -100 || echo "❌ Enrollments API not responding"

echo ""
echo "5. Checking for reminder-related files:"
echo "- Reminder Service: $(ls -la src/services/reminderService.js 2>/dev/null || echo 'Not found')"
echo "- Notification Service: $(ls -la src/services/notificationService.js 2>/dev/null || echo 'Not found')"
echo "- Scheduler Service: $(ls -la src/services/schedulerService.js 2>/dev/null || echo 'Not found')"

echo ""
echo "6. Checking Prisma import paths in reminder services:"
echo "- Reminder Service import:"
head -1 src/services/reminderService.js 2>/dev/null || echo "File not found"
echo "- Notification Service import:"
head -1 src/services/notificationService.js 2>/dev/null || echo "File not found"
echo "- Scheduler Service import:"
head -2 src/services/schedulerService.js | tail -1 2>/dev/null || echo "File not found"

echo ""
echo "7. Testing Node.js module loading:"
node -e "
try {
  console.log('Testing Prisma client...');
  const { PrismaClient } = require('@prisma/client');
  console.log('✅ Prisma client loads successfully');
  
  console.log('Testing reminder service...');
  const reminderService = require('./src/services/reminderService');
  console.log('✅ Reminder service loads successfully');
  
  console.log('Testing notification service...');
  const notificationService = require('./src/services/notificationService');
  console.log('✅ Notification service loads successfully');
  
  console.log('Testing scheduler service...');
  const schedulerService = require('./src/services/schedulerService');
  console.log('✅ Scheduler service loads successfully');
  
} catch (error) {
  console.log('❌ Error loading modules:', error.message);
}
" 2>/dev/null || echo "❌ Node.js module test failed"

echo ""
echo "============================================="
echo "Test completed!"