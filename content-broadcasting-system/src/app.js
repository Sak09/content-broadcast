require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const logger = require('./utils/logger');
const { testConnection } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { runMigrations } = require('./utils/migrate');

const apiRoutes = require('./routes/index');
const broadcastRoutes = require('./routes/broadcast.routes');

const app = express();

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // for serving uploaded images
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Rate limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

const broadcastLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: { success: false, message: 'Too many requests.' },
});
app.use('/content/live/', broadcastLimiter);

app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
  stream: { write: (msg) => logger.info(msg.trim()) },
}));


app.use(
  '/src/uploads',
  express.static(path.join(process.cwd(), 'src/uploads'), { maxAge: '1d' })
);


app.use('/api', apiRoutes);

app.use('/content/live', broadcastRoutes);

app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});


app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});


app.use((err, req, res, next) => {
  logger.error('Unhandled error:', { message: err.message, stack: err.stack, path: req.path });
  res.status(err.statusCode || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

const PORT = parseInt(process.env.PORT) || 3000;

const bootstrap = async () => {
  try {
  
    await runMigrations();
    await testConnection();
    await connectRedis(); // non-fatal if Redis is unavailable

    app.listen(PORT, () => {
      logger.info(` Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
      logger.info(`Public broadcast: GET /content/live/:teacherId`);
      logger.info(` Auth: POST /api/auth/login`);
    });
  } catch (err) {
    logger.error('Bootstrap failed:', err.message);
    process.exit(1);
  }
};

bootstrap();

module.exports = app;
