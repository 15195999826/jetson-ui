import { useWebSocket } from './hooks/useWebSocket'
import { FaceCanvas } from './components/FaceCanvas'
import { Subtitle } from './components/Subtitle'
import { ChatHistory } from './components/ChatHistory'
import './App.css'

const WS_URL = `ws://${location.hostname}:8080/ws`

export default function App() {
  const { state, subtitle, history, connected } = useWebSocket(WS_URL)

  return (
    <div className="app">
      {/* 左：表情区域 */}
      <div className="face-panel">
        <div className="face-canvas-wrap">
          <FaceCanvas state={state} />
        </div>
        <div className="state-badge">{state.toUpperCase()}</div>
      </div>

      {/* 右：信息区域 */}
      <div className="info-panel">
        {/* 连接状态指示器 */}
        <div className={`ws-dot ${connected ? 'connected' : ''}`} title={connected ? '已连接' : '未连接'} />

        {/* 字幕区 */}
        <div className="subtitle-section">
          <Subtitle text={subtitle} state={state} />
        </div>

        {/* 聊天记录区 */}
        <div className="history-section">
          <ChatHistory history={history} />
        </div>
      </div>
    </div>
  )
}
