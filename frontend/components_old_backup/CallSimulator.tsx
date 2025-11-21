'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'

interface CallSimulatorProps {
  agentName?: string
}

// Simulated conversation transcript
const simulatedConversation = [
  { speaker: 'agent', text: 'Hello! Thank you for calling. How can I help you today?', timestamp: 2000 },
  { speaker: 'user', text: 'Hi, I need help with my account.', timestamp: 5000 },
  { speaker: 'agent', text: 'Of course! I\'d be happy to help you with your account. Could you please provide me with your account number or email address?', timestamp: 8000 },
  { speaker: 'user', text: 'Sure, it\'s john@example.com', timestamp: 11000 },
  { speaker: 'agent', text: 'Perfect! I\'ve found your account. What specific issue can I help you with today?', timestamp: 14000 },
]

export default function CallSimulator({ agentName = 'AI Agent' }: CallSimulatorProps) {
  const [isCallActive, setIsCallActive] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeakerOn, setIsSpeakerOn] = useState(true)
  const [transcript, setTranscript] = useState<Array<{ speaker: string; text: string }>>([])
  const [callDuration, setCallDuration] = useState(0)
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false)
  const transcriptEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let durationInterval: NodeJS.Timeout
    if (isCallActive) {
      durationInterval = setInterval(() => {
        setCallDuration((prev) => prev + 1)
      }, 1000)
    } else {
      setCallDuration(0)
      setTranscript([])
    }
    return () => clearInterval(durationInterval)
  }, [isCallActive])

  useEffect(() => {
    if (!isCallActive) return

    // Simulate conversation
    simulatedConversation.forEach((line, index) => {
      setTimeout(() => {
        if (line.speaker === 'agent') {
          setIsAgentSpeaking(true)
          setTimeout(() => setIsAgentSpeaking(false), 2000)
        }
        setTranscript((prev) => [...prev, { speaker: line.speaker, text: line.text }])
      }, line.timestamp)
    })
  }, [isCallActive])

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleStartCall = () => {
    setIsCallActive(true)
  }

  const handleEndCall = () => {
    setIsCallActive(false)
  }

  return (
    <div className="card max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700">
        <div>
          <h3 className="text-lg font-semibold text-white">Call Simulator</h3>
          <p className="text-sm text-slate-400 mt-1">
            {isCallActive ? `Connected to ${agentName}` : 'Test your AI agent'}
          </p>
        </div>
        {isCallActive && (
          <div className="text-right">
            <div className="text-2xl font-mono font-bold text-white">{formatDuration(callDuration)}</div>
            <div className="flex items-center gap-1.5 text-xs text-green-400 justify-end mt-1">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              Live
            </div>
          </div>
        )}
      </div>

      {/* Waveform Visualization */}
      <div className="mb-6 rounded-lg bg-slate-900/50 border border-slate-700 p-6">
        <div className="flex items-center justify-center gap-1 h-24">
          {[...Array(40)].map((_, i) => {
            const isActive = isCallActive && (isAgentSpeaking || (i % 3 === 0))
            const randomHeight = isActive ? Math.random() * 100 : 20
            return (
              <motion.div
                key={i}
                className={`w-1 rounded-full ${
                  isAgentSpeaking
                    ? 'bg-gradient-to-t from-indigo-600 to-indigo-400'
                    : 'bg-gradient-to-t from-cyan-600 to-cyan-400'
                }`}
                animate={{
                  height: isActive ? `${randomHeight}%` : '20%',
                }}
                transition={{
                  duration: 0.2,
                  repeat: isActive ? Infinity : 0,
                  repeatType: 'reverse',
                }}
              />
            )
          })}
        </div>
        <div className="text-center mt-4">
          <p className="text-xs text-slate-400">
            {isAgentSpeaking ? '🤖 Agent is speaking...' : isCallActive ? '👤 Listening...' : 'Press start to begin call'}
          </p>
        </div>
      </div>

      {/* Transcript */}
      {isCallActive && (
        <div className="mb-6 rounded-lg bg-slate-900/50 border border-slate-700 p-4 max-h-60 overflow-y-auto">
          <h4 className="text-xs font-medium text-slate-400 uppercase mb-3">Live Transcript</h4>
          <div className="space-y-3">
            {transcript.map((line, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${line.speaker === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    line.speaker === 'agent'
                      ? 'bg-indigo-500/20 text-indigo-100'
                      : 'bg-cyan-500/20 text-cyan-100'
                  }`}
                >
                  <p className="text-xs font-medium mb-1">
                    {line.speaker === 'agent' ? '🤖 Agent' : '👤 You'}
                  </p>
                  <p className="text-sm">{line.text}</p>
                </div>
              </motion.div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        {/* Mute */}
        {isCallActive && (
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`rounded-full p-4 transition-all ${
              isMuted
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
        )}

        {/* Call Button */}
        {!isCallActive ? (
          <button
            onClick={handleStartCall}
            className="rounded-full bg-gradient-to-r from-green-600 to-green-500 p-6 shadow-lg shadow-green-500/50 transition-all hover:shadow-green-500/75 hover:scale-110"
          >
            <Phone className="h-6 w-6 text-white" />
          </button>
        ) : (
          <button
            onClick={handleEndCall}
            className="rounded-full bg-gradient-to-r from-red-600 to-red-500 p-6 shadow-lg shadow-red-500/50 transition-all hover:shadow-red-500/75 hover:scale-110"
          >
            <PhoneOff className="h-6 w-6 text-white" />
          </button>
        )}

        {/* Speaker */}
        {isCallActive && (
          <button
            onClick={() => setIsSpeakerOn(!isSpeakerOn)}
            className={`rounded-full p-4 transition-all ${
              !isSpeakerOn
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {isSpeakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </button>
        )}
      </div>

      {/* Status Bar */}
      {isCallActive && (
        <div className="mt-6 pt-4 border-t border-slate-700 flex items-center justify-center gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Mic className={`h-3.5 w-3.5 ${isMuted ? 'text-red-400' : 'text-green-400'}`} />
            <span>{isMuted ? 'Muted' : 'Mic On'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Volume2 className={`h-3.5 w-3.5 ${isSpeakerOn ? 'text-green-400' : 'text-red-400'}`} />
            <span>{isSpeakerOn ? 'Speaker On' : 'Speaker Off'}</span>
          </div>
        </div>
      )}
    </div>
  )
}
