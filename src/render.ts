import type { ContributionDay, Contributions } from "./github.js";
import type { Theme } from "./themes.js";

const WIDTH = 840;
const HEIGHT = 320;
const PAD = { top: 64, right: 28, bottom: 40, left: 52 };

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

type Point = { x: number; y: number };

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatLabel(isoDate: string, includeDay: boolean): string {
  const parts = isoDate.split("-");
  const monthIndex = Number(parts[1]) - 1;
  const month = MONTHS[monthIndex] ?? "Jan";
  if (!includeDay) {
    return month;
  }
  return `${month} ${Number(parts[2])}`;
}

function pickLabels(days: readonly ContributionDay[]): { index: number; text: string }[] {
  if (days.length === 0) {
    return [];
  }
  const includeDay = days.length <= 100;
  if (!includeDay) {
    const byMonth: { index: number; text: string }[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < days.length; i++) {
      const day = days[i];
      if (!day) {
        continue;
      }
      const key = day.date.slice(0, 7);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      byMonth.push({ index: i, text: formatLabel(day.date, false) });
    }
    if (byMonth.length <= 8) {
      return byMonth;
    }
    const count = 6;
    const last = byMonth.length - 1;
    const labels: { index: number; text: string }[] = [];
    for (let i = 0; i < count; i++) {
      const pick = byMonth[Math.round((i * last) / (count - 1))];
      if (pick) {
        labels.push(pick);
      }
    }
    return labels;
  }

  const count = Math.min(6, days.length);
  const labels: { index: number; text: string }[] = [];
  const lastIndex = days.length - 1;
  for (let i = 0; i < count; i++) {
    const index = count === 1 ? 0 : Math.round((i * lastIndex) / (count - 1));
    const day = days[index];
    if (!day) {
      continue;
    }
    labels.push({ index, text: formatLabel(day.date, true) });
  }
  return labels;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// Control polygon length is an upper bound on a cubic's arc length. Overshooting
// is harmless for the draw-on dash, undershooting leaves a visible gap.
function cubicLengthBound(p1: Point, cp1: Point, cp2: Point, p2: Point): number {
  return (
    Math.hypot(cp1.x - p1.x, cp1.y - p1.y) +
    Math.hypot(cp2.x - cp1.x, cp2.y - cp1.y) +
    Math.hypot(p2.x - cp2.x, p2.y - p2.y)
  );
}

function toSmoothPath(
  points: readonly Point[],
  yMin: number,
  yMax: number,
): { d: string; length: number } {
  const first = points[0];
  if (!first) {
    return { d: "", length: 0 };
  }
  if (points.length === 1) {
    return { d: `M ${round(first.x)} ${round(first.y)}`, length: 0 };
  }

  const parts = [`M ${round(first.x)} ${round(first.y)}`];
  let length = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    if (!p0 || !p1 || !p2 || !p3) {
      continue;
    }
    const cp1 = {
      x: p1.x + (p2.x - p0.x) / 6,
      y: clamp(p1.y + (p2.y - p0.y) / 6, yMin, yMax),
    };
    const cp2 = {
      x: p2.x - (p3.x - p1.x) / 6,
      y: clamp(p2.y - (p3.y - p1.y) / 6, yMin, yMax),
    };
    length += cubicLengthBound(p1, cp1, cp2, p2);
    parts.push(
      `C ${round(cp1.x)} ${round(cp1.y)}, ${round(cp2.x)} ${round(cp2.y)}, ${round(p2.x)} ${round(p2.y)}`,
    );
  }
  return { d: parts.join(" "), length };
}

function plotPoints(days: readonly ContributionDay[]): Point[] {
  const innerWidth = WIDTH - PAD.left - PAD.right;
  const innerHeight = HEIGHT - PAD.top - PAD.bottom;
  const maxCount = Math.max(1, ...days.map((day) => day.contributionCount));
  const lastIndex = Math.max(days.length - 1, 1);

  return days.map((day, index) => ({
    x: PAD.left + (index / lastIndex) * innerWidth,
    y: PAD.top + innerHeight - (day.contributionCount / maxCount) * innerHeight,
  }));
}

function gridLines(maxCount: number): { y: number; label: string }[] {
  const innerHeight = HEIGHT - PAD.top - PAD.bottom;
  return [
    {
      y: PAD.top + 0.5 * innerHeight,
      label: String(Math.round(maxCount / 2)),
    },
    {
      y: PAD.top + innerHeight,
      label: "0",
    },
  ];
}

function peakIndex(days: readonly ContributionDay[]): number {
  let best = 0;
  for (let i = 0; i < days.length; i++) {
    const day = days[i];
    const current = days[best];
    if (day && current && day.contributionCount >= current.contributionCount) {
      best = i;
    }
  }
  return best;
}

function peakAnchor(x: number): "start" | "middle" | "end" {
  if (x < PAD.left + 36) {
    return "start";
  }
  if (x > WIDTH - PAD.right - 36) {
    return "end";
  }
  return "middle";
}

export function renderGraph(args: {
  username: string;
  contributions: Contributions;
  theme: Theme;
  hideBorder: boolean;
  days: number;
}): string {
  const { username, contributions, theme, hideBorder, days } = args;
  const points = plotPoints(contributions.days);
  const { d: linePath, length: lineLength } = toSmoothPath(points, PAD.top, HEIGHT - PAD.bottom);
  const first = points[0];
  const last = points[points.length - 1];
  const baseline = HEIGHT - PAD.bottom;
  const areaPath =
    first && last && linePath
      ? `${linePath} L ${round(last.x)} ${round(baseline)} L ${round(first.x)} ${round(baseline)} Z`
      : "";

  const maxCount = Math.max(1, ...contributions.days.map((day) => day.contributionCount));
  const grids = gridLines(maxCount);
  const labels = pickLabels(contributions.days);
  const innerWidth = WIDTH - PAD.left - PAD.right;
  const lastIndex = Math.max(contributions.days.length - 1, 1);
  const border = hideBorder ? "none" : theme.border;
  const title = `${username}'s Contribution Graph`;
  const subtitle = `${contributions.total} CONTRIBUTIONS · ${days} DAYS`;
  const gradientId = `ag-area-${theme.name}`;
  const pathLength = Math.ceil(lineLength) + 1;
  const peakIdx = peakIndex(contributions.days);
  const peakPoint = points[peakIdx];
  const peakDay = contributions.days[peakIdx];
  const peakCount = peakDay?.contributionCount ?? 0;

  const gridSvg = grids
    .map(
      (line) =>
        `<line x1="${PAD.left}" y1="${round(line.y)}" x2="${WIDTH - PAD.right}" y2="${round(line.y)}" stroke="${theme.grid}" stroke-width="1"/>` +
        `<text class="ag-mono" x="${PAD.left - 8}" y="${round(line.y + 4)}" text-anchor="end" fill="${theme.mono}" font-size="10">${line.label}</text>`,
    )
    .join("");

  const labelSvg = labels
    .map((label) => {
      const x = PAD.left + (label.index / lastIndex) * innerWidth;
      const anchor = label.index === 0 ? "start" : label.index === lastIndex ? "end" : "middle";
      return `<text class="ag-mono" x="${round(x)}" y="${HEIGHT - 14}" text-anchor="${anchor}" fill="${theme.mono}" font-size="10">${escapeXml(label.text)}</text>`;
    })
    .join("");

  const lastPointSvg = last
    ? `<circle cx="${round(last.x)}" cy="${round(last.y)}" r="5" fill="${theme.background}"/>` +
      `<circle cx="${round(last.x)}" cy="${round(last.y)}" r="3" fill="${theme.point}"/>`
    : "";

  let peakSvg = "";
  if (peakPoint && peakCount > 0) {
    const isLast = peakIdx === points.length - 1;
    const marker = isLast
      ? ""
      : `<circle cx="${round(peakPoint.x)}" cy="${round(peakPoint.y)}" r="2.5" fill="${theme.peak}"/>`;
    const labelY = round(Math.max(44, peakPoint.y - 12));
    peakSvg =
      marker +
      `<text class="ag-mono" x="${round(peakPoint.x)}" y="${labelY}" text-anchor="${peakAnchor(peakPoint.x)}" fill="${theme.mono}" font-size="10">${peakCount}</text>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${escapeXml(title)}">
  <title>${escapeXml(title)}</title>
  <style>
    text { font-family: ui-sans-serif, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    .ag-mono {
      font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
      font-variant-numeric: tabular-nums;
    }
    .ag-line {
      fill: none;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-dasharray: ${round(pathLength)};
      stroke-dashoffset: ${round(pathLength)};
      animation: ag-draw 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes ag-draw {
      to { stroke-dashoffset: 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      .ag-line { animation: none; stroke-dashoffset: 0; }
    }
  </style>
  <rect x="0.5" y="0.5" width="${WIDTH - 1}" height="${HEIGHT - 1}" rx="12" fill="${theme.background}" stroke="${border}" stroke-width="1"/>
  <text x="${PAD.left}" y="30" fill="${theme.title}" font-size="15" font-weight="600" letter-spacing="-0.15">${escapeXml(title)}</text>
  <text class="ag-mono" x="${WIDTH - PAD.right}" y="30" text-anchor="end" fill="${theme.subtitle}" font-size="11" letter-spacing="0.88">${escapeXml(subtitle)}</text>
  ${gridSvg}
  ${labelSvg}
  <defs>
    <linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${theme.area}" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="${theme.area}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  ${areaPath ? `<path d="${areaPath}" fill="url(#${gradientId})"/>` : ""}
  ${linePath ? `<path class="ag-line" d="${linePath}" stroke="${theme.line}" stroke-width="2"/>` : ""}
  ${peakSvg}
  ${lastPointSvg}
</svg>`;
}

export function renderErrorGraph(args: { message: string; theme: Theme }): string {
  const { message, theme } = args;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="Activity graph error">
  <style>
    text { font-family: ui-sans-serif, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    .ag-mono {
      font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
      font-variant-numeric: tabular-nums;
    }
  </style>
  <rect x="0.5" y="0.5" width="${WIDTH - 1}" height="${HEIGHT - 1}" rx="12" fill="${theme.background}" stroke="${theme.border}" stroke-width="1"/>
  <text x="${PAD.left}" y="30" fill="${theme.title}" font-size="15" font-weight="600" letter-spacing="-0.15">Could not load graph</text>
  <text class="ag-mono" x="${PAD.left}" y="52" fill="${theme.mono}" font-size="12">${escapeXml(message)}</text>
</svg>`;
}
