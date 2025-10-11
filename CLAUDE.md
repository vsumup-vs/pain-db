# CLAUDE.md - Project Instructions

> ClinMetrics Pro - Clinical Metrics Management Platform
> Last Updated: 2025-10-10

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
