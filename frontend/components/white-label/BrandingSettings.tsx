"use client";

import { useState, useEffect } from 'react';
import { Button, Input, Card, CardBody, Spinner } from "@heroui/react";
import { Palette, Upload, Eye } from "lucide-react";
import { api } from '@/lib/api-client';
import { toast } from 'sonner';

interface BrandingConfig {
  logo_url?: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  company_name?: string | null;
  support_email?: string | null;
  support_url?: string | null;
}

export default function BrandingSettings() {
  const [branding, setBranding] = useState<BrandingConfig>({
    primary_color: '#0070f3',
    secondary_color: '#7928ca',
    accent_color: '#ff0080',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    loadBranding();
  }, []);

  const loadBranding = async () => {
    try {
      const response = await api.get('/api/user/white-label/branding');
      if (response && Object.keys(response).length > 0) {
        setBranding(response);
      }
    } catch (error) {
      console.error('Failed to load branding:', error);
      toast.error('Failed to load branding');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBranding = async () => {
    setSaving(true);
    try {
      await api.put('/api/user/white-label/branding', branding);
      toast.success('Branding saved successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save branding');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Allowed: PNG, JPG, SVG, WEBP');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File too large. Maximum size: 2MB');
      return;
    }

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await api.post('/api/user/white-label/logo', formData);
      setBranding({ ...branding, logo_url: response.logo_url });
      toast.success('Logo uploaded successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!confirm('Remove logo?')) return;

    try {
      await api.delete('/api/user/white-label/logo');
      setBranding({ ...branding, logo_url: null });
      toast.success('Logo removed');
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove logo');
    }
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
          <h2 className="text-2xl font-semibold mb-2">Branding Configuration</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Customize your white-label platform appearance
          </p>
        </div>
        <Button
          color={previewMode ? 'default' : 'primary'}
          variant={previewMode ? 'flat' : 'solid'}
          onClick={() => setPreviewMode(!previewMode)}
          startContent={<Eye size={18} />}
        >
          {previewMode ? 'Hide Preview' : 'Preview'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Configuration */}
        <div className="space-y-6">
          {/* Logo Upload */}
          <Card>
            <CardBody>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Upload size={20} />
                Company Logo
              </h3>

              {branding.logo_url ? (
                <div className="space-y-4">
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 flex items-center justify-center">
                    <img
                      src={branding.logo_url}
                      alt="Company Logo"
                      className="max-h-24 max-w-full object-contain"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="flat"
                      onClick={() => document.getElementById('logo-upload')?.click()}
                      isLoading={uploadingLogo}
                    >
                      Replace Logo
                    </Button>
                    <Button
                      size="sm"
                      color="danger"
                      variant="flat"
                      onClick={handleRemoveLogo}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div
                    className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                    onClick={() => document.getElementById('logo-upload')?.click()}
                  >
                    <Upload size={48} className="mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Click to upload logo
                    </p>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, SVG, WEBP • Max 2MB
                    </p>
                  </div>
                </div>
              )}

              <input
                id="logo-upload"
                type="file"
                accept=".png,.jpg,.jpeg,.svg,.webp"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </CardBody>
          </Card>

          {/* Brand Colors */}
          <Card>
            <CardBody>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Palette size={20} />
                Brand Colors
              </h3>

              <div className="space-y-4">
                {/* Primary Color */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Primary Color
                  </label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="color"
                      value={branding.primary_color}
                      onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                      className="w-16 h-10 rounded cursor-pointer"
                    />
                    <Input
                      value={branding.primary_color}
                      onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                      placeholder="#0070f3"
                      className="flex-1 font-mono"
                    />
                  </div>
                </div>

                {/* Secondary Color */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Secondary Color
                  </label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="color"
                      value={branding.secondary_color}
                      onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })}
                      className="w-16 h-10 rounded cursor-pointer"
                    />
                    <Input
                      value={branding.secondary_color}
                      onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })}
                      placeholder="#7928ca"
                      className="flex-1 font-mono"
                    />
                  </div>
                </div>

                {/* Accent Color */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Accent Color
                  </label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="color"
                      value={branding.accent_color}
                      onChange={(e) => setBranding({ ...branding, accent_color: e.target.value })}
                      className="w-16 h-10 rounded cursor-pointer"
                    />
                    <Input
                      value={branding.accent_color}
                      onChange={(e) => setBranding({ ...branding, accent_color: e.target.value })}
                      placeholder="#ff0080"
                      className="flex-1 font-mono"
                    />
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Company Information */}
          <Card>
            <CardBody>
              <h3 className="text-lg font-semibold mb-4">Company Information</h3>

              <div className="space-y-4">
                <Input
                  label="Company Name"
                  value={branding.company_name || ''}
                  onChange={(e) => setBranding({ ...branding, company_name: e.target.value })}
                  placeholder="Your Company Inc."
                />

                <Input
                  label="Support Email"
                  type="email"
                  value={branding.support_email || ''}
                  onChange={(e) => setBranding({ ...branding, support_email: e.target.value })}
                  placeholder="support@yourcompany.com"
                />

                <Input
                  label="Support URL"
                  type="url"
                  value={branding.support_url || ''}
                  onChange={(e) => setBranding({ ...branding, support_url: e.target.value })}
                  placeholder="https://support.yourcompany.com"
                />
              </div>
            </CardBody>
          </Card>

          {/* Save Button */}
          <Button
            color="primary"
            size="lg"
            onClick={handleSaveBranding}
            isLoading={saving}
            className="w-full"
          >
            Save Branding
          </Button>
        </div>

        {/* Right Column: Live Preview */}
        {previewMode && (
          <div className="lg:sticky lg:top-6 h-fit">
            <Card>
              <CardBody>
                <h3 className="text-lg font-semibold mb-4">Live Preview</h3>

                {/* Preview Dashboard Header */}
                <div
                  className="rounded-lg p-6 mb-4"
                  style={{ backgroundColor: branding.primary_color }}
                >
                  {branding.logo_url ? (
                    <img
                      src={branding.logo_url}
                      alt="Logo Preview"
                      className="h-12 mb-4"
                      style={{ filter: 'brightness(0) invert(1)' }}
                    />
                  ) : (
                    <div className="h-12 flex items-center mb-4">
                      <span className="text-white text-xl font-bold">
                        {branding.company_name || 'Your Company'}
                      </span>
                    </div>
                  )}
                  <h4 className="text-white text-2xl font-bold">
                    Voice AI Dashboard
                  </h4>
                </div>

                {/* Preview Button Styles */}
                <div className="space-y-3 mb-4">
                  <button
                    className="w-full px-4 py-2 rounded-lg font-medium text-white"
                    style={{ backgroundColor: branding.primary_color }}
                  >
                    Primary Button
                  </button>

                  <button
                    className="w-full px-4 py-2 rounded-lg font-medium text-white"
                    style={{ backgroundColor: branding.secondary_color }}
                  >
                    Secondary Button
                  </button>

                  <button
                    className="w-full px-4 py-2 rounded-lg font-medium text-white"
                    style={{ backgroundColor: branding.accent_color }}
                  >
                    Accent Button
                  </button>
                </div>

                {/* Preview Card */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <div
                    className="w-full h-2 rounded-full mb-4"
                    style={{ backgroundColor: branding.primary_color }}
                  />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    This is how your branded platform will look to your partners and their customers.
                  </p>
                  <div className="flex gap-2">
                    <div
                      className="w-12 h-12 rounded"
                      style={{ backgroundColor: branding.primary_color }}
                    />
                    <div
                      className="w-12 h-12 rounded"
                      style={{ backgroundColor: branding.secondary_color }}
                    />
                    <div
                      className="w-12 h-12 rounded"
                      style={{ backgroundColor: branding.accent_color }}
                    />
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        )}
      </div>

      {/* Help Text */}
      <Card className="bg-gray-50 dark:bg-gray-900">
        <CardBody>
          <h4 className="font-semibold mb-2">💡 Branding Tips</h4>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>• Use a high-resolution logo (PNG or SVG recommended)</li>
            <li>• Choose colors that match your brand guidelines</li>
            <li>• Ensure good contrast between text and background colors</li>
            <li>• Test in both light and dark modes</li>
            <li>• Changes apply to your custom domain and embed widgets</li>
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
