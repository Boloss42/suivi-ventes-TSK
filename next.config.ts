import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Les Server Actions reçoivent aussi les photos de véhicules (multipart),
    // la limite par défaut de 1 Mo est trop basse pour des photos.
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
