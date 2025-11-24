'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, ChevronLeft, Check, Sparkles, Loader2, Settings, Mic, Waves, Zap, HelpCircle } from 'lucide-react'
import { Button, Input, Textarea, Select, SelectItem, Card, CardBody, Chip, Tooltip, Progress, Avatar } from '@heroui/react'
import { api } from '@/lib/api'
import type { CreateAgentRequest, Agent } from '@/lib/types'
import { toast } from 'sonner'

interface CreateAgentWizardProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  editAgent?: Agent | null  // Pass agent to edit
}

// Configuration options
const LLM_PROVIDERS = [
  { id: 'openai', name: 'OpenAI' },
  { id: 'anthropic', name: 'Anthropic' },
  { id: 'google', name: 'Google' },
]

const LLM_MODELS = {
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable model' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and efficient', recommended: true },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Powerful and fast' },
    { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', description: 'Latest optimized version' },
  ],
  anthropic: [
    { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', description: 'Most capable', recommended: true },
    { id: 'claude-3-opus', name: 'Claude 3 Opus', description: 'Previous flagship' },
  ],
  google: [
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Latest multimodal model' },
  ],
}

const STT_PROVIDERS = [
  { id: 'deepgram', name: 'Deepgram' },
  { id: 'assemblyai', name: 'AssemblyAI' },
  { id: 'openai', name: 'OpenAI Whisper' },
]

const STT_MODELS = {
  deepgram: [
    { id: 'nova-2', name: 'Nova 2', recommended: true },
    { id: 'nova-3', name: 'Nova 3' },
    { id: 'enhanced', name: 'Enhanced' },
  ],
  assemblyai: [
    { id: 'universal-streaming', name: 'Universal Streaming', recommended: true },
  ],
  openai: [
    { id: 'whisper-1', name: 'Whisper 1', recommended: true },
  ],
}

const TTS_PROVIDERS = [
  { id: 'openai', name: 'OpenAI' },
  { id: 'cartesia', name: 'Cartesia' },
  { id: 'elevenlabs', name: 'ElevenLabs' },
]

const TTS_VOICES = {
  openai: [
    { id: 'alloy', name: 'Alloy', description: 'Neutral, balanced' },
    { id: 'echo', name: 'Echo', description: 'Clear, professional' },
    { id: 'fable', name: 'Fable', description: 'Warm, friendly' },
    { id: 'onyx', name: 'Onyx', description: 'Deep, authoritative' },
    { id: 'nova', name: 'Nova', description: 'Energetic, upbeat' },
    { id: 'shimmer', name: 'Shimmer', description: 'Soft, soothing' },
    { id: 'ash', name: 'Ash', description: 'Neutral, clear' },
    { id: 'ballad', name: 'Ballad', description: 'Expressive' },
    { id: 'coral', name: 'Coral', description: 'Warm, engaging' },
  ],
}

const REALTIME_VOICES = [
  { id: 'alloy', name: 'Alloy', description: 'Neutral, balanced' },
  { id: 'echo', name: 'Echo', description: 'Clear, professional' },
  { id: 'shimmer', name: 'Shimmer', description: 'Soft, soothing' },
  { id: 'coral', name: 'Coral', description: 'Warm, engaging' },
]

const TURN_DETECTION_MODELS = [
  { id: 'multilingual', name: 'Multilingual', description: 'Best for multiple languages', recommended: true },
  { id: 'semantic', name: 'Semantic', description: 'Context-aware turn detection' },
  { id: 'vad', name: 'VAD', description: 'Voice activity detection' },
]

export default function CreateAgentWizard({ isOpen, onClose, onSuccess, editAgent }: CreateAgentWizardProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isEditing = !!editAgent

  const [formData, setFormData] = useState<CreateAgentRequest>({
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
    greeting_message: 'Greet the user warmly and ask how you can help them today.',
  })

  const steps = ['Details', 'Mode', 'LLM', 'Voice', 'Advanced', 'Session', 'Review']

  const handleNext = () => {
    if (step < steps.length) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  // Load edit agent data when editing
  useEffect(() => {
    if (editAgent && isOpen) {
      setFormData({
        name: editAgent.name,
        instructions: editAgent.instructions,
        agent_mode: editAgent.agent_mode || 'standard',
        language: editAgent.language || 'en-US',
        temperature: editAgent.temperature || 0.7,
        llm_provider: editAgent.llm_provider || 'openai',
        llm_model: editAgent.llm_model || 'gpt-4o-mini',
        stt_provider: editAgent.stt_provider || 'deepgram',
        stt_model: editAgent.stt_model || 'nova-2',
        stt_language: editAgent.stt_language || 'en',
        tts_provider: editAgent.tts_provider || 'openai',
        voice: editAgent.voice || 'alloy',
        realtime_voice: editAgent.realtime_voice || 'alloy',
        vad_enabled: editAgent.vad_enabled !== false,
        vad_provider: editAgent.vad_provider || 'silero',
        turn_detection_model: editAgent.turn_detection_model || 'multilingual',
        noise_cancellation_enabled: editAgent.noise_cancellation_enabled !== false,
        noise_cancellation_type: editAgent.noise_cancellation_type || 'BVC',
        preemptive_generation: editAgent.preemptive_generation || false,
        resume_false_interruption: editAgent.resume_false_interruption || false,
        false_interruption_timeout: editAgent.false_interruption_timeout || 1.0,
        min_interruption_duration: editAgent.min_interruption_duration || 0.2,
        greeting_enabled: editAgent.greeting_enabled !== false,
        greeting_message: editAgent.greeting_message || 'Greet the user warmly and ask how you can help them today.',
      })
    }
  })

  const handleCreate = async () => {
    if (!formData.name || !formData.instructions) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (isEditing && editAgent) {
        await api.updateAgent(editAgent.id, formData)
      } else {
        await api.createAgent(formData)
      }

      // Reset form
      setStep(1)
      setFormData({
        name: '',
        instructions: '',
        agent_mode: 'standard',
        language: 'en-US',
        temperature: 0.7,
        llm_provider: 'openai',
        llm_model: 'gpt-4o-mini',
        stt_provider: 'deepgram',
        stt_model: 'nova-2',
        stt_language: 'en',
        tts_provider: 'openai',
        voice: 'alloy',
        realtime_voice: 'alloy',
        vad_enabled: true,
        vad_provider: 'silero',
        turn_detection_model: 'multilingual',
        noise_cancellation_enabled: true,
        noise_cancellation_type: 'BVC',
        preemptive_generation: false,
        resume_false_interruption: false,
        false_interruption_timeout: 1.0,
        min_interruption_duration: 0.2,
        greeting_enabled: true,
        greeting_message: 'Greet the user warmly and ask how you can help them today.',
      })

      toast.success(isEditing ? 'Agent updated!' : 'Agent created!', {
        description: isEditing ? 'Changes saved successfully' : 'Your AI agent is now ready to receive calls'
      })
      onSuccess?.()
      onClose()
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : (isEditing ? 'Failed to update agent' : 'Failed to create agent')
      setError(errorMsg)
      toast.error(isEditing ? 'Failed to update agent' : 'Failed to create agent', {
        description: errorMsg
      })
      console.error(isEditing ? 'Failed to update agent:' : 'Failed to create agent:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

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
          className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-700 p-6 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-indigo-400" />
                Create New Agent
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Step {step} of {steps.length}: {steps[step - 1]}
              </p>
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

          {/* Overall Progress */}
          <div className="px-6 pt-3 pb-2">
            <Progress
              value={(step / steps.length) * 100}
              color="primary"
              size="sm"
              className="max-w-full"
              classNames={{
                indicator: "bg-gradient-to-r from-indigo-500 to-indigo-600"
              }}
            />
          </div>

          {/* Progress Bar */}
          <div className="px-6 pt-4">
            <div className="flex items-center gap-2">
              {steps.map((stepName, idx) => (
                <div key={stepName} className="flex items-center flex-1">
                  <div className="flex-1">
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600"
                        initial={{ width: 0 }}
                        animate={{ width: step > idx ? '100%' : '0%' }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                  {idx < steps.length - 1 && (
                    <ChevronRight className="h-4 w-4 text-slate-600 mx-1" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-220px)]">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {/* Step 1: Details */}
                {step === 1 && (
                  <div className="space-y-6">
                    <Input
                      label="Agent Name"
                      placeholder="e.g., Customer Support Agent"
                      value={formData.name}
                      onValueChange={(value) => setFormData({ ...formData, name: value })}
                      isRequired
                      variant="bordered"
                      classNames={{
                        input: "text-white",
                        inputWrapper: "bg-slate-800 border-slate-700 hover:border-indigo-500"
                      }}
                    />

                    <Textarea
                      label="System Instructions"
                      placeholder="You are a helpful customer support agent. Your goal is to..."
                      value={formData.instructions}
                      onValueChange={(value) => setFormData({ ...formData, instructions: value })}
                      isRequired
                      variant="bordered"
                      minRows={10}
                      description="Define how your agent should behave and respond to users"
                      classNames={{
                        input: "text-white font-mono text-sm",
                        inputWrapper: "bg-slate-800 border-slate-700 hover:border-indigo-500"
                      }}
                    />
                  </div>
                )}

                {/* Step 2: Agent Mode */}
                {step === 2 && (
                  <div className="space-y-4">
                    <div className="text-center mb-6">
                      <h3 className="text-lg font-semibold text-white mb-2">Choose Agent Mode</h3>
                      <p className="text-sm text-slate-400">
                        Select between standard pipeline or OpenAI Realtime API
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div
                        onClick={() => setFormData({ ...formData, agent_mode: 'standard' })}
                        className={`cursor-pointer rounded-lg border-2 p-6 transition-all ${
                          formData.agent_mode === 'standard'
                            ? 'border-indigo-500 bg-indigo-500/10'
                            : 'border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <Settings className="h-8 w-8 text-indigo-400" />
                          <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                            formData.agent_mode === 'standard'
                              ? 'border-indigo-500 bg-indigo-500'
                              : 'border-slate-600'
                          }`}>
                            {formData.agent_mode === 'standard' && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>
                        </div>
                        <h3 className="font-semibold text-white text-lg mb-2">Standard Pipeline</h3>
                        <p className="text-sm text-slate-400">
                          Full control over STT, LLM, and TTS providers. Best for customization.
                        </p>
                        <div className="mt-3 pt-3 border-t border-slate-700">
                          <p className="text-xs text-slate-500">
                            • Choose any STT provider
                            <br />• Choose any TTS provider
                            <br />• Full configuration control
                          </p>
                        </div>
                      </div>

                      <div
                        onClick={() => setFormData({ ...formData, agent_mode: 'realtime' })}
                        className={`cursor-pointer rounded-lg border-2 p-6 transition-all ${
                          formData.agent_mode === 'realtime'
                            ? 'border-indigo-500 bg-indigo-500/10'
                            : 'border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <Zap className="h-8 w-8 text-indigo-400" />
                          <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                            formData.agent_mode === 'realtime'
                              ? 'border-indigo-500 bg-indigo-500'
                              : 'border-slate-600'
                          }`}>
                            {formData.agent_mode === 'realtime' && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>
                        </div>
                        <h3 className="font-semibold text-white text-lg mb-2">Realtime API</h3>
                        <p className="text-sm text-slate-400">
                          OpenAI's Realtime API for ultra-low latency voice conversations.
                        </p>
                        <div className="mt-3 pt-3 border-t border-slate-700">
                          <p className="text-xs text-slate-500">
                            • Lowest latency
                            <br />• Natural interruptions
                            <br />• OpenAI voices only
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: LLM Configuration */}
                {step === 3 && (
                  <div className="space-y-6">
                    <Select
                      label="LLM Provider"
                      placeholder="Select a provider"
                      selectedKeys={[formData.llm_provider || 'openai']}
                      onSelectionChange={(keys) => {
                        const provider = Array.from(keys)[0] as string
                        setFormData({
                          ...formData,
                          llm_provider: provider,
                          llm_model: LLM_MODELS[provider as keyof typeof LLM_MODELS][0].id
                        })
                      }}
                      variant="bordered"
                      classNames={{
                        trigger: "bg-slate-800 border-slate-700 hover:border-indigo-500",
                        value: "text-white"
                      }}
                    >
                      {LLM_PROVIDERS.map(provider => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.name}
                        </SelectItem>
                      ))}
                    </Select>

                    <div>
                      <label className="block text-sm font-medium text-white mb-3">
                        LLM Model
                      </label>
                      <div className="space-y-3">
                        {LLM_MODELS[formData.llm_provider as keyof typeof LLM_MODELS]?.map((model) => (
                          <Card
                            key={model.id}
                            isPressable
                            onPress={() => setFormData({ ...formData, llm_model: model.id })}
                            className={`relative ${
                              formData.llm_model === model.id
                                ? 'border-2 border-indigo-500 bg-indigo-500/10'
                                : 'border-2 border-slate-700 bg-slate-800/50 hover:border-slate-600'
                            }`}
                          >
                            <CardBody className="p-4">
                              {model.recommended && (
                                <Chip
                                  size="sm"
                                  color="primary"
                                  variant="shadow"
                                  className="absolute -top-2 -right-2"
                                >
                                  Recommended
                                </Chip>
                              )}
                              <div className="flex items-start gap-3">
                                <div className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                                  formData.llm_model === model.id
                                    ? 'border-indigo-500 bg-indigo-500'
                                    : 'border-slate-600'
                                }`}>
                                  {formData.llm_model === model.id && (
                                    <Check className="h-3 w-3 text-white" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-semibold text-white">{model.name}</h3>
                                  <p className="text-sm text-slate-400 mt-1">{model.description}</p>
                                </div>
                              </div>
                            </CardBody>
                          </Card>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <label className="block text-sm font-medium text-white">
                          Temperature: {formData.temperature}
                        </label>
                        <Tooltip
                          content="Controls randomness. Lower values make responses more focused and deterministic, higher values make them more creative and varied."
                          className="max-w-xs"
                        >
                          <HelpCircle className="h-4 w-4 text-slate-400 cursor-help" />
                        </Tooltip>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={formData.temperature}
                        onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-slate-400 mt-1">
                        <span>Focused (0.0)</span>
                        <span>Balanced (0.7)</span>
                        <span>Creative (1.0)</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: Voice Configuration */}
                {step === 4 && (
                  <div className="space-y-4">
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
                              <label className="block text-xs font-medium text-slate-400 mb-2">
                                STT Provider
                              </label>
                              <select
                                value={formData.stt_provider}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  stt_provider: e.target.value,
                                  stt_model: STT_MODELS[e.target.value as keyof typeof STT_MODELS][0].id
                                })}
                                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                              >
                                {STT_PROVIDERS.map(provider => (
                                  <option key={provider.id} value={provider.id}>{provider.name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-400 mb-2">
                                STT Model
                              </label>
                              <select
                                value={formData.stt_model}
                                onChange={(e) => setFormData({ ...formData, stt_model: e.target.value })}
                                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                              >
                                {STT_MODELS[formData.stt_provider as keyof typeof STT_MODELS]?.map(model => (
                                  <option key={model.id} value={model.id}>{model.name}</option>
                                ))}
                              </select>
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
                              <label className="block text-xs font-medium text-slate-400 mb-2">
                                TTS Provider
                              </label>
                              <select
                                value={formData.tts_provider}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  tts_provider: e.target.value,
                                  voice: 'alloy'
                                })}
                                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                              >
                                {TTS_PROVIDERS.map(provider => (
                                  <option key={provider.id} value={provider.id}>{provider.name}</option>
                                ))}
                              </select>
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
                                      className={`cursor-pointer rounded-lg border-2 p-3 transition-all ${
                                        formData.voice === voice.id
                                          ? 'border-indigo-500 bg-indigo-500/10'
                                          : 'border-slate-700 hover:border-slate-600'
                                      }`}
                                    >
                                      <h4 className="font-medium text-white text-sm">{voice.name}</h4>
                                      <p className="text-xs text-slate-400 mt-1">{voice.description}</p>
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
                                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Realtime API Voice Selection */}
                        <div className="text-center mb-4">
                          <h3 className="text-lg font-semibold text-white mb-2">Select Realtime Voice</h3>
                          <p className="text-sm text-slate-400">
                            Choose a voice for OpenAI's Realtime API
                          </p>
                        </div>
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
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold text-white">{voice.name}</h3>
                                <span className="text-2xl">🔊</span>
                              </div>
                              <p className="text-xs text-slate-400">{voice.description}</p>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Step 5: Advanced Settings */}
                {step === 5 && (
                  <div className="space-y-4">
                    {/* VAD */}
                    <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-white">Voice Activity Detection (VAD)</h3>
                          <Tooltip
                            content="Detects when speech starts and ends in the audio stream. Helps reduce latency by identifying when users are speaking."
                            className="max-w-xs"
                          >
                            <HelpCircle className="h-4 w-4 text-slate-400 cursor-help" />
                          </Tooltip>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
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
                        <select
                          value={formData.vad_provider}
                          onChange={(e) => setFormData({ ...formData, vad_provider: e.target.value })}
                          className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                        >
                          <option value="silero">Silero VAD</option>
                          <option value="webrtc">WebRTC VAD</option>
                        </select>
                      )}
                    </div>

                    {/* Turn Detection */}
                    <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700">
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="text-sm font-semibold text-white">Turn Detection Model</h3>
                        <Tooltip
                          content="Determines when it's the agent's turn to speak. Multilingual works for all languages, Semantic provides better context awareness, VAD is fastest but less accurate."
                          className="max-w-xs"
                        >
                          <HelpCircle className="h-4 w-4 text-slate-400 cursor-help" />
                        </Tooltip>
                      </div>
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
                            <div className="flex items-start gap-3">
                              <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                                formData.turn_detection_model === model.id
                                  ? 'border-indigo-500 bg-indigo-500'
                                  : 'border-slate-600'
                              }`}>
                                {formData.turn_detection_model === model.id && (
                                  <div className="h-2 w-2 rounded-full bg-white" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium text-white text-sm">{model.name}</h4>
                                  {model.recommended && (
                                    <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs text-indigo-300">
                                      Recommended
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-400 mt-1">{model.description}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Noise Cancellation */}
                    <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-white">Noise Cancellation</h3>
                          <Tooltip
                            content="Reduces background noise in the audio stream. BVC is for standard environments, BVC Telephony is optimized for phone call audio quality."
                            className="max-w-xs"
                          >
                            <HelpCircle className="h-4 w-4 text-slate-400 cursor-help" />
                          </Tooltip>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
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
                        <select
                          value={formData.noise_cancellation_type}
                          onChange={(e) => setFormData({ ...formData, noise_cancellation_type: e.target.value })}
                          className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                        >
                          <option value="BVC">BVC (Standard)</option>
                          <option value="BVCTelephony">BVC Telephony (Phone Calls)</option>
                        </select>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 6: Session Behavior */}
                {step === 6 && (
                  <div className="space-y-4">
                    {/* Preemptive Generation */}
                    <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-white">Preemptive Generation</h3>
                            <Tooltip
                              content="Starts generating the agent's response before the user finishes speaking. Reduces response latency but may waste compute if the user changes their question."
                              className="max-w-xs"
                            >
                              <HelpCircle className="h-4 w-4 text-slate-400 cursor-help" />
                            </Tooltip>
                          </div>
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
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-white">Resume False Interruption</h3>
                            <Tooltip
                              content="Allows the agent to resume speaking if it detects the interruption was false (like background noise instead of user speech). Prevents awkward pauses from non-speech sounds."
                              className="max-w-xs"
                            >
                              <HelpCircle className="h-4 w-4 text-slate-400 cursor-help" />
                            </Tooltip>
                          </div>
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
                            <div className="flex items-center gap-2 mb-2">
                              <label className="block text-xs font-medium text-slate-400">
                                False Interruption Timeout: {formData.false_interruption_timeout}s
                              </label>
                              <Tooltip
                                content="How long to wait before resuming speech after a false interruption. Shorter times make the agent more responsive, longer times reduce false positives."
                                className="max-w-xs"
                              >
                                <HelpCircle className="h-3 w-3 text-slate-400 cursor-help" />
                              </Tooltip>
                            </div>
                            <input
                              type="range"
                              min="0.5"
                              max="3.0"
                              step="0.1"
                              value={formData.false_interruption_timeout}
                              onChange={(e) => setFormData({ ...formData, false_interruption_timeout: parseFloat(e.target.value) })}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <label className="block text-xs font-medium text-slate-400">
                                Minimum Interruption Duration: {formData.min_interruption_duration}s
                              </label>
                              <Tooltip
                                content="Minimum duration of user speech required to trigger an interruption. Higher values prevent brief sounds from interrupting the agent."
                                className="max-w-xs"
                              >
                                <HelpCircle className="h-3 w-3 text-slate-400 cursor-help" />
                              </Tooltip>
                            </div>
                            <input
                              type="range"
                              min="0.1"
                              max="1.0"
                              step="0.1"
                              value={formData.min_interruption_duration}
                              onChange={(e) => setFormData({ ...formData, min_interruption_duration: parseFloat(e.target.value) })}
                              className="w-full"
                            />
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
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-2">
                            Greeting Instructions
                          </label>
                          <textarea
                            value={formData.greeting_message || ''}
                            onChange={(e) => setFormData({ ...formData, greeting_message: e.target.value })}
                            placeholder="Instructions for how the agent should greet users..."
                            rows={3}
                            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 7: Review */}
                {step === 7 && (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700">
                      <h3 className="text-sm font-medium text-slate-400 mb-3">Basic Configuration</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-400 text-sm">Name:</span>
                          <span className="text-white font-medium">{formData.name || '(Not set)'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 text-sm">Mode:</span>
                          <span className="text-white font-medium capitalize">{formData.agent_mode}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 text-sm">LLM:</span>
                          <span className="text-white font-medium">{formData.llm_provider} / {formData.llm_model}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 text-sm">Temperature:</span>
                          <span className="text-white font-medium">{formData.temperature}</span>
                        </div>
                      </div>
                    </div>

                    {formData.agent_mode === 'standard' ? (
                      <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700">
                        <h3 className="text-sm font-medium text-slate-400 mb-3">Voice Pipeline</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-slate-400 text-sm">STT:</span>
                            <span className="text-white font-medium">{formData.stt_provider} / {formData.stt_model}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400 text-sm">TTS:</span>
                            <span className="text-white font-medium">{formData.tts_provider} / {formData.voice}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700">
                        <h3 className="text-sm font-medium text-slate-400 mb-3">Realtime API</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-slate-400 text-sm">Voice:</span>
                            <span className="text-white font-medium capitalize">{formData.realtime_voice}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700">
                      <h3 className="text-sm font-medium text-slate-400 mb-3">Advanced Settings</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-400 text-sm">VAD Enabled:</span>
                          <span className="text-white font-medium">{formData.vad_enabled ? 'Yes' : 'No'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 text-sm">Turn Detection:</span>
                          <span className="text-white font-medium capitalize">{formData.turn_detection_model}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 text-sm">Noise Cancellation:</span>
                          <span className="text-white font-medium">{formData.noise_cancellation_enabled ? formData.noise_cancellation_type : 'Disabled'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 text-sm">Greeting:</span>
                          <span className="text-white font-medium">{formData.greeting_enabled ? 'Enabled' : 'Disabled'}</span>
                        </div>
                      </div>
                    </div>

                    {formData.instructions && (
                      <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700">
                        <h3 className="text-sm font-medium text-slate-400 mb-2">Instructions</h3>
                        <p className="text-sm text-white whitespace-pre-wrap">{formData.instructions}</p>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Error Display */}
          {error && (
            <div className="px-6 py-3 bg-red-500/10 border-t border-red-500/20">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-700 p-6">
            <Button
              onPress={handleBack}
              isDisabled={step === 1}
              variant="flat"
              color="default"
              startContent={<ChevronLeft className="h-4 w-4" />}
            >
              Back
            </Button>
            {step < steps.length ? (
              <Button
                onPress={handleNext}
                color="primary"
                variant="shadow"
                endContent={<ChevronRight className="h-4 w-4" />}
                className="bg-gradient-to-r from-indigo-600 to-indigo-500"
              >
                Next
              </Button>
            ) : (
              <Button
                onPress={handleCreate}
                isDisabled={loading || !formData.name || !formData.instructions}
                isLoading={loading}
                color="success"
                variant="shadow"
                startContent={!loading ? <Check className="h-4 w-4" /> : undefined}
              >
                {loading ? 'Creating...' : 'Create Agent'}
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
