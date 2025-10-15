const { PrismaClient } = require('@prisma/client');

// Use global prisma client in test environment, otherwise create new instance
const prisma = global.prisma || new PrismaClient();

// Get all alert rules
const getAllAlertRules = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      severity,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Get current organization from auth middleware
    const currentOrgId = req.user?.currentOrganization || null;

    // Build where clause with org-aware filtering
    const where = {
      AND: [
        // Show standardized rules + org-specific rules
        {
          OR: [
            { organizationId: null, isStandardized: true }, // Platform standardized
            { organizationId: currentOrgId }                 // Org-specific custom
          ]
        }
      ]
    };

    if (search) {
      where.AND.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } }
        ]
      });
    }

    if (severity) {
      where.AND.push({ severity: severity.toLowerCase() });
    }

    const [rules, total] = await Promise.all([
      prisma.alertRule.findMany({
        where,
        include: {
          organization: {
            select: {
              id: true,
              name: true
            }
          },
          sourceRule: {
            select: {
              id: true,
              name: true,
              isStandardized: true
            }
          },
          conditionPresets: {
            include: {
              conditionPreset: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          _count: {
            select: {
              alerts: true
            }
          }
        },
        skip,
        take,
        orderBy: { [sortBy]: sortOrder }
      }),
      prisma.alertRule.count({ where })
    ]);

    // Enrich with computed fields
    const enrichedRules = rules.map(rule => ({
      ...rule,
      isCustomized: !!rule.organizationId // True if org-specific
    }));

    res.json({
      success: true,
      data: enrichedRules,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching alert rules:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching alert rules'
    });
  }
};

// Get alert rule by ID
const getAlertRuleById = async (req, res) => {
  try {
    const { id } = req.params;

    const rule = await prisma.alertRule.findUnique({
      where: { id },
      include: {
        conditionPresets: {
          include: {
            conditionPreset: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        _count: {
          select: {
            alerts: true
          }
        }
      }
    });

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Alert rule not found'
      });
    }

    res.json({
      success: true,
      data: rule
    });
  } catch (error) {
    console.error('Error fetching alert rule:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching alert rule'
    });
  }
};

// Create alert rule
const createAlertRule = async (req, res) => {
  try {
    const {
      name,
      severity,
      window,
      expression,
      conditions,
      dedupeKey,
      cooldown,
      actions
    } = req.body;

    // Accept either 'expression' or 'conditions' for backwards compatibility
    const ruleConditions = conditions || expression;

    // Validate required fields
    if (!name || !severity || !ruleConditions) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, severity, conditions (or expression)'
      });
    }

    // Validate severity
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(severity.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid severity. Must be one of: ${validSeverities.join(', ')}`
      });
    }

    // Check if rule with same name already exists
    const existingRule = await prisma.alertRule.findFirst({
      where: { name }
    });

    if (existingRule) {
      return res.status(400).json({
        success: false,
        message: 'Alert rule with this name already exists'
      });
    }

    const rule = await prisma.alertRule.create({
      data: {
        name,
        severity: severity.toLowerCase(),
        conditions: ruleConditions,
        actions: actions || {}
      },
      include: {
        conditionPresets: {
          include: {
            conditionPreset: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Alert rule created successfully',
      data: rule
    });
  } catch (error) {
    console.error('Error creating alert rule:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while creating alert rule'
    });
  }
};

// Update alert rule
const updateAlertRule = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      severity,
      window,
      expression,
      conditions,
      dedupeKey,
      cooldown,
      actions
    } = req.body;

    // Accept either 'expression' or 'conditions' for backwards compatibility
    const ruleConditions = conditions || expression;

    // Check if rule exists
    const existingRule = await prisma.alertRule.findUnique({ where: { id } });
    if (!existingRule) {
      return res.status(404).json({
        success: false,
        message: 'Alert rule not found'
      });
    }

    // BLOCK: Prevent direct editing of standardized rules
    if (existingRule.isStandardized && !existingRule.organizationId) {
      return res.status(403).json({
        success: false,
        message: 'Cannot directly edit standardized alert rules. Please use the "Customize" feature to create an editable copy for your organization first.',
        hint: 'Click the "Customize" button to clone this rule for your organization',
        standardizedRule: {
          id: existingRule.id,
          name: existingRule.name
        }
      });
    }

    // Validate severity if provided
    if (severity) {
      const validSeverities = ['low', 'medium', 'high', 'critical'];
      if (!validSeverities.includes(severity.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: `Invalid severity. Must be one of: ${validSeverities.join(', ')}`
        });
      }
    }

    // Check if another rule with same name exists (excluding current rule)
    if (name && name !== existingRule.name) {
      const duplicateRule = await prisma.alertRule.findFirst({
        where: {
          name,
          id: { not: id }
        }
      });

      if (duplicateRule) {
        return res.status(400).json({
          success: false,
          message: 'Alert rule with this name already exists'
        });
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (severity !== undefined) updateData.severity = severity.toLowerCase();
    if (ruleConditions !== undefined) updateData.conditions = ruleConditions;
    if (actions !== undefined) updateData.actions = actions;

    const rule = await prisma.alertRule.update({
      where: { id },
      data: updateData,
      include: {
        conditionPresets: {
          include: {
            conditionPreset: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Alert rule updated successfully',
      data: rule
    });
  } catch (error) {
    console.error('Error updating alert rule:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while updating alert rule'
    });
  }
};

// Delete alert rule
const deleteAlertRule = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if rule exists
    const existingRule = await prisma.alertRule.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            alerts: true,
            conditionPresets: true
          }
        }
      }
    });

    if (!existingRule) {
      return res.status(404).json({
        success: false,
        message: 'Alert rule not found'
      });
    }

    // BLOCK: Prevent deletion of standardized rules
    if (existingRule.isStandardized && !existingRule.organizationId) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete standardized alert rules. These are platform-level resources shared across all organizations.',
        standardizedRule: {
          id: existingRule.id,
          name: existingRule.name
        }
      });
    }

    // Check if rule has active alerts
    if (existingRule._count.alerts > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete alert rule with existing alerts. Please resolve or delete alerts first.'
      });
    }

    // Delete the rule (this will cascade delete preset links)
    await prisma.alertRule.delete({ where: { id } });

    res.json({
      success: true,
      message: 'Alert rule deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting alert rule:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while deleting alert rule'
    });
  }
};

// Get rule templates for common scenarios
const getRuleTemplates = async (req, res) => {
  try {
    const templates = [
      // Pain Management Templates
      {
        id: 'high_pain_threshold',
        name: 'High Pain Alert',
        description: 'Triggers when pain scale exceeds threshold',
        category: 'Pain Management',
        severity: 'high',
        window: '1d',
        conditions: {
          condition: 'pain_scale_0_10',
          operator: 'greater_than_or_equal',
          threshold: 8,
          description: 'Pain scale 8 or higher'
        },
        actions: {
          notify: ['clinician'],
          escalate: true
        },
        cooldown: '4h'
      },
      {
        id: 'moderate_pain_persistent',
        name: 'Persistent Moderate Pain',
        description: 'Triggers when moderate pain persists for multiple days',
        category: 'Pain Management',
        severity: 'medium',
        window: '5d',
        conditions: {
          condition: 'pain_scale_0_10',
          operator: 'greater_than_or_equal',
          threshold: 5,
          consecutiveDays: 3,
          description: 'Pain 5+ for 3 consecutive days'
        },
        actions: {
          notify: ['clinician'],
          escalate: false
        },
        cooldown: '24h'
      },
      {
        id: 'pain_trend_increasing',
        name: 'Increasing Pain Trend',
        description: 'Triggers when pain shows increasing trend',
        category: 'Pain Management',
        severity: 'medium',
        window: '7d',
        conditions: {
          condition: 'pain_scale_0_10',
          operator: 'trend_increasing',
          consecutiveDays: 3,
          description: 'Pain increasing for 3 consecutive days'
        },
        actions: {
          notify: ['clinician'],
          escalate: false
        },
        cooldown: '48h'
      },
      {
        id: 'pain_sudden_spike',
        name: 'Sudden Pain Spike',
        description: 'Triggers when pain increases dramatically in short time',
        category: 'Pain Management',
        severity: 'high',
        window: '2d',
        conditions: {
          condition: 'pain_scale_0_10',
          operator: 'greater_than',
          threshold: 7,
          timeWindow: '24h',
          description: 'Pain spike above 7 within 24 hours'
        },
        actions: {
          notify: ['clinician', 'patient'],
          escalate: true
        },
        cooldown: '6h'
      },

      // Medication Management Templates
      {
        id: 'medication_adherence_low',
        name: 'Low Medication Adherence',
        description: 'Triggers when medication adherence drops below threshold',
        category: 'Medication Management',
        severity: 'medium',
        window: '3d',
        conditions: {
          condition: 'medication_adherence_rate',
          operator: 'less_than',
          threshold: 0.8,
          description: 'Less than 80% adherence'
        },
        actions: {
          notify: ['clinician', 'care_team'],
          reminder: true
        },
        cooldown: '24h'
      },
      {
        id: 'medication_adherence_critical',
        name: 'Critical Medication Non-Adherence',
        description: 'Triggers when medication adherence is critically low',
        category: 'Medication Management',
        severity: 'high',
        window: '7d',
        conditions: {
          condition: 'medication_adherence_rate',
          operator: 'less_than',
          threshold: 0.5,
          description: 'Less than 50% adherence'
        },
        actions: {
          notify: ['clinician', 'care_team', 'patient'],
          escalate: true,
          reminder: true
        },
        cooldown: '12h'
      },
      {
        id: 'missed_doses_consecutive',
        name: 'Consecutive Missed Doses',
        description: 'Triggers when multiple consecutive doses are missed',
        category: 'Medication Management',
        severity: 'high',
        window: '3d',
        conditions: {
          condition: 'missed_medication_doses',
          operator: 'greater_than_or_equal',
          threshold: 3,
          consecutiveDays: 2,
          description: '3+ missed doses over 2 days'
        },
        actions: {
          notify: ['clinician', 'patient'],
          escalate: true,
          reminder: true
        },
        cooldown: '8h'
      },
      {
        id: 'medication_effectiveness_declining',
        name: 'Declining Medication Effectiveness',
        description: 'Triggers when medication effectiveness is declining',
        category: 'Medication Management',
        severity: 'medium',
        window: '14d',
        conditions: {
          condition: 'medication_effectiveness',
          operator: 'trend_decreasing',
          consecutiveDays: 5,
          description: 'Effectiveness declining for 5 days'
        },
        actions: {
          notify: ['clinician'],
          escalate: false
        },
        cooldown: '72h'
      },

      // Side Effects & Safety Templates
      {
        id: 'severe_side_effects',
        name: 'Severe Side Effects',
        description: 'Triggers when severe medication side effects reported',
        category: 'Side Effects & Safety',
        severity: 'high',
        window: '1d',
        conditions: {
          condition: 'side_effects_severity',
          operator: 'greater_than_or_equal',
          threshold: 7,
          description: 'Side effects severity 7 or higher'
        },
        actions: {
          notify: ['clinician', 'patient'],
          escalate: true
        },
        cooldown: '12h'
      },
      {
        id: 'moderate_side_effects_persistent',
        name: 'Persistent Moderate Side Effects',
        description: 'Triggers when moderate side effects persist',
        category: 'Side Effects & Safety',
        severity: 'medium',
        window: '7d',
        conditions: {
          condition: 'side_effects_severity',
          operator: 'greater_than_or_equal',
          threshold: 4,
          consecutiveDays: 3,
          description: 'Side effects 4+ for 3 consecutive days'
        },
        actions: {
          notify: ['clinician'],
          escalate: false
        },
        cooldown: '24h'
      },

      // Assessment & Monitoring Templates
      {
        id: 'missing_assessment_24h',
        name: 'Missing Assessment (24h)',
        description: 'Triggers when no assessment submitted for 24 hours',
        category: 'Assessment & Monitoring',
        severity: 'medium',
        window: '2d',
        conditions: {
          condition: 'no_assessment_for',
          operator: 'greater_than',
          threshold: 24,
          unit: 'hours',
          description: 'No assessment for 24+ hours'
        },
        actions: {
          notify: ['patient', 'clinician'],
          reminder: true
        },
        cooldown: '12h'
      },
      {
        id: 'missing_assessment_48h',
        name: 'Missing Assessment (48h)',
        description: 'Triggers when no assessment submitted for 48 hours',
        category: 'Assessment & Monitoring',
        severity: 'high',
        window: '3d',
        conditions: {
          condition: 'no_assessment_for',
          operator: 'greater_than',
          threshold: 48,
          unit: 'hours',
          description: 'No assessment for 48+ hours'
        },
        actions: {
          notify: ['patient', 'clinician', 'care_team'],
          escalate: true,
          reminder: true
        },
        cooldown: '6h'
      },
      {
        id: 'incomplete_assessments',
        name: 'Incomplete Assessments',
        description: 'Triggers when assessments are frequently incomplete',
        category: 'Assessment & Monitoring',
        severity: 'low',
        window: '7d',
        conditions: {
          condition: 'assessment_completion_rate',
          operator: 'less_than',
          threshold: 0.7,
          description: 'Less than 70% completion rate'
        },
        actions: {
          notify: ['patient'],
          reminder: true
        },
        cooldown: '48h'
      },

      // Mood & Mental Health Templates
      {
        id: 'mood_declining',
        name: 'Declining Mood',
        description: 'Triggers when mood scores show declining trend',
        category: 'Mood & Mental Health',
        severity: 'medium',
        window: '10d',
        conditions: {
          condition: 'mood_scale',
          operator: 'trend_decreasing',
          consecutiveDays: 4,
          description: 'Mood declining for 4 consecutive days'
        },
        actions: {
          notify: ['clinician'],
          escalate: false
        },
        cooldown: '48h'
      },
      {
        id: 'low_mood_persistent',
        name: 'Persistent Low Mood',
        description: 'Triggers when mood remains consistently low',
        category: 'Mood & Mental Health',
        severity: 'high',
        window: '7d',
        conditions: {
          condition: 'mood_scale',
          operator: 'less_than_or_equal',
          threshold: 3,
          consecutiveDays: 3,
          description: 'Mood 3 or lower for 3 consecutive days'
        },
        actions: {
          notify: ['clinician', 'mental_health_specialist'],
          escalate: true
        },
        cooldown: '24h'
      },

      // Sleep & Activity Templates
      {
        id: 'poor_sleep_quality',
        name: 'Poor Sleep Quality',
        description: 'Triggers when sleep quality is consistently poor',
        category: 'Sleep & Activity',
        severity: 'medium',
        window: '7d',
        conditions: {
          condition: 'sleep_quality',
          operator: 'less_than_or_equal',
          threshold: 3,
          consecutiveDays: 3,
          description: 'Sleep quality 3 or lower for 3 days'
        },
        actions: {
          notify: ['clinician'],
          escalate: false
        },
        cooldown: '48h'
      },
      {
        id: 'activity_level_declining',
        name: 'Declining Activity Level',
        description: 'Triggers when activity level shows declining trend',
        category: 'Sleep & Activity',
        severity: 'medium',
        window: '14d',
        conditions: {
          condition: 'activity_level',
          operator: 'trend_decreasing',
          consecutiveDays: 5,
          description: 'Activity declining for 5 consecutive days'
        },
        actions: {
          notify: ['clinician', 'physical_therapist'],
          escalate: false
        },
        cooldown: '72h'
      },

      // Emergency & Critical Templates
      {
        id: 'emergency_pain_level',
        name: 'Emergency Pain Level',
        description: 'Triggers for maximum pain levels requiring immediate attention',
        category: 'Emergency & Critical',
        severity: 'critical',
        window: '1d',
        conditions: {
          condition: 'pain_scale_0_10',
          operator: 'greater_than_or_equal',
          threshold: 10,
          description: 'Maximum pain level (10/10)'
        },
        actions: {
          notify: ['clinician', 'emergency_contact', 'patient'],
          escalate: true,
          priority: 'immediate'
        },
        cooldown: '1h'
      },
      {
        id: 'critical_side_effects',
        name: 'Critical Side Effects',
        description: 'Triggers for severe side effects requiring immediate intervention',
        category: 'Emergency & Critical',
        severity: 'critical',
        window: '1d',
        conditions: {
          condition: 'side_effects_severity',
          operator: 'greater_than_or_equal',
          threshold: 9,
          description: 'Critical side effects (9+/10)'
        },
        actions: {
          notify: ['clinician', 'emergency_contact', 'patient'],
          escalate: true,
          priority: 'immediate'
        },
        cooldown: '30m'
      }
    ];

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching rule templates:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching rule templates'
    });
  }
};

// Get alert rule statistics
const getAlertRuleStats = async (req, res) => {
  try {
    const [
      totalRules,
      activeRules,
      rulesBySeverity,
      highPriorityRules,
      criticalSeverityRules,
      rulesWithAlerts
    ] = await Promise.all([
      prisma.alertRule.count(),
      prisma.alertRule.count({ where: { isActive: true } }),
      prisma.alertRule.groupBy({
        by: ['severity'],
        _count: { severity: true }
      }),
      prisma.alertRule.count({
        where: {
          priority: { gte: 1 }
        }
      }),
      prisma.alertRule.count({
        where: {
          severity: 'CRITICAL'
        }
      }),
      prisma.alertRule.count({
        where: {
          alerts: {
            some: {}
          }
        }
      })
    ]);

    const severityBreakdown = rulesBySeverity.reduce((acc, stat) => {
      acc[stat.severity] = stat._count.severity;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        total: totalRules,
        active: activeRules,
        highPriority: highPriorityRules,
        critical: criticalSeverityRules,
        withAlerts: rulesWithAlerts,
        severityBreakdown
      }
    });
  } catch (error) {
    console.error('Error fetching alert rule stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching alert rule stats'
    });
  }
};

// Customize/clone a standardized rule for organization
const customizeRule = async (req, res) => {
  try {
    const { id } = req.params;
    const currentOrgId = req.user?.currentOrganization;

    if (!currentOrgId) {
      return res.status(400).json({
        success: false,
        message: 'Organization context required for customization'
      });
    }

    // Get the source rule
    const sourceRule = await prisma.alertRule.findUnique({
      where: { id }
    });

    if (!sourceRule) {
      return res.status(404).json({
        success: false,
        message: 'Alert rule not found'
      });
    }

    // Check if rule is customizable (must be standardized or belong to this org)
    if (sourceRule.organizationId && sourceRule.organizationId !== currentOrgId) {
      return res.status(403).json({
        success: false,
        message: 'Cannot customize rules from other organizations'
      });
    }

    // Check if already customized by this organization
    const existingCustom = await prisma.alertRule.findFirst({
      where: {
        organizationId: currentOrgId,
        sourceRuleId: id
      }
    });

    if (existingCustom) {
      return res.status(400).json({
        success: false,
        message: 'This rule has already been customized for your organization',
        data: existingCustom
      });
    }

    // Clone the rule for this organization
    const customRule = await prisma.alertRule.create({
      data: {
        organizationId: currentOrgId,
        sourceRuleId: id,
        name: sourceRule.name, // Same name, unique per org
        description: sourceRule.description,
        conditions: sourceRule.conditions,
        actions: sourceRule.actions,
        category: sourceRule.category,
        severity: sourceRule.severity,
        priority: sourceRule.priority,
        isStandardized: false, // Custom versions are not standardized
        standardCoding: sourceRule.standardCoding,
        clinicalEvidence: sourceRule.clinicalEvidence
      },
      include: {
        organization: {
          select: { id: true, name: true }
        },
        sourceRule: {
          select: { id: true, name: true, isStandardized: true }
        },
        conditionPresets: {
          include: {
            conditionPreset: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: customRule,
      message: 'Alert rule customized successfully. You can now modify it for your organization.'
    });
  } catch (error) {
    console.error('Error customizing alert rule:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while customizing alert rule',
      error: error.message
    });
  }
};

module.exports = {
  getAllAlertRules,
  getAlertRuleById,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
  getRuleTemplates,
  getAlertRuleStats,
  customizeRule
};