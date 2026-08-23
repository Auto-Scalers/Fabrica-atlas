import { authApi } from './auth.api';
import { tenantApi } from './tenant.api';
import { harnessApi } from './harness.api';
import { missionsApi } from './missions.api';
import { workspaceApi } from './workspace.api';

export * from './client';
export * from './auth.api';
export * from './harness.api';
export * from './missions.api';
export * from './tenant.api';
export * from './workspace.api';
export * from './drive.api';
export * from './github.api';

export const api = {
  ...authApi,
  ...tenantApi,
  ...harnessApi,
  ...missionsApi,
  ...workspaceApi,
};
