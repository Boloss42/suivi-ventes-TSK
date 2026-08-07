import type { Metadata } from "next";
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
  title: "Mon suivi perso — Suivi des ventes",
  description: "Suivi des annonces et statistiques de vente de véhicules en dépôt-vente",
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
