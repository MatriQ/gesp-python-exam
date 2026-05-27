import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';

interface ExamResultData {
  exam: {
    id: string;
    level: number;
    startedAt: string;
    completedAt: string;
    timeLimit: number;
    status: string;
    totalScore: number;
    maxScore: number;
    passed: boolean;
  };
  answers: AnswerItem[];
  scoreBreakdown: {
    mc: SectionBreakdown;
    tf: SectionBreakdown;
    programming: SectionBreakdown;
  };
}

interface SectionBreakdown {
  correct?: number;
  total: number;
  score: number;
  maxScore: number;
}

interface AnswerItem {
  questionId: string;
  answerId?: string;
  type: 'mc' | 'tf' | 'programming';
  questionText: string;
  options?: { id: string; text: string }[];
  userAnswer: string | null;
  isCorrect: boolean;
  correctAnswer: string;
  explanation?: string;
}

const LEVEL_COLORS: Record<number, string> = {
  1: 'bg-green-100 text-green-800',
  2: 'bg-blue-100 text-blue-800',
  3: 'bg-yellow-100 text-yellow-800',
  4: 'bg-orange-100 text-orange-800',
  5: 'bg-red-100 text-red-800',
  6: 'bg-purple-100 text-purple-800',
  7: 'bg-pink-100 text-pink-800',
  8: 'bg-indigo-100 text-indigo-800',
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  AC: { label: 'AC', cls: 'bg-green-100 text-green-800' },
  WA: { label: 'WA', cls: 'bg-red-100 text-red-800' },
  TLE: { label: 'TLE', cls: 'bg-yellow-100 text-yellow-800' },
  RE: { label: 'RE', cls: 'bg-orange-100 text-orange-800' },
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function timeTaken(start: string, end: string): number {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000);
}

function ProgressBar({ percent, color }: { percent: number; color: string }) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}

function Skeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-pulse space-y-6">
      <div className="bg-gray-200 rounded-2xl h-48" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-200 rounded-xl h-28" />
        <div className="bg-gray-200 rounded-xl h-28" />
        <div className="bg-gray-200 rounded-xl h-28" />
      </div>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-gray-200 rounded-xl h-20" />
      ))}
    </div>
  );
}

export function ExamResult() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ExamResultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!id) return;
    client
      .get<ExamResultData>(`/exams/${id}/result`)
      .then((res) => setData(res.data))
      .catch((err) => {
        setError(err.response?.data?.message || '无法加载考试结果');
      });
  }, [id]);

  const toggleExpand = (qid: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(qid)) next.delete(qid);
      else next.add(qid);
      return next;
    });
  };

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">😞</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">加载失败</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <button
          onClick={() => navigate('/')}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          返回首页
        </button>
      </div>
    );
  }

  if (!data) return <Skeleton />;

  const { exam, answers, scoreBreakdown } = data;
  const elapsed = timeTaken(exam.startedAt, exam.completedAt);

  const sections = [
    { label: '选择题', key: 'mc' as const, data: scoreBreakdown.mc, color: 'bg-blue-500' },
    { label: '判断题', key: 'tf' as const, data: scoreBreakdown.tf, color: 'bg-green-500' },
    { label: '编程题', key: 'programming' as const, data: scoreBreakdown.programming, color: 'bg-purple-500' },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-8 space-y-6">
      {/* Score Card */}
      <div
        className={`rounded-2xl p-8 text-center ${
          exam.passed
            ? 'bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200'
            : 'bg-gradient-to-br from-red-50 to-orange-50 border border-red-200'
        }`}
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${LEVEL_COLORS[exam.level] || 'bg-gray-100 text-gray-800'}`}>
            GESP {exam.level} 级
          </span>
          {exam.passed ? (
            <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-600 text-white">
              ✅ 通过
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-sm font-semibold bg-red-600 text-white">
              ❌ 未通过
            </span>
          )}
        </div>

        <div className="mb-2">
          <span className="text-6xl font-bold text-gray-900">{exam.totalScore}</span>
          <span className="text-2xl text-gray-500"> / {exam.maxScore}</span>
        </div>

        <p className="text-gray-500">
          用时: {formatTime(elapsed)} / {formatTime(exam.timeLimit * 60)}
        </p>
      </div>

      {/* Score Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {sections.map(({ label, data: sec, color }) => {
          const pct = sec.maxScore > 0 ? Math.round((sec.score / sec.maxScore) * 100) : 0;
          return (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
              <h3 className="font-semibold text-gray-900">{label}</h3>
              {sec.correct !== undefined && (
                <p className="text-sm text-gray-600">
                  正确: {sec.correct} / {sec.total}
                </p>
              )}
              {sec.correct === undefined && (
                <p className="text-sm text-gray-600">
                  共 {sec.total} 题
                </p>
              )}
              <p className="text-sm font-medium">
                得分: {sec.score} / {sec.maxScore}
              </p>
              <ProgressBar percent={pct} color={color} />
            </div>
          );
        })}
      </div>

      {/* Question Review */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">答题回顾</h2>
        {answers.map((a, idx) => {
          const isOpen = expanded.has(a.questionId);
          return (
            <div
              key={a.questionId}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => toggleExpand(a.questionId)}
                className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors"
              >
                <span className="mt-0.5 text-lg flex-shrink-0">
                  {a.isCorrect ? '✅' : '❌'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-400 font-mono">#{idx + 1}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                      {a.type === 'mc' ? '选择题' : a.type === 'tf' ? '判断题' : '编程题'}
                    </span>
                  </div>
                  <p className="text-gray-800 text-sm line-clamp-2">{a.questionText}</p>
                  {!isOpen && a.type !== 'programming' && (
                    <div className="mt-1 flex items-center gap-4 text-xs">
                      <span className={a.isCorrect ? 'text-green-600' : 'text-red-600'}>
                        你的答案: {a.userAnswer ?? '未作答'}
                      </span>
                      {!a.isCorrect && (
                        <span className="text-green-600">正确答案: {a.correctAnswer}</span>
                      )}
                    </div>
                  )}
                  {a.type === 'programming' && a.correctAnswer && STATUS_BADGE[a.correctAnswer] && (
                    <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[a.correctAnswer].cls}`}>
                      {STATUS_BADGE[a.correctAnswer].label}
                    </span>
                  )}
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-0 border-t border-gray-100 space-y-3">
                  <div className="pt-3">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{a.questionText}</p>
                  </div>

                  {a.type === 'mc' && a.options && (
                    <div className="space-y-1.5">
                      {a.options.map((opt) => {
                        const isUser = a.userAnswer === opt.id;
                        const isCorrectOpt = a.correctAnswer === opt.id;
                        let optCls = 'bg-gray-50 border-gray-200 text-gray-700';
                        if (isCorrectOpt) optCls = 'bg-green-50 border-green-300 text-green-800';
                        if (isUser && !a.isCorrect) optCls = 'bg-red-50 border-red-300 text-red-800';
                        return (
                          <div key={opt.id} className={`text-sm px-3 py-1.5 rounded-lg border ${optCls}`}>
                            {opt.id}. {opt.text}
                            {isCorrectOpt && ' ✓'}
                            {isUser && !a.isCorrect && ' ✗'}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {a.type === 'tf' && (
                    <div className="flex gap-4 text-sm">
                      <span className={a.isCorrect ? 'text-green-600 font-medium' : 'text-red-600'}>
                        你的答案: {a.userAnswer ?? '未作答'}
                      </span>
                      {!a.isCorrect && (
                        <span className="text-green-600 font-medium">正确答案: {a.correctAnswer}</span>
                      )}
                    </div>
                  )}

                  {a.explanation && (
                    <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800">
                      <span className="font-medium">解析：</span>{a.explanation}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/questions/${a.questionId}`);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      查看解析 →
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center pt-4 pb-8">
        <button
          onClick={() => navigate('/exam')}
          className="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
        >
          再考一次
        </button>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 rounded-lg bg-white border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
        >
          返回首页
        </button>
      </div>
    </div>
  );
}
