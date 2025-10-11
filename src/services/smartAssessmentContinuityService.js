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
        metricDefinitionId: { in: metricDefinitionIds },
        recordedAt: { gte: cutoffTime },
        // Prioritize provider-reviewed observations
        OR: [
          { providerReviewed: true },
          { source: 'DEVICE' },
          { context: 'CLINICAL_MONITORING' }
        ]
      },
      include: {
        metricDefinition: true,
        clinician: {
          select: { id: true, firstName: true, lastName: true }
        }
      },
      orderBy: [
        { providerReviewed: 'desc' },
        { recordedAt: 'desc' }
      ]
    });

    // Group by metric definition and return most recent/relevant
    const groupedObservations = {};
    reusableObservations.forEach(obs => {
      const metricId = obs.metricDefinitionId;
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
        completedAt: { gte: cutoffTime },
        // Prioritize provider-reviewed assessments
        OR: [
          { providerReviewed: true },
          { context: 'CLINICAL_MONITORING' }
        ]
      },
      include: {
        template: true,
        clinician: {
          select: { id: true, firstName: true, lastName: true }
        }
      },
      orderBy: [
        { providerReviewed: 'desc' },
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
      context = 'WELLNESS',
      enrollmentId = null,
      billingRelevant = false,
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
              context,
              enrollmentId,
              billingRelevant,
              providerReviewed: requireProviderReview ? false : sourceAssessment.providerReviewed,
              reusedFromAssessmentId: sourceAssessment.id,
              completedAt: new Date()
            }
          });

          // Log continuity action
          await this.logContinuityAction({
            patientId,
            sourceAssessmentId: sourceAssessment.id,
            targetAssessmentId: newAssessment.id,
            targetContext: context,
            reuseReason: 'Assessment reused within validity period',
            clinicianId
          });

          return {
            assessment: newAssessment,
            continuityUsed: true,
            sourceType: 'assessment',
            sourceId: sourceAssessment.id,
            message: `Assessment reused from ${sourceAssessment.context} context (${this.formatTimeAgo(sourceAssessment.completedAt)})`
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
                obs => obs.metricDefinitionId === item.metricDefinitionId
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
                context,
                enrollmentId,
                billingRelevant,
                providerReviewed: requireProviderReview ? false : true,
                completedAt: new Date()
              }
            });

            // Log continuity action
            await this.logContinuityAction({
              patientId,
              sourceObservationIds,
              targetAssessmentId: newAssessment.id,
              targetContext: context,
              reuseReason: `Assessment created from ${reusableObservations.length} reusable observations`,
              clinicianId
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
          context,
          enrollmentId,
          billingRelevant,
          providerReviewed: false,
          completedAt: new Date()
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
      metricDefinitionId,
      value,
      source = 'MANUAL',
      context = 'WELLNESS',
      enrollmentId = null,
      billingRelevant = false,
      notes = null
    } = observationData;

    // Check for recent duplicate observations
    const recentObservation = await prisma.observation.findFirst({
      where: {
        patientId,
        metricDefinitionId,
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
        patientId,
        clinicianId,
        metricDefinitionId,
        value,
        source,
        context,
        enrollmentId,
        billingRelevant,
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
   */
  async getContinuityHistory(patientId, options = {}) {
    const { limit = 20, offset = 0 } = options;

    try {
      const history = await prisma.$queryRaw`
        SELECT acl.*, 
               p.first_name as patient_first_name, p.last_name as patient_last_name,
               c.first_name as clinician_first_name, c.last_name as clinician_last_name,
               sa.template_id as source_template_id,
               ta.template_id as target_template_id
        FROM assessment_continuity_log acl
        LEFT JOIN patients p ON acl.patient_id = p.id
        LEFT JOIN clinicians c ON acl.clinician_id = c.id
        LEFT JOIN assessments sa ON acl.source_assessment_id = sa.id
        LEFT JOIN assessments ta ON acl.target_assessment_id = ta.id
        WHERE acl.patient_id = ${patientId}
        ORDER BY acl.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const total = await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM assessment_continuity_log
        WHERE patient_id = ${patientId}
      `;

      return {
        history,
        pagination: {
          total: parseInt(total[0].count),
          pages: Math.ceil(parseInt(total[0].count) / parseInt(limit))
        }
      };

    } catch (error) {
      console.error('Error getting continuity history:', error);
      return { history: [], pagination: { total: 0, pages: 0 } };
    }
  }

  // Helper methods
  isObservationMoreRelevant(obs1, obs2) {
    // Prioritize by context, then provider review, then recency
    const priority1 = this.contextPriority[obs1.context] || 5;
    const priority2 = this.contextPriority[obs2.context] || 5;
    
    if (priority1 !== priority2) return priority1 < priority2;
    if (obs1.providerReviewed !== obs2.providerReviewed) return obs1.providerReviewed;
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
    try {
      await prisma.$executeRaw`
        INSERT INTO assessment_continuity_log 
        (patient_id, source_assessment_id, source_observation_ids, target_assessment_id, target_context, reuse_reason, clinician_id)
        VALUES (${logData.patientId}, ${logData.sourceAssessmentId || null}, ${logData.sourceObservationIds || []}, 
                ${logData.targetAssessmentId}, ${logData.targetContext}::"ObservationContext", ${logData.reuseReason}, ${logData.clinicianId})
      `;
    } catch (error) {
      console.error('Error logging continuity action:', error);
    }
  }
}

module.exports = SmartAssessmentContinuityService;