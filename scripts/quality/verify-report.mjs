import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { targetForCommit, targetForPatch, validateReportAdmission } from './report-utils.mjs';

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const reportPath = argument('--report');
const explicitSha = argument('--sha');
const expectedSha = explicitSha || process.env.GITHUB_SHA;
const expectedScope = argument('--scope') || 'full';
const targetPatch = argument('--target-patch');
const targetRoot = argument('--target-root');
const baseRoot = argument('--base-root');
const maxAgeIndex = process.argv.indexOf('--max-age-minutes');
const maxAgeValue = maxAgeIndex === -1 ? undefined : process.argv[maxAgeIndex + 1];
const maxAgeMinutes = maxAgeIndex === -1 ? 30 : Number(maxAgeValue);
const localAttestationKey =
  expectedScope === 'full' ? process.env.QUALITY_REPORT_ATTESTATION_KEY : undefined;
if (!reportPath)
  throw new Error(
    'Usage: verify-report --report <path> --scope <full|ci> [--target-patch <patch> [--target-root <after> --base-root <before>]|--sha <sha>]',
  );
if (!['full', 'ci'].includes(expectedScope))
  throw new Error('Only full and ci report scopes are authoritative.');
if (
  maxAgeIndex !== -1 &&
  (!maxAgeValue || maxAgeValue.trim().length === 0 || maxAgeValue.startsWith('--'))
)
  throw new Error('max-age-minutes must be a finite non-negative number.');
if (!Number.isFinite(maxAgeMinutes) || maxAgeMinutes < 0)
  throw new Error('max-age-minutes must be a finite non-negative number.');
if (expectedScope === 'full' && (!targetPatch || explicitSha)) {
  throw new Error(
    'Local full report verification requires --target-patch and must not accept a caller SHA.',
  );
}
if (expectedScope === 'ci' && (!expectedSha || targetPatch)) {
  throw new Error(
    'CI report verification requires the current --sha and must not accept a local patch.',
  );
}
if (expectedScope === 'ci' && (targetRoot || baseRoot)) {
  throw new Error('CI report verification must not accept local snapshot roots.');
}
let report;
try {
  report = JSON.parse(await readFile(resolve(reportPath), 'utf8'));
} catch (error) {
  throw new Error(`QUALITY_REPORT_REJECTED: malformed report: ${error.message}`);
}
const expectedTarget =
  expectedScope === 'ci'
    ? targetForCommit(expectedSha)
    : await targetForPatch(
        resolve(targetPatch),
        targetRoot && resolve(targetRoot),
        baseRoot && resolve(baseRoot),
      );
const errors = validateReportAdmission(report, {
  target: expectedTarget,
  scope: expectedScope,
  maxAgeMinutes,
  localAttestationKey,
});
if (errors.length) throw new Error(`QUALITY_REPORT_REJECTED: ${errors.join('; ')}`);
console.log('QUALITY_REPORT_ACCEPTED');
