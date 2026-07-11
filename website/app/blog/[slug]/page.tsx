// website/app/blog/[slug]/page.tsx
import { getPostBySlug, getRelatedPosts, getSettings } from '@/lib/api';
import { SEO } from '@/components/SEO';
import { PostContent } from '@/components/PostContent';
import { AuthorBio } from '@/components/AuthorBio';
import { RelatedPosts } from '@/components/RelatedPosts';
import { Comments } from '@/components/Comments';
import { ShareButtons } from '@/components/ShareButtons';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

interface PostPageProps {
  params: {
    slug: string;
  };
}

export const revalidate = 3600; // Revalidate every hour

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const post = await getPostBySlug(params.slug);
  
  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }

  const settings = await getSettings();
  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt || '';

  return {
    title: `${title} | ${settings.siteName || 'CorePress CMS'}`,
    description,
    openGraph: {
      title: title,
      description: description,
      url: `${settings.siteUrl}/blog/${post.slug}`,
      type: 'article',
      publishedTime: post.publishedAt || post.createdAt,
      modifiedTime: post.updatedAt,
      authors: [post.author.name],
      tags: post.tags,
      images: post.featuredImage ? [post.featuredImage] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      images: post.featuredImage ? [post.featuredImage] : [],
    },
    alternates: {
      canonical: `${settings.siteUrl}/blog/${post.slug}`,
    },
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const [post, settings] = await Promise.all([
    getPostBySlug(params.slug),
    getSettings(),
  ]);

  if (!post) {
    notFound();
  }

  const relatedPosts = await getRelatedPosts(post._id);

  return (
    <>
      {/* SEO Component for additional meta tags */}
      <SEO post={post} settings={settings} />

      <article className="min-h-screen py-12">
        <div className="container max-w-4xl">
          {/* Post Header */}
          <header className="mb-8">
            {/* Categories */}
            {post.categories && post.categories.length > 0 && (
              <div className="flex gap-2 mb-4">
                {post.categories.map((category) => (
                  <a
                    key={category._id}
                    href={`/blog?category=${category.slug}`}
                    className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    {category.name}
                  </a>
                ))}
              </div>
            )}

            <h1 className="text-4xl md:text-5xl font-bold mb-4">{post.title}</h1>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 text-gray-600 dark:text-gray-400 text-sm">
              <span>
                By{' '}
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {post.author.name}
                </span>
              </span>
              <span>•</span>
              <time dateTime={post.publishedAt || post.createdAt}>
                {new Date(post.publishedAt || post.createdAt).toLocaleDateString(
                  'en-US',
                  {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  }
                )}
              </time>
              <span>•</span>
              <span>{post.readingTime?.text || '3 min read'}</span>
              <span>•</span>
              <span>{post.views || 0} views</span>
            </div>

            {/* Featured Image */}
            {post.featuredImage && (
              <div className="mt-6 rounded-xl overflow-hidden">
                <img
                  src={post.featuredImage}
                  alt={post.title}
                  className="w-full h-auto object-cover"
                />
              </div>
            )}
          </header>

          {/* Share Buttons */}
          <div className="mb-8">
            <ShareButtons
              url={`${settings.siteUrl}/blog/${post.slug}`}
              title={post.title}
            />
          </div>

          {/* Post Content */}
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <PostContent content={post.content} />
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <a
                  key={tag}
                  href={`/blog?tag=${tag}`}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  #{tag}
                </a>
              ))}
            </div>
          )}

          {/* Author Bio */}
          <div className="mt-8">
            <AuthorBio author={post.author} />
          </div>

          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <div className="mt-12">
              <RelatedPosts posts={relatedPosts} />
            </div>
          )}

          {/* Comments */}
          {settings.enableComments && (
            <div className="mt-12">
              <Comments postId={post._id} />
            </div>
          )}
        </div>
      </article>
    </>
  );
}

// Generate static paths for all posts at build time
export async function generateStaticParams() {
  const posts = await getPosts({ limit: 100, status: 'published' });
  
  return posts.data.map((post) => ({
    slug: post.slug,
  }));
}