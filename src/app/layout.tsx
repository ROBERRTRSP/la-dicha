import type { Metadata, Viewport } from "next";
import "./globals.css";

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
