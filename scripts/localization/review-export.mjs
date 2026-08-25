import { readFile } from 'node:fs/promises';

import { exportReviewPack } from './review-exchange.mjs';

const [registryPath, outputPath, taskId, localeList = 'ru,uz', unitIdsPath] = process.argv.slice(2);
if (!registryPath || !outputPath || !taskId)
  throw new Error(
    'usage: review-export <registryPath> <outputCsvPath> <taskId> [ru,uz] [unitIdsJsonPath]',
  );
const unitIds = unitIdsPath ? JSON.parse(await readFile(unitIdsPath, 'utf8')) : undefined;
await exportReviewPack({
  registryPath,
  outputPath,
  taskId,
  locales: localeList.split(','),
  unitIds,
});
