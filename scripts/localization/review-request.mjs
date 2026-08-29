import { readFile } from 'node:fs/promises';

import { requestLocaleReviews } from './review-request-transition.mjs';

const args = process.argv.slice(2);
if (args.length !== 6)
  throw new Error(
    'usage: review-request <registryPath> <generatedOutputPath> <taskId> <ru,uz> <unitIdsJsonPath> <requestedAt>',
  );
const [registryPath, outputPath, taskId, localeList, unitIdsPath, requestedAt] = args;
const unitIds = JSON.parse(await readFile(unitIdsPath, 'utf8'));
const report = await requestLocaleReviews({
  registryPath,
  outputPath,
  taskId,
  locales: localeList.split(','),
  unitIds,
  requestedAt,
});
console.log(JSON.stringify(report, null, 2));
