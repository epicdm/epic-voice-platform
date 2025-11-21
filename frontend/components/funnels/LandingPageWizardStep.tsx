"use client";

import React, { useState } from "react";
import {
  Button,
  Input,
  Textarea,
  Card,
  CardBody,
  Spinner,
  Chip,
  Select,
  SelectItem,
} from "@heroui/react";
import { Sparkles, Eye, Palette, AlertCircle, Check } from "lucide-react";
import { BrandKitSelector } from "@/components/brand-kits/BrandKitSelector";
import { getBrandKit } from "@/lib/api/brand-kits";

interface LandingPageConfig {
  enabled: boolean;
  headline: string;
  subheadline: string;
  description: string;
  benefits: string[];
  cta_text: string;
  success_message: string;
  collect_fields: Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
    placeholder: string;
  }>;
  theme: {
    primary_color: string;
    accent_color: string;
    template: string;
  };
}

interface LandingPageWizardStepProps {
  funnelName: string;
  funnelDescription: string;
  onConfigured: (config: LandingPageConfig) => void;
  initialConfig?: LandingPageConfig | null;
}

const DEFAULT_FIELDS = [
  { name: "first_name", label: "First Name", type: "text", required: true, placeholder: "John" },
  { name: "last_name", label: "Last Name", type: "text", required: true, placeholder: "Smith" },
  { name: "phone_number", label: "Phone Number", type: "tel", required: true, placeholder: "(555) 123-4567" },
  { name: "email", label: "Email", type: "email", required: true, placeholder: "john@example.com" },
];

export default function LandingPageWizardStep({
  funnelName,
  funnelDescription,
  onConfigured,
  initialConfig,
}: LandingPageWizardStepProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [purpose, setPurpose] = useState("");
  const [industry, setIndustry] = useState("general");
  const [tone, setTone] = useState("professional");
  const [showPreview, setShowPreview] = useState(false);
  const [brandKitId, setBrandKitId] = useState<string | null>(null);

  const [config, setConfig] = useState<LandingPageConfig>(
    initialConfig || {
      enabled: true,
      headline: "",
      subheadline: "",
      description: "",
      benefits: ["", "", ""],
      cta_text: "",
      success_message: "",
      collect_fields: DEFAULT_FIELDS,
      theme: {
        primary_color: "#0066FF",
        accent_color: "#10B981",
        template: "modern",
      },
    }
  );

  const hasGenerated = config.headline.length > 0;

  const handleGenerate = async () => {
    if (!purpose.trim()) {
      alert("Please describe what this landing page is for");
      return;
    }

    setIsGenerating(true);

    try {
      // TODO: Replace with real AI generation call to backend
      // For MVP, generate smart defaults based on inputs

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Generate content based on purpose and industry
      const isPurposeReal = purpose.toLowerCase().includes("real estate") || purpose.toLowerCase().includes("home") || purpose.toLowerCase().includes("property");

      const newConfig: LandingPageConfig = {
        enabled: true,
        headline: isPurposeReal
          ? "Discover Your Home's True Value"
          : `Get Your Free ${industry === "general" ? "" : industry.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())} Consultation`,
        subheadline: isPurposeReal
          ? "Get a free, no-obligation market analysis from a local expert in under 5 minutes"
          : "Talk to an expert in minutes, not days. Our AI assistant will call you immediately.",
        description: "Submit your information below and we'll call you within 60 seconds. Get expert advice with zero commitment or obligation.",
        benefits: [
          "Instant response - we call you in under 60 seconds",
          `Expert ${industry === "general" ? "" : industry.replace("_", " ")} consultation tailored to your needs`,
          "Completely free, no strings attached"
        ],
        cta_text: isPurposeReal ? "Get My Free Valuation" : "Get My Free Call",
        success_message: "Perfect! Expect a call from us in the next 60 seconds.",
        collect_fields: DEFAULT_FIELDS,
        theme: {
          primary_color: industry === "real_estate" ? "#1E40AF" :
                        industry === "healthcare" ? "#0891B2" :
                        industry === "finance" ? "#1E3A8A" :
                        industry === "legal" ? "#1F2937" :
                        industry === "automotive" ? "#DC2626" :
                        industry === "technology" ? "#6366F1" :
                        "#0066FF",
          accent_color: "#10B981",
          template: "modern",
        },
      };

      setConfig(newConfig);
      onConfigured(newConfig);
      setShowPreview(true);
    } catch (error) {
      console.error("Generation error:", error);
      alert("Failed to generate landing page. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const updateConfig = (updates: Partial<LandingPageConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onConfigured(newConfig);
  };

  const updateBenefit = (index: number, value: string) => {
    const newBenefits = [...config.benefits];
    newBenefits[index] = value;
    updateConfig({ benefits: newBenefits });
  };

  const handleBrandKitChange = async (kitId: string | null) => {
    setBrandKitId(kitId);

    if (kitId) {
      try {
        const kit = await getBrandKit(kitId);

        // Update theme colors from brand kit
        if (kit.brandColors && kit.brandColors.length > 0) {
          const primary = kit.brandColors[0]?.hex || config.theme.primary_color;
          const accent = kit.brandColors[1]?.hex || kit.brandColors[0]?.hex || config.theme.accent_color;

          updateConfig({
            theme: {
              ...config.theme,
              primary_color: primary,
              accent_color: accent
            }
          });
        }
      } catch (error) {
        console.error("Failed to load brand kit:", error);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Generate with AI */}
      {!hasGenerated && (
        <Card className="border-2 border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <CardBody className="space-y-4 p-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-lg">Generate Landing Page with AI</h3>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400">
              Describe what this landing page is for, and AI will create compelling copy in seconds.
            </p>

            <Textarea
              label="What is this landing page for?"
              placeholder="Example: Real estate lead generation - free home valuation for homeowners considering selling"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              minRows={3}
              isRequired
              description="Be specific about your offer and target audience"
            />

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Industry"
                selectedKeys={[industry]}
                onChange={(e) => setIndustry(e.target.value)}
                description="Helps AI choose appropriate language"
              >
                <SelectItem key="general" value="general">
                  General / Other
                </SelectItem>
                <SelectItem key="real_estate" value="real_estate">
                  Real Estate
                </SelectItem>
                <SelectItem key="healthcare" value="healthcare">
                  Healthcare
                </SelectItem>
                <SelectItem key="finance" value="finance">
                  Finance
                </SelectItem>
                <SelectItem key="legal" value="legal">
                  Legal
                </SelectItem>
                <SelectItem key="automotive" value="automotive">
                  Automotive
                </SelectItem>
                <SelectItem key="technology" value="technology">
                  Technology
                </SelectItem>
                <SelectItem key="education" value="education">
                  Education
                </SelectItem>
              </Select>

              <Select
                label="Tone"
                selectedKeys={[tone]}
                onChange={(e) => setTone(e.target.value)}
                description="Voice and personality"
              >
                <SelectItem key="professional" value="professional">
                  Professional
                </SelectItem>
                <SelectItem key="friendly" value="friendly">
                  Friendly & Casual
                </SelectItem>
                <SelectItem key="urgent" value="urgent">
                  Urgent & Direct
                </SelectItem>
              </Select>
            </div>

            <Button
              color="primary"
              size="lg"
              onPress={handleGenerate}
              isLoading={isGenerating}
              isDisabled={!purpose.trim()}
              startContent={!isGenerating && <Sparkles className="h-4 w-4" />}
              className="w-full"
            >
              {isGenerating ? "Generating..." : "Generate Landing Page"}
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Step 2: Edit & Preview */}
      {hasGenerated && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-lg">Landing Page Content</h3>
            </div>
            <div className="flex gap-2">
              <Button
                variant="flat"
                size="sm"
                onPress={() => setShowPreview(!showPreview)}
                startContent={<Eye className="h-4 w-4" />}
              >
                {showPreview ? "Hide Preview" : "Show Preview"}
              </Button>
              <Button
                variant="flat"
                size="sm"
                color="danger"
                onPress={() => {
                  setConfig({
                    ...config,
                    headline: "",
                    subheadline: "",
                    description: "",
                    benefits: ["", "", ""],
                  });
                  setShowPreview(false);
                }}
              >
                Regenerate
              </Button>
            </div>
          </div>

          {/* Edit Form */}
          <div className="grid grid-cols-1 gap-4">
            <Input
              label="Headline"
              value={config.headline}
              onChange={(e) => updateConfig({ headline: e.target.value })}
              placeholder="Get Your Free Consultation"
              description="6-10 words, benefit-focused"
              isRequired
            />

            <Input
              label="Subheadline"
              value={config.subheadline}
              onChange={(e) => updateConfig({ subheadline: e.target.value })}
              placeholder="Talk to an expert in minutes, not days"
              description="15-25 words, expand on headline"
              isRequired
            />

            <Textarea
              label="Description"
              value={config.description}
              onChange={(e) => updateConfig({ description: e.target.value })}
              placeholder="Our AI assistant will call you within 60 seconds..."
              minRows={3}
              description="What happens after they submit"
              isRequired
            />

            <div className="space-y-2">
              <label className="text-sm font-medium">Benefits (3 bullet points)</label>
              {config.benefits.map((benefit, index) => (
                <Input
                  key={index}
                  value={benefit}
                  onChange={(e) => updateBenefit(index, e.target.value)}
                  placeholder={`Benefit ${index + 1}`}
                  startContent={<span className="text-green-600">✓</span>}
                />
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="CTA Button Text"
                value={config.cta_text}
                onChange={(e) => updateConfig({ cta_text: e.target.value })}
                placeholder="Get My Free Call"
                description="2-4 words, action-oriented"
              />

              <Input
                label="Success Message"
                value={config.success_message}
                onChange={(e) => updateConfig({ success_message: e.target.value })}
                placeholder="We'll call you in 60 seconds!"
                description="Shown after form submission"
              />
            </div>

            {/* Brand Kit Selector */}
            <Card className="border border-gray-200">
              <CardBody className="space-y-3 p-4">
                <BrandKitSelector
                  value={brandKitId}
                  onChange={handleBrandKitChange}
                  label="Brand Kit (Optional)"
                  description="Select a brand kit to auto-populate colors and branding"
                  showPreview={false}
                />
              </CardBody>
            </Card>

            {/* Theme Colors */}
            <Card className="border border-gray-200">
              <CardBody className="space-y-3 p-4">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-gray-600" />
                  <span className="font-semibold text-sm">Theme</span>
                  {brandKitId && (
                    <Chip size="sm" variant="flat" color="success">
                      From Brand Kit
                    </Chip>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Primary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={config.theme.primary_color}
                        onChange={(e) =>
                          updateConfig({
                            theme: { ...config.theme, primary_color: e.target.value },
                          })
                        }
                        className="h-10 w-16 rounded border cursor-pointer"
                      />
                      <Input
                        value={config.theme.primary_color}
                        onChange={(e) =>
                          updateConfig({
                            theme: { ...config.theme, primary_color: e.target.value },
                          })
                        }
                        size="sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Accent Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={config.theme.accent_color}
                        onChange={(e) =>
                          updateConfig({
                            theme: { ...config.theme, accent_color: e.target.value },
                          })
                        }
                        className="h-10 w-16 rounded border cursor-pointer"
                      />
                      <Input
                        value={config.theme.accent_color}
                        onChange={(e) =>
                          updateConfig({
                            theme: { ...config.theme, accent_color: e.target.value },
                          })
                        }
                        size="sm"
                      />
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Preview */}
          {showPreview && (
            <Card className="border-2 border-blue-200">
              <CardBody className="p-0">
                <div className="bg-gray-100 dark:bg-gray-800 p-3 border-b flex items-center justify-between">
                  <span className="text-sm font-medium">Landing Page Preview</span>
                  <Chip size="sm" variant="flat">
                    Live Preview
                  </Chip>
                </div>
                <div
                  className="p-8"
                  style={{
                    background: `linear-gradient(135deg, ${config.theme.primary_color} 0%, ${config.theme.accent_color} 100%)`,
                    minHeight: "400px",
                    color: "white",
                  }}
                >
                  <div className="max-w-2xl">
                    <h1 className="text-4xl font-bold mb-4">{config.headline}</h1>
                    <p className="text-xl mb-4 opacity-90">{config.subheadline}</p>
                    <p className="text-base mb-6 opacity-85">{config.description}</p>
                    <ul className="space-y-2 mb-6">
                      {config.benefits.map((benefit, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-xl">✓</span>
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      className="px-6 py-3 bg-white rounded-lg font-semibold shadow-lg"
                      style={{ color: config.theme.primary_color }}
                    >
                      {config.cta_text}
                    </button>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Info Note */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <strong>What happens next:</strong> After you create this funnel, you'll get a unique
                URL like <code className="px-1 py-0.5 bg-blue-100 rounded">https://ai.epic.dm/l/abc-123</code>.
                Share this URL anywhere - when someone submits the form, your funnel will execute
                automatically!
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
