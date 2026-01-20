import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

type ValidateTarget = 'body' | 'query' | 'params';

export function validate(schema: z.ZodType, target: ValidateTarget = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req[target]);
      next();
    } catch (error) {
      next(error); 
    }
  };
}