export type PipelineState =
  | 'idle'
  | 'triggered'
  | 'recording'
  | 'transcribing'
  | 'thinking'
  | 'responding'

// Channel types:
//   voice    - shared pipeline, all clients follow the same session
//   keyboard - per-connection independent session (parallel, placeholder)
export type ChannelType = 'voice' | 'keyboard'

export interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
}

// WebSocket 消息类型（匹配 pipeline.py 广播的事件）
export interface CommandTipMessage {
  role: 'user' | 'assistant'
  text: string
}

export type WsMessage =
  | { type: 'state_changed'; state: PipelineState; mode: string; info?: string }
  | { type: 'user_text'; text: string; session_key?: string }
  | { type: 'assistant_text'; text: string; session_key?: string }
  | { type: 'assistant_chunk'; text: string; done: boolean; session_key?: string }
  | { type: 'vad_status'; is_speech: boolean; probability: number }
  | { type: 'vad_speech_start'; probability: number }
  | { type: 'vad_speech_end'; probability: number }
  | { type: 'error'; text: string }
  | { type: 'session_switched'; key: string }
  | { type: 'session_updated'; key: string }
  | { type: 'session_deleted'; key: string }
  | { type: 'session_init'; current: string }
  | { type: 'channel_switched'; channel: ChannelType; session_key?: string }
  | { type: 'command_tip'; role: 'user' | 'assistant'; text: string }
  | { type: 'task_started'; task_id: string; description: string }
  | { type: 'task_completed_other_session'; task_id: string; session_key: string; status: string }
  | { type: 'task_completed'; task_id: string; session_key: string; status: string }

export interface BackgroundTask {
  taskId: string
  description: string
  status: 'running' | 'completed' | 'error'
  startedAt?: number
  ocSessionId?: string | null
}

export interface OcTodo {
  content: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'high' | 'medium' | 'low'
}

export interface OcPart {
  type: 'text' | 'tool-invocation' | string
  text?: string
  toolName?: string
  state?: 'pending' | 'running' | 'completed' | 'error' | string
  input?: Record<string, unknown>
  output?: string
}

export interface OcMessage {
  role: 'user' | 'assistant'
  parts: OcPart[]
}

export interface SessionInfo {
  key: string
  updated_at: string | null
  created_at: string | null
}
