import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { io, Socket } from 'socket.io-client';
import client from '../api/client';

interface TestCase {
  input: string;
  expected: string;
}

interface TestResult {
  input: string;
  expected: string;
  actual: string;
  status: string;
  executionTimeMs: number;
}

interface JudgeResult {
  submissionId: string;
  status: 'accepted' | 'wrong_answer' | 'time_limit_exceeded' | 'memory_limit_exceeded' | 'runtime_error' | 'compilation_error';
  testResults: TestResult[];
  totalExecutionTimeMs: number;
  memoryUsedBytes: number;
}

interface Question {
  id: string;
  questionIndex: number;
  type: string;
  questionText: string;
  level: number;
  session: string;
  topics: string[];
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string;
  sampleInput?: string;
  sampleOutput?: string;
  templateCode?: string;
  testCases?: TestCase[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  accepted: { label: 'AC', color: 'text-green-700', bg: 'bg-green-100' },
  wrong_answer: { label: 'WA', color: 'text-red-700', bg: 'bg-red-100' },
  time_limit_exceeded: { label: 'TLE', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  runtime_error: { label: 'RE', color: 'text-orange-700', bg: 'bg-orange-100' },
  compilation_error: { label: 'CE', color: 'text-orange-700', bg: 'bg-orange-100' },
  memory_limit_exceeded: { label: 'MLE', color: 'text-purple-700', bg: 'bg-purple-100' },
  pending: { label: 'Pending', color: 'text-gray-700', bg: 'bg-gray-100' },
};

export function CodeEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);

  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [result, setResult] = useState<JudgeResult | null>(null);
  const [resultStatus, setResultStatus] = useState<string>('idle');
  const [activeTab, setActiveTab] = useState<'problem' | 'editor'>('problem');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError('');
    client
      .get<{ question: Question }>(`/questions/${id}`)
      .then((res) => {
        const q = res.data.question;
        setQuestion(q);
        setCode(q.templateCode || '# Write your solution here\n');
      })
      .catch((err) => setError(err.response?.data?.error || '加载失败'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const socketUrl = window.location.hostname === 'localhost'
      ? 'http://localhost:3000'
      : `${window.location.protocol}//${window.location.host}`;
    socketRef.current = io(socketUrl);

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!submissionId || !socketRef.current) return;

    socketRef.current.emit('subscribe:submission', submissionId);

    const handler = (update: JudgeResult) => {
      setResult(update);
      setResultStatus(update.status);
      setSubmitting(false);
    };

    socketRef.current.on('submission:update', handler);

    return () => {
      socketRef.current?.off('submission:update', handler);
    };
  }, [submissionId]);

  const handleSubmit = useCallback(async () => {
    if (!id || submitting) return;
    setSubmitting(true);
    setResult(null);
    setResultStatus('pending');

    try {
      const res = await client.post<{ submissionId: string; status: string }>('/submissions', {
        questionId: id,
        code,
        language: 'python',
      });
      setSubmissionId(res.data.submissionId);
    } catch (err: any) {
      setError(err.response?.data?.error || '提交失败');
      setSubmitting(false);
      setResultStatus('idle');
    }
  }, [id, code, submitting]);

  const handleReset = useCallback(() => {
    if (question?.templateCode) {
      setCode(question.templateCode);
    } else {
      setCode('# Write your solution here\n');
    }
    setResult(null);
    setResultStatus('idle');
    setSubmissionId(null);
  }, [question]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-gray-400 text-sm">加载中...</div>
      </div>
    );
  }

  if (error && !question) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-4">
        <div className="text-red-500">{error}</div>
        <button onClick={() => navigate(-1)} className="text-sm text-blue-600 hover:underline">
          返回
        </button>
      </div>
    );
  }

  if (!question) return null;

  const statusCfg = STATUS_CONFIG[resultStatus] || STATUS_CONFIG.pending;

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] overflow-hidden">
      {/* Mobile/iPad tab bar */}
      <div className="md:hidden flex border-b border-gray-200 bg-white shrink-0">
        <button
          onClick={() => setActiveTab('problem')}
          className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${
            activeTab === 'problem'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          题目描述
        </button>
        <button
          onClick={() => setActiveTab('editor')}
          className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${
            activeTab === 'editor'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          代码编辑
        </button>
      </div>

      {/* Left panel: Problem description */}
      <div className={`md:block ${activeTab === 'problem' ? 'block' : 'hidden'} md:w-[40%] md:min-w-[320px] border-r border-gray-200 bg-white overflow-y-auto flex-1 md:flex-initial`}>
        <div className="p-5">
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="text-xs text-gray-400 hover:text-gray-600 mb-3 inline-flex items-center gap-1"
          >
            ← 返回
          </button>

          {/* Title + badges */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <h1 className="text-lg font-semibold text-gray-900">
              #{question.questionIndex}
            </h1>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              编程题
            </span>
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
              Level {question.level}
            </span>
          </div>

          {/* Topic tags */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {(question.topics || []).map((tag) => (
              <span key={tag} className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded">
                {tag}
              </span>
            ))}
          </div>

          {/* Question text */}
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-6">
            {question.questionText}
          </div>

          {/* Constraints */}
          {question.constraints && (
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">约束条件</h3>
              <div className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                {question.constraints}
              </div>
            </div>
          )}

          {/* Input format */}
          {question.inputFormat && (
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">输入格式</h3>
              <div className="text-sm text-gray-600 whitespace-pre-wrap">
                {question.inputFormat}
              </div>
            </div>
          )}

          {/* Output format */}
          {question.outputFormat && (
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">输出格式</h3>
              <div className="text-sm text-gray-600 whitespace-pre-wrap">
                {question.outputFormat}
              </div>
            </div>
          )}

          {/* Sample input */}
          {question.sampleInput && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">样例输入</h3>
              <pre className="text-sm bg-gray-900 text-green-400 rounded-lg p-3 font-mono overflow-x-auto">
                {question.sampleInput}
              </pre>
            </div>
          )}

          {/* Sample output */}
          {question.sampleOutput && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">样例输出</h3>
              <pre className="text-sm bg-gray-900 text-green-400 rounded-lg p-3 font-mono overflow-x-auto">
                {question.sampleOutput}
              </pre>
            </div>
          )}

          {/* Source */}
          {question.session && (
            <p className="text-xs text-gray-400 mt-6">来源：{question.session}</p>
          )}
        </div>
      </div>

      {/* Right panel: Editor + Results */}
      <div className={`md:flex flex-col bg-[#1e1e1e] min-w-0 flex-1 ${activeTab === 'editor' ? 'flex' : 'hidden md:flex'}`}>
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-[#3e3e3e]">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:opacity-60 text-white text-sm rounded font-medium transition-colors"
            >
              {submitting ? '判题中...' : '提交'}
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-60 text-white text-sm rounded font-medium transition-colors"
            >
              运行
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 bg-[#3e3e3e] hover:bg-[#4e4e4e] text-gray-300 text-sm rounded transition-colors"
            >
              重置
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Status badge */}
            {resultStatus !== 'idle' && (
              <span className={`text-xs font-bold px-2.5 py-1 rounded ${statusCfg.bg} ${statusCfg.color}`}>
                {statusCfg.label}
              </span>
            )}
            <span className="text-xs text-gray-400 font-mono">Python</span>
          </div>
        </div>

        {/* Monaco Editor */}
        <div className="flex-1 min-h-0">
          <Editor
            height="100%"
            language="python"
            theme="vs-dark"
            value={code}
            onChange={(val) => setCode(val || '')}
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 12 },
              tabSize: 4,
              wordWrap: 'on',
            }}
          />
        </div>

        {/* Bottom: Test Results */}
        {result && (
          <div className="border-t border-[#3e3e3e] bg-[#1e1e1e] max-h-[40%] overflow-y-auto">
            <div className="px-4 py-2 flex items-center justify-between border-b border-[#3e3e3e]">
              <span className="text-sm font-medium text-gray-300">测试结果</span>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>耗时: {result.totalExecutionTimeMs}ms</span>
                <span>内存: {(result.memoryUsedBytes / 1024).toFixed(0)}KB</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 text-xs border-b border-[#3e3e3e]">
                    <th className="text-left px-4 py-2 font-medium">#</th>
                    <th className="text-left px-4 py-2 font-medium">状态</th>
                    <th className="text-left px-4 py-2 font-medium">输入</th>
                    <th className="text-left px-4 py-2 font-medium">期望输出</th>
                    <th className="text-left px-4 py-2 font-medium">实际输出</th>
                    <th className="text-left px-4 py-2 font-medium">用时</th>
                  </tr>
                </thead>
                <tbody>
                  {result.testResults.map((tc, i) => {
                    const pass = tc.status === 'accepted' || tc.actual?.trim() === tc.expected?.trim();
                    return (
                      <tr key={i} className="border-b border-[#2d2d2d] text-gray-300">
                        <td className="px-4 py-2 text-gray-500 font-mono">{i + 1}</td>
                        <td className="px-4 py-2">
                          <span className={pass ? 'text-green-400' : 'text-red-400'}>
                            {pass ? '✅' : '❌'}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <code className="text-xs font-mono text-gray-400 line-clamp-2">
                            {tc.input.length > 80 ? tc.input.slice(0, 80) + '...' : tc.input}
                          </code>
                        </td>
                        <td className="px-4 py-2">
                          <code className="text-xs font-mono text-gray-400 line-clamp-2">
                            {tc.expected.length > 80 ? tc.expected.slice(0, 80) + '...' : tc.expected}
                          </code>
                        </td>
                        <td className="px-4 py-2">
                          <code className={`text-xs font-mono line-clamp-2 ${pass ? 'text-green-400' : 'text-red-400'}`}>
                            {tc.actual.length > 80 ? tc.actual.slice(0, 80) + '...' : tc.actual}
                          </code>
                        </td>
                        <td className="px-4 py-2 text-gray-500 font-mono text-xs">
                          {tc.executionTimeMs}ms
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
