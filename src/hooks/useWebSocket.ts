import { useEffect, useRef, useState, useCallback } from 'react'
import type { PipelineState, ChatMessage, WsMessage, ChannelType, CommandTipMessage, BackgroundTask } from '../types'

const BASE_HTTP = location.origin

export interface VadState {
  isSpeech: boolean
  probability: number
}

export function useWebSocket(url: string, onSessionUpdated?: (key: string) => void, onSessionDeleted?: (key: string) => void, onSessionSwitched?: (key: string) => void) {
  const [state, setState] = useState<PipelineState>('idle')
  const [mode, setMode] = useState<'ptt' | 'natural'>('ptt')
  const [subtitle, setSubtitle] = useState('')
  const [history, setHistory] = useState<ChatMessage[]>([])
  const [connected, setConnected] = useState(false)
  const [sessionKey, setSessionKey] = useState('voice:local')
  const [channel, setChannel] = useState<ChannelType>('voice')
  const [vad, setVad] = useState<VadState>({ isSpeech: false, probability: 0 })
  const [commandTip, setCommandTip] = useState<CommandTipMessage[] | null>(null)
  const [backgroundTasks, setBackgroundTasks] = useState<BackgroundTask[]>([])
  const [toast, setToast] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const onSessionUpdatedRef = useRef(onSessionUpdated)
  const onSessionDeletedRef = useRef(onSessionDeleted)
  const onSessionSwitchedRef = useRef(onSessionSwitched)
  const retryCountRef = useRef(0)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountedRef = useRef(true)
  const sessionKeyRef = useRef(sessionKey)
  const channelRef = useRef<ChannelType>('voice')

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
  const sendText = useCallback((text: string) => {
    const trimmed = text.trim()
    if (trimmed) send({ type: 'text_input', text: trimmed })
  }, [send])

  useEffect(() => { sessionKeyRef.current = sessionKey }, [sessionKey])
  useEffect(() => { channelRef.current = channel }, [channel])
  useEffect(() => { onSessionUpdatedRef.current = onSessionUpdated }, [onSessionUpdated])
  useEffect(() => { onSessionDeletedRef.current = onSessionDeleted }, [onSessionDeleted])
  useEffect(() => { onSessionSwitchedRef.current = onSessionSwitched }, [onSessionSwitched])

  const loadSessionHistory = useCallback(async (key: string) => {
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
  }, [])

  const switchSession = useCallback(async (key: string) => {
    send({ type: 'switch_session', key })
    setSessionKey(key)
    await loadSessionHistory(key)
  }, [send, loadSessionHistory])

  const switchChannel = useCallback((ch: ChannelType) => {
    send({ type: 'set_channel', channel: ch })
  }, [send])

  const cancelCommand = useCallback(() => {
    send({ type: 'cancel_command' })
    setCommandTip(null)
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
            if (!msg.session_key || msg.session_key === sessionKeyRef.current) {
              setHistory(h => [...h, { role: 'user', text: msg.text }])
              setSubtitle('')
            }
            break
          case 'assistant_chunk':
            if (!msg.session_key || msg.session_key === sessionKeyRef.current) {
              if (!msg.done) setSubtitle(s => s + msg.text)
            }
            break
          case 'assistant_text':
            if (!msg.session_key || msg.session_key === sessionKeyRef.current) {
              setHistory(h => [...h, { role: 'assistant', text: msg.text }])
              setSubtitle('')
            }
            break
          case 'error':
            setHistory(h => [...h, { role: 'assistant', text: `⚠️ ${msg.text}` }])
            break
          case 'session_init':
            // Server is authoritative for voice channel session.
            // Accept the server's current session instead of pushing our local key.
            setSessionKey(msg.current)
            sessionKeyRef.current = msg.current
            loadSessionHistory(msg.current)
            break
          case 'session_switched':
            setSessionKey(msg.key)
            sessionKeyRef.current = msg.key
            loadSessionHistory(msg.key)
            onSessionSwitchedRef.current?.(msg.key)
            break
          case 'channel_switched':
            setChannel(msg.channel)
            channelRef.current = msg.channel
            if (msg.session_key) {
              setSessionKey(msg.session_key)
              sessionKeyRef.current = msg.session_key
              loadSessionHistory(msg.session_key)
            }
            break
          case 'session_updated':
            onSessionUpdatedRef.current?.(msg.key)
            break
          case 'session_deleted':
            onSessionDeletedRef.current?.(msg.key)
            break
          case 'command_tip':
            setCommandTip(prev => [...(prev ?? []), { role: msg.role, text: msg.text }])
            break
          case 'vad_speech_start':
            setVad({ isSpeech: true, probability: msg.probability })
            break
          case 'vad_speech_end':
            setVad({ isSpeech: false, probability: msg.probability })
            break
          case 'vad_status':
            setVad(v => ({ ...v, probability: msg.probability }))
            break
          case 'task_started':
            setBackgroundTasks(prev => [
              ...prev,
              { taskId: msg.task_id, description: msg.description, status: 'running' }
            ])
            break
          case 'task_completed_other_session':
            setBackgroundTasks(prev =>
              prev.map(t => t.taskId === msg.task_id
                ? { ...t, status: msg.status === 'ok' ? 'completed' : 'error' }
                : t
              )
            )
            setToast(`后台任务已${msg.status === 'ok' ? '完成' : '失败'}，切换到原会话查看结果`)
            setTimeout(() => setToast(null), 5000)
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
      const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000)
      retryCountRef.current += 1
      retryTimerRef.current = setTimeout(connect, delay)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [url, loadSessionHistory])

  useEffect(() => {
    isMountedRef.current = true
    connect()
    return () => {
      isMountedRef.current = false
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  return { state, mode, subtitle, history, connected, sessionKey, channel, vad, commandTip, backgroundTasks, toast, sendPttStart, sendPttStop, sendSetMode, sendText, switchSession, switchChannel, cancelCommand }
}
