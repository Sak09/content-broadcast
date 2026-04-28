const router = require('express').Router();
const { query, param } = require('express-validator');
const UserController = require('../controllers/user.controller');
const { authenticate, isPrincipal } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { cacheMiddleware } = require('../middlewares/cache.middleware');

router.get(
  '/',
  authenticate,
  isPrincipal,
  [
    query('role').optional().isIn(['principal', 'teacher']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  validate,
  cacheMiddleware(60),
  UserController.list
);

router.get(
  '/:id',
  authenticate,
  isPrincipal,
  [param('id').isUUID()],
  validate,
  UserController.getById
);

module.exports = router;
