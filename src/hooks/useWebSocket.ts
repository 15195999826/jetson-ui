import { useEffect, useRef, useState, useCallback } from 'react'
import type { PipelineState, ChatMessage, WsMessage } from '../types'

export function useWebSocket(url: string) {
  const [state, setState] = useState<PipelineState>('idle')
  const [subtitle, setSubtitle] = useState('')
  const [history, setHistory] = useState<ChatMessage[]>([])
  const [connected, setConnected] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const retryCountRef = useRef(0)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountedRef = useRef(true)

  const connect = useCallback(() => {
    if (!isMountedRef.current) return

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      if (!isMountedRef.current) return
      setConnected(true)
      retryCountRef.current = 0
    }

    ws.onmessage = (event) => {
      if (!isMountedRef.current) return
      try {
        const msg: WsMessage = JSON.parse(event.data)
        switch (msg.type) {
          case 'state_changed':
            setState(msg.state)
            break
          case 'user_text':
            setHistory(h => [...h, { role: 'user', text: msg.text }])
            setSubtitle('')
            break
          case 'assistant_chunk':
            if (!msg.done) {
              setSubtitle(s => s + msg.text)
            }
            break
          case 'assistant_text':
            setHistory(h => [...h, { role: 'assistant', text: msg.text }])
            setSubtitle('')
            break
          case 'error':
            setHistory(h => [...h, { role: 'assistant', text: `⚠️ ${msg.text}` }])
            break
        }
      } catch {
        // ignore malformed messages
      }
    }

    ws.onclose = () => {
      if (!isMountedRef.current) return
      setConnected(false)
      wsRef.current = null
      // 指数退避重连：1s → 2s → 4s → ... → 30s
      const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000)
      retryCountRef.current += 1
      retryTimerRef.current = setTimeout(connect, delay)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [url])

  useEffect(() => {
    isMountedRef.current = true
    connect()
    return () => {
      isMountedRef.current = false
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  return { state, subtitle, history, connected }
}
