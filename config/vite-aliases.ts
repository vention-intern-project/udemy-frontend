import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const configDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(configDirectory, '..');

export const viteAliases = {
  '@shared': resolve(projectRoot, 'src/shared'),
  '@features': resolve(projectRoot, 'src/features'),
  '@entities': resolve(projectRoot, 'src/entities'),
  '@pages': resolve(projectRoot, 'src/pages'),
  '@widgets': resolve(projectRoot, 'src/widgets'),
  '@app': resolve(projectRoot, 'src/app'),
};
