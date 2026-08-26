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
};

export const themes = {
  dark: {
    name: "dark",
    background: "#0d1117",
    border: "#30363d",
    title: "#e6edf3",
    subtitle: "#8b949e",
    grid: "#21262d",
    axis: "#8b949e",
    line: "#58a6ff",
    area: "#58a6ff",
    point: "#79c0ff",
  },
  light: {
    name: "light",
    background: "#ffffff",
    border: "#d0d7de",
    title: "#1f2328",
    subtitle: "#656d76",
    grid: "#d0d7de",
    axis: "#656d76",
    line: "#0969da",
    area: "#0969da",
    point: "#218bff",
  },
} as const satisfies Record<ThemeName, Theme>;

export function themeFromQuery(value: string | undefined): Theme {
  if (value === "light") {
    return themes.light;
  }
  return themes.dark;
}
