"use client";

import { useState } from 'react';
import { Tabs, Tab, Card, CardBody } from "@heroui/react";
import { Globe, Palette, Code, Key, BarChart3 } from "lucide-react";
import CustomDomainSettings from '@/components/white-label/CustomDomainSettings';
import BrandingSettings from '@/components/white-label/BrandingSettings';
import EmbedCodeGenerator from '@/components/white-label/EmbedCodeGenerator';
import APIKeyManager from '@/components/white-label/APIKeyManager';
import UsageAnalytics from '@/components/white-label/UsageAnalytics';

/**
 * White-Label Partner Settings
 * Allows partners to configure custom domains, branding, and get embed codes
 */
export default function WhiteLabelPage() {
  const [selectedTab, setSelectedTab] = useState("domain");

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">White-Label Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Configure your custom domain, branding, and integration options for your voice AI platform
        </p>
      </div>

      <Tabs
        selectedKey={selectedTab}
        onSelectionChange={(key) => setSelectedTab(key as string)}
        variant="underlined"
        className="mb-6"
      >
        <Tab
          key="domain"
          title={
            <div className="flex items-center gap-2">
              <Globe size={18} />
              <span>Custom Domain</span>
            </div>
          }
        >
          <Card>
            <CardBody>
              <CustomDomainSettings />
            </CardBody>
          </Card>
        </Tab>

        <Tab
          key="branding"
          title={
            <div className="flex items-center gap-2">
              <Palette size={18} />
              <span>Branding</span>
            </div>
          }
        >
          <Card>
            <CardBody>
              <BrandingSettings />
            </CardBody>
          </Card>
        </Tab>

        <Tab
          key="embed"
          title={
            <div className="flex items-center gap-2">
              <Code size={18} />
              <span>Embed Code</span>
            </div>
          }
        >
          <Card>
            <CardBody>
              <EmbedCodeGenerator />
            </CardBody>
          </Card>
        </Tab>

        <Tab
          key="api-keys"
          title={
            <div className="flex items-center gap-2">
              <Key size={18} />
              <span>API Keys</span>
            </div>
          }
        >
          <Card>
            <CardBody>
              <APIKeyManager />
            </CardBody>
          </Card>
        </Tab>

        <Tab
          key="usage"
          title={
            <div className="flex items-center gap-2">
              <BarChart3 size={18} />
              <span>Usage & Analytics</span>
            </div>
          }
        >
          <Card>
            <CardBody>
              <UsageAnalytics />
            </CardBody>
          </Card>
        </Tab>
      </Tabs>
    </div>
  );
}
