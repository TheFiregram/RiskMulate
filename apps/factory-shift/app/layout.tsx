import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Factory Shift",
  description: "A first-person factory decision simulation.",
  icons: { icon: "/favicon.svg" },
  other: { "codex-preview": "development" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
