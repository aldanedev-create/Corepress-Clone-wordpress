// admin/src/types/post.types.ts

// Post status
export type PostStatus = 'draft' | 'published' | 'archived';

// Post interface
export interface Post {
  _id: string;
  title: string;
  slug: string;
  content: any; // Rich text content from TipTap
  excerpt: string;
  status: PostStatus;
  featuredImage: string;
  author: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  categories: Array<{
    _id: string;
    name: string;
    slug: string;
  }>;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  views: number;
  likes: number;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Post data for creation/update
export interface PostData {
  title: string;
  content: any;
  excerpt?: string;
  status: PostStatus;
  featuredImage?: string;
  categories: string[];
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
}

// Post filters for listing
export interface PostFilters {
  page?: number;
  limit?: number;
  status?: PostStatus | 'all';
  category?: string;
  author?: string;
  search?: string;
  tag?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Paginated response
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Post statistics
export interface PostStats {
  total: number;
  published: number;
  drafts: number;
  archived: number;
  views: number;
  likes: number;
  averageViews: number;
  averageLikes: number;
}

// Post analytics
export interface PostAnalytics {
  postId: string;
  title: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number;
  timeOnPage: number;
  bounceRate: number;
}

// Post activity
export interface PostActivity {
  _id: string;
  postId: string;
  action: 'created' | 'updated' | 'published' | 'unpublished' | 'archived' | 'deleted';
  userId: string;
  userName: string;
  timestamp: Date;
  details: string;
}

// Export post status labels
export const POST_STATUS_LABELS: Record<PostStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived'
};

// Export post status colors
export const POST_STATUS_COLORS: Record<PostStatus, string> = {
  draft: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  published: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  archived: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
};

// Check if post is published
export const isPostPublished = (post: Post): boolean => {
  return post.status === 'published';
};

// Check if post is draft
export const isPostDraft = (post: Post): boolean => {
  return post.status === 'draft';
};

// Check if post is archived
export const isPostArchived = (post: Post): boolean => {
  return post.status === 'archived';
};

// Get post reading time
export const getReadingTime = (post: Post): number => {
  const content = post.content?.text || '';
  const words = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
  return Math.ceil(words / 200);
};

// Get post excerpt
export const getPostExcerpt = (post: Post, maxLength: number = 200): string => {
  if (post.excerpt) return post.excerpt;
  
  const content = post.content?.text || '';
  const plainText = content.replace(/<[^>]*>/g, '');
  return plainText.length > maxLength 
    ? plainText.substring(0, maxLength) + '...' 
    : plainText;
};

// Get post URL
export const getPostUrl = (post: Post): string => {
  return `/blog/${post.slug}`;
};

// Get post edit URL
export const getPostEditUrl = (post: Post): string => {
  return `/posts/edit/${post._id}`;
};