/**
 * Smart Assessment Continuity Service
 * 
 * Provides intelligent assessment and observation reuse capabilities
 * to eliminate duplication and improve clinical workflow efficiency.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class SmartAssessmentContinuityService {
  constructor() {
    this.defaultValidityHours = 168; // 7 days
    this.contextPriority = {
      'CLINICAL_MONITORING': 1,
      'PROGRAM_ENROLLMENT': 2,
      'ROUTINE_FOLLOWUP': 3,
      'WELLNESS': 4
    };
  }

  /**
   * Find reusable observations for a patient within validity period
   */
  async findReusableObservations(patientId, metricDefinitionIds, validityHours = null) {
    const hours = validityHours || this.defaultValidityHours;
    const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));

    const reusableObservations = await prisma.observation.findMany({
      where: {
        patientId,
        metricId: { in: metricDefinitionIds },
        recordedAt: { gte: cutoffTime },
        // Prioritize device observations and clinical monitoring
        OR: [
          { source: 'DEVICE' },
          { context: 'CLINICAL_MONITORING' }
        ]
      },
      include: {
        metric: true, // Fixed: Observation relation is "metric" not "metricDefinition"
        clinician: {
          select: { id: true, firstName: true, lastName: true }
        }
      },
      orderBy: [
        { recordedAt: 'desc' }
      ]
    });

    // Group by metric definition and return most recent/relevant
    const groupedObservations = {};
    reusableObservations.forEach(obs => {
      const metricId = obs.metricId; // Fixed: Observation field is "metricId" not "metricDefinitionId"
      if (!groupedObservations[metricId] || 
          this.isObservationMoreRelevant(obs, groupedObservations[metricId])) {
        groupedObservations[metricId] = obs;
      }
    });

    return Object.values(groupedObservations);
  }

  /**
   * Find reusable assessments for a patient
   */
  async findReusableAssessments(patientId, templateId, validityHours = null) {
    const hours = validityHours || this.defaultValidityHours;
    const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));

    return await prisma.assessment.findMany({
      where: {
        patientId,
        templateId,
        completedAt: { gte: cutoffTime }
      },
      include: {
        template: true,
        clinician: {
          select: { id: true, firstName: true, lastName: true }
        }
      },
      orderBy: [
        { completedAt: 'desc' }
      ],
      take: 5 // Return top 5 candidates
    });
  }

  /**
   * Create assessment with continuity from existing data
   */
  async createAssessmentWithContinuity(assessmentData, reuseOptions = {}) {
    const {
      patientId,
      clinicianId,
      templateId,
      forceNew = false
    } = assessmentData;

    const {
      allowObservationReuse = true,
      allowAssessmentReuse = true,
      validityHours = this.defaultValidityHours,
      requireProviderReview = false
    } = reuseOptions;

    try {
      // Step 1: Check for reusable assessments if not forcing new
      if (!forceNew && allowAssessmentReuse) {
        const reusableAssessments = await this.findReusableAssessments(
          patientId, templateId, validityHours
        );

        if (reusableAssessments.length > 0) {
          const sourceAssessment = reusableAssessments[0];
          
          // Create new assessment with reused data
          const newAssessment = await prisma.assessment.create({
            data: {
              patientId,
              clinicianId,
              templateId,
              responses: sourceAssessment.responses,
              score: sourceAssessment.score,
              completedAt: new Date(),
              notes: `Reused from assessment ${sourceAssessment.id}`
            }
          });

          return {
            assessment: newAssessment,
            continuityUsed: true,
            sourceType: 'assessment',
            sourceId: sourceAssessment.id,
            message: `Assessment reused from previous assessment (${this.formatTimeAgo(sourceAssessment.completedAt)})`
          };
        }
      }

      // Step 2: Check for reusable observations if assessment reuse not available
      if (!forceNew && allowObservationReuse) {
        const template = await prisma.assessmentTemplate.findUnique({
          where: { id: templateId },
          include: {
            items: {
              include: { metricDefinition: true },
              orderBy: { displayOrder: 'asc' }
            }
          }
        });

        if (template && template.items.length > 0) {
          const metricIds = template.items.map(item => item.metricDefinitionId);
          const reusableObservations = await this.findReusableObservations(
            patientId, metricIds, validityHours
          );

          if (reusableObservations.length > 0) {
            // Build assessment responses from observations
            const responses = {};
            const sourceObservationIds = [];

            template.items.forEach(item => {
              const observation = reusableObservations.find(
                obs => obs.metricId === item.metricDefinitionId // Fixed: Observation field is "metricId"
              );
              if (observation) {
                responses[item.metricDefinition.key] = observation.value;
                sourceObservationIds.push(observation.id);
              }
            });

            // Calculate score if possible (simplified scoring)
            const score = this.calculateAssessmentScore(responses, template);

            // Create assessment from observations
            const newAssessment = await prisma.assessment.create({
              data: {
                patientId,
                clinicianId,
                templateId,
                responses,
                score,
                completedAt: new Date(),
                notes: `Created from ${reusableObservations.length} reusable observations`
              }
            });

            return {
              assessment: newAssessment,
              continuityUsed: true,
              sourceType: 'observations',
              sourceIds: sourceObservationIds,
              message: `Assessment created from ${reusableObservations.length} recent observations`
            };
          }
        }
      }

      // Step 3: Create new assessment (no reuse possible)
      const newAssessment = await prisma.assessment.create({
        data: {
          patientId,
          clinicianId,
          templateId,
          responses: {},
          completedAt: new Date(),
          notes: 'New assessment - no recent data available for reuse'
        }
      });

      return {
        assessment: newAssessment,
        continuityUsed: false,
        message: 'New assessment created - no recent data available for reuse'
      };

    } catch (error) {
      console.error('Error creating assessment with continuity:', error);
      throw error;
    }
  }

  /**
   * Create observation with context awareness
   */
  async createObservationWithContext(observationData) {
    const {
      patientId,
      clinicianId,
      metricDefinitionId, // Keep parameter name for API compatibility
      value,
      source = 'MANUAL',
      context = 'CLINICAL_MONITORING',
      enrollmentId = null,
      notes = null,
      organizationId
    } = observationData;

    // Check for recent duplicate observations
    const recentObservation = await prisma.observation.findFirst({
      where: {
        patientId,
        metricId: metricDefinitionId, // Fixed: Observation schema uses "metricId"
        recordedAt: {
          gte: new Date(Date.now() - (24 * 60 * 60 * 1000)) // Last 24 hours
        }
      },
      orderBy: { recordedAt: 'desc' }
    });

    // If recent observation exists with same value, link instead of duplicate
    if (recentObservation && JSON.stringify(recentObservation.value) === JSON.stringify(value)) {
      return {
        observation: recentObservation,
        continuityUsed: true,
        message: 'Linked to existing observation from last 24 hours'
      };
    }

    // Create new observation
    const newObservation = await prisma.observation.create({
      data: {
        organizationId,
        patientId,
        clinicianId,
        metricId: metricDefinitionId, // Fixed: Observation schema uses "metricId"
        value,
        source,
        context,
        enrollmentId,
        notes,
        recordedAt: new Date()
      }
    });

    return {
      observation: newObservation,
      continuityUsed: false,
      message: 'New observation created'
    };
  }

  /**
   * Get continuity suggestions for a patient
   */
  async getContinuitySuggestions(patientId, templateId = null, metricDefinitionIds = null) {
    const suggestions = {
      reusableAssessments: [],
      reusableObservations: [],
      recommendations: []
    };

    try {
      // Find reusable assessments
      if (templateId) {
        suggestions.reusableAssessments = await this.findReusableAssessments(patientId, templateId);
      }

      // Find reusable observations
      if (metricDefinitionIds && metricDefinitionIds.length > 0) {
        suggestions.reusableObservations = await this.findReusableObservations(patientId, metricDefinitionIds);
      } else {
        // When no specific metrics requested, fetch ALL recent observations for test/overview purposes
        const hours = this.defaultValidityHours;
        const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));

        suggestions.reusableObservations = await prisma.observation.findMany({
          where: {
            patientId,
            recordedAt: { gte: cutoffTime }
          },
          include: {
            metric: true, // Fixed: relation is called "metric" not "metricDefinition"
            clinician: {
              select: { id: true, firstName: true, lastName: true }
            }
          },
          orderBy: { recordedAt: 'desc' },
          take: 50 // Limit to 50 most recent observations
        });
      }

      // Generate recommendations
      suggestions.recommendations = this.generateContinuityRecommendations(suggestions);

      return suggestions;

    } catch (error) {
      console.error('Error getting continuity suggestions:', error);
      return suggestions;
    }
  }

  /**
   * Get continuity history for a patient
   * Uses existing Assessment table to show recent assessments with continuity context
   */
  async getContinuityHistory(patientId, options = {}) {
    const { limit = 20, offset = 0 } = options;

    try {
      // Get recent assessments for this patient (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const history = await prisma.assessment.findMany({
        where: {
          patientId,
          completedAt: { gte: thirtyDaysAgo }
        },
        include: {
          template: {
            select: { name: true, category: true }
          },
          clinician: {
            select: { id: true, firstName: true, lastName: true }
          },
          patient: {
            select: { firstName: true, lastName: true }
          }
        },
        orderBy: { completedAt: 'desc' },
        take: limit,
        skip: offset
      });

      // Transform to continuity history format
      const transformedHistory = history.map(assessment => ({
        id: assessment.id,
        patientId: assessment.patientId,
        patient_first_name: assessment.patient.firstName,
        patient_last_name: assessment.patient.lastName,
        clinician_first_name: assessment.clinician?.firstName || 'Unknown',
        clinician_last_name: assessment.clinician?.lastName || '',
        template_name: assessment.template.name,
        template_category: assessment.template.category,
        completed_at: assessment.completedAt,
        created_at: assessment.createdAt,
        notes: assessment.notes || '',
        // Add continuity metadata from responses if available
        continuity_score: assessment.responses?.continuityScore || 0,
        reused_metrics: assessment.responses?.reusedMetrics || []
      }));

      const total = await prisma.assessment.count({
        where: {
          patientId,
          completedAt: { gte: thirtyDaysAgo }
        }
      });

      return {
        history: transformedHistory,
        pagination: {
          total: total,
          pages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      console.error('Error getting continuity history:', error);
      return { history: [], pagination: { total: 0, pages: 0 } };
    }
  }

  // Helper methods
  isObservationMoreRelevant(obs1, obs2) {
    // Prioritize by context, then recency
    const priority1 = this.contextPriority[obs1.context] || 5;
    const priority2 = this.contextPriority[obs2.context] || 5;

    if (priority1 !== priority2) return priority1 < priority2;
    return obs1.recordedAt > obs2.recordedAt;
  }

  calculateAssessmentScore(responses, template) {
    // Simplified scoring - implement specific scoring logic per template
    const numericValues = Object.values(responses).filter(v => typeof v === 'number');
    if (numericValues.length === 0) return null;
    return numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length;
  }

  formatTimeAgo(date) {
    const hours = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60));
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  }

  generateContinuityRecommendations(suggestions) {
    const recommendations = [];
    
    if (suggestions.reusableAssessments.length > 0) {
      recommendations.push({
        type: 'assessment_reuse',
        priority: 'high',
        message: `${suggestions.reusableAssessments.length} recent assessment(s) available for reuse`,
        action: 'Consider reusing recent assessment data'
      });
    }

    if (suggestions.reusableObservations.length > 0) {
      recommendations.push({
        type: 'observation_reuse',
        priority: 'medium',
        message: `${suggestions.reusableObservations.length} recent observation(s) available`,
        action: 'Pre-populate assessment with recent observations'
      });
    }

    if (suggestions.reusableAssessments.length === 0 && suggestions.reusableObservations.length === 0) {
      recommendations.push({
        type: 'new_baseline',
        priority: 'low',
        message: 'No recent data available',
        action: 'Create new baseline assessment'
      });
    }

    return recommendations;
  }

  async logContinuityAction(logData) {
    // TODO: Implement continuity logging when assessment_continuity_log table is created
    // For now, just log to console for debugging
    console.log('Continuity action:', {
      patientId: logData.patientId,
      sourceAssessmentId: logData.sourceAssessmentId,
      sourceObservationIds: logData.sourceObservationIds,
      targetAssessmentId: logData.targetAssessmentId,
      reuseReason: logData.reuseReason
    });
  }
}

module.exports = SmartAssessmentContinuityService;