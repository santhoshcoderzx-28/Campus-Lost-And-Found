const express = require('express');
const controller = require('../controllers/itemController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/upload');

const router = express.Router();

router.get('/', controller.listItems);
router.get('/stats', controller.getStats);
router.get('/my-reports', protect, controller.myReports);
router.get('/:id', controller.getItem);
router.post('/', protect, upload.single('image'), controller.createItem);
router.put('/:id', protect, upload.single('image'), controller.updateItem);
router.delete('/:id', protect, controller.deleteItem);

module.exports = router;
