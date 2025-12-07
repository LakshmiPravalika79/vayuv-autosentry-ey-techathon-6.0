import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface ApiError extends Error {
  statusCode?: number;
  errors?: unknown[];
  code?: string;
}

export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error
  logger.error(`Error: ${err.message}`, {
    path: req.path,
    method: req.method,
    statusCode: err.statusCode || 500,
    stack: err.stack,
    body: req.body,
    query: req.query,
    userId: (req as unknown as { userId?: string }).userId,
  });

  // Default status code
  const statusCode = err.statusCode || 500;

  // Error response structure
  const errorResponse: {
    success: false;
    error: string;
    message: string;
    code?: string;
    errors?: unknown[];
    timestamp: string;
    path: string;
    stack?: string;
  } = {
    success: false,
    error: getErrorType(statusCode),
    message: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString(),
    path: req.path,
  };

  // Add error code if available
  if (err.code) {
    errorResponse.code = err.code;
  }

  // Add validation errors if available
  if (err.errors) {
    errorResponse.errors = err.errors;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
}

function getErrorType(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return 'Bad Request';
    case 401:
      return 'Unauthorized';
    case 403:
      return 'Forbidden';
    case 404:
      return 'Not Found';
    case 409:
      return 'Conflict';
    case 422:
      return 'Unprocessable Entity';
    case 429:
      return 'Too Many Requests';
    case 500:
      return 'Internal Server Error';
    case 502:
      return 'Bad Gateway';
    case 503:
      return 'Service Unavailable';
    default:
      return 'Error';
  }
}

// Custom error classes
export class AppError extends Error {
  statusCode: number;
  code?: string;
  errors?: unknown[];

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad Request', code?: string) {
    super(message, 400, code);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', code?: string) {
    super(message, 401, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', code?: string) {
    super(message, 403, code);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Not Found', code?: string) {
    super(message, 404, code);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflict', code?: string) {
    super(message, 409, code);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation Error', errors?: unknown[]) {
    super(message, 422, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string = 'Too Many Requests', code?: string) {
    super(message, 429, code);
  }
}
