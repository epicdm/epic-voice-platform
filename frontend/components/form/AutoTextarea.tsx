"use client";

import { Textarea } from "@heroui/react";
import { ComponentProps } from "react";

export function AutoTextarea(props: ComponentProps<typeof Textarea>) {
  return <Textarea {...props} />;
}
