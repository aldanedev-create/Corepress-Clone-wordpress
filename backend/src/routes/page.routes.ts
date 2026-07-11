// backend/src/routes/page.routes.ts
import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  getPages,
  getPageById,
  getPageBySlug,
  createPage,
  updatePage,
  deletePage
} from '../controllers/page.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

// Validation rules
const pageIdValidation = [
  param('id')
    .isMongoId().withMessage('Invalid page ID')
];

const pageSlugValidation = [
  param('slug')
    .notEmpty().withMessage('Slug is required')
    .isString().withMessage('Slug must be a string')
];

const createPageValidation = [
  body('title')
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 3, max: 200 }).withMessage('Title must be between 3 and 200 characters')
    .trim(),
  body('content')
    .notEmpty().withMessage('Content is required'),
  body('status')
    .optional()
    .isIn(['draft', 'published']).withMessage('Status must be draft or published'),
  body('seoTitle')
    .optional()
    .isLength({ max: 60 }).withMessage('SEO title should be under 60 characters')
    .trim(),
  body('seoDescription')
    .optional()
    .isLength({ max: 160 }).withMessage('SEO description should be under 160 characters')
    .trim(),
  body('template')
    .optional()
    .isIn(['default', 'full-width', 'landing', 'contact']).withMessage('Invalid template')
];

const updatePageValidation = [
  param('id')
    .isMongoId().withMessage('Invalid page ID'),
  body('title')
    .optional()
    .isLength({ min: 3, max: 200 }).withMessage('Title must be between 3 and 200 characters')
    .trim(),
  body('content')
    .optional(),
  body('status')
    .optional()
    .isIn(['draft', 'published']).withMessage('Status must be draft or published'),
  body('seoTitle')
    .optional()
    .isLength({ max: 60 }).withMessage('SEO title should be under 60 characters')
    .trim(),
  body('seoDescription')
    .optional()
    .isLength({ max: 160 }).withMessage('SEO description should be under 160 characters')
    .trim(),
  body('template')
    .optional()
    .isIn(['default', 'full-width', 'landing', 'contact']).withMessage('Invalid template')
];

// Routes
/**
 * @route GET /api/pages
 * @desc Get all pages
 * @access Public
 */
router.get(
  '/',
  getPages
);

/**
 * @route GET /api/pages/:id
 * @desc Get page by ID
 * @access Public
 */
router.get(
  '/:id',
  pageIdValidation,
  validate,
  getPageById
);

/**
 * @route GET /api/pages/slug/:slug
 * @desc Get page by slug
 * @access Public
 */
router.get(
  '/slug/:slug',
  pageSlugValidation,
  validate,
  getPageBySlug
);

/**
 * @route POST /api/pages
 * @desc Create a new page
 * @access Private (Admin, Editor)
 */
router.post(
  '/',
  authenticate,
  authorize(['admin', 'editor']),
  createPageValidation,
  validate,
  createPage
);

/**
 * @route PUT /api/pages/:id
 * @desc Update a page
 * @access Private (Admin, Editor)
 */
router.put(
  '/:id',
  authenticate,
  authorize(['admin', 'editor']),
  updatePageValidation,
  validate,
  updatePage
);

/**
 * @route DELETE /api/pages/:id
 * @desc Delete a page
 * @access Private (Admin)
 */
router.delete(
  '/:id',
  authenticate,
  authorize(['admin']),
  pageIdValidation,
  validate,
  deletePage
);

export default router;