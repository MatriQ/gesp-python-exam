export type QuestionType = 'mc' | 'tf' | 'programming';
export type ExamLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type SubmissionStatus = 'pending' | 'running' | 'accepted' | 'wrong_answer' | 'time_limit_exceeded' | 'runtime_error';
export type ExamStatus = 'in_progress' | 'completed';
export interface QuestionOption {
    label: string;
    text: string;
}
export interface TestCase {
    input: string;
    expected: string;
    isSample: boolean;
}
export interface Question {
    id: string;
    session: string;
    level: ExamLevel;
    type: QuestionType;
    questionIndex: number;
    questionText: string;
    options: QuestionOption[] | null;
    answer: string | null;
    explanation: string | null;
    topics: string[];
    difficulty: string;
    images: string[] | null;
    codeBlocks: string[] | null;
    inputFormat: string | null;
    outputFormat: string | null;
    constraints: string | null;
    sampleInput: string | null;
    sampleOutput: string | null;
    templateCode: string | null;
    testCases: TestCase[] | null;
    createdAt: string;
}
export interface UserAnswer {
    id: string;
    userId: string;
    questionId: string;
    userAnswer: string;
    isCorrect: boolean;
    timeSpentMs: number;
    createdAt: string;
}
export interface MockExam {
    id: string;
    userId: string;
    level: ExamLevel;
    startedAt: string;
    completedAt: string | null;
    timeLimit: number;
    status: ExamStatus;
}
export interface MockExamAnswer {
    id: string;
    mockExamId: string;
    questionId: string;
    userAnswer: string | null;
    isCorrect: boolean | null;
}
export interface CodeSubmission {
    id: string;
    userId: string;
    questionId: string;
    code: string;
    language: string;
    status: SubmissionStatus;
    stdout: string | null;
    stderr: string | null;
    executionTimeMs: number | null;
    memoryUsedKb: number | null;
    testResults: TestCase[] | null;
    createdAt: string;
}
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    totalPages: number;
}
export interface QuestionFilter {
    level?: ExamLevel;
    type?: QuestionType;
    session?: string;
    topic?: string;
    page?: number;
    limit?: number;
}
export interface AnswerSubmission {
    questionId: string;
    userAnswer: string;
    timeSpentMs: number;
}
export interface AnswerResult {
    isCorrect: boolean;
    correctAnswer: string;
    explanation: string;
}
export interface UserProgress {
    levelsAttempted: number[];
    totalAnswered: number;
    totalCorrect: number;
    accuracy: number;
    byLevel: Record<number, {
        answered: number;
        correct: number;
        accuracy: number;
    }>;
}
export interface ExamStart {
    examId: string;
    questions: Question[];
    timeLimit: number;
    startedAt: string;
}
export interface ExamResult {
    totalScore: number;
    passed: boolean;
    mcScore: number;
    tfScore: number;
    programmingScore: number;
    questionResults: Array<{
        questionId: string;
        type: QuestionType;
        userAnswer: string | null;
        correctAnswer: string;
        isCorrect: boolean;
        score: number;
    }>;
    timeTaken: number;
}
