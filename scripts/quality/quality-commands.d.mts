import type { CiGroupId, QualityCommand, QualityCommandId } from './report-utils.mjs';

export type QualityCommandRunner = 'npm' | 'vite';

export interface QualityCommandPlanEntry {
  id: QualityCommandId;
  runner: QualityCommandRunner;
  args: string[];
}
export interface QualityCommandExecution {
  command: QualityCommand;
  stdout: string;
  stderr: string;
  hasUnexpectedDiagnostics: boolean;
}
export interface FullQualityCommandPlanInput {
  mode: 'full';
}
export interface CiGroupQualityCommandPlanInput {
  mode: 'ci-group';
  group: CiGroupId;
}
export type QualityCommandPlanInput = FullQualityCommandPlanInput | CiGroupQualityCommandPlanInput;
export function qualityCommandPlan(input: QualityCommandPlanInput): QualityCommandPlanEntry[];
export function executeQualityCommand(
  entry: QualityCommandPlanEntry,
  root: string,
): QualityCommandExecution;
export function executeQualityGroup(group: CiGroupId, root: string): QualityCommandExecution[];
