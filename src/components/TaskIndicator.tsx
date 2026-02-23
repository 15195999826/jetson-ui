import type { BackgroundTask } from '../types'

interface Props {
  tasks: BackgroundTask[]
  onViewDetail: (task: BackgroundTask) => void
}

export function TaskIndicator({ tasks, onViewDetail }: Props) {
  const running = tasks.filter(t => t.status === 'running')
  if (running.length === 0) return null
  const handleClick = () => onViewDetail(running[0])
  return (
    <div
      onClick={handleClick}
      style={{
        padding: '4px 12px', fontSize: 12,
        color: '#888', display: 'flex',
        alignItems: 'center', gap: 6,
        cursor: 'pointer',
        transition: 'color 0.2s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.color = '#c0c0d0' }}
      onMouseLeave={e => { e.currentTarget.style.color = '#888' }}
    >
      <span style={{
        display: 'inline-block', width: 8, height: 8,
        borderRadius: '50%', background: '#6ba3d6',
        animation: 'pulse 1.5s ease-in-out infinite',
      }} />
      {running.length} 个后台任务运行中
    </div>
  )
}
