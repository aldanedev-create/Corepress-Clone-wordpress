// admin/src/api/post.api.ts
import { get, post, put, patch, del } from './axios';
import { Post, PostData, PostFilters, PaginatedResponse } from '../types/post.types';

// Post API endpoints
const POST_ENDPOINTS = {
  GET_ALL: '/posts',
  GET_BY_ID: (id: string) => `/posts/${id}`,
  GET_BY_SLUG: (slug: string) => `/posts/slug/${slug}`,
  CREATE: '/posts',
  UPDATE: (id: string) => `/posts/${id}`,
  DELETE: (id: string) => `/posts/${id}`,
  PUBLISH: (id: string) => `/posts/${id}/publish`,
  RELATED: (id: string) => `/posts/${id}/related`,
  SEARCH: '/posts/search'
};

// Get all posts with pagination and filters
export const getPosts = async (filters: PostFilters = {}): Promise<PaginatedResponse<Post>> => {
  const queryParams = new URLSearchParams();
  
  if (filters.page) queryParams.append('page', filters.page.toString());
  if (filters.limit) queryParams.append('limit', filters.limit.toString());
  if (filters.status) queryParams.append('status', filters.status);
  if (filters.category) queryParams.append('category', filters.category);
  if (filters.author) queryParams.append('author', filters.author);
  if (filters.search) queryParams.append('search', filters.search);
  if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
  if (filters.sortOrder) queryParams.append('sortOrder', filters.sortOrder);
  if (filters.tag) queryParams.append('tag', filters.tag);
  if (filters.startDate) queryParams.append('startDate', filters.startDate);
  if (filters.endDate) queryParams.append('endDate', filters.endDate);
  
  const url = `${POST_ENDPOINTS.GET_ALL}?${queryParams.toString()}`;
  return await get<PaginatedResponse<Post>>(url);
};

// Get post by ID
export const getPostById = async (id: string): Promise<Post> => {
  return await get<Post>(POST_ENDPOINTS.GET_BY_ID(id));
};

// Get post by slug
export const getPostBySlug = async (slug: string): Promise<Post> => {
  return await get<Post>(POST_ENDPOINTS.GET_BY_SLUG(slug));
};

// Create post
export const createPost = async (data: PostData): Promise<Post> => {
  return await post<Post>(POST_ENDPOINTS.CREATE, data);
};

// Update post
export const updatePost = async (id: string, data: Partial<PostData>): Promise<Post> => {
  return await put<Post>(POST_ENDPOINTS.UPDATE(id), data);
};

// Delete post
export const deletePost = async (id: string): Promise<void> => {
  await del(POST_ENDPOINTS.DELETE(id));
};

// Toggle publish status
export const togglePublish = async (id: string): Promise<Post> => {
  return await patch<Post>(POST_ENDPOINTS.PUBLISH(id));
};

// Get related posts
export const getRelatedPosts = async (id: string, limit: number = 5): Promise<Post[]> => {
  return await get<Post[]>(POST_ENDPOINTS.RELATED(id), { params: { limit } });
};

// Search posts
export const searchPosts = async (query: string, limit: number = 20, page: number = 1): Promise<PaginatedResponse<Post>> => {
  return await get<PaginatedResponse<Post>>(POST_ENDPOINTS.SEARCH, {
    params: { q: query, limit, page }
  });
};

// Bulk delete posts
export const bulkDeletePosts = async (ids: string[]): Promise<void> => {
  await post('/posts/bulk-delete', { ids });
};

// Bulk update posts
export const bulkUpdatePosts = async (ids: string[], data: Partial<PostData>): Promise<void> => {
  await put('/posts/bulk-update', { ids, data });
};

// Get post stats
export const getPostStats = async (): Promise<{
  total: number;
  published: number;
  drafts: number;
  archived: number;
  views: number;
}> => {
  return await get('/posts/stats');
};

export default {
  getPosts,
  getPostById,
  getPostBySlug,
  createPost,
  updatePost,
  deletePost,
  togglePublish,
  getRelatedPosts,
  searchPosts,
  bulkDeletePosts,
  bulkUpdatePosts,
  getPostStats
};