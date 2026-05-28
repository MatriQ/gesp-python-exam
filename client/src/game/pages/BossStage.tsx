import { useState, useEffect, useRef } from 'react';
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

export function BossStage() {
  const { stageId } = useParams();
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [phase, setPhase] = useState<'intro' | 'playing' | 'result'>('intro');
  const [countdown, setCountdown] = useState(3);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(180);
  const [result, setResult] = useState<{ stars: number; xpEarned: number } | null>(null);

  // Intro countdown
  useEffect(() => {
    if (phase !== 'intro') return;
    if (countdown <= 0) {
      setPhase('playing');
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // Game timer
  useEffect(() => {
    if (phase !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeUp();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  // Load questions on playing phase
  useEffect(() => {
    if (phase === 'playing') loadQuestions();
  }, [phase]);

  const loadQuestions = async () => {
    try {
      const res = await getStagesByLevel(1);
      const stages = res.data?.stages ?? res.data ?? [];
      const stage = stages.find((s: any) => s.id === stageId);
      if (stage?.questions?.length) {
        setQuestions(stage.questions);
        setTimeLeft(stage.timeLimit ?? 180);
      }
    } catch { /* empty */ }
  };

  const handleTimeUp = () => {
    handleComplete();
  };

  const handleSelect = (answer: string) => {
    if (revealed || !questions[current]) return;
    setSelected(answer);
    setRevealed(true);

    const isCorrect = answer === questions[current].answer;
    if (isCorrect) {
      setCorrectCount((c) => c + 1);
      setCombo((c) => c + 1);
    } else {
      setCombo(0);
      setTimeLeft((t) => Math.max(0, t - 5)); // Wrong answer penalty
    }

    setTimeout(() => {
      if (current >= questions.length - 1) {
        handleComplete(isCorrect ? correctCount + 1 : correctCount);
      } else {
        setCurrent((c) => c + 1);
        setSelected(null);
        setRevealed(false);
      }
    }, 1000);
  };

  const handleComplete = async (final?: number) => {
    const cc = final ?? correctCount;
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      const res = await completeStage(stageId!, {
        correctCount: cc, totalCount: questions.length || 1,
        timeSpentMs: 0, answers: [],
      });
      setResult({ stars: res.data?.stars ?? 0, xpEarned: res.data?.xpEarned ?? 0 });
    } catch {
      const acc = cc / (questions.length || 1);
      setResult({ stars: acc >= 1 ? 3 : acc >= 0.8 ? 2 : acc >= 0.6 ? 1 : 0, xpEarned: cc * 20 });
    }
    setPhase('result');
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // Intro phase
  if (phase === 'intro') {
    return (
      <div className="animate-bounceIn" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '60vh', gap: 16,
      }}>
        <span style={{ fontSize: 64 }}>👹</span>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#FF6B6B' }}>Boss 挑战！</h1>
        <span style={{ fontSize: 72, fontWeight: 700, color: '#FF6B6B' }}>{countdown > 0 ? countdown : 'GO!'}</span>
      </div>
    );
  }

  // Result phase
  if (phase === 'result' && result) {
    return (
      <StageResult
        stars={result.stars}
        correctCount={correctCount}
        totalCount={questions.length}
        xpEarned={result.xpEarned}
        onNext={() => navigate('/game/map')}
        onRetry={() => {
          setPhase('intro'); setCountdown(3); setCurrent(0);
          setSelected(null); setRevealed(false); setCorrectCount(0);
          setCombo(0); setTimeLeft(180); setResult(null);
        }}
      />
    );
  }

  // Playing phase
  const question = questions[current];

  if (!question) {
    return (
      <div className="game-card" style={{ textAlign: 'center', padding: 40, margin: 16 }}>
        <p style={{ fontSize: 32 }}>👹</p>
        <p>暂无题目数据</p>
        <button className="game-btn" style={{ marginTop: 16 }} onClick={() => navigate('/game/map')}>
          返回地图 🗺️
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn" style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>
      {/* Boss HUD */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 12, padding: '8px 12px', borderRadius: 12,
        background: timeLeft < 10 ? '#fef2f2' : 'white',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <span style={{ fontWeight: 700, color: '#FF6B6B' }}>
          👹 {current + 1}/{questions.length}
        </span>
        <span style={{
          fontSize: 20, fontWeight: 700,
          color: timeLeft < 10 ? '#ef4444' : '#FF6B6B',
          animation: timeLeft < 10 ? 'pulse 0.5s infinite' : 'none',
        }}>
          ⏱ {formatTime(timeLeft)}
        </span>
        {combo >= 3 && <span style={{ color: '#FF9A3C' }}>🔥 {combo}x</span>}
      </div>

      {/* Progress bar */}
      <div className="game-progress-bar" style={{ marginBottom: 16 }}>
        <div className="game-progress-bar-fill" style={{
          width: `${((current + 1) / questions.length) * 100}%`,
          background: 'linear-gradient(90deg, #FF6B6B, #F38181)',
        }} />
      </div>

      {/* Question */}
      <div className="game-card" style={{ marginBottom: 16, borderLeft: '4px solid #FF6B6B' }}>
        <p style={{ fontSize: 16, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {question.questionText}
        </p>
      </div>

      {/* Answers */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {question.type === 'tf' ? (
          <>
            <AnswerCard label="✅" text="正确" selected={selected === 'T'} correct={revealed ? selected === 'T' && question.answer === 'T' : null} disabled={revealed} onClick={() => handleSelect('T')} />
            <AnswerCard label="❌" text="错误" selected={selected === 'F'} correct={revealed ? selected === 'F' && question.answer === 'F' : null} disabled={revealed} onClick={() => handleSelect('F')} />
          </>
        ) : (
          question.options?.map((opt, i) => (
            <AnswerCard
              key={i} label={opt.label} text={opt.text}
              selected={selected === opt.label}
              correct={revealed ? opt.label === question.answer : null}
              disabled={revealed}
              onClick={() => handleSelect(opt.label)}
            />
          ))
        )}
      </div>
    </div>
  );
}
