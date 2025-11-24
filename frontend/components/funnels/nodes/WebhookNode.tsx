"use client";

import React, { memo } from "react";
import { Handle, Position } from "reactflow";
import { Card, CardBody } from "@heroui/react";

interface WebhookNodeData {
  label: string;
  config: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
  };
  node_type: string;
}

interface WebhookNodeProps {
  data: WebhookNodeData;
  selected?: boolean;
}

function WebhookNode({ data, selected }: WebhookNodeProps) {
  const method = data.config?.method || "POST";
  const url = data.config?.url || "No URL";
  const displayUrl = url.length > 25 ? url.substring(0, 25) + "..." : url;

  return (
    <>
      <Handle type="target" position={Position.Top} />
      <Card
        className={`min-w-[180px] ${
          selected ? "ring-2 ring-blue-500" : ""
        }`}
      >
        <CardBody className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-xs font-semibold text-gray-700">
              {data.label}
            </span>
          </div>
          <div className="text-xs text-gray-600">
            <span className="font-mono font-semibold">{method}</span>
          </div>
          <div className="text-xs text-gray-500 truncate">
            {displayUrl}
          </div>
        </CardBody>
      </Card>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
}

export default memo(WebhookNode);
