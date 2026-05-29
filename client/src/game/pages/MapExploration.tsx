import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStagesByLevel, getStageProgress } from '../api/gameApi';
import { StageNode } from '../components/StageNode';

const LEVEL_COLORS: Record<number, string> = {
  1: '#FF6B6B', 2: '#4ECDC4', 3: '#FFE66D', 4: '#95E1D3',
  5: '#AA96DA', 6: '#F38181', 7: '#FF9A3C', 8: '#A8D8EA',
};

interface StageData {
  id: string; level: number; stageIndex: number; title: string;
  type: string; questionCount: number; timeLimit: number | null;
}

interface ProgressData {
  stageId: string; status: string; stars: number;
  bestScore: number | null; attempts: number;
}

export function MapExploration() {
  const navigate = useNavigate();
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [stages, setStages] = useState<StageData[]>([]);
  const [progress, setProgress] = useState<ProgressData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData(selectedLevel);
  }, [selectedLevel]);

  const loadData = async (level: number) => {
    setLoading(true);
    try {
      const [stagesRes, progressRes] = await Promise.all([
        getStagesByLevel(level),
        getStageProgress(level),
      ]);
      setStages(stagesRes.data?.stages ?? stagesRes.data ?? []);
      setProgress(progressRes.data?.progress ?? progressRes.data ?? []);
    } catch {
      setStages([]);
      setProgress([]);
    } finally {
      setLoading(false);
    }
  };

  const getProgress = (stageId: string) =>
    progress.find((p) => p.stageId === stageId);

  const handleStageClick = (stage: StageData) => {
    const url = stage.type === 'boss'
      ? `/game/map/boss/${stage.id}?level=${selectedLevel}`
      : `/game/map/stage/${stage.id}?level=${selectedLevel}`;
    navigate(url);
  };

  return (
    <div className="animate-fadeIn" style={{ padding: 16 }}>
      {/* Level Selector */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, marginBottom: 16 }}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((level) => (
          <button
            key={level}
            onClick={() => setSelectedLevel(level)}
            style={{
              padding: '8px 16px',
              borderRadius: 20,
              border: 'none',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              background: selectedLevel === level ? LEVEL_COLORS[level] : '#f0f0f0',
              color: selectedLevel === level ? 'white' : '#666',
              transition: 'all 0.2s',
              flexShrink: 0,
            }}
          >
            Level {level}
          </button>
        ))}
      </div>

      {/* Map Area */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
          加载中... ⏳
        </div>
      ) : stages.length === 0 ? (
        <div className="game-card" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>🗺️</p>
          <p>该级别暂无关卡数据</p>
          <p style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
            请先运行 seed 脚本创建关卡
          </p>
        </div>
      ) : (
        <div style={{ position: 'relative', minHeight: 400 }}>
          {stages.map((stage, idx) => {
            const p = getProgress(stage.id);
            const status: 'locked' | 'available' | 'completed' =
              p?.status === 'completed' ? 'completed' :
              p?.status === 'available' ? 'available' :
              'available';

            // Winding path layout: alternate left-right
            const isLeft = idx % 2 === 0;

            return (
              <div key={stage.id} style={{
                position: 'relative',
                display: 'flex',
                justifyContent: isLeft ? 'flex-start' : 'flex-end',
                padding: `16px ${isLeft ? '40%' : '0'} 16px ${isLeft ? '0' : '40%'}`,
              }}>
                {/* Path connector */}
                {idx > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: -8,
                    left: '50%',
                    width: 2,
                    height: 24,
                    background: '#d1d5db',
                    transform: 'translateX(-50%)',
                  }} />
                )}

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <StageNode
                    stageIndex={stage.stageIndex}
                    title={stage.title}
                    type={stage.type as 'normal' | 'boss'}
                    status={status}
                    stars={p?.stars ?? 0}
                    color={LEVEL_COLORS[selectedLevel]}
                    onClick={() => handleStageClick(stage)}
                  />
                  <span style={{ fontSize: 11, color: '#666', textAlign: 'center', marginTop: status === 'completed' ? 16 : 4 }}>
                    {stage.title}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
