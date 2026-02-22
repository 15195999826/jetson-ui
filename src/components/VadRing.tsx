import type { VadState } from '../hooks/useWebSocket'

interface Props {
  vad: VadState
  /** Ring diameter in px (should match PTT button outer size) */
  size?: number
}

/**
 * 环形脉冲 VAD 可视化 — 围绕 PTT 按钮显示。
 * probability 控制光环大小和亮度，isSpeech 控制颜色。
 */
export function VadRing({ vad, size = 80 }: Props) {
  const { isSpeech, probability } = vad
  const scale = 1 + probability * 0.5 // 1.0 ~ 1.5
  const opacity = Math.max(0.1, probability)
  const color = isSpeech ? '#4caf50' : '#2d5a8e'

  return (
    <div
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: '50%',
        border: `3px solid ${color}`,
        opacity,
        transform: `scale(${scale})`,
        transition: 'transform 0.08s linear, opacity 0.08s linear, border-color 0.2s',
        pointerEvents: 'none',
        boxShadow: isSpeech
          ? `0 0 ${12 + probability * 20}px ${color}40`
          : 'none',
      }}
    />
  )
}
