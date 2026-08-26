export const MONTHS = [
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

export function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function monthName(isoDate: string): string {
  const monthIndex = Number(isoDate.split("-")[1]) - 1;
  return MONTHS[monthIndex] ?? "Jan";
}

export function formatMonthDay(isoDate: string, includeDay: boolean): string {
  const month = monthName(isoDate);
  if (!includeDay) {
    return month;
  }
  return `${month} ${Number(isoDate.split("-")[2])}`;
}

export function formatMonthYear(isoDate: string): string {
  return `${monthName(isoDate)} ${isoDate.slice(0, 4)}`;
}

export function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}
