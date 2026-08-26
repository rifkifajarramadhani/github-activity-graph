# GitHub activity graph

SVG cards of one GitHub account's contributions, hosted by you, dropped into a profile README like any other image. This repo is the instance behind [github-stats.rifkiramadhani.my.id](https://github-stats.rifkiramadhani.my.id). It is not a public graph-as-a-service. Username is pinned in the environment. `/graph` and `/streak` ignore `?username=`, so other people cannot spend your GitHub API quota.

```markdown
![Activity Graph](https://your-domain.example/graph)
![Streak](https://your-domain.example/streak)
```

Two cards. `/graph` is an 840×320 line chart of a recent window. `/streak` is an 840×280 rail over the full account history. It prints the current run, the longest run, the lifetime total, jade ticks on contributing days, and gaps on zeros. Dark cards match GitHub's `#0D1117` README canvas. Light cards match `#FFFFFF`. Visual rules live in `DESIGN.md`.

The server is Hono on Node 20+. It talks to GitHub's GraphQL API and returns `image/svg+xml`.

## Requirements

- Node 20 or newer. Docker images use Node 22.
- npm. The lockfile is `package-lock.json`.
- A GitHub personal access token for the account you want to graph.
- Docker, if you want compose instead of `npm run dev`.

## GitHub token

The GraphQL contribution calendar is public data. A classic personal access token with no scopes can read it. Private contribution counts only appear when that token belongs to the same account as `GITHUB_USERNAME`. A token for account A plus username B gives you B's public calendar, billed against A's rate limit.

Fine-grained tokens are fussier against this API. Use classic.

1. Sign in as the account you want on the cards.
2. Open [GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)](https://github.com/settings/tokens).
3. Generate new token, then Generate new token (classic).
4. Give it a name you will recognize later, such as `github-activity-graph`.
5. Pick an expiry you can live with. GitHub will email you before it dies. The cards go blank if the token expires and nothing is cached.
6. Leave every scope unchecked.
7. Generate and copy the token once. It starts with `ghp_`. GitHub will not show it again.

Put that value in `GITHUB_TOKEN`. Put the account login in `GITHUB_USERNAME`, with no `@`.

## Local install

```bash
git clone git@github.com:rifkifajarramadhani/github-activity-graph.git
cd github-activity-graph
cp .env.example .env
```

HTTPS clone if you do not have SSH keys on GitHub:

```bash
git clone https://github.com/rifkifajarramadhani/github-activity-graph.git
```

Edit `.env`. The file is gitignored.

| Variable | Default | What it does |
| --- | --- | --- |
| `GITHUB_TOKEN` | none | Classic PAT from the steps above. Required for `/graph` and `/streak`. |
| `GITHUB_USERNAME` | none | Login whose calendar is drawn. Required for those endpoints. |
| `PORT` | `3000` | HTTP port. |
| `HOST` | `127.0.0.1` | Bind address. Leave this on loopback unless you intend LAN access. Docker compose overrides it to `0.0.0.0` inside the container. |
| `IMAGE_TAG` | `latest` | Tag for the prod compose image. Actions sets this to the git SHA on deploy. |

```bash
npm install
npm run dev
```

That is `tsx watch src/server.ts`. Edits under `src` restart the process.

- Preview: [http://127.0.0.1:3000](http://127.0.0.1:3000)
- Graph: [http://127.0.0.1:3000/graph](http://127.0.0.1:3000/graph)
- Streak: [http://127.0.0.1:3000/streak](http://127.0.0.1:3000/streak)
- Health: [http://127.0.0.1:3000/health](http://127.0.0.1:3000/health)

If `GITHUB_TOKEN` or `GITHUB_USERNAME` is missing, the process still listens. `/health` still returns `{ "ok": true }`. The image routes return an error SVG that says to set those two variables.

Production-style local run, no Docker:

```bash
npm run build
npm start
```

`npm start` runs `node dist/server.js`. There is no live reload.

## Query parameters

Shared by `/graph` and `/streak`:

| Param | Default | Notes |
| --- | --- | --- |
| `theme` | `dark` | `dark` or `light` |
| `hide_border` | `false` | `true` or `1` |

`/graph` only:

| Param | Default | Notes |
| --- | --- | --- |
| `days` | `31` | Clamped to 7-365 |

`/streak` only:

| Param | Default | Notes |
| --- | --- | --- |
| `rail_days` | `180` | Parsed value is clamped to 30-3650. The visible rail is `max(rail_days, current streak + 30)`, then clamped to history length. |

The preview page at `/` accepts the same `theme`, `hide_border`, and `days` query string and rewrites the image URLs to match. It does not currently expose a `rail_days` picker.

```markdown
![Activity Graph](https://your-domain.example/graph)
![Activity Graph](https://your-domain.example/graph?theme=light)
![Activity Graph](https://your-domain.example/graph?days=90&hide_border=true)
![Streak](https://your-domain.example/streak)
![Streak](https://your-domain.example/streak?theme=light&hide_border=true)
```

Drop those into `https://github.com/<you>/<you>`, the profile README repo.

`/streak` loads the account's full contribution history. GitHub's calendar field only returns one year at a time. The first request asks for `createdAt`, then one aliased GraphQL document covering each year since. Typical accounts take one HTTP round-trip. The server retries year by year if GitHub rejects the batched query. That payload is cached in memory for one hour, same as `/graph`.

## Docker

Local live reload. Bind-mounts `src`, runs `tsx watch`:

```bash
docker compose --profile dev up --build
```

The container publishes `127.0.0.1:3000`. Edits under `src` restart the process. `/graph` and `/streak` are served with `Cache-Control: no-store` in development so the browser does not pin an old SVG.

The production image compiles `src` at build time. `--profile prod` is the VPS service behind Traefik. That service joins an external Docker network named `edge`. It will not start on a machine that does not already have that network and a Traefik proxy on it. Use `--profile dev` on a laptop.

## This instance

A push to `main` on [rifkifajarramadhani/github-activity-graph](https://github.com/rifkifajarramadhani/github-activity-graph) runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). The workflow builds `ghcr.io/rifkifajarramadhani/github-activity-graph` at `latest` and at the commit SHA. It then SSHs into the VPS, checks the repo out at that SHA with `git reset --hard`, and runs `deploy/vps/deploy.sh`. Traefik on the shared `edge` network terminates TLS for `github-stats.rifkiramadhani.my.id`.

You can also fire it from Actions → deploy → Run workflow.

### GitHub Actions secrets

Open the repo's Settings, then Secrets and variables, then Actions.

| Secret | Purpose |
| --- | --- |
| `SSH_HOST` | VPS hostname or IP |
| `SSH_USER` | SSH user |
| `SSH_KEY` | Private key for that user, the full PEM, including the `BEGIN` / `END` lines |

`GITHUB_TOKEN` is provided by Actions. The workflow requests `packages: write` so it can push to GHCR. You do not add a PAT for the image push.

The VPS `.env` is a different file. That is where `GITHUB_TOKEN` and `GITHUB_USERNAME` for the cards live. Actions never sees those two.

### One-time VPS bootstrap

1. Point `github-stats.rifkiramadhani.my.id` at the VPS.
2. Confirm the shared Traefik proxy and the external Docker network `edge` already exist.
3. Install [docker-rollout](https://github.com/wowu/docker-rollout) on the VPS. `deploy/vps/deploy.sh` calls `docker rollout activity-graph-prod`.
4. Clone the repo and create `.env` by hand. The file is gitignored, so later `git reset --hard` leaves it alone:

```bash
git clone git@github.com:rifkifajarramadhani/github-activity-graph.git ~/github-activity-graph
cd ~/github-activity-graph
cp .env.example .env
# fill GITHUB_TOKEN and GITHUB_USERNAME
```

5. Log Docker into GHCR so the VPS can pull the image:

```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u rifkifajarramadhani --password-stdin
```

`GHCR_TOKEN` needs `read:packages`. A classic PAT with that scope, or a fine-grained token with read on this package, both work.

6. After the first GHCR image exists, start the stack once. Later deploys pull the SHA tag and roll the container:

```bash
cd ~/github-activity-graph
IMAGE_TAG=latest docker compose --profile prod up -d
```

Then add the image URLs to the profile README.

### Forking this onto another host

Change the GHCR path and Traefik `Host()` in `docker-compose.yml`, and the image tags in `.github/workflows/deploy.yml`. Create the same three SSH secrets on the new repo. Bootstrap a VPS the same way, with your domain and your GHCR login. The app itself does not care about the hostname. Traefik does.

## Caching

Contribution data is cached in memory for one hour. GitHub API failures reuse the last successful payload when one exists. Successful SVGs are sent with `Cache-Control: public, max-age=3600` in production, and `Cache-Control: no-store` when `NODE_ENV` is not `production`. Restarting the process drops the memory cache. GitHub's own image proxy may still hold the previous SVG until that hour is up.

## Endpoints

- `GET /graph` returns the SVG line chart
- `GET /streak` returns the SVG streak rail over full history
- `GET /health` returns `{ "ok": true }`
- `GET /` returns the HTML preview of both cards
