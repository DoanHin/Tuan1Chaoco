import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { Trophy, Sparkles, RotateCcw, HelpCircle, Bot, Medal } from 'lucide-react';
import { AZeroAvatar } from './AZeroAvatar';
import { speechManager } from '../utils/speech';
import { soundManager } from '../utils/sound';

interface GameOverModalProps {
  team1Name: string;
  team2Name: string;
  team1Score: number;
  team2Score: number;
  onOpenTieBreaker: () => void;
  onResetGame: () => void;
  tieBreakerResolvedWinner?: 1 | 2 | null;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  team1Name,
  team2Name,
  team1Score,
  team2Score,
  onOpenTieBreaker,
  onResetGame,
  tieBreakerResolvedWinner,
}) => {
  const isTie = team1Score === team2Score && !tieBreakerResolvedWinner;
  const winnerTeamId: 1 | 2 | null = tieBreakerResolvedWinner 
    ? tieBreakerResolvedWinner 
    : team1Score > team2Score 
      ? 1 
      : team2Score > team1Score 
        ? 2 
        : null;

  const winnerName = winnerTeamId === 1 ? team1Name : winnerTeamId === 2 ? team2Name : '';
  const winnerScore = winnerTeamId === 1 ? team1Score : winnerTeamId === 2 ? team2Score : 0;
  const isMountedRef = useRef<boolean>(true);
  const [currentSpeechText, setCurrentSpeechText] = useState<string>('');

  useEffect(() => {
    isMountedRef.current = true;

    if (!isTie && winnerTeamId) {
      // Fanfare sound
      soundManager.playVictoryFanfare();

      // Multi-wave confetti cannon
      const count = 200;
      const defaults = { origin: { y: 0.7 } };

      const fire = (particleRatio: number, opts: confetti.Options) => {
        try {
          confetti({
            ...defaults,
            ...opts,
            particleCount: Math.floor(count * particleRatio)
          });
        } catch {
          // fallback
        }
      };

      fire(0.25, { spread: 26, startVelocity: 55 });
      fire(0.2, { spread: 60 });
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
      fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
      fire(0.1, { spread: 120, startVelocity: 45 });

      // Sequence of speech:
      // 1. Announce winner
      const speechWinner = `Trò chơi Kéo co trí tuệ đã chính thức khép lại! Với ${winnerScore} câu trả lời chính xác, xin chúc mừng đội ${winnerName} đã xuất sắc giành chiến thắng ngày hôm nay! Một tràng pháo tay thật lớn dành cho đội chiến thắng!`;
      // 2. Concluding speech
      const speechClosing = `Cảm ơn cả hai đội đã tham gia trò chơi hết sức nhiệt tình và mang đến những màn tranh tài vô cùng hấp dẫn. AZero xin cảm ơn quý thầy cô giáo cùng toàn thể các bạn học sinh đã theo dõi và cổ vũ. Và bây giờ, AZero xin được nhường lại sân khấu cho hai bạn MC. Xin trân trọng cảm ơn!`;

      setCurrentSpeechText(speechWinner);
      speechManager.speakSequence([
        {
          text: speechWinner,
          rate: 0.9,
          delayAfter: 1000,
          onStep: () => {
            if (isMountedRef.current) setCurrentSpeechText(speechWinner);
          }
        },
        {
          text: speechClosing,
          rate: 0.9,
          delayAfter: 500,
          onStep: () => {
            if (isMountedRef.current) setCurrentSpeechText(speechClosing);
          }
        }
      ]);
    } else if (isTie) {
      // Tied speech
      const speechTie = `Thật bất ngờ! Sau 16 câu hỏi, hai đội đang có số câu trả lời đúng bằng nhau. Chúng ta sẽ cần một câu hỏi phụ để tìm ra đội chiến thắng chung cuộc!`;
      setCurrentSpeechText(speechTie);
      speechManager.speak(speechTie, { rate: 0.9 });
    }

    return () => {
      isMountedRef.current = false;
      speechManager.stop();
    };
  }, [isTie, winnerTeamId, winnerName, winnerScore]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl select-none overflow-y-auto">
      <div className="w-full max-w-4xl bg-slate-900 border-2 border-amber-400/40 rounded-3xl p-6 sm:p-10 shadow-[0_0_80px_rgba(251,191,36,0.3)] relative text-center my-auto">
        {/* Subtle Ambient lights */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 bg-amber-500/20 blur-3xl rounded-full pointer-events-none" />

        {/* Mascot */}
        <div className="flex justify-center mb-4">
          <AZeroAvatar
            size="lg"
            showControls={true}
            isCelebrating={!isTie}
            speechTextToReplay={currentSpeechText}
          />
        </div>

        {/* Status Header */}
        {!isTie && winnerTeamId ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 15 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-tech font-bold text-xs uppercase tracking-widest mb-3">
              <Trophy className="w-4 h-4 text-amber-400 fill-current" />
              <span>CÔNG BỐ CHIẾN THẮNG CHUNG CUỘC</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-100 to-amber-500 drop-shadow-md tracking-tight">
              ĐỘI {winnerName.toUpperCase()} CHIẾN THẮNG!
            </h1>

            <p className="mt-2 text-lg text-slate-300">
              Xuất sắc đạt được <span className="text-amber-400 font-extrabold text-2xl">{winnerScore}</span> câu trả lời chính xác
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 font-tech font-bold text-xs uppercase tracking-widest mb-3">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>BẤT PHÂN THẮNG BẠI</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-cyan-300 tracking-tight">
              KẾT QUẢ HÒA: {team1Score} - {team2Score}
            </h1>

            <p className="mt-2 text-lg text-slate-300">
              Hai đội đang có số câu trả lời đúng bằng nhau! Cần bước vào câu hỏi phụ.
            </p>
          </motion.div>
        )}

        {/* Score Comparison Cards */}
        <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto my-6">
          {/* Team 1 */}
          <div className={`p-4 rounded-2xl border ${
            winnerTeamId === 1 
              ? 'bg-blue-950/80 border-amber-400 ring-2 ring-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.3)]' 
              : 'bg-slate-950/60 border-slate-800'
          }`}>
            <span className="text-xs font-bold text-blue-400 block">{team1Name}</span>
            <span className="text-3xl font-tech font-black text-white">{team1Score} câu</span>
            {winnerTeamId === 1 && (
              <span className="text-[11px] text-amber-400 font-bold block mt-1">★ Quán quân</span>
            )}
          </div>

          {/* Team 2 */}
          <div className={`p-4 rounded-2xl border ${
            winnerTeamId === 2 
              ? 'bg-rose-950/80 border-amber-400 ring-2 ring-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.3)]' 
              : 'bg-slate-950/60 border-slate-800'
          }`}>
            <span className="text-xs font-bold text-rose-400 block">{team2Name}</span>
            <span className="text-3xl font-tech font-black text-white">{team2Score} câu</span>
            {winnerTeamId === 2 && (
              <span className="text-[11px] text-amber-400 font-bold block mt-1">★ Quán quân</span>
            )}
          </div>
        </div>

        {/* Speech dialogue quote */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 max-w-2xl mx-auto mb-6 text-sm sm:text-base text-cyan-200 font-medium italic">
          &ldquo;{currentSpeechText}&rdquo;
        </div>

        {/* Actions Button */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          {/* If tie: CÂU HỎI PHỤ button */}
          {isTie && (
            <button
              id="btn-tiebreaker-question"
              onClick={() => {
                soundManager.playClick();
                speechManager.stop();
                onOpenTieBreaker();
              }}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-lg shadow-xl shadow-amber-500/30 active:scale-95 transition flex items-center gap-2 cursor-pointer"
            >
              <HelpCircle className="w-6 h-6" />
              <span>MỞ CÂU HỎI PHỤ</span>
            </button>
          )}

          {/* Reset Game button */}
          <button
            id="btn-reset-game-over"
            onClick={onResetGame}
            className="px-6 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-base border border-slate-700 active:scale-95 transition flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Chơi Lượt Mới</span>
          </button>
        </div>
      </div>
    </div>
  );
};
