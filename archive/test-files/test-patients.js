const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();

async function createSamplePatients() {
  try {
    // Create sample patients
    const samplePatients = [
      {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@email.com',
        phone: '+1-555-0123',
        dateOfBirth: new Date('1985-03-15'),
        gender: 'MALE',
        address: '123 Main St, Anytown, USA',
        emergencyContact: 'Jane Doe - +1-555-0124',
        medicalHistory: 'Hypertension, Diabetes Type 2',
        allergies: 'Penicillin',
        medications: 'Metformin 500mg, Lisinopril 10mg',
        insuranceInfo: 'Blue Cross Blue Shield - Policy #12345'
      },
      {
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@email.com',
        phone: '+1-555-0125',
        dateOfBirth: new Date('1992-07-22'),
        gender: 'FEMALE',
        address: '456 Oak Ave, Somewhere, USA',
        emergencyContact: 'Mike Johnson - +1-555-0126',
        medicalHistory: 'Asthma',
        allergies: 'Shellfish',
        medications: 'Albuterol inhaler',
        insuranceInfo: 'Aetna - Policy #67890'
      },
      {
        firstName: 'Michael',
        lastName: 'Brown',
        email: 'michael.brown@email.com',
        phone: '+1-555-0127',
        dateOfBirth: new Date('1978-11-08'),
        gender: 'MALE',
        address: '789 Pine St, Elsewhere, USA',
        emergencyContact: 'Lisa Brown - +1-555-0128',
        medicalHistory: 'Chronic back pain, Arthritis',
        allergies: 'None known',
        medications: 'Ibuprofen 400mg, Gabapentin 300mg',
        insuranceInfo: 'United Healthcare - Policy #11111'
      },
      {
        firstName: 'Emily',
        lastName: 'Davis',
        email: 'emily.davis@email.com',
        phone: '+1-555-0129',
        dateOfBirth: new Date('1990-05-14'),
        gender: 'FEMALE',
        address: '321 Elm St, Nowhere, USA',
        emergencyContact: 'Robert Davis - +1-555-0130',
        medicalHistory: 'Migraine headaches',
        allergies: 'Latex',
        medications: 'Sumatriptan 50mg',
        insuranceInfo: 'Cigna - Policy #22222'
      }
    ];

    for (const patient of samplePatients) {
      await prisma.patient.create({
        data: patient
      });
      console.log(`Created patient: ${patient.firstName} ${patient.lastName}`);
    }

    console.log('Sample patients created successfully!');
  } catch (error) {
    console.error('Error creating sample patients:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSamplePatients();