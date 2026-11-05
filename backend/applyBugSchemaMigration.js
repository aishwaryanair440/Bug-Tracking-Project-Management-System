const { pool } = require('./database');

async function migrate() {
  const conn = await pool.getConnection();
  try {
    console.log('--- Starting Database Migration for BUG_REPORT ---');

    // 1. Check and drop comments table (backup first)
    console.log('1. Backing up and dropping comments table...');
    await conn.query('CREATE TABLE IF NOT EXISTS _backup_comments AS SELECT * FROM comments').catch(() => {});
    await conn.query('DROP TABLE IF EXISTS comments');
    console.log('   Comments table backed up to _backup_comments and dropped.');

    // 2. Drop foreign keys on Project_ID in bug_report
    console.log('2. Dropping foreign key constraints on Project_ID in bug_report...');
    const [fks] = await conn.query(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'bug_report' 
        AND COLUMN_NAME = 'Project_ID' 
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `);

    for (const fk of fks) {
      console.log(`   Dropping FK: ${fk.CONSTRAINT_NAME}`);
      await conn.query(`ALTER TABLE bug_report DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``);
    }

    // 3. Drop columns Project_ID and Reported_By_Role if they exist
    console.log('3. Dropping Project_ID and Reported_By_Role columns from bug_report...');
    const [cols] = await conn.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'bug_report'
    `);
    const colNames = cols.map(c => c.COLUMN_NAME);

    if (colNames.includes('Project_ID')) {
      await conn.query('ALTER TABLE bug_report DROP COLUMN Project_ID');
      console.log('   Dropped Project_ID column.');
    }
    if (colNames.includes('Reported_By_Role')) {
      await conn.query('ALTER TABLE bug_report DROP COLUMN Reported_By_Role');
      console.log('   Dropped Reported_By_Role column.');
    }

    // Ensure Task_ID is set for existing rows
    const [taskDefault] = await conn.query('SELECT Task_ID FROM TASK LIMIT 1');
    const defaultTaskId = taskDefault[0]?.Task_ID || 1;
    await conn.query(`UPDATE bug_report SET Task_ID = ? WHERE Task_ID IS NULL`, [defaultTaskId]);

    // Ensure Faculty_ID and Student_ID exist and are properly referenced
    // 4. Update the trigger to join via TASK table
    console.log('4. Recreating trigger trg_prevent_bug_completed_project (via TASK.Project_ID)...');
    await conn.query('DROP TRIGGER IF EXISTS trg_prevent_bug_completed_project');
    const triggerSQL = `
      CREATE TRIGGER trg_prevent_bug_completed_project
      BEFORE INSERT ON BUG_REPORT
      FOR EACH ROW
      BEGIN
          DECLARE pstatus VARCHAR(30);

          SELECT P.Status
          INTO pstatus
          FROM TASK T
          JOIN PROJECT P ON T.Project_ID = P.Project_ID
          WHERE T.Task_ID = NEW.Task_ID;

          IF pstatus = 'Completed' THEN
              SIGNAL SQLSTATE '45000'
              SET MESSAGE_TEXT = 'Cannot report a bug for a completed project';
          END IF;
      END
    `;
    await conn.query(triggerSQL);
    console.log('   Trigger recreated successfully.');

    // 5. Verify final columns
    console.log('5. Final schema of bug_report:');
    const [finalCols] = await conn.query('DESCRIBE bug_report');
    console.table(finalCols.map(c => ({ Field: c.Field, Type: c.Type, Null: c.Null, Key: c.Key })));

    console.log('--- Migration completed successfully ---');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    conn.release();
    await pool.end();
  }
}

migrate();
