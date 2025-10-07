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
const alertRuleRoutes = require('./src/routes/alertRuleRoutes');
const assessmentTemplateRoutes = require('./src/routes/assessmentTemplateRoutes');
const assessmentTemplateEnhancedRoutes = require('./src/routes/assessmentTemplateRoutes.enhanced');
const conditionPresetRoutes = require('./src/routes/conditionPresetRoutes');

// Import new routes
const drugRoutes = require('./src/routes/drugRoutes');
const patientMedicationRoutes = require('./src/routes/patientMedicationRoutes');

// Import authentication
const passport = require('passport');
const authRoutes = require('./src/routes/authRoutes');

// Initialize passport
app.use(passport.initialize());

// Authentication routes
app.use('/auth', authRoutes);

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

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Pain Management Database API',
    version: '1.0.0',
    endpoints: {
      patients: '/api/patients',
      clinicians: '/api/clinicians',
      enrollments: '/api/enrollments',
      'metric-definitions': '/api/metric-definitions',
      'assessment-templates': '/api/assessment-templates',
      observations: '/api/observations',
      alerts: '/api/alerts',
      'alert-rules': '/api/alert-rules',
      'condition-presets': '/api/condition-presets',
      drugs: '/api/drugs',
      'patient-medications': '/api/patient-medications'
    }
  });
});

// Routes
app.use('/api/patients', patientRoutes);
app.use('/api/clinicians', clinicianRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/metric-definitions', metricDefinitionRoutes);
// Enhanced assessment template routes with different path to avoid conflicts
app.use('/api/assessment-templates-v2', assessmentTemplateEnhancedRoutes);
app.use('/api/assessment-templates', assessmentTemplateRoutes);
app.use('/api/observations', observationRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/alert-rules', alertRuleRoutes);
app.use('/api/condition-presets', conditionPresetRoutes);

// New medication routes
app.use('/api/drugs', drugRoutes);
app.use('/api/patient-medications', patientMedicationRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Prisma errors
  if (err.code === 'P2002') {
    return res.status(400).json({
      error: 'Duplicate entry',
      message: 'A record with this information already exists'
    });
  }
  
  if (err.code === 'P2025') {
    return res.status(404).json({
      error: 'Not found',
      message: 'The requested record was not found'
    });
  }
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`API info: http://localhost:${PORT}/api`);
  });
}

module.exports = { app, prisma };