import type { Request, Response, NextFunction } from 'express'
import { type ZodSchema, ZodError } from 'zod'

type RequestWithBody = Request & { body: unknown }
type RequestWithParams = Request & { params: Record<string, string> }
type RequestWithQuery = Request & { query: Record<string, unknown> }

export const validateBody = (schema: ZodSchema) => {
  return (req: RequestWithBody, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.body)
      req.body = validatedData
      next()
    } catch (e) {
      if (e instanceof ZodError) {
        console.log(e)
        return res.status(400).json({
          error: 'Validation failed',
          details: e.issues.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        })
      }
      next(e)
    }
  }
}

export const validateParams = (schema: ZodSchema) => {
  return (req: RequestWithParams, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.params)
      next()
    } catch (e) {
      if (e instanceof ZodError) {
        return res.status(400).json({
          error: 'Invalid params',
          details: e.issues.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        })
      }
      next(e)
    }
  }
}

export const validateQuery = (schema: ZodSchema) => {
  return (req: RequestWithQuery, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.query)
      next()
    } catch (e) {
      if (e instanceof ZodError) {
        return res.status(400).json({
          error: 'Invalid Query Params',
          details: e.issues.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        })
      }
      next(e)
    }
  }
}
