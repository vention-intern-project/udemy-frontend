import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const defaultDockerInfoPath = '/ms-playwright/.docker-info';
const exactVersionPattern = /^\d+\.\d+\.\d+$/;
const imagePattern = /^mcr\.microsoft\.com\/playwright:v(\d+\.\d+\.\d+)-noble@sha256:[a-f0-9]{64}$/;

function parseArguments(argumentsList) {
  if (argumentsList.length === 0) return { dockerInfoPath: defaultDockerInfoPath };
  if (argumentsList.length !== 2 || argumentsList[0] !== '--docker-info' || !argumentsList[1]) {
    throw new Error('unknown argument; expected optional --docker-info <path>');
  }
  return { dockerInfoPath: argumentsList[1] };
}

async function readJson(path, label) {
  let content;
  try {
    content = await readFile(path, 'utf8');
  } catch {
    throw new Error(`${label} is missing or unreadable`);
  }
  try {
    return JSON.parse(content);
  } catch {
    throw new Error(`${label} is malformed JSON`);
  }
}

function exactVersion(value, label) {
  if (typeof value !== 'string' || !exactVersionPattern.test(value)) {
    throw new Error(`${label} must be an exact stable x.y.z version`);
  }
  return value;
}

function lockVersion(lock, packagePath) {
  return exactVersion(lock?.packages?.[packagePath]?.version, `package-lock.json ${packagePath}`);
}

function matchingLockVersions(lock, packageName) {
  const packagePathSuffix = `node_modules/${packageName}`;
  return Object.keys(lock?.packages ?? {})
    .filter((packagePath) => packagePath.endsWith(packagePathSuffix))
    .map((packagePath) => lockVersion(lock, packagePath));
}

async function main() {
  const { dockerInfoPath } = parseArguments(process.argv.slice(2));
  const image = process.env.PLAYWRIGHT_IMAGE;
  const imageMatch = typeof image === 'string' ? image.match(imagePattern) : null;
  if (!imageMatch) {
    throw new Error('PLAYWRIGHT_IMAGE must be a digest-pinned official noble Playwright image');
  }

  const packageJson = await readJson(resolve('package.json'), 'package.json');
  const lock = await readJson(resolve('package-lock.json'), 'package-lock.json');
  const manifestVersion = exactVersion(
    packageJson?.devDependencies?.['@playwright/test'],
    'package.json devDependencies.@playwright/test',
  );
  const rootLockVersion = exactVersion(
    lock?.packages?.['']?.devDependencies?.['@playwright/test'],
    'package-lock.json root devDependencies.@playwright/test',
  );
  const versions = [
    manifestVersion,
    rootLockVersion,
    lockVersion(lock, 'node_modules/@playwright/test'),
    lockVersion(lock, 'node_modules/playwright'),
    lockVersion(lock, 'node_modules/playwright-core'),
    ...matchingLockVersions(lock, '@playwright/test'),
    ...matchingLockVersions(lock, 'playwright'),
    ...matchingLockVersions(lock, 'playwright-core'),
    imageMatch[1],
  ];
  if (versions.some((version) => version !== manifestVersion)) {
    throw new Error(
      'Playwright package, lock, and PLAYWRIGHT_IMAGE versions must match exactly; update package/lock and image pin together',
    );
  }

  const marker = await readJson(dockerInfoPath, 'docker-info');
  if (marker?.driverVersion !== manifestVersion) {
    throw new Error('docker-info driverVersion does not match the Playwright version');
  }
  if (marker?.dockerImageName !== `mcr.microsoft.com/playwright:v${manifestVersion}-noble`) {
    throw new Error('docker-info dockerImageName does not match PLAYWRIGHT_IMAGE');
  }

  console.log(`PLAYWRIGHT_IMAGE_ACCEPTED version=${manifestVersion}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Playwright image validation failed');
  process.exitCode = 1;
});
