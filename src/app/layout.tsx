import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces/wght.css";
import "@fontsource-variable/hanken-grotesk/wght.css";
import "./globals.css";

const site = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata: Metadata = {
  metadataBase: site ? new URL(site) : undefined,
  title: { default: "Pizzaria Modelo — peça pelo celular", template: "%s · Pizzaria Modelo" },
  description: "Veja as pizzas de pertinho, monte o pedido e acompanhe até a sua porta.",
  applicationName: "Pizzaria Modelo",
  appleWebApp: { capable: true, title: "Pizzaria Modelo", statusBarStyle: "black-translucent" },
  icons: { apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = { themeColor: "#14100d", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
