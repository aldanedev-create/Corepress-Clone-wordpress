// admin/src/hooks/usePosts.ts
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import * as postApi from '../api/post.api';
import { Post, PostData, PostFilters, PaginatedResponse } from '../types/post.types';

interface UsePostsReturn {
  posts: Post[];
  post: Post | null;
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: PostFilters;
  getPosts: (filters?: PostFilters) => Promise<void>;
  getPost: (id: string) => Promise<Post | null>;
  createPost: (data: PostData) => Promise<Post | null>;
  updatePost: (id: string, data: Partial<PostData>) => Promise<Post | null>;
  deletePost: (id: string) => Promise<boolean>;
  togglePublish: (id: string) => Promise<Post | null>;
  searchPosts: (query: string) => Promise<Post[]>;
  setFilters: (filters: PostFilters) => void;
  resetFilters: () => void;
  clearPost: () => void;
}

export const usePosts = (initialFilters: PostFilters = {}): UsePostsReturn => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [filters, setFilters] = useState<PostFilters>({
    page: 1,
    limit: 10,
    ...initialFilters
  });

  // Get posts with current filters
  const getPosts = useCallback(async (newFilters?: PostFilters): Promise<void> => {
    setIsLoading(true);
    
    try {
      const mergedFilters = newFilters ? { ...filters, ...newFilters } : filters;
      setFilters(mergedFilters);
      
      const response = await postApi.getPosts(mergedFilters);
      setPosts(response.data);
      setPagination({
        page: response.pagination.page,
        limit: response.pagination.limit,
        total: response.pagination.total,
        totalPages: response.pagination.totalPages,
        hasNext: response.pagination.hasNext,
        hasPrev: response.pagination.hasPrev
      });
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Get single post
  const getPost = useCallback(async (id: string): Promise<Post | null> => {
    setIsLoading(true);
    
    try {
      const data = await postApi.getPostById(id);
      setPost(data);
      return data;
    } catch (error) {
      console.error('Failed to fetch post:', error);
      toast.error('Failed to load post');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create post
  const createPost = useCallback(async (data: PostData): Promise<Post | null> => {
    setIsCreating(true);
    
    try {
      const newPost = await postApi.createPost(data);
      setPosts(prev => [newPost, ...prev]);
      toast.success('Post created successfully');
      return newPost;
    } catch (error) {
      console.error('Failed to create post:', error);
      toast.error('Failed to create post');
      return null;
    } finally {
      setIsCreating(false);
    }
  }, []);

  // Update post
  const updatePost = useCallback(async (id: string, data: Partial<PostData>): Promise<Post | null> => {
    setIsUpdating(true);
    
    try {
      const updatedPost = await postApi.updatePost(id, data);
      setPosts(prev => prev.map(p => p._id === id ? updatedPost : p));
      if (post?._id === id) {
        setPost(updatedPost);
      }
      toast.success('Post updated successfully');
      return updatedPost;
    } catch (error) {
      console.error('Failed to update post:', error);
      toast.error('Failed to update post');
      return null;
    } finally {
      setIsUpdating(false);
    }
  }, [post]);

  // Delete post
  const deletePost = useCallback(async (id: string): Promise<boolean> => {
    setIsDeleting(true);
    
    try {
      await postApi.deletePost(id);
      setPosts(prev => prev.filter(p => p._id !== id));
      if (post?._id === id) {
        setPost(null);
      }
      toast.success('Post deleted successfully');
      return true;
    } catch (error) {
      console.error('Failed to delete post:', error);
      toast.error('Failed to delete post');
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [post]);

  // Toggle publish status
  const togglePublish = useCallback(async (id: string): Promise<Post | null> => {
    setIsUpdating(true);
    
    try {
      const updatedPost = await postApi.togglePublish(id);
      setPosts(prev => prev.map(p => p._id === id ? updatedPost : p));
      if (post?._id === id) {
        setPost(updatedPost);
      }
      return updatedPost;
    } catch (error) {
      console.error('Failed to toggle publish:', error);
      toast.error('Failed to toggle publish status');
      return null;
    } finally {
      setIsUpdating(false);
    }
  }, [post]);

  // Search posts
  const searchPosts = useCallback(async (query: string): Promise<Post[]> => {
    setIsLoading(true);
    
    try {
      const response = await postApi.searchPosts(query);
      return response.data;
    } catch (error) {
      console.error('Failed to search posts:', error);
      toast.error('Failed to search posts');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Set filters
  const setFiltersHandler = useCallback((newFilters: PostFilters): void => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Reset filters
  const resetFilters = useCallback((): void => {
    setFilters({
      page: 1,
      limit: 10,
      status: undefined,
      category: undefined,
      author: undefined,
      search: undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  }, []);

  // Clear current post
  const clearPost = useCallback((): void => {
    setPost(null);
  }, []);

  // Load posts on mount and filter changes
  useEffect(() => {
    getPosts();
  }, [filters.page, filters.limit, filters.status, filters.category, filters.search, filters.sortBy, filters.sortOrder]);

  return {
    posts,
    post,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    pagination,
    filters,
    getPosts,
    getPost,
    createPost,
    updatePost,
    deletePost,
    togglePublish,
    searchPosts,
    setFilters: setFiltersHandler,
    resetFilters,
    clearPost
  };
};

export default usePosts;