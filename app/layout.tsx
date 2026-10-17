import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import "./luma.css";
import { StoreProvider } from "@/lib/store";

// Cifras y titulares en Bricolage; interfaz en Hanken.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
});

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "¿VALIÓ? · Obras públicas, costes y voto ciudadano",
  description:
    "Las obras que paga tu ayuntamiento, con sus datos oficiales. Desliza y decide si valió lo que costó.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  applicationName: "¿VALIÓ?",
};

export const viewport: Viewport = {
  themeColor: "#0B0B10",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${bricolage.variable} ${hanken.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
