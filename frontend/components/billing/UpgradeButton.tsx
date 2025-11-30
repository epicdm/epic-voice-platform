"use client";

import { Button } from "@heroui/react";

interface UpgradeButtonProps {
  priceId: string;
  planName: string;
  variant?: "solid" | "flat" | "bordered" | "light" | "shadow" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function UpgradeButton({ priceId, planName, variant = "solid", size = "md" }: UpgradeButtonProps) {
  const handleUpgrade = async () => {
    // TODO: Implement Stripe checkout with priceId
    window.location.href = "/dashboard/billing";
  };

  return (
    <Button color="primary" variant={variant} size={size} onClick={handleUpgrade}>
      Upgrade to {planName}
    </Button>
  );
}
