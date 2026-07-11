// backend/src/controllers/post.controller.ts
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import Post from '../models/Post';
import { createSlug } from '../utils/createSlug';
import { apiResponse } from '../utils/apiResponse';
import { ActivityLogService } from '../services/activity.service';

// Types
interface CreatePostRequest {
  title: string;
  content: any; // Rich text content from TipTap
  excerpt?: string;
  status: 'draft' | 'published';
  featuredImage?: string;
  categories: string[];
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
}

// Get all posts with pagination
export const getPosts = async (req: Request, res: Response): Promise<Response> => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      category,
      author,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * limitNumber;

    // Build filter
    const filter: any = {};
    
    if (status) {
      filter.status = status;
    } else {
      // Default: show published posts
      filter.status = 'published';
    }
    
    if (category) {
      filter.categories = category;
    }
    
    if (author) {
      filter.author = author;
    }
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } }
      ];
    }

    // If user is admin/editor, show all posts including drafts
    const user = req.user;
    if (user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'editor') {
      // Show all posts
    } else if (user?.role === 'author') {
      // Show only author's posts
      filter.author = user.id;
    } else {
      // Public: only published posts
      filter.status = 'published';
    }

    // Sort
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const posts = await Post.find(filter)
      .populate('author', 'name email avatar')
      .populate('categories', 'name slug')
      .sort(sort)
      .skip(skip)
      .limit(limitNumber)
      .lean();

    // Get total count
    const total = await Post.countDocuments(filter);

    // Calculate pagination
    const totalPages = Math.ceil(total / limitNumber);
    const hasNext = pageNumber < totalPages;
    const hasPrev = pageNumber > 1;

    return apiResponse.success(res, 'Posts retrieved successfully', {
      posts,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages,
        hasNext,
        hasPrev
      }
    });
  } catch (error) {
    console.error('Get posts error:', error);
    return apiResponse.error(res, 'Failed to retrieve posts', 500);
  }
};

// Get single post by ID
export const getPostById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    const post = await Post.findById(id)
      .populate('author', 'name email avatar')
      .populate('categories', 'name slug')
      .lean();

    if (!post) {
      return apiResponse.error(res, 'Post not found', 404);
    }

    // Check if post is draft and user doesn't have permission
    if (post.status === 'draft') {
      const user = req.user;
      if (!user || (user.id !== post.author?._id?.toString() && !['admin', 'super_admin', 'editor'].includes(user.role))) {
        return apiResponse.error(res, 'Post not found', 404);
      }
    }

    // Increment view count
    await Post.findByIdAndUpdate(id, { $inc: { views: 1 } });

    return apiResponse.success(res, 'Post retrieved successfully', post);
  } catch (error) {
    console.error('Get post error:', error);
    return apiResponse.error(res, 'Failed to retrieve post', 500);
  }
};

// Get post by slug
export const getPostBySlug = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { slug } = req.params;

    const post = await Post.findOne({ slug })
      .populate('author', 'name email avatar')
      .populate('categories', 'name slug')
      .lean();

    if (!post) {
      return apiResponse.error(res, 'Post not found', 404);
    }

    // Only show published posts to public
    if (post.status === 'draft') {
      const user = req.user;
      if (!user || (user.id !== post.author?._id?.toString() && !['admin', 'super_admin', 'editor'].includes(user.role))) {
        return apiResponse.error(res, 'Post not found', 404);
      }
    }

    // Increment view count
    await Post.findByIdAndUpdate(post._id, { $inc: { views: 1 } });

    return apiResponse.success(res, 'Post retrieved successfully', post);
  } catch (error) {
    console.error('Get post by slug error:', error);
    return apiResponse.error(res, 'Failed to retrieve post', 500);
  }
};

// Create post
export const createPost = async (req: Request, res: Response): Promise<Response> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return apiResponse.error(res, 'Validation error', 400, errors.array());
    }

    const user = req.user;
    if (!user) {
      return apiResponse.error(res, 'User not authenticated', 401);
    }

    const {
      title,
      content,
      excerpt,
      status,
      featuredImage,
      categories,
      tags,
      seoTitle,
      seoDescription
    }: CreatePostRequest = req.body;

    // Generate slug
    let slug = createSlug(title);
    
    // Check if slug exists
    const existingPost = await Post.findOne({ slug });
    if (existingPost) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    // Create post
    const post = await Post.create({
      title,
      slug,
      content,
      excerpt: excerpt || content.substring(0, 200).replace(/<[^>]*>/g, ''),
      status: status || 'draft',
      featuredImage: featuredImage || '',
      author: user.id,
      categories: categories || [],
      tags: tags || [],
      seoTitle: seoTitle || title,
      seoDescription: seoDescription || excerpt || content.substring(0, 160).replace(/<[^>]*>/g, ''),
      views: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      publishedAt: status === 'published' ? new Date() : undefined
    });

    // Log activity
    await ActivityLogService.log({
      userId: user.id,
      action: 'POST_CREATE',
      details: `User ${user.email} created post: ${title}`,
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return apiResponse.success(res, 'Post created successfully', post, 201);
  } catch (error) {
    console.error('Create post error:', error);
    return apiResponse.error(res, 'Failed to create post', 500);
  }
};

// Update post
export const updatePost = async (req: Request, res: Response): Promise<Response> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return apiResponse.error(res, 'Validation error', 400, errors.array());
    }

    const { id } = req.params;
    const user = req.user;
    if (!user) {
      return apiResponse.error(res, 'User not authenticated', 401);
    }

    // Find post
    const post = await Post.findById(id);
    if (!post) {
      return apiResponse.error(res, 'Post not found', 404);
    }

    // Check permission
    if (post.author.toString() !== user.id && !['admin', 'super_admin'].includes(user.role)) {
      return apiResponse.error(res, 'You do not have permission to update this post', 403);
    }

    const {
      title,
      content,
      excerpt,
      status,
      featuredImage,
      categories,
      tags,
      seoTitle,
      seoDescription
    } = req.body;

    // Update slug if title changed
    let slug = post.slug;
    if (title && title !== post.title) {
      slug = createSlug(title);
      // Check if new slug exists
      const existingPost = await Post.findOne({ slug, _id: { $ne: id } });
      if (existingPost) {
        slug = `${slug}-${Date.now().toString().slice(-4)}`;
      }
    }

    // Prepare update data
    const updateData: any = {
      title: title || post.title,
      slug,
      content: content || post.content,
      excerpt: excerpt || post.excerpt,
      status: status || post.status,
      featuredImage: featuredImage || post.featuredImage,
      categories: categories || post.categories,
      tags: tags || post.tags,
      seoTitle: seoTitle || post.seoTitle,
      seoDescription: seoDescription || post.seoDescription,
      updatedAt: new Date()
    };

    // Update publishedAt if status changed to published
    if (status === 'published' && post.status !== 'published') {
      updateData.publishedAt = new Date();
    }

    // Update post
    const updatedPost = await Post.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('author', 'name email avatar')
     .populate('categories', 'name slug');

    // Log activity
    await ActivityLogService.log({
      userId: user.id,
      action: 'POST_UPDATE',
      details: `User ${user.email} updated post: ${post.title}`,
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return apiResponse.success(res, 'Post updated successfully', updatedPost);
  } catch (error) {
    console.error('Update post error:', error);
    return apiResponse.error(res, 'Failed to update post', 500);
  }
};

// Delete post
export const deletePost = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const user = req.user;
    if (!user) {
      return apiResponse.error(res, 'User not authenticated', 401);
    }

    // Find post
    const post = await Post.findById(id);
    if (!post) {
      return apiResponse.error(res, 'Post not found', 404);
    }

    // Check permission
    if (post.author.toString() !== user.id && !['admin', 'super_admin'].includes(user.role)) {
      return apiResponse.error(res, 'You do not have permission to delete this post', 403);
    }

    // Delete post
    await Post.findByIdAndDelete(id);

    // Log activity
    await ActivityLogService.log({
      userId: user.id,
      action: 'POST_DELETE',
      details: `User ${user.email} deleted post: ${post.title}`,
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return apiResponse.success(res, 'Post deleted successfully');
  } catch (error) {
    console.error('Delete post error:', error);
    return apiResponse.error(res, 'Failed to delete post', 500);
  }
};

// Publish/Unpublish post
export const togglePublish = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const user = req.user;
    if (!user) {
      return apiResponse.error(res, 'User not authenticated', 401);
    }

    // Find post
    const post = await Post.findById(id);
    if (!post) {
      return apiResponse.error(res, 'Post not found', 404);
    }

    // Check permission
    if (post.author.toString() !== user.id && !['admin', 'super_admin', 'editor'].includes(user.role)) {
      return apiResponse.error(res, 'You do not have permission to publish/unpublish this post', 403);
    }

    // Toggle status
    const newStatus = post.status === 'draft' ? 'published' : 'draft';
    const updateData: any = {
      status: newStatus,
      updatedAt: new Date()
    };

    if (newStatus === 'published') {
      updateData.publishedAt = new Date();
    }

    // Update post
    const updatedPost = await Post.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    // Log activity
    await ActivityLogService.log({
      userId: user.id,
      action: 'POST_PUBLISH_TOGGLE',
      details: `User ${user.email} ${newStatus === 'published' ? 'published' : 'unpublished'} post: ${post.title}`,
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return apiResponse.success(res, `Post ${newStatus === 'published' ? 'published' : 'unpublished'} successfully`, updatedPost);
  } catch (error) {
    console.error('Toggle publish error:', error);
    return apiResponse.error(res, 'Failed to toggle publish status', 500);
  }
};

// Get related posts
export const getRelatedPosts = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string || '5', 10);

    const post = await Post.findById(id);
    if (!post) {
      return apiResponse.error(res, 'Post not found', 404);
    }

    // Find related posts by categories and tags
    const relatedPosts = await Post.find({
      _id: { $ne: id },
      status: 'published',
      $or: [
        { categories: { $in: post.categories } },
        { tags: { $in: post.tags } }
      ]
    })
      .populate('author', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return apiResponse.success(res, 'Related posts retrieved successfully', relatedPosts);
  } catch (error) {
    console.error('Get related posts error:', error);
    return apiResponse.error(res, 'Failed to retrieve related posts', 500);
  }
};

// Search posts
export const searchPosts = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { q } = req.query;
    if (!q) {
      return apiResponse.success(res, 'Search results', { posts: [], total: 0 });
    }

    const searchQuery = q.toString();
    const limit = parseInt(req.query.limit as string || '20', 10);
    const page = parseInt(req.query.page as string || '1', 10);
    const skip = (page - 1) * limit;

    // Search in title, content, excerpt, tags
    const filter: any = {
      status: 'published',
      $or: [
        { title: { $regex: searchQuery, $options: 'i' } },
        { excerpt: { $regex: searchQuery, $options: 'i' } },
        { tags: { $regex: searchQuery, $options: 'i' } },
        { content: { $regex: searchQuery, $options: 'i' } }
      ]
    };

    const posts = await Post.find(filter)
      .populate('author', 'name email avatar')
      .populate('categories', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Post.countDocuments(filter);

    return apiResponse.success(res, 'Search results retrieved', {
      posts,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Search posts error:', error);
    return apiResponse.error(res, 'Failed to search posts', 500);
  }
};