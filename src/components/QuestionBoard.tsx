import React from 'react';
import { motion } from 'motion/react';
import { Check, Lock } from 'lucide-react';
import { soundManager } from '../utils/sound';

interface QuestionBoardProps {
  openedQuestionIds: number[];
  answeredCorrectMap: Record<number, 1 | 2 | 'wrong'>;
  onSelectQuestion: (questionId: number) => void;
  disabled?: boolean;
}

export const QuestionBoard: React.FC<QuestionBoardProps> = ({
  openedQuestionIds,
  answeredCorrectMap,
  onSelectQuestion,
  disabled = false,
}) => {
  const totalQuestions = 16;
  const questionNumbers = Array.from({ length: totalQuestions }, (_, i) => i + 1);

  const handleClick = (num: number) => {
    if (disabled || openedQuestionIds.includes(num)) return;
    soundManager.playClick();
    onSelectQuestion(num);
  };

  return (
    <div className="w-full bg-slate-900/40 border border-slate-800/80 rounded-2xl p-3 sm:p-4 shadow-xl select-none backdrop-blur-sm">
      {/* 4x4 Grid of Question Tiles matching Sleek Interface */}
      <div className="grid grid-cols-4 gap-2.5 sm:gap-3.5 max-w-2xl mx-auto py-1">
        {questionNumbers.map((num) => {
          const isOpened = openedQuestionIds.includes(num);
          const outcome = answeredCorrectMap[num]; // 1 (team 1 blue), 2 (team 2 red), or 'wrong'
          const formattedNum = num.toString().padStart(2, '0');

          return (
            <motion.button
              key={num}
              id={`tile-question-${num}`}
              onClick={() => handleClick(num)}
              disabled={isOpened || disabled}
              whileHover={!isOpened && !disabled ? { scale: 1.05 } : {}}
              whileTap={!isOpened && !disabled ? { scale: 0.95 } : {}}
              className={`relative rounded-xl sm:rounded-2xl flex flex-col items-center justify-center font-tech transition-all duration-150 h-16 sm:h-20 lg:h-22 shadow-lg shadow-black/40 ${
                isOpened
                  ? outcome === 1
                    ? 'bg-blue-950/40 border border-blue-500/40 text-blue-400/80 cursor-not-allowed shadow-inner'
                    : outcome === 2
                      ? 'bg-red-950/40 border border-red-500/40 text-red-400/80 cursor-not-allowed shadow-inner'
                      : 'bg-slate-900/40 border border-slate-800 text-slate-600 cursor-not-allowed'
                  : 'bg-slate-800/85 border border-slate-600 text-white cursor-pointer hover:bg-cyan-600 hover:border-cyan-400 active:scale-95'
              }`}
            >
              {/* Question Number */}
              <span
                className={`text-2xl sm:text-3xl lg:text-4xl font-black ${
                  isOpened ? 'opacity-30 line-through decoration-slate-600' : 'text-white drop-shadow'
                }`}
              >
                {formattedNum}
              </span>

              {/* Status Badge when opened */}
              {isOpened && (
                <div className="absolute bottom-1 flex items-center justify-center">
                  {outcome === 1 ? (
                    <span className="text-[9px] font-bold text-blue-300 bg-blue-900/70 border border-blue-500/30 px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                      <span>Đội 1</span>
                    </span>
                  ) : outcome === 2 ? (
                    <span className="text-[9px] font-bold text-red-300 bg-red-900/70 border border-red-500/30 px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                      <span>Đội 2</span>
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold text-slate-500 bg-slate-800/80 px-1.5 py-0.2 rounded-full">
                      Hết lượt
                    </span>
                  )}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Helper footer */}
      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Đội 1 đúng (+1)
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block ml-3" /> Đội 2 đúng (+1)
        </span>
        <span className="font-tech text-cyan-400">16 ô câu hỏi trí tuệ</span>
      </div>
    </div>
  );
};
