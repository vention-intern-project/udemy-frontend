import { readFile } from 'node:fs/promises';
import { recoverRecordedBase } from './recorded-base-recovery.mjs';

const [registryPath, outputPath, recoveryRequestPath] = process.argv.slice(2);
if (!registryPath || !outputPath || !recoveryRequestPath)
  throw new Error(
    'usage: recorded-base-recover <registryPath> <generatedOutputPath> <recoveryRequestJsonPath>',
  );
const request = JSON.parse(await readFile(recoveryRequestPath, 'utf8'));
process.stdout.write(
  `${JSON.stringify(await recoverRecordedBase({ registryPath, outputPath, request, sourceRoot: 'src' }))}\n`,
);
