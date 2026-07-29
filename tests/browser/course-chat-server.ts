import { createServer } from 'vite';

export const courseChatOrigin = 'http://127.0.0.1:4180';
const courseChatApiDefinition = JSON.stringify(courseChatOrigin);

export default async function startCourseChatServer() {
  const server = await createServer({
    clearScreen: false,
    logLevel: 'warn',
    envFile: false,
    appType: 'spa',
    define: { 'import.meta.env.VITE_API_BASE_URL': courseChatApiDefinition },
    server: { host: '127.0.0.1', port: 4180, strictPort: true },
  });
  try {
    await server.listen();
  } catch (error) {
    await server.close();
    throw error;
  }
  return async () => server.close();
}
