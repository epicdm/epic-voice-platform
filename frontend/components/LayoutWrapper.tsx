"use client";

import { ReactNode } from "react";

interface LayoutWrapperProps {
  children: ReactNode;
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  return <>{children}</>;
}
