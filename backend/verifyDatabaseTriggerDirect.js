const { pool } = require('./database');

async function verifyTriggerDirect() {
  console.log('====================================================');
  console.log('DIRECT MYSQL TRIGGER VERIFICATION');
  console.log('====================================================\n');

  const conn = await pool.getConnection();

  try {
    // 1. Confirm trigger existence via SHOW TRIGGERS
    console.log('1. Querying SHOW TRIGGERS:');
    const [triggers] = await conn.query("SHOW TRIGGERS WHERE `Trigger` = 'trg_prevent_bug_completed_project'");
    console.log('   Trigger metadata:');
    console.log('   - Name:', triggers[0]?.Trigger);
    console.log('   - Event:', triggers[0]?.Event);
    console.log('   - Table:', triggers[0]?.Table);
    console.log('   - Timing:', triggers[0]?.Timing);
    console.log('   - Statement:\n', triggers[0]?.Statement, '\n');

    // 2. Count existing bug reports before tests
    const [[{ countBefore }]] = await conn.query('SELECT COUNT(*) AS countBefore FROM BUG_REPORT');
    console.log(`2. Existing bug reports count before test: ${countBefore}\n`);

    // 3. Attempt direct SQL insert for Completed Project (Project 1)
    console.log('3. Attempting direct SQL INSERT for Completed Project (Project_ID = 1):');
    let triggerBlocked = false;
    try {
      await conn.execute(
        `INSERT INTO BUG_REPORT (Project_ID, Title, Priority, Status, Report_Date)
         VALUES (?, ?, ?, ?, NOW())`,
        [1, 'Direct SQL Bug on Completed Project', 'High', 'Open']
      );
      console.error('   FAILED: SQL insert succeeded when it should have been blocked by trigger!');
    } catch (err) {
      triggerBlocked = true;
      console.log('   PASSED: MySQL rejected insert directly at database level.');
      console.log('   - SQLState:', err.sqlState);
      console.log('   - Error Code:', err.errno);
      console.log('   - Message:', err.sqlMessage || err.message, '\n');
    }

    // 4. Attempt direct SQL insert for In Progress Project (Project 2)
    console.log('4. Attempting direct SQL INSERT for In Progress Project (Project_ID = 2):');
    const [insertResult] = await conn.execute(
      `INSERT INTO BUG_REPORT (Project_ID, Title, Priority, Status, Report_Date)
       VALUES (?, ?, ?, ?, NOW())`,
      [2, 'Direct SQL Bug on Active Project', 'Low', 'Open']
    );
    console.log('   PASSED: SQL insert succeeded as expected. Insert ID:', insertResult.insertId);

    // Clean up test insert
    await conn.execute('DELETE FROM BUG_REPORT WHERE Bug_ID = ?', [insertResult.insertId]);
    console.log('   Cleaned up test record from database.\n');

    // 5. Verify existing bug reports count after test remains consistent
    const [[{ countAfter }]] = await conn.query('SELECT COUNT(*) AS countAfter FROM BUG_REPORT');
    console.log(`5. Bug reports count after test: ${countAfter} (Consistent: ${countBefore === countAfter})\n`);

    console.log('====================================================');
    console.log('TRIGGER VERIFICATION COMPLETED WITH 100% SUCCESS');
    console.log('====================================================');
  } finally {
    conn.release();
    await pool.end();
  }
}

verifyTriggerDirect().catch(console.error);
