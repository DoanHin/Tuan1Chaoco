import React from 'react';
import { motion } from 'motion/react';
import { Grid3X3, Users, Trophy, Sparkles, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';

interface RulesDisplayProps {
  activeRuleStep?: number | null; // 1 | 2 | 3
  compact?: boolean;
}

export const RulesDisplay: React.FC<RulesDisplayProps> = ({
  activeRuleStep = null,
  compact = false,
}) => {
  const rules = [
    {
      step: 1,
      title: "1. CHỌN Ô & TRẢ LỜI CÂU HỎI",
      icon: Grid3X3,
      theme: "cyan",
      badgeText: "16 Ô CÂU HỎI",
      text: "Trên màn hình có 16 ô câu hỏi và hai đội sẽ lần lượt lựa chọn một ô bất kỳ. Sau khi ô được mở, mình sẽ đọc câu hỏi cùng bốn phương án trả lời A, B, C và D.",
      summary: "Hai đội luân phiên mở ô • 4 đáp án A - B - C - D",
    },
    {
      step: 2,
      title: "2. THẢO LUẬN & KÉO DÂY",
      icon: Users,
      theme: "emerald",
      badgeText: "KÉO CO ĐỐI KHÁNG",
      text: "Mỗi đội hãy thảo luận, sau đó đưa ra đáp án cuối cùng của mình. Với mỗi câu trả lời đúng, đội chơi sẽ kéo được sợi dây về phía mình một bước. Nếu trả lời sai, sợi dây sẽ được giữ nguyên tại vị trí hiện tại.",
      summary: "Đúng: Kéo dây 1 bước về đội mình • Sai: Dây giữ nguyên",
    },
    {
      step: 3,
      title: "3. PHÂN ĐỊNH THẮNG BẠI & CÂU HỎI PHỤ",
      icon: Trophy,
      theme: "amber",
      badgeText: "CHIẾN THẮNG CHUNG CUỘC",
      text: "Sau khi hoàn thành cả 16 câu hỏi, đội nào kéo được sợi dây về phía mình nhiều hơn sẽ giành chiến thắng. Trong trường hợp hai đội có kết quả bằng nhau, chúng ta sẽ bước vào câu hỏi phụ để tìm ra đội chiến thắng chung cuộc.",
      summary: "Đội kéo nhiều hơn = Thắng cuộc • Hòa = Đấu câu hỏi phụ",
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="text-center mb-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-1.5 shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
          <span>LUẬT CHƠI CHÍNH THỨC</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-white to-blue-300 tracking-wide">
          THỂ THỨC KÉO CO TRÍ TUỆ
        </h2>
      </div>

      {/* 3 Interactive Rule Cards */}
      <div className={`grid grid-cols-1 ${compact ? 'gap-2.5' : 'gap-3 sm:gap-4'}`}>
        {rules.map((rule) => {
          const isActive = activeRuleStep === rule.step;
          const Icon = rule.icon;

          return (
            <motion.div
              key={rule.step}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: isActive ? 1.02 : 1,
              }}
              transition={{ duration: 0.3 }}
              className={`relative rounded-2xl p-4 sm:p-5 transition-all duration-300 border ${
                isActive
                  ? 'bg-slate-900/95 border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.4)] ring-2 ring-cyan-400/50'
                  : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 shadow-lg backdrop-blur-sm'
              }`}
            >
              {/* Active Indicator Badge */}
              {isActive && (
                <div className="absolute -top-3 right-5 px-3 py-0.5 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-tech font-bold uppercase tracking-wider shadow flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
                  <span>AZERO ĐANG ĐỌC ĐIỀU NÀY</span>
                </div>
              )}

              <div className="flex items-start gap-3 sm:gap-4">
                {/* Step Icon Badge */}
                <div
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                    isActive
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <h3
                      className={`text-sm sm:text-base font-extrabold tracking-wide ${
                        isActive ? 'text-cyan-300' : 'text-slate-200'
                      }`}
                    >
                      {rule.title}
                    </h3>
                    <span
                      className={`text-[10px] font-tech font-bold px-2 py-0.5 rounded-full border ${
                        rule.theme === 'cyan'
                          ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300'
                          : rule.theme === 'emerald'
                          ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                          : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                      }`}
                    >
                      {rule.badgeText}
                    </span>
                  </div>

                  {/* Verbatim rule text requested by user */}
                  <p
                    className={`text-xs sm:text-sm leading-relaxed transition-colors ${
                      isActive ? 'text-white font-medium' : 'text-slate-300'
                    }`}
                  >
                    {rule.text}
                  </p>

                  {/* Summary key rule pill */}
                  <div className="mt-2.5 flex items-center gap-2 pt-2 border-t border-slate-800/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span className="text-[11px] font-semibold text-cyan-300/90 tracking-wide">
                      {rule.summary}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
