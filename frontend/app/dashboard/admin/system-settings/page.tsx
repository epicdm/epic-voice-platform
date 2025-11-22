'use client'

import { useEffect, useState } from 'react'
import { Card, CardBody, CardHeader, Button, Input, Tabs, Tab, Chip, Spinner } from '@heroui/react'
import { Settings, Save, TestTube, CheckCircle, XCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'

interface SystemSetting {
  id: string
  category: string
  key: string
  value: string
  description: string
  is_secret: boolean
  is_required: boolean
  data_type: string
  allowed_values: string[] | null
}

interface SettingUpdate {
  id: string
  key: string
  value: string
  originalValue: string
}

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<SystemSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('sip')
  const [changes, setChanges] = useState<Map<string, SettingUpdate>>(new Map())
  const [showSecrets, setShowSecrets] = useState<Set<string>>(new Set())
  const [testing, setTesting] = useState<string | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/settings', {
        headers: {
          'X-Admin-Auth': 'true'
        }
      })
      const data = await response.json()
      if (data.success) {
        setSettings(data.data)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (setting: SystemSetting, newValue: string) => {
    const newChanges = new Map(changes)
    newChanges.set(setting.id, {
      id: setting.id,
      key: setting.key,
      value: newValue,
      originalValue: setting.value
    })
    setChanges(newChanges)
  }

  const handleSave = async () => {
    if (changes.size === 0) {
      toast.info('No changes to save')
      return
    }

    try {
      setSaving(true)
      const updates = Array.from(changes.values())

      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Auth': 'true'
        },
        body: JSON.stringify({ action: 'bulk-update', updates })
      })

      const data = await response.json()
      if (data.success) {
        toast.success(`Updated ${data.updated} setting(s)`)
        setChanges(new Map())
        await loadSettings()

        // If SIP settings changed, show additional info
        const sipChanged = updates.some(u => u.key.includes('sip'))
        if (sipChanged) {
          toast.info('SIP settings updated. Changes will take effect for new calls.')
        }
      } else {
        toast.error('Failed to save settings')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleDiscard = () => {
    setChanges(new Map())
    toast.info('Changes discarded')
  }

  const handleTestConnection = async (category: string) => {
    try {
      setTesting(category)

      // Gather settings for this category
      const categorySettings: Record<string, string> = {}
      settings
        .filter(s => s.category === category)
        .forEach(s => {
          const change = changes.get(s.id)
          categorySettings[s.key] = change ? change.value : s.value
        })

      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Auth': 'true'
        },
        body: JSON.stringify({
          action: 'test-connection',
          service: category,
          settings: categorySettings
        })
      })

      const data = await response.json()
      if (data.success && data.result.status === 'success') {
        toast.success(data.result.message)
      } else {
        toast.error(data.result?.message || 'Connection test failed')
      }
    } catch (error) {
      console.error('Failed to test connection:', error)
      toast.error('Failed to test connection')
    } finally {
      setTesting(null)
    }
  }

  const toggleSecretVisibility = (settingId: string) => {
    const newShowSecrets = new Set(showSecrets)
    if (newShowSecrets.has(settingId)) {
      newShowSecrets.delete(settingId)
    } else {
      newShowSecrets.add(settingId)
    }
    setShowSecrets(newShowSecrets)
  }

  const getCategorySettings = (category: string) => {
    return settings.filter(s => s.category === category)
  }

  const hasChanges = changes.size > 0

  const categories = [
    { key: 'sip', label: 'SIP Trunk', icon: '📞' },
    { key: 'email', label: 'Email', icon: '📧' },
    { key: 'sms', label: 'SMS', icon: '💬' },
    { key: 'livekit', label: 'LiveKit', icon: '🎙️' },
    { key: 'system', label: 'System', icon: '⚙️' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Settings className="h-8 w-8" />
            System Settings
          </h1>
          <p className="text-foreground-500 mt-1">
            Manage system-wide configuration for SIP trunks, email, SMS, and more
          </p>
        </div>

        {hasChanges && (
          <div className="flex gap-2">
            <Button
              variant="light"
              onPress={handleDiscard}
              isDisabled={saving}
            >
              Discard Changes
            </Button>
            <Button
              color="primary"
              startContent={<Save className="h-4 w-4" />}
              onPress={handleSave}
              isLoading={saving}
            >
              Save {changes.size} Change{changes.size !== 1 ? 's' : ''}
            </Button>
          </div>
        )}
      </div>

      {/* Warning Banner */}
      <Card className="mb-6 border-2 border-warning-200">
        <CardBody className="flex flex-row items-start gap-3">
          <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold mb-1">Admin Access Only</h3>
            <p className="text-sm text-foreground-500">
              These settings affect the entire system. Changes to SIP, email, or SMS settings
              will impact all users and agents. Test connections before saving critical changes.
            </p>
          </div>
        </CardBody>
      </Card>

      {/* Settings Tabs */}
      <Tabs
        selectedKey={selectedCategory}
        onSelectionChange={(key) => setSelectedCategory(key as string)}
        variant="bordered"
        className="mb-6"
      >
        {categories.map(cat => (
          <Tab
            key={cat.key}
            title={
              <div className="flex items-center gap-2">
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                {changes.has(cat.key) && (
                  <Chip size="sm" color="warning" variant="flat">Modified</Chip>
                )}
              </div>
            }
          />
        ))}
      </Tabs>

      {/* Settings Cards */}
      <div className="space-y-4">
        {getCategorySettings(selectedCategory).map(setting => {
          const currentChange = changes.get(setting.id)
          const currentValue = currentChange ? currentChange.value : setting.value
          const isChanged = currentChange !== undefined
          const showSecret = showSecrets.has(setting.id)

          return (
            <Card key={setting.id} className={isChanged ? 'border-2 border-warning' : ''}>
              <CardBody className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{setting.key.replace(/_/g, ' ').toUpperCase()}</h3>
                      {setting.is_required && (
                        <Chip size="sm" color="danger" variant="flat">Required</Chip>
                      )}
                      {isChanged && (
                        <Chip size="sm" color="warning" variant="flat">Modified</Chip>
                      )}
                    </div>
                    <p className="text-sm text-foreground-500 mb-4">{setting.description}</p>

                    {setting.allowed_values ? (
                      <select
                        className="w-full px-3 py-2 rounded-lg border border-default-200 bg-default-100"
                        value={currentValue}
                        onChange={(e) => handleChange(setting, e.target.value)}
                      >
                        {setting.allowed_values.map(val => (
                          <option key={val} value={val}>{val}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          type={setting.is_secret && !showSecret ? 'password' : 'text'}
                          value={currentValue}
                          onChange={(e) => handleChange(setting, e.target.value)}
                          placeholder={`Enter ${setting.key}`}
                          className="flex-1"
                        />
                        {setting.is_secret && (
                          <Button
                            isIconOnly
                            variant="light"
                            onPress={() => toggleSecretVisibility(setting.id)}
                          >
                            {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        )}
                      </div>
                    )}

                    {isChanged && (
                      <p className="text-xs text-foreground-400 mt-2">
                        Previous value: {setting.is_secret ? '***' : setting.value || '(empty)'}
                      </p>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          )
        })}

        {/* Test Connection Button */}
        {['sip', 'email', 'sms'].includes(selectedCategory) && (
          <Button
            color="secondary"
            variant="bordered"
            startContent={<TestTube className="h-4 w-4" />}
            onPress={() => handleTestConnection(selectedCategory)}
            isLoading={testing === selectedCategory}
            className="w-full"
          >
            Test {selectedCategory.toUpperCase()} Connection
          </Button>
        )}
      </div>

      {/* Current Values Summary for SIP */}
      {selectedCategory === 'sip' && (
        <Card className="mt-6 bg-primary-50 dark:bg-primary-950">
          <CardHeader>
            <h3 className="font-semibold">Current SIP Configuration</h3>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-foreground-500">Primary SIP Domain:</span>
                <p className="font-mono font-semibold">
                  {changes.get(settings.find(s => s.key === 'sip_domain')?.id || '')?.value ||
                   settings.find(s => s.key === 'sip_domain')?.value}
                </p>
              </div>
              <div>
                <span className="text-foreground-500">SIP Transport:</span>
                <p className="font-mono font-semibold">
                  {changes.get(settings.find(s => s.key === 'sip_transport')?.id || '')?.value ||
                   settings.find(s => s.key === 'sip_transport')?.value}
                </p>
              </div>
              <div>
                <span className="text-foreground-500">LiveKit SIP Domain:</span>
                <p className="font-mono font-semibold">
                  {settings.find(s => s.key === 'livekit_sip_domain')?.value}
                </p>
              </div>
              <div>
                <span className="text-foreground-500">Outbound Trunk ID:</span>
                <p className="font-mono font-semibold text-xs">
                  {settings.find(s => s.key === 'sip_outbound_trunk_id')?.value}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
