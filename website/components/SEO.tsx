// website/components/SEO.tsx
import Head from 'next/head';
import Script from 'next/script';

interface SEOProps {
  post?: any;
  page?: any;
  settings?: any;
}

export function SEO({ post, page, settings }: SEOProps) {
  const siteName = settings?.siteName || 'CorePress CMS';
  const siteUrl = settings?.siteUrl || 'https://corepress-cms.com';
  
  const title = post?.seoTitle || post?.title || page?.seoTitle || page?.title || siteName;
  const description = post?.seoDescription || post?.excerpt || page?.seoDescription || settings?.siteDescription || '';
  const image = post?.featuredImage || page?.featuredImage || settings?.siteLogo || '/og-image.png';
  const url = post?.slug ? `${siteUrl}/blog/${post.slug}` : page?.slug ? `${siteUrl}/${page.slug}` : siteUrl;

  const jsonLd = post
    ? {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: title,
        description: description,
        image: image,
        datePublished: post.publishedAt || post.createdAt,
        dateModified: post.updatedAt,
        author: {
          '@type': 'Person',
          name: post.author?.name || 'Unknown',
        },
        publisher: {
          '@type': 'Organization',
          name: siteName,
          logo: {
            '@type': 'ImageObject',
            url: settings?.siteLogo || '/logo.png',
          },
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': url,
        },
      }
    : page
    ? {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: title,
        description: description,
        url: url,
        isPartOf: {
          '@type': 'WebSite',
          name: siteName,
        },
      }
    : {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: siteName,
        description: description,
        url: siteUrl,
      };

  return (
    <>
      <Head>
        {/* Basic Meta Tags */}
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={url} />

        {/* Open Graph */}
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={image} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content={post ? 'article' : 'website'} />
        <meta property="og:site_name" content={siteName} />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={image} />

        {/* Additional Meta Tags */}
        {post && (
          <>
            <meta property="article:published_time" content={post.publishedAt || post.createdAt} />
            <meta property="article:modified_time" content={post.updatedAt} />
            {post.author?.name && (
              <meta property="article:author" content={post.author.name} />
            )}
            {post.tags && post.tags.map((tag: string) => (
              <meta key={tag} property="article:tag" content={tag} />
            ))}
          </>
        )}

        {/* JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        {/* Additional SEO scripts */}
        {settings?.googleSiteVerification && (
          <meta name="google-site-verification" content={settings.googleSiteVerification} />
        )}
        {settings?.analyticsId && (
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
      </Head>
    </>
  );
}