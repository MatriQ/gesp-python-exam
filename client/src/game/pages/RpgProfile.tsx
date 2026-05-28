import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameProfileStore } from '../stores/gameProfileStore';
import { getAchievements, updateGameProfile } from '../api/gameApi';

const AVATARS = ['🐱', '🐶', '🦊', '🐻', '🐼', '🐰', '🦁', '🐯', '🐸', '🐵'];
const XP_THRESHOLDS = [0, 100, 250, 500, 800, 1200, 1800, 2500, 3500, 5000];

export function RpgProfile() {
  const navigate = useNavigate();
  const { profile, fetchProfile, updateProfile } = useGameProfileStore();
  const [achievements, setAchievements] = useState<any[]>([]);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  useEffect(() => {
    fetchProfile();
    getAchievements().then((res) => {
      setAchievements(res.data?.achievements ?? res.data ?? []);
    }).catch(() => {});
  }, []);

  const handleAvatarChange = async (avatar: string) => {
    try {
      await updateGameProfile({ avatar });
      updateProfile({ avatar } as any);
      setShowAvatarPicker(false);
    } catch { /* empty */ }
  };

  const handleNameSave = async () => {
    if (!nameInput.trim()) return;
    try {
      await updateGameProfile({ nickname: nameInput.trim() });
      updateProfile({ nickname: nameInput.trim() } as any);
      setEditingName(false);
    } catch { /* empty */ }
  };

  if (!profile) {
    return (
      <div className="game-card" style={{ textAlign: 'center', padding: 40, margin: 16 }}>
        <p>请先创建游戏角色 🎮</p>
        <button
          className="game-btn"
          style={{ marginTop: 16 }}
          onClick={() => navigate('/game/onboarding')}
        >
          创建角色
        </button>
      </div>
    );
  }

  const xpForNext = profile.level < 9 ? (XP_THRESHOLDS[profile.level] || 9999) : 9999;
  const xpForCurrent = XP_THRESHOLDS[profile.level - 1] || 0;
  const xpProgress = Math.min(100, ((profile.totalXP - xpForCurrent) / (xpForNext - xpForCurrent)) * 100);
  const unlocked = achievements.filter((a: any) => a.unlockedAt || a.unlocked);

  return (
    <div className="animate-fadeIn" style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>
      {/* Avatar + Name */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div
          onClick={() => setShowAvatarPicker(true)}
          style={{ fontSize: 80, cursor: 'pointer', lineHeight: 1.2 }}
          title="点击更换头像"
        >
          {profile.avatar}
        </div>

        {editingName ? (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              maxLength={8}
              style={{
                padding: '6px 12px', borderRadius: 8, border: '2px solid #FF6B6B',
                fontSize: 16, textAlign: 'center', width: 120, outline: 'none',
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
              autoFocus
            />
            <button className="game-btn" style={{ padding: '6px 12px' }} onClick={handleNameSave}>✓</button>
          </div>
        ) : (
          <h2
            onClick={() => { setEditingName(true); setNameInput(profile.nickname); }}
            style={{ fontSize: 20, fontWeight: 700, cursor: 'pointer', margin: '4px 0' }}
          >
            {profile.nickname} ✏️
          </h2>
        )}

        <div className="game-badge" style={{ marginTop: 8, fontSize: 14 }}>
          Lv.{profile.level}
        </div>
      </div>

      {/* XP Bar */}
      <div className="game-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
          <span>经验值</span>
          <span>{profile.totalXP} / {xpForNext} XP</span>
        </div>
        <div className="game-progress-bar">
          <div className="game-progress-bar-fill" style={{ width: `${xpProgress}%` }} />
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        {[
          { icon: '⭐', label: '总星星', value: '--' },
          { icon: '🏆', label: '排名', value: '--' },
          { icon: '📝', label: '成就', value: `${unlocked.length}/${achievements.length}` },
          { icon: '🗺️', label: '等级', value: `Lv.${profile.level}` },
        ].map((stat) => (
          <div key={stat.label} className="game-card" style={{ textAlign: 'center', padding: 12 }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>{stat.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: '#999' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Achievements */}
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>🏅 成就徽章</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {achievements.map((a: any) => {
          const isUnlocked = a.unlockedAt || a.unlocked;
          return (
            <div
              key={a.id || a.key}
              className="game-card"
              style={{
                padding: 10, textAlign: 'center', width: 80,
                opacity: isUnlocked ? 1 : 0.4,
                background: isUnlocked ? '#FFF8F0' : '#f5f5f5',
              }}
              title={a.description || a.name}
            >
              <div style={{ fontSize: 24 }}>{isUnlocked ? (a.icon || '🏅') : '🔒'}</div>
              <div style={{ fontSize: 10, marginTop: 2, fontWeight: 600 }}>
                {isUnlocked ? a.name : '???'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Avatar Picker Modal */}
      {showAvatarPicker && (
        <div className="animate-fadeIn" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }} onClick={() => setShowAvatarPicker(false)}>
          <div className="game-card" style={{ padding: 24, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16 }}>选择头像</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
              {AVATARS.map((a) => (
                <button
                  key={a}
                  onClick={() => handleAvatarChange(a)}
                  style={{
                    fontSize: 36, background: profile.avatar === a ? '#FFE66D' : '#f5f5f5',
                    border: profile.avatar === a ? '3px solid #FF6B6B' : 'none',
                    borderRadius: 12, padding: 8, cursor: 'pointer',
                  }}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
