const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Package Suggestion Service
 *
 * Automatically suggests billing packages based on patient diagnosis codes.
 * Supports ICD-10 and SNOMED CT codes with wildcard pattern matching.
 */

/**
 * Main function to suggest billing packages for a patient
 *
 * @param {string} patientId - Patient ID
 * @param {string} organizationId - Organization ID
 * @param {object} options - Additional options
 * @param {number} options.minMatchScore - Minimum match score threshold (default: 50)
 * @param {number} options.maxSuggestions - Maximum number of suggestions to return (default: 3)
 * @param {string} options.sourceType - Source of suggestion (default: 'MANUAL')
 * @param {string} options.sourceId - Source ID (e.g., encounterNoteId)
 * @returns {Promise<Array>} Array of enrollment suggestions
 */
async function suggestBillingPackages(patientId, organizationId, options = {}) {
  const {
    minMatchScore = 50,
    maxSuggestions = 3,
    sourceType = 'MANUAL',
    sourceId = null
  } = options;

  try {
    // Step 1: Get patient's diagnosis codes from ConditionPresets
    const patientDiagnoses = await getPatientDiagnosisCodes(patientId, organizationId);

    if (!patientDiagnoses || patientDiagnoses.length === 0) {
      console.log(`No diagnosis codes found for patient ${patientId}`);
      return [];
    }

    // Step 1.5: Get organization's supported billing programs
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true }
    });

    const supportedPrograms = organization?.settings?.supportedBillingPrograms || [];
    console.log(`Organization supported programs: ${supportedPrograms.join(', ') || 'ALL (no filter)'}`);

    // Step 2: Get all active billing package templates (standardized + org-specific)
    const packageTemplates = await prisma.billingPackageTemplate.findMany({
      where: {
        isActive: true,
        OR: [
          { organizationId: null, isStandardized: true }, // Platform-wide templates
          { organizationId } // Organization-specific templates
        ]
      },
      orderBy: [
        { isStandardized: 'desc' }, // Prefer standardized templates
        { displayOrder: 'asc' }
      ]
    });

    if (packageTemplates.length === 0) {
      console.log('No active billing package templates found');
      return [];
    }

    // Step 3: Match each package template against patient diagnoses
    const matches = [];

    for (const template of packageTemplates) {
      const matchResult = await matchDiagnosisCriteria(
        patientDiagnoses,
        template.diagnosisCriteria
      );

      if (matchResult.matchScore >= minMatchScore) {
        // Filter by organization's supported billing programs
        let isSupported = true;

        if (supportedPrograms.length > 0) {
          // Check if template has programs that match organization's supported programs
          const templatePrograms = template.programCombinations?.programs || [];
          const hasMatchingProgram = templatePrograms.some(program =>
            supportedPrograms.includes(program.programType)
          );

          if (!hasMatchingProgram) {
            console.log(`Filtered out ${template.name}: No matching programs (has ${templatePrograms.map(p => p.programType).join(', ')}, org supports ${supportedPrograms.join(', ')})`);
            isSupported = false;
          }
        }

        if (isSupported) {
          matches.push({
            template,
            matchResult
          });
        }
      }
    }

    // Step 4: Sort by match score (descending) and limit results
    matches.sort((a, b) => b.matchResult.matchScore - a.matchResult.matchScore);
    const topMatches = matches.slice(0, maxSuggestions);

    // Step 5: Create EnrollmentSuggestion records
    const suggestions = [];

    for (const match of topMatches) {
      const suggestion = await createEnrollmentSuggestion(
        patientId,
        organizationId,
        match.template,
        match.matchResult,
        sourceType,
        sourceId,
        supportedPrograms // Pass supported programs for filtering
      );
      suggestions.push(suggestion);
    }

    return suggestions;

  } catch (error) {
    console.error('Error suggesting billing packages:', error);
    throw error;
  }
}

/**
 * Get patient's diagnosis codes from ConditionPresets
 *
 * @param {string} patientId - Patient ID
 * @param {string} organizationId - Organization ID
 * @returns {Promise<Array>} Array of diagnosis codes with metadata
 */
async function getPatientDiagnosisCodes(patientId, organizationId) {
  const diagnosisCodes = [];

  // Source 1: Get diagnosis codes directly from patient record (manual entry)
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { diagnosisCodes: true }
  });

  if (patient?.diagnosisCodes && Array.isArray(patient.diagnosisCodes)) {
    for (const dx of patient.diagnosisCodes) {
      diagnosisCodes.push({
        code: dx.code,
        display: dx.display,
        codingSystem: dx.codingSystem,
        enrollmentId: null,
        conditionPresetName: 'Patient Record',
        snomed: dx.codingSystem === 'SNOMED' ? dx.code : null
      });
    }
  }

  // Source 2: Get diagnosis codes from active enrollments (existing logic)
  const enrollments = await prisma.enrollment.findMany({
    where: {
      patientId,
      status: 'ACTIVE'
    },
    include: {
      conditionPreset: {
        include: {
          diagnoses: true
        }
      }
    }
  });

  for (const enrollment of enrollments) {
    if (enrollment.conditionPreset && enrollment.conditionPreset.diagnoses) {
      for (const diagnosis of enrollment.conditionPreset.diagnoses) {
        diagnosisCodes.push({
          code: diagnosis.icd10, // ICD-10 code
          display: diagnosis.label, // Display name
          codingSystem: 'ICD-10', // Always ICD-10 for this model
          enrollmentId: enrollment.id,
          conditionPresetName: enrollment.conditionPreset.name,
          snomed: diagnosis.snomed // Optional SNOMED code
        });
      }
    }
  }

  return diagnosisCodes;
}

/**
 * Match patient diagnoses against package template criteria
 * Supports wildcard patterns (e.g., J44.* matches J44.0, J44.1, J44.9)
 *
 * @param {Array} patientDiagnoses - Array of patient diagnosis codes
 * @param {Object} packageCriteria - Package template diagnosis criteria
 * @returns {Promise<Object>} Match result with score and matched diagnoses
 */
async function matchDiagnosisCriteria(patientDiagnoses, packageCriteria) {
  const { primary = [], secondary = [], minMatchRequired = 1, preferMultiMorbidity = false } = packageCriteria;

  const matchedPrimary = [];
  const matchedSecondary = [];

  // Check primary diagnoses
  for (const criteriaCode of primary) {
    for (const patientDx of patientDiagnoses) {
      // Only match if coding system matches
      if (patientDx.codingSystem !== criteriaCode.codingSystem) {
        continue;
      }

      if (matchesPattern(patientDx.code, criteriaCode.code)) {
        matchedPrimary.push({
          criteriaCode: criteriaCode.code,
          criteriaDisplay: criteriaCode.display,
          patientCode: patientDx.code,
          patientDisplay: patientDx.display,
          enrollmentId: patientDx.enrollmentId,
          conditionPresetName: patientDx.conditionPresetName
        });
        break; // Only count each criteria code once
      }
    }
  }

  // Check secondary diagnoses
  for (const criteriaCode of secondary) {
    for (const patientDx of patientDiagnoses) {
      if (patientDx.codingSystem !== criteriaCode.codingSystem) {
        continue;
      }

      if (matchesPattern(patientDx.code, criteriaCode.code)) {
        matchedSecondary.push({
          criteriaCode: criteriaCode.code,
          criteriaDisplay: criteriaCode.display,
          patientCode: patientDx.code,
          patientDisplay: patientDx.display,
          enrollmentId: patientDx.enrollmentId,
          conditionPresetName: patientDx.conditionPresetName
        });
        break;
      }
    }
  }

  // Calculate match score
  const totalMatched = matchedPrimary.length + matchedSecondary.length;
  const totalCriteria = primary.length + secondary.length;

  // Base score: percentage of criteria matched
  let matchScore = (totalMatched / totalCriteria) * 100;

  // Bonus for meeting minimum requirements
  if (matchedPrimary.length >= minMatchRequired) {
    matchScore += 10;
  }

  // Bonus for multi-morbidity if preferred
  if (preferMultiMorbidity && matchedSecondary.length >= 2) {
    matchScore += 15;
  }

  // Cap at 100
  matchScore = Math.min(100, matchScore);

  return {
    matchScore: Math.round(matchScore),
    matchedPrimary,
    matchedSecondary,
    totalMatched,
    meetsMinimumRequirements: matchedPrimary.length >= minMatchRequired
  };
}

/**
 * Check if a patient diagnosis code matches a criteria pattern
 * Supports wildcards (e.g., J44.* matches J44.0, J44.1, J44.9)
 *
 * @param {string} patientCode - Patient's diagnosis code
 * @param {string} criteriaPattern - Criteria pattern (may include wildcards)
 * @returns {boolean} True if matches
 */
function matchesPattern(patientCode, criteriaPattern) {
  // Exact match
  if (patientCode === criteriaPattern) {
    return true;
  }

  // Wildcard pattern matching
  if (criteriaPattern.includes('*')) {
    const regexPattern = criteriaPattern
      .replace(/\./g, '\\.') // Escape dots
      .replace(/\*/g, '.*');  // Replace * with .*
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(patientCode);
  }

  return false;
}

/**
 * Create an EnrollmentSuggestion record
 *
 * @param {string} patientId - Patient ID
 * @param {string} organizationId - Organization ID
 * @param {Object} template - Billing package template
 * @param {Object} matchResult - Match result from matchDiagnosisCriteria
 * @param {string} sourceType - Source type
 * @param {string} sourceId - Source ID
 * @returns {Promise<Object>} Created EnrollmentSuggestion
 */
async function createEnrollmentSuggestion(
  patientId,
  organizationId,
  template,
  matchResult,
  sourceType,
  sourceId,
  supportedPrograms = [] // Organization's supported billing programs
) {
  // Check if suggestion already exists (avoid duplicates)
  const existingSuggestion = await prisma.enrollmentSuggestion.findFirst({
    where: {
      patientId,
      packageTemplateId: template.id,
      status: 'PENDING'
    }
  });

  if (existingSuggestion) {
    console.log(`Suggestion already exists for patient ${patientId} and template ${template.code}`);
    return existingSuggestion;
  }

  // Extract suggested programs from template
  const allPrograms = template.programCombinations?.programs || [];

  // Filter programs based on organization's supported programs
  const suggestedPrograms = supportedPrograms.length > 0
    ? allPrograms.filter(program => supportedPrograms.includes(program.programType))
    : allPrograms; // If no filter specified, include all programs

  console.log(`Filtered programs for ${template.name}:`);
  console.log(`  All programs: ${allPrograms.map(p => p.programType).join(', ')}`);
  console.log(`  Supported by org: ${supportedPrograms.join(', ')}`);
  console.log(`  Suggested programs: ${suggestedPrograms.map(p => p.programType).join(', ')}`);

  // Create suggestion
  const suggestion = await prisma.enrollmentSuggestion.create({
    data: {
      organizationId,
      patientId,
      packageTemplateId: template.id,
      matchScore: matchResult.matchScore,
      matchedDiagnoses: {
        primary: matchResult.matchedPrimary,
        secondary: matchResult.matchedSecondary,
        totalMatched: matchResult.totalMatched,
        meetsMinimumRequirements: matchResult.meetsMinimumRequirements
      },
      suggestedPrograms: {
        programs: suggestedPrograms,
        requiredDevices: template.programCombinations?.requiredDevices || [],
        recommendedMetrics: template.programCombinations?.recommendedMetrics || []
      },
      status: 'PENDING',
      sourceType,
      sourceId,
      metadata: {
        packageName: template.name,
        packageCode: template.code,
        category: template.category,
        clinicalRationale: template.clinicalRationale,
        evidenceSource: template.evidenceSource,
        suggestedPresets: template.suggestedPresets
      }
    }
  });

  // Update template usage count
  await prisma.billingPackageTemplate.update({
    where: { id: template.id },
    data: {
      usageCount: { increment: 1 },
      lastUsedAt: new Date()
    }
  });

  return suggestion;
}

/**
 * Get pending enrollment suggestions for a patient
 *
 * @param {string} patientId - Patient ID
 * @param {string} organizationId - Organization ID
 * @returns {Promise<Array>} Array of pending suggestions with template details
 */
async function getPendingSuggestions(patientId, organizationId) {
  const suggestions = await prisma.enrollmentSuggestion.findMany({
    where: {
      patientId,
      organizationId,
      status: 'PENDING'
    },
    include: {
      packageTemplate: true
    },
    orderBy: {
      matchScore: 'desc'
    }
  });

  return suggestions;
}

/**
 * Approve a suggestion and create enrollments
 *
 * @param {string} suggestionId - Suggestion ID
 * @param {string} reviewedById - Clinician ID approving the suggestion
 * @param {Object} options - Enrollment creation options
 * @returns {Promise<Object>} Updated suggestion with created enrollment IDs
 */
async function approveSuggestion(suggestionId, reviewedById, options = {}) {
  const { clinicianId, startDate = new Date(), selectedProgramType } = options;

  const suggestion = await prisma.enrollmentSuggestion.findUnique({
    where: { id: suggestionId },
    include: {
      packageTemplate: true
    }
  });

  if (!suggestion) {
    throw new Error(`Suggestion ${suggestionId} not found`);
  }

  if (suggestion.status !== 'PENDING') {
    throw new Error(`Suggestion ${suggestionId} is not pending (status: ${suggestion.status})`);
  }

  const createdEnrollmentIds = [];

  // Create enrollments for each suggested program
  let programs = suggestion.suggestedPrograms?.programs || [];

  // If selectedProgramType is specified, filter to only that program
  if (selectedProgramType) {
    programs = programs.filter(p => p.programType === selectedProgramType);

    if (programs.length === 0) {
      throw new Error(`Selected program type "${selectedProgramType}" not found in suggested programs`);
    }

    console.log(`Creating enrollment only for selected program: ${selectedProgramType}`);
  } else {
    console.log(`No program selected - creating enrollments for all ${programs.length} suggested programs`);
  }

  // Get or use any active care program from the organization
  let careProgram = await prisma.careProgram.findFirst({
    where: {
      organizationId: suggestion.organizationId,
      isActive: true
    }
  });

  if (!careProgram) {
    console.warn(`No active care program found in organization ${suggestion.organizationId}. Skipping enrollment creation.`);
    return suggestion;
  }

  // Get suggested condition presets from billing package template
  const suggestedPresetNames = suggestion.metadata?.suggestedPresets?.conditionPresets || [];

  if (suggestedPresetNames.length === 0) {
    console.warn(`No condition presets suggested for billing package ${suggestion.metadata?.packageName}. Skipping enrollment creation.`);
    return suggestion;
  }

  // Find or create condition preset for this organization
  let conditionPreset = await prisma.conditionPreset.findFirst({
    where: {
      organizationId: suggestion.organizationId,
      name: { in: suggestedPresetNames },
      isActive: true
    }
  });

  // If organization doesn't have this preset, clone from standardized library
  if (!conditionPreset) {
    const standardizedPreset = await prisma.conditionPreset.findFirst({
      where: {
        name: { in: suggestedPresetNames },
        isStandardized: true,
        isActive: true
      },
      include: {
        diagnoses: true,
        templates: { include: { template: true } },
        alertRules: { include: { rule: true } }
      }
    });

    if (standardizedPreset) {
      // Clone standardized preset for this organization
      conditionPreset = await prisma.conditionPreset.create({
        data: {
          organizationId: suggestion.organizationId,
          sourcePresetId: standardizedPreset.id,
          name: standardizedPreset.name,
          description: `${standardizedPreset.description} (Cloned from standard library for billing package)`,
          category: standardizedPreset.category,
          isStandardized: false,
          isActive: true,
          clinicalGuidelines: standardizedPreset.clinicalGuidelines,
          // Clone diagnoses
          diagnoses: {
            create: standardizedPreset.diagnoses.map(d => ({
              icd10: d.icd10,
              snomed: d.snomed,
              label: d.label,
              isPrimary: d.isPrimary
            }))
          }
        }
      });
      console.log(`Cloned condition preset '${standardizedPreset.name}' for organization ${suggestion.organizationId}`);
    } else {
      console.warn(`Could not find standardized condition preset matching ${suggestedPresetNames.join(', ')}. Skipping enrollment creation.`);
      return suggestion;
    }
  }

  for (const program of programs) {
    // Find matching billing program
    const billingProgram = await prisma.billingProgram.findFirst({
      where: {
        code: program.billingProgramCode,
        isActive: true
      }
    });

    if (!billingProgram) {
      console.warn(`No billing program found with code ${program.billingProgramCode}`);
      continue;
    }

    // Check if enrollment already exists (prevent duplicates)
    // The unique constraint is on (patientId, careProgramId, startDate)
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        patientId: suggestion.patientId,
        careProgramId: careProgram.id,
        startDate: {
          gte: new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()),
          lt: new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 1)
        }
      }
    });

    if (existingEnrollment) {
      console.log(`Enrollment already exists for patient ${suggestion.patientId} in care program on ${startDate.toISOString().split('T')[0]}`);

      // Update existing enrollment with billing program if not set
      if (!existingEnrollment.billingProgramId) {
        await prisma.enrollment.update({
          where: { id: existingEnrollment.id },
          data: { billingProgramId: billingProgram.id }
        });
        console.log(`Updated existing enrollment with billing program ${program.billingProgramCode}`);
      }

      createdEnrollmentIds.push(existingEnrollment.id);
      continue;
    }

    // Create enrollment linked to billing program with auto-selected condition preset
    const enrollment = await prisma.enrollment.create({
      data: {
        organization: {
          connect: { id: suggestion.organizationId }
        },
        patient: {
          connect: { id: suggestion.patientId }
        },
        clinician: {
          connect: { id: clinicianId || reviewedById }
        },
        careProgram: {
          connect: { id: careProgram.id }
        },
        billingProgram: {
          connect: { id: billingProgram.id }
        },
        conditionPreset: {
          connect: { id: conditionPreset.id }
        },
        status: 'ACTIVE',
        startDate,
        notes: `Created from billing package suggestion: ${suggestion.metadata.packageName} (${program.programType}: ${program.billingProgramCode}). Auto-selected condition preset: ${conditionPreset.name}`
      }
    });

    createdEnrollmentIds.push(enrollment.id);
  }

  // Update suggestion status
  const updatedSuggestion = await prisma.enrollmentSuggestion.update({
    where: { id: suggestionId },
    data: {
      status: 'APPROVED',
      reviewedById,
      reviewedAt: new Date(),
      createdEnrollmentIds
    }
  });

  return updatedSuggestion;
}

/**
 * Reject a suggestion
 *
 * @param {string} suggestionId - Suggestion ID
 * @param {string} reviewedById - Clinician ID rejecting the suggestion
 * @param {string} rejectionReason - Reason for rejection
 * @returns {Promise<Object>} Updated suggestion
 */
async function rejectSuggestion(suggestionId, reviewedById, rejectionReason) {
  const suggestion = await prisma.enrollmentSuggestion.findUnique({
    where: { id: suggestionId }
  });

  if (!suggestion) {
    throw new Error(`Suggestion ${suggestionId} not found`);
  }

  if (suggestion.status !== 'PENDING') {
    throw new Error(`Suggestion ${suggestionId} is not pending (status: ${suggestion.status})`);
  }

  const updatedSuggestion = await prisma.enrollmentSuggestion.update({
    where: { id: suggestionId },
    data: {
      status: 'REJECTED',
      reviewedById,
      reviewedAt: new Date(),
      rejectionReason
    }
  });

  return updatedSuggestion;
}

module.exports = {
  suggestBillingPackages,
  getPatientDiagnosisCodes,
  matchDiagnosisCriteria,
  matchesPattern,
  getPendingSuggestions,
  approveSuggestion,
  rejectSuggestion
};
