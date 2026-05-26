import { Router, type Router as RouterType } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const router: RouterType = Router();

// GET / — paginated list with filters (no answer/explanation)
router.get('/', async (req, res) => {
  try {
    const level = req.query.level ? Number(req.query.level) : undefined;
    const type = req.query.type as string | undefined;
    const session = req.query.session as string | undefined;
    const topic = req.query.topic as string | undefined;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    const where: Record<string, unknown> = {};
    if (level !== undefined && !isNaN(level)) where.level = level;
    if (type) where.type = type;
    if (session) where.session = session;
    if (topic) where.topics = { has: topic };

    const [items, total] = await Promise.all([
      prisma.question.findMany({
        where,
        select: {
          id: true,
          session: true,
          level: true,
          type: true,
          questionIndex: true,
          questionText: true,
          topics: true,
          difficulty: true,
          createdAt: true,
        },
        orderBy: [{ level: 'asc' }, { questionIndex: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.question.count({ where }),
    ]);

    res.json({ items, total, page, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /stats — counts by level, type, session
router.get('/stats', authMiddleware, async (_req, res) => {
  try {
    const [total, byLevel, byType, bySession] = await Promise.all([
      prisma.question.count(),
      prisma.question.groupBy({ by: ['level'], _count: true, orderBy: { level: 'asc' } }),
      prisma.question.groupBy({ by: ['type'], _count: true }),
      prisma.question.groupBy({ by: ['session'], _count: true }),
    ]);

    res.json({
      total,
      byLevel: Object.fromEntries(byLevel.map((r) => [r.level, r._count])),
      byType: Object.fromEntries(byType.map((r) => [r.type, r._count])),
      bySession: Object.fromEntries(bySession.map((r) => [r.session, r._count])),
    });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /random — random question for practice (no answer/explanation)
router.get('/random', authMiddleware, async (req, res) => {
  try {
    const level = req.query.level ? Number(req.query.level) : undefined;
    const type = req.query.type as string | undefined;
    const session = req.query.session as string | undefined;

    const where: Record<string, unknown> = {};
    if (level !== undefined && !isNaN(level)) where.level = level;
    if (type) where.type = type;
    if (session) where.session = session;

    const count = await prisma.question.count({ where });
    if (count === 0) {
      res.status(404).json({ error: 'No questions found' });
      return;
    }

    const skip = Math.floor(Math.random() * count);
    const question = await prisma.question.findFirst({
      where,
      select: {
        id: true,
        session: true,
        level: true,
        type: true,
        questionIndex: true,
        questionText: true,
        options: true,
        topics: true,
        difficulty: true,
        images: true,
        codeBlocks: true,
        inputFormat: true,
        outputFormat: true,
        constraints: true,
        sampleInput: true,
        sampleOutput: true,
        templateCode: true,
        testCases: true,
      },
      skip,
    });

    res.json({ question });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/topics', authMiddleware, async (req, res) => {
  try {
    const level = req.query.level ? Number(req.query.level) : undefined;

    const where: Record<string, unknown> = {};
    if (level !== undefined && !isNaN(level)) where.level = level;

    const results = await prisma.question.findMany({
      where,
      select: { topics: true },
      distinct: ['topics'],
    });

    const topics = [...new Set(results.flatMap((r) => r.topics))].sort();
    res.json({ topics });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const question = await prisma.question.findUnique({
      where: { id: req.params.id as string },
    });

    if (!question) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    res.json({ question });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
