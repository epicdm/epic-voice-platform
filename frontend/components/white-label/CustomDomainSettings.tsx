"use client";

import { useState } from "react";
import { Input, Button } from "@heroui/react";

export default function CustomDomainSettings() {
  const [domain, setDomain] = useState("");

  const handleSave = () => {
    // TODO: Implement domain configuration
    console.log("Saving domain:", domain);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Custom Domain</h3>
      <Input
        label="Domain"
        placeholder="yourdomain.com"
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
      />
      <Button color="primary" onClick={handleSave}>
        Save Domain
      </Button>
    </div>
  );
}
