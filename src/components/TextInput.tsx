import { useState, useCallback } from 'react'

interface Props {
  onSend: (text: string) => void
}

export function TextInput({ onSend }: Props) {
  const [value, setValue] = useState('')

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed) return
    onSend(trimmed)
    setValue('')
  }, [value, onSend])

  return (
    <div className="text-input-row">
      <input
        className="text-input"
        type="text"
        placeholder="输入文字..."
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
      />
      <button className="btn-send" onClick={handleSend}>
        发送
      </button>
    </div>
  )
}
