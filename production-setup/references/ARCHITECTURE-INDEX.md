# VitalEdge Architecture Documentation Index

> **Purpose**: Comprehensive index of all architecture documentation
> **Last Updated**: 2025-11-01
> **Maintainer**: Development Team

---

## Quick Links

**Production Setup**:
- [README](../README.md) - Master production setup guide
- [Quick Start](../docs/QUICK-START.md) - 5-minute setup guide
- [Platform Admin Guide](../docs/PLATFORM-ADMIN-GUIDE.md) - Platform operations
- [Client Onboarding](../docs/CLIENT-ONBOARDING.md) - Healthcare provider onboarding

**Core Architecture**:
- [Platform Organization Architecture](../../docs/PLATFORM-ORGANIZATION-ARCHITECTURE.md) - **600 lines** - Multi-tenant SaaS architecture
- [Platform SaaS Refactor Complete](../../docs/PLATFORM-SAAS-REFACTOR-COMPLETE.md) - Implementation summary
- [Production Implementation Strategy](../../docs/PRODUCTION-IMPLEMENTATION-STRATEGY.md) - **1074 lines** - Production deployment strategy

**Billing Architecture**:
- [Flexible Billing Configuration Architecture](../../docs/FLEXIBLE-BILLING-CONFIGURATION-ARCHITECTURE.md) - **1180 lines** - Database-driven billing system
- [Phase 1: Billing Service Complete](../../docs/PHASE-1-BILLING-SERVICE-COMPLETE.md) - Billing readiness service
- [Phase 2: Billing API & UI Complete](../../docs/PHASE-2-BILLING-API-UI-COMPLETE.md) - Billing endpoints and UI
- [enrollmentId Linkage Implementation](../../docs/ENROLLMENTID-LINKAGE-IMPLEMENTATION.md) - **441 lines** - Accurate billing calculations

**Developer Reference**:
- [Developer Reference Guide](../../docs/developer-reference.md) - Database schema, API endpoints, code patterns
- [Core Version Readiness](../../CORE-VERSION-READINESS.md) - Platform completion status
- [E2E UI Testing Plan](../../E2E-UI-TESTING-PLAN.md) - Comprehensive testing scenarios

---

## Architecture Documentation by Topic

### 1. Multi-Tenant SaaS Architecture

#### Platform Organization Architecture (600 lines)
**Location**: `docs/PLATFORM-ORGANIZATION-ARCHITECTURE.md`

**Topics Covered**:
- Organization types (PLATFORM vs CLIENT)
- Access control model with controller-level blocking
- Permission model (PLATFORM_* vs client permissions)
- Multi-tenant data isolation
- User-organization relationships
- Future roadmap and enhancements

**Key Sections**:
```
1. Core Concepts
   - Organization Types (PLATFORM, HOSPITAL, CLINIC, etc.)
   - User Roles and Permissions
   - Multi-Tenant Data Isolation

2. Platform Organization Details
   - SaaS Provider Capabilities
   - Standardized Library Management
   - Cross-Organization Analytics
   - Support and Billing

3. Client Organization Details
   - Healthcare Provider Capabilities
   - Patient Care Operations
   - Billing Readiness
   - Custom Content

4. Access Control Implementation
   - Controller-Level Blocking
   - Permission Enforcement
   - Organization Context Injection

5. Database Schema
   - Organization Model
   - UserOrganization Model
   - Permission Enum

6. API Design
   - Organization Context Middleware
   - Permission Checks
   - Audit Logging

7. Future Enhancements
   - White-labeling
   - Multi-region support
   - Advanced analytics
```

**Use Cases**:
- Understanding platform vs client separation
- Implementing new features with proper access control
- Designing APIs with organization context
- Planning multi-tenant features

---

#### Platform SaaS Refactor Complete
**Location**: `docs/PLATFORM-SAAS-REFACTOR-COMPLETE.md`

**Topics Covered**:
- Summary of SaaS architecture implementation (October 2025)
- Access control matrix
- Testing instructions
- Migration notes

**Use Cases**:
- Quick reference for access control rules
- Understanding implementation status
- Testing organization isolation

---

### 2. Production Deployment

#### Production Implementation Strategy (1074 lines)
**Location**: `docs/PRODUCTION-IMPLEMENTATION-STRATEGY.md`

**Topics Covered**:
- Multi-tenant hierarchy
- Standardization strategy
- Client onboarding workflow
- Billing program implementation
- Template lifecycle management
- **CRITICAL**: enrollmentId linkage architecture

**Key Sections**:
```
1. Platform Architecture
   - Multi-tenant hierarchy diagram
   - Organization types and capabilities

2. Standardization Strategy
   - Standardized library (NULL organizationId)
   - Condition presets, metrics, templates, alert rules
   - Version control and updates

3. Client Onboarding Workflow
   - Step-by-step onboarding process
   - Organization setup
   - Care program configuration
   - Customization options

4. Billing Program Implementation
   - CMS 2025 programs (RPM, RTM, CCM)
   - CPT code requirements
   - Eligibility criteria

5. Critical Architecture Issue: Billing Eligibility
   - enrollmentId linkage requirements
   - Data model gaps
   - Recommended architecture changes

6. Recommended Architecture Changes
   - Enrollment.billingEligibility
   - Observation.enrollmentId
   - TimeLog.enrollmentId
   - Billing readiness service
```

**Use Cases**:
- Planning production deployment
- Understanding client onboarding process
- Implementing billing features
- Troubleshooting billing calculations

---

### 3. Billing Architecture

#### Flexible Billing Configuration Architecture (1180 lines)
**Location**: `docs/FLEXIBLE-BILLING-CONFIGURATION-ARCHITECTURE.md`

**Topics Covered**:
- Database-driven billing rules (no hardcoded requirements)
- BillingProgram, BillingCPTCode, BillingEligibilityRule models
- CMS 2025 seed data
- Configurable billing service
- Version-aware billing
- International program support

**Key Sections**:
```
1. Problem with Hardcoded Requirements
   - Why hardcoded billing rules are bad
   - Update challenges

2. Proposed Solution: Configurable Billing Rules
   - BillingProgram model
   - BillingCPTCode model
   - BillingEligibilityRule model
   - Enhanced Enrollment model

3. Migration File
   - SQL for billing tables

4. Seed Data: CMS 2025 Billing Programs
   - CMS_RPM_2025 (4 CPT codes)
   - CMS_RTM_2025 (5 CPT codes)
   - CMS_CCM_2025 (3 CPT codes)

5. Enhanced Billing Readiness Service
   - Configuration-driven calculations
   - Multiple criteria types (DATA_DAYS, CLINICAL_TIME, etc.)
   - Operator evaluation

6. Benefits
   - Easy CMS updates (database-only, no code deployment)
   - International program support
   - Version tracking
   - Payer-specific variations
```

**Use Cases**:
- Understanding database-driven billing architecture
- Adding new billing programs
- Updating CMS requirements
- Implementing international billing programs

---

#### Phase 1: Billing Service Complete (400 lines)
**Location**: `docs/PHASE-1-BILLING-SERVICE-COMPLETE.md`

**Topics Covered**:
- Complete rewrite of billingReadinessService.js (592 lines)
- Configurable, database-driven implementation
- Replaces hardcoded billing logic

**Key Functions**:
- `calculateBillingReadiness(enrollmentId, billingMonth)` - Main entry point
- `evaluateEligibilityRules(enrollment, rules)` - Rule evaluation
- `evaluateCPTCode(enrollment, cptCode, startDate, endDate)` - CPT code eligibility
- `calculateUniqueDaysWithData()` - Data collection days
- `calculateBillableTime()` - Clinical time calculation

**Use Cases**:
- Understanding billing readiness service architecture
- Adding new CPT code types
- Customizing billing calculations

---

#### Phase 2: Billing API & UI Complete (748 lines)
**Location**: `docs/PHASE-2-BILLING-API-UI-COMPLETE.md`

**Topics Covered**:
- 7 new billing API endpoints
- Complete BillingReadiness.jsx UI rewrite (458 lines)
- Breaking API changes (patient-centric → enrollment-centric)

**API Endpoints**:
1. `GET /api/billing/readiness/:enrollmentId/:billingMonth` - Single enrollment
2. `GET /api/billing/organization/:organizationId/:billingMonth` - All enrollments
3. `GET /api/billing/summary/:organizationId/:billingMonth` - Organization summary
4. `GET /api/billing/export/:organizationId/:billingMonth` - CSV export
5. `GET /api/billing/programs` - List billing programs
6. `GET /api/billing/programs/:code` - Get specific program
7. `GET /api/billing/programs/organization/:organizationId` - Org programs

**Use Cases**:
- Integrating with billing API
- Building billing UI components
- Understanding API signature changes

---

#### enrollmentId Linkage Implementation (441 lines)
**Location**: `docs/ENROLLMENTID-LINKAGE-IMPLEMENTATION.md`

**Topics Covered**:
- **CRITICAL**: Link TimeLog and Observation to specific Enrollment records
- Without this linkage, billing calculations are inaccurate
- Implementation strategy and helper functions

**Problem**:
- Patient enrolled in BOTH RPM (blood pressure) and RTM (pain therapy)
- Observations and time logs not linked to specific enrollments
- Billing service cannot distinguish which activities bill to which program

**Solution**:
- `findBillingEnrollment(patientId, organizationId)` helper function
- Auto-link TimeLogs and Observations to active billing enrollment
- Enrollment selection logic (prefer most recent)

**Files Modified**:
- `src/utils/billingHelpers.js` - Helper function
- `src/controllers/alertController.js` - Alert resolution with enrollmentId
- `src/services/timeTrackingService.js` - Time tracking with enrollmentId
- `src/controllers/observationController.js` - Observation creation with enrollmentId

**Use Cases**:
- Understanding accurate billing linkage
- Implementing multi-program billing
- Troubleshooting billing calculations

---

### 4. Developer Reference

#### Developer Reference Guide
**Location**: `docs/developer-reference.md`

**Topics Covered**:
- Complete database schema
- All API endpoints
- Common code patterns
- Enum values
- Field validation rules
- Utility scripts

**Key Sections**:
```
1. Database Schema Reference
   - User, Organization, Patient, Clinician
   - Alert, Enrollment, Observation, Assessment
   - TimeLog, BillingProgram, BillingCPTCode

2. API Endpoints Reference
   - Authentication endpoints
   - Patient/Clinician endpoints
   - Alert/Task endpoints
   - Billing endpoints (7 endpoints)

3. Code Patterns & Best Practices
   - Multi-tenant queries (ALWAYS filter by organizationId)
   - User vs Clinician ID distinction
   - Prisma transactions
   - Error handling

4. Enum Values
   - UserRole, Permission, OrganizationType
   - AlertStatus, AlertSeverity
   - EnrollmentStatus, BillingProgram types

5. Utility Scripts
   - Seed scripts
   - Test data creation
   - Database cleanup
```

**Use Cases**:
- Daily development reference
- API integration
- Database queries
- Understanding data model

---

### 5. Testing & Readiness

#### Core Version Readiness Assessment
**Location**: `CORE-VERSION-READINESS.md`

**Topics Covered**:
- Platform completion status (95%)
- Pilot clinic readiness checklist
- Success metrics
- Risk assessment

**Use Cases**:
- Assessing production readiness
- Planning pilot clinic deployment
- Identifying remaining work

---

#### E2E UI Testing Plan
**Location**: `E2E-UI-TESTING-PLAN.md`

**Topics Covered**:
- 25 test scenarios
- Complete user workflows
- Manual testing instructions

**Use Cases**:
- Manual UI testing
- QA workflow validation
- User acceptance testing

---

## Documentation by Audience

### For Platform Administrators (SaaS Provider Staff)
1. [Platform Admin Guide](../docs/PLATFORM-ADMIN-GUIDE.md) - Operations manual
2. [Platform Organization Architecture](../../docs/PLATFORM-ORGANIZATION-ARCHITECTURE.md) - Technical architecture
3. [Quick Start](../docs/QUICK-START.md) - Fast deployment guide

### For Organization Administrators (Healthcare Providers)
1. [Client Onboarding](../docs/CLIENT-ONBOARDING.md) - Onboarding workflow
2. [Billing Architecture](../../docs/FLEXIBLE-BILLING-CONFIGURATION-ARCHITECTURE.md) - Billing system
3. [Developer Reference](../../docs/developer-reference.md) - API and data model

### For Developers
1. [Developer Reference](../../docs/developer-reference.md) - Schema, API, patterns
2. [Production Implementation Strategy](../../docs/PRODUCTION-IMPLEMENTATION-STRATEGY.md) - Architecture decisions
3. [Billing Service Complete](../../docs/PHASE-1-BILLING-SERVICE-COMPLETE.md) - Billing implementation
4. [enrollmentId Linkage](../../docs/ENROLLMENTID-LINKAGE-IMPLEMENTATION.md) - Accurate billing

### For QA/Testing
1. [E2E UI Testing Plan](../../E2E-UI-TESTING-PLAN.md) - Test scenarios
2. [Core Version Readiness](../../CORE-VERSION-READINESS.md) - Completion status
3. [Quick Start](../docs/QUICK-START.md) - Setup and verification

---

## Documentation Maintenance

### When to Update Documentation

**New Feature Added**:
- Update Developer Reference with new models/endpoints
- Update appropriate architecture document
- Update testing plan if applicable

**Architecture Change**:
- Update relevant architecture document (Platform, Billing, etc.)
- Update Production Implementation Strategy if workflow changes
- Add migration notes

**Billing Requirement Change**:
- Update Flexible Billing Configuration Architecture
- Update seed data scripts
- Document change in billing service docs

**New Testing Scenario**:
- Update E2E UI Testing Plan
- Document expected behavior
- Add manual testing steps

---

## Documentation Version History

- **v1.0.0** (2025-10-20): Initial architecture documentation (Platform SaaS Refactor)
- **v1.1.0** (2025-10-16): Flexible billing architecture and implementation
- **v1.2.0** (2025-10-17): enrollmentId linkage implementation
- **v2.0.0** (2025-11-01): Production setup folder and comprehensive guides

---

## Missing Documentation (Future Work)

- [ ] **API Documentation Portal**: OpenAPI/Swagger specification
- [ ] **Integration Guide**: Third-party EHR integration
- [ ] **Mobile App Documentation**: iOS/Android app architecture
- [ ] **Security Audit Guide**: HIPAA compliance verification
- [ ] **Disaster Recovery Plan**: Backup and restore procedures
- [ ] **Performance Tuning Guide**: Database optimization, caching strategies
- [ ] **Monitoring & Alerting**: Application monitoring setup
- [ ] **Multi-Region Deployment**: Geographic distribution strategy

---

**Last Updated**: 2025-11-01
**Maintainer**: Development Team
**Version**: 2.0.0
