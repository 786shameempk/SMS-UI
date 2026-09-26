import type { DashboardWidgetId } from "../widgets";

/**
 * Tiny illustrative thumbnails for the Manage widgets gallery — one per widget, drawn to look like
 * the real card (line chart, bars, donut, calendar…). Decorative only: colours come from theme tokens
 * so they repaint for dark mode and brand presets, and the data shapes are fixed, not real figures.
 */

const P = "var(--color-primary)";
const INFO = "var(--color-info)";
const OK = "var(--color-success)";
const WARN = "var(--color-warning)";
const BAD = "var(--color-destructive)";
const INK = "var(--color-foreground)";
const LINE = "var(--color-border)";
const MUTED = "var(--color-muted-foreground)";

/** A faint text line placeholder. */
function Bar({ x, y, w, h = 4, o = 0.18, c = INK }: { x: number; y: number; w: number; h?: number; o?: number; c?: string }) {
  return <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={c} opacity={o} />;
}

function Avatar({ x, y, c }: { x: number; y: number; c: string }) {
  return <circle cx={x} cy={y} r={6} fill={c} opacity={0.85} />;
}

function Row({ y, dot, w = 70 }: { y: number; dot: string; w?: number }) {
  return (
    <g>
      <Avatar x={18} y={y} c={dot} />
      <Bar x={30} y={y - 4} w={w} />
      <Bar x={30} y={y + 2} w={w * 0.55} h={3} o={0.1} />
    </g>
  );
}

const PREVIEWS: Record<DashboardWidgetId, () => React.ReactElement> = {
  stats: () => (
    <g>
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${10 + i * 48} 14)`}>
          <rect width={42} height={44} rx={6} fill="var(--color-card)" stroke={LINE} />
          <Bar x={6} y={8} w={20} h={3} o={0.2} />
          <rect x={6} y={17} width={24} height={8} rx={2} fill={INK} opacity={0.75} />
          <rect x={6} y={31} width={16} height={6} rx={3} fill={[OK, BAD, OK][i]} opacity={0.35} />
          <circle cx={34} cy={11} r={4} fill={[P, INFO, OK][i]} opacity={0.5} />
        </g>
      ))}
    </g>
  ),
  scopeOverview: () => (
    <g>
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(12 ${14 + i * 16})`}>
          <rect width={10} height={10} rx={2} fill={[P, INFO, OK][i]} opacity={0.7} />
          <Bar x={16} y={3} w={34} />
          <rect x={60} y={2} width={[70, 50, 84][i]} height={6} rx={3} fill={[P, INFO, OK][i]} opacity={0.55} />
        </g>
      ))}
    </g>
  ),
  performance: () => (
    <g>
      {[20, 34, 48].map((y) => (
        <line key={y} x1={10} x2={150} y1={y} y2={y} stroke={LINE} strokeDasharray="3 3" />
      ))}
      <path d="M10 52 C 35 46, 45 40, 65 38 S 100 24, 120 22 S 145 16, 150 14 L150 60 L10 60 Z" fill={P} opacity={0.15} />
      <path d="M10 52 C 35 46, 45 40, 65 38 S 100 24, 120 22 S 145 16, 150 14" fill="none" stroke={P} strokeWidth={2.5} strokeLinecap="round" />
      <path d="M10 44 C 40 42, 60 36, 80 34 S 125 30, 150 26" fill="none" stroke={OK} strokeWidth={2} strokeLinecap="round" opacity={0.8} />
      <circle cx={120} cy={22} r={3.5} fill="var(--color-card)" stroke={P} strokeWidth={2} />
    </g>
  ),
  revenue: () => (
    <g>
      <line x1={10} x2={150} y1={60} y2={60} stroke={LINE} />
      {[34, 40, 30, 44, 38, 48].map((h, i) => (
        <g key={i} transform={`translate(${16 + i * 22} 0)`}>
          <rect x={0} y={60 - (h + 6)} width={7} height={h + 6} rx={2} fill={LINE} />
          <rect x={8} y={60 - h} width={7} height={h} rx={2} fill={P} />
        </g>
      ))}
    </g>
  ),
  attendance: () => {
    const segs = [
      { v: 0.78, c: OK },
      { v: 0.1, c: BAD },
      { v: 0.07, c: WARN },
      { v: 0.05, c: INFO },
    ];
    const r = 20;
    const circ = 2 * Math.PI * r;
    let acc = 0;
    return (
      <g>
        <g transform="translate(42 36) rotate(-90)">
          <circle r={r} fill="none" stroke={LINE} strokeWidth={9} />
          {segs.map((s, i) => {
            const el = (
              <circle key={i} r={r} fill="none" stroke={s.c} strokeWidth={9} strokeDasharray={`${s.v * circ - 1.5} ${circ}`} strokeDashoffset={-acc * circ} />
            );
            acc += s.v;
            return el;
          })}
        </g>
        <text x={42} y={40} textAnchor="middle" fontSize={10} fontWeight={700} fill={INK}>
          92%
        </text>
        {segs.map((s, i) => (
          <g key={i} transform={`translate(84 ${16 + i * 12})`}>
            <rect width={7} height={7} rx={2} fill={s.c} />
            <Bar x={12} y={1.5} w={[40, 28, 22, 30][i]} />
          </g>
        ))}
      </g>
    );
  },
  calendar: () => (
    <g>
      <Bar x={12} y={8} w={40} h={5} o={0.45} />
      {Array.from({ length: 21 }).map((_, i) => {
        const col = i % 7;
        const row = Math.floor(i / 7);
        const special = i === 9 ? P : i === 4 ? INFO : i === 16 ? OK : null;
        return (
          <g key={i} transform={`translate(${12 + col * 20} ${20 + row * 16})`}>
            <rect width={16} height={12} rx={3} fill={special ?? INK} opacity={special ? 0.85 : 0.06} />
          </g>
        );
      })}
    </g>
  ),
  birthdays: () => (
    <g>
      <Row y={18} dot={P} w={64} />
      <Row y={38} dot={INFO} w={52} />
      <Row y={58} dot={OK} w={58} />
      <g transform="translate(124 22)" fill={P}>
        <rect x={0} y={10} width={22} height={14} rx={2} opacity={0.8} />
        <rect x={9} y={4} width={4} height={8} rx={1} fill={WARN} />
        <path d="M11 0 C 13 2, 13 4, 11 4 C 9 4, 9 2, 11 0 Z" fill={BAD} />
      </g>
    </g>
  ),
  holidays: () => (
    <g>
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(12 ${10 + i * 19})`}>
          <rect width={16} height={16} rx={4} fill={[BAD, P, INFO][i]} opacity={0.2} />
          <rect x={4} y={4} width={8} height={3} rx={1} fill={[BAD, P, INFO][i]} />
          <Bar x={24} y={3} w={[70, 56, 80][i]} />
          <Bar x={24} y={10} w={30} h={3} o={0.1} />
        </g>
      ))}
    </g>
  ),
  todayClasses: () => (
    <g>
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(10 ${8 + i * 20})`}>
          <rect width={140} height={16} rx={4} fill="var(--color-card)" stroke={LINE} />
          <Bar x={6} y={6} w={14} c={P} o={0.9} />
          <line x1={26} x2={26} y1={3} y2={13} stroke={LINE} />
          <Bar x={32} y={6} w={[56, 44, 62][i]} />
          <Bar x={112} y={6} w={20} h={4} o={0.12} />
        </g>
      ))}
    </g>
  ),
  upcomingExams: () => (
    <g>
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(12 ${8 + i * 20})`}>
          <rect width={18} height={16} rx={3} fill={INFO} opacity={0.15} />
          <Bar x={4} y={3} w={10} h={3} c={INFO} o={0.9} />
          <Bar x={4} y={9} w={10} h={3} o={0.3} />
          <Bar x={26} y={3} w={[64, 50, 58][i]} />
          <Bar x={26} y={10} w={34} h={3} o={0.1} />
          <rect x={112} y={4} width={24} height={8} rx={4} fill={[WARN, INFO, INFO][i]} opacity={0.35} />
        </g>
      ))}
    </g>
  ),
  pendingAssignments: () => (
    <g>
      {[0.8, 0.45, 0.65].map((v, i) => (
        <g key={i} transform={`translate(12 ${10 + i * 19})`}>
          <Bar x={0} y={0} w={[70, 58, 64][i]} />
          <rect x={0} y={8} width={136} height={5} rx={2.5} fill={LINE} />
          <rect x={0} y={8} width={136 * v} height={5} rx={2.5} fill={v > 0.6 ? OK : WARN} />
        </g>
      ))}
    </g>
  ),
  feesDue: () => (
    <g>
      <Bar x={12} y={10} w={30} h={3} o={0.25} />
      <rect x={12} y={17} width={62} height={11} rx={2} fill={INK} opacity={0.75} />
      <rect x={82} y={18} width={30} height={9} rx={4.5} fill={BAD} opacity={0.3} />
      {[0, 1].map((i) => (
        <g key={i} transform={`translate(12 ${38 + i * 12})`}>
          <Avatar x={4} y={3} c={i ? WARN : BAD} />
          <Bar x={14} y={1} w={60} />
          <Bar x={112} y={1} w={24} o={0.3} />
        </g>
      ))}
    </g>
  ),
  libraryDue: () => (
    <g>
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={14 + i * 12} y={[16, 12, 20, 14, 18][i]} width={9} height={60 - [16, 12, 20, 14, 18][i] - 6} rx={2} fill={[P, INFO, OK, WARN, BAD][i]} opacity={0.75} />
      ))}
      <line x1={10} x2={78} y1={54} y2={54} stroke={MUTED} strokeWidth={2} opacity={0.4} />
      <Row y={22} dot={BAD} w={44} />
      <g transform="translate(70 0)">
        <Row y={22} dot={BAD} w={44} />
        <Row y={42} dot={WARN} w={36} />
      </g>
    </g>
  ),
  busStatus: () => (
    <g>
      <path d="M14 50 C 40 20, 70 58, 96 30 S 136 26, 148 16" fill="none" stroke={LINE} strokeWidth={4} strokeLinecap="round" />
      <path d="M14 50 C 40 20, 70 58, 96 30" fill="none" stroke={P} strokeWidth={4} strokeLinecap="round" />
      {[
        [14, 50],
        [55, 38],
        [96, 30],
        [148, 16],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={4} fill="var(--color-card)" stroke={i < 3 ? P : MUTED} strokeWidth={2} />
      ))}
      <g transform="translate(88 20)">
        <rect width={18} height={12} rx={3} fill={WARN} />
        <rect x={3} y={3} width={5} height={4} rx={1} fill="var(--color-card)" opacity={0.9} />
        <rect x={10} y={3} width={5} height={4} rx={1} fill="var(--color-card)" opacity={0.9} />
      </g>
    </g>
  ),
  hostel: () => (
    <g>
      {[0.86, 0.62, 0.94].map((v, i) => (
        <g key={i} transform={`translate(12 ${12 + i * 18})`}>
          <rect width={12} height={12} rx={3} fill={[P, INFO, OK][i]} opacity={0.25} />
          <Bar x={18} y={1} w={36} />
          <rect x={18} y={7} width={118} height={5} rx={2.5} fill={LINE} />
          <rect x={18} y={7} width={118 * v} height={5} rx={2.5} fill={v > 0.9 ? WARN : [P, INFO, OK][i]} />
        </g>
      ))}
    </g>
  ),
  recentActivity: () => (
    <g>
      <line x1={18} x2={18} y1={12} y2={62} stroke={LINE} strokeWidth={2} />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(0 ${14 + i * 18})`}>
          <circle cx={18} cy={2} r={5} fill={[OK, P, INFO][i]} stroke="var(--color-card)" strokeWidth={2} />
          <Bar x={30} y={-1} w={[84, 66, 76][i]} />
          <Bar x={30} y={6} w={28} h={3} o={0.1} />
        </g>
      ))}
    </g>
  ),
  notifications: () => (
    <g>
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(10 ${8 + i * 20})`}>
          <rect width={140} height={16} rx={4} fill={i === 0 ? P : "var(--color-card)"} opacity={i === 0 ? 0.12 : 1} stroke={LINE} />
          <circle cx={9} cy={8} r={3} fill={i === 0 ? P : MUTED} opacity={i === 0 ? 1 : 0.4} />
          <Bar x={18} y={6} w={[72, 60, 80][i]} />
        </g>
      ))}
    </g>
  ),
};

export default function WidgetPreview({ id, className }: { id: DashboardWidgetId; className?: string }) {
  const draw = PREVIEWS[id];
  return (
    <svg viewBox="0 0 160 72" className={className} aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      {draw()}
    </svg>
  );
}
