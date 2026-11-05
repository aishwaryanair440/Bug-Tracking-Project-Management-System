const { pool } = require('./database');

async function run() {
  const [cols] = await pool.query('DESCRIBE bug_report');
  console.log('Columns of bug_report:');
  console.table(cols.map(c => ({ Field: c.Field, Type: c.Type, Null: c.Null, Key: c.Key, Default: c.Default })));

  const [fks] = await pool.query(`
    SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = 'bug_tracking_system' AND TABLE_NAME = 'bug_report' AND REFERENCED_TABLE_NAME IS NOT NULL
  `);
  console.log('Foreign Keys of bug_report:');
  console.table(fks);

  const [commentsCols] = await pool.query('DESCRIBE comments').catch(() => [[]]);
  console.log('Columns of comments:');
  console.table(commentsCols.map(c => ({ Field: c.Field, Type: c.Type, Null: c.Null, Key: c.Key, Default: c.Default })));

  await pool.end();
}

run().catch(console.error);
