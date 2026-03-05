import { useCallback, useRef, useState } from 'react'

export interface UseAudioCaptureOptions {
  onAudioFrame?: (pcm: Float32Array) => void
}

export function useAudioCapture({ onAudioFrame }: UseAudioCaptureOptions = {}) {
  const [isCapturing, setIsCapturing] = useState(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const onAudioFrameRef = useRef(onAudioFrame)
  onAudioFrameRef.current = onAudioFrame

  const startCapture = useCallback(async () => {
    if (audioContextRef.current) return

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    })
    const ctx = new AudioContext({ sampleRate: 16000 })
    const source = ctx.createMediaStreamSource(stream)
    const processor = ctx.createScriptProcessor(4096, 1, 1)

    processor.onaudioprocess = (e) => {
      const data = e.inputBuffer.getChannelData(0)
      onAudioFrameRef.current?.(new Float32Array(data))
    }

    source.connect(processor)
    processor.connect(ctx.destination)

    audioContextRef.current = ctx
    streamRef.current = stream
    processorRef.current = processor
    sourceRef.current = source
    setIsCapturing(true)
  }, [])

  const stopCapture = useCallback(() => {
    processorRef.current?.disconnect()
    sourceRef.current?.disconnect()
    audioContextRef.current?.close()
    streamRef.current?.getTracks().forEach((t) => t.stop())

    processorRef.current = null
    sourceRef.current = null
    audioContextRef.current = null
    streamRef.current = null
    setIsCapturing(false)
  }, [])

  return { startCapture, stopCapture, isCapturing, audioContextRef }
}
