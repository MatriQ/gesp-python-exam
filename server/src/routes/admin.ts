import { Router, type Router as RouterType, type Request, type Response, type NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { judgeQueue } from '../services/judge-queue.js';

const router: RouterType = Router();

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

router.use(adminMiddleware);

// GET /api/admin/judge/queue — Queue statistics
router.get('/judge/queue', async (_req, res) => {
  try {
    const counts = await judgeQueue.getJobCounts('active', 'waiting', 'completed', 'failed', 'delayed');

    const oneHourAgo = Date.now() - 3600 * 1000;
    const completedJobs = await judgeQueue.getCompleted();
    const failedJobs = await judgeQueue.getFailed();

    const recentCompleted = completedJobs.filter((j) => j.finishedOn && j.finishedOn > oneHourAgo);
    const recentFailed = failedJobs.filter((j) => j.finishedOn && j.finishedOn > oneHourAgo);

    const executionTimes = recentCompleted
      .map((j) => {
        if (j.processedOn && j.finishedOn) return j.finishedOn - j.processedOn;
        return 0;
      })
      .filter((t) => t > 0);
    const avgExecutionTime =
      executionTimes.length > 0
        ? Math.round(executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length)
        : 0;

    res.json({
      active: counts.active,
      waiting: counts.waiting,
      completed: counts.completed,
      failed: counts.failed,
      delayed: counts.delayed,
      recentCompleted: recentCompleted.length,
      recentFailed: recentFailed.length,
      avgExecutionTimeMs: avgExecutionTime,
    });
  } catch (err) {
    console.error('Admin queue stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/judge/health — Worker/service health
router.get('/judge/health', async (_req, res) => {
  try {
    let redisStatus = 'disconnected';
    try {
      const client = await judgeQueue.client;
      redisStatus = client.status === 'ready' ? 'connected' : client.status;
    } catch {
      redisStatus = 'error';
    }

    let judgeHealth = { status: 'unknown', latency: 0 };
    try {
      const judgeUrl = process.env.JUDGE_HEALTH_URL || 'http://localhost:3001/judge/health';
      const start = Date.now();
      const response = await fetch(judgeUrl, { signal: AbortSignal.timeout(5000) });
      judgeHealth = {
        status: response.ok ? 'healthy' : 'unhealthy',
        latency: Date.now() - start,
      };
    } catch {
      judgeHealth = { status: 'unreachable', latency: 0 };
    }

    let lastProcessedAt: string | null = null;
    try {
      const completed = await judgeQueue.getCompleted(0, 1);
      if (completed.length > 0 && completed[0].finishedOn) {
        lastProcessedAt = new Date(completed[0].finishedOn).toISOString();
      }
    } catch {
      // no completed jobs
    }

    res.json({
      judge: judgeHealth,
      redis: { status: redisStatus },
      lastProcessedAt,
    });
  } catch (err) {
    console.error('Admin health check error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/submissions — Recent submissions list
router.get('/submissions', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const status = req.query.status as string | undefined;
    const userId = req.query.userId as string | undefined;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const [submissions, total] = await Promise.all([
      prisma.codeSubmission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
          question: { select: { id: true, questionIndex: true, level: true, session: true, type: true } },
        },
      }),
      prisma.codeSubmission.count({ where }),
    ]);

    res.json({
      submissions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Admin submissions list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/submissions/:id — Submission detail
router.get('/submissions/:id', async (req, res) => {
  try {
    const submission = await prisma.codeSubmission.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        question: { select: { id: true, questionIndex: true, level: true, session: true, type: true, questionText: true } },
      },
    });

    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    res.json({ submission });
  } catch (err) {
    console.error('Admin submission detail error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/stats — Overall platform stats
router.get('/stats', async (_req, res) => {
  try {
    const [totalUsers, totalSubmissions, statusBreakdown] = await Promise.all([
      prisma.user.count(),
      prisma.codeSubmission.count(),
      prisma.codeSubmission.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
    ]);

    const acceptedCount = statusBreakdown.find((s) => s.status === 'accepted')?._count.status ?? 0;
    const acceptanceRate = totalSubmissions > 0 ? (acceptedCount / totalSubmissions) * 100 : 0;

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 3600 * 1000);
    const recentSubmissions = await prisma.codeSubmission.findMany({
      where: { createdAt: { gte: twentyFourHoursAgo } },
      select: { createdAt: true, status: true },
      orderBy: { createdAt: 'asc' },
    });

    const hourlyData: Array<{ hour: string; count: number; accepted: number }> = [];
    for (let i = 23; i >= 0; i--) {
      const hourStart = new Date(Date.now() - i * 3600 * 1000);
      hourStart.setMinutes(0, 0, 0);
      const hourEnd = new Date(hourStart.getTime() + 3600 * 1000);

      const inRange = recentSubmissions.filter(
        (s) => s.createdAt >= hourStart && s.createdAt < hourEnd,
      );
      hourlyData.push({
        hour: hourStart.toISOString(),
        count: inRange.length,
        accepted: inRange.filter((s) => s.status === 'accepted').length,
      });
    }

    res.json({
      totalUsers,
      totalSubmissions,
      statusBreakdown: statusBreakdown.map((s) => ({ status: s.status, count: s._count.status })),
      acceptanceRate: Math.round(acceptanceRate * 10) / 10,
      hourlySubmissions: hourlyData,
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/judge/retry/:id — Retry a failed submission
router.post('/judge/retry/:id', async (req, res) => {
  try {
    const submission = await prisma.codeSubmission.findUnique({
      where: { id: req.params.id },
      include: {
        question: { select: { testCases: true, level: true } },
      },
    });

    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    if (submission.status !== 'wrong_answer' && submission.status !== 'runtime_error'
      && submission.status !== 'time_limit_exceeded' && submission.status !== 'compilation_error'
      && submission.status !== 'memory_limit_exceeded') {
      res.status(400).json({ error: 'Only failed submissions can be retried' });
      return;
    }

    await prisma.codeSubmission.update({
      where: { id: submission.id },
      data: {
        status: 'pending',
        stdout: null,
        stderr: null,
        executionTimeMs: null,
        memoryUsedKb: null,
        testResults: Prisma.JsonNull,
      },
    });

    const testCases = (submission.question.testCases as Array<{ input: string; expected: string }>) ?? [];
    const { submitToJudge } = await import('../services/judge-queue.js');
    await submitToJudge({
      submissionId: submission.id,
      code: submission.code,
      testCases,
      level: submission.question.level,
    });

    res.json({ message: 'Submission re-queued', submissionId: submission.id });
  } catch (err) {
    console.error('Admin retry error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
