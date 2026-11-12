/**
 * Firestore Security Rules Test Specification (Dirty Dozen Verification)
 */
export interface SecurityTestCase {
  id: number;
  name: string;
  collection: string;
  docId: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: { uid: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED' | 'ALLOWED';
}

export const DIRTY_DOZEN_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Unauthenticated Write',
    collection: 'tasks',
    docId: 'task_1',
    operation: 'create',
    auth: null,
    payload: { ownerId: 'u1', title: 'Test' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified Email Write',
    collection: 'tasks',
    docId: 'task_1',
    operation: 'create',
    auth: { uid: 'u1', email_verified: false },
    payload: { ownerId: 'u1', title: 'Test' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Identity Spoofing on Create',
    collection: 'tasks',
    docId: 'task_1',
    operation: 'create',
    auth: { uid: 'u1', email_verified: true },
    payload: { ownerId: 'u2', title: 'Spoofed Task' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Shadow Field Injection on Create',
    collection: 'tasks',
    docId: 'task_1',
    operation: 'create',
    auth: { uid: 'u1', email_verified: true },
    payload: { ownerId: 'u1', title: 'Task', shadowField: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Cross-Tenant Read/Get',
    collection: 'finance_records',
    docId: 'rec_u2',
    operation: 'get',
    auth: { uid: 'u1', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Blanket List Scraping',
    collection: 'tasks',
    docId: '*',
    operation: 'list',
    auth: { uid: 'u1', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Ownership Transfer on Update',
    collection: 'tasks',
    docId: 'task_1',
    operation: 'update',
    auth: { uid: 'u1', email_verified: true },
    payload: { ownerId: 'u2' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'CreatedAt Tampering on Update',
    collection: 'tasks',
    docId: 'task_1',
    operation: 'update',
    auth: { uid: 'u1', email_verified: true },
    payload: { createdAt: '2020-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Client Timestamp Forgery',
    collection: 'tasks',
    docId: 'task_1',
    operation: 'create',
    auth: { uid: 'u1', email_verified: true },
    payload: { ownerId: 'u1', createdAt: '1999-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Value Poisoning on Update',
    collection: 'tasks',
    docId: 'task_1',
    operation: 'update',
    auth: { uid: 'u1', email_verified: true },
    payload: { priority: 'invalid_enum_value' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Path ID Poisoning',
    collection: 'tasks',
    docId: 'bad$id!with*spaces',
    operation: 'create',
    auth: { uid: 'u1', email_verified: true },
    payload: { ownerId: 'u1', title: 'Task' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Orphaned StudyItem Creation',
    collection: 'study_items',
    docId: 'item_1',
    operation: 'create',
    auth: { uid: 'u1', email_verified: true },
    payload: { ownerId: 'u1', moduleId: 'non_existent_module' },
    expectedResult: 'PERMISSION_DENIED',
  },
];
