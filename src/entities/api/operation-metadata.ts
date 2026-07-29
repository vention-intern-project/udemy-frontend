import type { AuthPolicy, SessionCacheEpoch } from '@shared/api';
import { API_OPERATION_BY_ID, type SelectedApiOperationId } from './operations';

export interface ApiOperationMetadata {
  readonly authPolicy: AuthPolicy;
  readonly sensitiveVariables: boolean;
}

type OperationMetadataRegistry = Readonly<Record<SelectedApiOperationId, ApiOperationMetadata>>;

export const queryKeys = {
  public: {
    operation: (operationId: SelectedApiOperationId, resource: string) =>
      ['public', operationId, resource] as const,
  },
  private: {
    epoch: (epoch: SessionCacheEpoch) => ['private', epoch] as const,
    operationPrefix: (epoch: SessionCacheEpoch, operationId: SelectedApiOperationId) =>
      ['private', epoch, operationId] as const,
    operation: (epoch: SessionCacheEpoch, operationId: SelectedApiOperationId, resource: string) =>
      ['private', epoch, operationId, resource] as const,
  },
} as const;

export const API_OPERATION_METADATA_BY_ID = {
  'API-002': { authPolicy: 'required', sensitiveVariables: false },
  'API-003': { authPolicy: 'required', sensitiveVariables: false },
  'API-004': { authPolicy: 'required', sensitiveVariables: false },
  'API-005': { authPolicy: 'required', sensitiveVariables: false },
  'API-006': { authPolicy: 'required', sensitiveVariables: false },
  'API-007': { authPolicy: 'required', sensitiveVariables: false },
  'API-008': { authPolicy: 'public', sensitiveVariables: false },
  'API-009': { authPolicy: 'required', sensitiveVariables: false },
  'API-010': { authPolicy: 'optional', sensitiveVariables: false },
  'API-011': { authPolicy: 'required', sensitiveVariables: false },
  'API-012': { authPolicy: 'required', sensitiveVariables: false },
  'API-013': { authPolicy: 'required', sensitiveVariables: false },
  'API-014': { authPolicy: 'optional', sensitiveVariables: false },
  'API-015': { authPolicy: 'required', sensitiveVariables: false },
  'API-016': { authPolicy: 'required', sensitiveVariables: false },
  'API-017': { authPolicy: 'required', sensitiveVariables: false },
  'API-018': { authPolicy: 'required', sensitiveVariables: false },
  'API-019': { authPolicy: 'required', sensitiveVariables: false },
  'API-020': { authPolicy: 'required', sensitiveVariables: false },
  'API-021': { authPolicy: 'required', sensitiveVariables: false },
  'API-022': { authPolicy: 'required', sensitiveVariables: false },
  'API-023': { authPolicy: 'public', sensitiveVariables: true },
  'API-024': { authPolicy: 'public', sensitiveVariables: true },
  'API-025': { authPolicy: 'required', sensitiveVariables: false },
  'API-026': { authPolicy: 'required', sensitiveVariables: false },
  'API-029': { authPolicy: 'public', sensitiveVariables: true },
  'API-030': { authPolicy: 'optional', sensitiveVariables: false },
  'API-031': { authPolicy: 'required', sensitiveVariables: false },
  'API-032': { authPolicy: 'required', sensitiveVariables: false },
  'API-033': { authPolicy: 'public', sensitiveVariables: true },
  'API-034': { authPolicy: 'required', sensitiveVariables: false },
} as const satisfies OperationMetadataRegistry;

export function operationMetadata(operationId: SelectedApiOperationId) {
  return {
    operation: API_OPERATION_BY_ID[operationId],
    ...API_OPERATION_METADATA_BY_ID[operationId],
  };
}
