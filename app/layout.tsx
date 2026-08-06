import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
