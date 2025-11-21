'use client'

import { useState } from 'react'
import { Card, CardBody, Button, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Chip, Code } from '@heroui/react'
import { Key, Plus, Copy, Trash2, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

interface ApiKeyType {
  id: string
  name: string
  prefix: string
  createdAt: Date
  lastUsed: Date | null
  expiresAt: Date | null
}

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKeyType[]>([
    {
      id: '1',
      name: 'Production API Key',
      prefix: 'sk_live_abc1234',
      createdAt: new Date('2025-10-01'),
      lastUsed: new Date('2025-10-20'),
      expiresAt: null,
    },
  ])

  const [showNewKeyModal, setShowNewKeyModal] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)

  const handleCreateKey = () => {
    // Generate mock API key
    const key = `sk_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
    const prefix = key.substring(0, 15)
    
    setGeneratedKey(key)
    
    const newKey: ApiKeyType = {
      id: Date.now().toString(),
      name: newKeyName,
      prefix,
      createdAt: new Date(),
      lastUsed: null,
      expiresAt: null,
    }
    
    setApiKeys([...apiKeys, newKey])
    setNewKeyName('')
    
    toast.success('API key created!', {
      description: 'Make sure to copy it now. You won\'t be able to see it again.'
    })
  }

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    toast.success('Copied to clipboard!')
  }

  const handleDeleteKey = (id: string) => {
    setApiKeys(apiKeys.filter(k => k.id !== id))
    toast.success('API key deleted')
  }

  const closeModal = () => {
    setShowNewKeyModal(false)
    setGeneratedKey(null)
    setNewKeyName('')
    setShowKey(false)
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            API Keys
          </h1>
          <p className="text-muted-foreground">
            Manage your API keys for programmatic access to Epic.ai
          </p>
        </div>
        <Button 
          color="primary"
          startContent={<Plus className="h-5 w-5" />}
          onPress={() => setShowNewKeyModal(true)}
        >
          Create API Key
        </Button>
      </div>

      {/* Warning Banner */}
      <Card className="border border-warning bg-warning/5 mb-8">
        <CardBody className="p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-foreground mb-1">
                Keep your API keys secure
              </h3>
              <p className="text-sm text-muted-foreground">
                API keys provide full access to your account. Never share them publicly or commit them to version control.
                Use environment variables to store keys securely.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* API Keys List */}
      {apiKeys.length === 0 ? (
        <Card className="border border-border">
          <CardBody className="p-12 text-center">
            <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No API keys yet
            </h3>
            <p className="text-muted-foreground mb-6">
              Create your first API key to start using the Epic.ai API
            </p>
            <Button 
              color="primary"
              onPress={() => setShowNewKeyModal(true)}
            >
              Create API Key
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((key) => (
            <Card key={key.id} className="border border-border">
              <CardBody className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-foreground">
                        {key.name}
                      </h3>
                      <Chip size="sm" variant="flat" color="success">
                        Active
                      </Chip>
                    </div>
                    
                    <Code className="text-sm mb-3">{key.prefix}...</Code>
                    
                    <div className="flex gap-6 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Created:</span> {key.createdAt.toLocaleDateString()}
                      </div>
                      <div>
                        <span className="font-medium">Last used:</span>{' '}
                        {key.lastUsed ? key.lastUsed.toLocaleDateString() : 'Never'}
                      </div>
                      {key.expiresAt && (
                        <div>
                          <span className="font-medium">Expires:</span> {key.expiresAt.toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    color="danger"
                    variant="light"
                    size="sm"
                    startContent={<Trash2 className="h-4 w-4" />}
                    onPress={() => handleDeleteKey(key.id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Create API Key Modal */}
      <Modal isOpen={showNewKeyModal} onClose={closeModal} size="lg">
        <ModalContent>
          <ModalHeader>
            {generatedKey ? 'API Key Created' : 'Create New API Key'}
          </ModalHeader>
          <ModalBody>
            {!generatedKey ? (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Give your API key a descriptive name to help you remember where it's used.
                </p>
                <Input
                  label="Key Name"
                  placeholder="e.g., Production Server, Mobile App"
                  value={newKeyName}
                  onValueChange={setNewKeyName}
                  autoFocus
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-success/10 border border-success rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground mb-1">
                        Save your API key
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Make sure to copy your API key now. You won't be able to see it again!
                      </p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Your API Key
                  </label>
                  <div className="flex gap-2">
                    <Code className="flex-1 p-3">
                      {showKey ? generatedKey : generatedKey.replace(/./g, '•')}
                    </Code>
                    <Button
                      isIconOnly
                      variant="bordered"
                      onPress={() => setShowKey(!showKey)}
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      isIconOnly
                      color="primary"
                      onPress={() => handleCopyKey(generatedKey)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="p-4 bg-warning/10 border border-warning rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      Store this key securely in your application's environment variables.
                      Never commit it to version control or share it publicly.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            {!generatedKey ? (
              <>
                <Button variant="light" onPress={closeModal}>
                  Cancel
                </Button>
                <Button 
                  color="primary" 
                  onPress={handleCreateKey}
                  isDisabled={!newKeyName.trim()}
                >
                  Create Key
                </Button>
              </>
            ) : (
              <Button color="primary" onPress={closeModal}>
                Done
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
