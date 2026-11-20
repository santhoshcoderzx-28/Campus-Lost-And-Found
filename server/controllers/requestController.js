const Item = require('../models/Item');
const RecoveryRequest = require('../models/RecoveryRequest');
const { isUuid } = require('../utils/validate');

// POST /api/requests
exports.createRequest = async (req, res, next) => {
  try {
    const { itemId, message } = req.body;
    if (!itemId || !message) {
      return res.status(400).json({ success: false, message: 'itemId and message are required' });
    }
    if (!isUuid(itemId)) return res.status(400).json({ success: false, message: 'Invalid item id' });
    if (typeof message !== 'string' || message.trim().length < 15) {
      return res.status(400).json({ success: false, message: 'Message must be at least 15 characters' });
    }

    const item = await Item.findById(itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    if (item.reported_by === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot request your own report' });
    }
    if (['recovered', 'closed'].includes(item.status)) {
      return res.status(400).json({ success: false, message: 'This item is no longer open for requests' });
    }

    const existing = await RecoveryRequest.findByItemAndUser(itemId, req.user.id);
    if (existing) {
      return res.status(400).json({ success: false, message: 'You have already requested this item' });
    }

    const row = await RecoveryRequest.create({
      itemId,
      requesterId: req.user.id,
      message,
    });

    res.status(201).json({ success: true, request: RecoveryRequest.toApi(row) });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: 'You have already requested this item' });
    }
    if (error.code === '23514') {
      return res.status(400).json({ success: false, message: 'Message must be between 15 and 600 characters' });
    }
    next(error);
  }
};

// GET /api/requests/my-requests
exports.myRequests = async (req, res, next) => {
  try {
    const rows = await RecoveryRequest.byRequester(req.user.id);
    res.json({ success: true, count: rows.length, requests: rows.map(RecoveryRequest.toApi) });
  } catch (error) {
    next(error);
  }
};

// GET /api/requests/received
exports.receivedRequests = async (req, res, next) => {
  try {
    const rows = await RecoveryRequest.forOwner(req.user.id);
    res.json({ success: true, count: rows.length, requests: rows.map(RecoveryRequest.toApi) });
  } catch (error) {
    next(error);
  }
};

// GET /api/requests/:id
exports.getRequest = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid request id' });
    const row = await RecoveryRequest.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Request not found' });

    const isRequester = row.requester_id === req.user.id;
    const isOwner = row.item_owner_id ? row.item_owner_id === req.user.id : false;
    if (!isRequester && !isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to view this request' });
    }

    res.json({ success: true, request: RecoveryRequest.toApi(row) });
  } catch (error) {
    next(error);
  }
};

// GET /api/requests/item/:itemId
exports.requestsForItem = async (req, res, next) => {
  try {
    if (!isUuid(req.params.itemId)) return res.status(400).json({ success: false, message: 'Invalid item id' });
    const item = await Item.findById(req.params.itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    const isOwner = item.reported_by === req.user.id;
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only the report owner or an admin can see these' });
    }

    const rows = await RecoveryRequest.forItem(item.id);
    res.json({ success: true, count: rows.length, requests: rows.map(RecoveryRequest.toApi) });
  } catch (error) {
    next(error);
  }
};

// PUT /api/requests/:id/status
exports.updateRequestStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: "status must be 'approved' or 'rejected'" });
    }
    if (!isUuid(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid request id' });

    const row = await RecoveryRequest.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Request not found' });

    const item = await Item.findById(row.item_id);
    const isOwner = item && item.reported_by === req.user.id;
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only the report owner or an admin can review requests' });
    }
    if (row.status !== 'pending') {
      return res.status(400).json({ success: false, message: `This request is already ${row.status}` });
    }

    const updated = await RecoveryRequest.setStatus(row.id, status, req.user.id);

    // Approving recovers the item and closes the other pending requests
    if (status === 'approved') {
      await Item.update(item.id, { status: 'recovered' });
      await RecoveryRequest.rejectOtherPending(item.id, row.id, req.user.id);
    }

    res.json({ success: true, request: RecoveryRequest.toApi(updated) });
  } catch (error) {
    next(error);
  }
};
