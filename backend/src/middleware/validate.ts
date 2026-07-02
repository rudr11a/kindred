import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validate = (schema: ZodSchema | { body?: ZodSchema; query?: ZodSchema; params?: ZodSchema }) => 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schema instanceof ZodSchema) {
        req.body = await schema.parseAsync(req.body);
      } else {
        if (schema.body) {
          req.body = await schema.body.parseAsync(req.body);
        }
        if (schema.query) {
          req.query = await schema.query.parseAsync(req.query);
        }
        if (schema.params) {
          req.params = await schema.params.parseAsync(req.params);
        }
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return res.status(400).json({
          message: 'Validation failed',
          errors: formattedErrors,
        });
      }
      console.error('[Validation Middleware] Unexpected validation error:', error);
      return res.status(500).json({ message: 'Internal validation error' });
    }
  };
