import { useState, useEffect } from 'react';
import { getLeaderboard, getMyRank } from '../api/gameApi';

interface LeaderboardEntry {
  userId: string;
  totalScore: number;
  rank?: number;
  user?: { name: string; avatar: string; nickname?: string; level?: number };
}

export function Leaderboard() {
  const [tab, setTab] = useState<'all' | 'daily'>('all');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [tab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [lbRes, rankRes] = await Promise.all([
        getLeaderboard(tab),
        getMyRank().catch(() => ({ data: null })),
      ]);
      const data = lbRes.data?.leaderboard ?? lbRes.data ?? [];
      setEntries(Array.isArray(data) ? data : []);
      setMyRank(rankRes.data?.rank ?? rankRes.data ?? null);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="animate-fadeIn" style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
        🏆 竞技排行
      </h2>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['all', 'daily'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={tab === t ? 'game-btn' : 'game-btn game-btn-outline'}
            style={{ flex: 1, fontSize: 13 }}
          >
            {t === 'all' ? '🏆 总榜' : '📅 今日榜'}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>加载中... ⏳</div>
      ) : entries.length === 0 ? (
        <div className="game-card" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ fontSize: 32 }}>🏆</p>
          <p>还没有排名，快去闯关吧！🚀</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {entries.map((entry, idx) => {
            const rank = entry.rank ?? idx + 1;
            const isTop3 = rank <= 3;
            return (
              <div
                key={entry.userId}
                className="game-card"
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px',
                  background: isTop3 ? ['#FFF9DB', '#F0F0F0', '#FDEBD0'][rank - 1] : 'white',
                  borderLeft: isTop3 ? `4px solid ${['#FFD700', '#C0C0C0', '#CD7F32'][rank - 1]}` : 'none',
                }}
              >
                <span style={{
                  width: 36, textAlign: 'center',
                  fontSize: isTop3 ? 24 : 14,
                  fontWeight: isTop3 ? 700 : 400,
                  color: isTop3 ? '#333' : '#999',
                }}>
                  {isTop3 ? medals[rank - 1] : rank}
                </span>
                <span style={{ fontSize: 28 }}>{entry.user?.avatar ?? '😊'}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>
                    {entry.user?.nickname ?? entry.user?.name ?? '玩家'}
                  </p>
                  {entry.user?.level != null && (
                    <span className="game-badge" style={{ fontSize: 11, padding: '1px 6px' }}>
                      Lv.{entry.user.level}
                    </span>
                  )}
                </div>
                <span style={{ fontWeight: 700, color: '#FF6B6B', fontSize: 15 }}>
                  {entry.totalScore} 分
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* My rank */}
      {myRank && (
        <div className="game-card" style={{
          position: 'sticky', bottom: 72, marginTop: 16,
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 14px', background: '#FFF0F0',
          borderLeft: '4px solid #FF6B6B',
        }}>
          <span style={{ fontWeight: 700, color: '#FF6B6B' }}>
            #{myRank.rank ?? '?'}
          </span>
          <span style={{ fontSize: 24 }}>{myRank.user?.avatar ?? '😊'}</span>
          <span style={{ flex: 1, fontWeight: 600 }}>
            我 · {myRank.user?.nickname ?? '我'}
          </span>
          <span style={{ fontWeight: 700, color: '#FF6B6B' }}>
            {myRank.totalScore} 分
          </span>
        </div>
      )}
    </div>
  );
}
