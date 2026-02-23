import { useState } from 'react'

interface Props { text: string; maxPreviewLen?: number }

export function TaskResult({ text, maxPreviewLen = 300 }: Props) {
  const [expanded, setExpanded] = useState(false)
  const needsCollapse = text.length > maxPreviewLen

  return (
    <div style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>
      {needsCollapse && !expanded ? text.slice(0, maxPreviewLen) + '...' : text}
      {needsCollapse && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            color: '#6ba3d6', background: 'none', border: 'none',
            cursor: 'pointer', fontSize: 12, display: 'block', marginTop: 4,
          }}
        >
          {expanded ? '收起' : '展开全部'}
        </button>
      )}
    </div>
  )
}
