import { createServer } from 'vite';

export const learningProgressOrigin = 'http://127.0.0.1:4179';
export const learningProgressSubtitleOrigin = 'http://127.0.0.1:4181';
const subtitlesDisabledDefinition = JSON.stringify('false');
const subtitlesEnabledDefinition = JSON.stringify('true');

export async function startLearningProgressServer(
  origin = learningProgressOrigin,
  subtitlesEnabled = false,
) {
  const apiDefinition = JSON.stringify(origin);
  const subtitleDefinition = subtitlesEnabled
    ? subtitlesEnabledDefinition
    : subtitlesDisabledDefinition;
  const server = await createServer({
    clearScreen: false,
    logLevel: 'warn',
    envFile: false,
    appType: 'spa',
    define: {
      'import.meta.env.VITE_API_BASE_URL': apiDefinition,
      'import.meta.env.VITE_LESSON_SUBTITLES_ENABLED': subtitleDefinition,
    },
    server: {
      host: '127.0.0.1',
      port: Number.parseInt(new URL(origin).port, 10),
      strictPort: true,
      watch: { ignored: ['**/plans/**', '**/test-results/**'] },
    },
  });
  if (
    server.config.define?.['import.meta.env.VITE_API_BASE_URL'] !== apiDefinition ||
    server.config.define?.['import.meta.env.VITE_LESSON_SUBTITLES_ENABLED'] !== subtitleDefinition
  ) {
    await server.close();
    throw new Error(
      'Learning-progress Vite API origin does not match the deterministic route harness',
    );
  }
  try {
    await server.listen();
  } catch (error) {
    await server.close();
    throw error;
  }
  return async () => server.close();
}

export default async function startDefaultLearningProgressServer() {
  return startLearningProgressServer();
}
