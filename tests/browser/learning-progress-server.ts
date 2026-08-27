import { createServer } from 'vite';

export const learningProgressOrigin = 'http://127.0.0.1:4179';
const learningProgressApiDefinition = JSON.stringify(learningProgressOrigin);

export default async function startLearningProgressServer() {
  const server = await createServer({
    clearScreen: false,
    logLevel: 'warn',
    envFile: false,
    appType: 'spa',
    define: { 'import.meta.env.VITE_API_BASE_URL': learningProgressApiDefinition },
    server: {
      host: '127.0.0.1',
      port: 4179,
      strictPort: true,
      watch: { ignored: ['**/plans/**', '**/test-results/**'] },
    },
  });
  if (
    server.config.define?.['import.meta.env.VITE_API_BASE_URL'] !== learningProgressApiDefinition
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
