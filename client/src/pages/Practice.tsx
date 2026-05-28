import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import { useAppStore } from '../stores/appStore';

interface Option {
  label: string;
  text: string;
}

interface Question {
  id: string;
  type: 'single_choice' | 'mc' | 'true_false' | 'tf' | 'programming';
  questionText: string;
  options?: Option[];
  level: number;
  topics: string[];
}

interface AnswerResult {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
}

export function Practice() {
  const { selectedLevel } = useAppStore();
  const [question, setQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<string>('');
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [count, setCount] = useState(1);

  const loadQuestion = useCallback(() => {
    setLoading(true);
    setError('');
    setSelected('');
    setResult(null);
    client
      .get<{ question: Question }>('/questions/random', { params: { level: selectedLevel } })
      .then((res) => {
        const q = res.data.question || res.data;
        setQuestion(q as Question);
      })
      .catch((err) => setError(err.response?.data?.message || '加载失败'))
      .finally(() => setLoading(false));
  }, [selectedLevel]);

  useEffect(() => {
    loadQuestion();
  }, [loadQuestion]);

      const handleSubmit = () => {
    if (!question || !selected) return;
    client
      .post<AnswerResult>('/progress/answers', {
        questionId: question.id,
        userAnswer: selected,
        timeSpentMs: 0,
      })
      .then((res) => setResult(res.data))
      .catch((err) => setError(err.response?.data?.message || '提交失败'));
  };

  const handleNext = () => {
    setCount((c) => c + 1);
    loadQuestion();
  };

  if (loading) return <div className="text-center text-gray-400 py-20">加载中...</div>;
  if (error && !question) return <div className="text-center text-red-500 py-20">{error}</div>;
  if (!question) return null;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="text-sm text-gray-400 mb-4">第 {count} 题</div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-gray-800 leading-relaxed whitespace-pre-wrap mb-6">
          {question.questionText}
        </p>

        {(question.type === 'single_choice' || question.type === 'mc') && question.options && (
          <div className="space-y-3">
            {question.options.map((opt) => {
              const isSelected = selected === opt.label;
              const isCorrect = result && opt.label === result.correctAnswer;
              const isWrong = result && isSelected && !result.isCorrect;
              let cls = 'border-gray-200 hover:border-blue-300';
              if (isCorrect) cls = 'border-green-400 bg-green-50';
              if (isWrong) cls = 'border-red-400 bg-red-50';
              if (isSelected && !result) cls = 'border-blue-500 bg-blue-50';

              return (
                <button
                  key={opt.label}
                  onClick={() => !result && setSelected(opt.label)}
                  disabled={!!result}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${cls}`}
                >
                  <span className="font-medium mr-2">{opt.label}.</span>
                  {opt.text}
                </button>
              );
            })}
          </div>
        )}

        {(question.type === 'true_false' || question.type === 'tf') && (
          <div className="flex gap-4">
            {['正确', '错误'].map((label) => {
              const val = label === '正确' ? 'true' : 'false';
              const isSelected = selected === val;
              const isCorrect = result && val === result.correctAnswer;
              const isWrong = result && isSelected && !result.isCorrect;
              let cls = 'border-gray-200 hover:border-blue-300';
              if (isCorrect) cls = 'border-green-400 bg-green-50';
              if (isWrong) cls = 'border-red-400 bg-red-50';
              if (isSelected && !result) cls = 'border-blue-500 bg-blue-50';

              return (
                <button
                  key={val}
                  onClick={() => !result && setSelected(val)}
                  disabled={!!result}
                  className={`flex-1 py-3 rounded-lg border text-lg font-medium transition-colors ${cls}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {question.type === 'programming' && (
          <div className="space-y-4">
            <p className="text-gray-500 text-sm">这是一道编程题，请在编程环境中作答。</p>
            <Link
              to={`/code/${question.id}`}
              className="inline-block bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              前往编程
            </Link>
          </div>
        )}
      </div>

      {result && (
        <div
          className={`mt-4 p-4 rounded-lg ${
            result.isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}
        >
          <p className={`font-medium mb-1 ${result.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
            {result.isCorrect ? '✓ 回答正确！' : '✗ 回答错误'}
          </p>
          {!result.isCorrect && (
            <p className="text-sm text-gray-600 mb-1">正确答案：{result.correctAnswer}</p>
          )}
          {result.explanation && (
            <p className="text-sm text-gray-600">{result.explanation}</p>
          )}
        </div>
      )}

      <div className="mt-6 flex gap-4">
        {!result && question.type !== 'programming' && (
          <button
            onClick={handleSubmit}
            disabled={!selected}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40"
          >
            提交
          </button>
        )}
        {result && (
          <button
            onClick={handleNext}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            下一题
          </button>
        )}
      </div>
    </div>
  );
}
