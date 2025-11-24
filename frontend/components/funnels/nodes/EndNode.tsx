"use client";

import React, { memo } from "react";
import { Handle, Position } from "reactflow";
import { Card, CardBody } from "@heroui/react";

interface EndNodeData {
  label: string;
  config: Record<string, any>;
  node_type: string;
}

interface EndNodeProps {
  data: EndNodeData;
  selected?: boolean;
}

function EndNode({ data, selected }: EndNodeProps) {
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
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-xs font-semibold text-gray-700">
              {data.label}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            Funnel Complete
          </div>
        </CardBody>
      </Card>
      {/* End node has no output handle */}
    </>
  );
}

export default memo(EndNode);
