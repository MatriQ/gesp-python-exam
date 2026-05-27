import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { LEVEL_COLORS, EXAM_CONFIG, QUESTION_COUNT } from '../../../shared/src/constants';
import type { ExamLevel, ExamStart } from '../../../shared/src/types';

const LEVELS: ExamLevel[] = [1, 2, 3, 4, 5, 6, 7, 8];

export function ExamEntry() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [loading, setLoading] = useState(false);
  const [confirmLevel, setConfirmLevel] = useState<ExamLevel | null>(null);

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  const startExam = async (level: ExamLevel) => {
    setLoading(true);
    try {
      const res = await client.post<ExamStart>('/exams/start', { level });
      navigate(`/exam/${res.data.examId}`);
    } catch (err) {
      console.error('Failed to start exam:', err);
      alert('开始考试失败，请重试');
    } finally {
      setLoading(false);
      setConfirmLevel(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8 md:py-12">
        <h1 className="mb-2 text-center text-3xl font-bold text-gray-900">
          GESP 模拟考试
        </h1>
        <p className="mb-10 text-center text-gray-500">
          选择等级开始模拟考试，考试时间到后将自动交卷
        </p>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {LEVELS.map((level) => {
            const color = LEVEL_COLORS[level];
            const config = EXAM_CONFIG[level];
            return (
              <button
                key={level}
                onClick={() => setConfirmLevel(level)}
                disabled={loading}
                className="group relative overflow-hidden rounded-xl bg-white p-6 text-left shadow-sm ring-1 ring-gray-200 transition hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50"
              >
                <div
                  className="absolute inset-x-0 top-0 h-1.5"
                  style={{ backgroundColor: color }}
                />
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-lg text-xl font-bold text-white"
                    style={{ backgroundColor: color }}
                  >
                    {level}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      Level {level}
                    </div>
                    <div className="text-xs text-gray-500">
                      {config.timeLimitMin} 分钟
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-400">
                  {QUESTION_COUNT.mc}选择 + {QUESTION_COUNT.tf}判断 + {QUESTION_COUNT.programming}编程
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {confirmLevel !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              确认开始考试
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Level {confirmLevel} · {EXAM_CONFIG[confirmLevel].timeLimitMin} 分钟 ·
              共 {QUESTION_COUNT.mc + QUESTION_COUNT.tf + QUESTION_COUNT.programming} 题
            </p>
            <p className="mt-1 text-xs text-gray-400">
              开始后计时不可暂停，请确保有充足时间
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setConfirmLevel(null)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={() => startExam(confirmLevel)}
                disabled={loading}
                className="flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: LEVEL_COLORS[confirmLevel] }}
              >
                {loading ? '加载中...' : '开始考试'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
