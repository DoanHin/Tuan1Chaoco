import React, { useState, useEffect } from 'react';
import { 
  Maximize, 
  Minimize, 
  Music, 
  RotateCcw, 
  Undo2, 
  Users, 
  Sparkles, 
  AlertTriangle,
  Bot,
  Play,
  Pause,
  Volume2,
  Mic,
  UploadCloud,
  BookOpen
} from 'lucide-react';
import { GameScreen, Question, HistoryAction } from './types';
import { questions, tieBreakerQuestion } from './data/questions';
import { soundManager } from './utils/sound';
import { speechManager } from './utils/speech';

import { WelcomeScreen } from './components/WelcomeScreen';
import { TeamSetupModal } from './components/TeamSetupModal';
import { TeamCard } from './components/TeamCard';
import { TugOfWarRope } from './components/TugOfWarRope';
import { QuestionBoard } from './components/QuestionBoard';
import { QuestionModal } from './components/QuestionModal';
import { GameOverModal } from './components/GameOverModal';
import { AZeroAvatar } from './components/AZeroAvatar';
import { VoiceSettingsModal } from './components/VoiceSettingsModal';
import { AudioUploadModal } from './components/AudioUploadModal';
import { RulesDisplay } from './components/RulesDisplay';

export default function App() {
  // Screen Phase
  const [screen, setScreen] = useState<GameScreen>('welcome');

  // Teams State
  const [team1Name, setTeam1Name] = useState<string>('Đội Xanh');
  const [team2Name, setTeam2Name] = useState<string>('Đội Đỏ');
  const [team1Score, setTeam1Score] = useState<number>(0);
  const [team2Score, setTeam2Score] = useState<number>(0);
  const [currentTurn, setCurrentTurn] = useState<1 | 2>(1);

  // Questions State
  const [openedQuestionIds, setOpenedQuestionIds] = useState<number[]>([]);
  const [answeredCorrectMap, setAnsweredCorrectMap] = useState<Record<number, 1 | 2 | 'wrong'>>({});
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);

  // Pulling visual effect trigger
  const [activePullingTeam, setActivePullingTeam] = useState<1 | 2 | null>(null);

  // History stack for Undo
  const [history, setHistory] = useState<HistoryAction[]>([]);

  // Modals
  const [showTeamSetup, setShowTeamSetup] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [showVoiceModal, setShowVoiceModal] = useState<boolean>(false);
  const [showAudioModal, setShowAudioModal] = useState<boolean>(false);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isBgmOn, setIsBgmOn] = useState<boolean>(false);
  const [tieBreakerWinner, setTieBreakerWinner] = useState<1 | 2 | null>(null);

  // Track Fullscreen state changes
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Check if all 16 questions are completed
  useEffect(() => {
    if (screen === 'board' && openedQuestionIds.length === 16 && !activeQuestion) {
      // Transition to game over screen
      const timer = setTimeout(() => {
        setScreen('game_over');
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [openedQuestionIds, screen, activeQuestion]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    soundManager.playClick();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Music toggle
  const toggleBgm = () => {
    const isPlaying = soundManager.toggleBgm();
    setIsBgmOn(isPlaying);
  };

  // Start game from Welcome screen
  const handleStartGame = () => {
    setShowTeamSetup(true);
  };

  // Save Team Setup
  const handleSaveTeamSetup = (t1: string, t2: string, firstTurn: 1 | 2) => {
    setTeam1Name(t1);
    setTeam2Name(t2);
    setCurrentTurn(firstTurn);
    setShowTeamSetup(false);
    setScreen('board');
  };

  // Open a question
  const handleSelectQuestion = (qId: number) => {
    const found = questions.find(q => q.id === qId);
    if (found) {
      setActiveQuestion(found);
    }
  };

  // MC records answer result (ĐÚNG or SAI)
  const handleAnswerResult = (wasCorrect: boolean) => {
    if (!activeQuestion) return;

    const qId = activeQuestion.id;
    const isTieBreaker = activeQuestion.isTieBreaker;

    // Record undo history
    setHistory(prev => [
      ...prev,
      {
        questionId: qId,
        teamId: currentTurn,
        wasCorrect,
        prevTeam1Score: team1Score,
        prevTeam2Score: team2Score,
        prevTurn: currentTurn,
      }
    ]);

    if (wasCorrect) {
      // Award score to current team
      if (currentTurn === 1) {
        setTeam1Score(prev => prev + 1);
      } else {
        setTeam2Score(prev => prev + 1);
      }

      // Trigger pulling animation
      setActivePullingTeam(currentTurn);
      setTimeout(() => setActivePullingTeam(null), 2500);

      // Record in map
      if (!isTieBreaker) {
        setAnsweredCorrectMap(prev => ({ ...prev, [qId]: currentTurn }));
      } else {
        setTieBreakerWinner(currentTurn);
      }
    } else {
      if (!isTieBreaker) {
        setAnsweredCorrectMap(prev => ({ ...prev, [qId]: 'wrong' }));
      }
    }

    if (!isTieBreaker) {
      setOpenedQuestionIds(prev => prev.includes(qId) ? prev : [...prev, qId]);
    }
  };

  // Close question modal & automatically alternate turn
  const handleCloseQuestionModal = () => {
    const wasTieBreaker = activeQuestion?.isTieBreaker;
    setActiveQuestion(null);

    // Alternate turn to the other team
    setCurrentTurn(prev => (prev === 1 ? 2 : 1));

    if (wasTieBreaker) {
      setScreen('game_over');
    }
  };

  // Open Tie-breaker question
  const handleOpenTieBreaker = () => {
    setActiveQuestion(tieBreakerQuestion);
  };

  // Undo last action
  const handleUndo = () => {
    if (history.length === 0) return;
    soundManager.playClick();
    const lastAction = history[history.length - 1];

    // Revert scores
    setTeam1Score(lastAction.prevTeam1Score);
    setTeam2Score(lastAction.prevTeam2Score);
    setCurrentTurn(lastAction.prevTurn);

    // Remove from opened questions
    setOpenedQuestionIds(prev => prev.filter(id => id !== lastAction.questionId));
    setAnsweredCorrectMap(prev => {
      const next = { ...prev };
      delete next[lastAction.questionId];
      return next;
    });

    // Pop history
    setHistory(prev => prev.slice(0, prev.length - 1));
  };

  // Keyboard Shortcuts for MC Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) {
        return;
      }

      if (e.key === '1') {
        if (activeQuestion) {
          e.preventDefault();
          handleAnswerResult(true);
        }
      } else if (e.key === '2') {
        if (activeQuestion) {
          e.preventDefault();
          handleAnswerResult(false);
        }
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeQuestion, currentTurn, team1Score, team2Score, history]);

  // Reset entire game with confirmation
  const handleConfirmReset = () => {
    soundManager.playClick();
    speechManager.stop();
    setTeam1Score(0);
    setTeam2Score(0);
    setOpenedQuestionIds([]);
    setAnsweredCorrectMap({});
    setActiveQuestion(null);
    setHistory([]);
    setActivePullingTeam(null);
    setTieBreakerWinner(null);
    setShowResetConfirm(false);
    setScreen('welcome');
  };

  // Render Welcome Screen
  if (screen === 'welcome') {
    return (
      <>
        <WelcomeScreen onStartGame={handleStartGame} />
        {showTeamSetup && (
          <TeamSetupModal
            team1Name={team1Name}
            team2Name={team2Name}
            firstTurn={currentTurn}
            onSave={handleSaveTeamSetup}
            onCancel={() => setShowTeamSetup(false)}
          />
        )}
      </>
    );
  }

  return (
    <div
      className="h-screen w-full overflow-hidden flex flex-col font-sans bg-sleek-radial text-white relative select-none"
      style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #1e293b 0%, #020617 100%)' }}
    >
      {/* Sleek Interface Header */}
      <header className="h-16 flex items-center justify-between px-4 sm:px-8 bg-slate-900/50 border-b border-slate-700 shadow-xl backdrop-blur-md z-30">
        {/* Left: Robot icon & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)]">
            <div className="w-6 h-4 bg-white rounded-sm relative flex items-center justify-between px-1">
              <div className="w-1.5 h-1.5 bg-slate-900 rounded-full" />
              <div className="w-1.5 h-1.5 bg-slate-900 rounded-full" />
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 uppercase">
            KÉO CO TRÍ TUỆ
          </h1>
        </div>

        {/* Right: System badge and action buttons */}
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="text-xs font-mono text-cyan-400 bg-cyan-950/30 px-3 py-1 rounded-full border border-cyan-800 hidden md:block">
            11A0 - CLB Robotics
          </div>
          <div className="flex items-center gap-2">
            <button
              id="btn-show-rules-header"
              onClick={() => setShowRulesModal(true)}
              className="px-3 sm:px-3.5 py-1.5 text-xs font-bold bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 rounded-md shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              title="Xem lại luật chơi Kéo co trí tuệ"
            >
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span>LUẬT CHƠI</span>
            </button>
            <button
              id="btn-upload-audio-header"
              onClick={() => setShowAudioModal(true)}
              className="px-3 sm:px-3.5 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 border border-amber-500/40 text-amber-300 rounded-md shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              title="Tải lên tệp ghi âm hoặc thu âm trực tiếp bằng micro"
            >
              <UploadCloud className="w-3.5 h-3.5 text-amber-400" />
              <span>GHI ÂM</span>
            </button>
            <button
              id="btn-voice-settings"
              onClick={() => setShowVoiceModal(true)}
              className="px-3 sm:px-3.5 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 border border-cyan-500/40 text-cyan-300 rounded-md shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              title="Cài đặt giọng đọc Adam (AI)"
            >
              <Mic className="w-3.5 h-3.5 text-cyan-400" />
              <span>GIỌNG ADAM</span>
            </button>
            <button
              id="btn-edit-teams"
              onClick={() => setShowTeamSetup(true)}
              className="px-3 sm:px-4 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-md font-bold text-slate-200 shadow-sm transition"
            >
              HƯỚNG DẪN / ĐỔI TÊN
            </button>
            <button
              id="btn-toggle-bgm"
              onClick={toggleBgm}
              className={`px-3 py-1.5 text-xs font-bold rounded-md border transition hidden sm:inline-flex items-center gap-1 ${
                isBgmOn
                  ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-300'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>{isBgmOn ? 'NHẠC: BẬT' : 'NHẠC NỀN'}</span>
            </button>
            <button
              id="btn-trigger-reset"
              onClick={() => setShowResetConfirm(true)}
              className="px-3 sm:px-4 py-1.5 text-xs bg-red-600 hover:bg-red-500 rounded-md font-bold text-white shadow-sm transition"
            >
              DỪNG CHƠI
            </button>
          </div>
        </div>
      </header>

      {/* Main Stage: Sleek Layout with Top Row (Teams + Rope) & Center 16-Tile Grid */}
      <main className="flex-1 flex flex-col px-4 sm:px-8 py-3 overflow-hidden justify-between">
        {/* Top Status Bar: Team 1 - Tug Of War Rope - Team 2 */}
        <div className="h-24 sm:h-28 flex items-center justify-between mb-2 w-full max-w-6xl mx-auto gap-2 sm:gap-4">
          <TeamCard
            teamId={1}
            name={team1Name}
            score={team1Score}
            isCurrentTurn={currentTurn === 1}
            isPulling={activePullingTeam === 1}
          />

          <TugOfWarRope
            score1={team1Score}
            score2={team2Score}
            team1Name={team1Name}
            team2Name={team2Name}
          />

          <TeamCard
            teamId={2}
            name={team2Name}
            score={team2Score}
            isCurrentTurn={currentTurn === 2}
            isPulling={activePullingTeam === 2}
          />
        </div>

        {/* Central 16-Question Grid */}
        <div className="flex-1 flex items-center justify-center w-full max-w-5xl mx-auto py-1">
          <QuestionBoard
            openedQuestionIds={openedQuestionIds}
            answeredCorrectMap={answeredCorrectMap}
            onSelectQuestion={handleSelectQuestion}
            disabled={activeQuestion !== null}
          />
        </div>
      </main>

      {/* Sleek Footer: Live AZero Companion & Bảng điều khiển MC */}
      <footer className="h-36 sm:h-40 bg-slate-900 border-t border-slate-700 flex flex-col md:flex-row p-3 sm:p-4 gap-4 sm:gap-6 backdrop-blur-md z-20">
        {/* Left: AZero Live Speech / Companion Box */}
        <div className="flex-1 bg-slate-950/50 border border-slate-800 rounded-xl p-3 sm:p-4 flex gap-3 sm:gap-4 items-center relative overflow-hidden shadow-inner">
          <div className="absolute top-0 right-0 p-2 opacity-20 pointer-events-none w-28 h-28 bg-cyan-500 rounded-full blur-3xl" />
          
          <AZeroAvatar
            size="sm"
            showControls={false}
          />

          <div className="flex-1 flex flex-col justify-center">
            <div className="text-cyan-400 font-bold text-xs uppercase mb-1 tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>AZero đồng hành cùng MC</span>
            </div>
            <p className="text-slate-200 text-xs sm:text-sm leading-relaxed font-medium line-clamp-2">
              {activeQuestion
                ? `Đang mở câu hỏi số ${activeQuestion.id}: ${activeQuestion.question}`
                : currentTurn === 1
                  ? `Xin mời ${team1Name} chọn một ô câu hỏi bất kỳ trên bảng!`
                  : `Xin mời ${team2Name} chọn một ô câu hỏi bất kỳ trên bảng!`}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => speechManager.reRead()}
                className="text-[10px] font-bold px-2.5 py-1 rounded bg-cyan-950/70 border border-cyan-800/80 text-cyan-300 hover:bg-cyan-900 transition flex items-center gap-1 cursor-pointer"
              >
                <Play className="w-3 h-3" />
                <span>Đọc lại</span>
              </button>
              <button
                onClick={() => speechManager.isSpeaking() ? speechManager.pause() : speechManager.resume()}
                className="text-[10px] font-bold px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-1 cursor-pointer"
              >
                <Pause className="w-3 h-3" />
                <span>Tạm dừng</span>
              </button>
              <button
                onClick={() => speechManager.toggleMute()}
                className="text-[10px] font-bold px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-1 cursor-pointer"
              >
                <Volume2 className="w-3 h-3" />
                <span>Âm thanh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Bảng điều khiển MC */}
        <div className="w-full md:w-72 flex flex-col gap-2">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex justify-between items-center">
            <span>Bảng điều khiển MC</span>
            <span className="text-[9px] text-cyan-400 font-mono">Phím tắt: 1, 2, F</span>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-2">
            <button
              id="mc-btn-correct"
              onClick={() => activeQuestion && handleAnswerResult(true)}
              disabled={!activeQuestion}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white font-black rounded-lg py-2 flex flex-col items-center justify-center shadow-lg border-b-4 border-emerald-800 cursor-pointer active:scale-95 transition"
            >
              <span className="text-lg sm:text-xl font-black">ĐÚNG</span>
              <span className="text-[10px] opacity-70 uppercase font-mono">(Phím 1)</span>
            </button>
            <button
              id="mc-btn-wrong"
              onClick={() => activeQuestion && handleAnswerResult(false)}
              disabled={!activeQuestion}
              className="bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 text-white font-black rounded-lg py-2 flex flex-col items-center justify-center shadow-lg border-b-4 border-rose-800 cursor-pointer active:scale-95 transition"
            >
              <span className="text-lg sm:text-xl font-black">SAI</span>
              <span className="text-[10px] opacity-70 uppercase font-mono">(Phím 2)</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className="bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold py-1.5 rounded uppercase border border-slate-600 disabled:opacity-40 transition cursor-pointer flex items-center justify-center gap-1"
            >
              <Undo2 className="w-3 h-3" />
              <span>Hoàn tác</span>
            </button>
            <button
              onClick={toggleFullscreen}
              className="bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold py-1.5 rounded uppercase border border-slate-600 font-mono text-center cursor-pointer flex items-center justify-center gap-1"
            >
              <Maximize className="w-3 h-3" />
              <span>{isFullscreen ? 'Thu nhỏ' : 'F: Toàn màn hình'}</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Question Modal (Card flip presentation) */}
      {activeQuestion && (
        <QuestionModal
          question={activeQuestion}
          currentTeamName={currentTurn === 1 ? team1Name : team2Name}
          currentTeamId={currentTurn}
          onAnswerResult={handleAnswerResult}
          onClose={handleCloseQuestionModal}
        />
      )}

      {/* Game Over Screen / Celebration Modal */}
      {screen === 'game_over' && !activeQuestion && (
        <GameOverModal
          team1Name={team1Name}
          team2Name={team2Name}
          team1Score={team1Score}
          team2Score={team2Score}
          onOpenTieBreaker={handleOpenTieBreaker}
          onResetGame={() => setShowResetConfirm(true)}
          tieBreakerResolvedWinner={tieBreakerWinner}
        />
      )}

      {/* Team Setup Modal */}
      {showTeamSetup && (
        <TeamSetupModal
          team1Name={team1Name}
          team2Name={team2Name}
          firstTurn={currentTurn}
          onSave={handleSaveTeamSetup}
          onCancel={() => setShowTeamSetup(false)}
        />
      )}

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-3xl p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-500/30">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-white mb-2">
              Xác nhận bắt đầu lại?
            </h3>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              Thao tác này sẽ đặt lại toàn bộ điểm số, trạng thái 16 câu hỏi và vị trí dây kéo về ban đầu. Bạn có chắc chắn muốn bắt đầu lại không?
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                id="btn-cancel-reset"
                onClick={() => setShowResetConfirm(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
              >
                Hủy bỏ
              </button>
              <button
                id="btn-confirm-reset-action"
                onClick={handleConfirmReset}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition cursor-pointer"
              >
                Đồng ý bắt đầu lại
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Voice Settings Modal */}
      <VoiceSettingsModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
      />
      {/* Audio Upload & Live Recording Modal */}
      <AudioUploadModal
        isOpen={showAudioModal}
        onClose={() => setShowAudioModal(false)}
      />
      {/* Rules Modal in Board screen */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-3xl bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 shadow-2xl relative my-auto">
            <button
              onClick={() => setShowRulesModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white px-3 py-1 bg-slate-800 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              Đóng (ESC)
            </button>
            <RulesDisplay />
            <div className="mt-5 text-center">
              <button
                onClick={() => setShowRulesModal(false)}
                className="px-8 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm tracking-wider shadow-lg shadow-cyan-500/30 transition cursor-pointer"
              >
                ĐÃ HIỂU LUẬT CHƠI
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
