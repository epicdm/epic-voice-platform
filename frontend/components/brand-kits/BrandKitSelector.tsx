"use client";

import { useEffect, useState } from "react";
import { Select, SelectItem } from "@heroui/select";
import { Button } from "@heroui/button";
import { Spinner } from "@heroui/spinner";
import { Plus, Star } from "lucide-react";
import { listBrandKits, type BrandKit } from "@/lib/api/brand-kits";
import { BrandKitPreviewCard } from "./BrandKitPreviewCard";

interface BrandKitSelectorProps {
  value?: string | null;
  onChange: (brandKitId: string | null) => void;
  label?: string;
  description?: string;
  showPreview?: boolean;
  onCreateNew?: () => void;
}

export function BrandKitSelector({
  value,
  onChange,
  label = "Brand Kit",
  description = "Select a brand kit for consistent branding",
  showPreview = true,
  onCreateNew
}: BrandKitSelectorProps) {
  const [brandKits, setBrandKits] = useState<BrandKit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKit, setSelectedKit] = useState<BrandKit | null>(null);

  useEffect(() => {
    loadBrandKits();
  }, []);

  useEffect(() => {
    if (value && brandKits.length > 0) {
      const kit = brandKits.find((k) => k.id === value);
      setSelectedKit(kit || null);
    } else {
      setSelectedKit(null);
    }
  }, [value, brandKits]);

  const loadBrandKits = async () => {
    try {
      setLoading(true);
      const kits = await listBrandKits();
      setBrandKits(kits);

      // Auto-select default if no value
      if (!value) {
        const defaultKit = kits.find((k) => k.isDefault);
        if (defaultKit) {
          onChange(defaultKit.id);
        }
      }
    } catch (error) {
      console.error("Failed to load brand kits:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-4">
        <Spinner size="sm" />
        <span className="text-sm text-foreground-500">Loading brand kits...</span>
      </div>
    );
  }

  if (brandKits.length === 0) {
    return (
      <div className="border-2 border-dashed rounded-lg p-6 text-center">
        <p className="text-foreground-500 mb-4">
          No brand kits found. Create your first brand kit to get started.
        </p>
        {onCreateNew && (
          <Button
            color="primary"
            startContent={<Plus className="h-4 w-4" />}
            onPress={onCreateNew}
          >
            Create Brand Kit
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select
          label={label}
          placeholder="Select a brand kit"
          description={description}
          selectedKeys={value ? [value] : []}
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0] as string;
            onChange(selected || null);
          }}
          classNames={{
            base: "flex-1"
          }}
        >
          {brandKits.map((kit) => (
            <SelectItem
              key={kit.id}
              value={kit.id}
              textValue={kit.name}
            >
              <div className="flex items-center gap-2">
                <span>{kit.name}</span>
                {kit.isDefault && (
                  <Star className="h-3 w-3 fill-primary text-primary" />
                )}
              </div>
            </SelectItem>
          ))}
        </Select>

        {onCreateNew && (
          <Button
            isIconOnly
            variant="flat"
            onPress={onCreateNew}
            className="mt-6"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Preview */}
      {showPreview && selectedKit && (
        <div className="border-2 border-default-200 rounded-lg p-4">
          <BrandKitPreviewCard brandKit={selectedKit} compact />
        </div>
      )}

      {/* None selected message */}
      {showPreview && !selectedKit && value === null && (
        <div className="border-2 border-dashed border-default-200 rounded-lg p-4 text-center text-sm text-foreground-500">
          No brand kit selected. Landing page will use default styling.
        </div>
      )}
    </div>
  );
}
