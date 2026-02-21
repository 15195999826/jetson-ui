#!/bin/bash
# 在 Jetson 上运行此脚本启动全屏 Dashboard
# 用法: bash /home/lomo/ui/start-kiosk.sh

pkill -f chromium 2>/dev/null || true
pkill -f "http.server 3000" 2>/dev/null || true
sleep 1

python3 -m http.server 3000 --directory /home/lomo/ui &
sleep 2

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
