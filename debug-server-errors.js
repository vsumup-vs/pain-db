const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

const app = express();
const PORT = 3001; // Use different port to avoid conflicts

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Enhanced request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Request body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Import authentication routes with error handling
const authRoutes = require('./src/routes/authRoutes');

// Add detailed error logging middleware before routes
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function(data) {
    if (res.statusCode >= 400) {
      console.error(`❌ Error Response [${res.statusCode}]:`, data);
    }
    return originalSend.call(this, data);
  };
  next();
});

app.use('/api/auth', authRoutes);

// Health check
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error('🚨 Unhandled Error:', err);
  console.error('Stack trace:', err.stack);
  console.error('Request details:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body
  });
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

async function startServerAndTest() {
  const server = app.listen(PORT, async () => {
    console.log(`🔍 Debug server running on port ${PORT}`);
    
    try {
      // Wait a moment for server to fully start
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Test health
      console.log('\n🏥 Testing health...');
      const health = await axios.get(`http://localhost:${PORT}/health`);
      console.log('✅ Health check passed:', health.data);
      
      // Clean up test user
      console.log('\n🧹 Cleaning up test user...');
      await prisma.user.deleteMany({
        where: { email: 'test@example.com' }
      });
      
      // Get organization
      const org = await prisma.organization.findFirst();
      console.log('🏢 Organization found:', org?.name);
      
      // Test registration
      console.log('\n🧪 Testing registration...');
      const registrationData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        organizationId: org?.id,
        role: 'CLINICIAN'
      };
      
      console.log('📤 Sending registration request...');
      const response = await axios.post(`http://localhost:${PORT}/api/auth/register`, registrationData);
      console.log('✅ Registration successful!');
      console.log('Response:', response.data);
      
    } catch (error) {
      console.log('\n❌ Test failed!');
      console.log('Error:', error.message);
      if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Response:', error.response.data);
      }
    } finally {
      await prisma.$disconnect();
      server.close();
    }
  });
}

startServerAndTest();