import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { NotFoundError, ValidationError } from '../middleware/error.middleware';
import { RedisService } from '../services/redis.service';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();
const redis = RedisService.getInstance();

// Validation schemas
const createAppointmentSchema = z.object({
  vehicleId: z.string().uuid(),
  serviceType: z.enum(['ROUTINE_MAINTENANCE', 'DIAGNOSTIC', 'REPAIR', 'RECALL', 'INSPECTION']),
  scheduledDate: z.string().datetime(),
  notes: z.string().optional(),
  preferredTechnician: z.string().optional(),
});

const updateAppointmentSchema = z.object({
  scheduledDate: z.string().datetime().optional(),
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  notes: z.string().optional(),
  technicianNotes: z.string().optional(),
});

/**
 * @swagger
 * /api/v1/appointments:
 *   get:
 *     tags: [Appointments]
 *     summary: Get user's appointments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *       - name: vehicleId
 *         in: query
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of appointments
 */
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as Request & { userId: string; userRole: string };
    const { status, vehicleId } = req.query;

    // Build where clause
    const where: Record<string, unknown> = {};

    // Regular users can only see their own vehicles' appointments
    if (authReq.userRole !== 'ADMIN') {
      where.vehicle = { userId: authReq.userId };
    }

    if (status) {
      where.status = status;
    }

    if (vehicleId) {
      where.vehicleId = vehicleId;
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        vehicle: true,
        feedback: true,
      },
      orderBy: { scheduledDate: 'asc' },
    });

    res.json({
      success: true,
      data: appointments,
      count: appointments.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/appointments/availability:
 *   get:
 *     tags: [Appointments]
 *     summary: Check appointment availability
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: date
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - name: serviceType
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Available time slots
 */
router.get('/availability', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date, serviceType } = req.query;

    if (!date || !serviceType) {
      throw new ValidationError('Date and service type are required');
    }

    const targetDate = new Date(date as string);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    // Get existing appointments for the day
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        scheduledDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          not: 'CANCELLED',
        },
      },
    });

    // Define time slots (8 AM - 6 PM, 1-hour slots)
    const allSlots = [
      '08:00', '09:00', '10:00', '11:00', '12:00',
      '13:00', '14:00', '15:00', '16:00', '17:00',
    ];

    // Service duration mapping
    const serviceDuration: Record<string, number> = {
      ROUTINE_MAINTENANCE: 2,
      DIAGNOSTIC: 1,
      REPAIR: 3,
      RECALL: 2,
      INSPECTION: 1,
    };

    // Calculate available slots
    const bookedSlots = existingAppointments.map((apt) => {
      const aptDate = new Date(apt.scheduledDate);
      return `${String(aptDate.getHours()).padStart(2, '0')}:00`;
    });

    const availableSlots = allSlots.filter((slot) => !bookedSlots.includes(slot));

    res.json({
      success: true,
      data: {
        date: date,
        serviceType,
        estimatedDuration: serviceDuration[serviceType as string] || 1,
        availableSlots,
        totalSlots: allSlots.length,
        bookedSlots: bookedSlots.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/appointments:
 *   post:
 *     tags: [Appointments]
 *     summary: Book a new appointment
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
 *               - serviceType
 *               - scheduledDate
 *     responses:
 *       201:
 *         description: Appointment created
 */
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as Request & { userId: string; userRole: string };
    const validation = createAppointmentSchema.safeParse(req.body);

    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const { vehicleId, serviceType, scheduledDate, notes } = validation.data;

    // Verify vehicle ownership
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: { owner: true },
    });

    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    if (authReq.userRole !== 'ADMIN' && vehicle.userId !== authReq.userId) {
      throw new NotFoundError('Vehicle not found');
    }

    // Check for conflicting appointments
    const appointmentDate = new Date(scheduledDate);
    const startWindow = new Date(appointmentDate.getTime() - 60 * 60 * 1000);
    const endWindow = new Date(appointmentDate.getTime() + 60 * 60 * 1000);

    const conflicting = await prisma.appointment.findFirst({
      where: {
        vehicleId,
        scheduledDate: {
          gte: startWindow,
          lte: endWindow,
        },
        status: {
          not: 'CANCELLED',
        },
      },
    });

    if (conflicting) {
      throw new ValidationError('Vehicle already has an appointment scheduled near this time');
    }

    // Create appointment
    const appointment = await prisma.appointment.create({
      data: {
        vehicleId,
        serviceType,
        scheduledDate: appointmentDate,
        notes,
        status: 'SCHEDULED',
      },
      include: { vehicle: true },
    });

    // Trigger scheduling agent via Redis
    await redis.triggerAgent('scheduling', {
      action: 'appointment_created',
      appointmentId: appointment.id,
      vehicleId,
      userId: authReq.userId,
      serviceType,
      scheduledDate,
    });

    // Create alert for user
    await prisma.alert.create({
      data: {
        userId: authReq.userId,
        vehicleId,
        type: 'INFO',
        message: `Appointment scheduled for ${vehicle.make} ${vehicle.model} on ${appointmentDate.toLocaleDateString()}`,
      },
    });

    logger.info(`Appointment ${appointment.id} created for vehicle ${vehicleId}`);

    res.status(201).json({
      success: true,
      message: 'Appointment scheduled successfully',
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/appointments/{id}:
 *   get:
 *     tags: [Appointments]
 *     summary: Get appointment details
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
 *         description: Appointment details
 */
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as Request & { userId: string; userRole: string };
    const { id } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        vehicle: true,
        feedback: true,
      },
    });

    if (!appointment) {
      throw new NotFoundError('Appointment not found');
    }

    if (authReq.userRole !== 'ADMIN' && appointment.vehicle.userId !== authReq.userId) {
      throw new NotFoundError('Appointment not found');
    }

    res.json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/appointments/{id}:
 *   patch:
 *     tags: [Appointments]
 *     summary: Update appointment
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
 *         description: Appointment updated
 */
router.patch('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as Request & { userId: string; userRole: string };
    const { id } = req.params;

    const validation = updateAppointmentSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    // Get existing appointment
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { vehicle: true },
    });

    if (!appointment) {
      throw new NotFoundError('Appointment not found');
    }

    // Customers can only reschedule, technicians/admins can update status
    if (authReq.userRole === 'CUSTOMER') {
      if (appointment.vehicle.userId !== authReq.userId) {
        throw new NotFoundError('Appointment not found');
      }
      // Customers can only update scheduledDate and notes
      const { scheduledDate, notes } = validation.data;
      const updateData: Record<string, unknown> = {};
      if (scheduledDate) updateData.scheduledDate = new Date(scheduledDate);
      if (notes) updateData.notes = notes;

      const updated = await prisma.appointment.update({
        where: { id },
        data: updateData,
      });

      return res.json({
        success: true,
        message: 'Appointment rescheduled',
        data: updated,
      });
    }

    // Technicians and admins can update all fields
    const updateData: Record<string, unknown> = {};
    if (validation.data.scheduledDate) updateData.scheduledDate = new Date(validation.data.scheduledDate);
    if (validation.data.status) updateData.status = validation.data.status;
    if (validation.data.notes) updateData.notes = validation.data.notes;
    if (validation.data.technicianNotes) updateData.technicianNotes = validation.data.technicianNotes;

    // If completing, trigger feedback request
    if (validation.data.status === 'COMPLETED') {
      await redis.triggerAgent('feedback', {
        action: 'request_feedback',
        appointmentId: id,
        vehicleId: appointment.vehicleId,
        userId: appointment.vehicle.userId,
      });
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: updateData,
      include: { vehicle: true },
    });

    logger.info(`Appointment ${id} updated by user ${authReq.userId}`);

    res.json({
      success: true,
      message: 'Appointment updated',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/appointments/{id}/cancel:
 *   post:
 *     tags: [Appointments]
 *     summary: Cancel appointment
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
 *         description: Appointment cancelled
 */
router.post('/:id/cancel', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as Request & { userId: string; userRole: string };
    const { id } = req.params;
    const { reason } = req.body;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { vehicle: true },
    });

    if (!appointment) {
      throw new NotFoundError('Appointment not found');
    }

    if (authReq.userRole !== 'ADMIN' && appointment.vehicle.userId !== authReq.userId) {
      throw new NotFoundError('Appointment not found');
    }

    if (appointment.status === 'COMPLETED') {
      throw new ValidationError('Cannot cancel a completed appointment');
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        notes: reason ? `Cancelled: ${reason}` : 'Cancelled by user',
      },
    });

    logger.info(`Appointment ${id} cancelled by user ${authReq.userId}`);

    res.json({
      success: true,
      message: 'Appointment cancelled',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/appointments/admin/all:
 *   get:
 *     tags: [Appointments]
 *     summary: Get all appointments (admin/technician only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All appointments
 */
router.get('/admin/all', authenticate, authorize(['ADMIN', 'TECHNICIAN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, date, page = '1', limit = '20' } = req.query;

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (date) {
      const targetDate = new Date(date as string);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      where.scheduledDate = { gte: startOfDay, lte: endOfDay };
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: {
          vehicle: {
            include: { owner: { select: { id: true, email: true, firstName: true, lastName: true } } },
          },
        },
        orderBy: { scheduledDate: 'asc' },
        skip,
        take,
      }),
      prisma.appointment.count({ where }),
    ]);

    res.json({
      success: true,
      data: appointments,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
