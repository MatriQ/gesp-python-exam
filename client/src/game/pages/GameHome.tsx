import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameProfileStore } from '../stores/gameProfileStore';

const MODES = [
  {
    icon: '🗺️',
    title: '地图探索',
    desc: '闯关学习，逐级挑战！',
    path: '/game/map',
    color: 'linear-gradient(135deg, #FFE66D, #FFD93D)',
    stat: '关卡',
    statValue: '--',
  },
  {
    icon: '🏆',
    title: '竞技排行',
    desc: '和同学比一比！',
    path: '/game/leaderboard',
    color: 'linear-gradient(135deg, #4ECDC4, #44B89D)',
    stat: '排名',
    statValue: '--',
  },
  {
    icon: '🧙',
    title: '角色成长',
    desc: '升级你的角色！',
    path: '/game/rpg',
    color: 'linear-gradient(135deg, #FF6B6B, #EE5A5A)',
    stat: '等级',
    statValue: '--',
  },
  {
    icon: '📖',
    title: '冒险故事',
    desc: '用知识解锁故事！',
    path: '/game/story',
    color: 'linear-gradient(135deg, #95E1D3, #7DCDBC)',
    stat: '章节',
    statValue: '--',
  },
];

export function GameHome() {
  const navigate = useNavigate();
  const { profile, fetchProfile } = useGameProfileStore();

  useEffect(() => {
    if (!profile) fetchProfile();
  }, [profile, fetchProfile]);

  const modes = MODES.map((m) => {
    if (m.path === '/game/rpg' && profile) return { ...m, statValue: `Lv.${profile.level}` };
    return m;
  });

  return (
    <div className="animate-fadeIn" style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>
      {/* Welcome */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>{profile?.avatar || '🎮'}</div>
        {profile ? (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>欢迎回来，{profile.nickname}！</h2>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <span className="game-badge" style={{ fontSize: 12 }}>Lv.{profile.level}</span>
              <span style={{ fontSize: 13, color: '#999' }}>{profile.totalXP} XP</span>
            </div>
          </>
        ) : (
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>🎮 GESP Python 冒险</h2>
        )}
      </div>

      {/* Mode Cards 2x2 Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {modes.map((mode) => (
          <div
            key={mode.path}
            className="game-card"
            style={{
              padding: 16, textAlign: 'center', cursor: 'pointer',
              background: mode.color,
              transition: 'transform 0.2s, box-shadow 0.2s',
              border: 'none',
            }}
            onClick={() => navigate(mode.path)}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = '';
            }}
          >
            <div style={{ fontSize: 44, marginBottom: 8 }}>{mode.icon}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#333' }}>{mode.title}</div>
            <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{mode.desc}</div>
            <div style={{
              marginTop: 8, padding: '4px 10px', borderRadius: 8,
              background: 'rgba(255,255,255,0.6)', display: 'inline-block',
              fontSize: 11, fontWeight: 600, color: '#555',
            }}>
              {mode.stat}: {mode.statValue}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      {profile && (
        <div className="game-card" style={{ marginTop: 16, padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>📊 今日进度</div>
          <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#FF6B6B' }}>0</div>
              <div style={{ fontSize: 11, color: '#999' }}>已答题目</div>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#4ECDC4' }}>0%</div>
              <div style={{ fontSize: 11, color: '#999' }}>正确率</div>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#FFE66D' }}>0⭐</div>
              <div style={{ fontSize: 11, color: '#999' }}>获得星星</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
