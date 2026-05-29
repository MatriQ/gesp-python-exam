import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAdminStore } from '../stores/adminStore';
import { adminApi, type SubmissionsResponse, adminUsersApi, type AdminUsersResponse, adminQuestionsApi, type AdminQuestionsResponse, type QuestionDistribution } from '../api/admin';
import { FEEDBACK_STATUSES } from '../../../shared/src/constants';
import type { QuestionFeedback } from '../../../shared/src/types';

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  accepted: { label: 'AC', color: 'text-green-700', bg: 'bg-green-100' },
  wrong_answer: { label: 'WA', color: 'text-red-700', bg: 'bg-red-100' },
  time_limit_exceeded: { label: 'TLE', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  runtime_error: { label: 'RE', color: 'text-orange-700', bg: 'bg-orange-100' },
  compilation_error: { label: 'CE', color: 'text-orange-700', bg: 'bg-orange-100' },
  memory_limit_exceeded: { label: 'MLE', color: 'text-purple-700', bg: 'bg-purple-100' },
  pending: { label: 'Pending', color: 'text-gray-700', bg: 'bg-gray-100' },
  running: { label: 'Running', color: 'text-blue-700', bg: 'bg-blue-100' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded ${s.bg} ${s.color}`}>
      {s.label}
    </span>
  );
}

function QueueCard() {
  const queueStats = useAdminStore((s) => s.queueStats);

  const items = queueStats
    ? [
        { label: 'Active', value: queueStats.active, color: 'bg-blue-500' },
        { label: 'Waiting', value: queueStats.waiting, color: 'bg-yellow-500' },
        { label: 'Completed', value: queueStats.recentCompleted, color: 'bg-green-500' },
        { label: 'Failed', value: queueStats.recentFailed, color: 'bg-red-500' },
      ]
    : [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Queue</h2>
      <div className="grid grid-cols-4 gap-3">
        {items.map((item) => (
          <div key={item.label} className="text-center">
            <div className="relative w-12 h-12 mx-auto mb-1">
              <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  className={item.color}
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${Math.min((item.value / Math.max(queueStats!.active + queueStats!.waiting + queueStats!.recentCompleted + queueStats!.recentFailed, 1)) * 100, 100)} 100`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-800">
                {item.value}
              </span>
            </div>
            <p className="text-xs text-gray-500">{item.label}</p>
          </div>
        ))}
      </div>
      {queueStats && queueStats.avgExecutionTimeMs > 0 && (
        <p className="text-xs text-gray-400 mt-3 text-center">
          Avg execution: {queueStats.avgExecutionTimeMs}ms
        </p>
      )}
    </div>
  );
}

function HealthCard() {
  const health = useAdminStore((s) => s.health);

  const judgeOk = health?.judge.status === 'healthy';
  const redisOk = health?.redis.status === 'connected';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Health</h2>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Judge Service</span>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${judgeOk ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className={`text-xs font-medium ${judgeOk ? 'text-green-700' : 'text-red-700'}`}>
              {health?.judge.status || 'unknown'}
            </span>
            {health?.judge.latency ? (
              <span className="text-xs text-gray-400">{health.judge.latency}ms</span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Redis</span>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${redisOk ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className={`text-xs font-medium ${redisOk ? 'text-green-700' : 'text-red-700'}`}>
              {health?.redis.status || 'unknown'}
            </span>
          </div>
        </div>
        {health?.lastProcessedAt && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Last Job</span>
            <span className="text-xs text-gray-500">
              {new Date(health.lastProcessedAt).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function StatsCard() {
  const stats = useAdminStore((s) => s.stats);

  if (!stats) return <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse h-48" />;

  const maxCount = Math.max(...stats.hourlySubmissions.map((h) => h.count), 1);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Platform Stats</h2>
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div>
          <p className="text-xs text-gray-500">Users</p>
          <p className="text-xl font-bold text-gray-800">{stats.totalUsers}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Submissions</p>
          <p className="text-xl font-bold text-gray-800">{stats.totalSubmissions}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Acceptance</p>
          <p className="text-xl font-bold text-blue-600">{stats.acceptanceRate}%</p>
        </div>
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-2">Submissions (24h)</p>
        <div className="flex items-end gap-px h-20">
          {stats.hourlySubmissions.map((h, i) => (
            <div key={i} className="flex-1 flex flex-col justify-end group relative">
              <div
                className="bg-blue-400 hover:bg-blue-500 rounded-t transition-colors w-full"
                style={{ height: `${(h.count / maxCount) * 100}%`, minHeight: h.count > 0 ? 2 : 0 }}
              />
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-800 text-white text-xs px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                {h.count} ({new Date(h.hour).getHours()}:00)
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
          <span>-24h</span>
          <span>now</span>
        </div>
      </div>
    </div>
  );
}

function SubmissionsTable() {
  const [data, setData] = useState<SubmissionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);
  const refreshRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const fetchSubmissions = useCallback(async () => {
    try {
      const params: Record<string, unknown> = { page, limit: 15 };
      if (statusFilter) params.status = statusFilter;
      if (searchUser) params.userId = searchUser;
      const res = await adminApi.getSubmissions(params);
      setData(res.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, searchUser]);

  useEffect(() => {
    setLoading(true);
    fetchSubmissions();
  }, [fetchSubmissions]);

  useEffect(() => {
    refreshRef.current = setInterval(fetchSubmissions, 10000);
    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current);
    };
  }, [fetchSubmissions]);

  const handleRetry = async (id: string) => {
    setRetrying(id);
    try {
      await adminApi.retrySubmission(id);
      await fetchSubmissions();
    } catch {
      // silent
    } finally {
      setRetrying(null);
    }
  };

  const canRetry = (status: string) =>
    ['wrong_answer', 'runtime_error', 'time_limit_exceeded', 'compilation_error', 'memory_limit_exceeded'].includes(status);

  if (loading) return <div className="text-center text-gray-400 py-10">Loading...</div>;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-semibold text-gray-700">Recent Submissions</h2>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="wrong_answer">Wrong Answer</option>
          <option value="runtime_error">Runtime Error</option>
          <option value="time_limit_exceeded">TLE</option>
        </select>
        <input
          value={searchUser}
          onChange={(e) => { setSearchUser(e.target.value); setPage(1); }}
          placeholder="User ID"
          className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 w-32"
        />
        {data && (
          <span className="text-xs text-gray-400 ml-auto">
            {data.total} total
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-100">
              <th className="text-left px-4 py-2 font-medium">ID</th>
              <th className="text-left px-4 py-2 font-medium">User</th>
              <th className="text-left px-4 py-2 font-medium">Question</th>
              <th className="text-left px-4 py-2 font-medium">Status</th>
              <th className="text-left px-4 py-2 font-medium">Time</th>
              <th className="text-left px-4 py-2 font-medium">Memory</th>
              <th className="text-left px-4 py-2 font-medium">Submitted</th>
              <th className="text-left px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {data?.submissions.map((sub) => (
              <>
                <tr
                  key={sub.id}
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                >
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{sub.id.slice(-6)}</td>
                  <td className="px-4 py-2.5 text-gray-700">{sub.user?.name || sub.userId.slice(-6)}</td>
                  <td className="px-4 py-2.5 text-gray-600">
                    L{sub.question?.level} #{sub.question?.questionIndex}
                  </td>
                  <td className="px-4 py-2.5"><StatusBadge status={sub.status} /></td>
                  <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">
                    {sub.executionTimeMs != null ? `${sub.executionTimeMs}ms` : '-'}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">
                    {sub.memoryUsedKb != null ? `${sub.memoryUsedKb}KB` : '-'}
                  </td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs">
                    {new Date(sub.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5">
                    {canRetry(sub.status) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRetry(sub.id); }}
                        disabled={retrying === sub.id}
                        className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                      >
                        {retrying === sub.id ? '...' : 'Retry'}
                      </button>
                    )}
                  </td>
                </tr>
                {expandedId === sub.id && (
                  <tr key={`${sub.id}-detail`} className="bg-gray-50">
                    <td colSpan={8} className="px-5 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">Code</p>
                          <pre className="text-xs bg-gray-900 text-green-400 rounded p-3 overflow-auto max-h-48 font-mono">
                            {sub.code}
                          </pre>
                        </div>
                        <div className="space-y-2">
                          {sub.stderr && (
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">Stderr</p>
                              <pre className="text-xs bg-red-50 text-red-700 rounded p-2 overflow-auto max-h-24 font-mono">
                                {sub.stderr}
                              </pre>
                            </div>
                          )}
                          {Array.isArray(sub.testResults) && sub.testResults.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">Test Results</p>
                              <div className="space-y-1">
                                {(sub.testResults as Array<{ input: string; expected: string; actual: string; status: string; executionTimeMs: number }>).map((t, i) => (
                                  <div key={i} className="text-xs flex items-center gap-2">
                                    <span className={t.status === 'accepted' ? 'text-green-600' : 'text-red-600'}>
                                      {t.status === 'accepted' ? '✓' : '✗'}
                                    </span>
                                    <span className="text-gray-500">#{i + 1}</span>
                                    <span className="text-gray-400">{t.executionTimeMs}ms</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="text-xs text-blue-600 disabled:text-gray-300"
          >
            Prev
          </button>
          <span className="text-xs text-gray-400">
            {page} / {data.totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(data.totalPages, page + 1))}
            disabled={page === data.totalPages}
            className="text-xs text-blue-600 disabled:text-gray-300"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function FeedbackStatusBadge({ status }: { status: string }) {
  const entry = FEEDBACK_STATUSES.find((s) => s.value === status);
  if (!entry) return <span className="inline-block text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">{status}</span>;
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${entry.color}`}>
      {entry.label}
    </span>
  );
}

function FeedbackSection() {
  const { feedbackList, feedbackStats, feedbackLoading, fetchFeedbackList, fetchFeedbackStats, resolveFeedback } = useAdminStore();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [resolving, setResolving] = useState<string | null>(null);

  useEffect(() => {
    fetchFeedbackStats();
  }, [fetchFeedbackStats]);

  useEffect(() => {
    fetchFeedbackList({ page, limit: 15, status: statusFilter || undefined });
  }, [page, statusFilter, fetchFeedbackList]);

  const handleResolve = async (id: string, status: string) => {
    setResolving(id);
    try {
      await resolveFeedback(id, { status, adminNote: adminNote || undefined });
      setExpandedId(null);
      setAdminNote('');
      await fetchFeedbackList({ page, limit: 15, status: statusFilter || undefined });
      await fetchFeedbackStats();
    } catch {
      // silent
    } finally {
      setResolving(null);
    }
  };

  const pendingCount = feedbackStats?.byStatus?.pending ?? 0;
  const todayCount = feedbackStats?.recentDaily?.length
    ? feedbackStats.recentDaily[feedbackStats.recentDaily.length - 1].count
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500">Total Feedback</p>
          <p className="text-xl font-bold text-gray-800">{feedbackStats?.total ?? '-'}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500">Pending</p>
          <p className="text-xl font-bold text-yellow-600">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500">Today</p>
          <p className="text-xl font-bold text-blue-600">{todayCount}</p>
        </div>
      </div>

      {feedbackStats?.topQuestions && feedbackStats.topQuestions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Top Reported Questions</h2>
          <div className="space-y-2">
            {feedbackStats.topQuestions.slice(0, 5).map((tq) => {
              const maxQ = feedbackStats.topQuestions![0].count;
              const pct = maxQ > 0 ? (tq.count / maxQ) * 100 : 0;
              return (
                <div key={tq.questionId} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-600 truncate">{tq.questionText}</p>
                    <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
                      <div
                        className="bg-blue-400 h-2 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-gray-500 shrink-0">{tq.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-700">Feedback List</h2>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600"
          >
            <option value="">All</option>
            {FEEDBACK_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          {feedbackList && (
            <span className="text-xs text-gray-400 ml-auto">
              {feedbackList.total} total
            </span>
          )}
        </div>

        {feedbackLoading && !feedbackList ? (
          <div className="text-center text-gray-400 py-10">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="text-left px-4 py-2 font-medium">ID</th>
                  <th className="text-left px-4 py-2 font-medium">题目预览</th>
                  <th className="text-left px-4 py-2 font-medium">反馈类型</th>
                  <th className="text-left px-4 py-2 font-medium">用户</th>
                  <th className="text-left px-4 py-2 font-medium">状态</th>
                  <th className="text-left px-4 py-2 font-medium">时间</th>
                  <th className="text-left px-4 py-2 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {feedbackList?.items.map((fb: QuestionFeedback) => (
                  <>
                    <tr
                      key={fb.id}
                      className="border-b border-gray-50 hover:bg-gray-50"
                    >
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{fb.id.slice(-6)}</td>
                      <td className="px-4 py-2.5 text-gray-600 max-w-[200px] truncate">
                        {fb.question?.questionText ?? fb.questionId.slice(-6)}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{fb.category}</td>
                      <td className="px-4 py-2.5 text-gray-600">{fb.user?.name ?? fb.userId.slice(-6)}</td>
                      <td className="px-4 py-2.5"><FeedbackStatusBadge status={fb.status} /></td>
                      <td className="px-4 py-2.5 text-gray-400 text-xs">
                        {new Date(fb.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => {
                            setExpandedId(expandedId === fb.id ? null : fb.id);
                            setAdminNote('');
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          查看
                        </button>
                      </td>
                    </tr>
                    {expandedId === fb.id && (
                      <tr key={`${fb.id}-detail`} className="bg-gray-50">
                        <td colSpan={7} className="px-5 py-4">
                          <div className="space-y-3">
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">题目内容</p>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{fb.question?.questionText ?? '-'}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">反馈类型</p>
                                <p className="text-sm text-gray-700">{fb.category}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">用户</p>
                                <p className="text-sm text-gray-700">{fb.user?.name ?? '-'} ({fb.user?.email ?? '-'})</p>
                              </div>
                            </div>
                            {fb.comment && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">评论</p>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{fb.comment}</p>
                              </div>
                            )}
                            {fb.status === 'pending' && (
                              <div className="border-t border-gray-200 pt-3 space-y-3">
                                <div>
                                  <p className="text-xs font-medium text-gray-500 mb-1">管理员备注</p>
                                  <textarea
                                    value={adminNote}
                                    onChange={(e) => setAdminNote(e.target.value)}
                                    placeholder="可选备注..."
                                    className="w-full text-sm border border-gray-200 rounded px-3 py-2 text-gray-700 resize-none"
                                    rows={2}
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleResolve(fb.id, 'fixed')}
                                    disabled={resolving === fb.id}
                                    className="text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 disabled:bg-gray-300 transition-colors"
                                  >
                                    已修复
                                  </button>
                                  <button
                                    onClick={() => handleResolve(fb.id, 'ignored')}
                                    disabled={resolving === fb.id}
                                    className="text-xs bg-gray-500 text-white px-3 py-1.5 rounded hover:bg-gray-600 disabled:bg-gray-300 transition-colors"
                                  >
                                    已忽略
                                  </button>
                                  <button
                                    onClick={() => handleResolve(fb.id, 'invalid')}
                                    disabled={resolving === fb.id}
                                    className="text-xs bg-red-500 text-white px-3 py-1.5 rounded hover:bg-red-600 disabled:bg-gray-300 transition-colors"
                                  >
                                    无效反馈
                                  </button>
                                </div>
                              </div>
                            )}
                            {fb.status !== 'pending' && fb.adminNote && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">管理员备注</p>
                                <p className="text-sm text-gray-600">{fb.adminNote}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {feedbackList && feedbackList.totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="text-xs text-blue-600 disabled:text-gray-300"
            >
              Prev
            </button>
            <span className="text-xs text-gray-400">
              {page} / {feedbackList.totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(feedbackList.totalPages, page + 1))}
              disabled={page === feedbackList.totalPages}
              className="text-xs text-blue-600 disabled:text-gray-300"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const TYPE_LABELS: Record<string, string> = { mc: '选择题', tf: '判断题', programming: '编程题' };

function UsersSection() {
  const [data, setData] = useState<AdminUsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    setLoading(true);
    adminUsersApi.getUsers({ page, limit: 15, search: search || undefined })
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, search]);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  if (loading && !data) return <div className="text-center text-gray-400 py-10">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500">总用户数</p>
          <p className="text-xl font-bold text-gray-800">{data?.total ?? '-'}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500">有游戏角色</p>
          <p className="text-xl font-bold text-green-600">{data?.users.filter(u => u.gameProfile).length ?? '-'}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-700">用户列表</h2>
          <div className="flex gap-2">
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="搜索用户名/邮箱"
              className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 w-40"
            />
            <button onClick={handleSearch} className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">搜索</button>
          </div>
          {data && <span className="text-xs text-gray-400 ml-auto">{data.total} total</span>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="text-left px-4 py-2 font-medium">用户名</th>
                <th className="text-left px-4 py-2 font-medium">邮箱</th>
                <th className="text-left px-4 py-2 font-medium">游戏角色</th>
                <th className="text-left px-4 py-2 font-medium">答题数</th>
                <th className="text-left px-4 py-2 font-medium">正确率</th>
                <th className="text-left px-4 py-2 font-medium">提交数</th>
                <th className="text-left px-4 py-2 font-medium">考试数</th>
                <th className="text-left px-4 py-2 font-medium">注册时间</th>
              </tr>
            </thead>
            <tbody>
              {data?.users.map((u) => (
                <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-700 font-medium">
                    <div className="flex items-center gap-2">
                      <span>{u.name}</span>
                      {u.gameProfile && <span className="text-base">{u.gameProfile.avatar}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{u.email}</td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {u.gameProfile ? (
                      <div className="text-xs">
                        <span className="font-medium">{u.gameProfile.nickname}</span>
                        <span className="text-gray-400 ml-1">Lv.{u.gameProfile.level} · {u.gameProfile.totalXP}XP</span>
                      </div>
                    ) : (
                      <span className="text-gray-300 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 text-xs">{u.answerStats.total}</td>
                  <td className="px-4 py-2.5">
                    {u.answerStats.total > 0 ? (
                      <span className={`text-xs font-medium ${u.answerStats.correct / u.answerStats.total >= 0.7 ? 'text-green-600' : u.answerStats.correct / u.answerStats.total >= 0.4 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {Math.round((u.answerStats.correct / u.answerStats.total) * 100)}%
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 text-xs">{u._count.codeSubmissions}</td>
                  <td className="px-4 py-2.5 text-gray-600 text-xs">{u._count.mockExams}</td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data && data.totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-center gap-2">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="text-xs text-blue-600 disabled:text-gray-300">Prev</button>
            <span className="text-xs text-gray-400">{page} / {data.totalPages}</span>
            <button onClick={() => setPage(Math.min(data.totalPages, page + 1))} disabled={page === data.totalPages} className="text-xs text-blue-600 disabled:text-gray-300">Next</button>
          </div>
        )}
      </div>
    </div>
  );
}

function QuestionsSection() {
  const [data, setData] = useState<AdminQuestionsResponse | null>(null);
  const [stats, setStats] = useState<QuestionDistribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [levelFilter, setLevelFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    adminQuestionsApi.getQuestionStats().then((res) => setStats(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    adminQuestionsApi.getQuestions({
      page,
      limit: 15,
      level: levelFilter ? Number(levelFilter) : undefined,
      type: typeFilter || undefined,
      search: search || undefined,
    })
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, levelFilter, typeFilter, search]);

  const handleSearch = () => { setSearch(searchInput); setPage(1); };

  if (loading && !data) return <div className="text-center text-gray-400 py-10">Loading...</div>;

  const levelStats: Record<number, Record<string, number>> = {};
  for (const d of stats?.distribution ?? []) {
    if (!levelStats[d.level]) levelStats[d.level] = {};
    levelStats[d.level][d.type] = d.count;
  }

  return (
    <div className="space-y-4">
      {stats && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">题库分布</h2>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
            {Array.from({ length: 8 }, (_, i) => i + 1).map((lv) => {
              const ls = levelStats[lv] ?? {};
              const total = Object.values(ls).reduce((a, b) => a + b, 0);
              return (
                <div key={lv} className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Level {lv}</p>
                  <p className="text-lg font-bold text-gray-800">{total}</p>
                  <div className="flex justify-center gap-1 mt-1">
                    <span className="text-[10px] text-blue-500">{ls.mc ?? 0}选</span>
                    <span className="text-[10px] text-green-500">{ls.tf ?? 0}判</span>
                    <span className="text-[10px] text-purple-500">{ls.programming ?? 0}编</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
            <span>总计: <strong className="text-gray-800">{stats.distribution.reduce((a, d) => a + d.count, 0)}</strong> 题</span>
            <span>待处理反馈: <strong className="text-yellow-600">{stats.pendingFeedback}</strong></span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-700">题目列表</h2>
          <select
            value={levelFilter}
            onChange={(e) => { setLevelFilter(e.target.value); setPage(1); }}
            className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600"
          >
            <option value="">所有等级</option>
            {Array.from({ length: 8 }, (_, i) => i + 1).map((lv) => (
              <option key={lv} value={lv}>Level {lv}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600"
          >
            <option value="">所有类型</option>
            <option value="mc">选择题</option>
            <option value="tf">判断题</option>
            <option value="programming">编程题</option>
          </select>
          <div className="flex gap-1">
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="搜索题目内容"
              className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 w-36"
            />
            <button onClick={handleSearch} className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">搜索</button>
          </div>
          {data && <span className="text-xs text-gray-400 ml-auto">{data.total} 题</span>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="text-left px-4 py-2 font-medium">等级</th>
                <th className="text-left px-4 py-2 font-medium">类型</th>
                <th className="text-left px-4 py-2 font-medium">序号</th>
                <th className="text-left px-4 py-2 font-medium">题目内容</th>
                <th className="text-left px-4 py-2 font-medium">答案</th>
                <th className="text-left px-4 py-2 font-medium">知识点</th>
                <th className="text-left px-4 py-2 font-medium">答题次数</th>
                <th className="text-left px-4 py-2 font-medium">反馈</th>
              </tr>
            </thead>
            <tbody>
              {data?.questions.map((q) => (
                <>
                  <tr
                    key={q.id}
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                  >
                    <td className="px-4 py-2.5">
                      <span className="inline-block text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">L{q.level}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block text-xs px-2 py-0.5 rounded ${q.type === 'mc' ? 'bg-blue-50 text-blue-600' : q.type === 'tf' ? 'bg-green-50 text-green-600' : 'bg-purple-50 text-purple-600'}`}>
                        {TYPE_LABELS[q.type] || q.type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">#{q.questionIndex}</td>
                    <td className="px-4 py-2.5 text-gray-700 max-w-[300px] truncate text-xs">{q.questionText.split('\n')[0]}</td>
                    <td className="px-4 py-2.5 text-gray-600 text-xs font-mono">{q.answer ?? '-'}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {q.topics.slice(0, 2).map((t) => (
                          <span key={t} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{t}</span>
                        ))}
                        {q.topics.length > 2 && <span className="text-[10px] text-gray-400">+{q.topics.length - 2}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{q._count.userAnswers}</td>
                    <td className="px-4 py-2.5">
                      {q._count.feedbacks > 0 && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">{q._count.feedbacks}</span>
                      )}
                    </td>
                  </tr>
                  {expandedId === q.id && (
                    <tr key={`${q.id}-detail`} className="bg-gray-50">
                      <td colSpan={8} className="px-5 py-4">
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">完整题目</p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{q.questionText}</p>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">答案</p>
                              <p className="text-sm text-gray-700 font-mono">{q.answer ?? '-'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">难度</p>
                              <p className="text-sm text-gray-700">{q.difficulty ?? '-'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">答题次数</p>
                              <p className="text-sm text-gray-700">{q._count.userAnswers}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">代码提交</p>
                              <p className="text-sm text-gray-700">{q._count.codeSubmissions}</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">知识点</p>
                            <div className="flex flex-wrap gap-1">
                              {q.topics.map((t) => (
                                <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{t}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {data && data.totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-center gap-2">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="text-xs text-blue-600 disabled:text-gray-300">Prev</button>
            <span className="text-xs text-gray-400">{page} / {data.totalPages}</span>
            <button onClick={() => setPage(Math.min(data.totalPages, page + 1))} disabled={page === data.totalPages} className="text-xs text-blue-600 disabled:text-gray-300">Next</button>
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminDashboard() {
  const { adminKey, setAdminKey, clearAdminKey, fetchQueueStats, fetchHealth, fetchStats } =
    useAdminStore();
  const [keyInput, setKeyInput] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'feedback' | 'users' | 'questions'>('overview');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!adminKey) return;

    fetchQueueStats();
    fetchHealth();
    fetchStats();

    const socketUrl =
      window.location.hostname === 'localhost'
        ? 'http://localhost:3000'
        : `${window.location.protocol}//${window.location.host}`;
    const socket = io(socketUrl);
    socketRef.current = socket;

    socket.on('admin:queue:update', (counts) => {
      useAdminStore.getState().setQueueStats(counts);
    });

    socket.on('admin:submission:update', () => {
      fetchQueueStats();
      fetchStats();
    });

    const healthInterval = setInterval(fetchHealth, 30000);

    return () => {
      socket.disconnect();
      socketRef.current = null;
      clearInterval(healthInterval);
    };
  }, [adminKey]);

  if (!adminKey) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-16">
        <div className="bg-white rounded-xl border border-gray-200 p-8 w-full max-w-sm">
          <h1 className="text-lg font-bold text-gray-800 mb-4 text-center">Admin Dashboard</h1>
          <input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="Admin API Key"
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm mb-3"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && keyInput) setAdminKey(keyInput);
            }}
          />
          <button
            onClick={() => keyInput && setAdminKey(keyInput)}
            disabled={!keyInput}
            className="w-full bg-blue-600 text-white py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
          >
            Enter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Admin</h1>
        <button
          onClick={clearAdminKey}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          Logout
        </button>
      </div>

      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'overview' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          📊 Overview
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'users' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          👥 用户管理
        </button>
        <button
          onClick={() => setActiveTab('questions')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'questions' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          📚 题库管理
        </button>
        <button
          onClick={() => setActiveTab('feedback')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'feedback' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          📝 题目反馈
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <QueueCard />
            <HealthCard />
          </div>

          <StatsCard />

          <SubmissionsTable />
        </>
      )}

      {activeTab === 'users' && <UsersSection />}
      {activeTab === 'questions' && <QuestionsSection />}
      {activeTab === 'feedback' && <FeedbackSection />}
    </div>
  );
}
