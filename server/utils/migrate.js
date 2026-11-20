// Applies supabase/schema.sql to the database in DATABASE_URL.
// Run with: npm run migrate
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool, query, testConnection } = require('../config/database');

const schemaPath = path.join(__dirname, '..', 'supabase', 'schema.sql');

const run = async () => {
  const ok = await testConnection();
  if (!ok) process.exit(1);

  const sql = fs.readFileSync(schemaPath, 'utf8');
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.split('\n').every((l) => l.trim().startsWith('--') || l.trim() === ''));

  console.log(`Running ${statements.length} statements from schema.sql`);

  let okCount = 0;
  for (const statement of statements) {
    const label = statement.replace(/\s+/g, ' ').slice(0, 60);
    try {
      await query(statement);
      okCount += 1;
      console.log(`  OK    ${label}`);
    } catch (error) {
      console.log(`  SKIP  ${label} -> ${error.message}`);
    }
  }

  const check = await query(`
    select table_name from information_schema.tables
    where table_schema = 'app_v2' order by table_name
  `);
  console.log('\nStatements OK:', okCount);
  console.log('Tables in app_v2:', check.rows.map((r) => r.table_name).join(', ') || 'NONE');

  await pool.end();
};

run().catch(async (error) => {
  console.error('Migrate failed:', error.message);
  try { await pool.end(); } catch (e) { /* ignore */ }
  process.exit(1);
});
