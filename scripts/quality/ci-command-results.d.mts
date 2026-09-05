import type {
  Advisory,
  CiGroupId,
  ConfigVersions,
  Finding,
  QualityCommand,
  Suppression,
  ToolVersions,
} from './report-utils.mjs';

export interface CiRunIdentity {
  runId: string;
  runAttempt: string;
}
export interface CiGroupAnalysis {
  findings: Finding[];
  suppressions: Suppression[];
  advisory: Advisory;
  configVersions: ConfigVersions;
}
export interface CiEnvelopeIntegrity {
  algorithm: 'sha256';
  digest: string;
}
export interface CiGroupResultEnvelope {
  schemaVersion: 1;
  group: CiGroupId;
  sha: string;
  ciRun: CiRunIdentity;
  generatedAt: string;
  commands: QualityCommand[];
  toolVersions: ToolVersions;
  analysis?: CiGroupAnalysis;
  integrity: CiEnvelopeIntegrity;
}
export interface CiGroupResultEnvelopeInput {
  group: CiGroupId;
  sha: string;
  ciRun: CiRunIdentity;
  generatedAt?: string;
  commands: QualityCommand[];
  toolVersions: ToolVersions;
  analysis?: CiGroupAnalysis;
}
export interface CiGroupEnvelopeOptions {
  expectedSha?: string;
  expectedCiRun?: CiRunIdentity;
  now?: Date;
  maxAgeMinutes?: number;
}
export type CiProducerState = 'success' | 'failure' | 'skipped' | 'cancelled';
export interface CiProducerResult {
  result: CiProducerState;
  runAttempt: string;
}
export type CiProducerResults = Record<CiGroupId, CiProducerResult>;
export interface CiAssemblyInput {
  envelopes: readonly CiGroupResultEnvelope[];
  expectedSha: string;
  expectedCiRun: CiRunIdentity;
  producerResults: CiProducerResults;
  now?: Date;
}
export interface ParallelCiRunContext extends CiRunIdentity {
  source: 'parallel-groups';
}
export interface CiAssembledReportContext {
  ciRun: ParallelCiRunContext;
}
export interface CiAssembledReport {
  commands: QualityCommand[];
  context: CiAssembledReportContext;
  [key: string]: unknown;
}
export function createCiGroupResultEnvelope(
  input: CiGroupResultEnvelopeInput,
): CiGroupResultEnvelope;
export function validateCiGroupResultEnvelope(
  envelope: unknown,
  options?: CiGroupEnvelopeOptions,
): string[];
export function parseCiGroupResultEnvelope(bytes: Buffer): CiGroupResultEnvelope;
export function isNonFutureCiRunAttempt(
  publishedAttempt: unknown,
  currentAttempt: unknown,
): boolean;
export function validateCiProducerResults(
  producerResults: unknown,
  currentRunAttempt: unknown,
): string[];
export function assembleCiCommandResults(input: CiAssemblyInput): CiAssembledReport;
