import { DEFAULT_OUTPUT_PATH, DEFAULT_REGISTRY_PATH, checkCorpus } from './corpus-engine.mjs';

const violations = await checkCorpus({
  registryPath: DEFAULT_REGISTRY_PATH,
  outputPath: DEFAULT_OUTPUT_PATH,
});
if (violations.length > 0) {
  globalThis.process.stderr.write(`${violations.join('\n')}\n`);
  globalThis.process.exitCode = 1;
}
