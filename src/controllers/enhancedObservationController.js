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
      if (!observationData.patientId || !observationData.metricDefinitionId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: patientId, metricDefinitionId'
        });
      }

      // Fetch patient with organization details to check organization type
      const patient = await prisma.patient.findUnique({
        where: { id: observationData.patientId },
        select: {
          id: true,
          organizationId: true,
          organization: {
            select: {
              id: true,
              type: true,
              name: true
            }
          }
        }
      });

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }

      // Block PLATFORM organizations from creating observations (patient-care feature)
      if (patient.organization.type === 'PLATFORM') {
        return res.status(403).json({
          success: false,
          message: 'Observation recording is not available for platform organizations. This is a patient-care feature for healthcare providers only.'
        });
      }

      // Add organizationId to observation data (required field)
      observationData.organizationId = patient.organizationId;

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
        metricId,
        limit = 50,
        offset = 0
      } = req.query;

      // Fetch patient with organization details to check organization type
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        select: {
          id: true,
          organization: {
            select: {
              id: true,
              type: true,
              name: true
            }
          }
        }
      });

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }

      // Block PLATFORM organizations from accessing patient observations (patient-care feature)
      if (patient.organization.type === 'PLATFORM') {
        return res.status(403).json({
          success: false,
          message: 'Patient observation access is not available for platform organizations. This is a patient-care feature for healthcare providers only.'
        });
      }

      // Build where clause
      const where = { patientId };

      if (context) where.context = context;
      if (enrollmentId) where.enrollmentId = enrollmentId;
      if (metricId) where.metricId = metricId;

      const observations = await prisma.observation.findMany({
        where,
        include: {
          metric: true,
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
   * Update observation notes
   * PATCH /api/observations/:observationId/review
   */
  async updateProviderReview(req, res) {
    try {
      const { observationId } = req.params;
      const { reviewNotes } = req.body;

      const observation = await prisma.observation.findUnique({
        where: { id: observationId }
      });

      if (!observation) {
        return res.status(404).json({
          success: false,
          message: 'Observation not found'
        });
      }

      const updatedObservation = await prisma.observation.update({
        where: { id: observationId },
        data: {
          notes: reviewNotes ? `${observation.notes || ''}\n[Review: ${reviewNotes}]`.trim() : observation.notes
        },
        include: {
          metric: true,
          clinician: {
            select: { id: true, firstName: true, lastName: true }
          }
        }
      });

      res.json({
        success: true,
        data: updatedObservation,
        message: 'Observation review notes updated'
      });

    } catch (error) {
      console.error('Error updating observation review:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update observation review',
        error: error.message
      });
    }
  }
}

module.exports = EnhancedObservationController;