"use client";

import { useEffect, useState } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import {
  Plus,
  Palette,
  Trash2,
  RefreshCw,
  ExternalLink,
  Star,
  Edit,
  Globe,
  Facebook,
  Instagram
} from "lucide-react";
import {
  listBrandKits,
  deleteBrandKit,
  setDefaultBrandKit
} from "@/lib/api/brand-kits";
import { BrandKitWizard } from "@/components/brand-kits/BrandKitWizard";
import { BrandKitPreviewCard } from "@/components/brand-kits/BrandKitPreviewCard";

export default function BrandKitsPage() {
  const [brandKits, setBrandKits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [editingKit, setEditingKit] = useState<any | null>(null);

  const loadBrandKits = async () => {
    try {
      setLoading(true);
      const kits = await listBrandKits();
      setBrandKits(kits);
    } catch (error) {
      console.error("Failed to load brand kits:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrandKits();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this brand kit?")) {
      return;
    }

    try {
      await deleteBrandKit(id);
      await loadBrandKits();
    } catch (error) {
      console.error("Failed to delete brand kit:", error);
      alert("Failed to delete brand kit");
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultBrandKit(id);
      await loadBrandKits();
    } catch (error) {
      console.error("Failed to set default brand kit:", error);
      alert("Failed to set default brand kit");
    }
  };

  const handleWizardComplete = async () => {
    setShowWizard(false);
    setEditingKit(null);
    await loadBrandKits();
  };

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'website':
        return <Globe className="h-4 w-4" />;
      case 'facebook':
        return <Facebook className="h-4 w-4" />;
      case 'instagram':
        return <Instagram className="h-4 w-4" />;
      default:
        return <Palette className="h-4 w-4" />;
    }
  };

  if (showWizard) {
    return (
      <div className="min-h-screen bg-background">
        <BrandKitWizard
          editingKit={editingKit}
          onComplete={handleWizardComplete}
          onCancel={() => {
            setShowWizard(false);
            setEditingKit(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Brand Kits</h1>
          <p className="text-foreground-500 mt-1">
            Manage your brand assets for consistent branding across landing pages, messages, and emails
          </p>
        </div>
        <Button
          color="primary"
          startContent={<Plus className="h-4 w-4" />}
          onPress={() => setShowWizard(true)}
        >
          Create Brand Kit
        </Button>
      </div>

      {/* Info Card */}
      <Card className="mb-6 border-2 border-primary-200 dark:border-primary-800">
        <CardBody className="flex flex-row items-start gap-3">
          <div className="p-2 bg-primary-100 dark:bg-primary-900 rounded-lg">
            <Palette className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-1">What are Brand Kits?</h3>
            <p className="text-sm text-foreground-500">
              Brand Kits store your company's logo, colors, fonts, and other brand assets.
              Extract them automatically from your website or create them manually.
              Your default brand kit will be used automatically in landing pages, outgoing messages, and AI agent communications.
            </p>
          </div>
        </CardBody>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-20">
          <Spinner size="lg" />
        </div>
      )}

      {/* Empty State */}
      {!loading && brandKits.length === 0 && (
        <Card className="border-2 border-dashed">
          <CardBody className="flex flex-col items-center justify-center py-20">
            <div className="p-4 bg-default-100 rounded-full mb-4">
              <Palette className="h-10 w-10 text-default-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Brand Kits Yet</h3>
            <p className="text-foreground-500 mb-6 text-center max-w-md">
              Create your first brand kit to maintain consistent branding across all your customer touchpoints.
            </p>
            <Button
              color="primary"
              startContent={<Plus className="h-4 w-4" />}
              onPress={() => setShowWizard(true)}
            >
              Create Your First Brand Kit
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Brand Kits Grid */}
      {!loading && brandKits.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {brandKits.map((kit) => (
            <Card
              key={kit.id}
              className={kit.isDefault ? "border-2 border-primary" : ""}
            >
              <CardHeader className="flex flex-col items-start gap-2 pb-2">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{kit.name}</h3>
                    {kit.isDefault && (
                      <Chip
                        size="sm"
                        color="primary"
                        variant="flat"
                        startContent={<Star className="h-3 w-3" />}
                      >
                        Default
                      </Chip>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-foreground-500">
                  {getSourceIcon(kit.sourceType)}
                  <span className="capitalize">{kit.sourceType}</span>
                  {kit.sourceUrl && (
                    <a
                      href={kit.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </CardHeader>

              <CardBody className="space-y-4">
                {/* Brand Preview */}
                <BrandKitPreviewCard brandKit={kit} compact />

                {/* Company Info */}
                {kit.companyName && (
                  <div className="text-sm">
                    <p className="font-medium">{kit.companyName}</p>
                    {kit.industry && (
                      <p className="text-foreground-500">{kit.industry}</p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  {!kit.isDefault && (
                    <Button
                      size="sm"
                      variant="flat"
                      startContent={<Star className="h-3 w-3" />}
                      onPress={() => handleSetDefault(kit.id)}
                    >
                      Set Default
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="flat"
                    startContent={<Edit className="h-3 w-3" />}
                    onPress={() => {
                      setEditingKit(kit);
                      setShowWizard(true);
                    }}
                  >
                    Edit
                  </Button>
                  {kit.sourceUrl && (
                    <Button
                      size="sm"
                      variant="flat"
                      startContent={<RefreshCw className="h-3 w-3" />}
                      onPress={async () => {
                        // TODO: Implement refresh
                        alert("Refresh functionality coming soon!");
                      }}
                    >
                      Refresh
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="flat"
                    color="danger"
                    startContent={<Trash2 className="h-3 w-3" />}
                    onPress={() => handleDelete(kit.id)}
                  >
                    Delete
                  </Button>
                </div>

                {/* Stats */}
                <div className="flex gap-4 text-xs text-foreground-400 pt-2 border-t">
                  <div>
                    <span className="font-medium">{kit.brandColors.length}</span> colors
                  </div>
                  <div>
                    <span className="font-medium">{kit.fonts.length}</span> fonts
                  </div>
                  <div>
                    Created {new Date(kit.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
