"use client";

import React, { memo } from "react";
import { Handle, Position } from "reactflow";
import { Card, CardBody } from "@heroui/react";

interface SmsNodeData {
  label: string;
  config: {
    template_id?: string;
    message?: string;
  };
  node_type: string;
}

interface SmsNodeProps {
  data: SmsNodeData;
  selected?: boolean;
}

function SmsNode({ data, selected }: SmsNodeProps) {
  const message = data.config?.message || "No message";
  const preview = message.length > 30 ? message.substring(0, 30) + "..." : message;

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
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="text-xs font-semibold text-gray-700">
              {data.label}
            </span>
          </div>
          <div className="text-xs text-gray-600 truncate">
            {preview}
          </div>
        </CardBody>
      </Card>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
}

export default memo(SmsNode);
