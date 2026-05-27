import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import { useAppStore } from '../stores/appStore';

interface Question {
  id: number;
  questionIndex: number;
  type: 'single_choice' | 'true_false' | 'programming';
  questionText: string;
  level: number;
  session: string;
  topics: string[];
}

interface PageData {
  questions: Question[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const typeLabels: Record<string, string> = {
  single_choice: '单选',
  true_false: '判断',
  programming: '编程',
};

const typeColors: Record<string, string> = {
  single_choice: 'bg-blue-100 text-blue-700',
  true_false: 'bg-green-100 text-green-700',
  programming: 'bg-purple-100 text-purple-700',
};

export function QuestionBank() {
  const { selectedLevel } = useAppStore();
  const [type, setType] = useState<string>('all');
  const [session, setSession] = useState<string>('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setPage(1);
  }, [selectedLevel, type, session]);

  useEffect(() => {
    const params: Record<string, string | number> = {
      level: selectedLevel,
      page,
      pageSize: 12,
    };
    if (type !== 'all') params.type = type;
    if (session) params.session = session;

    setLoading(true);
    setError('');
    client
      .get<PageData>('/questions', { params })
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || '加载失败'))
      .finally(() => setLoading(false));
  }, [selectedLevel, type, session, page]);

  const typeTabs = [
    { key: 'all', label: '全部' },
    { key: 'single_choice', label: '单选' },
    { key: 'true_false', label: '判断' },
    { key: 'programming', label: '编程' },
  ];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Filter Bar */}
      <div className="mb-6 space-y-4">
        {/* Type Tabs */}
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

        {/* Session Dropdown */}
        <select
          value={session}
          onChange={(e) => setSession(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-white"
        >
          <option value="">全部场次</option>
          <option value="2024-03">2024年3月</option>
          <option value="2023-12">2023年12月</option>
          <option value="2023-09">2023年9月</option>
          <option value="2023-06">2023年6月</option>
          <option value="2023-03">2023年3月</option>
        </select>
      </div>

      {/* Loading / Error */}
      {loading && <div className="text-center text-gray-400 py-12">加载中...</div>}
      {error && <div className="text-center text-red-500 py-12">{error}</div>}

      {/* Question Grid */}
      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.questions.map((q) => (
              <Link
                key={q.id}
                to={`/questions/${q.id}`}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-blue-300 transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-400 font-mono">#{q.questionIndex}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[q.type] || 'bg-gray-100 text-gray-600'}`}>
                    {typeLabels[q.type] || q.type}
                  </span>
                </div>
                <p className="text-sm text-gray-800 line-clamp-3 mb-3">
                  {q.questionText}
                </p>
                <div className="flex flex-wrap gap-1">
                  {(q.topics || []).map((tag) => (
                    <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>

          {data.questions.length === 0 && (
            <div className="text-center text-gray-400 py-12">暂无题目</div>
          )}

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
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
                    {i > 0 && arr[i - 1] !== p - 1 && <span className="px-1 text-gray-400">...</span>}
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
