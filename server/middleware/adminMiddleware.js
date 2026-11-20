// Must run AFTER protect
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ success: false, message: 'Access denied, administrator only' });
};

module.exports = { adminOnly };
