// backend/src/routes/category.routes.ts
import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  getCategories,
  getCategoryById,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryTree
} from '../controllers/category.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

// Validation rules
const categoryIdValidation = [
  param('id')
    .isMongoId().withMessage('Invalid category ID')
];

const categorySlugValidation = [
  param('slug')
    .notEmpty().withMessage('Slug is required')
    .isString().withMessage('Slug must be a string')
];

const createCategoryValidation = [
  body('name')
    .notEmpty().withMessage('Category name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Category name must be between 2 and 50 characters')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters')
    .trim(),
  body('parentCategory')
    .optional()
    .isMongoId().withMessage('Invalid parent category ID')
];

const updateCategoryValidation = [
  param('id')
    .isMongoId().withMessage('Invalid category ID'),
  body('name')
    .optional()
    .isLength({ min: 2, max: 50 }).withMessage('Category name must be between 2 and 50 characters')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters')
    .trim(),
  body('parentCategory')
    .optional()
    .isMongoId().withMessage('Invalid parent category ID')
    .custom((value, { req }) => {
      if (value && value === req.params.id) {
        throw new Error('Category cannot be its own parent');
      }
      return true;
    })
];

// Routes
/**
 * @route GET /api/categories
 * @desc Get all categories
 * @access Public
 */
router.get(
  '/',
  getCategories
);

/**
 * @route GET /api/categories/tree
 * @desc Get category tree
 * @access Public
 */
router.get(
  '/tree',
  getCategoryTree
);

/**
 * @route GET /api/categories/:id
 * @desc Get category by ID
 * @access Public
 */
router.get(
  '/:id',
  categoryIdValidation,
  validate,
  getCategoryById
);

/**
 * @route GET /api/categories/slug/:slug
 * @desc Get category by slug
 * @access Public
 */
router.get(
  '/slug/:slug',
  categorySlugValidation,
  validate,
  getCategoryBySlug
);

/**
 * @route POST /api/categories
 * @desc Create a new category
 * @access Private (Admin, Editor)
 */
router.post(
  '/',
  authenticate,
  authorize(['admin', 'editor']),
  createCategoryValidation,
  validate,
  createCategory
);

/**
 * @route PUT /api/categories/:id
 * @desc Update a category
 * @access Private (Admin, Editor)
 */
router.put(
  '/:id',
  authenticate,
  authorize(['admin', 'editor']),
  updateCategoryValidation,
  validate,
  updateCategory
);

/**
 * @route DELETE /api/categories/:id
 * @desc Delete a category
 * @access Private (Admin)
 */
router.delete(
  '/:id',
  authenticate,
  authorize(['admin']),
  categoryIdValidation,
  validate,
  deleteCategory
);

export default router;