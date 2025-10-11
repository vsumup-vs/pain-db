/**
 * Enhanced Observation Controller
 * 
 * Provides observation endpoints with context awareness and continuity features
 */

const SmartAssessmentContinuityService = require('../services/smartAssessmentContinuityService');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class EnhancedObservationController {
  constructor() {
    this.continuityService = new SmartAssessmentContinuityService();
  }

  /**
   * Create observation with context awareness
   * POST /api/observations/with-context
   */
  async createObservationWithContext(req, res) {
    try {
      const observationData = req.body;

      // Validate required fields
      if (!observationData.patientId || !observationData.clinicianId || !observationData.metricDefinitionId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: patientId, clinicianId, metricDefinitionId'
        });
      }

      const result = await this.continuityService.createObservationWithContext(observationData);

      res.status(201).json({
        success: true,
        data: result,
        message: result.message
      });

    } catch (error) {
      console.error('Error creating observation with context:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create observation with context',
        error: error.message
      });
    }
  }

  /**
   * Get observations with context filtering
   * GET /api/patients/:patientId/observations/context
   */
  async getObservationsWithContext(req, res) {
    try {
      const { patientId } = req.params;
      const { 
        context, 
        enrollmentId, 
        billingRelevant, 
        providerReviewed,
        metricDefinitionId,
        limit = 50, 
        offset = 0 
      } = req.query;

      // Build where clause
      const where = { patientId };
      
      if (context) where.context = context;
      if (enrollmentId) where.enrollmentId = enrollmentId;
      if (billingRelevant !== undefined) where.billingRelevant = billingRelevant === 'true';
      if (providerReviewed !== undefined) where.providerReviewed = providerReviewed === 'true';
      if (metricDefinitionId) where.metricDefinitionId = metricDefinitionId;

      const observations = await prisma.observation.findMany({
        where,
        include: {
          metricDefinition: true,
          clinician: {
            select: { id: true, firstName: true, lastName: true }
          }
        },
        orderBy: { recordedAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      });

      // Get total count for pagination
      const total = await prisma.observation.count({ where });

      res.json({
        success: true,
        data: observations,
        pagination: {
          total,
          pages: Math.ceil(total / parseInt(limit)),
          currentPage: Math.floor(parseInt(offset) / parseInt(limit)) + 1
        }
      });

    } catch (error) {
      console.error('Error getting observations with context:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get observations with context',
        error: error.message
      });
    }
  }

  /**
   * Update observation provider review status
   * PATCH /api/observations/:observationId/review
   */
  async updateProviderReview(req, res) {
    try {
      const { observationId } = req.params;
      const { providerReviewed, reviewedBy, reviewNotes } = req.body;

      const updatedObservation = await prisma.observation.update({
        where: { id: observationId },
        data: {
          providerReviewed: providerReviewed === true,
          reviewedBy: reviewedBy || null,
          reviewedAt: providerReviewed === true ? new Date() : null,
          notes: reviewNotes ? `${req.body.notes || ''}\n[Review: ${reviewNotes}]`.trim() : req.body.notes
        },
        include: {
          metricDefinition: true,
          clinician: {
            select: { id: true, firstName: true, lastName: true }
          }
        }
      });

      res.json({
        success: true,
        data: updatedObservation,
        message: `Observation ${providerReviewed ? 'approved' : 'marked for review'} by provider`
      });

    } catch (error) {
      console.error('Error updating provider review:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update provider review status',
        error: error.message
      });
    }
  }
}

module.exports = EnhancedObservationController;