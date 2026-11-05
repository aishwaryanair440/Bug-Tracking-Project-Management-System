import React, { useState } from 'react';
import { Project, BugReport, Student } from './data';
import * as api from './api';
import {
  GraduationCap,
  LayoutDashboard,
  FolderGit2,
  PlusCircle,
  Bug,
  User,
  LogOut,
  Bell,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Send,
  MessageSquare,
  ListTodo,
  Check,
  Plus,
  Calendar,
  Layers,
  ArrowLeft,
  X,
  AlertCircle,
  Eye
} from 'lucide-react';
import TaskDetailsModal from './TaskDetailsModal';

interface StudentPortalProps {
  projects: Project[];
  bugs: BugReport[];
  currentStudent: Student;
  onLogout: () => void;
  onAddBug: (bug: BugReport) => Promise<void> | void;
  onUpdateProject: (project: Project) => void;
  onUpdateBug: (bug: BugReport) => void;
  onRefreshData?: () => Promise<void> | void;
  onUpdateTaskStatus?: (taskId: string | number, status: string, studentId?: string | number) => Promise<void> | void;
  onUpdateBugStatus?: (bugId: string | number, status: string) => Promise<void> | void;
}

type TabType = 'dashboard' | 'my-projects' | 'bug-reports' | 'profile' | 'project-details' | 'report-bug' | 'bug-details';

export default function StudentPortal({
  projects,
  bugs,
  currentStudent,
  onLogout,
  onAddBug,
  onUpdateProject,
  onUpdateBug,
  onRefreshData,
  onUpdateTaskStatus,
  onUpdateBugStatus,
}: StudentPortalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projects[0]?.id || null);
  const [projectDetailSubTab, setProjectDetailSubTab] = useState<'overview' | 'team' | 'tasks' | 'bug-reports'>('overview');
  const [selectedBugId, setSelectedBugId] = useState<string | null>(bugs[0]?.id || null);

  // Task Details Modal state
  const [selectedTaskIdForDetails, setSelectedTaskIdForDetails] = useState<string | null>(null);
  const [isTaskDetailsModalOpen, setIsTaskDetailsModalOpen] = useState(false);

  // Status update handlers
  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    try {
      if (onUpdateTaskStatus) {
        await onUpdateTaskStatus(taskId, newStatus, currentStudent.id);
      } else {
        const cleanId = parseInt(taskId.replace(/\D/g, '') || '0');
        const cleanStudentId = parseInt(currentStudent.id.replace(/\D/g, '') || '0');
        await api.updateTaskStatus(cleanId, newStatus, cleanStudentId);
        if (onRefreshData) await onRefreshData();
      }
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  const handleBugStatusChange = async (bugId: string, newStatus: string) => {
    try {
      if (onUpdateBugStatus) {
        await onUpdateBugStatus(bugId, newStatus);
      } else {
        const cleanId = parseInt(bugId.replace(/\D/g, '') || '0');
        await api.updateBugStatus(cleanId, newStatus);
        if (onRefreshData) await onRefreshData();
      }
    } catch (err) {
      console.error('Failed to update bug status:', err);
    }
  };

  // Bug reporting form state
  const [newBugTitle, setNewBugTitle] = useState('');
  const [newBugPriority, setNewBugPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [newBugTaskId, setNewBugTaskId] = useState('');
  const [bugReportError, setBugReportError] = useState<string | null>(null);

  // Task creation state
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [taskNameInput, setTaskNameInput] = useState('');
  const [taskDescriptionInput, setTaskDescriptionInput] = useState('');
  const [taskPriorityInput, setTaskPriorityInput] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [taskStatusInput, setTaskStatusInput] = useState<'In Progress' | 'Pending' | 'Not Started' | 'Completed'>('Pending');
  const [taskStudentIdInput, setTaskStudentIdInput] = useState('');
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const [taskSuccessMessage, setTaskSuccessMessage] = useState('');
  const [taskErrorMessage, setTaskErrorMessage] = useState('');

  // Handle open task modal with sensible defaults
  const handleOpenCreateTaskModal = () => {
    setTaskNameInput('');
    setTaskDescriptionInput('');
    setTaskPriorityInput('Medium');
    setTaskStatusInput('Pending');
    // Default to the current student or the first team member
    const initialStudentId = activeProject?.members?.find((m) => m.id === currentStudent.id)?.id ||
      activeProject?.members?.[0]?.id || currentStudent.id;
    setTaskStudentIdInput(initialStudentId);
    setTaskErrorMessage('');
    setIsCreateTaskModalOpen(true);
  };

  const handleCreateTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskNameInput.trim()) {
      setTaskErrorMessage('Task Name is required.');
      return;
    }
    if (!activeProject) {
      setTaskErrorMessage('No active project selected.');
      return;
    }
    if (!taskStudentIdInput) {
      setTaskErrorMessage('Please select a student team member to assign this task to.');
      return;
    }

    setTaskSubmitting(true);
    setTaskErrorMessage('');

    try {
      const numProjectId = parseInt(activeProject.id.replace(/\D/g, '') || '0') || 1;
      const numStudentId = parseInt(taskStudentIdInput.replace(/\D/g, '') || '0') || 1;
      const numCurrentStudentId = parseInt(currentStudent.id.replace(/\D/g, '') || '0') || 1;

      await api.createTask({
        projectId: numProjectId,
        studentId: numStudentId,
        taskName: taskNameInput.trim(),
        description: taskDescriptionInput.trim(),
        priority: taskPriorityInput,
        status: taskStatusInput,
        role: 'student',
        currentStudentId: numCurrentStudentId,
      });

      // Refresh data from database
      if (onRefreshData) {
        await onRefreshData();
      }

      // Close modal and display success message
      setIsCreateTaskModalOpen(false);
      setTaskSuccessMessage(`Task "${taskNameInput.trim()}" created successfully!`);
      setTimeout(() => {
        setTaskSuccessMessage('');
      }, 5000);
    } catch (err: any) {
      console.error('Failed to create task:', err);
      setTaskErrorMessage(err.message || 'Failed to create task. Please try again.');
    } finally {
      setTaskSubmitting(false);
    }
  };

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(currentStudent.name);
  const [profileEmail, setProfileEmail] = useState(currentStudent.email);
  const [profilePhone, setProfilePhone] = useState(currentStudent.phone);
  const [profileYear, setProfileYear] = useState(currentStudent.year);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState('');
  const [profileSaveSuccess, setProfileSaveSuccess] = useState('');

  // Find student's projects (where member or creator)
  const studentProjects = projects.filter((p) =>
    p.members.some((m) => m.id === currentStudent.id || m.email === currentStudent.email)
  );

  const activeProject = projects.find((p) => p.id === selectedProjectId) || studentProjects[0] || projects[0];
  const activeBug = bugs.find((b) => b.id === selectedBugId) || bugs[0];

  // My Tasks across student projects
  const studentTasks = activeProject?.tasks || [];
  const projectTaskIds = new Set(activeProject?.tasks.map((t) => String(t.id)) || []);
  const openBugsCount = bugs.filter((b) => projectTaskIds.has(String(b.taskId)) && b.status !== 'Fixed' && b.status !== 'Resolved').length;

  const handleReportBugSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBugReportError(null);
    const targetProj = projects.find((p) => p.id === (selectedProjectId || activeProject?.id)) || activeProject;
    if (!newBugTitle.trim() || !targetProj) {
      setBugReportError('Please enter a bug title and select a project.');
      return;
    }
    if (!newBugTaskId) {
      setBugReportError('Please select a task for this bug report.');
      return;
    }

    const taskObj = targetProj.tasks.find((t) => String(t.id) === String(newBugTaskId));

    const newBug: BugReport = {
      id: `B00${bugs.length + 1}`,
      taskId: newBugTaskId,
      taskName: taskObj ? taskObj.name : undefined,
      facultyId: targetProj.facultyId || 1,
      facultyName: targetProj.facultyName,
      studentId: currentStudent.id,
      studentName: currentStudent.name,
      priority: newBugPriority,
      status: 'Open',
      title: newBugTitle.trim(),
      reportDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    };

    try {
      await onAddBug(newBug);
      setNewBugTitle('');
      setNewBugTaskId('');
      setSelectedBugId(newBug.id);
      setActiveTab('bug-details');
    } catch (err: any) {
      console.error('Student bug report error:', err);
      setBugReportError(err.message || 'Failed to submit bug report.');
    }
  };

  const renderSidebar = () => (
    <aside className="w-64 bg-[#111c2d] text-slate-300 flex flex-col justify-between shrink-0 min-h-screen border-r border-slate-800">
      <div>
        {/* Brand header */}
        <div className="p-6 flex items-center gap-3 border-b border-slate-800/80">
          <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center text-slate-900 shadow-md">
            <GraduationCap className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="text-base font-bold text-white tracking-wide">Student</div>
            <div className="text-[11px] text-amber-400 font-semibold uppercase tracking-wider">Project Portal</div>
          </div>
        </div>

        {/* Navigation items specified in prompt */}
        <nav className="p-4 space-y-1.5">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'dashboard'
                ? 'bg-amber-400 text-slate-950 shadow-sm shadow-amber-400/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('my-projects')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'my-projects' || activeTab === 'project-details'
                ? 'bg-amber-400 text-slate-950 shadow-sm shadow-amber-400/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FolderGit2 className="w-4 h-4" />
            <span>My Projects</span>
          </button>

          <button
            onClick={() => setActiveTab('bug-reports')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'bug-reports' || activeTab === 'report-bug'
                ? 'bg-amber-400 text-slate-950 shadow-sm shadow-amber-400/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Bug className="w-4 h-4" />
            <span>Bug Reports</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'profile'
                ? 'bg-amber-400 text-slate-950 shadow-sm shadow-amber-400/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profile</span>
          </button>
        </nav>
      </div>

      {/* Bottom section with Role Switcher & Logout */}
      <div className="p-4 border-t border-slate-800/80 space-y-3">

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900 font-sans">
      {renderSidebar()}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Student Portal</span>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-bold text-slate-800 capitalize">
              {activeTab.replace('-', ' ')}
            </span>
          </div>

          <div className="flex items-center gap-5">
            <button className="relative p-2 text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-100 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full"></span>
            </button>

            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
              <div className="text-right">
                <div className="text-sm font-bold text-slate-800">{currentStudent.name}</div>
                <div className="text-xs text-slate-400">{currentStudent.id}</div>
              </div>
              <div className="w-9 h-9 rounded-full bg-amber-400 text-slate-950 font-bold flex items-center justify-center text-xs shadow-xs">
                {currentStudent.name.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* Tab View router */}
        <main className="p-8 flex-1">
          {activeTab === 'dashboard' && (
            <div className="space-y-8 max-w-6xl mx-auto">
              {/* Welcome message wireframe match */}
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Good Morning, {currentStudent.name}!</h1>
                <p className="text-sm text-slate-500 mt-1">Here's an overview of your project and activities.</p>
              </div>

              {/* 4 Stat Cards matching wireframe screen 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: My Project */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">My Project</span>
                  <div className="my-3">
                    <div className="text-lg font-bold text-slate-900 truncate">
                      {activeProject ? activeProject.title : 'No Project Yet'}
                    </div>
                  </div>
                  {activeProject ? (
                    <button
                      onClick={() => {
                        setSelectedProjectId(activeProject.id);
                        setActiveTab('project-details');
                      }}
                      className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
                    >
                      View
                    </button>
                  ) : (
                    <span className="text-xs font-medium text-slate-400">
                      Assigned by Faculty
                    </span>
                  )}
                </div>

                {/* Card 2: My Tasks */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">My Tasks</span>
                  <div className="my-3">
                    <div className="text-3xl font-extrabold text-slate-900">
                      {studentTasks.length}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (activeProject) {
                        setSelectedProjectId(activeProject.id);
                        setProjectDetailSubTab('tasks');
                        setActiveTab('project-details');
                      }
                    }}
                    className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
                  >
                    View Tasks
                  </button>
                </div>

                {/* Card 3: Open Bugs */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Open Bugs</span>
                  <div className="my-3">
                    <div className="text-3xl font-extrabold text-slate-900">
                      {openBugsCount}
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('bug-reports')}
                    className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
                  >
                    View Bugs
                  </button>
                </div>

                {/* Card 4: Project Status */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Project Status</span>
                  <div className="my-3">
                    {activeProject ? (
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          activeProject.status === 'Approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : activeProject.status === 'Pending'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {activeProject.status === 'Approved' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {activeProject.status === 'Pending' && <Clock className="w-3.5 h-3.5" />}
                        {activeProject.status === 'Rejected' && <AlertTriangle className="w-3.5 h-3.5" />}
                        {activeProject.status}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 italic">None</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {activeProject ? `Submitted for 2026 Batch` : `Create a project to begin`}
                  </div>
                </div>
              </div>

              {/* Requirement: If no projects exist for a student, display:
                  "You don't have a project yet." [ + Create New Project ]
                  If projects exist, display: MY PROJECT Smart Waste Management Team Alpha Status: Pending [ View Project ] */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide">My Project</h2>
                </div>

                {studentProjects.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                      <FolderGit2 className="w-8 h-8 stroke-[1.5]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">You don't have a project yet.</h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                        Your faculty advisor will create your capstone project and assign your team members.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {studentProjects.map((proj) => (
                      <div
                        key={proj.id}
                        className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-amber-300 hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="text-base font-bold text-slate-900">{proj.title}</h3>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {proj.teamName} • {proj.id}
                              </p>
                            </div>
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                proj.status === 'Approved'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : proj.status === 'Pending'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {proj.status}
                            </span>
                          </div>

                          <div className="mt-3 text-xs text-slate-600 line-clamp-2">
                            {proj.description}
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                            <span>Start: {proj.startDate}</span>
                            <span>End: {proj.endDate}</span>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 flex items-center justify-end">
                          <button
                            onClick={() => {
                              setSelectedProjectId(proj.id);
                              setActiveTab('project-details');
                            }}
                            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <span>View Project</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* My Tasks Section matching wireframe screen 2 table */}
              {activeProject && (
                <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">My Tasks</h2>
                      <p className="text-xs text-slate-500">Assigned deliverable checklist for {activeProject.title}</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedProjectId(activeProject.id);
                        setProjectDetailSubTab('tasks');
                        setActiveTab('project-details');
                      }}
                      className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
                    >
                      View All Tasks <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                          <th className="py-2.5 px-3">Task Name</th>
                          <th className="py-2.5 px-3">Priority</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {studentTasks.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-3 font-semibold text-slate-800">{t.name}</td>
                            <td className="py-3 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                  t.priority === 'High'
                                    ? 'text-rose-600 bg-rose-50'
                                    : t.priority === 'Medium'
                                    ? 'text-amber-600 bg-amber-50'
                                    : 'text-emerald-600 bg-emerald-50'
                                }`}
                              >
                                {t.priority}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <select
                                value={t.status}
                                onChange={(e) => handleTaskStatusChange(t.id, e.target.value)}
                                className={`px-2 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400 transition-colors ${
                                  t.status === 'Completed'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : t.status === 'In Progress'
                                    ? 'bg-blue-50 text-blue-800 border-blue-300'
                                    : 'bg-amber-50 text-amber-800 border-amber-300'
                                }`}
                              >
                                <option value="Pending">Pending</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                              </select>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={() => {
                                  setSelectedTaskIdForDetails(t.id);
                                  setIsTaskDetailsModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs cursor-pointer transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-500" />
                                <span>View Details</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MY PROJECTS TAB */}
          {activeTab === 'my-projects' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">My Projects</h1>
                  <p className="text-xs text-slate-500 mt-1">Manage and track your capstone project lifecycle</p>
                </div>
              </div>

              {studentProjects.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                    <FolderGit2 className="w-8 h-8 stroke-[1.5]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">You don't have a project yet.</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                      Your faculty advisor will create your capstone project and assign your team members.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {studentProjects.map((p) => (
                    <div
                      key={p.id}
                      className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs hover:border-amber-400 hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{p.id}</span>
                            <h2 className="text-lg font-bold text-slate-900 mt-0.5">{p.title}</h2>
                            <div className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full inline-block mt-2">
                              {p.teamName} ({p.members.length} members)
                            </div>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${
                              p.status === 'Approved'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : p.status === 'Pending'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {p.status}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 mt-3 line-clamp-3 leading-relaxed">
                          {p.description}
                        </p>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                          <span>Start: {p.startDate}</span>
                          <span>End: {p.endDate}</span>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                          {p.tasks.length} tasks
                        </span>
                        <button
                          onClick={() => {
                            setSelectedProjectId(p.id);
                            setActiveTab('project-details');
                          }}
                          className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>View Project</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PROJECT DETAILS VIEW WITH TABS matching wireframe 3, 4, 5, 8 */}
          {activeTab === 'project-details' && activeProject && (
            <div className="space-y-6 max-w-6xl mx-auto">
              {/* Back button */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setActiveTab('my-projects')}
                  className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Dashboard
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Project ID: {activeProject.id}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      activeProject.status === 'Approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : activeProject.status === 'Pending'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {activeProject.status}
                  </span>
                </div>
              </div>

              {/* Title Header */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900">{activeProject.title}</h1>
                  <p className="text-xs text-slate-500 mt-1">
                    {activeProject.teamName} • {activeProject.startDate} to {activeProject.endDate}
                  </p>
                </div>
              </div>

              {/* Subtabs: Overview, Team, Tasks, Bug Reports */}
              <div className="border-b border-slate-200 flex gap-6 text-sm font-semibold">
                {(['overview', 'team', 'tasks', 'bug-reports'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setProjectDetailSubTab(tab)}
                    className={`pb-3 capitalize transition-all relative ${
                      projectDetailSubTab === tab
                        ? 'text-amber-600 font-bold border-b-2 border-amber-500'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab.replace('-', ' ')}
                  </button>
                ))}
              </div>

              {/* SUBTAB 1: OVERVIEW matching wireframe screen 3 */}
              {projectDetailSubTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Project Information</h3>
                    <div className="space-y-3 text-xs">
                      <div className="grid grid-cols-3 py-2 border-b border-slate-100">
                        <span className="text-slate-400 font-semibold">Project ID</span>
                        <span className="col-span-2 text-slate-800 font-medium">{activeProject.id}</span>
                      </div>
                      <div className="grid grid-cols-3 py-2 border-b border-slate-100">
                        <span className="text-slate-400 font-semibold">Title</span>
                        <span className="col-span-2 text-slate-800 font-semibold">{activeProject.title}</span>
                      </div>
                      <div className="grid grid-cols-3 py-2 border-b border-slate-100">
                        <span className="text-slate-400 font-semibold">Description</span>
                        <span className="col-span-2 text-slate-800 leading-relaxed">{activeProject.description}</span>
                      </div>
                      <div className="grid grid-cols-3 py-2 border-b border-slate-100">
                        <span className="text-slate-400 font-semibold">Status</span>
                        <span className="col-span-2">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-bold ${
                              activeProject.status === 'Approved' || activeProject.status === 'Completed'
                                ? 'bg-emerald-50 text-emerald-700'
                                : activeProject.status === 'Pending'
                                ? 'bg-amber-50 text-amber-700'
                                : activeProject.status === 'In Progress' || activeProject.status === 'Planned'
                                ? 'bg-blue-50 text-blue-700'
                                : activeProject.status === 'Rejected'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-slate-50 text-slate-700'
                            }`}
                          >
                            {activeProject.status}
                          </span>
                        </span>
                      </div>
                      <div className="grid grid-cols-3 py-2 border-b border-slate-100">
                        <span className="text-slate-400 font-semibold">Start Date</span>
                        <span className="col-span-2 text-slate-800 font-medium">{activeProject.startDate}</span>
                      </div>
                      <div className="grid grid-cols-3 py-2">
                        <span className="text-slate-400 font-semibold">End Date</span>
                        <span className="col-span-2 text-slate-800 font-medium">{activeProject.endDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right side Project Status card */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Project Status</h3>
                      {activeProject.status === 'Approved' && (
                        <p className="text-xs text-slate-500 mt-2">
                          This project has been approved by the faculty.
                        </p>
                      )}
                      {activeProject.status === 'Pending' && (
                        <p className="text-xs text-slate-500 mt-2">
                          This project is currently pending faculty approval.
                        </p>
                      )}
                    </div>

                    <div className="pt-6">
                      <div
                        className={`w-full py-2.5 rounded-xl text-center text-xs font-bold border ${
                          activeProject.status === 'Approved' || activeProject.status === 'Completed'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : activeProject.status === 'Pending'
                            ? 'bg-amber-50 border-amber-200 text-amber-700'
                            : activeProject.status === 'In Progress' || activeProject.status === 'Planned'
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : activeProject.status === 'Rejected'
                            ? 'bg-rose-50 border-rose-200 text-rose-700'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        ✓ {activeProject.status}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB 2: TEAM matching wireframe screen 4 */}
              {projectDetailSubTab === 'team' && (
                <div className="space-y-6">
                  {/* Team Information */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Team Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <div className="text-xs text-slate-400 font-semibold">Team ID</div>
                        <div className="text-sm font-bold text-slate-800 mt-1">T001</div>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <div className="text-xs text-slate-400 font-semibold">Team Name</div>
                        <div className="text-sm font-bold text-slate-800 mt-1">{activeProject.teamName}</div>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <div className="text-xs text-slate-400 font-semibold">Team Size</div>
                        <div className="text-sm font-bold text-slate-800 mt-1">{activeProject.members.length} Members</div>
                      </div>
                    </div>
                  </div>

                  {/* Team Members Table */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Team Members</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                            <th className="py-2.5 px-3">ID</th>
                            <th className="py-2.5 px-3">Name</th>
                            <th className="py-2.5 px-3">Email</th>
                            <th className="py-2.5 px-3">Year</th>
                            <th className="py-2.5 px-3">Phone</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {activeProject.members.map((m) => (
                            <tr key={m.id} className="hover:bg-slate-50">
                              <td className="py-3 px-3 font-mono font-bold text-slate-700">{m.id}</td>
                              <td className="py-3 px-3 font-semibold text-slate-900">{m.name}</td>
                              <td className="py-3 px-3 text-slate-600">{m.email}</td>
                              <td className="py-3 px-3 text-slate-600">{m.year}</td>
                              <td className="py-3 px-3 font-mono text-slate-600">{m.phone}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB 3: TASKS matching wireframe screen 5 */}
              {projectDetailSubTab === 'tasks' && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                  {taskSuccessMessage && (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{taskSuccessMessage}</span>
                      </div>
                      <button
                        onClick={() => setTaskSuccessMessage('')}
                        className="text-emerald-700 hover:text-emerald-900"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Tasks</h3>
                      <p className="text-xs text-slate-500">Deliverables and sprint assignment breakdown</p>
                    </div>
                    <button
                      onClick={handleOpenCreateTaskModal}
                      className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Create Task
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                          <th className="py-2.5 px-3">Task ID</th>
                          <th className="py-2.5 px-3">Task Name</th>
                          <th className="py-2.5 px-3">Description</th>
                          <th className="py-2.5 px-3">Assigned To</th>
                          <th className="py-2.5 px-3">Priority</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeProject.tasks.map((task) => (
                          <tr key={task.id} className="hover:bg-slate-50">
                            <td className="py-3 px-3 font-mono font-bold text-slate-700">{task.id}</td>
                            <td className="py-3 px-3 font-semibold text-slate-900">{task.name}</td>
                            <td className="py-3 px-3 text-slate-600">{task.description}</td>
                            <td className="py-3 px-3 text-slate-800 font-medium">{task.assignedTo}</td>
                            <td className="py-3 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                  task.priority === 'High'
                                    ? 'bg-rose-50 text-rose-600'
                                    : task.priority === 'Medium'
                                    ? 'bg-amber-50 text-amber-600'
                                    : 'bg-emerald-50 text-emerald-600'
                                }`}
                              >
                                {task.priority}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <select
                                value={task.status}
                                onChange={(e) => handleTaskStatusChange(task.id, e.target.value)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400 transition-colors ${
                                  task.status === 'Completed'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : task.status === 'In Progress'
                                    ? 'bg-blue-50 text-blue-800 border-blue-300'
                                    : 'bg-amber-50 text-amber-800 border-amber-300'
                                }`}
                              >
                                <option value="Pending">Pending</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                              </select>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={() => {
                                  setSelectedTaskIdForDetails(task.id);
                                  setIsTaskDetailsModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs cursor-pointer transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-500" />
                                <span>View Details</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SUBTAB 4: BUG REPORTS matching wireframe screen 6 */}
              {projectDetailSubTab === 'bug-reports' && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Bug Reports</h3>
                      <p className="text-xs text-slate-500">Track issues logged against this project</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('report-bug')}
                      className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      + Report New Bug
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                          <th className="py-2.5 px-3">Bug ID</th>
                          <th className="py-2.5 px-3">Title</th>
                          <th className="py-2.5 px-3">Priority</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Report Date</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {bugs
                          .filter((b) => b.projectId === activeProject.id)
                          .map((b) => (
                            <tr key={b.id} className="hover:bg-slate-50">
                              <td className="py-3 px-3 font-mono font-bold text-slate-700">{b.id}</td>
                              <td className="py-3 px-3 font-semibold text-slate-900">{b.title}</td>
                              <td className="py-3 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                    b.priority === 'High'
                                      ? 'bg-rose-50 text-rose-600'
                                      : b.priority === 'Medium'
                                      ? 'bg-amber-50 text-amber-600'
                                      : 'bg-emerald-50 text-emerald-600'
                                  }`}
                                >
                                  {b.priority}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <select
                                  value={b.status}
                                  onChange={(e) => handleBugStatusChange(b.id, e.target.value)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400 transition-colors ${
                                    b.status === 'Fixed' || b.status === 'Resolved'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                      : b.status === 'In Progress'
                                      ? 'bg-blue-50 text-blue-800 border-blue-300'
                                      : b.status === 'Under Review'
                                      ? 'bg-purple-50 text-purple-800 border-purple-300'
                                      : 'bg-amber-50 text-amber-800 border-amber-300'
                                  }`}
                                >
                                  <option value="Open">Open</option>
                                  <option value="In Progress">In Progress</option>
                                  <option value="Under Review">Under Review</option>
                                  <option value="Resolved">Resolved</option>
                                </select>
                              </td>
                              <td className="py-3 px-3 text-slate-500 font-medium">{b.reportDate}</td>
                              <td className="py-3 px-3 text-right">
                                <button
                                  onClick={() => {
                                    setSelectedBugId(b.id);
                                    setActiveTab('bug-details');
                                  }}
                                  className="px-3 py-1 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer"
                                >
                                  View Details
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* REPORT BUG PAGE matching wireframe screen 7 */}
          {activeTab === 'report-bug' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <button
                onClick={() => setActiveTab('bug-reports')}
                className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Bug Reports
              </button>

              <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
                <h1 className="text-xl font-bold text-slate-900">Report a Bug</h1>
                <p className="text-xs text-slate-500 mt-1">Submit an issue report with reproduction steps</p>

                {bugReportError && (
                  <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 font-medium">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{bugReportError}</span>
                  </div>
                )}

                <form onSubmit={handleReportBugSubmit} className="mt-6 space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Target Project <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedProjectId || activeProject?.id || ''}
                      onChange={(e) => {
                        setSelectedProjectId(e.target.value);
                        setNewBugTaskId('');
                        setBugReportError(null);
                      }}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50 bg-white font-medium"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.id} - {p.title} [Status: {p.status}]
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newBugTitle}
                      onChange={(e) => setNewBugTitle(e.target.value)}
                      placeholder="Enter bug title"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">Priority *</label>
                      <select
                        value={newBugPriority}
                        onChange={(e) => setNewBugPriority(e.target.value as any)}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50 bg-white"
                      >
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">Related Task</label>
                      <select
                        value={newBugTaskId}
                        onChange={(e) => setNewBugTaskId(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50 bg-white"
                      >
                        <option value="">Select task</option>
                        {(projects.find(p => p.id === (selectedProjectId || activeProject?.id)) || activeProject)?.tasks.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    Submit Bug Report
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* MY BUG REPORTS PAGE matching wireframe screen 9 */}
          {activeTab === 'bug-reports' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">My Bug Reports</h1>
                  <p className="text-xs text-slate-500 mt-1">Review all active bug tickets across project modules</p>
                </div>
                <button
                  onClick={() => setActiveTab('report-bug')}
                  className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  + Report New Bug
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="py-2.5 px-3">Bug ID</th>
                        <th className="py-2.5 px-3">Title</th>
                        <th className="py-2.5 px-3">Priority</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bugs.map((bug) => (
                        <tr key={bug.id} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-mono font-bold text-slate-700">{bug.id}</td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-900">{bug.title}</div>
                            <div className="text-[11px] text-slate-400">{bug.projectName}</div>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                bug.priority === 'High'
                                  ? 'bg-rose-50 text-rose-600'
                                  : bug.priority === 'Medium'
                                  ? 'bg-amber-50 text-amber-600'
                                  : 'bg-emerald-50 text-emerald-600'
                              }`}
                            >
                              {bug.priority}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <select
                              value={bug.status}
                              onChange={(e) => handleBugStatusChange(bug.id, e.target.value)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400 transition-colors ${
                                bug.status === 'Fixed' || bug.status === 'Resolved'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : bug.status === 'In Progress'
                                  ? 'bg-blue-50 text-blue-800 border-blue-300'
                                  : bug.status === 'Under Review'
                                  ? 'bg-purple-50 text-purple-800 border-purple-300'
                                  : 'bg-amber-50 text-amber-800 border-amber-300'
                              }`}
                            >
                              <option value="Open">Open</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Under Review">Under Review</option>
                              <option value="Resolved">Resolved</option>
                            </select>
                          </td>
                          <td className="py-3 px-3 text-slate-500 font-medium">{bug.reportDate}</td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => {
                                setSelectedBugId(bug.id);
                                setActiveTab('bug-details');
                              }}
                              className="px-3 py-1 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* INDIVIDUAL BUG REPORT VIEW */}
          {activeTab === 'bug-details' && activeBug && (
            <div className="max-w-4xl mx-auto space-y-6">
              <button
                onClick={() => {
                  if (selectedProjectId) {
                    setActiveTab('project-details');
                    setProjectDetailSubTab('bug-reports');
                  } else {
                    setActiveTab('bug-reports');
                  }
                }}
                className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Bug Reports
              </button>

              <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">{activeBug.title}</h1>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          activeBug.priority === 'High'
                            ? 'bg-rose-50 text-rose-600'
                            : activeBug.priority === 'Medium'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-emerald-50 text-emerald-600'
                        }`}
                      >
                        {activeBug.priority} Priority
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {activeBug.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Metadata Details strictly showing the 8 attributes */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-y border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold block mb-0.5">Bug ID (PK):</span>
                    <span className="font-mono font-bold text-slate-800">#{activeBug.id}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block mb-0.5">Task ID (FK):</span>
                    <span className="font-semibold text-slate-800">#{activeBug.taskId} {activeBug.taskName ? `(${activeBug.taskName})` : ''}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block mb-0.5">Faculty ID (FK):</span>
                    <span className="text-slate-800">#{activeBug.facultyId} {activeBug.facultyName ? `(${activeBug.facultyName})` : ''}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block mb-0.5">Student ID (FK):</span>
                    <span className="text-slate-800">#{activeBug.studentId} {activeBug.studentName ? `(${activeBug.studentName})` : ''}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block mb-0.5">Priority:</span>
                    <span className="font-bold text-slate-800">{activeBug.priority}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block mb-0.5">Status:</span>
                    <span className="font-bold text-slate-800">{activeBug.status}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block mb-0.5">Title:</span>
                    <span className="text-slate-800 font-semibold">{activeBug.title}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block mb-0.5">Report Date:</span>
                    <span className="text-slate-800">{activeBug.reportDate}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STUDENT PROFILE PAGE matching wireframe screen 10 */}
          {activeTab === 'profile' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Dashboard
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs space-y-6">
                <div className="flex items-center justify-between">
                  <h1 className="text-xl font-bold text-slate-900">Profile</h1>
                  {!isEditingProfile && (
                    <button
                      onClick={() => {
                        setProfileName(currentStudent.name);
                        setProfileEmail(currentStudent.email);
                        setProfilePhone(currentStudent.phone);
                        setProfileYear(currentStudent.year);
                        setProfileSaveError('');
                        setProfileSaveSuccess('');
                        setIsEditingProfile(true);
                      }}
                      className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      Edit Profile
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-5 pb-6 border-b border-slate-100">
                  <div className="w-16 h-16 rounded-full bg-slate-900 text-amber-400 font-extrabold text-2xl flex items-center justify-center shadow-md">
                    {currentStudent.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{currentStudent.name}</h2>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">{currentStudent.id}</div>
                    <div className="text-xs text-amber-700 font-medium mt-1">{currentStudent.email}</div>
                  </div>
                </div>

                {/* View mode */}
                {!isEditingProfile && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Student Details</h3>
                    <div className="divide-y divide-slate-100 text-xs">
                      <div className="py-3 flex justify-between">
                        <span className="text-slate-400">Name</span>
                        <span className="font-semibold text-slate-800">{currentStudent.name}</span>
                      </div>
                      <div className="py-3 flex justify-between">
                        <span className="text-slate-400">Student ID</span>
                        <span className="font-mono font-semibold text-slate-800">{currentStudent.id}</span>
                      </div>
                      <div className="py-3 flex justify-between">
                        <span className="text-slate-400">Email</span>
                        <span className="text-slate-800">{currentStudent.email}</span>
                      </div>
                      <div className="py-3 flex justify-between">
                        <span className="text-slate-400">Phone</span>
                        <span className="font-mono text-slate-800">{currentStudent.phone}</span>
                      </div>
                      <div className="py-3 flex justify-between">
                        <span className="text-slate-400">Year</span>
                        <span className="font-semibold text-slate-800">{currentStudent.year}</span>
                      </div>
                    </div>
                    {profileSaveSuccess && (
                      <p className="text-xs text-emerald-600 font-semibold">{profileSaveSuccess}</p>
                    )}
                  </div>
                )}

                {/* Edit mode */}
                {isEditingProfile && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setProfileSaving(true);
                      setProfileSaveError('');
                      setProfileSaveSuccess('');
                      try {
                        await api.updateStudent(currentStudent.id, {
                          name: profileName,
                          email: profileEmail,
                          phone: profilePhone,
                          year: profileYear,
                        });
                        // Update local currentStudent reference via parent
                        currentStudent.name = profileName;
                        currentStudent.email = profileEmail;
                        currentStudent.phone = profilePhone;
                        currentStudent.year = profileYear;
                        setProfileSaveSuccess('Profile updated successfully!');
                        setIsEditingProfile(false);
                      } catch (err: any) {
                        setProfileSaveError(err.message || 'Failed to update profile. Please try again.');
                      } finally {
                        setProfileSaving(false);
                      }
                    }}
                    className="space-y-4"
                  >
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Edit Student Details</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Name</label>
                        <input
                          type="text"
                          required
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Email</label>
                        <input
                          type="email"
                          required
                          value={profileEmail}
                          onChange={(e) => setProfileEmail(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Phone</label>
                        <input
                          type="text"
                          value={profilePhone}
                          onChange={(e) => setProfilePhone(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                          placeholder="e.g. 9876543210"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Year</label>
                        <select
                          value={profileYear}
                          onChange={(e) => setProfileYear(Number(e.target.value))}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50 bg-white"
                        >
                          <option value={1}>1st Year</option>
                          <option value={2}>2nd Year</option>
                          <option value={3}>3rd Year</option>
                          <option value={4}>4th Year</option>
                        </select>
                      </div>
                    </div>
                    {profileSaveError && (
                      <p className="text-xs text-rose-600 font-semibold">{profileSaveError}</p>
                    )}
                    <div className="flex gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={profileSaving}
                        className="flex-1 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-slate-950 font-bold text-xs shadow-xs transition-colors cursor-pointer"
                      >
                        {profileSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingProfile(false);
                          setProfileSaveError('');
                        }}
                        className="flex-1 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* CREATE TASK MODAL */}
      {isCreateTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Create New Task</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Project: <span className="font-semibold text-slate-700">{activeProject?.title || 'Selected Project'}</span> ({activeProject?.id})
                </p>
              </div>
              <button
                onClick={() => setIsCreateTaskModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {taskErrorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{taskErrorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateTaskSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Task Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={taskNameInput}
                  onChange={(e) => setTaskNameInput(e.target.value)}
                  placeholder="e.g. Design Database Schema & ERD"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={taskDescriptionInput}
                  onChange={(e) => setTaskDescriptionInput(e.target.value)}
                  placeholder="Describe the deliverables, requirements, and scope of this task..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Priority <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={taskPriorityInput}
                    onChange={(e) => setTaskPriorityInput(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50 bg-white"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={taskStatusInput}
                    onChange={(e) => setTaskStatusInput(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50 bg-white"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assign Team Member (Student ID) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={taskStudentIdInput}
                  onChange={(e) => setTaskStudentIdInput(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50 bg-white"
                >
                  {((activeProject?.members && activeProject.members.length > 0)
                    ? activeProject.members
                    : [currentStudent]
                  ).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.id}) {m.id === currentStudent.id ? '— (You)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Only members of this project's team can be assigned tasks.
                </p>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={taskSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-slate-950 font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {taskSubmitting ? 'Creating Task...' : 'Create Task'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateTaskModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Details Modal (fetches live record from MySQL) */}
      <TaskDetailsModal
        taskId={selectedTaskIdForDetails}
        isOpen={isTaskDetailsModalOpen}
        onClose={() => setIsTaskDetailsModalOpen(false)}
      />
    </div>
  );
}
