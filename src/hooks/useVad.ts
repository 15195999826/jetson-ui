import { useCallback, useRef, useState } from 'react'
import { MicVAD } from '@ricky0123/vad-web'

export interface UseVadOptions {
  onSpeechStart?: () => void
  onSpeechEnd?: (audio: Float32Array) => void
}

export function useVad({ onSpeechStart, onSpeechEnd }: UseVadOptions = {}) {
  const [isVadRunning, setIsVadRunning] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const vadRef = useRef<MicVAD | null>(null)
  const onSpeechStartRef = useRef(onSpeechStart)
  const onSpeechEndRef = useRef(onSpeechEnd)
  onSpeechStartRef.current = onSpeechStart
  onSpeechEndRef.current = onSpeechEnd

  const startVad = useCallback(async () => {
    if (vadRef.current) return
    const vad = await MicVAD.new({
      onSpeechStart: () => {
        setIsSpeaking(true)
        onSpeechStartRef.current?.()
      },
      onSpeechEnd: (audio: Float32Array) => {
        setIsSpeaking(false)
        onSpeechEndRef.current?.(audio)
      },
    })
    vadRef.current = vad
    vad.start()
    setIsVadRunning(true)
  }, [])

  const stopVad = useCallback(() => {
    if (vadRef.current) {
      vadRef.current.destroy()
      vadRef.current = null
    }
    setIsVadRunning(false)
    setIsSpeaking(false)
  }, [])

  return { startVad, stopVad, isVadRunning, isSpeaking }
}
