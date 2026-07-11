// backend/src/routes/setting.routes.ts
import { Router } from 'express';
import { body } from 'express-validator';
import {
  getSettings,
  updateSettings,
  resetSettings,
  getNavigation,
  updateNavigation
} from '../controllers/setting.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

// Validation rules
const updateSettingsValidation = [
  body('siteName')
    .optional()
    .isString().withMessage('Site name must be a string')
    .trim()
    .isLength({ max: 100 }).withMessage('Site name cannot exceed 100 characters'),
  body('siteDescription')
    .optional()
    .isString().withMessage('Site description must be a string')
    .trim()
    .isLength({ max: 300 }).withMessage('Site description cannot exceed 300 characters'),
  body('siteLogo')
    .optional()
    .isURL().withMessage('Site logo must be a valid URL')
    .trim(),
  body('siteFavicon')
    .optional()
    .isURL().withMessage('Site favicon must be a valid URL')
    .trim(),
  body('primaryColor')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).withMessage('Invalid color format'),
  body('secondaryColor')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).withMessage('Invalid color format'),
  body('accentColor')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).withMessage('Invalid color format'),
  body('footerText')
    .optional()
    .isString().withMessage('Footer text must be a string')
    .trim(),
  body('homePageLayout')
    .optional()
    .isIn(['grid', 'list', 'masonry']).withMessage('Invalid layout'),
  body('postsPerPage')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Posts per page must be between 1 and 100'),
  body('timeZone')
    .optional()
    .isString().withMessage('Time zone must be a string'),
  body('dateFormat')
    .optional()
    .isString().withMessage('Date format must be a string'),
  body('timeFormat')
    .optional()
    .isString().withMessage('Time format must be a string'),
  body('analyticsId')
    .optional()
    .isString().withMessage('Analytics ID must be a string')
    .trim(),
  body('googleSiteVerification')
    .optional()
    .isString().withMessage('Google site verification must be a string')
    .trim(),
  body('facebookUrl')
    .optional()
    .isURL().withMessage('Facebook URL must be a valid URL')
    .trim(),
  body('twitterUrl')
    .optional()
    .isURL().withMessage('Twitter URL must be a valid URL')
    .trim(),
  body('instagramUrl')
    .optional()
    .isURL().withMessage('Instagram URL must be a valid URL')
    .trim(),
  body('youtubeUrl')
    .optional()
    .isURL().withMessage('YouTube URL must be a valid URL')
    .trim(),
  body('linkedinUrl')
    .optional()
    .isURL().withMessage('LinkedIn URL must be a valid URL')
    .trim(),
  body('githubUrl')
    .optional()
    .isURL().withMessage('GitHub URL must be a valid URL')
    .trim(),
  body('contactEmail')
    .optional()
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('contactPhone')
    .optional()
    .isString().withMessage('Phone must be a string')
    .trim(),
  body('contactAddress')
    .optional()
    .isString().withMessage('Address must be a string')
    .trim(),
  body('maintenanceMode')
    .optional()
    .isBoolean().withMessage('Maintenance mode must be a boolean'),
  body('maintenanceMessage')
    .optional()
    .isString().withMessage('Maintenance message must be a string')
    .trim(),
  body('enableComments')
    .optional()
    .isBoolean().withMessage('Enable comments must be a boolean'),
  body('enableGdpr')
    .optional()
    .isBoolean().withMessage('Enable GDPR must be a boolean'),
  body('enableAnalytics')
    .optional()
    .isBoolean().withMessage('Enable analytics must be a boolean'),
  body('customCss')
    .optional()
    .isString().withMessage('Custom CSS must be a string'),
  body('customJs')
    .optional()
    .isString().withMessage('Custom JavaScript must be a string')
];

const updateNavigationValidation = [
  body('navigation')
    .isArray().withMessage('Navigation must be an array'),
  body('navigation.*.id')
    .notEmpty().withMessage('Navigation item ID is required')
    .isString().withMessage('Navigation item ID must be a string'),
  body('navigation.*.label')
    .notEmpty().withMessage('Navigation item label is required')
    .isString().withMessage('Navigation item label must be a string')
    .trim()
    .isLength({ max: 50 }).withMessage('Label cannot exceed 50 characters'),
  body('navigation.*.url')
    .notEmpty().withMessage('Navigation item URL is required')
    .isString().withMessage('Navigation item URL must be a string')
    .trim(),
  body('navigation.*.order')
    .optional()
    .isInt({ min: 0 }).withMessage('Order must be a positive integer'),
  body('navigation.*.target')
    .optional()
    .isIn(['_blank', '_self']).withMessage('Invalid target value')
];

// Routes
/**
 * @route GET /api/settings
 * @desc Get all settings
 * @access Public
 */
router.get(
  '/',
  getSettings
);

/**
 * @route GET /api/settings/navigation
 * @desc Get navigation menu
 * @access Public
 */
router.get(
  '/navigation',
  getNavigation
);

/**
 * @route PUT /api/settings
 * @desc Update settings
 * @access Private (Admin)
 */
router.put(
  '/',
  authenticate,
  authorize(['admin']),
  updateSettingsValidation,
  validate,
  updateSettings
);

/**
 * @route PUT /api/settings/navigation
 * @desc Update navigation menu
 * @access Private (Admin)
 */
router.put(
  '/navigation',
  authenticate,
  authorize(['admin']),
  updateNavigationValidation,
  validate,
  updateNavigation
);

/**
 * @route POST /api/settings/reset
 * @desc Reset settings to default
 * @access Private (Admin)
 */
router.post(
  '/reset',
  authenticate,
  authorize(['admin']),
  resetSettings
);

export default router;