import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { BadRequestError, NotFoundError, ValidationError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createVehicleSchema = z.object({
  vin: z.string().length(17, 'VIN must be 17 characters'),
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  year: z.number().min(1900).max(new Date().getFullYear() + 1),
  licensePlate: z.string().optional(),
  color: z.string().optional(),
  mileage: z.number().min(0).optional(),
  purchaseDate: z.string().optional(),
  warrantyExpiry: z.string().optional(),
});

const updateVehicleSchema = createVehicleSchema.partial();

/**
 * @swagger
 * /api/v1/vehicles:
 *   get:
 *     tags: [Vehicles]
 *     summary: Get all vehicles for current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of vehicles
 */
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as Request & { userId: string; userRole: string };

    let where = {};
    
    // Admins can see all vehicles
    if (authReq.userRole !== 'ADMIN') {
      where = { userId: authReq.userId };
    }

    const vehicles = await prisma.vehicle.findMany({
      where,
      include: {
        _count: {
          select: {
            telemetry: true,
            predictions: true,
            appointments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: vehicles,
      count: vehicles.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/vehicles/{id}:
 *   get:
 *     tags: [Vehicles]
 *     summary: Get vehicle by ID
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
 *         description: Vehicle details
 *       404:
 *         description: Vehicle not found
 */
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as Request & { userId: string; userRole: string };
    const { id } = req.params;

    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        predictions: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        alerts: {
          take: 5,
          where: { isDismissed: false },
          orderBy: { createdAt: 'desc' },
        },
        maintenanceRecords: {
          take: 10,
          orderBy: { performedAt: 'desc' },
        },
        appointments: {
          take: 5,
          orderBy: { scheduledDate: 'desc' },
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    // Check ownership (unless admin)
    if (authReq.userRole !== 'ADMIN' && vehicle.userId !== authReq.userId) {
      throw new NotFoundError('Vehicle not found');
    }

    res.json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/vehicles:
 *   post:
 *     tags: [Vehicles]
 *     summary: Add a new vehicle
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [vin, make, model, year]
 *             properties:
 *               vin:
 *                 type: string
 *               make:
 *                 type: string
 *               model:
 *                 type: string
 *               year:
 *                 type: number
 *               licensePlate:
 *                 type: string
 *               color:
 *                 type: string
 *               mileage:
 *                 type: number
 *     responses:
 *       201:
 *         description: Vehicle created
 */
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as Request & { userId: string };

    // Validate input
    const validationResult = createVehicleSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Validation failed', validationResult.error.errors);
    }

    const data = validationResult.data;

    // Check if VIN already exists
    const existingVehicle = await prisma.vehicle.findUnique({
      where: { vin: data.vin },
    });

    if (existingVehicle) {
      throw new BadRequestError('A vehicle with this VIN already exists');
    }

    // Create vehicle
    const vehicle = await prisma.vehicle.create({
      data: {
        ...data,
        userId: authReq.userId,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
        warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : undefined,
      },
    });

    logger.info(`Vehicle created: ${vehicle.id} for user ${authReq.userId}`);

    res.status(201).json({
      success: true,
      message: 'Vehicle added successfully',
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/vehicles/{id}:
 *   put:
 *     tags: [Vehicles]
 *     summary: Update vehicle
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
 *         description: Vehicle updated
 */
router.put('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as Request & { userId: string; userRole: string };
    const { id } = req.params;

    // Check if vehicle exists and user owns it
    const existingVehicle = await prisma.vehicle.findUnique({ where: { id } });
    if (!existingVehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    if (authReq.userRole !== 'ADMIN' && existingVehicle.userId !== authReq.userId) {
      throw new NotFoundError('Vehicle not found');
    }

    // Validate input
    const validationResult = updateVehicleSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Validation failed', validationResult.error.errors);
    }

    const data = validationResult.data;

    // Update vehicle
    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        ...data,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
        warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : undefined,
      },
    });

    logger.info(`Vehicle updated: ${vehicle.id}`);

    res.json({
      success: true,
      message: 'Vehicle updated successfully',
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/vehicles/{id}:
 *   delete:
 *     tags: [Vehicles]
 *     summary: Delete vehicle
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
 *         description: Vehicle deleted
 */
router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as Request & { userId: string; userRole: string };
    const { id } = req.params;

    // Check if vehicle exists and user owns it
    const existingVehicle = await prisma.vehicle.findUnique({ where: { id } });
    if (!existingVehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    if (authReq.userRole !== 'ADMIN' && existingVehicle.userId !== authReq.userId) {
      throw new NotFoundError('Vehicle not found');
    }

    // Soft delete by setting isActive to false
    await prisma.vehicle.update({
      where: { id },
      data: { isActive: false },
    });

    logger.info(`Vehicle deleted: ${id}`);

    res.json({
      success: true,
      message: 'Vehicle deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/vehicles/{id}/health:
 *   get:
 *     tags: [Vehicles]
 *     summary: Get vehicle health summary
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
 *         description: Vehicle health data
 */
router.get('/:id/health', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as Request & { userId: string; userRole: string };
    const { id } = req.params;

    // Get vehicle with latest telemetry
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        telemetry: {
          take: 1,
          orderBy: { timestamp: 'desc' },
        },
        predictions: {
          where: { isAcknowledged: false },
          orderBy: { severity: 'desc' },
          take: 5,
        },
        alerts: {
          where: { isDismissed: false },
          take: 5,
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    if (authReq.userRole !== 'ADMIN' && vehicle.userId !== authReq.userId) {
      throw new NotFoundError('Vehicle not found');
    }

    // Calculate health score based on latest telemetry
    const latestTelemetry = vehicle.telemetry[0];
    let healthScore = 100;
    const issues: string[] = [];

    if (latestTelemetry) {
      // Engine temperature check
      if (latestTelemetry.engineTemp && latestTelemetry.engineTemp > 100) {
        healthScore -= 15;
        issues.push('Engine temperature elevated');
      }

      // Battery check
      if (latestTelemetry.batteryVoltage && latestTelemetry.batteryVoltage < 12) {
        healthScore -= 10;
        issues.push('Battery voltage low');
      }

      // Brake pad check
      if (latestTelemetry.brakePadFront && latestTelemetry.brakePadFront < 3) {
        healthScore -= 20;
        issues.push('Front brake pads worn');
      }
      if (latestTelemetry.brakePadRear && latestTelemetry.brakePadRear < 3) {
        healthScore -= 20;
        issues.push('Rear brake pads worn');
      }

      // Oil pressure check
      if (latestTelemetry.oilPressure && latestTelemetry.oilPressure < 25) {
        healthScore -= 15;
        issues.push('Oil pressure low');
      }
    }

    // Factor in predictions
    const criticalPredictions = vehicle.predictions.filter(p => p.severity === 'CRITICAL').length;
    const highPredictions = vehicle.predictions.filter(p => p.severity === 'HIGH').length;
    healthScore -= criticalPredictions * 10;
    healthScore -= highPredictions * 5;

    healthScore = Math.max(0, Math.min(100, healthScore));

    const healthData = {
      vehicleId: vehicle.id,
      healthScore: Math.round(healthScore),
      status: healthScore >= 80 ? 'Good' : healthScore >= 60 ? 'Fair' : healthScore >= 40 ? 'Poor' : 'Critical',
      issues,
      latestTelemetry,
      activePredictions: vehicle.predictions.length,
      activeAlerts: vehicle.alerts.length,
      lastUpdated: latestTelemetry?.timestamp || null,
    };

    res.json({
      success: true,
      data: healthData,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
