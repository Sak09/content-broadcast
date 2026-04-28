const router = require('express').Router();
const { query, param } = require('express-validator');
const AnalyticsController = require('../controllers/analytics.controller');
const { authenticate, isPrincipal, isPrincipalOrTeacher } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { cacheMiddleware } = require('../middlewares/cache.middleware');

router.get(
  '/summary',
  authenticate,
  isPrincipal,
  cacheMiddleware(60),
  AnalyticsController.summary
);


router.get(
  '/subjects',
  authenticate,
  isPrincipal,
  [query('days').optional().isInt({ min: 1, max: 365 })],
  validate,
  cacheMiddleware(120, (req) => `analytics:subjects:${req.query.days || 7}`),
  AnalyticsController.mostActiveSubjects
);

router.get(
  '/content-usage',
  authenticate,
  isPrincipal,
  [query('days').optional().isInt({ min: 1, max: 365 })],
  validate,
  cacheMiddleware(120, (req) => `analytics:usage:${req.query.days || 7}`),
  AnalyticsController.contentUsage
);

router.get(
  '/trend',
  authenticate,
  isPrincipal,
  [
    query('days').optional().isInt({ min: 1, max: 365 }),
    query('subject').optional().trim(),
  ],
  validate,
  AnalyticsController.dailyTrend
);


router.get(
  '/teacher',
  authenticate,
  isPrincipalOrTeacher,
  [query('days').optional().isInt({ min: 1, max: 365 })],
  validate,
  AnalyticsController.teacherAnalytics
);

router.get(
  '/teacher/:teacherId',
  authenticate,
  isPrincipal,
  [
    param('teacherId').isUUID().withMessage('Invalid teacher ID'),
    query('days').optional().isInt({ min: 1, max: 365 }),
  ],
  validate,
  AnalyticsController.teacherAnalytics
);

module.exports = router;
