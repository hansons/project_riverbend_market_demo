import { navigate } from '@/lib/router';
import { categoryColor } from '@/lib/stalls';

// A themeable stall map. Renders the market's stall SET (from market_stalls when
// passed in), arranged into rows by parsing labels (A1 → row A, col 1); labels that
// don't fit go in an overflow row. Falls back to a fixed A–D × 12 grid when no set
// is provided. Cells color by occupancy state, or by category when colorBy='category'.
const DEFAULT_ROWS = ['A', 'B', 'C', 'D'];
const DEFAULT_COLS = 12;
const CW = 60;
const CH = 38;
const GX = 6;
const GY = 30;
const PADX = 30;
const PADY = 46;

export interface MapOccupant {
  name: string;
  slug?: string;
}

export interface GridStall {
  label: string;
  disabled?: boolean;
  category?: string | null;
}

function defaultStalls(): GridStall[] {
  const out: GridStall[] = [];
  for (const r of DEFAULT_ROWS) for (let c = 1; c <= DEFAULT_COLS; c++) out.push({ label: `${r}${c}` });
  return out;
}

interface Placed {
  label: string;
  disabled: boolean;
  category?: string | null;
  x: number;
  y: number;
}

function layout(stalls: GridStall[]): { placed: Placed[]; vbW: number; vbH: number } {
  const rows = new Map<string, { col: number; s: GridStall }[]>();
  const overflow: GridStall[] = [];
  for (const s of stalls) {
    const m = /^([A-Za-z]+)(\d+)$/.exec(s.label.trim());
    if (m) {
      const key = m[1].toUpperCase();
      if (!rows.has(key)) rows.set(key, []);
      rows.get(key)!.push({ col: parseInt(m[2], 10), s });
    } else {
      overflow.push(s);
    }
  }
  const rowKeys = [...rows.keys()].sort();
  const placed: Placed[] = [];
  let maxCol = 1;
  rowKeys.forEach((key, ri) => {
    for (const { col, s } of rows.get(key)!.sort((a, b) => a.col - b.col)) {
      maxCol = Math.max(maxCol, col);
      placed.push({ label: s.label, disabled: !!s.disabled, category: s.category, x: PADX + (col - 1) * (CW + GX), y: PADY + ri * (CH + GY) });
    }
  });
  if (overflow.length) {
    const ri = rowKeys.length;
    overflow.forEach((s, i) => {
      maxCol = Math.max(maxCol, i + 1);
      placed.push({ label: s.label, disabled: !!s.disabled, category: s.category, x: PADX + i * (CW + GX), y: PADY + ri * (CH + GY) });
    });
  }
  const rowCount = rowKeys.length + (overflow.length ? 1 : 0);
  return { placed, vbW: PADX * 2 + maxCol * (CW + GX), vbH: PADY + rowCount * (CH + GY) + 26 };
}

export function MarketMap({
  occupied = {},
  highlight,
  highlightText,
  onCellClick,
  stalls,
  colorBy = 'status',
  clickableDisabled = false,
}: {
  occupied?: Record<string, MapOccupant>;
  highlight?: string | string[] | null;
  highlightText?: string;
  onCellClick?: (label: string) => void;
  stalls?: GridStall[];
  colorBy?: 'status' | 'category';
  clickableDisabled?: boolean;
}) {
  const set = stalls && stalls.length ? stalls : defaultStalls();
  const { placed, vbW, vbH } = layout(set);
  const hiSet = new Set(Array.isArray(highlight) ? highlight : highlight ? [highlight] : []);
  const hiStall = placed.find((s) => hiSet.has(s.label));
  const byCategory = colorBy === 'category';
  const cats = byCategory ? [...new Set(placed.map((p) => (p.category ?? '').trim()).filter(Boolean))].sort() : [];
  const hasUncategorized = byCategory && placed.some((p) => !p.category || !p.category.trim());

  return (
    <div className="overflow-x-auto rounded-2xl border border-brand-line bg-brand-paper p-3">
      <svg viewBox={`0 0 ${vbW} ${vbH}`} className="w-full min-w-[640px]" role="img" aria-label="Market stall map">
        <text x={vbW / 2} y={18} textAnchor="middle" className="text-[12px] font-semibold" style={{ fill: 'rgb(var(--brand-muted))' }}>
          ▲ Main entrance &amp; info booth
        </text>

        {placed.map((s) => {
          const occ = occupied[s.label];
          const isHi = hiSet.has(s.label);
          const catColor = categoryColor(s.category);
          let fill: string;
          let stroke: string;
          let textFill: string;
          let dash: string | undefined;
          let fillOpacity: number | undefined;
          if (s.disabled) {
            fill = 'rgb(var(--brand-muted) / 0.15)';
            stroke = 'rgb(var(--brand-muted) / 0.6)';
            textFill = 'rgb(var(--brand-muted))';
            dash = '3 3';
          } else if (isHi) {
            fill = 'rgb(var(--brand-accent) / 0.85)';
            stroke = 'rgb(var(--brand-accent))';
            textFill = 'rgb(var(--brand-ink))';
          } else if (byCategory && catColor) {
            fill = catColor;
            stroke = catColor;
            textFill = 'rgb(var(--brand-ink))';
            fillOpacity = occ ? 0.55 : 0.3;
            dash = occ ? undefined : '3 3';
          } else if (occ) {
            fill = 'rgb(var(--brand-primary) / 0.15)';
            stroke = 'rgb(var(--brand-primary) / 0.5)';
            textFill = 'rgb(var(--brand-primary-dark))';
          } else {
            fill = 'rgb(var(--brand-card))';
            stroke = 'rgb(var(--brand-line))';
            textFill = 'rgb(var(--brand-muted))';
            dash = '3 3';
          }
          const clickable = (clickableDisabled || !s.disabled) && (Boolean(onCellClick) || Boolean(occ?.slug));
          return (
            <g
              key={s.label}
              onClick={() => {
                if (s.disabled && !clickableDisabled) return;
                if (onCellClick) onCellClick(s.label);
                else if (occ?.slug) navigate(`/vendor/${occ.slug}`);
              }}
              style={{ cursor: clickable ? 'pointer' : 'default' }}
            >
              <title>
                {s.label}
                {s.category ? ` · ${s.category}` : ''} — {s.disabled ? 'out of service' : occ ? occ.name : 'available'}
              </title>
              <rect
                x={s.x}
                y={s.y}
                width={CW}
                height={CH}
                rx={6}
                style={{ fill, fillOpacity, stroke, strokeWidth: isHi && !s.disabled ? 2 : 1, strokeDasharray: dash }}
              />
              <text
                x={s.x + CW / 2}
                y={s.y + CH / 2 + 4}
                textAnchor="middle"
                className="text-[11px] font-semibold"
                style={{ fill: textFill, textDecoration: s.disabled ? 'line-through' : undefined }}
              >
                {s.label}
              </text>
            </g>
          );
        })}

        {hiStall && highlightText && (
          <text x={hiStall.x + CW / 2} y={hiStall.y - 6} textAnchor="middle" className="text-[11px] font-bold" style={{ fill: 'rgb(var(--brand-berry))' }}>
            📍 {highlightText}
          </text>
        )}
      </svg>

      <div className="mt-2 flex flex-wrap gap-3 px-1 text-[11px] text-brand-muted">
        {byCategory ? (
          <>
            {cats.map((c) => (
              <LegendSwatch key={c} fill={categoryColor(c) ?? '#9ca3af'} border={categoryColor(c) ?? '#9ca3af'} label={c} />
            ))}
            {hasUncategorized && <LegendSwatch fill="rgb(var(--brand-card))" border="rgb(var(--brand-line))" dashed label="Uncategorized" />}
            <LegendSwatch fill="rgb(var(--brand-muted) / 0.15)" border="rgb(var(--brand-muted) / 0.6)" dashed label="Disabled" />
            <span className="text-brand-muted/80">· dashed = open, solid = assigned</span>
          </>
        ) : (
          <>
            <LegendSwatch fill="rgb(var(--brand-card))" border="rgb(var(--brand-line))" dashed label="Available" />
            <LegendSwatch fill="rgb(var(--brand-primary) / 0.15)" border="rgb(var(--brand-primary) / 0.5)" label="Filled" />
            <LegendSwatch fill="rgb(var(--brand-accent) / 0.85)" border="rgb(var(--brand-accent))" label="Highlighted" />
            <LegendSwatch fill="rgb(var(--brand-muted) / 0.15)" border="rgb(var(--brand-muted) / 0.6)" dashed label="Disabled" />
          </>
        )}
      </div>
    </div>
  );
}

function LegendSwatch({ fill, border, label, dashed }: { fill: string; border: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-3 w-4 rounded-sm" style={{ background: fill, border: `1px ${dashed ? 'dashed' : 'solid'} ${border}` }} />
      {label}
    </span>
  );
}
