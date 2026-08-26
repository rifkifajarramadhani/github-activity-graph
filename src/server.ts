import "dotenv/config";

import { serve } from "@hono/node-server";
import { Hono } from "hono";

import { getContributions } from "./github.js";
import { previewPage } from "./preview.js";
import { renderErrorGraph, renderGraph } from "./render.js";
import { themeFromQuery } from "./themes.js";

const DEFAULT_DAYS = 31;
const MIN_DAYS = 7;
const MAX_DAYS = 365;
const isDev = process.env.NODE_ENV !== "production";

type GraphOptions = {
  days: number;
  hideBorder: boolean;
  themeQuery: string | undefined;
};

function readConfig(): { token: string; username: string; port: number; hostname: string } {
  return {
    token: process.env.GITHUB_TOKEN?.trim() ?? "",
    username: process.env.GITHUB_USERNAME?.trim() ?? "",
    port: Number(process.env.PORT) || 3000,
    hostname: process.env.HOST?.trim() || "127.0.0.1",
  };
}

function parseDays(value: string | undefined): number {
  if (value === undefined || value === "") {
    return DEFAULT_DAYS;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_DAYS;
  }
  return Math.min(MAX_DAYS, Math.max(MIN_DAYS, Math.round(parsed)));
}

function parseHideBorder(value: string | undefined): boolean {
  return value === "true" || value === "1";
}

function graphOptionsFromQuery(query: {
  days?: string;
  hide_border?: string;
  theme?: string;
}): GraphOptions {
  return {
    days: parseDays(query.days),
    hideBorder: parseHideBorder(query.hide_border),
    themeQuery: query.theme,
  };
}

function svgResponse(body: string, maxAgeSeconds: number): Response {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": isDev ? "no-store" : `public, max-age=${maxAgeSeconds}`,
    },
  });
}

const app = new Hono();

app.get("/health", (c) => c.json({ ok: true }));

app.get("/", (c) => {
  const url = new URL(c.req.url);
  const graphSrc = url.search ? `/graph${url.search}` : "/graph";
  const options = graphOptionsFromQuery({
    days: c.req.query("days"),
    hide_border: c.req.query("hide_border"),
    theme: c.req.query("theme"),
  });
  const theme = themeFromQuery(options.themeQuery);
  return c.html(
    previewPage({
      graphSrc,
      username: readConfig().username,
      days: options.days,
      theme: theme.name,
      hideBorder: options.hideBorder,
    }),
  );
});

app.get("/graph", async (c) => {
  const config = readConfig();
  const options = graphOptionsFromQuery({
    days: c.req.query("days"),
    hide_border: c.req.query("hide_border"),
    theme: c.req.query("theme"),
  });
  const theme = themeFromQuery(options.themeQuery);

  if (!config.token || !config.username) {
    return svgResponse(
      renderErrorGraph({
        message: "Set GITHUB_TOKEN and GITHUB_USERNAME in the environment.",
        theme,
      }),
      60,
    );
  }

  try {
    const contributions = await getContributions({
      username: config.username,
      token: config.token,
      days: options.days,
    });
    const svg = renderGraph({
      username: config.username,
      contributions,
      theme,
      hideBorder: options.hideBorder,
      days: options.days,
    });
    return svgResponse(svg, 3600);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return svgResponse(renderErrorGraph({ message, theme }), 60);
  }
});

const config = readConfig();
if (!config.token || !config.username) {
  console.error("Warning: GITHUB_TOKEN and GITHUB_USERNAME must be set before /graph can render.");
}

serve(
  {
    fetch: app.fetch,
    port: config.port,
    hostname: config.hostname,
  },
  (info) => {
    console.error(`Listening on http://${info.address}:${info.port}`);
  },
);
