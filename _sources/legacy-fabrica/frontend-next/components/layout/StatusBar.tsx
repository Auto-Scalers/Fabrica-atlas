'use client';

import React from 'react';

export interface StatusBarProps {
  containerStatus?: 'warm' | 'waking_up' | 'idle';
  gcsBucket?: string;
  activeModel?: string;
  activeTokens?: number;
  lastExecutionTime?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  containerStatus = 'warm',
  gcsBucket = 'gs://fabrica-tenant-usr-123/',
  activeModel = 'gemini-2.5-flash',
  activeTokens = 124500,
  lastExecutionTime = 'Just now'
}) => {
  return (
    <footer
      style={{
        height: '24px',
        minHeight: '24px',
        maxHeight: '24px',
        backgroundColor: 'var(--surface-alt)',
        borderTop: '1px solid var(--border-soft)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        fontSize: '8.5px',
        fontFamily: 'var(--mono)',
        color: 'var(--muted)',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: containerStatus === 'warm' ? '#10b981' : '#f59e0b'
          }} />
          <span style={{ color: 'var(--text)' }}>Cloud Run: {containerStatus.toUpperCase()}</span>
        </span>

        <span>Storage: <span style={{ color: 'var(--text)' }}>{gcsBucket}</span></span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span>Model: <span style={{ color: 'var(--accent)' }}>{activeModel}</span></span>
        <span>Quota: <span style={{ color: 'var(--text)' }}>{(activeTokens / 1000).toFixed(1)}k tokens</span></span>
        <span>Updated: <span style={{ color: 'var(--text)' }}>{lastExecutionTime}</span></span>
      </div>
    </footer>
  );
};

export default StatusBar;
