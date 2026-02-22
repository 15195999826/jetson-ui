import { useEffect, useState, useCallback, useRef, type MutableRefObject } from 'react'
import type { SessionInfo, ChannelType } from '../types'

interface Props {
  currentKey: string
  channel: ChannelType
  onSwitch: (key: string) => void
  notifyRef?: MutableRefObject<((key: string) => void) | null>
  deleteNotifyRef?: MutableRefObject<((key: string) => void) | null>
}

const BASE = location.origin

function formatLabel(s: SessionInfo): string {
  const name = s.key.replace(/^voice:/, '')
  const date = s.updated_at ? new Date(s.updated_at).toLocaleDateString('zh-CN') : ''
  return date ? `${name} (${date})` : name
}

export function SessionBar({ currentKey, channel, onSwitch, notifyRef, deleteNotifyRef }: Props) {
  const [persisted, setPersisted] = useState<SessionInfo[]>([])
  const [voiceSessionKey, setVoiceSessionKey] = useState<string | null>(null)
  const pendingRef = useRef<Map<string, string>>(new Map())
  const [, forceRender] = useState(0)
  const currentKeyRef = useRef(currentKey)
  currentKeyRef.current = currentKey

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/sessions`)
      const data = await res.json()
      const list: SessionInfo[] = data.sessions || []
      list.forEach(s => pendingRef.current.delete(s.key))
      setPersisted(list)
      if (data.current) setVoiceSessionKey(data.current)
      forceRender(n => n + 1)
    } catch { /* ignore */ }
  }, [])

  const switchAfterDelete = useCallback(async (deletedKey: string) => {
    pendingRef.current.delete(deletedKey)
    try {
      const res = await fetch(`${BASE}/sessions`)
      const data = await res.json()
      const list: SessionInfo[] = data.sessions || []
      setPersisted(list)
      if (data.current) setVoiceSessionKey(data.current)
      forceRender(n => n + 1)

      if (list.length > 0) {
        const sorted = [...list].sort((a, b) => {
          const ta = a.updated_at || a.created_at || ''
          const tb = b.updated_at || b.created_at || ''
          return tb.localeCompare(ta)
        })
        onSwitch(sorted[0].key)
      } else {
        const key = 'voice:auto_new'
        pendingRef.current.set(key, 'auto_new ✦')
        forceRender(n => n + 1)
        onSwitch(key)
      }
    } catch {
      onSwitch('voice:auto_new')
    }
  }, [onSwitch])

  useEffect(() => { refresh() }, [refresh])

  useEffect(() => {
    if (!deleteNotifyRef) return
    deleteNotifyRef.current = (deletedKey: string) => {
      if (deletedKey === currentKeyRef.current) {
        switchAfterDelete(deletedKey)
      } else {
        refresh()
      }
    }
    return () => { if (deleteNotifyRef) deleteNotifyRef.current = null }
  }, [deleteNotifyRef, switchAfterDelete, refresh])

  useEffect(() => {
    if (!notifyRef) return
    notifyRef.current = (key: string) => {
      const alreadyKnown =
        persisted.some(s => s.key === key) || pendingRef.current.has(key)
      if (!alreadyKnown) {
        pendingRef.current.set(key, key.replace(/^voice:/, '') + ' ✦')
        forceRender(n => n + 1)
      }
      refresh()
    }
    return () => { if (notifyRef) notifyRef.current = null }
  }, [notifyRef, persisted, refresh])

  const handleCreate = () => {
    const name = prompt('新会话名称：')
    if (!name?.trim()) return
    const key = `voice:${name.trim()}`
    pendingRef.current.set(key, `${name.trim()} ✦`)
    forceRender(n => n + 1)
    onSwitch(key)
  }

  const handleDelete = async () => {
    if (!currentKey) return
    const name = currentKey.replace(/^voice:/, '')
    if (!confirm(`删除会话「${name}」？`)) return
    try {
      const res = await fetch(`${BASE}/sessions/${encodeURIComponent(currentKey)}`, { method: 'DELETE' })
      if (res.ok) {
        await switchAfterDelete(currentKey)
      }
    } catch { /* ignore */ }
  }

  const allOptions: { key: string; label: string; voiceOccupied: boolean }[] = [
    ...persisted.map(s => ({ key: s.key, label: formatLabel(s), voiceOccupied: s.key === voiceSessionKey })),
    ...[...pendingRef.current.entries()]
      .filter(([k]) => !persisted.find(s => s.key === k))
      .map(([k, label]) => ({ key: k, label, voiceOccupied: k === voiceSessionKey })),
  ]

  if (allOptions.length === 0) {
    allOptions.push({ key: 'voice:local', label: '默认会话', voiceOccupied: 'voice:local' === voiceSessionKey })
  }

  const isKeyboard = channel === 'keyboard'

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 10px',
      borderBottom: '1px solid #1e1e2e',
      background: '#0a0a14',
      flexShrink: 0,
      height: 36,
    }}>
      <span style={{ fontSize: 11, color: '#444', flexShrink: 0 }}>会话</span>
      <select
        value={currentKey}
        onChange={e => {
          const key = e.target.value
          if (isKeyboard && key === voiceSessionKey) return
          onSwitch(key)
        }}
        style={{
          flex: 1,
          background: '#111120',
          border: '1px solid #2a2a3e',
          borderRadius: 4,
          color: '#c0c0d0',
          fontSize: 12,
          padding: '2px 6px',
          outline: 'none',
          cursor: 'pointer',
          minWidth: 0,
        }}
      >
        {allOptions.map(o => (
          <option key={o.key} value={o.key} disabled={isKeyboard && o.voiceOccupied}>
            {o.label}{isKeyboard && o.voiceOccupied ? ' 🎙' : ''}
          </option>
        ))}
      </select>
      <button
        onClick={handleCreate}
        title="新建会话"
        style={{
          background: '#1e2a3e',
          border: '1px solid #2d5a8e',
          borderRadius: 4,
          color: '#90caf9',
          fontSize: 11,
          padding: '2px 8px',
          cursor: 'pointer',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        ＋
      </button>
      <button
        onClick={handleDelete}
        title="删除当前会话"
        style={{
          background: '#2e1a1a',
          border: '1px solid #8e2d2d',
          borderRadius: 4,
          color: '#f99090',
          fontSize: 11,
          padding: '2px 8px',
          cursor: 'pointer',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        ✕
      </button>
      <button
        onClick={refresh}
        title="刷新会话列表"
        style={{
          background: '#1a1a2e',
          border: '1px solid #2a2a3e',
          borderRadius: 4,
          color: '#666',
          fontSize: 13,
          padding: '2px 6px',
          cursor: 'pointer',
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        ↺
      </button>
    </div>
  )
}
