'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { workspaceApi } from '../api';

export interface GcsFileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  updatedAt?: string;
  content?: string;
  children?: GcsFileNode[];
}

interface GcsFileExplorerProps {
  tenantId?: string;
  bucketName?: string;
  workspaceRoot?: string;
  onFileSelect?: (file: GcsFileNode) => void;
  className?: string;
  treeOnly?: boolean;
  openModalOnSelect?: boolean;
  style?: React.CSSProperties;
}

function buildTreeFromItems(items: Array<{ name: string; relativePath: string; isDirectory: boolean; size?: number; updatedAt?: string }>): GcsFileNode[] {
  const rootNodes: GcsFileNode[] = [];
  const dirMap = new Map<string, GcsFileNode>();

  for (const item of items) {
    if (!item || !item.relativePath) continue;
    const parts = item.relativePath.split('/');
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;
      const isLast = i === parts.length - 1;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (!dirMap.has(currentPath)) {
        const isDir = !isLast || item.isDirectory;
        const node: GcsFileNode = {
          id: currentPath,
          name: part,
          path: currentPath,
          type: isDir ? 'directory' : 'file',
          size: isDir ? undefined : item.size || 0,
          updatedAt: item.updatedAt || new Date().toISOString(),
          children: isDir ? [] : undefined
        };
        dirMap.set(currentPath, node);

        if (i === 0) {
          rootNodes.push(node);
        } else {
          const parentPath = parts.slice(0, i).join('/');
          const parentNode = dirMap.get(parentPath);
          if (parentNode && parentNode.children) {
            parentNode.children.push(node);
          }
        }
      }
    }
  }

  return rootNodes;
}

export const GcsFileExplorer: React.FC<GcsFileExplorerProps> = ({
  tenantId = 'usr-123',
  bucketName,
  workspaceRoot = '/mnt',
  onFileSelect,
  className = '',
  treeOnly = false,
  openModalOnSelect = true,
  style
}) => {
  const actualBucket = bucketName || `gs://fabrica-tenant-${tenantId.toLowerCase().replace(/[^a-z0-9_\-]/g, '-')}/`;
  const [fileTree, setFileTree] = useState<GcsFileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<GcsFileNode | null>(null);
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [modalSelectedFile, setModalSelectedFile] = useState<GcsFileNode | null>(null);
  const [modalFileContent, setModalFileContent] = useState<string>('');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'workspace': true,
    'src': true,
    'missions': true,
    '.pi': false
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [autoMonitor, setAutoMonitor] = useState<boolean>(true);

  const loadWorkspaceFiles = async () => {
    try {
      const res = await workspaceApi.getWorkspaceFiles('');
      if (res && res.ok && Array.isArray(res.files)) {
        const tree = buildTreeFromItems(res.files);
        setFileTree(tree);
        if (tree.length > 0 && !selectedFile) {
          const firstFile = tree.find(n => n.type === 'file') || tree[0];
          setSelectedFile(firstFile);
        }
      }
    } catch (e) {
      console.warn('Error loading workspace files in GcsFileExplorer:', e);
    }
  };

  useEffect(() => {
    loadWorkspaceFiles();
  }, [tenantId]);

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders(prev => ({ ...prev, [folderPath]: !prev[folderPath] }));
  };

  const filterNodes = (nodes: GcsFileNode[], query: string): GcsFileNode[] => {
    if (!query.trim()) return nodes;
    const q = query.toLowerCase();
    
    return nodes.reduce<GcsFileNode[]>((acc, node) => {
      if (node.type === 'file') {
        if (node.name.toLowerCase().includes(q) || node.path.toLowerCase().includes(q)) {
          acc.push(node);
        }
      } else if (node.type === 'directory' && node.children) {
        const filteredChildren = filterNodes(node.children, query);
        if (filteredChildren.length > 0 || node.name.toLowerCase().includes(q)) {
          acc.push({ ...node, children: filteredChildren });
        }
      }
      return acc;
    }, []);
  };

  const filteredTree = useMemo(() => filterNodes(fileTree, searchQuery), [fileTree, searchQuery]);

  const handleSelectFile = async (file: GcsFileNode) => {
    setSelectedFile(file);
    setModalSelectedFile(file);
    setModalFileContent(file.content || 'Loading file content...');
    if (openModalOnSelect) {
      setIsEditorModalOpen(true);
    }
    if (onFileSelect) onFileSelect(file);

    try {
      const res = await workspaceApi.readWorkspaceFile(file.path);
      if (res && res.ok && typeof res.content === 'string') {
        const updatedFile = { ...file, content: res.content };
        setSelectedFile(updatedFile);
        setModalSelectedFile(updatedFile);
        setModalFileContent(res.content);
      }
    } catch (e) {
      console.warn(`Failed reading content for ${file.path}:`, e);
    }
  };

  const handleCopyContent = () => {
    if (!selectedFile?.content) return;
    navigator.clipboard.writeText(selectedFile.content);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  const handleDownloadFile = () => {
    if (!selectedFile) return;
    const blob = new Blob([selectedFile.content || ''], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRefreshTree = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const renderTreeNodes = (nodes: GcsFileNode[], level = 0) => {
    return nodes.map(node => {
      const isDir = node.type === 'directory';
      const isExpanded = expandedFolders[node.path];
      const isSelected = selectedFile?.path === node.path;

      return (
        <div key={node.id} style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            onClick={() => {
              if (isDir) {
                toggleFolder(node.path);
              } else {
                handleSelectFile(node);
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 8px',
              paddingLeft: `${level * 14 + 10}px`,
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
              fontFamily: 'var(--mono)',
              backgroundColor: isSelected ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'transparent',
              color: isSelected ? 'var(--accent)' : 'var(--text)',
              borderLeft: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
              transition: 'all 0.15s ease'
            }}
          >
            {isDir ? (
              <span style={{ fontSize: '10px', color: 'var(--muted)', width: '12px', textAlign: 'center' }}>
                {isExpanded ? '▼' : '▶'}
              </span>
            ) : (
              <span style={{ width: '12px' }} />
            )}

            <span style={{ fontSize: '12px' }}>
              {isDir ? (isExpanded ? '📂' : '📁') : getFileIcon(node.name)}
            </span>

            <span style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontWeight: isDir ? 700 : 400
            }}>
              {node.name}
            </span>

            {node.size && !isDir && (
              <span style={{ marginLeft: 'auto', fontSize: '9px', color: 'var(--muted)' }}>
                {formatFileSize(node.size)}
              </span>
            )}
          </div>

          {isDir && isExpanded && node.children && (
            <div>{renderTreeNodes(node.children, level + 1)}</div>
          )}
        </div>
      );
    });
  };

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        backgroundColor: 'var(--surface)',
        color: 'var(--text)',
        borderRadius: '0',
        border: 'none',
        overflow: 'hidden'
      }}
    >
      <div style={{
        padding: '2px 8px',
        backgroundColor: 'var(--surface-alt)',
        borderBottom: '1px solid var(--border-soft)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '4px',
        height: '28px',
        minHeight: '28px',
        maxHeight: '28px',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px' }}>💻</span>
          <span style={{ fontSize: '9.5px', fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--mono)', letterSpacing: '0.04em' }}>
            CODE & FILES
          </span>
        </div>

        <button
          onClick={handleRefreshTree}
          disabled={isRefreshing}
          title="Refresh Workspace Files"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-soft)',
            color: 'var(--muted)',
            borderRadius: '3px',
            padding: '1px 5px',
            fontSize: '9.5px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '3px'
          }}
        >
          <span style={{ display: 'inline-block', transform: isRefreshing ? 'rotate(360deg)' : 'none', transition: 'transform 0.5s' }}>
            🔄
          </span>
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0, width: '100%', overflow: 'hidden' }}>
        <div style={{
          width: treeOnly ? '100%' : '220px',
          borderRight: treeOnly ? 'none' : '1px solid var(--border-soft)',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--surface-alt)',
          height: '100%',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '6px' }}>
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '4px 8px',
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border-soft)',
                borderRadius: '4px',
                color: 'var(--text)',
                fontSize: '10px',
                outline: 'none',
                fontFamily: 'var(--mono)'
              }}
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '4px' }}>
            {filteredTree.length > 0 ? (
              renderTreeNodes(filteredTree)
            ) : (
              <div style={{ padding: '16px', textOverflow: 'ellipsis', fontSize: '10px', color: 'var(--muted)', textAlign: 'center' }}>
                No files found matching "{searchQuery}"
              </div>
            )}
          </div>

          <div style={{
            padding: '5px 8px',
            borderTop: '1px solid var(--border-soft)',
            fontSize: '8.5px',
            color: 'var(--muted)',
            fontFamily: 'var(--mono)',
            backgroundColor: 'var(--surface-alt)'
          }}>
            Workspace Root: <span style={{ color: 'var(--text)' }}>{workspaceRoot}</span>
          </div>
        </div>

        {!treeOnly && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--surface)', minWidth: 0 }}>
            {selectedFile ? (
              <>
                <div style={{
                  padding: '6px 12px',
                  backgroundColor: 'var(--surface-alt)',
                  borderBottom: '1px solid var(--border-soft)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <span style={{ fontSize: '13px' }}>{getFileIcon(selectedFile.name)}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedFile.path}
                      </div>
                      <div style={{ fontSize: '8.5px', color: 'var(--muted)', display: 'flex', gap: '8px' }}>
                        <span>Size: {formatFileSize(selectedFile.size || 0)}</span>
                        <span>Lines: {(selectedFile.content || '').split('\n').length}</span>
                        <span>GCS Updated: {selectedFile.updatedAt ? new Date(selectedFile.updatedAt).toLocaleTimeString() : 'Recent'}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setAutoMonitor(!autoMonitor)}
                      title={`Auto Monitor is ${autoMonitor ? 'ENABLED' : 'DISABLED'} - Click to toggle`}
                      style={{
                        backgroundColor: autoMonitor ? 'rgba(16, 185, 129, 0.15)' : 'var(--surface)',
                        border: `1px solid ${autoMonitor ? 'var(--status-success)' : 'var(--border-soft)'}`,
                        color: autoMonitor ? 'var(--status-success)' : 'var(--text-muted)',
                        borderRadius: '3px',
                        padding: '1px 5px',
                        fontSize: '8px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        userSelect: 'none',
                        transition: 'all 0.15s ease',
                        lineHeight: 1
                      }}
                    >
                      <span style={{ fontSize: '7.5px' }}>{autoMonitor ? '⚡' : '⚪'}</span>
                      <span>Monitor {autoMonitor ? 'ON' : 'OFF'}</span>
                    </button>
                    <button
                      onClick={handleCopyContent}
                      style={{
                        backgroundColor: copiedNotification ? 'rgba(16, 185, 129, 0.15)' : 'var(--surface)',
                        border: '1px solid var(--border-soft)',
                        color: copiedNotification ? 'var(--status-success)' : 'var(--text)',
                        borderRadius: '4px',
                        padding: '3px 8px',
                        fontSize: '9.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {copiedNotification ? '✓ Copied!' : '📋 Copy'}
                    </button>
                    <button
                      onClick={handleDownloadFile}
                      style={{
                        backgroundColor: 'var(--accent)',
                        border: 'none',
                        color: 'var(--accent-contrast)',
                        borderRadius: '4px',
                        padding: '3px 8px',
                        fontSize: '9.5px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      📥 Download
                    </button>
                  </div>
                </div>

                <div style={{ flex: 1, overflow: 'auto', padding: '10px', backgroundColor: 'var(--surface)' }}>
                  <pre style={{
                    margin: 0,
                    fontFamily: 'var(--mono)',
                    fontSize: '10.5px',
                    lineHeight: '1.6',
                    color: 'var(--text)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    <code>
                      {(selectedFile.content || '// Empty file').split('\n').map((line, idx) => (
                        <div key={idx} style={{ display: 'flex' }}>
                          <span style={{
                            width: '32px',
                            display: 'inline-block',
                            color: 'var(--muted)',
                            opacity: 0.7,
                            textAlign: 'right',
                            paddingRight: '10px',
                            userSelect: 'none',
                            flexShrink: 0
                          }}>
                            {idx + 1}
                          </span>
                          <span style={{ flex: 1 }}>{line || ' '}</span>
                        </div>
                      ))}
                    </code>
                  </pre>
                </div>
              </>
            ) : (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--muted)',
                gap: '8px'
              }}>
                <span style={{ fontSize: '24px' }}>📂</span>
                <span style={{ fontSize: '10px' }}>Select a file from the GCS tree to inspect its contents</span>
              </div>
            )}
          </div>
        )}
      </div>

      {isEditorModalOpen && modalSelectedFile && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99999,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '40px 280px 20px 20px'
        }}
        onClick={() => setIsEditorModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '750px',
              maxWidth: 'calc(100vw - 310px)',
              height: 'calc(100vh - 80px)',
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.5), 0 25px 50px -12px rgba(0, 0, 0, 0.6)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <div style={{
              padding: '10px 16px',
              backgroundColor: '#1e293b',
              borderBottom: '1px solid #334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <span style={{ fontSize: '18px' }}>{getFileIcon(modalSelectedFile.name)}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc', fontFamily: 'var(--mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {modalSelectedFile.path}
                  </div>
                  <div style={{ fontSize: '10px', color: '#94a3b8', display: 'flex', gap: '12px', marginTop: '2px' }}>
                    <span>Size: {formatFileSize(modalSelectedFile.size || 0)}</span>
                    <span>Lines: {(modalFileContent || '').split('\n').length}</span>
                    <span>Status: GCS Mount Synced</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(modalFileContent);
                    setCopiedNotification(true);
                    setTimeout(() => setCopiedNotification(false), 2000);
                  }}
                  style={{
                    backgroundColor: copiedNotification ? 'rgba(16, 185, 129, 0.2)' : '#0f172a',
                    border: '1px solid #334155',
                    color: copiedNotification ? '#10b981' : '#f1f5f9',
                    borderRadius: '4px',
                    padding: '5px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {copiedNotification ? '✓ Copied!' : '📋 Copy Code'}
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([modalFileContent], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = modalSelectedFile.name;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  style={{
                    backgroundColor: '#3b82f6',
                    border: 'none',
                    color: '#ffffff',
                    borderRadius: '4px',
                    padding: '5px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  📥 Download
                </button>
                <button
                  onClick={() => setIsEditorModalOpen(false)}
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#ef4444',
                    borderRadius: '4px',
                    padding: '5px 10px',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '12px', backgroundColor: '#020617', display: 'flex' }}>
              <textarea
                value={modalFileContent}
                onChange={(e) => setModalFileContent(e.target.value)}
                spellCheck={false}
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'transparent',
                  color: '#e2e8f0',
                  border: 'none',
                  outline: 'none',
                  fontFamily: 'var(--mono, monospace)',
                  fontSize: '12px',
                  lineHeight: '1.6',
                  resize: 'none',
                  whiteSpace: 'pre'
                }}
              />
            </div>

            <div style={{
              padding: '8px 16px',
              backgroundColor: '#1e293b',
              borderTop: '1px solid #334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '10px',
              color: '#94a3b8',
              fontFamily: 'var(--mono)'
            }}>
              <span>UTF-8 • Code Editor Window</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    setFileTree(prev => {
                      const updateNode = (nodes: GcsFileNode[]): GcsFileNode[] => {
                        return nodes.map(n => {
                          if (n.path === modalSelectedFile.path) {
                            return { ...n, content: modalFileContent, updatedAt: new Date().toISOString() };
                          }
                          if (n.children) {
                            return { ...n, children: updateNode(n.children) };
                          }
                          return n;
                        });
                      };
                      return updateNode(prev);
                    });
                    setIsEditorModalOpen(false);
                  }}
                  style={{
                    backgroundColor: '#10b981',
                    border: 'none',
                    color: '#ffffff',
                    padding: '4px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '10px',
                    fontWeight: 800
                  }}
                >
                  💾 Save & Close
                </button>
                <button
                  onClick={() => setIsEditorModalOpen(false)}
                  style={{
                    backgroundColor: '#334155',
                    border: '1px solid #475569',
                    color: '#f8fafc',
                    padding: '4px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '10px',
                    fontWeight: 700
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function getFileIcon(filename: string): string {
  if (filename.endsWith('.ts') || filename.endsWith('.tsx')) return '📘';
  if (filename.endsWith('.js') || filename.endsWith('.jsx')) return '🟨';
  if (filename.endsWith('.json')) return '⚙️';
  if (filename.endsWith('.md')) return '📝';
  if (filename.endsWith('.css')) return '🎨';
  if (filename.endsWith('.html')) return '🌐';
  if (filename.endsWith('.sh')) return '📜';
  return '📄';
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default GcsFileExplorer;
