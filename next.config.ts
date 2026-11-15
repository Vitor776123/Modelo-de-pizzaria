import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Permite abrir o site em desenvolvimento pelo celular, na mesma rede Wi-Fi (ex.: http://192.168.15.6:3000).
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
  partialPrefetching: true,
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
