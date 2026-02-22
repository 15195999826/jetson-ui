import { useCallback, useRef } from 'react'
import { useWebSocket } from './hooks/useWebSocket'
import { usePlatform } from './hooks/usePlatform'
import { FaceCanvas } from './components/FaceCanvas'
import { Subtitle } from './components/Subtitle'
import { ChatHistory } from './components/ChatHistory'
import { SessionBar } from './components/SessionBar'
import { VadRing } from './components/VadRing'
import { TextInput } from './components/TextInput'
import './App.css'

const WS_URL = `ws://${location.host}/ws`

export default function App() {
  const platform = usePlatform()
  const sessionBarNotifyRef = useRef<((key: string) => void) | null>(null)
  const sessionBarDeleteRef = useRef<((key: string) => void) | null>(null)

  const handleSessionUpdated = useCallback((key: string) => {
    sessionBarNotifyRef.current?.(key)
  }, [])

  const handleSessionDeleted = useCallback((key: string) => {
    sessionBarDeleteRef.current?.(key)
  }, [])

  const { state, mode, subtitle, history, connected, sessionKey, vad, sendPttStart, sendPttStop, sendSetMode, sendText, switchSession } = useWebSocket(WS_URL, handleSessionUpdated, handleSessionDeleted)

  // PTT 长按：防止 touch + mouse 双触发
  const pttActiveRef = useRef(false)

  const handlePttDown = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    if (pttActiveRef.current) return
    pttActiveRef.current = true
    sendPttStart()
  }, [sendPttStart])

  const handlePttUp = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    if (!pttActiveRef.current) return
    pttActiveRef.current = false
    sendPttStop()
  }, [sendPttStop])

  const isPttRecording = mode === 'ptt' && state === 'recording'
  const canSwitch = state === 'idle'

  const renderModeSwitcher = () => (
    <div className={`mode-switcher ${!canSwitch ? 'disabled' : ''}`}>
      <div
        className="mode-track"
        onClick={canSwitch ? () => sendSetMode(mode === 'ptt' ? 'natural' : 'ptt') : undefined}
      >
        <div className={`mode-thumb ${mode === 'natural' ? 'right' : ''}`} />
        <span className={`mode-label left ${mode === 'ptt' ? 'active' : ''}`}>PTT</span>
        <span className={`mode-label right ${mode === 'natural' ? 'active' : ''}`}>自然</span>
      </div>
    </div>
  )

  return (
    <div className={`app ${platform}`}>
      <div className="face-panel">
        <div className="face-canvas-wrap">
          <FaceCanvas state={state} />
        </div>

        <div className="ptt-container">
          <VadRing vad={vad} size={72} />
          <button
            className={`btn-ptt ${isPttRecording ? 'recording' : ''} ${mode !== 'ptt' ? 'inactive' : ''}`}
            onTouchStart={handlePttDown}
            onTouchEnd={handlePttUp}
            onTouchCancel={handlePttUp}
            onMouseDown={handlePttDown}
            onMouseUp={handlePttUp}
            onMouseLeave={handlePttUp}
            disabled={mode !== 'ptt' || (state !== 'idle' && state !== 'recording')}
          >
            {isPttRecording ? '⏹' : '🎤'}
          </button>
        </div>

        {platform === 'desktop' && renderModeSwitcher()}

        <div className="state-badge">{state.toUpperCase()}</div>
      </div>

      <div className="info-panel">
        <div className={`ws-dot ${connected ? 'connected' : ''}`} title={connected ? '已连接' : '未连接'} />

        <SessionBar currentKey={sessionKey} onSwitch={switchSession} notifyRef={sessionBarNotifyRef} deleteNotifyRef={sessionBarDeleteRef} />

        {platform === 'desktop' ? (
          <>
            <div className="history-section">
              <ChatHistory history={history} />
            </div>
            <div className="subtitle-section">
              <Subtitle text={subtitle} state={state} />
            </div>
            <TextInput onSend={sendText} />
          </>
        ) : (
          <>
            <div className="subtitle-section">
              <Subtitle text={subtitle} state={state} />
            </div>
            <div className="history-section">
              <ChatHistory history={history} />
            </div>
            {renderModeSwitcher()}
          </>
        )}
      </div>
    </div>
  )
}
