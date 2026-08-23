'use client';

import React, { useState } from 'react';
import { ContainerState } from '../preview/LiveAppPreview';
import { tenantApi } from '../../lib/api/tenant.api';

interface ContainerStatusBadgeProps {
  tenantId?: string;
  containerState?: ContainerState;
  onWarmup?: () => void;
  onRestart?: () => void;
  className?: string;
}

export const ContainerStatusBadge: React.FC<ContainerStatusBadgeProps> = ({
  tenantId = 'default_user',
  containerState = 'warm',
  onWarmup,
  onRestart,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ top: 40, left: 10 });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  const handleGcsSync = async () => {
    setIsProcessing(true);
    setStatusMessage('Syncing GCS Bucket workspace storage...');
    try {
      const res = await tenantApi.gcsSync(tenantId);
      setStatusMessage(res.message || 'GCS Bucket workspace synced successfully!');
      if (onWarmup) onWarmup();
    } catch (err: any) {
      setStatusMessage(err.message || 'Failed to sync GCS Bucket');
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setTimeout(() => setStatusMessage(null), 2000);
      }, 1200);
    }
  };

  const handleContainerRestart = async () => {
    setIsProcessing(true);
    setStatusMessage('Rebooting dedicated user container instance...');
    try {
      const res = await tenantApi.containerRestart(tenantId);
      setStatusMessage(res.message || 'User container rebooted successfully!');
      if (onRestart) onRestart();
    } catch (err: any) {
      setStatusMessage(err.message || 'Failed to restart container');
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setTimeout(() => setStatusMessage(null), 2000);
      }, 1200);
    }
  };

  const handleGcsExport = async () => {
    setIsProcessing(true);
    setStatusMessage('Preparing GCS Bucket workspace backup (.zip)...');
    try {
      const res = await tenantApi.gcsExport(tenantId);
      setStatusMessage(res.message || 'Workspace archive generated!');
      if (res.downloadUrl) {
        window.open(res.downloadUrl, '_blank');
      }
    } catch (err: any) {
      setStatusMessage(err.message || 'Failed to export workspace');
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setTimeout(() => setStatusMessage(null), 2000);
      }, 1200);
    }
  };

  const handleGcsPurge = async () => {
    setIsProcessing(true);
    setStatusMessage('Purging temporary cache in GCS Bucket...');
    try {
      const res = await tenantApi.gcsPurge(tenantId);
      setStatusMessage(res.message || 'GCS Bucket storage cache purged!');
    } catch (err: any) {
      setStatusMessage(err.message || 'Failed to purge workspace');
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setTimeout(() => setStatusMessage(null), 2000);
      }, 1200);
    }
  };

  const togglePopover = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPopoverPos({
        top: rect.bottom + 6,
        left: Math.min(rect.left, window.innerWidth - 330)
      });
    }
    setIsOpen(!isOpen);
  };

  const getStatusColor = () => {
    switch (containerState) {
      case 'warm': return '#10b981';
      case 'waking_up': return '#f59e0b';
      case 'idle': default: return '#94a3b8';
    }
  };

  const getStatusBg = () => {
    switch (containerState) {
      case 'warm': return 'rgba(16, 185, 129, 0.12)';
      case 'waking_up': return 'rgba(245, 158, 11, 0.12)';
      case 'idle': default: return 'rgba(148, 163, 184, 0.12)';
    }
  };

  const getStatusLabel = () => {
    switch (containerState) {
      case 'warm': return 'Active (1 Inst)';
      case 'waking_up': return 'Waking Up...';
      case 'idle': default: return 'Idle ($0/mo)';
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} className={className}>
      <button
        ref={buttonRef}
        type="button"
        onClick={togglePopover}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
          backgroundColor: getStatusBg(),
          border: `1px solid ${getStatusColor()}`,
          borderRadius: '10px',
          padding: '1px 5px',
          fontSize: '7.5px',
          fontWeight: 800,
          color: getStatusColor(),
          cursor: 'pointer',
          outline: 'none',
          transition: 'all 0.15s ease'
        }}
      >
        <span style={{
          display: 'inline-block',
          width: '5px',
          height: '5px',
          borderRadius: '50%',
          backgroundColor: getStatusColor(),
          boxShadow: `0 0 4px ${getStatusColor()}`
        }} />
        <span>{getStatusLabel()}</span>
        <span style={{ fontSize: '7px', opacity: 0.7 }}>▼</span>
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed',
          top: `${popoverPos.top}px`,
          left: `${Math.max(8, popoverPos.left)}px`,
          zIndex: 999999,
          width: '320px',
          backgroundColor: 'var(--surface-alt)',
          border: '1px solid var(--border-soft)',
          borderRadius: '8px',
          padding: '14px',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.45)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-soft)', paddingBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '14px' }}>☁️</span>
              <span style={{ fontSize: '11px', fontWeight: 900, color: 'var(--text-bright)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                User Container Diagnostics
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: '12px', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted)' }}>Container Status:</span>
              <span style={{ color: getStatusColor(), fontWeight: 800 }}>{getStatusLabel()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted)' }}>Compute Spec:</span>
              <span style={{ color: 'var(--text)', fontWeight: 700 }}>1 vCPU / 2 GiB RAM</span>
            </div>
          </div>

          {statusMessage && (
            <div style={{
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid #3b82f6',
              color: '#60a5fa',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '9.5px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>{isProcessing ? '⏳' : '✓'}</span>
              <span>{statusMessage}</span>
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: '10px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleGcsSync}
              style={{
                backgroundColor: 'var(--accent)',
                border: 'none',
                borderRadius: '6px',
                color: 'var(--accent-contrast)',
                fontSize: '9.5px',
                fontWeight: 800,
                padding: '6px 8px',
                cursor: isProcessing ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              <span>☁️</span>
              <span>GCS Bucket Sync</span>
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={handleContainerRestart}
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border-soft)',
                color: 'var(--text)',
                borderRadius: '6px',
                padding: '6px 8px',
                fontSize: '9.5px',
                fontWeight: 800,
                cursor: isProcessing ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              <span>🔄</span>
              <span>Restart Container</span>
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={handleGcsExport}
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border-soft)',
                color: '#8b5cf6',
                borderRadius: '6px',
                padding: '6px 8px',
                fontSize: '9.5px',
                fontWeight: 800,
                cursor: isProcessing ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              <span>📥</span>
              <span>Export GCS Bucket</span>
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={handleGcsPurge}
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                borderRadius: '6px',
                padding: '6px 8px',
                fontSize: '9.5px',
                fontWeight: 800,
                cursor: isProcessing ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              <span>🧹</span>
              <span>Purge GCS Bucket</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContainerStatusBadge;
