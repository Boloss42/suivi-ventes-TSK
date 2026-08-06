import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Désactive l'optimisation à la volée (dépend du binaire natif `sharp`,
    // peu fiable en auto-hébergement selon l'environnement du conteneur —
    // c'est ce qui empêchait les photos de s'afficher en production).
    // Sans impact réel ici : les photos de véhicules ne sont pas énormes.
    unoptimized: true,
  },
  experimental: {
    // Les Server Actions reçoivent aussi les photos de véhicules (multipart),
    // la limite par défaut de 1 Mo est trop basse pour des photos.
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
