// website/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Providers } from './providers';
import { Analytics } from '@/components/Analytics';
import { getSettings } from '@/lib/api';

// Font configurations
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

// Generate metadata dynamically from settings
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  
  return {
    metadataBase: new URL(settings.siteUrl || 'https://corepress-cms.com'),
    title: {
      template: `%s | ${settings.siteName || 'CorePress CMS'}`,
      default: settings.siteName || 'CorePress CMS',
    },
    description: settings.siteDescription || 'Modern Headless Content Management System',
    keywords: ['CMS', 'Content Management', 'Blog', 'CorePress'],
    authors: [{ name: 'CorePress Team' }],
    creator: 'CorePress CMS',
    publisher: 'CorePress CMS',
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      title: settings.siteName || 'CorePress CMS',
      description: settings.siteDescription || 'Modern Headless Content Management System',
      url: settings.siteUrl || 'https://corepress-cms.com',
      siteName: settings.siteName || 'CorePress CMS',
      locale: 'en_US',
      type: 'website',
      images: [
        {
          url: settings.siteLogo || '/og-image.png',
          width: 1200,
          height: 630,
          alt: settings.siteName || 'CorePress CMS',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: settings.siteName || 'CorePress CMS',
      description: settings.siteDescription || 'Modern Headless Content Management System',
      images: [settings.siteLogo || '/og-image.png'],
    },
    alternates: {
      canonical: settings.siteUrl || 'https://corepress-cms.com',
    },
    verification: {
      google: settings.googleSiteVerification || '',
    },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default async function RootLayout({ children }: RootLayoutProps) {
  const settings = await getSettings();

  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Google Analytics */}
        {settings.analyticsId && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${settings.analyticsId}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${settings.analyticsId}');
                `,
              }}
            />
          </>
        )}
        
        {/* Custom Head Code */}
        {settings.customHead && (
          <dangerouslySetInnerHTML={{ __html: settings.customHead }} />
        )}
        
        {/* DNS Prefetch */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
        
        {/* Preconnect */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 antialiased">
        <Providers>
          <div className="flex flex-col min-h-screen">
            <Header settings={settings} />
            <main className="flex-1">{children}</main>
            <Footer settings={settings} />
          </div>
          <Analytics settings={settings} />
        </Providers>
      </body>
    </html>
  );
}