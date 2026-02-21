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
  | { type: 'user_text'; text: string }
  | { type: 'assistant_text'; text: string }
  | { type: 'assistant_chunk'; text: string; done: boolean }
  | { type: 'vad_status'; is_speech: boolean; probability: number }
  | { type: 'vad_speech_start'; probability: number }
  | { type: 'vad_speech_end'; probability: number }
  | { type: 'error'; text: string }
