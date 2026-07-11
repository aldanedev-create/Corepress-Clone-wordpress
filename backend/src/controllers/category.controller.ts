// backend/src/controllers/category.controller.ts
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import Category from '../models/Category';
import Post from '../models/Post';
import { createSlug } from '../utils/createSlug';
import { apiResponse } from '../utils/apiResponse';
import { ActivityLogService } from '../services/activity.service';

// Types
interface CreateCategoryRequest {
  name: string;
  description?: string;
  parentCategory?: string;
}

// Get all categories
export const getCategories = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { search, sortBy = 'name', sortOrder = 'asc' } = req.query;

    // Build filter
    const filter: any = {};
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    // Sort
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    // Get categories
    const categories = await Category.find(filter)
      .populate('parentCategory', 'name slug')
      .sort(sort)
      .lean();

    // Get post count for each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const postCount = await Post.countDocuments({
          categories: category._id,
          status: 'published'
        });
        return {
          ...category,
          postCount
        };
      })
    );

    return apiResponse.success(res, 'Categories retrieved successfully', categoriesWithCount);
  } catch (error) {
    console.error('Get categories error:', error);
    return apiResponse.error(res, 'Failed to retrieve categories', 500);
  }
};

// Get category by ID
export const getCategoryById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id)
      .populate('parentCategory', 'name slug')
      .lean();

    if (!category) {
      return apiResponse.error(res, 'Category not found', 404);
    }

    // Get post count
    const postCount = await Post.countDocuments({
      categories: category._id,
      status: 'published'
    });

    return apiResponse.success(res, 'Category retrieved successfully', {
      ...category,
      postCount
    });
  } catch (error) {
    console.error('Get category error:', error);
    return apiResponse.error(res, 'Failed to retrieve category', 500);
  }
};

// Get category by slug
export const getCategoryBySlug = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { slug } = req.params;

    const category = await Category.findOne({ slug })
      .populate('parentCategory', 'name slug')
      .lean();

    if (!category) {
      return apiResponse.error(res, 'Category not found', 404);
    }

    // Get posts in this category
    const posts = await Post.find({
      categories: category._id,
      status: 'published'
    })
      .populate('author', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const postCount = await Post.countDocuments({
      categories: category._id,
      status: 'published'
    });

    return apiResponse.success(res, 'Category retrieved successfully', {
      ...category,
      posts,
      postCount
    });
  } catch (error) {
    console.error('Get category by slug error:', error);
    return apiResponse.error(res, 'Failed to retrieve category', 500);
  }
};

// Create category
export const createCategory = async (req: Request, res: Response): Promise<Response> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return apiResponse.error(res, 'Validation error', 400, errors.array());
    }

    const user = req.user;
    if (!user) {
      return apiResponse.error(res, 'User not authenticated', 401);
    }

    // Check permission
    if (!['admin', 'super_admin', 'editor'].includes(user.role)) {
      return apiResponse.error(res, 'You do not have permission to create categories', 403);
    }

    const { name, description, parentCategory }: CreateCategoryRequest = req.body;

    // Generate slug
    let slug = createSlug(name);
    
    // Check if slug exists
    const existingCategory = await Category.findOne({ slug });
    if (existingCategory) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    // Create category
    const category = await Category.create({
      name,
      slug,
      description: description || '',
      parentCategory: parentCategory || null,
      createdAt: new Date()
    });

    // Log activity
    await ActivityLogService.log({
      userId: user.id,
      action: 'CATEGORY_CREATE',
      details: `User ${user.email} created category: ${name}`,
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return apiResponse.success(res, 'Category created successfully', category, 201);
  } catch (error) {
    console.error('Create category error:', error);
    return apiResponse.error(res, 'Failed to create category', 500);
  }
};

// Update category
export const updateCategory = async (req: Request, res: Response): Promise<Response> => {
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

    // Check permission
    if (!['admin', 'super_admin', 'editor'].includes(user.role)) {
      return apiResponse.error(res, 'You do not have permission to update categories', 403);
    }

    // Find category
    const category = await Category.findById(id);
    if (!category) {
      return apiResponse.error(res, 'Category not found', 404);
    }

    const { name, description, parentCategory } = req.body;

    // Update slug if name changed
    let slug = category.slug;
    if (name && name !== category.name) {
      slug = createSlug(name);
      // Check if new slug exists
      const existingCategory = await Category.findOne({ slug, _id: { $ne: id } });
      if (existingCategory) {
        slug = `${slug}-${Date.now().toString().slice(-4)}`;
      }
    }

    // Update category
    const updateData: any = {
      name: name || category.name,
      slug,
      description: description || category.description,
      parentCategory: parentCategory !== undefined ? parentCategory : category.parentCategory
    };

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    // Log activity
    await ActivityLogService.log({
      userId: user.id,
      action: 'CATEGORY_UPDATE',
      details: `User ${user.email} updated category: ${category.name}`,
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return apiResponse.success(res, 'Category updated successfully', updatedCategory);
  } catch (error) {
    console.error('Update category error:', error);
    return apiResponse.error(res, 'Failed to update category', 500);
  }
};

// Delete category
export const deleteCategory = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const user = req.user;
    if (!user) {
      return apiResponse.error(res, 'User not authenticated', 401);
    }

    // Check permission
    if (!['admin', 'super_admin'].includes(user.role)) {
      return apiResponse.error(res, 'You do not have permission to delete categories', 403);
    }

    // Find category
    const category = await Category.findById(id);
    if (!category) {
      return apiResponse.error(res, 'Category not found', 404);
    }

    // Check if category has posts
    const postCount = await Post.countDocuments({ categories: id });
    if (postCount > 0) {
      return apiResponse.error(res, `Cannot delete category with ${postCount} posts. Remove posts first or reassign them.`, 400);
    }

    // Check if category has subcategories
    const subCategoryCount = await Category.countDocuments({ parentCategory: id });
    if (subCategoryCount > 0) {
      return apiResponse.error(res, `Cannot delete category with ${subCategoryCount} subcategories. Delete subcategories first.`, 400);
    }

    // Delete category
    await Category.findByIdAndDelete(id);

    // Log activity
    await ActivityLogService.log({
      userId: user.id,
      action: 'CATEGORY_DELETE',
      details: `User ${user.email} deleted category: ${category.name}`,
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return apiResponse.success(res, 'Category deleted successfully');
  } catch (error) {
    console.error('Delete category error:', error);
    return apiResponse.error(res, 'Failed to delete category', 500);
  }
};

// Get category tree (hierarchy)
export const getCategoryTree = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Get all categories
    const categories = await Category.find().lean();

    // Build tree
    const buildTree = (parentId: string | null = null): any[] => {
      const children = categories.filter(cat => 
        cat.parentCategory?.toString() === parentId?.toString() || 
        (!cat.parentCategory && !parentId)
      );

      return children.map(cat => ({
        ...cat,
        children: buildTree(cat._id.toString())
      }));
    };

    const tree = buildTree(null);

    return apiResponse.success(res, 'Category tree retrieved successfully', tree);
  } catch (error) {
    console.error('Get category tree error:', error);
    return apiResponse.error(res, 'Failed to retrieve category tree', 500);
  }
};