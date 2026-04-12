import { Sparkles } from 'lucide-react';

export default function XPBadge({ xp, level }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 shadow-lg">
      <Sparkles className="w-4 h-4 text-white" />
      <div className="text-white font-bold text-sm">
        <span>Level {level}</span>
        <span className="mx-1.5">•</span>
        <span>{xp} XP</span>
      </div>
    </div>
  );
}