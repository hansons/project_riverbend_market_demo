import { navigate } from '@/lib/router';

// A simple, themeable stall map: 4 rows (A–D) × 12, generated to a fixed grid.
// Cells color by state and re-theme via the brand CSS variables.
const ROWS = ['A', 'B', 'C', 'D'];
const COLS = 12;
const CW = 60;
const CH = 38;
const GX = 6;
const GY = 30;
const PADX = 30;
const PADY = 46;

interface Stall {
  label: string;
  x: number;
  y: number;
}
const STALLS: Stall[] = ROWS.flatMap((r, ri) =>
  Array.from({ length: COLS }, (_, ci) => ({
    label: `${r}${ci + 1}`,
    x: PADX + ci * (CW + GX),
    y: PADY + ri * (CH + GY),
  })),
);
const VB_W = PADX * 2 + COLS * (CW + GX);
const VB_H = PADY + ROWS.length * (CH + GY) + 26;

export interface MapOccupant {
  name: string;
  slug?: string;
}

export function MarketMap({
  occupied = {},
  highlight,
  highlightText,
}: {
  occupied?: Record<string, MapOccupant>;
  highlight?: string | null;
  highlightText?: string;
}) {
  const hiStall = highlight ? STALLS.find((s) => s.label === highlight) : undefined;

  return (
    <div className="overflow-x-auto rounded-2xl border border-brand-line bg-brand-paper p-3">
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full min-w-[640px]" role="img" aria-label="Market stall map">
        <text
          x={VB_W / 2}
          y={18}
          textAnchor="middle"
          className="text-[12px] font-semibold"
          style={{ fill: 'rgb(var(--brand-muted))' }}
        >
          ▲ Main entrance &amp; info booth
        </text>

        {STALLS.map((s) => {
          const occ = occupied[s.label];
          const isHi = highlight === s.label;
          const fill = isHi
            ? 'rgb(var(--brand-accent) / 0.85)'
            : occ
              ? 'rgb(var(--brand-primary) / 0.15)'
              : 'rgb(var(--brand-card))';
          const stroke = isHi
            ? 'rgb(var(--brand-accent))'
            : occ
              ? 'rgb(var(--brand-primary) / 0.5)'
              : 'rgb(var(--brand-line))';
          const textFill = isHi
            ? 'rgb(var(--brand-ink))'
            : occ
              ? 'rgb(var(--brand-primary-dark))'
              : 'rgb(var(--brand-muted))';
          const clickable = Boolean(occ?.slug);
          return (
            <g
              key={s.label}
              onClick={() => occ?.slug && navigate(`/vendor/${occ.slug}`)}
              style={{ cursor: clickable ? 'pointer' : 'default' }}
            >
              <title>{occ ? `${s.label} — ${occ.name}` : `${s.label} — available`}</title>
              <rect
                x={s.x}
                y={s.y}
                width={CW}
                height={CH}
                rx={6}
                style={{
                  fill,
                  stroke,
                  strokeWidth: isHi ? 2 : 1,
                  strokeDasharray: occ || isHi ? undefined : '3 3',
                }}
              />
              <text
                x={s.x + CW / 2}
                y={s.y + CH / 2 + 4}
                textAnchor="middle"
                className="text-[11px] font-semibold"
                style={{ fill: textFill }}
              >
                {s.label}
              </text>
            </g>
          );
        })}

        {hiStall && highlightText && (
          <text
            x={hiStall.x + CW / 2}
            y={hiStall.y - 6}
            textAnchor="middle"
            className="text-[11px] font-bold"
            style={{ fill: 'rgb(var(--brand-berry))' }}
          >
            📍 {highlightText}
          </text>
        )}
      </svg>

      <div className="mt-2 flex flex-wrap gap-3 px-1 text-[11px] text-brand-muted">
        <LegendSwatch fill="rgb(var(--brand-card))" border="rgb(var(--brand-line))" dashed label="Available" />
        <LegendSwatch fill="rgb(var(--brand-primary) / 0.15)" border="rgb(var(--brand-primary) / 0.5)" label="Filled" />
        <LegendSwatch fill="rgb(var(--brand-accent) / 0.85)" border="rgb(var(--brand-accent))" label="Highlighted" />
      </div>
    </div>
  );
}

function LegendSwatch({ fill, border, label, dashed }: { fill: string; border: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="h-3 w-4 rounded-sm"
        style={{ background: fill, border: `1px ${dashed ? 'dashed' : 'solid'} ${border}` }}
      />
      {label}
    </span>
  );
}
