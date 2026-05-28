import { useState, useEffect } from 'react';
import client from '../api/client';

interface LevelProgress {
  level: number;
  answered: number;
  correct: number;
  accuracy: number;
}

interface ProgressData {
  totalAnswered: number;
  totalCorrect: number;
  accuracy: number;
  levelsAttempted: number;
  byLevel: Record<number, LevelProgress>;
}

interface HistoryItem {
  id: string;
  questionPreview: string;
  isCorrect: boolean;
  answeredAt: string;
}

const levelColors: Record<number, string> = {
  1: 'bg-green-500',
  2: 'bg-teal-500',
  3: 'bg-blue-500',
  4: 'bg-indigo-500',
  5: 'bg-purple-500',
  6: 'bg-pink-500',
  7: 'bg-orange-500',
  8: 'bg-red-500',
};

export function Dashboard() {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');

    const p1 = client
      .get<ProgressData>('/progress/users/me/progress')
      .then((res) => setProgress(res.data))
      .catch(() => {});

    const p2 = client
      .get<{ items: HistoryItem[] }>('/progress/users/me/history', { params: { limit: 5 } })
      .then((res) => setHistory(res.data.items || []))
      .catch(() => {});

    Promise.all([p1, p2])
      .catch(() => setError('加载失败'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center text-gray-400 py-20">加载中...</div>;
  if (error) return <div className="text-center text-red-500 py-20">{error}</div>;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-800">学习进度</h1>

      {progress && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500">总答题数</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{progress.totalAnswered}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500">正确率</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">
                {progress.accuracy.toFixed(1)}%
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500">已考级别</p>
              <p className="text-3xl font-bold text-orange-500 mt-1">{progress.levelsAttempted}</p>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">各级别进度</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(progress.byLevel || {}).map(([levelStr, lv]) => {
              const level = Number(levelStr);
              return (
                <div
                  key={level}
                  className="bg-white rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`w-7 h-7 rounded text-white text-xs font-bold flex items-center justify-center ${levelColors[level]}`}
                    >
                      {level}
                    </span>
                    <span className="text-sm text-gray-600">
                      {lv.answered} 题
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                    <div
                      className={`h-2 rounded-full ${levelColors[level]}`}
                      style={{ width: `${lv.accuracy}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>正确 {lv.correct}</span>
                    <span>{lv.accuracy.toFixed(0)}%</span>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        </>
      )}

      {history.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">最近作答</h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {history.map((item) => (
              <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                <p className="text-sm text-gray-700 flex-1 truncate">{item.questionPreview}</p>
                <span className="text-xs text-gray-400 shrink-0">
                  {new Date(item.answeredAt).toLocaleDateString()}
                </span>
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs text-white ${
                    item.isCorrect ? 'bg-green-500' : 'bg-red-500'
                  }`}
                >
                  {item.isCorrect ? '✓' : '✗'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
