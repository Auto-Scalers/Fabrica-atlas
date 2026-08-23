'use client';

import React from 'react';

export interface SubsystemNavItem {
  id: string;
  label: string;
  icon: string;
  phaseNumber: number;
}

export interface AppSidebarProps {
  activeSubsystem: string;
  onSelectSubsystem: (id: string) => void;
  subsystems?: SubsystemNavItem[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const DEFAULT_SUBSYSTEMS: SubsystemNavItem[] = [
  { id: 'discovery_scoping', label: '1. Discovery & Scoping', icon: '🔍', phaseNumber: 1 },
  { id: 'deep_research', label: '2. Deep Research', icon: '🔬', phaseNumber: 2 },
  { id: 'data_analysis', label: '3. Data & Metrics', icon: '📊', phaseNumber: 3 },
  { id: 'strategic_synthesis', label: '4. Strategic Synthesis', icon: '🧠', phaseNumber: 4 },
  { id: 'executions', label: '5. Code & Executions', icon: '⚙️', phaseNumber: 5 },
  { id: 'reviews', label: '6. Reviews & Audits', icon: '🛡️', phaseNumber: 6 },
  { id: 'completed', label: '7. Completed Deliverables', icon: '✅', phaseNumber: 7 },
];

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeSubsystem,
  onSelectSubsystem,
  subsystems = DEFAULT_SUBSYSTEMS,
  isCollapsed = false,
  onToggleCollapse
}) => {
  return (
    <aside
      style={{
        width: isCollapsed ? '48px' : '210px',
        height: '100%',
        backgroundColor: 'var(--surface-alt)',
        borderRight: '1px solid var(--border-soft)',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        transition: 'width 0.2s ease',
        flexShrink: 0
      }}
    >
      <div
        style={{
          padding: '8px',
          borderBottom: '1px solid var(--border-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between'
        }}
      >
        {!isCollapsed && (
          <span style={{ fontSize: '9px', fontWeight: 900, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            PIPELINE STAGES
          </span>
        )}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              fontSize: '11px',
              padding: '2px 4px'
            }}
          >
            {isCollapsed ? '▶' : '◀'}
          </button>
        )}
      </div>

      <nav style={{ flex: 1, padding: '6px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {subsystems.map((sub) => {
          const isActive = activeSubsystem === sub.id;
          return (
            <button
              key={sub.id}
              onClick={() => onSelectSubsystem(sub.id)}
              title={sub.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 10px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: isActive ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text)',
                borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.15s ease'
              }}
            >
              <span style={{ fontSize: '13px', flexShrink: 0 }}>{sub.icon}</span>
              {!isCollapsed && (
                <span style={{ fontSize: '10px', fontWeight: isActive ? 800 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sub.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default AppSidebar;
