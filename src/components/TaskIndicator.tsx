import type { BackgroundTask } from '../types'

interface Props { tasks: BackgroundTask[] }

export function TaskIndicator({ tasks }: Props) {
  const running = tasks.filter(t => t.status === 'running')
  if (running.length === 0) return null
  return (
    <div style={{
      padding: '4px 12px', fontSize: 12,
      color: '#888', display: 'flex',
      alignItems: 'center', gap: 6,
    }}>
      <span style={{
        display: 'inline-block', width: 8, height: 8,
        borderRadius: '50%', background: '#6ba3d6',
        animation: 'pulse 1.5s ease-in-out infinite',
      }} />
      {running.length} 个后台任务运行中
    </div>
  )
}
