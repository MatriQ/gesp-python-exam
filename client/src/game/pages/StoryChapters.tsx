import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStoryStore } from '../stores/gameStoryStore';

const LEVEL_NAMES = ['', '🌱 入门', '🌿 基础', '🌳 进阶', '🌴 提高', '🎄 精通', '⭐ 专家', '🏆 大师', '💎 宗师'];

const STORY_TITLES: Record<number, string[]> = {
  1: ['Python 森林探险', '机器人学说话', '神秘的代码门'],
  2: ['迷宫寻宝记', '变量精灵的秘密', '数组成长大作战'],
  3: ['条件城堡历险', '循环河渡船记', '函数魔法学院'],
  4: ['字典迷宫', '字符串编织者', '算法竞技场'],
  5: ['面向对象王国', '继承家族之旅', '多态幻境'],
  6: ['递归之塔', '排序大挑战', '搜索迷踪'],
  7: ['图论大陆', '动态规划迷宫', '贪心策略战'],
  8: ['终极Boss战', 'Python 圣殿', '编程大师之路'],
};

export function StoryChapters() {
  const navigate = useNavigate();
  const { chapters, progress, fetchChapters, fetchProgress } = useGameStoryStore();
  const [selectedLevel, setSelectedLevel] = useState(1);

  useEffect(() => {
    fetchChapters(selectedLevel);
    fetchProgress();
  }, [selectedLevel, fetchChapters, fetchProgress]);

  // Use API chapters if available, otherwise generate from template
  const displayChapters = chapters.length > 0
    ? chapters
    : (STORY_TITLES[selectedLevel] || ['冒险故事']).map((title, i) => ({
        id: `story-L${selectedLevel}-${i + 1}`,
        level: selectedLevel,
        chapterIndex: i + 1,
        title: `🤖 帮助小机器人在${title}`,
      }));

  const getProgress = (chapterId: string) => {
    const p = progress.find((x) => x.chapterId === chapterId);
    return p || { chapterId, currentScene: 0, completed: false };
  };

  const levelCounts = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div className="animate-fadeIn" style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>📖 编程冒险故事</h2>
        <p style={{ fontSize: 13, color: '#999', marginTop: 4 }}>用知识解锁故事！</p>
      </div>

      {/* Level Selector */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 16 }}>
        {levelCounts.map((lvl) => (
          <button
            key={lvl}
            onClick={() => setSelectedLevel(lvl)}
            style={{
              padding: '6px 10px',
              borderRadius: 16,
              fontSize: 12,
              fontWeight: selectedLevel === lvl ? 700 : 400,
              background: selectedLevel === lvl ? '#FF6B6B' : '#f5f5f5',
              color: selectedLevel === lvl ? 'white' : '#666',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {LEVEL_NAMES[lvl]}
          </button>
        ))}
      </div>

      {/* Chapter Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {displayChapters.map((chapter, idx) => {
          const prog = getProgress(chapter.id);
          const statusIcon = prog.completed ? '✅' : prog.currentScene > 0 ? '🔄' : '🔒';
          const statusText = prog.completed ? '已完成' : prog.currentScene > 0 ? `进行中 (场景 ${prog.currentScene})` : '未开始';

          return (
            <div
              key={chapter.id}
              className="game-card"
              style={{
                cursor: 'pointer',
                transition: 'transform 0.15s',
              }}
              onClick={() => navigate(`/game/story/chapter/${chapter.id}`)}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.02)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: ['#FFE66D', '#4ECDC4', '#FF6B6B', '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3', '#A8D8EA'][idx % 8],
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, fontWeight: 700,
                }}>
                  {idx + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{chapter.title}</div>
                  <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                    {statusIcon} {statusText}
                  </div>
                </div>
                <span style={{ fontSize: 18 }}>→</span>
              </div>
              {prog.completed && (
                <div style={{ marginTop: 8 }}>
                  <div className="game-progress-bar">
                    <div className="game-progress-bar-fill" style={{ width: '100%', background: '#4ECDC4' }} />
                  </div>
                </div>
              )}
              {prog.currentScene > 0 && !prog.completed && (
                <div style={{ marginTop: 8 }}>
                  <div className="game-progress-bar">
                    <div className="game-progress-bar-fill" style={{ width: `${(prog.currentScene / 5) * 100}%` }} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {displayChapters.length === 0 && (
        <div className="game-card" style={{ textAlign: 'center', padding: 32 }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>📚</p>
          <p style={{ color: '#999' }}>该级别暂无故事章节</p>
        </div>
      )}
    </div>
  );
}
