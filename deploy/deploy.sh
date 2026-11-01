#!/usr/bin/env bash
# Forced command for the CI deploy key (see README.md): that key can run this script and nothing else.
# CI sends "<version> <server-digest> <client-digest> <registry-user>" as the SSH command and a
# short-lived registry token on stdin. The token only ever lives in a temp dir that is removed after the pull.
set -euo pipefail
umask 077
cd "$(dirname "$(readlink -f "$0")")"

fail() {
  echo "deploy: $*" >&2
  exit 1
}

exec 9> .deploy.lock
flock -n 9 || fail "another deploy is already running"

read -r -a args <<< "${SSH_ORIGINAL_COMMAND:-}"
[[ ${#args[@]} -eq 4 ]] || fail "usage: <version> <server-digest> <client-digest> <registry-user>"
version=${args[0]} server_digest=${args[1]} client_digest=${args[2]} registry_user=${args[3]}

[[ $version =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]] || fail "invalid version"
[[ $server_digest =~ ^sha256:[0-9a-f]{64}$ ]] || fail "invalid server digest"
[[ $client_digest =~ ^sha256:[0-9a-f]{64}$ ]] || fail "invalid client digest"
[[ $registry_user =~ ^[A-Za-z0-9-]{1,39}(\[bot\])?$ ]] || fail "invalid registry user"
[[ -f .env ]] || fail "missing $PWD/.env (copy .env.example and fill it in)"

registry_token=
IFS= read -r registry_token || true
[[ -n $registry_token ]] || fail "missing registry token on stdin"

next_release=$(mktemp release.env.XXXXXX)
registry_config=$(mktemp -d)
trap 'rm -rf "$registry_config" "$next_release"' EXIT
printf 'RELEASE_VERSION=%s\nSERVER_DIGEST=%s\nCLIENT_DIGEST=%s\n' "$version" "$server_digest" "$client_digest" > "$next_release"

compose() {
  local release_file=$1
  shift
  docker compose --env-file .env --env-file "$release_file" "$@"
}

echo "deploy: pulling $version"
printf '%s' "$registry_token" | DOCKER_CONFIG=$registry_config docker login ghcr.io --username "$registry_user" --password-stdin > /dev/null
unset registry_token
DOCKER_CONFIG=$registry_config compose "$next_release" pull --quiet
rm -rf "$registry_config"

echo "deploy: starting $version"
if ! compose "$next_release" up --detach --remove-orphans --wait --wait-timeout 180; then
  echo "deploy: $version did not become healthy" >&2
  if [[ -f release.env ]]; then
    echo "deploy: rolling back to the previous release" >&2
    compose release.env up --detach --remove-orphans --wait --wait-timeout 180 || true
  fi
  exit 1
fi

mv "$next_release" release.env
docker image prune --force --filter 'label=org.opencontainers.image.source=https://github.com/LuckyIntegral/RedTetris' > /dev/null
echo "deploy: $version is live"
