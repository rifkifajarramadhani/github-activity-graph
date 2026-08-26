# GitHub activity graph

Self-hosted SVG line chart of **your** GitHub contributions. Embed it in a profile README the same way you would any image.

```markdown
![Activity Graph](https://your-domain.example/graph)
```

Username is pinned in the environment. The `/graph` endpoint does not accept `?username=`, so other people cannot spend your GitHub API quota.

## Setup

1. [Create a GitHub token](https://github.com/settings/tokens) (classic PAT with no scopes is enough for public activity; use a token on **your** account if you want private contributions included).
2. Copy the env file and fill it in:

```bash
cp .env.example .env
```

3. Run locally:

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000) for a preview. The image itself is [http://127.0.0.1:3000/graph](http://127.0.0.1:3000/graph).

## Query parameters

| Param | Default | Notes |
| --- | --- | --- |
| `theme` | `dark` | `dark` or `light` |
| `days` | `31` | Clamped to 7–365 |
| `hide_border` | `false` | `true` or `1` |

Examples:

```markdown
![Activity Graph](https://your-domain.example/graph)
![Activity Graph](https://your-domain.example/graph?theme=light)
![Activity Graph](https://your-domain.example/graph?days=90&hide_border=true)
```

## Docker

The production image compiles `src` at build time. Pass `--build` whenever source has changed, or Compose will keep serving the previous image.

```bash
docker compose up -d --build
```

For live reload (bind-mounts `src`, runs `tsx watch`):

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Edits under `src` restart the process. `/graph` is served with `Cache-Control: no-store` in development so the browser does not pin an old SVG.

## VPS deploy

The app listens on `127.0.0.1:3000` from Docker Compose. GitHub’s image proxy needs a **public HTTPS** URL, so put a reverse proxy in front.

```bash
docker compose up -d --build
```

Set `HOST=0.0.0.0` in `.env` only if you run without Docker and bind the process yourself. Compose already sets that inside the container.

### Caddy

```caddy
graphs.example.com {
    reverse_proxy 127.0.0.1:3000
}
```

### nginx

```nginx
server {
    listen 443 ssl;
    server_name graphs.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
    }
}
```

Then add the image URL to `https://github.com/<you>/<you>` (your profile README).

## Caching

Contribution data is cached in memory for one hour. GitHub API failures reuse the last successful payload when one exists. Successful SVGs are sent with `Cache-Control: public, max-age=3600` in production, and `Cache-Control: no-store` when `NODE_ENV` is not `production`.

## Endpoints

- `GET /graph` — SVG card
- `GET /health` — `{ "ok": true }`
- `GET /` — HTML preview of `/graph`
