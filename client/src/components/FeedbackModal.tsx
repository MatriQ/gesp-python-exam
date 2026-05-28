import { useState } from 'react';
import { FEEDBACK_CATEGORIES } from '../../../shared/src/constants';
import { submitFeedback } from '../api/feedback';

interface FeedbackModalProps {
  questionId: string;
  onClose: () => void;
  onSubmitted?: () => void;
}

export function FeedbackModal({ questionId, onClose, onSubmitted }: FeedbackModalProps) {
  const [category, setCategory] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [alreadyReported, setAlreadyReported] = useState(false);

  const handleSubmit = async () => {
    if (!category) return;
    setSubmitting(true);
    setError('');
    try {
      await submitFeedback({ questionId, category, comment: comment || undefined });
      setSuccess(true);
      setTimeout(() => {
        onSubmitted?.();
        onClose();
      }, 1000);
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setAlreadyReported(true);
      } else {
        setError(err?.response?.data?.error || '提交失败，请稍后重试');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (alreadyReported) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
          <h3 className="text-lg font-semibold mb-3">📝 题目反馈</h3>
          <p className="text-gray-600">您已反馈过此题目，感谢您的参与！</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200">
            关闭
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 text-center" onClick={e => e.stopPropagation()}>
          <div className="text-4xl mb-2">✅</div>
          <p className="text-green-600 font-medium">感谢您的反馈！</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4">📝 反馈题目问题</h3>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">请选择问题类型：</p>
          <div className="flex flex-wrap gap-2">
            {FEEDBACK_CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  category === cat.value
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="请详细描述问题（可选）"
            className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
            rows={3}
          />
        </div>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
            disabled={submitting}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!category || submitting}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? '提交中...' : '提交反馈'}
          </button>
        </div>
      </div>
    </div>
  );
}
