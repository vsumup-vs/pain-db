# Admin UI Documentation

> Multi-Tenant Platform Administration Interface
> Last Updated: 2025-10-11
> Version: 1.0.0

## Overview

This document describes the admin UI components created for platform administration and client onboarding in the multi-tenant healthcare platform.

---

## UI Components Created

### 1. Admin Organizations Page (`/admin/organizations`)

**File:** `/frontend/src/pages/AdminOrganizations.jsx`

**Purpose:** Manage healthcare organizations (SUPER_ADMIN only)

**Features:**
- ✅ List all organizations with details
- ✅ Create new organizations
- ✅ Edit organization details
- ✅ Delete organizations
- ✅ View organization type, contact info, and status
- ✅ Filter organizations by status (active/inactive)

**Screenshots of functionality:**

**Organization List:**
```
┌─────────────────────────────────────────────────────────────┐
│ Organizations                      [+ New Organization]      │
├─────────────────────────────────────────────────────────────┤
│ 🏢 Memorial Hospital                                         │
│    HOSPITAL • admin@memorial.hospital • (555) 321-9876      │
│    ✓ Active                                          ✏️ 🗑️   │
│    789 Medical Plaza, Healthcare City, ST 11111             │
├─────────────────────────────────────────────────────────────┤
│ 🏢 Riverside Medical Clinic                                  │
│    CLINIC • contact@riverside.clinic • (555) 789-0123       │
│    ✓ Active                                          ✏️ 🗑️   │
│    456 River Road, Healthcare City, ST 67890                │
└─────────────────────────────────────────────────────────────┘
```

**Create/Edit Modal:**
- Organization Name (required)
- Type: Hospital, Clinic, Practice, Research, Insurance, Pharmacy
- Email
- Phone
- Website
- Address
- Active status checkbox

**API Endpoints Used:**
- `GET /api/organizations` - List organizations
- `POST /api/organizations` - Create organization
- `PUT /api/organizations/:id` - Update organization
- `DELETE /api/organizations/:id` - Delete organization

---

### 2. Admin Users Page (`/admin/users`)

**File:** `/frontend/src/pages/AdminUsers.jsx`

**Purpose:** Manage users and their organization assignments

**Features:**
- ✅ List all users with their organization memberships
- ✅ Filter users by organization and role
- ✅ Create new users
- ✅ Assign users to organizations with roles
- ✅ View user details (email verification, last login, active status)
- ✅ Support for multi-organization users

**User List:**
```
┌──────────────────────────────────────────────────────────────┐
│ User Management                    [+ New User]               │
├──────────────────────────────────────────────────────────────┤
│ Filter by Organization: [All Organizations ▼]                │
│ Filter by Role: [All Roles ▼]                                │
├──────────────────────────────────────────────────────────────┤
│ 👥 Sarah Johnson                              [+ Assign Role] │
│    admin@memorial.hospital                                   │
│    🏢 Memorial Hospital • 🛡️ ORG_ADMIN                        │
│    ✓ Active • Email verified • Last login: 2025-10-11       │
├──────────────────────────────────────────────────────────────┤
│ 👥 Dr. Emily Smith                            [+ Assign Role] │
│    dr.smith@memorial.hospital                                │
│    🏢 Memorial Hospital • 🛡️ CLINICIAN                       │
│    🏢 Riverside Clinic • 🛡️ CLINICIAN                        │
│    ✓ Active • Email verified • Last login: 2025-10-10       │
└──────────────────────────────────────────────────────────────┘
```

**Create User Modal:**
- First Name (required)
- Last Name (required)
- Email (required)
- Temporary Password (required, min 8 chars with complexity)
- Organization (optional)
- Role: SUPER_ADMIN, ORG_ADMIN, CLINICIAN, NURSE, BILLING_ADMIN, PATIENT

**Assign Role Modal:**
- Select Organization (required)
- Select Role (required)

**API Endpoints Used:**
- `GET /auth/users?organizationId=&role=` - List users with filters
- `POST /auth/register` - Create new user
- `POST /auth/users/:userId/assign-role` - Assign user to organization

---

### 3. Organization Selector Component

**File:** `/frontend/src/components/OrganizationSelector.jsx`

**Purpose:** Allow users with multiple organization memberships to select which one to work with

**Features:**
- ✅ Display all organizations user has access to
- ✅ Show organization name, type, and user's role
- ✅ Clean, card-based selection interface
- ✅ Automatically shown after login if user has multiple orgs

**Organization Selector:**
```
┌─────────────────────────────────────────────────────────────┐
│              Select Organization                             │
│                                                              │
│  You have access to multiple organizations.                 │
│  Please select which one you want to work with.             │
├─────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────┐ [Select]  │
│ │ 🏢 Memorial Hospital                          │           │
│ │    HOSPITAL • ORG_ADMIN                       │           │
│ └───────────────────────────────────────────────┘           │
├─────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────┐ [Select]  │
│ │ 🏢 Riverside Medical Clinic                   │           │
│ │    CLINIC • CLINICIAN                         │           │
│ └───────────────────────────────────────────────┘           │
├─────────────────────────────────────────────────────────────┤
│  You can switch organizations later from your               │
│  profile settings                                           │
└─────────────────────────────────────────────────────────────┘
```

**Usage:**
- Triggered automatically during login if user has multiple organizations
- User selects organization
- New JWT token generated with selected organization context
- User redirected to dashboard

---

### 4. Updated Login Flow

**File:** `/frontend/src/pages/Login.jsx`

**New Features:**
- ✅ Handles multi-organization users
- ✅ Shows organization selector when needed
- ✅ Stores organization context in JWT token
- ✅ Maintains existing simple login for single-org users

**Login Flow:**
```
┌─────────────────────────────────────────────────────────────┐
│                    Login Process                             │
└─────────────────────────────────────────────────────────────┘

User enters email/password
        │
        ├─> POST /api/auth/login
        │
        ▼
┌───────────────────┐
│ Response Check    │
└───────────────────┘
        │
        ├─> requiresOrganizationSelection = true
        │   └─> Show OrganizationSelector component
        │       └─> User selects organization
        │           └─> POST /auth/select-organization
        │               └─> Get token with org context
        │                   └─> Navigate to /dashboard
        │
        └─> requiresOrganizationSelection = false
            └─> Store token directly
                └─> Navigate to /dashboard
```

---

### 5. Updated Navigation (Layout Component)

**File:** `/frontend/src/components/Layout.jsx`

**New Features:**
- ✅ Added "Administration" section to sidebar
- ✅ Organizations and Users links
- ✅ Separated admin navigation with visual divider
- ✅ Icons for all admin pages

**Sidebar Layout:**
```
┌─────────────────────────────────┐
│ ClinMetrics Pro                 │
├─────────────────────────────────┤
│ 🏠 Dashboard                    │
│ 👥 Patients                     │
│ 👨 Clinicians                   │
│ 📋 Condition Presets            │
│ 📊 Metric Definitions           │
│ 📝 Assessment Templates         │
│ 👁️ Observations                 │
│ 🔔 Alerts                       │
│ 🛡️ Alert Rules                  │
│ 📄 Enrollments                  │
├─────────────────────────────────┤
│ ADMINISTRATION                  │
│ 🏢 Organizations                │
│ 👥 Users                        │
└─────────────────────────────────┘
```

---

## Updated API Service

**File:** `/frontend/src/services/api.js`

**New Endpoints Added:**

```javascript
// Admin - Organizations (SUPER_ADMIN only)
api.getOrganizations(params)
api.getOrganization(id)
api.createOrganization(data)
api.updateOrganization(id, data)
api.deleteOrganization(id)

// Admin - Users (SUPER_ADMIN and ORG_ADMIN)
api.getUsers(params)
api.getUser(id)
api.createUser(data)
api.assignUserRole(userId, data)

// Organization Selection
api.selectOrganization(organizationId)
```

---

## User Workflows

### Workflow 1: Platform Admin Onboarding New Hospital

```
1. SUPER_ADMIN logs into platform
2. Navigates to Administration → Organizations
3. Clicks [+ New Organization]
4. Fills in organization details:
   - Name: "St. Mary's Hospital"
   - Type: HOSPITAL
   - Email: admin@stmarys.com
   - Phone: (555) 123-4567
   - Address: 123 Healthcare Ave
5. Clicks [Create]
6. Organization created ✓

7. Navigates to Administration → Users
8. Clicks [+ New User]
9. Fills in user details:
   - First Name: Jane
   - Last Name: Smith
   - Email: admin@stmarys.com
   - Password: TempPassword123!
   - Organization: St. Mary's Hospital
   - Role: ORG_ADMIN
10. Clicks [Create User]
11. User created and assigned ✓

12. Welcome email sent to admin@stmarys.com
13. New ORG_ADMIN can login and start onboarding staff
```

### Workflow 2: ORG_ADMIN Inviting Clinician

```
1. ORG_ADMIN logs into their organization
2. Navigates to Administration → Users
3. Filter by Organization shows only their organization
4. Clicks [+ New User]
5. Fills in clinician details:
   - First Name: Emily
   - Last Name: Chen
   - Email: dr.chen@stmarys.com
   - Password: TempClinician123!
   - Role: CLINICIAN
6. Clicks [Create User]
7. User automatically assigned to ORG_ADMIN's organization ✓

8. Welcome email sent to dr.chen@stmarys.com
9. Clinician logs in, changes password, starts seeing patients
```

### Workflow 3: Multi-Organization User Login

```
1. Dr. Emily Smith (works at 2 hospitals) visits login page
2. Enters email and password
3. System detects multiple organization memberships
4. Organization Selector appears showing:
   - Memorial Hospital (CLINICIAN)
   - Riverside Clinic (CLINICIAN)
5. Dr. Smith selects "Memorial Hospital"
6. New token generated with Memorial Hospital context
7. Dashboard loads showing only Memorial Hospital data
8. Can switch organizations later from profile

Later:
9. Dr. Smith clicks profile → Switch Organization
10. Selects "Riverside Clinic"
11. Page refreshes, now showing Riverside Clinic data
```

---

## Security Features

### 1. Role-Based Access Control (RBAC)

**Organizations Page:**
- Only visible to SUPER_ADMIN
- ORG_ADMIN cannot create/modify other organizations

**Users Page:**
- SUPER_ADMIN can manage all users across all organizations
- ORG_ADMIN can only manage users within their own organization
- Filters automatically applied based on user role

### 2. Data Isolation

**All API calls include:**
- JWT token with organization context
- Backend validates organizationId on every request
- Cross-org access attempts logged and blocked

### 3. Audit Logging

**All admin actions logged:**
- Organization created/updated/deleted
- User created/assigned to organization
- Role changes
- Organization selection
- All logs flagged as HIPAA-relevant

---

## Testing the Admin UI

### Prerequisites

1. Backend server running on port 3000
2. Frontend dev server running
3. Database seeded with at least one organization

### Test Scenario 1: Create Organization

```bash
# Login as SUPER_ADMIN (you'll need to create this user first)
1. Navigate to http://localhost:5173/login
2. Login with SUPER_ADMIN credentials
3. Click "Administration" → "Organizations"
4. Click [+ New Organization]
5. Fill in form and submit
6. Verify organization appears in list
```

### Test Scenario 2: Create User and Assign to Organization

```bash
1. From Organizations page, note an organization ID
2. Navigate to "Administration" → "Users"
3. Click [+ New User]
4. Fill in form, select organization, choose role
5. Submit form
6. Verify user appears in list with organization badge
7. Click [+ Assign Role] to assign to another organization
```

### Test Scenario 3: Multi-Organization Login

```bash
# First, create a user with access to 2 organizations
1. Create user via Users page
2. Use [+ Assign Role] to assign to second organization
3. Logout
4. Login with that user's credentials
5. Verify Organization Selector appears
6. Select an organization
7. Verify dashboard shows correct organization data
```

---

## Future Enhancements

### Phase 2 Features (Not Yet Implemented):

1. **Organization Settings Page:**
   - Configure organization-specific settings
   - Business hours, timezone, notification preferences
   - HIPAA compliance settings

2. **User Profile Page:**
   - View/edit own profile
   - Change password
   - Switch organizations
   - Manage MFA settings

3. **Bulk User Import:**
   - CSV upload for multiple users
   - Validation and error handling
   - Preview before import

4. **Audit Log Viewer:**
   - View all platform audit logs
   - Filter by action, user, organization
   - Export for compliance

5. **Dashboard Analytics:**
   - Organization usage statistics
   - User activity metrics
   - System health monitoring

6. **Permission Management UI:**
   - Granular permission assignment
   - Custom role creation
   - Permission templates

---

## Backend API Requirements

For the UI to work correctly, the following backend endpoints must exist:

### Organizations (SUPER_ADMIN only)
- `GET /api/organizations` - List all organizations
- `GET /api/organizations/:id` - Get single organization
- `POST /api/organizations` - Create organization
- `PUT /api/organizations/:id` - Update organization
- `DELETE /api/organizations/:id` - Delete organization

### Users (SUPER_ADMIN and ORG_ADMIN)
- `GET /api/auth/users?organizationId=&role=` - List users with filters
- `GET /api/auth/users/:id` - Get single user
- `POST /api/auth/register` - Create new user
- `POST /api/auth/users/:userId/assign-role` - Assign role to organization

### Authentication
- `POST /api/auth/login` - Login (returns requiresOrganizationSelection if needed)
- `POST /api/auth/select-organization` - Select active organization
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user profile

**Note:** The backend endpoints for organizations don't exist yet and need to be created.

---

## Missing Backend Endpoints

The following backend endpoints are referenced by the UI but **DON'T EXIST YET**:

### Organizations Controller (Priority: HIGH)

**File to Create:** `/src/controllers/organizationController.js`

```javascript
// GET /api/organizations - List organizations
exports.getAllOrganizations = async (req, res) => {
  // SUPER_ADMIN only
  // Return list of all organizations
};

// GET /api/organizations/:id - Get organization
exports.getOrganization = async (req, res) => {
  // SUPER_ADMIN or ORG_ADMIN (own org only)
  // Return organization details
};

// POST /api/organizations - Create organization
exports.createOrganization = async (req, res) => {
  // SUPER_ADMIN only
  // Create new organization
};

// PUT /api/organizations/:id - Update organization
exports.updateOrganization = async (req, res) => {
  // SUPER_ADMIN or ORG_ADMIN (own org only)
  // Update organization details
};

// DELETE /api/organizations/:id - Delete organization
exports.deleteOrganization = async (req, res) => {
  // SUPER_ADMIN only
  // Delete organization (with safeguards)
};
```

**Routes to Add:** `/src/routes/organizationRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const organizationController = require('../controllers/organizationController');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { injectOrganizationContext, auditOrganizationAccess } = require('../middleware/organizationContext');

// All organization routes require authentication
router.use(requireAuth);

// List organizations (SUPER_ADMIN or filtered to user's orgs)
router.get('/', organizationController.getAllOrganizations);

// Get single organization
router.get('/:id', organizationController.getOrganization);

// Create organization (SUPER_ADMIN only)
router.post('/',
  requirePermission('ORG_CREATE'),
  organizationController.createOrganization
);

// Update organization
router.put('/:id',
  requirePermission('ORG_UPDATE'),
  organizationController.updateOrganization
);

// Delete organization (SUPER_ADMIN only)
router.delete('/:id',
  requirePermission('ORG_DELETE'),
  organizationController.deleteOrganization
);

module.exports = router;
```

**Add to index.js:**
```javascript
const organizationRoutes = require('./src/routes/organizationRoutes');
app.use('/api/organizations', requireAuth, organizationRoutes);
```

---

## Quick Start Guide

### For SUPER_ADMIN:

1. **Access Admin Features:**
   - Login to the platform
   - Look for "ADMINISTRATION" section in sidebar
   - Click "Organizations" or "Users"

2. **Create a New Organization:**
   - Organizations → [+ New Organization]
   - Fill in required fields (Name, Type)
   - Optionally add contact info and address
   - Click [Create]

3. **Create Initial Admin for Organization:**
   - Users → [+ New User]
   - Enter admin's details
   - Select the organization
   - Choose role: ORG_ADMIN
   - Click [Create User]
   - Email welcome instructions to the new admin

### For ORG_ADMIN:

1. **Invite Staff Members:**
   - Users → [+ New User]
   - Enter staff member details
   - Organization auto-selected (yours)
   - Choose appropriate role (CLINICIAN, NURSE, etc.)
   - Click [Create User]

2. **Manage Existing Users:**
   - Filter users by your organization
   - Use [+ Assign Role] to add users to your organization
   - View user's status and last login

### For Multi-Organization Users:

1. **Login:**
   - Enter credentials
   - Organization Selector appears
   - Choose which organization to work with
   - Dashboard loads with selected organization data

2. **Switch Organizations:**
   - (Feature to be added in user profile)
   - Select different organization
   - Data refreshes to show new organization context

---

## Troubleshooting

### Issue 1: "Organizations" link returns 404

**Cause:** Backend routes not yet created

**Solution:** Create the organization controller and routes as outlined in "Missing Backend Endpoints" section above

### Issue 2: Can't see admin links in navigation

**Cause:** Navigation always shows admin links (TODO: add role-based visibility)

**Solution:** Currently all authenticated users see admin links. Add role checking in Layout.jsx:

```javascript
const user = api.getCurrentUser();
const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ORG_ADMIN';

{isAdmin && (
  <div className="pt-4 mt-4 border-t border-gray-200">
    {/* Admin navigation */}
  </div>
)}
```

### Issue 3: Organization Selector doesn't appear

**Cause:** Login response doesn't include `requiresOrganizationSelection`

**Solution:** Backend `/auth/login` must check user's organization count and return:
```javascript
if (user.userOrganizations.length > 1 && !organizationId) {
  return {
    requiresOrganizationSelection: true,
    availableOrganizations: [...],
    token: tempToken
  };
}
```

---

## Summary

✅ **Created:**
- Admin Organizations page (`/admin/organizations`)
- Admin Users page (`/admin/users`)
- Organization Selector component
- Updated Login flow for multi-org users
- Updated Navigation with admin section
- Updated API service with admin endpoints

⏳ **Still Needed:**
- Backend organization controller and routes
- Role-based navigation visibility
- User profile page with org switching
- Organization settings page

This completes the frontend admin UI implementation! 🎉
