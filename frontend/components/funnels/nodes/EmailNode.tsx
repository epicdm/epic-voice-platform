"use client";

import React, { memo } from "react";
import { Handle, Position } from "reactflow";
import { Card, CardBody } from "@heroui/react";

interface EmailNodeData {
  label: string;
  config: {
    template_id?: string;
    subject?: string;
    body?: string;
  };
  node_type: string;
}

interface EmailNodeProps {
  data: EmailNodeData;
  selected?: boolean;
}

function EmailNode({ data, selected }: EmailNodeProps) {
  const subject = data.config?.subject || "No subject";

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
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-xs font-semibold text-gray-700">
              {data.label}
            </span>
          </div>
          <div className="text-xs text-gray-600 truncate">
            {subject}
          </div>
        </CardBody>
      </Card>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
}

export default memo(EmailNode);
