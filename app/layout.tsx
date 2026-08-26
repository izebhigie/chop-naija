import type { Metadata } from "next";
import { DM_Serif_Display, Manrope, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { siteUrl, isIndexable } from "@/lib/site";

/**
 * Three faces, three jobs. DM Serif Display carries the headlines, Manrope
 * does all the reading, and IBM Plex Mono handles the data — coordinates,
 * times, counts — which is the voice that runs through the whole app.
 */
const display = DM_Serif_Display({
  variable: "--font-dm-serif",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

const body = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const mono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  alternates: { canonical: "/" },
  title: {
    default: "WorldPlates — Discover the world, one dish at a time",
    template: "%s · WorldPlates",
  },
  description:
    "Authentic recipes from countries around the world, with the city each dish comes from, ingredients that scale to your table, and steps written to be cooked from.",
  openGraph: {
    type: "website",
    siteName: "WorldPlates",
    title: "WorldPlates — Discover the world, one dish at a time",
    description:
      "Authentic recipes from countries around the world, with ingredients that scale and steps written to be cooked from.",
  },
  twitter: {
    card: "summary_large_image",
    title: "WorldPlates — Discover the world, one dish at a time",
    description:
      "Authentic recipes from countries around the world, with ingredients that scale and steps written to be cooked from.",
  },
  robots: { index: isIndexable, follow: isIndexable },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // Next 16 no longer overrides smooth scrolling on navigation unless asked.
      data-scroll-behavior="smooth"
      className={`${display.variable} ${body.variable} ${mono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <Header />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
