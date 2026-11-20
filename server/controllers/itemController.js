const Item = require('../models/Item');
const RecoveryRequest = require('../models/RecoveryRequest');
const { uploadImage, destroyImage } = require('../config/storage');
const { isUuid } = require('../utils/validate');

// GET /api/items
exports.listItems = async (req, res, next) => {
  try {
    const { dateFrom, dateTo, reportedBy } = req.query;
    const isRealDate = (value) => {
      if (!value) return true;
      const text = String(value);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
      const d = new Date(`${text}T00:00:00Z`);
      return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === text;
    };
    if (!isRealDate(dateFrom) || !isRealDate(dateTo)) {
      return res.status(400).json({ success: false, message: 'dateFrom and dateTo must be real dates (YYYY-MM-DD)' });
    }
    if (reportedBy && !isUuid(reportedBy)) {
      return res.status(400).json({ success: false, message: 'Invalid reportedBy id' });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 9));
    const { total, items } = await Item.list({
      filters: req.query,
      page,
      limit,
      sort: req.query.sort,
    });

    res.json({
      success: true,
      count: items.length,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      items: items.map(Item.toApi),
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/items/stats
exports.getStats = async (req, res, next) => {
  try {
    res.json({ success: true, stats: await Item.stats() });
  } catch (error) {
    next(error);
  }
};

// GET /api/items/my-reports
exports.myReports = async (req, res, next) => {
  try {
    const rows = await Item.myReports(req.user.id);
    res.json({ success: true, count: rows.length, items: rows.map(Item.toApi) });
  } catch (error) {
    next(error);
  }
};

// GET /api/items/:id
exports.getItem = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid item id' });
    const row = await Item.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, item: Item.toApi(row) });
  } catch (error) {
    next(error);
  }
};

// POST /api/items
exports.createItem = async (req, res, next) => {
  try {
    const { title, description, category, type, location, eventDate, identifyingFeatures } = req.body;

    if (!title || !description || !category || !type || !location || !eventDate) {
      return res.status(400).json({
        success: false,
        message: 'title, description, category, type, location and eventDate are required',
      });
    }
    if (!['lost', 'found'].includes(type)) {
      return res.status(400).json({ success: false, message: "type must be 'lost' or 'found'" });
    }
    if (!Item.CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, message: `category must be one of ${Item.CATEGORIES.join(', ')}` });
    }

    const parsedDate = new Date(eventDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({ success: false, message: 'eventDate must be a valid date (YYYY-MM-DD)' });
    }
    // A date is sent as YYYY-MM-DD, which Postgres reads as UTC midnight.
    // Allow one day of slack so "today" in IST (UTC+5:30) is never rejected.
    const latestAllowed = new Date(Date.now() + 24 * 60 * 60 * 1000);
    if (parsedDate > latestAllowed) {
      return res.status(400).json({ success: false, message: 'Date cannot be in the future' });
    }

    let image = { url: '', publicId: '' };
    if (req.file) image = await uploadImage(req.file);

    let row;
    try {
      row = await Item.create({
        title,
        description,
        category,
        type,
        location,
        eventDate: parsedDate.toISOString().slice(0, 10),
        identifyingFeatures,
        imageUrl: image.url,
        imagePublicId: image.publicId,
        reportedBy: req.user.id,
      });
    } catch (error) {
      if (image.publicId) await destroyImage(image.publicId);
      throw error;
    }

    const matches = await Item.findMatches(row);

    res.status(201).json({
      success: true,
      item: Item.toApi(row),
      possibleMatches: matches.map(Item.toApi),
    });
  } catch (error) {
    if (error.code === '23514') {
      return res.status(400).json({ success: false, message: 'A field is outside the allowed length or values' });
    }
    next(error);
  }
};

// PUT /api/items/:id
exports.updateItem = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid item id' });

    const existing = await Item.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Item not found' });

    const isOwner = existing.reported_by === req.user.id;
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You can only edit your own reports' });
    }

    const updates = {};
    ['title', 'description', 'category', 'type', 'location', 'identifyingFeatures'].forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = String(req.body[field]);
    });

    if (req.body.eventDate !== undefined) {
      const d = new Date(req.body.eventDate);
      if (Number.isNaN(d.getTime())) {
        return res.status(400).json({ success: false, message: 'eventDate must be a valid date (YYYY-MM-DD)' });
      }
      if (d > new Date(Date.now() + 24 * 60 * 60 * 1000)) {
        return res.status(400).json({ success: false, message: 'Date cannot be in the future' });
      }
      updates.eventDate = d.toISOString().slice(0, 10);
    }

    if (req.body.status !== undefined) {
      if (!Item.STATUSES.includes(req.body.status)) {
        return res.status(400).json({ success: false, message: `status must be one of ${Item.STATUSES.join(', ')}` });
      }
      updates.status = req.body.status;
    }

    const row = await Item.update(req.params.id, updates);
    res.json({ success: true, item: Item.toApi(row) });
  } catch (error) {
    if (['23514', '22007', '22008'].includes(error.code)) {
      return res.status(400).json({ success: false, message: 'A field value is invalid' });
    }
    next(error);
  }
};

// DELETE /api/items/:id
exports.deleteItem = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid item id' });

    const existing = await Item.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Item not found' });

    const isOwner = existing.reported_by === req.user.id;
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You can only delete your own reports' });
    }

    await RecoveryRequest.removeByItem(existing.id);
    await destroyImage(existing.image_public_id);
    await Item.remove(existing.id);

    res.json({ success: true, message: 'Report deleted' });
  } catch (error) {
    next(error);
  }
};
