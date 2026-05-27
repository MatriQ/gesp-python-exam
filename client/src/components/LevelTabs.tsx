import { useAppStore } from '../stores/appStore';

const levelColors: Record<number, string> = {
  1: 'bg-green-500',
  2: 'bg-teal-500',
  3: 'bg-blue-500',
  4: 'bg-indigo-500',
  5: 'bg-purple-500',
  6: 'bg-pink-500',
  7: 'bg-orange-500',
  8: 'bg-red-500',
};

export function LevelTabs() {
  const { selectedLevel, setSelectedLevel } = useAppStore();

  return (
    <div className="lg:hidden flex items-center gap-1.5 px-4 py-2 bg-white border-b border-gray-200 overflow-x-auto shrink-0">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((level) => (
        <button
          key={level}
          onClick={() => setSelectedLevel(level)}
          className={`shrink-0 w-9 h-9 rounded-lg text-white font-bold text-sm ${levelColors[level]} ${
            selectedLevel === level ? 'ring-2 ring-offset-1 ring-blue-500' : ''
          } hover:opacity-90 transition-opacity`}
        >
          {level}
        </button>
      ))}
    </div>
  );
}
