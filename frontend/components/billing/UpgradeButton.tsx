"use client";

import { Button } from "@heroui/react";

export function UpgradeButton() {
  return (
    <Button color="primary" onClick={() => window.location.href = "/dashboard/billing"}>
      Upgrade Plan
    </Button>
  );
}
