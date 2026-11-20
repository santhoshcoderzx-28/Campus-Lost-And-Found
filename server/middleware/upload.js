// Multer keeps the file in memory; config/storage sends it to Supabase Storage
const multer = require('multer');
const path = require('path');

const ALLOWED = /jpeg|jpg|png|webp/;

const fileFilter = (req, file, cb) => {
  const okExt = ALLOWED.test(path.extname(file.originalname).toLowerCase());
  const okMime = ALLOWED.test(file.mimetype);
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
