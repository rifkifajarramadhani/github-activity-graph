import type { ThemeName } from "./themes.js";

export type PreviewState = {
  graphSrc: string;
  streakSrc: string;
  username: string;
  days: number;
  theme: ThemeName;
  hideBorder: boolean;
};

const WINDOWS = [31, 90, 365] as const;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function href(state: Pick<PreviewState, "days" | "theme" | "hideBorder">): string {
  const params = new URLSearchParams();
  if (state.theme === "light") {
    params.set("theme", "light");
  }
  if (state.days !== 31) {
    params.set("days", String(state.days));
  }
  if (state.hideBorder) {
    params.set("hide_border", "true");
  }
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export function previewPage(state: PreviewState): string {
  const { graphSrc, streakSrc, username, days, theme, hideBorder } = state;
  const who = username ? `${escapeHtml(username)} · ` : "";
  const windows = WINDOWS.map((windowDays) => {
    const current = windowDays === days;
    return `<a class="window" href="${escapeHtml(href({ days: windowDays, theme, hideBorder }))}"${current ? ' aria-current="page"' : ""} data-density="${windowDays}">
        <span class="window-ticks" aria-hidden="true"></span>
        <span class="window-label">${windowDays}</span>
      </a>`;
  }).join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>Contribution line</title>
    <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%2309090B'/%3E%3Cpolyline points='5,22 11,14 16,17 22,8 27,12' fill='none' stroke='%235B9E7E' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"/>
    <link rel="preconnect" href="https://api.fontshare.com" crossorigin/>
    <link rel="preconnect" href="https://fonts.googleapis.com"/>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
    <link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,600,700&display=swap" rel="stylesheet"/>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet"/>
    <style>
      :root {
        color-scheme: dark;
        --ground: #09090B;
        --surface: #18181B;
        --ink: #E4E4E7;
        --mute: #71717A;
        --hair: rgba(113, 113, 122, 0.18);
        --jade: #5B9E7E;
        --focus: #5B9E7E;
      }

      * { box-sizing: border-box; }

      html, body {
        margin: 0;
        min-height: 100dvh;
      }

      body {
        font-family: Satoshi, ui-sans-serif, sans-serif;
        background: var(--ground);
        color: var(--ink);
      }

      a {
        color: inherit;
        text-decoration: none;
      }

      :focus-visible {
        outline: 2px solid var(--focus);
        outline-offset: 3px;
      }

      .page {
        width: min(1080px, calc(100% - 32px));
        margin: 0 auto;
        padding: clamp(1.5rem, 4vw, 2.5rem) 0 clamp(3rem, 8vw, 6rem);
        display: grid;
        gap: clamp(1.75rem, 4vw, 2.75rem);
      }

      .mast {
        display: grid;
        grid-template-columns: minmax(0, 1.35fr) minmax(16rem, 0.85fr);
        gap: 20px 40px;
        align-items: end;
      }

      h1 {
        margin: 0;
        font-weight: 650;
        font-size: clamp(2.25rem, 5.5vw, 3.75rem);
        line-height: 0.95;
        letter-spacing: -0.04em;
      }

      h1 .spark {
        display: inline-block;
        height: 0.72em;
        width: auto;
        vertical-align: -0.06em;
        margin: 0 0.06em;
        overflow: hidden;
        border-radius: 0.14em;
      }

      .spark-line {
        fill: none;
        stroke: var(--jade);
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-dasharray: 120;
        stroke-dashoffset: 120;
        animation: spark-draw 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      @keyframes spark-draw {
        to { stroke-dashoffset: 0; }
      }

      .lede {
        margin: 0;
        color: var(--mute);
        font-size: 1rem;
        line-height: 1.45;
        max-width: 34ch;
      }

      .copy {
        margin-top: 16px;
        appearance: none;
        border: 0;
        border-radius: 0.4rem;
        background: var(--jade);
        color: var(--ground);
        font: 600 0.95rem Satoshi, ui-sans-serif, sans-serif;
        padding: 0.7rem 1.1rem;
        min-height: 44px;
        cursor: pointer;
      }

      .copy:hover {
        background: color-mix(in srgb, var(--jade) 96%, #FAFAFA);
      }

      .copy:active {
        transform: translateY(1px);
      }

      .stage {
        display: grid;
        gap: 14px;
      }

      .well {
        background: var(--surface);
        padding: clamp(14px, 2.4vw, 24px);
        border: 1px solid var(--hair);
        border-radius: 1.25rem;
        box-shadow: 0 24px 48px rgba(9, 9, 11, 0.45);
      }

      .well-meta {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin: 0 0 12px;
        font-family: "JetBrains Mono", ui-monospace, monospace;
        font-size: 0.75rem;
        letter-spacing: 0.04em;
        color: var(--mute);
      }

      .well img,
      .well object {
        width: 100%;
        height: auto;
        display: block;
        border-radius: 12px;
      }

      .well object {
        aspect-ratio: 840 / 320;
      }

      .windows {
        display: flex;
        flex-wrap: wrap;
        gap: 4px 4px;
        justify-content: flex-start;
      }

      .window {
        display: grid;
        gap: 8px;
        min-width: 72px;
        min-height: 44px;
        padding: 8px 14px 10px;
        color: var(--mute);
        align-content: end;
      }

      .window:hover {
        color: var(--ink);
      }

      .window[aria-current="page"] {
        color: var(--jade);
      }

      .window-ticks {
        display: block;
        height: 3px;
        opacity: 0.45;
        background-image: repeating-linear-gradient(
          90deg,
          currentColor 0 1px,
          transparent 1px 9px
        );
      }

      .window[data-density="90"] .window-ticks {
        background-image: repeating-linear-gradient(
          90deg,
          currentColor 0 1px,
          transparent 1px 5px
        );
      }

      .window[data-density="365"] .window-ticks {
        background-image: repeating-linear-gradient(
          90deg,
          currentColor 0 1px,
          transparent 1px 3px
        );
      }

      .window[aria-current="page"] .window-ticks {
        opacity: 1;
        animation: tick-pulse 2.8s cubic-bezier(0.16, 1, 0.3, 1) infinite;
      }

      @keyframes tick-pulse {
        50% { opacity: 0.55; }
      }

      .window-label {
        font-family: "JetBrains Mono", ui-monospace, monospace;
        font-size: 0.92rem;
        font-weight: 500;
      }

      .deck {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 18px 32px;
        align-items: start;
      }

      .field {
        display: grid;
        gap: 8px;
      }

      .field-embed {
        grid-column: 1 / -1;
      }

      .field-label {
        margin: 0;
        font-size: 0.72rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--mute);
        font-weight: 600;
      }

      .choices {
        display: flex;
        flex-wrap: wrap;
        gap: 8px 18px;
      }

      .choice {
        color: var(--mute);
        font-weight: 500;
        border-bottom: 1px solid transparent;
        padding: 10px 0 2px;
        min-height: 44px;
        display: inline-flex;
        align-items: center;
      }

      .choice:hover {
        color: var(--ink);
      }

      .choice[aria-current="page"] {
        color: var(--jade);
        border-bottom-color: var(--jade);
      }

      .snippet-wrap {
        margin: 0;
        padding: 12px 14px;
        background: var(--surface);
        border: 1px solid var(--hair);
        border-radius: 0.6rem;
        overflow: auto;
      }

      .snippet {
        font-family: "JetBrains Mono", ui-monospace, monospace;
        font-size: 0.82rem;
        line-height: 1.5;
        color: var(--ink);
        white-space: nowrap;
      }

      @media (max-width: 767px) {
        .mast,
        .deck {
          grid-template-columns: 1fr;
        }

        .page {
          width: min(1080px, calc(100% - 24px));
        }

        h1 .spark {
          display: block;
          height: 0.7em;
          margin: 0.14em 0 0.1em;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .copy:active {
          transform: none;
        }

        .spark-line,
        .window[aria-current="page"] .window-ticks {
          animation: none;
        }

        .spark-line {
          stroke-dashoffset: 0;
        }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <header class="mast">
        <h1>Contribution <svg class="spark" viewBox="0 0 88 32" aria-hidden="true"><rect width="88" height="32" rx="6" fill="#18181B"/><polyline class="spark-line" points="6,22 18,16 28,18 40,10 52,14 64,7 82,12"/></svg> line</h1>
        <div>
          <p class="lede">The SVGs your profile README will load. Pick a window for the line, then copy both.</p>
          <button class="copy" type="button" id="copy">Copy README images</button>
        </div>
      </header>

      <section class="stage" aria-label="Graph preview">
        <div class="well">
          <p class="well-meta">${who}last ${days} days</p>
          <object type="image/svg+xml" data="${escapeHtml(graphSrc)}" aria-label="Contribution activity graph"></object>
        </div>
        <nav class="windows" aria-label="Time window">
          ${windows}
        </nav>
      </section>

      <section class="stage" aria-label="Streak preview">
        <div class="well">
          <p class="well-meta">${who}full history</p>
          <img src="${escapeHtml(streakSrc)}" alt="Contribution streak rail"/>
        </div>
      </section>

      <section class="deck" aria-label="Embed options">
        <div class="field">
          <p class="field-label">Theme</p>
          <div class="choices">
            <a class="choice" href="${escapeHtml(href({ days, theme: "dark", hideBorder }))}"${theme === "dark" ? ' aria-current="page"' : ""}>Dark</a>
            <a class="choice" href="${escapeHtml(href({ days, theme: "light", hideBorder }))}"${theme === "light" ? ' aria-current="page"' : ""}>Light</a>
          </div>
        </div>
        <div class="field">
          <p class="field-label">Border</p>
          <div class="choices">
            <a class="choice" href="${escapeHtml(href({ days, theme, hideBorder: false }))}"${!hideBorder ? ' aria-current="page"' : ""}>Show</a>
            <a class="choice" href="${escapeHtml(href({ days, theme, hideBorder: true }))}"${hideBorder ? ' aria-current="page"' : ""}>Hide</a>
          </div>
        </div>
        <div class="field field-embed">
          <p class="field-label">Graph markdown</p>
          <pre class="snippet-wrap"><code class="snippet" id="snippet-graph" data-path="${escapeHtml(graphSrc)}">![Activity Graph](${escapeHtml(graphSrc)})</code></pre>
        </div>
        <div class="field field-embed">
          <p class="field-label">Streak markdown</p>
          <pre class="snippet-wrap"><code class="snippet" id="snippet-streak" data-path="${escapeHtml(streakSrc)}">![Streak](${escapeHtml(streakSrc)})</code></pre>
        </div>
      </section>
    </main>
    <script>
      (function () {
        var graphEl = document.getElementById("snippet-graph");
        var streakEl = document.getElementById("snippet-streak");
        var button = document.getElementById("copy");
        if (!graphEl || !streakEl || !button) return;
        var graphPath = graphEl.getAttribute("data-path") || "/graph";
        var streakPath = streakEl.getAttribute("data-path") || "/streak";
        var graphMd = "![Activity Graph](" + location.origin + graphPath + ")";
        var streakMd = "![Streak](" + location.origin + streakPath + ")";
        var markdown = graphMd + "\\n" + streakMd;
        graphEl.textContent = graphMd;
        streakEl.textContent = streakMd;
        button.addEventListener("click", function () {
          function fail() {
            button.textContent = "Copy failed — select a snippet";
          }
          if (!navigator.clipboard) {
            fail();
            return;
          }
          navigator.clipboard.writeText(markdown).then(function () {
            button.textContent = "Copied README images";
            window.setTimeout(function () {
              button.textContent = "Copy README images";
            }, 2000);
          }, fail);
        });
      })();
    </script>
  </body>
</html>`;
}
