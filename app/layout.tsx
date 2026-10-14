import type { Metadata, Viewport } from "next";
import { Public_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";

// Titulares: serif con carácter (periodismo de datos). Datos: Public Sans,
// neutra y con cifras tabulares (ISSUE-39).
const sourceSerif = Source_Serif_4({
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
  themeColor: "#FFFFFF",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${sourceSerif.variable} ${publicSans.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
