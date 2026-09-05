import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Mic, Check, Volume2, Sparkles, Sliders } from 'lucide-react';
import { speechManager, VoicePreset } from '../utils/speech';
import { soundManager } from '../utils/sound';

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({ isOpen, onClose }) => {
  const [preset, setPresetState] = useState<VoicePreset>('adam');
  const [pitch, setPitchState] = useState<number>(0.82);
  const [rate, setRateState] = useState<number>(0.95);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setPresetState(speechManager.getPreset());
      setPitchState(speechManager.getPitch());
      setRateState(speechManager.getRate());
      const voices = speechManager.getAvailableVoices();
      setAvailableVoices(voices);
      setSelectedVoiceName(speechManager.getSelectedVoiceName());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectPreset = (p: VoicePreset) => {
    soundManager.playClick();
    setPresetState(p);
    speechManager.setPreset(p);
    setPitchState(speechManager.getPitch());
    setRateState(speechManager.getRate());
    setSelectedVoiceName(speechManager.getSelectedVoiceName());
  };

  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    setSelectedVoiceName(name);
    speechManager.setVoiceByName(name);
  };

  const handlePitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setPitchState(val);
    speechManager.setPitch(val);
  };

  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setRateState(val);
    speechManager.setRate(val);
  };

  const handleTestVoice = () => {
    soundManager.playClick();
    speechManager.speak("Xin chào các bạn, mình là AZero, robot thông minh của lớp 11A0!", {
      pitch,
      rate
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 text-white relative overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Cấu Hình Giọng Đọc AZero</h2>
              <p className="text-xs text-slate-400">Tùy chỉnh giọng MC AI, cao độ & tốc độ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-4">
          {/* Preset Options */}
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
              Phong cách giọng đọc:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Giọng Adam */}
              <button
                type="button"
                onClick={() => handleSelectPreset('adam')}
                className={`p-3 rounded-xl border text-left transition relative cursor-pointer ${
                  preset === 'adam'
                    ? 'bg-cyan-950/70 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm">Giọng Adam</span>
                  {preset === 'adam' && <Check className="w-4 h-4 text-cyan-400" />}
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Trầm ấm, nam tính, phong thái AI hiện đại
                </p>
              </button>

              {/* Giọng Tự Nhiên */}
              <button
                type="button"
                onClick={() => handleSelectPreset('natural')}
                className={`p-3 rounded-xl border text-left transition relative cursor-pointer ${
                  preset === 'natural'
                    ? 'bg-blue-950/70 border-blue-400 text-blue-200 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm">MC Chuẩn</span>
                  {preset === 'natural' && <Check className="w-4 h-4 text-blue-400" />}
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Sôi nổi, chuẩn mực, tốc độ cân bằng
                </p>
              </button>

              {/* Giọng Nữ */}
              <button
                type="button"
                onClick={() => handleSelectPreset('female')}
                className={`p-3 rounded-xl border text-left transition relative cursor-pointer ${
                  preset === 'female'
                    ? 'bg-purple-950/70 border-purple-400 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm">Giọng Nữ</span>
                  {preset === 'female' && <Check className="w-4 h-4 text-purple-400" />}
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Truyền cảm, thanh thoát, rõ ràng
                </p>
              </button>
            </div>
          </div>

          {/* Voice list selection */}
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Chọn giọng hệ thống (Device TTS):
            </label>
            <select
              value={selectedVoiceName}
              onChange={handleVoiceChange}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              {availableVoices.length === 0 ? (
                <option value="">Đang tải danh sách giọng...</option>
              ) : (
                availableVoices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Fine Tuning: Pitch & Speed Sliders */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>Cao độ (Pitch): {pitch.toFixed(2)}</span>
              </span>
              <span className="text-[10px] text-slate-500">(0.93: Giọng trầm Adam)</span>
            </div>
            <input
              type="range"
              min="0.7"
              max="1.3"
              step="0.02"
              value={pitch}
              onChange={handlePitchChange}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />

            <div className="flex items-center justify-between text-xs font-bold text-slate-300 pt-1">
              <span className="flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Tốc độ đọc (Rate): {rate.toFixed(2)}</span>
              </span>
              <span className="text-[10px] text-slate-500">(0.98: Vừa vặn hội trường)</span>
            </div>
            <input
              type="range"
              min="0.75"
              max="1.25"
              step="0.02"
              value={rate}
              onChange={handleRateChange}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          {/* Test & Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleTestVoice}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold rounded-xl border border-cyan-500/40 flex items-center gap-2 transition cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
              <span>Nghe thử giọng</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black rounded-xl shadow-lg transition cursor-pointer"
            >
              HOÀN TẤT
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
