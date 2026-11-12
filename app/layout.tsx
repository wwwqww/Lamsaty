import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lamsaty — votre carte de visite digitale",
  description: "Une carte de visite numérique, accessible par NFC et QR code.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
