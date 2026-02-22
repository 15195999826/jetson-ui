import { useMemo } from 'react'

export type Platform = 'kiosk' | 'desktop'

/**
 * 检测当前平台：
 * - kiosk: Jetson 本机 Chromium（Linux + 触屏）
 * - desktop: Windows / macOS 桌面浏览器
 */
export function usePlatform(): Platform {
  return useMemo(() => {
    const ua = navigator.userAgent
    const isLinux = ua.includes('Linux') && !ua.includes('Android')
    return isLinux ? 'kiosk' : 'desktop'
  }, [])
}
