import { readFile } from 'node:fs/promises';

import { requestLocaleReviews } from './review-request-transition.mjs';

const args = process.argv.slice(2);
if (args.length < 6 || args.length > 7 || (args.length === 7 && args[6] !== '--adopt-legacy'))
  throw new Error(
    'usage: review-request <registryPath> <generatedOutputPath> <taskId> <ru,uz> <unitIdsJsonPath> <requestedAt> [--adopt-legacy]',
  );
const [registryPath, outputPath, taskId, localeList, unitIdsPath, requestedAt, adoptionFlag] = args;
const unitIds = JSON.parse(await readFile(unitIdsPath, 'utf8'));
const report = await requestLocaleReviews({
  registryPath,
  outputPath,
  taskId,
  locales: localeList.split(','),
  unitIds,
  requestedAt,
  adoptLegacyOwners: adoptionFlag === '--adopt-legacy',
});
console.log(JSON.stringify(report, null, 2));
