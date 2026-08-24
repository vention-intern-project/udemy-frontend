import { DEFAULT_OUTPUT_PATH, DEFAULT_REGISTRY_PATH, checkCorpus } from './corpus-engine.mjs';

let violations;
try {
  violations = await checkCorpus({
    registryPath: DEFAULT_REGISTRY_PATH,
    outputPath: DEFAULT_OUTPUT_PATH,
  });
} catch (error) {
  const reason = error instanceof Error ? error.message : String(error);
  violations = [`localization check failed: ${reason}`];
}
if (violations.length > 0) {
  globalThis.process.stderr.write(`${violations.join('\n')}\n`);
  globalThis.process.exitCode = 1;
}
