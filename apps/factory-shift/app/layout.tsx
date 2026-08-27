import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./apex-shell.css";

export const metadata: Metadata = {
  title: "RiskMulate | Factory Shift",
  description: "A playable first-person operational risk simulation built around evidence, trade-offs, treatment, and residual risk.",
  applicationName: "RiskMulate",
  keywords: ["risk management", "factory simulation", "ISO 31000", "training game"],
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "RiskMulate | Factory Shift",
    description: "Inspect a failing process pump, reconcile conflicting evidence, and defend an operational response.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#071011",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
