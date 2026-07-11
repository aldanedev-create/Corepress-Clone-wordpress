// backend/src/routes/seo.routes.ts
import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  analyzeSEO,
  generatePostSEO,
  generateSitemap,
  generateRobotsTxt,
  validateSEO
} from '../controllers/seo.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

// Validation rules
const analyzeSEOValidation = [
  body('content')
    .notEmpty().withMessage('Content is required')
    .isString().withMessage('Content must be a string'),
  body('title')
    .notEmpty().withMessage('Title is required')
    .isString().withMessage('Title must be a string')
    .trim(),
  body('keywords')
    .optional()
    .isArray().withMessage('Keywords must be an array'),
  body('keywords.*')
    .optional()
    .isString().withMessage('Keywords must be strings')
    .trim()
];

const generatePostSEOValidation = [
  param('id')
    .isMongoId().withMessage('Invalid post ID')
];

const validateSEOValidation = [
  body('seoTitle')
    .optional()
    .isString().withMessage('SEO title must be a string')
    .trim(),
  body('seoDescription')
    .optional()
    .isString().withMessage('SEO description must be a string')
    .trim(),
  body('keywords')
    .optional()
    .isArray().withMessage('Keywords must be an array'),
  body('keywords.*')
    .optional()
    .isString().withMessage('Keywords must be strings')
    .trim()
];

// Routes
/**
 * @route POST /api/seo/analyze
 * @desc Analyze SEO for content
 * @access Private
 */
router.post(
  '/analyze',
  authenticate,
  authorize(['admin', 'editor']),
  analyzeSEOValidation,
  validate,
  analyzeSEO
);

/**
 * @route POST /api/seo/validate
 * @desc Validate SEO metadata
 * @access Private
 */
router.post(
  '/validate',
  authenticate,
  authorize(['admin', 'editor']),
  validateSEOValidation,
  validate,
  validateSEO
);

/**
 * @route GET /api/seo/post/:id
 * @desc Generate SEO metadata for a post
 * @access Private
 */
router.get(
  '/post/:id',
  authenticate,
  authorize(['admin', 'editor']),
  generatePostSEOValidation,
  validate,
  generatePostSEO
);

/**
 * @route GET /api/seo/sitemap.xml
 * @desc Generate sitemap
 * @access Public
 */
router.get(
  '/sitemap.xml',
  generateSitemap
);

/**
 * @route GET /api/seo/robots.txt
 * @desc Generate robots.txt
 * @access Public
 */
router.get(
  '/robots.txt',
  generateRobotsTxt
);

export default router;