import type { Metadata, Viewport } from "next";
import { Archivo_Black, Public_Sans } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";

const archivo = Archivo_Black({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "¿VALIÓ? · Obras públicas, costes y voto ciudadano",
  description:
    "Desliza y decide: ¿valió lo que costó? Demo con tarjetas de ejemplo; los datos reales llegan verificados con el método P0.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  applicationName: "¿VALIÓ?",
};

export const viewport: Viewport = {
  themeColor: "#102A43",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${archivo.variable} ${publicSans.variable}`}>
      <body>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
