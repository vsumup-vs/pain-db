# API Endpoints Reference

> **Auto-generated** from route files
> Last Updated: 2025-10-16T13:52:06.160Z

## Overview

Total Endpoints: 167

## :id Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| GET | `/:id` | unknown | unknown | ❌ | - |
| PUT | `/:id` | unknown | unknown | ❌ | - |
| DELETE | `/:id` | unknown | unknown | ❌ | - |
| POST | `/:id/claim` | unknown | unknown | ❌ | - |
| POST | `/:id/unclaim` | unknown | unknown | ❌ | - |
| POST | `/:id/acknowledge` | unknown | unknown | ❌ | - |
| POST | `/:id/resolve` | unknown | unknown | ❌ | - |
| POST | `/:id/snooze` | unknown | unknown | ❌ | - |
| POST | `/:id/unsnooze` | unknown | unknown | ❌ | - |
| POST | `/:id/suppress` | unknown | unknown | ❌ | - |
| POST | `/:id/unsuppress` | unknown | unknown | ❌ | - |
| POST | `/:id/escalate` | unknown | unknown | ❌ | - |
| GET | `/:id/escalation-history` | unknown | unknown | ❌ | - |
| GET | `/:id` | unknown | unknown | ❌ | - |
| POST | `/:id/customize` | unknown | unknown | ❌ | - |
| PUT | `/:id` | unknown | unknown | ❌ | - |
| DELETE | `/:id` | unknown | unknown | ❌ | - |
| GET | `/:id` | unknown | unknown | ❌ | - |
| PUT | `/:id` | unknown | unknown | ❌ | - |
| DELETE | `/:id` | unknown | unknown | ❌ | - |
| GET | `/:id` | unknown | unknown | ❌ | - |
| PUT | `/:id` | unknown | unknown | ❌ | - |
| DELETE | `/:id` | unknown | unknown | ❌ | - |
| POST | `/:id/customize` | unknown | unknown | ❌ | - |
| GET | `/:id` | unknown | unknown | ❌ | - |
| GET | `/:id/stats` | unknown | unknown | ❌ | - |
| PUT | `/:id` | unknown | unknown | ❌ | - |
| DELETE | `/:id` | unknown | unknown | ❌ | - |
| GET | `/:id` | unknown | unknown | ❌ | - |
| POST | `/:id/customize` | unknown | unknown | ❌ | - |
| PUT | `/:id` | unknown | unknown | ❌ | - |
| DELETE | `/:id` | unknown | unknown | ❌ | - |
| GET | `/:id` | unknown | unknown | ❌ | - |
| PUT | `/:id` | unknown | unknown | ❌ | - |
| DELETE | `/:id` | unknown | unknown | ❌ | - |
| GET | `/:id` | unknown | unknown | ❌ | - |
| PUT | `/:id` | unknown | unknown | ❌ | - |
| POST | `/:id/attest` | unknown | unknown | ❌ | - |
| DELETE | `/:id` | unknown | unknown | ❌ | - |
| GET | `/:id` | unknown | unknown | ❌ | - |
| GET | `/:id/filtered-metrics` | unknown | unknown | ❌ | - |
| PUT | `/:id` | unknown | unknown | ❌ | - |
| DELETE | `/:id` | unknown | unknown | ❌ | - |
| PUT | `/:id/deactivate` | unknown | unknown | ❌ | - |
| PATCH | `/:id/transfer` | unknown | unknown | ❌ | - |
| GET | `/:id/medications` | unknown | unknown | ❌ | - |
| POST | `/:id/medications` | unknown | unknown | ❌ | - |
| GET | `/:id` | unknown | unknown | ❌ | - |
| PUT | `/:id` | unknown | unknown | ❌ | - |
| DELETE | `/:id` | unknown | unknown | ❌ | - |
| POST | `/:id/validate` | unknown | unknown | ❌ | - |
| POST | `/:id/customize` | unknown | unknown | ❌ | - |
| GET | `/:id` | unknown | unknown | ❌ | - |
| PUT | `/:id` | unknown | unknown | ❌ | - |
| DELETE | `/:id` | unknown | unknown | ❌ | - |
| GET | `/:id` | organizationController | getOrganization | ❌ | - |
| GET | `/:id/stats` | organizationController | getOrganizationStats | ❌ | - |
| PUT | `/:id` | unknown | unknown | ❌ | - |
| DELETE | `/:id` | unknown | unknown | ❌ | - |
| PUT | `/:id` | unknown | unknown | ❌ | - |
| PATCH | `/:id/deactivate` | unknown | unknown | ❌ | - |
| GET | `/:id/stats` | unknown | unknown | ❌ | - |
| GET | `/:id/context` | unknown | unknown | ❌ | - |
| GET | `/:id` | unknown | unknown | ❌ | - |
| PUT | `/:id` | unknown | unknown | ❌ | - |
| DELETE | `/:id` | unknown | unknown | ❌ | - |
| GET | `/:id` | unknown | unknown | ❌ | - |
| PUT | `/:id` | unknown | unknown | ❌ | - |
| PATCH | `/:id/complete` | unknown | unknown | ❌ | - |
| PATCH | `/:id/cancel` | unknown | unknown | ❌ | - |

## Active Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| GET | `/active` | timeTrackingController | getActiveTimer | ❌ | - |
| GET | `/active/all` | timeTrackingController | getAllActiveTimers | ❌ | - |

## Adjust Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| PATCH | `/adjust/:id` | timeTrackingController | adjustTimeLog | ❌ | - |

## Alerts Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| GET | `/alerts` | unknown | unknown | ✅ | - |

## Assessments Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| POST | `/assessments/with-continuity` | assessmentController | createAssessmentWithContinuity | ❌ | - |

## Bulk Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| POST | `/bulk` | unknown | unknown | ❌ | - |

## Bulk-actions Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| POST | `/bulk-actions` | unknown | unknown | ❌ | - |

## Bulk-assign Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| POST | `/bulk-assign` | unknown | unknown | ❌ | - |

## Bulk-complete Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| POST | `/bulk-complete` | unknown | unknown | ❌ | - |

## Bulk-create Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| POST | `/bulk-create` | unknown | unknown | ❌ | - |

## Cancel Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| POST | `/cancel` | timeTrackingController | cancelTimer | ❌ | - |

## Categories Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| GET | `/categories` | unknown | unknown | ❌ | - |

## Classes Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| GET | `/classes` | unknown | unknown | ❌ | - |

## Clinician-workflow Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| GET | `/clinician-workflow` | unknown | unknown | ❌ | - |

## Custom Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| GET | `/custom` | unknown | unknown | ❌ | - |

## Enrollment Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| GET | `/enrollment/:enrollmentId` | unknown | unknown | ❌ | - |

## Evaluate Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| POST | `/evaluate` | unknown | unknown | ❌ | - |

## Google Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| GET | `/google` | unknown | unknown | ✅ | - |
| GET | `/google/callback` | unknown | unknown | ✅ | - |

## Health Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| GET | `/health` | unknown | unknown | ❌ | - |

## Login Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| POST | `/login` | unknown | unknown | ❌ | - |

## Logout Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| POST | `/logout` | unknown | unknown | ✅ | - |

## Me Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| GET | `/me` | unknown | unknown | ✅ | - |

## Microsoft Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| GET | `/microsoft` | unknown | unknown | ✅ | - |
| GET | `/microsoft/callback` | unknown | unknown | ✅ | - |

## Observations Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| POST | `/observations/with-context` | observationController | createObservationWithContext | ❌ | - |
| PATCH | `/observations/:observationId/review` | observationController | updateProviderReview | ❌ | - |

## Organization-workflow Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| GET | `/organization-workflow` | unknown | unknown | ❌ | - |

## Patient Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| GET | `/patient/:patientId/history` | unknown | unknown | ❌ | - |
| GET | `/patient/:patientId` | unknown | unknown | ❌ | - |

## Patient-engagement Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| GET | `/patient-engagement` | unknown | unknown | ❌ | - |

## Patients Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| GET | `/patients/:patientId/continuity-suggestions` | assessmentController | getContinuitySuggestions | ❌ | - |
| GET | `/patients/:patientId/continuity-history` | assessmentController | getContinuityHistory | ❌ | - |
| GET | `/patients/:patientId/observations/context` | observationController | getObservationsWithContext | ❌ | - |

## Platform-usage Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| GET | `/platform-usage` | organizationController | getPlatformUsageStats | ❌ | - |

## Profile Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| PUT | `/profile` | unknown | unknown | ✅ | - |

## Readiness Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| GET | `/readiness` | unknown | unknown | ❌ | - |
| GET | `/readiness/patient/:patientId` | unknown | unknown | ❌ | - |
| GET | `/readiness/export` | unknown | unknown | ❌ | - |

## Recent Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| GET | `/recent` | unknown | unknown | ❌ | - |
| GET | `/recent` | unknown | unknown | ❌ | - |

## Refresh Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| POST | `/refresh` | unknown | unknown | ❌ | - |

## Register Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| POST | `/register` | unknown | unknown | ❌ | - |

## Root Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| POST | `/` | unknown | unknown | ❌ | - |
| GET | `/` | unknown | unknown | ❌ | - |
| GET | `/` | unknown | unknown | ❌ | - |
| POST | `/` | unknown | unknown | ❌ | - |
| GET | `/` | unknown | unknown | ❌ | - |
| POST | `/` | unknown | unknown | ❌ | - |
| GET | `/` | unknown | unknown | ❌ | - |
| POST | `/` | unknown | unknown | ❌ | - |
| POST | `/` | unknown | unknown | ❌ | - |
| GET | `/` | unknown | unknown | ❌ | - |
| GET | `/` | unknown | unknown | ❌ | - |
| POST | `/` | unknown | unknown | ❌ | - |
| GET | `/` | unknown | unknown | ❌ | - |
| POST | `/` | unknown | unknown | ❌ | - |
| GET | `/` | unknown | unknown | ❌ | - |
| POST | `/` | unknown | unknown | ❌ | - |
| POST | `/` | unknown | unknown | ❌ | - |
| GET | `/` | unknown | unknown | ❌ | - |
| POST | `/` | unknown | unknown | ❌ | - |
| GET | `/` | unknown | unknown | ❌ | - |
| POST | `/` | unknown | unknown | ❌ | - |
| GET | `/` | unknown | unknown | ❌ | - |
| GET | `/` | organizationController | getAllOrganizations | ❌ | - |
| POST | `/` | unknown | unknown | ❌ | - |
| GET | `/` | unknown | unknown | ❌ | - |
| POST | `/` | unknown | unknown | ❌ | - |
| POST | `/` | unknown | unknown | ❌ | - |
| GET | `/` | unknown | unknown | ❌ | - |
| GET | `/` | unknown | unknown | ❌ | - |
| POST | `/` | unknown | unknown | ❌ | - |

## Select-organization Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| POST | `/select-organization` | unknown | unknown | ✅ | - |

## Specialization Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| GET | `/specialization/:specialization` | unknown | unknown | ❌ | - |

## Standardized Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| GET | `/standardized` | unknown | unknown | ❌ | - |

## Start Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| POST | `/start` | timeTrackingController | startTimer | ❌ | - |

## Stats Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| GET | `/stats` | unknown | unknown | ❌ | - |
| GET | `/stats` | unknown | unknown | ❌ | - |
| GET | `/stats` | unknown | unknown | ❌ | - |
| GET | `/stats` | unknown | unknown | ❌ | - |
| GET | `/stats` | unknown | unknown | ❌ | - |
| GET | `/stats` | unknown | unknown | ❌ | - |
| GET | `/stats` | unknown | unknown | ❌ | - |
| GET | `/stats` | unknown | unknown | ❌ | - |
| GET | `/stats` | unknown | unknown | ❌ | - |
| GET | `/stats` | unknown | unknown | ❌ | - |

## Status Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| GET | `/status` | unknown | unknown | ✅ | - |

## Stop Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| POST | `/stop` | timeTrackingController | stopTimer | ❌ | - |

## Switch-organization Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| POST | `/switch-organization` | unknown | unknown | ✅ | - |

## Templates Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| GET | `/templates` | unknown | unknown | ❌ | - |
| GET | `/templates/standardized` | unknown | unknown | ❌ | - |
| GET | `/templates/:templateKey` | unknown | unknown | ❌ | - |
| POST | `/templates/create` | unknown | unknown | ❌ | - |

## Triage-queue Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| GET | `/triage-queue` | unknown | unknown | ❌ | - |

## Users Endpoints

| Method | Endpoint | Controller | Function | Auth | Permission |
|--------|----------|------------|----------|------|------------|
| GET | `/users` | unknown | unknown | ✅ | - |
| POST | `/users/:userId/assign-role` | unknown | unknown | ✅ | - |

## Authentication Guide

### Required Headers

For endpoints marked with ✅ in the Auth column:

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Getting an Access Token

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

Response:
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": { ... }
}
```

