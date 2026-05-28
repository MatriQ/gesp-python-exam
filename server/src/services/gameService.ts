import { prisma } from '../lib/prisma.js';

const XP_THRESHOLDS = [0, 100, 250, 500, 800, 1200, 1800, 2500, 3500, 5000] as const;

// ── Profile ──────────────────────────────────────────────────────────

export async function getOrCreateProfile(userId: string) {
  return prisma.gameProfile.findUnique({ where: { userId } });
}

export async function createProfile(userId: string, nickname: string, avatar: string) {
  return prisma.gameProfile.create({
    data: { userId, nickname, avatar },
  });
}

export async function updateProfile(userId: string, data: { nickname?: string; avatar?: string }) {
  return prisma.gameProfile.update({
    where: { userId },
    data,
  });
}

// ── Stages & Progress ────────────────────────────────────────────────

export async function getStagesWithProgress(userId: string, level: number) {
  const stages = await prisma.stage.findMany({
    where: { level },
    orderBy: { stageIndex: 'asc' },
  });

  const progressMap = new Map<string, Awaited<ReturnType<typeof getStageProgressRow>>>();
  const progresses = await getStageProgressRows(userId, stageIds(stages));
  for (const p of progresses) {
    progressMap.set(p.stageId, p);
  }

  return stages.map((s) => ({
    ...s,
    progress: progressMap.get(s.id) ?? null,
  }));
}

export async function getStageProgressForLevel(userId: string, level: number) {
  const stages = await prisma.stage.findMany({
    where: { level },
    orderBy: { stageIndex: 'asc' },
    select: { id: true },
  });

  if (stages.length === 0) return [];

  return prisma.stageProgress.findMany({
    where: {
      userId,
      stageId: { in: stageIds(stages) },
    },
    orderBy: { stage: { stageIndex: 'asc' } },
    include: { stage: true },
  });
}

export async function startStage(userId: string, stageId: string) {
  const stage = await prisma.stage.findUnique({ where: { id: stageId } });
  if (!stage) throw new Error('Stage not found');

  const existing = await prisma.stageProgress.findUnique({
    where: { userId_stageId: { userId, stageId } },
  });

  if (existing) {
    return prisma.stageProgress.update({
      where: { id: existing.id },
      data: {
        status: 'available',
        attempts: { increment: 1 },
      },
    });
  }

  return prisma.stageProgress.create({
    data: {
      userId,
      stageId,
      status: 'available',
      attempts: 1,
    },
  });
}

interface CompleteAnswer {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  timeSpentMs: number;
}

export async function completeStage(
  userId: string,
  stageId: string,
  data: { correctCount: number; totalCount: number; timeSpentMs: number; answers: CompleteAnswer[] },
) {
  const stage = await prisma.stage.findUnique({ where: { id: stageId } });
  if (!stage) throw new Error('Stage not found');

  const accuracy = data.totalCount > 0 ? data.correctCount / data.totalCount : 0;
  const stars = accuracy >= 1.0 ? 3 : accuracy >= 0.8 ? 2 : accuracy >= 0.6 ? 1 : 0;

  // XP calculation
  const xpPerCorrect = stage.type === 'boss' ? 20 : 10;
  let xpEarned = xpPerCorrect * data.correctCount;
  const perfectBonus = accuracy >= 1.0 ? 20 : 0;
  xpEarned += perfectBonus;

  // Get existing progress
  const existing = await prisma.stageProgress.findUnique({
    where: { userId_stageId: { userId, stageId } },
  });

  const bestScore = existing?.bestScore != null ? Math.max(existing.bestScore, accuracy) : accuracy;
  const bestStars = existing ? Math.max(existing.stars, stars) : stars;

  // Update stage progress
  await prisma.stageProgress.upsert({
    where: { userId_stageId: { userId, stageId } },
    update: {
      status: 'completed',
      stars: bestStars,
      bestScore,
      attempts: { increment: 1 },
      completedAt: new Date(),
    },
    create: {
      userId,
      stageId,
      status: 'completed',
      stars,
      bestScore: accuracy,
      attempts: 1,
      completedAt: new Date(),
    },
  });

  // Unlock next stage
  let nextStageUnlocked = false;
  const nextStage = await prisma.stage.findFirst({
    where: { level: stage.level, stageIndex: stage.stageIndex + 1 },
  });

  if (nextStage) {
    const nextProgress = await prisma.stageProgress.findUnique({
      where: { userId_stageId: { userId, stageId: nextStage.id } },
    });

    if (!nextProgress || nextProgress.status === 'locked') {
      await prisma.stageProgress.upsert({
        where: { userId_stageId: { userId, stageId: nextStage.id } },
        update: { status: 'available' },
        create: { userId, stageId: nextStage.id, status: 'available' },
      });
      nextStageUnlocked = true;
    }
  }

  // Update GameProfile XP and level
  const profile = await prisma.gameProfile.findUnique({ where: { userId } });
  if (!profile) throw new Error('Game profile not found');

  const newTotalXP = profile.totalXP + xpEarned;
  const newLevel = calcLevel(newTotalXP);
  const levelUp = newLevel > profile.level;

  await prisma.gameProfile.update({
    where: { userId },
    data: { totalXP: newTotalXP, level: newLevel },
  });

  // Update leaderboard
  await prisma.leaderboardEntry.upsert({
    where: { userId },
    update: { totalScore: newTotalXP },
    create: { userId, totalScore: newTotalXP },
  });

  // Write answers to UserAnswer table
  if (data.answers.length > 0) {
    await prisma.userAnswer.createMany({
      data: data.answers.map((a) => ({
        userId,
        questionId: a.questionId,
        userAnswer: a.userAnswer,
        isCorrect: a.isCorrect,
        timeSpentMs: a.timeSpentMs,
      })),
      skipDuplicates: true,
    });
  }

  return {
    stars,
    xpEarned,
    totalXP: newTotalXP,
    newLevel,
    levelUp,
    nextStageUnlocked,
  };
}

// ── Single Answer ────────────────────────────────────────────────────

export async function submitAnswer(
  userId: string,
  questionId: string,
  userAnswer: string,
  timeSpentMs: number,
) {
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question) throw new Error('Question not found');

  const isCorrect = question.answer
    ? userAnswer.trim().toLowerCase() === question.answer.trim().toLowerCase()
    : false;

  await prisma.userAnswer.create({
    data: { userId, questionId, userAnswer, isCorrect, timeSpentMs },
  });

  return { isCorrect, correctAnswer: question.answer ?? null };
}

// ── Leaderboard ──────────────────────────────────────────────────────

export async function getLeaderboard(type: string) {
  const entries = await prisma.leaderboardEntry.findMany({
    orderBy: { totalScore: 'desc' },
    take: 50,
  });

  // Enrich with user data
  const userIds = entries.map((e) => e.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });
  const profiles = await prisma.gameProfile.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, avatar: true, nickname: true, level: true },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));
  const profileMap = new Map(profiles.map((p) => [p.userId, p]));

  return entries.map((e, idx) => ({
    rank: idx + 1,
    userId: e.userId,
    name: userMap.get(e.userId)?.name ?? '',
    nickname: profileMap.get(e.userId)?.nickname ?? '',
    avatar: profileMap.get(e.userId)?.avatar ?? '',
    level: profileMap.get(e.userId)?.level ?? 1,
    totalScore: e.totalScore,
    updatedAt: e.updatedAt,
  }));
}

export async function getMyRank(userId: string) {
  const entries = await prisma.leaderboardEntry.findMany({
    orderBy: { totalScore: 'desc' },
    select: { userId: true },
  });
  const rank = entries.findIndex((e) => e.userId === userId) + 1;
  const entry = await prisma.leaderboardEntry.findUnique({ where: { userId } });
  return {
    rank: rank || null,
    totalScore: entry?.totalScore ?? 0,
  };
}

// ── Achievements ─────────────────────────────────────────────────────

export async function getAchievements(userId: string) {
  const all = await prisma.achievement.findMany({ orderBy: { createdAt: 'asc' } });
  const unlocked = await prisma.userAchievement.findMany({
    where: { userId },
    select: { achievementId: true, unlockedAt: true },
  });
  const unlockedMap = new Map(unlocked.map((u) => [u.achievementId, u.unlockedAt]));

  return all.map((a) => ({
    id: a.id,
    key: a.key,
    name: a.name,
    description: a.description,
    icon: a.icon,
    condition: a.condition,
    unlocked: unlockedMap.has(a.id),
    unlockedAt: unlockedMap.get(a.id) ?? null,
  }));
}

// ── Questions ────────────────────────────────────────────────────────

export async function getRandomQuestions(level: number, type: string, count: number) {
  const all = await prisma.question.findMany({
    where: { level, type },
    select: {
      id: true,
      type: true,
      questionIndex: true,
      questionText: true,
      options: true,
      level: true,
      topics: true,
    },
  });

  const shuffled = all.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

// ── Helpers ──────────────────────────────────────────────────────────

function calcLevel(totalXP: number): number {
  let lvl = 1;
  for (let i = 0; i < XP_THRESHOLDS.length; i++) {
    if (totalXP >= XP_THRESHOLDS[i]) lvl = i + 1;
    else break;
  }
  return lvl;
}

function stageIds(stages: { id: string }[]): string[] {
  return stages.map((s) => s.id);
}

type StageProgressRow = Awaited<ReturnType<typeof getStageProgressRow>>;

async function getStageProgressRow(userId: string, stageId: string) {
  return prisma.stageProgress.findUnique({
    where: { userId_stageId: { userId, stageId } },
  });
}

async function getStageProgressRows(userId: string, stageIds: string[]) {
  return prisma.stageProgress.findMany({
    where: { userId, stageId: { in: stageIds } },
  });
}

// ── Story ────────────────────────────────────────────────────────────

export async function getStoryChapters(level?: number) {
  const where = level ? { level } : {};
  return prisma.storyChapter.findMany({
    where,
    orderBy: [{ level: 'asc' }, { chapterIndex: 'asc' }],
  });
}

export async function getStoryProgress(userId: string) {
  return prisma.storyProgress.findMany({
    where: { userId },
    include: { chapter: true },
    orderBy: { chapter: { chapterIndex: 'asc' } },
  });
}

export async function saveStoryProgress(
  userId: string,
  chapterId: string,
  data: { currentScene: number; completed?: boolean },
) {
  return prisma.storyProgress.upsert({
    where: { userId_chapterId: { userId, chapterId } },
    update: {
      currentScene: data.currentScene,
      completed: data.completed ?? false,
    },
    create: {
      userId,
      chapterId,
      currentScene: data.currentScene,
      completed: data.completed ?? false,
    },
  });
}

export async function completeStoryChapter(
  userId: string,
  chapterId: string,
  data: { correctCount: number; totalCount: number },
) {
  // Mark chapter as completed
  const progress = await prisma.storyProgress.upsert({
    where: { userId_chapterId: { userId, chapterId } },
    update: { completed: true, completedAt: new Date() },
    create: {
      userId,
      chapterId,
      currentScene: 5,
      completed: true,
      completedAt: new Date(),
    },
  });

  // Award XP (15 per correct answer + 10 bonus for perfect)
  const xpEarned = data.correctCount * 15 + (data.correctCount === data.totalCount ? 10 : 0);
  const profile = await prisma.gameProfile.findUnique({ where: { userId } });
  if (profile) {
    const newTotalXP = profile.totalXP + xpEarned;
    const newLevel = calcLevel(newTotalXP);
    await prisma.gameProfile.update({
      where: { userId },
      data: { totalXP: newTotalXP, level: newLevel },
    });
  }

  return { progress, xpEarned };
}
