'use client';

import React from 'react';
import LiveAppPreview, { ContainerState } from '../preview/LiveAppPreview';
import GcsFileExplorer, { GcsFileNode } from '../editor/GcsFileExplorer';

export type RightPanelTab = 'preview' | 'files';

export interface RightPanelProps {
  tenantId?: string;
  bucketName?: string;
  runnerUrl?: string;
  containerState?: ContainerState;
  onFileSelect?: (file: GcsFileNode) => void;
  className?: string;
  style?: React.CSSProperties;
  topComponent?: React.ReactNode;
  bottomComponent?: React.ReactNode;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  tenantId = 'usr-123',
  bucketName,
  runnerUrl,
  containerState = 'warm',
  onFileSelect,
  className = '',
  style,
  topComponent,
  bottomComponent
}) => {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'row',
        height: '100%',
        width: '100%',
        backgroundColor: 'var(--surface)',
        color: 'var(--text)',
        borderRadius: '0',
        border: 'none',
        overflow: 'hidden',
        boxShadow: 'none',
        ...style
      }}
    >
      {/* ================= WORKSPACE SUBSYSTEM (7 SUB-SECTIONS) ================= */}
      <div style={{
        flex: 1,
        width: '100%',
        minWidth: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: 'var(--surface)'
      }}>
        {bottomComponent || topComponent || (
          <LiveAppPreview
            tenantId={tenantId}
            runnerUrl={runnerUrl}
            containerState={containerState}
          />
        )}
      </div>
    </div>
  );
};

export default RightPanel;
