import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import type { Question, ExamStart } from '../../../shared/src/types';

type AnswerMap = Record<string, string>;

export function ExamActive() {
  const { id: examId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  const answersRef = useRef(answers);
  answersRef.current = answers;
  const autoSubmittedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await client.get<ExamStart>(`/exams/${examId}`);
        if (cancelled) return;
        setQuestions(res.data.questions);
        const startedAt = new Date(res.data.startedAt).getTime();
        const deadline = startedAt + res.data.timeLimit * 1000;
        const remaining = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
        setTimeLeft(remaining);
      } catch {
        if (!cancelled) navigate('/exam');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [examId, navigate]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  useEffect(() => {
    if (timeLeft !== 0 || autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    submitExam();
  }, [timeLeft]);

  const saveAnswer = useCallback(
    debounce(async (questionId: string, answer: string) => {
      try {
        await client.put(`/exams/${examId}/answer`, { questionId, userAnswer: answer });
      } catch (err) {
        console.error('Auto-save failed:', err);
      }
    }, 1000),
    [examId],
  );

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
    saveAnswer(questionId, answer);
  };

  const submitExam = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await client.post(`/exams/${examId}/submit`);
      navigate(`/exam/${examId}/result`);
    } catch (err) {
      console.error('Submit failed:', err);
      alert('交卷失败，请重试');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const answeredCount = questions.filter((q) => answersRef.current[q.id]?.trim()).length;
  const totalQuestions = questions.length;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isLowTime = timeLeft < 300;

  return (
    <div className="flex h-screen flex-col bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-3 md:px-6 py-3">
        <div className="text-sm font-medium text-gray-600">
          模拟考试 · {totalQuestions} 题
        </div>
        <div
          className={`font-mono text-2xl font-bold tabular-nums ${
            isLowTime ? 'animate-pulse text-red-600' : 'text-gray-900'
          }`}
        >
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="hidden md:block w-[200px] shrink-0 overflow-y-auto border-r border-gray-200 bg-gray-50 p-4">
          <div className="mb-2 text-xs font-medium text-gray-500">题目导航</div>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, i) => {
              const isAnswered = !!answersRef.current[q.id]?.trim();
              const isCurrent = i === currentIndex;
              let cls = 'h-8 w-8 rounded text-xs font-medium transition ';
              if (isCurrent) cls += 'bg-blue-500 text-white';
              else if (isAnswered) cls += 'bg-green-500 text-white';
              else cls += 'bg-gray-200 text-gray-600 hover:bg-gray-300';
              return (
                <button key={q.id} onClick={() => setCurrentIndex(i)} className={cls}>
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-4 space-y-1 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded bg-green-500" /> 已答
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded bg-gray-200" /> 未答
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded bg-blue-500" /> 当前
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="md:hidden flex items-center gap-1.5 px-3 py-2 border-b border-gray-200 bg-gray-50 overflow-x-auto shrink-0">
            {questions.map((q, i) => {
              const isAnswered = !!answersRef.current[q.id]?.trim();
              const isCurrent = i === currentIndex;
              let cls = 'shrink-0 h-8 w-8 rounded text-xs font-medium transition ';
              if (isCurrent) cls += 'bg-blue-500 text-white';
              else if (isAnswered) cls += 'bg-green-500 text-white';
              else cls += 'bg-gray-200 text-gray-600';
              return (
                <button key={q.id} onClick={() => setCurrentIndex(i)} className={cls}>
                  {i + 1}
                </button>
              );
            })}
          </div>

        <div className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex-1 p-4 md:p-8">
            {currentQ && (
              <div>
                <div className="mb-1 text-xs text-gray-400">
                  第 {currentIndex + 1} 题 · {typeLabel(currentQ.type)}
                </div>
                <div className="mb-6 text-lg leading-relaxed text-gray-900 whitespace-pre-wrap">
                  {currentQ.questionText}
                </div>

                {currentQ.type === 'mc' && currentQ.options && (
                  <div className="space-y-3">
                    {currentQ.options.map((opt) => (
                      <label
                        key={opt.label}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
                          answers[currentQ.id] === opt.label
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q-${currentQ.id}`}
                          checked={answers[currentQ.id] === opt.label}
                          onChange={() => handleAnswer(currentQ.id, opt.label)}
                          className="mt-0.5"
                        />
                        <span>
                          <span className="font-medium">{opt.label}.</span> {opt.text}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {currentQ.type === 'tf' && (
                  <div className="flex gap-4">
                    {(['正确', '错误'] as const).map((val) => (
                      <button
                        key={val}
                        onClick={() => handleAnswer(currentQ.id, val)}
                        className={`rounded-lg border px-8 py-3 text-sm font-medium transition ${
                          answers[currentQ.id] === val
                            ? 'border-blue-500 bg-blue-500 text-white'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                )}

                {currentQ.type === 'programming' && (
                  <textarea
                    value={answers[currentQ.id] || ''}
                    onChange={(e) => handleAnswer(currentQ.id, e.target.value)}
                    placeholder="在此编写代码..."
                    className="h-64 w-full resize-y rounded-lg border border-gray-300 p-4 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-gray-200 px-4 md:px-8 py-4">
            <div className="flex gap-2 md:gap-3">
              <button
                onClick={() => setCurrentIndex((i) => i - 1)}
                disabled={currentIndex === 0}
                className="rounded-lg border border-gray-300 px-3 md:px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                上一题
              </button>
              <button
                onClick={() => setCurrentIndex((i) => i + 1)}
                disabled={currentIndex === totalQuestions - 1}
                className="rounded-lg border border-gray-300 px-3 md:px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                下一题
              </button>
            </div>
            <div className="flex items-center gap-3 md:gap-6">
              <span className="text-xs md:text-sm text-gray-500">
                已答 {answeredCount}/{totalQuestions}
              </span>
              <button
                onClick={() => setShowSubmitDialog(true)}
                className="rounded-lg bg-red-500 px-4 md:px-6 py-2 text-sm font-medium text-white hover:bg-red-600"
              >
                交卷
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>

      {showSubmitDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">确认交卷</h3>
            <p className="mt-2 text-sm text-gray-600">
              已答 {answeredCount}/{totalQuestions} 题
              {answeredCount < totalQuestions && (
                <span className="text-red-500">
                  {' '}（还有 {totalQuestions - answeredCount} 题未作答）
                </span>
              )}
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowSubmitDialog(false)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                继续答题
              </button>
              <button
                onClick={submitExam}
                disabled={submitting}
                className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
              >
                {submitting ? '提交中...' : '确认交卷'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function typeLabel(type: string) {
  if (type === 'mc') return '选择题';
  if (type === 'tf') return '判断题';
  return '编程题';
}

function debounce<T extends (...args: never[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  const debounced = (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
  return debounced as T;
}
