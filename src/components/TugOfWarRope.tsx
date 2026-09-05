import React from 'react';
import { motion } from 'motion/react';

interface TugOfWarRopeProps {
  score1: number;
  score2: number;
  team1Name: string;
  team2Name: string;
}

export const TugOfWarRope: React.FC<TugOfWarRopeProps> = ({
  score1,
  score2,
  team1Name,
  team2Name,
}) => {
  // Delta: positive means leaning to Team 1 (left), negative means leaning to Team 2 (right)
  const delta = score1 - score2;

  // Max visual displacement step: clamp between -8 and +8
  const clampedDelta = Math.max(-8, Math.min(8, delta));
  
  // Percentage offset: delta * 5% (ranges from -40% to +40%)
  // Since Team 1 is on the left, positive delta translates to -X% in CSS
  const pixelOffsetPercent = -clampedDelta * 5;

  return (
    <div className="w-full flex-1 px-2 sm:px-6 flex flex-col items-center justify-center select-none">
      {/* Dynamic Horizontal Sleek Bar Track */}
      <div className="relative w-full h-10 flex items-center">
        {/* Background track */}
        <div className="absolute inset-x-0 h-2 bg-slate-700 rounded-full" />
        
        {/* Gradient tension line */}
        <div className="absolute inset-x-0 h-2 bg-gradient-to-r from-blue-500 via-white to-red-500 opacity-60 rounded-full" />

        {/* Center Benchmark line */}
        <div className="absolute left-1/2 w-1 h-9 bg-white/70 -translate-x-1/2 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.9)] z-10 pointer-events-none" />

        {/* Dynamic Moving Knot/Disc Marker */}
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-y-1/2 z-20 pointer-events-none"
          animate={{ x: `${pixelOffsetPercent * 3.5}px` }}
          transition={{ type: 'spring', stiffness: 140, damping: 15 }}
        >
          <div className="w-11 h-11 bg-white rounded-full shadow-[0_0_25px_rgba(255,255,255,0.9)] border-4 border-slate-900 flex items-center justify-center -translate-x-1/2 relative">
            <span className="text-slate-950 text-lg select-none">⛓️</span>
            {/* Hanging red knot tag */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-2.5 h-3 bg-red-600 rounded-b shadow-md" />
          </div>
        </motion.div>

        {/* Left endpoint dot */}
        <div className="absolute left-0 w-3.5 h-3.5 bg-blue-500 rounded-full -translate-x-1/2 shadow-[0_0_10px_rgba(59,130,246,0.9)]" />

        {/* Right endpoint dot */}
        <div className="absolute right-0 w-3.5 h-3.5 bg-red-500 rounded-full translate-x-1/2 shadow-[0_0_10px_rgba(239,68,68,0.9)]" />
      </div>

      {/* Step Indicator Dots & Center Text */}
      <div className="flex justify-between items-center w-full mt-3 px-2">
        {/* Team 1 lead dots */}
        <div className="flex gap-1.5 items-center">
          {[4, 3, 2, 1].map((step) => (
            <div
              key={step}
              className={`w-2 h-2 rounded-full transition-colors ${
                delta >= step ? 'bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.8)]' : 'bg-slate-700'
              }`}
              title={`${team1Name} +${step}`}
            />
          ))}
        </div>

        {/* Center Tension Label */}
        <span className="text-[10px] sm:text-xs font-bold text-slate-400 tracking-wider font-tech uppercase">
          {delta === 0
            ? 'VỊ TRÍ DÂY CÂN BẰNG'
            : delta > 0
              ? `${team1Name} DẪN TRƯỚC (+${delta})`
              : `${team2Name} DẪN TRƯỚC (+${Math.abs(delta)})`}
        </span>

        {/* Team 2 lead dots */}
        <div className="flex gap-1.5 items-center">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`w-2 h-2 rounded-full transition-colors ${
                -delta >= step ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]' : 'bg-slate-700'
              }`}
              title={`${team2Name} +${step}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

