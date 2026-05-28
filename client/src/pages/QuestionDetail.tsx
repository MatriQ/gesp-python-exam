import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';

interface Option {
  label: string;
  text: string;
}

interface Question {
  id: string;
  questionIndex: number;
  type: 'single_choice' | 'mc' | 'true_false' | 'tf' | 'programming';
  questionText: string;
  options?: Option[];
  answer: string;
  explanation: string;
  level: number;
  session: string;
  topics: string[];
}

export function QuestionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError('');
    client
      .get<{ question: Question }>(`/questions/${id}`)
      .then((res) => setQuestion(res.data.question || res.data))
      .catch((err) => setError(err.response?.data?.message || '加载失败'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center text-gray-400 py-20">加载中...</div>;
  if (error) return <div className="text-center text-red-500 py-20">{error}</div>;
  if (!question) return null;

  const typeLabel: Record<string, string> = {
    mc: '单选题',
    tf: '判断题',
    single_choice: '单选题',
    true_false: '判断题',
    programming: '编程题',
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-gray-400 hover:text-gray-600 mb-4 inline-flex items-center gap-1"
      >
        ← 返回
      </button>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs text-gray-400 font-mono">#{question.questionIndex}</span>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
            {typeLabel[question.type] || question.type}
          </span>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
            Level {question.level}
          </span>
        </div>

        <div className="text-gray-800 leading-relaxed whitespace-pre-wrap mb-6">
          {question.questionText}
        </div>

        {question.options && (
          <div className="space-y-2 mb-6">
            {question.options.map((opt) => {
              const isCorrect = opt.label === question.answer;
              return (
                <div
                  key={opt.label}
                  className={`p-3 rounded-lg border ${
                    isCorrect
                      ? 'border-green-400 bg-green-50'
                      : 'border-gray-200'
                  }`}
                >
                  <span className="font-medium mr-2">{opt.label}.</span>
                  {opt.text}
                  {isCorrect && (
                    <span className="ml-2 text-green-600 text-sm font-medium">✓ 正确答案</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {(question.type === 'true_false' || question.type === 'tf') && (
          <div className="flex gap-4 mb-6">
            {[
              { label: '正确', val: 'true' },
              { label: '错误', val: 'false' },
            ].map(({ label, val }) => (
              <div
                key={val}
                className={`flex-1 py-3 rounded-lg border text-center text-lg font-medium ${
                  val === question.answer
                    ? 'border-green-400 bg-green-50 text-green-700'
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                {label}
                {val === question.answer && (
                  <span className="ml-2 text-sm">✓</span>
                )}
              </div>
            ))}
          </div>
        )}

        {question.explanation && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-yellow-800 mb-1">解析</h3>
            <p className="text-sm text-yellow-700 whitespace-pre-wrap">{question.explanation}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          {(question.topics || []).map((tag) => (
            <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
              {tag}
            </span>
          ))}
        </div>

        {question.session && (
          <p className="text-xs text-gray-400">来源：{question.session}</p>
        )}
      </div>

      <div className="mt-6">
        <button
          onClick={() => navigate('/practice')}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          再练一次
        </button>
      </div>
    </div>
  );
}
