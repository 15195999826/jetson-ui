import { useEffect, useMemo, useRef, useState } from 'react'
import type { BackgroundTask, OcTodo } from '../types'
import { useOcEvents } from '../hooks/useOcEvents'

interface Props {
  task: BackgroundTask
  onClose: () => void
  onAbort: (ocSessionId: string) => void
}

const STATUS_LABEL: Record<BackgroundTask['status'], string> = {
  running: '运行中',
  completed: '已完成',
  error: '失败',
}

const TODO_ICON: Record<OcTodo['status'], string> = {
  pending: '⏳',
  in_progress: '🔄',
  completed: '✅',
  cancelled: '❌',
}

export function TaskDetailPanel({ task, onClose, onAbort }: Props) {
  const [tasksSnapshot, setTasksSnapshot] = useState<BackgroundTask[]>([])
  const [todos, setTodos] = useState<OcTodo[]>([])
  const [elapsed, setElapsed] = useState(0)
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [expanded, setExpanded] = useState(false)
  const messagesRef = useRef<HTMLDivElement | null>(null)

  const resolvedSessionId = useMemo(() => {
    if (task.ocSessionId) return task.ocSessionId
    const found = tasksSnapshot.find(t => t.taskId === task.taskId)
    return found?.ocSessionId ?? null
  }, [task.ocSessionId, task.taskId, tasksSnapshot])

  const startedAt = useMemo(() => {
    if (task.startedAt) return task.startedAt
    const found = tasksSnapshot.find(t => t.taskId === task.taskId)
    return found?.startedAt
  }, [task.startedAt, task.taskId, tasksSnapshot])

  const { messages } = useOcEvents(resolvedSessionId)

  const totalTodos = todos.length
  const completedTodos = todos.filter(t => t.status === 'completed').length
  const progress = totalTodos === 0 ? 0 : Math.round((completedTodos / totalTodos) * 100)

  useEffect(() => {
    if (elapsedRef.current) clearInterval(elapsedRef.current)
    if (startedAt) {
      elapsedRef.current = setInterval(() => {
        const now = Date.now()
        const seconds = Math.max(0, Math.floor((now - startedAt * 1000) / 1000))
        setElapsed(seconds)
      }, 1000)
    }
    return () => {
      if (elapsedRef.current) clearInterval(elapsedRef.current)
    }
  }, [startedAt])

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null
    const loadTasks = async () => {
      try {
        const res = await fetch(`${location.origin}/oc/tasks`)
        const data = await res.json()
        if (data.tasks) {
          setTasksSnapshot(data.tasks.map((item: { task_id: string; description: string; status: string; started_at?: number; oc_session_id?: string | null }) => ({
            taskId: item.task_id,
            description: item.description,
            status: item.status === 'running' ? 'running' : item.status === 'error' ? 'error' : 'completed',
            startedAt: item.started_at,
            ocSessionId: item.oc_session_id ?? null,
          })))
        }
      } catch {
      }
    }
    loadTasks()
    timer = setInterval(loadTasks, 5000)
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [task.taskId])

  useEffect(() => {
    if (!resolvedSessionId) {
      setTodos([])
      return
    }
    let timer: ReturnType<typeof setInterval> | null = null
    const loadTodos = async () => {
      try {
        const res = await fetch(`${location.origin}/oc/session/${encodeURIComponent(resolvedSessionId)}/todo`)
        const data = await res.json()
        if (Array.isArray(data)) {
          setTodos(data as OcTodo[])
        } else if (Array.isArray(data.todos)) {
          setTodos(data.todos as OcTodo[])
        }
      } catch {
      }
    }
    loadTodos()
    timer = setInterval(loadTodos, 3000)
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [resolvedSessionId])

  useEffect(() => {
    if (!messagesRef.current) return
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight
  }, [messages])

  const elapsedLabel = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`

  return (
    <div className="task-detail-overlay">
      <div className="task-detail-panel">
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 8, padding: '16px 18px', borderBottom: '1px solid #1e1e2e',
        }}>
          <div style={{ fontSize: 14, color: '#e0e0e0', fontWeight: 600 }}>🔄 后台任务详情</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => resolvedSessionId && onAbort(resolvedSessionId)}
              disabled={!resolvedSessionId}
              style={{
                padding: '4px 10px', fontSize: 12, borderRadius: 6,
                border: '1px solid #8e2d2d',
                background: resolvedSessionId ? '#2e1a1a' : '#1a1a24',
                color: resolvedSessionId ? '#f99090' : '#444',
                cursor: resolvedSessionId ? 'pointer' : 'not-allowed',
              }}
            >
              取消任务
            </button>
            <button
              onClick={onClose}
              style={{
                width: 24, height: 24, borderRadius: 6,
                border: '1px solid #2a2a3e', background: '#0a0a14',
                color: '#888', cursor: 'pointer',
              }}
            >
              ×
            </button>
          </div>
        </div>

        <div style={{ padding: '12px 18px', borderBottom: '1px solid #1e1e2e' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span style={{ color: '#888', fontSize: 12, marginTop: 2 }}>任务：</span>
            <button
              onClick={() => setExpanded(v => !v)}
              style={{
                background: 'none', border: 'none', padding: 0, textAlign: 'left',
                color: '#e0e0e0', fontSize: 13, lineHeight: 1.5, cursor: 'pointer',
                display: expanded ? 'block' : '-webkit-box',
                WebkitLineClamp: expanded ? undefined : 2,
                WebkitBoxOrient: expanded ? undefined : 'vertical',
                overflow: expanded ? 'visible' : 'hidden',
              }}
            >
              {task.description}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#c0c0d0' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: task.status === 'running' ? '#6ba3d6' : task.status === 'error' ? '#f99090' : '#a5d6a7' }} />
              {STATUS_LABEL[task.status]}
            </div>
            <div style={{ fontSize: 12, color: '#888' }}>耗时：{elapsedLabel}</div>
          </div>
        </div>

        <div style={{ padding: '12px 18px', borderBottom: '1px solid #1e1e2e' }}>
          <div style={{ fontSize: 12, color: '#90caf9', marginBottom: 4 }}>AI 对话进度</div>
          <div style={{ fontSize: 11, color: '#444', marginBottom: 8 }}>{completedTodos}/{totalTodos} 已完成</div>
          <div style={{ height: 6, borderRadius: 4, background: '#1a1a24', overflow: 'hidden' }}>
            <div className="task-progress-bar" style={{ width: `${progress}%` }} />
          </div>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#c0c0d0' }}>
            {todos.length === 0 ? (
              <div style={{ color: '#444' }}>暂无 Todo</div>
            ) : todos.map((todo, index) => (
              <div key={`${todo.content}-${index}`} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <span>{TODO_ICON[todo.status]}</span>
                <span style={{ lineHeight: 1.4 }}>{todo.content}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '12px 18px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ fontSize: 12, color: '#90caf9', marginBottom: 8 }}>实时对话</div>
          <div className="task-detail-messages" ref={messagesRef}>
            {messages.length === 0 ? (
              <div style={{ color: '#444', fontSize: 12 }}>等待事件推送...</div>
            ) : messages.map((msg, index) => (
              <div key={`msg-${index}`} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 12, color: msg.role === 'user' ? '#a5d6a7' : '#90caf9' }}>
                  {msg.role === 'user' ? '👤' : '🤖'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {msg.parts.map((part, partIndex) => (
                    part.type === 'tool-invocation' ? (
                      <div key={`part-${partIndex}`} style={{ fontSize: 12, color: '#888', padding: '2px 0' }}>
                        🔧 {part.toolName ?? 'tool'} ({part.state ?? 'pending'})
                      </div>
                    ) : part.type === 'reasoning' ? (
                      <div key={`part-${partIndex}`} style={{ fontSize: 11, color: '#666', lineHeight: 1.5, fontStyle: 'italic', borderLeft: '2px solid #333', paddingLeft: 8 }}>
                        💭 {part.text}
                      </div>
                    ) : (
                      <div key={`part-${partIndex}`} style={{ fontSize: 12, color: '#e0e0e0', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                        {part.text}
                      </div>
                    )
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
