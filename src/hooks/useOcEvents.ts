import { useCallback, useEffect, useRef, useState } from 'react'
import type { OcMessage, OcPart } from '../types'

interface OcEventData {
  properties?: {
    sessionID?: string
    messageID?: string
    part?: OcPart
  }
}

export function useOcEvents(ocSessionId?: string | null) {
  const [messages, setMessages] = useState<OcMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const sourceRef = useRef<EventSource | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountedRef = useRef(true)

  const addPartToMessages = useCallback((part: OcPart) => {
    setMessages(prev => {
      if (prev.length === 0) {
        return [{ role: 'assistant', parts: [part] }]
      }
      const next = [...prev]
      const last = next[next.length - 1]
      const lastPart = last.parts[last.parts.length - 1]
      if (part.type === 'text' && lastPart?.type === 'text') {
        const merged = { ...lastPart, text: `${lastPart.text ?? ''}${part.text ?? ''}` }
        last.parts = [...last.parts.slice(0, -1), merged]
        next[next.length - 1] = { ...last, parts: [...last.parts] }
        return next
      }
      last.parts = [...last.parts, part]
      next[next.length - 1] = { ...last, parts: [...last.parts] }
      return next
    })
  }, [])

  const connect = useCallback(() => {
    if (!ocSessionId || !isMountedRef.current) return
    if (sourceRef.current) sourceRef.current.close()

    const source = new EventSource(`${location.origin}/oc/event`)
    sourceRef.current = source

    source.onopen = () => {
      if (!isMountedRef.current) return
      setIsConnected(true)
    }

    source.onerror = () => {
      if (!isMountedRef.current) return
      setIsConnected(false)
      source.close()
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = setTimeout(connect, 2000)
    }

    source.addEventListener('message.part.updated', event => {
      if (!isMountedRef.current) return
      try {
        const data: OcEventData = JSON.parse((event as MessageEvent).data)
        const properties = data.properties
        if (!properties || properties.sessionID !== ocSessionId || !properties.part) return
        const incoming = properties.part
        if (incoming.type === 'text') {
          addPartToMessages({ type: 'text', text: incoming.text ?? '' })
          return
        }
        if (incoming.type === 'tool-invocation') {
          addPartToMessages({
            type: 'tool-invocation',
            toolName: incoming.toolName,
            state: incoming.state,
            input: incoming.input,
            output: incoming.output,
          })
          return
        }
        addPartToMessages(incoming)
      } catch {
      }
    })

    source.addEventListener('message.updated', event => {
      if (!isMountedRef.current) return
      try {
        const data: OcEventData = JSON.parse((event as MessageEvent).data)
        const properties = data.properties
        if (!properties || properties.sessionID !== ocSessionId || !properties.part) return
        const incoming = properties.part
        if (incoming.type === 'text') {
          addPartToMessages({ type: 'text', text: incoming.text ?? '' })
          return
        }
        if (incoming.type === 'tool-invocation') {
          addPartToMessages({
            type: 'tool-invocation',
            toolName: incoming.toolName,
            state: incoming.state,
            input: incoming.input,
            output: incoming.output,
          })
          return
        }
        addPartToMessages(incoming)
      } catch {
      }
    })
  }, [addPartToMessages, ocSessionId])

  useEffect(() => {
    isMountedRef.current = true
    setMessages([])
    if (!ocSessionId) return
    connect()
    return () => {
      isMountedRef.current = false
      sourceRef.current?.close()
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
    }
  }, [connect, ocSessionId])

  return { messages, isConnected }
}
