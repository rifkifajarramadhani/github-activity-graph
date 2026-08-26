import type { ThemeName } from "./themes.js";

export type PreviewState = {
  graphSrc: string;
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
  const { graphSrc, username, days, theme, hideBorder } = state;
  const who = username ? `${escapeHtml(username)} · ` : "";
  const windows = WINDOWS.map((windowDays) => {
    const current = windowDays === days;
    return `<a class="window" href="${escapeHtml(href({ days: windowDays, theme, hideBorder }))}"${current ? ' aria-current="page"' : ""} data-density="${windowDays}">
        <span class="window-ticks" aria-hidden="true"></span>
        <span class="window-label">${windowDays} days</span>
      </a>`;
  }).join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>Contribution line</title>
    <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%23143a52'/%3E%3Cpolyline points='4,22 10,14 16,18 22,8 28,12' fill='none' stroke='%23e6c36a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"/>
    <link rel="preconnect" href="https://fonts.googleapis.com"/>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
    <link href="https://fonts.googleapis.com/css2?family=Anybody:wdth,wght@75..125,500..800&family=IBM+Plex+Mono:wght@400;500&family=Outfit:wght@400;500;600&display=swap" rel="stylesheet"/>
    <style>
      :root {
        color-scheme: dark;
        --deep: #0c2838;
        --prussian: #143a52;
        --rinse: #e7f0f3;
        --sun: #e6c36a;
        --ink: #f3f8fa;
        --mute: #8fb0c0;
        --tray: #0a1f2c;
        --focus: #e6c36a;
      }

      * { box-sizing: border-box; }

      html, body {
        margin: 0;
        min-height: 100%;
      }

      body {
        font-family: Outfit, ui-sans-serif, sans-serif;
        background:
          radial-gradient(120% 80% at 0% 0%, #1a4e6a 0%, transparent 55%),
          radial-gradient(90% 70% at 100% 100%, #071820 0%, transparent 50%),
          var(--deep);
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
        padding: 28px 0 48px;
        display: grid;
        gap: 28px;
      }

      .mast {
        display: grid;
        grid-template-columns: minmax(0, 1.3fr) minmax(16rem, 0.9fr);
        gap: 20px 32px;
        align-items: end;
      }

      h1 {
        margin: 0;
        font-family: Anybody, Outfit, sans-serif;
        font-weight: 800;
        font-stretch: 75%;
        font-size: clamp(2.4rem, 6vw, 4.4rem);
        line-height: 0.86;
        letter-spacing: -0.045em;
      }

      .lede {
        margin: 0;
        color: var(--mute);
        font-size: 1.02rem;
        line-height: 1.45;
        max-width: 34ch;
      }

      .lede strong {
        color: var(--ink);
        font-weight: 500;
      }

      .copy {
        margin-top: 16px;
        appearance: none;
        border: 0;
        border-radius: 0;
        background: var(--sun);
        color: var(--deep);
        font: 600 0.92rem Outfit, sans-serif;
        padding: 0.72rem 1.05rem;
        cursor: pointer;
      }

      .copy:hover {
        filter: brightness(1.06);
      }

      .copy:active {
        transform: translateY(1px);
      }

      .stage {
        display: grid;
        gap: 0;
      }

      .well {
        background: var(--rinse);
        color: var(--tray);
        padding: clamp(14px, 2.6vw, 26px);
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.4),
          0 0 0 1px rgba(8, 30, 44, 0.5),
          0 28px 50px rgba(6, 18, 28, 0.38);
      }

      .well-meta {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin: 0 0 12px;
        font-size: 0.8rem;
        letter-spacing: 0.02em;
        color: #4e7382;
        font-weight: 500;
      }

      .well img {
        width: 100%;
        height: auto;
        display: block;
      }

      .ruler {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        background: var(--prussian);
        border: 1px solid rgba(8, 30, 44, 0.55);
        border-top: 0;
      }

      .window {
        display: grid;
        gap: 8px;
        padding: 12px 14px 14px;
        color: var(--mute);
        min-width: 0;
      }

      .window + .window {
        border-left: 1px solid rgba(8, 30, 44, 0.45);
      }

      .window:hover {
        color: var(--ink);
        background: rgba(230, 195, 106, 0.06);
      }

      .window[aria-current="page"] {
        color: var(--sun);
        background: rgba(230, 195, 106, 0.12);
      }

      .window-ticks {
        display: block;
        height: 34px;
        opacity: 0.55;
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
        opacity: 0.9;
      }

      .window-label {
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
        padding-bottom: 2px;
      }

      .choice:hover {
        color: var(--ink);
      }

      .choice[aria-current="page"] {
        color: var(--sun);
        border-bottom-color: var(--sun);
      }

      .snippet-wrap {
        margin: 0;
        padding: 12px 14px;
        background: var(--tray);
        border: 1px solid rgba(143, 176, 192, 0.22);
        overflow: auto;
      }

      .snippet {
        font-family: "IBM Plex Mono", ui-monospace, monospace;
        font-size: 0.82rem;
        line-height: 1.5;
        color: var(--rinse);
        white-space: nowrap;
      }

      @media (max-width: 720px) {
        .mast,
        .deck {
          grid-template-columns: 1fr;
        }

        .page {
          width: min(1080px, calc(100% - 24px));
          padding-top: 20px;
        }

        .window {
          padding: 10px 10px 12px;
        }

        .window-ticks {
          height: 24px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .copy:active {
          transform: none;
        }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <header class="mast">
        <h1>Contribution line</h1>
        <div>
          <p class="lede">The SVG your profile README will load. Pick a window, then copy the image markdown.</p>
          <button class="copy" type="button" id="copy">Copy README image</button>
        </div>
      </header>

      <section class="stage" aria-label="Graph preview">
        <div class="well">
          <p class="well-meta">${who}last ${days} days</p>
          <img src="${escapeHtml(graphSrc)}" alt="Contribution activity graph"/>
        </div>
        <nav class="ruler" aria-label="Time window">
          ${windows}
        </nav>
      </section>

      <section class="deck" aria-label="Embed options">
        <div class="field">
          <p class="field-label">Card</p>
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
          <p class="field-label">README markdown</p>
          <pre class="snippet-wrap"><code class="snippet" id="snippet" data-path="${escapeHtml(graphSrc)}">![Activity Graph](${escapeHtml(graphSrc)})</code></pre>
        </div>
      </section>
    </main>
    <script>
      (function () {
        var snippet = document.getElementById("snippet");
        var button = document.getElementById("copy");
        if (!snippet || !button) return;
        var path = snippet.getAttribute("data-path") || "/graph";
        var markdown = "![Activity Graph](" + location.origin + path + ")";
        snippet.textContent = markdown;
        button.addEventListener("click", function () {
          function fail() {
            button.textContent = "Copy failed — select the snippet";
          }
          if (!navigator.clipboard) {
            fail();
            return;
          }
          navigator.clipboard.writeText(markdown).then(function () {
            button.textContent = "Copied README image";
            window.setTimeout(function () {
              button.textContent = "Copy README image";
            }, 2000);
          }, fail);
        });
      })();
    </script>
  </body>
</html>`;
}
