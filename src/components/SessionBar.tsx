import { useEffect, useState, useCallback } from 'react'
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
  const [sessions, setSessions] = useState<SessionInfo[]>([])

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/sessions`)
      const data = await res.json()
      setSessions(data.sessions || [])
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const handleCreate = async () => {
    const name = prompt('新会话名称：')
    if (!name?.trim()) return
    try {
      const res = await fetch(`${BASE}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const data = await res.json()
      if (data.key) {
        await refresh()
        onSwitch(data.key)
      }
    } catch { /* ignore */ }
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
        {sessions.length === 0 && (
          <option value={currentKey}>{currentKey.replace(/^voice:/, '')}</option>
        )}
        {sessions.map(s => (
          <option key={s.key} value={s.key}>{formatLabel(s)}</option>
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
