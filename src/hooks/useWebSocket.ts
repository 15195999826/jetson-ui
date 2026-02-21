import { useEffect, useRef, useState, useCallback } from 'react'
import type { PipelineState, ChatMessage, WsMessage } from '../types'

const BASE_HTTP = `http://${location.hostname}:8080`

export function useWebSocket(url: string) {
  const [state, setState] = useState<PipelineState>('idle')
  const [mode, setMode] = useState<'ptt' | 'natural'>('ptt')
  const [subtitle, setSubtitle] = useState('')
  const [history, setHistory] = useState<ChatMessage[]>([])
  const [connected, setConnected] = useState(false)
  const [sessionKey, setSessionKey] = useState('voice:local')

  const wsRef = useRef<WebSocket | null>(null)
  const retryCountRef = useRef(0)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountedRef = useRef(true)

  const send = useCallback((msg: object) => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg))
    }
  }, [])

  const sendPttStart = useCallback(() => send({ type: 'ptt_start' }), [send])
  const sendPttStop = useCallback(() => send({ type: 'ptt_stop' }), [send])
  const sendSetMode = useCallback((m: 'ptt' | 'natural') => {
    send({ type: 'set_mode', mode: m })
  }, [send])

  const switchSession = useCallback(async (key: string) => {
    send({ type: 'switch_session', key })
    setSessionKey(key)
    setHistory([])
    setSubtitle('')
    try {
      const res = await fetch(`${BASE_HTTP}/sessions/${encodeURIComponent(key)}/history`)
      const data = await res.json()
      if (data.messages) {
        setHistory(data.messages.map((m: { role: string; text: string }) => ({
          role: m.role as 'user' | 'assistant',
          text: m.text,
        })))
      }
    } catch { /* ignore */ }
  }, [send])

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
            if (msg.mode === 'ptt' || msg.mode === 'natural') {
              setMode(msg.mode)
            }
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
          case 'session_switched':
            setSessionKey(msg.key)
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

  return { state, mode, subtitle, history, connected, sessionKey, sendPttStart, sendPttStop, sendSetMode, switchSession }
}
