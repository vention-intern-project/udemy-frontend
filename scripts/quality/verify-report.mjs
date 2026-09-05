import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { targetForCommit, targetForPatch, validateReportAdmission } from './report-utils.mjs';

const supportedOptions = new Set([
  '--report',
  '--sha',
  '--scope',
  '--target-patch',
  '--target-root',
  '--base-root',
  '--max-age-minutes',
  '--run-id',
  '--run-attempt',
]);

function parseArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    if (!supportedOptions.has(option))
      throw new Error(`Unsupported or positional argument: ${option}`);
    if (values.has(option)) throw new Error(`Duplicate option: ${option}`);
    const value = argv[++index];
    if (!value || value.trim().length === 0 || value.startsWith('--'))
      throw new Error(
        option === '--max-age-minutes'
          ? 'max-age-minutes must be a finite non-negative number.'
          : `${option} requires a non-empty value.`,
      );
    values.set(option, value);
  }
  return values;
}

const argumentsByName = parseArguments(process.argv.slice(2));
const reportPath = argumentsByName.get('--report');
const explicitSha = argumentsByName.get('--sha');
const expectedSha = explicitSha || process.env.GITHUB_SHA;
const expectedScope = argumentsByName.get('--scope') || 'full';
const targetPatch = argumentsByName.get('--target-patch');
const targetRoot = argumentsByName.get('--target-root');
const baseRoot = argumentsByName.get('--base-root');
const maxAgeValue = argumentsByName.get('--max-age-minutes');
const maxAgeMinutes = maxAgeValue === undefined ? 30 : Number(maxAgeValue);
const expectedRunId = argumentsByName.get('--run-id');
const expectedRunAttempt = argumentsByName.get('--run-attempt');
const localAttestationKey =
  expectedScope === 'full' ? process.env.QUALITY_REPORT_ATTESTATION_KEY : undefined;
if (!reportPath)
  throw new Error(
    'Usage: verify-report --report <path> --scope <full|ci> [--target-patch <patch> [--target-root <after> --base-root <before>]|--sha <sha>]',
  );
if (!['full', 'ci'].includes(expectedScope))
  throw new Error('Only full and ci report scopes are authoritative.');
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
if ((expectedRunId || expectedRunAttempt) && (!expectedRunId || !expectedRunAttempt))
  throw new Error('CI run verification requires both --run-id and --run-attempt.');
if (
  (expectedRunId && !/^[1-9][0-9]*$/.test(expectedRunId)) ||
  (expectedRunAttempt && !/^[1-9][0-9]*$/.test(expectedRunAttempt))
)
  throw new Error('CI run verification requires nonzero decimal identifiers.');
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
  expectedCiRun: expectedRunId
    ? { runId: expectedRunId, runAttempt: expectedRunAttempt }
    : undefined,
});
if (errors.length) throw new Error(`QUALITY_REPORT_REJECTED: ${errors.join('; ')}`);
console.log('QUALITY_REPORT_ACCEPTED');
