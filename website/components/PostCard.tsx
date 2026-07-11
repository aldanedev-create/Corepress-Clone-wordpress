// website/components/PostCard.tsx
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, User, Clock, Eye } from 'lucide-react';

interface PostCardProps {
  post: any;
  featured?: boolean;
}

export function PostCard({ post, featured = false }: PostCardProps) {
  const readingTime = post.readingTime?.text || '3 min read';

  return (
    <article
      className={`group bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all ${
        featured ? 'md:col-span-2' : ''
      }`}
    >
      {/* Featured Image */}
      {post.featuredImage && (
        <Link href={`/blog/${post.slug}`} className="block overflow-hidden">
          <div className="relative aspect-video bg-gray-100 dark:bg-gray-700">
            <img
              src={post.featuredImage}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        </Link>
      )}

      <div className="p-5">
        {/* Categories */}
        {post.categories && post.categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {post.categories.slice(0, 2).map((category: any) => (
              <Link
                key={category._id}
                href={`/blog?category=${category.slug}`}
                className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
              >
                {category.name}
              </Link>
            ))}
            {post.categories.length > 2 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                +{post.categories.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Title */}
        <h3
          className={`font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors ${
            featured ? 'text-2xl' : 'text-xl'
          }`}
        >
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </h3>

        {/* Excerpt */}
        <p className="mt-2 text-gray-600 dark:text-gray-400 line-clamp-2">
          {post.excerpt}
        </p>

        {/* Meta */}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <User className="w-4 h-4" />
            {post.author?.name || 'Unknown'}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {new Date(post.publishedAt || post.createdAt).toLocaleDateString(
              'en-US',
              {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              }
            )}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {readingTime}
          </span>
          {post.views > 0 && (
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {post.views}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}