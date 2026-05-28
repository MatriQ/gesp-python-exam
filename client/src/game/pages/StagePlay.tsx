import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStagesByLevel, completeStage } from '../api/gameApi';
import { AnswerCard } from '../components/AnswerCard';
import { StageResult } from '../components/StageResult';

interface QuestionData {
  id: string;
  questionText: string;
  type: string;
  options: { label: string; text: string }[] | null;
  answer: string | null;
}

export function StagePlay() {
  const { stageId } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [combo, setCombo] = useState(0);
  const [result, setResult] = useState<{ stars: number; xpEarned: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadQuestions(); }, [stageId]);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      // Fetch from API - stages come with questions
      const res = await getStagesByLevel(1); // fallback
      const stages = res.data?.stages ?? res.data ?? [];
      const stage = stages.find((s: any) => s.id === stageId);
      if (stage?.questions?.length) {
        setQuestions(stage.questions);
      }
    } catch { /* empty */ }
    finally { setLoading(false); }
  };

  const question = questions[current];
  const isLast = current >= questions.length - 1;

  const handleComplete = async (finalCorrect: number) => {
    try {
      const res = await completeStage(stageId!, {
        correctCount: finalCorrect,
        totalCount: questions.length,
        timeSpentMs: 0,
        answers: [],
      });
      setResult({
        stars: res.data?.stars ?? 0,
        xpEarned: res.data?.xpEarned ?? 0,
      });
    } catch {
      // Still show result with calculated values
      const accuracy = finalCorrect / questions.length;
      const stars = accuracy >= 1 ? 3 : accuracy >= 0.8 ? 2 : accuracy >= 0.6 ? 1 : 0;
      setResult({ stars, xpEarned: finalCorrect * 10 });
    }
  };

  const handleSelect = useCallback((answer: string) => {
    if (revealed) return;
    setSelected(answer);
    setRevealed(true);

    const isCorrect = answer === question?.answer;
    if (isCorrect) {
      setCorrectCount((c) => c + 1);
      setCombo((c) => c + 1);
    } else {
      setCombo(0);
    }

    setTimeout(() => {
      if (isLast) {
        handleComplete(isCorrect ? correctCount + 1 : correctCount);
      } else {
        setCurrent((c) => c + 1);
        setSelected(null);
        setRevealed(false);
      }
    }, 1200);
  }, [revealed, question, isLast, correctCount]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>加载中... ⏳</div>;
  }

  if (!question) {
    return (
      <div className="game-card" style={{ textAlign: 'center', padding: 40, margin: 16 }}>
        <p style={{ fontSize: 32 }}>📝</p>
        <p>暂无题目数据</p>
        <button className="game-btn" style={{ marginTop: 16 }} onClick={() => navigate('/game/map')}>
          返回地图 🗺️
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn" style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>
      {/* HUD */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 16, padding: '8px 12px', borderRadius: 12,
        background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <span style={{ fontWeight: 700, color: '#FF6B6B' }}>
          {current + 1}/{questions.length}
        </span>
        {combo >= 3 && <span style={{ color: '#FF9A3C' }}>🔥 {combo} 连对!</span>}
      </div>

      {/* Progress bar */}
      <div className="game-progress-bar" style={{ marginBottom: 20 }}>
        <div className="game-progress-bar-fill" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
      </div>

      {/* Question */}
      <div className="game-card" style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 16, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {question.questionText}
        </p>
      </div>

      {/* Answers */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {question.type === 'tf' ? (
          <>
            <AnswerCard label="✅" text="正确" selected={selected === 'T'} correct={revealed ? selected === 'T' && question.answer === 'T' : null} disabled={revealed} onClick={() => handleSelect('T')} />
            <AnswerCard label="❌" text="错误" selected={selected === 'F'} correct={revealed ? selected === 'F' && question.answer === 'F' : null} disabled={revealed} onClick={() => handleSelect('F')} />
          </>
        ) : (
          question.options?.map((opt, i) => (
            <AnswerCard
              key={i}
              label={opt.label}
              text={opt.text}
              selected={selected === opt.label}
              correct={revealed ? opt.label === question.answer : null}
              disabled={revealed}
              onClick={() => handleSelect(opt.label)}
            />
          ))
        )}
      </div>

      {/* Feedback */}
      {revealed && (
        <div className="animate-fadeIn" style={{
          marginTop: 16, padding: 12, borderRadius: 12, textAlign: 'center',
          background: selected === question.answer ? '#dcfce7' : '#fef2f2',
        }}>
          {selected === question.answer ? '✨ 太棒了！' : `💪 正确答案是 ${question.answer}`}
        </div>
      )}

      {/* Result popup */}
      {result && (
        <StageResult
          stars={result.stars}
          correctCount={correctCount}
          totalCount={questions.length}
          xpEarned={result.xpEarned}
          onNext={() => navigate('/game/map')}
          onRetry={() => { setCurrent(0); setSelected(null); setRevealed(false); setCorrectCount(0); setCombo(0); setResult(null); }}
        />
      )}
    </div>
  );
}
