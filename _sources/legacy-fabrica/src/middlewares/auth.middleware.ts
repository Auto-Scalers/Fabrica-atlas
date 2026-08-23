import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  tenantId?: string;
  user?: any;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Extract tenantId from headers, query string, or body
  const headerTenant = req.headers['x-tenant-id'] || req.headers['x-user-id'];
  const queryTenant = req.query.tenantId || req.query.userId;
  const bodyTenant = req.body?.tenantId || req.body?.userId;

  let rawTenant = typeof headerTenant === 'string' ? headerTenant
    : typeof queryTenant === 'string' ? queryTenant
    : typeof bodyTenant === 'string' ? bodyTenant : '';

  let tenantId = rawTenant.replace(/[^a-zA-Z0-9_\-]/g, '_').trim();

  if (!tenantId || tenantId === 'default_user') {
    // Generate a unique user workspace ID for unauthenticated requests
    tenantId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  req.tenantId = tenantId;
  next();
}
