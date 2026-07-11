// website/lib/api.ts
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  errors?: any[];
  timestamp: string;
  statusCode: number;
}

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

// Post Types
export interface Post {
  _id: string;
  title: string;
  slug: string;
  content: any;
  excerpt: string;
  status: 'draft' | 'published' | 'archived';
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
  readingTime?: {
    minutes: number;
    text: string;
  };
}

export interface Page {
  _id: string;
  title: string;
  slug: string;
  content: string;
  status: 'draft' | 'published';
  seoTitle: string;
  seoDescription: string;
  template: string;
  isHomepage: boolean;
  isPrivacyPolicy: boolean;
  isTermsOfService: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  parentCategory: string | null;
  postCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Media {
  _id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  altText: string;
  width?: number;
  height?: number;
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: Date;
}

export interface Settings {
  siteName: string;
  siteDescription: string;
  siteLogo: string;
  siteFavicon: string;
  siteUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  footerText: string;
  navigationMenu: Array<{
    id: string;
    label: string;
    url: string;
    order: number;
    target?: '_blank' | '_self';
    icon?: string;
    children?: any[];
  }>;
  homePageLayout: 'grid' | 'list' | 'masonry';
  postsPerPage: number;
  analyticsId: string;
  googleSiteVerification: string;
  facebookPixelId: string;
  twitterHandle: string;
  facebookUrl: string;
  twitterUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  linkedinUrl: string;
  githubUrl: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  timeZone: string;
  dateFormat: string;
  timeFormat: string;
  enableComments: boolean;
  enableGdpr: boolean;
  enableAnalytics: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  customCss: string;
  customJs: string;
  customHead: string;
  customFooter: string;
}

// API Client Configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add cache control for static generation
    if (config.method === 'get') {
      config.headers['Cache-Control'] = 'no-cache';
    }
    return config;
  },
  (error) => {
    console.error('API request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 404) {
      // Handle 404 errors gracefully
      return Promise.reject({ ...error, is404: true });
    }
    if (error.response?.status === 500) {
      console.error('Server error:', error.response?.data);
    }
    return Promise.reject(error);
  }
);

// Generic API request function
async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> {
  try {
    const response = await apiClient.request<ApiResponse<T>>({
      method,
      url,
      data,
      ...config,
    });
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'API request failed');
    }
    
    return response.data.data;
  } catch (error: any) {
    if (error.is404) {
      throw error;
    }
    console.error(`API ${method} ${url} error:`, error);
    throw error;
  }
}

// Post API
export async function getPosts(params: {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  author?: string;
  search?: string;
  tag?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
} = {}): Promise<PaginatedResponse<Post>> {
  const queryParams = new URLSearchParams();
  
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.status) queryParams.append('status', params.status);
  if (params.category) queryParams.append('category', params.category);
  if (params.author) queryParams.append('author', params.author);
  if (params.search) queryParams.append('search', params.search);
  if (params.tag) queryParams.append('tag', params.tag);
  if (params.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
  
  const url = `/posts?${queryParams.toString()}`;
  return apiRequest<PaginatedResponse<Post>>('GET', url);
}

export async function getPostBySlug(slug: string): Promise<Post> {
  return apiRequest<Post>('GET', `/posts/slug/${slug}`);
}

export async function getPostById(id: string): Promise<Post> {
  return apiRequest<Post>('GET', `/posts/${id}`);
}

export async function getRelatedPosts(id: string, limit: number = 3): Promise<Post[]> {
  return apiRequest<Post[]>('GET', `/posts/${id}/related`, undefined, {
    params: { limit }
  });
}

// Page API
export async function getPages(params: {
  status?: string;
  search?: string;
} = {}): Promise<Page[]> {
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.append('status', params.status);
  if (params.search) queryParams.append('search', params.search);
  
  const url = `/pages?${queryParams.toString()}`;
  return apiRequest<Page[]>('GET', url);
}

export async function getPageBySlug(slug: string): Promise<Page> {
  return apiRequest<Page>('GET', `/pages/slug/${slug}`);
}

export async function getPageById(id: string): Promise<Page> {
  return apiRequest<Page>('GET', `/pages/${id}`);
}

// Category API
export async function getCategories(): Promise<Category[]> {
  return apiRequest<Category[]>('GET', '/categories');
}

export async function getCategoryBySlug(slug: string): Promise<Category & { posts: Post[]; postCount: number }> {
  return apiRequest<Category & { posts: Post[]; postCount: number }>('GET', `/categories/slug/${slug}`);
}

export async function getCategoryById(id: string): Promise<Category> {
  return apiRequest<Category>('GET', `/categories/${id}`);
}

// Media API
export async function getMedia(params: {
  page?: number;
  limit?: number;
  fileType?: string;
  search?: string;
} = {}): Promise<PaginatedResponse<Media>> {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.fileType) queryParams.append('fileType', params.fileType);
  if (params.search) queryParams.append('search', params.search);
  
  const url = `/media?${queryParams.toString()}`;
  return apiRequest<PaginatedResponse<Media>>('GET', url);
}

// Settings API
export async function getSettings(): Promise<Settings> {
  try {
    return await apiRequest<Settings>('GET', '/settings');
  } catch (error) {
    // Return default settings if API fails
    console.warn('Failed to fetch settings, using defaults:', error);
    return {
      siteName: 'CorePress CMS',
      siteDescription: 'Modern Headless Content Management System',
      siteLogo: '',
      siteFavicon: '',
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      primaryColor: '#2563eb',
      secondaryColor: '#64748b',
      accentColor: '#8b5cf6',
      footerText: `© ${new Date().getFullYear()} CorePress CMS. All rights reserved.`,
      navigationMenu: [
        { id: 'home', label: 'Home', url: '/', order: 0 },
        { id: 'blog', label: 'Blog', url: '/blog', order: 1 },
        { id: 'about', label: 'About', url: '/about', order: 2 },
        { id: 'contact', label: 'Contact', url: '/contact', order: 3 },
      ],
      homePageLayout: 'grid',
      postsPerPage: 10,
      analyticsId: '',
      googleSiteVerification: '',
      facebookPixelId: '',
      twitterHandle: '',
      facebookUrl: '',
      twitterUrl: '',
      instagramUrl: '',
      youtubeUrl: '',
      linkedinUrl: '',
      githubUrl: '',
      contactEmail: '',
      contactPhone: '',
      contactAddress: '',
      timeZone: 'UTC',
      dateFormat: 'MMM DD, YYYY',
      timeFormat: 'HH:mm',
      enableComments: true,
      enableGdpr: false,
      enableAnalytics: true,
      maintenanceMode: false,
      maintenanceMessage: 'We are currently performing maintenance. Please check back soon.',
      customCss: '',
      customJs: '',
      customHead: '',
      customFooter: '',
    };
  }
}

// Search API
export async function searchPosts(query: string, limit: number = 20, page: number = 1): Promise<PaginatedResponse<Post>> {
  return apiRequest<PaginatedResponse<Post>>('GET', '/posts/search', undefined, {
    params: { q: query, limit, page }
  });
}

// SEO API
export async function generateSitemap(): Promise<string> {
  const response = await fetch(`${API_URL}/seo/sitemap.xml`, {
    headers: {
      'Accept': 'application/xml',
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to generate sitemap');
  }
  
  return response.text();
}

export async function generateRobotsTxt(): Promise<string> {
  const response = await fetch(`${API_URL}/seo/robots.txt`, {
    headers: {
      'Accept': 'text/plain',
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to generate robots.txt');
  }
  
  return response.text();
}

// Helper functions
export function getPostUrl(post: Post): string {
  return `/blog/${post.slug}`;
}

export function getPageUrl(page: Page): string {
  return page.isHomepage ? '/' : `/${page.slug}`;
}

export function formatDate(date: Date | string, format: string = 'MMM DD, YYYY'): string {
  const d = new Date(date);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  return format
    .replace('YYYY', d.getFullYear().toString())
    .replace('MMM', monthNames[d.getMonth()])
    .replace('MM', String(d.getMonth() + 1).padStart(2, '0'))
    .replace('DD', String(d.getDate()).padStart(2, '0'))
    .replace('HH', String(d.getHours()).padStart(2, '0'))
    .replace('mm', String(d.getMinutes()).padStart(2, '0'));
}

export function getReadingTime(content: any): { minutes: number; text: string } {
  const text = content?.text || '';
  const words = text.replace(/<[^>]*>/g, '').split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return {
    minutes,
    text: `${minutes} min read`
  };
}

export function getExcerpt(content: any, maxLength: number = 160): string {
  const text = content?.text || '';
  const plainText = text.replace(/<[^>]*>/g, '');
  if (plainText.length <= maxLength) return plainText;
  return plainText.substring(0, maxLength) + '...';
}

export default {
  getPosts,
  getPostBySlug,
  getPostById,
  getRelatedPosts,
  getPages,
  getPageBySlug,
  getPageById,
  getCategories,
  getCategoryBySlug,
  getCategoryById,
  getMedia,
  getSettings,
  searchPosts,
  generateSitemap,
  generateRobotsTxt,
  getPostUrl,
  getPageUrl,
  formatDate,
  getReadingTime,
  getExcerpt,
};