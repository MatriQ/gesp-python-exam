interface StageResultProps {
  stars: number;
  correctCount: number;
  totalCount: number;
  xpEarned: number;
  onNext: () => void;
  onRetry: () => void;
}

export function StageResult({ stars, correctCount, totalCount, xpEarned, onNext, onRetry }: StageResultProps) {
  const messages = ['💪 再接再厉！', '👍 不错哦！', '🌟 太棒了！', '✨ 完美通关！'];
  const msg = messages[stars] || messages[0];

  return (
    <div className="animate-bounceIn" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div className="game-card" style={{
        padding: 32, textAlign: 'center', maxWidth: 320, width: '90%',
      }}>
        <p style={{ fontSize: 36, marginBottom: 8 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <span key={i}>{i < stars ? '⭐' : '☆'}</span>
          ))}
        </p>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{msg}</h2>
        <p style={{ color: '#666', marginBottom: 16 }}>
          答对 {correctCount}/{totalCount} 题
        </p>
        <div style={{
          background: '#FFF8F0', borderRadius: 12, padding: 12, marginBottom: 20,
        }}>
          <span style={{ fontSize: 24 }}>✨</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#FF6B6B', marginLeft: 8 }}>
            +{xpEarned} XP
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="game-btn game-btn-outline" style={{ flex: 1 }} onClick={onRetry}>
            再试一次
          </button>
          <button className="game-btn" style={{ flex: 1 }} onClick={onNext}>
            下一关 →
          </button>
        </div>
      </div>
    </div>
  );
}
