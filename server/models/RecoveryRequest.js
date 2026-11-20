// Data access for app_v2.recovery_requests. SQL only - no ORM.
const { query } = require('../config/database');

const SELECT = `
  select r.*,
         i.title as item_title, i.type as item_type, i.status as item_status,
         i.location as item_location, i.image_url as item_image_url,
         i.reported_by as item_owner_id,
         u.name as requester_name, u.email as requester_email, u.student_id as requester_student_id
  from app_v2.recovery_requests r
  join app_v2.items i on i.id = r.item_id
  join app_v2.users u on u.id = r.requester_id
`;

const toApi = (row) =>
  row && {
    _id: row.id,
    item: {
      _id: row.item_id,
      title: row.item_title,
      type: row.item_type,
      status: row.item_status,
      location: row.item_location,
      imageUrl: row.item_image_url,
      reportedById: row.item_owner_id,
    },
    requester: {
      _id: row.requester_id,
      name: row.requester_name,
      email: row.requester_email,
      studentId: row.requester_student_id || '',
    },
    message: row.message,
    status: row.status,
    reviewedBy: row.reviewed_by,
    createdAt: row.created_at,
  };

async function create({ itemId, requesterId, message }) {
  const { rows } = await query(
    `insert into app_v2.recovery_requests (item_id, requester_id, message)
     values ($1,$2,$3) returning id`,
    [itemId, requesterId, message.trim()]
  );
  return findById(rows[0].id);
}

async function findById(id) {
  const { rows } = await query(`${SELECT} where r.id = $1`, [id]);
  return rows[0] || null;
}

async function findByItemAndUser(itemId, requesterId) {
  const { rows } = await query(
    'select * from app_v2.recovery_requests where item_id = $1 and requester_id = $2',
    [itemId, requesterId]
  );
  return rows[0] || null;
}

async function byRequester(userId) {
  const { rows } = await query(`${SELECT} where r.requester_id = $1 order by r.created_at desc`, [userId]);
  return rows;
}

async function forOwner(userId) {
  const { rows } = await query(
    `${SELECT} where i.reported_by = $1 order by r.created_at desc`,
    [userId]
  );
  return rows;
}

async function forItem(itemId) {
  const { rows } = await query(`${SELECT} where r.item_id = $1 order by r.created_at desc`, [itemId]);
  return rows;
}

async function setStatus(id, status, reviewedBy) {
  await query(
    'update app_v2.recovery_requests set status = $1, reviewed_by = $2 where id = $3',
    [status, reviewedBy, id]
  );
  return findById(id);
}

async function rejectOtherPending(itemId, exceptId, reviewedBy) {
  await query(
    `update app_v2.recovery_requests set status = 'rejected', reviewed_by = $1
     where item_id = $2 and status = 'pending' and id <> $3`,
    [reviewedBy, itemId, exceptId]
  );
}

async function removeByItem(itemId) {
  await query('delete from app_v2.recovery_requests where item_id = $1', [itemId]);
}

async function countPending() {
  const { rows } = await query(
    `select count(*)::int as total from app_v2.recovery_requests where status = 'pending'`
  );
  return rows[0].total;
}

async function all() {
  const { rows } = await query(`${SELECT} order by r.created_at desc`);
  return rows;
}

module.exports = {
  toApi,
  create,
  findById,
  findByItemAndUser,
  byRequester,
  forOwner,
  forItem,
  setStatus,
  rejectOtherPending,
  removeByItem,
  countPending,
  all,
};
