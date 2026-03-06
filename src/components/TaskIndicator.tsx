import { useState } from 'react'
import type { BackgroundTask, ClaudeCodeTask } from '../types'

interface Props {
  tasks: BackgroundTask[]
  claudeCodeTasks: ClaudeCodeTask[]
  onViewDetail: (task: BackgroundTask) => void
  onRemoveClaudeTask: (taskId: string) => void
}

export function TaskIndicator({ tasks, claudeCodeTasks, onViewDetail, onRemoveClaudeTask }: Props) {
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)
  const running = tasks.filter(t => t.status === 'running')
  const activeClaude = claudeCodeTasks.filter(t => t.status === 'running' || t.status === 'completed' || t.status === 'error')

  if (running.length === 0 && activeClaude.length === 0) return null

  return (
    <div style={{ fontSize: 12, color: '#aaa', padding: '4px 8px' }}>
      {/* Legacy background tasks */}
      {running.length > 0 && (
        <div
          onClick={() => onViewDetail(running[0])}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            cursor: 'pointer', marginBottom: 4,
          }}
        >
          <PulsingDot color="#6ba3d6" />
          {running.length} task(s) running
        </div>
      )}

      {/* Claude Code tasks */}
      {activeClaude.map(task => (
        <ClaudeCodeTaskCard
          key={task.taskId}
          task={task}
          expanded={expandedTaskId === task.taskId}
          onToggle={() => setExpandedTaskId(prev => prev === task.taskId ? null : task.taskId)}
          onRemove={() => onRemoveClaudeTask(task.taskId)}
        />
      ))}
    </div>
  )
}

function PulsingDot({ color }: { color: string }) {
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8,
      borderRadius: '50%', background: color,
      animation: 'pulse 1.5s ease-in-out infinite',
      flexShrink: 0,
    }} />
  )
}

const ICON_MAP: Record<string, string> = {
  assistant: '\u{1F4AD}',  // thought bubble
  tool_use: '\u{1F527}',   // wrench
  tool_result: '\u{1F4CB}', // clipboard
}

function ClaudeCodeTaskCard({
  task,
  expanded,
  onToggle,
  onRemove,
}: {
  task: ClaudeCodeTask
  expanded: boolean
  onToggle: () => void
  onRemove: () => void
}) {
  const isRunning = task.status === 'running'
  const statusColor = isRunning ? '#6ba3d6' : task.status === 'completed' ? '#4caf50' : '#f44336'
  const statusLabel = isRunning ? 'RUNNING' : task.status === 'completed' ? 'DONE' : 'FAILED'
  const lastStep = task.steps[task.steps.length - 1]

  return (
    <div style={{
      background: '#1a1a2e',
      borderRadius: 8,
      padding: '6px 10px',
      marginBottom: 4,
      border: `1px solid ${isRunning ? '#2a3a5e' : '#2a2a3e'}`,
    }}>
      {/* Header */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        <PulsingDot color={statusColor} />
        <span style={{ color: statusColor, fontWeight: 600, fontSize: 10, letterSpacing: 1 }}>
          {statusLabel}
        </span>
        <span style={{ color: '#ccc', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {task.task}
        </span>
        <span style={{ color: '#555', fontSize: 10 }}>
          {task.variant.toUpperCase()}
        </span>
        {!isRunning && (
          <span
            onClick={e => { e.stopPropagation(); onRemove() }}
            style={{ color: '#555', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 2px' }}
            title="Dismiss"
          >
            &times;
          </span>
        )}
      </div>

      {/* Current step (always visible when running) */}
      {isRunning && lastStep && !expanded && (
        <div style={{
          marginTop: 4, paddingLeft: 14,
          color: '#888', fontSize: 11,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {ICON_MAP[lastStep.eventType] || ''} {lastStep.summary}
        </div>
      )}

      {/* Expanded steps list */}
      {expanded && (
        <div style={{
          marginTop: 6,
          maxHeight: 200,
          overflowY: 'auto',
          paddingLeft: 14,
        }}>
          {task.steps.length === 0 && (
            <div style={{ color: '#555', fontStyle: 'italic' }}>Waiting for output...</div>
          )}
          {task.steps.map((step, i) => (
            <div key={i} style={{
              color: step.eventType === 'tool_use' ? '#90caf9' : step.eventType === 'tool_result' ? '#666' : '#bbb',
              fontSize: 11,
              marginBottom: 2,
              wordBreak: 'break-all',
            }}>
              {ICON_MAP[step.eventType] || ''} {step.summary}
            </div>
          ))}
          {/* Show final result/error */}
          {task.status === 'completed' && task.result && (
            <div style={{ color: '#4caf50', marginTop: 4, fontSize: 11, borderTop: '1px solid #2a2a3e', paddingTop: 4 }}>
              Result: {task.result.length > 300 ? task.result.slice(0, 300) + '...' : task.result}
            </div>
          )}
          {task.status === 'error' && task.error && (
            <div style={{ color: '#f44336', marginTop: 4, fontSize: 11, borderTop: '1px solid #2a2a3e', paddingTop: 4 }}>
              Error: {task.error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
