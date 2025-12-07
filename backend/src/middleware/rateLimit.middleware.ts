import { Request, Response, NextFunction } from 'express';
import { TooManyRequestsError } from './error.middleware';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// Rate limit configuration
const config = {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100'), // 100 requests per minute
  message: 'Too many requests, please try again later',
};

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const key in store) {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  }
}, 60000); // Cleanup every minute

export function rateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip rate limiting in test environment
  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  // Get client identifier (IP address or user ID if authenticated)
  const clientId = (req as unknown as { userId?: string }).userId || 
                   req.ip || 
                   req.socket.remoteAddress || 
                   'unknown';

  const now = Date.now();

  // Initialize or get existing rate limit data
  if (!store[clientId] || store[clientId].resetTime < now) {
    store[clientId] = {
      count: 0,
      resetTime: now + config.windowMs,
    };
  }

  // Increment request count
  store[clientId].count++;

  // Calculate remaining requests and reset time
  const remaining = Math.max(0, config.maxRequests - store[clientId].count);
  const resetTime = Math.ceil((store[clientId].resetTime - now) / 1000);

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
  res.setHeader('X-RateLimit-Remaining', remaining.toString());
  res.setHeader('X-RateLimit-Reset', resetTime.toString());

  // Check if rate limit exceeded
  if (store[clientId].count > config.maxRequests) {
    res.setHeader('Retry-After', resetTime.toString());
    throw new TooManyRequestsError(config.message);
  }

  next();
}

// Stricter rate limiter for auth endpoints
export function authRateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authConfig = {
    windowMs: 300000, // 5 minutes
    maxRequests: 10, // 10 attempts per 5 minutes
  };

  const clientId = `auth:${req.ip || req.socket.remoteAddress || 'unknown'}`;
  const now = Date.now();

  if (!store[clientId] || store[clientId].resetTime < now) {
    store[clientId] = {
      count: 0,
      resetTime: now + authConfig.windowMs,
    };
  }

  store[clientId].count++;

  const remaining = Math.max(0, authConfig.maxRequests - store[clientId].count);
  const resetTime = Math.ceil((store[clientId].resetTime - now) / 1000);

  res.setHeader('X-RateLimit-Limit', authConfig.maxRequests.toString());
  res.setHeader('X-RateLimit-Remaining', remaining.toString());
  res.setHeader('X-RateLimit-Reset', resetTime.toString());

  if (store[clientId].count > authConfig.maxRequests) {
    res.setHeader('Retry-After', resetTime.toString());
    throw new TooManyRequestsError('Too many authentication attempts, please try again later');
  }

  next();
}
