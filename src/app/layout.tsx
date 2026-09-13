import type { Metadata } from "next";
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
  variable: "--font-primary",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://lynk-x.app'),
  title: {
    template: '%s',
    default: 'Lynk-x — The Ultimate Event App',
  },
  description: "Experience the ultimate event app designed for seamless event interactions.",
  keywords: ['Lynk-X', 'Lynk X', 'Lynk', 'events app', 'event tickets', 'event discovery','event interactions', 'local events'],
  icons: {
    icon: "/lynk-x_logo.svg",
  },
  openGraph: {
    title: 'Lynk-x — The Ultimate Event App',
    description: "Experience the ultimate event app designed for seamless event interactions.",
    url: 'https://lynk-x.app',
    siteName: 'Lynk-X',
    images: [
      {
        url: '/lynk-x-combined-logo.png',
        width: 1200,
        height: 630,
        alt: 'Lynk-X Logo',
      },
    ],
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lynk-X — The Ultimate Event App',
    description: "Experience the ultimate event app designed for seamless event interactions.",
    images: ['/lynk-x-combined-logo.png'],
  },
};

export const viewport = {
  themeColor: '#000000',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

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
    'name': 'Lynk-X',
    'alternateName': brandAlternateNames,
    'url': 'https://lynk-x.app',
    'logo': 'https://lynk-x.app/lynk-x-combined-logo.png',
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': 'https://lynk-x.app',
    'url': 'https://lynk-x.app',
    'name': 'Lynk-X',
    'alternateName': brandAlternateNames,
    'description': 'Lynk-X (Lynk x) is the ultimate event app designed for seamless event interactions.',
    'publisher': {
      '@id': 'https://lynk-x.app/#organization',
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
