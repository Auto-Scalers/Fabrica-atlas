import { Request, Response, NextFunction } from 'express';

export type ValidationSource = 'body' | 'query' | 'params';

export function validateRequiredFields(fields: string[], source: ValidationSource = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const dataSource = req[source] || {};
    const missing: string[] = [];

    for (const field of fields) {
      if (dataSource[field] === undefined || dataSource[field] === null || dataSource[field] === '') {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      res.status(400).json({
        ok: false,
        error: `Missing required ${source} parameters: ${missing.join(', ')}`,
        missingFields: missing,
        timestamp: new Date().toISOString()
      });
      return;
    }

    next();
  };
}

export function validateBody(fields: string[]) {
  return validateRequiredFields(fields, 'body');
}

export function validateQuery(fields: string[]) {
  return validateRequiredFields(fields, 'query');
}

export function validateParams(fields: string[]) {
  return validateRequiredFields(fields, 'params');
}

export function validatePayloadSchema<T = any>(validatorFn: (data: any) => { valid: boolean; errors?: string[] }) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = validatorFn(req.body);
    if (!result.valid) {
      res.status(400).json({
        ok: false,
        error: 'Payload schema validation failed',
        details: result.errors || [],
        timestamp: new Date().toISOString()
      });
      return;
    }
    next();
  };
}
