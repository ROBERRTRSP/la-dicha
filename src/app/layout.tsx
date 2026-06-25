import type { Metadata, Viewport } from "next";
import "./globals.css";
import "../styles/casino.css";
import "../styles/slot-magic-lamp.css";
import "../styles/slot-mobile.css";
import "../styles/slot-golden-ox.css";
import "../styles/slot-skunk.css";
import "../styles/slot-wolf.css";
import "../styles/slot-layout.css";
import "../styles/slot-layout.css";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://consorciobelendejudea.com";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: "La Dicha — Suerte clara. Jugada segura.",
  description: "Juega lotería dominicana desde tu celular.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "La Dicha" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#1e3a5f",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
