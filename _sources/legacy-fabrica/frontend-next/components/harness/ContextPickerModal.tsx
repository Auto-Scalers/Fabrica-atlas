'use client';

import React, { useState } from 'react';

export interface AttachedContextItem {
  id: string;
  type: 'file' | 'mission' | 'workspace';
  label: string;
  content: string;
  path?: string;
}

export interface ContextPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAttach: (items: AttachedContextItem[]) => void;
  missions?: any[];
  rawDataList?: any[];
  systemComponents?: any[];
}

export const ContextPickerModal: React.FC<ContextPickerModalProps> = ({
  isOpen,
  onClose,
  onAttach,
  missions = [],
  rawDataList = [],
  systemComponents = []
}) => {
  const [activeTab, setActiveTab] = useState<'files' | 'missions' | 'workspace'>('files');
  const [selectedMissions, setSelectedMissions] = useState<Record<string, boolean>>({});
  const [selectedWorkspaceItems, setSelectedWorkspaceItems] = useState<Record<string, boolean>>({});
  const [fileAttachments, setFileAttachments] = useState<AttachedContextItem[]>([]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = (evt.target?.result as string) || '';
        setFileAttachments(prev => [
          ...prev,
          {
            id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type: 'file',
            label: file.name,
            content: text.slice(0, 10000),
            path: (file as any).path || undefined
          }
        ]);
      };
      reader.readAsText(file);
    });
  };

  const handleConfirmAttach = () => {
    const attachedItems: AttachedContextItem[] = [...fileAttachments];

    missions.forEach((m) => {
      const id = m.id || m.name;
      if (selectedMissions[id]) {
        const title = m.title || m.name || id;
        const details = `Mission: "${title}" (Status: ${m.status || 'DRAFT'}, Phase: ${m.phase || 'draft'}). Objective: ${m.objective || m.description || 'N/A'}`;
        attachedItems.push({
          id: `mission-${id}`,
          type: 'mission',
          label: `Mission: ${title}`,
          content: details
        });
      }
    });

    rawDataList.forEach((d) => {
      const id = d.id || d.name;
      if (selectedWorkspaceItems[`data-${id}`]) {
        attachedItems.push({
          id: `workspace-data-${id}`,
          type: 'workspace',
          label: `Data Asset: ${d.name || id}`,
          content: `Data Asset: ${d.name || id} (${d.type || 'raw'}). Snippet: ${d.content || d.preview || 'N/A'}`
        });
      }
    });

    systemComponents.forEach((s) => {
      const id = s.id || s.name;
      if (selectedWorkspaceItems[`sys-${id}`]) {
        attachedItems.push({
          id: `workspace-sys-${id}`,
          type: 'workspace',
          label: `System Component: ${s.name || id}`,
          content: `System Component: ${s.name || id} (Role: ${s.role || 'Active'}). Description: ${s.description || 'N/A'}`
        });
      }
    });

    onAttach(attachedItems);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(9, 13, 22, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div
        style={{
          width: 'min(44rem, 90vw)',
          maxHeight: '85vh',
          background: 'var(--surface)',
          border: '2px solid var(--border)',
          borderRadius: '10px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1.5px solid var(--border-soft)', background: 'var(--surface-alt)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '14px' }}>📎</span>
            <b style={{ fontSize: '11px', color: 'var(--text)', textTransform: 'uppercase' }}>Attach Context to Prompt</b>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '14px' }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: '1px solid var(--border-soft)', background: 'rgba(0,0,0,0.1)' }}>
          <button
            onClick={() => setActiveTab('files')}
            style={{
              padding: '10px', fontSize: '10px', fontWeight: 800, cursor: 'pointer',
              background: activeTab === 'files' ? 'var(--surface)' : 'transparent',
              border: 'none', borderBottom: activeTab === 'files' ? '3px solid var(--accent)' : '3px solid transparent',
              color: activeTab === 'files' ? 'var(--accent)' : 'var(--muted)'
            }}
          >
            📄 Upload / Drop Files
          </button>
          <button
            onClick={() => setActiveTab('missions')}
            style={{
              padding: '10px', fontSize: '10px', fontWeight: 800, cursor: 'pointer',
              background: activeTab === 'missions' ? 'var(--surface)' : 'transparent',
              border: 'none', borderBottom: activeTab === 'missions' ? '3px solid #f59e0b' : '3px solid transparent',
              color: activeTab === 'missions' ? '#f59e0b' : 'var(--muted)'
            }}
          >
            🎯 Pick Missions ({missions.length})
          </button>
          <button
            onClick={() => setActiveTab('workspace')}
            style={{
              padding: '10px', fontSize: '10px', fontWeight: 800, cursor: 'pointer',
              background: activeTab === 'workspace' ? 'var(--surface)' : 'transparent',
              border: 'none', borderBottom: activeTab === 'workspace' ? '3px solid #10b981' : '3px solid transparent',
              color: activeTab === 'workspace' ? '#10b981' : 'var(--muted)'
            }}
          >
            📦 Workspace Data ({rawDataList.length + systemComponents.length})
          </button>
        </div>

        <div style={{ flex: 1, padding: '16px', overflowY: 'auto', minHeight: 0 }}>
          {activeTab === 'files' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label
                style={{
                  border: '2px dashed var(--border-soft)',
                  borderRadius: '8px',
                  padding: '24px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: 'var(--surface-alt)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span style={{ fontSize: '24px' }}>📂</span>
                <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text)' }}>Click or Drag Text Files Here</span>
                <span style={{ fontSize: '8px', color: 'var(--muted)' }}>Supports .md, .txt, .json, .js, .ts, .py, .css, .html files</span>
                <input type="file" multiple onChange={handleFileUpload} style={{ display: 'none' }} />
              </label>

              {fileAttachments.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '8px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>ATTACHED FILES:</span>
                  {fileAttachments.map((f) => (
                    <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-alt)', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border-soft)' }}>
                      <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text)' }}>📄 {f.label}</span>
                      <button onClick={() => setFileAttachments(prev => prev.filter(i => i.id !== f.id))} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '9px' }}>✕ Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'missions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {missions.length === 0 ? (
                <span style={{ fontSize: '9px', color: 'var(--muted)' }}>No active missions found in workspace.</span>
              ) : (
                missions.map((m) => {
                  const id = m.id || m.name;
                  const title = m.title || m.name || id;
                  const checked = Boolean(selectedMissions[id]);
                  return (
                    <label
                      key={id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '6px',
                        background: checked ? 'rgba(245, 158, 11, 0.12)' : 'var(--surface-alt)',
                        border: checked ? '1px solid #f59e0b' : '1px solid var(--border-soft)',
                        cursor: 'pointer'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => setSelectedMissions(prev => ({ ...prev, [id]: e.target.checked }))}
                        style={{ accentColor: '#f59e0b', cursor: 'pointer' }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                        <span style={{ fontSize: '9.5px', fontWeight: 800, color: 'var(--text)' }}>🎯 {title}</span>
                        <span style={{ fontSize: '7.5px', color: 'var(--muted)' }}>Status: {m.status || 'DRAFT'} • Phase: {m.phase || 'draft'}</span>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'workspace' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '8px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>RAW DATA ASSETS:</span>
                {rawDataList.length === 0 ? (
                  <span style={{ fontSize: '8.5px', color: 'var(--muted)' }}>None loaded</span>
                ) : (
                  rawDataList.map((d) => {
                    const id = d.id || d.name;
                    const key = `data-${id}`;
                    const checked = Boolean(selectedWorkspaceItems[key]);
                    return (
                      <label
                        key={key}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '4px',
                          background: checked ? 'rgba(16, 185, 129, 0.12)' : 'var(--surface-alt)',
                          border: checked ? '1px solid #10b981' : '1px solid var(--border-soft)',
                          cursor: 'pointer'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => setSelectedWorkspaceItems(prev => ({ ...prev, [key]: e.target.checked }))}
                          style={{ accentColor: '#10b981', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text)' }}>📊 {d.name || id}</span>
                      </label>
                    );
                  })
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '8px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>SYSTEM COMPONENTS:</span>
                {systemComponents.length === 0 ? (
                  <span style={{ fontSize: '8.5px', color: 'var(--muted)' }}>None registered</span>
                ) : (
                  systemComponents.map((s) => {
                    const id = s.id || s.name;
                    const key = `sys-${id}`;
                    const checked = Boolean(selectedWorkspaceItems[key]);
                    return (
                      <label
                        key={key}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '4px',
                          background: checked ? 'rgba(99, 102, 241, 0.12)' : 'var(--surface-alt)',
                          border: checked ? '1px solid var(--accent)' : '1px solid var(--border-soft)',
                          cursor: 'pointer'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => setSelectedWorkspaceItems(prev => ({ ...prev, [key]: e.target.checked }))}
                          style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text)' }}>⚙️ {s.name || id} ({s.role || 'Active'})</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 16px', borderTop: '1px solid var(--border-soft)', background: 'var(--surface-alt)' }}>
          <button onClick={onClose} style={{ padding: '6px 12px', fontSize: '9px', fontWeight: 800, background: 'var(--surface)', border: '1px solid var(--border-soft)', color: 'var(--text)', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleConfirmAttach} style={{ padding: '6px 14px', fontSize: '9px', fontWeight: 900, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}>Confirm & Attach Items</button>
        </div>
      </div>
    </div>
  );
};

export default ContextPickerModal;
