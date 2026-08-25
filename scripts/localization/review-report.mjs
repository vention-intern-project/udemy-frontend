import { readFile } from 'node:fs/promises';

import {
  createCorpusReviewReport,
  inspectSuppliedReviewArtifact,
  readCorpus,
} from './review-exchange.mjs';

const [registryPath, suppliedArtifactPath] = process.argv.slice(2);
if (!registryPath) throw new Error('usage: review-report <registryPath> [suppliedArtifactPath]');
const corpus = await readCorpus(registryPath);
const report = suppliedArtifactPath
  ? inspectSuppliedReviewArtifact({
      bytes: await readFile(suppliedArtifactPath),
      corpus,
    }).report
  : createCorpusReviewReport(corpus);
console.log(JSON.stringify(report, null, 2));
