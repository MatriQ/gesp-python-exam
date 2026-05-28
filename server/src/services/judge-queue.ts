import { Queue, QueueEvents } from 'bullmq';
import type { Server as SocketIOServer } from 'socket.io';
import { prisma } from '../lib/prisma.js';

const connection = { host: process.env.REDIS_HOST || 'localhost', port: Number(process.env.REDIS_PORT) || 6379 };

export const judgeQueue = new Queue('judge', { connection });

export const queueEvents = new QueueEvents('judge', { connection });

let activeIo: SocketIOServer | null = null;

export interface JudgeJobData {
  submissionId: string;
  code: string;
  testCases: Array<{ input: string; expected: string }>;
  level: number;
}

export interface JudgeJobResult {
  submissionId: string;
  status:
    | 'accepted'
    | 'wrong_answer'
    | 'time_limit_exceeded'
    | 'memory_limit_exceeded'
    | 'runtime_error'
    | 'compilation_error';
  testResults: Array<{
    input: string;
    expected: string;
    actual: string;
    status: string;
    executionTimeMs: number;
  }>;
  totalExecutionTimeMs: number;
  memoryUsedBytes: number;
}

export async function submitToJudge(data: JudgeJobData): Promise<string> {
  const job = await judgeQueue.add('judge', data, {
    attempts: 1,
  });
  if (activeIo) {
    await emitAdminQueueUpdate(activeIo);
  }
  return job.id ?? '';
}

async function emitAdminQueueUpdate(io: SocketIOServer) {
  try {
    const counts = await judgeQueue.getJobCounts('active', 'waiting', 'completed', 'failed');
    io.emit('admin:queue:update', counts);
  } catch {
    // queue unavailable
  }
}

export function setupJudgeListener(io: SocketIOServer) {
  activeIo = io;
  queueEvents.on('completed', async ({ returnvalue }) => {
    const result = returnvalue as unknown as JudgeJobResult;
    try {
      await prisma.codeSubmission.update({
        where: { id: result.submissionId },
        data: {
          status: result.status,
          testResults: result.testResults,
          executionTimeMs: result.totalExecutionTimeMs,
          memoryUsedKb: Math.round(result.memoryUsedBytes / 1024),
          stdout: result.testResults.map((r) => r.actual).join('\n---\n'),
        },
      });
      io.to(`submission:${result.submissionId}`).emit('submission:update', result);
      io.emit('admin:submission:update', {
        submissionId: result.submissionId,
        status: result.status,
        executionTimeMs: result.totalExecutionTimeMs,
        memoryUsedKb: Math.round(result.memoryUsedBytes / 1024),
      });
      await emitAdminQueueUpdate(io);
    } catch (err) {
      console.error(`Failed to update submission ${result.submissionId}:`, err);
    }
  });

  queueEvents.on('failed', async ({ jobId, failedReason }) => {
    console.error(`Judge job ${jobId} failed:`, failedReason);
    await emitAdminQueueUpdate(io);
  });
}
