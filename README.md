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

Local live reload (bind-mounts `src`, runs `tsx watch`):

```bash
docker compose --profile dev up --build
```

Edits under `src` restart the process. `/graph` is served with `Cache-Control: no-store` in development so the browser does not pin an old SVG.

The production image compiles `src` at build time and is meant for the VPS behind Traefik (`--profile prod`). Compose already sets `HOST=0.0.0.0` inside the container. Set it in `.env` only if you run without Docker and bind the process yourself.

## VPS deploy

Pushes to `main` build `ghcr.io/rifkifajarramadhani/github-activity-graph` and SSH into the VPS to roll the container. Traefik on the shared `edge` network terminates TLS for `github-stats.rifkiramadhani.my.id`.

### Repo secrets

| Secret | Purpose |
| --- | --- |
| `SSH_HOST` | VPS hostname or IP |
| `SSH_USER` | SSH user |
| `SSH_KEY` | Private key for that user |

`GITHUB_TOKEN` is provided by Actions for pushing to GHCR.

### One-time VPS bootstrap

1. Point `github-stats.rifkiramadhani.my.id` at the VPS.
2. Confirm the shared Traefik proxy and the external Docker network `edge` already exist (same setup as comprimage).
3. Clone the repo and create `.env` by hand (gitignored; `git reset --hard` leaves it alone):

```bash
git clone git@github.com:rifkifajarramadhani/github-activity-graph.git ~/github-activity-graph
cd ~/github-activity-graph
cp .env.example .env
# fill GITHUB_TOKEN and GITHUB_USERNAME
```

4. Log Docker into GHCR so the VPS can pull the image:

```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u rifkifajarramadhani --password-stdin
```

5. After the first GHCR image exists, start the stack once. Later deploys use `docker rollout` from Actions:

```bash
cd ~/github-activity-graph
IMAGE_TAG=latest docker compose --profile prod up -d
```

After that, a push to `main` (or **Actions → deploy → Run workflow**) is enough. Then add the image URL to `https://github.com/<you>/<you>` (your profile README).

## Caching

Contribution data is cached in memory for one hour. GitHub API failures reuse the last successful payload when one exists. Successful SVGs are sent with `Cache-Control: public, max-age=3600` in production, and `Cache-Control: no-store` when `NODE_ENV` is not `production`.

## Endpoints

- `GET /graph` — SVG card
- `GET /health` — `{ "ok": true }`
- `GET /` — HTML preview of `/graph`
