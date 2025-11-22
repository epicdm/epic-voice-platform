"use client";

import { Input, Button } from "@heroui/react";
import { useState } from "react";

export function SipConfigTab() {
  const [sipUrl, setSipUrl] = useState("");
  const [sipUsername, setSipUsername] = useState("");
  const [sipPassword, setSipPassword] = useState("");

  const handleSave = () => {
    // TODO: Implement SIP config save
    console.log("Saving SIP config");
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">SIP Configuration</h3>
      <Input
        label="SIP URL"
        placeholder="sip.example.com"
        value={sipUrl}
        onChange={(e) => setSipUrl(e.target.value)}
      />
      <Input
        label="Username"
        value={sipUsername}
        onChange={(e) => setSipUsername(e.target.value)}
      />
      <Input
        label="Password"
        type="password"
        value={sipPassword}
        onChange={(e) => setSipPassword(e.target.value)}
      />
      <Button color="primary" onClick={handleSave}>
        Save Configuration
      </Button>
    </div>
  );
}
