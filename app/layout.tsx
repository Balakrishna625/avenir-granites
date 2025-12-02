import { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { MaskingProvider } from "@/contexts/MaskingContext";
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = { 
  title: "Granite Customer Dashboard" 
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
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
