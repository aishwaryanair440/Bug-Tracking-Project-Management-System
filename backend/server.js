const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
require("dotenv").config();
const { pool, testConnection } = require("./database");
const { operations, getOperation } = require("./sqlOperations");

const app = express();

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// ------------------------------------------------------------
// TRANSACTION MANAGEMENT ROUTES (COMMIT, ROLLBACK, CONCURRENCY)
// ------------------------------------------------------------
const transactionsRouter = require("./routes/transactions");
app.use("/api/transactions", transactionsRouter);

// ------------------------------------------------------------
// SERVER-SIDE SESSION & AUTHENTICATION MECHANISM
// ------------------------------------------------------------
// Active sessions map: token -> { token, userId, role, user, createdAt }
const activeSessions = new Map();

function getBearerToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }
  if (req.headers["x-auth-token"]) {
    return String(req.headers["x-auth-token"]).trim();
  }
  if (req.headers["x-session-token"]) {
    return String(req.headers["x-session-token"]).trim();
  }
  if (req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)token=([^;]+)/);
    if (match) return decodeURIComponent(match[1].trim());
  }
  return null;
}

function authenticateSession(req, res, next) {
  const token = getBearerToken(req);
  if (token && activeSessions.has(token)) {
    const session = activeSessions.get(token);
    req.session = session;
    req.user = session.user;
    req.userId = session.userId;
    req.userRole = session.role;
  } else {
    req.session = null;
    req.user = null;
    req.userId = null;
    req.userRole = null;
  }
  next();
}

app.use(authenticateSession);

function requireAuth(req, res, next) {
  if (!req.session || !req.user) {
    return res.status(401).json({ message: "Unauthorized: Authentication required" });
  }
  next();
}

function requireFaculty(req, res, next) {
  if (!req.session || !req.user) {
    return res.status(401).json({ message: "Unauthorized: Authentication required" });
  }
  if (req.userRole !== "faculty") {
    return res.status(403).json({ message: "Forbidden: Only faculty members are authorized to perform this operation" });
  }
  next();
}


// ------------------------------------------------------------
// DATABASE CONNECTION
// ------------------------------------------------------------
// The shared MySQL pool lives in database.js.
// SQL operations are loaded from sqlOperations.js, which is generated
// from existing_database_sql_operations.sql.

// ------------------------------------------------------------
// BASIC TEST ROUTES
// ------------------------------------------------------------
app.get("/", (req, res) => {
  res.json({
    message: "Team & Bug Tracking Backend is running!"
  });
});

app.get("/api/health", async (req, res) => {
  try {
    await testConnection();
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    res.status(500).json({ status: "error", database: "not connected" });
  }
});

// ------------------------------------------------------------
// SQL OPERATION CATALOG
// ------------------------------------------------------------
// Useful for development/testing: confirms that the supplied SQL
// operation file is loaded by the backend.
app.get("/api/database/operations", (req, res) => {
  res.json({
    count: Object.keys(operations).length,
    operations: Object.keys(operations)
  });
});

// ------------------------------------------------------------
// AUTHENTICATION
// NOTE: This matches the current demo database, where Password
// is stored directly. For production, use password hashing.
// ------------------------------------------------------------
app.post("/api/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: "Email, password and role are required" });
    }

    let rows;

    if (role.toLowerCase() === "student") {
      [rows] = await pool.execute(
        `SELECT Student_ID, Name, Email, Phone, Year, Team_ID
         FROM STUDENT
         WHERE Email = ? AND Password = ?`,
        [email, password]
      );
    } else if (role.toLowerCase() === "faculty") {
      [rows] = await pool.execute(
        `SELECT Faculty_ID, Name, Email
         FROM FACULTY
         WHERE Email = ? AND Password = ?`,
        [email, password]
      );
    } else {
      return res.status(400).json({ message: "Role must be student or faculty" });
    }

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(32).toString("hex");
    const userId = role.toLowerCase() === "student" ? rows[0].Student_ID : rows[0].Faculty_ID;
    const sessionData = {
      token,
      userId: Number(userId),
      role: role.toLowerCase(),
      user: rows[0],
      createdAt: new Date()
    };
    activeSessions.set(token, sessionData);

    res.json({
      message: "Login successful",
      role: role.toLowerCase(),
      user: rows[0],
      token
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Login failed" });
  }
});

app.post("/api/logout", (req, res) => {
  const token = getBearerToken(req);
  if (token && activeSessions.has(token)) {
    activeSessions.delete(token);
  }
  res.json({ message: "Logged out successfully" });
});

app.get("/api/me", requireAuth, (req, res) => {
  res.json({
    user: req.user,
    role: req.userRole,
    userId: req.userId
  });
});

// ------------------------------------------------------------
// STUDENTS
// ------------------------------------------------------------

// Fetch all students (for dropdowns and team assignments)
app.get("/api/students", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT S.Student_ID, S.Team_ID, S.Name, S.Email, S.Phone, S.Year,
              T.Team_Name, T.Project_ID
       FROM STUDENT S
       LEFT JOIN TEAM T ON S.Team_ID = T.Team_ID
       ORDER BY S.Student_ID`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not fetch students" });
  }
});

// ------------------------------------------------------------
// STUDENT PROFILE
// ------------------------------------------------------------
app.get("/api/students/:id", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT Student_ID, Name, Email, Phone, Year, Team_ID
       FROM STUDENT
       WHERE Student_ID = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not fetch student" });
  }
});

app.put("/api/students/:id", async (req, res) => {
  try {
    const { name, email, phone, year } = req.body;

    const [result] = await pool.execute(
      `UPDATE STUDENT
       SET Name = ?, Email = ?, Phone = ?, Year = ?
       WHERE Student_ID = ?`,
      [name, email, phone, year, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json({ message: "Student profile updated" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not update student" });
  }
});

// ------------------------------------------------------------
// FACULTY PROFILE & PROJECTS
// ------------------------------------------------------------
// Get all faculty members for mentor selection dropdown
app.get("/api/faculty", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT Faculty_ID, Name, Email
       FROM FACULTY
       ORDER BY Faculty_ID`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not fetch faculty list" });
  }
});

app.get("/api/faculty/:id", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT Faculty_ID, Name, Email
       FROM FACULTY
       WHERE Faculty_ID = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not fetch faculty" });
  }
});

app.get("/api/faculty/:id/projects", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT P.Project_ID, P.Faculty_ID, F.Name AS Faculty_Name, P.Title, P.Description,
              P.Start_Date, P.End_Date, P.Status
       FROM PROJECT P
       LEFT JOIN FACULTY F ON P.Faculty_ID = F.Faculty_ID
       WHERE P.Faculty_ID = ?
       ORDER BY P.Project_ID`,
      [req.params.id]
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not fetch faculty projects" });
  }
});

// ------------------------------------------------------------
// PROJECTS
// ------------------------------------------------------------

// All projects
app.get("/api/projects", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT P.Project_ID, P.Faculty_ID, F.Name AS Faculty_Name, P.Title, P.Description,
              P.Start_Date, P.End_Date, P.Status
       FROM PROJECT P
       LEFT JOIN FACULTY F ON P.Faculty_ID = F.Faculty_ID
       ORDER BY P.Project_ID`
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not fetch projects" });
  }
});

// Projects belonging to a student through TEAM
app.get("/api/students/:id/projects", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT P.Project_ID, P.Faculty_ID, F.Name AS Faculty_Name, P.Title, P.Description,
              P.Start_Date, P.End_Date, P.Status,
              T.Team_ID, T.Team_Name
       FROM STUDENT S
       JOIN TEAM T ON S.Team_ID = T.Team_ID
       JOIN PROJECT P ON T.Project_ID = P.Project_ID
       LEFT JOIN FACULTY F ON P.Faculty_ID = F.Faculty_ID
       WHERE S.Student_ID = ?`,
      [req.params.id]
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not fetch student projects" });
  }
});

// One project
app.get("/api/projects/:id", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT Project_ID, Faculty_ID, Title, Description,
              Start_Date, End_Date, Status
       FROM PROJECT
       WHERE Project_ID = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not fetch project" });
  }
});

// Create project (Faculty-only)
app.post("/api/projects", requireFaculty, async (req, res) => {
  try {
    const {
      title,
      description,
      startDate,
      endDate,
      status
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Project Title is required" });
    }

    // Always derive faculty ID from authenticated session, never trust frontend input
    const facultyId = req.userId;

    const formatDateForMySQL = (dStr) => {
      if (!dStr) return null;
      const parsed = new Date(dStr);
      if (isNaN(parsed.getTime())) return null;
      return parsed.toISOString().split('T')[0];
    };

    const mysqlStartDate = formatDateForMySQL(startDate) || new Date().toISOString().split('T')[0];
    const mysqlEndDate = formatDateForMySQL(endDate);

    if (mysqlEndDate && mysqlStartDate > mysqlEndDate) {
      return res.status(400).json({ message: "End date cannot be earlier than start date" });
    }

    const projectStatus = status && status.trim() ? status.trim() : 'Planned';

    // Insert using MySQL AUTO_INCREMENT for Project_ID
    const [result] = await pool.execute(
      `INSERT INTO PROJECT
       (Faculty_ID, Title, Description, Start_Date, End_Date, Status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [facultyId, title.trim(), description ? description.trim() : null, mysqlStartDate, mysqlEndDate, projectStatus]
    );

    const createdProjectId = result.insertId;

    // Fetch the newly inserted record to return to caller
    const [rows] = await pool.execute(
      `SELECT P.Project_ID, P.Faculty_ID, F.Name AS Faculty_Name, P.Title, P.Description,
              P.Start_Date, P.End_Date, P.Status
       FROM PROJECT P
       LEFT JOIN FACULTY F ON P.Faculty_ID = F.Faculty_ID
       WHERE P.Project_ID = ?`,
      [createdProjectId]
    );

    res.status(201).json({
      message: "Project created successfully",
      projectId: createdProjectId,
      project: rows[0]
    });
  } catch (error) {
    console.error("Create project error:", error);
    res.status(500).json({ message: "Could not create project" });
  }
});

// Edit project (Faculty-only, must own project)
app.put("/api/projects/:id", requireFaculty, async (req, res) => {
  try {
    const { title, description, startDate, endDate, status } = req.body;

    // Check project exists and belongs to this faculty
    const [existing] = await pool.execute(
      `SELECT Project_ID, Faculty_ID FROM PROJECT WHERE Project_ID = ?`,
      [req.params.id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ message: "Project not found" });
    }
    if (Number(existing[0].Faculty_ID) !== Number(req.userId)) {
      return res.status(403).json({ message: "Forbidden: You are not authorized to update another faculty member's project" });
    }

    const [result] = await pool.execute(
      `UPDATE PROJECT
       SET Title = ?, Description = ?, Start_Date = ?, End_Date = ?, Status = ?
       WHERE Project_ID = ?`,
      [title, description, startDate, endDate, status, req.params.id]
    );

    res.json({ message: "Project updated" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not update project" });
  }
});

// Update project status: faculty approval/rejection
app.put("/api/projects/:id/status", requireFaculty, async (req, res) => {
  try {
    const { status } = req.body;

    if (!["Pending", "Approved", "Rejected", "In Progress", "Completed", "Planned"].includes(status)) {
      return res.status(400).json({
        message: "Status must be Pending, Approved, Rejected, In Progress, Completed, or Planned"
      });
    }

    const [existing] = await pool.execute(
      `SELECT Project_ID, Faculty_ID FROM PROJECT WHERE Project_ID = ?`,
      [req.params.id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ message: "Project not found" });
    }
    if (Number(existing[0].Faculty_ID) !== Number(req.userId)) {
      return res.status(403).json({ message: "Forbidden: You are not authorized to update status of another faculty member's project" });
    }

    const [result] = await pool.execute(
      `UPDATE PROJECT
       SET Status = ?
       WHERE Project_ID = ?`,
      [status, req.params.id]
    );

    res.json({ message: `Project status updated to ${status}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not update project status" });
  }
});

// Delete project (Faculty-only, must own project)
app.delete("/api/projects/:id", requireFaculty, async (req, res) => {
  try {
    const [existing] = await pool.execute(
      `SELECT Project_ID, Faculty_ID FROM PROJECT WHERE Project_ID = ?`,
      [req.params.id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ message: "Project not found" });
    }
    if (Number(existing[0].Faculty_ID) !== Number(req.userId)) {
      return res.status(403).json({ message: "Forbidden: You are not authorized to delete another faculty member's project" });
    }

    const [result] = await pool.execute(
      `DELETE FROM PROJECT WHERE Project_ID = ?`,
      [req.params.id]
    );

    res.json({ message: "Project deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not delete project" });
  }
});

// ------------------------------------------------------------
// TEAMS
// ------------------------------------------------------------

app.get("/api/teams", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT Team_ID, Project_ID, Team_Name FROM TEAM ORDER BY Team_ID`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not fetch teams" });
  }
});

app.get("/api/teams/:id", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT Team_ID, Project_ID, Team_Name FROM TEAM WHERE Team_ID = ?`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Team not found" });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not fetch team" });
  }
});

app.get("/api/teams/:id/members", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT Student_ID, Name, Email, Phone, Year
       FROM STUDENT
       WHERE Team_ID = ?
       ORDER BY Name`,
      [req.params.id]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not fetch team members" });
  }
});

app.get("/api/projects/:id/team", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT T.Team_ID, T.Team_Name,
              S.Student_ID, S.Name, S.Email, S.Phone, S.Year
       FROM TEAM T
       LEFT JOIN STUDENT S ON T.Team_ID = S.Team_ID
       WHERE T.Project_ID = ?`,
      [req.params.id]
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not fetch team" });
  }
});

// Create team (Faculty-only)
app.post("/api/teams", requireFaculty, async (req, res) => {
  let conn;
  try {
    const { projectId, teamName, studentIds } = req.body;

    if (!projectId || !teamName || !teamName.trim()) {
      return res.status(400).json({ message: "Project ID and Team Name are required" });
    }

    // 1. Verify project exists
    const [projRows] = await pool.execute(
      `SELECT Project_ID, Faculty_ID, Title FROM PROJECT WHERE Project_ID = ?`,
      [projectId]
    );
    if (projRows.length === 0) {
      return res.status(404).json({ message: "Referenced project does not exist" });
    }

    // 2. Authorization: Faculty can only manage teams for projects they own
    if (Number(projRows[0].Faculty_ID) !== Number(req.userId)) {
      return res.status(403).json({
        message: "Forbidden: You are not authorized to create a team for another faculty member's project"
      });
    }

    // 3. Server validation: Check if a team is already assigned to this project
    const [existingTeam] = await pool.execute(
      `SELECT Team_ID, Team_Name FROM TEAM WHERE Project_ID = ?`,
      [projectId]
    );
    if (existingTeam.length > 0) {
      return res.status(409).json({
        message: `Project already has an assigned team ('${existingTeam[0].Team_Name}', Team ID: ${existingTeam[0].Team_ID}). A project can be associated with only one team.`
      });
    }

    // 4. Validate student IDs against actual database records (if studentIds provided)
    let validatedStudentIds = [];
    if (studentIds && Array.isArray(studentIds) && studentIds.length > 0) {
      const rawIds = studentIds.map(Number).filter(n => !isNaN(n));
      const uniqueIds = Array.from(new Set(rawIds));
      if (uniqueIds.length !== studentIds.length) {
        return res.status(400).json({ message: "Duplicate student IDs in assignment list" });
      }

      // Check existence in database
      const [existingStudents] = await pool.query(
        `SELECT Student_ID, Name, Team_ID FROM STUDENT WHERE Student_ID IN (?)`,
        [uniqueIds]
      );

      if (existingStudents.length !== uniqueIds.length) {
        const foundSet = new Set(existingStudents.map(s => s.Student_ID));
        const missing = uniqueIds.filter(id => !foundSet.has(id));
        return res.status(400).json({
          message: `Referenced student ID(s) do not exist: ${missing.join(", ")}`
        });
      }
      validatedStudentIds = uniqueIds;
    }

    // 5. Use database transaction for atomic team creation + student assignments
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [teamResult] = await conn.execute(
      `INSERT INTO TEAM (Project_ID, Team_Name) VALUES (?, ?)`,
      [projectId, teamName.trim()]
    );
    const newTeamId = teamResult.insertId;

    if (validatedStudentIds.length > 0) {
      for (const sid of validatedStudentIds) {
        await conn.execute(
          `UPDATE STUDENT SET Team_ID = ? WHERE Student_ID = ?`,
          [newTeamId, sid]
        );
      }
    }

    await conn.commit();

    // Fetch created team and members
    const [teamRows] = await pool.execute(
      `SELECT T.Team_ID, T.Project_ID, T.Team_Name,
              S.Student_ID, S.Name, S.Email, S.Phone, S.Year
       FROM TEAM T
       LEFT JOIN STUDENT S ON T.Team_ID = S.Team_ID
       WHERE T.Team_ID = ?`,
      [newTeamId]
    );

    res.status(201).json({
      message: "Team created successfully",
      teamId: newTeamId,
      team: teamRows
    });
  } catch (error) {
    if (conn) {
      try { await conn.rollback(); } catch (rbErr) { console.error("Rollback error:", rbErr); }
    }
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        message: "Database constraint violation: This project is already assigned to a team."
      });
    }
    console.error("Team creation error:", error);
    res.status(500).json({ message: "Could not create team" });
  } finally {
    if (conn) conn.release();
  }
});

// Edit team (Faculty-only, must own project)
app.put("/api/teams/:id", requireFaculty, async (req, res) => {
  try {
    const { teamName, projectId } = req.body;

    // Verify team exists and verify authorization
    const [existingTeam] = await pool.execute(
      `SELECT T.Team_ID, T.Project_ID, P.Faculty_ID
       FROM TEAM T
       JOIN PROJECT P ON T.Project_ID = P.Project_ID
       WHERE T.Team_ID = ?`,
      [req.params.id]
    );
    if (existingTeam.length === 0) {
      return res.status(404).json({ message: "Team not found" });
    }
    if (Number(existingTeam[0].Faculty_ID) !== Number(req.userId)) {
      return res.status(403).json({ message: "Forbidden: You are not authorized to update this team" });
    }

    // If projectId is changing, verify the target project exists and belongs to this faculty
    if (projectId && Number(projectId) !== Number(existingTeam[0].Project_ID)) {
      const [projRows] = await pool.execute(
        `SELECT Project_ID, Faculty_ID FROM PROJECT WHERE Project_ID = ?`,
        [projectId]
      );
      if (projRows.length === 0) {
        return res.status(404).json({ message: "Referenced project does not exist" });
      }
      if (Number(projRows[0].Faculty_ID) !== Number(req.userId)) {
        return res.status(403).json({ message: "Forbidden: Target project belongs to another faculty member" });
      }

      const [otherTeam] = await pool.execute(
        `SELECT Team_ID, Team_Name FROM TEAM WHERE Project_ID = ? AND Team_ID != ?`,
        [projectId, req.params.id]
      );
      if (otherTeam.length > 0) {
        return res.status(409).json({
          message: `Target project is already assigned to team '${otherTeam[0].Team_Name}'. A project can be associated with only one team.`
        });
      }
    }

    const [result] = await pool.execute(
      `UPDATE TEAM
       SET Team_Name = COALESCE(?, Team_Name),
           Project_ID = COALESCE(?, Project_ID)
       WHERE Team_ID = ?`,
      [teamName ? teamName.trim() : null, projectId || null, req.params.id]
    );

    res.json({ message: "Team updated successfully" });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        message: "Database constraint violation: Project already has an assigned team."
      });
    }
    console.error(error);
    res.status(500).json({ message: "Could not update team" });
  }
});

// Delete team (Faculty-only, must own project)
app.delete("/api/teams/:id", requireFaculty, async (req, res) => {
  try {
    const [existingTeam] = await pool.execute(
      `SELECT T.Team_ID, T.Project_ID, P.Faculty_ID
       FROM TEAM T
       JOIN PROJECT P ON T.Project_ID = P.Project_ID
       WHERE T.Team_ID = ?`,
      [req.params.id]
    );
    if (existingTeam.length === 0) {
      return res.status(404).json({ message: "Team not found" });
    }
    if (Number(existingTeam[0].Faculty_ID) !== Number(req.userId)) {
      return res.status(403).json({ message: "Forbidden: You are not authorized to delete this team" });
    }

    await pool.execute(`DELETE FROM TEAM WHERE Team_ID = ?`, [req.params.id]);

    res.json({ message: "Team deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not delete team" });
  }
});

// Assign an existing student to a team (Faculty-only)
app.put("/api/students/:id/team", requireFaculty, async (req, res) => {
  try {
    const { teamId } = req.body;
    const studentId = req.params.id;

    if (!teamId) {
      return res.status(400).json({ message: "Team ID is required" });
    }

    // 1. Verify student exists
    const [studentRows] = await pool.execute(
      `SELECT Student_ID, Name, Team_ID FROM STUDENT WHERE Student_ID = ?`,
      [studentId]
    );
    if (studentRows.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    // 2. Verify target team exists and faculty is authorized for its project
    const [teamRows] = await pool.execute(
      `SELECT T.Team_ID, T.Team_Name, T.Project_ID, P.Faculty_ID
       FROM TEAM T
       JOIN PROJECT P ON T.Project_ID = P.Project_ID
       WHERE T.Team_ID = ?`,
      [teamId]
    );
    if (teamRows.length === 0) {
      return res.status(404).json({ message: "Referenced team does not exist" });
    }

    if (Number(teamRows[0].Faculty_ID) !== Number(req.userId)) {
      return res.status(403).json({
        message: "Forbidden: You are not authorized to assign students to a team for another faculty member's project"
      });
    }

    // 3. Update student assignment
    await pool.execute(
      `UPDATE STUDENT
       SET Team_ID = ?
       WHERE Student_ID = ?`,
      [teamId, studentId]
    );

    res.json({
      message: "Student assigned to team successfully",
      studentId: Number(studentId),
      teamId: Number(teamId)
    });
  } catch (error) {
    console.error("Assign student error:", error);
    res.status(500).json({ message: "Could not assign student to team" });
  }
});

// ------------------------------------------------------------
// TASKS
// ------------------------------------------------------------

app.get("/api/tasks", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT T.Task_ID, T.Project_ID, T.Student_ID,
              T.Task_Name, T.Description, T.Priority, T.Status,
              S.Name AS Assigned_Student
       FROM TASK T
       LEFT JOIN STUDENT S ON T.Student_ID = S.Student_ID
       ORDER BY T.Task_ID`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not fetch tasks" });
  }
});

app.get("/api/tasks/:id", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT T.Task_ID, T.Project_ID, P.Title AS Project_Title,
              P.Start_Date AS Project_Start_Date, P.End_Date AS Project_End_Date,
              T.Student_ID, S.Name AS Assigned_Student, S.Email AS Student_Email,
              T.Task_Name, T.Description, T.Priority, T.Status
       FROM TASK T
       JOIN PROJECT P ON T.Project_ID = P.Project_ID
       LEFT JOIN STUDENT S ON T.Student_ID = S.Student_ID
       WHERE T.Task_ID = ?`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not fetch task" });
  }
});

app.get("/api/projects/:id/tasks", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT T.Task_ID, T.Project_ID, T.Student_ID,
              T.Task_Name, T.Description, T.Priority, T.Status,
              S.Name AS Assigned_Student
       FROM TASK T
       LEFT JOIN STUDENT S ON T.Student_ID = S.Student_ID
       WHERE T.Project_ID = ?
       ORDER BY T.Task_ID`,
      [req.params.id]
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not fetch tasks" });
  }
});

app.get("/api/students/:id/tasks", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT T.Task_ID, T.Project_ID, T.Task_Name,
              T.Description, T.Priority, T.Status,
              P.Title AS Project_Title
       FROM TASK T
       JOIN PROJECT P ON T.Project_ID = P.Project_ID
       WHERE T.Student_ID = ?
       ORDER BY T.Task_ID`,
      [req.params.id]
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not fetch student tasks" });
  }
});

app.post("/api/tasks", async (req, res) => {
  try {
    const {
      taskId,
      projectId,
      studentId,
      taskName,
      description,
      priority,
      status,
      role,
      currentStudentId
    } = req.body;

    // 1. Role validation: Faculty cannot create tasks
    const requesterRole = (role || 'student').toLowerCase();
    if (requesterRole === 'faculty') {
      return res.status(403).json({
        message: "Faculty are not permitted to create tasks. Only students can create tasks."
      });
    }

    // 2. Required fields validation
    if (!taskName || !taskName.trim()) {
      return res.status(400).json({ message: "Task Name is required" });
    }
    if (!projectId) {
      return res.status(400).json({ message: "Project ID is required" });
    }
    if (!studentId) {
      return res.status(400).json({ message: "Student ID (Assignee) is required" });
    }

    const effPriority = priority || 'Medium';
    const effStatus = status || 'Pending';
    const effDescription = description ? description.trim() : '';

    // 3. Project validation: Check if project exists
    const [projectRows] = await pool.execute(
      `SELECT Project_ID, Title, Faculty_ID FROM PROJECT WHERE Project_ID = ?`,
      [projectId]
    );
    if (projectRows.length === 0) {
      return res.status(404).json({ message: "Referenced project does not exist" });
    }

    // 4. Verify project access for the current logged in student (if provided)
    if (currentStudentId) {
      const [creatorRows] = await pool.execute(
        `SELECT S.Student_ID, S.Team_ID, T.Project_ID
         FROM STUDENT S
         JOIN TEAM T ON S.Team_ID = T.Team_ID
         WHERE S.Student_ID = ?`,
        [currentStudentId]
      );
      if (creatorRows.length === 0) {
        return res.status(403).json({ message: "Student is not assigned to any team" });
      }
      if (Number(creatorRows[0].Project_ID) !== Number(projectId)) {
        return res.status(403).json({ message: "Student does not have access to this project" });
      }
    }

    // 5. Verify that assigned student belongs to the same project's team
    const [assignedStudentRows] = await pool.execute(
      `SELECT S.Student_ID, S.Name, S.Team_ID, T.Project_ID
       FROM STUDENT S
       JOIN TEAM T ON S.Team_ID = T.Team_ID
       WHERE S.Student_ID = ?`,
      [studentId]
    );
    if (assignedStudentRows.length === 0) {
      return res.status(400).json({ message: "Assigned student not found or not in any team" });
    }
    if (Number(assignedStudentRows[0].Project_ID) !== Number(projectId)) {
      return res.status(400).json({
        message: "Assigned student is not a member of this project's team"
      });
    }

    // 6. Execute F1 query using parameterized SQL and AUTO_INCREMENT for Task_ID
    // F1: INSERT INTO TASK (Task_ID, Project_ID, Student_ID, Task_Name, Description, Priority, Status) VALUES (?, ?, ?, ?, ?, ?, ?);
    const f1Sql = getOperation("F1").replace(/^.*?\n/, '').trim();
    const [result] = await pool.execute(f1Sql, [
      taskId || null,
      projectId,
      studentId,
      taskName.trim(),
      effDescription,
      effPriority,
      effStatus
    ]);

    const createdTaskId = taskId || result.insertId;

    res.status(201).json({
      message: "Task created successfully",
      taskId: createdTaskId
    });
  } catch (error) {
    console.error("Task creation error:", error);
    res.status(500).json({ message: "Could not create task" });
  }
});

app.put("/api/tasks/:id", async (req, res) => {
  try {
    const { taskName, description, priority, status, studentId } = req.body;

    const [result] = await pool.execute(
      `UPDATE TASK
       SET Task_Name = ?, Description = ?, Priority = ?, Status = ?, Student_ID = ?
       WHERE Task_ID = ?`,
      [taskName, description, priority, status, studentId, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({ message: "Task updated" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not update task" });
  }
});

app.put("/api/tasks/:id/status", async (req, res) => {
  try {
    const { status, studentId } = req.body;
    const allowed = ['Pending', 'In Progress', 'Completed'];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({
        message: `Invalid task status '${status}'. Allowed statuses: ${allowed.join(', ')}`
      });
    }

    const [taskRows] = await pool.execute(
      `SELECT Task_ID, Project_ID, Student_ID, Status FROM TASK WHERE Task_ID = ?`,
      [req.params.id]
    );
    if (taskRows.length === 0) {
      return res.status(404).json({ message: "Task not found" });
    }

    // If studentId provided, ensure student exists and is assigned to project or task
    if (studentId) {
      const numStudentId = Number(studentId);
      const isDirectAssignee = Number(taskRows[0].Student_ID) === numStudentId;
      if (!isDirectAssignee) {
        const [teamCheck] = await pool.execute(
          `SELECT S.Student_ID FROM STUDENT S
           JOIN TEAM T ON S.Team_ID = T.Team_ID
           WHERE S.Student_ID = ? AND T.Project_ID = ?`,
          [numStudentId, taskRows[0].Project_ID]
        );
        if (teamCheck.length === 0) {
          return res.status(403).json({
            message: "Forbidden: You are not authorized to update status of a task outside your project team"
          });
        }
      }
    }

    await pool.execute(
      `UPDATE TASK
       SET Status = ?
       WHERE Task_ID = ?`,
      [status, req.params.id]
    );

    res.json({
      message: "Task status updated successfully",
      taskId: Number(req.params.id),
      status
    });
  } catch (error) {
    console.error("Task status update error:", error);
    res.status(500).json({ message: "Could not update task status" });
  }
});

app.delete("/api/tasks/:id", async (req, res) => {
  try {
    const [result] = await pool.execute(
      `DELETE FROM TASK WHERE Task_ID = ?`,
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({ message: "Task deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not delete task" });
  }
});

// ------------------------------------------------------------
// BUG REPORTS (ONLY 8 COLUMNS: Bug_ID, Task_ID, Faculty_ID, Student_ID, Priority, Status, Title, Report_Date)
// ------------------------------------------------------------

app.get("/api/bugs", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT B.Bug_ID, B.Task_ID, T.Task_Name,
              B.Faculty_ID, F.Name AS Faculty_Name,
              B.Student_ID, S.Name AS Student_Name,
              B.Priority, B.Status, B.Title, B.Report_Date
       FROM BUG_REPORT B
       LEFT JOIN TASK T ON B.Task_ID = T.Task_ID
       LEFT JOIN FACULTY F ON B.Faculty_ID = F.Faculty_ID
       LEFT JOIN STUDENT S ON B.Student_ID = S.Student_ID
       ORDER BY B.Bug_ID`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not fetch bugs" });
  }
});

app.get("/api/projects/:id/bugs", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT B.Bug_ID, B.Task_ID, T.Task_Name,
              B.Faculty_ID, F.Name AS Faculty_Name,
              B.Student_ID, S.Name AS Student_Name,
              B.Priority, B.Status, B.Title, B.Report_Date
       FROM BUG_REPORT B
       JOIN TASK T ON B.Task_ID = T.Task_ID
       LEFT JOIN FACULTY F ON B.Faculty_ID = F.Faculty_ID
       LEFT JOIN STUDENT S ON B.Student_ID = S.Student_ID
       WHERE T.Project_ID = ?
       ORDER BY B.Bug_ID`,
      [req.params.id]
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not fetch bugs" });
  }
});

app.get("/api/bugs/:id", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT B.Bug_ID, B.Task_ID, T.Task_Name,
              B.Faculty_ID, F.Name AS Faculty_Name,
              B.Student_ID, S.Name AS Student_Name,
              B.Priority, B.Status, B.Title, B.Report_Date
       FROM BUG_REPORT B
       LEFT JOIN TASK T ON B.Task_ID = T.Task_ID
       LEFT JOIN FACULTY F ON B.Faculty_ID = F.Faculty_ID
       LEFT JOIN STUDENT S ON B.Student_ID = S.Student_ID
       WHERE B.Bug_ID = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Bug report not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not fetch bug" });
  }
});

app.post("/api/bugs", async (req, res) => {
  try {
    const {
      bugId,
      taskId,
      facultyId,
      studentId,
      priority,
      status,
      title,
      reportDate
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Bug report title is required" });
    }
    if (!taskId) {
      return res.status(400).json({ message: "Task ID (FK) is required" });
    }

    // 1. Validate referenced task exists
    const [taskRows] = await pool.execute(
      `SELECT T.Task_ID, T.Project_ID, T.Student_ID, P.Faculty_ID, P.Status AS Project_Status
       FROM TASK T
       JOIN PROJECT P ON T.Project_ID = P.Project_ID
       WHERE T.Task_ID = ?`,
      [taskId]
    );

    if (taskRows.length === 0) {
      return res.status(404).json({ message: "Referenced Task does not exist" });
    }

    const task = taskRows[0];
    const effFacultyId = facultyId || task.Faculty_ID;
    const effStudentId = studentId || task.Student_ID;

    const formatDateForMySQL = (dStr) => {
      if (!dStr) return new Date().toISOString().slice(0, 19).replace('T', ' ');
      const parsed = new Date(dStr);
      if (isNaN(parsed.getTime())) return new Date().toISOString().slice(0, 19).replace('T', ' ');
      return parsed.toISOString().slice(0, 19).replace('T', ' ');
    };

    const mysqlReportDate = formatDateForMySQL(reportDate);

    // 2. Insert only the 8 required columns
    const [result] = await pool.execute(
      `INSERT INTO BUG_REPORT
       (Bug_ID, Task_ID, Faculty_ID, Student_ID, Priority, Status, Title, Report_Date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bugId || null,
        taskId,
        effFacultyId,
        effStudentId,
        priority || 'Medium',
        status || 'Open',
        title.trim(),
        mysqlReportDate
      ]
    );

    const newBugId = bugId || result.insertId;
    res.status(201).json({ message: "Bug report created successfully", bugId: newBugId });
  } catch (error) {
    console.error("Bug creation error:", error);
    if (
      error.sqlState === '45000' ||
      (error.sqlMessage && error.sqlMessage.toLowerCase().includes('completed project'))
    ) {
      return res.status(400).json({
        message: error.sqlMessage || 'Cannot report a bug for a completed project',
        error: error.sqlMessage || error.message
      });
    }
    res.status(500).json({ message: "Could not create bug report", error: error.message });
  }
});

app.put("/api/bugs/:id", async (req, res) => {
  try {
    const { title, priority, status, taskId, facultyId, studentId } = req.body;

    const [result] = await pool.execute(
      `UPDATE BUG_REPORT
       SET Title = COALESCE(?, Title),
           Priority = COALESCE(?, Priority),
           Status = COALESCE(?, Status),
           Task_ID = COALESCE(?, Task_ID),
           Faculty_ID = COALESCE(?, Faculty_ID),
           Student_ID = COALESCE(?, Student_ID)
       WHERE Bug_ID = ?`,
      [
        title ? title.trim() : null,
        priority || null,
        status || null,
        taskId !== undefined ? taskId : null,
        facultyId || null,
        studentId || null,
        req.params.id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Bug not found" });
    }

    res.json({ message: "Bug report updated" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not update bug" });
  }
});

app.put("/api/bugs/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['Open', 'In Progress', 'Under Review', 'Resolved'];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({
        message: `Invalid bug status '${status}'. Allowed statuses: ${allowed.join(', ')}`
      });
    }

    const [existing] = await pool.execute(
      `SELECT Bug_ID, Status FROM BUG_REPORT WHERE Bug_ID = ?`,
      [req.params.id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ message: "Bug report not found" });
    }

    await pool.execute(
      `UPDATE BUG_REPORT
       SET Status = ?
       WHERE Bug_ID = ?`,
      [status, req.params.id]
    );

    res.json({
      message: "Bug status updated successfully",
      bugId: Number(req.params.id),
      status
    });
  } catch (error) {
    console.error("Bug status update error:", error);
    res.status(500).json({ message: "Could not update bug status" });
  }
});

app.delete("/api/bugs/:id", async (req, res) => {
  try {
    const [result] = await pool.execute(
      `DELETE FROM BUG_REPORT WHERE Bug_ID = ?`,
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Bug not found" });
    }

    res.json({ message: "Bug report deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not delete bug" });
  }
});

// ------------------------------------------------------------
// DASHBOARD COUNTS
// ------------------------------------------------------------

app.get("/api/students/:id/dashboard", async (req, res) => {
  try {
    const studentId = req.params.id;

    const [[projects]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM STUDENT S
       JOIN TEAM T ON S.Team_ID = T.Team_ID
       JOIN PROJECT P ON T.Project_ID = P.Project_ID
       WHERE S.Student_ID = ?`,
      [studentId]
    );

    const [[pending]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM STUDENT S
       JOIN TEAM T ON S.Team_ID = T.Team_ID
       JOIN PROJECT P ON T.Project_ID = P.Project_ID
       WHERE S.Student_ID = ? AND P.Status = 'Pending'`,
      [studentId]
    );

    const [[approved]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM STUDENT S
       JOIN TEAM T ON S.Team_ID = T.Team_ID
       JOIN PROJECT P ON T.Project_ID = P.Project_ID
       WHERE S.Student_ID = ? AND P.Status = 'Approved'`,
      [studentId]
    );

    const [[bugs]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM BUG_REPORT B
       JOIN PROJECT P ON B.Project_ID = P.Project_ID
       JOIN TEAM T ON P.Project_ID = T.Project_ID
       JOIN STUDENT S ON T.Team_ID = S.Team_ID
       WHERE S.Student_ID = ?
         AND B.Status <> 'Closed'`,
      [studentId]
    );

    res.json({
      totalProjects: projects.total,
      pendingProjects: pending.total,
      approvedProjects: approved.total,
      openBugReports: bugs.total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not load student dashboard" });
  }
});

app.get("/api/faculty/:id/dashboard", async (req, res) => {
  try {
    const facultyId = req.params.id;

    const [[total]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM PROJECT
       WHERE Faculty_ID = ?`,
      [facultyId]
    );

    const [[pending]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM PROJECT
       WHERE Faculty_ID = ? AND Status = 'Pending'`,
      [facultyId]
    );

    const [[approved]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM PROJECT
       WHERE Faculty_ID = ? AND Status = 'Approved'`,
      [facultyId]
    );

    res.json({
      totalProjects: total.total,
      pendingProjects: pending.total,
      approvedProjects: approved.total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not load faculty dashboard" });
  }
});

// ------------------------------------------------------------
// ERROR HANDLER
// ------------------------------------------------------------
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Something went wrong" });
});

// ------------------------------------------------------------
// START SERVER
// ------------------------------------------------------------
const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`Backend running at http://localhost:${PORT}`);
  try {
    const { verifyDatabaseSchema } = require("./databaseCheck");
    const check = await verifyDatabaseSchema();
    console.log(`Database Status: ${check.message}`);
  } catch (err) {
    console.error(`Database Status Error: ${err.message}`);
  }
});

