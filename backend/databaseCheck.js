const { pool } = require("./database");

const REQUIRED_SCHEMA = {
  faculty: ["Faculty_ID", "Name", "Email", "Password"],
  project: ["Project_ID", "Faculty_ID", "Title", "Description", "Status", "Start_Date", "End_Date"],
  team: ["Team_ID", "Project_ID", "Team_Name"],
  student: ["Student_ID", "Team_ID", "Name", "Email", "Phone", "Year", "Password"],
  task: ["Task_ID", "Project_ID", "Student_ID", "Task_Name", "Description", "Priority", "Status"],
  bug_report: ["Bug_ID", "Task_ID", "Faculty_ID", "Student_ID", "Priority", "Status", "Title", "Report_Date"]
};

async function verifyDatabaseSchema() {
  try {
    // 1. Verify Database Connection
    await pool.query("SELECT 1");

    // 2. Fetch existing tables in the database
    const dbName = process.env.DB_NAME || "bug_tracking_system";
    const [tables] = await pool.query(
      `SELECT TABLE_NAME 
       FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ?`,
      [dbName]
    );

    const existingTableNames = new Set(tables.map(t => t.TABLE_NAME.toLowerCase()));
    const missingTables = [];
    const missingColumns = [];

    // 3. Verify Tables & Columns
    for (const [tableName, requiredCols] of Object.entries(REQUIRED_SCHEMA)) {
      if (!existingTableNames.has(tableName.toLowerCase())) {
        missingTables.push(tableName);
        continue;
      }

      // Fetch columns for table
      const [cols] = await pool.query(
        `SELECT COLUMN_NAME 
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
        [dbName, tableName]
      );

      const existingColNames = new Set(cols.map(c => c.COLUMN_NAME.toLowerCase()));

      for (const col of requiredCols) {
        if (!existingColNames.has(col.toLowerCase())) {
          missingColumns.push(`${tableName}.${col}`);
        }
      }
    }

    if (missingTables.length > 0 || missingColumns.length > 0) {
      let errorMsg = "Database Schema Check Failed!\n";
      if (missingTables.length > 0) {
        errorMsg += `Missing Tables: ${missingTables.join(", ")}\n`;
      }
      if (missingColumns.length > 0) {
        errorMsg += `Missing Columns: ${missingColumns.join(", ")}\n`;
      }
      errorMsg += "Please run database initialization/seed using 'npm run seed'.";
      throw new Error(errorMsg);
    }

    return { valid: true, message: "Database connection and schema verified successfully." };
  } catch (error) {
    throw error;
  }
}

module.exports = {
  verifyDatabaseSchema,
  REQUIRED_SCHEMA
};
