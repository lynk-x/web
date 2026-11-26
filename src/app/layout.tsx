import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { ToastProvider } from "@/components/ui/Toast";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AuthProvider } from "@/context/AuthContext";
import QueryProvider from "@/context/QueryProvider";

const inter = Inter({
  subsets: ["latin"],
  // Distinct variable name so theme.css's `--font-primary` cannot shadow next/font.
  variable: "--font-inter",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  // Distinct variable name so theme.css's `--font-heading` cannot shadow next/font.
  variable: "--font-inter-tight",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://lynk-x.app'),
  title: {
    template: '%s | Lynk-X',
    default: 'Lynk-X — The Ultimate Event App',
  },
  description: "The ultimate event app — create events, buy tickets and join event forums.",
  icons: {
    icon: "/lynk-x_logo.svg",
  },
  openGraph: {
    title: 'Lynk-X — The Ultimate Event App',
    description: "The ultimate event app — create events, buy tickets and join event forums.",
    url: 'https://lynk-x.app',
    siteName: 'Lynk-X',
    images: [
      {
        url: '/og-image.png?v=2',
        width: 1200,
        height: 630,
        alt: 'Lynk-X — The Ultimate Event App',
        type: 'image/png',
      },
    ],
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lynk-X — The Ultimate Event App',
    description: "The ultimate event app — create events, buy tickets and join event forums.",
    site: '@lynkxapp',
    creator: '@lynkxapp',
    images: ['/og-image.png?v=2'],
  },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

/**
 * Root application layout configuring fonts, global providers, telemetry and
 * site-wide Organization and WebSite structured data.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // schema.org structured data (JSON-LD). alternateName tells search engines
  // the site is also known by these short/spacing variants, since every
  // visible string on the site otherwise only ever says "Lynk-X" — search
  // engines don't reliably associate "lynk" or "lynk x" queries with a
  // hyphenated brand name without an explicit signal like this. Both are
  // genuine variants of the real name (not unrelated homophones like "Link
  // X"), so listing them here isn't keyword-stuffing.
  const brandAlternateNames = ['Lynk', 'Lynk X'];

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': 'https://lynk-x.app/#organization',
    name: 'Lynk-X',
    alternateName: brandAlternateNames,
    url: 'https://lynk-x.app',
    logo: 'https://lynk-x.app/lynk-x-combined-logo.png',
    sameAs: [
      'https://x.com/lynkxapp',
      'https://instagram.com/lynk_x.app',
      'https://www.producthunt.com/products/lynk-x',
    ],
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': 'https://lynk-x.app/#website',
    url: 'https://lynk-x.app',
    name: 'Lynk-X',
    alternateName: brandAlternateNames,
    description: 'Lynk-X is an all-in-one event discovery, ticketing and community forum platform.',
    publisher: {
      '@id': 'https://lynk-x.app/#organization',
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://lynk-x.app/?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <html lang="en-GB" className={`${inter.variable} ${interTight.variable}`} suppressHydrationWarning>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <QueryProvider>
          <AuthProvider>
            <CartProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </CartProvider>
          </AuthProvider>
        </QueryProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
