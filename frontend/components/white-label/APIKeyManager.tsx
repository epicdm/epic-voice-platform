"use client";

import { useState, useEffect } from 'react';
import { Button, Input, Card, CardBody, Spinner, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { Key, Plus, Copy, Trash2, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { api } from '@/lib/api-client';
import { toast } from 'sonner';

interface APIKey {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked: boolean;
}

interface NewKeyResponse {
  id: string;
  key: string;
  prefix: string;
  message: string;
}

export default function APIKeyManager() {
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<NewKeyResponse | null>(null);
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [keyVisible, setKeyVisible] = useState(false);
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);

  useEffect(() => {
    loadAPIKeys();
  }, []);

  const loadAPIKeys = async () => {
    try {
      const response = await api.get('/api/user/white-label/api-keys');
      setKeys(response.keys || []);
    } catch (error) {
      console.error('Failed to load API keys:', error);
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a name for the API key');
      return;
    }

    setCreating(true);
    try {
      const response = await api.post('/api/user/white-label/api-keys', {
        name: newKeyName.trim()
      });

      setNewlyCreatedKey(response);
      setShowCreateModal(false);
      setShowNewKeyModal(true);
      setNewKeyName('');
      await loadAPIKeys();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeKey = async (keyId: string, keyName: string) => {
    if (!confirm(`Revoke API key "${keyName}"? This action cannot be undone.`)) return;

    setRevokingKeyId(keyId);
    try {
      await api.delete(`/api/user/white-label/api-keys/${keyId}`);
      toast.success('API key revoked');
      await loadAPIKeys();
    } catch (error: any) {
      toast.error(error.message || 'Failed to revoke API key');
    } finally {
      setRevokingKeyId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const closeNewKeyModal = () => {
    setShowNewKeyModal(false);
    setNewlyCreatedKey(null);
    setKeyVisible(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-2">API Key Management</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Create and manage API keys for programmatic access to your voice AI platform
          </p>
        </div>
        <Button
          color="primary"
          onClick={() => setShowCreateModal(true)}
          startContent={<Plus size={18} />}
        >
          Create API Key
        </Button>
      </div>

      {/* Security Notice */}
      <Card className="bg-warning-50 dark:bg-warning-950 border-warning-200 dark:border-warning-800">
        <CardBody>
          <div className="flex gap-3">
            <AlertTriangle size={20} className="text-warning-600 dark:text-warning-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-warning-800 dark:text-warning-200">
              <p className="font-semibold mb-1">Security Best Practices</p>
              <ul className="space-y-1">
                <li>• API keys are only shown once during creation - save them securely</li>
                <li>• Never commit API keys to version control or share them publicly</li>
                <li>• Use separate keys for development, staging, and production</li>
                <li>• Revoke and rotate keys regularly or if compromised</li>
                <li>• Monitor "Last Used" timestamps to detect unauthorized access</li>
              </ul>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* API Keys List */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Your API Keys</h3>
        {keys.length === 0 ? (
          <Card>
            <CardBody>
              <div className="text-center py-8">
                <Key size={48} className="mx-auto text-gray-400 mb-3" />
                <p className="text-gray-500 mb-4">No API keys created yet</p>
                <Button
                  color="primary"
                  variant="flat"
                  onClick={() => setShowCreateModal(true)}
                  startContent={<Plus size={18} />}
                >
                  Create Your First API Key
                </Button>
              </div>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-3">
            {keys.map((key) => (
              <Card key={key.id} className={key.revoked ? 'opacity-60' : ''}>
                <CardBody>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Key size={18} className="text-gray-400" />
                        <div>
                          <div className="font-semibold flex items-center gap-2">
                            {key.name}
                            {key.revoked && (
                              <span className="text-xs px-2 py-0.5 bg-danger-100 dark:bg-danger-900 text-danger-700 dark:text-danger-300 rounded">
                                Revoked
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Created {new Date(key.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-3">
                        <code className="flex-1 bg-gray-100 dark:bg-gray-900 px-3 py-2 rounded font-mono text-sm">
                          {key.prefix}
                        </code>
                        <Button
                          size="sm"
                          variant="flat"
                          isIconOnly
                          onClick={() => copyToClipboard(key.prefix)}
                        >
                          <Copy size={14} />
                        </Button>
                      </div>

                      {key.last_used_at && (
                        <p className="text-xs text-gray-500 mt-2">
                          Last used: {new Date(key.last_used_at).toLocaleString()}
                        </p>
                      )}
                      {!key.last_used_at && !key.revoked && (
                        <p className="text-xs text-gray-500 mt-2">
                          Never used
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {!key.revoked && (
                        <Button
                          size="sm"
                          color="danger"
                          variant="flat"
                          onClick={() => handleRevokeKey(key.id, key.name)}
                          isLoading={revokingKeyId === key.id}
                          startContent={<Trash2 size={14} />}
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* API Usage Guide */}
      <Card className="bg-gray-50 dark:bg-gray-900">
        <CardBody>
          <h4 className="font-semibold mb-3">🔧 Using API Keys</h4>

          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <div>
              <strong className="text-gray-900 dark:text-gray-100">Authentication</strong>
              <p className="mt-1">Include your API key in the Authorization header:</p>
              <pre className="mt-2 bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
                <code className="text-xs font-mono">Authorization: Bearer YOUR_API_KEY</code>
              </pre>
            </div>

            <div>
              <strong className="text-gray-900 dark:text-gray-100">Example cURL Request</strong>
              <pre className="mt-2 bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
                <code className="text-xs font-mono">{`curl -X POST https://ai.epic.dm/api/v1/calls \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"phone": "+1234567890", "agent_id": "agent_123"}'`}</code>
              </pre>
            </div>

            <div>
              <strong className="text-gray-900 dark:text-gray-100">JavaScript Example</strong>
              <pre className="mt-2 bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
                <code className="text-xs font-mono">{`const response = await fetch('https://ai.epic.dm/api/v1/calls', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    phone: '+1234567890',
    agent_id: 'agent_123'
  })
});`}</code>
              </pre>
            </div>

            <div>
              <strong className="text-gray-900 dark:text-gray-100">Rate Limits</strong>
              <ul className="mt-1 space-y-1">
                <li>• Standard: 100 requests/minute per API key</li>
                <li>• Enterprise: 1,000 requests/minute per API key</li>
                <li>• Exceeded limits return HTTP 429 (Too Many Requests)</li>
              </ul>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Create API Key Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        size="md"
      >
        <ModalContent>
          <ModalHeader>Create New API Key</ModalHeader>
          <ModalBody>
            <Input
              label="Key Name"
              placeholder="Production API Key"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              description="Give your API key a descriptive name (e.g., 'Production', 'Development', 'Mobile App')"
              autoFocus
            />

            <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-900 rounded-lg text-sm">
              <p className="font-semibold mb-2">⚠️ Important</p>
              <p className="text-gray-600 dark:text-gray-400">
                The API key will only be shown once. Make sure to copy and save it securely.
              </p>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="flat"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button
              color="primary"
              onClick={handleCreateKey}
              isLoading={creating}
              isDisabled={!newKeyName.trim()}
            >
              Create API Key
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* New Key Created Modal */}
      <Modal
        isOpen={showNewKeyModal}
        onClose={closeNewKeyModal}
        size="lg"
        isDismissable={false}
      >
        <ModalContent>
          <ModalHeader className="flex items-center gap-2">
            <Key size={20} />
            API Key Created Successfully
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div className="p-4 bg-success-50 dark:bg-success-950 border border-success-200 dark:border-success-800 rounded-lg">
                <p className="text-sm text-success-800 dark:text-success-200 font-semibold mb-2">
                  ✅ {newlyCreatedKey?.message}
                </p>
                <p className="text-xs text-success-700 dark:text-success-300">
                  Copy this key now - it will not be shown again!
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Your API Key</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-100 dark:bg-gray-900 px-3 py-3 rounded font-mono text-sm break-all">
                    {keyVisible ? newlyCreatedKey?.key : '•'.repeat(50)}
                  </code>
                  <Button
                    size="sm"
                    variant="flat"
                    isIconOnly
                    onClick={() => setKeyVisible(!keyVisible)}
                  >
                    {keyVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                  <Button
                    size="sm"
                    color="primary"
                    variant="flat"
                    isIconOnly
                    onClick={() => copyToClipboard(newlyCreatedKey?.key || '')}
                  >
                    <Copy size={16} />
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-warning-50 dark:bg-warning-950 border border-warning-200 dark:border-warning-800 rounded-lg">
                <p className="text-sm text-warning-800 dark:text-warning-200">
                  <strong>⚠️ Security Notice:</strong> Store this API key securely. Never commit it to version control or share it publicly.
                </p>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              color="primary"
              onClick={closeNewKeyModal}
            >
              I've Saved My API Key
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
