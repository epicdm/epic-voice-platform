"use client";

import { useState, useEffect } from 'react';
import { Button, Input, Card, CardBody, Spinner } from "@heroui/react";
import { Globe, Check, X, Copy } from "lucide-react";
import { api } from '@/lib/api-client';
import { toast } from 'sonner';

interface Domain {
  id: string;
  domain: string;
  verified: boolean;
  created_at: string;
  verified_at: string | null;
}

interface DNSRecord {
  type: string;
  name: string;
  value: string;
  ttl: number;
}

export default function CustomDomainSettings() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [dnsRecords, setDnsRecords] = useState<DNSRecord[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [currentDomainId, setCurrentDomainId] = useState<string | null>(null);

  useEffect(() => {
    loadDomains();
  }, []);

  const loadDomains = async () => {
    try {
      const response = await api.get('/api/user/white-label/domain');
      setDomains(response.domains || []);
    } catch (error) {
      console.error('Failed to load domains:', error);
      toast.error('Failed to load domains');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDomain = async () => {
    if (!newDomain.trim()) {
      toast.error('Please enter a domain name');
      return;
    }

    setSaving(true);
    try {
      const response = await api.post('/api/user/white-label/domain', {
        domain: newDomain.trim()
      });

      setDnsRecords(response.dns_records);
      setCurrentDomainId(response.id);
      setNewDomain('');
      await loadDomains();
      toast.success('Domain added! Configure DNS records to verify.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add domain');
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyDomain = async (domainId: string) => {
    setVerifying(domainId);
    try {
      const response = await api.post(`/api/user/white-label/domain/${domainId}/verify`);

      if (response.verified) {
        toast.success('Domain verified successfully!');
        await loadDomains();
        setDnsRecords(null);
        setCurrentDomainId(null);
      } else {
        toast.error(response.error || 'Domain verification failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Verification failed');
    } finally {
      setVerifying(null);
    }
  };

  const handleDeleteDomain = async (domainId: string) => {
    if (!confirm('Are you sure you want to remove this domain?')) return;

    try {
      await api.delete(`/api/user/white-label/domain?id=${domainId}`);
      toast.success('Domain removed');
      await loadDomains();
      if (currentDomainId === domainId) {
        setDnsRecords(null);
        setCurrentDomainId(null);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove domain');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
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
      <div>
        <h2 className="text-2xl font-semibold mb-2">Custom Domain Setup</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Use your own domain (e.g., voice.yourcompany.com) instead of ai.epic.dm
        </p>
      </div>

      {/* Add New Domain */}
      <Card>
        <CardBody>
          <h3 className="text-lg font-semibold mb-4">Add Custom Domain</h3>
          <div className="flex gap-3">
            <Input
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="voice.yourcompany.com"
              className="flex-1"
              startContent={<Globe size={18} className="text-gray-400" />}
            />
            <Button
              color="primary"
              onClick={handleAddDomain}
              isLoading={saving}
              isDisabled={!newDomain.trim()}
            >
              Add Domain
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* DNS Configuration Instructions */}
      {dnsRecords && (
        <Card className="border-primary-200 bg-primary-50 dark:bg-primary-950">
          <CardBody>
            <h3 className="text-lg font-semibold mb-4">📝 DNS Configuration Required</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Add these DNS records to your domain's DNS settings (usually through your domain registrar):
            </p>

            {dnsRecords.map((record, index) => (
              <div key={index} className="mb-4 p-4 bg-white dark:bg-gray-900 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-semibold text-primary">{record.type} Record</div>
                  <Button
                    size="sm"
                    variant="flat"
                    onClick={() => copyToClipboard(record.value)}
                    startContent={<Copy size={14} />}
                  >
                    Copy Value
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                  <div>
                    <span className="text-gray-500">Name:</span> {record.name}
                  </div>
                  <div>
                    <span className="text-gray-500">TTL:</span> {record.ttl}
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Value:</span> {record.value}
                  </div>
                </div>
              </div>
            ))}

            {currentDomainId && (
              <Button
                color="primary"
                onClick={() => handleVerifyDomain(currentDomainId)}
                isLoading={verifying === currentDomainId}
                className="mt-4"
              >
                Verify Domain
              </Button>
            )}
          </CardBody>
        </Card>
      )}

      {/* Existing Domains */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Your Domains</h3>
        {domains.length === 0 ? (
          <Card>
            <CardBody>
              <p className="text-center text-gray-500">No custom domains configured yet.</p>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-3">
            {domains.map((domain) => (
              <Card key={domain.id}>
                <CardBody>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Globe size={20} className="text-gray-400" />
                      <div>
                        <div className="font-semibold">{domain.domain}</div>
                        <div className="text-xs text-gray-500">
                          Added {new Date(domain.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {domain.verified ? (
                        <div className="flex items-center gap-1 text-success text-sm">
                          <Check size={16} />
                          <span>Verified</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-warning text-sm">
                            <X size={16} />
                            <span>Not Verified</span>
                          </div>
                          <Button
                            size="sm"
                            color="primary"
                            variant="flat"
                            onClick={() => handleVerifyDomain(domain.id)}
                            isLoading={verifying === domain.id}
                          >
                            Verify
                          </Button>
                        </div>
                      )}

                      <Button
                        size="sm"
                        color="danger"
                        variant="flat"
                        onClick={() => handleDeleteDomain(domain.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Help Text */}
      <Card className="bg-gray-50 dark:bg-gray-900">
        <CardBody>
          <h4 className="font-semibold mb-2">💡 Need Help?</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            After adding DNS records, it may take up to 48 hours for them to propagate globally.
            However, verification usually works within a few minutes. If verification fails,
            wait 5-10 minutes and try again.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
