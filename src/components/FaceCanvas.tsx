import { useCallback, useEffect, useRef } from 'react'
import type { PipelineState } from '../types'

interface Props {
  state: PipelineState
}

export function FaceCanvas({ state }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const clickTimesRef = useRef<number[]>([])

  const handleClick = useCallback(() => {
    const now = Date.now()
    clickTimesRef.current = clickTimesRef.current.filter(t => now - t < 2000)
    clickTimesRef.current.push(now)
    if (clickTimesRef.current.length >= 4) {
      clickTimesRef.current = []
      fetch('/api/minimize', { method: 'POST' }).catch(() => {})
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let blinkTimer: number | null = null
    let isBlinking = false
    let mounted = true

    const cx = 160
    const cy = 160
    const eyeY = cy - 20
    const mouthY = cy + 30

    const draw = () => {
      if (!mounted) return
      const time = Date.now()

      // Clear background
      ctx.fillStyle = '#1a1a2e'
      ctx.fillRect(0, 0, 320, 320)

      // Default styles
      ctx.fillStyle = '#e0e0e0'
      ctx.strokeStyle = '#e0e0e0'
      ctx.lineWidth = 3
      ctx.lineCap = 'round'

      let leftEyeX = cx - 40
      let rightEyeX = cx + 40
      let currentEyeY = eyeY
      let eyeSize = 8

      // State specific logic
      switch (state) {
        case 'idle':
          eyeSize = 8
          break
        case 'triggered':
          eyeSize = 14
          currentEyeY = eyeY - 6
          break
        case 'recording':
          eyeSize = 12
          currentEyeY = eyeY - 4
          break
        case 'transcribing': {
          eyeSize = 8
          const scanOffset = Math.sin(time / 300) * 5
          leftEyeX += scanOffset
          rightEyeX += scanOffset
          break
        }
        case 'thinking':
          eyeSize = 8
          leftEyeX += 3
          rightEyeX += 3
          break
        case 'responding':
          eyeSize = 9
          break
      }

      // Draw Eyes
      ctx.beginPath()
      if (isBlinking) {
        // Draw closed eyes (lines)
        ctx.moveTo(leftEyeX - eyeSize, currentEyeY)
        ctx.lineTo(leftEyeX + eyeSize, currentEyeY)
        ctx.moveTo(rightEyeX - eyeSize, currentEyeY)
        ctx.lineTo(rightEyeX + eyeSize, currentEyeY)
        ctx.stroke()
      } else {
        // Draw open eyes (circles)
        ctx.arc(leftEyeX, currentEyeY, eyeSize, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(rightEyeX, currentEyeY, eyeSize, 0, Math.PI * 2)
        ctx.fill()
      }

      // Draw Mouth
      ctx.beginPath()
      switch (state) {
        case 'idle':
          ctx.arc(cx, mouthY, 20, 0.1 * Math.PI, 0.9 * Math.PI)
          ctx.stroke()
          break
        case 'triggered':
          ctx.ellipse(cx, mouthY, 8, 12, 0, 0, Math.PI * 2)
          ctx.stroke()
          break
        case 'recording':
          ctx.arc(cx, mouthY, 15, 0.15 * Math.PI, 0.85 * Math.PI)
          ctx.stroke()
          break
        case 'transcribing':
          ctx.moveTo(cx - 15, mouthY)
          ctx.lineTo(cx + 15, mouthY)
          ctx.stroke()
          break
        case 'thinking':
          ctx.moveTo(cx - 15, mouthY)
          ctx.quadraticCurveTo(cx, mouthY + 10, cx + 15, mouthY - 5)
          ctx.stroke()
          break
        case 'responding': {
          const mouthOpen = 0.2 + (Math.sin(time / 150) + 1) / 2 * 0.5 // 0.2 to 0.7
          ctx.ellipse(cx, mouthY, 15, 15 * mouthOpen, 0, 0, Math.PI * 2)
          ctx.stroke()
          break
        }
      }

      animId = requestAnimationFrame(draw)
    }

    const scheduleBlink = (interval: number) => {
      if (interval <= 0 || !mounted) return
      blinkTimer = window.setTimeout(() => {
        if (!mounted) return
        isBlinking = true
        setTimeout(() => {
          if (!mounted) return
          isBlinking = false
          blinkTimer = null
          scheduleBlink(interval)
        }, 120)
      }, interval)
    }

    draw()

    let blinkInterval = 0
    switch (state) {
      case 'idle': blinkInterval = 3000; break
      case 'recording': blinkInterval = 1500; break
      case 'thinking': blinkInterval = 800; break
      case 'responding': blinkInterval = 4000; break
      case 'triggered':
      case 'transcribing':
      default: blinkInterval = 0; break
    }
    scheduleBlink(blinkInterval)

    return () => {
      mounted = false
      cancelAnimationFrame(animId)
      if (blinkTimer) clearTimeout(blinkTimer)
    }
  }, [state])

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={320}
      style={{ width: '100%', height: '100%', display: 'block', cursor: 'pointer' }}
      onClick={handleClick}
    />
  )
}
