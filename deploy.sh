#!/bin/bash
set -e

JETSON_HOST="jetson"
JETSON_UI_DIR="/home/lomo/ui"

echo "🔨 构建前端..."
npm run build

echo "📦 部署到 Jetson..."
ssh "$JETSON_HOST" "mkdir -p $JETSON_UI_DIR"
scp -r dist/* "$JETSON_HOST:$JETSON_UI_DIR/"

echo "✅ 部署完成！"
echo ""
echo "启动 UI（在 Jetson 上运行）："
echo "  ssh $JETSON_HOST 'bash /home/lomo/ui/start-kiosk.sh'"
echo ""
echo "或手动启动："
echo "  ssh $JETSON_HOST 'DISPLAY=:1 chromium-browser --kiosk file:///home/lomo/ui/index.html'"
