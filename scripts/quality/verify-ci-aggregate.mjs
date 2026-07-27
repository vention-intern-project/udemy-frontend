import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { evaluateCiAggregate } from './quality-decisions.mjs';
import { validateReportAdmission } from './report-utils.mjs';

const reportPath = process.env.QUALITY_REPORT_PATH;
const qualityTargetSha = process.env.QUALITY_TARGET_SHA;
const needs = JSON.parse(process.env.NEEDS ?? '{}');
let reportErrors = [];
let artifactPresent = Boolean(reportPath);

if (!reportPath) {
  reportErrors = ['quality report artifact path is missing'];
} else {
  try {
    const report = JSON.parse(await readFile(resolve(reportPath), 'utf8'));
    reportErrors = validateReportAdmission(report, {
      target: { kind: 'commit', sha: qualityTargetSha },
      scope: 'ci',
    });
  } catch (error) {
    reportErrors = [`quality report artifact is unreadable: ${error.message}`];
  }
}

const decision = evaluateCiAggregate({ needs, qualityTargetSha, artifactPresent, reportErrors });
if (decision.outcome !== 'pass') {
  throw new Error(`QUALITY_CI_AGGREGATE_REJECTED: ${decision.errors.join('; ')}`);
}
console.log('QUALITY_CI_AGGREGATE_ACCEPTED');
