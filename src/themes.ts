export type ThemeName = "dark" | "light";

export type Theme = {
  name: ThemeName;
  background: string;
  border: string;
  title: string;
  subtitle: string;
  grid: string;
  axis: string;
  line: string;
  area: string;
  point: string;
  mono: string;
  peak: string;
  streakActive: string;
  streakPast: string;
  caliper: string;
};

export const themes = {
  dark: {
    name: "dark",
    background: "#0D1117",
    border: "rgba(113,113,122,0.18)",
    title: "#E4E4E7",
    subtitle: "#71717A",
    grid: "rgba(113,113,122,0.18)",
    axis: "#71717A",
    line: "#5B9E7E",
    area: "#5B9E7E",
    point: "#5B9E7E",
    mono: "#A1A1AA",
    peak: "#5B9E7E",
    streakActive: "#5B9E7E",
    streakPast: "rgba(91,158,126,0.45)",
    caliper: "#71717A",
  },
  light: {
    name: "light",
    background: "#FFFFFF",
    border: "rgba(113,113,122,0.18)",
    title: "#18181B",
    subtitle: "#71717A",
    grid: "rgba(113,113,122,0.18)",
    axis: "#71717A",
    line: "#5B9E7E",
    area: "#5B9E7E",
    point: "#5B9E7E",
    mono: "#52525B",
    peak: "#5B9E7E",
    streakActive: "#5B9E7E",
    streakPast: "rgba(91,158,126,0.45)",
    caliper: "#71717A",
  },
} as const satisfies Record<ThemeName, Theme>;

export function themeFromQuery(value: string | undefined): Theme {
  if (value === "light") {
    return themes.light;
  }
  return themes.dark;
}
