import { Router, type Router as RouterType } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const router: RouterType = Router();
router.use(authMiddleware);

// GET / — list incorrectly answered questions
router.get('/', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      userId,
      isCorrect: false,
    };

    if (req.query.level) {
      where.question = { level: Number(req.query.level) };
    }
    if (req.query.type) {
      where.question = { ...(where.question as Record<string, unknown>), type: String(req.query.type) };
    }

    const [items, total] = await Promise.all([
      prisma.userAnswer.findMany({
        where,
        include: {
          question: {
            select: {
              questionText: true,
              level: true,
              type: true,
              answer: true,
              options: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.userAnswer.count({ where }),
    ]);

    res.json({
      items: items.map((item) => ({
        id: item.id,
        questionId: item.questionId,
        questionPreview: item.question.questionText.slice(0, 100),
        level: item.question.level,
        type: item.question.type,
        wrongAnswer: item.userAnswer,
        correctAnswer: item.question.answer,
        options: item.question.options,
        answeredAt: item.createdAt,
      })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:questionId — remove from error book
router.delete('/:questionId', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { questionId } = req.params;

    const deleted = await prisma.userAnswer.deleteMany({
      where: { userId, questionId, isCorrect: false },
    });

    if (deleted.count === 0) {
      res.status(404).json({ error: 'No incorrect answer found for this question' });
      return;
    }

    res.json({ removed: deleted.count });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /stats — counts by level and type
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user!.userId;

    const wrongAnswers = await prisma.userAnswer.findMany({
      where: { userId, isCorrect: false },
      include: { question: { select: { level: true, type: true } } },
    });

    const byLevel: Record<number, number> = {};
    const byType: Record<string, number> = {};

    for (const a of wrongAnswers) {
      byLevel[a.question.level] = (byLevel[a.question.level] || 0) + 1;
      byType[a.question.type] = (byType[a.question.type] || 0) + 1;
    }

    res.json({ total: wrongAnswers.length, byLevel, byType });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
