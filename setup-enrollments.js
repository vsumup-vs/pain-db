const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();

async function setupEnrollments() {
  try {
    console.log('Setting up Pain Management & Medication Adherence enrollments...');
    
    // Get or create a test patient
    let patient = await prisma.patient.findFirst({
      where: {
        email: 'test.patient@example.com'
      }
    });
    
    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          mrn: 'MRN001',
          firstName: 'John',
          lastName: 'Doe',
          email: 'test.patient@example.com',
          phone: '+1-555-0123',
          dateOfBirth: new Date('1980-01-15'),
          gender: 'Male',
          address: {
            street: '123 Main St',
            city: 'Anytown',
            state: 'CA',
            zipCode: '12345'
          },
          medicalHistory: {
            conditions: ['Chronic lower back pain', 'Hypertension'],
            surgeries: ['L4-L5 discectomy (2022)']
          },
          allergies: {
            medications: ['Penicillin', 'Sulfa drugs'],
            environmental: ['Pollen']
          }
        }
      });
      console.log('Created test patient:', patient.firstName, patient.lastName);
    }
    
    // Get or create a test clinician - check by both email and NPI
    let clinician = await prisma.clinician.findFirst({
      where: {
        OR: [
          { email: 'dr.smith@hospital.com' },
          { npi: '1234567890' }
        ]
      }
    });
    
    if (!clinician) {
      clinician = await prisma.clinician.create({
        data: {
          npi: '1234567890',
          firstName: 'Sarah',
          lastName: 'Smith',
          email: 'dr.smith@hospital.com',
          phone: '+1-555-0456',
          specialization: 'Pain Management',
          licenseNumber: 'MD123456',
          department: 'Anesthesiology',
          credentials: {
            degree: 'MD',
            boardCertifications: ['Pain Medicine', 'Anesthesiology'],
            fellowships: ['Pain Management Fellowship']
          }
        }
      });
      console.log('Created test clinician:', clinician.firstName, clinician.lastName);
    } else {
      console.log('Found existing clinician:', clinician.firstName, clinician.lastName);
    }
    
    // Get condition presets
    const painPreset = await prisma.conditionPreset.findFirst({
      where: { name: 'Chronic Pain Management' }
    });
    
    const medicationPreset = await prisma.conditionPreset.findFirst({
      where: { name: 'Medication Adherence Monitoring' }
    });
    
    if (!painPreset || !medicationPreset) {
      console.log('Condition presets not found. Please run seed-condition-presets.js first.');
      return;
    }
    
    // Create Pain Management enrollment
    const existingPainEnrollment = await prisma.enrollment.findFirst({
      where: {
        patientId: patient.id,
        presetId: painPreset.id,
        status: 'active'
      }
    });
    
    if (!existingPainEnrollment) {
      const painEnrollment = await prisma.enrollment.create({
        data: {
          patientId: patient.id,
          clinicianId: clinician.id,
          presetId: painPreset.id,
          diagnosisCode: 'M79.3', // Chronic pain syndrome
          startDate: new Date(),
          status: 'active',
          consentAt: new Date()
        },
        include: {
          preset: true,
          patient: { select: { firstName: true, lastName: true } },
          clinician: { select: { firstName: true, lastName: true } }
        }
      });
      console.log(`Created Pain Management enrollment for ${painEnrollment.patient.firstName} ${painEnrollment.patient.lastName}`);
    } else {
      console.log('Pain Management enrollment already exists');
    }
    
    // Create Medication Adherence enrollment
    const existingMedEnrollment = await prisma.enrollment.findFirst({
      where: {
        patientId: patient.id,
        presetId: medicationPreset.id,
        status: 'active'
      }
    });
    
    if (!existingMedEnrollment) {
      const medEnrollment = await prisma.enrollment.create({
        data: {
          patientId: patient.id,
          clinicianId: clinician.id,
          presetId: medicationPreset.id,
          diagnosisCode: 'Z91.14', // Patient's noncompliance with medication regimen
          startDate: new Date(),
          status: 'active',
          consentAt: new Date()
        },
        include: {
          preset: true,
          patient: { select: { firstName: true, lastName: true } },
          clinician: { select: { firstName: true, lastName: true } }
        }
      });
      console.log(`Created Medication Adherence enrollment for ${medEnrollment.patient.firstName} ${medEnrollment.patient.lastName}`);
    } else {
      console.log('Medication Adherence enrollment already exists');
    }
    
    // Add some medications to the patient
    const ibuprofen = await prisma.drug.findFirst({
      where: { name: 'Ibuprofen' }
    });
    
    const gabapentin = await prisma.drug.findFirst({
      where: { name: 'Gabapentin' }
    });
    
    if (ibuprofen) {
      const existingIbuprofen = await prisma.patientMedication.findFirst({
        where: {
          patientId: patient.id,
          drugId: ibuprofen.id,
          isActive: true
        }
      });
      
      if (!existingIbuprofen) {
        await prisma.patientMedication.create({
          data: {
            patientId: patient.id,
            drugId: ibuprofen.id,
            prescribedBy: clinician.id,
            dosage: '400mg',
            frequency: 'Three times daily',
            route: 'Oral',
            instructions: 'Take with food to reduce stomach irritation',
            startDate: new Date(),
            isActive: true,
            notes: 'For chronic pain management'
          }
        });
        console.log('Added Ibuprofen prescription');
      }
    }
    
    if (gabapentin) {
      const existingGabapentin = await prisma.patientMedication.findFirst({
        where: {
          patientId: patient.id,
          drugId: gabapentin.id,
          isActive: true
        }
      });
      
      if (!existingGabapentin) {
        await prisma.patientMedication.create({
          data: {
            patientId: patient.id,
            drugId: gabapentin.id,
            prescribedBy: clinician.id,
            dosage: '300mg',
            frequency: 'Twice daily',
            route: 'Oral',
            instructions: 'Start with 300mg once daily, increase as tolerated',
            startDate: new Date(),
            isActive: true,
            notes: 'For neuropathic pain component'
          }
        });
        console.log('Added Gabapentin prescription');
      }
    }
    
    console.log('\nEnrollment setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Start the servers: npm run start:all');
    console.log('2. Navigate to /enrollments to view enrollments');
    console.log('3. Navigate to /medications to manage medications');
    console.log('4. Use the observation endpoints to record pain levels and medication adherence');
    
  } catch (error) {
    console.error('Error setting up enrollments:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupEnrollments();