import { useEffect, useRef } from 'react'
import type { ChatMessage } from '../types'

interface Props {
  history: ChatMessage[]
}

export function ChatHistory({ history }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history])

  if (history.length === 0) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#444',
        fontSize: 14,
      }}>
        等待对话...
      </div>
    )
  }

  return (
    <div style={{
      overflowY: 'auto',
      height: '100%',
      padding: '8px 16px',
      WebkitOverflowScrolling: 'touch' as const,
    }}>
      {history.map((msg, i) => (
        <div
          key={i}
          style={{
            marginBottom: 10,
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}
        >
          <span style={{
            display: 'inline-block',
            padding: '6px 12px',
            borderRadius: 12,
            fontSize: 14,
            maxWidth: '85%',
            background: msg.role === 'user' ? '#2d5a8e' : '#2a2a3e',
            color: '#e0e0e0',
            lineHeight: 1.5,
            wordBreak: 'break-all',
          }}>
            {msg.text}
          </span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
