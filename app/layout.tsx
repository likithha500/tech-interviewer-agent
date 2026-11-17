
import "./globals.css";
import type { ReactNode } from "react";

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-white antialiased">
      <body className="min-h-screen bg-gray-50 text-gray-800">
        {children}
      </body>
    </html>
  );
}
