import type { Metadata } from "next";
import "./globals.css";
import "./fix-overlap.css";
import { Providers } from "./providers";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { AuthProvider } from "@/lib/auth-context";
import { NextAuthProvider } from "./session-provider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Epic.ai - AI Voice Agents Platform",
  description: "Create and manage AI voice agents for real conversations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono&display=swap" rel="stylesheet" />
      </head>
      <body style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
        <NextAuthProvider>
          <Providers>
            <LayoutWrapper>
              {children}
            </LayoutWrapper>
          </Providers>
        </NextAuthProvider>
        <div id="modal-root"></div>
        <Toaster 
          position="top-right" 
          richColors 
          expand 
          closeButton 
          duration={4000}
          toastOptions={{
            style: {
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              color: 'hsl(var(--foreground))',
            },
          }}
        />
      </body>
    </html>
  );
}
