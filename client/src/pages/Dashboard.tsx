import { useState, useEffect } from 'react';
import client from '../api/client';

interface LevelProgress {
  level: number;
  total: number;
  answered: number;
  correct: number;
}

interface ProgressData {
  totalAnswered: number;
  totalCorrect: number;
  accuracy: number;
  streak: number;
  levels: LevelProgress[];
}

interface HistoryItem {
  id: number;
  questionText: string;
  correct: boolean;
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
      .get<ProgressData>('/users/me/progress')
      .then((res) => setProgress(res.data))
      .catch(() => {});

    const p2 = client
      .get<HistoryItem[]>('/users/me/history', { params: { limit: 5 } })
      .then((res) => setHistory(res.data))
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
              <p className="text-sm text-gray-500">连续正确</p>
              <p className="text-3xl font-bold text-orange-500 mt-1">{progress.streak}</p>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">各级别进度</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(progress.levels || []).map((lv) => (
                <div
                  key={lv.level}
                  className="bg-white rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`w-7 h-7 rounded text-white text-xs font-bold flex items-center justify-center ${levelColors[lv.level]}`}
                    >
                      {lv.level}
                    </span>
                    <span className="text-sm text-gray-600">
                      {lv.answered}/{lv.total} 题
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                    <div
                      className={`h-2 rounded-full ${levelColors[lv.level]}`}
                      style={{
                        width: `${lv.total > 0 ? (lv.answered / lv.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>正确 {lv.correct}</span>
                    <span>
                      {lv.answered > 0
                        ? ((lv.correct / lv.answered) * 100).toFixed(0)
                        : 0}
                      %
                    </span>
                  </div>
                </div>
              ))}
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
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs text-white ${
                    item.correct ? 'bg-green-500' : 'bg-red-500'
                  }`}
                >
                  {item.correct ? '✓' : '✗'}
                </span>
                <p className="text-sm text-gray-700 flex-1 truncate">{item.questionText}</p>
                <span className="text-xs text-gray-400 shrink-0">
                  {new Date(item.answeredAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
