export const FIXED_ASPECTS = ["Architecture", "Capabilities", "Monetization"];
export const ANALYSING_FIELDS = ["description", "contains", "when_to_use"];
export const _WEAK_WHEN = /^\s*(use this skill when|use this when|when the task involves|when the task involves)\b/i;

export function nowIso(): string {
  return new Date().toISOString();
}

export function _isEmpty(v: any): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v).length === 0;
  return false;
}
