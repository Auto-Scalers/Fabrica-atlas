/**
 * Agent telemetry logging & formatting utilities for 24/7 background harness execution.
 */

export interface TelemetryLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'agent' | 'success';
  phase?: string;
  message: string;
  metadata?: Record<string, any>;
}

export function createTelemetryEntry(
  message: string,
  level: TelemetryLogEntry['level'] = 'info',
  phase: string = 'runtime',
  metadata?: Record<string, any>
): TelemetryLogEntry {
  return {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    level,
    phase,
    message,
    metadata
  };
}

export function formatTelemetryForDisplay(entry: TelemetryLogEntry): string {
  const timeStr = new Date(entry.timestamp).toLocaleTimeString();
  const icon = entry.level === 'error' ? '❌' : entry.level === 'warn' ? '⚠️' : entry.level === 'success' ? '✅' : entry.level === 'agent' ? '🤖' : 'ℹ️';
  return `[${timeStr}] ${icon} [${entry.phase?.toUpperCase() || 'SYS'}] ${entry.message}`;
}
