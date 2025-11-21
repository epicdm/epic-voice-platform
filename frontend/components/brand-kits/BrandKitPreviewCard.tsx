"use client";

import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Image } from "@heroui/image";
import type { BrandKit } from "@/lib/api/brand-kits";

interface BrandKitPreviewCardProps {
  brandKit: BrandKit;
  compact?: boolean;
  showName?: boolean;
}

export function BrandKitPreviewCard({
  brandKit,
  compact = false,
  showName = false
}: BrandKitPreviewCardProps) {
  return (
    <div className="space-y-3">
      {/* Name */}
      {showName && (
        <div>
          <h4 className="font-semibold">{brandKit.name}</h4>
          {brandKit.companyName && brandKit.companyName !== brandKit.name && (
            <p className="text-sm text-foreground-500">{brandKit.companyName}</p>
          )}
        </div>
      )}

      {/* Logo */}
      {brandKit.logoUrl && (
        <div className={`flex items-center justify-center bg-default-100 rounded-lg ${compact ? 'p-4' : 'p-6'}`}>
          <Image
            src={brandKit.logoUrl}
            alt={`${brandKit.name} logo`}
            className="max-h-16 w-auto object-contain"
            removeWrapper
          />
        </div>
      )}

      {/* Colors */}
      {brandKit.brandColors && brandKit.brandColors.length > 0 && (
        <div>
          <p className="text-xs font-medium text-foreground-500 mb-2">
            Brand Colors
          </p>
          <div className="flex flex-wrap gap-2">
            {brandKit.brandColors.slice(0, compact ? 4 : 8).map((color, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center gap-1"
              >
                <div
                  className="w-10 h-10 rounded-lg border-2 border-default-200 shadow-sm"
                  style={{ backgroundColor: color.hex }}
                  title={`${color.name}: ${color.hex}`}
                />
                {!compact && (
                  <span className="text-xs text-foreground-400">
                    {color.hex}
                  </span>
                )}
              </div>
            ))}
            {brandKit.brandColors.length > (compact ? 4 : 8) && (
              <div className="flex items-center justify-center w-10 h-10 rounded-lg border-2 border-dashed border-default-300 text-xs text-foreground-400">
                +{brandKit.brandColors.length - (compact ? 4 : 8)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fonts */}
      {!compact && brandKit.fonts && brandKit.fonts.length > 0 && (
        <div>
          <p className="text-xs font-medium text-foreground-500 mb-2">
            Typography
          </p>
          <div className="flex flex-wrap gap-2">
            {brandKit.fonts.slice(0, 3).map((font, idx) => (
              <Chip
                key={idx}
                size="sm"
                variant="flat"
              >
                {font.family}
              </Chip>
            ))}
            {brandKit.fonts.length > 3 && (
              <Chip size="sm" variant="flat">
                +{brandKit.fonts.length - 3} more
              </Chip>
            )}
          </div>
        </div>
      )}

      {/* Tagline */}
      {!compact && brandKit.tagline && (
        <div className="text-sm italic text-foreground-500 border-l-2 border-primary pl-3">
          "{brandKit.tagline}"
        </div>
      )}
    </div>
  );
}
