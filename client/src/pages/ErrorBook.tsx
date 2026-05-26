import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

interface ErrorItem {
  id: string;
  questionId: string;
  questionPreview: string;
  level: number;
  type: string;
  wrongAnswer: string;
  correctAnswer: string;
  options: Record<string, string>;
  answeredAt: string;
}

interface ErrorPageData {
  items: ErrorItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface StatsData {
  total: number;
  byLevel: Record<number, number>;
  byType: Record<string, number>;
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

const typeLabels: Record<string, string> = {
  mc: '选择题',
  tf: '判断题',
  programming: '编程题',
};

const typeColors: Record<string, string> = {
  mc: 'bg-blue-100 text-blue-700',
  tf: 'bg-green-100 text-green-700',
  programming: 'bg-purple-100 text-purple-700',
};

export function ErrorBook() {
  const navigate = useNavigate();
  const [level, setLevel] = useState<number>(0);
  const [type, setType] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ErrorPageData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [level, type]);

  // Fetch error items
  useEffect(() => {
    setLoading(true);
    setError('');
    const params: Record<string, string | number> = { page, limit: 10 };
    if (level > 0) params.level = level;
    if (type !== 'all') params.type = type;

    client
      .get<ErrorPageData>('/error-book', { params })
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || '加载失败'))
      .finally(() => setLoading(false));
  }, [level, type, page]);

  // Fetch stats
  useEffect(() => {
    client
      .get<StatsData>('/error-book/stats')
      .then((res) => setStats(res.data))
      .catch(() => {});
  }, [confirmId]); // refetch after removal

  const handleRemove = useCallback(
    async (questionId: string) => {
      try {
        await client.delete(`/error-book/${questionId}`);
        setConfirmId(null);
        // Refresh current page
        const params: Record<string, string | number> = { page, limit: 10 };
        if (level > 0) params.level = level;
        if (type !== 'all') params.type = type;
        const res = await client.get<ErrorPageData>('/error-book', { params });
        setData(res.data);
        // If page is now empty and not first page, go back
        if (res.data.items.length === 0 && page > 1) {
          setPage((p) => p - 1);
        }
      } catch {
        setConfirmId(null);
      }
    },
    [page, level, type],
  );

  const typeTabs = [
    { key: 'all', label: '全部' },
    { key: 'mc', label: '选择题' },
    { key: 'tf', label: '判断题' },
    { key: 'programming', label: '编程题' },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">错题本</h1>
        {stats && (
          <span className="text-sm text-gray-500">
            共 <span className="font-semibold text-red-500">{stats.total}</span> 道错题
          </span>
        )}
      </div>

      {/* Level filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setLevel(0)}
          className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${
            level === 0
              ? 'bg-gray-700 text-white ring-2 ring-offset-2 ring-gray-400'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          全部
        </button>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((lv) => (
          <button
            key={lv}
            onClick={() => setLevel(lv)}
            className={`w-9 h-9 rounded-lg text-white text-sm font-bold transition-all ${levelColors[lv]} ${
              level === lv ? 'ring-2 ring-offset-2 ring-blue-500' : 'hover:opacity-90'
            }`}
          >
            {lv}
          </button>
        ))}
      </div>

      {/* Type filter */}
      <div className="flex gap-2">
        {typeTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setType(tab.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              type === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="flex gap-2 mb-3">
                <div className="w-10 h-5 bg-gray-200 rounded-full" />
                <div className="w-14 h-5 bg-gray-200 rounded-full" />
              </div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="text-center py-12">
          <p className="text-red-500 mb-2">{error}</p>
          <button
            onClick={() => setPage(page)}
            className="text-sm text-blue-600 hover:underline"
          >
            重试
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && data && data.items.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🎉</div>
          <p className="text-xl font-semibold text-gray-700 mb-2">太棒了！没有错题</p>
          <p className="text-gray-400">继续保持，你可以的！</p>
        </div>
      )}

      {/* Error cards */}
      {!loading && !error && data && data.items.length > 0 && (
        <>
          <div className="space-y-4">
            {data.items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
              >
                {/* Badges row */}
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full text-white font-medium ${levelColors[item.level] || 'bg-gray-400'}`}
                  >
                    Level {item.level}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[item.type] || 'bg-gray-100 text-gray-600'}`}
                  >
                    {typeLabels[item.type] || item.type}
                  </span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {new Date(item.answeredAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Question preview */}
                <p className="text-sm text-gray-800 mb-4 leading-relaxed">
                  {item.questionPreview.length > 150
                    ? item.questionPreview.slice(0, 150) + '...'
                    : item.questionPreview}
                </p>

                {/* Answer comparison */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-xs text-red-500 font-medium mb-1">你的答案</p>
                    <p className="text-sm text-red-700 font-semibold">
                      {item.wrongAnswer || '(未作答)'}
                    </p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-xs text-green-500 font-medium mb-1">正确答案</p>
                    <p className="text-sm text-green-700 font-semibold">
                      {item.correctAnswer}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/practice?questionId=${item.questionId}`)}
                    className="px-4 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    重做
                  </button>
                  {confirmId === item.id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRemove(item.questionId)}
                        className="px-4 py-1.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                      >
                        确认移除
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="px-4 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(item.id)}
                      className="px-4 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                    >
                      移除
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded border border-gray-300 text-sm disabled:opacity-40 hover:bg-gray-50"
              >
                上一页
              </button>
              {Array.from({ length: data.totalPages }, (_, i) => i + 1)
                .filter((p) => Math.abs(p - page) <= 2 || p === 1 || p === data.totalPages)
                .map((p, i, arr) => (
                  <span key={p}>
                    {i > 0 && arr[i - 1] !== p - 1 && (
                      <span className="px-1 text-gray-400">...</span>
                    )}
                    <button
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded text-sm ${
                        page === p
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  </span>
                ))}
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="px-3 py-1.5 rounded border border-gray-300 text-sm disabled:opacity-40 hover:bg-gray-50"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
