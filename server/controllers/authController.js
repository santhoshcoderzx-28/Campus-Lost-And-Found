const jwt = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, studentId } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
    }

    const existing = await User.findByEmail(email);
    if (existing) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists' });
    }

    const row = await User.create({ name, email, studentId, password });
    res.status(201).json({ success: true, user: User.toPublic(row), token: signToken(row.id) });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: 'An account with this email already exists' });
    }
    if (error.code === '23514') {
      return res.status(400).json({ success: false, message: 'Name must be between 2 and 80 characters' });
    }
    next(error);
  }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findByEmail(email);
    if (!user || !(await User.comparePassword(String(password), user.password_hash))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    if (user.account_status === 'suspended') {
      return res.status(403).json({ success: false, message: 'This account has been suspended' });
    }

    res.json({ success: true, user: User.toPublic(user), token: signToken(user.id) });
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/me
exports.me = async (req, res) => {
  res.json({ success: true, user: req.publicUser });
};

// POST /api/auth/logout
exports.logout = async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
};

// PUT /api/auth/profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, studentId } = req.body;
    if (name !== undefined && (typeof name !== 'string' || name.trim().length < 2)) {
      return res.status(400).json({ success: false, message: 'Name must be at least 2 characters' });
    }
    const row = await User.updateProfile(req.user.id, { name, studentId });
    res.json({ success: true, user: User.toPublic(row) });
  } catch (error) {
    next(error);
  }
};

// PUT /api/auth/password
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required' });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const ok = await User.comparePassword(String(currentPassword), req.user.password_hash);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    await User.updatePassword(req.user.id, String(newPassword));
    res.json({ success: true, message: 'Password updated' });
  } catch (error) {
    next(error);
  }
};
