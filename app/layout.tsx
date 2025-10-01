import { ReactNode } from "react";
export const metadata = { title: "Granite Customer Dashboard" };

import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        {children}
      </body>
    </html>
  );
}
