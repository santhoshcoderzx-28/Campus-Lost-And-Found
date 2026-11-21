// Multer keeps the file in memory; config/storage sends it to Supabase Storage
const multer = require('multer');
const path = require('path');

const ALLOWED_EXT = /^\.(jpe?g|png|webp)$/i;
const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const fileFilter = (req, file, cb) => {
  const okExt = ALLOWED_EXT.test(path.extname(file.originalname || ''));
  const okMime = ALLOWED_MIME.includes(String(file.mimetype || '').toLowerCase());
  if (okExt && okMime) return cb(null, true);
  const error = new Error('Only .jpg, .jpeg, .png and .webp images are allowed');
  error.status = 400;
  return cb(error);
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 },
});

module.exports = { upload };
