'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, X, Loader2, CheckCircle, AlertCircle, Copy } from 'lucide-react'

interface SIPConfig {
  id: string
  name: string
  trunk_id: string
  is_default: boolean
}

interface OutboundCallTesterProps {
  agentId: string
  agentName: string
  isOpen: boolean
  onClose: () => void
  agentStatus?: string
}

export default function OutboundCallTester({
  agentId,
  agentName,
  isOpen,
  onClose,
  agentStatus = 'created',
}: OutboundCallTesterProps) {
  const [toNumber, setToNumber] = useState('')
  const [fromNumber, setFromNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [sipConfigs, setSipConfigs] = useState<SIPConfig[]>([])
  const [selectedSipConfigId, setSelectedSipConfigId] = useState<string>('')
  const [loadingSipConfigs, setLoadingSipConfigs] = useState(false)
  
  // Load SIP configurations when component mounts
  useEffect(() => {
    if (isOpen) {
      loadSipConfigurations()
    }
  }, [isOpen])
  
  // Function to load SIP configurations from the API
  const loadSipConfigurations = async () => {
    try {
      setLoadingSipConfigs(true)
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'
      const response = await fetch(`${API_URL}/api/user/sip/configs`, {
        credentials: 'include',
      })
      
      if (!response.ok) {
        throw new Error('Failed to load SIP configurations')
      }
      
      const data = await response.json()
      setSipConfigs(data)
      
      // Set default SIP config if available
      const defaultConfig = data.find((config: SIPConfig) => config.is_default)
      if (defaultConfig) {
        setSelectedSipConfigId(defaultConfig.id)
      } else if (data.length > 0) {
        setSelectedSipConfigId(data[0].id)
      }
    } catch (err) {
      console.error('Error loading SIP configs:', err)
    } finally {
      setLoadingSipConfigs(false)
    }
  }

  const handleCall = async () => {
    if (!toNumber) {
      setError('Phone number is required')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'
      const response = await fetch(`${API_URL}/api/sip/outbound-call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          agent_id: agentId,
          to_number: toNumber,
          from_number: fromNumber || undefined,
          sip_config_id: selectedSipConfigId || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate call')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message || 'Failed to initiate call')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
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
          className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-700 p-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Test Outbound Call</h2>
              <p className="text-sm text-slate-400 mt-1">Agent: {agentName}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Input Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  To Phone Number *
                </label>
                <input
                  type="tel"
                  value={toNumber}
                  onChange={(e) => setToNumber(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Format: +15551234567 (include country code)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  From Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  value={fromNumber}
                  onChange={(e) => setFromNumber(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Caller ID that will appear to the recipient
                </p>
              </div>
              
              {sipConfigs.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    SIP Configuration
                  </label>
                  <select
                    value={selectedSipConfigId}
                    onChange={(e) => setSelectedSipConfigId(e.target.value)}
                    className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {sipConfigs.map(config => (
                      <option key={config.id} value={config.id}>
                        {config.name}{config.is_default ? ' (Default)' : ''} - Trunk: {config.trunk_id || 'None'}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    Select the SIP configuration to use for this call
                  </p>
                </div>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              </div>
            )}

            {/* Success Result */}
            {result && (
              <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4">
                <div className="flex items-start gap-2 mb-4">
                  <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-green-400 mb-2">{result.message}</h4>

                    <div className="space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-slate-400 mb-1">To Number</p>
                          <p className="text-white font-medium">{result.to_number}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 mb-1">From Number</p>
                          <p className="text-white font-medium">{result.from_number}</p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-green-500/20">
                        <p className="text-xs text-slate-400 mb-2">Room Name</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs bg-slate-900/50 rounded px-2 py-1 text-slate-300">
                            {result.room_name}
                          </code>
                          <button
                            onClick={() => copyToClipboard(result.room_name)}
                            className="p-1 hover:bg-green-500/20 rounded transition-colors"
                          >
                            <Copy className="h-4 w-4 text-green-400" />
                          </button>
                        </div>
                      </div>

                      {result.instructions && (
                        <div className="pt-3 border-t border-green-500/20">
                          <p className="text-xs text-slate-400 mb-2">Next Steps</p>
                          <pre className="text-xs bg-slate-900/50 rounded p-3 text-slate-300 overflow-x-auto whitespace-pre-wrap">
                            {result.instructions}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Agent Deployment Warning */}
            {agentStatus !== 'deployed' && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
                  <div className="text-sm text-slate-300">
                    <p className="font-semibold text-red-400 mb-2">⚠️ Agent Not Deployed!</p>
                    <p className="text-xs mb-2">
                      This agent is currently <strong>not deployed</strong> to LiveKit Cloud.
                      Calls will be initiated but the agent won't be able to join or respond.
                    </p>
                    <p className="text-xs text-slate-400">
                      <strong>Action required:</strong> Deploy the agent first from the Agents page,
                      then try making calls.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Info Box */}
            <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-indigo-400 mt-0.5" />
                <div className="text-sm text-slate-300">
                  <p className="font-semibold text-white mb-2">How Outbound Calling Works:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>LiveKit creates a room and SIP participant</li>
                    <li>SIP INVITE is sent to your VoIP server (voice.epic.dm)</li>
                    <li>Your agent {agentStatus === 'deployed' ? '(deployed ✓)' : '(needs deployment ⚠️)'} joins when answered</li>
                    <li>The AI agent starts the conversation</li>
                  </ol>
                  <p className="mt-2 text-xs text-slate-400">
                    Trunk: ST_sTo8gGpNbXzY → voice.epic.dm:5060 (TCP)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-700 p-6">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleCall}
              disabled={loading || !toNumber}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/50 transition-all hover:shadow-indigo-500/75 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Initiating Call...
                </>
              ) : (
                <>
                  <Phone className="h-4 w-4" />
                  Initiate Call
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
