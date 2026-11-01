# Production deployment

Pushing a version tag such as `1.2.3` runs `.github/workflows/release.yml`:

1. CI (lint, build, tests) runs against the tagged commit.
2. The server and client images are built and pushed to the private registry `ghcr.io/luckyintegral/redtetris/{server,client}`, and the workflow checks that they cannot be pulled anonymously.
3. The deploy job connects to the server over SSH with a key that can only run `deploy.sh`, which pulls the exact image digests that were just built and restarts the stack. If the new release does not become healthy, it rolls back to the previous one.

Only repository admins can create, move or delete tags, so only admins can deploy. Deploy secrets live in the `production` environment, which only version tags can use.

## One-time server setup

Requirements: a Linux host with [Docker Engine and the compose plugin](https://docs.docker.com/engine/install/), a DNS record pointing `DOMAIN` at it, and a firewall that allows only 22, 80 and 443.

```sh
# Dedicated user. Docker group membership is root-equivalent; the SSH key below is restricted to deploy.sh.
sudo adduser --disabled-password --gecos '' deploy
sudo usermod -aG docker deploy
sudo install -d -o deploy -g deploy -m 700 /srv/red-tetris

# Copy compose.yml, Caddyfile, deploy.sh and .env.example from this directory into /srv/red-tetris, then:
cd /srv/red-tetris
sudo chown deploy:deploy compose.yml Caddyfile deploy.sh .env.example
sudo chmod 700 deploy.sh
sudo -u deploy cp .env.example .env && sudo chmod 600 .env   # fill in every value
```

Create the CI key pair on your machine and authorize it on the server **with the forced command**:

```sh
ssh-keygen -t ed25519 -N '' -C red-tetris-ci -f red-tetris-ci
```

Append one line to `/home/deploy/.ssh/authorized_keys` (directory `700`, file `600`, owned by `deploy`):

```
command="/srv/red-tetris/deploy.sh",restrict ssh-ed25519 AAAA...contents of red-tetris-ci.pub... red-tetris-ci
```

Capture the host key and compare its fingerprint with `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub` on the server:

```sh
ssh-keyscan -t ed25519 your.server.example > known_hosts && ssh-keygen -lf known_hosts
```

## GitHub configuration

```sh
# Deploy secrets, only available to version-tag runs
gh secret set DEPLOY_HOST --env production --body 'your.server.example'
gh secret set DEPLOY_USER --env production --body 'deploy'
gh secret set DEPLOY_SSH_KEY --env production < red-tetris-ci
gh secret set DEPLOY_KNOWN_HOSTS --env production < known_hosts
gh variable set DEPLOY_PORT --env production --body '22'   # only if SSH is not on 22

# Build settings (baked into the client bundle)
gh variable set VITE_SERVER_URL --body 'https://tetris.example.com'   # https://<DOMAIN>
gh variable set VITE_SENTRY_DSN --body '...'                          # optional
gh secret set SENTRY_AUTH_TOKEN                                       # optional, uploads source maps
```

Then delete the local `red-tetris-ci` private key.

## Releasing and operating

```sh
git tag 1.2.3 && git push origin 1.2.3
```

On the server, `release.env` records the running release. Pass both env files to compose for manual commands:

```sh
docker compose --env-file .env --env-file release.env ps
docker compose --env-file .env --env-file release.env logs -f server
```

To roll back by hand, re-run the release workflow of an older tag from the Actions tab. Database migrations are forward-only, so a rollback keeps any schema changes the newer release applied.
