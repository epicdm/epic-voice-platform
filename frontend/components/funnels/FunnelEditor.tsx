"use client";

import { ReactNode } from "react";

interface FunnelEditorProps {
  funnelId: string;
  children?: ReactNode;
}

export function FunnelEditor({ funnelId, children }: FunnelEditorProps) {
  return (
    <div className="w-full h-full">
      <div className="p-4 border rounded-lg">
        <h3 className="font-semibold mb-2">Funnel Editor</h3>
        <p className="text-sm text-gray-600">Funnel ID: {funnelId}</p>
        {children}
      </div>
    </div>
  );
}
