# CLAUDE.md - Project Instructions

> ClinMetrics Pro - Clinical Metrics Management Platform
> Last Updated: 2025-10-17 (Billing documentation added)

## Agent OS Documentation

### Product Context
- **Mission & Vision:** @.agent-os/product/mission.md
- **Technical Architecture:** @.agent-os/product/tech-stack.md
- **Development Roadmap:** @.agent-os/product/roadmap.md
- **Requirements Gap Analysis:** @.agent-os/product/requirements-gap-analysis.md
- **Decision History:** @.agent-os/product/decisions.md

### Development Standards
- **Code Style:** @~/.agent-os/standards/code-style.md
- **Best Practices:** @~/.agent-os/standards/best-practices.md

### Project Management
- **Active Specs:** @.agent-os/specs/
- **Spec Planning:** Use `@~/.agent-os/instructions/create-spec.md`
- **Tasks Execution:** Use `@~/.agent-os/instructions/execute-tasks.md`

## Workflow Instructions

When asked to work on this codebase:

1. **First**, check @.agent-os/product/roadmap.md for current priorities
2. **Then**, follow the appropriate instruction file:
   - For new features: @~/.agent-os/instructions/create-spec.md
   - For tasks execution: @~/.agent-os/instructions/execute-tasks.md
3. **Always**, adhere to the standards in the files listed above

## Important Notes

- Product-specific files in `.agent-os/product/` override any global standards
- User's specific instructions override (or amend) instructions found in `.agent-os/specs/...`
- Always adhere to established patterns, code style, and best practices documented above
- **HIPAA Compliance:** All code must maintain HIPAA compliance standards (encryption, audit logging, access controls)
- **Standards Traceability:** When working with condition presets, metrics, or assessment templates, maintain linkage to authoritative standards sources

## Project-Specific Guidelines

### Developer Reference
**IMPORTANT**: Before writing any code or scripts, always consult:
- **@docs/developer-reference.md** - Complete database schema, API endpoints, common patterns, and utility scripts reference

This document contains:
- Database schema for all models (User, Organization, Patient, Clinician, Alert, TimeLog, Enrollment, BillingProgram, CPTCode, etc.)
- API endpoints and request/response structures (including 7 billing-specific endpoints)
- Common code patterns (multi-tenant queries, User vs Clinician ID, Prisma transactions, error handling)
- Enum values reference
- Field validation rules
- Relationship mappings
- Utility scripts documentation and development guidelines

#### Billing System Documentation

The platform includes a comprehensive, **configurable billing architecture** for CMS reimbursement programs (RPM, RTM, CCM). Key features:

**Core Capabilities:**
- **Database-Driven Configuration**: All billing requirements, thresholds, and rules stored in database (no hardcoded values)
- **Multi-Program Support**: Patients can enroll in multiple billing programs simultaneously (e.g., RPM + RTM)
- **Enrollment-Centric Calculations**: All billing tied to specific enrollments, not patients
- **Version-Aware Billing**: Effective date tracking ensures historical billing accuracy
- **International Program Support**: Extensible to non-CMS billing programs

**Architecture Documents:**
- **@docs/FLEXIBLE-BILLING-CONFIGURATION-ARCHITECTURE.md** - Proposed database-driven billing architecture (1180 lines)
- **@docs/PRODUCTION-IMPLEMENTATION-STRATEGY.md** - Production architecture and enrollmentId linkage strategy (1074 lines)
- **@docs/PHASE-1-BILLING-SERVICE-COMPLETE.md** - Complete billingReadinessService.js rewrite documentation (400 lines)
- **@docs/PHASE-2-BILLING-API-UI-COMPLETE.md** - API and frontend implementation details (748 lines)
- **@docs/ENROLLMENTID-LINKAGE-IMPLEMENTATION.md** - enrollmentId linking for TimeLog and Observation (441 lines)

**Key Implementation Details:**
- **7 New Billing API Endpoints**: Single enrollment readiness, organization summary, CSV export, program listings
- **Breaking API Changes**: Old patient-centric endpoints replaced with enrollment-centric design
- **Billing Month Format**: All APIs use `YYYY-MM` string format (not `{year, month}` objects)
- **enrollmentId Linkage**: TimeLog and Observation now linked to billing enrollments via `findBillingEnrollment()` helper
- **CPT Code Categories**: SETUP, DATA_COLLECTION, CLINICAL_TIME, TREATMENT_TIME, CLINICAL_TIME_INCREMENTAL
- **Eligibility Rule Types**: INSURANCE, DIAGNOSIS, CONSENT, AGE, CUSTOM with configurable operators

**Critical Files:**
- `src/controllers/billingController.js` (487 lines) - 7 controller functions for billing endpoints
- `src/services/billingReadinessService.js` (592 lines) - Complete rewrite with configurable logic
- `src/utils/billingHelpers.js` - Utility functions including `findBillingEnrollment()`
- `frontend/src/pages/BillingReadiness.jsx` (458 lines) - Complete UI rewrite with dynamic program support

**IMPORTANT**: When modifying billing-related code, always:
1. Check effective dates for billing programs and CPT codes
2. Filter TimeLog and Observation by `enrollmentId`, not just `patientId`
3. Use `findBillingEnrollment()` helper when creating new TimeLog or Observation records
4. Validate `billingMonth` parameter is in `YYYY-MM` format
5. Consider multi-program enrollments when calculating eligibility

### Database Changes
- Always use Prisma migrations: `npx prisma migrate dev --name descriptive-name`
- Never modify the database schema directly
- Update seed scripts when adding new entities or enums
- Test migrations on a development database before applying to staging/production

### Authentication & Security
- Never log sensitive PHI data
- Use AuditLog model for all HIPAA-relevant actions
- Enforce organization-level data isolation in all queries
- Validate all user inputs with express-validator
- Use RBAC permissions for access control checks

### Testing Requirements
- Write tests for all new features (Jest for backend, Vitest for frontend, Playwright for E2E)
- Maintain 80%+ test coverage
- Test RBAC permissions thoroughly
- Test organization data isolation to prevent cross-tenant leaks

### API Development
- Follow RESTful conventions
- Include organization context in all API responses
- Document new endpoints in the API info endpoint (index.js)
- Plan for FHIR compatibility (Phase 2-3)

### Frontend Development
- Use Tailwind CSS utility classes for styling
- Follow mobile-first responsive design (use Tailwind breakpoints: sm, md, lg, xl, 2xl)
- Use TanStack React Query for server state management
- Use React Hook Form for form validation and handling
- Ensure accessibility (WCAG 2.1 AA) for all interactive elements
