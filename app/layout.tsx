import { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { MaskingProvider } from "@/contexts/MaskingContext";
export const metadata = { title: "Granite Customer Dashboard" };

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
