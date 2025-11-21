'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, Loader2, Plus, Trash2, Phone, Settings, Zap, Mic, Waves, Check, Bot } from 'lucide-react'
import { Button, Tabs, Tab, Card, CardBody, Input, Textarea, Select, SelectItem, Chip, Avatar } from '@heroui/react'
import { api } from '@/lib/api'
import type { Agent, PhoneMapping, CreateAgentRequest } from '@/lib/types'

interface EditAgentModalProps {
  agent: Agent | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

// LLM Configuration
const LLM_PROVIDERS = [
  { id: 'openai', name: 'OpenAI' },
  { id: 'anthropic', name: 'Anthropic' },
  { id: 'google', name: 'Google' },
]

const LLM_MODELS: Record<string, Array<{ id: string; name: string; recommended?: boolean }>> = {
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o', recommended: false },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', recommended: true },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini' },
  ],
  anthropic: [
    { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', recommended: true },
    { id: 'claude-3-opus', name: 'Claude 3 Opus' },
  ],
  google: [
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', recommended: true },
  ],
}

// STT Configuration
const STT_PROVIDERS = [
  { id: 'deepgram', name: 'Deepgram' },
  { id: 'assemblyai', name: 'AssemblyAI' },
  { id: 'openai', name: 'OpenAI Whisper' },
]

const STT_MODELS: Record<string, Array<{ id: string; name: string }>> = {
  deepgram: [
    { id: 'nova-2', name: 'Nova 2' },
    { id: 'nova-3', name: 'Nova 3' },
    { id: 'enhanced', name: 'Enhanced' },
  ],
  assemblyai: [
    { id: 'universal-streaming', name: 'Universal Streaming' },
  ],
  openai: [
    { id: 'whisper-1', name: 'Whisper 1' },
  ],
}

// TTS Configuration
const TTS_PROVIDERS = [
  { id: 'openai', name: 'OpenAI' },
  { id: 'cartesia', name: 'Cartesia' },
  { id: 'elevenlabs', name: 'ElevenLabs' },
]

const TTS_VOICES = {
  openai: [
    { id: 'alloy', name: 'Alloy', description: 'Neutral, balanced' },
    { id: 'echo', name: 'Echo', description: 'Warm, friendly' },
    { id: 'fable', name: 'Fable', description: 'Expressive' },
    { id: 'onyx', name: 'Onyx', description: 'Deep, authoritative' },
    { id: 'nova', name: 'Nova', description: 'Energetic' },
    { id: 'shimmer', name: 'Shimmer', description: 'Soft, gentle' },
    { id: 'ash', name: 'Ash', description: 'Clear, professional' },
    { id: 'ballad', name: 'Ballad', description: 'Smooth, storytelling' },
    { id: 'coral', name: 'Coral', description: 'Bright, cheerful' },
  ],
}

// Realtime API Voices
const REALTIME_VOICES = [
  { id: 'alloy', name: 'Alloy', description: 'Neutral' },
  { id: 'echo', name: 'Echo', description: 'Warm' },
  { id: 'shimmer', name: 'Shimmer', description: 'Soft' },
  { id: 'coral', name: 'Coral', description: 'Bright' },
]

// Turn Detection Models
const TURN_DETECTION_MODELS = [
  { id: 'multilingual', name: 'Multilingual', description: 'Best for multiple languages', recommended: true },
  { id: 'semantic', name: 'Semantic', description: 'Context-aware turn detection' },
  { id: 'vad', name: 'VAD', description: 'Voice activity detection based' },
]

// VAD Providers
const VAD_PROVIDERS = [
  { id: 'silero', name: 'Silero VAD' },
  { id: 'webrtc', name: 'WebRTC VAD' },
]

// Noise Cancellation Types
const NOISE_CANCELLATION_TYPES = [
  { id: 'BVC', name: 'BVC Standard', description: 'Standard noise cancellation' },
  { id: 'BVCTelephony', name: 'BVC Telephony', description: 'Optimized for phone calls' },
]

export default function EditAgentModal({ agent, isOpen, onClose, onSuccess }: EditAgentModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneMapping[]>([])
  const [newPhoneNumber, setNewPhoneNumber] = useState('')
  const [addingPhone, setAddingPhone] = useState(false)
  const [activeTab, setActiveTab] = useState<'basic' | 'llm' | 'voice' | 'advanced' | 'session'>('basic')

  const [formData, setFormData] = useState<Partial<CreateAgentRequest>>({
    name: '',
    instructions: '',
    // Core Configuration
    agent_mode: 'standard',
    language: 'en-US',
    temperature: 0.7,
    // LLM Configuration
    llm_provider: 'openai',
    llm_model: 'gpt-4o-mini',
    // STT Configuration
    stt_provider: 'deepgram',
    stt_model: 'nova-2',
    stt_language: 'en',
    // TTS Configuration
    tts_provider: 'openai',
    voice: 'alloy',
    // Realtime API
    realtime_voice: 'alloy',
    // VAD Configuration
    vad_enabled: true,
    vad_provider: 'silero',
    // Turn Detection
    turn_detection_model: 'multilingual',
    // Noise Cancellation
    noise_cancellation_enabled: true,
    noise_cancellation_type: 'BVC',
    // Advanced Session Options
    preemptive_generation: false,
    resume_false_interruption: false,
    false_interruption_timeout: 1.0,
    min_interruption_duration: 0.2,
    // Greeting
    greeting_enabled: true,
    greeting_message: '',
  })

  useEffect(() => {
    if (agent) {
      setFormData({
        name: agent.name,
        instructions: agent.instructions,
        // Core Configuration
        agent_mode: agent.agent_mode || 'standard',
        language: agent.language || 'en-US',
        temperature: agent.temperature || 0.7,
        // LLM Configuration
        llm_provider: agent.llm_provider || 'openai',
        llm_model: agent.llm_model || 'gpt-4o-mini',
        // STT Configuration
        stt_provider: agent.stt_provider || 'deepgram',
        stt_model: agent.stt_model || 'nova-2',
        stt_language: agent.stt_language || 'en',
        // TTS Configuration
        tts_provider: agent.tts_provider || 'openai',
        tts_model: agent.tts_model,
        tts_voice_id: agent.tts_voice_id,
        voice: agent.voice || 'alloy',
        // Realtime API
        realtime_voice: agent.realtime_voice || 'alloy',
        // VAD Configuration
        vad_enabled: agent.vad_enabled !== undefined ? agent.vad_enabled : true,
        vad_provider: agent.vad_provider || 'silero',
        // Turn Detection
        turn_detection_model: agent.turn_detection_model || 'multilingual',
        // Noise Cancellation
        noise_cancellation_enabled: agent.noise_cancellation_enabled !== undefined ? agent.noise_cancellation_enabled : true,
        noise_cancellation_type: agent.noise_cancellation_type || 'BVC',
        // Advanced Session Options
        preemptive_generation: agent.preemptive_generation || false,
        resume_false_interruption: agent.resume_false_interruption || false,
        false_interruption_timeout: agent.false_interruption_timeout || 1.0,
        min_interruption_duration: agent.min_interruption_duration || 0.2,
        // Greeting
        greeting_enabled: agent.greeting_enabled !== undefined ? agent.greeting_enabled : true,
        greeting_message: agent.greeting_message || '',
      })
      fetchPhoneNumbers()
    }
  }, [agent])

  const fetchPhoneNumbers = async () => {
    if (!agent) return
    try {
      const allPhones = await api.getPhoneNumbers()
      // Filter phone numbers for this agent
      const agentPhones = allPhones.filter(p => p.agent_id === agent.id)
      setPhoneNumbers(agentPhones)
    } catch (err) {
      console.error('Failed to fetch phone numbers:', err)
    }
  }

  const handleAddPhoneNumber = async () => {
    if (!agent || !newPhoneNumber.trim()) return

    setAddingPhone(true)
    setError(null)

    try {
      await api.assignPhoneNumber({
        agent_id: agent.id,
        phone_number: newPhoneNumber.trim(),
      })
      setNewPhoneNumber('')
      await fetchPhoneNumbers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add phone number')
    } finally {
      setAddingPhone(false)
    }
  }

  const handleSave = async () => {
    if (!agent) return

    setLoading(true)
    setError(null)

    try {
      const response = await api.updateAgent(agent.id, formData)
      
      // Close modal first for smooth animation
      onClose()
      
      // Wait for modal close animation to complete
      await new Promise(resolve => setTimeout(resolve, 400))
      
      // Show success message
      const toast = await import('sonner')
      if (response.restarted) {
        // Agent was deployed, auto-restarting in background
        toast.toast.success('Configuration Saved!', {
          description: '🔄 Restarting agent with new settings (5-10 seconds). The button will show "Applying Changes..."',
          duration: 8000,
        })
      } else {
        // Agent not deployed, just saved
        toast.toast.success('Configuration Saved!', {
          description: 'Changes saved. Deploy the agent to apply them.',
          duration: 4000,
        })
      }
      
      // Trigger page refresh after modal is closed
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update agent')
      console.error('Failed to update agent:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !agent) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-700 p-6">
            <div className="flex items-center gap-3">
              <Avatar
                name={formData.name}
                size="lg"
                className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white font-semibold"
                showFallback
                fallback={<Bot className="h-6 w-6" />}
              />
              <div>
                <h2 className="text-2xl font-bold text-white">Edit Agent</h2>
                <p className="text-sm text-slate-400">{formData.name}</p>
              </div>
            </div>
            <Button
              isIconOnly
              variant="light"
              onPress={onClose}
              className="text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Tabs */}
          <div className="px-6">
            <Tabs
              selectedKey={activeTab}
              onSelectionChange={(key) => setActiveTab(key as typeof activeTab)}
              color="primary"
              variant="underlined"
              classNames={{
                tabList: "gap-6 w-full border-b border-slate-700",
                cursor: "bg-indigo-500",
                tab: "px-0",
                tabContent: "group-data-[selected=true]:text-indigo-400"
              }}
            >
              <Tab key="basic" title="Basic">
                <div className="pt-6 space-y-6">
                  <div className="space-y-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Agent Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Customer Support Agent"
                    className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {/* Instructions */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    System Instructions *
                  </label>
                  <textarea
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                    placeholder="You are a helpful customer support agent. Your goal is to..."
                    rows={6}
                    className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono text-sm"
                  />
                </div>

                {/* Agent Mode */}
                <div>
                  <label className="block text-sm font-medium text-white mb-3">
                    Agent Mode
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div
                      onClick={() => setFormData({ ...formData, agent_mode: 'standard' })}
                      className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${
                        formData.agent_mode === 'standard'
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : 'border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Settings className="h-6 w-6 text-indigo-400" />
                        {formData.agent_mode === 'standard' && (
                          <Check className="h-5 w-5 text-indigo-500" />
                        )}
                      </div>
                      <h4 className="font-semibold text-white mb-1">Standard Pipeline</h4>
                      <p className="text-xs text-slate-400">Full control over STT, LLM, TTS</p>
                    </div>

                    <div
                      onClick={() => setFormData({ ...formData, agent_mode: 'realtime' })}
                      className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${
                        formData.agent_mode === 'realtime'
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : 'border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Zap className="h-6 w-6 text-indigo-400" />
                        {formData.agent_mode === 'realtime' && (
                          <Check className="h-5 w-5 text-indigo-500" />
                        )}
                      </div>
                      <h4 className="font-semibold text-white mb-1">Realtime API</h4>
                      <p className="text-xs text-slate-400">Ultra-low latency OpenAI</p>
                    </div>
                  </div>
                </div>

                {/* Phone Numbers */}
                <div className="space-y-4 pt-4 border-t border-slate-700">
                  <h3 className="text-sm font-semibold text-white">
                    Phone Numbers
                  </h3>

                  {phoneNumbers.length > 0 && (
                    <div className="space-y-2">
                      {phoneNumbers.map((phone) => (
                        <div
                          key={phone.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700"
                        >
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-indigo-400" />
                            <span className="text-white font-medium">{phone.phone_number}</span>
                          </div>
                          <span className="text-xs text-slate-400">
                            {phone.sip_trunk_id || 'No SIP trunk'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="rounded-lg bg-slate-800/30 border border-slate-700 p-4">
                    <label className="block text-sm font-medium text-white mb-2">
                      Add Phone Number
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newPhoneNumber}
                        onChange={(e) => setNewPhoneNumber(e.target.value)}
                        placeholder="+1 (555) 123-4567"
                        className="flex-1 rounded-lg bg-slate-800 border border-slate-700 px-4 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                      <Button
                        onPress={handleAddPhoneNumber}
                        isDisabled={addingPhone || !newPhoneNumber.trim()}
                        isLoading={addingPhone}
                        color="primary"
                        startContent={!addingPhone ? <Plus className="h-4 w-4" /> : undefined}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
                  </div>
                </div>
              </Tab>

              <Tab key="llm" title="LLM">
                <div className="pt-6 space-y-6">
                  <div className="space-y-6">
                {/* LLM Provider */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    LLM Provider
                  </label>
                  <select
                    value={formData.llm_provider}
                    onChange={(e) => setFormData({
                      ...formData,
                      llm_provider: e.target.value,
                      llm_model: LLM_MODELS[e.target.value][0].id
                    })}
                    className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {LLM_PROVIDERS.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* LLM Model */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Model
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {formData.llm_provider && LLM_MODELS[formData.llm_provider]?.map((model) => (
                      <div
                        key={model.id}
                        onClick={() => setFormData({ ...formData, llm_model: model.id })}
                        className={`cursor-pointer rounded-lg border-2 p-3 transition-all ${
                          formData.llm_model === model.id
                            ? 'border-indigo-500 bg-indigo-500/10'
                            : 'border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">{model.name}</span>
                            {model.recommended && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-medium">
                                Recommended
                              </span>
                            )}
                          </div>
                          {formData.llm_model === model.id && (
                            <Check className="h-5 w-5 text-indigo-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Temperature */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Temperature: {formData.temperature}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={formData.temperature}
                    onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-2">
                    <span>Focused (0.0)</span>
                    <span>Balanced (0.5)</span>
                    <span>Creative (1.0)</span>
                  </div>
                </div>
                  </div>
                </div>
              </Tab>

              <Tab key="voice" title="Voice">
                <div className="pt-6 space-y-6">
                  <div className="space-y-6">
                {formData.agent_mode === 'standard' ? (
                  <>
                    {/* STT Configuration */}
                    <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700">
                      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <Mic className="h-4 w-4" />
                        Speech-to-Text (STT)
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <Select
                            label="Provider"
                            placeholder="Select a provider"
                            selectedKeys={[formData.stt_provider || 'deepgram']}
                            onSelectionChange={(keys) => {
                              const provider = Array.from(keys)[0] as string
                              setFormData({
                                ...formData,
                                stt_provider: provider,
                                stt_model: STT_MODELS[provider][0].id
                              })
                            }}
                            variant="bordered"
                            size="sm"
                            classNames={{
                              trigger: "bg-slate-800 border-slate-700 hover:border-indigo-500",
                              value: "text-white",
                              label: "text-slate-400"
                            }}
                          >
                            {STT_PROVIDERS.map((provider) => (
                              <SelectItem key={provider.id} value={provider.id}>
                                {provider.name}
                              </SelectItem>
                            ))}
                          </Select>
                        </div>
                        <div>
                          <Select
                            label="Model"
                            placeholder="Select a model"
                            selectedKeys={[formData.stt_model || '']}
                            onSelectionChange={(keys) => {
                              const model = Array.from(keys)[0] as string
                              setFormData({ ...formData, stt_model: model })
                            }}
                            variant="bordered"
                            size="sm"
                            classNames={{
                              trigger: "bg-slate-800 border-slate-700 hover:border-indigo-500",
                              value: "text-white",
                              label: "text-slate-400"
                            }}
                          >
                            {formData.stt_provider && STT_MODELS[formData.stt_provider]?.map((model) => (
                              <SelectItem key={model.id} value={model.id}>
                                {model.name}
                              </SelectItem>
                            ))}
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* TTS Configuration */}
                    <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700">
                      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <Waves className="h-4 w-4" />
                        Text-to-Speech (TTS)
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <Select
                            label="Provider"
                            placeholder="Select a provider"
                            selectedKeys={[formData.tts_provider || 'openai']}
                            onSelectionChange={(keys) => {
                              const provider = Array.from(keys)[0] as string
                              setFormData({ ...formData, tts_provider: provider })
                            }}
                            variant="bordered"
                            size="sm"
                            classNames={{
                              trigger: "bg-slate-800 border-slate-700 hover:border-indigo-500",
                              value: "text-white",
                              label: "text-slate-400"
                            }}
                          >
                            {TTS_PROVIDERS.map((provider) => (
                              <SelectItem key={provider.id} value={provider.id}>
                                {provider.name}
                              </SelectItem>
                            ))}
                          </Select>
                        </div>

                        {formData.tts_provider === 'openai' && (
                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-2">
                              Voice
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                              {TTS_VOICES.openai.map((voice) => (
                                <div
                                  key={voice.id}
                                  onClick={() => setFormData({ ...formData, voice: voice.id })}
                                  className={`cursor-pointer rounded-lg border p-3 transition-all ${
                                    formData.voice === voice.id
                                      ? 'border-indigo-500 bg-indigo-500/10'
                                      : 'border-slate-700 hover:border-slate-600'
                                  }`}
                                >
                                  <div className="text-center">
                                    <h4 className="text-sm font-medium text-white mb-1">{voice.name}</h4>
                                    <p className="text-xs text-slate-400">{voice.description}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {(formData.tts_provider === 'cartesia' || formData.tts_provider === 'elevenlabs') && (
                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-2">
                              Voice ID
                            </label>
                            <input
                              type="text"
                              value={formData.tts_voice_id || ''}
                              onChange={(e) => setFormData({ ...formData, tts_voice_id: e.target.value })}
                              placeholder="Enter voice ID from provider"
                              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono text-sm"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Realtime API Voice Selection */}
                    <div>
                      <label className="block text-sm font-medium text-white mb-3">
                        Realtime Voice
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {REALTIME_VOICES.map((voice) => (
                          <div
                            key={voice.id}
                            onClick={() => setFormData({ ...formData, realtime_voice: voice.id })}
                            className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${
                              formData.realtime_voice === voice.id
                                ? 'border-indigo-500 bg-indigo-500/10'
                                : 'border-slate-700 hover:border-slate-600'
                            }`}
                          >
                            <div className="text-center">
                              <div className="text-2xl mb-2">🔊</div>
                              <h4 className="font-semibold text-white mb-1">{voice.name}</h4>
                              <p className="text-xs text-slate-400">{voice.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                  </div>
                </div>
              </Tab>

              <Tab key="advanced" title="Advanced">
                <div className="pt-6 space-y-6">
                  <div className="space-y-6">
                {/* VAD Configuration */}
                <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-white">Voice Activity Detection (VAD)</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Detect when user starts/stops speaking
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                      <input
                        type="checkbox"
                        checked={formData.vad_enabled}
                        onChange={(e) => setFormData({ ...formData, vad_enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                  {formData.vad_enabled && (
                    <div className="pt-3 border-t border-slate-700">
                      <label className="block text-xs font-medium text-slate-400 mb-2">
                        Provider
                      </label>
                      <select
                        value={formData.vad_provider}
                        onChange={(e) => setFormData({ ...formData, vad_provider: e.target.value })}
                        className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2.5 text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        {VAD_PROVIDERS.map((provider) => (
                          <option key={provider.id} value={provider.id}>
                            {provider.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Turn Detection */}
                <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700">
                  <h3 className="text-sm font-semibold text-white mb-3">Turn Detection Model</h3>
                  <div className="space-y-2">
                    {TURN_DETECTION_MODELS.map((model) => (
                      <div
                        key={model.id}
                        onClick={() => setFormData({ ...formData, turn_detection_model: model.id })}
                        className={`cursor-pointer rounded-lg border-2 p-3 transition-all ${
                          formData.turn_detection_model === model.id
                            ? 'border-indigo-500 bg-indigo-500/10'
                            : 'border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-medium text-white">{model.name}</h4>
                              {model.recommended && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-medium">
                                  Recommended
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-1">{model.description}</p>
                          </div>
                          {formData.turn_detection_model === model.id && (
                            <Check className="h-5 w-5 text-indigo-500 ml-2" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Noise Cancellation */}
                <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-white">Noise Cancellation</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Remove background noise from audio
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                      <input
                        type="checkbox"
                        checked={formData.noise_cancellation_enabled}
                        onChange={(e) => setFormData({ ...formData, noise_cancellation_enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                  {formData.noise_cancellation_enabled && (
                    <div className="pt-3 border-t border-slate-700 space-y-2">
                      {NOISE_CANCELLATION_TYPES.map((type) => (
                        <div
                          key={type.id}
                          onClick={() => setFormData({ ...formData, noise_cancellation_type: type.id })}
                          className={`cursor-pointer rounded-lg border p-3 transition-all ${
                            formData.noise_cancellation_type === type.id
                              ? 'border-indigo-500 bg-indigo-500/10'
                              : 'border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-medium text-white">{type.name}</h4>
                              <p className="text-xs text-slate-400 mt-1">{type.description}</p>
                            </div>
                            {formData.noise_cancellation_type === type.id && (
                              <Check className="h-5 w-5 text-indigo-500" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                  </div>
                </div>
              </Tab>

              <Tab key="session" title="Session">
                <div className="pt-6 space-y-6">
                  <div className="space-y-6">
                {/* Preemptive Generation */}
                <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-white">Preemptive Generation</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Generate response while waiting for user to finish speaking
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                      <input
                        type="checkbox"
                        checked={formData.preemptive_generation}
                        onChange={(e) => setFormData({ ...formData, preemptive_generation: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                </div>

                {/* Interruption Handling */}
                <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-white">Resume False Interruption</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Resume speech if interrupted by background noise
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                      <input
                        type="checkbox"
                        checked={formData.resume_false_interruption}
                        onChange={(e) => setFormData({ ...formData, resume_false_interruption: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                  {formData.resume_false_interruption && (
                    <div className="space-y-3 pt-3 border-t border-slate-700">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-2">
                          False Interruption Timeout: {formData.false_interruption_timeout}s
                        </label>
                        <input
                          type="range"
                          min="0.5"
                          max="3.0"
                          step="0.1"
                          value={formData.false_interruption_timeout}
                          onChange={(e) => setFormData({ ...formData, false_interruption_timeout: parseFloat(e.target.value) })}
                          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-slate-500 mt-1">
                          <span>0.5s</span>
                          <span>3.0s</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-2">
                          Minimum Interruption Duration: {formData.min_interruption_duration}s
                        </label>
                        <input
                          type="range"
                          min="0.1"
                          max="1.0"
                          step="0.1"
                          value={formData.min_interruption_duration}
                          onChange={(e) => setFormData({ ...formData, min_interruption_duration: parseFloat(e.target.value) })}
                          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-slate-500 mt-1">
                          <span>0.1s</span>
                          <span>1.0s</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Greeting Configuration */}
                <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white">Auto Greeting</h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.greeting_enabled}
                        onChange={(e) => setFormData({ ...formData, greeting_enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                  {formData.greeting_enabled && (
                    <div className="pt-3 border-t border-slate-700">
                      <label className="block text-xs font-medium text-slate-400 mb-2">
                        Greeting Instructions
                      </label>
                      <textarea
                        value={formData.greeting_message || ''}
                        onChange={(e) => setFormData({ ...formData, greeting_message: e.target.value })}
                        placeholder="Instructions for how the agent should greet users..."
                        rows={3}
                        className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                      />
                    </div>
                  )}
                </div>
                  </div>
                </div>
              </Tab>
            </Tabs>
          </div>

          {/* Error Display */}
          {error && (
            <div className="px-6 py-3 bg-red-500/10 border-t border-red-500/20">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-700 p-6">
            <Button
              onPress={onClose}
              variant="flat"
              color="default"
            >
              Cancel
            </Button>
            <Button
              onPress={handleSave}
              isDisabled={loading}
              isLoading={loading}
              color="primary"
              variant="shadow"
              startContent={!loading ? <Save className="h-4 w-4" /> : undefined}
              className="bg-gradient-to-r from-indigo-600 to-indigo-500"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
