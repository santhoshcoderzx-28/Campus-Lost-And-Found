// Verifies the JWT and loads the user from Supabase PostgreSQL
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized, token invalid or expired' });
  }

  try {
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authorized, account no longer exists' });
    }
    if (user.account_status === 'suspended') {
      return res.status(403).json({ success: false, message: 'This account has been suspended' });
    }
    req.user = user; // raw row + helpers below
    req.publicUser = User.toPublic(user);
    return next();
  } catch (error) {
    return next(error); // a database failure is a 500, not a 401
  }
};

module.exports = { protect };
