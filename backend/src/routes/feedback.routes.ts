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
const submitFeedbackSchema = z.object({
  appointmentId: z.string().uuid(),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
  categories: z.object({
    serviceQuality: z.number().min(1).max(5).optional(),
    timeliness: z.number().min(1).max(5).optional(),
    communication: z.number().min(1).max(5).optional(),
    valueForMoney: z.number().min(1).max(5).optional(),
  }).optional(),
  wouldRecommend: z.boolean().optional(),
});

/**
 * @swagger
 * /api/v1/feedback:
 *   get:
 *     tags: [Feedback]
 *     summary: Get user's feedback submissions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of feedback
 */
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as Request & { userId: string; userRole: string };

    let feedbacks;

    if (authReq.userRole === 'ADMIN' || authReq.userRole === 'TECHNICIAN') {
      // Admins and technicians can see all feedback
      feedbacks = await prisma.feedback.findMany({
        include: {
          appointment: {
            include: {
              vehicle: {
                include: { owner: { select: { id: true, email: true, firstName: true, lastName: true } } },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // Customers can only see their own feedback
      feedbacks = await prisma.feedback.findMany({
        where: {
          appointment: {
            vehicle: {
              userId: authReq.userId,
            },
          },
        },
        include: {
          appointment: {
            include: { vehicle: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    res.json({
      success: true,
      data: feedbacks,
      count: feedbacks.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/feedback:
 *   post:
 *     tags: [Feedback]
 *     summary: Submit feedback for a completed appointment
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - appointmentId
 *               - rating
 *     responses:
 *       201:
 *         description: Feedback submitted
 */
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as Request & { userId: string; userRole: string };

    const validation = submitFeedbackSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const { appointmentId, rating, comment, categories, wouldRecommend } = validation.data;

    // Verify appointment exists and is completed
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { vehicle: true, feedback: true },
    });

    if (!appointment) {
      throw new NotFoundError('Appointment not found');
    }

    if (appointment.vehicle.userId !== authReq.userId) {
      throw new NotFoundError('Appointment not found');
    }

    if (appointment.status !== 'COMPLETED') {
      throw new ValidationError('Can only provide feedback for completed appointments');
    }

    if (appointment.feedback) {
      throw new ValidationError('Feedback already submitted for this appointment');
    }

    // Perform basic sentiment analysis
    let sentiment = 'NEUTRAL';
    if (rating >= 4) {
      sentiment = 'POSITIVE';
    } else if (rating <= 2) {
      sentiment = 'NEGATIVE';
    }

    // Enhanced sentiment from comment
    if (comment) {
      const positiveWords = ['great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'best', 'perfect'];
      const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'worst', 'hate', 'never', 'disappointed'];
      
      const lowerComment = comment.toLowerCase();
      const posCount = positiveWords.filter((w) => lowerComment.includes(w)).length;
      const negCount = negativeWords.filter((w) => lowerComment.includes(w)).length;

      if (posCount > negCount && rating >= 3) {
        sentiment = 'POSITIVE';
      } else if (negCount > posCount || rating <= 2) {
        sentiment = 'NEGATIVE';
      }
    }

    // Create feedback
    const feedback = await prisma.feedback.create({
      data: {
        appointmentId,
        rating,
        comment,
        sentiment,
        categories: categories ? JSON.stringify(categories) : null,
        wouldRecommend: wouldRecommend ?? null,
      },
      include: {
        appointment: {
          include: { vehicle: true },
        },
      },
    });

    // Trigger feedback agent for further analysis
    await redis.triggerAgent('feedback', {
      action: 'analyze_feedback',
      feedbackId: feedback.id,
      appointmentId,
      vehicleId: appointment.vehicleId,
      rating,
      sentiment,
      comment,
    });

    // If negative feedback, create an alert
    if (sentiment === 'NEGATIVE') {
      await prisma.alert.create({
        data: {
          userId: authReq.userId,
          vehicleId: appointment.vehicleId,
          type: 'WARNING',
          message: `Negative feedback received for appointment ${appointmentId}. Customer follow-up recommended.`,
        },
      });
    }

    logger.info(`Feedback ${feedback.id} submitted for appointment ${appointmentId}`);

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: feedback,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/feedback/stats:
 *   get:
 *     tags: [Feedback]
 *     summary: Get feedback statistics (admin/technician)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Feedback statistics
 */
router.get('/stats', authenticate, authorize(['ADMIN', 'TECHNICIAN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const allFeedback = await prisma.feedback.findMany();

    const totalFeedback = allFeedback.length;
    const avgRating = totalFeedback > 0
      ? allFeedback.reduce((sum, f) => sum + f.rating, 0) / totalFeedback
      : 0;

    const sentimentCounts = {
      POSITIVE: allFeedback.filter((f) => f.sentiment === 'POSITIVE').length,
      NEUTRAL: allFeedback.filter((f) => f.sentiment === 'NEUTRAL').length,
      NEGATIVE: allFeedback.filter((f) => f.sentiment === 'NEGATIVE').length,
    };

    const ratingDistribution = [1, 2, 3, 4, 5].map((rating) => ({
      rating,
      count: allFeedback.filter((f) => f.rating === rating).length,
    }));

    const wouldRecommend = allFeedback.filter((f) => f.wouldRecommend === true).length;
    const wouldNotRecommend = allFeedback.filter((f) => f.wouldRecommend === false).length;

    res.json({
      success: true,
      data: {
        totalFeedback,
        averageRating: Math.round(avgRating * 100) / 100,
        sentimentCounts,
        ratingDistribution,
        npsIndicator: {
          promoters: wouldRecommend,
          detractors: wouldNotRecommend,
          passive: totalFeedback - wouldRecommend - wouldNotRecommend,
          score: totalFeedback > 0
            ? Math.round(((wouldRecommend - wouldNotRecommend) / totalFeedback) * 100)
            : 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/feedback/{id}:
 *   get:
 *     tags: [Feedback]
 *     summary: Get feedback details
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
 *         description: Feedback details
 */
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as Request & { userId: string; userRole: string };
    const { id } = req.params;

    const feedback = await prisma.feedback.findUnique({
      where: { id },
      include: {
        appointment: {
          include: {
            vehicle: {
              include: { owner: { select: { id: true, email: true, firstName: true, lastName: true } } },
            },
          },
        },
      },
    });

    if (!feedback) {
      throw new NotFoundError('Feedback not found');
    }

    // Verify access
    if (
      authReq.userRole !== 'ADMIN' &&
      authReq.userRole !== 'TECHNICIAN' &&
      feedback.appointment.vehicle.userId !== authReq.userId
    ) {
      throw new NotFoundError('Feedback not found');
    }

    res.json({
      success: true,
      data: feedback,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
