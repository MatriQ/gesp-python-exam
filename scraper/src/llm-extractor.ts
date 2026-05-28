import Anthropic from '@anthropic-ai/sdk';

export interface ExtractedOption {
  label: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface ExtractedQuestion {
  type: 'mc' | 'tf' | 'programming';
  questionIndex: number;
  questionText: string;
  options: ExtractedOption[] | null;
  answer: string | null;
  explanation: string | null;
  topics: string[];
  codeBlocks: string[] | null;
  inputFormat: string | null;
  outputFormat: string | null;
  constraints: string | null;
  sampleInputs: string[] | null;
  sampleOutputs: string[] | null;
  referenceSolution: string | null;
  confidence: 'high' | 'medium' | 'low';
}

export interface ExtractionResult {
  questions: ExtractedQuestion[];
  session: string;
  level: number;
  parseErrors: string[];
}

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 8192;

const SYSTEM_PROMPT = `你是一个专业的GESP Python等级考试题目提取助手。

你的任务是从PDF提取的文本中，准确提取每一道题目的结构化数据。

GESP考试标准结构：
- 15道选择题（MC），每题2分，1-15题
- 10道判断题（TF），每题2分，16-25题
- 2道编程题，每题25分，26-27题

你必须返回一个JSON数组，每个元素包含以下字段：

对于选择题(MC)：
{
  "type": "mc",
  "questionIndex": 数字(1-15),
  "questionText": "完整题目文本（中文）",
  "options": [
    {"label": "A", "text": "选项A文本"},
    {"label": "B", "text": "选项B文本"},
    {"label": "C", "text": "选项C文本"},
    {"label": "D", "text": "选项D文本"}
  ],
  "answer": "A/B/C/D",
  "explanation": "答案解析，如果PDF中没有则根据知识点生成",
  "topics": ["知识点1", "知识点2"],
  "codeBlocks": null,
  "confidence": "high/medium/low"
}

对于判断题(TF)：
{
  "type": "tf",
  "questionIndex": 数字(16-25),
  "questionText": "完整题目文本（中文）",
  "options": null,
  "answer": "对/错",
  "explanation": "答案解析",
  "topics": ["知识点"],
  "codeBlocks": null,
  "confidence": "high/medium/low"
}

对于编程题(programming)：
{
  "type": "programming",
  "questionIndex": 数字(26或27),
  "questionText": "完整题目描述（中文）",
  "options": null,
  "answer": "参考解答代码",
  "explanation": "解题思路",
  "topics": ["知识点"],
  "codeBlocks": ["题目中的代码片段"],
  "inputFormat": "输入格式描述",
  "outputFormat": "输出格式描述",
  "constraints": "约束条件",
  "sampleInputs": ["样例输入1", "样例输入2"],
  "sampleOutputs": ["样例输出1", "样例输出2"],
  "referenceSolution": "完整的Python参考解答",
  "confidence": "high/medium/low"
}

confidence字段规则：
- high: 文本清晰，答案明确
- medium: 部分文本模糊，但答案可以推断
- low: 文本严重缺失或答案不确定

重要规则：
1. 返回纯JSON数组，不要markdown代码块
2. 确保所有中文字符正确保留
3. 代码块保持原格式
4. 如果某道题无法提取，仍然包含在数组中，confidence设为low
5. topics使用以下知识点列表中的项目：${getTopicList()}`;

function getTopicList(): string {
  const topics: Record<number, string[]> = {
    1: ['计算机基础', '编程规范', '基础语法', '数据类型', '三大结构', '运算符', '模块导入', '输入输出', 'Turtle绘图'],
    2: ['计算机存储与网络', '程序设计语言', '流程图', 'ASCII编码', '数据类型转换', '多层分支结构', '多层循环结构', '数学函数'],
    3: ['数据编码', '进制转换', '位运算', '算法描述', '枚举法', '模拟法', '列表', '字典', '元组', '集合', '列表解析', '字符串函数'],
    4: ['函数定义与调用', '参数传递', '变量作用域', '递推算法', '排序算法', '冒泡排序', '插入排序', '选择排序', '算法复杂度', '文件操作', '异常处理', '复合类型嵌套'],
    5: ['初等数论', '素数', '最大公约数', '最小公倍数', '欧几里得算法', '埃氏筛法', '线性筛法', '唯一分解定理', '链表', '二分查找', '二分答案', '递归', '贪心算法', '分治算法', '归并排序', '快速排序'],
    6: ['树', '哈夫曼树', '完全二叉树', '二叉排序树', '哈夫曼编码', '格雷编码', 'DFS', 'BFS', '动态规划', '一维DP', '背包问题', '面向对象', '类', '封装', '继承', '多态', '栈', '队列', '循环队列'],
    7: ['数学库函数', '三角函数', '对数函数', '指数函数', '二维动态规划', '区间DP', 'LIS', 'LCS', '滚动数组', '图的定义', '图的遍历', '泛洪算法', '哈希表'],
    8: ['计数原理', '排列', '组合', '杨辉三角', '倍增法', '代数', '平面几何', '最小生成树', 'Kruskal算法', 'Prim算法', '最短路径', 'Dijkstra算法', 'Floyd算法', '算法优化', '复杂度分析'],
  };
  return Object.values(topics).flat().join('、');
}

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env['ANTHROPIC_API_KEY'] || process.env['CLAUDE_API_KEY'];
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY or CLAUDE_API_KEY environment variable is required');
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with exponential backoff retry logic.
 */
async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const isRetryable =
        err instanceof Error &&
        (err.message.includes('rate') ||
          err.message.includes('429') ||
          err.message.includes('503') ||
          err.message.includes('500') ||
          err.message.includes('timeout') ||
          err.message.includes('ECONNRESET'));
      if (!isRetryable || attempt === MAX_RETRIES) {
        break;
      }
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(`  Retry ${attempt}/${MAX_RETRIES} for ${label} after ${delay}ms: ${err instanceof Error ? err.message : String(err)}`);
      await sleep(delay);
    }
  }
  throw lastError;
}

/**
 * Extract questions from a single page/chunk of PDF text.
 * The text is split into chunks to avoid token limits.
 */
export async function extractQuestionsFromText(
  text: string,
  session: string,
  level: number,
): Promise<ExtractionResult> {
  const parseErrors: string[] = [];
  const allQuestions: ExtractedQuestion[] = [];

  const chunks = splitIntoChunks(text);

  for (const chunk of chunks) {
    try {
      const questions = await callClaudeAPI(chunk, session, level);
      allQuestions.push(...questions);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      parseErrors.push(`Chunk extraction failed: ${msg}`);
    }
  }

  allQuestions.sort((a, b) => a.questionIndex - b.questionIndex);

  for (let i = 0; i < allQuestions.length; i++) {
    if (allQuestions[i]!.questionIndex === -1) {
      allQuestions[i]!.questionIndex = i + 1;
    }
  }

  validateQuestions(allQuestions, session, level);

  return {
    questions: allQuestions,
    session,
    level,
    parseErrors,
  };
}

function validateQuestions(questions: ExtractedQuestion[], session: string, level: number): void {
  const low = questions.filter((q) => q.confidence === 'low');
  const medium = questions.filter((q) => q.confidence === 'medium');
  const missing = questions.filter((q) => !q.questionText.trim());
  const mcNoOptions = questions.filter((q) => q.type === 'mc' && (!q.options || q.options.length < 2));
  const tfNoAnswer = questions.filter((q) => q.type === 'tf' && !q.answer);
  const progNoSolution = questions.filter((q) => q.type === 'programming' && !q.referenceSolution);

  if (low.length > 0) {
    console.warn(`⚠ [${session}/L${level}] ${low.length} questions with LOW confidence (indices: ${low.map((q) => q.questionIndex).join(', ')})`);
  }
  if (medium.length > 0) {
    console.warn(`⚠ [${session}/L${level}] ${medium.length} questions with MEDIUM confidence`);
  }
  if (missing.length > 0) {
    console.warn(`⚠ [${session}/L${level}] ${missing.length} questions with EMPTY text`);
  }
  if (mcNoOptions.length > 0) {
    console.warn(`⚠ [${session}/L${level}] ${mcNoOptions.length} MC questions with insufficient options`);
  }
  if (tfNoAnswer.length > 0) {
    console.warn(`⚠ [${session}/L${level}] ${tfNoAnswer.length} TF questions missing answer`);
  }
  if (progNoSolution.length > 0) {
    console.warn(`⚠ [${session}/L${level}] ${progNoSolution.length} programming questions missing reference solution`);
  }

  const highCount = questions.length - low.length - medium.length;
  console.log(`📊 [${session}/L${level}] Quality: ${highCount} high / ${medium.length} medium / ${low.length} low`);
}

function splitIntoChunks(text: string): string[] {
  const lines = text.split('\n');
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let charCount = 0;
  const MAX_CHUNK_CHARS = 12000;

  for (const line of lines) {
    const isQuestionStart = /^[\s]*(\d{1,2})[.．、]/.test(line);

    if (isQuestionStart && charCount > MAX_CHUNK_CHARS * 0.5) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.join('\n'));
        currentChunk = [];
        charCount = 0;
      }
    }

    currentChunk.push(line);
    charCount += line.length;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join('\n'));
  }

  return chunks.length === 0 ? [] : chunks;
}

async function callClaudeAPI(
  chunk: string,
  session: string,
  level: number,
): Promise<ExtractedQuestion[]> {
  const anthropic = getClient();

  const userPrompt = `请从以下GESP Python ${level}级考试（${session}期）的PDF文本中提取所有题目。

考试信息：
- 期次：${session}
- 等级：${level}
- 预期题目数：15道选择题 + 10道判断题 + 2道编程题 = 27道

PDF文本内容：
---
${chunk}
---

请返回JSON数组。`;

  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text in Claude response');
    }

    let responseText = textBlock.text.trim();

    if (responseText.startsWith('```')) {
      responseText = responseText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    try {
      const parsed = JSON.parse(responseText);
      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array');
      }
      return parsed.map(normalizeQuestion);
    } catch (parseErr) {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]!);
        return parsed.map(normalizeQuestion);
      }
      throw new Error(
        `Failed to parse Claude response as JSON: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
      );
    }
  }, `Claude API (${session}/level-${level})`);
}

/**
 * Normalize raw LLM output into ExtractedQuestion.
 */
function normalizeQuestion(raw: Record<string, unknown>): ExtractedQuestion {
  const type = validateType(raw['type'] as string);
  const questionIndex = typeof raw['questionIndex'] === 'number' ? raw['questionIndex'] : -1;

  return {
    type,
    questionIndex,
    questionText: String(raw['questionText'] ?? ''),
    options: normalizeOptions(raw['options'], type),
    answer: raw['answer'] ? String(raw['answer']) : null,
    explanation: raw['explanation'] ? String(raw['explanation']) : null,
    topics: normalizeTopics(raw['topics']),
    codeBlocks: normalizeStringArray(raw['codeBlocks']),
    inputFormat: raw['inputFormat'] ? String(raw['inputFormat']) : null,
    outputFormat: raw['outputFormat'] ? String(raw['outputFormat']) : null,
    constraints: raw['constraints'] ? String(raw['constraints']) : null,
    sampleInputs: normalizeStringArray(raw['sampleInputs']),
    sampleOutputs: normalizeStringArray(raw['sampleOutputs']),
    referenceSolution: raw['referenceSolution'] ? String(raw['referenceSolution']) : null,
    confidence: validateConfidence(raw['confidence'] as string),
  };
}

function validateType(type: string | undefined): 'mc' | 'tf' | 'programming' {
  if (type === 'mc' || type === 'tf' || type === 'programming') return type;
  return 'mc';
}

function validateConfidence(c: string | undefined): 'high' | 'medium' | 'low' {
  if (c === 'high' || c === 'medium' || c === 'low') return c;
  return 'medium';
}

function normalizeOptions(
  options: unknown,
  type: string,
): ExtractedOption[] | null {
  if (type !== 'mc') return null;
  if (!Array.isArray(options)) return null;

  return options
    .filter((opt): opt is Record<string, unknown> => typeof opt === 'object' && opt !== null)
    .map((opt) => ({
      label: (['A', 'B', 'C', 'D'].includes(opt['label'] as string)
        ? opt['label']
        : 'A') as ExtractedOption['label'],
      text: String(opt['text'] ?? ''),
    }));
}

function normalizeTopics(topics: unknown): string[] {
  if (!Array.isArray(topics)) return [];
  return topics.map((t) => String(t));
}

function normalizeStringArray(arr: unknown): string[] | null {
  if (!Array.isArray(arr)) return null;
  if (arr.length === 0) return null;
  return arr.map((s) => String(s));
}
