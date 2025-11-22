"use client";

import { useState } from "react";
import { Button } from "@heroui/react";

export default function EmbedCodeGenerator() {
  const [embedCode] = useState('<script src="https://example.com/embed.js"></script>');

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Embed Code</h3>
      <pre className="p-4 bg-gray-100 dark:bg-gray-800 rounded overflow-x-auto text-xs">
        {embedCode}
      </pre>
      <Button onClick={handleCopy}>Copy Code</Button>
    </div>
  );
}
