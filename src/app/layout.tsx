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
    default: 'The Ultimate Event App',
  },
  description: "Experience the ultimate event app designed for seamless event interactions.",
  icons: {
    icon: "/lynk-x_logo.svg",
  },
  openGraph: {
    title: 'The Ultimate Event App',
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
    title: 'The Ultimate Event App',
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
  // Define schema.org WebSite structured data (JSON-LD)
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': 'https://lynk-x.app',
    'url': 'https://lynk-x.app',
    'name': 'Lynk-X',
    'description': 'Experience the ultimate event app designed for seamless event interactions.',
    // TODO: Link Organization metadata once company entity details are finalized
    /*
    'publisher': {
      '@type': 'Organization',
      '@id': 'https://lynk-x.app/#organization',
      'name': 'Lynk-X',
      'logo': 'https://lynk-x.app/lynk-x-combined-logo.png',
    }
    */
  };

  return (
    <html lang="en-GB" className={`${inter.variable} ${interTight.variable}`} suppressHydrationWarning>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
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
