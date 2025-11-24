"use client";

import React, { memo } from "react";
import { Handle, Position } from "reactflow";
import { Card, CardBody } from "@heroui/react";

interface ConditionNodeData {
  label: string;
  config: {
    field?: string;
    operator?: string;
    value?: string;
  };
  node_type: string;
}

interface ConditionNodeProps {
  data: ConditionNodeData;
  selected?: boolean;
}

function ConditionNode({ data, selected }: ConditionNodeProps) {
  const field = data.config?.field || "field";
  const operator = data.config?.operator || "equals";
  const value = data.config?.value || "value";

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
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="text-xs font-semibold text-gray-700">
              {data.label}
            </span>
          </div>
          <div className="text-xs text-gray-600 font-mono">
            {field} {operator} {value}
          </div>
        </CardBody>
      </Card>
      {/* Condition nodes can have two outputs (true/false) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        style={{ left: "30%" }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        style={{ left: "70%" }}
      />
    </>
  );
}

export default memo(ConditionNode);
