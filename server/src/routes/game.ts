import { Router, type Router as RouterType } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import * as gs from '../services/gameService.js';

const router: RouterType = Router();
router.use(authMiddleware);

// ── Profile ──────────────────────────────────────────────────────────

router.get('/profile', async (req, res) => {
  try {
    const profile = await gs.getOrCreateProfile(req.user!.userId);
    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }
    res.json({ profile });
  } catch (error) {
    console.error('Game profile get error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/profile', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { nickname, avatar } = req.body;

    if (!nickname || !avatar) {
      res.status(400).json({ error: 'nickname and avatar are required' });
      return;
    }

    const existing = await gs.getOrCreateProfile(userId);
    if (existing) {
      res.status(400).json({ error: 'Profile already exists' });
      return;
    }

    const profile = await gs.createProfile(userId, nickname, avatar);
    res.status(201).json({ profile });
  } catch (error) {
    console.error('Game profile create error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/profile', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { nickname, avatar } = req.body;

    if (!nickname && !avatar) {
      res.status(400).json({ error: 'At least one of nickname or avatar is required' });
      return;
    }

    const existing = await gs.getOrCreateProfile(userId);
    if (!existing) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const profile = await gs.updateProfile(userId, { nickname, avatar });
    res.json({ profile });
  } catch (error) {
    console.error('Game profile update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Stages ───────────────────────────────────────────────────────────

router.get('/stages/:level', async (req, res) => {
  try {
    const level = parseInt(req.params.level, 10);
    if (isNaN(level) || level < 1 || level > 8) {
      res.status(400).json({ error: 'Level must be 1-8' });
      return;
    }

    const stagesWithProgress = await gs.getStagesWithProgress(req.user!.userId, level);

    const stagesWithQuestions = await Promise.all(
      stagesWithProgress.map(async (s) => {
        const questions = await gs.getRandomQuestions(level, 'mc', s.questionCount);
        return { ...s, questions };
      }),
    );

    res.json({ stages: stagesWithQuestions });
  } catch (error) {
    console.error('Game stages get error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/stages/:level/progress', async (req, res) => {
  try {
    const level = parseInt(req.params.level, 10);
    if (isNaN(level) || level < 1 || level > 8) {
      res.status(400).json({ error: 'Level must be 1-8' });
      return;
    }

    const progress = await gs.getStageProgressForLevel(req.user!.userId, level);
    res.json({ progress });
  } catch (error) {
    console.error('Game stage progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/stages/:stageId/start', async (req, res) => {
  try {
    const { stageId } = req.params;
    const progress = await gs.startStage(req.user!.userId, stageId);
    res.json({ progress });
  } catch (error) {
    if (error instanceof Error && error.message === 'Stage not found') {
      res.status(404).json({ error: 'Stage not found' });
      return;
    }
    console.error('Game stage start error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/stages/:stageId/complete', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { stageId } = req.params;
    const { correctCount, totalCount, timeSpentMs, answers } = req.body;

    if (typeof correctCount !== 'number' || typeof totalCount !== 'number') {
      res.status(400).json({ error: 'correctCount and totalCount are required numbers' });
      return;
    }
    if (!Array.isArray(answers)) {
      res.status(400).json({ error: 'answers must be an array' });
      return;
    }

    const result = await gs.completeStage(userId, stageId, {
      correctCount,
      totalCount,
      timeSpentMs: timeSpentMs ?? 0,
      answers,
    });

    res.json({ result });
  } catch (error) {
    if (error instanceof Error && error.message === 'Stage not found') {
      res.status(404).json({ error: 'Stage not found' });
      return;
    }
    if (error instanceof Error && error.message === 'Game profile not found') {
      res.status(404).json({ error: 'Game profile not found' });
      return;
    }
    console.error('Game stage complete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/stages/:stageId/answer', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { questionId, userAnswer, timeSpentMs } = req.body;

    if (!questionId || !userAnswer) {
      res.status(400).json({ error: 'questionId and userAnswer are required' });
      return;
    }

    const result = await gs.submitAnswer(userId, questionId, userAnswer, timeSpentMs ?? 0);
    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Question not found') {
      res.status(404).json({ error: 'Question not found' });
      return;
    }
    console.error('Game answer submit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Leaderboard ──────────────────────────────────────────────────────

router.get('/leaderboard', async (req, res) => {
  try {
    const type = (req.query.type as string) || 'all';
    const leaderboard = await gs.getLeaderboard(type);
    res.json({ leaderboard });
  } catch (error) {
    console.error('Game leaderboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/leaderboard/me', async (req, res) => {
  try {
    const result = await gs.getMyRank(req.user!.userId);
    res.json(result);
  } catch (error) {
    console.error('Game my rank error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Achievements ─────────────────────────────────────────────────────

router.get('/achievements', async (req, res) => {
  try {
    const achievements = await gs.getAchievements(req.user!.userId);
    res.json({ achievements });
  } catch (error) {
    console.error('Game achievements error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Story ────────────────────────────────────────────────────────────

router.get('/story/chapters/:chapterId/questions', async (req, res) => {
  try {
    const { chapterId } = req.params;
    const chapter = await prisma.storyChapter.findUnique({
      where: { id: chapterId },
    });
    if (!chapter) {
      res.status(404).json({ error: 'Chapter not found' });
      return;
    }
    const questions = await gs.getRandomQuestions(chapter.level, 'mc', 5);
    const questionIds = questions.map((q) => q.id);
    const withAnswers = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: { id: true, answer: true },
    });
    const answerMap = new Map(withAnswers.map((q) => [q.id, q.answer]));
    const enriched = questions.map((q) => ({
      ...q,
      correctAnswer: answerMap.get(q.id) ?? '',
    }));
    res.json({ questions: enriched });
  } catch (error) {
    console.error('Story chapter questions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/story/chapters', async (req, res) => {
  try {
    const level = req.query.level ? parseInt(req.query.level as string, 10) : undefined;
    const chapters = await gs.getStoryChapters(level);
    res.json({ chapters });
  } catch (error) {
    console.error('Story chapters error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/story/progress', async (req, res) => {
  try {
    const progress = await gs.getStoryProgress(req.user!.userId);
    res.json({ progress });
  } catch (error) {
    console.error('Story progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/story/chapters/:chapterId/progress', async (req, res) => {
  try {
    const { chapterId } = req.params;
    const { currentScene, completed } = req.body;

    if (typeof currentScene !== 'number') {
      res.status(400).json({ error: 'currentScene is required' });
      return;
    }

    const progress = await gs.saveStoryProgress(req.user!.userId, chapterId, {
      currentScene,
      completed,
    });
    res.json({ progress });
  } catch (error) {
    console.error('Story save progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/story/chapters/:chapterId/complete', async (req, res) => {
  try {
    const { chapterId } = req.params;
    const { correctCount, totalCount } = req.body;

    if (typeof correctCount !== 'number' || typeof totalCount !== 'number') {
      res.status(400).json({ error: 'correctCount and totalCount are required numbers' });
      return;
    }

    const result = await gs.completeStoryChapter(req.user!.userId, chapterId, {
      correctCount,
      totalCount,
    });
    res.json(result);
  } catch (error) {
    console.error('Story complete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
