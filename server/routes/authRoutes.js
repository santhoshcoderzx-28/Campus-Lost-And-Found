const express = require('express');
const rateLimit = require('express-rate-limit');
const controller = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// brute-force protection on the auth endpoints
// Only failed attempts count, and the window is generous: a lecture hall
// sharing one campus IP must not lock itself out.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many failed attempts, please try again in 15 minutes' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many accounts created from this network, please try later' },
});

// a signed-in attacker must not be able to brute-force the current password
const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many password attempts, please try again later' },
});

// email sending is expensive: keep both flows on a tight budget
const mailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again in 15 minutes' },
});

router.post('/register', registerLimiter, controller.register);
router.post('/login', loginLimiter, controller.login);
router.get('/me', protect, controller.me);
router.post('/logout', protect, controller.logout);
router.put('/profile', protect, controller.updateProfile);
router.put('/password', protect, passwordLimiter, controller.changePassword);

// email verification and password reset
router.post('/verify-email', mailLimiter, controller.verifyEmail);
router.post('/resend-verification', protect, mailLimiter, controller.resendVerification);
router.post('/forgot-password', mailLimiter, controller.forgotPassword);
router.post('/reset-password', mailLimiter, controller.resetPassword);

module.exports = router;
