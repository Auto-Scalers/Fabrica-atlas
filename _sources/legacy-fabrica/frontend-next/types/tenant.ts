export interface TenantProfile {
  tenantId: string;
  name?: string;
  email?: string;
  plan?: string;
  context?: Record<string, any>;
  telemetry?: Record<string, any>;
  last_active?: string;
}
