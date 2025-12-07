import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.middleware';
import { NotFoundError, BadRequestError } from '../middleware/error.middleware';
import { RedisService } from '../services/redis.service';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();
const redis = RedisService.getInstance();

/**
 * @swagger
 * /api/v1/telemetry/{vehicleId}:
 *   get:
 *     tags: [Telemetry]
 *     summary: Get telemetry data for a vehicle
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: vehicleId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: limit
 *         in: query
 *         schema:
 *           type: number
 *           default: 100
 *       - name: startDate
 *         in: query
 *         schema:
 *           type: string
 *       - name: endDate
 *         in: query
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Telemetry data
 */
router.get('/:vehicleId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as Request & { userId: string; userRole: string };
    const { vehicleId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    // Verify vehicle ownership
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    if (authReq.userRole !== 'ADMIN' && vehicle.userId !== authReq.userId) {
      throw new NotFoundError('Vehicle not found');
    }

    // Build query
    const where: Record<string, unknown> = { vehicleId };
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        (where.timestamp as Record<string, unknown>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.timestamp as Record<string, unknown>).lte = new Date(endDate);
      }
    }

    const telemetry = await prisma.telemetryReading.findMany({
      where,
      take: Math.min(limit, 1000),
      orderBy: { timestamp: 'desc' },
    });

    res.json({
      success: true,
      data: telemetry,
      count: telemetry.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/telemetry/{vehicleId}/latest:
 *   get:
 *     tags: [Telemetry]
 *     summary: Get latest telemetry reading
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: vehicleId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Latest telemetry reading
 */
router.get('/:vehicleId/latest', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as Request & { userId: string; userRole: string };
    const { vehicleId } = req.params;

    // Check cache first
    const cached = await redis.getJson<unknown>(`telemetry:latest:${vehicleId}`);
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        source: 'cache',
      });
    }

    // Verify vehicle ownership
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    if (authReq.userRole !== 'ADMIN' && vehicle.userId !== authReq.userId) {
      throw new NotFoundError('Vehicle not found');
    }

    const telemetry = await prisma.telemetryReading.findFirst({
      where: { vehicleId },
      orderBy: { timestamp: 'desc' },
    });

    if (!telemetry) {
      return res.json({
        success: true,
        data: null,
        message: 'No telemetry data available',
      });
    }

    // Cache for 60 seconds
    await redis.setJson(`telemetry:latest:${vehicleId}`, telemetry, 60);

    res.json({
      success: true,
      data: telemetry,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/telemetry/{vehicleId}:
 *   post:
 *     tags: [Telemetry]
 *     summary: Submit new telemetry reading
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: vehicleId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Telemetry recorded
 */
router.post('/:vehicleId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
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

    // Create telemetry reading
    const telemetry = await prisma.telemetryReading.create({
      data: {
        vehicleId,
        engineTemp: req.body.engineTemp,
        oilPressure: req.body.oilPressure,
        oilLevel: req.body.oilLevel,
        coolantTemp: req.body.coolantTemp,
        coolantLevel: req.body.coolantLevel,
        rpm: req.body.rpm,
        batteryVoltage: req.body.batteryVoltage,
        batteryHealth: req.body.batteryHealth,
        alternatorOutput: req.body.alternatorOutput,
        brakePadFront: req.body.brakePadFront,
        brakePadRear: req.body.brakePadRear,
        brakeFluidLevel: req.body.brakeFluidLevel,
        tirePressureFl: req.body.tirePressureFl,
        tirePressureFr: req.body.tirePressureFr,
        tirePressureRl: req.body.tirePressureRl,
        tirePressureRr: req.body.tirePressureRr,
        tireWearFl: req.body.tireWearFl,
        tireWearFr: req.body.tireWearFr,
        tireWearRl: req.body.tireWearRl,
        tireWearRr: req.body.tireWearRr,
        transmissionTemp: req.body.transmissionTemp,
        transmissionFluid: req.body.transmissionFluid,
        fuelLevel: req.body.fuelLevel,
        fuelEfficiency: req.body.fuelEfficiency,
        mileage: req.body.mileage,
        speed: req.body.speed,
        location: req.body.location,
        dtcCodes: req.body.dtcCodes || [],
        rawData: req.body.rawData,
      },
    });

    // Update vehicle mileage if provided
    if (req.body.mileage && req.body.mileage > vehicle.mileage) {
      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: { mileage: req.body.mileage },
      });
    }

    // Invalidate cache
    await redis.del(`telemetry:latest:${vehicleId}`);

    // Publish event for analysis
    await redis.publish('telemetry:new', {
      vehicleId,
      telemetryId: telemetry.id,
      timestamp: telemetry.timestamp,
    });

    logger.info(`Telemetry recorded for vehicle ${vehicleId}`);

    res.status(201).json({
      success: true,
      message: 'Telemetry recorded',
      data: telemetry,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/telemetry/{vehicleId}/batch:
 *   post:
 *     tags: [Telemetry]
 *     summary: Submit batch telemetry readings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: vehicleId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               readings:
 *                 type: array
 *     responses:
 *       201:
 *         description: Telemetry batch recorded
 */
router.post('/:vehicleId/batch', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as Request & { userId: string; userRole: string };
    const { vehicleId } = req.params;
    const { readings } = req.body;

    if (!readings || !Array.isArray(readings)) {
      throw new BadRequestError('readings array is required');
    }

    if (readings.length > 100) {
      throw new BadRequestError('Maximum 100 readings per batch');
    }

    // Verify vehicle ownership
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    if (authReq.userRole !== 'ADMIN' && vehicle.userId !== authReq.userId) {
      throw new NotFoundError('Vehicle not found');
    }

    // Create batch readings
    const created = await prisma.telemetryReading.createMany({
      data: readings.map((reading: Record<string, unknown>) => ({
        vehicleId,
        ...reading,
        dtcCodes: reading.dtcCodes || [],
      })),
    });

    // Invalidate cache
    await redis.del(`telemetry:latest:${vehicleId}`);

    // Publish event for analysis
    await redis.publish('telemetry:batch', {
      vehicleId,
      count: created.count,
      timestamp: new Date().toISOString(),
    });

    logger.info(`Batch telemetry recorded for vehicle ${vehicleId}: ${created.count} readings`);

    res.status(201).json({
      success: true,
      message: 'Batch telemetry recorded',
      data: { count: created.count },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/telemetry/{vehicleId}/stats:
 *   get:
 *     tags: [Telemetry]
 *     summary: Get telemetry statistics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: vehicleId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: days
 *         in: query
 *         schema:
 *           type: number
 *           default: 30
 *     responses:
 *       200:
 *         description: Telemetry statistics
 */
router.get('/:vehicleId/stats', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as Request & { userId: string; userRole: string };
    const { vehicleId } = req.params;
    const days = parseInt(req.query.days as string) || 30;

    // Verify vehicle ownership
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    if (authReq.userRole !== 'ADMIN' && vehicle.userId !== authReq.userId) {
      throw new NotFoundError('Vehicle not found');
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get telemetry data for analysis
    const telemetry = await prisma.telemetryReading.findMany({
      where: {
        vehicleId,
        timestamp: { gte: startDate },
      },
      orderBy: { timestamp: 'asc' },
    });

    if (telemetry.length === 0) {
      return res.json({
        success: true,
        data: {
          message: 'No telemetry data available for this period',
          readingsCount: 0,
        },
      });
    }

    // Calculate statistics
    const stats: Record<string, { min: number; max: number; avg: number; current: number | null }> = {};
    const metrics = [
      'engineTemp', 'oilPressure', 'batteryVoltage', 'batteryHealth',
      'brakePadFront', 'brakePadRear', 'fuelEfficiency',
    ];

    for (const metric of metrics) {
      const values = telemetry
        .map(t => t[metric as keyof typeof t] as number | null)
        .filter((v): v is number => v !== null);

      if (values.length > 0) {
        stats[metric] = {
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          current: values[values.length - 1],
        };
      }
    }

    res.json({
      success: true,
      data: {
        vehicleId,
        periodDays: days,
        readingsCount: telemetry.length,
        firstReading: telemetry[0].timestamp,
        lastReading: telemetry[telemetry.length - 1].timestamp,
        statistics: stats,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
