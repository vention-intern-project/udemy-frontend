import { createServer } from 'vite';

export default async function startPrimitivesServer() {
  const server = await createServer({
    root: 'tests/browser/primitives-harness',
    configFile: false,
    clearScreen: false,
    logLevel: 'warn',
    appType: 'spa',
    server: {
      host: '127.0.0.1',
      port: 4173,
      strictPort: true,
    },
  });

  try {
    await server.listen();
  } catch (error) {
    await server.close();
    throw error;
  }

  return async () => {
    await server.close();
  };
}
