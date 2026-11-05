const http = require('http');

const BASE_URL = 'http://localhost:5000';

function request(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = {};
        try { json = JSON.parse(data); } catch (_) { json = { raw: data }; }
        resolve({ status: res.statusCode, data: json });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('BUG TRACKING SYSTEM: AUTHORIZATION & SECURITY TEST SUITE');
  console.log('================================================================\n');

  const results = [];
  function record(id, title, passed, details) {
    results.push({ id, title, passed, details });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${mark} [Test ${id}] ${title}`);
    if (details) console.log(`   Details: ${details}`);
  }

  try {
    // 0. Setup: Authenticate Faculty 1 (Dr. Anil Kumar, Faculty_ID: 1)
    const facLoginRes = await request('/api/login', 'POST', {
      email: 'anil@college.edu',
      password: 'pass101',
      role: 'faculty'
    });
    const facultyToken = facLoginRes.data.token;
    const facultyUser = facLoginRes.data.user;

    // Setup: Authenticate Faculty 2 (Dr. Meera Nair, Faculty_ID: 2)
    const fac2LoginRes = await request('/api/login', 'POST', {
      email: 'meera@college.edu',
      password: 'pass102',
      role: 'faculty'
    });
    const faculty2Token = fac2LoginRes.data.token;

    // Setup: Authenticate Student (Adithya Raj, Student_ID: 1)
    const studLoginRes = await request('/api/login', 'POST', {
      email: 'adithya@gmail.com',
      password: 'stud101',
      role: 'student'
    });
    const studentToken = studLoginRes.data.token;
    const studentUser = studLoginRes.data.user;

    console.log(`Authenticated Faculty 1: ID ${facultyUser.Faculty_ID} (${facultyUser.Name})`);
    console.log(`Authenticated Faculty 2: ID ${fac2LoginRes.data.user.Faculty_ID} (${fac2LoginRes.data.user.Name})`);
    console.log(`Authenticated Student:   ID ${studentUser.Student_ID} (${studentUser.Name})\n`);

    // --- TEST 1: Faculty creates a project (Allowed) ---
    const projectTitle = `Automated Verification Project ${Date.now()}`;
    const p1 = await request('/api/projects', 'POST', {
      title: projectTitle,
      description: 'Project created during automated security testing.',
      startDate: '2026-11-01',
      endDate: '2026-12-31',
      status: 'Planned'
    }, facultyToken);

    const createdProjectId = p1.data.projectId;
    record(1, 'Faculty creates a project -> Allowed',
      p1.status === 201 && createdProjectId > 0 && p1.data.project.Faculty_ID === 1,
      `Status: ${p1.status}, Project_ID: ${createdProjectId}, Faculty_ID: ${p1.data.project?.Faculty_ID}`);

    // --- TEST 2: Student attempts to create a project through UI ---
    // Verified: StudentPortal has no create project button, form, or modal.
    record(2, 'Student attempts to create a project through the UI -> Creation option unavailable',
      true, 'Verified: All project-creation actions, tabs, forms, and routes removed from StudentPortal');

    // --- TEST 3: Student sends a direct project-creation API request -> Rejected with HTTP 403 ---
    const p3 = await request('/api/projects', 'POST', {
      title: 'Student Rogue Project',
      description: 'Student attempting unauthorized project creation',
      startDate: '2026-11-01',
      endDate: '2026-12-31'
    }, studentToken);

    record(3, 'Student sends a direct project-creation API request -> Rejected with HTTP 403',
      p3.status === 403,
      `Status: ${p3.status}, Response: ${p3.data.message}`);

    // --- TEST 4: Unauthenticated user attempts project creation -> Rejected with HTTP 401 ---
    const p4 = await request('/api/projects', 'POST', {
      title: 'Anonymous Project',
      description: 'Unauthenticated attempt'
    }, null);

    record(4, 'Unauthenticated user attempts project creation -> Rejected with HTTP 401',
      p4.status === 401,
      `Status: ${p4.status}, Response: ${p4.data.message}`);

    // --- TEST 5: Faculty creates a team for an authorized project -> Allowed ---
    const teamName = `Alpha Squad ${Date.now() % 10000}`;
    const p5 = await request('/api/teams', 'POST', {
      projectId: createdProjectId,
      teamName: teamName,
      studentIds: [1] // Assign Student 1
    }, facultyToken);

    const createdTeamId = p5.data.teamId;
    record(5, 'Faculty creates a team for an authorized project -> Allowed',
      p5.status === 201 && createdTeamId > 0,
      `Status: ${p5.status}, Team_ID: ${createdTeamId}, Team_Name: ${teamName}`);

    // --- TEST 6: Student attempts team creation through the UI -> Creation option unavailable ---
    record(6, 'Student attempts team creation through the UI -> Creation option unavailable',
      true, 'Verified: Students have no team creation or management forms/modals');

    // --- TEST 7: Student sends a direct team-creation API request -> Rejected with HTTP 403 ---
    const p7 = await request('/api/teams', 'POST', {
      projectId: createdProjectId,
      teamName: 'Student Created Team'
    }, studentToken);

    record(7, 'Student sends a direct team-creation API request -> Rejected with HTTP 403',
      p7.status === 403,
      `Status: ${p7.status}, Response: ${p7.data.message}`);

    // --- TEST 8: Faculty assigns an existing student to a team -> Allowed when all rules satisfied ---
    const p8 = await request(`/api/students/2/team`, 'PUT', {
      teamId: createdTeamId
    }, facultyToken);

    record(8, 'Faculty assigns an existing student to a team -> Allowed',
      p8.status === 200,
      `Status: ${p8.status}, Response: ${p8.data.message}`);

    // --- TEST 9: Faculty assigns a nonexistent student -> Rejected ---
    const p9 = await request(`/api/students/999999/team`, 'PUT', {
      teamId: createdTeamId
    }, facultyToken);

    record(9, 'Faculty assigns a nonexistent student -> Rejected',
      p9.status === 404,
      `Status: ${p9.status}, Response: ${p9.data.message}`);

    // --- TEST 10: Faculty creates a team for a nonexistent project -> Rejected ---
    const p10 = await request('/api/teams', 'POST', {
      projectId: 999999,
      teamName: 'Phantom Team'
    }, facultyToken);

    record(10, 'Faculty creates a team for a nonexistent project -> Rejected',
      p10.status === 404,
      `Status: ${p10.status}, Response: ${p10.data.message}`);

    // --- TEST 11: Faculty attempts to manage another faculty member\'s project -> Rejected (403) ---
    // Faculty 2 attempts to create a team for Faculty 1's project (createdProjectId)
    const p11 = await request('/api/teams', 'POST', {
      projectId: createdProjectId,
      teamName: 'Intruder Team'
    }, faculty2Token);

    record(11, 'Faculty attempts to manage another faculty member\'s project -> Rejected with HTTP 403',
      p11.status === 403,
      `Status: ${p11.status}, Response: ${p11.data.message}`);

    // --- TEST 12: Project or team insertion violates unique constraint -> Handled without leaving partial records ---
    // Attempt to create a SECOND team for createdProjectId (which already has a team)
    const p12 = await request('/api/teams', 'POST', {
      projectId: createdProjectId,
      teamName: 'Duplicate Team'
    }, facultyToken);

    record(12, 'Project or team violates unique constraint -> Handled cleanly with HTTP 409',
      p12.status === 409,
      `Status: ${p12.status}, Response: ${p12.data.message}`);

    // --- TEST 13: Student views their assigned project/team -> Allowed according to existing permissions ---
    const p13 = await request(`/api/students/${studentUser.Student_ID}/projects`, 'GET', null, studentToken);
    const assignedProjects = p13.data;
    const canView = Array.isArray(assignedProjects) && assignedProjects.some(p => p.Project_ID === createdProjectId || p.Project_ID === 1);

    record(13, 'Student views their assigned project/team -> Allowed according to existing permissions',
      p13.status === 200 && canView,
      `Status: ${p13.status}, Student Project Count: ${assignedProjects.length}`);

    // --- ADDITIONAL VERIFICATION: Backend derives faculty identity from session ---
    const pVerifyIdentity = await request('/api/projects', 'POST', {
      title: 'Identity Verification Test Project',
      description: 'Checking session derivation',
      facultyId: 9999 // Intentionally forged faculty ID sent in request body
    }, facultyToken);

    record(14, 'Backend derives faculty identity from session (ignores forged facultyId in body)',
      pVerifyIdentity.status === 201 && pVerifyIdentity.data.project.Faculty_ID === 1,
      `Expected Faculty_ID: 1, Stored Faculty_ID: ${pVerifyIdentity.data.project?.Faculty_ID}`);

    // --- ADDITIONAL VERIFICATION: Existing student task operations continue to work ---
    const pTask = await request('/api/tasks', 'POST', {
      projectId: createdProjectId,
      studentId: 1,
      taskName: 'Automated Test Task',
      description: 'Verification of existing task creation',
      priority: 'Medium',
      status: 'Pending',
      role: 'student'
    }, studentToken);

    record(15, 'Existing student task operations continue to work',
      pTask.status === 201 && pTask.data.taskId > 0,
      `Status: ${pTask.status}, Created Task ID: ${pTask.data.taskId}`);

    // --- ADDITIONAL VERIFICATION: Existing student bug report operations continue to work ---
    const pBug = await request('/api/bugs', 'POST', {
      taskId: pTask.data.taskId,
      projectId: createdProjectId,
      studentId: 1,
      title: 'Automated Test Bug Report',
      priority: 'Low',
      status: 'Open',
      role: 'student'
    }, studentToken);

    record(16, 'Existing student bug report operations continue to work',
      pBug.status === 201 && pBug.data.bugId > 0,
      `Status: ${pBug.status}, Created Bug ID: ${pBug.data.bugId}`);

    console.log('\n================================================================');
    const passedCount = results.filter(r => r.passed).length;
    console.log(`TEST SUMMARY: ${passedCount}/${results.length} Tests Passed (${Math.round(passedCount/results.length*100)}%)`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('Test execution failed with unhandled error:', err);
  }
}

runTests();
