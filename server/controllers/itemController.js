const Item = require('../models/Item');
const RecoveryRequest = require('../models/RecoveryRequest');
const { uploadImage, destroyImage } = require('../config/storage');
const { isUuid } = require('../utils/validate');

// GET /api/items
exports.listItems = async (req, res, next) => {
  try {
    const { dateFrom, dateTo, reportedBy } = req.query;

    // ?q[a]=1 would reach the driver as an object and crash the query
    const textFilters = ['q', 'type', 'category', 'location', 'status', 'sort'];
    for (const key of textFilters) {
      const value = req.query[key];
      if (value !== undefined && value !== '' && typeof value !== 'string') {
        return res.status(400).json({ success: false, message: `${key} must be a single text value` });
      }
    }
    const isRealDate = (value) => {
      if (!value) return true;
      if (typeof value !== 'string') return false; // ?dateFrom[]=... is not a date
      const text = value;
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
      limit,
      pages: Math.ceil(total / limit) || 1,
      items: items.map(Item.toApi),
    });
  } catch (error) {
    if (['22007', '22008', '22P02'].includes(error.code)) {
      return res.status(400).json({ success: false, message: 'A filter value is invalid' });
    }
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
    if ([title, description, category, type, location].some((value) => typeof value !== 'string')) {
      return res.status(400).json({ success: false, message: 'Text fields must be text' });
    }
    if (!['lost', 'found'].includes(type)) {
      return res.status(400).json({ success: false, message: "type must be 'lost' or 'found'" });
    }
    if (!Item.CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, message: `category must be one of ${Item.CATEGORIES.join(', ')}` });
    }

    // Only YYYY-MM-DD is accepted: "03/04/2026" would be read as March 4.
    const dateText = String(eventDate);
    const parsedDate = new Date(`${dateText}T00:00:00Z`);
    const realDate =
      /^\d{4}-\d{2}-\d{2}$/.test(dateText) &&
      !Number.isNaN(parsedDate.getTime()) &&
      parsedDate.toISOString().slice(0, 10) === dateText;
    if (!realDate) {
      return res.status(400).json({ success: false, message: 'eventDate must be a real date in YYYY-MM-DD form' });
    }
    // Compare against today's date in IST (UTC+5:30), the users' own calendar,
    // so "today" is always accepted and tomorrow is always rejected.
    const istToday = new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
    if (dateText > istToday) {
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

    // ---- validation first: nothing reaches storage until the request is valid ----
    const updates = {};
    ['title', 'description', 'category', 'type', 'location', 'identifyingFeatures'].forEach((field) => {
      const value = req.body[field];
      if (value === undefined) return;
      if (value === null) return; // never write the string "null"
      updates[field] = String(value);
    });

    if (updates.category !== undefined && !Item.CATEGORIES.includes(updates.category)) {
      return res.status(400).json({ success: false, message: `category must be one of ${Item.CATEGORIES.join(', ')}` });
    }
    if (updates.type !== undefined && !['lost', 'found'].includes(updates.type)) {
      return res.status(400).json({ success: false, message: "type must be 'lost' or 'found'" });
    }
    if (updates.title !== undefined && (updates.title.trim().length < 3 || updates.title.trim().length > 100)) {
      return res.status(400).json({ success: false, message: 'Title must be between 3 and 100 characters' });
    }
    if (updates.description !== undefined && (updates.description.trim().length < 5 || updates.description.trim().length > 1500)) {
      return res.status(400).json({ success: false, message: 'Description must be between 5 and 1500 characters' });
    }

    if (req.body.eventDate !== undefined) {
      const text = String(req.body.eventDate);
      const d = new Date(`${text}T00:00:00Z`);
      const real = /^\d{4}-\d{2}-\d{2}$/.test(text) &&
        !Number.isNaN(d.getTime()) &&
        d.toISOString().slice(0, 10) === text;
      if (!real) {
        return res.status(400).json({ success: false, message: 'eventDate must be a real date in YYYY-MM-DD form' });
      }
      const istToday = new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
      if (text > istToday) {
        return res.status(400).json({ success: false, message: 'Date cannot be in the future' });
      }
      updates.eventDate = d.toISOString().slice(0, 10);
    }

    // Only an administrator may change the lifecycle status: otherwise an owner
    // could mark their own item recovered and skip the recovery-request flow.
    if (req.body.status !== undefined) {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Only an administrator can change the status' });
      }
      if (!Item.STATUSES.includes(req.body.status)) {
        return res.status(400).json({ success: false, message: `status must be one of ${Item.STATUSES.join(', ')}` });
      }
      updates.status = req.body.status;
    }

    // ---- storage work last, so a rejected request never leaves an orphan ----
    let replacedPublicId = '';
    const wantsRemoval = !req.file && (req.body.removeImage === 'true' || req.body.removeImage === true);

    if (wantsRemoval) {
      updates.imageUrl = '';
      updates.imagePublicId = '';
      replacedPublicId = existing.image_public_id || '';
    }

    if (req.file) {
      const uploaded = await uploadImage(req.file);
      updates.imageUrl = uploaded.url;
      updates.imagePublicId = uploaded.publicId;
      replacedPublicId = existing.image_public_id || '';
    }

    const row = await Item.update(req.params.id, updates);
    if (!row) return res.status(404).json({ success: false, message: 'Item no longer exists' });
    if (replacedPublicId) await destroyImage(replacedPublicId);
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

    // The FK is ON DELETE CASCADE, so removing the row removes its requests.
    // The photo goes only after the row is gone, so a failure cannot leave an
    // item pointing at a deleted file.
    await Item.remove(existing.id);
    await destroyImage(existing.image_public_id);

    res.json({ success: true, message: 'Report deleted' });
  } catch (error) {
    next(error);
  }
};
