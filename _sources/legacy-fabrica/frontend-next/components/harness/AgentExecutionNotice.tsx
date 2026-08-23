'use client';

import React from 'react';
import { ContainerState } from '../preview/LiveAppPreview';

interface AgentExecutionNoticeProps {
  tenantId?: string;
  containerState?: ContainerState;
  className?: string;
}

export const AgentExecutionNotice: React.FC<AgentExecutionNoticeProps> = ({
  tenantId = 'usr-123',
  containerState = 'waking_up',
  className = ''
}) => {
  const safeTenant = tenantId.toLowerCase().replace(/[^a-z0-9_\-]/g, '-');
  const serviceName = `fabrica-runner-${safeTenant}`;
  const bucketName = `gs://fabrica-tenant-${safeTenant}/`;

  if (containerState === 'warm') {
    return (
      <div
        className={className}
        style={{
          backgroundColor: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '6px',
          padding: '6px 12px',
          fontSize: '10px',
          color: '#10b981',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          margin: '6px 0'
        }}
      >
        <span>🟢</span>
        <span style={{ fontWeight: 700 }}>
          Dedicated Container Active
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '9px', opacity: 0.8 }}>Workspace Active</span>
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        backgroundColor: 'rgba(245, 158, 11, 0.08)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        borderRadius: '6px',
        padding: '8px 12px',
        fontSize: '10.5px',
        color: '#f59e0b',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        margin: '8px 0',
        animation: 'pulse 1.5s infinite alternate'
      }}
    >
      <span style={{ fontSize: '12px' }}>⚡</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800 }}>
          Spinning up dedicated user container... (~1.8s cold start)
        </div>
      </div>
    </div>
  );
};

export default AgentExecutionNotice;
