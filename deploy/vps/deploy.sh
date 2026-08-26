#!/usr/bin/env bash

set -euo pipefail

target_sha="${1:?target SHA is required}"

if [[ ! "$target_sha" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Invalid target SHA: $target_sha" >&2
  exit 1
fi

current_sha="$(git rev-parse HEAD)"
if [[ "$current_sha" != "$target_sha" ]]; then
  echo "Deployment checkout is at $current_sha, expected $target_sha." >&2
  exit 1
fi

export IMAGE_TAG="$target_sha"

docker compose --profile prod pull activity-graph-prod
docker rollout activity-graph-prod
docker image prune -f
