"use client";

import { useState } from "react";
import { Input, Button } from "@heroui/react";

export default function BrandingSettings() {
  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  const handleSave = () => {
    // TODO: Implement branding save
    console.log("Saving branding");
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Branding</h3>
      <Input
        label="Company Name"
        value={companyName}
        onChange={(e) => setCompanyName(e.target.value)}
      />
      <Input
        label="Logo URL"
        value={logoUrl}
        onChange={(e) => setLogoUrl(e.target.value)}
      />
      <Button color="primary" onClick={handleSave}>
        Save Branding
      </Button>
    </div>
  );
}
