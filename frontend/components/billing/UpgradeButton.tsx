"use client";

import { Button } from "@heroui/react";

interface UpgradeButtonProps {
  priceId?: string;
  planName?: string;
  variant?: "solid" | "bordered" | "light" | "flat" | "faded" | "shadow" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function UpgradeButton({ priceId, planName, variant = "solid", size = "md" }: UpgradeButtonProps) {
  return (
    <Button
      color="primary"
      variant={variant}
      size={size}
      onClick={() => window.location.href = "/dashboard/billing"}
    >
      {planName ? `Upgrade to ${planName}` : "Upgrade Plan"}
    </Button>
  );
}

export default UpgradeButton;
