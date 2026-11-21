// 404 for unknown routes
const notFound = (req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
};

// One place where every error becomes a response
const errorHandler = (err, req, res, next) => {
  console.error('ERROR:', err.message);

  // if a response has already started, let Express close the connection
  if (res.headersSent) return next(err);

  // PostgreSQL integrity errors that mean "the input was wrong"
  if (['23514', '23502', '22P02', '22007', '22008'].includes(err.code)) {
    return res.status(400).json({ success: false, message: 'A field value is invalid' });
  }
  // numeric overflow, e.g. ?page=99999999999999999999
  if (err.code === '22003') {
    return res.status(400).json({ success: false, message: 'A number in the request is out of range' });
  }
  // foreign key violation, e.g. a row deleted while another request referenced it
  if (err.code === '23503') {
    return res.status(409).json({ success: false, message: 'That record changed while you were working on it. Please reload.' });
  }
  // a broken or truncated multipart body (dropped wifi, closed tab)
  if (err.message && /unexpected end of form|malformed|boundary/i.test(err.message) && err.name !== 'MulterError') {
    return res.status(400).json({ success: false, message: 'The upload was interrupted. Please try again.' });
  }
  if (err.code === '57014') {
    return res.status(503).json({ success: false, message: 'That request took too long. Please try again.' });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'Image must be smaller than 3 MB' });
  }
  if (err.name === 'MulterError') {
    return res.status(400).json({ success: false, message: `Upload failed: ${err.message}` });
  }

  // An explicit status means the code set it on purpose (503 storage down,
  // 502 upload failed, 413 body too large): keep the reason. Anything without
  // a status is unexpected, so the client gets a generic message.
  const status = err.status || err.statusCode || 500;
  const message = err.status || err.statusCode ? err.message : 'Server error';
  res.status(status).json({ success: false, message });
};

module.exports = { notFound, errorHandler };
