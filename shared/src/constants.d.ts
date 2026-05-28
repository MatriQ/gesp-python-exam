import type { ExamLevel } from './types.js';
export declare const EXAM_CONFIG: Record<ExamLevel, {
    timeLimitMin: number;
    timeLimitSec: number;
}>;
export declare const QUESTION_COUNT: {
    readonly mc: 15;
    readonly tf: 10;
    readonly programming: 2;
};
export declare const SCORE_PER_QUESTION: {
    readonly mc: 2;
    readonly tf: 2;
    readonly programming: 25;
};
export declare const TOTAL_SCORE: number;
export declare const PASSING_SCORE = 60;
export declare const LEVEL_TOPICS: Record<ExamLevel, string[]>;
export declare const SESSIONS: readonly ["2026-03", "2025-12", "2025-09", "2025-06", "2025-03", "2024-12", "2024-09", "2024-06", "2024-03", "2023-12", "2023-09", "2023-06", "2023-03"];
export declare const LEVEL_COLORS: Record<ExamLevel, string>;
export declare const JUDGE_LIMITS: {
    readonly MAX_CPU_TIME_MS: {
        readonly low: 5000;
        readonly high: 10000;
    };
    readonly MAX_MEMORY_KB: number;
    readonly MAX_CONCURRENT: 3;
    readonly CONTAINER_CPU_QUOTA: 100000;
    readonly NETWORK_MODE: "none";
};
