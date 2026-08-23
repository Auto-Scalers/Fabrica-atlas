import {
  runPiAgent,
  runPiAgentStream,
  stopPiAgent,
  listPiDaemons,
  getPiProcessLogs
} from '../core/harness.js';

export interface AgentRunnerConfig {
  port?: number;
  tenantId?: string;
  storagePath?: string;
}

export interface RunnerDaemonConfig extends AgentRunnerConfig {}

/**
 * agent-runner.ts - CLI Agent Process Engine inside /mnt
 * Responsible strictly for process execution, streaming, daemon status, and log recovery.
 */

export async function executeAgentTurnStream(
  payload: any,
  tenantId: string,
  onChunk: (chunkData: string) => void
): Promise<void> {
  await runPiAgentStream(
    {
      ...payload,
      tenantId
    },
    onChunk
  );
}

export async function executeAgentTurn(payload: any, tenantId: string): Promise<any> {
  return await runPiAgent({
    ...payload,
    tenantId
  });
}

export function getActiveDaemons(tenantId: string) {
  return listPiDaemons(tenantId);
}

export function stopAgentProcess(tenantId: string, sessionId?: string): boolean {
  return stopPiAgent(tenantId, sessionId);
}

export function getRunnerLogs(tenantId: string) {
  return getPiProcessLogs(tenantId);
}

export function getRunnerHealthDetails(tenantId: string, storagePath: string) {
  return {
    status: 'ok',
    tenantId,
    storagePath,
    uptimeSeconds: process.uptime(),
    timestamp: new Date().toISOString()
  };
}

export function getRunnerStatusDetails(tenantId: string, storagePath: string) {
  const daemons = listPiDaemons(tenantId);
  return {
    ok: true,
    tenantId,
    storagePath,
    activeDaemonsCount: daemons.length,
    daemons,
    nodeVersion: process.version,
    memoryUsage: process.memoryUsage(),
    uptimeSeconds: process.uptime()
  };
}

