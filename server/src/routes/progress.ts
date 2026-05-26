import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const router: RouterType = Router();
router.use(authMiddleware);

const submitAnswerSchema = z.object({
  questionId: z.string().min(1),
  userAnswer: z.string().min(1),
  timeSpentMs: z.number().int().min(0),
});

function checkAnswer(userAnswer: string, correctAnswer: string, questionType: string): boolean {
  if (questionType === 'true_false' || questionType === 'tf') {
    return userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
  }
  return userAnswer.trim().toUpperCase() === correctAnswer.trim().toUpperCase();
}

// POST /answers — submit answer for a question
router.post('/answers', async (req, res) => {
  try {
    const { questionId, userAnswer, timeSpentMs } = submitAnswerSchema.parse(req.body);

    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!question) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    if (!question.answer) {
      res.status(400).json({ error: 'Question has no answer' });
      return;
    }

    const isCorrect = checkAnswer(userAnswer, question.answer, question.type);

    await prisma.userAnswer.create({
      data: {
        userId: req.user!.userId,
        questionId,
        userAnswer,
        isCorrect,
        timeSpentMs,
      },
    });

    res.json({
      isCorrect,
      correctAnswer: question.answer,
      explanation: question.explanation ?? null,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.issues });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /users/me/progress — user's overall progress
router.get('/users/me/progress', async (req, res) => {
  try {
    const userId = req.user!.userId;

    const answers = await prisma.userAnswer.findMany({
      where: { userId },
      include: { question: { select: { level: true } } },
    });

    const totalAnswered = answers.length;
    const totalCorrect = answers.filter((a) => a.isCorrect).length;
    const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 10000) / 100 : 0;

    const levelSet = new Set<number>();
    const byLevel: Record<number, { answered: number; correct: number; accuracy: number }> = {};

    for (const a of answers) {
      const level = a.question.level;
      levelSet.add(level);
      if (!byLevel[level]) {
        byLevel[level] = { answered: 0, correct: 0, accuracy: 0 };
      }
      byLevel[level].answered++;
      if (a.isCorrect) byLevel[level].correct++;
    }

    for (const level of Object.keys(byLevel)) {
      const l = byLevel[Number(level)];
      l.accuracy = l.answered > 0 ? Math.round((l.correct / l.answered) * 10000) / 100 : 0;
    }

    res.json({
      totalAnswered,
      totalCorrect,
      accuracy,
      levelsAttempted: levelSet.size,
      byLevel,
    });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /users/me/history — answer history with pagination
router.get('/users/me/history', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.userAnswer.findMany({
        where: { userId },
        include: {
          question: {
            select: {
              questionText: true,
              level: true,
              type: true,
              answer: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.userAnswer.count({ where: { userId } }),
    ]);

    res.json({
      items: items.map((item) => ({
        id: item.id,
        questionId: item.questionId,
        questionPreview: item.question.questionText.slice(0, 100),
        level: item.question.level,
        type: item.question.type,
        userAnswer: item.userAnswer,
        correctAnswer: item.question.answer,
        isCorrect: item.isCorrect,
        timeSpentMs: item.timeSpentMs,
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

export default router;
