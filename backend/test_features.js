require('dotenv').config();
const mysql = require('mysql2/promise');

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('=== STARTING AUTOMATED FEATURE TESTS ===\n');
  let passed = 0;
  let total = 0;

  function assert(condition, testName, details = '') {
    total++;
    if (condition) {
      console.log(`PASS [${total}] ${testName}`);
      passed++;
    } else {
      console.error(`FAIL [${total}] ${testName} - ${details}`);
    }
  }

  // MySQL connection for direct database verification
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'bug_tracking_system'
  });

  try {
    // -------------------------------------------------------------
    // TEST SUITE 1: Task Details (GET /api/tasks/:id)
    // -------------------------------------------------------------
    console.log('\n--- SUITE 1: Task Details Retrieval & Schema Verification ---');
    const taskRes = await fetch(`${BASE_URL}/api/tasks/1`);
    assert(taskRes.status === 200, 'GET /api/tasks/1 returns HTTP 200 OK');
    const taskData = await taskRes.json();

    assert(taskData.Task_ID === 1, 'Task record contains Task_ID', `Got ${taskData.Task_ID}`);
    assert(typeof taskData.Task_Name === 'string' && taskData.Task_Name.length > 0, 'Task record contains Task_Name (title)');
    assert(taskData.Description !== undefined, 'Task record contains Description');
    assert(taskData.Priority !== undefined, 'Task record contains Priority');
    assert(taskData.Status !== undefined, 'Task record contains Status');
    assert(taskData.Project_ID !== undefined, 'Task record contains Project_ID');
    assert(typeof taskData.Project_Title === 'string' && taskData.Project_Title.length > 0, 'Task record contains Project_Title');
    assert(taskData.Project_Start_Date !== undefined, 'Task record contains Project_Start_Date');
    assert(taskData.Project_End_Date !== undefined, 'Task record contains Project_End_Date');
    assert(taskData.Student_ID !== undefined, 'Task record contains Student_ID');
    assert(typeof taskData.Assigned_Student === 'string' && taskData.Assigned_Student.length > 0, 'Task record contains Assigned_Student name');
    assert(typeof taskData.Student_Email === 'string' && taskData.Student_Email.includes('@'), 'Task record contains Student_Email');

    // -------------------------------------------------------------
    // TEST SUITE 2: Task Status Updates (PUT /api/tasks/:id/status)
    // -------------------------------------------------------------
    console.log('\n--- SUITE 2: Task Status Dropdown & MySQL Persistence ---');

    // Update to 'Completed'
    const updateTaskRes1 = await fetch(`${BASE_URL}/api/tasks/1/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Completed' })
    });
    assert(updateTaskRes1.status === 200, 'PUT /api/tasks/1/status with "Completed" returns HTTP 200');

    // Verify in MySQL directly
    const [dbTaskRows1] = await db.query('SELECT Status FROM TASK WHERE Task_ID = 1');
    assert(dbTaskRows1[0].Status === 'Completed', 'Task status is persisted as "Completed" in MySQL database');

    // Update to 'In Progress'
    const updateTaskRes2 = await fetch(`${BASE_URL}/api/tasks/1/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'In Progress' })
    });
    assert(updateTaskRes2.status === 200, 'PUT /api/tasks/1/status with "In Progress" returns HTTP 200');

    // Verify in MySQL directly
    const [dbTaskRows2] = await db.query('SELECT Status FROM TASK WHERE Task_ID = 1');
    assert(dbTaskRows2[0].Status === 'In Progress', 'Task status is persisted as "In Progress" in MySQL database');

    // Update to 'Pending'
    const updateTaskRes3 = await fetch(`${BASE_URL}/api/tasks/1/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Pending' })
    });
    assert(updateTaskRes3.status === 200, 'PUT /api/tasks/1/status with "Pending" returns HTTP 200');

    const [dbTaskRows3] = await db.query('SELECT Status FROM TASK WHERE Task_ID = 1');
    assert(dbTaskRows3[0].Status === 'Pending', 'Task status is persisted as "Pending" in MySQL database');

    // Reset task 1 back to 'In Progress'
    await fetch(`${BASE_URL}/api/tasks/1/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'In Progress' })
    });

    // Test Invalid Task Status
    const invalidTaskRes = await fetch(`${BASE_URL}/api/tasks/1/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'InventedStatus' })
    });
    assert(invalidTaskRes.status === 400, 'PUT /api/tasks/1/status with invalid status rejected with HTTP 400 Bad Request');

    // -------------------------------------------------------------
    // TEST SUITE 3: Bug Status Updates (PUT /api/bugs/:id/status)
    // -------------------------------------------------------------
    console.log('\n--- SUITE 3: Bug Status Dropdown & MySQL Persistence ---');

    // Update to 'In Progress'
    const updateBugRes1 = await fetch(`${BASE_URL}/api/bugs/1/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'In Progress' })
    });
    assert(updateBugRes1.status === 200, 'PUT /api/bugs/1/status with "In Progress" returns HTTP 200');

    const [dbBugRows1] = await db.query('SELECT Status FROM BUG_REPORT WHERE Bug_ID = 1');
    assert(dbBugRows1[0].Status === 'In Progress', 'Bug status is persisted as "In Progress" in MySQL database');

    // Update to 'Resolved'
    const updateBugRes2 = await fetch(`${BASE_URL}/api/bugs/1/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Resolved' })
    });
    assert(updateBugRes2.status === 200, 'PUT /api/bugs/1/status with "Resolved" returns HTTP 200');

    const [dbBugRows2] = await db.query('SELECT Status FROM BUG_REPORT WHERE Bug_ID = 1');
    assert(dbBugRows2[0].Status === 'Resolved', 'Bug status is persisted as "Resolved" in MySQL database');

    // Update to 'Under Review'
    const updateBugRes3 = await fetch(`${BASE_URL}/api/bugs/1/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Under Review' })
    });
    assert(updateBugRes3.status === 200, 'PUT /api/bugs/1/status with "Under Review" returns HTTP 200');

    const [dbBugRows3] = await db.query('SELECT Status FROM BUG_REPORT WHERE Bug_ID = 1');
    assert(dbBugRows3[0].Status === 'Under Review', 'Bug status is persisted as "Under Review" in MySQL database');

    // Update to 'Open'
    const updateBugRes4 = await fetch(`${BASE_URL}/api/bugs/1/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Open' })
    });
    assert(updateBugRes4.status === 200, 'PUT /api/bugs/1/status with "Open" returns HTTP 200');

    const [dbBugRows4] = await db.query('SELECT Status FROM BUG_REPORT WHERE Bug_ID = 1');
    assert(dbBugRows4[0].Status === 'Open', 'Bug status is persisted as "Open" in MySQL database');

    // Restore bug 1 to 'Under Review'
    await fetch(`${BASE_URL}/api/bugs/1/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Under Review' })
    });

    // Test Invalid Bug Status
    const invalidBugRes = await fetch(`${BASE_URL}/api/bugs/1/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'RandomInvalidStatus' })
    });
    assert(invalidBugRes.status === 400, 'PUT /api/bugs/1/status with invalid status rejected with HTTP 400 Bad Request');

    // -------------------------------------------------------------
    // TEST SUITE 4: Non-existent Entities
    // -------------------------------------------------------------
    console.log('\n--- SUITE 4: Error Handling for Non-Existent Records ---');
    const nonExistentTask = await fetch(`${BASE_URL}/api/tasks/999999`);
    assert(nonExistentTask.status === 404, 'GET /api/tasks/999999 returns HTTP 404 Not Found');

    const nonExistentTaskStatus = await fetch(`${BASE_URL}/api/tasks/999999/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Completed' })
    });
    assert(nonExistentTaskStatus.status === 404, 'PUT /api/tasks/999999/status returns HTTP 404 Not Found');

    const nonExistentBugStatus = await fetch(`${BASE_URL}/api/bugs/999999/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Resolved' })
    });
    assert(nonExistentBugStatus.status === 404, 'PUT /api/bugs/999999/status returns HTTP 404 Not Found');

    console.log(`\n========================================`);
    console.log(`RESULTS: ${passed} / ${total} tests passed.`);
    console.log(`========================================\n`);

  } finally {
    await db.end();
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
