# Technical Stack

> Last Updated: 2025-10-10
> Version: 1.0.0

## Core Technologies

### Application Framework
- **Backend Framework:** Node.js with Express.js 5
- **Node Version:** 18+
- **Language:** JavaScript (ES6+)

### Database
- **Primary:** PostgreSQL 12+
- **ORM:** Prisma 6.16+
- **Migration Strategy:** Prisma Migrate
- **Schema Management:** Code-first with Prisma Schema Language

## Frontend Technologies

### Web Application
- **Framework:** React 18.2
- **Build Tool:** Vite 4.5
- **Language:** JavaScript (JSX)
- **Routing:** React Router DOM 6.18
- **State Management:** TanStack React Query 5.8 (for server state)
- **Form Handling:** React Hook Form 7.48

### UI & Styling
- **CSS Framework:** Tailwind CSS 3.3
- **Component Library:** Headless UI 1.7
- **Icons:** Heroicons 2.0
- **Form Components:** @tailwindcss/forms
- **Utility:** clsx for conditional classes

### Mobile Development (Planned - Phase 4)
- **iOS:** Swift with SwiftUI, HealthKit integration
- **Android:** Kotlin with Jetpack Compose, Google Fit APIs
- **Cross-Platform Consideration:** React Native (to be evaluated)

## Authentication & Security

### Authentication
- **Strategy:** JWT-based authentication with refresh tokens
- **Social Providers:** Google OAuth 2.0, Microsoft OAuth, Apple Sign-In (planned), Facebook (planned)
- **MFA:** Time-based One-Time Password (TOTP) using Speakeasy
- **Password Hashing:** bcrypt 6.0
- **Session Management:** Passport.js with custom strategies

### Security Middleware
- **HTTP Security:** Helmet.js 8.1
- **CORS:** cors 2.8.5
- **Rate Limiting:** express-rate-limit 8.1
- **Input Validation:** express-validator 7.2
- **Input Sanitization:** validator 13.15, xss 1.0.15

## Data & APIs

### API Architecture
- **Style:** RESTful API
- **Data Format:** JSON
- **API Versioning:** URL-based (v1, v2)
- **Documentation:** OpenAPI/Swagger (planned)

### External Integrations (Planned)
- **Healthcare Standards:** HL7 FHIR R4+ for interoperability
- **EHR Integration:** FHIR API endpoints
- **Device Integration:** Bluetooth LE for wearables, vendor-specific APIs
- **Medication Database:** RxNorm/NDC integration for drug information

## Infrastructure

### Application Hosting
- **Platform:** Digital Ocean
- **Service:** App Platform (recommended) or Droplets
- **Region:** US-based for HIPAA compliance
- **Scaling:** Horizontal auto-scaling with load balancing

### Database Hosting
- **Provider:** Digital Ocean
- **Service:** Managed PostgreSQL
- **Backups:** Daily automated with point-in-time recovery
- **High Availability:** Multi-node cluster with automatic failover
- **Security:** Encryption at rest and in transit, private networking

### Asset Storage
- **Provider:** Amazon S3
- **CDN:** CloudFront for global distribution
- **Access Control:** Private buckets with signed URLs for PHI
- **Compliance:** S3 bucket policies aligned with HIPAA requirements

## Testing & Quality Assurance

### Backend Testing
- **Framework:** Jest 30.1
- **HTTP Testing:** Supertest 7.1
- **Coverage:** 80%+ target
- **Test Types:** Unit, Integration, API endpoint tests

### Frontend Testing
- **Unit/Integration:** Vitest 1.6 with React Testing Library 14.3
- **E2E Testing:** Playwright 1.55
- **Coverage Tools:** @vitest/coverage-v8
- **Test Modes:** UI mode, headed browser, CI/CD automation

### Code Quality
- **Linting:** ESLint 8.53 with React plugins
- **Formatting:** (to be standardized - consider Prettier)
- **Pre-commit Hooks:** (to be implemented with Husky)

## Deployment & DevOps

### CI/CD Pipeline
- **Platform:** GitHub Actions
- **Triggers:** Push to main, staging branches; Pull request validation
- **Steps:**
  1. Dependency installation
  2. Linting & code quality checks
  3. Unit & integration tests
  4. E2E tests
  5. Security vulnerability scanning
  6. Build & deploy

### Containerization
- **Technology:** Docker (configuration in progress)
- **Orchestration:** Docker Compose for local development
- **Production:** Kubernetes or Digital Ocean App Platform (to be determined)

### Monitoring & Logging
- **Application Monitoring:** (to be implemented - consider Datadog, New Relic)
- **Error Tracking:** (to be implemented - consider Sentry)
- **Log Management:** Centralized logging (to be implemented - consider ELK stack or cloud-native)
- **Uptime Monitoring:** (to be implemented)

## Development Tools

### Version Control
- **Platform:** GitHub
- **Branching Strategy:** Feature branches, main for production
- **Code Review:** Pull request workflow

### Package Management
- **Backend:** npm (package-lock.json)
- **Frontend:** npm (separate package.json in /frontend)

### Database Tools
- **Client:** Prisma Studio for database GUI
- **Migrations:** Prisma Migrate
- **Seeding:** Custom seed scripts (seed-rtm-standard.js, seed-robust-enhanced.js)

## Compliance & Standards

### Healthcare Compliance
- **HIPAA:** All infrastructure and data handling aligned with HIPAA requirements
- **Audit Logging:** Comprehensive audit trail for PHI access (AuditLog model)
- **Data Encryption:** At rest (database, S3) and in transit (TLS 1.2+)
- **Access Controls:** Role-based access control (RBAC) with granular permissions

### Clinical Standards
- **Coding Systems:** ICD-10, SNOMED CT for diagnoses
- **Medication Coding:** NDC (National Drug Code)
- **Interoperability:** HL7 FHIR R4 (planned for Phase 3)
- **Assessment Standards:** NIH PROMIS, validated clinical scales

## Third-Party Services

### Current Dependencies
- **Email:** Nodemailer 7.0 (SMTP configuration)
- **QR Codes:** qrcode 1.5 for MFA setup
- **Unique IDs:** uuid 13.0, cuid (via Prisma)
- **Scheduling:** node-cron 4.2 for scheduled tasks

### Planned Integrations
- **SMS/Notifications:** Twilio or AWS SNS
- **Video Conferencing:** Zoom API or custom WebRTC
- **Payment Processing:** Stripe (for subscription billing)
- **Analytics:** Segment or Mixpanel for product analytics
