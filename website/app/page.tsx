// website/app/page.tsx
import { getPosts, getSettings, getCategories } from '@/lib/api';
import { PostCard } from '@/components/PostCard';
import { HeroSection } from '@/components/HeroSection';
import { FeaturedPosts } from '@/components/FeaturedPosts';
import { CategoryGrid } from '@/components/CategoryGrid';
import { Newsletter } from '@/components/Newsletter';
import { Metadata } from 'next';

export const revalidate = 3600; // Revalidate every hour

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: settings.siteName || 'CorePress CMS',
    description: settings.siteDescription || 'Modern Headless Content Management System',
  };
}

export default async function HomePage() {
  const [settings, posts, categories] = await Promise.all([
    getSettings(),
    getPosts({ limit: 6, status: 'published' }),
    getCategories(),
  ]);

  const featuredPosts = posts.filter((post) => post.featuredImage);
  const regularPosts = posts.filter((post) => !post.featuredImage);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <HeroSection settings={settings} />

      {/* Featured Posts */}
      {featuredPosts.length > 0 && (
        <section className="py-12 bg-gray-50 dark:bg-gray-800/50">
          <div className="container">
            <h2 className="text-3xl font-bold mb-8">Featured Posts</h2>
            <FeaturedPosts posts={featuredPosts} />
          </div>
        </section>
      )}

      {/* Recent Posts */}
      <section className="py-12">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold">Recent Posts</h2>
            <a
              href="/blog"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              View all →
            </a>
          </div>

          {regularPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularPosts.map((post) => (
                <PostCard key={post._id} post={post} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No posts published yet. Check back soon!
            </div>
          )}
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="py-12 bg-gray-50 dark:bg-gray-800/50">
          <div className="container">
            <h2 className="text-3xl font-bold mb-8">Categories</h2>
            <CategoryGrid categories={categories} />
          </div>
        </section>
      )}

      {/* Newsletter */}
      <Newsletter settings={settings} />
    </div>
  );
}