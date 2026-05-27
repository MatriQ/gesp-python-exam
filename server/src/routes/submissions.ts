import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { submitToJudge } from '../services/judge-queue.js';

const router: RouterType = Router();

const submissionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many submissions, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const submitSchema = z.object({
  questionId: z.string().min(1),
  code: z.string().min(1),
  language: z.string().optional().default('python'),
});

// POST /api/submissions — submit code for evaluation
router.post('/', authMiddleware, submissionLimiter, async (req, res) => {
  try {
    const parsed = submitSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const { questionId, code, language } = parsed.data;
    const userId = req.user!.userId;

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true, testCases: true, level: true },
    });

    if (!question) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    const testCases = (question.testCases as Array<{ input: string; expected: string }>) ?? [];

    const submission = await prisma.codeSubmission.create({
      data: {
        userId,
        questionId,
        code,
        language,
        status: 'pending',
      },
    });

    await submitToJudge({
      submissionId: submission.id,
      code,
      testCases,
      level: question.level,
    });

    res.status(201).json({ submissionId: submission.id, status: 'pending' });
  } catch (err) {
    console.error('Submission error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/submissions/:id — get single submission
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const submission = await prisma.codeSubmission.findFirst({
      where: {
        id: req.params.id as string,
        userId: req.user!.userId,
      },
    });

    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    res.json({ submission });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/submissions?questionId=X — list submissions for a question
router.get('/', authMiddleware, async (req, res) => {
  try {
    const questionId = req.query.questionId as string | undefined;

    if (!questionId) {
      res.status(400).json({ error: 'questionId query parameter is required' });
      return;
    }

    const submissions = await prisma.codeSubmission.findMany({
      where: {
        userId: req.user!.userId,
        questionId,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ submissions });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
