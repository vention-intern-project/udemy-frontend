import { readDraftRevisionRequest, reviseDraftUnits } from './draft-revision.mjs';

const [registryPath, outputPath, requestPath] = process.argv.slice(2);
if (!registryPath || !outputPath || !requestPath)
  throw new Error('usage: draft-revise <registryPath> <generatedOutputPath> <requestJsonPath>');
process.stdout.write(
  `${JSON.stringify(await reviseDraftUnits({ registryPath, outputPath, request: await readDraftRevisionRequest(requestPath) }))}\n`,
);
