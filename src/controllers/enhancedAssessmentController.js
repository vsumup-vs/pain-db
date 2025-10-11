/**
 * Enhanced Assessment Controller
 * 
 * Provides assessment endpoints with Smart Assessment Continuity features
 */

const SmartAssessmentContinuityService = require('../services/smartAssessmentContinuityService');

class EnhancedAssessmentController {
  constructor() {
    this.continuityService = new SmartAssessmentContinuityService();
  }

  /**
   * Create assessment with continuity features
   * POST /api/assessments/with-continuity
   */
  async createAssessmentWithContinuity(req, res) {
    try {
      const {
        patientId,
        clinicianId,
        templateId,
        context = 'WELLNESS',
        enrollmentId = null,
        billingRelevant = false,
        forceNew = false,
        reuseOptions = {}
      } = req.body;

      // Validate required fields
      if (!patientId || !clinicianId || !templateId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: patientId, clinicianId, templateId'
        });
      }

      const result = await this.continuityService.createAssessmentWithContinuity(
        { patientId, clinicianId, templateId, context, enrollmentId, billingRelevant, forceNew },
        reuseOptions
      );

      res.status(201).json({
        success: true,
        data: result,
        message: result.message
      });

    } catch (error) {
      console.error('Error creating assessment with continuity:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create assessment with continuity',
        error: error.message
      });
    }
  }

  /**
   * Get continuity suggestions for a patient
   * GET /api/patients/:patientId/continuity-suggestions
   */
  async getContinuitySuggestions(req, res) {
    try {
      const { patientId } = req.params;
      const { templateId, metricDefinitionIds } = req.query;

      const metricIds = metricDefinitionIds ? 
        (Array.isArray(metricDefinitionIds) ? metricDefinitionIds : metricDefinitionIds.split(',')) : 
        null;

      const suggestions = await this.continuityService.getContinuitySuggestions(
        patientId, templateId, metricIds
      );

      res.json({
        success: true,
        data: suggestions
      });

    } catch (error) {
      console.error('Error getting continuity suggestions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get continuity suggestions',
        error: error.message
      });
    }
  }

  /**
   * Get continuity history for a patient
   * GET /api/patients/:patientId/continuity-history
   */
  async getContinuityHistory(req, res) {
    try {
      const { patientId } = req.params;
      const { limit = 20, offset = 0 } = req.query;

      const result = await this.continuityService.getContinuityHistory(patientId, {
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        data: result.history,
        pagination: result.pagination
      });

    } catch (error) {
      console.error('Error getting continuity history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get continuity history',
        error: error.message
      });
    }
  }
}

module.exports = EnhancedAssessmentController;