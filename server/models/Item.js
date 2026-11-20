// Data access for app_v2.items. SQL only - no ORM.
const { query } = require('../config/database');

const CATEGORIES = [
  'Electronics', 'Books', 'ID Card', 'Wallet', 'Keys',
  'Clothing', 'Accessories', 'Sports', 'Other',
];
const STATUSES = ['open', 'under-review', 'matched', 'recovered', 'closed'];

const SELECT = `
  select i.*, u.name as reporter_name, u.student_id as reporter_student_id
  from app_v2.items i
  join app_v2.users u on u.id = i.reported_by
`;

const toApi = (row) =>
  row && {
    _id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    type: row.type,
    location: row.location,
    eventDate: row.event_date,
    identifyingFeatures: row.identifying_features || '',
    imageUrl: row.image_url || '',
    status: row.status,
    reportedBy: {
      _id: row.reported_by,
      name: row.reporter_name,
      studentId: row.reporter_student_id || '',
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

// Builds WHERE + values from the query string; every value is a $n placeholder
function buildFilter({ q, type, category, location, status, dateFrom, dateTo, reportedBy }) {
  const conditions = [];
  const values = [];

  if (q) {
    values.push(`%${q}%`);
    const n = values.length;
    conditions.push(`(i.title ilike $${n} or i.description ilike $${n})`);
  }
  if (type) {
    values.push(type);
    conditions.push(`i.type = $${values.length}`);
  }
  if (category) {
    values.push(category);
    conditions.push(`i.category = $${values.length}`);
  }
  if (location) {
    values.push(`%${location}%`);
    conditions.push(`i.location ilike $${values.length}`);
  }
  if (status) {
    values.push(status);
    conditions.push(`i.status = $${values.length}`);
  }
  if (dateFrom) {
    values.push(dateFrom);
    conditions.push(`i.event_date >= $${values.length}`);
  }
  if (dateTo) {
    values.push(dateTo);
    conditions.push(`i.event_date <= $${values.length}`);
  }
  if (reportedBy) {
    values.push(reportedBy);
    conditions.push(`i.reported_by = $${values.length}`);
  }

  return { where: conditions.length ? `where ${conditions.join(' and ')}` : '', values };
}

async function list({ filters, page = 1, limit = 9, sort = 'newest' }) {
  const { where, values } = buildFilter(filters || {});
  const direction = sort === 'oldest' ? 'asc' : 'desc';

  const countRes = await query(`select count(*)::int as total from app_v2.items i ${where}`, values);
  const total = countRes.rows[0].total;

  const rows = await query(
    `${SELECT} ${where} order by i.event_date ${direction}, i.created_at ${direction}
     limit $${values.length + 1} offset $${values.length + 2}`,
    [...values, limit, (page - 1) * limit]
  );

  return { total, items: rows.rows };
}

async function findById(id) {
  const { rows } = await query(`${SELECT} where i.id = $1`, [id]);
  return rows[0] || null;
}

async function create(data) {
  const { rows } = await query(
    `insert into app_v2.items
       (title, description, category, type, location, event_date,
        identifying_features, image_url, image_public_id, reported_by)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     returning id`,
    [
      data.title.trim(),
      data.description.trim(),
      data.category,
      data.type,
      data.location.trim(),
      data.eventDate,
      data.identifyingFeatures || '',
      data.imageUrl || '',
      data.imagePublicId || '',
      data.reportedBy,
    ]
  );
  return findById(rows[0].id);
}

async function update(id, fields) {
  const allowed = {
    title: 'title',
    description: 'description',
    category: 'category',
    type: 'type',
    location: 'location',
    eventDate: 'event_date',
    identifyingFeatures: 'identifying_features',
    status: 'status',
    imageUrl: 'image_url',
  };

  const sets = [];
  const values = [];
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && allowed[key]) {
      values.push(value);
      sets.push(`${allowed[key]} = $${values.length}`);
    }
  });

  if (!sets.length) return findById(id);

  values.push(id);
  await query(
    `update app_v2.items set ${sets.join(', ')}, updated_at = now() where id = $${values.length}`,
    values
  );
  return findById(id);
}

async function remove(id) {
  await query('delete from app_v2.items where id = $1', [id]);
}

async function myReports(userId) {
  const { rows } = await query(
    `${SELECT} where i.reported_by = $1 order by i.created_at desc`,
    [userId]
  );
  return rows;
}

async function stats() {
  const { rows } = await query(`
    select
      (select count(*)::int from app_v2.items)                                    as total_reports,
      (select count(*)::int from app_v2.items where type = 'lost')               as lost,
      (select count(*)::int from app_v2.items where type = 'found')              as found,
      (select count(*)::int from app_v2.items where status = 'recovered')        as recovered,
      (select count(*)::int from app_v2.items where status = 'open')             as open_reports
  `);
  const r = rows[0];
  return {
    totalReports: r.total_reports,
    lost: r.lost,
    found: r.found,
    recovered: r.recovered,
    openReports: r.open_reports,
  };
}

// Reports of the opposite type with a similar title (duplicate / match alert)
async function findMatches(item) {
  const words = String(item.title).toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  if (!words.length) return [];

  const patterns = words.map((w) => `%${w}%`);
  const opposite = item.type === 'lost' ? 'found' : 'lost';

  const { rows } = await query(
    `${SELECT}
     where i.id <> $1
       and i.type = $2
       and i.status in ('open', 'under-review')
       and (i.title ilike any($3::text[]) or i.description ilike any($3::text[]))
     order by i.event_date desc
     limit 5`,
    [item.id, opposite, patterns]
  );
  return rows;
}

async function byCategory() {
  const { rows } = await query(
    `select category, count(*)::int as count from app_v2.items group by category order by count desc`
  );
  return rows;
}

async function recent(limit = 8) {
  const { rows } = await query(`${SELECT} order by i.created_at desc limit $1`, [limit]);
  return rows;
}

module.exports = {
  CATEGORIES,
  STATUSES,
  toApi,
  list,
  findById,
  create,
  update,
  remove,
  myReports,
  stats,
  findMatches,
  byCategory,
  recent,
};
