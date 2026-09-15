import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'

const modeTitles = {
  free: 'Free Conversation',
  grammar: 'Grammar Practice',
  roleplay: 'Role Play',
}

function getScoreBadge(score) {
  if (!score) return null
  const s = score.toLowerCase()
  if (s.includes('excellent')) return { label: 'Excellent', bg: 'rgba(34,197,94,0.2)', border: 'rgba(34,197,94,0.4)', color: '#86efac' }
  if (s.includes('good'))      return { label: 'Good',      bg: 'rgba(234,179,8,0.2)', border: 'rgba(234,179,8,0.4)', color: '#fde68a' }
  return                               { label: 'Try Again', bg: 'rgba(239,68,68,0.2)', border: 'rgba(239,68,68,0.4)', color: '#fca5a5' }
}

export default function Practice({ user }) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const mode = searchParams.get('mode') || 'free'

  const [isRecording,  setIsRecording]  = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [aiData,       setAiData]       = useState(null)
  const [showMalayalam, setShowMalayalam] = useState(false)
  const [messages,     setMessages]     = useState([])
  const [error,        setError]        = useState('')

  const mediaRecorder  = useRef(null)
  const audioChunks    = useRef([])
  const messagesEndRef = useRef(null)
  const lastAudioUrl   = useRef(null)   // stores last TTS blob URL for replay
  const currentAudio   = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isProcessing])

  // ── Replay last AI voice ──
  const replayAudio = () => {
    if (!lastAudioUrl.current) return
    if (currentAudio.current) {
      currentAudio.current.pause()
      currentAudio.current.currentTime = 0
    }
    const audio = new Audio(lastAudioUrl.current)
    currentAudio.current = audio
    audio.play().catch((e) => console.warn('Replay failed:', e))
  }

  // ── Recording ──
  const startRecording = async () => {
    if (isProcessing || isRecording) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunks.current = []
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : ''
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {})
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.current.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(audioChunks.current, { type: mimeType || 'audio/webm' })
        stream.getTracks().forEach((t) => t.stop())
        processAudio(blob)
      }
      mediaRecorder.current = mr
      mr.start(250)
      setIsRecording(true)
      setError('')
    } catch (e) {
      setError('Microphone access denied. Please allow microphone in browser settings.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop()
      setIsRecording(false)
      setIsProcessing(true)
    }
  }

  // ── Main processing pipeline ──
  const processAudio = async (audioBlob) => {
    try {
      // Step 1 — Speech to Text
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      const sttRes = await fetch('/api/stt/', { method: 'POST', body: formData })
      if (!sttRes.ok) {
        const err = await sttRes.json().catch(() => ({}))
        throw new Error(err.error || 'Speech recognition failed')
      }
      const { transcript } = await sttRes.json()
      if (!transcript?.trim()) {
        setError('No speech detected. Please speak clearly and try again.')
        setIsProcessing(false)
        return
      }

      setMessages((prev) => [...prev, { id: Date.now(), role: 'user', text: transcript }])

      // Step 2 — AI Tutor
      const chatRes = await fetch('/api/chat/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, mode }),
      })
      if (!chatRes.ok) {
        const err = await chatRes.json().catch(() => ({}))
        throw new Error(err.error || 'AI processing failed')
      }
      const data = await chatRes.json()
      setAiData(data)
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'ai',
          text: data.reply || '',
          correction: data.correction || null,
          originalText: transcript,
          score: data.score || null,
          tip: data.tip || '',
        },
      ])

      // Step 3 — Text to Speech
      const replyText = data.reply || ''
      if (replyText.trim()) {
        try {
          const ttsRes = await fetch('/api/tts/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: replyText }),
          })
          if (ttsRes.ok) {
            const blob2 = await ttsRes.blob()
            // Clean up old URL
            if (lastAudioUrl.current) URL.revokeObjectURL(lastAudioUrl.current)
            const audioUrl = URL.createObjectURL(blob2)
            lastAudioUrl.current = audioUrl
            // Auto-play
            if (currentAudio.current) currentAudio.current.pause()
            const audio = new Audio(audioUrl)
            currentAudio.current = audio
            audio.play().catch((e) => console.warn('Auto-play failed:', e))
          } else {
            console.warn('TTS failed:', ttsRes.status)
          }
        } catch (ttsErr) {
          console.warn('TTS error (non-fatal):', ttsErr)
        }
      }
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f172a', color: 'white' }}>

      {/* ── Header ── */}
      <div style={{ background: '#1e1b4b', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => navigate('/')} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '14px', fontWeight: '600', padding: '6px 10px', borderRadius: '8px' }}>
            &#8592; Back
          </button>
          <span style={{ fontWeight: '700', fontSize: '16px' }}>{modeTitles[mode]}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Replay button */}
          <button
            onClick={replayAudio}
            disabled={!lastAudioUrl.current}
            title="Replay last AI voice"
            style={{
              background: lastAudioUrl.current ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)',
              border: lastAudioUrl.current ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.1)',
              color: lastAudioUrl.current ? '#a5b4fc' : 'rgba(255,255,255,0.25)',
              cursor: lastAudioUrl.current ? 'pointer' : 'not-allowed',
              padding: '6px 14px', borderRadius: '20px', fontSize: '14px', fontWeight: '600',
            }}
          >
            &#x1F509; Replay
          </button>
          {/* Malayalam toggle */}
          <button
            onClick={() => setShowMalayalam((v) => !v)}
            style={{
              background: showMalayalam ? 'rgba(234,179,8,0.2)' : 'rgba(255,255,255,0.08)',
              border: showMalayalam ? '1px solid rgba(234,179,8,0.4)' : '1px solid rgba(255,255,255,0.15)',
              color: showMalayalam ? '#fde68a' : 'rgba(255,255,255,0.6)',
              cursor: 'pointer', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '600',
            }}
          >
            &#x1F1EE;&#x1F1F3; Malayalam
          </button>
        </div>
      </div>

      {/* ── Messages ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {messages.length === 0 && !isProcessing && (
          <div style={{ textAlign: 'center', marginTop: '60px', color: 'rgba(255,255,255,0.35)', fontSize: '14px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>&#x1F399;</div>
            <div style={{ fontWeight: '600', fontSize: '16px', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>Miss Nova is ready!</div>
            <div>Hold the button below and speak in English</div>
          </div>
        )}

        {messages.map((msg) => {
          // User bubble
          if (msg.role === 'user') {
            return (
              <div key={msg.id} style={{ alignSelf: 'flex-end', maxWidth: '75%' }}>
                <div style={{ background: '#6366f1', borderRadius: '18px 18px 4px 18px', padding: '12px 16px', fontSize: '14px', lineHeight: '1.6', color: 'white' }}>
                  {msg.text}
                </div>
              </div>
            )
          }

          // AI bubble
          const badge = getScoreBadge(msg.score)
          const hasCorrection = msg.correction && msg.correction !== msg.originalText

          return (
            <div key={msg.id} style={{ alignSelf: 'flex-start', maxWidth: '80%' }}>
              <div style={{ fontSize: '11px', color: '#a5b4fc', marginBottom: '4px', fontWeight: '600' }}>
                &#x1F916; Miss Nova
              </div>
              <div style={{ background: '#1e2a3a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px 18px 18px 4px', padding: '14px 16px', fontSize: '14px', lineHeight: '1.6', color: 'rgba(255,255,255,0.9)' }}>
                {msg.text}
              </div>

              {/* Grammar correction */}
              {hasCorrection && (
                <div style={{ marginTop: '6px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '8px 12px', fontSize: '12px', lineHeight: '1.7' }}>
                  <div><span style={{ textDecoration: 'line-through', color: '#f87171' }}>{msg.originalText}</span></div>
                  <div><span style={{ color: '#86efac' }}>&#x2713; {msg.correction}</span></div>
                </div>
              )}

              {/* Score badge */}
              {badge && (
                <div style={{ marginTop: '6px' }}>
                  <span style={{ display: 'inline-block', background: badge.bg, border: `1px solid ${badge.border}`, color: badge.color, borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: '600' }}>
                    {badge.label}
                  </span>
                </div>
              )}

              {/* Tip */}
              {msg.tip && (
                <div style={{ marginTop: '6px', background: 'rgba(99,102,241,0.15)', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: '#c7d2fe', lineHeight: '1.5' }}>
                  &#x1F4A1; <strong>Tip:</strong> {msg.tip}
                </div>
              )}
            </div>
          )
        })}

        {/* Thinking indicator */}
        {isProcessing && (
          <div style={{ alignSelf: 'flex-start' }}>
            <div style={{ fontSize: '11px', color: '#a5b4fc', marginBottom: '4px', fontWeight: '600' }}>&#x1F916; Miss Nova</div>
            <div style={{ background: '#1e2a3a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px 18px 18px 4px', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginRight: '4px' }}>Miss Nova is thinking</span>
              <span className="bounce-dot" />
              <span className="bounce-dot" />
              <span className="bounce-dot" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Malayalam hint banner ── */}
      {showMalayalam && aiData?.malayalam_hint && (
        <div style={{ background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: '12px', padding: '12px 16px', margin: '0 20px 8px', color: '#fde68a', fontSize: '14px', lineHeight: '1.6', flexShrink: 0 }}>
          <strong style={{ fontSize: '11px', letterSpacing: '0.5px', textTransform: 'uppercase', opacity: 0.7 }}>Malayalam</strong><br/>
          {aiData.malayalam_hint}
        </div>
      )}

      {showMalayalam && !aiData?.malayalam_hint && messages.some(m => m.role === 'ai') && (
        <div style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: '12px', padding: '10px 16px', margin: '0 20px 8px', color: 'rgba(253,230,138,0.5)', fontSize: '13px', flexShrink: 0 }}>
          Malayalam translation will appear after Miss Nova replies.
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '12px', padding: '12px 16px', margin: '0 20px 8px', color: '#fca5a5', fontSize: '13px', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'transparent', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: '18px', padding: '0 4px' }}>&#x2715;</button>
        </div>
      )}

      {/* ── Bottom controls ── */}
      <div style={{ background: '#0f172a', padding: '20px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onTouchStart={(e) => { e.preventDefault(); startRecording() }}
          onTouchEnd={(e) => { e.preventDefault(); stopRecording() }}
          disabled={isProcessing}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          style={{
            width: '80px', height: '80px', borderRadius: '50%',
            border: isRecording ? '2px solid #f87171' : '2px solid rgba(255,255,255,0.2)',
            background: isRecording ? '#ef4444' : isProcessing ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
            boxShadow: isRecording ? '0 0 0 10px rgba(239,68,68,0.2)' : 'none',
            fontSize: '30px', cursor: isProcessing ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
            animation: isRecording ? 'pulse 1.5s ease-in-out infinite' : 'none',
            opacity: isProcessing ? 0.5 : 1,
            userSelect: 'none', WebkitUserSelect: 'none',
          }}
        >
          {isRecording ? '\u23F9' : '\uD83C\uDFA4'}
        </button>
        <p style={{ margin: 0, fontSize: '13px', color: isRecording ? '#f87171' : isProcessing ? '#a5b4fc' : 'rgba(255,255,255,0.4)', fontWeight: '500' }}>
          {isProcessing ? 'Processing...' : isRecording ? 'Release to send' : 'Hold to speak'}
        </p>
      </div>
    </div>
  )
}