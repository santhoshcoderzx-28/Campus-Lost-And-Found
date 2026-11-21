// Entry point of the REST API
require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitizeLike = require('express-mongo-sanitize');

const { testConnection } = require('./config/database');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// Render (and any reverse proxy) terminates TLS, so trust one hop for req.ip
app.set('trust proxy', 1);

// security and parsing middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // item photos are served from Supabase Storage on another origin
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'", 'https:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
      },
    },
    // allow the browser to load the cross-origin image bytes
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((o) => o.trim()).filter(Boolean)
  : [];
if (allowedOrigins.length === 0 && process.env.NODE_ENV === 'production') {
  console.warn('CLIENT_URL is not set: CORS will reflect any origin. Set it to the site URL.');
}
app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true, // reflect the request origin
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitizeLike()); // strips $ and . operators from request input
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// A generous global limit: one campus NAT can share a single IP, so this only
// stops runaway loops, while the auth routes keep their own tighter limiters.
const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please slow down' },
});
app.use('/api', apiLimiter);

// routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/items', require('./routes/itemRoutes'));
app.use('/api/requests', require('./routes/requestRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Render pings this every few seconds; the database check is cached for a
// minute (or forced with ?deep=1) so the ping costs almost nothing.
let healthCache = { at: 0, ok: false };
app.get('/api/health', async (req, res) => {
  const now = Date.now();
  if (req.query.deep === '1' || now - healthCache.at > 60 * 1000) {
    healthCache = { at: now, ok: await testConnection() };
  }
  res.status(healthCache.ok ? 200 : 500).json({
    success: healthCache.ok,
    status: healthCache.ok ? 'ok' : 'degraded',
    time: new Date().toISOString(),
  });
});

// Serve the built React app from this same service when client/dist exists.
// In local development you run the Vite dev server on 5173, so this block is
// skipped and nothing changes for local work.
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
  console.log('Serving the React build from client/dist');
}

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`API running on http://localhost:${PORT}`);
  console.log(`CORS origin: ${process.env.CLIENT_URL || '*'}`);
  await testConnection();
});
