/* eslint-disable */
import React from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import {
  defaultLevelForQuestionIndex,
  getLevelMeta,
  parseReviewLevelId,
} from './chuyenDeOnTapLevels';

function stepPoints(step) {
  if (step?.kind === 'question') return 3;
  if (step?.kind === 'example_item') return 2;
  return 1;
}

function stepSubLabel(step) {
  if (step?.kind === 'question') {
    const q = step.question || {};
    const levelId = q.level
      ? parseReviewLevelId(q.level)
      : defaultLevelForQuestionIndex(step.questionIndex ?? 0);
    return getLevelMeta(levelId).shortLabel;
  }
  if (step?.kind === 'example_item') return 'Ví dụ';
  if (step?.kind === 'theory') return 'Lý thuyết';
  if (step?.kind === 'video') return 'Video';
  if (step?.kind === 'intro') return 'Mở đầu';
  return 'Nội dung';
}

/** Số thứ tự liên tục trong chủ đề: mở đầu = 0, các bước sau = 1, 2, 3… */
function getStepBadgeNumber(_step, stepIndexInList) {
  return stepIndexInList;
}

function getKindLabel(step, stepIndexInList) {
  if (!step) return String(stepIndexInList);
  if (step.kind === 'intro') return 'Mở đầu';
  if (step.kind === 'theory') return 'Lý thuyết';
  if (step.kind === 'video') return 'Video';
  return String(stepIndexInList);
}

const SPIRAL_RING_COUNT = 24;

/** Gáy lò xo vở — lỗ đục + dây lò xo ngang (kiểu KooBits). */
function NotebookSpiralSpine() {
  return (
    <div className="kb-spine hidden md:flex" aria-hidden>
      {Array.from({ length: SPIRAL_RING_COUNT }, (_, i) => (
        <div key={i} className="kb-spine-ring">
          <span className="kb-spine-wire" />
          <span className="kb-spine-hole" />
        </div>
      ))}
    </div>
  );
}

/**
 * Khung giao diện kiểu sổ bài tập (KooBits): sidebar bước + trang sổ vàng + thanh trên.
 */
export default function ChuyenDeOnTapKooBitsShell({
  courseTitle = '',
  topicTitle = '',
  steps = [],
  stepIndex = 0,
  completedStepIds = [],
  maxReachableIdx = 0,
  onClose,
  onGoToStep,
  stepTitle = '',
  stepKind = '',
  feedbackBanner = null,
  videoHintUrl = '',
  children,
  footerLeft = null,
  footerCenter = null,
  footerRight = null,
}) {
  const completedSet = new Set(completedStepIds);
  const mastered = completedSet.size;
  const total = steps.length || 1;
  const profPct = Math.round((mastered / total) * 100);

  const currentStep = steps[stepIndex] || null;
  const kindLabel = getKindLabel(currentStep, stepIndex);

  return (
    <div className="chuyen-de-ontap flex flex-col h-full min-h-[100dvh] w-full text-slate-800 text-ontap-base leading-relaxed">
      {/* Thanh trên xanh nhạt */}
      <header className="shrink-0 flex items-center gap-3 px-4 py-3 bg-[#c5e4f3] border-b border-[#9ecde3] shadow-sm">
        <button
          type="button"
          onClick={onClose}
          className="font-display inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 border border-[#8ec4da] text-[#1e6a8a] font-bold text-ontap-base hover:bg-white shadow-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </button>
        <div className="flex-1 min-w-0 text-center hidden sm:block">
          <p className="text-ontap-sm font-bold text-[#3d7a96] truncate">{courseTitle}</p>
        </div>
        <span className="font-display shrink-0 px-3 py-1 rounded-full bg-[#7ec8e3] text-white text-ontap-sm font-black uppercase tracking-wide">
          Ôn tập
        </span>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar trái — danh sách bước */}
        <aside className="hidden md:flex flex-col w-[220px] lg:w-[250px] shrink-0 bg-[#eef6fa] border-r border-[#c5dfe9] overflow-y-auto">
          <div className="p-4 border-b border-[#c5dfe9] bg-white/60">
            <p className="font-display text-ontap-sm font-black text-[#2d6a7a] uppercase tracking-wider mb-2">Thành thạo</p>
            <div className="flex items-center justify-between text-ontap-base font-black text-[#1a5563] mb-1.5">
              <span>
                {mastered}/{total}
              </span>
              <span className="text-[#f59e0b]">{profPct}%</span>
            </div>
            <div className="h-3 rounded-full bg-[#d4e8f0] overflow-hidden border border-[#b8d9e8]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#fbbf24] via-[#f97316] to-[#22c55e] transition-all duration-500"
                style={{ width: `${profPct}%` }}
              />
            </div>
          </div>

          <nav className="flex-1 p-2 space-y-1">
            {steps.map((s, i) => {
              const isCurrent = i === stepIndex;
              const isDone = completedSet.has(s.id);
              const isLocked = i > maxReachableIdx;
              return (
                <button
                  key={s.id || i}
                  type="button"
                  disabled={isLocked}
                  onClick={() => !isLocked && onGoToStep?.(i)}
                  className={`w-full text-left rounded-xl px-3 py-2.5 transition-all border-2 ${
                    isCurrent
                      ? 'bg-[#3b9ec9] border-[#2a8ab5] text-white shadow-md'
                      : isDone
                        ? 'bg-white border-[#86efac] hover:bg-green-50'
                        : isLocked
                          ? 'bg-white/40 border-transparent opacity-45 cursor-not-allowed'
                          : 'bg-white border-[#dbeafe] hover:border-[#93c5fd] hover:bg-blue-50/50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center text-ontap-xs font-black shrink-0 ${
                        isCurrent
                          ? 'bg-white text-[#2a8ab5]'
                          : isDone
                            ? 'bg-[#22c55e] text-white'
                            : 'bg-[#e2e8f0] text-slate-500'
                      }`}
                    >
                      {isDone && !isCurrent ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : getStepBadgeNumber(s, i)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-ontap-sm font-bold leading-snug line-clamp-2 ${isCurrent ? 'text-white' : 'text-slate-800'}`}>
                        {s.title || `Bước ${i + 1}`}
                      </p>
                      <p className={`text-ontap-xs mt-0.5 font-semibold ${isCurrent ? 'text-blue-100' : 'text-slate-500'}`}>
                        {stepSubLabel(s)} · {stepPoints(s)} điểm
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Nền teal + trang sổ */}
        <main
          className="kb-main-stage flex-1 min-w-0 overflow-y-auto px-0 py-0 md:px-4 md:py-5 lg:px-6 lg:py-6 relative"
          style={{
            backgroundColor: '#2a6d7a',
            backgroundImage:
              'radial-gradient(circle at 10% 20%, rgba(255,255,255,0.06) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(255,255,255,0.05) 0%, transparent 35%), url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'80\' height=\'80\' viewBox=\'0 0 80 80\'%3E%3Ctext x=\'8\' y=\'28\' fill=\'rgba(255,255,255,0.06)\' font-size=\'18\' font-family=\'Arial\'%3E%2B%3C/text%3E%3Ctext x=\'40\' y=\'60\' fill=\'rgba(255,255,255,0.05)\' font-size=\'14\' font-family=\'Arial\'%3E%3D%3C/text%3E%3C/svg%3E")',
          }}
        >
          <div className="kb-notebook mx-auto relative w-full">
            <div className="kb-notebook-shell">
              <NotebookSpiralSpine />

              <div className="kb-notebook-page">
                <div className="kb-notebook-sheet">
                  {/* Badge câu + chủ đề */}
                  <div className="px-4 sm:px-8 lg:px-10 pt-4 sm:pt-6 pb-2 flex flex-wrap items-start gap-3">
                    <span className="font-display inline-flex items-center px-4 py-1.5 rounded-full bg-[#22c55e] text-white text-ontap-base font-black shadow-md">
                      {kindLabel}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-ontap-sm font-bold text-slate-400 uppercase tracking-wide">Chủ đề</p>
                      <p className="font-display text-ontap-lg sm:text-ontap-xl font-black text-slate-800 leading-snug">{topicTitle}</p>
                    </div>
                  </div>

                  {/* Banner phản hồi đúng/sai */}
                  {feedbackBanner}

                  {/* Nội dung trang sổ */}
                  <div className="flex-1 px-4 sm:px-8 lg:px-10 py-4 space-y-4 overflow-y-auto">{children}</div>

                  {/* Video gợi ý (nếu có) */}
                  {videoHintUrl && (
                    <div className="px-5 sm:px-8 lg:px-10 pb-2">
                      <a
                        href={videoHintUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-ontap-base font-bold text-[#ea580c] hover:text-[#c2410c]"
                      >
                        <span className="w-5 h-5 rounded-full bg-[#ea580c] text-white flex items-center justify-center text-ontap-xs">▶</span>
                        Bấm để xem video hướng dẫn
                      </a>
                    </div>
                  )}

                  {/* Chân trang sổ */}
                  <footer className="mt-auto px-5 sm:px-8 lg:px-10 py-4 border-t-2 border-dashed border-slate-200 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3 min-h-[2.5rem]">{footerLeft}</div>
                    <div className="flex justify-center flex-1 min-w-[8rem]">{footerCenter}</div>
                    <div className="flex items-center gap-2 ml-auto">{footerRight}</div>
                  </footer>
                </div>
              </div>
            </div>
          </div>

          {/* Thanh bước mobile */}
          <div className="md:hidden mt-2 flex items-center justify-center gap-2 flex-wrap px-3 py-3 border-t border-slate-100 bg-white">
            {steps.map((s, i) => {
              const isCurrent = i === stepIndex;
              const isDone = completedSet.has(s.id);
              const isLocked = i > maxReachableIdx;
              return (
                <button
                  key={`m-${s.id || i}`}
                  type="button"
                  disabled={isLocked}
                  onClick={() => !isLocked && onGoToStep?.(i)}
                  className={`w-10 h-10 rounded-full text-ontap-sm font-black border-2 transition-all ${
                    isCurrent
                      ? 'bg-[#3b9ec9] border-[#2a8ab5] text-white scale-110'
                      : isDone
                        ? 'bg-[#22c55e] border-[#86efac] text-white'
                        : 'bg-slate-100 border-slate-200 text-slate-600'
                  } ${isLocked ? 'opacity-30' : ''}`}
                >
                  {isDone && !isCurrent ? <Check className="w-4 h-4 mx-auto" /> : getStepBadgeNumber(s, i)}
                </button>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
