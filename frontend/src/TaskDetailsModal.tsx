import React, { useEffect, useState } from 'react';
import * as api from './api';
import {
  X,
  Calendar,
  User,
  FolderGit2,
  Clock,
  AlertCircle,
  FileText,
  Mail,
  Hash,
  Loader2,
} from 'lucide-react';

interface TaskDetailsModalProps {
  taskId: string | number | null;
  isOpen: boolean;
  onClose: () => void;
}

interface TaskDetailData {
  Task_ID: number;
  Project_ID: number;
  Project_Title?: string;
  Project_Start_Date?: string;
  Project_End_Date?: string;
  Student_ID?: number;
  Assigned_Student?: string;
  Student_Email?: string;
  Task_Name: string;
  Description?: string;
  Priority?: string;
  Status?: string;
}

export default function TaskDetailsModal({
  taskId,
  isOpen,
  onClose,
}: TaskDetailsModalProps) {
  const [task, setTask] = useState<TaskDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !taskId) {
      setTask(null);
      setError(null);
      return;
    }

    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const cleanId = parseInt(String(taskId).replace(/\D/g, '') || '0');
        if (!cleanId) {
          throw new Error('Invalid Task ID');
        }
        const data = await api.getTask(cleanId);
        setTask(data);
      } catch (err: any) {
        console.error('Error fetching task details:', err);
        setError(err.message || 'Could not load task details from database.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [isOpen, taskId]);

  if (!isOpen) return null;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Not set';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Pending':
      default:
        return 'bg-amber-100 text-amber-800 border-amber-300';
    }
  };

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'High':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'Medium':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Low':
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Task Details</h2>
              <p className="text-xs text-slate-500">Live database record inspection</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              <p className="text-xs font-semibold">Fetching task details from MySQL...</p>
            </div>
          )}

          {error && !loading && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold">Error loading task</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && task && (
            <div className="space-y-5">
              {/* Task Title & Status Header */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200 flex items-center gap-1">
                    <Hash className="w-3 h-3" />
                    Task {task.Task_ID}
                  </span>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadge(
                      task.Status
                    )}`}
                  >
                    {task.Status || 'Pending'}
                  </span>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getPriorityBadge(
                      task.Priority
                    )}`}
                  >
                    {task.Priority || 'Medium'} Priority
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">{task.Task_Name}</h3>
              </div>

              {/* Description */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Description
                </h4>
                <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {task.Description || 'No description provided.'}
                </p>
              </div>

              {/* Grid of Attributes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Project Info */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
                    <FolderGit2 className="w-4 h-4 text-amber-500" />
                    <span>Associated Project</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {task.Project_Title || `Project #${task.Project_ID}`}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Project ID: {task.Project_ID}
                    </p>
                  </div>
                </div>

                {/* Assigned Student */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
                    <User className="w-4 h-4 text-blue-500" />
                    <span>Assigned Student</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {task.Assigned_Student || 'Unassigned'}
                    </p>
                    {task.Student_Email && (
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {task.Student_Email}
                      </p>
                    )}
                    {task.Student_ID && (
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Student ID: {task.Student_ID}
                      </p>
                    )}
                  </div>
                </div>

                {/* Project Timeline Dates */}
                <div className="sm:col-span-2 p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
                    <Calendar className="w-4 h-4 text-emerald-500" />
                    <span>Project Timeline & Dates</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Start Date</span>
                      <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {formatDate(task.Project_Start_Date)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">End Date / Deadline</span>
                      <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {formatDate(task.Project_End_Date)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 rounded-b-2xl flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
