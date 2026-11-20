// Entry point of the REST API
require('dotenv').config();
const express = require('express');
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

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`API running on http://localhost:${PORT}`);
  console.log(`CORS origin: ${process.env.CLIENT_URL || '*'}`);
  await testConnection();
});
