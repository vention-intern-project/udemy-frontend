import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { isNonFutureCiRunAttempt } from './ci-command-results.mjs';
import { evaluateCiAggregate } from './quality-decisions.mjs';
import { validateReportAdmission } from './report-utils.mjs';

const reportPath = process.env.QUALITY_REPORT_PATH;
const qualityTargetSha = process.env.QUALITY_TARGET_SHA;
const needs = JSON.parse(process.env.NEEDS ?? '{}');
const runId = process.env.GITHUB_RUN_ID;
const runAttempt = process.env.GITHUB_RUN_ATTEMPT;
const reportRunAttempt = process.env.QUALITY_REPORT_RUN_ATTEMPT;
const currentIdentityIsValid =
  /^[1-9][0-9]*$/.test(runId ?? '') && /^[1-9][0-9]*$/.test(runAttempt ?? '');
const reportAttemptIsValid = isNonFutureCiRunAttempt(reportRunAttempt, runAttempt);
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
      expectedCiRun:
        currentIdentityIsValid && reportAttemptIsValid
          ? { runId, runAttempt: reportRunAttempt }
          : undefined,
    });
  } catch (error) {
    reportErrors = [`quality report artifact is unreadable: ${error.message}`];
  }
}

if (!currentIdentityIsValid) reportErrors.push('current GitHub run identity is missing or invalid');
if (!reportAttemptIsValid)
  reportErrors.push('published quality report attempt is missing, invalid, or in the future');

const decision = evaluateCiAggregate({ needs, qualityTargetSha, artifactPresent, reportErrors });
if (decision.outcome !== 'pass') {
  throw new Error(`QUALITY_CI_AGGREGATE_REJECTED: ${decision.errors.join('; ')}`);
}
console.log('QUALITY_CI_AGGREGATE_ACCEPTED');
