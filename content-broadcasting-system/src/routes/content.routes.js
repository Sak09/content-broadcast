const router = require('express').Router();
const { body, query, param } = require('express-validator');
const ContentController = require('../controllers/content.controller');
const { authenticate, isPrincipal, isTeacher, isPrincipalOrTeacher } = require('../middlewares/auth.middleware');
const { upload, handleUploadError } = require('../middlewares/upload.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { cacheMiddleware } = require('../middlewares/cache.middleware');


router.post(
  '/upload',
  authenticate,
  isTeacher,
  upload.single('file'),
  handleUploadError,
  [
    body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 255 }),
    body('subject').trim().notEmpty().withMessage('Subject is required'),
    body('description').optional().trim().isLength({ max: 2000 }),
    body('start_time')
      .optional({ nullable: true, checkFalsy: true })
      .isISO8601()
      .withMessage('start_time must be a valid ISO date'),
    body('end_time')
      .optional({ nullable: true, checkFalsy: true })
      .isISO8601()
      .withMessage('end_time must be a valid ISO date')
      .custom((endTime, { req }) => {
        if (req.body.start_time && endTime && new Date(endTime) <= new Date(req.body.start_time)) {
          throw new Error('end_time must be after start_time');
        }
        return true;
      }),
    body('rotation_duration')
      .optional()
      .isInt({ min: 1, max: 1440 })
      .withMessage('rotation_duration must be 1–1440 minutes'),
  ],
  validate,
  ContentController.upload
);


router.get(
  '/',
  authenticate,
  isPrincipalOrTeacher,
  [
    query('status').optional().isIn(['uploaded', 'pending', 'approved', 'rejected']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  validate,
  cacheMiddleware(30),
  ContentController.list
);

router.get(
  '/pending',
  authenticate,
  isPrincipal,
  cacheMiddleware(20),
  ContentController.pending
);


router.get(
  '/:id',
  authenticate,
  isPrincipalOrTeacher,
  [param('id').isUUID().withMessage('Invalid content ID')],
  validate,
  ContentController.getById
);


router.patch(
  '/:id/approve',
  authenticate,
  isPrincipal,
  [param('id').isUUID().withMessage('Invalid content ID')],
  validate,
  ContentController.approve
);


router.patch(
  '/:id/reject',
  authenticate,
  isPrincipal,
  [
    param('id').isUUID().withMessage('Invalid content ID'),
    body('rejection_reason').trim().notEmpty().withMessage('Rejection reason is required'),
  ],
  validate,
  ContentController.reject
);


router.delete(
  '/:id',
  authenticate,
  isPrincipalOrTeacher,
  [param('id').isUUID().withMessage('Invalid content ID')],
  validate,
  ContentController.delete
);

module.exports = router;
