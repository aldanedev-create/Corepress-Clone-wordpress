// website/app/[slug]/page.tsx
import { getPageBySlug, getSettings } from '@/lib/api';
import { SEO } from '@/components/SEO';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

interface PageProps {
  params: {
    slug: string;
  };
}

export const revalidate = 3600; // Revalidate every hour

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const page = await getPageBySlug(params.slug);
  
  if (!page) {
    return {
      title: 'Page Not Found',
    };
  }

  const settings = await getSettings();
  const title = page.seoTitle || page.title;
  const description = page.seoDescription || '';

  return {
    title: `${title} | ${settings.siteName || 'CorePress CMS'}`,
    description,
    openGraph: {
      title: title,
      description: description,
      url: `${settings.siteUrl}/${page.slug}`,
      type: 'website',
    },
    alternates: {
      canonical: `${settings.siteUrl}/${page.slug}`,
    },
  };
}

export default async function Page({ params }: PageProps) {
  const [page, settings] = await Promise.all([
    getPageBySlug(params.slug),
    getSettings(),
  ]);

  if (!page) {
    notFound();
  }

  return (
    <>
      <SEO page={page} settings={settings} />

      <div className="min-h-screen py-12">
        <div className="container max-w-4xl">
          {/* Page Header */}
          <header className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{page.title}</h1>
          </header>

          {/* Page Content */}
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <div dangerouslySetInnerHTML={{ __html: page.content }} />
          </div>
        </div>
      </div>
    </>
  );
}

// Generate static paths for all pages at build time
export async function generateStaticParams() {
  const pages = await getPages({ status: 'published' });
  
  return pages
    .filter((page) => !page.isHomepage)
    .map((page) => ({
      slug: page.slug,
    }));
}