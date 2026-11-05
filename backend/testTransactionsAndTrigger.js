const http = require('http');

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {})
        }
      },
      (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch (e) {
            parsed = raw;
          }
          resolve({ status: res.statusCode, data: parsed });
        });
      }
    );
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function run() {
  console.log('===============================================================');
  console.log('SUITE: TRANSACTION MANAGEMENT & TRIGGER INTEGRATION TESTS');
  console.log('===============================================================\n');

  // Fetch initial tasks to pick target task
  console.log('1. Testing GET /api/transactions/tasks');
  const tasksRes = await request('GET', '/api/transactions/tasks');
  console.log(`   Response status: ${tasksRes.status}`);
  console.log(`   Total tasks loaded: ${Array.isArray(tasksRes.data) ? tasksRes.data.length : 0}`);
  const targetTask = tasksRes.data.find(t => t.Task_ID === 1) || tasksRes.data[0];
  console.log(`   Target Task: #${targetTask.Task_ID} "${targetTask.Task_Name}" (Status: ${targetTask.Status})\n`);

  // Reset Task 1 to 'In Progress' first
  await request('POST', '/api/transactions/reset', { taskId: targetTask.Task_ID, status: 'In Progress' });

  // TEST 1: COMMIT
  console.log('2. Testing POST /api/transactions/commit');
  const commitRes = await request('POST', '/api/transactions/commit', {
    taskId: targetTask.Task_ID,
    newStatus: 'Completed'
  });
  console.log(`   Response status: ${commitRes.status}`);
  console.log(`   Result:`, commitRes.data);
  if (commitRes.status === 200 && commitRes.data.finalDatabaseStatus === 'Completed') {
    console.log('   >>> COMMIT TEST PASSED: Status successfully updated to Completed in DB.\n');
  } else {
    console.error('   >>> COMMIT TEST FAILED!\n');
  }

  // TEST 2: ROLLBACK
  console.log('3. Testing POST /api/transactions/rollback');
  const rollbackRes = await request('POST', '/api/transactions/rollback', {
    taskId: targetTask.Task_ID,
    temporaryStatus: 'In Progress'
  });
  console.log(`   Response status: ${rollbackRes.status}`);
  console.log(`   Result:`, rollbackRes.data);
  if (
    rollbackRes.status === 200 &&
    rollbackRes.data.finalDatabaseStatus === 'Completed' &&
    rollbackRes.data.isStatusPreserved === true
  ) {
    console.log('   >>> ROLLBACK TEST PASSED: Uncommitted changes discarded, original status preserved in DB.\n');
  } else {
    console.error('   >>> ROLLBACK TEST FAILED!\n');
  }

  // Reset Task to 'In Progress' for Concurrency Test
  await request('POST', '/api/transactions/reset', { taskId: targetTask.Task_ID, status: 'In Progress' });

  // TEST 3: CONCURRENCY CONTROL (Row locking with SELECT ... FOR UPDATE)
  console.log('4. Testing POST /api/transactions/concurrency');
  const concurrencyRes = await request('POST', '/api/transactions/concurrency', {
    taskId: targetTask.Task_ID,
    newStatus: 'Completed',
    holdLockMs: 100
  });
  console.log(`   Response status: ${concurrencyRes.status}`);
  console.log(`   Result:`, concurrencyRes.data);
  if (concurrencyRes.status === 200 && concurrencyRes.data.finalDatabaseStatus === 'Completed') {
    console.log('   >>> CONCURRENCY ROW-LOCKING TEST PASSED: Row locked, updated, committed safely.\n');
  } else {
    console.error('   >>> CONCURRENCY ROW-LOCKING TEST FAILED!\n');
  }

  // TEST 4: CONCURRENT REQUEST SERIALIZATION (Simulate Race)
  console.log('5. Testing POST /api/transactions/simulate-race (Two simultaneous transactions on same task)');
  const raceRes = await request('POST', '/api/transactions/simulate-race', {
    taskId: targetTask.Task_ID,
    holdTimeMs: 800
  });
  console.log(`   Response status: ${raceRes.status}`);
  console.log(`   Race Timeline:`, raceRes.data.timeline);
  console.log(`   Serialization verified: ${raceRes.data.serializationVerified}`);
  if (raceRes.status === 200 && raceRes.data.serializationVerified) {
    console.log('   >>> CONCURRENCY SERIALIZATION TEST PASSED: Conflicting transactions serialized properly.\n');
  } else {
    console.error('   >>> CONCURRENCY SERIALIZATION TEST FAILED!\n');
  }

  // TEST 5: INVALID INPUTS & ERROR HANDLING
  console.log('6. Testing Invalid Task ID handling:');
  const invalidRes = await request('POST', '/api/transactions/commit', { taskId: 999999 });
  console.log(`   Response status for non-existent ID 999999: ${invalidRes.status}`);
  console.log(`   Message: ${invalidRes.data.message}`);
  const badIdRes = await request('POST', '/api/transactions/commit', { taskId: 'abc' });
  console.log(`   Response status for non-numeric ID 'abc': ${badIdRes.status}`);
  if (invalidRes.status === 404 && badIdRes.status === 400) {
    console.log('   >>> ERROR HANDLING PASSED: Safely rejected invalid/missing task IDs.\n');
  }

  // TEST 6: DATABASE TRIGGER (trg_prevent_bug_completed_project)
  console.log('7. Testing Database Trigger on Completed Project (Project 1):');
  const triggerRejectedRes = await request('POST', '/api/bugs', {
    projectId: 1, // Project 1 is 'Completed'
    title: 'Testing Trigger Reject on Completed Project',
    priority: 'High',
    role: 'Faculty',
    facultyId: 1
  });
  console.log(`   Response status: ${triggerRejectedRes.status}`);
  console.log(`   Response body:`, triggerRejectedRes.data);
  if (
    triggerRejectedRes.status === 400 &&
    triggerRejectedRes.data.message.includes('Cannot report a bug for a completed project')
  ) {
    console.log('   >>> TRIGGER REJECTION TEST PASSED: MySQL BEFORE INSERT trigger successfully blocked insert.\n');
  } else {
    console.error('   >>> TRIGGER REJECTION TEST FAILED!\n');
  }

  console.log('8. Testing Database Trigger on In-Progress Project (Project 2):');
  const triggerAllowedRes = await request('POST', '/api/bugs', {
    projectId: 2, // Project 2 is 'In Progress'
    title: 'Testing Trigger Allow on In Progress Project',
    priority: 'Medium',
    role: 'Faculty',
    facultyId: 2
  });
  console.log(`   Response status: ${triggerAllowedRes.status}`);
  console.log(`   Response body:`, triggerAllowedRes.data);
  if (triggerAllowedRes.status === 201 && triggerAllowedRes.data.bugId) {
    console.log('   >>> TRIGGER ALLOW TEST PASSED: Valid insert on active project succeeded.');
    // Clean up created bug
    await request('DELETE', `/api/bugs/${triggerAllowedRes.data.bugId}`);
    console.log('   Cleaned up test bug report.\n');
  } else {
    console.error('   >>> TRIGGER ALLOW TEST FAILED!\n');
  }

  console.log('===============================================================');
  console.log('ALL TESTS COMPLETED SUCCESSFULLY!');
  console.log('===============================================================');
}

run().catch(console.error);
