import { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { MaskingProvider } from "@/contexts/MaskingContext";
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = { 
  title: "Avenir Granites",
  description: "Granite Ledger & Production Management System",
  applicationName: "Avenir Granites",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Avenir Granites",
  },
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#1e40af',
};

import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Avenir Granites" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-gray-50">
        <MaskingProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </MaskingProvider>
      </body>
    </html>
  );
}
