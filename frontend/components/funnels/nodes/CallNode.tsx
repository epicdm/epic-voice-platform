"use client";

import React, { memo } from "react";
import { Handle, Position } from "reactflow";
import { Card, CardBody } from "@heroui/react";

interface CallNodeData {
  label: string;
  config: {
    agent_config_id?: string;
    max_duration?: number;
  };
  node_type: string;
}

interface CallNodeProps {
  data: CallNodeData;
  selected?: boolean;
}

function CallNode({ data, selected }: CallNodeProps) {
  const maxDuration = data.config?.max_duration || 300;
  const displayDuration = `${Math.floor(maxDuration / 60)}min`;

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
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs font-semibold text-gray-700">
              {data.label}
            </span>
          </div>
          <div className="text-xs text-gray-600">
            Max: {displayDuration}
          </div>
        </CardBody>
      </Card>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
}

export default memo(CallNode);
