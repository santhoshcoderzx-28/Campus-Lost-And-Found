const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendMail, verificationEmail, resetEmail } = require('../config/mailer');

const CLIENT_URL = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();
const newToken = () => crypto.randomBytes(32).toString('hex');
const hours = (n) => new Date(Date.now() + n * 60 * 60 * 1000);

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, studentId } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }
    if (typeof name !== 'string' || typeof email !== 'string') {
      return res.status(400).json({ success: false, message: 'Name and email must be text' });
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    if (Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({ success: false, message: 'Password must be 72 bytes or fewer' });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
    }

    const existing = await User.findByEmail(email);
    if (existing) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists' });
    }

    const verificationToken = newToken();
    const row = await User.create({
      name,
      email,
      studentId,
      password,
      verificationToken,
      verificationExpires: hours(24),
    });

    // A failed email must not lose the account: log it and let the user resend.
    try {
      const link = `${CLIENT_URL}/verify-email?token=${verificationToken}`;
      await sendMail({ to: row.email, ...verificationEmail({ name: row.name, link }) });
    } catch (mailError) {
      console.error('Verification email failed:', mailError.message);
    }

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
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ success: false, message: 'Send a JSON object with name and studentId' });
    }
    const { name, studentId } = req.body;
    if (name !== undefined && (typeof name !== 'string' || name.trim().length < 2)) {
      return res.status(400).json({ success: false, message: 'Name must be at least 2 characters' });
    }
    const row = await User.updateProfile(req.user.id, { name, studentId });
    if (!row) return res.status(404).json({ success: false, message: 'Account not found' });
    res.json({ success: true, user: User.toPublic(row) });
  } catch (error) {
    if (error.code === '23514') {
      return res.status(400).json({ success: false, message: 'Name must be between 2 and 80 characters' });
    }
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
    if (Buffer.byteLength(String(newPassword), 'utf8') > 72) {
      return res.status(400).json({ success: false, message: 'Password must be 72 bytes or fewer' });
    }

    const ok = await User.comparePassword(String(currentPassword), req.user.password_hash);
    if (!ok) {
      // 400, not 401: the session is valid, the submitted password is not
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    await User.updatePassword(req.user.id, String(newPassword));
    res.json({ success: true, message: 'Password updated' });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/verify-email  { token }
exports.verifyEmail = async (req, res, next) => {
  try {
    const token = String(req.body.token || '').trim();
    if (!token) return res.status(400).json({ success: false, message: 'A verification token is required' });

    const row = await User.findByVerificationToken(token);
    if (!row) {
      return res.status(400).json({ success: false, message: 'That link is invalid or has expired. Ask for a new one.' });
    }
    await User.markVerified(row.id);
    res.json({ success: true, message: 'Email verified. Thank you!', user: User.toPublic({ ...row, email_verified: true }) });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/resend-verification  (signed in)
exports.resendVerification = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'Account not found' });
    if (user.email_verified) {
      return res.status(400).json({ success: false, message: 'This email is already verified' });
    }

    const token = newToken();
    await User.setVerificationToken(user.id, token, hours(24));
    try {
      const link = `${CLIENT_URL}/verify-email?token=${token}`;
      await sendMail({ to: user.email, ...verificationEmail({ name: user.name, link }) });
    } catch (mailError) {
      console.error('Verification email failed:', mailError.message);
      return res.status(502).json({ success: false, message: 'The email could not be sent. Please try again later.' });
    }
    res.json({ success: true, message: 'Verification email sent' });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/forgot-password  { email }
exports.forgotPassword = async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim();
    if (!email) return res.status(400).json({ success: false, message: 'An email address is required' });

    // Always answer the same way, so this cannot be used to discover accounts.
    const user = await User.findByEmail(email);
    if (user) {
      const token = newToken();
      await User.setResetToken(email, token, hours(1));
      try {
        const link = `${CLIENT_URL}/reset-password?token=${token}`;
        await sendMail({ to: user.email, ...resetEmail({ name: user.name, link }) });
      } catch (mailError) {
        console.error('Reset email failed:', mailError.message);
      }
    }
    res.json({ success: true, message: 'If that email has an account, a reset link is on its way.' });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/reset-password  { token, password }
exports.resetPassword = async (req, res, next) => {
  try {
    const token = String(req.body.token || '').trim();
    const password = String(req.body.password || '');
    if (!token) return res.status(400).json({ success: false, message: 'A reset token is required' });
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    if (Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({ success: false, message: 'Password must be 72 bytes or fewer' });
    }

    const row = await User.findByResetToken(token);
    if (!row) {
      return res.status(400).json({ success: false, message: 'That link is invalid or has expired. Ask for a new one.' });
    }
    await User.updatePassword(row.id, password);
    await User.clearResetToken(row.id);
    // a reset also proves control of the mailbox
    await User.markVerified(row.id);
    res.json({ success: true, message: 'Password updated. You can sign in now.' });
  } catch (error) {
    next(error);
  }
};
