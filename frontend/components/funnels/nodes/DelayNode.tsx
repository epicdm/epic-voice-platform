"use client";

import React, { memo } from "react";
import { Handle, Position } from "reactflow";
import { Card, CardBody } from "@heroui/react";

interface DelayNodeData {
  label: string;
  config: {
    duration?: number;
  };
  node_type: string;
}

interface DelayNodeProps {
  data: DelayNodeData;
  selected?: boolean;
}

function DelayNode({ data, selected }: DelayNodeProps) {
  const duration = data.config?.duration || 0;
  const displayDuration =
    duration < 60
      ? `${duration}s`
      : duration < 3600
      ? `${Math.floor(duration / 60)}m`
      : `${Math.floor(duration / 3600)}h`;

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
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="text-xs font-semibold text-gray-700">
              {data.label}
            </span>
          </div>
          <div className="text-lg font-bold text-yellow-600">
            {displayDuration}
          </div>
        </CardBody>
      </Card>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
}

export default memo(DelayNode);
