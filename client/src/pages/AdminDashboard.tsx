import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAdminStore } from '../stores/adminStore';
import { adminApi, type SubmissionsResponse } from '../api/admin';

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

export function AdminDashboard() {
  const { adminKey, setAdminKey, clearAdminKey, fetchQueueStats, fetchHealth, fetchStats } =
    useAdminStore();
  const [keyInput, setKeyInput] = useState('');
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <QueueCard />
        <HealthCard />
      </div>

      <StatsCard />

      <SubmissionsTable />
    </div>
  );
}
