const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Import routes
const patientRoutes = require('./src/routes/patientRoutes');
const clinicianRoutes = require('./src/routes/clinicianRoutes');
const enrollmentRoutes = require('./src/routes/enrollmentRoutes');
const metricDefinitionRoutes = require('./src/routes/metricDefinitionRoutes');
const observationRoutes = require('./src/routes/observationRoutes');
const alertRoutes = require('./src/routes/alertRoutes');

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy', 
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// API Routes
app.get('/api', (req, res) => {
  res.json({
    message: 'Pain-DB API Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      patients: '/api/patients',
      clinicians: '/api/clinicians',
      enrollments: '/api/enrollments',
      observations: '/api/observations',
      alerts: '/api/alerts'
    }
  });
});

// Use routes
// Routes
app.use('/api/patients', patientRoutes);
app.use('/api/clinicians', clinicianRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/metric-definitions', metricDefinitionRoutes);
app.use('/api/observations', observationRoutes);
app.use('/api/alerts', alertRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'Unique constraint violation',
      message: 'A record with this data already exists'
    });
  }
  
  if (err.code === 'P2025') {
    return res.status(404).json({
      error: 'Record not found',
      message: 'The requested record does not exist'
    });
  }
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler - Fixed the wildcard route
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Pain-DB API Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📖 API info: http://localhost:${PORT}/api`);
});

// Export for testing
module.exports = { app, prisma };