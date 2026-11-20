// 404 for unknown routes
const notFound = (req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
};

// One place where every error becomes a response
const errorHandler = (err, req, res, next) => {
  console.error('ERROR:', err.message);

  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((e) => e.message).join(', ');
    return res.status(400).json({ success: false, message });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: `Invalid ${err.path}` });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'value';
    return res.status(400).json({ success: false, message: `That ${field} is already in use` });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'Image must be smaller than 3 MB' });
  }
  if (err.name === 'MulterError') {
    return res.status(400).json({ success: false, message: `Upload failed: ${err.message}` });
  }

  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: status < 500 ? err.message : 'Server error',
  });
};

module.exports = { notFound, errorHandler };
