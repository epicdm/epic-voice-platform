"use client";

import { Button } from "@heroui/react";

interface ManageSubscriptionButtonProps {
  variant?: "solid" | "bordered" | "light" | "flat" | "faded" | "shadow" | "ghost";
}

export function ManageSubscriptionButton({ variant = "solid" }: ManageSubscriptionButtonProps) {
  const handleClick = async () => {
    // TODO: Implement Stripe customer portal redirect
    window.location.href = "/dashboard/billing";
  };

  return (
    <Button variant={variant} onClick={handleClick}>
      Manage Subscription
    </Button>
  );
}
