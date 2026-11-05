// Central API configuration — never hard-code localhost here.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

export function setAuthSession(token: string, user: any, role: string) {
  localStorage.setItem('auth_token', token);
  localStorage.setItem('auth_user', JSON.stringify(user));
  localStorage.setItem('auth_role', role);
}

export function clearAuthSession() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
  localStorage.removeItem('auth_role');
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options?.headers as Record<string, string>) || {}),
  };
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Request failed: ${res.status}`);
  }
  return data as T;
}

// ── Auth ───────────────────────────────────────────────────────────────────
export async function login(email: string, password: string, role: 'student' | 'faculty') {
  const res = await request<{ message: string; role: string; user: any; token?: string }>('/api/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, role }),
  });
  if (res.token) {
    setAuthSession(res.token, res.user, res.role);
  }
  return res;
}

export async function logout() {
  try {
    await request<any>('/api/logout', { method: 'POST' });
  } catch (_) {
    // Ignore failure on logout
  } finally {
    clearAuthSession();
  }
}

export function getCurrentSession() {
  return request<{ user: any; role: string; userId: number }>('/api/me');
}

// ── Students ───────────────────────────────────────────────────────────────
export function getStudents() {
  return request<any[]>('/api/students');
}

export function getStudent(id: number | string) {
  return request<any>(`/api/students/${id}`);
}

export function updateStudent(id: number | string, data: { name: string; email: string; phone: string; year: number }) {
  return request<any>(`/api/students/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function getStudentProjects(id: number | string) {
  return request<any[]>(`/api/students/${id}/projects`);
}

export function getStudentTasks(id: number | string) {
  return request<any[]>(`/api/students/${id}/tasks`);
}

export function getStudentDashboard(id: number | string) {
  return request<{ totalProjects: number; pendingProjects: number; approvedProjects: number; openBugReports: number }>(
    `/api/students/${id}/dashboard`
  );
}

export function assignStudentTeam(id: number | string, teamId: number | string) {
  return request<any>(`/api/students/${id}/team`, {
    method: 'PUT',
    body: JSON.stringify({ teamId }),
  });
}

// ── Faculty ────────────────────────────────────────────────────────────────
export function getFacultyList() {
  return request<any[]>('/api/faculty');
}

export function getFaculty(id: number | string) {
  return request<any>(`/api/faculty/${id}`);
}

export function getFacultyProjects(id: number | string) {
  return request<any[]>(`/api/faculty/${id}/projects`);
}

export function getFacultyDashboard(id: number | string) {
  return request<{ totalProjects: number; pendingProjects: number; approvedProjects: number }>(
    `/api/faculty/${id}/dashboard`
  );
}

// ── Projects ───────────────────────────────────────────────────────────────
export function getProjects() {
  return request<any[]>('/api/projects');
}

export function getProject(id: number | string) {
  return request<any>(`/api/projects/${id}`);
}

export function createProject(data: {
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  projectId?: number;
  facultyId?: number;
}) {
  return request<any>('/api/projects', { method: 'POST', body: JSON.stringify(data) });
}

export function updateProject(id: number | string, data: {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: string;
}) {
  return request<any>(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function updateProjectStatus(id: number | string, status: 'Pending' | 'Approved' | 'Rejected' | 'In Progress' | 'Completed' | 'Planned') {
  return request<any>(`/api/projects/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export function deleteProject(id: number | string) {
  return request<any>(`/api/projects/${id}`, { method: 'DELETE' });
}

// ── Teams ──────────────────────────────────────────────────────────────────
export function getTeams() {
  return request<any[]>('/api/teams');
}

export function getTeam(id: number | string) {
  return request<any>(`/api/teams/${id}`);
}

export function getTeamMembers(id: number | string) {
  return request<any[]>(`/api/teams/${id}/members`);
}

export function getProjectTeam(projectId: number | string) {
  return request<any[]>(`/api/projects/${projectId}/team`);
}

export function createTeam(data: {
  projectId: number;
  teamName: string;
  studentIds?: number[];
  teamId?: number;
}) {
  return request<any>('/api/teams', { method: 'POST', body: JSON.stringify(data) });
}

// ── Tasks ──────────────────────────────────────────────────────────────────
export function getTasks() {
  return request<any[]>('/api/tasks');
}

export function getTask(id: number | string) {
  return request<any>(`/api/tasks/${id}`);
}

export function getProjectTasks(projectId: number | string) {
  return request<any[]>(`/api/projects/${projectId}/tasks`);
}

export function createTask(data: {
  taskId?: number | null;
  projectId: number;
  studentId: number;
  taskName: string;
  description?: string;
  priority: string;
  status: string;
  currentStudentId?: number | string;
  role?: string;
}) {
  return request<any>('/api/tasks', { method: 'POST', body: JSON.stringify(data) });
}

export function updateTask(id: number | string, data: {
  taskName: string;
  description: string;
  priority: string;
  status: string;
  studentId: number;
}) {
  return request<any>(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function updateTaskStatus(id: number | string, status: string, studentId?: number | string) {
  return request<any>(`/api/tasks/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status, studentId }),
  });
}

export function deleteTask(id: number | string) {
  return request<any>(`/api/tasks/${id}`, { method: 'DELETE' });
}

// ── Bugs ───────────────────────────────────────────────────────────────────
export function getBugs() {
  return request<any[]>('/api/bugs');
}

export function getProjectBugs(projectId: number | string) {
  return request<any[]>(`/api/projects/${projectId}/bugs`);
}

export function getBug(id: number | string) {
  return request<any>(`/api/bugs/${id}`);
}

export function createBug(data: {
  bugId?: number;
  taskId: number;
  facultyId?: number | null;
  studentId?: number | null;
  priority: string;
  status?: string;
  title: string;
  reportDate?: string;
}) {
  return request<any>('/api/bugs', { method: 'POST', body: JSON.stringify(data) });
}

export function updateBug(id: number | string, data: {
  title?: string;
  priority?: string;
  status?: string;
  taskId?: number | null;
  facultyId?: number | null;
  studentId?: number | null;
}) {
  return request<any>(`/api/bugs/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function updateBugStatus(id: number | string, status: string) {
  return request<any>(`/api/bugs/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export function deleteBug(id: number | string) {
  return request<any>(`/api/bugs/${id}`, { method: 'DELETE' });
}

// ── Health ─────────────────────────────────────────────────────────────────
export function checkHealth() {
  return request<{ status: string; database: string }>('/api/health');
}
