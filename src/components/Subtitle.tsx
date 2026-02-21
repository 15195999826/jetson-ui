import type { PipelineState } from '../types'

interface Props {
  text: string
  state: PipelineState
}

const STATE_LABEL: Record<PipelineState, string> = {
  idle: '待机中',
  triggered: '已唤醒',
  recording: '正在聆听...',
  transcribing: '识别中...',
  thinking: '思考中...',
  responding: '正在回复',
}

export function Subtitle({ text, state }: Props) {
  return (
    <div style={{
      padding: '12px 16px',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
    }}>
      <div style={{
        fontSize: 12,
        color: '#666',
        marginBottom: 6,
        letterSpacing: '0.05em',
      }}>
        {STATE_LABEL[state]}
      </div>
      <div style={{
        fontSize: 18,
        color: '#e0e0e0',
        minHeight: 28,
        lineHeight: 1.5,
        wordBreak: 'break-all',
      }}>
        {text || '\u00a0'}
      </div>
    </div>
  )
}
