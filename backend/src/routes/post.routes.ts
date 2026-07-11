// backend/src/routes/post.routes.ts
import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  getPosts,
  getPostById,
  getPostBySlug,
  createPost,
  updatePost,
  deletePost,
  togglePublish,
  getRelatedPosts,
  searchPosts
} from '../controllers/post.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

// Validation rules
const postIdValidation = [
  param('id')
    .isMongoId().withMessage('Invalid post ID')
];

const postSlugValidation = [
  param('slug')
    .notEmpty().withMessage('Slug is required')
    .isString().withMessage('Slug must be a string')
];

const createPostValidation = [
  body('title')
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 3, max: 200 }).withMessage('Title must be between 3 and 200 characters')
    .trim(),
  body('content')
    .notEmpty().withMessage('Content is required'),
  body('status')
    .optional()
    .isIn(['draft', 'published']).withMessage('Status must be draft or published'),
  body('excerpt')
    .optional()
    .isLength({ max: 500 }).withMessage('Excerpt cannot exceed 500 characters')
    .trim(),
  body('featuredImage')
    .optional()
    .isURL().withMessage('Featured image must be a valid URL')
    .trim(),
  body('categories')
    .optional()
    .isArray().withMessage('Categories must be an array'),
  body('categories.*')
    .optional()
    .isMongoId().withMessage('Invalid category ID'),
  body('tags')
    .optional()
    .isArray().withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .isString().withMessage('Tags must be strings')
    .trim(),
  body('seoTitle')
    .optional()
    .isLength({ max: 60 }).withMessage('SEO title should be under 60 characters')
    .trim(),
  body('seoDescription')
    .optional()
    .isLength({ max: 160 }).withMessage('SEO description should be under 160 characters')
    .trim()
];

const updatePostValidation = [
  param('id')
    .isMongoId().withMessage('Invalid post ID'),
  body('title')
    .optional()
    .isLength({ min: 3, max: 200 }).withMessage('Title must be between 3 and 200 characters')
    .trim(),
  body('content')
    .optional(),
  body('status')
    .optional()
    .isIn(['draft', 'published']).withMessage('Status must be draft or published'),
  body('excerpt')
    .optional()
    .isLength({ max: 500 }).withMessage('Excerpt cannot exceed 500 characters')
    .trim(),
  body('featuredImage')
    .optional()
    .isURL().withMessage('Featured image must be a valid URL')
    .trim(),
  body('categories')
    .optional()
    .isArray().withMessage('Categories must be an array'),
  body('categories.*')
    .optional()
    .isMongoId().withMessage('Invalid category ID'),
  body('tags')
    .optional()
    .isArray().withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .isString().withMessage('Tags must be strings')
    .trim(),
  body('seoTitle')
    .optional()
    .isLength({ max: 60 }).withMessage('SEO title should be under 60 characters')
    .trim(),
  body('seoDescription')
    .optional()
    .isLength({ max: 160 }).withMessage('SEO description should be under 160 characters')
    .trim()
];

const publishToggleValidation = [
  param('id')
    .isMongoId().withMessage('Invalid post ID')
];

const relatedPostsValidation = [
  param('id')
    .isMongoId().withMessage('Invalid post ID'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1 and 20')
];

const searchValidation = [
  query('q')
    .notEmpty().withMessage('Search query is required')
    .isString().withMessage('Search query must be a string')
    .trim(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be at least 1')
];

// Routes
/**
 * @route GET /api/posts
 * @desc Get all posts with pagination
 * @access Public
 */
router.get(
  '/',
  getPosts
);

/**
 * @route GET /api/posts/search
 * @desc Search posts
 * @access Public
 */
router.get(
  '/search',
  searchValidation,
  validate,
  searchPosts
);

/**
 * @route GET /api/posts/:id
 * @desc Get post by ID
 * @access Public
 */
router.get(
  '/:id',
  postIdValidation,
  validate,
  getPostById
);

/**
 * @route GET /api/posts/slug/:slug
 * @desc Get post by slug
 * @access Public
 */
router.get(
  '/slug/:slug',
  postSlugValidation,
  validate,
  getPostBySlug
);

/**
 * @route GET /api/posts/:id/related
 * @desc Get related posts
 * @access Public
 */
router.get(
  '/:id/related',
  relatedPostsValidation,
  validate,
  getRelatedPosts
);

/**
 * @route POST /api/posts
 * @desc Create a new post
 * @access Private (Admin, Editor, Author)
 */
router.post(
  '/',
  authenticate,
  authorize(['admin', 'editor', 'author']),
  createPostValidation,
  validate,
  createPost
);

/**
 * @route PUT /api/posts/:id
 * @desc Update a post
 * @access Private (Admin, Editor, Author)
 */
router.put(
  '/:id',
  authenticate,
  authorize(['admin', 'editor', 'author']),
  updatePostValidation,
  validate,
  updatePost
);

/**
 * @route DELETE /api/posts/:id
 * @desc Delete a post
 * @access Private (Admin, Editor)
 */
router.delete(
  '/:id',
  authenticate,
  authorize(['admin', 'editor']),
  postIdValidation,
  validate,
  deletePost
);

/**
 * @route PATCH /api/posts/:id/publish
 * @desc Toggle post publish status
 * @access Private (Admin, Editor)
 */
router.patch(
  '/:id/publish',
  authenticate,
  authorize(['admin', 'editor']),
  publishToggleValidation,
  validate,
  togglePublish
);

export default router;