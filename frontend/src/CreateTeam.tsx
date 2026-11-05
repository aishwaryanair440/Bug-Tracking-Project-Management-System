import React, { useState, useEffect } from 'react';
import { Project } from './data';
import * as api from './api';
import {
  ArrowLeft,
  Users,
  CheckCircle2,
  AlertCircle,
  FolderGit2,
  Search,
  UserPlus,
  ShieldAlert,
  Info
} from 'lucide-react';

interface StudentRecord {
  Student_ID: number;
  Name: string;
  Email: string;
  Phone: string | null;
  Year: number | null;
  Team_ID: number | null;
  Team_Name: string | null;
  Project_ID: number | null;
}

interface CreateTeamProps {
  projects: Project[];
  preselectedProjectId?: string;
  onBack: () => void;
  onSuccess: () => void;
}

export default function CreateTeam({
  projects,
  preselectedProjectId,
  onBack,
  onSuccess
}: CreateTeamProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(preselectedProjectId || '');
  const [teamName, setTeamName] = useState('');
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [studentSearch, setStudentSearch] = useState('');

  const [loadingStudents, setLoadingStudents] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Auto-select first project without a team if available
  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      const withoutTeam = projects.find(p => !p.teamName || p.teamName === 'Team' || p.teamName === 'No Team Assigned');
      if (withoutTeam) {
        setSelectedProjectId(withoutTeam.id);
      } else {
        setSelectedProjectId(projects[0].id);
      }
    }
  }, [projects, selectedProjectId]);

  // Load real students from MySQL
  useEffect(() => {
    setLoadingStudents(true);
    api.getStudents()
      .then((data) => {
        if (Array.isArray(data)) {
          setStudents(data);
        }
      })
      .catch((err) => {
        console.error('Failed to load students:', err);
        setErrorMsg('Could not fetch student list from backend.');
      })
      .finally(() => {
        setLoadingStudents(false);
      });
  }, []);

  const selectedProject = projects.find(p => String(p.id) === String(selectedProjectId));
  const projectHasTeam = selectedProject && selectedProject.teamName && selectedProject.teamName !== 'No Team Assigned' && selectedProject.teamName !== 'Team';

  const toggleStudent = (studentId: number) => {
    setSelectedStudentIds(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const filteredStudents = students.filter(s => {
    const q = studentSearch.toLowerCase();
    return s.Name.toLowerCase().includes(q) || s.Email.toLowerCase().includes(q) || String(s.Student_ID).includes(q);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedProjectId) {
      setErrorMsg('Please select a project to associate with this team.');
      return;
    }

    if (!teamName.trim()) {
      setErrorMsg('Please enter a team name.');
      return;
    }

    if (projectHasTeam) {
      setErrorMsg(`Project "${selectedProject.title}" already has an assigned team ('${selectedProject.teamName}'). Under the MySQL schema constraint (uq_team_project), each project may have exactly one team.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.createTeam({
        projectId: Number(selectedProjectId),
        teamName: teamName.trim(),
        studentIds: selectedStudentIds,
      });

      setSuccessMsg(res.message || 'Team created and students assigned successfully!');
      setTimeout(() => {
        onSuccess();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create team');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Teams & Projects
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Banner */}
        <div className="p-8 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white relative">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-200 mb-2">
            <UserPlus className="w-4 h-4" />
            Faculty Portal • Team Creation & Student Assignment
          </div>
          <h1 className="text-2xl font-bold">Create Team & Assign Students</h1>
          <p className="text-xs text-blue-100 max-w-xl mt-1">
            Establish a designated team in the TEAM table for your capstone project, and link registered students from the STUDENT table.
          </p>
        </div>

        <div className="p-8 space-y-6">
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-700 text-xs font-medium">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
              <div>
                <p className="font-bold">Team Creation Error</p>
                <p className="mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-emerald-700 text-xs font-medium">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
              <div>
                <p className="font-bold">Success!</p>
                <p className="mt-0.5">{successMsg}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Select Project */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Select Project <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <FolderGit2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <select
                  value={selectedProjectId}
                  onChange={(e) => {
                    setSelectedProjectId(e.target.value);
                    setErrorMsg('');
                  }}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  required
                >
                  <option value="">-- Choose a project --</option>
                  {projects.map((p) => {
                    const hasTeam = p.teamName && p.teamName !== 'No Team Assigned' && p.teamName !== 'Team';
                    return (
                      <option key={p.id} value={p.id}>
                        [Project #{p.id}] {p.title} {hasTeam ? `(Assigned: ${p.teamName})` : '(No Team)'}
                      </option>
                    );
                  })}
                </select>
              </div>

              {projectHasTeam && (
                <div className="mt-2 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-2 text-amber-800 text-xs">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Warning: Project #{selectedProject?.id} already has assigned team <strong>"{selectedProject?.teamName}"</strong>. In MySQL, each project can have at most one team.
                  </span>
                </div>
              )}
            </div>

            {/* 2. Team Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Team Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Users className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g., Delta Squad, Alpha Innovators"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Stored in TEAM.Team_Name (max 100 characters).</p>
            </div>

            {/* 3. Assign Existing Students */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Assign Existing Students from Database ({selectedStudentIds.length} Selected)
                </label>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedStudentIds(filteredStudents.map(s => s.Student_ID))}
                    className="text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                  >
                    Select Filtered
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedStudentIds([])}
                    className="text-slate-500 hover:text-slate-700 font-bold cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Student Search */}
              <div className="relative mb-3">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search students by name, email, or Student ID..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {loadingStudents ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Loading student records from MySQL…</p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                  No matching student records found.
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
                  {filteredStudents.map((s) => {
                    const isSelected = selectedStudentIds.includes(s.Student_ID);
                    return (
                      <div
                        key={s.Student_ID}
                        onClick={() => toggleStudent(s.Student_ID)}
                        className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50/80' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <div>
                            <div className="text-xs font-bold text-slate-800">
                              {s.Name}{' '}
                              <span className="font-mono text-[10px] text-slate-400 font-normal">
                                (ID: {s.Student_ID})
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">{s.Email}</div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              s.Team_Name
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {s.Team_Name ? `Team: ${s.Team_Name}` : 'Unassigned'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="text-[11px] text-slate-400 mt-1">
                Selected students will have their STUDENT.Team_ID updated to this new team.
              </p>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onBack}
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || (projectHasTeam ?? false)}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Creating Team…</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Create Team & Assign Students</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
