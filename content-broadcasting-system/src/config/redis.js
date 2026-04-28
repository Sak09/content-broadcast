const Redis = require('ioredis');
const logger = require('../utils/logger');

let redisClient = null;
let isConnected = false;

const createRedisClient = () => {
  const client = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy: (times) => {
      if (times > 3) {
        logger.warn('Redis retry limit reached, running without cache');
        return null;
      }
      return Math.min(times * 200, 2000);
    },
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true,
  });

  client.on('connect', () => {
    isConnected = true;
    logger.info(' Redis connected successfully');
  });

  client.on('error', (err) => {
    isConnected = false;
    logger.warn(' Redis error (falling back to no cache):', err.message);
  });

  client.on('close', () => {
    isConnected = false;
  });

  return client;
};

const getRedis = () => {
  if (!redisClient) {
    redisClient = createRedisClient();
  }
  return redisClient;
};

const connectRedis = async () => {
  try {
    const client = getRedis();
    await client.connect();
    return true;
  } catch (err) {
    logger.warn('Redis not available, caching disabled:', err.message);
    isConnected = false;
    return false;
  }
};


const cacheGet = async (key) => {
  try {
    if (!isConnected) return null;
    const data = await getRedis().get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

const cacheSet = async (key, value, ttl = null) => {
  try {
    if (!isConnected) return false;
    const expiry = ttl || parseInt(process.env.REDIS_TTL) || 300;
    await getRedis().setex(key, expiry, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

const cacheDel = async (...keys) => {
  try {
    if (!isConnected) return false;
    await getRedis().del(...keys);
    return true;
  } catch {
    return false;
  }
};

const cacheDelPattern = async (pattern) => {
  try {
    if (!isConnected) return false;
    const keys = await getRedis().keys(pattern);
    if (keys.length > 0) await getRedis().del(...keys);
    return true;
  } catch {
    return false;
  }
};

const cacheIncrBy = async (key, amount = 1, ttl = 86400) => {
  try {
    if (!isConnected) return null;
    const val = await getRedis().incrby(key, amount);
    if (val === amount) await getRedis().expire(key, ttl); // Set expiry on first creation
    return val;
  } catch {
    return null;
  }
};

const cacheHIncrBy = async (hashKey, field, amount = 1) => {
  try {
    if (!isConnected) return null;
    return await getRedis().hincrby(hashKey, field, amount);
  } catch {
    return null;
  }
};

const cacheHGetAll = async (hashKey) => {
  try {
    if (!isConnected) return null;
    return await getRedis().hgetall(hashKey);
  } catch {
    return null;
  }
};

const isRedisConnected = () => isConnected;

module.exports = {
  getRedis,
  connectRedis,
  cacheGet,
  cacheSet,
  cacheDel,
  cacheDelPattern,
  cacheIncrBy,
  cacheHIncrBy,
  cacheHGetAll,
  isRedisConnected,
};
