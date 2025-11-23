"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

interface LayoutWrapperProps {
  children: ReactNode;
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const pathname = usePathname();

  // Show sidebar for all dashboard routes except auth pages
  const showSidebar = pathname?.startsWith("/dashboard") &&
                      !pathname.startsWith("/auth");

  if (showSidebar) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    );
  }

  return <>{children}</>;
}
