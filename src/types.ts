export type PipelineState =
  | 'idle'
  | 'triggered'
  | 'recording'
  | 'transcribing'
  | 'thinking'
  | 'responding'

export interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
}

// WebSocket 消息类型（匹配 pipeline.py 广播的事件）
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

export interface SessionInfo {
  key: string
  updated_at: string | null
  created_at: string | null
}
