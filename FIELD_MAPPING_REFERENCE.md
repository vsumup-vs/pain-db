# Prisma Field Mapping Reference

This document outlines the field mappings between Prisma schema fields (camelCase) and database columns (snake_case).

## Important Rules

1. **Always use camelCase field names in JavaScript code** - these are the Prisma field names
2. **Never use snake_case field names in code** - these are database column names only
3. **Prisma automatically handles the mapping** between camelCase and snake_case

## Field Mappings

### AssessmentTemplate Model
- `isStandardized` (Prisma) → `is_standardized` (Database)
- `validationInfo` (Prisma) → `validation_info` (Database)
- `standardCoding` (Prisma) → `standard_coding` (Database)
- `scoringInfo` (Prisma) → `scoring_info` (Database)
- `copyrightInfo` (Prisma) → `copyright_info` (Database)
- `clinicalUse` (Prisma) → `clinical_use` (Database)
- `createdAt` (Prisma) → `created_at` (Database)
- `updatedAt` (Prisma) → `updated_at` (Database)

### Drug Model
- `dosageForm` (Prisma) → `dosage_form` (Database)
- `createdAt` (Prisma) → `created_at` (Database)
- `updatedAt` (Prisma) → `updated_at` (Database)

### Patient Model
- `firstName` (Prisma) → `first_name` (Database)
- `lastName` (Prisma) → `last_name` (Database)
- `dateOfBirth` (Prisma) → `date_of_birth` (Database)
- `phoneNumber` (Prisma) → `phone_number` (Database)
- `emergencyContact` (Prisma) → `emergency_contact` (Database)
- `emergencyPhone` (Prisma) → `emergency_phone` (Database)
- `createdAt` (Prisma) → `created_at` (Database)
- `updatedAt` (Prisma) → `updated_at` (Database)

### Clinician Model
- `firstName` (Prisma) → `first_name` (Database)
- `lastName` (Prisma) → `last_name` (Database)
- `licenseNumber` (Prisma) → `license_number` (Database)
- `phoneNumber` (Prisma) → `phone_number` (Database)
- `createdAt` (Prisma) → `created_at` (Database)
- `updatedAt` (Prisma) → `updated_at` (Database)

## Code Examples

### ✅ Correct Usage (camelCase)
```javascript
// Creating records
await prisma.assessmentTemplate.create({
  data: {
    name: "Pain Scale",
    isStandardized: true,  // ✅ Use camelCase
    validationInfo: "...", // ✅ Use camelCase
  }
});

// Querying records
const templates = await prisma.assessmentTemplate.findMany({
  where: {
    isStandardized: true  // ✅ Use camelCase
  }
});
```

### ❌ Incorrect Usage (snake_case)
```javascript
// DON'T DO THIS
await prisma.assessmentTemplate.create({
  data: {
    name: "Pain Scale",
    is_standardized: true,  // ❌ Don't use snake_case
    validation_info: "...", // ❌ Don't use snake_case
  }
});
```

## Validation

Run `npm run validate-fields` to check for incorrect field usage in your code.
