export interface StagedPredicatePlan {
  selected: Record<'prettier' | 'eslint' | 'stylelint', string[]>;
  hasTargets: boolean;
}

export interface StagedGateInput {
  paths: string[];
  predicateResults: Record<'prettier' | 'eslint' | 'stylelint', 'pass' | 'fail'>;
  bypassed?: boolean;
}

export interface CiAggregateInput {
  needs: Record<string, { result?: string }>;
  qualityTargetSha: string | undefined;
  artifactPresent: boolean;
  reportErrors: string[];
}

export function stagedPredicatePlan(paths: string[]): StagedPredicatePlan;
export function evaluateStagedGate(input: StagedGateInput): {
  outcome: 'pass' | 'fail' | 'bypassed';
  plan: StagedPredicatePlan;
  failures: string[];
};
export function evaluateCiAggregate(input: CiAggregateInput): {
  outcome: 'pass' | 'fail';
  errors: string[];
};
export function qualityTargetForEvent(input: {
  eventName: string;
  githubSha?: string;
  pullRequestHeadSha?: string;
}): string;
