"use client";

import { useState, useEffect } from 'react';
import { Button, Card, CardBody, Select, SelectItem, Spinner, Tabs, Tab } from "@heroui/react";
import { Code, Copy, Eye, ExternalLink } from "lucide-react";
import { api } from '@/lib/api-client';
import { toast } from 'sonner';

interface EmbedCodeData {
  embed_code: string;
  preview_url: string;
  domain: string;
}

type Position = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
type Theme = 'light' | 'dark' | 'auto';

export default function EmbedCodeGenerator() {
  const [embedData, setEmbedData] = useState<EmbedCodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [position, setPosition] = useState<Position>('bottom-right');
  const [theme, setTheme] = useState<Theme>('auto');
  const [selectedFramework, setSelectedFramework] = useState('html');

  useEffect(() => {
    loadEmbedCode();
  }, []);

  const loadEmbedCode = async () => {
    try {
      const response = await api.get('/api/user/white-label/embed-code');
      setEmbedData(response);
    } catch (error) {
      console.error('Failed to load embed code:', error);
      toast.error('Failed to load embed code');
    } finally {
      setLoading(false);
    }
  };

  const generateCustomCode = (framework: string): string => {
    if (!embedData) return '';

    const apiKeyPlaceholder = 'YOUR_API_KEY_HERE';
    const domain = embedData.domain;

    switch (framework) {
      case 'html':
        return `<!-- Epic Voice AI Widget -->
<script src="https://${domain}/embed/widget.js"></script>
<script>
  EpicVoice.init({
    apiKey: '${apiKeyPlaceholder}',
    position: '${position}',
    theme: '${theme}'
  });
</script>`;

      case 'react':
        return `import { useEffect } from 'react';

export default function App() {
  useEffect(() => {
    // Load Epic Voice AI widget
    const script = document.createElement('script');
    script.src = 'https://${domain}/embed/widget.js';
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.EpicVoice) {
        window.EpicVoice.init({
          apiKey: '${apiKeyPlaceholder}',
          position: '${position}',
          theme: '${theme}'
        });
      }
    };

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return <div>Your App Content</div>;
}`;

      case 'nextjs':
        return `'use client';

import { useEffect } from 'react';
import Script from 'next/script';

export default function RootLayout({ children }) {
  const [widgetLoaded, setWidgetLoaded] = useState(false);

  const initWidget = () => {
    if (window.EpicVoice) {
      window.EpicVoice.init({
        apiKey: '${apiKeyPlaceholder}',
        position: '${position}',
        theme: '${theme}'
      });
      setWidgetLoaded(true);
    }
  };

  return (
    <html>
      <body>
        {children}
        <Script
          src="https://${domain}/embed/widget.js"
          strategy="lazyOnload"
          onLoad={initWidget}
        />
      </body>
    </html>
  );
}`;

      case 'vue':
        return `<template>
  <div id="app">
    <!-- Your app content -->
  </div>
</template>

<script>
export default {
  name: 'App',
  mounted() {
    // Load Epic Voice AI widget
    const script = document.createElement('script');
    script.src = 'https://${domain}/embed/widget.js';
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.EpicVoice) {
        window.EpicVoice.init({
          apiKey: '${apiKeyPlaceholder}',
          position: '${position}',
          theme: '${theme}'
        });
      }
    };
  }
}
</script>`;

      default:
        return embedData.embed_code;
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!embedData) {
    return (
      <Card>
        <CardBody>
          <p className="text-center text-gray-500">Failed to load embed code. Please try again.</p>
        </CardBody>
      </Card>
    );
  }

  const currentCode = generateCustomCode(selectedFramework);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Embed Code Generator</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Add the Epic Voice AI widget to your website or application
        </p>
      </div>

      {/* Configuration Options */}
      <Card>
        <CardBody>
          <h3 className="text-lg font-semibold mb-4">Widget Configuration</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Position Selector */}
            <div>
              <label className="block text-sm font-medium mb-2">Widget Position</label>
              <Select
                selectedKeys={[position]}
                onChange={(e) => setPosition(e.target.value as Position)}
                placeholder="Select position"
              >
                <SelectItem key="bottom-right" value="bottom-right">
                  Bottom Right
                </SelectItem>
                <SelectItem key="bottom-left" value="bottom-left">
                  Bottom Left
                </SelectItem>
                <SelectItem key="top-right" value="top-right">
                  Top Right
                </SelectItem>
                <SelectItem key="top-left" value="top-left">
                  Top Left
                </SelectItem>
              </Select>
            </div>

            {/* Theme Selector */}
            <div>
              <label className="block text-sm font-medium mb-2">Color Theme</label>
              <Select
                selectedKeys={[theme]}
                onChange={(e) => setTheme(e.target.value as Theme)}
                placeholder="Select theme"
              >
                <SelectItem key="auto" value="auto">
                  Auto (System)
                </SelectItem>
                <SelectItem key="light" value="light">
                  Light
                </SelectItem>
                <SelectItem key="dark" value="dark">
                  Dark
                </SelectItem>
              </Select>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Framework-Specific Code */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Code size={20} />
              Integration Code
            </h3>
            <Button
              size="sm"
              variant="flat"
              onClick={() => copyToClipboard(currentCode)}
              startContent={<Copy size={14} />}
            >
              Copy Code
            </Button>
          </div>

          <Tabs
            selectedKey={selectedFramework}
            onSelectionChange={(key) => setSelectedFramework(key as string)}
            variant="underlined"
            className="mb-4"
          >
            <Tab key="html" title="HTML" />
            <Tab key="react" title="React" />
            <Tab key="nextjs" title="Next.js" />
            <Tab key="vue" title="Vue.js" />
          </Tabs>

          <div className="relative">
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <code className="text-sm font-mono">{currentCode}</code>
            </pre>
          </div>

          {/* API Key Warning */}
          <div className="mt-4 p-4 bg-warning-50 dark:bg-warning-950 border border-warning-200 dark:border-warning-800 rounded-lg">
            <p className="text-sm text-warning-800 dark:text-warning-200">
              <strong>⚠️ Important:</strong> Replace <code className="bg-warning-100 dark:bg-warning-900 px-1 rounded">YOUR_API_KEY_HERE</code> with your actual API key from the API Keys tab.
            </p>
          </div>
        </CardBody>
      </Card>

      {/* Live Preview */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Eye size={20} />
              Live Preview
            </h3>
            <Button
              size="sm"
              variant="flat"
              as="a"
              href={embedData.preview_url}
              target="_blank"
              rel="noopener noreferrer"
              endContent={<ExternalLink size={14} />}
            >
              Open Full Preview
            </Button>
          </div>

          <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-6 min-h-[400px] relative">
            <div className="text-center text-gray-500 py-20">
              <p className="mb-2">Widget preview will appear here</p>
              <p className="text-sm">Position: {position} • Theme: {theme}</p>
            </div>

            {/* Widget Preview Placeholder */}
            <div
              className={`fixed w-16 h-16 bg-primary rounded-full shadow-lg flex items-center justify-center cursor-pointer transition-all hover:scale-110 ${
                position === 'bottom-right' ? 'bottom-6 right-6' :
                position === 'bottom-left' ? 'bottom-6 left-6' :
                position === 'top-right' ? 'top-6 right-6' :
                'top-6 left-6'
              }`}
              style={{ position: 'absolute' }}
            >
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Implementation Instructions */}
      <Card className="bg-gray-50 dark:bg-gray-900">
        <CardBody>
          <h4 className="font-semibold mb-3">📚 Implementation Guide</h4>

          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <div>
              <strong className="text-gray-900 dark:text-gray-100">Step 1: Get Your API Key</strong>
              <p>Go to the "API Keys" tab to create a new API key for your website or app.</p>
            </div>

            <div>
              <strong className="text-gray-900 dark:text-gray-100">Step 2: Choose Framework</strong>
              <p>Select the framework tab above that matches your tech stack (HTML, React, Next.js, Vue).</p>
            </div>

            <div>
              <strong className="text-gray-900 dark:text-gray-100">Step 3: Copy Code</strong>
              <p>Click "Copy Code" and paste it into your website or application code.</p>
            </div>

            <div>
              <strong className="text-gray-900 dark:text-gray-100">Step 4: Replace API Key</strong>
              <p>Replace <code className="bg-gray-200 dark:bg-gray-800 px-1 rounded">YOUR_API_KEY_HERE</code> with your actual API key.</p>
            </div>

            <div>
              <strong className="text-gray-900 dark:text-gray-100">Step 5: Deploy</strong>
              <p>Deploy your changes and the Epic Voice AI widget will appear on your site!</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h5 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Advanced Options</h5>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Customize colors and branding in the "Branding" tab</li>
              <li>• Use your custom domain for white-label deployment</li>
              <li>• Configure webhooks for event notifications</li>
              <li>• Track usage and analytics in the "Usage & Analytics" tab</li>
            </ul>
          </div>
        </CardBody>
      </Card>

      {/* Domain Information */}
      {embedData.domain !== 'ai.epic.dm' && (
        <Card className="bg-success-50 dark:bg-success-950 border-success-200 dark:border-success-800">
          <CardBody>
            <h4 className="font-semibold mb-2 text-success-900 dark:text-success-100">
              ✅ Custom Domain Active
            </h4>
            <p className="text-sm text-success-800 dark:text-success-200">
              Your widget is served from your verified custom domain: <strong>{embedData.domain}</strong>
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
