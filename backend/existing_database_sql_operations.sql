/*
TEAM & BUG TRACKING / PROJECT MANAGEMENT SYSTEM
RECTIFIED SQL OPERATIONS FOR EXISTING DATABASE

IMPORTANT
---------
This file works ONLY with the existing database tables.
It does NOT CREATE, ALTER, or DROP any table.

Existing tables:
    FACULTY
    PROJECT
    TEAM
    STUDENT
    TASK
    BUG_REPORT
    COMMENTS

Existing relationships:
    PROJECT.Faculty_ID       -> FACULTY.Faculty_ID
    TEAM.Project_ID          -> PROJECT.Project_ID
    STUDENT.Team_ID          -> TEAM.Team_ID
    TASK.Project_ID          -> PROJECT.Project_ID
    TASK.Student_ID          -> STUDENT.Student_ID
    BUG_REPORT.Project_ID    -> PROJECT.Project_ID
    BUG_REPORT.Task_ID       -> TASK.Task_ID
    BUG_REPORT.Faculty_ID    -> FACULTY.Faculty_ID
    COMMENTS.Student_ID      -> STUDENT.Student_ID
    COMMENTS.Bug_ID         -> BUG_REPORT.Bug_ID

PARAMETERS
----------
Use ? for values supplied by the backend/API.
Do NOT concatenate user input directly into SQL.

IMPORTANT LIMITATIONS OF THE EXISTING SCHEMA
---------------------------------------------
The current database does NOT contain:
    - Faculty Phone Number
    - Project Tagline / Subtitle
    - Project Priority
    - Team Role (Team Lead / Member)
    - Task Due Date
    - Bug Description
    - Bug Priority
    - Generic Bug Reported_By / User_ID

Therefore, this operations file does NOT pretend to support those fields.

PASSWORD NOTE
-------------
The existing schema contains a Password column.
For a real application, Password should contain a secure password hash,
not plaintext. The backend should verify the supplied password against
that stored hash. This SQL file therefore treats password verification as
an application/backend responsibility rather than adding insecure password
logic to every query.
*/


/* ================================================================
A. AUTHENTICATION
================================================================ */

-- A1. Find student account by email.
-- Backend must verify the supplied password securely.
SELECT Student_ID, Name, Email, Phone, Year, Team_ID, Password
FROM STUDENT
WHERE Email = ?;

-- A2. Find faculty account by email.
-- Backend must verify the supplied password securely.
SELECT Faculty_ID, Name, Email, Password
FROM FACULTY
WHERE Email = ?;

-- A3. Check whether a student email already exists.
SELECT COUNT(*) AS Student_Count
FROM STUDENT
WHERE Email = ?;

-- A4. Check whether a faculty email already exists.
SELECT COUNT(*) AS Faculty_Count
FROM FACULTY
WHERE Email = ?;


/* ================================================================
B. STUDENT OPERATIONS
================================================================ */

-- B1. Student profile.
SELECT Student_ID, Name, Email, Phone, Year, Team_ID
FROM STUDENT
WHERE Student_ID = ?;

-- B2. Update student's phone.
UPDATE STUDENT
SET Phone = ?
WHERE Student_ID = ?;

-- B3. Update student's academic year.
UPDATE STUDENT
SET Year = ?
WHERE Student_ID = ?;

-- B4. Update student's editable profile fields.
UPDATE STUDENT
SET Phone = ?,
    Year = ?
WHERE Student_ID = ?;

-- B5. Get all members of a team.
SELECT Student_ID, Name, Email, Phone, Year
FROM STUDENT
WHERE Team_ID = ?
ORDER BY Name;

-- B6. Assign a student to a team.
UPDATE STUDENT
SET Team_ID = ?
WHERE Student_ID = ?;

-- B7. Remove a student from a team.
-- Use only if STUDENT.Team_ID allows NULL.
UPDATE STUDENT
SET Team_ID = NULL
WHERE Student_ID = ?;

-- B8. Student with current team/project information.
SELECT
    S.Student_ID,
    S.Name,
    S.Email,
    S.Phone,
    S.Year,
    T.Team_ID,
    T.Team_Name,
    T.Project_ID,
    P.Title AS Project_Title,
    P.Status AS Project_Status
FROM STUDENT S
LEFT JOIN TEAM T ON S.Team_ID = T.Team_ID
LEFT JOIN PROJECT P ON T.Project_ID = P.Project_ID
WHERE S.Student_ID = ?;


/* ================================================================
C. FACULTY OPERATIONS
================================================================ */

-- C1. Faculty profile.
SELECT Faculty_ID, Name, Email
FROM FACULTY
WHERE Faculty_ID = ?;

-- C2. Get projects created/owned by a faculty member.
SELECT
    Project_ID,
    Title,
    Description,
    Start_Date,
    End_Date,
    Status
FROM PROJECT
WHERE Faculty_ID = ?
ORDER BY Start_Date DESC;

-- C3. Get pending projects for faculty review.
SELECT
    Project_ID,
    Faculty_ID,
    Title,
    Description,
    Start_Date,
    End_Date,
    Status
FROM PROJECT
WHERE Status = 'Pending'
ORDER BY Start_Date;

-- C4. Approve a project.
UPDATE PROJECT
SET Status = 'Approved'
WHERE Project_ID = ?;

-- C5. Reject a project.
UPDATE PROJECT
SET Status = 'Rejected'
WHERE Project_ID = ?;


/* ================================================================
D. PROJECT OPERATIONS
================================================================ */

-- D1. Create project.
-- Project_ID is supplied by the backend because the existing schema
-- does not specify an auto-generation mechanism in the available schema.
INSERT INTO PROJECT
    (Project_ID, Faculty_ID, Title, Description,
     Start_Date, End_Date, Status)
VALUES
    (?, ?, ?, ?, ?, ?, ?);

-- D2. Get one project.
SELECT
    Project_ID,
    Faculty_ID,
    Title,
    Description,
    Start_Date,
    End_Date,
    Status
FROM PROJECT
WHERE Project_ID = ?;

-- D3. Get all projects.
SELECT
    Project_ID,
    Faculty_ID,
    Title,
    Description,
    Start_Date,
    End_Date,
    Status
FROM PROJECT
ORDER BY Start_Date DESC;

-- D4. Update project details.
UPDATE PROJECT
SET Title = ?,
    Description = ?,
    Start_Date = ?,
    End_Date = ?,
    Status = ?
WHERE Project_ID = ?;

-- D5. Update project status.
UPDATE PROJECT
SET Status = ?
WHERE Project_ID = ?;

-- D6. Check whether a project exists.
SELECT COUNT(*) AS Project_Count
FROM PROJECT
WHERE Project_ID = ?;

-- D7. Check whether a project has dependent records before deletion.
SELECT
    (SELECT COUNT(*) FROM TEAM WHERE Project_ID = ?) AS Team_Count,
    (SELECT COUNT(*) FROM TASK WHERE Project_ID = ?) AS Task_Count,
    (SELECT COUNT(*) FROM BUG_REPORT WHERE Project_ID = ?) AS Bug_Count;

-- D8. Safe project delete.
-- Deletes ONLY when no team/task/bug records depend on the project.
-- If dependent records exist, zero rows are deleted instead of causing
-- an avoidable foreign-key failure.
DELETE FROM PROJECT
WHERE Project_ID = ?
  AND NOT EXISTS (SELECT 1 FROM TEAM WHERE Project_ID = ?)
  AND NOT EXISTS (SELECT 1 FROM TASK WHERE Project_ID = ?)
  AND NOT EXISTS (SELECT 1 FROM BUG_REPORT WHERE Project_ID = ?);


/* ================================================================
E. TEAM OPERATIONS
================================================================ */

-- E1. Create team.
INSERT INTO TEAM
    (Team_ID, Project_ID, Team_Name)
VALUES
    (?, ?, ?);

-- E2. Get one team.
SELECT Team_ID, Project_ID, Team_Name
FROM TEAM
WHERE Team_ID = ?;

-- E3. Get all teams of a project.
SELECT Team_ID, Team_Name
FROM TEAM
WHERE Project_ID = ?
ORDER BY Team_Name;

-- E4. Rename team.
UPDATE TEAM
SET Team_Name = ?
WHERE Team_ID = ?;

-- E5. Check whether a team has students.
SELECT COUNT(*) AS Student_Count
FROM STUDENT
WHERE Team_ID = ?;

-- E6. Safe team delete.
-- Deletes only if no student is assigned to the team.
DELETE FROM TEAM
WHERE Team_ID = ?
  AND NOT EXISTS (SELECT 1 FROM STUDENT WHERE Team_ID = ?);

-- E7. Complete team/member list for a project.
SELECT
    P.Project_ID,
    P.Title,
    T.Team_ID,
    T.Team_Name,
    S.Student_ID,
    S.Name AS Student_Name,
    S.Email,
    S.Phone,
    S.Year
FROM PROJECT P
JOIN TEAM T ON P.Project_ID = T.Project_ID
LEFT JOIN STUDENT S ON T.Team_ID = S.Team_ID
WHERE P.Project_ID = ?
ORDER BY T.Team_Name, S.Name;


/* ================================================================
F. TASK OPERATIONS
================================================================ */

-- F1. Create task.
INSERT INTO TASK
    (Task_ID, Project_ID, Student_ID, Task_Name,
     Description, Priority, Status)
VALUES
    (?, ?, ?, ?, ?, ?, ?);

-- F2. Get one task.
SELECT
    Task_ID,
    Project_ID,
    Student_ID,
    Task_Name,
    Description,
    Priority,
    Status
FROM TASK
WHERE Task_ID = ?;

-- F3. Get all tasks of a project.
SELECT
    Task_ID,
    Student_ID,
    Task_Name,
    Description,
    Priority,
    Status
FROM TASK
WHERE Project_ID = ?
ORDER BY Task_ID;

-- F4. Get all tasks assigned to a student.
SELECT
    Task_ID,
    Project_ID,
    Task_Name,
    Description,
    Priority,
    Status
FROM TASK
WHERE Student_ID = ?
ORDER BY Task_ID;

-- F5. Update task details.
UPDATE TASK
SET Task_Name = ?,
    Description = ?,
    Priority = ?,
    Status = ?,
    Student_ID = ?
WHERE Task_ID = ?;

-- F6. Update task status.
UPDATE TASK
SET Status = ?
WHERE Task_ID = ?;

-- F7. Student-safe task status update.
-- A student can update only a task assigned to that student.
UPDATE TASK
SET Status = ?
WHERE Task_ID = ?
  AND Student_ID = ?;

-- F8. Reassign task.
UPDATE TASK
SET Student_ID = ?
WHERE Task_ID = ?;

-- F9. Check whether a task belongs to a project.
SELECT COUNT(*) AS Task_Count
FROM TASK
WHERE Task_ID = ?
  AND Project_ID = ?;

-- F10. Check whether a task has bug reports.
SELECT COUNT(*) AS Bug_Count
FROM BUG_REPORT
WHERE Task_ID = ?;

-- F11. Safe task delete.
-- Deletes only when no bug report references the task.
DELETE FROM TASK
WHERE Task_ID = ?
  AND NOT EXISTS (SELECT 1 FROM BUG_REPORT WHERE Task_ID = ?);

-- F12. Project tasks with assigned student.
SELECT
    T.Task_ID,
    T.Task_Name,
    T.Description,
    T.Priority,
    T.Status,
    S.Student_ID,
    S.Name AS Assigned_Student,
    P.Project_ID,
    P.Title AS Project_Title
FROM TASK T
LEFT JOIN STUDENT S ON T.Student_ID = S.Student_ID
JOIN PROJECT P ON T.Project_ID = P.Project_ID
WHERE T.Project_ID = ?
ORDER BY T.Task_ID;

-- F13. Student tasks with project name.
SELECT
    T.Task_ID,
    T.Task_Name,
    T.Description,
    T.Priority,
    T.Status,
    P.Project_ID,
    P.Title AS Project_Title
FROM TASK T
JOIN PROJECT P ON T.Project_ID = P.Project_ID
WHERE T.Student_ID = ?
ORDER BY P.Title, T.Task_ID;


/* ================================================================
G. BUG OPERATIONS
================================================================ */

-- G1. Create bug using ONLY the existing schema.
-- Task_ID may be NULL if the bug is not related to a specific task,
-- provided BUG_REPORT.Task_ID allows NULL.
INSERT INTO BUG_REPORT
    (Bug_ID, Project_ID, Task_ID, Faculty_ID,
     Status, Title, Report_Date)
VALUES
    (?, ?, ?, ?, ?, ?, ?);

-- G2. Get one bug.
SELECT
    Bug_ID,
    Project_ID,
    Task_ID,
    Faculty_ID,
    Status,
    Title,
    Report_Date
FROM BUG_REPORT
WHERE Bug_ID = ?;

-- G3. Get bugs of a project.
SELECT
    Bug_ID,
    Task_ID,
    Faculty_ID,
    Status,
    Title,
    Report_Date
FROM BUG_REPORT
WHERE Project_ID = ?
ORDER BY Report_Date DESC;

-- G4. Get bugs related to a task.
SELECT
    Bug_ID,
    Project_ID,
    Faculty_ID,
    Status,
    Title,
    Report_Date
FROM BUG_REPORT
WHERE Task_ID = ?
ORDER BY Report_Date DESC;

-- G5. Get open bugs.
SELECT
    Bug_ID,
    Project_ID,
    Task_ID,
    Faculty_ID,
    Status,
    Title,
    Report_Date
FROM BUG_REPORT
WHERE Status = 'Open'
ORDER BY Report_Date DESC;

-- G6. Update bug details supported by the schema.
UPDATE BUG_REPORT
SET Title = ?,
    Status = ?,
    Task_ID = ?,
    Faculty_ID = ?
WHERE Bug_ID = ?;

-- G7. Update bug status.
UPDATE BUG_REPORT
SET Status = ?
WHERE Bug_ID = ?;

-- G8. Check whether a bug belongs to a project.
SELECT COUNT(*) AS Bug_Count
FROM BUG_REPORT
WHERE Bug_ID = ?
  AND Project_ID = ?;

-- G9. Check whether a bug has comments.
SELECT COUNT(*) AS Comment_Count
FROM COMMENTS
WHERE Bug_ID = ?;

-- G10. Safe bug delete.
-- Deletes only when no comments reference the bug.
DELETE FROM BUG_REPORT
WHERE Bug_ID = ?
  AND NOT EXISTS (SELECT 1 FROM COMMENTS WHERE Bug_ID = ?);


/* ================================================================
H. COMMENT OPERATIONS
================================================================ */

-- H1. Add a comment on a bug report.
-- Student_ID is the foreign key to STUDENT as defined in the schema.
INSERT INTO COMMENTS
    (Comment_ID, Bug_ID, Student_ID, Comment_Text, Comment_Date)
VALUES
    (?, ?, ?, ?, ?);

-- H2. Get comments for a bug.
SELECT
    C.Comment_ID,
    C.Bug_ID,
    C.Student_ID,
    S.Name AS Student_Name,
    C.Comment_Text,
    C.Comment_Date
FROM COMMENTS C
LEFT JOIN STUDENT S ON C.Student_ID = S.Student_ID
WHERE C.Bug_ID = ?
ORDER BY C.Comment_Date ASC;

-- H3. Get one comment.
SELECT
    Comment_ID,
    Student_ID,
    Bug_ID,
    Comment_Text,
    Comment_Date
FROM COMMENTS
WHERE Comment_ID = ?;

-- H4. Student can update only their own comment.
UPDATE COMMENTS
SET Comment_Text = ?
WHERE Comment_ID = ?
  AND Student_ID = ?;

-- H5. Student can delete only their own comment.
DELETE FROM COMMENTS
WHERE Comment_ID = ?
  AND Student_ID = ?;


/* ================================================================
I. DASHBOARD QUERIES
================================================================ */

/* -------------------------- STUDENT --------------------------- */

-- I1. Student projects.
-- IMPORTANT: Project membership comes from STUDENT -> TEAM -> PROJECT,
-- not from TASK. A student may belong to a project without having a task.
SELECT DISTINCT
    P.Project_ID,
    P.Title,
    P.Description,
    P.Start_Date,
    P.End_Date,
    P.Status
FROM STUDENT S
JOIN TEAM TM ON S.Team_ID = TM.Team_ID
JOIN PROJECT P ON TM.Project_ID = P.Project_ID
WHERE S.Student_ID = ?
ORDER BY P.Start_Date DESC;

-- I2. My project count.
SELECT COUNT(DISTINCT P.Project_ID) AS My_Projects
FROM STUDENT S
JOIN TEAM TM ON S.Team_ID = TM.Team_ID
JOIN PROJECT P ON TM.Project_ID = P.Project_ID
WHERE S.Student_ID = ?;

-- I3. Pending approval count.
SELECT COUNT(DISTINCT P.Project_ID) AS Pending_Approval
FROM STUDENT S
JOIN TEAM TM ON S.Team_ID = TM.Team_ID
JOIN PROJECT P ON TM.Project_ID = P.Project_ID
WHERE S.Student_ID = ?
  AND P.Status = 'Pending';

-- I4. Approved project count.
SELECT COUNT(DISTINCT P.Project_ID) AS Approved_Projects
FROM STUDENT S
JOIN TEAM TM ON S.Team_ID = TM.Team_ID
JOIN PROJECT P ON TM.Project_ID = P.Project_ID
WHERE S.Student_ID = ?
  AND P.Status = 'Approved';

-- I5. Open bug count for student's project.
SELECT COUNT(DISTINCT B.Bug_ID) AS Open_Bug_Reports
FROM STUDENT S
JOIN TEAM TM ON S.Team_ID = TM.Team_ID
JOIN PROJECT P ON TM.Project_ID = P.Project_ID
JOIN BUG_REPORT B ON P.Project_ID = B.Project_ID
WHERE S.Student_ID = ?
  AND B.Status = 'Open';

/* -------------------------- FACULTY --------------------------- */

-- I6. Total projects.
SELECT COUNT(*) AS Total_Projects
FROM PROJECT
WHERE Faculty_ID = ?;

-- I7. Pending projects.
SELECT COUNT(*) AS Pending_Approval
FROM PROJECT
WHERE Faculty_ID = ?
  AND Status = 'Pending';

-- I8. Approved projects.
SELECT COUNT(*) AS Approved_Projects
FROM PROJECT
WHERE Faculty_ID = ?
  AND Status = 'Approved';

-- I9. Rejected projects.
SELECT COUNT(*) AS Rejected_Projects
FROM PROJECT
WHERE Faculty_ID = ?
  AND Status = 'Rejected';

-- I10. Project status summary.
SELECT Status, COUNT(*) AS Project_Count
FROM PROJECT
WHERE Faculty_ID = ?
GROUP BY Status;


/* ================================================================
J. JOIN / PROJECT OVERVIEW / REPORT QUERIES
================================================================ */

-- J1. Projects associated with a student.
SELECT DISTINCT
    P.Project_ID,
    P.Title,
    P.Description,
    P.Start_Date,
    P.End_Date,
    P.Status,
    T.Team_ID,
    T.Team_Name
FROM STUDENT S
JOIN TEAM T ON S.Team_ID = T.Team_ID
JOIN PROJECT P ON T.Project_ID = P.Project_ID
WHERE S.Student_ID = ?
ORDER BY P.Start_Date DESC;

-- J2. Project + faculty.
SELECT
    P.Project_ID,
    P.Title,
    P.Description,
    P.Start_Date,
    P.End_Date,
    P.Status,
    F.Faculty_ID,
    F.Name AS Faculty_Name,
    F.Email AS Faculty_Email
FROM PROJECT P
LEFT JOIN FACULTY F ON P.Faculty_ID = F.Faculty_ID
WHERE P.Project_ID = ?;

-- J3. Project team members.
SELECT
    T.Team_ID,
    T.Team_Name,
    S.Student_ID,
    S.Name,
    S.Email,
    S.Phone,
    S.Year
FROM TEAM T
LEFT JOIN STUDENT S ON T.Team_ID = S.Team_ID
WHERE T.Project_ID = ?
ORDER BY T.Team_Name, S.Name;

-- J4. Project tasks.
SELECT
    T.Task_ID,
    T.Task_Name,
    T.Description,
    T.Priority,
    T.Status,
    S.Student_ID,
    S.Name AS Assigned_Student
FROM TASK T
LEFT JOIN STUDENT S ON T.Student_ID = S.Student_ID
WHERE T.Project_ID = ?
ORDER BY T.Task_ID;

-- J5. Project bugs.
SELECT
    B.Bug_ID,
    B.Title,
    B.Status,
    B.Report_Date,
    B.Task_ID,
    T.Task_Name
FROM BUG_REPORT B
LEFT JOIN TASK T ON B.Task_ID = T.Task_ID
WHERE B.Project_ID = ?
ORDER BY B.Report_Date DESC;

-- J6. Complete bug details.
SELECT
    B.Bug_ID,
    B.Title AS Bug_Title,
    B.Status AS Bug_Status,
    B.Report_Date,
    P.Project_ID,
    P.Title AS Project_Title,
    T.Task_ID,
    T.Task_Name,
    F.Faculty_ID,
    F.Name AS Faculty_Name,
    F.Email AS Faculty_Email
FROM BUG_REPORT B
JOIN PROJECT P ON B.Project_ID = P.Project_ID
LEFT JOIN TASK T ON B.Task_ID = T.Task_ID
LEFT JOIN FACULTY F ON B.Faculty_ID = F.Faculty_ID
WHERE B.Bug_ID = ?;

-- J7. Bug + comments.
-- This is intentionally separate from the project/task summary so that
-- multiple tasks and multiple bugs do not multiply each other's rows.
SELECT
    B.Bug_ID,
    B.Title AS Bug_Title,
    B.Status AS Bug_Status,
    B.Report_Date,
    P.Project_ID,
    P.Title AS Project_Title,
    T.Task_ID,
    T.Task_Name,
    C.Comment_ID,
    C.Comment_Text,
    C.Comment_Date,
    S.Student_ID AS Comment_Author_ID,
    S.Name AS Comment_Author_Name
FROM BUG_REPORT B
JOIN PROJECT P ON B.Project_ID = P.Project_ID
LEFT JOIN TASK T ON B.Task_ID = T.Task_ID
LEFT JOIN COMMENTS C ON B.Bug_ID = C.Bug_ID
LEFT JOIN STUDENT S ON C.Student_ID = S.Student_ID
WHERE B.Bug_ID = ?
ORDER BY C.Comment_Date ASC;

-- J8. Student work overview.
SELECT
    S.Student_ID,
    S.Name AS Student_Name,
    TM.Team_ID,
    TM.Team_Name,
    P.Project_ID,
    P.Title AS Project_Title,
    TK.Task_ID,
    TK.Task_Name,
    TK.Priority,
    TK.Status
FROM STUDENT S
LEFT JOIN TEAM TM ON S.Team_ID = TM.Team_ID
LEFT JOIN PROJECT P ON TM.Project_ID = P.Project_ID
LEFT JOIN TASK TK ON S.Student_ID = TK.Student_ID
    AND P.Project_ID = TK.Project_ID
WHERE S.Student_ID = ?
ORDER BY P.Title, TK.Task_ID;

/*
J9. PROJECT SUMMARY - USE SEPARATE QUERIES

Do NOT use one large PROJECT -> TEAM -> STUDENT -> TASK -> BUG query
for an API response. If a project has multiple tasks and multiple bugs,
joining both collections in one query can produce repeated combinations.

Use J2 + J3 + J4 + J5 instead:
    J2 = project/faculty
    J3 = teams/students
    J4 = tasks
    J5 = bugs

The backend can return these as separate arrays/objects.
*/


/* ================================================================
K. SEARCH / FILTER / REPORTS
================================================================ */

-- K1. Search projects by title.
SELECT
    Project_ID,
    Faculty_ID,
    Title,
    Description,
    Start_Date,
    End_Date,
    Status
FROM PROJECT
WHERE Title LIKE CONCAT('%', ?, '%')
ORDER BY Title;

-- K2. Search students by name.
SELECT
    Student_ID,
    Name,
    Email,
    Phone,
    Year,
    Team_ID
FROM STUDENT
WHERE Name LIKE CONCAT('%', ?, '%')
ORDER BY Name;

-- K3. Filter tasks by status.
SELECT
    Task_ID,
    Project_ID,
    Student_ID,
    Task_Name,
    Priority,
    Status
FROM TASK
WHERE Status = ?
ORDER BY Task_ID;

-- K4. Filter tasks by priority.
SELECT
    Task_ID,
    Project_ID,
    Student_ID,
    Task_Name,
    Priority,
    Status
FROM TASK
WHERE Priority = ?
ORDER BY Task_ID;

-- K5. Filter bugs by status.
SELECT
    Bug_ID,
    Project_ID,
    Task_ID,
    Faculty_ID,
    Title,
    Status,
    Report_Date
FROM BUG_REPORT
WHERE Status = ?
ORDER BY Report_Date DESC;

-- K6. Students per team.
SELECT
    T.Team_ID,
    T.Team_Name,
    COUNT(S.Student_ID) AS Student_Count
FROM TEAM T
LEFT JOIN STUDENT S ON T.Team_ID = S.Team_ID
GROUP BY T.Team_ID, T.Team_Name
ORDER BY T.Team_Name;

-- K7. Tasks per project.
SELECT
    P.Project_ID,
    P.Title,
    COUNT(T.Task_ID) AS Task_Count
FROM PROJECT P
LEFT JOIN TASK T ON P.Project_ID = T.Project_ID
GROUP BY P.Project_ID, P.Title
ORDER BY P.Title;

-- K8. Bugs per project.
SELECT
    P.Project_ID,
    P.Title,
    COUNT(B.Bug_ID) AS Bug_Count
FROM PROJECT P
LEFT JOIN BUG_REPORT B ON P.Project_ID = B.Project_ID
GROUP BY P.Project_ID, P.Title
ORDER BY P.Title;

-- K9. Task status summary for a project.
SELECT Status, COUNT(*) AS Task_Count
FROM TASK
WHERE Project_ID = ?
GROUP BY Status;

-- K10. Bug status summary for a project.
SELECT Status, COUNT(*) AS Bug_Count
FROM BUG_REPORT
WHERE Project_ID = ?
GROUP BY Status;


/* ================================================================
L. VALIDATION / SAFE OPERATIONS
================================================================ */

-- L1. Student belongs to a specific team.
SELECT COUNT(*) AS Team_Membership
FROM STUDENT
WHERE Student_ID = ?
  AND Team_ID = ?;

-- L2. Task belongs to a project.
SELECT COUNT(*) AS Task_Count
FROM TASK
WHERE Task_ID = ?
  AND Project_ID = ?;

-- L3. Bug belongs to a project.
SELECT COUNT(*) AS Bug_Count
FROM BUG_REPORT
WHERE Bug_ID = ?
  AND Project_ID = ?;

-- L4. Check that a task is assigned to a student AND belongs to the
-- student's project. Useful before allowing student task actions.
SELECT COUNT(*) AS Valid_Task_Assignment
FROM TASK TK
JOIN STUDENT S ON TK.Student_ID = S.Student_ID
JOIN TEAM TM ON S.Team_ID = TM.Team_ID
WHERE TK.Task_ID = ?
  AND S.Student_ID = ?
  AND TK.Project_ID = TM.Project_ID;

-- L5. Check that a bug belongs to the student's project.
SELECT COUNT(*) AS Student_Project_Bug
FROM BUG_REPORT B
JOIN STUDENT S ON S.Student_ID = ?
JOIN TEAM TM ON S.Team_ID = TM.Team_ID
WHERE B.Bug_ID = ?
  AND B.Project_ID = TM.Project_ID;

-- L6. Check whether a task is safe to delete.
SELECT COUNT(*) AS Bug_Count
FROM BUG_REPORT
WHERE Task_ID = ?;

-- L7. Check whether a bug is safe to delete.
SELECT COUNT(*) AS Comment_Count
FROM COMMENTS
WHERE Bug_ID = ?;

-- L8. Check whether a project is safe to delete.
SELECT
    (SELECT COUNT(*) FROM TEAM WHERE Project_ID = ?) AS Team_Count,
    (SELECT COUNT(*) FROM TASK WHERE Project_ID = ?) AS Task_Count,
    (SELECT COUNT(*) FROM BUG_REPORT WHERE Project_ID = ?) AS Bug_Count;


/* ================================================================
M. FRONTEND -> SQL OPERATION MAP
================================================================ */

/*
LOGIN
    Student login             -> A1
    Faculty login             -> A2

PROFILE
    Student profile            -> B1
    Update student profile    -> B2 / B3 / B4
    Faculty profile            -> C1

PROJECTS
    Create project             -> D1
    View project               -> D2
    View all projects          -> D3
    Update project             -> D4
    Change status              -> D5
    Delete project             -> D8
    Faculty projects           -> C2
    Pending approval           -> C3
    Approve / Reject           -> C4 / C5

TEAMS
    Create team                -> E1
    View team                  -> E2
    Project teams              -> E3
    Rename team                -> E4
    Add student to team        -> B6
    Remove student             -> B7
    Team members               -> B5 / E7
    Delete team                -> E6

TASKS
    Create task                -> F1
    View task                  -> F2
    Project tasks              -> F3 / F12
    Student tasks              -> F4 / F13
    Update task                -> F5
    Update task status         -> F6 / F7
    Reassign task              -> F8
    Delete task                -> F11

BUGS
    Create bug                 -> G1
    View bug                   -> G2
    Project bugs               -> G3 / J5
    Task bugs                  -> G4
    Open bugs                  -> G5
    Update bug                 -> G6 / G7
    Delete bug                 -> G10
    Bug details                -> J6

COMMENTS
    Add comment                -> H1
    View comments              -> H2
    View comment               -> H3
    Update own comment         -> H4
    Delete own comment         -> H5
    Bug + comments             -> J7

DASHBOARDS
    Student dashboard         -> I1-I5
    Faculty dashboard         -> I6-I10

REPORTS / SEARCH
    Search/filter              -> K1-K5
    Counts/reports             -> K6-K10

VALIDATION
    User/project/task/bug     -> A3/A4/D6/F9/G8/L1-L8
*/


/* ================================================================
N. CURRENT DATABASE LIMITATIONS / FRONTEND GAPS
================================================================ */

/*
The following frontend requirements cannot be implemented as real
columns/operations without changing the database schema:

1. Faculty Phone Number
   No Phone column exists in FACULTY.

2. Project Tagline / Subtitle
   No Tagline/Subtitle column exists in PROJECT.

3. Project Priority
   No Priority column exists in PROJECT.

4. Team Role
   No Team_Role column/table exists.
   The current schema can identify team membership but cannot store
   Team Lead vs Member.

5. Task Due Date
   No Due_Date column exists in TASK.

6. Bug Description
   No Description column exists in BUG_REPORT.

7. Bug Priority
   No Priority column exists in BUG_REPORT.

8. Generic Bug Reported_By (User_ID)
   BUG_REPORT currently stores Faculty_ID, not a generic User_ID.
   Therefore the current operations use Faculty_ID exactly as defined
   by the existing database.

9. Project_ID / Team_ID / Task_ID / Bug_ID / Comment_ID generation
   The available relational schema does not specify AUTO_INCREMENT,
   IDENTITY, SEQUENCE, or another ID-generation mechanism.
   Therefore IDs are treated as backend-supplied parameters here.

10. Student project membership
    The current design uses one STUDENT.Team_ID. Therefore the schema
    represents a student's project membership through that team.
    A student cannot simultaneously belong to multiple teams unless the
    database design is changed.

11. Password security
    The current schema has a Password column. For production use,
    store a secure password hash and verify it in the backend.
*/


/* ================================================================
END OF RECTIFIED SQL OPERATIONS
================================================================ */
