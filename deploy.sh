#!/bin/bash
set -e

JETSON_HOST="jetson"
VOICE_DIR="/home/lomo/nanobot/nanobot/custom/voice"
DIST_DIR="$VOICE_DIR/dist"

echo "🔨 构建前端..."
npm run build

echo "📦 部署到 Jetson (voice/dist/)..."
ssh "$JETSON_HOST" "rm -rf $DIST_DIR && mkdir -p $DIST_DIR"
scp -r dist/* "$JETSON_HOST:$DIST_DIR/"

echo "✅ 部署完成！"
echo ""
echo "前端已部署到 $DIST_DIR"
echo "由 voice/server.py (FastAPI :8080) 直接 serve"
echo ""
echo "访问: http://192.168.1.29:8080/"
