import { useEffect, useRef } from 'react'
import type { CommandTipMessage } from '../types'

interface Props {
  messages: CommandTipMessage[]
  onClose: () => void
}

const AUTO_CLOSE_MS = 2 * 60 * 1000

export function CommandTip({ messages, onClose }: Props) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(onClose, AUTO_CLOSE_MS)
  }

  useEffect(() => {
    resetTimer()
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [messages])

  return (
    <div className="command-tip-overlay">
      <div className="command-tip">
        <button className="command-tip-close" onClick={onClose}>✕</button>
        <div className="command-tip-messages">
          {messages.map((m, i) => (
            <div key={i} className={`command-tip-msg ${m.role}`}>
              {m.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
