"use client";

import { useState } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input, Textarea } from "@heroui/input";
import { RadioGroup, Radio } from "@heroui/radio";
import { Spinner } from "@heroui/spinner";
import { Chip } from "@heroui/chip";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Globe,
  Facebook,
  Instagram,
  Palette,
  Loader2,
  Plus,
  X
} from "lucide-react";
import {
  createBrandKit,
  extractBrandKit,
  updateBrandKit,
  type BrandKit,
  type BrandColor,
  type CreateBrandKitInput
} from "@/lib/api/brand-kits";
import { BrandKitPreviewCard } from "./BrandKitPreviewCard";

interface BrandKitWizardProps {
  editingKit?: BrandKit | null;
  onComplete: () => void;
  onCancel: () => void;
}

type SourceType = "website" | "facebook" | "instagram" | "manual";

export function BrandKitWizard({
  editingKit,
  onComplete,
  onCancel
}: BrandKitWizardProps) {
  const [step, setStep] = useState(1);
  const [sourceType, setSourceType] = useState<SourceType>(
    editingKit?.sourceType === "website" ? "website" :
    editingKit?.sourceType === "facebook" ? "facebook" :
    editingKit?.sourceType === "instagram" ? "instagram" :
    "manual"
  );

  // Form data
  const [websiteUrl, setWebsiteUrl] = useState(editingKit?.sourceUrl || "");
  const [name, setName] = useState(editingKit?.name || "");
  const [companyName, setCompanyName] = useState(editingKit?.companyName || "");
  const [tagline, setTagline] = useState(editingKit?.tagline || "");
  const [industry, setIndustry] = useState(editingKit?.industry || "");
  const [logoUrl, setLogoUrl] = useState(editingKit?.logoUrl || "");
  const [brandColors, setBrandColors] = useState<BrandColor[]>(
    editingKit?.brandColors || []
  );
  const [isDefault, setIsDefault] = useState(editingKit?.isDefault || false);

  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);

  const handleExtract = async () => {
    if (!websiteUrl) {
      setExtractionError("Please enter a website URL");
      return;
    }

    try {
      setExtracting(true);
      setExtractionError(null);

      const extracted = await extractBrandKit({
        url: websiteUrl,
        name: name || undefined,
        isDefault
      });

      // Populate form with extracted data
      setName(extracted.name);
      setCompanyName(extracted.companyName || "");
      setTagline(extracted.tagline || "");
      setIndustry(extracted.industry || "");
      setLogoUrl(extracted.logoUrl || "");
      setBrandColors(extracted.brandColors || []);

      // Move to review step
      setStep(3);
    } catch (error: any) {
      console.error("Extraction failed:", error);
      setExtractionError(
        error.response?.data?.details ||
        error.response?.data?.error ||
        "Failed to extract brand information. Please check the URL and try again."
      );
    } finally {
      setExtracting(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const data: CreateBrandKitInput = {
        name,
        sourceType: sourceType === "website" ? "manual" : "manual",
        logoUrl: logoUrl || undefined,
        brandColors,
        companyName: companyName || undefined,
        tagline: tagline || undefined,
        industry: industry || undefined,
        isDefault
      };

      if (editingKit) {
        await updateBrandKit(editingKit.id, data);
      } else {
        await createBrandKit(data);
      }

      onComplete();
    } catch (error) {
      console.error("Failed to save brand kit:", error);
      alert("Failed to save brand kit. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const addColor = () => {
    setBrandColors([
      ...brandColors,
      { hex: "#000000", name: `color-${brandColors.length + 1}`, usage: "accent" }
    ]);
  };

  const updateColor = (index: number, updates: Partial<BrandColor>) => {
    const newColors = [...brandColors];
    newColors[index] = { ...newColors[index], ...updates };
    setBrandColors(newColors);
  };

  const removeColor = (index: number) => {
    setBrandColors(brandColors.filter((_, i) => i !== index));
  };

  const canProceedStep1 = sourceType === "manual" || websiteUrl.trim().length > 0;
  const canProceedStep2 = name.trim().length > 0;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="light"
          startContent={<ArrowLeft className="h-4 w-4" />}
          onPress={onCancel}
          className="mb-4"
        >
          Back
        </Button>
        <h1 className="text-3xl font-bold">
          {editingKit ? "Edit Brand Kit" : "Create Brand Kit"}
        </h1>
        <p className="text-foreground-500 mt-1">
          {sourceType === "website"
            ? "Extract your brand assets automatically from your website"
            : sourceType === "facebook"
            ? "Extract your brand assets automatically from your Facebook page"
            : sourceType === "instagram"
            ? "Extract your brand assets automatically from your Instagram profile"
            : "Manually configure your brand assets"}
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                s === step
                  ? "bg-primary text-primary-foreground"
                  : s < step
                  ? "bg-success text-success-foreground"
                  : "bg-default-200 text-default-500"
              }`}
            >
              {s < step ? <Check className="h-4 w-4" /> : s}
            </div>
            {s < 3 && (
              <div
                className={`w-16 h-1 mx-2 ${
                  s < step ? "bg-success" : "bg-default-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Choose Source */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Step 1: Choose Source</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            <RadioGroup
              value={sourceType}
              onValueChange={(value) => setSourceType(value as SourceType)}
            >
              <Radio value="website">
                <div className="flex items-start gap-3">
                  <Globe className="h-5 w-5 mt-0.5" />
                  <div>
                    <p className="font-medium">Extract from Website</p>
                    <p className="text-sm text-foreground-500">
                      Automatically extract logo, colors, and company info from your website
                    </p>
                  </div>
                </div>
              </Radio>
              <Radio value="facebook">
                <div className="flex items-start gap-3">
                  <Facebook className="h-5 w-5 mt-0.5" />
                  <div>
                    <p className="font-medium">Extract from Facebook Page</p>
                    <p className="text-sm text-foreground-500">
                      Extract brand assets from your Facebook business page
                    </p>
                  </div>
                </div>
              </Radio>
              <Radio value="instagram">
                <div className="flex items-start gap-3">
                  <Instagram className="h-5 w-5 mt-0.5" />
                  <div>
                    <p className="font-medium">Extract from Instagram</p>
                    <p className="text-sm text-foreground-500">
                      Extract brand assets from your Instagram profile
                    </p>
                  </div>
                </div>
              </Radio>
              <Radio value="manual">
                <div className="flex items-start gap-3">
                  <Palette className="h-5 w-5 mt-0.5" />
                  <div>
                    <p className="font-medium">Enter Manually</p>
                    <p className="text-sm text-foreground-500">
                      Manually configure your brand colors, logo, and other assets
                    </p>
                  </div>
                </div>
              </Radio>
            </RadioGroup>

            {(sourceType === "website" || sourceType === "facebook" || sourceType === "instagram") && (
              <div className="space-y-4 p-4 bg-default-50 rounded-lg">
                <Input
                  label={
                    sourceType === "website" ? "Website URL" :
                    sourceType === "facebook" ? "Facebook Page URL" :
                    "Instagram Profile URL"
                  }
                  placeholder={
                    sourceType === "website" ? "https://example.com or example.com" :
                    sourceType === "facebook" ? "https://facebook.com/yourpage or facebook.com/yourpage" :
                    "https://instagram.com/yourprofile or instagram.com/yourprofile"
                  }
                  value={websiteUrl}
                  onValueChange={setWebsiteUrl}
                  description={
                    sourceType === "website" ? "Enter your company website URL" :
                    sourceType === "facebook" ? "Enter your Facebook business page URL" :
                    "Enter your Instagram profile URL"
                  }
                  errorMessage={extractionError}
                  isInvalid={!!extractionError}
                />
                <Input
                  label="Brand Kit Name (Optional)"
                  placeholder="My Brand"
                  value={name}
                  onValueChange={setName}
                  description={`Leave empty to use name from ${sourceType === "website" ? "website" : sourceType}`}
                />
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="isDefault" className="text-sm">
                    Set as default brand kit
                  </label>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="flat" onPress={onCancel}>
                Cancel
              </Button>
              {sourceType !== "manual" ? (
                <Button
                  color="primary"
                  endContent={extracting ? <Spinner size="sm" color="white" /> : <ArrowRight className="h-4 w-4" />}
                  onPress={handleExtract}
                  isDisabled={!canProceedStep1 || extracting}
                >
                  {extracting ? "Extracting..." : "Extract Brand"}
                </Button>
              ) : (
                <Button
                  color="primary"
                  endContent={<ArrowRight className="h-4 w-4" />}
                  onPress={() => setStep(2)}
                  isDisabled={!canProceedStep1}
                >
                  Next
                </Button>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Step 2: Basic Info (Manual Only) */}
      {step === 2 && sourceType === "manual" && (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Step 2: Basic Information</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              label="Brand Kit Name"
              placeholder="My Brand"
              value={name}
              onValueChange={setName}
              isRequired
              description="A name to identify this brand kit"
            />
            <Input
              label="Company Name"
              placeholder="Acme Inc."
              value={companyName}
              onValueChange={setCompanyName}
            />
            <Input
              label="Tagline"
              placeholder="Your trusted partner"
              value={tagline}
              onValueChange={setTagline}
            />
            <Input
              label="Industry"
              placeholder="Real Estate"
              value={industry}
              onValueChange={setIndustry}
            />
            <Input
              label="Logo URL"
              placeholder="https://example.com/logo.png"
              value={logoUrl}
              onValueChange={setLogoUrl}
              description="URL to your company logo image"
            />

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="isDefault" className="text-sm">
                Set as default brand kit
              </label>
            </div>

            <div className="flex justify-between pt-4">
              <Button
                variant="flat"
                startContent={<ArrowLeft className="h-4 w-4" />}
                onPress={() => setStep(1)}
              >
                Back
              </Button>
              <Button
                color="primary"
                endContent={<ArrowRight className="h-4 w-4" />}
                onPress={() => setStep(3)}
                isDisabled={!canProceedStep2}
              >
                Next
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Step 3: Colors & Review */}
      {step === 3 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Step 3: Brand Colors</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              {brandColors.length === 0 && (
                <div className="text-center py-8 text-foreground-500">
                  <p>No colors added yet. Add brand colors below.</p>
                </div>
              )}

              {brandColors.map((color, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color.hex}
                    onChange={(e) => updateColor(index, { hex: e.target.value })}
                    className="w-16 h-10 rounded border-2 border-default-200"
                  />
                  <Input
                    placeholder="Color name"
                    value={color.name}
                    onValueChange={(value) => updateColor(index, { name: value })}
                    size="sm"
                    className="flex-1"
                  />
                  <Input
                    placeholder="#FF5733"
                    value={color.hex}
                    onValueChange={(value) => updateColor(index, { hex: value })}
                    size="sm"
                    className="w-32"
                  />
                  <Button
                    isIconOnly
                    size="sm"
                    variant="flat"
                    color="danger"
                    onPress={() => removeColor(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button
                variant="flat"
                startContent={<Plus className="h-4 w-4" />}
                onPress={addColor}
              >
                Add Color
              </Button>
            </CardBody>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Preview</h2>
            </CardHeader>
            <CardBody>
              <BrandKitPreviewCard
                brandKit={{
                  id: "",
                  userId: "",
                  name,
                  isDefault,
                  sourceType,
                  sourceUrl: websiteUrl || undefined,
                  logoUrl: logoUrl || undefined,
                  brandColors,
                  fonts: [],
                  companyName: companyName || undefined,
                  tagline: tagline || undefined,
                  industry: industry || undefined,
                  socialLinks: {},
                  extractionStatus: "manual",
                  extractionMetadata: {},
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                }}
                showName
              />
            </CardBody>
          </Card>

          {/* Actions */}
          <div className="flex justify-between">
            <Button
              variant="flat"
              startContent={<ArrowLeft className="h-4 w-4" />}
              onPress={() => setStep(sourceType === "manual" ? 2 : 1)}
            >
              Back
            </Button>
            <Button
              color="primary"
              endContent={saving ? <Spinner size="sm" color="white" /> : <Check className="h-4 w-4" />}
              onPress={handleSave}
              isDisabled={saving || !name}
            >
              {saving ? "Saving..." : editingKit ? "Update Brand Kit" : "Create Brand Kit"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
