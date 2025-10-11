const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Check authentication service components
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        authentication: 'ready',
        jwt: process.env.JWT_SECRET ? 'configured' : 'missing',
        social_auth: {
          google: process.env.GOOGLE_CLIENT_ID ? 'configured' : 'missing',
          microsoft: process.env.MICROSOFT_CLIENT_ID ? 'configured' : 'missing'
        }
      },
      version: '1.0.0'
    };

    res.status(200).json(healthStatus);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

module.exports = router;