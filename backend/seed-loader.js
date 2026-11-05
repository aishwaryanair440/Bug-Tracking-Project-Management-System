const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function runSeed() {
  const host = process.env.DB_HOST || "localhost";
  const port = parseInt(process.env.DB_PORT || "3306", 10);
  const user = process.env.DB_USER || "root";
  const password = process.env.DB_PASSWORD || "";
  const dbName = process.env.DB_NAME || "bug_tracking_system";

  const sqlFilePath = path.join(__dirname, "sql", "bug_tracking_system.sql");

  if (!fs.existsSync(sqlFilePath)) {
    console.error(`Seed file not found at: ${sqlFilePath}`);
    process.exit(1);
  }

  console.log(`Reading SQL seed file from: ${sqlFilePath}...`);
  const sqlScript = fs.readFileSync(sqlFilePath, "utf8");

  console.log(`Connecting to MySQL server at ${host}:${port}...`);
  let connection;
  try {
    // Initial connection without database to ensure database exists
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      multipleStatements: true
    });

    console.log(`Ensuring database '${dbName}' exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await connection.query(`USE \`${dbName}\``);

    console.log(`Executing database initialization and seed statements...`);
    await connection.query(sqlScript);

    console.log("Database initialized and seed data loaded successfully!");
  } catch (error) {
    console.error("Error executing database seed script:", error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

if (require.main === module) {
  runSeed();
}

module.exports = { runSeed };
