import { DEFAULT_OUTPUT_PATH, DEFAULT_REGISTRY_PATH, syncCorpus } from './corpus-engine.mjs';
await syncCorpus({ registryPath: DEFAULT_REGISTRY_PATH, outputPath: DEFAULT_OUTPUT_PATH });
