import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk, Public_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import "./luma.css";
import { StoreProvider } from "@/lib/store";
import { REDISENO_LUMA } from "@/lib/flags";

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

// Rediseño Luma (tras flag): cifras y titulares en Bricolage, interfaz en
// Hanken. Sin preload: con el flag apagado no se descarga nada nuevo.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-luma-display",
  preload: false,
});

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-luma-ui",
  preload: false,
});

const FUENTES = REDISENO_LUMA
  ? `${sourceSerif.variable} ${publicSans.variable} ${bricolage.variable} ${hanken.variable}`
  : `${sourceSerif.variable} ${publicSans.variable}`;

export const metadata: Metadata = {
  title: "¿VALIÓ? · Obras públicas, costes y voto ciudadano",
  description:
    "Desliza y decide: ¿valió lo que costó? Demo con tarjetas de ejemplo; los datos reales llegan verificados con el método P0.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  applicationName: "¿VALIÓ?",
};

export const viewport: Viewport = {
  themeColor: REDISENO_LUMA ? "#0B0B10" : "#FFFFFF",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={FUENTES}
      data-luma={REDISENO_LUMA ? "" : undefined}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
