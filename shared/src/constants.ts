import type { ExamLevel } from './types.js';

export const EXAM_CONFIG: Record<ExamLevel, { timeLimitMin: number; timeLimitSec: number }> = {
  1: { timeLimitMin: 120, timeLimitSec: 7200 },
  2: { timeLimitMin: 120, timeLimitSec: 7200 },
  3: { timeLimitMin: 120, timeLimitSec: 7200 },
  4: { timeLimitMin: 120, timeLimitSec: 7200 },
  5: { timeLimitMin: 180, timeLimitSec: 10800 },
  6: { timeLimitMin: 180, timeLimitSec: 10800 },
  7: { timeLimitMin: 180, timeLimitSec: 10800 },
  8: { timeLimitMin: 180, timeLimitSec: 10800 },
};

export const QUESTION_COUNT = {
  mc: 15,
  tf: 10,
  programming: 2,
} as const;

export const SCORE_PER_QUESTION = {
  mc: 2,
  tf: 2,
  programming: 25,
} as const;

export const TOTAL_SCORE =
  QUESTION_COUNT.mc * SCORE_PER_QUESTION.mc +
  QUESTION_COUNT.tf * SCORE_PER_QUESTION.tf +
  QUESTION_COUNT.programming * SCORE_PER_QUESTION.programming;

export const PASSING_SCORE = 60;

export const LEVEL_TOPICS: Record<ExamLevel, string[]> = {
  1: ['计算机基础', '编程规范', '基础语法', '数据类型', '三大结构', '运算符', '模块导入', '输入输出', 'Turtle绘图'],
  2: ['计算机存储与网络', '程序设计语言', '流程图', 'ASCII编码', '数据类型转换', '多层分支结构', '多层循环结构', '数学函数'],
  3: ['数据编码', '进制转换', '位运算', '算法描述', '枚举法', '模拟法', '列表', '字典', '元组', '集合', '列表解析', '字符串函数'],
  4: ['函数定义与调用', '参数传递', '变量作用域', '递推算法', '排序算法', '冒泡排序', '插入排序', '选择排序', '算法复杂度', '文件操作', '异常处理', '复合类型嵌套'],
  5: ['初等数论', '素数', '最大公约数', '最小公倍数', '欧几里得算法', '埃氏筛法', '线性筛法', '唯一分解定理', '链表', '二分查找', '二分答案', '递归', '贪心算法', '分治算法', '归并排序', '快速排序'],
  6: ['树', '哈夫曼树', '完全二叉树', '二叉排序树', '哈夫曼编码', '格雷编码', 'DFS', 'BFS', '动态规划', '一维DP', '背包问题', '面向对象', '类', '封装', '继承', '多态', '栈', '队列', '循环队列'],
  7: ['数学库函数', '三角函数', '对数函数', '指数函数', '二维动态规划', '区间DP', 'LIS', 'LCS', '滚动数组', '图的定义', '图的遍历', '泛洪算法', '哈希表'],
  8: ['计数原理', '排列', '组合', '杨辉三角', '倍增法', '代数', '平面几何', '最小生成树', 'Kruskal算法', 'Prim算法', '最短路径', 'Dijkstra算法', 'Floyd算法', '算法优化', '复杂度分析'],
};

export const SESSIONS = [
  '2026-03',
  '2025-12',
  '2025-09',
  '2025-06',
  '2025-03',
  '2024-12',
  '2024-09',
  '2024-06',
  '2024-03',
  '2023-12',
  '2023-09',
  '2023-06',
  '2023-03',
] as const;

export const LEVEL_COLORS: Record<ExamLevel, string> = {
  1: '#10B981', // green
  2: '#14B8A6', // teal
  3: '#3B82F6', // blue
  4: '#6366F1', // indigo
  5: '#8B5CF6', // purple
  6: '#EC4899', // pink
  7: '#F97316', // orange
  8: '#EF4444', // red
};

export const JUDGE_LIMITS = {
  MAX_CPU_TIME_MS: { low: 5000, high: 10000 },  // L1-4: 5s, L5-8: 10s
  MAX_MEMORY_KB: 256 * 1024,  // 256MB
  MAX_CONCURRENT: 3,
  CONTAINER_CPU_QUOTA: 100000,  // 1 core
  NETWORK_MODE: 'none' as const,
} as const;
