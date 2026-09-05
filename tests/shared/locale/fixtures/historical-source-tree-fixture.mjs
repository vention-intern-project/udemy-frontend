import { execFile } from 'node:child_process';
import { Buffer } from 'node:buffer';
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';

const MAX_GIT_OUTPUT_BYTES = 32 * 1024 * 1024;
const FULL_SHA_PATTERN = /^[0-9a-f]{40}$/;
const TREE_ENTRY_PATTERN = /^(100644|100755) blob ([0-9a-f]{40})\tsrc\/(.+)$/;
const WINDOWS_RESERVED_NAME_PATTERN = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;
const historicalTreeCache = new Map();

function fixtureError(message) {
  return new Error(`historical source tree fixture: ${message}`);
}

function requireSafeRelativePath(relativePath) {
  if (
    relativePath.length === 0 ||
    relativePath.startsWith('/') ||
    relativePath.includes('\\') ||
    relativePath.includes(':') ||
    isAbsolute(relativePath)
  ) {
    throw fixtureError(`unsafe source path ${JSON.stringify(relativePath)}`);
  }
  const segments = relativePath.split('/');
  if (
    segments.some(
      (segment) =>
        segment.length === 0 ||
        segment === '.' ||
        segment === '..' ||
        segment.endsWith('.') ||
        segment.endsWith(' ') ||
        WINDOWS_RESERVED_NAME_PATTERN.test(segment),
    )
  ) {
    throw fixtureError(`unsafe source path ${JSON.stringify(relativePath)}`);
  }
}

function treeRecordText(record) {
  const text = record.toString('utf8');
  if (!Buffer.from(text, 'utf8').equals(record))
    throw fixtureError('tree metadata is not valid UTF-8');
  return text;
}

export function parseHistoricalSourceTree(treeOutput) {
  if (!Buffer.isBuffer(treeOutput) || treeOutput.length === 0)
    throw fixtureError('tree output is empty');
  if (treeOutput.length > MAX_GIT_OUTPUT_BYTES) throw fixtureError('tree output exceeds 32 MiB');
  const entries = [];
  const paths = new Set();
  let offset = 0;
  while (offset < treeOutput.length) {
    const terminator = treeOutput.indexOf(0, offset);
    if (terminator < 0) throw fixtureError('tree output is missing a NUL delimiter');
    if (terminator === offset) throw fixtureError('tree output contains an empty record');
    const match = treeRecordText(treeOutput.subarray(offset, terminator)).match(TREE_ENTRY_PATTERN);
    if (!match) throw fixtureError('tree output contains an unsupported entry');
    const [, mode, blobId, relativePath] = match;
    requireSafeRelativePath(relativePath);
    const caseInsensitivePath = relativePath.toLowerCase();
    if (paths.has(caseInsensitivePath))
      throw fixtureError(`tree output duplicates ${relativePath}`);
    paths.add(caseInsensitivePath);
    entries.push({ blobId, mode, relativePath });
    offset = terminator + 1;
  }
  if (entries.length === 0) throw fixtureError('tree output is empty');
  return entries;
}

function requireExpectedEntry(entry, index) {
  if (!entry || typeof entry !== 'object') throw fixtureError(`expected entry ${index} is invalid`);
  const { blobId, mode, relativePath } = entry;
  if (!FULL_SHA_PATTERN.test(blobId) || (mode !== '100644' && mode !== '100755'))
    throw fixtureError(`expected entry ${index} is invalid`);
  requireSafeRelativePath(relativePath);
}

function readBatchHeader(batchOutput, offset) {
  const newline = batchOutput.indexOf(10, offset);
  if (newline < 0) throw fixtureError('batch output is missing an object header delimiter');
  const header = batchOutput.subarray(offset, newline).toString('latin1');
  const match = header.match(/^([0-9a-f]{40}) blob ([0-9]+)$/);
  if (!match) throw fixtureError('batch output contains an invalid object header');
  const size = Number(match[2]);
  if (!Number.isSafeInteger(size) || size < 0 || size > MAX_GIT_OUTPUT_BYTES)
    throw fixtureError('batch output declares an unsafe object size');
  return { blobId: match[1], payloadOffset: newline + 1, size };
}

export function parseHistoricalBlobBatch(batchOutput, expectedEntries) {
  if (!Buffer.isBuffer(batchOutput) || batchOutput.length > MAX_GIT_OUTPUT_BYTES)
    throw fixtureError('batch output exceeds 32 MiB');
  if (!Array.isArray(expectedEntries) || expectedEntries.length === 0)
    throw fixtureError('expected entries are empty');
  const blobs = [];
  let offset = 0;
  for (const [index, expectedEntry] of expectedEntries.entries()) {
    requireExpectedEntry(expectedEntry, index);
    const header = readBatchHeader(batchOutput, offset);
    if (header.blobId !== expectedEntry.blobId)
      throw fixtureError(`batch object ${index} does not match the tree inventory`);
    const payloadEnd = header.payloadOffset + header.size;
    if (payloadEnd >= batchOutput.length || batchOutput[payloadEnd] !== 10)
      throw fixtureError(`batch object ${index} is truncated or missing its delimiter`);
    blobs.push(Buffer.from(batchOutput.subarray(header.payloadOffset, payloadEnd)));
    offset = payloadEnd + 1;
  }
  if (offset !== batchOutput.length) throw fixtureError('batch output has trailing data');
  return blobs;
}

function executeGit(repositoryRoot, argumentsList, input) {
  return new Promise((resolveOutput, rejectOutput) => {
    const child = execFile(
      'git',
      ['-C', repositoryRoot, ...argumentsList],
      { encoding: 'buffer', maxBuffer: MAX_GIT_OUTPUT_BYTES, windowsHide: true },
      (error, stdout) => {
        if (error) {
          rejectOutput(fixtureError(`Git ${argumentsList[0]} failed: ${error.message}`));
          return;
        }
        if (!Buffer.isBuffer(stdout) || stdout.length > MAX_GIT_OUTPUT_BYTES) {
          rejectOutput(fixtureError(`Git ${argumentsList[0]} produced unsafe output`));
          return;
        }
        resolveOutput(stdout);
      },
    );
    if (input === undefined) child.stdin.end();
    else child.stdin.end(input);
  });
}

async function loadHistoricalTree(repositoryRoot, commit) {
  const treeOutput = await executeGit(repositoryRoot, ['ls-tree', '-r', '-z', commit, '--', 'src']);
  const entries = parseHistoricalSourceTree(treeOutput);
  const batchInput = `${entries.map(({ blobId }) => blobId).join('\n')}\n`;
  const batchOutput = await executeGit(repositoryRoot, ['cat-file', '--batch'], batchInput);
  const blobs = parseHistoricalBlobBatch(batchOutput, entries);
  return {
    blobs,
    entries,
  };
}

async function cachedHistoricalTree(repositoryRoot, commit) {
  const cacheKey = `${repositoryRoot}\0${commit}`;
  const cached = historicalTreeCache.get(cacheKey);
  if (cached) return cached;
  const load = loadHistoricalTree(repositoryRoot, commit);
  historicalTreeCache.set(cacheKey, load);
  try {
    return await load;
  } catch (error) {
    if (historicalTreeCache.get(cacheKey) === load) historicalTreeCache.delete(cacheKey);
    throw error;
  }
}

function sourceDestination(sourceRoot, relativePath) {
  const destination = join(sourceRoot, relativePath);
  const fromSourceRoot = relative(sourceRoot, destination);
  if (fromSourceRoot.startsWith('..') || isAbsolute(fromSourceRoot))
    throw fixtureError(`unsafe materialization destination ${JSON.stringify(relativePath)}`);
  return destination;
}

export async function materializeHistoricalSourceTree({ repositoryRoot, commit }) {
  if (typeof repositoryRoot !== 'string' || typeof commit !== 'string')
    throw fixtureError('materialization request is invalid');
  if (!FULL_SHA_PATTERN.test(commit)) throw fixtureError('materialization requires a full SHA');
  const resolvedRepositoryRoot = await realpath(resolve(repositoryRoot));
  const historicalTree = await cachedHistoricalTree(resolvedRepositoryRoot, commit);
  const directory = await mkdtemp(join(tmpdir(), 'learnhub-crf001-source-'));
  const sourceRoot = join(directory, 'src');
  try {
    for (const [index, entry] of historicalTree.entries.entries()) {
      const destination = sourceDestination(sourceRoot, entry.relativePath);
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, historicalTree.blobs[index]);
    }
    return { directory, sourceRoot };
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}
