'use client';

import React, { useState } from 'react';
import AppHeader from './AppHeader';
import AppSidebar from './AppSidebar';
import StatusBar from './StatusBar';

export interface WorkspaceLayoutProps {
  children: React.ReactNode;
  tenantId?: string;
  uiLang?: 'EN' | 'FR' | 'AR';
  setUiLang?: (lang: 'EN' | 'FR' | 'AR') => void;
  onOpenAccountModal?: () => void;
  activeSubsystem?: string;
  onSelectSubsystem?: (id: string) => void;
}

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  children,
  tenantId = 'usr-123',
  uiLang = 'EN',
  setUiLang,
  onOpenAccountModal,
  activeSubsystem = 'executions',
  onSelectSubsystem
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        backgroundColor: 'var(--surface)',
        color: 'var(--text)'
      }}
    >
      <AppHeader
        tenantId={tenantId}
        uiLang={uiLang}
        setUiLang={setUiLang}
        onOpenAccountModal={onOpenAccountModal}
        activeSubsystem={activeSubsystem}
      />

      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        <AppSidebar
          activeSubsystem={activeSubsystem}
          onSelectSubsystem={onSelectSubsystem || (() => {})}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
        />

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          {children}
        </main>
      </div>

      <StatusBar />
    </div>
  );
};

export default WorkspaceLayout;
