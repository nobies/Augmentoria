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

  const [email, setEmail] = useState('sarah@vortexpost.com');
  const [password, setPassword] = useState('••••••••••••');
  const [selectedStudioTab, setSelectedStudioTab] = useState('comp_vortex');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedStudioObj = SEED_COMPANIES.find(c => c.id === selectedStudioTab) || SEED_COMPANIES[0];
  const studioMembers = SEED_USERS.filter(u => u.companyId === selectedStudioTab);

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
    await switchCompany(companyId);
    await switchUser(userId);
    router.push('/dashboard');
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold">Super Admin</span>;
      case 'company_admin':
        return <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold">Company Admin</span>;
      case 'account_manager':
        return <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">Producer</span>;
      case 'creative':
        return <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold">Creative / Editor</span>;
      case 'client_reviewer':
        return <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">Client Reviewer</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-300 text-[10px] font-bold">Member</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#05070a] text-slate-100 flex flex-col justify-between select-none relative overflow-hidden font-sans">
      {/* Subtle Background Lighting */}
      <div className="absolute top-[-10%] left-[25%] w-[600px] h-[600px] rounded-full bg-slate-800/10 blur-[180px] pointer-events-none" />

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
        {/* Left Col: Tenant Explanation & 1-Click Studio Member Switcher (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0d121c] border border-[#1d273a] text-slate-400 text-xs font-medium">
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              <span>Strict Multi-Tenant Isolation Enforced</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-normal text-white leading-snug">
              Sign In to Your Studio Workspace
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Every member belongs strictly to their own production studio. Select any studio below to test member permissions and isolated project repositories.
            </p>
          </div>

          {/* 10 Studios Tabs */}
          <div className="space-y-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              1. Choose Studio Tenant ({SEED_COMPANIES.length} Available):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SEED_COMPANIES.map(c => {
                const isSelected = c.id === selectedStudioTab;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedStudioTab(c.id);
                      // Set default email to first member of that studio
                      const m = SEED_USERS.find(u => u.companyId === c.id);
                      if (m) setEmail(m.email);
                    }}
                    className={`p-2.5 rounded-2xl text-left border transition ${
                      isSelected
                        ? 'bg-[#121927] border-white text-white shadow-xl'
                        : 'bg-[#080c14] border-[#182133] text-slate-400 hover:bg-[#0f1522]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        style={{ backgroundColor: c.brandPrimary }}
                        className="w-4 h-4 rounded-md flex items-center justify-center text-[9px] font-black text-white shrink-0"
                      >
                        {c.name.charAt(0)}
                      </div>
                      <span className="text-xs font-bold truncate block">{c.name}</span>
                    </div>
                    <span className="text-[9px] text-slate-500 capitalize block">{c.plan} Tier</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Members of Selected Studio (1-Click Instant Demo Login) */}
          <div className="p-5 rounded-3xl bg-[#080c14] border border-[#182133] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>2. Instant Login as Member of </span>
                <span className="text-slate-300 underline underline-offset-4">{selectedStudioObj.name}</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono font-bold">
                {studioMembers.length} Members
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {studioMembers.map(member => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => handleMemberOneClickLogin(member.id, selectedStudioTab)}
                  className="p-3 rounded-2xl bg-[#0d121d] hover:bg-[#151e2e] border border-[#1b2538] hover:border-slate-500 text-left transition group flex items-center justify-between gap-2 shadow"
                >
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white group-hover:text-slate-200 block truncate">
                      {member.name}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">{member.title || member.email}</span>
                  </div>
                  {getRoleBadge(member.role)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Standard Credential Sign-In Card (5 Cols) */}
        <div className="lg:col-span-5">
          <div className="p-7 rounded-3xl bg-[#090d15] border border-[#1b2538] shadow-2xl space-y-6">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Credential Access</span>
              <h2 className="text-lg font-bold text-white">Direct Member Login</h2>
              <p className="text-xs text-slate-400">Enter your studio email address to open your workspace.</p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleStandardLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Studio Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#05070a] border border-[#1e273a] text-xs text-white focus:outline-none focus:border-white font-mono transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#05070a] border border-[#1e273a] text-xs text-white focus:outline-none focus:border-white transition"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-full bg-white hover:bg-slate-200 text-black text-xs font-bold shadow-xl transition active:scale-95 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <span>Authenticating...</span>
                  ) : (
                    <>
                      <span>Enter Studio Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="pt-4 border-t border-[#141b29] text-center">
              <span className="text-[11px] text-slate-500 block">
                Platform Super Admin: <span className="font-mono text-slate-400">admin@augmentoria.io</span>
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-xs text-slate-600 z-20">
        <span>© 2026 Augmentoria Inc. Strict Tenant Isolation & Multi-Tenant RBAC Protection.</span>
      </footer>
    </div>
  );
}
