import { Router, type Router as RouterType } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const router: RouterType = Router();
router.use(authMiddleware);

const EXAM_CONFIG = {
  questionCount: { mc: 15, tf: 10, programming: 2 },
  scoring: { mc: 2, tf: 2, programming: 25 },
  timeLimit: (level: number) => level <= 4 ? 7200 : 10800, // seconds
};

// POST /start — Start a mock exam
router.post('/start', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { level } = req.body;

    if (!level || level < 1 || level > 8) {
      res.status(400).json({ error: 'Level must be 1-8' });
      return;
    }

    // Select random questions for each type
    const questionSelections = await Promise.all(
      (['mc', 'tf', 'programming'] as const).map(async (type) => {
        const count = EXAM_CONFIG.questionCount[type];
        const allQuestions = await prisma.question.findMany({
          where: { level, type },
          select: { id: true },
        });
        // Shuffle and take N
        const shuffled = allQuestions.sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(count, shuffled.length)).map(q => q.id);
      })
    );

    const selectedQuestionIds = questionSelections.flat();
    if (selectedQuestionIds.length === 0) {
      res.status(404).json({ error: 'No questions available for this level' });
      return;
    }

    // Create exam
    const exam = await prisma.mockExam.create({
      data: {
        userId,
        level,
        startedAt: new Date(),
        timeLimit: EXAM_CONFIG.timeLimit(level),
        status: 'in_progress',
        answers: {
          create: selectedQuestionIds.map(questionId => ({
            questionId,
          })),
        },
      },
      include: {
        answers: {
          include: {
            question: {
              select: {
                id: true,
                type: true,
                questionIndex: true,
                questionText: true,
                options: true,
                level: true,
                topics: true,
                inputFormat: true,
                outputFormat: true,
                constraints: true,
                sampleInput: true,
                sampleOutput: true,
                templateCode: true,
                // NOTE: answer and explanation NOT included during active exam
              },
            },
          },
        },
      },
    });

    res.json({
      examId: exam.id,
      level: exam.level,
      timeLimit: exam.timeLimit,
      startedAt: exam.startedAt,
      questions: exam.answers.map(a => ({
        answerId: a.id,
        ...a.question,
      })),
    });
  } catch (error) {
    console.error('Exam start error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET / — List user's past exams
router.get('/', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const exams = await prisma.mockExam.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      select: {
        id: true,
        level: true,
        startedAt: true,
        completedAt: true,
        status: true,
      },
    });
    res.json({ exams });
  } catch (error) {
    console.error('Exam list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id/answer — Submit answer during exam
router.put('/:id/answer', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { questionId, userAnswer, code } = req.body;

    const exam = await prisma.mockExam.findUnique({
      where: { id },
      include: { answers: true },
    });

    if (!exam || exam.userId !== userId) {
      res.status(404).json({ error: 'Exam not found' });
      return;
    }

    if (exam.status !== 'in_progress') {
      res.status(400).json({ error: 'Exam is not active' });
      return;
    }

    // Check time expiry
    const elapsed = Date.now() - new Date(exam.startedAt).getTime();
    if (elapsed > exam.timeLimit * 1000) {
      // Auto-submit
      await gradeAndCompleteExam(exam.id);
      res.status(400).json({ error: 'Exam time has expired', autoSubmitted: true });
      return;
    }

    // Update answer
    const answer = userAnswer || code;
    if (!answer) {
      res.status(400).json({ error: 'Answer is required' });
      return;
    }

    await prisma.mockExamAnswer.updateMany({
      where: {
        mockExamId: exam.id,
        questionId,
      },
      data: { userAnswer: answer },
    });

    res.json({ saved: true });
  } catch (error) {
    console.error('Exam answer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/submit — Submit entire exam
router.post('/:id/submit', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const exam = await prisma.mockExam.findUnique({
      where: { id },
    });

    if (!exam || exam.userId !== userId) {
      res.status(404).json({ error: 'Exam not found' });
      return;
    }

    if (exam.status !== 'in_progress') {
      res.status(400).json({ error: 'Exam already submitted' });
      return;
    }

    await gradeAndCompleteExam(id);

    res.json({ examId: id, status: 'grading' });
  } catch (error) {
    console.error('Exam submit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id/result — Get exam result
router.get('/:id/result', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const exam = await prisma.mockExam.findUnique({
      where: { id },
      include: {
        answers: {
          include: {
            question: {
              select: {
                id: true,
                type: true,
                questionIndex: true,
                questionText: true,
                options: true,
                answer: true,
                explanation: true,
                topics: true,
              },
            },
          },
        },
      },
    });

    if (!exam || exam.userId !== userId) {
      res.status(404).json({ error: 'Exam not found' });
      return;
    }

    // Calculate scores
    let mcCorrect = 0, mcTotal = 0, tfCorrect = 0, tfTotal = 0, progScore = 0, progTotal = 0;

    for (const a of exam.answers) {
      if (a.question.type === 'mc') {
        mcTotal++;
        if (a.isCorrect) mcCorrect++;
      } else if (a.question.type === 'tf') {
        tfTotal++;
        if (a.isCorrect) tfCorrect++;
      } else if (a.question.type === 'programming') {
        progTotal++;
        if (a.isCorrect) progScore += EXAM_CONFIG.scoring.programming;
      }
    }

    const totalScore = mcCorrect * EXAM_CONFIG.scoring.mc + tfCorrect * EXAM_CONFIG.scoring.tf + progScore;
    const maxScore = mcTotal * EXAM_CONFIG.scoring.mc + tfTotal * EXAM_CONFIG.scoring.tf + progTotal * EXAM_CONFIG.scoring.programming;

    res.json({
      exam: {
        id: exam.id,
        level: exam.level,
        startedAt: exam.startedAt,
        completedAt: exam.completedAt,
        timeLimit: exam.timeLimit,
        status: exam.status,
        totalScore,
        maxScore,
        passed: totalScore >= 60,
      },
      answers: exam.answers.map(a => ({
        questionId: a.questionId,
        answerId: a.id,
        type: a.question.type,
        questionText: a.question.questionText,
        options: a.question.options,
        userAnswer: a.userAnswer,
        isCorrect: a.isCorrect,
        correctAnswer: exam.status === 'completed' ? a.question.answer : undefined,
        explanation: exam.status === 'completed' ? a.question.explanation : undefined,
      })),
      scoreBreakdown: {
        mc: { correct: mcCorrect, total: mcTotal, score: mcCorrect * EXAM_CONFIG.scoring.mc, maxScore: mcTotal * EXAM_CONFIG.scoring.mc },
        tf: { correct: tfCorrect, total: tfTotal, score: tfCorrect * EXAM_CONFIG.scoring.tf, maxScore: tfTotal * EXAM_CONFIG.scoring.tf },
        programming: { total: progTotal, score: progScore, maxScore: progTotal * EXAM_CONFIG.scoring.programming },
      },
    });
  } catch (error) {
    console.error('Exam result error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper: Grade MC/TF and complete exam
async function gradeAndCompleteExam(examId: string) {
  const exam = await prisma.mockExam.findUnique({
    where: { id: examId },
    include: {
      answers: {
        include: {
          question: {
            select: { type: true, answer: true },
          },
        },
      },
    },
  });

  if (!exam) return;

  // Grade MC and TF
  for (const answer of exam.answers) {
    if (answer.question.type === 'mc' || answer.question.type === 'tf') {
      if (answer.userAnswer) {
        const isCorrect = answer.userAnswer.trim().toLowerCase() === (answer.question.answer || '').trim().toLowerCase();
        await prisma.mockExamAnswer.update({
          where: { id: answer.id },
          data: { isCorrect },
        });
      } else {
        await prisma.mockExamAnswer.update({
          where: { id: answer.id },
          data: { isCorrect: false },
        });
      }
    }
    // Programming questions left for judge (isCorrect stays null)
  }

  // Mark exam complete
  await prisma.mockExam.update({
    where: { id: examId },
    data: {
      status: 'completed',
      completedAt: new Date(),
    },
  });
}

export default router;
