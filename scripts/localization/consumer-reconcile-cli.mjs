import { readFile } from 'node:fs/promises';
import { reconcileConsumerGrammar } from './consumer-reconcile.mjs';
const [registryPath, outputPath, requestPath] = process.argv.slice(2);
if (!registryPath || !outputPath || !requestPath)
  throw new Error(
    'usage: consumer-reconcile <registryPath> <generatedOutputPath> <requestJsonPath>',
  );
process.stdout.write(
  `${JSON.stringify(await reconcileConsumerGrammar({ registryPath, outputPath, request: JSON.parse(await readFile(requestPath, 'utf8')) }))}\n`,
);
