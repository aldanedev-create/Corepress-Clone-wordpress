// website/app/blog/page.tsx
import { getPosts, getCategories, getSettings } from '@/lib/api';
import { PostCard } from '@/components/PostCard';
import { Pagination } from '@/components/Pagination';
import { CategoryFilter } from '@/components/CategoryFilter';
import { SearchBar } from '@/components/SearchBar';
import { Metadata } from 'next';

interface BlogPageProps {
  searchParams: {
    page?: string;
    category?: string;
    tag?: string;
    search?: string;
  };
}

export const revalidate = 3600; // Revalidate every hour

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: `Blog | ${settings.siteName || 'CorePress CMS'}`,
    description: `Latest blog posts from ${settings.siteName || 'CorePress CMS'}`,
  };
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const page = parseInt(searchParams.page || '1', 10);
  const limit = 9;
  const category = searchParams.category;
  const tag = searchParams.tag;
  const search = searchParams.search;

  const [postsData, categories, settings] = await Promise.all([
    getPosts({
      page,
      limit,
      status: 'published',
      category,
      tag,
      search,
    }),
    getCategories(),
    getSettings(),
  ]);

  const { data: posts, pagination } = postsData;

  return (
    <div className="min-h-screen py-12">
      <div className="container">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Blog</h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Latest articles, tutorials, and insights
          </p>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1">
            <SearchBar initialValue={search} />
          </div>
          <div className="flex gap-2">
            <CategoryFilter
              categories={categories}
              selectedCategory={category}
            />
          </div>
        </div>

        {/* Posts Grid */}
        {posts.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <PostCard key={post._id} post={post} />
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-8">
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  basePath="/blog"
                  queryParams={{
                    category,
                    tag,
                    search,
                  }}
                />
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold mb-2">No posts found</h3>
            <p className="text-gray-500 dark:text-gray-400">
              Try adjusting your search or filter to find what you're looking for.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}