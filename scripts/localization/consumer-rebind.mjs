import { rebindConsumerGrammar } from './consumer-rebinding.mjs';

const [registryPath, outputPath, taskId, sourcePath, functionName, bindingName] =
  process.argv.slice(2);
if (!registryPath || !outputPath || !taskId || !sourcePath || !functionName || !bindingName)
  throw new Error(
    'usage: consumer-rebind <registryPath> <generatedOutputPath> <taskId> <sourcePath> <functionName> <bindingName>',
  );

const result = await rebindConsumerGrammar({
  registryPath,
  outputPath,
  taskId,
  sourcePath,
  functionName,
  bindingName,
});
process.stdout.write(`${JSON.stringify(result)}\n`);
