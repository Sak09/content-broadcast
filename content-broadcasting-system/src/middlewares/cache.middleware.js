const { cacheGet, cacheSet } = require('../config/redis');

/**
 * Generic route-level cache middleware
 * @param {number} ttl - seconds to cache
 * @param {function} keyFn - optional custom key builder (req) => string
 */
const cacheMiddleware = (ttl = 60, keyFn = null) => async (req, res, next) => {
  const cacheKey = keyFn ? keyFn(req) : `route:${req.originalUrl}`;

  const cached = await cacheGet(cacheKey);
  if (cached) {
    return res.status(200).json({ ...cached, _cached: true });
  }

  // Intercept res.json to cache the response
  const originalJson = res.json.bind(res);
  res.json = async (data) => {
    if (res.statusCode === 200 && data?.success) {
      await cacheSet(cacheKey, data, ttl);
    }
    return originalJson(data);
  };

  next();
};

module.exports = { cacheMiddleware };
