const mysql = require('mysql2/promise');
mysql.createConnection({host: 'localhost', user: 'root', password: 'root', database: 'bug_tracking_system'}).then(async c => {
  const [res] = await c.query('SELECT * FROM PROJECT WHERE Title LIKE "%Front-End Problem%"');
  console.log("PROJECT:", res);
  const [res2] = await c.query('SELECT * FROM STUDENT WHERE Name LIKE "%Ishu%"');
  console.log("STUDENT:", res2);
  process.exit(0);
}).catch(console.error);
