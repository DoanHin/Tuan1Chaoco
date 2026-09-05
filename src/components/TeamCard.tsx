import React from 'react';
import { motion } from 'motion/react';
import { Trophy } from 'lucide-react';

interface TeamCardProps {
  teamId: 1 | 2;
  name: string;
  score: number;
  isCurrentTurn: boolean;
  isPulling?: boolean;
  isWinner?: boolean;
}

export const TeamCard: React.FC<TeamCardProps> = ({
  teamId,
  name,
  score,
  isCurrentTurn,
  isPulling = false,
  isWinner = false,
}) => {
  const isTeam1 = teamId === 1;
  const formattedScore = score.toString().padStart(2, '0');

  return (
    <div
      className={`w-52 sm:w-64 flex flex-col items-center justify-center rounded-xl p-3 select-none transition-all duration-300 relative ${
        isTeam1
          ? isCurrentTurn
            ? 'bg-blue-900/25 border border-blue-500/40 ring-2 ring-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
            : 'bg-blue-900/10 border border-blue-500/20 opacity-85'
          : isCurrentTurn
            ? 'bg-red-900/25 border border-red-500/40 ring-2 ring-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
            : 'bg-red-900/10 border border-red-500/20 opacity-85'
      } ${isWinner ? 'ring-4 ring-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.5)]' : ''}`}
    >
      {/* Winner Crown/Trophy Badge */}
      {isWinner && (
        <div className="absolute -top-3 right-2 bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded-full font-bold text-[10px] flex items-center gap-1 shadow-lg z-20">
          <Trophy className="w-3 h-3 fill-current" />
          <span>QUÁN QUÂN</span>
        </div>
      )}

      {/* Pulling indicator badge */}
      {isPulling && (
        <div className="absolute -top-3 left-2 bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full font-tech font-bold text-[9px] uppercase tracking-wider animate-bounce z-20">
          🔥 Đang kéo!
        </div>
      )}

      {/* Team Name */}
      <div
        className={`font-black text-sm sm:text-base uppercase tracking-tight mb-0.5 truncate max-w-[190px] ${
          isTeam1
            ? isCurrentTurn ? 'text-blue-400' : 'text-blue-400/80'
            : isCurrentTurn ? 'text-red-400' : 'text-red-400/80'
        }`}
        title={name}
      >
        {name}
      </div>

      {/* Big Score (Formatted as 00) */}
      <motion.div
        key={score}
        initial={{ scale: 1.2 }}
        animate={{ scale: 1 }}
        className="text-4xl sm:text-5xl font-black font-tech text-white leading-none my-0.5 drop-shadow"
      >
        {formattedScore}
      </motion.div>

      {/* Status Pill */}
      <div
        className={`text-[10px] uppercase tracking-widest font-bold mt-1 px-2 py-0.5 rounded-full ${
          isCurrentTurn
            ? isTeam1
              ? 'text-blue-300 bg-blue-950/60 border border-blue-500/30'
              : 'text-red-300 bg-red-950/60 border border-red-500/30'
            : 'text-slate-500 bg-slate-900/50'
        }`}
      >
        {isCurrentTurn ? 'ĐANG LỰA CHỌN' : 'ĐỢI LƯỢT'}
      </div>
    </div>
  );
};

