import { Router, type Router as RouterType, type Request, type Response, type NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { FEEDBACK_CATEGORIES, FEEDBACK_STATUSES } from '@gesp/shared';

const router: RouterType = Router();

// Inline admin middleware (same pattern as admin.ts)
function adminMiddleware(req: Request, res: Response, next: NextFunction): void {
  const apiKey = process.env.ADMIN_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'Admin API not configured' });
    return;
  }
  const provided = req.headers['x-admin-key'] as string | undefined;
  if (!provided || provided !== apiKey) {
    res.status(403).json({ error: 'Invalid admin API key' });
    return;
  }
  next();
}

// Valid values for quick validation
const validCategories = FEEDBACK_CATEGORIES.map(c => c.value);
const validStatuses = FEEDBACK_STATUSES.map(s => s.value);

// POST / — Submit feedback (requires auth)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { questionId, category, comment } = req.body;
    const userId = req.user!.userId;

    if (!questionId || !category) {
      res.status(400).json({ error: 'questionId and category are required' });
      return;
    }

    if (!validCategories.includes(category)) {
      res.status(400).json({ error: 'Invalid category' });
      return;
    }

    // Check if feedback already exists for this user+question
    const existing = await prisma.questionFeedback.findUnique({
      where: { userId_questionId: { userId, questionId } },
    });
    if (existing) {
      res.status(409).json({ error: 'You have already submitted feedback for this question', feedback: existing });
      return;
    }

    const feedback = await prisma.questionFeedback.create({
      data: { questionId, userId, category, comment: comment || null },
    });

    res.status(201).json({ feedback });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /stats — Feedback statistics (requires admin)
router.get('/stats', adminMiddleware, async (_req, res) => {
  try {
    const [total, byCategory, byStatus] = await Promise.all([
      prisma.questionFeedback.count(),
      prisma.questionFeedback.groupBy({ by: ['category'], _count: true }),
      prisma.questionFeedback.groupBy({ by: ['status'], _count: true }),
    ]);

    // Recent daily counts (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setUTCHours(0, 0, 0, 0);

    const recentFeedbacks = await prisma.questionFeedback.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const recentDaily: Array<{ date: string; count: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      day.setUTCHours(0, 0, 0, 0);
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);
      const count = recentFeedbacks.filter(f => f.createdAt >= day && f.createdAt < nextDay).length;
      recentDaily.push({ date: day.toISOString().split('T')[0], count });
    }

    // Top reported questions
    const topQuestions = await prisma.questionFeedback.groupBy({
      by: ['questionId'],
      _count: true,
      orderBy: { _count: { questionId: 'desc' } },
      take: 10,
    });

    // Enrich top questions with question text
    const questionIds = topQuestions.map(t => t.questionId);
    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: { id: true, questionText: true },
    });
    const questionMap = Object.fromEntries(questions.map(q => [q.id, q.questionText]));

    res.json({
      total,
      byCategory: Object.fromEntries(byCategory.map(r => [r.category, r._count])),
      byStatus: Object.fromEntries(byStatus.map(r => [r.status, r._count])),
      recentDaily,
      topQuestions: topQuestions.map(t => ({
        questionId: t.questionId,
        questionText: questionMap[t.questionId] || '(deleted)',
        count: t._count,
      })),
    });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET / — List feedback (requires admin)
router.get('/', adminMiddleware, async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      prisma.questionFeedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          question: { select: { id: true, questionText: true, level: true, type: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.questionFeedback.count({ where }),
    ]);

    res.json({ items, total, page, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id — Feedback detail (requires admin)
router.get('/:id', adminMiddleware, async (req, res) => {
  try {
    const feedback = await prisma.questionFeedback.findUnique({
      where: { id: req.params.id as string },
      include: {
        question: { select: { id: true, questionText: true, level: true, type: true, options: true, answer: true, explanation: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });
    if (!feedback) {
      res.status(404).json({ error: 'Feedback not found' });
      return;
    }
    res.json({ feedback });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /:id — Resolve feedback (requires admin)
router.patch('/:id', adminMiddleware, async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const feedback = await prisma.questionFeedback.update({
      where: { id: req.params.id as string },
      data: {
        status,
        adminNote: adminNote || undefined,
        resolvedAt: new Date(),
      },
    });
    res.json({ feedback });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
