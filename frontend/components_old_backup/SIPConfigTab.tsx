'use client'

import { useState, useEffect } from 'react'
import { Save, Plus, Trash2, Phone } from 'lucide-react'
import { toast } from 'sonner'

interface SIPConfig {
  id: string
  name: string
  sip_url: string
  sip_username?: string
  sip_password?: string
  sip_transport: string
  trunk_id: string
  is_default: boolean
  inbound_enabled: boolean
  outbound_enabled: boolean
}

interface SIPConfigTabProps {
  // Additional props if needed
}

export default function SIPConfigTab({}: SIPConfigTabProps) {
  const [configs, setConfigs] = useState<SIPConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [editingConfig, setEditingConfig] = useState<SIPConfig | null>(null)
  const [isNewConfig, setIsNewConfig] = useState(false)

  useEffect(() => {
    loadConfigurations()
  }, [])

  const loadConfigurations = async () => {
    try {
      setLoading(true)
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'
      const response = await fetch(`${API_URL}/api/user/sip/configs`, {
        credentials: 'include',
      })
      
      if (!response.ok) {
        throw new Error('Failed to load SIP configurations')
      }
      
      const data = await response.json()
      setConfigs(data)
    } catch (error) {
      console.error('Error loading SIP configs:', error)
      toast.error('Error loading configurations', {
        description: error instanceof Error ? error.message : 'An unknown error occurred'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!editingConfig) return
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'
      const url = isNewConfig
        ? `${API_URL}/api/user/sip/configs`
        : `${API_URL}/api/user/sip/configs/${editingConfig.id}`
      
      const method = isNewConfig ? 'POST' : 'PUT'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editingConfig),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `Failed to ${isNewConfig ? 'create' : 'update'} SIP configuration`)
      }
      
      toast.success(isNewConfig ? 'Configuration created' : 'Configuration updated')
      
      loadConfigurations()
      setEditingConfig(null)
      setIsNewConfig(false)
    } catch (error) {
      console.error('Error saving SIP config:', error)
      toast.error('Error saving configuration', {
        description: error instanceof Error ? error.message : 'An unknown error occurred'
      })
    }
  }

  const handleDelete = async (configId: string) => {
    if (!confirm('Are you sure you want to delete this SIP configuration?')) return
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'
      const response = await fetch(`${API_URL}/api/user/sip/configs/${configId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete SIP configuration')
      }
      
      toast.success('Configuration deleted')
      
      loadConfigurations()
    } catch (error) {
      console.error('Error deleting SIP config:', error)
      toast.error('Error deleting configuration', {
        description: error instanceof Error ? error.message : 'An unknown error occurred'
      })
    }
  }

  const handleCreateNew = () => {
    setEditingConfig({
      id: '',
      name: 'New SIP Configuration',
      sip_url: 'voice.epic.dm',
      sip_transport: 'tcp',
      trunk_id: '',
      is_default: configs.length === 0, // First config should be default
      inbound_enabled: true,
      outbound_enabled: true,
    })
    setIsNewConfig(true)
  }

  const renderConfigsList = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">SIP Configurations</h2>
        <button
          onClick={handleCreateNew}
          className="flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Configuration
        </button>
      </div>

      {configs.length === 0 ? (
        <div className="p-8 text-center">
          <Phone className="mx-auto h-12 w-12 text-slate-500 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No SIP configurations found</h3>
          <p className="text-slate-400 mb-6">Add a SIP configuration to enable outbound calling.</p>
          <button
            onClick={handleCreateNew}
            className="rounded-lg bg-indigo-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-600 transition-colors"
          >
            Add Your First Configuration
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {configs.map((config) => (
            <div
              key={config.id}
              className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-white">{config.name}</h3>
                  {config.is_default && (
                    <span className="rounded-full bg-green-500/20 border border-green-500/50 px-2 py-0.5 text-xs text-green-400">
                      Default
                    </span>
                  )}
                </div>
                <div className="text-sm text-slate-400 mt-1 space-y-1">
                  <div>SIP Server: {config.sip_url} ({config.sip_transport})</div>
                  <div>Trunk ID: {config.trunk_id || 'None'}</div>
                  <div className="flex items-center gap-4 text-xs mt-2">
                    <span className={`${config.inbound_enabled ? 'text-green-400' : 'text-slate-500'}`}>
                      Inbound: {config.inbound_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                    <span className={`${config.outbound_enabled ? 'text-green-400' : 'text-slate-500'}`}>
                      Outbound: {config.outbound_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingConfig({...config})}
                  className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-2 text-indigo-400 hover:bg-indigo-500/20 transition-colors"
                >
                  <Save className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(config.id)}
                  className="rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderEditForm = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">
          {isNewConfig ? 'Add SIP Configuration' : 'Edit SIP Configuration'}
        </h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Configuration Name
          </label>
          <input
            type="text"
            value={editingConfig?.name || ''}
            onChange={(e) => setEditingConfig({...editingConfig!, name: e.target.value})}
            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2.5 text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            placeholder="My SIP Configuration"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            SIP Server URL
          </label>
          <input
            type="text"
            value={editingConfig?.sip_url || ''}
            onChange={(e) => setEditingConfig({...editingConfig!, sip_url: e.target.value})}
            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2.5 text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            placeholder="voice.example.com"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              SIP Username (Optional)
            </label>
            <input
              type="text"
              value={editingConfig?.sip_username || ''}
              onChange={(e) => setEditingConfig({...editingConfig!, sip_username: e.target.value})}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2.5 text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              SIP Password (Optional)
            </label>
            <input
              type="password"
              value={editingConfig?.sip_password || ''}
              onChange={(e) => setEditingConfig({...editingConfig!, sip_password: e.target.value})}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2.5 text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="••••••••"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              SIP Transport
            </label>
            <select
              value={editingConfig?.sip_transport || 'tcp'}
              onChange={(e) => setEditingConfig({...editingConfig!, sip_transport: e.target.value})}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2.5 text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="tcp">TCP</option>
              <option value="udp">UDP</option>
              <option value="tls">TLS</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              LiveKit SIP Trunk ID
            </label>
            <input
              type="text"
              value={editingConfig?.trunk_id || ''}
              onChange={(e) => setEditingConfig({...editingConfig!, trunk_id: e.target.value})}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2.5 text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="ST_xxxxxxx"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_default"
              checked={editingConfig?.is_default || false}
              onChange={(e) => setEditingConfig({...editingConfig!, is_default: e.target.checked})}
              className="h-4 w-4 rounded border-slate-600 text-indigo-600 focus:ring-indigo-500/20"
            />
            <label htmlFor="is_default" className="ml-2 text-sm text-white">
              Default Configuration
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="inbound_enabled"
              checked={editingConfig?.inbound_enabled || false}
              onChange={(e) => setEditingConfig({...editingConfig!, inbound_enabled: e.target.checked})}
              className="h-4 w-4 rounded border-slate-600 text-indigo-600 focus:ring-indigo-500/20"
            />
            <label htmlFor="inbound_enabled" className="ml-2 text-sm text-white">
              Inbound Enabled
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="outbound_enabled"
              checked={editingConfig?.outbound_enabled || false}
              onChange={(e) => setEditingConfig({...editingConfig!, outbound_enabled: e.target.checked})}
              className="h-4 w-4 rounded border-slate-600 text-indigo-600 focus:ring-indigo-500/20"
            />
            <label htmlFor="outbound_enabled" className="ml-2 text-sm text-white">
              Outbound Enabled
            </label>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-700">
          <button
            onClick={() => {
              setEditingConfig(null)
              setIsNewConfig(false)
            }}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/50 transition-all hover:shadow-indigo-500/75 hover:scale-105"
          >
            <Save className="h-4 w-4" />
            {isNewConfig ? 'Create Configuration' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="card">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      ) : editingConfig ? (
        renderEditForm()
      ) : (
        renderConfigsList()
      )}

      <div className="p-4 mt-6 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <div className="flex items-start gap-3">
          <Phone className="h-5 w-5 text-blue-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-white">How SIP Configuration Works</p>
            <p className="text-sm text-slate-400 mt-1">
              SIP configurations allow you to make and receive calls using your own SIP provider. Configure multiple
              providers and set a default for all outbound calls. You can also assign specific configurations to 
              individual phone numbers.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
