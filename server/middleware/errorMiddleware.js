// 404 for unknown routes
const notFound = (req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
};

// One place where every error becomes a response
const errorHandler = (err, req, res, next) => {
  console.error('ERROR:', err.message);

  // PostgreSQL integrity errors that mean "the input was wrong"
  if (['23514', '23502', '22P02', '22007', '22008'].includes(err.code)) {
    return res.status(400).json({ success: false, message: 'A field value is invalid' });
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
