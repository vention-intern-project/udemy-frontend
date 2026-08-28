import { rebindConsumerSource } from './consumer-rebinding.mjs';

const [registryPath, outputPath, taskId, sourcePath] = process.argv.slice(2);
if (!registryPath || !outputPath || !taskId || !sourcePath)
  throw new Error(
    'usage: consumer-source-rebind <registryPath> <generatedOutputPath> <taskId> <sourcePath>',
  );

process.stdout.write(
  `${JSON.stringify(await rebindConsumerSource({ registryPath, outputPath, taskId, sourcePath }))}\n`,
);
