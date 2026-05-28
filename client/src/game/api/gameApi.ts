import client from '../../api/client';

// Profile
export const getGameProfile = () =>
  client.get('/game/profile');

export const createGameProfile = (data: { nickname: string; avatar: string }) =>
  client.post('/game/profile', data);

export const updateGameProfile = (data: { nickname?: string; avatar?: string }) =>
  client.patch('/game/profile', data);

// Stages
export const getStagesByLevel = (level: number) =>
  client.get(`/game/stages/${level}`);

export const getStageProgress = (level: number) =>
  client.get(`/game/stages/${level}/progress`);

export const startStage = (stageId: string) =>
  client.post(`/game/stages/${stageId}/start`);

export const completeStage = (stageId: string, data: { correctCount: number; totalCount: number; timeSpentMs: number; answers: Array<{ questionId: string; userAnswer: string; isCorrect: boolean; timeSpentMs: number }> }) =>
  client.post(`/game/stages/${stageId}/complete`, data);

export const submitStageAnswer = (stageId: string, data: { questionId: string; userAnswer: string; timeSpentMs: number }) =>
  client.post(`/game/stages/${stageId}/answer`, data);

// Leaderboard
export const getLeaderboard = (type?: 'daily' | 'all') =>
  client.get('/game/leaderboard', { params: type ? { type } : {} });

export const getMyRank = () =>
  client.get('/game/leaderboard/me');

// Achievements
export const getAchievements = () =>
  client.get('/game/achievements');

// Story
export const getStoryChapters = (level?: number) =>
  client.get('/game/story/chapters', { params: level ? { level } : {} });

export const getStoryProgress = () =>
  client.get('/game/story/progress');

export const saveStoryProgress = (chapterId: string, data: { currentScene: number; completed?: boolean }) =>
  client.post(`/game/story/chapters/${chapterId}/progress`, data);

export const completeStoryChapter = (chapterId: string, data: { correctCount: number; totalCount: number }) =>
  client.post(`/game/story/chapters/${chapterId}/complete`, data);
