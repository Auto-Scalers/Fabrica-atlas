import express, { Express } from 'express';
import {
  AgentRunnerConfig,
  executeAgentTurn,
  executeAgentTurnStream,
  getActiveDaemons,
  getRunnerHealthDetails,
  getRunnerLogs,
  getRunnerStatusDetails,
  stopAgentProcess
} from './agent-runner.js';

/**
 * server.ts - HTTP Gateway & Container Supervisor
 * Responsible strictly for Express routing, HTTP protocol handling, SSE streaming headers, and signal management.
 */

export function createRunnerServer(config: AgentRunnerConfig = {}): Express {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  const TENANT_ID = config.tenantId || process.env.TENANT_ID || 'default_user';
  const STORAGE_PATH = config.storagePath || process.env.WORKSPACES_STORAGE_PATH || '/mnt';

  // 1. Basic Health Check Endpoint
  app.get('/health', (_req, res) => {
    res.json(getRunnerHealthDetails(TENANT_ID, STORAGE_PATH));
  });

  // 2. Detailed Container Status Endpoint
  app.get('/api/runner/status', (_req, res) => {
    res.json(getRunnerStatusDetails(TENANT_ID, STORAGE_PATH));
  });

  // 3. Agent Turn Streaming Execution Handler (SSE)
  app.post('/api/runner/turn-stream', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    if (typeof (res as any).flushHeaders === 'function') {
      (res as any).flushHeaders();
    }

    try {
      await executeAgentTurnStream(req.body, TENANT_ID, (chunkData: string) => {
        res.write(chunkData);
      });
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ ok: false, error: err.message, text: err.message })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  });

  // 4. Agent Turn Execution Handler (Synchronous JSON)
  app.post('/api/runner/turn', async (req, res) => {
    try {
      const result = await executeAgentTurn(req.body, TENANT_ID);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // 5. List Active Daemons
  app.get('/api/runner/daemons', (_req, res) => {
    const daemons = getActiveDaemons(TENANT_ID);
    res.json({ ok: true, daemons });
  });

  // 6. Stop Active Agent Process
  app.post('/api/runner/stop', (req, res) => {
    const { sessionId } = req.body || {};
    const stopped = stopAgentProcess(TENANT_ID, sessionId);
    res.json({ ok: stopped, tenantId: TENANT_ID });
  });

  // 7. Get Process Logs
  app.get('/api/runner/logs', (_req, res) => {
    const logs = getRunnerLogs(TENANT_ID);
    res.json({ ok: true, logs });
  });

  return app;
}

export function startRunnerServer(config: AgentRunnerConfig = {}): void {
  const PORT = config.port || Number(process.env.PORT) || 3000;
  const TENANT_ID = config.tenantId || process.env.TENANT_ID || 'default_user';

  const app = createRunnerServer(config);
  const server = app.listen(PORT, () => {
    console.log(`[Runner Gateway] Dedicated runner server listening for tenant ${TENANT_ID} on port ${PORT}`);
  });

  const shutdown = (signal: string) => {
    console.log(`[Runner Gateway] Received ${signal}. Shutting down runner server...`);
    server.close(() => {
      console.log('[Runner Gateway] HTTP server closed gracefully.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Backwards compatibility aliases
export const createRunnerApp = createRunnerServer;
export const startAgentRunner = startRunnerServer;
export const startRunnerDaemon = startRunnerServer;

// Always execute server startup when server.ts is executed
startRunnerServer();



