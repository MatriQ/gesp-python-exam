import client from './client';
import type { QuestionFeedback } from '../../../shared/src/types';

export interface SubmitFeedbackData {
  questionId: string;
  category: string;
  comment?: string;
}

export const submitFeedback = async (data: SubmitFeedbackData) => {
  const res = await client.post<{ feedback: QuestionFeedback }>('/feedback', data);
  return res.data;
};
