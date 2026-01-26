import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CodeComp - Coding Competition Platform",
  description: "Create and participate in coding competitions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
