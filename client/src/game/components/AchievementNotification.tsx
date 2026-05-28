import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAchievementStore } from '../stores/gameAchievementStore';

interface QueuedAchievement {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export function AchievementNotification() {
  const navigate = useNavigate();
  const { newlyUnlocked, setNewlyUnlocked } = useAchievementStore();
  const [queue, setQueue] = useState<QueuedAchievement[]>([]);
  const [current, setCurrent] = useState<QueuedAchievement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // When store has a new achievement, add to queue
  useEffect(() => {
    if (newlyUnlocked && newlyUnlocked.id) {
      setQueue((prev) => [...prev, {
        id: newlyUnlocked.id,
        name: newlyUnlocked.name,
        icon: newlyUnlocked.icon || '🏅',
        description: newlyUnlocked.description,
      }]);
      setNewlyUnlocked(null);
    }
  }, [newlyUnlocked, setNewlyUnlocked]);

  // Process queue
  useEffect(() => {
    if (!current && queue.length > 0) {
      const [next, ...rest] = queue;
      setQueue(rest);
      setCurrent(next);
      // Trigger show animation
      requestAnimationFrame(() => setIsVisible(true));
      // Auto dismiss after 3s
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => setCurrent(null), 400); // wait for fade out
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [current, queue]);

  const handleView = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      setCurrent(null);
      navigate('/game/rpg');
    }, 400);
  }, [navigate]);

  if (!current) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: isVisible ? 12 : -80,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 200,
        transition: 'top 0.4s ease-out',
        maxWidth: 360,
        width: 'calc(100% - 32px)',
      }}
    >
      <div
        className="game-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          background: 'linear-gradient(135deg, #FFF8F0, #FFE66D)',
          border: '2px solid #FF6B6B',
          cursor: 'pointer',
        }}
        onClick={handleView}
      >
        <span style={{ fontSize: 32 }}>{current.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: '#FF6B6B', fontWeight: 700 }}>🎉 成就解锁！</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{current.name}</div>
        </div>
        <span style={{ fontSize: 12, color: '#999' }}>查看 →</span>
      </div>
    </div>
  );
}
