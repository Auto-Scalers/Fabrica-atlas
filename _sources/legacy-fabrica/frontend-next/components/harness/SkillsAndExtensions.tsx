'use client';

import { useState, useMemo, useEffect } from 'react';
import { ToolboxesYaml } from '../workspace/types';
import { api } from '../api';
import { harnessApi } from './api';

interface Props {
  entityName: string;
  toolboxes: ToolboxesYaml;
  onRefresh?: () => void;
  showToast?: (message: string, type: 'success' | 'info' | 'error') => void;
  initialTab?: 'skills' | 'extensions';
}

export interface SkillMetadata {
  what: string;
  when: string;
  why: string;
  triggers: string;
  inputs: string;
  outputs: string;
}

export interface PresetIntegration {
  id: string;
  name: string;
  icon: string;
  badge: string;
  category: string;
  description: string;
}

export interface IntegrationCategory {
  id: string;
  title: string;
  description: string;
  items: PresetIntegration[];
}

export const PRESET_INTEGRATION_CATEGORIES: IntegrationCategory[] = [
  {
    id: 'storage_pm',
    title: 'Storage & Project Management',
    description: 'Connect the tools where your work already lives, so Fabrica can pull source material in and push finished deliverables out — no manual copy-pasting between apps. Or Connect your engineering and product workflows so mission deliverables land where your team already tracks work, instead of sitting in Fabrica alone.',
    items: [
      { id: 'github', name: 'GitHub', icon: '🐙', badge: 'Code & Releases', category: 'storage_pm', description: 'Sync code, pull requests, issue tracking, and automated deployment triggers.' },
      { id: 'gdrive', name: 'Google Drive', icon: '📁', badge: 'Cloud Assets', category: 'storage_pm', description: 'Read & store workspace files, shared documents, and media deliverables.' },
      { id: 'gsheets', name: 'Google Sheets', icon: '📊', badge: 'Live Data', category: 'storage_pm', description: 'Stream mission metrics, CSV logs, and structured row data directly.' },
      { id: 'notion', name: 'Notion', icon: '📝', badge: 'Docs & Wiki', category: 'storage_pm', description: 'Import knowledge bases and publish formatted mission briefs & docs.' },
      { id: 'jira', name: 'Jira', icon: '📐', badge: 'Issue Tracker', category: 'storage_pm', description: 'Create and update tickets, sprint items, and development epics.' },
      { id: 'linear', name: 'Linear', icon: '🎯', badge: 'Product Backlog', category: 'storage_pm', description: 'Streamline issue sync, cycle planning, and team roadmap updates.' }
    ]
  },
  {
    id: 'messaging',
    title: 'Messaging & Team Control',
    description: 'Reach your agent — Run and monitor and let it reach you your community or teammates.',
    items: [
      { id: 'telegram', name: 'Telegram', icon: '✈️', badge: 'Instant Bot', category: 'messaging', description: 'Send instant status updates, interactive approvals, and receive prompt commands.' },
      { id: 'slack', name: 'Slack', icon: '💬', badge: 'Workspace Bot', category: 'messaging', description: 'Post alerts, run standups, and listen for user commands in your team channels.' },
      { id: 'discord', name: 'Discord', icon: '🎮', badge: 'Community Bot', category: 'messaging', description: 'Interact with community channels, trigger missions, and broadcast updates.' },
      { id: 'whatsapp', name: 'WhatsApp', icon: '🟢', badge: 'Direct Messaging', category: 'messaging', description: 'Receive direct status reports and issue text prompts on WhatsApp.' }
    ]
  },
  {
    id: 'customer',
    title: 'Customer Interactions & Community Management',
    description: 'Let your agent handle customer conversations, community management, phone calls and SMS. Let him talk to clients and customers, including by phone. Bring in the platforms your audience lives.',
    items: [
      { id: 'gmail', name: 'Gmail', icon: '✉️', badge: 'Email Support', category: 'customer', description: 'Auto-reply to customer support emails, draft responses, and digest inquiries.' },
      { id: 'whatsapp_cust', name: 'WhatsApp (Client)', icon: '🟢', badge: 'Client Direct', category: 'customer', description: 'Engage in 1-on-1 customer conversations and send order notifications.' },
      { id: 'messenger', name: 'Messenger', icon: '💬', badge: 'Meta Messaging', category: 'customer', description: 'Handle page message inquiries and automated response routing.' },
      { id: 'discord_community', name: 'Discord (Community)', icon: '🎮', badge: 'Community Support', category: 'customer', description: 'Moderate community threads, answer FAQs, and assist server members.' },
      { id: 'instagram', name: 'Instagram', icon: '📸', badge: 'Direct Messages', category: 'customer', description: 'Manage Instagram DMs, comment responses, and brand interactions.' },
      { id: 'facebook', name: 'Facebook', icon: '📘', badge: 'Page Inbox', category: 'customer', description: 'Monitor page posts, customer reviews, and inbox messages.' }
    ]
  },
  {
    id: 'automations',
    title: 'Automations & Workflows',
    description: "Bring in thousands of additional apps through one integration — so you're never blocked waiting on a new connector.",
    items: [
      { id: 'n8n', name: 'n8n', icon: '⚡', badge: 'Self-Hosted Flow', category: 'automations', description: 'Trigger complex multi-step backend workflows and local webhooks.' },
      { id: 'zapier', name: 'Zapier', icon: '🟠', badge: '5,000+ Apps', category: 'automations', description: 'Connect with thousands of third-party web apps instantly via Zaps.' }
    ]
  },
  {
    id: 'business',
    title: 'Business & Commerce',
    description: "Give your agent visibility into real operational and sales data, so it reflects what's actually happening in your business, not just outside research.",
    items: [
      { id: 'odoo', name: 'Odoo', icon: '🟪', badge: 'ERP & Models', category: 'business', description: 'Sync products, invoices, CRM pipelines, and warehouse inventories.' },
      { id: 'shopify', name: 'Shopify', icon: '🛍️', badge: 'E-Commerce Store', category: 'business', description: 'Query active products, analyze order volumes, and track fulfillments.' },
      { id: 'stripe', name: 'Stripe', icon: '💳', badge: 'Payments & MRR', category: 'business', description: 'Monitor revenue, subscription churn, and process payment links.' }
    ]
  },
  {
    id: 'creative',
    title: 'Creative Generation & Voice',
    description: 'Bring in visual, 3D generation and voice tools directly into your Execution phase.',
    items: [
      { id: 'higgsfield', name: 'Higgsfield', icon: '🎬', badge: 'AI Video Gen', category: 'creative', description: 'Generate high-fidelity motion video sequences for media campaigns.' },
      { id: 'blender', name: 'Blender', icon: '🧊', badge: '3D Render Engine', category: 'creative', description: 'Execute 3D asset generation scripts and automated scene rendering.' },
      { id: 'twilio', name: 'Twilio', icon: '📞', badge: 'Voice & SMS', category: 'creative', description: 'Initiate AI voice calls, interactive IVR dialogues, and SMS dispatches.' }
    ]
  }
];

export function parseSkillMd(content: string, defaultFolder: string = ''): { metadata: SkillMetadata; body: string } {
  const metadata: SkillMetadata = {
    what: '',
    when: '',
    why: '',
    triggers: '',
    inputs: '',
    outputs: ''
  };

  let body = content || '';
  if (!content) return { metadata, body: '' };

  if (content.trim().startsWith('---')) {
    const endYaml = content.indexOf('---', 3);
    if (endYaml !== -1) {
      const yamlStr = content.slice(3, endYaml);
      body = content.slice(endYaml + 3).trim();

      const lines = yamlStr.split('\n');
      for (const line of lines) {
        const idx = line.indexOf(':');
        if (idx !== -1) {
          const key = line.slice(0, idx).trim().toLowerCase();
          const val = line.slice(idx + 1).trim();
          if ((key === 'what' || key === 'description' || key === 'name') && !metadata.what) metadata.what = val;
          if ((key === 'when' || key === 'when_to_use') && !metadata.when) metadata.when = val;
          if ((key === 'why' || key === 'rationale' || key === 'purpose') && !metadata.why) metadata.why = val;
          if ((key === 'triggers' || key === 'trigger_keywords' || key === 'keywords') && !metadata.triggers) metadata.triggers = val;
          if ((key === 'inputs' || key === 'input' || key === 'params') && !metadata.inputs) metadata.inputs = val;
          if ((key === 'outputs' || key === 'output' || key === 'results') && !metadata.outputs) metadata.outputs = val;
        }
      }
      return { metadata, body };
    }
  }

  const metaMatch = content.match(/##\s*Metadata\s*([\s\S]*?)(?=(?:\n#+|\n\n#+|$))/i);
  if (metaMatch) {
    const metaBlock = metaMatch[1];
    body = content.replace(/##\s*Metadata\s*[\s\S]*?(?=(?:\n#+|\n\n#+|$))/i, '').trim();

    const lines = metaBlock.split('\n');
    for (const line of lines) {
      const cleanLine = line.replace(/^[*\-\s]+/, '').trim();
      const idx = cleanLine.indexOf(':');
      if (idx !== -1) {
        const key = cleanLine.slice(0, idx).replace(/\*/g, '').trim().toLowerCase();
        const val = cleanLine.slice(idx + 1).replace(/\*/g, '').trim();
        if ((key === 'what' || key === 'description') && !metadata.what) metadata.what = val;
        if ((key === 'when' || key === 'when_to_use') && !metadata.when) metadata.when = val;
        if ((key === 'why' || key === 'rationale' || key === 'purpose') && !metadata.why) metadata.why = val;
        if ((key === 'triggers' || key === 'trigger keywords' || key === 'trigger_keywords' || key === 'keywords') && !metadata.triggers) metadata.triggers = val;
        if ((key === 'inputs' || key === 'input' || key === 'params') && !metadata.inputs) metadata.inputs = val;
        if ((key === 'outputs' || key === 'output' || key === 'results') && !metadata.outputs) metadata.outputs = val;
      }
    }
    return { metadata, body };
  }

  return { metadata, body };
}

export function serializeSkillMd(metadata: SkillMetadata, body: string): string {
  return `## Metadata
- **What**: ${metadata.what || ''}
- **When**: ${metadata.when || ''}
- **Why**: ${metadata.why || ''}
- **Triggers**: ${metadata.triggers || ''}
- **Inputs**: ${metadata.inputs || ''}
- **Outputs**: ${metadata.outputs || ''}

# Skill Body
${body || ''}`;
}

export interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children: TreeNode[];
}

export function buildFileTree(items: Array<{ name: string; path: string; type: 'file' | 'folder' }>): TreeNode[] {
  const root: TreeNode[] = [];
  const map: { [path: string]: TreeNode } = {};

  const sorted = [...items].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.path.localeCompare(b.path);
  });

  for (const item of sorted) {
    const parts = item.path.split('/');
    const node: TreeNode = {
      name: item.name,
      path: item.path,
      type: item.type,
      children: []
    };
    map[item.path] = node;

    if (parts.length === 1) {
      root.push(node);
    } else {
      const parentPath = parts.slice(0, parts.length - 1).join('/');
      if (map[parentPath]) {
        map[parentPath].children.push(node);
      } else {
        root.push(node);
      }
    }
  }

  return root;
}

const iconBtnStyle: React.CSSProperties = {
  fontSize: '7.5px',
  fontWeight: 700,
  padding: '1px 5px',
  background: 'var(--surface-alt)',
  border: '1px solid var(--border-soft)',
  borderRadius: '3px',
  color: 'var(--text)',
  cursor: 'pointer'
};

export function DirectoryTreeView({
  nodes,
  level = 0,
  activePath,
  onSelectFile,
  editable,
  onAddFile,
  onAddFolder,
  onRename,
  onDelete
}: {
  nodes: TreeNode[];
  level?: number;
  activePath?: string;
  onSelectFile?: (path: string) => void;
  editable?: boolean;
  onAddFile?: (parentPath: string) => void;
  onAddFolder?: (parentPath: string) => void;
  onRename?: (oldPath: string) => void;
  onDelete?: (path: string) => void;
}) {
  if (!nodes || nodes.length === 0) {
    return <div style={{ fontSize: '8px', color: 'var(--muted)', paddingLeft: level ? `${level * 10}px` : '0px' }}>Empty directory</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: level ? `${level * 10}px` : '0px' }}>
      {nodes.map(node => (
        <div key={node.path} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '2px 5px',
              borderRadius: '3px',
              background: activePath === node.path ? 'rgba(192, 132, 252, 0.2)' : 'transparent',
              cursor: node.type === 'file' ? 'pointer' : 'default',
              fontSize: '8.5px',
              fontFamily: 'var(--mono)'
            }}
            onClick={() => {
              if (node.type === 'file' && onSelectFile) onSelectFile(node.path);
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
              <span>{node.type === 'folder' ? '📁' : '📄'}</span>
              <span style={{ color: 'var(--text)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {node.name}
              </span>
            </div>

            {editable && (
              <div style={{ display: 'flex', gap: '3px' }}>
                {node.type === 'folder' && (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); onAddFile && onAddFile(node.path); }} style={iconBtnStyle}>+📄</button>
                    <button onClick={(e) => { e.stopPropagation(); onAddFolder && onAddFolder(node.path); }} style={iconBtnStyle}>+📁</button>
                  </>
                )}
                <button onClick={(e) => { e.stopPropagation(); onRename && onRename(node.path); }} style={iconBtnStyle}>✏️</button>
                {node.name !== 'SKILL.md' && (
                  <button onClick={(e) => { e.stopPropagation(); onDelete && onDelete(node.path); }} style={{ ...iconBtnStyle, color: '#ef4444' }}>🗑️</button>
                )}
              </div>
            )}
          </div>

          {node.children && node.children.length > 0 && (
            <DirectoryTreeView
              nodes={node.children}
              level={level + 1}
              activePath={activePath}
              onSelectFile={onSelectFile}
              editable={editable}
              onAddFile={onAddFile}
              onAddFolder={onAddFolder}
              onRename={onRename}
              onDelete={onDelete}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function PlatformIcon({ id, size = 20 }: { id: string; size?: number }) {
  switch (id) {
    case 'github':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--text)' }}>
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
        </svg>
      );
    case 'gdrive':
      return (
        <svg width={size} height={size} viewBox="0 0 87.3 78" fill="none">
          <path d="M6.6 66.85l12.8-22.15h51.8l-12.8 22.15z" fill="#0066DA" />
          <path d="M43.65 2.3l29.1 50.4H43.65l-29.1-50.4z" fill="#00AC47" />
          <path d="M43.65 2.3L28.1 29.25 1.45 75.5h29.1l28.65-49.65z" fill="#EA4335" />
          <path d="M43.65 2.3L14.55 52.7h58.2z" fill="#FFBA00" />
        </svg>
      );
    case 'gsheets':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" fill="#0F9D58" />
          <path d="M14 2V8H20L14 2Z" fill="#87CEAC" />
          <path d="M8 13H16V14.5H8V13ZM8 16H16V17.5H8V16ZM8 10H13V11.5H8V10Z" fill="white" />
        </svg>
      );
    case 'notion':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--text)' }}>
          <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l11.394-.7c.326-.02.42-.14.326-.42l-1.12-1.493a1.43 1.43 0 00-1.12-.513L3.899 2.215c-.466.023-.653.21-.513.653l1.073 1.34zm.84 3.033v13.64c0 .653.326.98.98.933l12.839-.747c.653-.047.887-.42.887-1.073V6.26c0-.653-.28-.933-.887-.887l-12.84.747c-.653.047-.98.373-.98.98l.001.141zm3.78 1.4l7.14-.42c.42-.023.513.187.513.466v9.846c0 .42-.233.606-.653.653l-2.007.117v-6.767l-2.986 6.347-1.913.117V8.987l-1.026.047c-.373.023-.49-.14-.49-.373v-.56l1.423-.023z" />
        </svg>
      );
    case 'jira':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M11.571 11.429H.143v6.714A5.714 5.714 0 005.857 23.857h5.714V11.43z" fill="url(#jira1)" />
          <path d="M11.571.143H5.857A5.714 5.714 0 00.143 5.857v5.572h11.428V.143z" fill="#2684FF" />
          <path d="M23.857 11.429H12.429v12.428h5.714a5.714 5.714 0 005.714-5.714v-6.714z" fill="url(#jira2)" />
          <defs>
            <linearGradient id="jira1" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0052CC" />
              <stop offset="100%" stopColor="#2684FF" />
            </linearGradient>
            <linearGradient id="jira2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0052CC" />
              <stop offset="100%" stopColor="#2684FF" />
            </linearGradient>
          </defs>
        </svg>
      );
    case 'linear':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M3.182 12A8.818 8.818 0 0112 3.182c.983 0 1.93.161 2.812.458L3.64 14.812A8.777 8.777 0 013.182 12zm1.61 5.093l11.115-11.115a8.818 8.818 0 012.911 6.022c0 4.87-3.948 8.818-8.818 8.818a8.778 8.778 0 01-5.208-1.725z" fill="#5E6AD2" />
        </svg>
      );
    case 'telegram':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="12" fill="#229ED9" />
          <path d="M5.425 11.871l12.822-4.945c.594-.215 1.112.14.919.98l-2.183 10.288c-.161.724-.59.9-1.194.562l-3.328-2.453-1.606 1.547c-.178.178-.328.328-.671.328l.239-3.392 6.174-5.577c.269-.239-.059-.371-.418-.132l-7.632 4.805-3.288-1.026c-.715-.224-.729-.715.15-1.055z" fill="white" />
        </svg>
      );
    case 'slack':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313z" fill="#E01E5A" />
          <path d="M8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zM8.834 6.313a2.527 2.527 0 012.521 2.521 2.527 2.527 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312z" fill="#36C5F0" />
          <path d="M18.956 8.834a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 01-2.523 2.521 2.527 2.527 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.165 0a2.528 2.528 0 012.523 2.522v6.312z" fill="#2EB67D" />
          <path d="M15.165 18.956a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.165 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 01-2.52-2.523 2.526 2.526 0 012.52-2.52h6.313A2.527 2.527 0 0124 15.165a2.528 2.528 0 01-2.522 2.523h-6.313z" fill="#ECB22E" />
        </svg>
      );
    case 'discord':
    case 'discord_community':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 01.078-.01 13.923 13.923 0 0012.235 0 .075.075 0 01.079.01c.12.098.246.195.373.288a.077.077 0 01-.006.127c-.6.33-1.225.626-1.873.893a.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" fill="#5865F2" />
        </svg>
      );
    case 'whatsapp':
    case 'whatsapp_cust':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347z" fill="#25D366" />
          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 2.159.684 4.158 1.848 5.795L2.5 21.5l3.821-1.295A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.962 7.962 0 01-4.067-1.111l-.291-.173-2.27.769.782-2.203-.19-.302A7.964 7.964 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z" fill="#25D366" />
        </svg>
      );
    case 'gmail':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M22 6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6Z" fill="#F8F9FA" />
          <path d="M20 4H18V13.5L12 8.5L6 13.5V4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H6V11L12 16L18 11V20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4Z" fill="#EA4335" />
          <path d="M18 4H20C21.1 4 22 4.9 22 6V7L12 14.5L2 7V6C2 4.9 2.9 4 4 4H6" fill="#C5221F" />
          <path d="M2 6V18C2 19.1 2.9 20 4 20H6V10.5L2 7.5V6Z" fill="#4285F4" />
          <path d="M22 6V18C22 19.1 21.1 20 20 20H18V10.5L22 7.5V6Z" fill="#34A853" />
          <path d="M6 10.5V20H18V10.5L12 15.5L6 10.5Z" fill="#FBBC04" />
        </svg>
      );
    case 'messenger':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.91 1.45 5.513 3.717 7.202V22l3.39-1.862c.938.26 1.93.4 2.893.4 5.523 0 10-4.145 10-9.258C22 6.145 17.523 2 12 2zm1.06 12.383l-2.584-2.753-5.044 2.753 5.548-5.89 2.642 2.753 4.986-2.753-5.548 5.89z" fill="url(#messengerGrad)" />
          <defs>
            <linearGradient id="messengerGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0084FF" />
              <stop offset="50%" stopColor="#A033FF" />
              <stop offset="100%" stopColor="#FF5280" />
            </linearGradient>
          </defs>
        </svg>
      );
    case 'instagram':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#instaGrad)" />
          <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="2" fill="none" />
          <circle cx="17" cy="7" r="1.2" fill="white" />
          <defs>
            <radialGradient id="instaGrad" cx="30%" cy="107%" r="130%">
              <stop offset="0%" stopColor="#fdf497" />
              <stop offset="5%" stopColor="#fdf497" />
              <stop offset="45%" stopColor="#fd5949" />
              <stop offset="60%" stopColor="#d6249f" />
              <stop offset="90%" stopColor="#285AEB" />
            </radialGradient>
          </defs>
        </svg>
      );
    case 'facebook':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2" />
          <path d="M16.671 15.543l.532-3.47h-3.328v-2.25c0-.949.465-1.874 1.956-1.874h1.513V4.996s-1.374-.235-2.686-.235c-2.741 0-4.533 1.662-4.533 4.669v2.633H7.078v3.47h3.047v8.385a12.09 12.09 0 003.75 0v-8.385h2.796z" fill="white" />
        </svg>
      );
    case 'n8n':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <rect x="2" y="2" width="20" height="20" rx="5" fill="#FF6D5A" />
          <path d="M6 16V8l4 8V8m4 8V8l4 8V8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'zapier':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" fill="#FF4A00" />
          <path d="M13.5 4L5 13.5h6.5L10.5 20l8.5-9.5h-6.5L13.5 4z" fill="white" />
        </svg>
      );
    case 'odoo':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <rect x="2" y="2" width="20" height="20" rx="6" fill="#714B67" />
          <path d="M12 6a6 6 0 100 12 6 6 0 000-12zm0 8a2 2 0 110-4 2 2 0 010 4z" fill="white" />
        </svg>
      );
    case 'shopify':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M15.3 3.6l1.2 3.2 2.6.4c.3 0 .5.3.4.6l-1.8 8.8c-.1.3-.3.5-.6.5H6.9c-.3 0-.5-.2-.6-.5L4.5 7.8c-.1-.3.1-.6.4-.6l2.6-.4 1.2-3.2c.1-.3.4-.5.7-.5h5.2c.3 0 .6.2.7.5zm-3.3.9h-2l-.9 2.3h3.8l-.9-2.3z" fill="#95BF47" />
        </svg>
      );
    case 'stripe':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.763-1.444 2.117-1.444 2.398 0 4.296 1.002 4.296 1.002l.85-3.693s-1.898-.828-4.708-.828c-4.382 0-7.391 2.29-7.391 5.673 0 4.672 6.434 4.908 6.434 7.424 0 .975-.867 1.579-2.383 1.579-2.73 0-5.188-1.259-5.188-1.259l-.91 3.829s2.41 1.082 5.753 1.082c4.686 0 7.625-2.222 7.625-5.787 0-4.99-6.559-5.118-6.559-7.589z" fill="#635BFF" />
        </svg>
      );
    case 'higgsfield':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" fill="url(#higgsGrad)" />
          <path d="M9.5 8.5l6 3.5-6 3.5v-7z" fill="white" />
          <defs>
            <linearGradient id="higgsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A855F7" />
              <stop offset="100%" stopColor="#EC4899" />
            </linearGradient>
          </defs>
        </svg>
      );
    case 'blender':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="5" fill="#265787" />
          <circle cx="12" cy="12" r="2.5" fill="white" />
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 16c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z" fill="#E87D0D" opacity="0.85" />
          <path d="M12 4l3 5h-6l3-5z" fill="#E87D0D" />
        </svg>
      );
    case 'twilio':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" fill="#F22F46" />
          <circle cx="8" cy="8" r="2" fill="white" />
          <circle cx="16" cy="8" r="2" fill="white" />
          <circle cx="8" cy="16" r="2" fill="white" />
          <circle cx="16" cy="16" r="2" fill="white" />
        </svg>
      );
    default:
      return <span>🔌</span>;
  }
}

function PresetIntegrationCard({
  item,
  isEnabled,
  onToggle,
  onConfigure
}: {
  item: PresetIntegration;
  isEnabled: boolean;
  onToggle: () => void;
  onConfigure: () => void;
}) {
  return (
    <div
      style={{
        background: 'var(--surface-alt)',
        border: isEnabled ? '1px solid rgba(6, 182, 212, 0.45)' : '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-md)',
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '12px',
        transition: 'all 0.2s ease',
        boxShadow: isEnabled ? '0 4px 14px rgba(6, 182, 212, 0.08)' : 'none'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: isEnabled ? 'rgba(6, 182, 212, 0.12)' : 'var(--surface)',
              border: isEnabled ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid var(--border-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <PlatformIcon id={item.id} size={22} />
            </div>
            <div>
              <b style={{ fontSize: '12.5px', color: 'var(--text)', display: 'block', lineHeight: 1.2 }}>{item.name}</b>
              <span style={{ fontSize: '8.5px', color: '#06b6d4', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                {item.badge}
              </span>
            </div>
          </div>

          <button
            onClick={onToggle}
            title={isEnabled ? 'Click to Disable Integration' : 'Click to Enable Integration'}
            style={{
              width: '40px',
              height: '22px',
              borderRadius: '11px',
              background: isEnabled ? '#06b6d4' : 'var(--surface)',
              border: isEnabled ? '1px solid #0284c7' : '1px solid var(--border-soft)',
              position: 'relative',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              padding: '2px',
              flexShrink: 0
            }}
          >
            <div
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: '#fff',
                transform: isEnabled ? 'translateX(18px)' : 'translateX(0px)',
                transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
              }}
            />
          </button>
        </div>

        <p style={{ fontSize: '9.5px', color: 'var(--muted)', margin: 0, lineHeight: 1.45 }}>
          {item.description}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--border-soft)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: isEnabled ? '#10b981' : '#64748b',
            boxShadow: isEnabled ? '0 0 8px #10b981' : 'none'
          }} />
          <span style={{ fontSize: '8.5px', fontWeight: 800, color: isEnabled ? '#10b981' : 'var(--muted)', textTransform: 'uppercase' }}>
            {isEnabled ? 'Active & Ready' : 'Disabled'}
          </span>
        </div>

        {isEnabled && (
          <button
            onClick={onConfigure}
            style={{
              fontSize: '8.5px',
              fontWeight: 800,
              padding: '3px 8px',
              background: 'var(--surface)',
              border: '1px solid var(--border-soft)',
              borderRadius: '4px',
              color: 'var(--text)',
              cursor: 'pointer'
            }}
          >
            ⚙️ Configure
          </button>
        )}
      </div>
    </div>
  );
}

const DEFAULT_METADATA_BY_SKILL: Record<string, SkillMetadata> = {
  'cloudsql-setup': {
    what: 'Provisions Cloud SQL (PostgreSQL) and configures Firebase Auth',
    when: 'Relational database or PostgreSQL is explicitly requested',
    why: 'Provides scale-to-zero PostgreSQL with fast provisioning',
    triggers: 'cloudsql-setup, postgresql, sql, relational database',
    inputs: 'Database configuration, instance tier, project settings',
    outputs: 'Cloud SQL connection string, Auth setup state'
  },
  'cloudsql-execute-sql': {
    what: 'Executes DQL and DML SQL statements on Cloud SQL',
    when: 'Querying existing data, seeding databases, debugging',
    why: 'Allows direct data management and table inspection',
    triggers: 'cloudsql-execute-sql, sql_statement',
    inputs: 'SQL statement query string',
    outputs: 'Query rows, execution statistics'
  },
  'cloudsql-update-schema': {
    what: 'Updates Cloud SQL schema from Drizzle ORM schema files',
    when: 'Changes are made to src/db/schema.ts or drizzle.config.ts',
    why: 'Keeps PostgreSQL database schema synchronized with TypeScript types',
    triggers: 'cloudsql-update-schema, schema_change',
    inputs: 'Drizzle schema definitions',
    outputs: 'Migration logs, database table updates'
  },
  'firebase-skill': {
    what: 'Integrates Firebase Firestore database and Authentication',
    when: 'Persistent Firestore storage, user auth, or security hardening required',
    why: 'Durable cloud document database and user access rules',
    triggers: 'set_up_firebase, deploy_firebase, firestore',
    inputs: 'firebase-blueprint.json, firestore.rules',
    outputs: 'Provisioned Firestore project, security rules deployment'
  },
  'focus_mode': {
    what: 'Handles visual selection and inspection of UI elements',
    when: 'Responding to CSS selector selections from the UI preview',
    why: 'Targeted element editing based on direct visual feedback',
    triggers: 'focus_mode, css_selector',
    inputs: 'Selected element CSS selectors',
    outputs: 'Target element context for edits'
  },
  'gemini_api': {
    what: 'Pi Agent & Native LLM integration',
    when: 'Text generation, image analysis, chat, function calling',
    why: 'Autonomous Pi CLI agent execution patterns in full-stack routes',
    triggers: 'pi_agent, gemini_api, generateContent',
    inputs: 'Text prompts, system instructions, tools schema',
    outputs: 'Structured responses, function calls, model streams'
  },
  'gemini_interactions_api': {
    what: 'Interactions API for Antigravity & Deep Research agents',
    when: 'Using Antigravity agent, Deep Research, Omni Flash, or speech generation',
    why: 'Server-side access to advanced reasoning and specialized agent models',
    triggers: 'gemini_interactions_api, antigravity, deep_research',
    inputs: 'Agent prompts, interaction parameters',
    outputs: 'Agent turn responses, research outputs, audio artifacts'
  },
  'github_import_migration': {
    what: 'Execute-first migration for imported GitHub repositories',
    when: 'Triaging imported Node.js or Kotlin projects into Cloud Run environment',
    why: 'Resolves dependencies, ports scripts, and establishes dev server configuration',
    triggers: 'github-import-migration, import_project',
    inputs: 'Imported repository file tree',
    outputs: 'Configured package manifests, build scripts'
  },
  'github_import_rewrite': {
    what: 'Cross-framework rewrite assistant for GitHub imports',
    when: 'Converting source framework code into target application frameworks',
    why: 'Preserves core business logic while transforming component architecture',
    triggers: 'github-import-rewrite, framework_convert',
    inputs: 'Source framework files, target framework requirements',
    outputs: 'Converted application codebase'
  },
  'google_maps_platform': {
    what: 'Google Maps, Places API (New), and Routes API integration',
    when: 'Building location features, store locators, address validation',
    why: 'Provides interactive maps, geocoding, and directions routing in React',
    triggers: 'google_maps_platform, places_api, routes_api',
    inputs: 'Location coordinates, place queries, map configs',
    outputs: 'Map view components, place details, route lines'
  },
  'image_generation': {
    what: 'Visual asset generation and edit engine using Gemini',
    when: 'Creating hero banners, illustrations, icons, backgrounds, avatars',
    why: 'Generates context-aware graphic assets without device frames',
    triggers: 'generate_image, image_prompt',
    inputs: 'Prompt string, aspect ratio, reference images',
    outputs: 'Image artifact files, workspace assets'
  },
  'oauth': {
    what: 'OAuth 2.0 flow implementation for 3rd-party services',
    when: 'Strava, GitHub, Spotify, or custom popup authentication requested',
    why: 'Handles popup windows, callback cookies, and authorization tokens securely',
    triggers: 'set_up_oauth, remove_oauth, third_party_login',
    inputs: 'Client IDs, requested scopes, authorization URLs',
    outputs: 'Authenticated user sessions, access tokens'
  },
  'realtime_guidelines': {
    what: 'Real-time WebSockets and multi-user collaborative canvas setup',
    when: 'Building live chat, multiplayer tools, or shared canvases',
    why: 'Ensures server-authoritative state synchronization and event handling',
    triggers: 'realtime_guidelines, websockets, multiplayer',
    inputs: 'WebSocket event schemas, canvas state objects',
    outputs: 'Live connection handlers, real-time message streams'
  },
  'shadcn': {
    what: 'shadcn/ui component integration and CLI workflow',
    when: 'User specifically requests shadcn or shadcn/ui components',
    why: 'Accessible, unstyled components built with Radix and Tailwind CSS',
    triggers: 'shadcn, shadcn_ui, add_component',
    inputs: 'Component names, Tailwind theme configuration',
    outputs: 'Installed UI components, theme setup'
  },
  'workspace_integration': {
    what: 'Google Workspace APIs integration (Docs, Sheets, Drive, Gmail, Calendar)',
    when: 'Reading, writing, or searching user Workspace data',
    why: 'Seamless access to user documents, spreadsheets, and calendar events',
    triggers: 'workspace_integration, google_drive, google_sheets',
    inputs: 'Workspace API scopes, document IDs',
    outputs: 'Workspace document content, event lists, spreadsheet rows'
  }
};

function BuiltInSkillCard({
  entityName,
  skillName,
  parents,
  initialMetadata,
  isMainHeader
}: {
  entityName: string;
  skillName: string;
  parents: string[];
  initialMetadata?: SkillMetadata;
  isMainHeader?: boolean;
}) {
  const [files, setFiles] = useState<Array<{ name: string; path: string; type: 'file' | 'folder'; content?: string }>>([]);
  const [metadata, setMetadata] = useState<SkillMetadata>(initialMetadata || {
    what: '', when: '', why: '', triggers: '', inputs: '', outputs: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (initialMetadata) {
      setMetadata(initialMetadata);
    }
  }, [initialMetadata]);

  useEffect(() => {
    let active = true;
    api.getToolboxFiles(entityName, 'skill', parents, skillName, 'built-in').then(res => {
      if (active && res.ok && res.files) {
        setFiles(res.files);
        const skillMd = res.files.find(f => f.path === 'SKILL.md' || f.name === 'SKILL.md');
        if (skillMd && skillMd.content) {
          const parsed = parseSkillMd(skillMd.content, skillName);
          setMetadata(prev => ({ ...parsed.metadata, ...prev }));
        }
      }
    }).catch(console.error).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [entityName, skillName, parents]);

  const tree = useMemo(() => buildFileTree(files), [files]);
  const fallbackMeta = DEFAULT_METADATA_BY_SKILL[skillName] || {
    what: 'Kernel System Skill',
    when: 'Agent task execution',
    why: 'Provides built-in platform capabilities',
    triggers: skillName,
    inputs: 'Task parameters',
    outputs: 'Skill execution results'
  };

  const finalWhat = metadata.what || fallbackMeta.what;
  const finalWhen = metadata.when || fallbackMeta.when;
  const finalWhy = metadata.why || fallbackMeta.why;
  const finalTriggers = metadata.triggers || fallbackMeta.triggers;
  const finalInputs = metadata.inputs || fallbackMeta.inputs;
  const finalOutputs = metadata.outputs || fallbackMeta.outputs;

  return (
    <div style={{
      background: isMainHeader ? 'linear-gradient(135deg, rgba(2, 132, 199, 0.08), rgba(192, 132, 252, 0.08))' : 'var(--surface-alt)',
      border: isMainHeader ? '1.5px solid rgba(56, 189, 248, 0.5)' : '1px solid var(--border-soft)',
      borderRadius: 'var(--radius-md)',
      padding: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      boxShadow: isMainHeader ? '0 4px 12px rgba(0,0,0,0.15)' : 'none'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ fontSize: isMainHeader ? '12px' : '11px', fontWeight: 900, color: 'var(--text)' }}>
            📁 {skillName}
          </div>
          {isMainHeader && (
            <span style={{
              fontSize: '8px',
              fontWeight: 900,
              padding: '2px 8px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
              color: '#fff',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              ⭐ MAIN SKILL
            </span>
          )}
        </div>
        {/* Kernel skills are always active — no toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          padding: '3px 8px',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '12px'
        }}>
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', flexShrink: 0 }} />
          <span style={{ fontSize: '8px', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Always Active</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', background: 'var(--surface)', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-soft)' }}>
        <div style={{ fontSize: '8.5px', color: 'var(--text)' }}><b>What:</b> <span style={{ color: 'var(--muted)' }}>{finalWhat}</span></div>
        <div style={{ fontSize: '8.5px', color: 'var(--text)' }}><b>When:</b> <span style={{ color: 'var(--muted)' }}>{finalWhen}</span></div>
        <div style={{ fontSize: '8.5px', color: 'var(--text)' }}><b>Why:</b> <span style={{ color: 'var(--muted)' }}>{finalWhy}</span></div>
        <div style={{ fontSize: '8.5px', color: 'var(--text)' }}><b>Triggers:</b> <span style={{ color: 'var(--muted)' }}>{finalTriggers}</span></div>
        <div style={{ fontSize: '8.5px', color: 'var(--text)' }}><b>Inputs:</b> <span style={{ color: 'var(--muted)' }}>{finalInputs}</span></div>
        <div style={{ fontSize: '8.5px', color: 'var(--text)' }}><b>Outputs:</b> <span style={{ color: 'var(--muted)' }}>{finalOutputs}</span></div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'var(--surface)', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-soft)' }}>
        <div style={{ fontSize: '8px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>
          Directory Structure
        </div>
        {loading ? (
          <span style={{ fontSize: '8px', color: 'var(--muted)' }}>Loading directory...</span>
        ) : (
          <DirectoryTreeView nodes={tree} editable={false} />
        )}
      </div>
    </div>
  );
}

function WorkspaceSkillCard({
  entityName,
  skillName,
  parents,
  onInspect,
  onRefresh,
  showToast,
  isEnabled,
  onToggleEnabled
}: {
  entityName: string;
  skillName: string;
  parents: string[];
  onInspect: () => void;
  onRefresh?: () => void;
  showToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
  isEnabled?: boolean;
  onToggleEnabled?: (skillName: string, enabled: boolean) => void;
}) {
  const [folderName, setFolderName] = useState(skillName);
  const [files, setFiles] = useState<Array<{ name: string; path: string; type: 'file' | 'folder'; content?: string }>>([]);
  const [metadata, setMetadata] = useState<SkillMetadata>({
    what: '', when: '', why: '', triggers: '', inputs: '', outputs: ''
  });
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);

  const loadFiles = async () => {
    try {
      const res = await api.getToolboxFiles(entityName, 'skill', parents, folderName, 'workspace');
      if (res.ok && res.files) {
        setFiles(res.files);
        const skillMd = res.files.find(f => f.path === 'SKILL.md' || f.name === 'SKILL.md');
        if (skillMd && skillMd.content) {
          const parsed = parseSkillMd(skillMd.content, folderName);
          setMetadata(parsed.metadata);
          setBody(parsed.body);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [entityName, folderName]);

  const tree = useMemo(() => buildFileTree(files), [files]);

  const handleRenameFolder = async (newName: string) => {
    if (!newName.trim() || newName === folderName) return;
    const clean = newName.trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
    try {
      await api.renameSkillFolder(entityName, 'skill', parents, folderName, clean, 'workspace');
      setFolderName(clean);
      if (onRefresh) onRefresh();
      if (showToast) showToast(`Skill renamed to '${clean}'`, 'success');
    } catch (e: any) {
      if (showToast) showToast(e.message || 'Failed to rename skill', 'error');
    }
  };

  const handleUpdateField = async (field: keyof SkillMetadata, value: string) => {
    const updated = { ...metadata, [field]: value };
    setMetadata(updated);
    const content = serializeSkillMd(updated, body);
    try {
      await api.saveToolboxFile(entityName, 'skill', parents, folderName, 'SKILL.md', content, 'workspace');
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddFile = async (parentFolder = '') => {
    const name = prompt('Enter filename (e.g. helper.ts):');
    if (!name || !name.trim()) return;
    const relPath = parentFolder ? `${parentFolder}/${name.trim()}` : name.trim();
    try {
      await api.saveToolboxFile(entityName, 'skill', parents, folderName, relPath, '// New file\n', 'workspace');
      await loadFiles();
      if (showToast) showToast(`Created file '${relPath}'`, 'success');
    } catch (e: any) {
      if (showToast) showToast(e.message || 'Error creating file', 'error');
    }
  };

  const handleAddFolder = async (parentFolder = '') => {
    const folder = prompt('Enter folder name:');
    if (!folder || !folder.trim()) return;
    const relPath = parentFolder ? `${parentFolder}/${folder.trim()}` : folder.trim();
    try {
      await api.createToolboxFolder(entityName, 'skill', parents, folderName, relPath, 'workspace');
      await api.saveToolboxFile(entityName, 'skill', parents, folderName, `${relPath}/.gitkeep`, '', 'workspace');
      await loadFiles();
      if (showToast) showToast(`Created folder '${relPath}'`, 'success');
    } catch (e: any) {
      if (showToast) showToast(e.message || 'Error creating folder', 'error');
    }
  };

  const handleRenamePath = async (oldPath: string) => {
    const newPath = prompt('Enter new path:', oldPath);
    if (!newPath || !newPath.trim() || newPath === oldPath) return;
    try {
      await api.renameToolboxFile(entityName, 'skill', parents, folderName, oldPath, newPath.trim(), 'workspace');
      await loadFiles();
      if (showToast) showToast(`Renamed '${oldPath}' -> '${newPath.trim()}'`, 'success');
    } catch (e: any) {
      if (showToast) showToast(e.message || 'Error renaming', 'error');
    }
  };

  const handleDeletePath = async (relPath: string) => {
    if (relPath === 'SKILL.md') return;
    if (!confirm(`Delete '${relPath}'?`)) return;
    try {
      await api.deleteToolboxFile(entityName, 'skill', parents, folderName, relPath, 'workspace');
      await loadFiles();
      if (showToast) showToast(`Deleted '${relPath}'`, 'success');
    } catch (e: any) {
      if (showToast) showToast(e.message || 'Error deleting', 'error');
    }
  };

  const enabled = isEnabled !== false;

  return (
    <div style={{
      background: 'var(--surface-alt)',
      border: `1px solid ${enabled ? 'rgba(192, 132, 252, 0.4)' : 'var(--border-soft)'}`,
      borderRadius: 'var(--radius-md)',
      padding: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      opacity: enabled ? 1 : 0.55,
      transition: 'opacity 0.2s, border-color 0.2s'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
        <input
          type="text"
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          onBlur={(e) => handleRenameFolder(e.target.value)}
          style={{
            fontSize: '11px',
            fontWeight: 800,
            background: 'var(--surface)',
            border: '1px solid var(--border-soft)',
            borderRadius: '4px',
            color: 'var(--text)',
            padding: '4px 8px',
            flex: 1
          }}
        />
        {/* Per-skill enable/disable toggle */}
        <button
          title={enabled ? 'Disable skill' : 'Enable skill'}
          onClick={() => onToggleEnabled && onToggleEnabled(skillName, !enabled)}
          style={{
            width: '36px',
            height: '20px',
            borderRadius: '10px',
            border: 'none',
            background: enabled ? 'linear-gradient(135deg, #10b981, #059669)' : 'var(--border-soft)',
            cursor: 'pointer',
            padding: 0,
            position: 'relative',
            flexShrink: 0,
            transition: 'background 0.2s'
          }}
        >
          <span style={{
            position: 'absolute',
            top: '2px',
            left: enabled ? '18px' : '2px',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
          }} />
        </button>
        <button
          onClick={onInspect}
          style={{
            fontSize: '9px',
            fontWeight: 700,
            padding: '4px 10px',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🔍 Inspect
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', background: 'var(--surface)', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-soft)' }}>
        {(['what', 'when', 'why', 'triggers', 'inputs', 'outputs'] as Array<keyof SkillMetadata>).map(field => (
          <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <label style={{ fontSize: '7.5px', color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase' }}>
              {field}
            </label>
            <input
              type="text"
              value={metadata[field] || ''}
              onChange={(e) => handleUpdateField(field, e.target.value)}
              style={{
                fontSize: '8.5px',
                padding: '3px 6px',
                background: 'var(--surface-alt)',
                border: '1px solid var(--border-soft)',
                borderRadius: '3px',
                color: 'var(--text)'
              }}
            />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'var(--surface)', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-soft)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '8px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>
            Directory Structure
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={() => handleAddFile('')} style={iconBtnStyle}>+📄 File</button>
            <button onClick={() => handleAddFolder('')} style={iconBtnStyle}>+📁 Folder</button>
          </div>
        </div>

        {loading ? (
          <span style={{ fontSize: '8px', color: 'var(--muted)' }}>Loading directory...</span>
        ) : (
          <DirectoryTreeView
            nodes={tree}
            editable={true}
            onAddFile={handleAddFile}
            onAddFolder={handleAddFolder}
            onRename={handleRenamePath}
            onDelete={handleDeletePath}
          />
        )}
      </div>
    </div>
  );
}

export default function SkillsAndExtensions({ entityName, toolboxes, onRefresh, showToast, initialTab }: Props) {
  const triggerToast = (msg: string, type: 'success' | 'info' | 'error' = 'error') => {
    if (showToast) showToast(msg, type);
    else alert(msg);
  };

  // Per-skill enabled state: persisted in harness.json via harnessApi.updateHarnessState
  const [skillsEnabled, setSkillsEnabled] = useState<Record<string, boolean>>({});

  const handleToggleSkill = async (skillName: string, enabled: boolean) => {
    const updated = { ...skillsEnabled, [skillName]: enabled };
    setSkillsEnabled(updated);
    try {
      const { harnessApi } = await import('./api');
      await harnessApi.updateHarnessState({ skills_enabled: updated });
      triggerToast(`Skill "${skillName}" ${enabled ? 'enabled' : 'disabled'}`, enabled ? 'success' : 'info');
    } catch (e: any) {
      console.error('[SkillsAndExtensions] Failed to save skill toggle:', e);
    }
  };

  const [activeTab, setActiveTab] = useState<'skills' | 'extensions'>(initialTab || 'skills');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'built-in' | 'workspace'>('all');

  // Preset Integrations Enabled Map (persisted in localStorage + harness.json server-side)
  const [enabledIntegrations, setEnabledIntegrations] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('fabrica_enabled_integrations');
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      github: true,
      gdrive: true,
      slack: true,
      n8n: true,
      stripe: true
    };
  });

  const [configuringIntegration, setConfiguringIntegration] = useState<PresetIntegration | null>(null);

  const toggleIntegration = (item: PresetIntegration) => {
    setEnabledIntegrations(prev => {
      const nextState = !prev[item.id];
      const updated = { ...prev, [item.id]: nextState };
      // Persist locally
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('fabrica_enabled_integrations', JSON.stringify(updated));
        } catch (e) {}
      }
      // Persist server-side in harness.json so backend CLI builder can read it
      import('./api').then(({ harnessApi }) => {
        harnessApi.updateHarnessState({ integrations_enabled: updated }).catch(e =>
          console.error('[SkillsAndExtensions] Failed to save integration toggle:', e)
        );
      });
      triggerToast(
        `${item.name} integration ${nextState ? 'enabled' : 'disabled'}`,
        nextState ? 'success' : 'info'
      );
      return updated;
    });
  };


  const totalPresetCount = useMemo(() => {
    return PRESET_INTEGRATION_CATEGORIES.reduce((acc, cat) => acc + cat.items.length, 0);
  }, []);

  const activePresetCount = useMemo(() => {
    return Object.values(enabledIntegrations).filter(Boolean).length;
  }, [enabledIntegrations]);

  // Modal inspection state for skills
  const [modal, setModal] = useState<{
    isOpen: boolean;
    kind: 'skill' | 'plugin';
    parents: string[];
    entryName: string;
  }>({
    isOpen: false,
    kind: 'skill',
    parents: ['domain_general', 'system_mcp'],
    entryName: ''
  });

  const [filesList, setFilesList] = useState<{ name: string; path: string; type: 'file' | 'folder'; content?: string }[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string>('SKILL.md');
  const [activeFileContent, setActiveFileContent] = useState<string>('');

  const domains = useMemo(() => {
    const rawDomMap = (toolboxes as any)?.domains || (toolboxes as any)?.toolboxes || (typeof toolboxes === 'object' && !Array.isArray(toolboxes) ? toolboxes : {});
    return Object.entries(rawDomMap).map(([key, item]: [string, any]) => ({
      id: key,
      ...(typeof item === 'object' && item !== null ? item : {}),
    }));
  }, [toolboxes]);

  const [dynWorkspaceSkills, setDynWorkspaceSkills] = useState<any[]>([]);
  const [dynBuiltinSkills, setDynBuiltinSkills] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    api.getWorkspaceFiles('.pi/skills').then(res => {
      if (isMounted && res.ok && Array.isArray(res.files)) {
        const customItems = res.files.map((f: any) => {
          const folderName = f.name || f.path;
          return {
            id: folderName,
            name: folderName,
            domainId: 'domain_general',
            toolboxId: 'workspace_skills',
            source: 'workspace',
            parents: ['domain_general', 'workspace_skills']
          };
        });
        setDynWorkspaceSkills(customItems);
      }
    }).catch(() => {});

    const fetchKernelSkills = async () => {
      try {
        const res = await api.getKernelSkills();
        if (isMounted && res.ok && Array.isArray(res.skills)) {
          const builtinItems = res.skills.map((s: any) => ({
            id: s.name,
            name: s.name,
            domainId: 'domain_general',
            toolboxId: 'system_skills',
            source: 'built-in',
            category: s.category || s.name,
            isMain: !!s.isMain,
            metadata: s.metadata,
            parents: ['system_skills', s.name]
          }));
          setDynBuiltinSkills(builtinItems);
        }
      } catch (e) {}
    };

    fetchKernelSkills();

    return () => { isMounted = false; };
  }, [entityName]);

  const skillsList = useMemo(() => {
    const items: any[] = [];
    const seenNames = new Set<string>();

    domains.forEach(dom => {
      const tbs = dom.toolboxes || (dom.skills ? { [dom.id || 'default']: { skills: dom.skills } } : {});
      Object.entries(tbs || {}).forEach(([tbId, tb]: [string, any]) => {
        const skillsObj = tb?.skills || (tb?.source ? { [tbId]: tb } : {});
        Object.entries(skillsObj || {}).forEach(([sId, s]: [string, any]) => {
          const isBuiltIn = s?.source === 'built-in' || (dom.id === 'domain_general' && s?.source !== 'workspace');
          if (!seenNames.has(sId)) {
            seenNames.add(sId);
            items.push({
              id: sId,
              name: sId,
              domainId: dom.id || 'domain_general',
              toolboxId: tbId,
              source: isBuiltIn ? 'built-in' : 'workspace',
              parents: [dom.id || 'domain_general', tbId]
            });
          }
        });
      });
    });

    if ((toolboxes as any)?.skills) {
      Object.entries((toolboxes as any).skills).forEach(([sId, s]: [string, any]) => {
        if (!seenNames.has(sId)) {
          seenNames.add(sId);
          items.push({
            id: sId,
            name: sId,
            domainId: 'domain_general',
            toolboxId: 'custom',
            source: s?.source === 'workspace' ? 'workspace' : 'built-in',
            parents: ['domain_general', 'custom']
          });
        }
      });
    }

    dynWorkspaceSkills.forEach(ws => {
      if (!seenNames.has(ws.name)) {
        seenNames.add(ws.name);
        items.push(ws);
      }
    });

    dynBuiltinSkills.forEach(bs => {
      if (!seenNames.has(bs.name)) {
        seenNames.add(bs.name);
        items.push(bs);
      }
    });

    return items;
  }, [domains, toolboxes, dynWorkspaceSkills, dynBuiltinSkills]);

  const filteredSkills = useMemo(() => {
    return skillsList.filter(s => {
      const matchSearch = searchQuery === '' || s.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchSource = sourceFilter === 'all' || s.source === sourceFilter;
      return matchSearch && matchSource;
    });
  }, [skillsList, searchQuery, sourceFilter]);

  const groupedSkills = useMemo(() => {
    const groups: Array<{
      category: string;
      mainSkill?: any;
      subSkills: any[];
    }> = [];
    const groupMap = new Map<string, { category: string; mainSkill?: any; subSkills: any[] }>();

    filteredSkills.forEach(s => {
      const cat = s.category || (s.source === 'workspace' ? 'Workspace Custom (.pi/skills)' : 'General');
      if (!groupMap.has(cat)) {
        const newGroup = { category: cat, mainSkill: undefined, subSkills: [] };
        groupMap.set(cat, newGroup);
        groups.push(newGroup);
      }
      const grp = groupMap.get(cat)!;
      if (s.isMain) {
        grp.mainSkill = s;
      } else {
        grp.subSkills.push(s);
      }
    });

    return groups;
  }, [filteredSkills]);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return PRESET_INTEGRATION_CATEGORIES;
    const q = searchQuery.toLowerCase();
    return PRESET_INTEGRATION_CATEGORIES.map(cat => {
      const catMatches = cat.title.toLowerCase().includes(q) || cat.description.toLowerCase().includes(q);
      const filteredItems = cat.items.filter(item =>
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.badge.toLowerCase().includes(q)
      );
      if (catMatches) return cat;
      return { ...cat, items: filteredItems };
    }).filter(cat => cat.items.length > 0);
  }, [searchQuery]);

  const loadModalFiles = async (kind: 'skill' | 'plugin', parents: string[], entryName: string) => {
    try {
      const res = await api.getToolboxFiles(entityName, kind, parents, entryName, 'workspace');
      if (res.ok && res.files) {
        setFilesList(res.files);
        const firstFile = res.files.find(f => f.type === 'file');
        if (firstFile) {
          setActiveFilePath(firstFile.path);
          setActiveFileContent(firstFile.content || '');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openInspectModal = async (kind: 'skill' | 'plugin', parents: string[], entryName: string) => {
    setModal({ isOpen: true, kind, parents, entryName });
    await loadModalFiles(kind, parents, entryName);
  };

  const handleSelectModalFile = (path: string) => {
    setActiveFilePath(path);
    const item = filesList.find(f => f.path === path);
    if (item && item.content !== undefined) {
      setActiveFileContent(item.content);
    }
  };

  const handleSaveModalFileContent = async (newContent: string) => {
    setActiveFileContent(newContent);
    try {
      await api.saveToolboxFile(entityName, modal.kind, modal.parents, modal.entryName, activeFilePath, newContent, 'workspace');
      setFilesList(prev => prev.map(f => f.path === activeFilePath ? { ...f, content: newContent } : f));
    } catch (e) {
      console.error(e);
    }
  };

  const [isAddSkillModalOpen, setIsAddSkillModalOpen] = useState(false);
  const [newSkillForm, setNewSkillForm] = useState({
    name: '',
    what: '',
    when: '',
    why: '',
    triggers: '',
    inputs: '',
    outputs: '',
    body: '# Instructions\n\nAdd implementation guidance here.'
  });

  const handleAddWorkspaceSkillSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newSkillForm.name.trim()) {
      triggerToast('Skill name is required', 'error');
      return;
    }
    const clean = newSkillForm.name.trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
    const parents = ['domain_general', 'system_mcp'];

    try {
      await api.mutateToolbox(entityName, 'create', 'skill', parents, clean, {
        description: newSkillForm.what || 'Custom workspace skill',
        status: true,
        source: 'workspace'
      });

      const initialMd = serializeSkillMd({
        what: newSkillForm.what || 'Custom workspace skill task',
        when: newSkillForm.when || 'Triggered when needed',
        why: newSkillForm.why || 'Automates user workflow',
        triggers: newSkillForm.triggers || 'custom, workspace',
        inputs: newSkillForm.inputs || 'User instructions',
        outputs: newSkillForm.outputs || 'Completed workspace task'
      }, newSkillForm.body);

      try {
        await api.saveToolboxFile(entityName, 'skill', parents, clean, 'SKILL.md', initialMd, 'workspace');
      } catch (_) {}

      try {
        await harnessApi.createSkill(clean, initialMd, {
          what: newSkillForm.what,
          when: newSkillForm.when,
          why: newSkillForm.why,
          triggers: newSkillForm.triggers
        });
      } catch (_) {}

      triggerToast(`Created skill '${clean}'`, 'success');
      setIsAddSkillModalOpen(false);
      setNewSkillForm({
        name: '',
        what: '',
        when: '',
        why: '',
        triggers: '',
        inputs: '',
        outputs: '',
        body: '# Instructions\n\nAdd implementation guidance here.'
      });

      // Refetch kernel and workspace skills
      try {
        const res = await harnessApi.getKernelSkills();
        if (res && res.ok && Array.isArray(res.skills)) {
          const builtinItems = res.skills.map((s: any) => ({
            id: s.name,
            name: s.name,
            domainId: 'domain_general',
            toolboxId: s.category === 'workspace' ? 'custom' : 'system_skills',
            source: s.category === 'workspace' ? 'workspace' : 'built-in',
            category: s.category || s.name,
            isMain: !!s.isMain,
            metadata: s.metadata,
            parents: ['system_skills', s.name]
          }));
          setDynBuiltinSkills(builtinItems);
        }
      } catch (_) {}

      if (onRefresh) onRefresh();
    } catch (e: any) {
      triggerToast(e.message || 'Failed to create skill', 'error');
    }
  };

  const modalTree = useMemo(() => buildFileTree(filesList), [filesList]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '100%', overflowY: 'auto', padding: '16px' }}>
      
      {/* TABS & FILTER BAR */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--surface-alt)',
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 14px',
        gap: '10px'
      }}>
        {/* Dedicated Window Section Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {activeTab === 'skills' ? (
            <div
              style={{
                fontSize: '9.5px',
                fontWeight: 900,
                padding: '6px 14px',
                background: 'linear-gradient(135deg, #c084fc, #9333ea)',
                borderRadius: '6px',
                color: '#fff',
                fontFamily: 'var(--mono)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              ⚡ REGISTERED SKILLS ({skillsList.length})
            </div>
          ) : (
            <div
              style={{
                fontSize: '9.5px',
                fontWeight: 900,
                padding: '6px 14px',
                background: 'linear-gradient(135deg, #06b6d4, #0284c7)',
                borderRadius: '6px',
                color: '#fff',
                fontFamily: 'var(--mono)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              🧩 CONNECTED INTEGRATIONS ({activePresetCount}/{totalPresetCount} ACTIVE)
            </div>
          )}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {activeTab === 'skills' && (
            <select
              value={sourceFilter}
              onChange={(e: any) => setSourceFilter(e.target.value)}
              style={{
                fontSize: '9px',
                fontWeight: 700,
                padding: '4px 8px',
                background: 'var(--surface)',
                border: '1px solid var(--border-soft)',
                borderRadius: '4px',
                color: 'var(--text)'
              }}
            >
              <option value="all">All Sources</option>
              <option value="built-in">Kernel (Built-In)</option>
              <option value="workspace">Workspace (.pi/)</option>
            </select>
          )}

          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              fontSize: '9px',
              padding: '4px 8px',
              background: 'var(--surface)',
              border: '1px solid var(--border-soft)',
              borderRadius: '4px',
              color: 'var(--text)',
              width: '140px'
            }}
          />
        </div>
      </div>

      {/* SKILLS SECTION */}
      {activeTab === 'skills' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '9.5px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>
              REGISTERED SKILLS ({filteredSkills.length})
            </span>
            <button
              onClick={() => setIsAddSkillModalOpen(true)}
              style={{
                fontSize: '9px',
                fontWeight: 800,
                padding: '4px 10px',
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              + Add Custom Skill (.pi/skills)
            </button>
          </div>

          {groupedSkills.map(grp => (
            <div
              key={grp.category}
              style={{
                background: 'var(--surface-alt)',
                border: '1px solid var(--border-soft)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}
            >
              {/* Section Title Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-soft)', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text)' }}>
                    ⚡ {grp.category}
                  </span>
                  <span style={{
                    fontSize: '9px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: 'rgba(192, 132, 252, 0.15)',
                    color: '#c084fc',
                    border: '1px solid rgba(192, 132, 252, 0.3)'
                  }}>
                    {grp.mainSkill ? '1 Main Skill' : '0 Main Skill'} • {grp.subSkills.length} Sub-Skills
                  </span>
                </div>
              </div>

              {/* MAIN SKILL AT TOP OF SECTION */}
              {grp.mainSkill && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', color: '#0284c7', letterSpacing: '0.04em' }}>
                      ⭐ MAIN SKILL
                    </span>
                  </div>
                  {grp.mainSkill.source === 'built-in' ? (
                    <BuiltInSkillCard
                      entityName={entityName}
                      skillName={grp.mainSkill.name}
                      parents={grp.mainSkill.parents}
                      initialMetadata={grp.mainSkill.metadata}
                      isMainHeader={true}
                    />
                  ) : (
                    <WorkspaceSkillCard
                      entityName={entityName}
                      skillName={grp.mainSkill.name}
                      parents={grp.mainSkill.parents}
                      onInspect={() => openInspectModal('skill', grp.mainSkill.parents, grp.mainSkill.name)}
                      onRefresh={onRefresh}
                      showToast={triggerToast}
                      isEnabled={skillsEnabled[grp.mainSkill.name] !== false}
                      onToggleEnabled={handleToggleSkill}
                    />
                  )}
                </div>
              )}

              {/* SUB-SKILLS UNDER THE SAME SECTION */}
              {grp.subSkills.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: grp.mainSkill ? '6px' : '0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.04em' }}>
                      ↳ SUB-SKILLS ({grp.subSkills.length})
                    </span>
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '12px',
                    paddingLeft: '12px',
                    borderLeft: '2px solid var(--border-soft)'
                  }}>
                    {grp.subSkills.map(s => (
                      s.source === 'built-in' ? (
                        <BuiltInSkillCard
                          key={s.id}
                          entityName={entityName}
                          skillName={s.name}
                          parents={s.parents}
                          initialMetadata={s.metadata}
                        />
                      ) : (
                        <WorkspaceSkillCard
                          key={s.id}
                          entityName={entityName}
                          skillName={s.name}
                          parents={s.parents}
                          onInspect={() => openInspectModal('skill', s.parents, s.name)}
                          onRefresh={onRefresh}
                          showToast={triggerToast}
                          isEnabled={skillsEnabled[s.name] !== false}
                          onToggleEnabled={handleToggleSkill}
                        />
                      )
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* PRESET INTEGRATIONS SECTION */}
      {activeTab === 'extensions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            background: 'var(--surface-alt)',
            border: '1px solid var(--border-soft)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <div>
              <h3 style={{ fontSize: '12px', fontWeight: 900, color: 'var(--text)', margin: '0 0 2px 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                🧩 PRESET WORKSPACE INTEGRATIONS
              </h3>
              <p style={{ fontSize: '9.5px', color: 'var(--muted)', margin: 0 }}>
                Enable or disable pre-configured service integrations so Fabrica agents can seamlessly pull source materials and push mission deliverables.
              </p>
            </div>
            <div style={{
              padding: '6px 12px',
              background: 'rgba(6, 182, 212, 0.1)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              borderRadius: '20px',
              fontSize: '10px',
              fontWeight: 800,
              color: '#06b6d4',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}>
              {activePresetCount} / {totalPresetCount} Enabled
            </div>
          </div>

          {filteredCategories.map(cat => (
            <div key={cat.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderLeft: '3px solid #06b6d4', paddingLeft: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 900, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  {cat.title}
                </span>
                <p style={{ fontSize: '9px', color: 'var(--muted)', margin: 0, lineHeight: 1.4 }}>
                  {cat.description}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                {cat.items.map(item => (
                  <PresetIntegrationCard
                    key={item.id}
                    item={item}
                    isEnabled={!!enabledIntegrations[item.id]}
                    onToggle={() => toggleIntegration(item)}
                    onConfigure={() => setConfiguringIntegration(item)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* INSPECTION MODAL FOR SKILLS */}
      {modal.isOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            width: modal.kind === 'skill' ? 'min(56rem, 92vw)' : 'min(44rem, 90vw)',
            height: 'min(36rem, 85vh)',
            background: 'var(--surface)',
            border: '1.5px solid var(--border)',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 60px rgba(0,0,0,0.5)'
          }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-alt)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px' }}>⚡</span>
                <b style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text)' }}>
                  Inspect Skill Files: {modal.entryName}
                </b>
              </div>
              <button onClick={() => setModal(m => ({ ...m, isOpen: false }))} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '14px' }}>✕</button>
            </div>

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              <div style={{ width: '200px', borderRight: '1px solid var(--border-soft)', background: 'var(--surface-alt)', padding: '10px', overflowY: 'auto' }}>
                <DirectoryTreeView
                  nodes={modalTree}
                  activePath={activeFilePath}
                  onSelectFile={handleSelectModalFile}
                  editable={false}
                />
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '14px', gap: '8px' }}>
                <div style={{ fontSize: '9px', fontWeight: 800, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                  Skill File: {activeFilePath}
                </div>
                <textarea
                  value={activeFileContent}
                  onChange={(e) => setActiveFileContent(e.target.value)}
                  style={{
                    flex: 1,
                    width: '100%',
                    fontFamily: 'var(--mono)',
                    fontSize: '10.5px',
                    padding: '10px',
                    background: 'var(--surface-alt)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: '6px',
                    color: 'var(--text)',
                    resize: 'none',
                    lineHeight: 1.5
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    onClick={() => handleSaveModalFileContent(activeFileContent)}
                    style={{
                      fontSize: '9.5px',
                      fontWeight: 800,
                      padding: '5px 12px',
                      background: 'var(--accent)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIGURATION MODAL FOR PRESET INTEGRATIONS */}
      {configuringIntegration && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            width: 'min(32rem, 90vw)',
            background: 'var(--surface)',
            border: '1.5px solid var(--border)',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 60px rgba(0,0,0,0.5)'
          }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-alt)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PlatformIcon id={configuringIntegration.id} size={20} />
                <b style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text)' }}>
                  {configuringIntegration.name} Integration Setup
                </b>
              </div>
              <button onClick={() => setConfiguringIntegration(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '14px' }}>✕</button>
            </div>

            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '10px', background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.25)', borderRadius: '6px' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#06b6d4', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Integration Status: Active
                </div>
                <div style={{ fontSize: '9px', color: 'var(--text)' }}>
                  Fabrica agent can automatically interact with {configuringIntegration.name} endpoints and payloads.
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase' }}>
                  OAuth & API Secret Configuration
                </label>
                <input
                  type="text"
                  readOnly
                  value={`FABRICA_${configuringIntegration.id.toUpperCase()}_TOKEN`}
                  style={{
                    fontSize: '10px',
                    fontFamily: 'var(--mono)',
                    padding: '6px 10px',
                    background: 'var(--surface-alt)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: '4px',
                    color: 'var(--muted)'
                  }}
                />
                <span style={{ fontSize: '8px', color: 'var(--muted)' }}>
                  Managed automatically via runtime workspace environment variables.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setConfiguringIntegration(null)}
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '6px 14px',
                    background: '#06b6d4',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD CUSTOM SKILL MODAL */}
      {isAddSkillModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            width: 'min(36rem, 90vw)',
            maxHeight: '85vh',
            background: 'var(--surface)',
            border: '1.5px solid var(--border)',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 60px rgba(0,0,0,0.5)'
          }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-alt)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px' }}>⚡</span>
                <b style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text)' }}>
                  Add Custom Workspace Skill (.pi/skills)
                </b>
              </div>
              <button onClick={() => setIsAddSkillModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '14px' }}>✕</button>
            </div>

            <form onSubmit={handleAddWorkspaceSkillSubmit} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase' }}>
                  Skill Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. data_analyzer"
                  value={newSkillForm.name}
                  onChange={(e) => setNewSkillForm({ ...newSkillForm, name: e.target.value })}
                  required
                  style={{
                    fontSize: '11px',
                    padding: '6px 10px',
                    background: 'var(--surface-alt)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: '4px',
                    color: 'var(--text)'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '8.5px', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase' }}>What (Goal)</label>
                  <input
                    type="text"
                    placeholder="Brief description of task"
                    value={newSkillForm.what}
                    onChange={(e) => setNewSkillForm({ ...newSkillForm, what: e.target.value })}
                    style={{ fontSize: '10px', padding: '5px', background: 'var(--surface-alt)', border: '1px solid var(--border-soft)', borderRadius: '4px', color: 'var(--text)' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '8.5px', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase' }}>When (Condition)</label>
                  <input
                    type="text"
                    placeholder="When to execute"
                    value={newSkillForm.when}
                    onChange={(e) => setNewSkillForm({ ...newSkillForm, when: e.target.value })}
                    style={{ fontSize: '10px', padding: '5px', background: 'var(--surface-alt)', border: '1px solid var(--border-soft)', borderRadius: '4px', color: 'var(--text)' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '8.5px', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase' }}>Why (Purpose)</label>
                  <input
                    type="text"
                    placeholder="Rationale"
                    value={newSkillForm.why}
                    onChange={(e) => setNewSkillForm({ ...newSkillForm, why: e.target.value })}
                    style={{ fontSize: '10px', padding: '5px', background: 'var(--surface-alt)', border: '1px solid var(--border-soft)', borderRadius: '4px', color: 'var(--text)' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '8.5px', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase' }}>Triggers (Keywords)</label>
                  <input
                    type="text"
                    placeholder="comma, separated, triggers"
                    value={newSkillForm.triggers}
                    onChange={(e) => setNewSkillForm({ ...newSkillForm, triggers: e.target.value })}
                    style={{ fontSize: '10px', padding: '5px', background: 'var(--surface-alt)', border: '1px solid var(--border-soft)', borderRadius: '4px', color: 'var(--text)' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '8.5px', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase' }}>Inputs</label>
                  <input
                    type="text"
                    placeholder="Required inputs"
                    value={newSkillForm.inputs}
                    onChange={(e) => setNewSkillForm({ ...newSkillForm, inputs: e.target.value })}
                    style={{ fontSize: '10px', padding: '5px', background: 'var(--surface-alt)', border: '1px solid var(--border-soft)', borderRadius: '4px', color: 'var(--text)' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '8.5px', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase' }}>Outputs</label>
                  <input
                    type="text"
                    placeholder="Expected deliverables"
                    value={newSkillForm.outputs}
                    onChange={(e) => setNewSkillForm({ ...newSkillForm, outputs: e.target.value })}
                    style={{ fontSize: '10px', padding: '5px', background: 'var(--surface-alt)', border: '1px solid var(--border-soft)', borderRadius: '4px', color: 'var(--text)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase' }}>
                  SKILL.md Markdown Body
                </label>
                <textarea
                  value={newSkillForm.body}
                  onChange={(e) => setNewSkillForm({ ...newSkillForm, body: e.target.value })}
                  rows={5}
                  style={{
                    fontSize: '10px',
                    fontFamily: 'var(--mono)',
                    padding: '8px',
                    background: 'var(--surface-alt)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: '4px',
                    color: 'var(--text)',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddSkillModalOpen(false)}
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '6px 12px',
                    background: 'var(--surface-alt)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: '4px',
                    color: 'var(--text)',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '6px 14px',
                    background: 'var(--accent)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Create Skill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
