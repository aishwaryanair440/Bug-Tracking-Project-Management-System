import React, { useState } from 'react';
import {
  GraduationCap,
  ShieldCheck,
  Mail,
  Lock,
  ArrowRight,
  BookOpen,
  Sparkles,
  CheckCircle,
  Eye,
  EyeOff
} from 'lucide-react';

interface LoginScreenProps {
  onLogin: (role: 'student' | 'faculty') => void;
  onLoginWithCredentials?: (email: string, password: string, role: 'student' | 'faculty') => void;
  loginError?: string;
  isLoading?: boolean;
}

export default function LoginScreen({ onLogin, onLoginWithCredentials, loginError, isLoading }: LoginScreenProps) {
  const [activeRole, setActiveRole] = useState<'student' | 'faculty'>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleRoleToggle = (role: 'student' | 'faculty') => {
    setActiveRole(role);
    setEmail('');
    setPassword('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onLoginWithCredentials) {
      onLoginWithCredentials(email, password, activeRole);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 md:p-8 bg-slate-100">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Left Branding Hero Panel matching wireframe */}
        <div
          className={`p-10 flex flex-col justify-between transition-colors duration-300 relative overflow-hidden ${
            activeRole === 'student'
              ? 'bg-gradient-to-br from-amber-400 via-amber-400 to-amber-500 text-slate-950'
              : 'bg-gradient-to-br from-blue-600 via-blue-700 to-slate-900 text-white'
          }`}
        >
          {/* Subtle background graphic */}
          <div className="absolute -right-10 -bottom-10 opacity-15 pointer-events-none">
            <GraduationCap className="w-80 h-80" />
          </div>

          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/10 text-xs font-bold tracking-wide uppercase mb-6 backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5" />
              Unified Capstone Portal
            </div>

            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight">
              {activeRole === 'student' ? 'Student Portal' : 'Faculty Portal'}
            </h1>
            <p className="mt-2 text-sm font-medium opacity-85">
              {activeRole === 'student' ? 'Work. Build. Grow.' : 'Guide. Evaluate. Mentor.'}
            </p>
          </div>

          {/* Center wireframe sketch illustration representation */}
          <div className="my-10 flex flex-col items-center justify-center">
            <div
              className={`w-36 h-36 rounded-2xl flex flex-col items-center justify-center p-4 border-2 transition-all ${
                activeRole === 'student'
                  ? 'bg-amber-300/40 border-amber-900/20 text-slate-950'
                  : 'bg-white/10 border-white/20 text-white'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-black/10 flex items-center justify-center mb-2">
                {activeRole === 'student' ? (
                  <GraduationCap className="w-7 h-7" />
                ) : (
                  <ShieldCheck className="w-7 h-7" />
                )}
              </div>
              <span className="text-xs font-extrabold uppercase tracking-wider">
                {activeRole === 'student' ? 'Student Workspace' : 'Academic Board'}
              </span>
              <span className="text-[10px] opacity-75 mt-0.5">2026 Curriculum</span>
            </div>
          </div>

          {/* Quick preset selector at bottom */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider opacity-75">
              Quick Switch Role:
            </div>
            <div className="grid grid-cols-2 gap-2 bg-black/10 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => handleRoleToggle('student')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                  activeRole === 'student'
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'text-current opacity-70 hover:opacity-100'
                }`}
              >
                🎓 Student Role
              </button>
              <button
                type="button"
                onClick={() => handleRoleToggle('faculty')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                  activeRole === 'faculty'
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'text-current opacity-70 hover:opacity-100'
                }`}
              >
                🏛️ Faculty Role
              </button>
            </div>
          </div>
        </div>

        {/* Right Form Panel matching wireframe */}
        <div className="p-8 md:p-12 flex flex-col justify-center">
          <div className="mb-8">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center mb-4">
              <GraduationCap className="w-6 h-6 stroke-[2.2]" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Welcome Back</h2>
            <p className="text-xs text-slate-500 mt-1">
              Sign in to your {activeRole} account to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs text-center">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                activeRole === 'student'
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-400/20'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Logging in…</span>
              ) : (
                <><span>Login as {activeRole === 'student' ? 'Student' : 'Faculty'}</span><ArrowRight className="w-4 h-4" /></>
              )}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}
