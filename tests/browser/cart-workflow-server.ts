import { createServer } from 'vite';
export default async function startCartWorkflowServer() { const server = await createServer({ clearScreen: false, logLevel: 'warn', appType: 'spa', server: { host: '127.0.0.1', port: 4177, strictPort: true } }); try { await server.listen(); } catch (error) { await server.close(); throw error; } return async () => server.close(); }
