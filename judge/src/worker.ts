import { Worker, type Job } from 'bullmq';
import { executeCode, type ExecuteResult } from './executor.js';

interface TestCase {
  input: string;
  expected: string;
}

interface TestCaseResult {
  input: string;
  expected: string;
  actual: string;
  status: 'accepted' | 'wrong_answer' | 'time_limit_exceeded' | 'runtime_error';
  executionTimeMs: number;
}

interface JudgeResult {
  submissionId: string;
  status:
    | 'accepted'
    | 'wrong_answer'
    | 'time_limit_exceeded'
    | 'memory_limit_exceeded'
    | 'runtime_error'
    | 'compilation_error';
  testResults: TestCaseResult[];
  totalExecutionTimeMs: number;
  memoryUsedBytes: number;
}

interface JudgeJobData {
  submissionId: string;
  code: string;
  testCases: TestCase[];
  level: number;
}

const JUDGE_LIMITS = {
  MAX_CPU_TIME_MS: { low: 5000, high: 10000 },
  MAX_MEMORY_BYTES: 256 * 1024 * 1024,
  MAX_CONCURRENT: 3,
};

async function processJob(job: Job<JudgeJobData>): Promise<JudgeResult> {
  const { submissionId, code, testCases, level } = job.data;
  const timeLimit =
    level <= 4
      ? JUDGE_LIMITS.MAX_CPU_TIME_MS.low
      : JUDGE_LIMITS.MAX_CPU_TIME_MS.high;

  const testResults: TestCaseResult[] = [];
  let firstError: JudgeResult['status'] | null = null;
  let totalExecutionTimeMs = 0;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const result: ExecuteResult = await executeCode(code, tc.input, {
      timeLimitMs: timeLimit,
      memoryLimitBytes: JUDGE_LIMITS.MAX_MEMORY_BYTES,
    });

    totalExecutionTimeMs += result.executionTimeMs;

    const tcStatus =
      result.status === 'accepted' && result.stdout.trim() !== tc.expected.trim()
        ? ('wrong_answer' as const)
        : result.status === 'accepted'
          ? ('accepted' as const)
          : result.status === 'time_limit_exceeded'
            ? ('time_limit_exceeded' as const)
            : ('runtime_error' as const);

    testResults.push({
      input: tc.input,
      expected: tc.expected,
      actual: result.stdout,
      status: tcStatus,
      executionTimeMs: result.executionTimeMs,
    });

    if (tcStatus !== 'accepted' && !firstError) {
      firstError =
        result.status === 'time_limit_exceeded'
          ? 'time_limit_exceeded'
          : result.status === 'memory_limit_exceeded'
            ? 'memory_limit_exceeded'
            : result.status === 'compilation_error'
              ? 'compilation_error'
              : 'wrong_answer';
    }

    job.updateProgress(Math.round(((i + 1) / testCases.length) * 100));

    if (result.status === 'compilation_error') break;
  }

  return {
    submissionId,
    status: firstError || 'accepted',
    testResults,
    totalExecutionTimeMs,
    memoryUsedBytes: JUDGE_LIMITS.MAX_MEMORY_BYTES,
  };
}

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
};

export const worker = new Worker<JudgeJobData, JudgeResult>(
  'judge',
  processJob,
  {
    connection,
    concurrency: JUDGE_LIMITS.MAX_CONCURRENT,
  }
);

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed: ${job.returnvalue.status}`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

worker.on('error', (err) => {
  console.error('Worker error:', err.message);
});

export type { JudgeJobData, JudgeResult, TestCase, TestCaseResult };
