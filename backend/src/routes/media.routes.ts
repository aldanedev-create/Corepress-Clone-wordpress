// backend/src/routes/media.routes.ts
import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  getMedia,
  getMediaById,
  uploadMedia,
  deleteMedia,
  updateMedia,
  bulkDeleteMedia
} from '../controllers/media.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

// Validation rules
const mediaIdValidation = [
  param('id')
    .isMongoId().withMessage('Invalid media ID')
];

const updateMediaValidation = [
  param('id')
    .isMongoId().withMessage('Invalid media ID'),
  body('fileName')
    .optional()
    .isString().withMessage('File name must be a string')
    .trim()
    .isLength({ max: 255 }).withMessage('File name cannot exceed 255 characters'),
  body('altText')
    .optional()
    .isString().withMessage('Alt text must be a string')
    .trim()
    .isLength({ max: 200 }).withMessage('Alt text cannot exceed 200 characters')
];

const bulkDeleteValidation = [
  body('ids')
    .isArray().withMessage('IDs must be an array')
    .notEmpty().withMessage('No media IDs provided'),
  body('ids.*')
    .isMongoId().withMessage('Invalid media ID')
];

const getMediaValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be at least 1'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('fileType')
    .optional()
    .isString().withMessage('File type must be a string')
    .trim()
];

// Routes
/**
 * @route GET /api/media
 * @desc Get all media with pagination
 * @access Private
 */
router.get(
  '/',
  authenticate,
  getMediaValidation,
  validate,
  getMedia
);

/**
 * @route GET /api/media/:id
 * @desc Get media by ID
 * @access Private
 */
router.get(
  '/:id',
  authenticate,
  mediaIdValidation,
  validate,
  getMediaById
);

/**
 * @route POST /api/media/upload
 * @desc Upload a media file
 * @access Private
 */
router.post(
  '/upload',
  authenticate,
  upload.single('file'),
  uploadMedia
);

/**
 * @route PUT /api/media/:id
 * @desc Update media metadata
 * @access Private
 */
router.put(
  '/:id',
  authenticate,
  updateMediaValidation,
  validate,
  updateMedia
);

/**
 * @route DELETE /api/media/:id
 * @desc Delete a media file
 * @access Private
 */
router.delete(
  '/:id',
  authenticate,
  authorize(['admin', 'editor']),
  mediaIdValidation,
  validate,
  deleteMedia
);

/**
 * @route POST /api/media/bulk-delete
 * @desc Bulk delete media files
 * @access Private (Admin)
 */
router.post(
  '/bulk-delete',
  authenticate,
  authorize(['admin']),
  bulkDeleteValidation,
  validate,
  bulkDeleteMedia
);

export default router;