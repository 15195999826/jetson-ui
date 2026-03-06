#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ZEROCLAW_WEB_DIST="$REPO_ROOT/zeroclaw/web/dist"
JETSON_HOST="jetson"

echo "=== 1/4 Build jetson-ui ==="
cd "$SCRIPT_DIR"
npm run build

echo "=== 2/4 Copy dist -> zeroclaw/web/dist ==="
rm -rf "$ZEROCLAW_WEB_DIST"/*
cp -r dist/* "$ZEROCLAW_WEB_DIST/"
echo "Copied to $ZEROCLAW_WEB_DIST"

echo "=== 3/4 Cross-compile zeroclaw (aarch64) ==="
cd "$REPO_ROOT/zeroclaw"
cross build --release --target aarch64-unknown-linux-gnu
BINARY="target/aarch64-unknown-linux-gnu/release/zeroclaw"
echo "Binary: $BINARY ($(du -h "$BINARY" | cut -f1))"

echo "=== 4/4 Deploy to Jetson ==="
scp "$BINARY" "$JETSON_HOST":~/zeroclaw/zeroclaw-new
ssh "$JETSON_HOST" bash -s << 'REMOTE'
set -e
cd ~/zeroclaw
~/zeroclaw/zeroclaw service stop 2>/dev/null || true
sleep 1
mv zeroclaw-new zeroclaw
chmod +x zeroclaw
~/zeroclaw/zeroclaw service start
sleep 2
~/zeroclaw/zeroclaw service status
REMOTE

echo ""
echo "=== Deploy complete ==="
echo "ZeroClaw gateway serves jetson-ui at http://\$(Jetson IP):42617/"
