import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useGameProfileStore } from '../stores/gameProfileStore';
import { AchievementNotification } from './AchievementNotification';
import '../assets/game-theme.css';

const tabs = [
  { path: '/game/map', icon: '🗺️', label: '地图' },
  { path: '/game/leaderboard', icon: '🏆', label: '排行' },
  { path: '/game/rpg', icon: '🧙', label: '角色' },
  { path: '/game/story', icon: '📖', label: '故事' },
] as const;

export function GameLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const { profile, fetchProfile } = useGameProfileStore();

  useEffect(() => {
    if (!profile) {
      fetchProfile();
    }
  }, [profile, fetchProfile]);

  const isActive = (tabPath: string) =>
    location.pathname.startsWith(tabPath);

  const xpForNextLevel = profile ? (
    profile.level < 9
      ? [0, 100, 250, 500, 800, 1200, 1800, 2500, 3500, 5000][profile.level] || 9999
      : 9999
  ) : 100;
  const xpForCurrentLevel = profile ? (
    [0, 100, 250, 500, 800, 1200, 1800, 2500, 3500, 5000][profile.level - 1] || 0
  ) : 0;
  const xpProgress = profile
    ? Math.min(100, ((profile.totalXP - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100)
    : 0;

  return (
    <div className="game-layout">
      <AchievementNotification />
      {/* Top Navigation */}
      <nav className="game-top-nav">
        <Link to="/game" className="game-logo">
          🎮 GESP冒险
        </Link>

        {profile && (
          <div className="xp-bar-container">
            <span className="level-badge">Lv.{profile.level}</span>
            <div className="game-progress-bar game-progress-bar-sm" style={{ flex: 1 }}>
              <div
                className="game-progress-bar-fill"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="user-info">
          {profile && <span className="avatar">{profile.avatar}</span>}
          <Link to="/" className="back-link">← 返回主站</Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="game-main">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="game-bottom-nav">
        {tabs.map((tab) => (
          <button
            key={tab.path}
            className={`game-tab${isActive(tab.path) ? ' active' : ''}`}
            onClick={() => navigate(tab.path)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
