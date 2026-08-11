/* eslint-disable */
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Lock, Sparkles, Star, Trophy, Zap } from 'lucide-react';
import {
  REVIEW_LEVELS,
  getLevelMeta,
  getAllQuestionStepNodes,
  isReviewLevelUnlocked,
} from './chuyenDeOnTapLevels';

const VB_W = 820;
const ROAD_INSET = 0.08;
const TURN_OUTSET = 1.22;

function getLayoutMetrics(isMobile) {
  if (isMobile) {
    return {
      roadLeft: 64,
      roadRight: VB_W - 64,
      rowYStart: 96,
      rowStep: 124,
      treasureDrop: 92,
      viewPadBottom: 168,
    };
  }
  return {
    roadLeft: 80,
    roadRight: VB_W - 80,
    rowYStart: 78,
    rowStep: 112,
    treasureDrop: 78,
    viewPadBottom: 148,
  };
}

/** Phân bố câu theo hàng. */
function getRowPlan(count) {
  if (count <= 0) return [];
  if (count === 1) return [1];
  if (count === 2) return [1, 1];
  if (count === 3) return [2, 1];
  if (count === 4) return [2, 2];
  if (count === 5) return [3, 2];
  if (count <= 8) return [5, count - 5];
  return [5, 3, count - 8];
}

/** Luôn vẽ 3 tầng đường (S đầy đủ) khi có ≥2 câu — giống KooBits. */
function getRoadRowCount(count) {
  if (count <= 0) return 0;
  if (count === 1) return 2;
  return 3;
}

function shapeForGlobalIndex(i, total) {
  if (total >= 9 && i >= total - 2) return 'star';
  if (i >= 5) return 'hex';
  return 'circle';
}

function cpForGlobalIndex(i) {
  return i < 5 ? 1 : 2;
}

function nodeX(row, col, nodesInRow, ltr, metrics) {
  const { roadLeft, roadRight } = metrics;
  const usableW = roadRight - roadLeft;
  const inset = usableW * ROAD_INSET;
  const innerW = usableW - inset * 2;

  if (nodesInRow <= 1) {
    if (ltr) return roadLeft + inset + (row % 2 === 0 ? 0 : innerW);
    return roadRight - inset - (row % 2 === 0 ? innerW : 0);
  }

  const t = col / (nodesInRow - 1);
  return ltr ? roadLeft + inset + t * innerW : roadRight - inset - t * innerW;
}

/** Khúc cua 180° bán nguyệt hai bên — giống KooBits. */
function uTurnSegment(fromRow, toRow, metrics) {
  const { roadLeft, roadRight, rowYStart, rowStep } = metrics;
  const y0 = rowYStart + fromRow * rowStep;
  const y1 = rowYStart + toRow * rowStep;
  const r = (y1 - y0) / 2;
  const fromLtr = fromRow % 2 === 0;

  if (fromLtr) {
    const ox = roadRight + r * TURN_OUTSET;
    return `C ${ox} ${y0}, ${ox} ${y1}, ${roadRight} ${y1} L ${roadLeft} ${y1}`;
  }
  const ox = roadLeft - r * TURN_OUTSET;
  return `C ${ox} ${y0}, ${ox} ${y1}, ${roadLeft} ${y1} L ${roadRight} ${y1}`;
}

function appendTreasurePath(d, roadRows, treasure, metrics) {
  if (!treasure || roadRows <= 0) return d;

  const { roadLeft, roadRight, rowYStart, rowStep } = metrics;
  const lastY = rowYStart + (roadRows - 1) * rowStep;
  const lastLtr = (roadRows - 1) % 2 === 0;
  const drop = treasure.y - lastY;

  if (lastLtr) {
    if (drop > 6) {
      d += ` C ${roadRight + 56} ${lastY}, ${roadRight + 56} ${treasure.y}, ${treasure.x} ${treasure.y}`;
    }
  } else if (drop > 6) {
    d += ` C ${roadLeft - 56} ${lastY}, ${roadLeft - 56} ${treasure.y}, ${treasure.x} ${treasure.y}`;
  }

  return d;
}

function buildSShapedRoadPath(roadRows, treasure, metrics) {
  if (roadRows <= 0) return '';

  const { roadLeft, roadRight, rowYStart, rowStep } = metrics;
  let d = '';
  for (let row = 0; row < roadRows; row += 1) {
    const y = rowYStart + row * rowStep;
    const ltr = row % 2 === 0;
    const xStart = ltr ? roadLeft : roadRight;
    const xEnd = ltr ? roadRight : roadLeft;

    if (row === 0) {
      d = `M ${xStart} ${y} L ${xEnd} ${y}`;
    } else {
      d += uTurnSegment(row - 1, row, metrics);
    }
  }

  return appendTreasurePath(d, roadRows, treasure, metrics);
}

function buildKooBitsLayout(count, isMobile = false) {
  const metrics = getLayoutMetrics(isMobile);
  const { roadLeft, roadRight, rowYStart, rowStep, treasureDrop, viewPadBottom } = metrics;

  if (count <= 0) {
    return {
      nodes: [],
      treasure: { x: roadRight - 40, y: 210 },
      start: { x: roadLeft, y: rowYStart },
      pathD: '',
      viewH: 320,
      metrics,
    };
  }

  const rowPlan = getRowPlan(count);
  const roadRows = getRoadRowCount(count);
  const nodes = [];
  let globalIdx = 0;

  rowPlan.forEach((nodesInRow, row) => {
    const y = rowYStart + row * rowStep;
    const ltr = row % 2 === 0;

    for (let col = 0; col < nodesInRow; col += 1) {
      nodes.push({
        x: nodeX(row, col, nodesInRow, ltr, metrics),
        y,
        shape: shapeForGlobalIndex(globalIdx, count),
        cp: cpForGlobalIndex(globalIdx),
        levelNum: globalIdx + 1,
      });
      globalIdx += 1;
    }
  });

  const lastRoadY = rowYStart + (roadRows - 1) * rowStep;
  const lastRoadLtr = (roadRows - 1) % 2 === 0;
  const treasure = {
    x: lastRoadLtr ? roadRight - 20 : roadLeft + 20,
    y: lastRoadY + treasureDrop,
  };
  const start = { x: roadLeft, y: rowYStart };

  const pathD = buildSShapedRoadPath(roadRows, treasure, metrics);
  const viewH = lastRoadY + viewPadBottom;

  return { nodes, treasure, start, pathD, viewH, metrics };
}

function pctX(x) {
  return `${(x / VB_W) * 100}%`;
}

function NodeShell({ shape, children, className = '', glow = false }) {
  const base =
    shape === 'hex' || shape === 'star'
      ? 'w-[48px] h-[48px] sm:w-[58px] sm:h-[58px] md:w-[64px] md:h-[64px]'
      : 'w-[48px] h-[48px] sm:w-[58px] sm:h-[58px] md:w-[64px] md:h-[64px] rounded-full';

  const clip =
    shape === 'hex'
      ? { clipPath: 'polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)' }
      : shape === 'star'
        ? {
            clipPath:
              'polygon(50% 0%, 62% 34%, 98% 34%, 68% 56%, 80% 92%, 50% 72%, 20% 92%, 32% 56%, 2% 34%, 38% 34%)',
          }
        : {};

  return (
    <div className={`relative flex items-center justify-center ${base} ${className}`} style={clip}>
      {glow && shape === 'circle' && (
        <span className="absolute inset-0 rounded-full animate-ping opacity-30 bg-sky-400" />
      )}
      <div
        className={`relative z-10 flex items-center justify-center w-full h-full ${
          shape === 'circle' ? 'rounded-full' : ''
        }`}
        style={shape !== 'circle' ? clip : undefined}
      >
        {children}
      </div>
    </div>
  );
}

function PathNode({ node, layout, status, onClick, disabled, showPointer }) {
  const { x, y, shape, cp, viewH, levelNum } = layout;
  const num = levelNum ?? node.levelNum ?? node.displayNum;
  const left = pctX(x);
  const topPct = `${(y / (viewH || 400)) * 100}%`;

  const shellClass =
    status === 'done'
      ? 'bg-gradient-to-b from-emerald-400 to-emerald-600 border-[3px] border-emerald-300 shadow-[0_6px_0_#15803d,0_8px_16px_rgba(21,128,61,0.35)]'
      : status === 'current'
        ? 'bg-gradient-to-b from-white to-sky-50 border-[3px] border-sky-400 shadow-[0_6px_0_#0284c7,0_0_0_4px_rgba(56,189,248,0.35)]'
        : status === 'locked'
          ? 'bg-gradient-to-b from-slate-100 to-slate-200 border-[3px] border-slate-300 shadow-[0_4px_0_#94a3b8] opacity-75 cursor-not-allowed'
          : 'bg-gradient-to-b from-white to-amber-50 border-[3px] border-amber-300 shadow-[0_6px_0_#d97706,0_8px_14px_rgba(217,119,6,0.25)] hover:-translate-y-1 hover:shadow-[0_8px_0_#d97706] transition-all duration-200';

  const numClass =
    status === 'done'
      ? 'text-white'
      : status === 'current'
        ? 'text-sky-600'
        : status === 'locked'
          ? 'text-slate-400'
          : 'text-[#2563eb]';

  return (
    <button
      type="button"
      disabled={disabled || status === 'locked'}
      onClick={onClick}
      className="absolute z-20 flex flex-col items-center -translate-x-1/2 -translate-y-1/2 group outline-none"
      style={{ left, top: topPct }}
      title={node.label}
    >
      {showPointer && (
        <span className="absolute -top-9 left-1/2 -translate-x-1/2 text-2xl animate-bounce drop-shadow-md pointer-events-none">
          👆
        </span>
      )}

      <span
        className="absolute left-1/2 -translate-x-1/2 w-12 h-3 rounded-[50%] bg-black/15 blur-[2px]"
        style={{ top: 'calc(100% + 2px)' }}
      />

      <NodeShell shape={shape} className={shellClass} glow={status === 'current'}>
        {status === 'locked' ? (
          <Lock className="w-5 h-5 text-slate-500" strokeWidth={2.5} />
        ) : (
          <span className={`text-xl sm:text-2xl font-black tabular-nums ${numClass}`}>{num}</span>
        )}
      </NodeShell>

      <span className="mt-1.5 sm:mt-2 inline-flex items-center gap-0.5 px-1.5 sm:px-2 py-0.5 rounded-full bg-white/90 border border-amber-200/80 shadow-sm text-[10px] sm:text-ontap-xs font-black text-amber-900">
        <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500 fill-amber-400" />
        {cp} CP
      </span>

      <span className="mt-0.5 text-[10px] sm:text-ontap-xs font-bold text-amber-950/70 max-w-[72px] sm:max-w-[96px] truncate text-center leading-tight px-0.5 sm:px-1">
        {node.label}
      </span>
    </button>
  );
}

function GoldTrophyCup({ uid = 'cup' }) {
  const cx = 70;
  const bodyId = `${uid}-body`;
  const rimId = `${uid}-rim`;
  const shineId = `${uid}-shine`;
  const handleId = `${uid}-handle`;

  const leftHandle = `M ${cx - 26} 58 C ${cx - 32} 58, ${cx - 36} 66, ${cx - 36} 76 C ${cx - 36} 86, ${cx - 32} 94, ${cx - 28} 92`;
  const rightHandle = `M ${cx + 26} 58 C ${cx + 32} 58, ${cx + 36} 66, ${cx + 36} 76 C ${cx + 36} 86, ${cx + 32} 94, ${cx + 28} 92`;

  return (
    <svg viewBox="0 0 140 132" className="w-full h-full block mx-auto" aria-hidden>
      <defs>
        <linearGradient id={bodyId} x1={cx} y1="36" x2={cx} y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fff7cc" />
          <stop offset="40%" stopColor="#fde047" />
          <stop offset="75%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id={rimId} x1={cx} y1="32" x2={cx} y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fffbeb" />
          <stop offset="100%" stopColor="#facc15" />
        </linearGradient>
        <linearGradient id={shineId} x1={cx - 16} y1="42" x2={cx + 16} y2="72" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="rgba(255,255,255,0.75)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <linearGradient id={handleId} x1={cx - 36} y1="76" x2={cx + 36} y2="76" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="50%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#fde68a" />
        </linearGradient>
      </defs>

      <ellipse cx={cx} cy="118" rx="36" ry="6.5" fill="rgba(0,0,0,0.16)" />

      {/* Tay cầm — vẽ trước thân, đối xứng 2 bên */}
      <path d={leftHandle} fill="none" stroke={`url(#${handleId})`} strokeWidth="6" strokeLinecap="round" />
      <path d={rightHandle} fill="none" stroke={`url(#${handleId})`} strokeWidth="6" strokeLinecap="round" />
      <path d={leftHandle} fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <path d={rightHandle} fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" opacity="0.5" />

      {/* Thân cúp — căn giữa cx */}
      <rect x={cx - 18} y="100" width="36" height="10" rx="4" fill="#92400e" />
      <rect x={cx - 24} y="108" width="48" height="8" rx="3" fill="#78350f" />
      <path
        d={`M ${cx - 26} 40 h52 v26 q0 22 -26 26 q-26 -4 -26 -26 V40 Z`}
        fill={`url(#${bodyId})`}
        stroke="#b45309"
        strokeWidth="2.5"
      />
      <path d={`M ${cx - 30} 40 h60 v11 h-60 Z`} fill={`url(#${rimId})`} stroke="#d97706" strokeWidth="2" />
      <path d={`M ${cx - 18} 48 h36 v7 h-36 Z`} fill={`url(#${shineId})`} opacity="0.85" />

      {/* Ngôi sao — chính giữa */}
      <path
        d={`M ${cx} 6 l6.5 12 h14.5 l-11.5 8.5 l4.5 14.5 l-14 -8.5 l-14 8.5 l4.5 -14.5 l-11.5 -8.5 h14.5 Z`}
        fill="#fde047"
        stroke="#f59e0b"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RewardGoal({ done, totalQ, viewH, x, y }) {
  const uid = React.useId().replace(/:/g, '');
  const left = pctX(x);
  const topPct = `${(y / viewH) * 100}%`;

  return (
    <div
      className="absolute z-20 flex flex-col items-center justify-center -translate-x-1/2 pointer-events-none"
      style={{ left, top: topPct, width: 'min(148px, 40vw)', transform: 'translate(-50%, calc(-50% - 18px))' }}
    >
      <div
        className={`relative mb-1 sm:mb-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-[11px] sm:text-ontap-sm font-bold text-center w-full shadow-xl ${
          done ? 'bg-emerald-800 text-white' : 'bg-[#2f2f2f] text-white'
        }`}
      >
        <span
          className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-0 h-0 border-l-[9px] border-r-[9px] border-t-[9px] border-l-transparent border-r-transparent"
          style={{ borderTopColor: done ? '#065f46' : '#2f2f2f' }}
        />
        {done ? (
          <span className="flex items-center justify-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-300 shrink-0" />
            Hoàn thành {totalQ} câu — nhận cup!
          </span>
        ) : (
          <>Hoàn thành {totalQ} câu để nhận cup vàng</>
        )}
      </div>

      <div
        className={`relative mx-auto w-[76px] h-[76px] sm:w-[100px] sm:h-[100px] md:w-[110px] md:h-[110px] ${
          done ? 'animate-bounce' : 'animate-pulse'
        }`}
        style={{
          filter: done
            ? 'drop-shadow(0 12px 18px rgba(180,83,9,0.55))'
            : 'drop-shadow(0 10px 16px rgba(180,83,9,0.4))',
        }}
      >
        <GoldTrophyCup uid={uid} />
        {!done && (
          <span className="absolute inset-[6%] rounded-full ring-4 ring-amber-300/35 pointer-events-none" />
        )}
        {done && (
          <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-emerald-500 text-white text-sm font-black flex items-center justify-center border-[3px] border-white shadow-lg z-10">
            ✓
          </span>
        )}
      </div>
    </div>
  );
}

function DesertBackdrop() {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-b from-[#fef08a] via-[#fde047] to-[#fbbf24]" />
      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_at_30%_20%,#fff9c4_0%,transparent_50%),radial-gradient(ellipse_at_80%_40%,#fef3c7_0%,transparent_45%)]" />
      <svg className="absolute bottom-0 left-0 w-full h-[45%] opacity-30 pointer-events-none" viewBox="0 0 800 200" preserveAspectRatio="none">
        <path d="M0 120 Q200 60 400 100 T800 80 L800 200 L0 200 Z" fill="#eab308" />
        <path d="M0 150 Q250 100 500 130 T800 110 L800 200 L0 200 Z" fill="#ca8a04" opacity="0.5" />
      </svg>
      <div className="absolute top-[8%] left-[12%] w-24 h-8 rounded-full bg-white/50 blur-sm" />
      <div className="absolute top-[12%] left-[18%] w-16 h-6 rounded-full bg-white/40 blur-sm" />
      <div className="absolute top-[6%] right-[20%] w-28 h-9 rounded-full bg-white/45 blur-sm" />
      <div className="absolute left-[5%] bottom-[12%] text-4xl opacity-80 select-none drop-shadow-sm">🌵</div>
      <div className="absolute right-[8%] top-[38%] text-3xl opacity-70 select-none">🌵</div>
      <div className="absolute left-[42%] bottom-[6%] text-2xl opacity-50 select-none">🪨</div>
      <div className="absolute right-[22%] bottom-[8%] text-xl opacity-50 select-none">🪨</div>
    </>
  );
}

function WindingRoad({ pathD, viewH, start, treasure }) {
  if (!pathD) return null;
  const startX = start?.x ?? 80;
  const startY = start?.y ?? 78;
  const endX = treasure?.x ?? 740;
  const endY = treasure?.y ?? 300;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-[5]"
      viewBox={`0 0 ${VB_W} ${viewH}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <filter id="roadShadow" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="5" stdDeviation="7" floodColor="#451a03" floodOpacity="0.4" />
        </filter>
        <linearGradient id="roadSurface" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a16207" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
        <radialGradient id="startGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="100%" stopColor="#16a34a" />
        </radialGradient>
        <radialGradient id="finishGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#f59e0b" />
        </radialGradient>
      </defs>

      {/* Vạch xuất phát */}
      <g>
        <circle cx={startX} cy={startY} r="30" fill="url(#startGlow)" opacity="0.35" />
        <circle cx={startX} cy={startY} r="18" fill="#22c55e" stroke="#14532d" strokeWidth="3" />
        <rect x={startX - 3} y={startY - 34} width="6" height="34" rx="2" fill="#78350f" />
        <path
          d={`M ${startX - 3} ${startY - 34} L ${startX + 18} ${startY - 22} L ${startX - 3} ${startY - 10} Z`}
          fill="#16a34a"
          stroke="#14532d"
          strokeWidth="2"
        />
        <text
          x={startX}
          y={startY + 44}
          textAnchor="middle"
          fill="#14532d"
          fontSize="15"
          fontWeight="800"
          fontFamily="system-ui, sans-serif"
        >
          BẮT ĐẦU
        </text>
      </g>

      {/* Viền ngoài đường */}
      <path
        d={pathD}
        fill="none"
        stroke="#451a03"
        strokeWidth="48"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#roadShadow)"
      />
      {/* Mặt đường nâu */}
      <path
        d={pathD}
        fill="none"
        stroke="url(#roadSurface)"
        strokeWidth="38"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Lớp sáng giữa */}
      <path
        d={pathD}
        fill="none"
        stroke="#92400e"
        strokeWidth="30"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.55"
      />
      {/* Vạch trắng giữa */}
      <path
        d={pathD}
        fill="none"
        stroke="#fefce8"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="16 18"
        opacity="0.95"
      />

      {/* Điểm đích */}
      <g>
        <circle cx={endX} cy={endY} r="34" fill="url(#finishGlow)" opacity="0.4" />
        <circle cx={endX} cy={endY} r="22" fill="#fbbf24" stroke="#b45309" strokeWidth="3" />
        <path
          d={`M ${endX - 14} ${endY - 6} L ${endX} ${endY - 18} L ${endX + 14} ${endY - 6} Z`}
          fill="#f59e0b"
          stroke="#b45309"
          strokeWidth="2"
        />
        <text
          x={endX}
          y={endY + 40}
          textAnchor="middle"
          fill="#92400e"
          fontSize="15"
          fontWeight="800"
          fontFamily="system-ui, sans-serif"
        >
          ĐÍCH
        </text>
      </g>
    </svg>
  );
}

function useIsNarrowMap() {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 639px)').matches : false
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const onChange = (e) => setNarrow(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return narrow;
}

export default function ChuyenDeOnTapProgressMap({
  courseTitle = '',
  topicTitle = '',
  topic,
  steps = [],
  completedStepIds = [],
  maxReachableIdx = 0,
  currentStepIndex = 0,
  onBack,
  onStartStep,
  onStartFromBeginning,
}) {
  const allQuestionNodes = useMemo(() => getAllQuestionStepNodes(steps, topic), [steps, topic]);

  const levelBuckets = useMemo(() => {
    const buckets = Object.fromEntries(REVIEW_LEVELS.map((l) => [l.id, []]));
    for (const n of allQuestionNodes) {
      buckets[n.levelId].push(n);
    }
    return buckets;
  }, [allQuestionNodes]);

  const defaultLevel = useMemo(() => {
    for (const lv of REVIEW_LEVELS) {
      if (isReviewLevelUnlocked(lv.id, levelBuckets, completedStepIds)) {
        const bucket = levelBuckets[lv.id] || [];
        const hasIncomplete = bucket.some((n) => !completedStepIds.includes(n.stepId));
        if (hasIncomplete || bucket.length === 0) return lv.id;
      }
    }
    return 'nen_tang';
  }, [levelBuckets, completedStepIds]);

  const [activeLevelId, setActiveLevelId] = useState(defaultLevel);

  useEffect(() => {
    setActiveLevelId(defaultLevel);
  }, [defaultLevel, topicTitle]);

  const activeLevel = getLevelMeta(activeLevelId);
  const nodes = levelBuckets[activeLevelId] || [];
  const levelUnlocked = isReviewLevelUnlocked(activeLevelId, levelBuckets, completedStepIds);
  const doneCount = nodes.filter((n) => completedStepIds.includes(n.stepId)).length;
  const totalQ = nodes.length;

  const isNarrow = useIsNarrowMap();
  const layout = useMemo(() => buildKooBitsLayout(nodes.length, isNarrow), [nodes.length, isNarrow]);

  const nonQuestionSteps = useMemo(
    () => (steps || []).filter((s) => s.kind !== 'question'),
    [steps]
  );

  const getNodeStatus = (node, i) => {
    if (!levelUnlocked) return 'locked';

    const globalIdx = allQuestionNodes.findIndex((n) => n.stepId === node.stepId);
    if (globalIdx > 0) {
      const prevGlobal = allQuestionNodes[globalIdx - 1];
      if (prevGlobal && !completedStepIds.includes(prevGlobal.stepId)) {
        return 'locked';
      }
    }

    if (completedStepIds.includes(node.stepId)) return 'done';
    if (node.stepIndex === currentStepIndex) return 'current';

    if (i > 0) {
      const prevInLevel = nodes[i - 1];
      if (prevInLevel && !completedStepIds.includes(prevInLevel.stepId)) return 'locked';
    }

    if (node.stepIndex <= maxReachableIdx) return 'available';
    if (globalIdx === 0 || (globalIdx > 0 && completedStepIds.includes(allQuestionNodes[globalIdx - 1]?.stepId))) {
      return 'available';
    }
    return 'locked';
  };

  const displayNodes = nodes.map((n, i) => ({
    ...n,
    levelNum: i + 1,
    layout: { ...layout.nodes[i], viewH: layout.viewH, levelNum: i + 1 },
    status: getNodeStatus(n, i),
  }));

  const firstPlayableIdx = displayNodes.findIndex((n) => n.status === 'current' || n.status === 'available');
  const treasureDone = totalQ > 0 && doneCount === totalQ;

  return (
    <div className="chuyen-de-ontap w-full rounded-3xl overflow-hidden shadow-2xl border border-amber-300/60 text-ontap-base leading-relaxed">
      <div className="relative bg-gradient-to-b from-[#fde047] to-[#fbbf24] px-4 pt-4 pb-5 sm:px-6 border-b-4 border-[#f59e0b]">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start gap-3 mb-4 relative z-10">
          <button
            type="button"
            onClick={onBack}
            className="w-11 h-11 rounded-full bg-white border-2 border-amber-300 flex items-center justify-center text-amber-900 hover:bg-amber-50 shadow-md shrink-0 transition-transform hover:scale-105"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
          </button>
          <div className="min-w-0 flex-1">
            {courseTitle && (
              <p className="text-ontap-xs font-black uppercase tracking-[0.2em] text-amber-900/60 truncate">
                {courseTitle}
              </p>
            )}
            <h2 className="font-display text-ontap-xl sm:text-ontap-2xl font-black text-amber-950 leading-tight truncate">{topicTitle}</h2>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 border border-amber-200 shadow-sm shrink-0">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-ontap-sm font-black text-amber-900">Lộ trình ôn tập</span>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2 sm:gap-4 relative z-10">
          {REVIEW_LEVELS.map((lv) => {
            const bucket = levelBuckets[lv.id] || [];
            const unlocked = isReviewLevelUnlocked(lv.id, levelBuckets, completedStepIds);
            const active = activeLevelId === lv.id;
            const done = bucket.length > 0 && bucket.every((n) => completedStepIds.includes(n.stepId));
            const doneN = bucket.filter((n) => completedStepIds.includes(n.stepId)).length;

            return (
              <button
                key={lv.id}
                type="button"
                disabled={!unlocked && bucket.length > 0}
                onClick={() => unlocked && setActiveLevelId(lv.id)}
                className={`relative flex flex-col items-center transition-all duration-200 ${
                  active ? 'scale-110 -translate-y-1' : unlocked ? 'hover:scale-105' : 'opacity-50 cursor-not-allowed'
                }`}
              >
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-2xl sm:text-3xl transition-all ${
                    active
                      ? `bg-gradient-to-br ${lv.bg} shadow-lg ring-4 ring-white`
                      : 'bg-white/90 border-2 border-amber-200 shadow-md'
                  }`}
                  style={
                    active
                      ? { boxShadow: `0 0 0 4px white, 0 0 0 7px ${lv.ring}, 0 8px 20px rgba(0,0,0,0.15)` }
                      : undefined
                  }
                >
                  {!unlocked && bucket.length > 0 ? (
                    <Lock className="w-5 h-5 text-amber-800/70" />
                  ) : (
                    <span>{lv.emoji}</span>
                  )}
                </div>
                <span
                  className={`mt-1.5 text-ontap-xs sm:text-ontap-sm font-black text-center max-w-[88px] leading-tight ${
                    active ? 'text-amber-950' : 'text-amber-900/75'
                  }`}
                >
                  {lv.shortLabel}
                </span>
                {bucket.length > 0 && (
                  <span className="text-ontap-xs font-bold text-amber-800/65 mt-0.5">
                    {doneN}/{bucket.length}
                  </span>
                )}
                {done && (
                  <span className="absolute -top-0.5 -right-0.5 w-6 h-6 rounded-full bg-emerald-500 text-white text-ontap-xs font-black flex items-center justify-center border-2 border-white shadow">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <p className="font-display text-center text-ontap-base font-black text-amber-950 mt-4 relative z-10">
          {activeLevel.label}
          {totalQ > 0 ? ` · ${doneCount}/${totalQ} câu` : ' · chưa có câu hỏi'}
        </p>
      </div>

      <div className="relative overflow-hidden bg-[#fde047]">
        <div
          className="relative w-full mx-auto max-w-4xl"
          style={{ aspectRatio: `${VB_W} / ${layout.viewH}` }}
        >
          <DesertBackdrop />
          <WindingRoad
            pathD={layout.pathD}
            viewH={layout.viewH}
            start={layout.start}
            treasure={layout.treasure}
          />

          {!levelUnlocked ? (
            <div className="absolute inset-0 flex items-center justify-center z-30 bg-amber-100/50 backdrop-blur-[2px]">
              <div className="text-center px-6 py-6 rounded-2xl bg-white border-2 border-amber-200 shadow-xl max-w-sm mx-4">
                <Lock className="w-12 h-12 text-amber-600 mx-auto mb-3" />
                <p className="font-display font-black text-amber-950 text-ontap-lg mb-1">Cấp độ chưa mở</p>
                <p className="text-ontap-base text-amber-800/80">
                  Hoàn thành hết câu ở cấp trước để mở khóa <strong>{activeLevel.label}</strong>.
                </p>
              </div>
            </div>
          ) : totalQ === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center z-30">
              <p className="text-ontap-base font-bold text-amber-950/80 bg-white/90 px-5 py-4 rounded-2xl border-2 border-amber-200 shadow-lg mx-4 text-center">
                Chưa có câu hỏi ở cấp {activeLevel.label}.
              </p>
            </div>
          ) : (
            displayNodes.map((node, i) => (
              <PathNode
                key={node.stepId}
                node={node}
                layout={node.layout}
                status={node.status}
                disabled={node.status === 'locked'}
                showPointer={i === firstPlayableIdx && (node.status === 'available' || node.status === 'current')}
                onClick={() => onStartStep?.(node.stepIndex)}
              />
            ))
          )}

          {totalQ > 0 && levelUnlocked && (
            <RewardGoal
              done={treasureDone}
              totalQ={totalQ}
              viewH={layout.viewH}
              x={layout.treasure.x}
              y={layout.treasure.y}
            />
          )}
        </div>
      </div>

      <div className="px-4 py-4 sm:px-6 bg-gradient-to-r from-[#fb923c] to-[#ea580c] border-t-4 border-[#c2410c] flex flex-wrap items-center justify-center gap-3">
        {nonQuestionSteps.length > 0 && (
          <button
            type="button"
            onClick={onStartFromBeginning}
            className="px-5 py-2.5 rounded-full bg-white text-orange-900 font-bold text-ontap-base shadow-[0_4px_0_#fdba74] hover:brightness-105 border border-orange-200"
          >
            Ôn lý thuyết &amp; ví dụ ({nonQuestionSteps.length} bước)
          </button>
        )}
        {displayNodes.find((n) => n.status === 'current' || n.status === 'available') && (
          <button
            type="button"
            onClick={() => {
              const next =
                displayNodes.find((n) => n.status === 'current') ||
                displayNodes.find((n) => n.status === 'available');
              if (next) onStartStep?.(next.stepIndex);
            }}
            className="font-display px-8 py-3 rounded-full bg-gradient-to-b from-[#fde047] to-[#facc15] text-amber-950 font-black text-ontap-base shadow-[0_5px_0_#ca8a04] hover:brightness-105 border-2 border-yellow-300"
          >
            Tiếp tục làm bài →
          </button>
        )}
      </div>
    </div>
  );
}
