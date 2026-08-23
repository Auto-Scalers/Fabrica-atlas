'use client';

import React, { useState, useEffect, useRef } from 'react';

export interface InlineCodeEditorProps {
  activePath?: string;
  activeContent?: string;
  onSave?: (path: string, content: string) => void;
  onMinimize?: () => void;
  onMinimizeRight?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

const DEFAULT_WORKSPACE_FILES: Record<string, string> = {
  'src/server.ts': `import express from 'express';
import { runAgentCliTurn } from './core/harness';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const TENANT_ID = process.env.TENANT_ID || 'usr-123';

// GCS Mount Health Status Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    tenant_id: TENANT_ID,
    storage_type: 'GCS_DEDICATED_BUCKET',
    bucket: \`gs://fabrica-tenant-\${TENANT_ID}/\`,
    mount_path: '/mnt'
  });
});

// Execute Agent CLI Turn locally inside tenant Cloud Run container
app.post('/api/runner/turn', async (req, res) => {
  try {
    const workspaceRoot = '/mnt';
    const result = await runAgentCliTurn(TENANT_ID, workspaceRoot, req.body);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Execution error' });
  }
});

app.listen(PORT, () => {
  console.log(\`Fabrica Tenant Runner active on port \${PORT}\`);
});`,

  'App.tsx': `'use client';

import React, { useState } from 'react';

export default function App() {
  const [status, setStatus] = useState('Active');

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif', backgroundColor: '#0f172a', color: '#f8fafc', minHeight: '100vh' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#38bdf8' }}>⚡ Fabrica Live Application</h1>
        <span style={{ fontSize: '11px', background: 'rgba(56,189,248,0.15)', color: '#38bdf8', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(56,189,248,0.3)' }}>
          Container Status: {status}
        </span>
      </header>

      <main style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0' }}>📊 Real-Time Telemetry</h2>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>Connected to Cloud Run container cluster.</p>
        </div>
      </main>
    </div>
  );
}`,

  'discovery_doc.json': `{
  "title": "Discovery & Scoping Requirements",
  "target_audience": "Enterprise & Autonomous Developers",
  "scope": "24/7 Autonomy Harness & Multi-Tenant Container Setup",
  "status": "APPROVED",
  "author": "AI Architect",
  "created_at": "2026-08-06T08:00:00Z"
}`,

  'scoping.md': `# Project Scoping & Objectives
- **Goal**: Build scalable multi-tenant execution platform.
- **Security**: Isolated Cloud Run containers with GCS FUSE mount.
- **Autonomy**: Supervised agent loop with real-time feedback.
- **Architecture**: 7 sub-systems for discovery, research, analysis, synthesis, executions, reviews, completed.`,

  'deep_research.md': `# Deep Research Findings & Technical Benchmarks
- **Container Boot Latency**: <1.2s warm boot
- **Storage Performance**: GCS FUSE mount throughput 120MB/s
- **Model Latency**: Gemini 2.5 Flash sub-500ms response
- **Concurrency**: Tested to 50 active tenant workers without socket degradation.`,

  'data_analysis.csv': `timestamp,tenant_id,cpu_usage,memory_mb,status
2026-08-06T08:00:00Z,usr-123,12.4%,256,HEALTHY
2026-08-06T08:05:00Z,usr-123,18.1%,312,HEALTHY
2026-08-06T08:10:00Z,usr-123,14.2%,280,HEALTHY`,

  'synthesis_report.md': `# Strategic Architectural Synthesis
1. Unified live app preview with embedded code editor.
2. GCS persistent workspace file syncing.
3. Responsive 7-subsystem workflow orchestration across discovery, research, data, synthesis, execution, review, and completed states.`,

  'workspace-graph.json': `{
  "version": "2.0.0",
  "workspace_id": "ws-tenant-primary",
  "tenant_id": "usr-123",
  "storage_backend": "gcs_fuse_mount",
  "gcs_bucket": "gs://fabrica-tenant-usr-123/",
  "mount_path": "/mnt",
  "active_project": "default_project"
}`,

  'runtime-board.json': `{
  "runner_service": "fabrica-runner-usr-123",
  "region": "europe-west2",
  "autonomy_level": "supervised",
  "auto_missions": true,
  "max_iterations": 15,
  "thinking_level": "medium",
  "llm_model": "gemini-2.5-flash"
}`,

  'metadata.json': `{
  "name": "Fabrica",
  "description": "24/7 AI Autonomy and Scale.",
  "requestFramePermissions": [],
  "majorCapabilities": [
    "MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API"
  ]
}`,

  'audit_review.md': `# Security & Code Audit Review
- [x] ESLint & TypeScript compilation clean
- [x] Container sandbox isolation verified
- [x] GCS auto-save syncing operational
- [x] Live app preview and code editor synchronized`,

  'build_summary.log': `[BUILD SUCCESS] Turbopack production build finalized.
[DEPLOY SUCCESS] App live at container port 3000.
[HEALTH CHECK] All 7 workspace sub-systems verified operational.`,

  'package.json': `{
  "name": "fabrica-tenant-app",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "node server.ts"
  }
}`
};

const SUBSYSTEM_FILES_MAP: Record<string, string[]> = {
  discovery_scoping: ['discovery_doc.json', 'scoping.md', 'metadata.json'],
  deep_research: ['deep_research.md', 'research_notes.txt'],
  data_analysis: ['data_analysis.csv', 'metrics.json'],
  strategic_synthesis: ['synthesis_report.md', 'workspace-graph.json'],
  executions: ['src/', 'src/server.ts', 'App.tsx', 'package.json', 'runtime-board.json'],
  reviews: ['audit_review.md'],
  completed: ['build_summary.log']
};

export const InlineCodeEditor: React.FC<InlineCodeEditorProps> = ({
  activePath = 'src/server.ts',
  activeContent,
  onSave,
  onMinimize,
  onMinimizeRight,
  className = '',
  style
}) => {
  const [files, setFiles] = useState<Record<string, string>>(DEFAULT_WORKSPACE_FILES);
  const [selectedFile, setSelectedFile] = useState<string>(activePath);
  const [codeContent, setCodeContent] = useState<string>(activeContent || DEFAULT_WORKSPACE_FILES[activePath] || '');
  const [copied, setCopied] = useState(false);
  const [savedBadge, setSavedBadge] = useState(false);
  const [autoMonitor, setAutoMonitor] = useState<boolean>(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activePath) {
      setSelectedFile(activePath);
      const targetContent = activeContent ?? files[activePath] ?? DEFAULT_WORKSPACE_FILES[activePath] ?? `// ${activePath}\n`;
      setFiles(prev => ({
        ...prev,
        [activePath]: targetContent
      }));
      setCodeContent(targetContent);
    }
  }, [activePath, activeContent]);

  const handleSelectFile = (filePath: string) => {
    setFiles(prev => ({ ...prev, [selectedFile]: codeContent }));
    setSelectedFile(filePath);
    setCodeContent(files[filePath] || DEFAULT_WORKSPACE_FILES[filePath] || `// ${filePath}\n`);
  };

  const getCurrentSubsystemFiles = (currentFile: string): string[] => {
    for (const [, fileList] of Object.entries(SUBSYSTEM_FILES_MAP)) {
      if (fileList.some(f => f === currentFile || currentFile.startsWith(f) || f.startsWith(currentFile))) {
        return fileList;
      }
    }
    return Object.keys(files);
  };

  const handleSave = () => {
    setFiles(prev => ({ ...prev, [selectedFile]: codeContent }));
    if (onSave) {
      onSave(selectedFile, codeContent);
    }
    setSavedBadge(true);
    setTimeout(() => setSavedBadge(false), 2000);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(codeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleScroll = () => {
    if (textareaRef.current && lineNumsRef.current) {
      lineNumsRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const lines = codeContent.split('\n');
  const lineCount = lines.length;

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('/')) return '📁';
    if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) return '📘';
    if (fileName.endsWith('.json')) return '🟨';
    if (fileName.endsWith('.md')) return '📄';
    if (fileName.endsWith('.csv')) return '📊';
    if (fileName.endsWith('.log')) return '✅';
    return '📑';
  };

  const dropdownFiles = getCurrentSubsystemFiles(selectedFile);

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        backgroundColor: '#020617',
        color: '#f8fafc',
        borderLeft: '1px solid var(--border-soft)',
        overflow: 'hidden',
        boxSizing: 'border-box',
        ...style
      }}
    >
      <div
        style={{
          padding: '4px 8px',
          backgroundColor: '#0f172a',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px',
          height: '32px',
          minHeight: '32px',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
          {onMinimizeRight && (
            <button
              type="button"
              onClick={onMinimizeRight}
              title="Minimize Editor to the right"
              style={{
                height: '20px',
                minWidth: '20px',
                padding: '0 5px',
                fontSize: '9px',
                fontWeight: 800,
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                color: '#38bdf8',
                borderRadius: '3px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              ▶
            </button>
          )}
          <select
            value={selectedFile}
            onChange={(e) => handleSelectFile(e.target.value)}
            style={{
              fontSize: '9px',
              fontWeight: 800,
              fontFamily: 'var(--mono)',
              background: '#1e293b',
              color: '#38bdf8',
              border: '1px solid #334155',
              borderRadius: '3px',
              padding: '2px 6px',
              outline: 'none',
              cursor: 'pointer',
              maxWidth: '180px'
            }}
          >
            {dropdownFiles.map((filePath) => (
              <option key={filePath} value={filePath}>
                {getFileIcon(filePath)} {filePath}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setAutoMonitor(!autoMonitor)}
            title={`Auto Monitor is ${autoMonitor ? 'ENABLED' : 'DISABLED'} - Click to toggle`}
            style={{
              backgroundColor: autoMonitor ? 'rgba(16, 185, 129, 0.15)' : '#1e293b',
              border: `1px solid ${autoMonitor ? '#10b981' : '#334155'}`,
              color: autoMonitor ? '#10b981' : '#94a3b8',
              borderRadius: '3px',
              padding: '1px 4px',
              fontSize: '7.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              userSelect: 'none',
              lineHeight: 1
            }}
          >
            <span style={{ fontSize: '7px' }}>{autoMonitor ? '⚡' : '⚪'}</span>
            <span>Monitor {autoMonitor ? 'ON' : 'OFF'}</span>
          </button>
          <button
            onClick={handleCopy}
            title="Copy Code to Clipboard"
            style={{
              backgroundColor: copied ? 'rgba(16,185,129,0.2)' : '#1e293b',
              border: '1px solid #334155',
              color: copied ? '#10b981' : '#cbd5e1',
              borderRadius: '3px',
              padding: '2px 6px',
              fontSize: '8px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '3px'
            }}
          >
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>
          {onMinimize && (
            <button
              onClick={onMinimize}
              title="Minimize Preview & Editor sections as bottombar"
              style={{
                height: '20px',
                minWidth: '20px',
                padding: '0 5px',
                fontSize: '9px',
                fontWeight: 800,
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                color: '#38bdf8',
                borderRadius: '3px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: '4px',
                flexShrink: 0
              }}
            >
              ▼
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden', backgroundColor: '#020617' }}>
        <div
          ref={lineNumsRef}
          style={{
            width: '28px',
            padding: '4px 0',
            backgroundColor: '#090d16',
            color: '#475569',
            fontFamily: 'var(--mono, monospace)',
            fontSize: '8.5px',
            lineHeight: '1.4',
            textAlign: 'right',
            userSelect: 'none',
            overflow: 'hidden',
            borderRight: '1px solid #1e293b',
            boxSizing: 'border-box'
          }}
        >
          {Array.from({ length: lineCount }).map((_, idx) => (
            <div key={idx} style={{ paddingRight: '4px' }}>
              {idx + 1}
            </div>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          value={codeContent}
          onChange={(e) => setCodeContent(e.target.value)}
          onScroll={handleScroll}
          spellCheck={false}
          style={{
            flex: 1,
            height: '100%',
            backgroundColor: '#020617',
            color: '#e2e8f0',
            border: 'none',
            outline: 'none',
            padding: '4px 6px',
            fontFamily: 'var(--mono, monospace)',
            fontSize: '8.5px',
            lineHeight: '1.4',
            resize: 'none',
            whiteSpace: 'pre',
            tabSize: 2,
            overflow: 'auto'
          }}
        />
      </div>

      <div
        style={{
          padding: '2px 8px',
          backgroundColor: '#0f172a',
          borderTop: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '7.5px',
          color: '#64748b',
          fontFamily: 'var(--mono)',
          height: '20px',
          minHeight: '20px',
          flexShrink: 0
        }}
      >
        <span>{selectedFile} • UTF-8</span>
        <span>{lineCount} Lines • {codeContent.length} Chars</span>
        <span style={{ color: '#0ea5e9', fontWeight: 700 }}>🟢 GCS Auto-Save Ready</span>
      </div>
    </div>
  );
};

export default InlineCodeEditor;
