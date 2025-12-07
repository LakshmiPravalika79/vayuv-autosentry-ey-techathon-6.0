import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { NotFoundError, ValidationError } from '../middleware/error.middleware';
import { RedisService } from '../services/redis.service';
import { logger } from '../utils/logger';
import axios from 'axios';

const router = Router();
const prisma = new PrismaClient();
const redis = RedisService.getInstance();

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || 'http://localhost:8002';

// Validation schemas
const triggerAgentSchema = z.object({
  agentType: z.enum(['data_analysis', 'diagnosis', 'customer_engagement', 'scheduling', 'feedback', 'rca_capa']),
  vehicleId: z.string().uuid().optional(),
  payload: z.record(z.unknown()).optional(),
});

const rcaCapaSchema = z.object({
  vehicleId: z.string().uuid(),
  issueDescription: z.string().min(10),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  category: z.enum(['ENGINE', 'TRANSMISSION', 'BRAKES', 'ELECTRICAL', 'SUSPENSION', 'OTHER']),
});

/**
 * @swagger
 * /api/v1/agents/status:
 *   get:
 *     tags: [Agents]
 *     summary: Get agent system status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Agent system status
 */
router.get('/status', authenticate, authorize(['ADMIN', 'TECHNICIAN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check agent service health
    let agentServiceStatus = 'unknown';
    let mlServiceStatus = 'unknown';
    let uebaServiceStatus = 'unknown';

    try {
      await axios.get(`${AGENT_SERVICE_URL}/health`, { timeout: 2000 });
      agentServiceStatus = 'healthy';
    } catch {
      agentServiceStatus = 'unhealthy';
    }

    try {
      await axios.get(`${process.env.ML_SERVICE_URL || 'http://localhost:8000'}/health`, { timeout: 2000 });
      mlServiceStatus = 'healthy';
    } catch {
      mlServiceStatus = 'unhealthy';
    }

    try {
      await axios.get(`${process.env.UEBA_SERVICE_URL || 'http://localhost:8001'}/health`, { timeout: 2000 });
      uebaServiceStatus = 'healthy';
    } catch {
      uebaServiceStatus = 'unhealthy';
    }

    // Get Redis connection status
    const redisStatus = redis.isConnected() ? 'connected' : 'disconnected';

    res.json({
      success: true,
      data: {
        agentService: agentServiceStatus,
        mlService: mlServiceStatus,
        uebaService: uebaServiceStatus,
        redis: redisStatus,
        agents: [
          { name: 'Data Analysis Agent', status: 'active' },
          { name: 'Diagnosis Agent', status: 'active' },
          { name: 'Customer Engagement Agent', status: 'active' },
          { name: 'Scheduling Agent', status: 'active' },
          { name: 'Feedback Agent', status: 'active' },
          { name: 'RCA/CAPA Agent', status: 'active' },
        ],
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/agents/trigger:
 *   post:
 *     tags: [Agents]
 *     summary: Trigger a specific agent
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - agentType
 *     responses:
 *       202:
 *         description: Agent triggered
 */
router.post('/trigger', authenticate, authorize(['ADMIN', 'TECHNICIAN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as Request & { userId: string };
    const validation = triggerAgentSchema.safeParse(req.body);

    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const { agentType, vehicleId, payload } = validation.data;

    // Trigger agent via Redis
    await redis.triggerAgent(agentType, {
      triggeredBy: authReq.userId,
      vehicleId,
      timestamp: new Date().toISOString(),
      ...payload,
    });

    logger.info(`Agent ${agentType} triggered by user ${authReq.userId}`);

    res.status(202).json({
      success: true,
      message: `Agent ${agentType} triggered successfully`,
      data: {
        agentType,
        status: 'processing',
        triggeredAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/agents/analyze/{vehicleId}:
 *   post:
 *     tags: [Agents]
 *     summary: Run full analysis on a vehicle
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
 *         description: Analysis started
 */
router.post('/analyze/:vehicleId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as Request & { userId: string; userRole: string };
    const { vehicleId } = req.params;

    // Verify vehicle exists and user has access
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });

    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    if (authReq.userRole !== 'ADMIN' && authReq.userRole !== 'TECHNICIAN' && vehicle.userId !== authReq.userId) {
      throw new NotFoundError('Vehicle not found');
    }

    // Trigger master agent for comprehensive analysis
    await redis.publish('agent:master', {
      command: 'full_analysis',
      vehicleId,
      userId: authReq.userId,
      timestamp: new Date().toISOString(),
    });

    logger.info(`Full analysis triggered for vehicle ${vehicleId} by user ${authReq.userId}`);

    res.status(202).json({
      success: true,
      message: 'Full vehicle analysis initiated',
      data: {
        vehicleId,
        status: 'processing',
        estimatedCompletion: '30-60 seconds',
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/agents/rca-capa:
 *   post:
 *     tags: [Agents]
 *     summary: Create RCA/CAPA record
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vehicleId
 *               - issueDescription
 *               - severity
 *               - category
 *     responses:
 *       201:
 *         description: RCA/CAPA created
 */
router.post('/rca-capa', authenticate, authorize(['ADMIN', 'TECHNICIAN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as Request & { userId: string };
    const validation = rcaCapaSchema.safeParse(req.body);

    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const { vehicleId, issueDescription, severity, category } = validation.data;

    // Verify vehicle exists
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    // Create RCA/CAPA record
    const rcaCapa = await prisma.rCACapa.create({
      data: {
        vehicleId,
        issue: issueDescription,
        rootCause: 'Analysis pending...',
        correctiveAction: 'Pending RCA completion',
        preventiveAction: 'Pending RCA completion',
        status: 'OPEN',
        severity,
        category,
      },
    });

    // Trigger RCA/CAPA agent
    await redis.triggerAgent('rca_capa', {
      action: 'analyze',
      rcaCapaId: rcaCapa.id,
      vehicleId,
      issueDescription,
      severity,
      category,
      triggeredBy: authReq.userId,
    });

    logger.info(`RCA/CAPA ${rcaCapa.id} created for vehicle ${vehicleId}`);

    res.status(201).json({
      success: true,
      message: 'RCA/CAPA analysis initiated',
      data: rcaCapa,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/agents/rca-capa:
 *   get:
 *     tags: [Agents]
 *     summary: Get RCA/CAPA records
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: RCA/CAPA records
 */
router.get('/rca-capa', authenticate, authorize(['ADMIN', 'TECHNICIAN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { vehicleId, status, severity } = req.query;

    const where: Record<string, unknown> = {};
    if (vehicleId) where.vehicleId = vehicleId;
    if (status) where.status = status;
    if (severity) where.severity = severity;

    const records = await prisma.rCACapa.findMany({
      where,
      include: {
        vehicle: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: records,
      count: records.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/agents/rca-capa/{id}:
 *   get:
 *     tags: [Agents]
 *     summary: Get RCA/CAPA details
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
 *         description: RCA/CAPA details
 */
router.get('/rca-capa/:id', authenticate, authorize(['ADMIN', 'TECHNICIAN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const record = await prisma.rCACapa.findUnique({
      where: { id },
      include: {
        vehicle: true,
      },
    });

    if (!record) {
      throw new NotFoundError('RCA/CAPA record not found');
    }

    res.json({
      success: true,
      data: record,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/agents/rca-capa/{id}:
 *   patch:
 *     tags: [Agents]
 *     summary: Update RCA/CAPA record
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
 *         description: RCA/CAPA updated
 */
router.patch('/rca-capa/:id', authenticate, authorize(['ADMIN', 'TECHNICIAN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as Request & { userId: string };
    const { id } = req.params;
    const { rootCause, correctiveAction, preventiveAction, status } = req.body;

    const record = await prisma.rCACapa.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundError('RCA/CAPA record not found');
    }

    const updateData: Record<string, unknown> = {};
    if (rootCause) updateData.rootCause = rootCause;
    if (correctiveAction) updateData.correctiveAction = correctiveAction;
    if (preventiveAction) updateData.preventiveAction = preventiveAction;
    if (status) updateData.status = status;

    const updated = await prisma.rCACapa.update({
      where: { id },
      data: updateData,
    });

    logger.info(`RCA/CAPA ${id} updated by user ${authReq.userId}`);

    res.json({
      success: true,
      message: 'RCA/CAPA updated',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
