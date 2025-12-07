import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { NotFoundError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import axios from 'axios';

const router = Router();
const prisma = new PrismaClient();

const UEBA_SERVICE_URL = process.env.UEBA_SERVICE_URL || 'http://localhost:8001';

/**
 * @swagger
 * /api/v1/alerts:
 *   get:
 *     tags: [Alerts]
 *     summary: Get user's alerts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: type
 *         in: query
 *         schema:
 *           type: string
 *           enum: [INFO, WARNING, ERROR, CRITICAL]
 *       - name: read
 *         in: query
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of alerts
 */
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as Request & { userId: string; userRole: string };
    const { type, read, vehicleId } = req.query;

    const where: Record<string, unknown> = {};

    // Regular users can only see their own alerts
    if (authReq.userRole !== 'ADMIN') {
      where.userId = authReq.userId;
    }

    if (type) where.type = type;
    if (read !== undefined) where.isRead = read === 'true';
    if (vehicleId) where.vehicleId = vehicleId;

    const alerts = await prisma.alert.findMany({
      where,
      include: {
        vehicle: true,
      },
      orderBy: [
        { isRead: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    res.json({
      success: true,
      data: alerts,
      count: alerts.length,
      unreadCount: alerts.filter((a) => !a.isRead).length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/alerts/{id}/read:
 *   post:
 *     tags: [Alerts]
 *     summary: Mark alert as read
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Alert marked as read
 */
router.post('/:id/read', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as Request & { userId: string; userRole: string };
    const { id } = req.params;

    const alert = await prisma.alert.findUnique({ where: { id } });

    if (!alert) {
      throw new NotFoundError('Alert not found');
    }

    if (authReq.userRole !== 'ADMIN' && alert.userId !== authReq.userId) {
      throw new NotFoundError('Alert not found');
    }

    const updated = await prisma.alert.update({
      where: { id },
      data: { isRead: true },
    });

    res.json({
      success: true,
      message: 'Alert marked as read',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/alerts/read-all:
 *   post:
 *     tags: [Alerts]
 *     summary: Mark all alerts as read
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All alerts marked as read
 */
router.post('/read-all', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as Request & { userId: string };

    await prisma.alert.updateMany({
      where: {
        userId: authReq.userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    res.json({
      success: true,
      message: 'All alerts marked as read',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/alerts/ueba:
 *   get:
 *     tags: [Alerts]
 *     summary: Get UEBA anomaly alerts (admin/technician)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: UEBA alerts
 */
router.get('/ueba', authenticate, authorize(['ADMIN', 'TECHNICIAN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get anomalies from UEBA service
    let uebaAlerts = [];

    try {
      const response = await axios.get(`${UEBA_SERVICE_URL}/anomalies`, { timeout: 5000 });
      uebaAlerts = response.data.anomalies || [];
    } catch (error) {
      logger.warn('Failed to fetch UEBA anomalies', { error });
    }

    // Also get UEBA-related alerts from database
    const dbAlerts = await prisma.alert.findMany({
      where: {
        message: {
          contains: 'UEBA',
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({
      success: true,
      data: {
        liveAnomalies: uebaAlerts,
        historicalAlerts: dbAlerts,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/alerts/ueba/analyze:
 *   post:
 *     tags: [Alerts]
 *     summary: Trigger UEBA analysis for a user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: UEBA analysis result
 */
router.post('/ueba/analyze', authenticate, authorize(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required',
      });
    }

    // Get user's recent activity
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Prepare behavior data for UEBA
    const behaviorData = {
      user_id: userId,
      login_hour: new Date().getHours(),
      session_duration: Math.random() * 120 + 10, // Simulated
      api_calls: Math.floor(Math.random() * 50) + 5,
      unique_endpoints: Math.floor(Math.random() * 15) + 3,
      failed_attempts: Math.floor(Math.random() * 3),
      data_volume_mb: Math.random() * 100,
      geolocation_changes: Math.floor(Math.random() * 2),
    };

    // Send to UEBA service
    let analysisResult;
    try {
      const response = await axios.post(`${UEBA_SERVICE_URL}/analyze`, behaviorData, {
        timeout: 10000,
      });
      analysisResult = response.data;
    } catch (error) {
      logger.error('UEBA analysis failed', { error });
      return res.status(503).json({
        success: false,
        message: 'UEBA service unavailable',
      });
    }

    // If anomaly detected, create alert
    if (analysisResult.is_anomaly) {
      await prisma.alert.create({
        data: {
          userId,
          type: 'WARNING',
          message: `UEBA anomaly detected: ${analysisResult.anomaly_details?.reason || 'Unusual behavior pattern'}`,
        },
      });
    }

    res.json({
      success: true,
      data: {
        userId,
        email: user.email,
        analysis: analysisResult,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/alerts/stats:
 *   get:
 *     tags: [Alerts]
 *     summary: Get alert statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Alert statistics
 */
router.get('/stats', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as Request & { userId: string; userRole: string };

    const where: Record<string, unknown> = {};
    if (authReq.userRole !== 'ADMIN') {
      where.userId = authReq.userId;
    }

    const alerts = await prisma.alert.findMany({ where });

    const stats = {
      total: alerts.length,
      unread: alerts.filter((a) => !a.isRead).length,
      byType: {
        INFO: alerts.filter((a) => a.type === 'INFO').length,
        WARNING: alerts.filter((a) => a.type === 'WARNING').length,
        ERROR: alerts.filter((a) => a.type === 'ERROR').length,
        CRITICAL: alerts.filter((a) => a.type === 'CRITICAL').length,
      },
      recentCount: alerts.filter((a) => {
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return new Date(a.createdAt) > dayAgo;
      }).length,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/alerts/{id}:
 *   delete:
 *     tags: [Alerts]
 *     summary: Delete an alert
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Alert deleted
 */
router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as Request & { userId: string; userRole: string };
    const { id } = req.params;

    const alert = await prisma.alert.findUnique({ where: { id } });

    if (!alert) {
      throw new NotFoundError('Alert not found');
    }

    if (authReq.userRole !== 'ADMIN' && alert.userId !== authReq.userId) {
      throw new NotFoundError('Alert not found');
    }

    await prisma.alert.delete({ where: { id } });

    logger.info(`Alert ${id} deleted by user ${authReq.userId}`);

    res.json({
      success: true,
      message: 'Alert deleted',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
