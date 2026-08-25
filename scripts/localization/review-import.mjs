import { importReviewPack, importSuppliedReviewArtifact } from './review-exchange.mjs';

const [mode, packPath, registryPath, outputPath, recordedAt, taskId] = process.argv.slice(2);
if (
  !['csv', 'supplied-artifact'].includes(mode) ||
  !packPath ||
  !registryPath ||
  !outputPath ||
  !recordedAt
)
  throw new Error(
    'usage: review-import <csv|supplied-artifact> <packPath> <registryPath> <generatedOutputPath> <recordedAt> [taskId]',
  );
if (mode === 'csv' && !taskId) throw new Error('csv review import requires taskId');
const report =
  mode === 'supplied-artifact'
    ? await importSuppliedReviewArtifact({
        artifactPath: packPath,
        registryPath,
        outputPath,
        approvalRecordedAt: recordedAt,
      })
    : await importReviewPack({
        packPath,
        registryPath,
        outputPath,
        importedAt: recordedAt,
        taskId,
      });
console.log(JSON.stringify(report, null, 2));
