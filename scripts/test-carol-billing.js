const { PrismaClient } = require('@prisma/client');
const billingReadinessService = require('../src/services/billingReadinessService');

const prisma = new PrismaClient();

async function testCarolBilling() {
  try {
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        patient: { lastName: 'NearTime' }
      },
      include: { patient: true }
    });

    if (!enrollment) {
      console.log('❌ Carol enrollment not found');
      return;
    }

    console.log('=== TESTING CAROL BILLING CALCULATION ===');
    console.log('Patient:', enrollment.patient.firstName, enrollment.patient.lastName);
    console.log('Enrollment ID:', enrollment.id);

    const billingMonth = '2025-10';
    const result = await billingReadinessService.calculateBillingReadiness(
      enrollment.id,
      billingMonth
    );

    console.log('\n=== FULL BILLING RESULT ===');
    console.log(JSON.stringify(result, null, 2));

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await prisma.$disconnect();
  }
}

testCarolBilling();
