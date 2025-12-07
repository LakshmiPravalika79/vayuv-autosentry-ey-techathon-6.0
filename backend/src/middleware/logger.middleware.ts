import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

interface RequestWithId extends Request {
  requestId?: string;
  startTime?: number;
}

export function requestLogger(
  req: RequestWithId,
  res: Response,
  next: NextFunction
): void {
  // Generate request ID
  req.requestId = req.headers['x-request-id'] as string || uuidv4();
  req.startTime = Date.now();

  // Add request ID to response headers
  res.setHeader('X-Request-ID', req.requestId);

  // Log incoming request
  logger.info(`Incoming request`, {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
  });

  // Log response on finish
  res.on('finish', () => {
    const duration = Date.now() - (req.startTime || 0);
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

    logger[logLevel](`Request completed`, {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('content-length'),
    });
  });

  next();
}
