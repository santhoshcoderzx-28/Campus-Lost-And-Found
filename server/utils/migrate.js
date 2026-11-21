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
  const failures = [];
  for (const statement of statements) {
    const label = statement.replace(/\s+/g, ' ').slice(0, 60);
    try {
      await query(statement);
      okCount += 1;
      console.log(`  OK    ${label}`);
    } catch (error) {
      // The storage bucket row only exists on Supabase; anything else failing
      // is a real migration failure and must not look like success.
      if (label.includes('storage.buckets')) {
        console.log(`  SKIP  ${label} -> ${error.message} (storage row only)`);
      } else {
        failures.push(`${label} -> ${error.message}`);
        console.log(`  FAIL  ${label} -> ${error.message}`);
      }
    }
  }

  const check = await query(`
    select table_name from information_schema.tables
    where table_schema = 'app_v2' order by table_name
  `);
  console.log('\nStatements OK:', okCount);
  console.log('Tables in app_v2:', check.rows.map((r) => r.table_name).join(', ') || 'NONE');

  if (failures.length > 0) {
    console.error(`\n${failures.length} statement(s) failed:`);
    failures.forEach((f) => console.error('  -', f));
    await pool.end();
    process.exit(1);
  }

  if (check.rows.length !== 3) {
    console.error('\nExpected 3 tables in app_v2, found', check.rows.length);
    await pool.end();
    process.exit(1);
  }

  await pool.end();
};

run().catch(async (error) => {
  console.error('Migrate failed:', error.message);
  try { await pool.end(); } catch (e) { /* ignore */ }
  process.exit(1);
});
