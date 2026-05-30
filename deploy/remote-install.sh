#!/usr/bin/env bash
set -euo pipefail
REMOTE_ROOT="/var/www/hot-pot.ton-ton.fun"

sudo mkdir -p "$REMOTE_ROOT"
sudo rm -rf "${REMOTE_ROOT:?}"/*
sudo tar -xzf /tmp/hotpot-party-deploy.tgz -C "$REMOTE_ROOT"
sudo chown -R ubuntu:ubuntu "$REMOTE_ROOT"
cd "$REMOTE_ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

npx drizzle-kit push || true

pm2 delete hotpot-party 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save

sudo cp /tmp/nginx-hot-pot.conf /etc/nginx/sites-available/hot-pot.ton-ton.fun
sudo ln -sf /etc/nginx/sites-available/hot-pot.ton-ton.fun /etc/nginx/sites-enabled/hot-pot.ton-ton.fun
sudo nginx -t
sudo systemctl reload nginx

if ! sudo test -f /etc/letsencrypt/live/hot-pot.ton-ton.fun/fullchain.pem; then
  sudo certbot --nginx -d hot-pot.ton-ton.fun \
    --non-interactive --agree-tos -m xuningj42@gmail.com --redirect || true
fi

sleep 2
echo "health_3005=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3005/ || echo fail)"
echo "health_public=$(curl -sk -o /dev/null -w '%{http_code}' -H 'Host: hot-pot.ton-ton.fun' https://127.0.0.1/ || echo fail)"
