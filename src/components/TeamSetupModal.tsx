import React, { useState } from 'react';
import { Users, Play, ShieldAlert, Sparkles } from 'lucide-react';
import { soundManager } from '../utils/sound';

interface TeamSetupModalProps {
  team1Name: string;
  team2Name: string;
  firstTurn: 1 | 2;
  onSave: (t1: string, t2: string, firstTurn: 1 | 2) => void;
  onCancel?: () => void;
}

export const TeamSetupModal: React.FC<TeamSetupModalProps> = ({
  team1Name: initT1,
  team2Name: initT2,
  firstTurn: initFirstTurn,
  onSave,
  onCancel,
}) => {
  const [name1, setName1] = useState(initT1 || 'Đội Xanh');
  const [name2, setName2] = useState(initT2 || 'Đội Đỏ');
  const [selectedTurn, setSelectedTurn] = useState<1 | 2>(initFirstTurn || 1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    soundManager.playClick();
    const final1 = name1.trim() || 'Đội Xanh';
    const final2 = name2.trim() || 'Đội Đỏ';
    onSave(final1, final2, selectedTurn);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Subtle accent glow */}
        <div className="absolute -top-20 -left-20 w-48 h-48 bg-blue-500/20 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-rose-500/20 blur-3xl rounded-full pointer-events-none" />

        <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Thiết Lập Hai Đội Kéo Co
            </h2>
            <p className="text-xs text-slate-400">
              Nhập tên hai đội tham gia và chọn đội được quyền chọn câu hỏi đầu tiên
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Team 1 & 2 Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Team 1 */}
            <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/30">
              <label className="block text-xs font-tech font-bold uppercase tracking-wider text-blue-400 mb-2">
                Đội 1 (Bên Trái - Xanh)
              </label>
              <input
                id="input-team-1"
                type="text"
                value={name1}
                onChange={(e) => setName1(e.target.value)}
                placeholder="Đội Xanh"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-blue-500/50 text-white font-bold text-base focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              />
              <span className="text-[11px] text-slate-400 mt-1.5 block">
                Mặc định: &ldquo;Đội Xanh&rdquo;
              </span>
            </div>

            {/* Team 2 */}
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30">
              <label className="block text-xs font-tech font-bold uppercase tracking-wider text-rose-400 mb-2">
                Đội 2 (Bên Phải - Đỏ)
              </label>
              <input
                id="input-team-2"
                type="text"
                value={name2}
                onChange={(e) => setName2(e.target.value)}
                placeholder="Đội Đỏ"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-rose-500/50 text-white font-bold text-base focus:outline-none focus:ring-2 focus:ring-rose-400 transition"
              />
              <span className="text-[11px] text-slate-400 mt-1.5 block">
                Mặc định: &ldquo;Đội Đỏ&rdquo;
              </span>
            </div>
          </div>

          {/* First Turn Selection */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
            <label className="block text-xs font-tech font-bold uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Đội được quyền chọn câu hỏi trước:</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                id="btn-select-turn-1"
                onClick={() => {
                  soundManager.playClick();
                  setSelectedTurn(1);
                }}
                className={`py-3 px-4 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition ${
                  selectedTurn === 1
                    ? 'bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-600/40 scale-[1.02]'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                <span>{name1.trim() || 'Đội Xanh'} (Đội 1)</span>
              </button>

              <button
                type="button"
                id="btn-select-turn-2"
                onClick={() => {
                  soundManager.playClick();
                  setSelectedTurn(2);
                }}
                className={`py-3 px-4 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition ${
                  selectedTurn === 2
                    ? 'bg-rose-600 text-white border-rose-400 shadow-lg shadow-rose-600/40 scale-[1.02]'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                <span>{name2.trim() || 'Đội Đỏ'} (Đội 2)</span>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition"
              >
                Hủy bỏ
              </button>
            )}
            <button
              type="submit"
              id="btn-confirm-teams"
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-base tracking-wide shadow-lg shadow-cyan-500/30 flex items-center gap-2 transition cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>VÀO TRẬN ĐẤU</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
