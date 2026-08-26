import type { ContributionDay } from "./github.js";
import type { StreakRange, StreakStats } from "./streak.js";
import { escapeXml, formatCount, formatMonthDay, formatMonthYear, round } from "./svg.js";
import type { Theme } from "./themes.js";

const WIDTH = 840;
const HEIGHT = 280;
const PAD = { left: 52, right: 28 };
const RAIL_Y = 128;
const RAIL_H = 20;
const DEFAULT_RAIL_DAYS = 180;

type CaliperSpec = {
  x1: number;
  x2: number;
  y: number;
  color: string;
  figure: string;
  label: string;
  className: string;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function upperDate(isoDate: string): string {
  return formatMonthDay(isoDate, true).toUpperCase();
}

function rangeCaption(range: StreakRange): string {
  if (!range.start || !range.end || range.length === 0) {
    return "NO CONTRIBUTIONS YET";
  }
  return `CURRENT · ${upperDate(range.start)} -> ${upperDate(range.end)}`;
}

function longestHeader(stats: StreakStats, theme: Theme): string {
  if (stats.longest.length === 0 || !stats.longest.start || !stats.longest.end) {
    return "";
  }
  const dates = `${upperDate(stats.longest.start)} -> ${upperDate(stats.longest.end)}`;
  return (
    `<text class="ag-mono" x="${WIDTH - PAD.right}" y="72" text-anchor="end" fill="${theme.subtitle}" font-size="11" letter-spacing="0.8">LONGEST ${stats.longest.length}</text>` +
    `<text class="ag-mono" x="${WIDTH - PAD.right}" y="92" text-anchor="end" fill="${theme.mono}" font-size="10">${escapeXml(dates)}</text>`
  );
}

function tallyText(stats: StreakStats): string {
  const count = `${formatCount(stats.total)} CONTRIBUTIONS`;
  if (!stats.since) {
    return count;
  }
  return `${count} · SINCE ${formatMonthYear(stats.since).toUpperCase()}`;
}

function sameRange(a: StreakRange, b: StreakRange): boolean {
  return a.length === b.length && a.start === b.start && a.end === b.end;
}

function inWindow(range: StreakRange, first: string, last: string): boolean {
  return Boolean(range.start && range.end && range.start >= first && range.end <= last);
}

function railWindow(args: {
  days: readonly ContributionDay[];
  currentLength: number;
  railDays: number;
}): ContributionDay[] {
  if (args.days.length === 0) {
    return [];
  }
  const floor = Math.max(args.railDays, args.currentLength + 30);
  const window = clamp(floor, 1, args.days.length);
  return args.days.slice(-window);
}

function caliperPath(x1: number, x2: number, y: number, tick: number): string {
  const lineY = y + tick;
  return `M ${round(x1)} ${round(y)} L ${round(x1)} ${round(lineY)} M ${round(x1)} ${round(lineY)} L ${round(x2)} ${round(lineY)} M ${round(x2)} ${round(y)} L ${round(x2)} ${round(lineY)}`;
}

function caliperLength(x1: number, x2: number, tick: number): number {
  return Math.ceil(Math.abs(x2 - x1) + tick * 2) + 1;
}

function overlaps(a: CaliperSpec, b: CaliperSpec, pad: number): boolean {
  return a.x1 < b.x2 + pad && b.x1 < a.x2 + pad;
}

function caliperSvg(spec: CaliperSpec, subtitle: string): string {
  const tick = 7;
  const d = caliperPath(spec.x1, spec.x2, spec.y, tick);
  const length = caliperLength(spec.x1, spec.x2, tick);
  const span = spec.x2 - spec.x1;
  const lineY = spec.y + tick;
  let textX = (spec.x1 + spec.x2) / 2;
  let anchor: "start" | "middle" | "end" = "middle";
  if (span < 52) {
    textX = spec.x2 + 8;
    anchor = "start";
    if (textX > WIDTH - PAD.right - 24) {
      textX = spec.x1 - 8;
      anchor = "end";
    }
  }

  return (
    `<path class="${spec.className}" d="${d}" stroke="${spec.color}" stroke-width="1" stroke-dasharray="${length}" stroke-dashoffset="${length}"/>` +
    `<text class="ag-mono" x="${round(textX)}" y="${round(lineY + 14)}" text-anchor="${anchor}" fill="${spec.color}" font-size="11">${escapeXml(spec.figure)}</text>` +
    `<text class="ag-mono" x="${round(textX)}" y="${round(lineY + 28)}" text-anchor="${anchor}" fill="${subtitle}" font-size="10" letter-spacing="0.8">${escapeXml(spec.label)}</text>`
  );
}

export function renderStreak(args: {
  username: string;
  days: readonly ContributionDay[];
  stats: StreakStats;
  theme: Theme;
  hideBorder: boolean;
  railDays?: number;
}): string {
  const { username, days, stats, theme, hideBorder } = args;
  const railDays = args.railDays ?? DEFAULT_RAIL_DAYS;
  const innerWidth = WIDTH - PAD.left - PAD.right;
  const rail = railWindow({ days, currentLength: stats.current.length, railDays });
  const windowCount = Math.max(rail.length, 1);
  const pitch = innerWidth / windowCount;
  const cell = Math.max(1, pitch * 0.72);
  const border = hideBorder ? "none" : theme.border;
  const title = `${username}'s streak`;
  const clipId = `ag-rail-clip-${theme.name}`;
  const first = rail[0];
  const last = rail[rail.length - 1];

  const cells = rail
    .map((day, index) => {
      if (day.contributionCount <= 0) {
        return "";
      }
      const inCurrent =
        stats.current.start !== null &&
        stats.current.end !== null &&
        day.date >= stats.current.start &&
        day.date <= stats.current.end;
      const x = PAD.left + index * pitch + (pitch - cell) / 2;
      const fill = inCurrent ? theme.streakActive : theme.streakPast;
      return `<rect x="${round(x)}" y="${RAIL_Y}" width="${round(cell)}" height="${RAIL_H}" fill="${fill}"/>`;
    })
    .join("");

  const spanX = (start: string, end: string): { x1: number; x2: number } | null => {
    const iStart = rail.findIndex((day) => day.date === start);
    const iEnd = rail.findIndex((day) => day.date === end);
    if (iStart < 0 || iEnd < 0) {
      return null;
    }
    return {
      x1: PAD.left + iStart * pitch,
      x2: PAD.left + (iEnd + 1) * pitch,
    };
  };

  const calipers: CaliperSpec[] = [];
  const caliperY = 158;
  if (first && last && stats.current.length > 0 && stats.current.start && stats.current.end) {
    const span = spanX(stats.current.start, stats.current.end);
    if (span) {
      calipers.push({
        ...span,
        y: caliperY,
        color: theme.streakActive,
        figure: String(stats.current.length),
        label: "CURRENT",
        className: "ag-caliper",
      });
    }
  }

  if (
    first &&
    last &&
    stats.longest.length > 0 &&
    stats.longest.start &&
    stats.longest.end &&
    !sameRange(stats.longest, stats.current) &&
    inWindow(stats.longest, first.date, last.date)
  ) {
    const span = spanX(stats.longest.start, stats.longest.end);
    if (span) {
      const spec: CaliperSpec = {
        ...span,
        y: caliperY,
        color: theme.caliper,
        figure: String(stats.longest.length),
        label: "LONGEST",
        className: "ag-caliper",
      };
      const current = calipers[0];
      if (current && overlaps(spec, current, 12)) {
        spec.y = caliperY + 44;
      }
      calipers.push(spec);
    }
  }

  const caliperSvgMarkup = calipers.map((spec) => caliperSvg(spec, theme.subtitle)).join("");

  const stacked = calipers.some((spec) => spec.y > caliperY);
  const dateY = stacked ? HEIGHT - 16 : 232;

  const dateBounds =
    first && last
      ? `<text class="ag-mono" x="${PAD.left}" y="${dateY}" fill="${theme.mono}" font-size="10">${escapeXml(upperDate(first.date))}</text>` +
        `<text class="ag-mono" x="${WIDTH - PAD.right}" y="${dateY}" text-anchor="end" fill="${theme.mono}" font-size="10">${escapeXml(upperDate(last.date))}</text>`
      : "";

  const baselineY = RAIL_Y + RAIL_H + 1;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${escapeXml(title)}">
  <title>${escapeXml(title)}</title>
  <style>
    text { font-family: ui-sans-serif, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    .ag-mono {
      font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
      font-variant-numeric: tabular-nums;
    }
    .ag-rail-mask {
      transform-box: fill-box;
      transform-origin: 0 50%;
      transform: translateX(-100%);
      animation: ag-rail-reveal 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .ag-caliper {
      fill: none;
      stroke-linecap: square;
      animation: ag-draw 1.1s cubic-bezier(0.16, 1, 0.3, 1) 0.35s forwards;
    }
    @keyframes ag-rail-reveal {
      to { transform: translateX(0); }
    }
    @keyframes ag-draw {
      to { stroke-dashoffset: 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      .ag-rail-mask { animation: none; transform: none; }
      .ag-caliper { animation: none; stroke-dashoffset: 0; }
    }
  </style>
  <rect x="0.5" y="0.5" width="${WIDTH - 1}" height="${HEIGHT - 1}" rx="12" fill="${theme.background}" stroke="${border}" stroke-width="1"/>
  <text x="${PAD.left}" y="30" fill="${theme.title}" font-size="15" font-weight="600" letter-spacing="-0.15">${escapeXml(title)}</text>
  <text class="ag-mono" x="${WIDTH - PAD.right}" y="30" text-anchor="end" fill="${theme.subtitle}" font-size="11" letter-spacing="0.88">${escapeXml(tallyText(stats))}</text>
  <text class="ag-mono" x="${PAD.left}" y="72" fill="${theme.title}" font-size="34" font-weight="600" letter-spacing="-1.2">${stats.current.length} DAYS</text>
  <text class="ag-mono" x="${PAD.left}" y="92" fill="${theme.subtitle}" font-size="11" letter-spacing="0.8">${escapeXml(rangeCaption(stats.current))}</text>
  ${longestHeader(stats, theme)}
  <defs>
    <clipPath id="${clipId}">
      <rect class="ag-rail-mask" x="${PAD.left}" y="${RAIL_Y}" width="${innerWidth}" height="${RAIL_H + 3}"/>
    </clipPath>
  </defs>
  <g clip-path="url(#${clipId})">
    <line x1="${PAD.left}" y1="${baselineY}" x2="${WIDTH - PAD.right}" y2="${baselineY}" stroke="${theme.grid}" stroke-width="1"/>
    ${cells}
  </g>
  ${caliperSvgMarkup}
  ${dateBounds}
</svg>`;
}
