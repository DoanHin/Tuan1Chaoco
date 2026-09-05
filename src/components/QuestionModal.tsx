import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Check, X, ArrowLeft, RotateCcw, Sparkles, Volume2, VolumeX, HelpCircle } from 'lucide-react';
import { Question } from '../types';
import { AZeroAvatar } from './AZeroAvatar';
import { speechManager } from '../utils/speech';
import { soundManager } from '../utils/sound';

interface QuestionModalProps {
  question: Question;
  currentTeamName: string;
  currentTeamId: 1 | 2;
  onAnswerResult: (wasCorrect: boolean) => void;
  onClose: () => void;
}

const OPTION_THEMES = {
  A: {
    badge: 'bg-cyan-500 text-slate-950',
    border: 'border-cyan-500/40 hover:border-cyan-400',
    glow: 'rgba(6, 182, 212, 0.4)',
    activeBorder: 'border-cyan-400 ring-2 ring-cyan-400/50',
  },
  B: {
    badge: 'bg-amber-500 text-slate-950',
    border: 'border-amber-500/40 hover:border-amber-400',
    glow: 'rgba(245, 158, 11, 0.4)',
    activeBorder: 'border-amber-400 ring-2 ring-amber-400/50',
  },
  C: {
    badge: 'bg-emerald-500 text-slate-950',
    border: 'border-emerald-500/40 hover:border-emerald-400',
    glow: 'rgba(16, 185, 129, 0.4)',
    activeBorder: 'border-emerald-400 ring-2 ring-emerald-400/50',
  },
  D: {
    badge: 'bg-purple-500 text-slate-950',
    border: 'border-purple-500/40 hover:border-purple-400',
    glow: 'rgba(168, 85, 247, 0.4)',
    activeBorder: 'border-purple-400 ring-2 ring-purple-400/50',
  },
} as const;

export const QuestionModal: React.FC<QuestionModalProps> = ({
  question,
  currentTeamName,
  currentTeamId,
  onAnswerResult,
  onClose,
}) => {
  // Option being spoken by AZero: 'Q' | 'A' | 'B' | 'C' | 'D' | null
  const [activeReadingKey, setActiveReadingKey] = useState<'Q' | 'A' | 'B' | 'C' | 'D' | null>('Q');
  // Selected option by team / MC
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [resultOutcome, setResultOutcome] = useState<'correct' | 'wrong' | null>(null);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  const CORRECT_PHRASES = [
    `Chính xác! Xin chúc mừng ${currentTeamName}!`,
    `Hoàn toàn chính xác! Một bước kéo dành cho ${currentTeamName}!`,
    `Rất xuất sắc! ${currentTeamName} đã ghi thêm một điểm!`
  ];

  const WRONG_PHRASES = [
    "Rất tiếc, đáp án chưa chính xác!",
    "Chưa đúng rồi! Nhưng hai đội đã rất nỗ lực!",
    "Đáp án chưa chính xác, sợi dây giữ nguyên vị trí!"
  ];

  useEffect(() => {
    isMountedRef.current = true;
    speechManager.setMute(false); // Ensure audio is active

    // Slight delay after modal transition to guarantee browser SpeechSynthesis trigger
    const startTimer = window.setTimeout(() => {
      if (isMountedRef.current) {
        startQuestionReading();
      }
    }, 120);

    // Keyboard shortcuts for options A, B, C, D and MC keys
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(key)) {
        if (resultOutcome === null) {
          handleSelectOption(key as 'A' | 'B' | 'C' | 'D');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(startTimer);
      window.removeEventListener('keydown', handleKeyDown);
      isMountedRef.current = false;
      speechManager.stop();
    };
  }, [question.id]);

  const startQuestionReading = () => {
    setActiveReadingKey('Q');
    setResultOutcome(null);

    const questionPrefix = question.isTieBreaker ? "Câu hỏi phụ: " : `Câu hỏi số ${question.id}: `;
    const sequence = [
      {
        text: `${questionPrefix} ${question.question}`,
        rate: 0.95,
        delayAfter: 350,
        onStep: () => {
          if (isMountedRef.current) setActiveReadingKey('Q');
        }
      },
      {
        text: `Phương án A: ${question.options.A}.`,
        rate: 0.95,
        delayAfter: 300,
        onStep: () => {
          if (isMountedRef.current) setActiveReadingKey('A');
        }
      },
      {
        text: `Phương án B: ${question.options.B}.`,
        rate: 0.95,
        delayAfter: 300,
        onStep: () => {
          if (isMountedRef.current) setActiveReadingKey('B');
        }
      },
      {
        text: `Phương án C: ${question.options.C}.`,
        rate: 0.95,
        delayAfter: 300,
        onStep: () => {
          if (isMountedRef.current) setActiveReadingKey('C');
        }
      },
      {
        text: `Phương án D: ${question.options.D}.`,
        rate: 0.95,
        delayAfter: 300,
        onStep: () => {
          if (isMountedRef.current) setActiveReadingKey('D');
        }
      }
    ];

    speechManager.speakSequence(sequence, () => {
      if (isMountedRef.current) {
        setActiveReadingKey(null);
      }
    });
  };

  const stopReading = () => {
    speechManager.stop();
    setActiveReadingKey(null);
  };

  const readQuestionOnly = () => {
    speechManager.stop();
    setActiveReadingKey('Q');
    const questionPrefix = question.isTieBreaker ? "Câu hỏi phụ: " : `Câu hỏi số ${question.id}: `;
    speechManager.speak(`${questionPrefix} ${question.question}`, {
      onEnd: () => {
        if (isMountedRef.current) {
          setActiveReadingKey(null);
        }
      }
    });
  };

  const handleSelectOption = (key: 'A' | 'B' | 'C' | 'D') => {
    if (resultOutcome !== null) return;
    soundManager.playClick();
    setSelectedOption(key);
  };

  const handleOperatorCorrect = () => {
    if (resultOutcome !== null) return;
    soundManager.playCorrect();
    setResultOutcome('correct');
    setShowExplanation(true);

    try {
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 }
      });
    } catch {
      // Fallback
    }

    const phrase = CORRECT_PHRASES[Math.floor(Math.random() * CORRECT_PHRASES.length)];
    speechManager.speak(phrase);
    onAnswerResult(true);
  };

  const handleOperatorWrong = () => {
    if (resultOutcome !== null) return;
    soundManager.playWrong();
    setResultOutcome('wrong');
    setShowExplanation(true);

    const phrase = WRONG_PHRASES[Math.floor(Math.random() * WRONG_PHRASES.length)];
    speechManager.speak(phrase);
    onAnswerResult(false);
  };

  const optionKeys = ['A', 'B', 'C', 'D'] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/95 backdrop-blur-md select-none overflow-y-auto">
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 120 }}
        className="w-full max-w-5xl bg-slate-900 border-2 border-cyan-500/40 rounded-3xl p-5 sm:p-7 shadow-[0_0_60px_rgba(6,182,212,0.3)] relative flex flex-col justify-between my-auto"
      >
        {/* Top Bar: Question badge & Active Team info */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <span className={`px-4 py-1.5 rounded-xl font-tech font-black text-sm sm:text-base shadow-lg ${
              question.isTieBreaker
                ? 'bg-amber-500 text-slate-950'
                : 'bg-cyan-500 text-slate-950'
            }`}>
              {question.isTieBreaker ? 'CÂU HỎI PHỤ' : `CÂU SỐ ${question.id}`}
            </span>

            {/* Current Team Turn Pill */}
            <span className={`px-4 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border shadow-sm ${
              currentTeamId === 1 
                ? 'bg-blue-950 border-blue-400 text-blue-300' 
                : 'bg-rose-950 border-rose-400 text-rose-300'
            }`}>
              <span className={`w-2 h-2 rounded-full ${currentTeamId === 1 ? 'bg-blue-400' : 'bg-rose-400'} animate-ping`} />
              <span>Lượt trả lời: {currentTeamName}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {activeReadingKey !== null ? (
              <button
                id="btn-stop-reading"
                onClick={stopReading}
                className="px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-xs font-bold flex items-center gap-1.5 border border-rose-500/50 transition cursor-pointer"
                title="Tạm dừng đọc âm thanh"
              >
                <VolumeX className="w-3.5 h-3.5" />
                <span>Dừng đọc</span>
              </button>
            ) : null}

            <button
              id="btn-read-question-only"
              onClick={readQuestionOnly}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
              title="Chỉ đọc nội dung câu hỏi"
            >
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Chỉ đọc câu hỏi</span>
            </button>

            <button
              id="btn-reread-question"
              onClick={startQuestionReading}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
              title="Đọc lại toàn bộ câu hỏi và 4 phương án A, B, C, D"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Đọc toàn bộ</span>
            </button>
          </div>
        </div>

        {/* Center: AZero Robot & Question Box */}
        <div className="my-4 flex flex-col md:flex-row items-center gap-5">
          <div className="shrink-0 flex flex-col items-center">
            <AZeroAvatar
              size="md"
              showControls={false}
              isCelebrating={resultOutcome === 'correct'}
            />
          </div>

          <div className="grow w-full">
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-inner">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-tech font-bold uppercase tracking-wider text-cyan-400">
                  NỘI DUNG CÂU HỎI
                </span>
                <div className="flex items-center gap-2">
                  <button
                    id="btn-listen-question-card"
                    onClick={readQuestionOnly}
                    className="text-xs text-cyan-300 hover:text-cyan-200 font-semibold flex items-center gap-1.5 bg-cyan-950/70 hover:bg-cyan-900/80 px-3 py-1 rounded-full border border-cyan-600/50 transition cursor-pointer shadow-sm"
                    title="Bấm để nghe AZero đọc câu hỏi này"
                  >
                    <Volume2 className={`w-3.5 h-3.5 ${activeReadingKey === 'Q' ? 'animate-bounce text-cyan-300' : 'text-cyan-400'}`} />
                    <span>{activeReadingKey === 'Q' ? 'AZero đang đọc...' : 'Nghe đọc câu hỏi'}</span>
                  </button>
                </div>
              </div>
              <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white leading-relaxed">
                {question.question}
              </p>
            </div>
          </div>
        </div>

        {/* 4 Options Grid (A, B, C, D) - ALWAYS 100% VISIBLE, CLEAR, AND PROMINENT */}
        <div className="my-2">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>4 PHƯƠNG ÁN TRẢ LỜI:</span>
              <span className="text-[11px] text-cyan-400 font-mono font-normal">(Bấm để chọn hoặc phím A, B, C, D)</span>
            </span>
            {selectedOption && (
              <span className="text-xs font-bold text-amber-300 bg-amber-950/60 px-3 py-0.5 rounded-full border border-amber-500/40">
                Đội chọn: Phương án {selectedOption}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {optionKeys.map((key) => {
              const theme = OPTION_THEMES[key];
              const isSelected = selectedOption === key;
              const isBeingRead = activeReadingKey === key;
              const isCorrectAnswer = resultOutcome !== null && question.correctAnswer === key;
              const isWrongSelection = resultOutcome === 'wrong' && isSelected && question.correctAnswer !== key;

              return (
                <div
                  key={key}
                  onClick={() => handleSelectOption(key)}
                  className={`p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 flex items-center gap-4 cursor-pointer relative ${
                    isCorrectAnswer
                      ? 'bg-emerald-950/90 border-emerald-400 text-emerald-100 shadow-[0_0_25px_rgba(16,185,129,0.5)] ring-2 ring-emerald-400'
                      : isWrongSelection
                        ? 'bg-rose-950/90 border-rose-500 text-rose-100 shadow-[0_0_25px_rgba(244,63,94,0.4)]'
                        : isSelected
                          ? `${theme.activeBorder} bg-slate-800/95 text-white shadow-lg`
                          : isBeingRead
                            ? 'bg-cyan-950/40 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                            : `bg-slate-800/80 ${theme.border} text-slate-100 shadow-md hover:bg-slate-800`
                  }`}
                >
                  {/* Option Badge (A, B, C, D) */}
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-tech font-black text-xl shrink-0 shadow-md ${
                    isCorrectAnswer
                      ? 'bg-emerald-400 text-slate-950'
                      : isWrongSelection
                        ? 'bg-rose-500 text-white'
                        : theme.badge
                  }`}>
                    {key}
                  </div>

                  {/* Option Text - Crisp, Large, and Prominent */}
                  <div className="grow">
                    <span className="text-lg sm:text-xl font-bold leading-snug block">
                      {question.options[key]}
                    </span>
                  </div>

                  {/* Right Status Indicator */}
                  {isCorrectAnswer && (
                    <div className="shrink-0 flex items-center gap-1 bg-emerald-500 text-slate-950 text-xs font-black px-2.5 py-1 rounded-lg">
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>ĐÚNG</span>
                    </div>
                  )}

                  {isWrongSelection && (
                    <div className="shrink-0 flex items-center gap-1 bg-rose-600 text-white text-xs font-black px-2.5 py-1 rounded-lg">
                      <X className="w-4 h-4 stroke-[3]" />
                      <span>SAI</span>
                    </div>
                  )}

                  {isBeingRead && !resultOutcome && (
                    <div className="shrink-0 text-cyan-400 flex items-center gap-1">
                      <Volume2 className="w-4 h-4 animate-bounce" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Banner: Current Team Prompt */}
        {!resultOutcome && (
          <div className="my-2 text-center">
            <div className={`inline-flex items-center gap-2 px-5 py-1.5 rounded-xl border text-sm font-extrabold shadow-md ${
              currentTeamId === 1
                ? 'bg-blue-950/80 border-blue-500 text-blue-200'
                : 'bg-rose-950/80 border-rose-500 text-rose-200'
            }`}>
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Đội {currentTeamName} hãy hội ý và công bố đáp án (A, B, C, D)!</span>
            </div>
          </div>
        )}

        {/* Result Feedback Banner */}
        {resultOutcome && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`p-3.5 rounded-2xl text-center my-2 border flex items-center justify-center gap-3 font-black text-lg sm:text-xl ${
              resultOutcome === 'correct'
                ? 'bg-emerald-950/90 border-emerald-400 text-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.5)]'
                : 'bg-rose-950/90 border-rose-500 text-rose-300'
            }`}
          >
            {resultOutcome === 'correct' ? (
              <>
                <Check className="w-7 h-7 text-emerald-400" />
                <span>CHÍNH XÁC! DÂY KÉO VỀ ĐỘI {currentTeamName.toUpperCase()} (+1 ĐIỂM)</span>
              </>
            ) : (
              <>
                <X className="w-7 h-7 text-rose-400" />
                <span>CHƯA CHÍNH XÁC! DÂY GIỮ NGUYÊN VỊ TRÍ • ĐÁP ÁN ĐÚNG LÀ: {question.correctAnswer}</span>
              </>
            )}
          </motion.div>
        )}

        {/* Optional Explanation */}
        {showExplanation && question.explanation && (
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 text-xs sm:text-sm my-1.5">
            <span className="font-bold text-amber-400">💡 Giải thích: </span>
            {question.explanation}
          </div>
        )}

        {/* Bottom Control Bar: MC Decision Buttons & Back to Board */}
        <div className="mt-3 pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* MC Controls */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-tech text-slate-400 font-bold uppercase tracking-wider hidden md:inline">
              MC ĐIỀU KHIỂN:
            </span>

            {/* ĐÚNG ✓ */}
            <button
              id="btn-answer-correct"
              onClick={handleOperatorCorrect}
              disabled={resultOutcome !== null}
              className={`px-6 py-2.5 rounded-xl font-black text-base flex items-center gap-2 transition-all shadow-lg ${
                resultOutcome === 'correct'
                  ? 'bg-emerald-600 text-white ring-4 ring-emerald-400 cursor-default'
                  : resultOutcome === 'wrong'
                    ? 'bg-slate-800 text-slate-600 opacity-40 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white shadow-emerald-600/40 cursor-pointer'
              }`}
            >
              <Check className="w-5 h-5 stroke-[3]" />
              <span>ĐÚNG (Phím 1)</span>
            </button>

            {/* SAI ✕ */}
            <button
              id="btn-answer-wrong"
              onClick={handleOperatorWrong}
              disabled={resultOutcome !== null}
              className={`px-6 py-2.5 rounded-xl font-black text-base flex items-center gap-2 transition-all shadow-lg ${
                resultOutcome === 'wrong'
                  ? 'bg-rose-600 text-white ring-4 ring-rose-400 cursor-default'
                  : resultOutcome === 'correct'
                    ? 'bg-slate-800 text-slate-600 opacity-40 cursor-not-allowed'
                    : 'bg-rose-600 hover:bg-rose-500 active:scale-95 text-white shadow-rose-600/40 cursor-pointer'
              }`}
            >
              <X className="w-5 h-5 stroke-[3]" />
              <span>SAI (Phím 2)</span>
            </button>
          </div>

          {/* Return to Board */}
          <button
            id="btn-return-board"
            onClick={() => {
              soundManager.playClick();
              speechManager.stop();
              onClose();
            }}
            className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-slate-950 font-black text-sm flex items-center gap-2 shadow-lg shadow-cyan-500/30 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>TRỞ LẠI BẢNG CÂU HỎI</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
