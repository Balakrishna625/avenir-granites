import { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";
export const metadata = { title: "Granite Customer Dashboard" };

import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
