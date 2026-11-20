const express = require('express');
const rateLimit = require('express-rate-limit');
const controller = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// brute-force protection on the auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again in 15 minutes' },
});

router.post('/register', authLimiter, controller.register);
router.post('/login', authLimiter, controller.login);
router.get('/me', protect, controller.me);
router.post('/logout', protect, controller.logout);
router.put('/profile', protect, controller.updateProfile);
router.put('/password', protect, controller.changePassword);

module.exports = router;
