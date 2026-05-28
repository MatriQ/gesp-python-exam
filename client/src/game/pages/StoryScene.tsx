import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameStoryStore } from '../stores/gameStoryStore';
import * as gameApi from '../api/gameApi';
import { playSound } from '../utils/sounds';

const SCENE_NARRATIVES = [
  '🤖 小机器人来到了一片神秘的代码森林，前方有一扇密码门...',
  '🐉 一条 Python 巨龙挡住了去路！"回答我的问题才能通过！"',
  '🏰 小机器人发现了一座古老的编程城堡，需要解开谜题才能进入...',
  '🗝️ 在城堡深处，小机器人找到了一把钥匙，但需要用 Python 知识来激活它...',
  '🏆 最后的挑战！小机器人面对终极编程难题，准备展示所学！',
];

const CORRECT_FEEDBACK = [
  '🤖 太好了！门打开了！',
  '🤖 巨龙满意地点了点头！',
  '🤖 城堡的大门缓缓打开！',
  '🤖 钥匙发出了耀眼的光芒！',
  '🤖 小机器人成功了！真了不起！',
];

const WRONG_FEEDBACK = '🤖 没关系，再想想看？让我给你一些提示...';

interface Question {
  id: string;
  content: string;
  options?: string[];
  correctAnswer: string;
  type: string;
}

export function StoryScene() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const navigate = useNavigate();
  const { setCurrentChapter, setCurrentScene } = useGameStoryStore();

  const [currentScene, setCurrentSceneState] = useState(0);
  const [totalScenes] = useState(5);
  const [showNarrative, setShowNarrative] = useState(true);
  const [showQuestion, setShowQuestion] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [chapterComplete, setChapterComplete] = useState(false);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chapterId) return;
    setLoading(true);
    gameApi.getStoryQuestions(chapterId)
      .then((res) => {
        const mapped = (res.data.questions || []).map((q: any) => ({
          id: q.id,
          content: q.questionText,
          options: q.options,
          correctAnswer: q.correctAnswer,
          type: q.type,
        }));
        setQuestions(mapped);
      })
      .catch(() => setQuestions([]))
      .finally(() => setLoading(false));
  }, [chapterId]);

  useEffect(() => {
    if (chapterId) {
      setCurrentChapter(chapterId);
    }
  }, [chapterId, setCurrentChapter]);

  const handleAnswer = useCallback((answer: string) => {
    if (selectedAnswer) return;
    setSelectedAnswer(answer);
    const question = questions[currentScene];
    const correct = answer === question.correctAnswer;
    setIsCorrect(correct);
    setShowFeedback(true);
    setTotalCount((prev) => prev + 1);
    if (correct) {
      playSound('correct');
      setCorrectCount((prev) => prev + 1);
    } else {
      playSound('wrong');
    }

    // Save progress
    if (chapterId) {
      gameApi.saveStoryProgress(chapterId, { currentScene: currentScene + 1 }).catch(() => {});
    }

    setTimeout(() => {
      if (currentScene + 1 >= totalScenes) {
        if (chapterId) {
          gameApi.completeStoryChapter(chapterId, {
            correctCount: correct ? correctCount + 1 : correctCount,
            totalCount: totalCount + 1,
          }).catch(() => {});
        }
        playSound('stageComplete');
        setChapterComplete(true);
      } else {
        // Next scene
        setShowFeedback(false);
        setShowQuestion(false);
        setShowNarrative(true);
        setSelectedAnswer(null);
        setIsCorrect(null);
        setCurrentSceneState((prev) => prev + 1);
        setCurrentScene(currentScene + 1);
      }
    }, correct ? 1500 : 2500);
  }, [selectedAnswer, questions, currentScene, chapterId, totalScenes, correctCount, totalCount, setCurrentScene]);

  const handleRetry = useCallback(() => {
    setSelectedAnswer(null);
    setIsCorrect(null);
    setShowFeedback(false);
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 16, maxWidth: 400, margin: '0 auto', textAlign: 'center' }}>
        <div className="game-card" style={{ padding: 24 }}>
          <p style={{ fontSize: 16 }}>加载中...</p>
        </div>
      </div>
    );
  }

  if (chapterComplete) {
    const accuracy = totalCount > 0 ? correctCount / totalCount : 0;
    const stars = accuracy >= 1 ? 3 : accuracy >= 0.8 ? 2 : accuracy >= 0.6 ? 1 : 0;
    const xpEarned = correctCount * 15 + (accuracy >= 1 ? 10 : 0);

    return (
      <div className="animate-bounceIn" style={{ padding: 16, maxWidth: 400, margin: '0 auto', textAlign: 'center' }}>
        <div className="game-card" style={{ padding: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>章节完成！</h2>
          <div style={{ fontSize: 28, margin: '12px 0' }}>
            {Array.from({ length: 3 }, (_, i) => (
              <span key={i} style={{ opacity: i < stars ? 1 : 0.2 }}>⭐</span>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '16px 0' }}>
            <div className="game-card" style={{ padding: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#4ECDC4' }}>{correctCount}/{totalCount}</div>
              <div style={{ fontSize: 11, color: '#999' }}>正确数</div>
            </div>
            <div className="game-card" style={{ padding: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#FF6B6B' }}>+{xpEarned}</div>
              <div style={{ fontSize: 11, color: '#999' }}>获得 XP</div>
            </div>
          </div>
          <button
            className="game-btn"
            style={{ marginTop: 16, width: '100%', padding: '12px 0' }}
            onClick={() => navigate('/game/story')}
          >
            返回章节列表
          </button>
        </div>
      </div>
    );
  }

  const question = questions[currentScene];
  const narrative = SCENE_NARRATIVES[currentScene % SCENE_NARRATIVES.length];

  return (
    <div className="animate-fadeIn" style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>
      {/* Progress */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#999' }}
          onClick={() => navigate('/game/story')}
        >
          ← 返回
        </button>
        <span style={{ fontSize: 13, color: '#666' }}>场景 {currentScene + 1}/{totalScenes}</span>
      </div>
      <div className="game-progress-bar" style={{ marginBottom: 20 }}>
        <div
          className="game-progress-bar-fill"
          style={{ width: `${((currentScene + (showQuestion ? 0.5 : 0)) / totalScenes) * 100}%` }}
        />
      </div>

      {/* Narrative Section */}
      {showNarrative && (
        <div
          className="game-card animate-fadeIn"
          style={{
            padding: 24, marginBottom: 16, textAlign: 'center',
            background: 'linear-gradient(135deg, #FFF8F0, #FFE66D20)',
          }}
        >
          <p style={{ fontSize: 17, lineHeight: 1.8, fontWeight: 500 }}>{narrative}</p>
          <button
            className="game-btn"
            style={{ marginTop: 16, padding: '8px 24px' }}
            onClick={() => { playSound('click'); setShowNarrative(false); setShowQuestion(true); }}
          >
            接受挑战 💪
          </button>
        </div>
      )}

      {/* Question Section */}
      {showQuestion && question && (
        <div className="animate-fadeIn">
          <div className="game-card" style={{ padding: 16, marginBottom: 12 }}>
            <p style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.6 }}>{question.content}</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {question.options?.map((option, idx) => {
              let bg = '#f5f5f5';
              let border = 'none';
              if (selectedAnswer === option) {
                bg = isCorrect ? '#d4edda' : '#f8d7da';
                border = isCorrect ? '2px solid #4ECDC4' : '2px solid #FF6B6B';
              }

              return (
                <button
                  key={idx}
                  disabled={!!selectedAnswer}
                  onClick={() => handleAnswer(option)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 12,
                    background: bg,
                    border,
                    cursor: selectedAnswer ? 'default' : 'pointer',
                    fontSize: 14,
                    textAlign: 'left',
                    width: '100%',
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontWeight: 600, marginRight: 8 }}>{String.fromCharCode(65 + idx)}.</span>
                  {option}
                </button>
              );
            })}
          </div>

          {/* Feedback */}
          {showFeedback && (
            <div
              className={`animate-fadeIn`}
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 12,
                background: isCorrect ? '#d4edda' : '#FFF3CD',
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: 15, fontWeight: 600 }}>
                {isCorrect ? CORRECT_FEEDBACK[currentScene % CORRECT_FEEDBACK.length] : WRONG_FEEDBACK}
              </p>
              {!isCorrect && (
                <button
                  className="game-btn"
                  style={{ marginTop: 8, padding: '6px 16px' }}
                  onClick={handleRetry}
                >
                  重新作答 🔄
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
