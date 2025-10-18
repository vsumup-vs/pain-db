# Troubleshooting Guide

> **Module**: Common errors and solutions
> **Last Updated**: 2025-10-17
> **Part of**: [Developer Reference Guide](../developer-reference.md)

---

## Troubleshooting Common Errors

### Foreign Key Constraint Violation (P2003)
**Error**: `Foreign key constraint violated on the constraint: 'X_fkey'`

**Common Causes**:
1. Using User ID where Clinician ID is required (TimeLog, Alert)
2. Referencing non-existent organization/patient/clinician
3. Multi-tenant violation (referencing entity from different org)

**Solution**:
- Always verify foreign key references exist
- Use correct ID type (User vs Clinician)
- Ensure organizationId matches across related entities

### Unique Constraint Violation (P2002)
**Error**: `Unique constraint failed on the constraint: 'X_unique'`

**Common Causes**:
1. Duplicate email, MRN, or other unique field
2. Attempting to create duplicate userOrganization relationship

**Solution**:
- Check for existing records before creating
- Use `upsert` instead of `create` when appropriate
- Handle 409 Conflict responses in frontend

### Missing organizationId Filter
**Error**: User sees data from other organizations

**Solution**:
- ALWAYS filter by `organizationId: req.user.currentOrganization`
- Use organization-scoped queries in all controllers
- Test with multiple organizations to verify isolation

---

