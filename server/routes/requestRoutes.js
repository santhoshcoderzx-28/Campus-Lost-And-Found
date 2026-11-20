const express = require('express');
const controller = require('../controllers/requestController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', controller.createRequest);
router.get('/my-requests', controller.myRequests);
router.get('/received', controller.receivedRequests);
router.get('/item/:itemId', controller.requestsForItem);
router.get('/:id', controller.getRequest);
router.put('/:id/status', controller.updateRequestStatus);

module.exports = router;
