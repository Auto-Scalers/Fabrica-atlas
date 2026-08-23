/**
 * Formatting utilities for numbers, file sizes, tokens, dates, and IDs.
 */

export function formatFileSize(bytes: number = 0): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatTokenCount(tokens: number = 0): string {
  if (tokens < 1000) return `${tokens} tks`;
  if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}k tks`;
  return `${(tokens / 1000000).toFixed(2)}M tks`;
}

export function formatRelativeTimestamp(isoDateStr?: string): string {
  if (!isoDateStr) return 'Just now';
  try {
    const date = new Date(isoDateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 10) return 'Just now';
    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  } catch {
    return 'Recent';
  }
}

export function truncateText(text: string = '', maxLength: number = 60): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

export function sanitizeTenantId(raw: string = 'usr-123'): string {
  return raw.toLowerCase().replace(/[^a-z0-9_\-]/g, '-');
}
