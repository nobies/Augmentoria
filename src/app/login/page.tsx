'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Lock,
  Building2,
  Users,
  Shield,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  UserCheck,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { SEED_COMPANIES, SEED_USERS } from '@/lib/tenantStorage';
import { AugmentoriaLogo } from '@/components/brand/AugmentoriaLogo';
import { UserRole } from '@/lib/types';

export default function LoginPage() {
  const router = useRouter();
  const { login, switchUser, switchCompany } = useAuth();

  const [email, setEmail] = useState('marcus@socialeyes.io');
  const [password, setPassword] = useState('••••••••••••');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const studioMembers = SEED_USERS.filter(u => u.role !== 'super_admin');
  const superAdmin = SEED_USERS.find(u => u.role === 'super_admin') || SEED_USERS[0];

  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    const res = await login(email);
    setIsSubmitting(false);

    if (res.success) {
      router.push('/dashboard');
    } else {
      setErrorMessage(res.error || 'Authentication failed. Please check your credentials.');
    }
  };

  const handleMemberOneClickLogin = async (userId: string, companyId: string) => {
    await switchUser(userId);
    if (companyId) {
      await switchCompany(companyId);
    }
    router.push('/dashboard');
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold">Super Admin</span>;
      case 'company_admin':
        return <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold">Executive Lead</span>;
      case 'account_manager':
        return <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">Account Lead</span>;
      case 'creative':
        return <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold">Finishing / VFX</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-300 text-[10px] font-bold">Member</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#05070a] text-slate-100 flex flex-col justify-between select-none relative overflow-hidden font-sans">
      {/* Subtle Background Lighting */}
      <div className="absolute top-[-10%] left-[25%] w-[600px] h-[600px] rounded-full bg-indigo-950/30 blur-[180px] pointer-events-none" />

      {/* Top Brand Bar */}
      <header className="p-6 max-w-6xl w-full mx-auto flex items-center justify-between z-20">
        <Link href="/" className="group">
          <AugmentoriaLogo size={30} textClassName="text-base font-black tracking-tight text-white group-hover:text-slate-300 transition" />
        </Link>
        <Link
          href="/"
          className="text-xs text-slate-400 hover:text-white transition font-medium"
        >
          ← Back to Homepage
        </Link>
      </header>

      {/* Main Login Workspace */}
      <main className="max-w-5xl w-full mx-auto p-4 sm:p-6 z-20 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center my-auto">
        {/* Left Col: Studio Overview & 1-Click Members */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0d121c] border border-[#1d273a] text-slate-400 text-xs font-medium">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Socialeyes Studio Production Suite</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-normal text-white leading-snug">
              Sign In to Socialeyes Studio Workspace
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Managing 50 international client brands and 500 active video deliverables. Select any studio role below for instant 1-click demo login.
            </p>
          </div>

          {/* SUPER ADMIN MASTER SHORTCUT */}
          <div className="p-4 rounded-3xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-purple-950/40 border border-purple-500/40 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-purple-900/50 text-base">
                  👑
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Platform Super Admin</span>
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[9px] font-mono font-bold">Master Control</span>
                  </div>
                  <span className="text-[11px] text-slate-400">Adam Vance • admin@augmentoria.io</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleMemberOneClickLogin(superAdmin.id, 'comp_socialeyes')}
                className="px-4 py-2 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-lg shadow-purple-900/40 flex items-center gap-1.5 active:scale-95"
              >
                <span>Quick Sign In</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* SOCIALEYES STUDIO TEAM MEMBERS GRID */}
          <div className="p-5 rounded-3xl bg-[#0b0f18] border border-[#1b2538] space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span>Socialeyes Studio Production Team</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">1-Click Instant Login</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {studioMembers.map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleMemberOneClickLogin(u.id, u.companyId)}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-[#070a10] border border-[#182133] hover:border-indigo-500/50 hover:bg-[#0e1422] transition text-left group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} alt={u.name} className="w-8 h-8 rounded-xl object-cover shrink-0 border border-[#232f48]" />
                    ) : (
                      <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {u.name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-white block truncate group-hover:text-indigo-300 transition">
                        {u.name}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate">{u.title}</span>
                    </div>
                  </div>
                  {getRoleBadge(u.role)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Standard Password Login Box (5 Cols) */}
        <div className="lg:col-span-5 bg-[#0b0f18] border border-[#1e293f] rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
          <div>
            <h2 className="text-lg font-bold text-white">Manual Sign In</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter your studio credentials to access your session.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleStandardLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Work Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#06080d] border border-[#1e273a] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">Password</label>
                <span className="text-[11px] text-slate-500">Demo (Auto-fills)</span>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#06080d] border border-[#1e273a] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono transition"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-full bg-white hover:bg-slate-200 text-black text-xs font-bold transition shadow-xl active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Authenticate to Workspace</span>
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-xs text-slate-600 z-20">
        Augmentoria • Socialeyes Studio Enterprise Edition
      </footer>
    </div>
  );
}
