'use client';

import React from 'react';
import Link from 'next/link';

export interface AppHeaderProps {
  tenantId?: string;
  uiLang?: 'EN' | 'FR' | 'AR';
  setUiLang?: (lang: 'EN' | 'FR' | 'AR') => void;
  onOpenAccountModal?: () => void;
  activeSubsystem?: string;
  isAutonomyActive?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  tenantId = 'usr-123',
  uiLang = 'EN',
  setUiLang,
  onOpenAccountModal,
  activeSubsystem = 'executions',
  isAutonomyActive = true
}) => {
  return (
    <header
      style={{
        height: '44px',
        minHeight: '44px',
        maxHeight: '44px',
        backgroundColor: 'var(--surface-alt)',
        borderBottom: '1px solid var(--border-soft)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        boxSizing: 'border-box',
        zIndex: 50
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img
            src="/fabrica-logo-2d.jpg"
            alt="Fabrica"
            style={{ width: '24px', height: '24px', borderRadius: '6px', objectFit: 'cover' }}
          />
          <span style={{ fontSize: '13px', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            Fabrica<span style={{ color: 'var(--accent)' }}>.</span>
          </span>
        </Link>

        <span style={{ height: '14px', width: '1px', backgroundColor: 'var(--border-soft)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600 }}>TENANT:</span>
          <span style={{ fontSize: '10px', fontWeight: 800, fontFamily: 'var(--mono)', color: 'var(--text)' }}>
            {tenantId}
          </span>
          <span
            style={{
              fontSize: '8px',
              fontWeight: 800,
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: isAutonomyActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              color: isAutonomyActive ? 'var(--status-success)' : 'var(--status-warn)',
              border: `1px solid ${isAutonomyActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
            }}
          >
            {isAutonomyActive ? '⚡ 24/7 AUTONOMY' : '⏸️ MANUAL'}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {setUiLang && (
          <div style={{ display: 'flex', background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: '4px', padding: '1px' }}>
            {(['EN', 'FR', 'AR'] as const).map(lang => (
              <button
                key={lang}
                onClick={() => setUiLang(lang)}
                style={{
                  padding: '2px 6px',
                  fontSize: '9px',
                  fontWeight: 800,
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  backgroundColor: uiLang === lang ? 'var(--accent)' : 'transparent',
                  color: uiLang === lang ? 'var(--accent-contrast)' : 'var(--muted)'
                }}
              >
                {lang}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={onOpenAccountModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            fontSize: '10px',
            fontWeight: 800,
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border-soft)',
            color: 'var(--text)',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          <span>⚙️</span>
          <span>Workspace & Keys</span>
        </button>
      </div>
    </header>
  );
};

export default AppHeader;
