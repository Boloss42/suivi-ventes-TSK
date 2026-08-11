import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Inter était déclarée dans le thème mais jamais chargée : on l'importe pour de
// bon (variable CSS reprise par --font-sans dans globals.css).
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MyVitrine — Suivi des ventes",
  description: "Suivi des annonces et statistiques de vente de véhicules en dépôt-vente",
};

// Échelle 1 sur mobile : sans ça, la page peut s'afficher dézoomée et devenir
// illisible. `initialScale: 1` + inputs ≥ 16px (voir formulaires) évitent aussi
// le zoom automatique d'iOS au focus des champs.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
