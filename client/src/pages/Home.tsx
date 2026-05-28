import { Link } from 'react-router-dom';

export function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        GESP Python 等级考试练习平台
      </h1>
      <p className="text-lg text-gray-600 mb-8">
        在线刷题 · 模拟考试 · 游戏闯关 · 即时反馈
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          to="/questions"
          className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          开始练习
        </Link>
        <Link
          to="/game"
          className="bg-gradient-to-r from-orange-400 to-pink-500 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:from-orange-500 hover:to-pink-600 transition-colors"
        >
          🎮 游戏闯关
        </Link>
      </div>
    </div>
  );
}
