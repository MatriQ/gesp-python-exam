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

export function LevelSidebar() {
  const { selectedLevel, setSelectedLevel } = useAppStore();

  return (
    <aside className="hidden md:flex flex-col items-center gap-2 pt-4 px-2 bg-gray-50 w-16 shrink-0">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((level) => (
        <button
          key={level}
          onClick={() => setSelectedLevel(level)}
          className={`w-10 h-10 rounded-lg text-white font-bold text-sm ${levelColors[level]} ${
            selectedLevel === level ? 'ring-2 ring-offset-2 ring-blue-500' : ''
          } hover:opacity-90 transition-opacity`}
        >
          {level}
        </button>
      ))}
    </aside>
  );
}
