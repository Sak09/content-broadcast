const router = require('express').Router();
const { param, query } = require('express-validator');
const BroadcastController = require('../controllers/broadcast.controller');
const { validate } = require('../middlewares/validate.middleware');


router.get(
  '/:teacherId',
  [
    param('teacherId').isUUID().withMessage('Invalid teacher ID'),
    query('subject').optional().trim().isLength({ max: 100 }),
  ],
  validate,
  BroadcastController.getLive
);

router.get(
  '/:teacherId/subjects',
  [param('teacherId').isUUID().withMessage('Invalid teacher ID')],
  validate,
  BroadcastController.getLiveSubjects
);

module.exports = router;
