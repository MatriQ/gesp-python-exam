interface StageNodeProps {
  stageIndex: number;
  title: string;
  type: 'normal' | 'boss';
  status: 'locked' | 'available' | 'completed';
  stars: number;
  color: string;
  onClick: () => void;
}

export function StageNode({ stageIndex, title, type, status, stars, color, onClick }: StageNodeProps) {
  const isBoss = type === 'boss';
  const size = isBoss ? 72 : 56;

  return (
    <div
      onClick={status !== 'locked' ? onClick : undefined}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: status === 'locked' ? '#d1d5db' : status === 'completed' ? color : color,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: status !== 'locked' ? 'pointer' : 'default',
        opacity: status === 'locked' ? 0.6 : 1,
        boxShadow: status === 'available' ? `0 0 12px ${color}60` : 'var(--game-shadow)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        position: 'relative',
        userSelect: 'none',
      }}
      className={status === 'locked' ? 'animate-pulse' : ''}
      onMouseEnter={(e) => { if (status !== 'locked') (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
    >
      {status === 'locked' ? (
        <span style={{ fontSize: isBoss ? 28 : 22 }}>🔒</span>
      ) : isBoss ? (
        <span style={{ fontSize: 28 }}>👹</span>
      ) : (
        <span style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>{stageIndex}</span>
      )}
      {status === 'completed' && (
        <div style={{ position: 'absolute', bottom: -20, display: 'flex', gap: 1 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <span key={i} style={{ fontSize: 12 }}>{i < stars ? '⭐' : '☆'}</span>
          ))}
        </div>
      )}
      {status === 'locked' && (
        <div style={{
          position: 'absolute', bottom: -22, fontSize: 10, color: '#636E72',
          whiteSpace: 'nowrap', textAlign: 'center',
        }}>
          通过前一关解锁
        </div>
      )}
    </div>
  );
}
