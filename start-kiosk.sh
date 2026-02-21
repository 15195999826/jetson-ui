#!/bin/bash
# 在 Jetson 上运行此脚本启动全屏 Dashboard
# 用法: bash /home/lomo/ui/start-kiosk.sh

pkill -f "python3 -m http.server 3000" 2>/dev/null || true
pkill -f "minimize-server.py" 2>/dev/null || true
sleep 1

export PATH="$HOME/.local/bin:$PATH"

cd /home/lomo/ui
python3 -m http.server 3000 &
echo "HTTP server started (port 3000)"

DISPLAY=:1 python3 /home/lomo/ui/minimize-server.py &
echo "Minimize server started (port 5001)"

sleep 2

# Launch Chromium kiosk pointing to localhost
# --disable-gpu: required on Jetson to avoid libva GPU init crash
DISPLAY=:1 chromium-browser \
  --kiosk \
  --no-first-run \
  --disable-infobars \
  --disable-pinch \
  --overscroll-history-navigation=0 \
  --touch-events=enabled \
  --disable-background-timer-throttling \
  --force-device-scale-factor=1 \
  --no-sandbox \
  --disable-session-crashed-bubble \
  --disable-gpu \
  --disable-dev-shm-usage \
  "http://localhost:3000/"
