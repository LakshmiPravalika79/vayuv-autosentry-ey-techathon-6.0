import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth.middleware';
import axios from 'axios';

const router = Router();
const prisma = new PrismaClient();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * @swagger
 * /api/v1/dashboard:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get dashboard overview data
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard overview
 */
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as Request & { userId: string; userRole: string };

    // Get user-specific or all data based on role
    const vehicleWhere = authReq.userRole === 'ADMIN' ? {} : { userId: authReq.userId };
    const alertWhere = authReq.userRole === 'ADMIN' ? {} : { userId: authReq.userId };

    // Fetch all dashboard data in parallel
    const [
      vehicles,
      alerts,
      appointments,
      predictions,
      feedbacks,
    ] = await Promise.all([
      prisma.vehicle.findMany({ where: vehicleWhere }),
      prisma.alert.findMany({ where: alertWhere, orderBy: { createdAt: 'desc' }, take: 10 }),
      prisma.appointment.findMany({
        where: authReq.userRole === 'ADMIN' ? {} : { vehicle: { userId: authReq.userId } },
        orderBy: { scheduledDate: 'asc' },
      }),
      prisma.prediction.findMany({
        where: authReq.userRole === 'ADMIN' ? {} : { vehicle: { userId: authReq.userId } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.feedback.findMany(),
    ]);

    // Calculate statistics
    const vehicleStats = {
      total: vehicles.length,
      active: vehicles.filter((v) => v.status === 'ACTIVE').length,
      maintenance: vehicles.filter((v) => v.status === 'MAINTENANCE').length,
      inactive: vehicles.filter((v) => v.status === 'INACTIVE').length,
    };

    const alertStats = {
      total: alerts.length,
      unread: alerts.filter((a) => !a.isRead).length,
      critical: alerts.filter((a) => a.type === 'CRITICAL').length,
      warning: alerts.filter((a) => a.type === 'WARNING').length,
    };

    const upcomingAppointments = appointments.filter(
      (a) => new Date(a.scheduledDate) > new Date() && a.status !== 'CANCELLED'
    ).slice(0, 5);

    const recentPredictions = predictions.filter(
      (p) => !p.isAcknowledged
    ).slice(0, 5);

    const predictionStats = {
      total: predictions.length,
      unacknowledged: predictions.filter((p) => !p.isAcknowledged).length,
      critical: predictions.filter((p) => p.severity === 'CRITICAL').length,
      high: predictions.filter((p) => p.severity === 'HIGH').length,
    };

    // Calculate average feedback rating
    const avgRating = feedbacks.length > 0
      ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length
      : 0;

    res.json({
      success: true,
      data: {
        vehicles: vehicleStats,
        alerts: {
          ...alertStats,
          recent: alerts.slice(0, 5),
        },
        appointments: {
          upcoming: upcomingAppointments,
          total: appointments.length,
          scheduled: appointments.filter((a) => a.status === 'SCHEDULED').length,
          completed: appointments.filter((a) => a.status === 'COMPLETED').length,
        },
        predictions: {
          ...predictionStats,
          recent: recentPredictions,
        },
        feedback: {
          total: feedbacks.length,
          averageRating: Math.round(avgRating * 100) / 100,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/dashboard/vehicle/{vehicleId}:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get vehicle-specific dashboard data
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
 *         description: Vehicle dashboard
 */
router.get('/vehicle/:vehicleId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as Request & { userId: string; userRole: string };
    const { vehicleId } = req.params;

    // Verify access
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: { owner: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    if (authReq.userRole !== 'ADMIN' && vehicle.userId !== authReq.userId) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    // Fetch vehicle-specific data
    const [telemetry, predictions, appointments, rcaCapas] = await Promise.all([
      prisma.telemetry.findMany({
        where: { vehicleId },
        orderBy: { timestamp: 'desc' },
        take: 100,
      }),
      prisma.prediction.findMany({
        where: { vehicleId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.appointment.findMany({
        where: { vehicleId },
        orderBy: { scheduledDate: 'desc' },
        include: { feedback: true },
      }),
      prisma.rCACapa.findMany({
        where: { vehicleId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Calculate health score from recent telemetry
    const latestTelemetry = telemetry[0];
    let healthScore = 100;

    if (latestTelemetry?.data) {
      const data = latestTelemetry.data as Record<string, unknown>;
      const engineTemp = (data.engine_temperature as number) || 90;
      const batteryVoltage = (data.battery_voltage as number) || 12.5;
      const oilPressure = (data.oil_pressure as number) || 40;

      // Simple health calculation
      if (engineTemp > 100) healthScore -= 15;
      if (engineTemp > 110) healthScore -= 20;
      if (batteryVoltage < 12) healthScore -= 10;
      if (batteryVoltage < 11.5) healthScore -= 15;
      if (oilPressure < 30) healthScore -= 15;

      healthScore = Math.max(0, Math.min(100, healthScore));
    }

    // Digital twin data
    const digitalTwin = {
      vehicleInfo: {
        id: vehicle.id,
        vin: vehicle.vin,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        mileage: vehicle.mileage,
        status: vehicle.status,
      },
      healthScore,
      latestTelemetry: latestTelemetry || null,
      componentStatus: {
        engine: healthScore > 70 ? 'GOOD' : healthScore > 40 ? 'WARNING' : 'CRITICAL',
        transmission: 'GOOD',
        brakes: predictions.some((p) => p.component === 'BRAKES' && p.severity === 'HIGH') ? 'WARNING' : 'GOOD',
        battery: 'GOOD',
        tires: 'GOOD',
      },
      maintenanceHistory: appointments.filter((a) => a.status === 'COMPLETED').slice(0, 5),
      activePredictions: predictions.filter((p) => !p.isAcknowledged),
      rcaHistory: rcaCapas.slice(0, 5),
    };

    res.json({
      success: true,
      data: {
        vehicle,
        digitalTwin,
        telemetryCount: telemetry.length,
        predictionCount: predictions.length,
        appointmentCount: appointments.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/dashboard/analytics:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get analytics data (admin/technician)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics data
 */
router.get('/analytics', authenticate, authorize(['ADMIN', 'TECHNICIAN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get data for analytics
    const [
      totalVehicles,
      totalUsers,
      totalAppointments,
      totalPredictions,
      feedbacks,
      telemetryCount,
    ] = await Promise.all([
      prisma.vehicle.count(),
      prisma.user.count(),
      prisma.appointment.count(),
      prisma.prediction.count(),
      prisma.feedback.findMany(),
      prisma.telemetry.count(),
    ]);

    // Get appointments by status
    const appointmentsByStatus = await prisma.appointment.groupBy({
      by: ['status'],
      _count: true,
    });

    // Get predictions by severity
    const predictionsBySeverity = await prisma.prediction.groupBy({
      by: ['severity'],
      _count: true,
    });

    // Calculate feedback metrics
    const avgRating = feedbacks.length > 0
      ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length
      : 0;

    const sentimentDistribution = {
      positive: feedbacks.filter((f) => f.sentiment === 'POSITIVE').length,
      neutral: feedbacks.filter((f) => f.sentiment === 'NEUTRAL').length,
      negative: feedbacks.filter((f) => f.sentiment === 'NEGATIVE').length,
    };

    // Get ML service stats
    let mlServiceStats = null;
    try {
      const response = await axios.get(`${ML_SERVICE_URL}/stats`, { timeout: 3000 });
      mlServiceStats = response.data;
    } catch {
      // ML service unavailable
    }

    res.json({
      success: true,
      data: {
        overview: {
          totalVehicles,
          totalUsers,
          totalAppointments,
          totalPredictions,
          totalTelemetryRecords: telemetryCount,
          totalFeedbacks: feedbacks.length,
        },
        appointments: {
          byStatus: appointmentsByStatus.reduce((acc, curr) => {
            acc[curr.status] = curr._count;
            return acc;
          }, {} as Record<string, number>),
        },
        predictions: {
          bySeverity: predictionsBySeverity.reduce((acc, curr) => {
            acc[curr.severity] = curr._count;
            return acc;
          }, {} as Record<string, number>),
        },
        feedback: {
          averageRating: Math.round(avgRating * 100) / 100,
          sentimentDistribution,
          totalResponses: feedbacks.length,
        },
        mlService: mlServiceStats,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/dashboard/health:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get system health status
 *     responses:
 *       200:
 *         description: System health
 */
router.get('/health', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const services: Record<string, string> = {
      api: 'healthy',
      database: 'unknown',
      mlService: 'unknown',
      uebaService: 'unknown',
    };

    // Check database
    try {
      await prisma.$queryRaw`SELECT 1`;
      services.database = 'healthy';
    } catch {
      services.database = 'unhealthy';
    }

    // Check ML service
    try {
      await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 2000 });
      services.mlService = 'healthy';
    } catch {
      services.mlService = 'unhealthy';
    }

    // Check UEBA service
    try {
      await axios.get(`${process.env.UEBA_SERVICE_URL || 'http://localhost:8001'}/health`, { timeout: 2000 });
      services.uebaService = 'healthy';
    } catch {
      services.uebaService = 'unhealthy';
    }

    const allHealthy = Object.values(services).every((s) => s === 'healthy');

    res.status(allHealthy ? 200 : 503).json({
      success: allHealthy,
      status: allHealthy ? 'healthy' : 'degraded',
      services,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
