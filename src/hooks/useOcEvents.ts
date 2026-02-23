import { useCallback, useEffect, useRef, useState } from 'react'
import type { OcMessage, OcPart } from '../types'

/**
 * OpenCode SSE event format:
 *   All events arrive as default "message" events (no `event:` line).
 *   The event type is in `data.type`:
 *     - message.part.updated  → full part snapshot in properties.part
 *     - message.part.delta    → incremental text in properties.delta
 *     - message.updated       → message metadata in properties.info
 *     - session.status / session.idle / server.heartbeat → ignored
 *
 * Part types from OpenCode:
 *   text, tool, reasoning, step-start, step-finish
 *
 * We map OpenCode part types to our OcPart:
 *   text       → { type: 'text', text }
 *   tool       → { type: 'tool-invocation', toolName, state, input, output }
 *   reasoning  → { type: 'reasoning', text }  (shown as dimmed text)
 *   step-start / step-finish → ignored (progress tracked via todos)
 */

interface OcPartSnapshot {
  id?: string
  sessionID?: string
  messageID?: string
  type?: string
  text?: string
  tool?: string
  callID?: string
  state?: { status?: string; input?: Record<string, unknown>; output?: string }
  time?: { start?: number; end?: number }
  [key: string]: unknown
}

interface OcEventPayload {
  type?: string
  properties?: {
    sessionID?: string
    messageID?: string
    partID?: string
    part?: OcPartSnapshot
    info?: { id?: string; sessionID?: string; role?: string; [key: string]: unknown }
    delta?: { type?: string; text?: string; [key: string]: unknown }
    [key: string]: unknown
  }
}

export function useOcEvents(ocSessionId?: string | null) {
  const [messages, setMessages] = useState<OcMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const sourceRef = useRef<EventSource | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountedRef = useRef(true)
  // Track known part IDs to avoid duplicates from updated events
  const knownPartsRef = useRef<Set<string>>(new Set())

  /** Convert an OpenCode part snapshot to our OcPart */
  const snapshotToOcPart = useCallback((snap: OcPartSnapshot): OcPart | null => {
    const partType = snap.type
    if (!partType) return null

    if (partType === 'text') {
      return { type: 'text', text: snap.text ?? '' }
    }
    if (partType === 'tool') {
      return {
        type: 'tool-invocation',
        toolName: snap.tool ?? 'tool',
        state: snap.state?.status ?? 'pending',
        input: snap.state?.input,
        output: snap.state?.output,
      }
    }
    if (partType === 'reasoning') {
      return { type: 'reasoning', text: snap.text ?? '' }
    }
    // step-start, step-finish → skip
    return null
  }, [])

  /** Upsert a part by its ID into the messages list */
  const upsertPart = useCallback((partId: string, messageId: string, part: OcPart) => {
    setMessages(prev => {
      // Find existing message by messageId or create new one
      const msgIdx = prev.findIndex(m =>
        (m as OcMessage & { _messageId?: string })._messageId === messageId
      )

      if (msgIdx >= 0) {
        const msg = prev[msgIdx]
        const existingIdx = (msg as OcMessage & { _partIds?: string[] })._partIds?.indexOf(partId) ?? -1
        const next = [...prev]

        if (existingIdx >= 0) {
          // Update existing part
          const newParts = [...msg.parts]
          newParts[existingIdx] = part
          next[msgIdx] = { ...msg, parts: newParts }
        } else {
          // Add new part
          const partIds = (msg as OcMessage & { _partIds?: string[] })._partIds ?? []
          next[msgIdx] = {
            ...msg,
            parts: [...msg.parts, part],
            _partIds: [...partIds, partId],
          } as OcMessage & { _messageId?: string; _partIds?: string[] }
        }
        return next
      }

      // New message
      return [
        ...prev,
        {
          role: 'assistant' as const,
          parts: [part],
          _messageId: messageId,
          _partIds: [partId],
        } as OcMessage & { _messageId: string; _partIds: string[] },
      ]
    })
  }, [])

  /** Append delta text to an existing part by partId */
  const appendDelta = useCallback((partId: string, deltaText: string) => {
    setMessages(prev => {
      for (let i = prev.length - 1; i >= 0; i--) {
        const msg = prev[i]
        const partIds = (msg as OcMessage & { _partIds?: string[] })._partIds
        if (!partIds) continue
        const pIdx = partIds.indexOf(partId)
        if (pIdx < 0) continue

        const next = [...prev]
        const newParts = [...msg.parts]
        const existing = newParts[pIdx]
        if (existing && (existing.type === 'text' || existing.type === 'reasoning')) {
          newParts[pIdx] = { ...existing, text: (existing.text ?? '') + deltaText }
        }
        next[i] = { ...msg, parts: newParts }
        return next
      }
      return prev
    })
  }, [])

  const connect = useCallback(() => {
    if (!ocSessionId || !isMountedRef.current) return
    if (sourceRef.current) sourceRef.current.close()
    knownPartsRef.current.clear()

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
      reconnectTimerRef.current = setTimeout(connect, 3000)
    }

    // All OpenCode events arrive as default "message" events
    source.onmessage = (event: MessageEvent) => {
      if (!isMountedRef.current) return
      try {
        const payload: OcEventPayload = JSON.parse(event.data)
        const eventType = payload.type
        const props = payload.properties
        if (!props) return

        // Filter by session
        const eventSessionId =
          props.sessionID ??
          props.part?.sessionID ??
          props.info?.sessionID
        if (eventSessionId && eventSessionId !== ocSessionId) return

        if (eventType === 'message.part.updated' && props.part) {
          const snap = props.part
          const partId = snap.id
          const messageId = snap.messageID
          if (!partId || !messageId) return

          const ocPart = snapshotToOcPart(snap)
          if (!ocPart) return

          knownPartsRef.current.add(partId)
          upsertPart(partId, messageId, ocPart)
          return
        }

        if (eventType === 'message.part.delta' && props.delta) {
          const partId = props.partID ?? (props as Record<string, unknown>).partID as string
          const delta = props.delta
          if (!partId) return

          const deltaText = delta.text
          if (typeof deltaText === 'string' && deltaText) {
            appendDelta(partId, deltaText)
          }
          return
        }

        // message.updated with info.role === 'user' → add user message
        if (eventType === 'message.updated' && props.info) {
          const info = props.info
          if (info.role === 'user' && info.id) {
            // We could show user messages too, but for now we focus on assistant output
          }
          return
        }
      } catch {
        // Ignore parse errors
      }
    }
  }, [ocSessionId, snapshotToOcPart, upsertPart, appendDelta])

  useEffect(() => {
    isMountedRef.current = true
    setMessages([])
    knownPartsRef.current.clear()
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
