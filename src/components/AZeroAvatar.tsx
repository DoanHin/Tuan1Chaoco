import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX, Play, Pause, RotateCcw, Mic, Sparkles } from 'lucide-react';
import { speechManager, SpeechStatus } from '../utils/speech';

interface AZeroAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showControls?: boolean;
  activePhrase?: string;
  isCelebrating?: boolean;
  speechTextToReplay?: string;
  onOpenVoiceSettings?: () => void;
  className?: string;
}

export const AZeroAvatar: React.FC<AZeroAvatarProps> = ({
  size = 'md',
  showControls = true,
  activePhrase,
  isCelebrating = false,
  speechTextToReplay,
  onOpenVoiceSettings,
  className = '',
}) => {
  const [speechStatus, setSpeechStatus] = useState<SpeechStatus>('idle');
  const [isMuted, setIsMuted] = useState<boolean>(false);

  useEffect(() => {
    setIsMuted(speechManager.getIsMuted());
    const unsub = speechManager.subscribe((status) => {
      setSpeechStatus(status);
    });
    return unsub;
  }, []);

  const isSpeaking = speechStatus === 'speaking';
  const isPaused = speechStatus === 'paused';

  // Dimension scaling
  const sizeMap = {
    sm: { w: 100, h: 100 },
    md: { w: 160, h: 160 },
    lg: { w: 220, h: 220 },
    xl: { w: 300, h: 300 },
  };

  const { w, h } = sizeMap[size];

  const handlePlayOrResume = () => {
    if (isPaused) {
      speechManager.resume();
    } else if (speechTextToReplay) {
      speechManager.speak(speechTextToReplay);
    } else {
      speechManager.reRead();
    }
  };

  const handlePause = () => {
    speechManager.pause();
  };

  const handleReRead = () => {
    if (speechTextToReplay) {
      speechManager.speak(speechTextToReplay);
    } else {
      speechManager.reRead();
    }
  };

  const handleToggleMute = () => {
    const nextMute = speechManager.toggleMute();
    setIsMuted(nextMute);
  };

  const [mouseTilt, setMouseTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const offsetX = (e.clientX - centerX) / (rect.width / 2);
    const offsetY = (e.clientY - centerY) / (rect.height / 2);
    setMouseTilt({
      x: -offsetY * 12, // tilt on X axis
      y: offsetX * 15,  // tilt on Y axis
    });
  };

  const handleMouseLeave = () => {
    setMouseTilt({ x: 0, y: 0 });
  };

  return (
    <div 
      className={`flex flex-col items-center select-none ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: '1000px' }}
    >
      {/* Robot Character 3D Stage */}
      <div 
        className={`relative flex items-center justify-center transition-all duration-300 ${
          isCelebrating 
            ? 'animate-bounce' 
            : isSpeaking 
              ? 'animate-robot-speaking' 
              : 'animate-float'
        }`}
        style={{ 
          width: `${w}px`, 
          height: `${h}px`,
          transformStyle: 'preserve-3d',
          transform: `rotateX(${mouseTilt.x}deg) rotateY(${mouseTilt.y}deg)`,
        }}
      >
        {/* Deep 3D Projected Ground Shadow */}
        <div 
          className="absolute -bottom-4 w-36 h-6 bg-slate-950/70 rounded-full blur-md transition-all duration-500 pointer-events-none"
          style={{
            transform: isSpeaking ? 'scale(0.85) translateY(6px)' : 'scale(1)',
            opacity: isSpeaking ? 0.45 : 0.65,
          }}
        />

        {/* Anti-Gravity Plasma Levitation Glow Under Chassis */}
        <div 
          className={`absolute bottom-0 w-32 h-8 bg-cyan-400/30 rounded-full blur-md pointer-events-none ${
            isSpeaking ? 'animate-thruster-fast bg-cyan-400/50' : 'animate-thruster'
          }`} 
        />
        <div className="absolute bottom-2 w-20 h-3 bg-white/60 rounded-full blur-sm animate-pulse pointer-events-none" />

        {/* 3D Gyroscopic Hologram Rings (X & Y Axis Rotation) */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center" style={{ transformStyle: 'preserve-3d' }}>
          {/* Gyro Ring 1 - 3D Tilt on X axis */}
          <div 
            className="absolute w-[110%] h-[110%] rounded-full border border-cyan-400/40 border-dashed animate-orbit-3d-x"
            style={{ 
              boxShadow: '0 0 15px rgba(6,182,212,0.25)',
              transformStyle: 'preserve-3d' 
            }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_8px_#38bdf8]" />
          </div>

          {/* Gyro Ring 2 - 3D Tilt on Y axis */}
          <div 
            className="absolute w-[122%] h-[122%] rounded-full border border-blue-400/30 border-dotted animate-orbit-3d-y"
            style={{ 
              boxShadow: '0 0 20px rgba(59,130,246,0.2)',
              transformStyle: 'preserve-3d' 
            }}
          >
            <div className="absolute bottom-0 right-1/4 w-2 h-2 rounded-full bg-blue-300 shadow-[0_0_8px_#60a5fa]" />
          </div>
        </div>

        {/* Sonic Wave Rings expanding from speaker core when speaking */}
        {isSpeaking && (
          <div className="absolute inset-2 flex items-center justify-center pointer-events-none">
            <div className="w-24 h-24 rounded-full border border-cyan-400/40 animate-[sonicWaveExpand_1.5s_ease-out_infinite]" />
            <div className="w-24 h-24 rounded-full border border-sky-300/30 animate-[sonicWaveExpand_1.5s_ease-out_infinite_0.5s]" />
          </div>
        )}

        {/* Glow Halo behind character when speaking */}
        {isSpeaking && (
          <div className="absolute inset-2 rounded-full bg-cyan-400/30 blur-2xl animate-pulse pointer-events-none" />
        )}

        {/* SVG Robot Character Art */}
        <svg 
          viewBox="0 0 280 280" 
          className="w-full h-full drop-shadow-[0_20px_25px_rgba(0,0,0,0.6)] z-10 transition-transform duration-300"
          style={{
            transform: isSpeaking ? 'scale(1.03)' : 'scale(1)',
          }}
        >
          <defs>
            <linearGradient id="bodyWhiteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="65%" stopColor="#f1f5f9" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>
            <linearGradient id="cyanAccentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
            <linearGradient id="visorDarkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#080c14" />
              <stop offset="100%" stopColor="#172554" />
            </linearGradient>
            <linearGradient id="metalBevelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#64748b" stopOpacity="0.2" />
            </linearGradient>
            <filter id="eyeGlow">
              <feGaussianBlur stdDeviation="3.5" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <clipPath id="visorClip">
              <rect x="84" y="76" width="112" height="78" rx="24" ry="24" />
            </clipPath>
          </defs>

          {/* Head Group with Nodding Animation */}
          <g className={isSpeaking ? 'animate-head-nod' : ''}>
            {/* Left Ear pod with blinking cyan beacon */}
            <ellipse cx="62" cy="115" rx="14" ry="24" fill="url(#cyanAccentGrad)" />
            <ellipse cx="60" cy="115" rx="8" ry="16" fill="#e0f2fe" opacity="0.8" />
            <line x1="72" y1="85" x2="62" y2="55" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
            <circle cx="60" cy="52" r="6" fill="#38bdf8" className={isSpeaking ? 'animate-ping' : 'animate-pulse'} />
            <circle cx="60" cy="52" r="3" fill="#ffffff" />

            {/* Right Ear pod with blinking cyan beacon */}
            <ellipse cx="218" cy="115" rx="14" ry="24" fill="url(#cyanAccentGrad)" />
            <ellipse cx="220" cy="115" rx="8" ry="16" fill="#e0f2fe" opacity="0.8" />
            <line x1="208" y1="85" x2="218" y2="55" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
            <circle cx="220" cy="52" r="6" fill="#38bdf8" className={isSpeaking ? 'animate-ping' : 'animate-pulse'} />
            <circle cx="220" cy="52" r="3" fill="#ffffff" />

            {/* Robot Head Main Chassis */}
            <rect x="68" y="60" width="144" height="110" rx="42" ry="42" fill="url(#bodyWhiteGrad)" stroke="#e2e8f0" strokeWidth="2.5" />
            <rect x="70" y="62" width="140" height="40" rx="35" fill="url(#metalBevelGrad)" opacity="0.5" />

            {/* Top antenna fin with cyan accent */}
            <path d="M 134 60 L 140 40 L 146 60 Z" fill="url(#cyanAccentGrad)" />
            <circle cx="140" cy="38" r="4" fill="#38bdf8" className="animate-pulse" />

            {/* Screen Visor (Curved 3D glossy TV display) */}
            <rect x="84" y="76" width="112" height="78" rx="24" ry="24" fill="url(#visorDarkGrad)" stroke="#0ea5e9" strokeWidth="2.5" />
            {/* Gloss reflection arc on visor */}
            <path d="M 92 84 Q 140 76 188 84 A 20 20 0 0 1 180 94 Q 140 88 100 94 A 20 20 0 0 1 92 84 Z" fill="#ffffff" opacity="0.12" />
            
            {/* Visor Scanline effect */}
            <g clipPath="url(#visorClip)" opacity="0.45">
              <line x1="84" y1="95" x2="196" y2="95" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 3" />
              <line x1="84" y1="120" x2="196" y2="120" stroke="#38bdf8" strokeWidth="1" opacity="0.6" />
            </g>

            {/* HUD Corner Tech Brackets */}
            <path d="M 94 92 L 94 86 L 100 86" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
            <path d="M 186 92 L 186 86 L 180 86" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
            <path d="M 94 138 L 94 144 L 100 144" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
            <path d="M 186 138 L 186 144 L 180 144" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />

            {/* Glowing Interactive Eyes */}
            <g filter="url(#eyeGlow)" className="animate-eye-blink">
              {isCelebrating ? (
                // Happy celebratory eyes (^ ^)
                <>
                  <path d="M 104 116 Q 114 102 124 116" fill="none" stroke="#38bdf8" strokeWidth="5" strokeLinecap="round" />
                  <path d="M 156 116 Q 166 102 176 116" fill="none" stroke="#38bdf8" strokeWidth="5" strokeLinecap="round" />
                </>
              ) : isSpeaking ? (
                // Energetic speaking eyes with spark
                <>
                  {/* Left Eye */}
                  <circle cx="114" cy="115" r="15" fill="#0284c7" />
                  <circle cx="114" cy="115" r="11" fill="#38bdf8" />
                  <circle cx="114" cy="115" r="7" fill="#cffafe" />
                  <circle cx="117" cy="112" r="3.5" fill="#ffffff" />

                  {/* Right Eye */}
                  <circle cx="166" cy="115" r="15" fill="#0284c7" />
                  <circle cx="166" cy="115" r="11" fill="#38bdf8" />
                  <circle cx="166" cy="115" r="7" fill="#cffafe" />
                  <circle cx="169" cy="112" r="3.5" fill="#ffffff" />
                </>
              ) : (
                // Focused glowing cyan eyes
                <>
                  <circle cx="114" cy="115" r="14" fill="#38bdf8" />
                  <circle cx="114" cy="115" r="10" fill="#a5f3fc" />
                  <circle cx="117" cy="112" r="3.5" fill="#ffffff" />

                  <circle cx="166" cy="115" r="14" fill="#38bdf8" />
                  <circle cx="166" cy="115" r="10" fill="#a5f3fc" />
                  <circle cx="169" cy="112" r="3.5" fill="#ffffff" />
                </>
              )}
            </g>

            {/* Animated Mouth: audio equalizer waveform when speaking */}
            {isSpeaking ? (
              <g className="animate-pulse">
                <rect x="123" y="139" width="3.5" height="7" rx="1.5" fill="#38bdf8" />
                <rect x="129" y="136" width="3.5" height="12" rx="1.5" fill="#67e8f9" />
                <rect x="135" y="133" width="4" height="16" rx="2" fill="#a5f3fc" />
                <rect x="141" y="133" width="4" height="16" rx="2" fill="#a5f3fc" />
                <rect x="147" y="136" width="3.5" height="12" rx="1.5" fill="#67e8f9" />
                <rect x="153" y="139" width="3.5" height="7" rx="1.5" fill="#38bdf8" />
              </g>
            ) : (
              <path d="M 132 140 Q 140 146 148 140" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
            )}
          </g>

          {/* Neck connector */}
          <ellipse cx="140" cy="172" rx="26" ry="7" fill="#64748b" />

          {/* Body Chassis */}
          <g>
            {/* Torso */}
            <path d="M 96 172 Q 140 166 184 172 L 192 230 Q 140 248 88 230 Z" fill="url(#bodyWhiteGrad)" stroke="#cbd5e1" strokeWidth="2" />
            {/* Blue chest vest pattern */}
            <path d="M 98 174 Q 140 178 182 174 L 176 206 Q 140 220 104 206 Z" fill="url(#cyanAccentGrad)" />

            {/* Glowing Chest Arc Reactor Core */}
            <circle cx="140" cy="202" r="13" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="2.5" filter="url(#eyeGlow)" />
            <circle cx="140" cy="202" r="8" fill="#38bdf8" className={isSpeaking ? 'animate-ping' : ''} style={{ transformOrigin: '140px 202px' }} />
            <circle cx="140" cy="202" r="7" fill="#38bdf8" />
            <circle cx="140" cy="202" r="3" fill="#ffffff" />

            {/* Floating rounded bottom */}
            <ellipse cx="140" cy="242" rx="36" ry="14" fill="url(#cyanAccentGrad)" opacity="0.95" />
          </g>

          {/* Left Arm holding Checklist Tablet */}
          <g className={isSpeaking ? 'animate-arm-speaking-left' : 'animate-arm-left'}>
            {/* Arm */}
            <path d="M 94 186 Q 74 200 66 216" fill="none" stroke="url(#cyanAccentGrad)" strokeWidth="12" strokeLinecap="round" />
            {/* Tablet */}
            <g transform="rotate(-15 65 210)">
              <rect x="36" y="176" width="46" height="64" rx="7" fill="#ffffff" stroke="#38bdf8" strokeWidth="2.5" />
              {/* Screen header */}
              <rect x="42" y="184" width="34" height="6" rx="2" fill="#0284c7" />
              {/* Checkbox rows */}
              <rect x="42" y="196" width="6" height="6" rx="1.5" fill="#38bdf8" />
              <line x1="52" y1="199" x2="72" y2="199" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />

              <rect x="42" y="208" width="6" height="6" rx="1.5" fill="#38bdf8" />
              <line x1="52" y1="211" x2="68" y2="211" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />

              <rect x="42" y="220" width="6" height="6" rx="1.5" fill="#38bdf8" />
              <line x1="52" y1="223" x2="74" y2="223" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
            </g>
          </g>

          {/* Right Arm holding Stylus Pen */}
          <g className={isSpeaking ? 'animate-arm-speaking-right' : 'animate-arm-right'}>
            {/* Arm */}
            <path d="M 186 186 Q 206 195 214 208" fill="none" stroke="url(#cyanAccentGrad)" strokeWidth="12" strokeLinecap="round" />
            {/* Stylus Pen */}
            <g transform="rotate(35 215 205)">
              <rect x="210" y="180" width="7" height="36" rx="3.5" fill="#0f172a" />
              <rect x="210" y="186" width="7" height="8" fill="#38bdf8" />
              <path d="M 210 216 L 213.5 224 L 217 216 Z" fill="#38bdf8" />
            </g>
          </g>
        </svg>

        {/* Live Audio Indicator Badge when reading */}
        {isSpeaking && (
          <div className="absolute -top-3 bg-cyan-500 text-slate-950 font-tech font-bold text-xs px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 backdrop-blur border border-cyan-300 animate-pulse z-20">
            <span className="flex items-center gap-0.5 h-3">
              <span className="w-1 bg-slate-950 rounded-full animate-[speechPulse_0.6s_ease-in-out_infinite]" style={{ height: '100%' }} />
              <span className="w-1 bg-slate-950 rounded-full animate-[speechPulse_0.8s_ease-in-out_infinite_0.15s]" style={{ height: '70%' }} />
              <span className="w-1 bg-slate-950 rounded-full animate-[speechPulse_0.5s_ease-in-out_infinite_0.3s]" style={{ height: '90%' }} />
            </span>
            <span>AZERO ĐANG ĐỌC...</span>
          </div>
        )}
      </div>

      {/* AZero Nameplate with Voice Info Badge */}
      <div className="mt-2 text-center flex flex-col items-center gap-1">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-800/90 border border-cyan-500/30 text-cyan-300 text-xs font-semibold tracking-wide shadow-md">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>AI AZero • 11A0 Robotics</span>
        </div>
        {onOpenVoiceSettings && (
          <button
            onClick={onOpenVoiceSettings}
            className="text-[10px] text-slate-400 hover:text-cyan-300 flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900/60 border border-slate-700/60 transition cursor-pointer"
          >
            <Mic className="w-2.5 h-2.5 text-cyan-400" />
            <span>Giọng đọc: {speechManager.getPreset() === 'adam' ? 'Adam (Trầm ấm)' : 'Tự nhiên'}</span>
          </button>
        )}
      </div>

      {/* Active Phrase Tooltip (if provided) */}
      {activePhrase && isSpeaking && (
        <div className="mt-2 max-w-sm px-3 py-1.5 text-xs text-cyan-200 bg-slate-900/90 border border-cyan-500/40 rounded-lg text-center backdrop-blur shadow-md line-clamp-2">
          &ldquo;{activePhrase}&rdquo;
        </div>
      )}

      {/* Speech Controls Bar */}
      {showControls && (
        <div className="mt-2.5 flex items-center justify-center gap-1.5 p-1.5 bg-slate-800/90 border border-slate-700 rounded-xl shadow-lg backdrop-blur z-20">
          {/* Play / Resume */}
          <button
            id="azero-btn-play"
            onClick={handlePlayOrResume}
            title={isPaused ? "Tiếp tục đọc" : "Phát giọng đọc"}
            className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1 transition cursor-pointer ${
              isSpeaking && !isPaused 
                ? 'bg-cyan-500 text-slate-950 font-bold' 
                : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isPaused ? "Tiếp tục" : "Phát"}</span>
          </button>

          {/* Pause */}
          <button
            id="azero-btn-pause"
            onClick={handlePause}
            disabled={!isSpeaking}
            title="Tạm dừng giọng đọc"
            className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1 transition cursor-pointer ${
              isPaused 
                ? 'bg-amber-500 text-slate-950 font-bold' 
                : 'bg-slate-700 hover:bg-slate-600 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            <Pause className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tạm dừng</span>
          </button>

          {/* Re-read */}
          <button
            id="azero-btn-reread"
            onClick={handleReRead}
            title="Đọc lại đoạn này"
            className="p-2 rounded-lg text-xs font-medium flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-slate-200 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Đọc lại</span>
          </button>

          {/* Mute Toggle */}
          <button
            id="azero-btn-mute"
            onClick={handleToggleMute}
            title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
            className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1 transition cursor-pointer ${
              isMuted 
                ? 'bg-red-500/80 text-white' 
                : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
            }`}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isMuted ? "Đã tắt" : "Âm thanh"}</span>
          </button>
        </div>
      )}
    </div>
  );
};
