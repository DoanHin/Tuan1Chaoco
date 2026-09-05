import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  ArrowRight, 
  Volume2, 
  Play, 
  Pause, 
  RotateCcw, 
  Mic, 
  UploadCloud, 
  CheckCircle2, 
  BookOpen, 
  Eye, 
  EyeOff,
  ChevronDown,
  FileAudio
} from 'lucide-react';
import { AZeroAvatar } from './AZeroAvatar';
import { VoiceSettingsModal } from './VoiceSettingsModal';
import { AudioUploadModal } from './AudioUploadModal';
import { RulesDisplay } from './RulesDisplay';
import { speechManager } from '../utils/speech';
import { soundManager } from '../utils/sound';
import { audioStorage, StoredAudioMeta } from '../utils/audioStorage';

interface WelcomeScreenProps {
  onStartGame: () => void;
}

// Exact verbatim script aligned with user's recording and requirements
export const WELCOME_SENTENCES = [
  "Xin chào quý thầy cô giáo cùng toàn thể các bạn học sinh Trường Trung học Phổ thông Tô Hiệu!",
  "Các bạn có đoán được mình là ai không nào?",
  "Mình là AZero, một thành viên AI đặc biệt của lớp 11A0, đồng thời cũng là thành viên của câu lạc bộ Robotics.",
  "Mình rất rất vui khi được gặp tất cả mọi người trong chương trình ngày hôm nay!",
  "Trước tiên, chúng ta hãy cùng dành một tràng pháo tay thật to, thật lớn và thật nhiệt tình để cảm ơn hai bạn MC cùng video mở đầu vô cùng hấp dẫn vừa rồi!",
  "Và bây giờ, một thử thách đặc biệt sắp xuất hiện. Một cuộc đối đầu đòi hỏi sự nhanh trí, sự chính xác và tinh thần đồng đội. Đó chính là: Trò chơi Kéo co trí tuệ!",
  "Các bạn đã sẵn sàng chưa nào? Ôi, hình như mình vẫn chưa nghe thấy gì cả. Tất cả các bạn đã sẵn sàng chưa nào?",
  "Tuyệt vời! Năng lượng của các bạn khiến AZero cũng nóng máy rồi đấy! Vậy thì, trước khi cuộc đấu bắt đầu, hãy cùng lắng nghe thật kỹ luật chơi nhé! Luật chơi như sau:",
  "Trên màn hình có 16 ô câu hỏi và hai đội sẽ lần lượt lựa chọn một ô bất kỳ. Sau khi ô được mở, mình sẽ đọc câu hỏi cùng bốn phương án trả lời A, B, C và D.",
  "Mỗi đội hãy thảo luận, sau đó đưa ra đáp án cuối cùng của mình. Với mỗi câu trả lời đúng, đội chơi sẽ kéo được sợi dây về phía mình một bước. Nếu trả lời sai, sợi dây sẽ được giữ nguyên tại vị trí hiện tại.",
  "Sau khi hoàn thành cả 16 câu hỏi, đội nào kéo được sợi dây về phía mình nhiều hơn sẽ giành chiến thắng. Trong trường hợp hai đội có kết quả bằng nhau, chúng ta sẽ bước vào câu hỏi phụ để tìm ra đội chiến thắng chung cuộc.",
  "Các bạn đã hiểu rõ luật chơi chưa nào? Rõ rồi đúng không? Vậy thì hai đội hãy chuẩn bị tinh thần, giữ vững sự tập trung, phối hợp thật ăn ý và đưa ra những đáp án chính xác nhất nhé!",
  "Tất cả đã sẵn sàng, cuộc đấu sắp bắt đầu. Hãy cùng đếm ngược với mình nào: 3... 2... 1... Trò chơi Kéo co trí tuệ chính thức bắt đầu!"
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStartGame }) => {
  const [hasStartedSpeech, setHasStartedSpeech] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isAudioUploadOpen, setIsAudioUploadOpen] = useState(false);
  const [customAudio, setCustomAudio] = useState<{ blob: Blob; meta: StoredAudioMeta } | null>(null);
  const [isPlayingCustomAudio, setIsPlayingCustomAudio] = useState(false);
  const [manualShowRules, setManualShowRules] = useState(false);
  const isMountedRef = useRef(true);

  // Check if custom audio is uploaded in indexedDB
  const refreshCustomAudio = async () => {
    try {
      const stored = await audioStorage.getAudio('intro_audio');
      if (isMountedRef.current) {
        setCustomAudio(stored);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    refreshCustomAudio();

    return () => {
      isMountedRef.current = false;
      speechManager.stop();
      audioStorage.stopPlayback();
    };
  }, []);

  // Determine active rule step based on sentence index or audio timeline
  // Sentence 8 -> Điều 1
  // Sentence 9 -> Điều 2
  // Sentence 10 -> Điều 3
  const getActiveRuleStep = (sentenceIdx: number): number | null => {
    if (sentenceIdx === 8) return 1;
    if (sentenceIdx === 9) return 2;
    if (sentenceIdx === 10) return 3;
    return null;
  };

  // Whether rules board should be shown:
  // Either during sentences 7 -> 10 (when reciting rules) or if user manually toggled it on
  const isReadingRules = hasStartedSpeech && currentSentenceIndex >= 7 && currentSentenceIndex <= 10;
  const isRulesVisible = manualShowRules || isReadingRules;
  const activeRuleStep = getActiveRuleStep(currentSentenceIndex);

  // Start reading automatically without extra clicks
  const startIntroduction = async (fromIndex = 0) => {
    setHasStartedSpeech(true);
    setCurrentSentenceIndex(fromIndex);

    // If custom audio recording is available, play custom audio with synchronized timeline!
    if (customAudio) {
      speechManager.stop();
      setIsPlayingCustomAudio(true);

      audioStorage.playCustomAudio(customAudio.blob, {
        onStart: () => {
          if (isMountedRef.current) setIsPlayingCustomAudio(true);
        },
        onTimeUpdate: (currentTime) => {
          if (!isMountedRef.current) return;
          // Synchronize rules & subtitles with the exact timeline of the audio
          if (currentTime < 7) setCurrentSentenceIndex(0);
          else if (currentTime < 10) setCurrentSentenceIndex(1);
          else if (currentTime < 19) setCurrentSentenceIndex(2);
          else if (currentTime < 24) setCurrentSentenceIndex(3);
          else if (currentTime < 35) setCurrentSentenceIndex(4);
          else if (currentTime < 50) setCurrentSentenceIndex(5);
          else if (currentTime < 61) setCurrentSentenceIndex(6);
          else if (currentTime < 74) setCurrentSentenceIndex(7); // "Luật chơi như sau:"
          else if (currentTime < 94) setCurrentSentenceIndex(8); // Rule 1: 16 ô câu hỏi
          else if (currentTime < 114) setCurrentSentenceIndex(9); // Rule 2: Thảo luận & kéo dây
          else if (currentTime < 142) setCurrentSentenceIndex(10); // Rule 3: 16 câu hỏi & câu hỏi phụ
          else if (currentTime < 156) setCurrentSentenceIndex(11); // Các bạn đã hiểu rõ chưa
          else setCurrentSentenceIndex(12); // Đếm ngược 3 2 1 bắt đầu
        },
        onEnd: () => {
          if (isMountedRef.current) {
            setIsPlayingCustomAudio(false);
            setCurrentSentenceIndex(WELCOME_SENTENCES.length - 1);
          }
        },
        onError: () => {
          if (isMountedRef.current) setIsPlayingCustomAudio(false);
          fallbackSpeechReading(fromIndex);
        }
      });
      return;
    }

    // Default: use Speech Synthesis
    fallbackSpeechReading(fromIndex);
  };

  const fallbackSpeechReading = (fromIndex = 0) => {
    const sentencesToRead = WELCOME_SENTENCES.slice(fromIndex);
    speechManager.speakContinuous(sentencesToRead, {
      onSentenceStart: (idx) => {
        if (isMountedRef.current) {
          setCurrentSentenceIndex(fromIndex + idx);
        }
      },
      onComplete: () => {
        if (isMountedRef.current) {
          setCurrentSentenceIndex(WELCOME_SENTENCES.length - 1);
        }
      }
    });
  };

  const handleMeetAzero = () => {
    soundManager.playClick();
    startIntroduction(0);
  };

  const handleReReadFromStart = () => {
    soundManager.playClick();
    if (customAudio) {
      audioStorage.stopPlayback();
    } else {
      speechManager.stop();
    }
    startIntroduction(0);
  };

  const handleTogglePause = () => {
    soundManager.playClick();
    if (customAudio) {
      if (audioStorage.isPlaying()) {
        audioStorage.pausePlayback();
        setIsPlayingCustomAudio(false);
      } else {
        audioStorage.resumePlayback();
        setIsPlayingCustomAudio(true);
      }
    } else {
      if (speechManager.isSpeaking()) {
        speechManager.pause();
      } else {
        speechManager.resume();
      }
    }
  };

  const isCurrentlySpeaking = customAudio ? isPlayingCustomAudio : speechManager.isSpeaking();
  const currentText = WELCOME_SENTENCES[currentSentenceIndex] || WELCOME_SENTENCES[0];

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-between p-4 sm:p-6 lg:p-8 bg-sleek-radial text-white select-none relative overflow-x-hidden"
      style={{ backgroundImage: 'radial-gradient(circle at 50% 40%, #1e293b 0%, #020617 100%)' }}
    >
      {/* Ambient Cyber Light Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-cyan-600/15 blur-[150px] rounded-full pointer-events-none" />

      {/* Top Header Navigation */}
      <header className="w-full max-w-5xl flex items-center justify-between z-10 pt-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.6)]">
            <div className="w-6 h-4 bg-white rounded-sm relative flex items-center justify-between px-1">
              <div className="w-1.5 h-1.5 bg-slate-900 rounded-full" />
              <div className="w-1.5 h-1.5 bg-slate-900 rounded-full" />
            </div>
          </div>
          <div>
            <span className="text-sm sm:text-base font-tech font-black tracking-wider text-cyan-400 block">
              11A0 - CLB ROBOTICS
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Audio Upload / Management Button */}
          <button
            id="btn-manage-audio"
            onClick={() => setIsAudioUploadOpen(true)}
            className={`px-3 py-1.5 text-xs font-bold rounded-full flex items-center gap-1.5 shadow transition cursor-pointer border ${
              customAudio
                ? 'bg-amber-950/80 hover:bg-amber-900 border-amber-500/50 text-amber-300'
                : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
            title="Quản lý và tải lên file ghi âm AZero"
          >
            <FileAudio className="w-3.5 h-3.5 text-amber-400" />
            <span>File ghi âm</span>
            {customAudio && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Đã có file ghi âm" />
            )}
          </button>

          {/* Rules Quick Toggle Button */}
          <button
            id="btn-toggle-rules"
            onClick={() => setManualShowRules(!manualShowRules)}
            className={`px-3 py-1.5 text-xs font-bold rounded-full flex items-center gap-1.5 shadow transition cursor-pointer border ${
              manualShowRules
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-extrabold'
                : 'bg-slate-800/90 hover:bg-slate-700 border-slate-700 text-cyan-300'
            }`}
            title="Bật/Tắt xem Bảng Luật chơi Kéo co trí tuệ"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{manualShowRules ? 'Đang hiện Luật chơi' : 'Xem Luật chơi'}</span>
          </button>

          {/* Voice Settings modal */}
          <button
            onClick={() => setIsVoiceModalOpen(true)}
            className="px-3 py-1.5 text-xs font-bold bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-cyan-300 rounded-full flex items-center gap-1.5 shadow transition cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5 text-cyan-400" />
            <span>Giọng Adam (Trầm ấm)</span>
          </button>
        </div>
      </header>

      {/* Center Main Stage Content */}
      <main className="w-full max-w-4xl flex flex-col items-center justify-center my-auto z-10 py-2">
        {/* Title */}
        <div className="text-center mb-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 text-xs font-bold uppercase tracking-widest mb-2 shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Sân Khấu Đấu Trí Học Đường</span>
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-blue-400 drop-shadow-sm">
            KÉO CO TRÍ TUỆ
          </h1>
          <p className="mt-1.5 text-sm sm:text-base font-medium text-slate-300">
            Cùng <span className="text-cyan-400 font-bold">AZero</span> tranh tài kiến thức 16 câu hỏi
          </p>
        </div>

        {/* Dynamic 3D Animated AZero Robot Avatar */}
        <div className="my-1">
          <AZeroAvatar
            size={isRulesVisible ? "md" : "lg"}
            showControls={false}
            onOpenVoiceSettings={() => setIsVoiceModalOpen(true)}
          />
        </div>

        {/* Dynamic Rules Board Display (Shown when reading rules or when toggled) */}
        <AnimatePresence>
          {isRulesVisible && (
            <motion.div 
              className="w-full my-3"
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              <RulesDisplay 
                activeRuleStep={activeRuleStep} 
                compact={hasStartedSpeech} 
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* State A: Before user triggers speech */}
        {!hasStartedSpeech ? (
          <motion.div 
            className="mt-4 flex flex-col items-center gap-3 w-full max-w-lg"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            {/* Primary 1-Click Action Button: Chỉ việc bấm là tự động đọc ngay! */}
            <button
              id="btn-meet-azero"
              onClick={handleMeetAzero}
              className="w-full group px-8 sm:px-12 py-4 sm:py-5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white font-extrabold text-xl sm:text-2xl tracking-wide shadow-[0_0_40px_rgba(6,182,212,0.6)] hover:shadow-[0_0_60px_rgba(6,182,212,0.9)] hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center gap-3 border border-cyan-200/40 cursor-pointer"
            >
              <Volume2 className="w-7 h-7 animate-bounce text-cyan-200" />
              <span>GẶP GỠ AZERO</span>
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Options Row */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 text-xs text-slate-300 mt-1">
              <button
                onClick={() => setManualShowRules(!manualShowRules)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-cyan-300 transition cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                <span>{manualShowRules ? 'Đóng luật chơi' : 'Xem trước luật chơi'}</span>
              </button>

              <button
                onClick={() => setIsAudioUploadOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-amber-300 transition cursor-pointer"
                title="Quản lý và tải lên file ghi âm AZero"
              >
                <FileAudio className="w-3.5 h-3.5 text-amber-400" />
                <span>{customAudio ? `Bản ghi âm: ${customAudio.meta.name}` : 'Nạp file ghi âm AZero'}</span>
              </button>
            </div>
          </motion.div>
        ) : (
          /* State B: Live Speech Teleprompter & Subtitles */
          <div className="w-full mt-3 flex flex-col items-center">
            {/* Live Subtitle Box */}
            <div className="w-full bg-slate-900/90 border border-cyan-500/40 rounded-2xl p-4 sm:p-6 shadow-2xl backdrop-blur relative overflow-hidden min-h-[130px] flex flex-col justify-center">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                  <span className="text-xs font-tech font-bold uppercase tracking-wider text-cyan-300">
                    {isPlayingCustomAudio
                      ? 'AZero đang phát bản ghi âm của bạn'
                      : `AZero đang phát biểu (Phần ${currentSentenceIndex + 1}/${WELCOME_SENTENCES.length})`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isReadingRules && (
                    <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-[10px] font-tech font-bold uppercase animate-pulse">
                      ĐANG NÓI VỀ LUẬT CHƠI
                    </span>
                  )}
                  <span className="text-[10px] text-cyan-400 font-mono hidden sm:inline">
                    {isPlayingCustomAudio ? 'Bản ghi âm AZero' : 'Giọng Adam (Trầm ấm)'}
                  </span>
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSentenceIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="text-center my-1"
                >
                  <p className="text-lg sm:text-2xl lg:text-3xl font-extrabold leading-relaxed text-white">
                    &ldquo;<span className="text-cyan-300">{currentText}</span>&rdquo;
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Reading Progress Line */}
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                  style={{ width: `${((currentSentenceIndex + 1) / WELCOME_SENTENCES.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Quick Control Bar during speech */}
            <div className="w-full mt-3 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleReReadFromStart}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Đọc lại từ đầu</span>
                </button>
                <button
                  onClick={handleTogglePause}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1.5 transition cursor-pointer"
                >
                  {isCurrentlySpeaking ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isCurrentlySpeaking ? 'Tạm dừng' : 'Tiếp tục'}</span>
                </button>
                <button
                  onClick={() => setManualShowRules(!manualShowRules)}
                  className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    isRulesVisible
                      ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{isRulesVisible ? 'Thu gọn luật chơi' : 'Hiện luật chơi'}</span>
                </button>
              </div>

              {/* Button: BẮT ĐẦU TRÒ CHƠI */}
              <button
                id="btn-start-game"
                onClick={() => {
                  soundManager.playClick();
                  speechManager.stop();
                  audioStorage.stopPlayback();
                  onStartGame();
                }}
                className="px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm tracking-wider shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-2 cursor-pointer"
              >
                <span>VÀO TRẬN ĐẤU NGAY</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer info */}
      <footer className="w-full max-w-5xl text-center text-xs text-slate-500 border-t border-slate-800/80 pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 z-10">
        <span>Kéo Co Trí Tuệ • 11A0 - CLB Robotics</span>
        <span className="font-tech text-slate-400">16 Câu hỏi • CLB Robotics 11A0</span>
      </footer>

      {/* Voice Settings Modal */}
      <VoiceSettingsModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
      />

      {/* Audio Upload & Live Recording Modal */}
      <AudioUploadModal
        isOpen={isAudioUploadOpen}
        onClose={() => setIsAudioUploadOpen(false)}
        onAudioUpdated={refreshCustomAudio}
      />
    </div>
  );
};
