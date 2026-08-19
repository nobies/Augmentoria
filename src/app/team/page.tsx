'use client';

import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  ShieldCheck,
  Mail,
  UserCheck,
  Sparkles,
  Check,
  Trash2,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AppNavbar } from '@/components/shell/AppNavbar';
import { UserRole } from '@/lib/types';

export default function TeamPage() {
  const {
    currentCompany,
    companyUsers,
    addTeamMember,
    canManageCompany,
  } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('creative');
  const [newUserTitle, setNewUserTitle] = useState('');

  const filteredUsers = companyUsers.filter(
    u =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.title || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;
    await addTeamMember({
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      role: newUserRole,
      title: newUserTitle.trim() || undefined,
    });
    setNewUserName('');
    setNewUserEmail('');
    setNewUserTitle('');
    setIsInviteModalOpen(false);
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'company_admin':
        return <span className="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold">Company Admin</span>;
      case 'account_manager':
        return <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold">Account Manager / Producer</span>;
      case 'creative':
        return <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">Creative / Lead Editor</span>;
      case 'client_reviewer':
        return <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">Client Reviewer</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full bg-slate-500/10 border border-slate-500/30 text-slate-400 text-xs font-bold">Member</span>;
    }
  };

  const roleDefinitions = [
    {
      role: 'Company Admin',
      desc: 'Full studio control: manage users, studio branding, subscription plans, and all projects.',
      permissions: ['Manage Workspace', 'Create & Delete Projects', 'Invite Members', 'Review & Approve'],
    },
    {
      role: 'Account Manager / Producer',
      desc: 'Manages client communication, creates projects, schedules review sessions, and tracks deliverables.',
      permissions: ['Create Projects', 'Manage Clients', 'Start Review Sessions', 'Export Reports'],
    },
    {
      role: 'Creative / Editor',
      desc: 'Uploads video cuts, adds frame annotations, records color grading proposals, and resolves edit notes.',
      permissions: ['Upload Media Cuts', 'Draw on Frames', 'Color Grade Notes', 'Resolve Comments'],
    },
    {
      role: 'Client Reviewer',
      desc: 'Invited external reviewer with scoped permissions to view screeners, type feedback, and sign off.',
      permissions: ['View Video Screeners', 'Add Notes & Timestamps', 'Draw Overlays', 'Export PDF'],
    },
  ];

  return (
    <div className="min-h-screen bg-[#090c13] text-slate-100 flex flex-col select-none">
      <AppNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-orange-400" />
              <span>Team & Role Permissions</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage studio members, assigned roles, and RBAC security boundaries.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {canManageCompany && (
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-blue-900/30 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Invite Team Member</span>
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full max-w-md bg-[#111724] border border-[#20293d] p-1.5 rounded-2xl">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search members by name, role, or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#090d14] border border-[#232d44] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Team Members List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map(member => (
            <div
              key={member.id}
              className="p-5 rounded-2xl bg-[#111724] border border-[#20293d] hover:border-blue-500/50 transition group flex flex-col justify-between gap-4 shadow-xl"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 font-bold text-sm flex items-center justify-center shrink-0 overflow-hidden">
                  {member.avatarUrl ? (
                    <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
                  ) : (
                    member.name.charAt(0)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <h3 className="text-sm font-bold text-white truncate">{member.name}</h3>
                  </div>
                  <span className="text-xs text-slate-400 block truncate">{member.title || 'Studio Member'}</span>
                  <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-1 truncate">
                    <Mail className="w-3 h-3 shrink-0" />
                    <span className="truncate">{member.email}</span>
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#1d2538] flex items-center justify-between">
                <div>{getRoleBadge(member.role)}</div>
                <span className="text-[10px] text-slate-500 font-mono">
                  Active
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Role Matrix Reference Section */}
        <div className="pt-6 border-t border-[#1c2438] space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-bold text-white">Platform Role Matrix (RBAC)</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {roleDefinitions.map(def => (
              <div key={def.role} className="p-4 rounded-2xl bg-[#111724] border border-[#20293d] shadow-lg flex flex-col justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">{def.role}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">{def.desc}</p>
                </div>

                <div className="pt-2 border-t border-[#1c2438] space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Capabilities:</span>
                  {def.permissions.map(perm => (
                    <div key={perm} className="flex items-center gap-1.5 text-xs text-slate-300">
                      <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>{perm}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Invite Member Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#111724] border border-[#232d44] rounded-2xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-white mb-1">Invite New Team Member</h3>
            <p className="text-xs text-slate-400 mb-4">Grant access to {currentCompany?.name} projects with specific role permissions.</p>

            <form onSubmit={handleInviteSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maya Lin"
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#090d14] border border-[#232d44] text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="maya@vortexpost.com"
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#090d14] border border-[#232d44] text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Job Title</label>
                  <input
                    type="text"
                    placeholder="e.g. VFX Supervisor"
                    value={newUserTitle}
                    onChange={e => setNewUserTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#090d14] border border-[#232d44] text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Role</label>
                  <select
                    value={newUserRole}
                    onChange={e => setNewUserRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-xl bg-[#090d14] border border-[#232d44] text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="company_admin">Company Admin</option>
                    <option value="account_manager">Account Manager / Producer</option>
                    <option value="creative">Creative / Editor</option>
                    <option value="client_reviewer">Client Reviewer</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1e273b]">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#182133] text-slate-300 text-xs font-bold hover:bg-[#202c44]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-900/30 active:scale-95 transition"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
