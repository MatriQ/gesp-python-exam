import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createGameProfile } from '../api/gameApi';
import { useGameProfileStore } from '../stores/gameProfileStore';

const AVATARS = ['🐱', '🐶', '🦊', '🐻', '🐼', '🐰', '🦁', '🐯', '🐸', '🐵'];

const STEP_DESCRIPTIONS = [
  { title: '🎉 欢迎！', subtitle: '开始你的 Python 冒险吧！' },
  { title: '选择头像', subtitle: '选一个你喜欢的角色形象' },
  { title: '输入昵称', subtitle: '给自己取一个好听的名字' },
  { title: '准备就绪！', subtitle: '冒险即将开始' },
];

export function GameOnboarding() {
  const navigate = useNavigate();
  const { fetchProfile } = useGameProfileStore();
  const [step, setStep] = useState(0);
  const [avatar, setAvatar] = useState('🐱');
  const [nickname, setNickname] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleFinish = async () => {
    if (!nickname.trim()) {
      setError('请输入昵称');
      return;
    }
    setIsCreating(true);
    setError('');
    try {
      await createGameProfile({ nickname: nickname.trim(), avatar });
      await fetchProfile();
      navigate('/game');
    } catch (err: any) {
      setError(err?.response?.data?.error || '创建失败，请重试');
      setIsCreating(false);
    }
  };

  const canNext = step === 0 || (step === 1) || (step === 2 && nickname.trim());

  return (
    <div className="animate-fadeIn" style={{
      padding: 24, maxWidth: 400, margin: '0 auto',
      minHeight: '60vh', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center',
    }}>
      {/* Step Indicator */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {STEP_DESCRIPTIONS.map((_, i) => (
          <div
            key={i}
            style={{
              width: 10, height: 10, borderRadius: '50%',
              background: i <= step ? '#FF6B6B' : '#ddd',
              transition: 'background 0.3s',
            }}
          />
        ))}
      </div>

      {/* Step Title */}
      <h2 style={{ fontSize: 22, fontWeight: 700, textAlign: 'center' }}>
        {STEP_DESCRIPTIONS[step].title}
      </h2>
      <p style={{ fontSize: 14, color: '#999', marginTop: 4, textAlign: 'center' }}>
        {STEP_DESCRIPTIONS[step].subtitle}
      </p>

      {/* Step Content */}
      <div style={{ marginTop: 24, width: '100%', textAlign: 'center' }}>
        {step === 0 && (
          <div className="animate-bounceIn">
            <div style={{ fontSize: 64, margin: '20px 0' }}>🎮</div>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: '#666' }}>
              你将化身 Python 冒险家，<br />
              闯关答题、收集星星、<br />
              解锁故事、成为编程大师！
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="animate-fadeIn">
            <div style={{ fontSize: 48, margin: '16px 0' }}>{avatar}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
              {AVATARS.map((a) => (
                <button
                  key={a}
                  onClick={() => setAvatar(a)}
                  style={{
                    fontSize: 28, padding: 8, borderRadius: 12,
                    background: avatar === a ? '#FFE66D' : '#f5f5f5',
                    border: avatar === a ? '3px solid #FF6B6B' : '2px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fadeIn">
            <div style={{ fontSize: 48, margin: '16px 0' }}>{avatar}</div>
            <input
              value={nickname}
              onChange={(e) => { setNickname(e.target.value); setError(''); }}
              maxLength={8}
              placeholder="输入昵称（最多8个字）"
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 12,
                border: '2px solid #FF6B6B', fontSize: 16, textAlign: 'center',
                outline: 'none', boxSizing: 'border-box',
              }}
              autoFocus
            />
            {error && <p style={{ color: '#FF6B6B', fontSize: 13, marginTop: 8 }}>{error}</p>}
          </div>
        )}

        {step === 3 && (
          <div className="animate-bounceIn">
            <div style={{
              background: 'linear-gradient(135deg, #FFF8F0, #FFE66D40)',
              borderRadius: 20, padding: 24, margin: '16px 0',
            }}>
              <div style={{ fontSize: 56 }}>{avatar}</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 8 }}>{nickname}</div>
              <div style={{ fontSize: 13, color: '#999', marginTop: 4 }}>Lv.1 · 冒险新手</div>
            </div>
            <button
              className="game-btn"
              style={{ width: '100%', padding: '14px 0', fontSize: 17, marginTop: 16 }}
              onClick={handleFinish}
              disabled={isCreating}
            >
              {isCreating ? '创建中...' : '开始冒险 🚀'}
            </button>
            {error && <p style={{ color: '#FF6B6B', fontSize: 13, marginTop: 8 }}>{error}</p>}
          </div>
        )}
      </div>

      {/* Navigation */}
      {step < 3 && (
        <div style={{ display: 'flex', gap: 12, marginTop: 24, width: '100%' }}>
          {step > 0 && (
            <button
              style={{
                flex: 1, padding: '12px 0', borderRadius: 12,
                background: '#f5f5f5', border: 'none', cursor: 'pointer',
                fontSize: 15, color: '#666',
              }}
              onClick={() => setStep((s) => s - 1)}
            >
              上一步
            </button>
          )}
          <button
            className="game-btn"
            style={{ flex: 2, padding: '12px 0', fontSize: 15 }}
            onClick={() => setStep((s) => s + 1)}
          >
            {step === 2 ? '确认' : '下一步 →'}
          </button>
        </div>
      )}
    </div>
  );
}
