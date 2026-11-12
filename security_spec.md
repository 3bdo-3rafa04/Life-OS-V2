# Life OS — Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Strict Single-Owner Isolation**: Every document in `/users/{userId}` requires `userId == request.auth.uid` and `incoming().uid == request.auth.uid`. Every document in all other collections (`/tasks`, `/calendar_events`, `/study_modules`, `/study_items`, `/health_logs`, `/finance_records`, `/knowledge_items`, `/goals_habits`, `/ai_action_logs`, `/daily_reviews`) must have `ownerId == request.auth.uid` on create, read, list, update, and delete.
2. **Email Verification Mandate**: All write operations require `request.auth.token.email_verified == true`.
3. **Path Variable Hardening**: Every document ID (`{userId}`, `{taskId}`, etc.) on `get`, `create`, `update`, and `delete` must match `isValidId(id)` (`^[a-zA-Z0-9_\-]+$` and `size() <= 128`).
4. **Immutable Ownership & Creation Timestamps**: `ownerId` (or `uid`) and `createdAt` can never be mutated during an `update` (`incoming().ownerId == existing().ownerId && incoming().createdAt == existing().createdAt`).
5. **Server Timestamp Enforcement**: `createdAt` on `create` must equal `request.time`, and `updatedAt` on `create` and `update` must equal `request.time`.
6. **Exact Key Allowlisting (`hasOnly` & `hasAll`)**: Every `create` and `update` validates against a strict schema helper `isValid[Entity](incoming())` that enforces required keys, allowed keys, field types, enums, and string length boundaries, preventing shadow fields and value poisoning.
7. **Relational Integrity**: Creating a `StudyItem` requires that the parent `/study_modules/$(incoming().moduleId)` exists and is owned by `request.auth.uid`.

## 2. The "Dirty Dozen" Payloads
1. **Unauthenticated Write**: `auth = null` attempting to create a task in `/tasks/task_1`. -> `PERMISSION_DENIED`
2. **Unverified Email Write**: `auth = { uid: 'u1', token: { email_verified: false } }` attempting to create `/tasks/task_1`. -> `PERMISSION_DENIED`
3. **Identity Spoofing on Create**: `auth.uid = 'u1'` attempting to create `/tasks/task_1` with `ownerId: 'u2'`. -> `PERMISSION_DENIED`
4. **Shadow Field Injection on Create**: Creating `/tasks/task_1` with an extra undeclared field `isAdmin: true`. -> `PERMISSION_DENIED`
5. **Cross-Tenant Read/Get**: `auth.uid = 'u1'` attempting to read `/finance_records/rec_u2` where `resource.data.ownerId == 'u2'`. -> `PERMISSION_DENIED`
6. **Blanket List Scraping**: `auth.uid = 'u1'` attempting to list `/tasks` without filtering `ownerId == 'u1'`. -> `PERMISSION_DENIED`
7. **Ownership Transfer on Update**: `auth.uid = 'u1'` attempting to update `ownerId` from `'u1'` to `'u2'` on `/tasks/task_1`. -> `PERMISSION_DENIED`
8. **CreatedAt Tampering on Update**: Attempting to alter `createdAt` during an update to `/tasks/task_1`. -> `PERMISSION_DENIED`
9. **Client Timestamp Forgery**: Attempting to create `/tasks/task_1` with a past/future `createdAt` not matching `request.time`. -> `PERMISSION_DENIED`
10. **Value Poisoning on Update**: Updating `priority` on `/tasks/task_1` to `'super_urgent'` (outside enum `['critical', 'high', 'medium', 'low']`) or a 5,000-char `title`. -> `PERMISSION_DENIED`
11. **Path ID Poisoning**: Creating `/tasks/invalid$id!with*spaces` that violates `^[a-zA-Z0-9_\-]+$`. -> `PERMISSION_DENIED`
12. **Orphaned StudyItem Creation**: Creating `/study_items/item_1` referencing a `moduleId` that does not exist or belongs to another user. -> `PERMISSION_DENIED`
