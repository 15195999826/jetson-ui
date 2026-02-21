import { useEffect, useState, useCallback, useRef } from 'react'
import type { SessionInfo } from '../types'

interface Props {
  currentKey: string
  onSwitch: (key: string) => void
}

const BASE = `http://${location.hostname}:8080`

function formatLabel(s: SessionInfo): string {
  const name = s.key.replace(/^voice:/, '')
  const date = s.updated_at ? new Date(s.updated_at).toLocaleDateString('zh-CN') : ''
  return date ? `${name} (${date})` : name
}

export function SessionBar({ currentKey, onSwitch }: Props) {
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

  const handleCreate = () => {
    const name = prompt('新会话名称：')
    if (!name?.trim()) return
    const key = `voice:${name.trim()}`
    pendingRef.current.set(key, `${name.trim()} ✦`)
    forceRender(n => n + 1)
    onSwitch(key)
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
    </div>
  )
}
