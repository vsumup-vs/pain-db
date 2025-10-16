/**
 * Billing Controller
 *
 * Handles billing readiness calculations and exports for CMS billing codes.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const {
  calculatePatientBillingReadiness,
  calculateOrganizationBillingReadiness,
  generateBillingCSV
} = require('../services/billingReadinessService');

/**
 * Get billing readiness for organization
 * GET /api/billing/readiness
 */
const getBillingReadiness = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { year, month } = req.query;

    // Default to current month if not specified
    const now = new Date();
    const targetYear = year ? parseInt(year) : now.getFullYear();
    const targetMonth = month ? parseInt(month) : now.getMonth() + 1;

    // Validate month range
    if (targetMonth < 1 || targetMonth > 12) {
      return res.status(400).json({
        success: false,
        message: 'Month must be between 1 and 12'
      });
    }

    // Calculate billing readiness for the organization
    const billingData = await calculateOrganizationBillingReadiness(
      organizationId,
      targetYear,
      targetMonth
    );

    res.status(200).json({
      success: true,
      data: billingData
    });
  } catch (error) {
    console.error('Error fetching billing readiness:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate billing readiness',
      error: error.message
    });
  }
};

/**
 * Get billing readiness for a specific patient
 * GET /api/billing/readiness/patient/:patientId
 */
const getPatientBillingReadiness = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { patientId } = req.params;
    const { year, month } = req.query;

    // Default to current month if not specified
    const now = new Date();
    const targetYear = year ? parseInt(year) : now.getFullYear();
    const targetMonth = month ? parseInt(month) : now.getMonth() + 1;

    // Validate month range
    if (targetMonth < 1 || targetMonth > 12) {
      return res.status(400).json({
        success: false,
        message: 'Month must be between 1 and 12'
      });
    }

    // Verify patient belongs to organization
    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        organizationId
      }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Calculate billing readiness for the patient
    const billingData = await calculatePatientBillingReadiness(
      patientId,
      targetYear,
      targetMonth,
      organizationId
    );

    if (!billingData) {
      return res.status(404).json({
        success: false,
        message: 'Unable to calculate billing readiness for patient'
      });
    }

    res.status(200).json({
      success: true,
      data: billingData
    });
  } catch (error) {
    console.error('Error fetching patient billing readiness:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate patient billing readiness',
      error: error.message
    });
  }
};

/**
 * Export billing readiness as CSV
 * GET /api/billing/readiness/export
 */
const exportBillingReadiness = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { year, month } = req.query;

    // Default to current month if not specified
    const now = new Date();
    const targetYear = year ? parseInt(year) : now.getFullYear();
    const targetMonth = month ? parseInt(month) : now.getMonth() + 1;

    // Validate month range
    if (targetMonth < 1 || targetMonth > 12) {
      return res.status(400).json({
        success: false,
        message: 'Month must be between 1 and 12'
      });
    }

    // Calculate billing readiness for the organization
    const billingData = await calculateOrganizationBillingReadiness(
      organizationId,
      targetYear,
      targetMonth
    );

    // Generate CSV
    const csvContent = generateBillingCSV(billingData);

    // Set headers for CSV download
    const monthName = new Date(targetYear, targetMonth - 1).toLocaleString('default', { month: 'long' });
    const filename = `billing-readiness-${monthName}-${targetYear}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('Error exporting billing readiness:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export billing readiness',
      error: error.message
    });
  }
};

/**
 * Get billing statistics summary
 * GET /api/billing/stats
 */
const getBillingStats = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { year, month } = req.query;

    // Default to current month if not specified
    const now = new Date();
    const targetYear = year ? parseInt(year) : now.getFullYear();
    const targetMonth = month ? parseInt(month) : now.getMonth() + 1;

    // Validate month range
    if (targetMonth < 1 || targetMonth > 12) {
      return res.status(400).json({
        success: false,
        message: 'Month must be between 1 and 12'
      });
    }

    // Calculate billing readiness
    const billingData = await calculateOrganizationBillingReadiness(
      organizationId,
      targetYear,
      targetMonth
    );

    // Return just the summary
    res.status(200).json({
      success: true,
      data: {
        month: targetMonth,
        year: targetYear,
        summary: billingData.summary
      }
    });
  } catch (error) {
    console.error('Error fetching billing stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch billing statistics',
      error: error.message
    });
  }
};

module.exports = {
  getBillingReadiness,
  getPatientBillingReadiness,
  exportBillingReadiness,
  getBillingStats
};
