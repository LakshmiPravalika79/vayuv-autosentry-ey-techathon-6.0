import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from './error.middleware';
import { logger } from '../utils/logger';

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
  userRole?: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Authentication middleware
 * Verifies JWT token and attaches user info to request
 */
export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No authentication token provided');
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    // Attach user info to request
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    req.userRole = decoded.role;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid token');
    }
    throw error;
  }
}

/**
 * Optional authentication middleware
 * Attaches user info if token is present, but doesn't require it
 */
export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      
      req.userId = decoded.userId;
      req.userEmail = decoded.email;
      req.userRole = decoded.role;
    }

    next();
  } catch (error) {
    // Log but don't block - token is optional
    logger.debug('Optional auth failed:', error);
    next();
  }
}

/**
 * Role-based authorization middleware
 * Must be used after authenticate middleware
 */
export function authorize(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.userId || !req.userRole) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!allowedRoles.includes(req.userRole)) {
      logger.warn(`Authorization failed: User ${req.userId} with role ${req.userRole} attempted to access resource requiring ${allowedRoles.join(', ')}`);
      throw new ForbiddenError('You do not have permission to access this resource');
    }

    next();
  };
}

/**
 * Generate JWT token
 */
export function generateToken(userId: string, email: string, role: string): string {
  return jwt.sign(
    { userId, email, role },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(userId: string): string {
  const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-in-production';
  return jwt.sign(
    { userId, type: 'refresh' },
    REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): { userId: string } {
  const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-in-production';
  const decoded = jwt.verify(token, REFRESH_SECRET) as { userId: string; type: string };
  
  if (decoded.type !== 'refresh') {
    throw new UnauthorizedError('Invalid refresh token');
  }
  
  return { userId: decoded.userId };
}
