const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/content', require('./content.routes'));
router.use('/users', require('./user.routes'));
router.use('/analytics', require('./analytics.routes'));

module.exports = router;
