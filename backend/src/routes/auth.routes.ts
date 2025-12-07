import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { 
  authenticate, 
  generateToken, 
  generateRefreshToken, 
  verifyRefreshToken 
} from '../middleware/auth.middleware';
import { authRateLimiter } from '../middleware/rateLimit.middleware';
import { BadRequestError, UnauthorizedError, ConflictError, ValidationError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import { RedisService } from '../services/redis.service';

const router = Router();
const prisma = new PrismaClient();
const redis = RedisService.getInstance();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already exists
 */
router.post('/register', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate input
    const validationResult = registerSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Validation failed', validationResult.error.errors);
    }

    const { email, password, firstName, lastName, phone } = validationResult.data;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const accessToken = generateToken(user.id, user.email, user.role);
    const refreshToken = generateRefreshToken(user.id);

    // Store session
    await prisma.session.create({
      data: {
        userId: user.id,
        token: accessToken,
        refreshToken,
        userAgent: req.get('user-agent'),
        ipAddress: req.ip,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    logger.info(`New user registered: ${user.email}`);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate input
    const validationResult = loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Validation failed', validationResult.error.errors);
    }

    const { email, password } = validationResult.data;

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedError('Account is disabled');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Generate tokens
    const accessToken = generateToken(user.id, user.email, user.role);
    const refreshToken = generateRefreshToken(user.id);

    // Store session
    await prisma.session.create({
      data: {
        userId: user.id,
        token: accessToken,
        refreshToken,
        userAgent: req.get('user-agent'),
        ipAddress: req.ip,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    // Log UEBA event
    await redis.publish('ueba:events', {
      type: 'LOGIN',
      userId: user.id,
      email: user.email,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date().toISOString(),
    });

    logger.info(`User logged in: ${user.email}`);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed
 *       401:
 *         description: Invalid refresh token
 */
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new BadRequestError('Refresh token is required');
    }

    // Verify refresh token
    const { userId } = verifyRefreshToken(refreshToken);

    // Check if session exists
    const session = await prisma.session.findFirst({
      where: { userId, refreshToken },
    });

    if (!session) {
      throw new UnauthorizedError('Invalid session');
    }

    // Get user
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedError('User not found or disabled');
    }

    // Generate new tokens
    const newAccessToken = generateToken(user.id, user.email, user.role);
    const newRefreshToken = generateRefreshToken(user.id);

    // Update session
    await prisma.session.update({
      where: { id: session.id },
      data: {
        token: newAccessToken,
        refreshToken: newRefreshToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/logout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as Request & { userId: string };
    const token = req.headers.authorization?.split(' ')[1];

    // Delete session
    await prisma.session.deleteMany({
      where: {
        userId: authReq.userId,
        token,
      },
    });

    // Log UEBA event
    await redis.publish('ueba:events', {
      type: 'LOGOUT',
      userId: authReq.userId,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 */
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as Request & { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: authReq.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        vehicles: {
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
            vin: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/auth/password:
 *   put:
 *     tags: [Auth]
 *     summary: Change password
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed
 */
router.put('/password', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as Request & { userId: string };
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new BadRequestError('Current and new password are required');
    }

    if (newPassword.length < 8) {
      throw new BadRequestError('New password must be at least 8 characters');
    }

    // Get user with password
    const user = await prisma.user.findUnique({ where: { id: authReq.userId } });
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: authReq.userId },
      data: { password: hashedPassword },
    });

    // Invalidate all sessions
    await prisma.session.deleteMany({
      where: { userId: authReq.userId },
    });

    logger.info(`Password changed for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Password changed successfully. Please login again.',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
