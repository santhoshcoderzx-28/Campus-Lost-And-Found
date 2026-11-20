// Entry point of the REST API
require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoSanitizeLike = require('express-mongo-sanitize');

const { testConnection } = require('./config/database');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// security and parsing middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : '*',
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitizeLike()); // strips $ and . operators from request input
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/items', require('./routes/itemRoutes'));
app.use('/api/requests', require('./routes/requestRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

app.get('/api/health', async (req, res) => {
  const ok = await testConnection();
  res.status(ok ? 200 : 500).json({ success: ok, status: ok ? 'ok' : 'degraded', time: new Date().toISOString() });
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
