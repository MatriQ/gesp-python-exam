import { exec } from 'child_process';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

export interface ExecuteOptions {
  timeLimitMs: number;
  memoryLimitBytes: number;
}

export interface ExecuteResult {
  status:
    | 'accepted'
    | 'wrong_answer'
    | 'time_limit_exceeded'
    | 'memory_limit_exceeded'
    | 'runtime_error'
    | 'compilation_error';
  stdout: string;
  stderr: string;
  exitCode: number | null;
  executionTimeMs: number;
  memoryUsedBytes: number;
}

export async function executeCode(
  code: string,
  input: string,
  options: ExecuteOptions
): Promise<ExecuteResult> {
  const startTime = Date.now();
  const tmpDir = join(tmpdir(), `gesp-judge-${Date.now()}`);

  try {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(join(tmpDir, 'main.py'), code);
    await writeFile(join(tmpDir, 'input.txt'), input);

    const timeSec = Math.ceil(options.timeLimitMs / 1000);
    const memMB = Math.floor(options.memoryLimitBytes / (1024 * 1024));

    const cmd =
      `docker run --rm ` +
      `--memory=${memMB}m ` +
      `--cpus=1 ` +
      `--network=none ` +
      `--timeout=${timeSec} ` +
      `-v "${tmpDir}:/tmp/solution" ` +
      `python:3.11-slim ` +
      `bash -c "cd /tmp/solution && python main.py < input.txt"`;

    return new Promise((resolve) => {
      exec(
        cmd,
        {
          timeout: options.timeLimitMs + 2000,
          maxBuffer: 10 * 1024 * 1024,
        },
        (error, stdout, stderr) => {
          const executionTimeMs = Date.now() - startTime;

          if (error) {
            if (error.killed || error.signal === 'SIGKILL') {
              resolve({
                status: 'time_limit_exceeded',
                stdout: '',
                stderr: 'Time limit exceeded',
                exitCode: null,
                executionTimeMs,
                memoryUsedBytes: 0,
              });
            } else {
              const isSyntax =
                stderr.includes('SyntaxError') ||
                stderr.includes('IndentationError');
              resolve({
                status: isSyntax ? 'compilation_error' : 'runtime_error',
                stdout,
                stderr,
                exitCode: error.code ?? 1,
                executionTimeMs,
                memoryUsedBytes: 0,
              });
            }
          } else {
            resolve({
              status: 'accepted',
              stdout,
              stderr,
              exitCode: 0,
              executionTimeMs,
              memoryUsedBytes: 0,
            });
          }
        }
      );
    });
  } catch (error: any) {
    return {
      status: 'runtime_error',
      stdout: '',
      stderr: error.message,
      exitCode: null,
      executionTimeMs: Date.now() - startTime,
      memoryUsedBytes: 0,
    };
  } finally {
    try {
      await rm(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}
