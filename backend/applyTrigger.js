const { pool } = require('./database');

async function applyTrigger() {
  const connection = await pool.getConnection();
  try {
    console.log('Dropping existing triggers if present...');
    await connection.query('DROP TRIGGER IF EXISTS trg_prevent_bug_on_completed_project');
    await connection.query('DROP TRIGGER IF EXISTS trg_prevent_bug_completed_project');

    console.log('Creating trigger trg_prevent_bug_completed_project...');
    const triggerSQL = `
      CREATE TRIGGER trg_prevent_bug_completed_project
      BEFORE INSERT ON BUG_REPORT
      FOR EACH ROW
      BEGIN
          DECLARE pstatus VARCHAR(30);

          SELECT Status
          INTO pstatus
          FROM PROJECT
          WHERE Project_ID = NEW.Project_ID;

          IF pstatus = 'Completed' THEN
              SIGNAL SQLSTATE '45000'
              SET MESSAGE_TEXT = 'Cannot report a bug for a completed project';
          END IF;
      END
    `;
    await connection.query(triggerSQL);
    console.log('Trigger created successfully.');

    const [triggers] = await connection.query("SHOW TRIGGERS WHERE `Trigger` = 'trg_prevent_bug_completed_project'");
    console.log('Trigger verified in database:', triggers);
  } catch (error) {
    console.error('Failed to apply trigger:', error);
    process.exit(1);
  } finally {
    connection.release();
    await pool.end();
  }
}

applyTrigger();
