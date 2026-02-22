import { useEffect, useState, useCallback, useRef, type MutableRefObject } from 'react'
import type { SessionInfo } from '../types'

interface Props {
  currentKey: string
  onSwitch: (key: string) => void
  notifyRef?: MutableRefObject<((key: string) => void) | null>
}

const BASE = location.origin

function formatLabel(s: SessionInfo): string {
  const name = s.key.replace(/^voice:/, '')
  const date = s.updated_at ? new Date(s.updated_at).toLocaleDateString('zh-CN') : ''
  return date ? `${name} (${date})` : name
}

export function SessionBar({ currentKey, onSwitch, notifyRef }: Props) {
  const [persisted, setPersisted] = useState<SessionInfo[]>([])
  const pendingRef = useRef<Map<string, string>>(new Map())
  const [, forceRender] = useState(0)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/sessions`)
      const data = await res.json()
      const list: SessionInfo[] = data.sessions || []
      list.forEach(s => pendingRef.current.delete(s.key))
      setPersisted(list)
      forceRender(n => n + 1)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { refresh() }, [refresh])

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
    if (!currentKey || currentKey === 'voice:local') return
    const name = currentKey.replace(/^voice:/, '')
    if (!confirm(`删除会话「${name}」？`)) return
    try {
      const res = await fetch(`${BASE}/sessions/${encodeURIComponent(currentKey)}`, { method: 'DELETE' })
      if (res.ok) {
        pendingRef.current.delete(currentKey)
        onSwitch('voice:local')
        await refresh()
      }
    } catch { /* ignore */ }
  }

  const allOptions: { key: string; label: string }[] = [
    ...persisted.map(s => ({ key: s.key, label: formatLabel(s) })),
    ...[...pendingRef.current.entries()]
      .filter(([k]) => !persisted.find(s => s.key === k))
      .map(([k, label]) => ({ key: k, label })),
  ]

  if (allOptions.length === 0) {
    allOptions.push({ key: 'voice:local', label: '默认会话' })
  }

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
        onChange={e => onSwitch(e.target.value)}
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
          <option key={o.key} value={o.key}>{o.label}</option>
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
        disabled={currentKey === 'voice:local'}
        style={{
          background: currentKey === 'voice:local' ? '#111' : '#2e1a1a',
          border: `1px solid ${currentKey === 'voice:local' ? '#222' : '#8e2d2d'}`,
          borderRadius: 4,
          color: currentKey === 'voice:local' ? '#444' : '#f99090',
          fontSize: 11,
          padding: '2px 8px',
          cursor: currentKey === 'voice:local' ? 'not-allowed' : 'pointer',
          flexShrink: 0,
          whiteSpace: 'nowrap',
          opacity: currentKey === 'voice:local' ? 0.5 : 1,
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
