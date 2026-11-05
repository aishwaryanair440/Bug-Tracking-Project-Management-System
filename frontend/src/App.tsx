/**
 * App.tsx — Root orchestrator that connects the frontend to the backend.
 *
 * Flow:
 *   1. Show LoginScreen
 *   2. Call POST /api/login with email + password + role
 *   3. On success: load all data for that role from the real API
 *   4. Render StudentPortal or FacultyPortal with live data
 *   5. All mutations (create/update/delete) call the real API and then
 *      refresh the local state so the UI stays in sync.
 */

import React, { useState, useCallback, useEffect } from 'react';
import LoginScreen from './LoginScreen';
import StudentPortal from './StudentPortal';
import FacultyPortal from './FacultyPortal';
import { Project, BugReport, Student, Task } from './data';
import * as api from './api';

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapStudent(s: any): Student {
  return {
    id: String(s.Student_ID ?? s.id ?? ''),
    name: s.Name ?? s.name ?? '',
    email: s.Email ?? s.email ?? '',
    year: Number(s.Year ?? s.year ?? 1),
    phone: s.Phone ?? s.phone ?? '',
  };
}

function mapTask(t: any): Task {
  return {
    id: String(t.Task_ID ?? t.id ?? ''),
    name: t.Task_Name ?? t.name ?? t.title ?? '',
    description: t.Description ?? t.description ?? '',
    assignedTo: t.assignedTo ?? t.Assigned_Student ?? t.Student_Name ?? String(t.Student_ID ?? ''),
    priority: (t.Priority ?? t.priority ?? 'Medium') as Task['priority'],
    status: (t.Status ?? t.status ?? 'Pending') as Task['status'],
  };
}

function mapProject(p: any): Project {
  const teamMemberRows = Array.isArray(p.members) ? p.members : [];
  const teamId = teamMemberRows.length > 0 && teamMemberRows[0].Team_ID ? String(teamMemberRows[0].Team_ID) : (p.Team_ID ? String(p.Team_ID) : undefined);
  const teamName = teamMemberRows.length > 0 && teamMemberRows[0].Team_Name ? teamMemberRows[0].Team_Name : (p.teamName ?? p.Team_Name ?? 'No Team Assigned');
  const validMembers = teamMemberRows.filter((m: any) => m.Student_ID || m.id).map(mapStudent);

  return {
    id: String(p.Project_ID ?? p.id ?? ''),
    facultyId: Number(p.Faculty_ID ?? p.facultyId ?? 1),
    facultyName: p.Faculty_Name ?? p.facultyName ?? '',
    title: p.Title ?? p.title ?? '',
    description: p.Description ?? p.description ?? '',
    teamId,
    teamName,
    teamSize: validMembers.length,
    status: (p.Status ?? p.status ?? 'Pending') as Project['status'],
    startDate: p.Start_Date
      ? new Date(p.Start_Date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : p.startDate ?? '',
    endDate: p.End_Date
      ? new Date(p.End_Date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : p.endDate ?? '',
    members: validMembers,
    tasks: Array.isArray(p.tasks) ? p.tasks.map(mapTask) : [],
  };
}

function mapBug(b: any): BugReport {
  return {
    id: String(b.Bug_ID ?? b.id ?? ''),
    taskId: String(b.Task_ID ?? b.taskId ?? ''),
    taskName: b.taskName ?? b.Task_Name ?? undefined,
    facultyId: String(b.Faculty_ID ?? b.facultyId ?? ''),
    facultyName: b.Faculty_Name ?? b.facultyName ?? undefined,
    studentId: String(b.Student_ID ?? b.studentId ?? ''),
    studentName: b.Student_Name ?? b.studentName ?? undefined,
    priority: (b.Priority ?? b.priority ?? 'Medium') as BugReport['priority'],
    status: (b.Status ?? b.status ?? 'Open') as BugReport['status'],
    title: b.Title ?? b.title ?? '',
    reportDate: b.Report_Date
      ? new Date(b.Report_Date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : b.reportDate ?? '',
  };
}

// ─── Auth state ───────────────────────────────────────────────────────────────

interface AuthUser {
  role: 'student' | 'faculty';
  id: string;
  name: string;
  email: string;
  year?: number;
  phone?: string;
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [dataError, setDataError] = useState('');

  // ── Load all data for the logged-in user ─────────────────────────────────
  const loadData = useCallback(async (user: AuthUser) => {
    setLoading(true);
    setDataError('');
    try {
      let rawProjects: any[] = [];

      if (user.role === 'student') {
        rawProjects = await api.getStudentProjects(user.id);
      } else {
        rawProjects = await api.getFacultyProjects(user.id);
      }

      const enrichedProjects = await Promise.all(
        rawProjects.map(async (rp: any) => {
          const pid = rp.Project_ID ?? rp.id;
          const [members, tasks] = await Promise.all([
            api.getProjectTeam(pid),
            api.getProjectTasks(pid),
          ]);
          return mapProject({ ...rp, members, tasks, comments: [] });
        })
      );

      // Load bugs per project
      const rawBugsNested = await Promise.all(
        rawProjects.map((rp: any) => api.getProjectBugs(rp.Project_ID ?? rp.id))
      );
      const rawBugs = rawBugsNested.flat();
      const mappedBugs = rawBugs.map(mapBug);

      setProjects(enrichedProjects);
      setBugs(mappedBugs);
    } catch (err) {
      console.error('Data load error:', err);
      setDataError('Failed to load application data from the server. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAll = useCallback(() => {
    if (authUser) loadData(authUser);
  }, [authUser, loadData]);

  // Restore authenticated session from localStorage on application reload
  useEffect(() => {
    const token = api.getAuthToken();
    const storedUser = localStorage.getItem('auth_user');
    const storedRole = localStorage.getItem('auth_role') as 'student' | 'faculty' | null;

    if (token && storedUser && storedRole) {
      try {
        const u = JSON.parse(storedUser);
        const user: AuthUser = {
          role: storedRole,
          id: String(u.Student_ID ?? u.Faculty_ID ?? u.id ?? '1'),
          name: u.Name ?? u.name ?? 'User',
          email: u.Email ?? u.email ?? '',
          year: u.Year ?? undefined,
          phone: u.Phone ?? undefined,
        };
        setAuthUser(user);
        loadData(user);
      } catch (err) {
        console.error('Session restore error:', err);
        api.clearAuthSession();
      }
    }
  }, [loadData]);

  // ── Login ─────────────────────────────────────────────────────────────────
  const handleLoginWithCredentials = useCallback(
    async (email: string, password: string, role: 'student' | 'faculty') => {
      setLoginError('');
      setLoading(true);
      try {
        const result = await api.login(email, password, role);
        const u = result.user;
        const user: AuthUser = {
          role,
          id: String(u.Student_ID ?? u.Faculty_ID ?? u.id ?? '1'),
          name: u.Name ?? u.name ?? 'User',
          email: u.Email ?? u.email ?? email,
          year: u.Year ?? undefined,
          phone: u.Phone ?? undefined,
        };
        setAuthUser(user);
        await loadData(user);
      } catch (err: any) {
        setLoginError(err.message || 'Login failed. Please check your credentials.');
      } finally {
        setLoading(false);
      }
    },
    [loadData]
  );

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = useCallback(async () => {
    try {
      await api.logout();
    } catch (_) {}
    setAuthUser(null);
    setProjects([]);
    setBugs([]);
    setLoginError('');
  }, []);

  const handleUpdateProject = useCallback(async (project: Project) => {
    try {
      await api.updateProject(project.id, {
        title: project.title,
        description: project.description,
        startDate: project.startDate,
        endDate: project.endDate,
        status: project.status,
      });
      setProjects((prev) => prev.map((p) => (p.id === project.id ? project : p)));
    } catch (err) {
      console.error('Update project error:', err);
    }
  }, []);

  const handleAddBug = useCallback(
    async (bug: BugReport) => {
      if (!authUser) return;
      const numBugId = parseInt(String(bug.id).replace(/\D/g, '') || '0') || (Date.now() % 100000);
      const numTaskId = parseInt(String(bug.taskId).replace(/\D/g, '') || '0');

      await api.createBug({
        bugId: numBugId,
        taskId: numTaskId,
        facultyId: authUser.role === 'faculty' ? parseInt(authUser.id) : (bug.facultyId ? parseInt(String(bug.facultyId)) : null),
        studentId: authUser.role === 'student' ? parseInt(authUser.id) : (bug.studentId ? parseInt(String(bug.studentId)) : null),
        priority: bug.priority,
        status: bug.status || 'Open',
        title: bug.title,
        reportDate: new Date().toISOString().split('T')[0],
      });
      await refreshAll();
    },
    [authUser, refreshAll]
  );

  const handleUpdateBug = useCallback(async (bug: BugReport) => {
    try {
      await api.updateBug(bug.id, {
        title: bug.title,
        priority: bug.priority,
        status: bug.status,
        taskId: bug.taskId ? parseInt(String(bug.taskId)) : undefined,
      });
      setBugs((prev) => prev.map((b) => (b.id === bug.id ? bug : b)));
    } catch (err) {
      console.error('Update bug error:', err);
    }
  }, []);

  const handleUpdateBugStatus = useCallback(
    async (bugId: string | number, status: string) => {
      const cleanId = parseInt(String(bugId).replace(/\D/g, '') || '0');
      // Optimistic update
      setBugs((prev) =>
        prev.map((b) => (String(b.id) === String(bugId) ? { ...b, status: status as any } : b))
      );
      try {
        await api.updateBugStatus(cleanId, status);
      } catch (err) {
        console.error('Update bug status error:', err);
        refreshAll();
      }
    },
    [refreshAll]
  );

  const handleUpdateTaskStatus = useCallback(
    async (taskId: string | number, status: string, studentId?: string | number) => {
      const cleanId = parseInt(String(taskId).replace(/\D/g, '') || '0');
      const cleanStudentId = studentId
        ? parseInt(String(studentId).replace(/\D/g, '') || '0')
        : undefined;

      // Optimistic update
      setProjects((prev) =>
        prev.map((proj) => ({
          ...proj,
          tasks: proj.tasks.map((t) =>
            String(t.id) === String(taskId) ? { ...t, status: status as any } : t
          ),
        }))
      );

      try {
        await api.updateTaskStatus(cleanId, status, cleanStudentId);
      } catch (err) {
        console.error('Update task status error:', err);
        refreshAll();
      }
    },
    [refreshAll]
  );

  // ─── Faculty handlers ─────────────────────────────────────────────────────

  const handleApproveProject = useCallback(async (projectId: string) => {
    try {
      await api.updateProjectStatus(projectId, 'Approved');
      setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, status: 'Approved' } : p)));
    } catch (err) {
      console.error('Approve project error:', err);
    }
  }, []);

  const handleRejectProject = useCallback(async (projectId: string) => {
    try {
      await api.updateProjectStatus(projectId, 'Rejected');
      setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, status: 'Rejected' } : p)));
    } catch (err) {
      console.error('Reject project error:', err);
    }
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────

  if (!authUser) {
    return (
      <LoginScreen
        onLogin={() => {}}
        onLoginWithCredentials={handleLoginWithCredentials}
        loginError={loginError}
        isLoading={loading}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-300 text-sm font-medium">Loading your workspace…</p>
        </div>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center max-w-md p-6 bg-slate-800 rounded-xl border border-slate-700 shadow-xl">
          <h2 className="text-xl font-bold text-red-400 mb-2">Error Loading Data</h2>
          <p className="text-slate-300 text-sm mb-6">{dataError}</p>
          <button 
            onClick={() => refreshAll()} 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const currentStudent: Student = {
    id: authUser.id,
    name: authUser.name,
    email: authUser.email,
    year: authUser.year ?? 2,
    phone: authUser.phone ?? '',
  };

  if (authUser.role === 'student') {
    return (
      <StudentPortal
        projects={projects}
        bugs={bugs}
        currentStudent={currentStudent}
        onLogout={handleLogout}
        onAddBug={handleAddBug}
        onUpdateProject={handleUpdateProject}
        onUpdateBug={handleUpdateBug}
        onUpdateBugStatus={handleUpdateBugStatus}
        onUpdateTaskStatus={handleUpdateTaskStatus}
        onRefreshData={refreshAll}
      />
    );
  }

  const currentFaculty = {
    id: authUser.id,
    name: authUser.name,
    email: authUser.email,
  };

  return (
    <FacultyPortal
      currentFaculty={currentFaculty}
      projects={projects}
      bugs={bugs}
      onLogout={handleLogout}
      onAddBug={handleAddBug}
      onApproveProject={handleApproveProject}
      onRejectProject={handleRejectProject}
      onUpdateBug={handleUpdateBug}
      onUpdateBugStatus={handleUpdateBugStatus}
      onUpdateTaskStatus={handleUpdateTaskStatus}
      onRefreshData={refreshAll}
    />
  );
}
