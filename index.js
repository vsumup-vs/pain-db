const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { PrismaClient } = require('@prisma/client');

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
const careProgramRoutes = require('./src/routes/careProgramRoutes');

// Import new routes
const drugRoutes = require('./src/routes/drugRoutes');
const patientMedicationRoutes = require('./src/routes/patientMedicationRoutes');
const continuityRoutes = require('./src/routes/continuityRoutes');
const organizationRoutes = require('./src/routes/organizationRoutes');
const taskRoutes = require('./src/routes/taskRoutes');
const billingRoutes = require('./src/routes/billingRoutes');
const encounterNoteRoutes = require('./src/routes/encounterNoteRoutes');
const timeTrackingRoutes = require('./src/routes/timeTrackingRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');
const platformRoutes = require('./src/routes/platformRoutes');

// Import authentication
const passport = require('passport');
const authRoutes = require('./src/routes/authRoutes');
const sseRoutes = require('./src/routes/sseRoutes');

// Import alert scheduler for background jobs
const alertScheduler = require('./src/services/alertScheduler');

// Initialize passport
app.use(passport.initialize());

// Import authentication and organization middleware
const { requireAuth } = require('./src/middleware/auth');
const { injectOrganizationContext, auditOrganizationAccess } = require('./src/middleware/organizationContext');

// Authentication routes (public)
app.use('/api/auth', authRoutes);

// SSE routes (real-time updates) - requires authentication but handled internally
app.use('/api/sse', sseRoutes);

// Add health check routes (public)
const healthRoutes = require('./src/routes/healthRoutes');
app.use('/', healthRoutes);

// Health check endpoint (public)
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

// API info endpoint (public)
app.get('/api', (req, res) => {
  res.json({
    message: 'Pain Management Database API',
    version: '1.0.0',
    endpoints: {
      // Authentication endpoints
      auth: '/api/auth',
      'auth-login': '/api/auth/login',
      'auth-register': '/api/auth/register',
      'auth-logout': '/api/auth/logout',
      'auth-refresh': '/api/auth/refresh',
      'auth-profile': '/api/auth/me',
      'auth-social-google': '/api/auth/google',
      'auth-social-microsoft': '/api/auth/microsoft',

      // Core API endpoints
      patients: '/api/patients',
      clinicians: '/api/clinicians',
      enrollments: '/api/enrollments',
      'metric-definitions': '/api/metric-definitions',
      'assessment-templates': '/api/assessment-templates',
      observations: '/api/observations',
      alerts: '/api/alerts',
      tasks: '/api/tasks',
      'encounter-notes': '/api/encounter-notes',
      'alert-rules': '/api/alert-rules',
      'condition-presets': '/api/condition-presets',
      drugs: '/api/drugs',
      'patient-medications': '/api/patient-medications',
      billing: '/api/billing',
      'care-programs': '/api/care-programs'
    }
  });
});

// SECURITY: Apply authentication and organization context to all protected routes
// This ensures all API endpoints have:
// 1. Valid authentication (requireAuth)
// 2. Organization context validation (injectOrganizationContext) - for organization-specific resources
// 3. Audit logging for security events (auditOrganizationAccess)

// Organization-specific routes (require organization context)
app.use('/api/patients', requireAuth, injectOrganizationContext, auditOrganizationAccess, patientRoutes);
app.use('/api/clinicians', requireAuth, injectOrganizationContext, auditOrganizationAccess, clinicianRoutes);
app.use('/api/enrollments', requireAuth, injectOrganizationContext, auditOrganizationAccess, enrollmentRoutes);
app.use('/api/observations', requireAuth, injectOrganizationContext, auditOrganizationAccess, observationRoutes);
app.use('/api/alerts', requireAuth, injectOrganizationContext, auditOrganizationAccess, alertRoutes);
app.use('/api/tasks', requireAuth, injectOrganizationContext, auditOrganizationAccess, taskRoutes);
app.use('/api/encounter-notes', requireAuth, injectOrganizationContext, auditOrganizationAccess, encounterNoteRoutes);
app.use('/api/drugs', requireAuth, injectOrganizationContext, auditOrganizationAccess, drugRoutes);
app.use('/api/patient-medications', requireAuth, injectOrganizationContext, auditOrganizationAccess, patientMedicationRoutes);
app.use('/api/continuity', requireAuth, injectOrganizationContext, auditOrganizationAccess, continuityRoutes);
app.use('/api/billing', requireAuth, injectOrganizationContext, auditOrganizationAccess, billingRoutes);
app.use('/api/time-tracking', requireAuth, injectOrganizationContext, auditOrganizationAccess, timeTrackingRoutes);
app.use('/api/analytics', requireAuth, injectOrganizationContext, auditOrganizationAccess, analyticsRoutes);
app.use('/api/care-programs', requireAuth, injectOrganizationContext, auditOrganizationAccess, careProgramRoutes);

// Platform configuration routes (platform-wide resources, no organization context needed)
// These are managed by SUPER_ADMIN and available to all organizations
app.use('/api/metric-definitions', requireAuth, metricDefinitionRoutes);
app.use('/api/assessment-templates-v2', requireAuth, assessmentTemplateEnhancedRoutes);
app.use('/api/assessment-templates', requireAuth, assessmentTemplateRoutes);
app.use('/api/alert-rules', requireAuth, alertRuleRoutes);
app.use('/api/condition-presets', requireAuth, conditionPresetRoutes);

// Admin routes (SUPER_ADMIN and ORG_ADMIN)
// Note: Organizations don't need organization context middleware since they manage organizations themselves
app.use('/api/organizations', requireAuth, organizationRoutes);

// Platform admin routes (PLATFORM_ADMIN only - no organization context needed)
// Platform admins manage all client organizations from a central dashboard
app.use('/api/platform', platformRoutes);

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
  alertScheduler.stopScheduledJobs();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  alertScheduler.stopScheduledJobs();
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`API info: http://localhost:${PORT}/api`);

    // Start alert evaluation scheduled jobs
    console.log('🔄 Starting alert evaluation engine...');
    alertScheduler.startScheduledJobs();
    console.log('✅ Alert evaluation engine started successfully');
  });
}

module.exports = { app, prisma };