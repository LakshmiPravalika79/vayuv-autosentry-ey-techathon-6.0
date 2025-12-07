import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.middleware';
import { NotFoundError } from '../middleware/error.middleware';
import { RedisService } from '../services/redis.service';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();
const redis = RedisService.getInstance();

/**
 * @swagger
 * /api/v1/predictions/{vehicleId}:
 *   get:
 *     tags: [Predictions]
 *     summary: Get predictions for a vehicle
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: vehicleId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: acknowledged
 *         in: query
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Vehicle predictions
 */
router.get('/:vehicleId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as Request & { userId: string; userRole: string };
    const { vehicleId } = req.params;
    const acknowledged = req.query.acknowledged === 'true';

    // Verify vehicle ownership
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    if (authReq.userRole !== 'ADMIN' && vehicle.userId !== authReq.userId) {
      throw new NotFoundError('Vehicle not found');
    }

    const where: Record<string, unknown> = { vehicleId };
    if (req.query.acknowledged !== undefined) {
      where.isAcknowledged = acknowledged;
    }

    const predictions = await prisma.prediction.findMany({
      where,
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    res.json({
      success: true,
      data: predictions,
      count: predictions.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/predictions/{id}/acknowledge:
 *   post:
 *     tags: [Predictions]
 *     summary: Acknowledge a prediction
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
 *         description: Prediction acknowledged
 */
router.post('/:id/acknowledge', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as Request & { userId: string; userRole: string };
    const { id } = req.params;

    // Get prediction with vehicle
    const prediction = await prisma.prediction.findUnique({
      where: { id },
      include: { vehicle: true },
    });

    if (!prediction) {
      throw new NotFoundError('Prediction not found');
    }

    if (authReq.userRole !== 'ADMIN' && prediction.vehicle.userId !== authReq.userId) {
      throw new NotFoundError('Prediction not found');
    }

    // Update prediction
    const updated = await prisma.prediction.update({
      where: { id },
      data: {
        isAcknowledged: true,
        acknowledgedAt: new Date(),
      },
    });

    logger.info(`Prediction ${id} acknowledged by user ${authReq.userId}`);

    res.json({
      success: true,
      message: 'Prediction acknowledged',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/predictions/trigger/{vehicleId}:
 *   post:
 *     tags: [Predictions]
 *     summary: Trigger prediction analysis for a vehicle
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: vehicleId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       202:
 *         description: Analysis triggered
 */
router.post('/trigger/:vehicleId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as Request & { userId: string; userRole: string };
    const { vehicleId } = req.params;

    // Verify vehicle ownership
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    if (authReq.userRole !== 'ADMIN' && vehicle.userId !== authReq.userId) {
      throw new NotFoundError('Vehicle not found');
    }

    // Publish event to trigger ML analysis
    await redis.publish('prediction:trigger', {
      vehicleId,
      userId: authReq.userId,
      timestamp: new Date().toISOString(),
    });

    logger.info(`Prediction analysis triggered for vehicle ${vehicleId}`);

    res.status(202).json({
      success: true,
      message: 'Prediction analysis triggered',
      data: {
        vehicleId,
        status: 'processing',
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
