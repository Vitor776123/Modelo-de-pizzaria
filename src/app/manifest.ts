import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pizzaria Modelo",
    short_name: "Pizzaria",
    description: "Peça sua pizza pelo celular e acompanhe o pedido.",
    start_url: "/",
    display: "standalone",
    background_color: "#14100d",
    theme_color: "#14100d",
    lang: "pt-BR",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
