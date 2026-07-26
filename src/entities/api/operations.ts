import type { ApiMethod } from '@shared/api';
import type { ContractAssumptionCode } from './assumptions';

export type SelectedApiOperationId =
  | 'API-002' | 'API-003' | 'API-004' | 'API-005' | 'API-006'
  | 'API-008' | 'API-009' | 'API-010' | 'API-011' | 'API-012'
  | 'API-013' | 'API-014' | 'API-015' | 'API-016' | 'API-017'
  | 'API-018' | 'API-019' | 'API-020' | 'API-021' | 'API-022'
  | 'API-023' | 'API-024' | 'API-025' | 'API-026' | 'API-029'
  | 'API-030' | 'API-031' | 'API-032' | 'API-033' | 'API-034';

export interface ApiOperationDefinition {
  id: SelectedApiOperationId;
  method: ApiMethod;
  path: string;
  retry: 'safe_read' | 'never';
  mutationDedupe: 'supported' | 'not_applicable';
  requestMode: 'none' | 'query' | 'json' | 'multipart';
  responseMode: 'json' | 'binary' | 'void';
  assumptionTags: readonly ContractAssumptionCode[];
}

const GAP_003 = 'GAP-003_FORBIDDEN_NOT_FOUND_AMBIGUITY' as const;
const GAP_007 = 'GAP-007_PAGINATION_BOUNDS_UNRESOLVED' as const;

type ApiOperationRegistry = {
  readonly [K in SelectedApiOperationId]: ApiOperationDefinition & { readonly id: K };
};

export const API_OPERATION_BY_ID = {
  'API-002': { id: 'API-002', method: 'GET', path: '/cart', retry: 'safe_read', mutationDedupe: 'not_applicable', requestMode: 'none', responseMode: 'json', assumptionTags: [] },
  'API-003': { id: 'API-003', method: 'DELETE', path: '/cart', retry: 'never', mutationDedupe: 'supported', requestMode: 'none', responseMode: 'void', assumptionTags: [] },
  'API-004': { id: 'API-004', method: 'POST', path: '/cart/checkout', retry: 'never', mutationDedupe: 'supported', requestMode: 'none', responseMode: 'json', assumptionTags: [] },
  'API-005': { id: 'API-005', method: 'POST', path: '/cart/items', retry: 'never', mutationDedupe: 'supported', requestMode: 'json', responseMode: 'json', assumptionTags: [] },
  'API-006': { id: 'API-006', method: 'DELETE', path: '/cart/items/:courseId', retry: 'never', mutationDedupe: 'supported', requestMode: 'none', responseMode: 'void', assumptionTags: [] },
  'API-008': { id: 'API-008', method: 'GET', path: '/courses', retry: 'safe_read', mutationDedupe: 'not_applicable', requestMode: 'query', responseMode: 'json', assumptionTags: [GAP_007] },
  'API-009': { id: 'API-009', method: 'POST', path: '/courses', retry: 'never', mutationDedupe: 'supported', requestMode: 'json', responseMode: 'json', assumptionTags: [] },
  'API-010': { id: 'API-010', method: 'GET', path: '/courses/:courseId', retry: 'safe_read', mutationDedupe: 'not_applicable', requestMode: 'none', responseMode: 'json', assumptionTags: [] },
  'API-011': { id: 'API-011', method: 'PATCH', path: '/courses/:courseId', retry: 'never', mutationDedupe: 'supported', requestMode: 'json', responseMode: 'json', assumptionTags: [] },
  'API-012': { id: 'API-012', method: 'DELETE', path: '/courses/:courseId', retry: 'never', mutationDedupe: 'supported', requestMode: 'none', responseMode: 'json', assumptionTags: [GAP_003] },
  'API-013': { id: 'API-013', method: 'GET', path: '/courses/:courseId/enrollments', retry: 'safe_read', mutationDedupe: 'not_applicable', requestMode: 'query', responseMode: 'json', assumptionTags: [GAP_007] },
  'API-014': { id: 'API-014', method: 'GET', path: '/courses/:courseId/lessons', retry: 'safe_read', mutationDedupe: 'not_applicable', requestMode: 'query', responseMode: 'json', assumptionTags: [GAP_007] },
  'API-015': { id: 'API-015', method: 'POST', path: '/courses/:courseId/lessons', retry: 'never', mutationDedupe: 'supported', requestMode: 'json', responseMode: 'json', assumptionTags: [GAP_003] },
  'API-016': { id: 'API-016', method: 'DELETE', path: '/courses/:courseId/lessons/:lessonId', retry: 'never', mutationDedupe: 'supported', requestMode: 'none', responseMode: 'json', assumptionTags: [GAP_003] },
  'API-017': { id: 'API-017', method: 'POST', path: '/courses/:courseId/lessons/:lessonId/complete', retry: 'never', mutationDedupe: 'supported', requestMode: 'none', responseMode: 'json', assumptionTags: [GAP_003] },
  'API-018': { id: 'API-018', method: 'POST', path: '/courses/:courseId/lessons/:lessonId/incomplete', retry: 'never', mutationDedupe: 'supported', requestMode: 'none', responseMode: 'json', assumptionTags: [GAP_003] },
  'API-019': { id: 'API-019', method: 'GET', path: '/courses/:courseId/progress', retry: 'safe_read', mutationDedupe: 'not_applicable', requestMode: 'none', responseMode: 'json', assumptionTags: [GAP_003] },
  'API-020': { id: 'API-020', method: 'POST', path: '/enrollments', retry: 'never', mutationDedupe: 'supported', requestMode: 'json', responseMode: 'json', assumptionTags: [] },
  'API-021': { id: 'API-021', method: 'GET', path: '/enrollments/my', retry: 'safe_read', mutationDedupe: 'not_applicable', requestMode: 'query', responseMode: 'json', assumptionTags: [GAP_007] },
  'API-022': { id: 'API-022', method: 'GET', path: '/enrollments/:enrollmentId', retry: 'safe_read', mutationDedupe: 'not_applicable', requestMode: 'none', responseMode: 'json', assumptionTags: [] },
  'API-023': { id: 'API-023', method: 'POST', path: '/forgot-password', retry: 'never', mutationDedupe: 'supported', requestMode: 'json', responseMode: 'json', assumptionTags: [] },
  'API-024': { id: 'API-024', method: 'POST', path: '/login', retry: 'never', mutationDedupe: 'supported', requestMode: 'json', responseMode: 'json', assumptionTags: [] },
  'API-025': { id: 'API-025', method: 'GET', path: '/media/lessons/:filename', retry: 'safe_read', mutationDedupe: 'not_applicable', requestMode: 'none', responseMode: 'binary', assumptionTags: [] },
  'API-026': { id: 'API-026', method: 'GET', path: '/me', retry: 'safe_read', mutationDedupe: 'not_applicable', requestMode: 'none', responseMode: 'json', assumptionTags: [] },
  'API-029': { id: 'API-029', method: 'POST', path: '/reset-password', retry: 'never', mutationDedupe: 'supported', requestMode: 'json', responseMode: 'json', assumptionTags: [] },
  'API-030': { id: 'API-030', method: 'GET', path: '/lessons/:lessonId', retry: 'safe_read', mutationDedupe: 'not_applicable', requestMode: 'none', responseMode: 'json', assumptionTags: [] },
  'API-031': { id: 'API-031', method: 'PATCH', path: '/lessons/:lessonId', retry: 'never', mutationDedupe: 'supported', requestMode: 'json', responseMode: 'json', assumptionTags: [] },
  'API-032': { id: 'API-032', method: 'POST', path: '/lessons/:lessonId/upload-file', retry: 'never', mutationDedupe: 'supported', requestMode: 'multipart', responseMode: 'json', assumptionTags: [] },
  'API-033': { id: 'API-033', method: 'POST', path: '/signup', retry: 'never', mutationDedupe: 'supported', requestMode: 'json', responseMode: 'json', assumptionTags: [] },
  'API-034': { id: 'API-034', method: 'POST', path: '/payments/complete', retry: 'never', mutationDedupe: 'supported', requestMode: 'json', responseMode: 'json', assumptionTags: [] },
} as const satisfies ApiOperationRegistry;

export const API_OPERATIONS: readonly ApiOperationDefinition[] = Object.freeze(
  Object.values(API_OPERATION_BY_ID),
);
