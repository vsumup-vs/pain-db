#!/bin/bash

echo "🔄 Starting ValueType enum migration..."

# Extract database connection details from .env.local
DB_USER="pain_user"
DB_PASSWORD="password"
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="pain_db"

echo "📊 Executing SQL migration..."

# Set PGPASSWORD to avoid password prompt
export PGPASSWORD="$DB_PASSWORD"

# Execute the SQL migration
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f migrate-enum-values.sql

if [ $? -eq 0 ]; then
    echo "✅ SQL migration completed successfully!"
    
    echo "📝 Now updating schema.prisma to lowercase enum values..."
    
    # Update schema.prisma to use lowercase enum values with new types
    cat > prisma/schema.prisma << 'EOF'
// This is your Prisma schema file.
// Learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum ValueType {
  numeric
  text
  boolean
  categorical
  ordinal
  date
  time
  datetime
  json
}

enum Permission {
  READ
  WRITE
  DELETE
  ADMIN
}

enum UserRole {
  PATIENT
  CLINICIAN
  ADMIN
}

enum AlertSeverity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum AlertStatus {
  ACTIVE
  ACKNOWLEDGED
  RESOLVED
}

enum ObservationStatus {
  PENDING
  COMPLETED
  CANCELLED
}

model User {
  id                String   @id @default(cuid())
  email             String   @unique
  passwordHash      String
  firstName         String
  lastName          String
  role              UserRole @default(PATIENT)
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  lastLoginAt       DateTime?
  organizationId    String?
  
  // Relations
  organization      Organization? @relation(fields: [organizationId], references: [id])
  patientProfile    Patient?
  clinicianProfile  Clinician?
  auditLogs         AuditLog[]
  
  @@map("users")
}

model Organization {
  id          String   @id @default(cuid())
  name        String
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  users       User[]
  patients    Patient[]
  clinicians  Clinician[]
  
  @@map("organizations")
}

model Patient {
  id             String   @id @default(cuid())
  userId         String   @unique
  dateOfBirth    DateTime
  gender         String?
  phoneNumber    String?
  emergencyContact String?
  medicalHistory String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  organizationId String?
  
  // Relations
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization   Organization? @relation(fields: [organizationId], references: [id])
  enrollments    Enrollment[]
  observations   Observation[]
  alerts         Alert[]
  
  @@map("patients")
}

model Clinician {
  id             String   @id @default(cuid())
  userId         String   @unique
  licenseNumber  String?
  specialization String?
  department     String?
  phoneNumber    String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  organizationId String?
  
  // Relations
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization   Organization? @relation(fields: [organizationId], references: [id])
  enrollments    Enrollment[]
  alerts         Alert[]
  
  @@map("clinicians")
}

model MetricDefinition {
  id          String    @id @default(cuid())
  name        String
  description String?
  unit        String?
  valueType   ValueType
  category    String?
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  // Value constraints
  minValue    Float?
  maxValue    Float?
  
  // Relations
  observations Observation[]
  alertRules   AlertRule[]
  
  @@map("metric_definitions")
}

model Observation {
  id               String            @id @default(cuid())
  patientId        String
  metricId         String
  value            String
  timestamp        DateTime          @default(now())
  status           ObservationStatus @default(PENDING)
  notes            String?
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
  
  // Context fields
  contextType      String?
  contextValue     String?
  
  // Relations
  patient          Patient           @relation(fields: [patientId], references: [id], onDelete: Cascade)
  metric           MetricDefinition  @relation(fields: [metricId], references: [id])
  
  @@map("observations")
}

model Enrollment {
  id          String   @id @default(cuid())
  patientId   String
  clinicianId String
  startDate   DateTime @default(now())
  endDate     DateTime?
  isActive    Boolean  @default(true)
  notes       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  patient     Patient   @relation(fields: [patientId], references: [id], onDelete: Cascade)
  clinician   Clinician @relation(fields: [clinicianId], references: [id])
  
  @@unique([patientId, clinicianId])
  @@map("enrollments")
}

model AlertRule {
  id          String        @id @default(cuid())
  metricId    String
  name        String
  description String?
  condition   String        // JSON string defining the alert condition
  severity    AlertSeverity @default(MEDIUM)
  isActive    Boolean       @default(true)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  
  // Relations
  metric      MetricDefinition @relation(fields: [metricId], references: [id])
  alerts      Alert[]
  
  @@map("alert_rules")
}

model Alert {
  id          String        @id @default(cuid())
  patientId   String
  ruleId      String
  clinicianId String?
  message     String
  severity    AlertSeverity
  status      AlertStatus   @default(ACTIVE)
  triggeredAt DateTime      @default(now())
  resolvedAt  DateTime?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  
  // Relations
  patient     Patient    @relation(fields: [patientId], references: [id], onDelete: Cascade)
  rule        AlertRule  @relation(fields: [ruleId], references: [id])
  clinician   Clinician? @relation(fields: [clinicianId], references: [id])
  
  @@map("alerts")
}

model AuditLog {
  id        String   @id @default(cuid())
  userId    String?
  action    String
  resource  String
  details   String?  // JSON string with additional details
  timestamp DateTime @default(now())
  ipAddress String?
  userAgent String?
  
  // Relations
  user      User?    @relation(fields: [userId], references: [id])
  
  @@map("audit_logs")
}
EOF

    echo "✅ Schema updated to lowercase enum values!"
    
    echo "🔄 Pushing schema changes to database..."
    npx prisma db push --accept-data-loss
    
    if [ $? -eq 0 ]; then
        echo "✅ Schema push completed!"
        
        echo "🔄 Regenerating Prisma client..."
        npx prisma generate
        
        if [ $? -eq 0 ]; then
            echo "🎉 Migration completed successfully!"
            echo "✅ ValueType enum values migrated from uppercase to lowercase"
            echo "✅ Schema updated with new enum types (categorical, ordinal)"
            echo "✅ Prisma client regenerated"
        else
            echo "❌ Failed to regenerate Prisma client"
            exit 1
        fi
    else
        echo "❌ Failed to push schema changes"
        exit 1
    fi
else
    echo "❌ SQL migration failed"
    exit 1
fi

# Clean up password environment variable
unset PGPASSWORD

echo "🔍 Final verification - checking current ValueType distribution:"
export PGPASSWORD="$DB_PASSWORD"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT \"valueType\", COUNT(*) as count FROM \"metric_definitions\" GROUP BY \"valueType\" ORDER BY count DESC;"
unset PGPASSWORD