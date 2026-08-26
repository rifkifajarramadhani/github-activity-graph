import "dotenv/config";

import { serve } from "@hono/node-server";
import { Hono } from "hono";

import { getContributions } from "./github.js";
import { renderErrorGraph, renderGraph } from "./render.js";
import { themeFromQuery } from "./themes.js";

const DEFAULT_DAYS = 31;
const MIN_DAYS = 7;
const MAX_DAYS = 365;

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

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function svgResponse(body: string, maxAgeSeconds: number): Response {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": `public, max-age=${maxAgeSeconds}`,
    },
  });
}

function previewPage(graphSrc: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>GitHub activity graph</title>
    <style>
      :root { color-scheme: dark; }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: "Segoe UI", Ubuntu, sans-serif;
        background: #0d1117;
        color: #e6edf3;
        display: grid;
        place-items: center;
      }
      main { width: min(880px, calc(100% - 32px)); padding: 32px 0; }
      h1 { font-size: 1.25rem; font-weight: 600; margin: 0 0 8px; }
      p { color: #8b949e; margin: 0 0 20px; line-height: 1.5; }
      code { color: #79c0ff; }
      nav { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 20px; }
      a { color: #58a6ff; }
      img { width: 100%; height: auto; display: block; }
    </style>
  </head>
  <body>
    <main>
      <h1>GitHub activity graph</h1>
      <p>Preview of <code>/graph</code>. Point your profile README at this URL once it is on HTTPS.</p>
      <img src="${escapeHtml(graphSrc)}" alt="Contribution activity graph"/>
      <nav>
        <a href="/">31 days, dark</a>
        <a href="/?theme=light">Light</a>
        <a href="/?days=90">90 days</a>
        <a href="/?days=365">365 days</a>
        <a href="/?hide_border=true">No border</a>
      </nav>
    </main>
  </body>
</html>`;
}

const app = new Hono();

app.get("/health", (c) => c.json({ ok: true }));

app.get("/", (c) => {
  const url = new URL(c.req.url);
  const graphSrc = url.search ? `/graph${url.search}` : "/graph";
  return c.html(previewPage(graphSrc));
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
