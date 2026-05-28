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
export declare const GAME_COLORS: {
    readonly red: "#FF6B6B";
    readonly teal: "#4ECDC4";
    readonly yellow: "#FFE66D";
    readonly green: "#95E1D3";
    readonly pink: "#F38181";
    readonly purple: "#AA96DA";
    readonly lightPink: "#FCBAD3";
    readonly blue: "#A8D8EA";
    readonly orange: "#FF9A3C";
    readonly mint: "#B8F3FF";
};
export declare const LEVEL_GAME_COLORS: Record<number, string>;
export declare const AVATAR_OPTIONS: readonly ["🐱", "🐶", "🦊", "🐻", "🐼", "🐰", "🦁", "🐯", "🐸", "🐵"];
export declare const STAR_THRESHOLDS: readonly [0.6, 0.8, 1];
export declare const XP_THRESHOLDS: readonly [0, 100, 250, 500, 800, 1200, 1800, 2500, 3500, 5000];
export declare const STAGE_CONFIG: Record<number, {
    stageCount: number;
    questionsPerStage: number;
    bossQuestions: number;
    bossTimeLimit: number;
}>;
export declare const ACHIEVEMENT_DEFINITIONS: readonly [{
    readonly key: "first_clear";
    readonly name: "初出茅庐";
    readonly description: "完成第一个关卡";
    readonly icon: "🌱";
    readonly condition: {
        readonly type: "stages_completed";
        readonly threshold: 1;
    };
}, {
    readonly key: "answer_50";
    readonly name: "学海无涯";
    readonly description: "累计答题 50 道";
    readonly icon: "📚";
    readonly condition: {
        readonly type: "total_answered";
        readonly threshold: 50;
    };
}, {
    readonly key: "combo_10";
    readonly name: "连击达人";
    readonly description: "单次连续正确 10 题";
    readonly icon: "🔥";
    readonly condition: {
        readonly type: "max_combo";
        readonly threshold: 10;
    };
}, {
    readonly key: "perfect_stage";
    readonly name: "完美通关";
    readonly description: "单关 3 星通关";
    readonly icon: "⭐";
    readonly condition: {
        readonly type: "max_stars";
        readonly threshold: 3;
    };
}, {
    readonly key: "level_clear";
    readonly name: "地图探索者";
    readonly description: "完成任意级别所有普通关卡";
    readonly icon: "🗺️";
    readonly condition: {
        readonly type: "level_cleared";
        readonly threshold: 1;
    };
}, {
    readonly key: "boss_defeat";
    readonly name: "Boss 猎人";
    readonly description: "击败第一个 Boss";
    readonly icon: "👹";
    readonly condition: {
        readonly type: "boss_defeated";
        readonly threshold: 1;
    };
}, {
    readonly key: "level_5";
    readonly name: "登峰造极";
    readonly description: "达到 RPG 等级 5";
    readonly icon: "🏔️";
    readonly condition: {
        readonly type: "rpg_level";
        readonly threshold: 5;
    };
}, {
    readonly key: "story_complete";
    readonly name: "故事冒险家";
    readonly description: "完成第一个故事章节";
    readonly icon: "📖";
    readonly condition: {
        readonly type: "chapters_completed";
        readonly threshold: 1;
    };
}, {
    readonly key: "perfect_accuracy";
    readonly name: "百发百中";
    readonly description: "单关正确率 100%";
    readonly icon: "🎯";
    readonly condition: {
        readonly type: "perfect_accuracy";
        readonly threshold: 1;
    };
}, {
    readonly key: "answer_200";
    readonly name: "坚持不懈";
    readonly description: "累计答题 200 道";
    readonly icon: "💪";
    readonly condition: {
        readonly type: "total_answered";
        readonly threshold: 200;
    };
}];
