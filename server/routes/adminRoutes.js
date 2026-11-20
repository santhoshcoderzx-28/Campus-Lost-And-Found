const express = require('express');
const controller = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');

const router = express.Router();

// every admin route requires a logged-in administrator
router.use(protect, adminOnly);

router.get('/dashboard', controller.dashboard);
router.get('/users', controller.listUsers);
router.get('/items', controller.listItems);
router.get('/requests', controller.listRequests);
router.put('/users/:id/status', controller.updateUserStatus);
router.put('/items/:id/status', controller.updateItemStatus);
router.delete('/items/:id', controller.deleteItem);

module.exports = router;
