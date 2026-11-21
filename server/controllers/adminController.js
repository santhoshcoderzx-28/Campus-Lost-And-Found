const User = require('../models/User');
const Item = require('../models/Item');
const RecoveryRequest = require('../models/RecoveryRequest');
const { isUuid } = require('../utils/validate');
const { destroyImage } = require('../config/storage');

// GET /api/admin/dashboard
exports.dashboard = async (req, res, next) => {
  try {
    const [itemStats, totalUsers, pendingRequests, byCategory, recent] = await Promise.all([
      Item.stats(),
      User.count(),
      RecoveryRequest.countPending(),
      Item.byCategory(),
      Item.recent(8),
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalLost: itemStats.lost,
        totalFound: itemStats.found,
        recovered: itemStats.recovered,
        pendingRequests,
        totalReports: itemStats.totalReports,
        byCategory,
      },
      recentActivity: recent.map(Item.toApi),
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/users
exports.listUsers = async (req, res, next) => {
  try {
    const rows = await User.list();
    res.json({ success: true, count: rows.length, users: rows.map(User.toPublic) });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/items
exports.listItems = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const rows = await Item.list({ filters: {}, page, limit, sort: 'newest' });
    res.json({
      success: true,
      count: rows.items.length,
      total: rows.total,
      page,
      pages: Math.ceil(rows.total / limit) || 1,
      items: rows.items.map(Item.toApi),
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/requests
exports.listRequests = async (req, res, next) => {
  try {
    const rows = await RecoveryRequest.all();
    res.json({ success: true, count: rows.length, requests: rows.map(RecoveryRequest.toApi) });
  } catch (error) {
    next(error);
  }
};

// PUT /api/admin/users/:id/status
exports.updateUserStatus = async (req, res, next) => {
  try {
    const { accountStatus } = req.body;
    if (!['active', 'suspended'].includes(accountStatus)) {
      return res.status(400).json({ success: false, message: "accountStatus must be 'active' or 'suspended'" });
    }
    if (!isUuid(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid user id' });
    if (req.params.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot change your own account status' });
    }

    const row = await User.updateStatus(req.params.id, accountStatus);
    if (!row) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, user: User.toPublic(row) });
  } catch (error) {
    next(error);
  }
};

// PUT /api/admin/items/:id/status
exports.updateItemStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!Item.STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `status must be one of ${Item.STATUSES.join(', ')}` });
    }
    if (!isUuid(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid item id' });

    const row = await Item.update(req.params.id, { status });
    if (!row) return res.status(404).json({ success: false, message: 'Item not found' });

    res.json({ success: true, item: Item.toApi(row) });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/admin/items/:id
exports.deleteItem = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid item id' });
    const existing = await Item.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Item not found' });

    await Item.remove(existing.id);
    await destroyImage(existing.image_public_id);
    res.json({ success: true, message: 'Report removed by administrator' });
  } catch (error) {
    next(error);
  }
};
