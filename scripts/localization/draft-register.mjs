import { readDraftRegistrationUnits, registerDraftUnits } from './draft-registration.mjs';

const [registryPath, outputPath, taskId, unitsPath] = process.argv.slice(2);
if (!registryPath || !outputPath || !taskId || !unitsPath)
  throw new Error(
    'usage: draft-register <registryPath> <generatedOutputPath> <taskId> <unitsJsonPath>',
  );

const result = await registerDraftUnits({
  registryPath,
  outputPath,
  taskId,
  units: await readDraftRegistrationUnits(unitsPath),
});
process.stdout.write(`${JSON.stringify(result)}\n`);
