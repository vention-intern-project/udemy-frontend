export interface QualityFinding {
  category: string;
  file: string;
  line: number;
  ruleId: string;
  message: string;
}

export function analyseSourceText(file: string, content: string): QualityFinding[];
export function collectImportCycleFindings(
  entries: Array<{ file: string; content: string }>,
): QualityFinding[];
export function staticSuppressions(): Array<{
  ruleId: string;
  path: string;
  owner: string;
  rationale: string;
}>;
export function complexitySignals(content: string): Array<Record<string, number | string>>;
