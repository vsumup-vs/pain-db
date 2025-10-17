const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();

const commonDrugs = [
  {
    name: 'Ibuprofen',
    brandName: 'Advil',
    activeIngredient: 'Ibuprofen',
    drugClass: 'NSAID',
    dosageForm: 'tablet',
    strength: '200mg',
    manufacturer: 'Pfizer',
    description: 'Nonsteroidal anti-inflammatory drug used for pain relief',
    sideEffects: ['stomach upset', 'dizziness', 'headache'],
    contraindications: ['kidney disease', 'heart disease', 'stomach ulcers']
  },
  {
    name: 'Acetaminophen',
    brandName: 'Tylenol',
    activeIngredient: 'Acetaminophen',
    drugClass: 'Analgesic',
    dosageForm: 'tablet',
    strength: '500mg',
    manufacturer: 'Johnson & Johnson',
    description: 'Pain reliever and fever reducer',
    sideEffects: ['liver damage (with overdose)', 'skin rash'],
    contraindications: ['liver disease', 'alcohol dependency']
  },
  {
    name: 'Gabapentin',
    brandName: 'Neurontin',
    activeIngredient: 'Gabapentin',
    drugClass: 'Anticonvulsant',
    dosageForm: 'capsule',
    strength: '300mg',
    description: 'Used for nerve pain and seizures',
    sideEffects: ['drowsiness', 'dizziness', 'fatigue'],
    contraindications: ['kidney disease']
  },
  {
    name: 'Morphine',
    brandName: 'MS Contin',
    activeIngredient: 'Morphine sulfate',
    drugClass: 'Opioid',
    controlledSubstance: 'II',
    dosageForm: 'tablet',
    strength: '15mg',
    description: 'Strong opioid pain medication',
    sideEffects: ['drowsiness', 'constipation', 'nausea', 'respiratory depression'],
    contraindications: ['respiratory depression', 'severe asthma', 'paralytic ileus']
  },
  {
    name: 'Tramadol',
    brandName: 'Ultram',
    activeIngredient: 'Tramadol hydrochloride',
    drugClass: 'Opioid',
    controlledSubstance: 'IV',
    dosageForm: 'tablet',
    strength: '50mg',
    description: 'Moderate pain relief medication',
    sideEffects: ['nausea', 'dizziness', 'constipation'],
    contraindications: ['seizure disorders', 'severe respiratory depression']
  }
];

async function seedDrugs() {
  try {
    console.log('Seeding drugs...');
    
    for (const drug of commonDrugs) {
      await prisma.drug.upsert({
        where: {
          name_strength_dosageForm: {
            name: drug.name,
            strength: drug.strength,
            dosageForm: drug.dosageForm
          }
        },
        update: {},
        create: drug
      });
      console.log(`Created/updated drug: ${drug.name} ${drug.strength}`);
    }
    
    console.log('Drug seeding completed!');
  } catch (error) {
    console.error('Error seeding drugs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedDrugs();