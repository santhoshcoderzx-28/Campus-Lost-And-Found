// Data access for app_v2.users. SQL only - no ORM.
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

const PUBLIC_COLUMNS =
  'id, name, email, student_id, role, account_status, email_verified, created_at';

const hashPassword = (plain) => bcrypt.hash(plain, 10);
const comparePassword = (plain, hash) => bcrypt.compare(plain, hash);

// Shape sent to the client
const toPublic = (row) =>
  row && {
    _id: row.id,
    name: row.name,
    email: row.email,
    studentId: row.student_id || '',
    role: row.role,
    accountStatus: row.account_status,
    emailVerified: row.email_verified !== false,
    createdAt: row.created_at,
  };

async function findById(id) {
  const { rows } = await query(
    `select id, name, email, student_id, role, account_status, created_at, password_hash
     from app_v2.users where id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function findByEmail(email) {
  const { rows } = await query(
    `select id, name, email, student_id, role, account_status, created_at, password_hash
     from app_v2.users where email = $1`,
    [String(email).toLowerCase().trim()]
  );
  return rows[0] || null;
}

async function create({ name, email, studentId, password, verificationToken = null, verificationExpires = null }) {
  const passwordHash = await hashPassword(password);
  const { rows } = await query(
    `insert into app_v2.users
       (name, email, student_id, password_hash, email_verified, verification_token, verification_expires)
     values ($1, $2, $3, $4, $5, $6, $7)
     returning ${PUBLIC_COLUMNS}`,
    [
      name.trim(),
      String(email).toLowerCase().trim(),
      studentId || '',
      passwordHash,
      verificationToken ? false : true,
      verificationToken,
      verificationExpires,
    ]
  );
  return rows[0];
}

// ---- email verification ----
async function setVerificationToken(id, token, expires) {
  await query(
    'update app_v2.users set verification_token = $1, verification_expires = $2 where id = $3',
    [token, expires, id]
  );
}

async function findByVerificationToken(token) {
  const { rows } = await query(
    'select * from app_v2.users where verification_token = $1 and verification_expires > now()',
    [token]
  );
  return rows[0] || null;
}

async function markVerified(id) {
  await query(
    'update app_v2.users set email_verified = true, verification_token = null, verification_expires = null where id = $1',
    [id]
  );
}

// ---- password reset ----
async function setResetToken(email, token, expires) {
  const { rowCount } = await query(
    'update app_v2.users set reset_token = $1, reset_expires = $2 where email = $3',
    [token, expires, String(email).toLowerCase().trim()]
  );
  return rowCount > 0;
}

async function findByResetToken(token) {
  const { rows } = await query(
    'select * from app_v2.users where reset_token = $1 and reset_expires > now()',
    [token]
  );
  return rows[0] || null;
}

async function clearResetToken(id) {
  await query('update app_v2.users set reset_token = null, reset_expires = null where id = $1', [id]);
}

async function updatePassword(id, password) {
  const passwordHash = await hashPassword(password);
  await query('update app_v2.users set password_hash = $1 where id = $2', [passwordHash, id]);
}

async function updateProfile(id, { name, studentId }) {
  const { rows } = await query(
    `update app_v2.users set name = coalesce($1, name), student_id = coalesce($2, student_id)
     where id = $3 returning ${PUBLIC_COLUMNS}`,
    [name || null, studentId === undefined ? null : studentId, id]
  );
  return rows[0];
}

async function updateStatus(id, accountStatus) {
  const { rows } = await query(
    `update app_v2.users set account_status = $1 where id = $2 returning ${PUBLIC_COLUMNS}`,
    [accountStatus, id]
  );
  return rows[0] || null;
}

async function list() {
  const { rows } = await query(
    `select ${PUBLIC_COLUMNS} from app_v2.users order by created_at desc`
  );
  return rows;
}

async function count() {
  const { rows } = await query('select count(*)::int as total from app_v2.users');
  return rows[0].total;
}

module.exports = {
  toPublic,
  hashPassword,
  comparePassword,
  findById,
  findByEmail,
  create,
  updatePassword,
  updateProfile,
  updateStatus,
  list,
  count,
  setVerificationToken,
  findByVerificationToken,
  markVerified,
  setResetToken,
  findByResetToken,
  clearResetToken,
};
